import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

/**
 * A4SheetScaler: Auto-Fit + Smooth 2-Finger Pinch-to-Zoom Engine for A4 Documents on Mobile
 *
 * - Scales the authentic 794px A4 sheet down to fit narrow mobile screens (< 820px).
 * - 2-finger pinch-to-zoom & 1-finger pan while zoomed (no zoom buttons).
 * - Performance: gestures NEVER trigger React re-renders. Zoom/pan live in refs and are written
 *   straight to the DOM once per animation frame, so heavy A4 tables are not re-rendered at 60fps.
 * - Crisp text: `will-change: transform` + 3D transform are applied ONLY while fingers are down;
 *   after release they are removed so the browser re-rasterizes text sharply at the new zoom level.
 * - On real PCs (scale = 1) the gesture engine is inactive.
 */
const A4_WIDTH = 794;
const MAX_ZOOM = 4;
const VIEWPORT_PAD_TOP = 10;

export default function A4SheetScaler({ children }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const layerRef = useRef(null);
  const contentRef = useRef(null);

  // Rarely-changing layout state (React-managed)
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1123);

  // High-frequency gesture state (ref-managed, never causes re-render)
  const zoomRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const layoutRef = useRef({ scale: 1, contentHeight: 1123 });
  layoutRef.current = { scale, contentHeight };

  const gestureRef = useRef({
    active: false,
    mode: null, // 'pinch' | 'pan' | null
    startDist: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startMidX: 0,
    startMidY: 0,
    startTouchX: 0,
    startTouchY: 0,
    lastTapTime: 0,
    rafId: 0,
    settleTimer: 0,
    pendingMeasure: false
  });

  const isScaled = scale < 0.98;

  /** Write the current zoom/pan straight to the DOM (no React render). */
  const writeTransform = useCallback((animate = false) => {
    const layer = layerRef.current;
    const vp = viewportRef.current;
    if (!layer) return;

    const { scale: baseScale } = layoutRef.current;

    // Real PC / wide screens: no transform at all (identical to the original layout)
    if (baseScale >= 0.98) {
      layer.style.transition = '';
      layer.style.transform = '';
      layer.style.willChange = '';
      if (vp) vp.style.touchAction = '';
      return;
    }

    const { zoom, panX, panY } = zoomRef.current;
    const total = baseScale * zoom;
    const gesturing = gestureRef.current.active;

    layer.style.transition = animate ? 'transform 0.18s ease-out' : 'none';
    layer.style.transform = gesturing
      ? `translate3d(${panX}px, ${panY}px, 0) scale(${total})`
      : `translate(${panX}px, ${panY}px) scale(${total})`;
    layer.style.willChange = gesturing ? 'transform' : 'auto';

    if (vp) {
      vp.style.touchAction = zoom > 1.02 ? 'none' : 'pan-y';
    }
  }, []);

  /** Batch DOM writes to at most once per animation frame. */
  const scheduleWrite = useCallback(() => {
    const g = gestureRef.current;
    if (g.rafId) return;
    g.rafId = requestAnimationFrame(() => {
      g.rafId = 0;
      writeTransform(false);
    });
  }, [writeTransform]);

  const clampPan = useCallback((nextX, nextY, nextZoom) => {
    if (nextZoom <= 1.01) return { x: 0, y: 0 };
    const vp = viewportRef.current;
    const { scale: baseScale, contentHeight: cHeight } = layoutRef.current;
    const vpWidth = vp ? vp.clientWidth : A4_WIDTH * baseScale;
    const vpHeight = vp ? vp.clientHeight - VIEWPORT_PAD_TOP * 2 : cHeight * baseScale;

    const scaledW = A4_WIDTH * baseScale * nextZoom;
    const scaledH = cHeight * baseScale * nextZoom;

    const maxX = Math.max(0, (scaledW - vpWidth) / 2 + 24);
    const minY = Math.min(0, vpHeight - scaledH - 24);

    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(20, Math.max(minY, nextY))
    };
  }, []);

  // ---- Measurement (fit-to-width scale + content height) ----
  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;

    let nextScale = 1;
    if (containerWidth < 820) {
      const availWidth = Math.max(280, containerWidth - 16);
      nextScale = Math.min(1, availWidth / A4_WIDTH);
    }

    setScale(prev => (Math.abs(prev - nextScale) > 0.001 ? nextScale : prev));

    if (contentRef.current) {
      const h = contentRef.current.offsetHeight || 1123;
      setContentHeight(prev => (prev !== h ? h : prev));
    }
  }, []);

  useEffect(() => {
    const g = gestureRef.current;
    let measureRaf = 0;

    const requestMeasure = () => {
      // Never re-measure / re-render while fingers are zooming — defer until release
      if (g.active) {
        g.pendingMeasure = true;
        return;
      }
      if (measureRaf) return;
      measureRaf = requestAnimationFrame(() => {
        measureRaf = 0;
        measure();
      });
    };

    measure();
    window.addEventListener('resize', requestMeasure);

    let observer;
    if (contentRef.current && window.MutationObserver) {
      observer = new MutationObserver(requestMeasure);
      observer.observe(contentRef.current, { childList: true, subtree: true, attributes: true, characterData: true });
    }

    g.requestMeasure = requestMeasure;

    return () => {
      window.removeEventListener('resize', requestMeasure);
      if (observer) observer.disconnect();
      if (measureRaf) cancelAnimationFrame(measureRaf);
    };
    // Re-attach the observer when the scaled/unscaled branch swaps the content node
  }, [measure, isScaled]);

  // When the base fit-scale changes (rotation / resize), reset zoom and re-apply transform
  useLayoutEffect(() => {
    zoomRef.current = { zoom: 1, panX: 0, panY: 0 };
    writeTransform(false);
  }, [scale, isScaled, writeTransform]);

  // ---- Touch gesture engine (only active when the sheet is scaled down on mobile) ----
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !isScaled) return;
    const g = gestureRef.current;

    const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const originOf = () => {
      const rect = vp.getBoundingClientRect();
      return { cx: rect.left + rect.width / 2, top: rect.top + VIEWPORT_PAD_TOP };
    };

    const beginGesture = () => {
      if (g.settleTimer) {
        clearTimeout(g.settleTimer);
        g.settleTimer = 0;
      }
      if (!g.active) {
        g.active = true;
        writeTransform(false);
      }
    };

    const endGesture = () => {
      g.mode = null;
      g.active = false;
      if (g.rafId) {
        cancelAnimationFrame(g.rafId);
        g.rafId = 0;
      }

      const z = zoomRef.current;
      const snapBack = z.zoom <= 1.03;
      if (snapBack) {
        zoomRef.current = { zoom: 1, panX: 0, panY: 0 };
      }
      // Switch back to 2D transform + will-change:auto so text re-rasterizes crisply
      writeTransform(snapBack);

      if (g.pendingMeasure) {
        g.pendingMeasure = false;
        g.settleTimer = setTimeout(() => {
          g.settleTimer = 0;
          if (g.requestMeasure) g.requestMeasure();
        }, 220);
      }
    };

    const startPinch = (t1, t2) => {
      const { cx, top } = originOf();
      g.mode = 'pinch';
      g.startDist = Math.max(10, getDistance(t1, t2));
      g.startZoom = zoomRef.current.zoom;
      g.startPanX = zoomRef.current.panX;
      g.startPanY = zoomRef.current.panY;
      g.startMidX = (t1.clientX + t2.clientX) / 2 - cx;
      g.startMidY = (t1.clientY + t2.clientY) / 2 - top;
    };

    const startPan = (t) => {
      g.mode = 'pan';
      g.startTouchX = t.clientX;
      g.startTouchY = t.clientY;
      g.startPanX = zoomRef.current.panX;
      g.startPanY = zoomRef.current.panY;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        beginGesture();
        startPinch(e.touches[0], e.touches[1]);
        return;
      }

      if (e.touches.length === 1) {
        const now = Date.now();
        const zoomed = zoomRef.current.zoom > 1.02;

        if (zoomed && now - g.lastTapTime < 280) {
          // Double-tap while zoomed -> smoothly reset to 1x
          e.preventDefault();
          g.lastTapTime = 0;
          g.mode = null;
          g.active = false;
          zoomRef.current = { zoom: 1, panX: 0, panY: 0 };
          writeTransform(true);
          return;
        }
        g.lastTapTime = now;

        if (zoomed) {
          beginGesture();
          startPan(e.touches[0]);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && g.mode === 'pinch') {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const ratio = getDistance(t1, t2) / g.startDist;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(1, g.startZoom * ratio));

        const { cx, top } = originOf();
        const midX = (t1.clientX + t2.clientX) / 2 - cx;
        const midY = (t1.clientY + t2.clientY) / 2 - top;

        // Keep the content point under the fingers fixed while zooming
        const factor = nextZoom / g.startZoom;
        const rawX = midX - (g.startMidX - g.startPanX) * factor;
        const rawY = midY - (g.startMidY - g.startPanY) * factor;
        const clamped = clampPan(rawX, rawY, nextZoom);

        zoomRef.current = { zoom: nextZoom, panX: clamped.x, panY: clamped.y };
        scheduleWrite();
        return;
      }

      if (e.touches.length === 1 && g.mode === 'pan' && zoomRef.current.zoom > 1.02) {
        e.preventDefault();
        const t = e.touches[0];
        const clamped = clampPan(
          g.startPanX + (t.clientX - g.startTouchX),
          g.startPanY + (t.clientY - g.startTouchY),
          zoomRef.current.zoom
        );
        zoomRef.current = { ...zoomRef.current, panX: clamped.x, panY: clamped.y };
        scheduleWrite();
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length === 0) {
        if (g.active || g.mode) endGesture();
        return;
      }
      if (e.touches.length === 1 && g.mode === 'pinch') {
        // Continue smoothly as a 1-finger pan if still zoomed
        if (zoomRef.current.zoom > 1.02) {
          startPan(e.touches[0]);
        } else {
          endGesture();
        }
      }
    };

    vp.addEventListener('touchstart', handleTouchStart, { passive: false });
    vp.addEventListener('touchmove', handleTouchMove, { passive: false });
    vp.addEventListener('touchend', handleTouchEnd);
    vp.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      vp.removeEventListener('touchstart', handleTouchStart);
      vp.removeEventListener('touchmove', handleTouchMove);
      vp.removeEventListener('touchend', handleTouchEnd);
      vp.removeEventListener('touchcancel', handleTouchEnd);
      if (g.rafId) {
        cancelAnimationFrame(g.rafId);
        g.rafId = 0;
      }
      if (g.settleTimer) {
        clearTimeout(g.settleTimer);
        g.settleTimer = 0;
      }
      g.active = false;
      g.mode = null;
    };
  }, [isScaled, clampPan, scheduleWrite, writeTransform]);

  return (
    <div ref={containerRef} className="a4-scaler-root" style={{ width: '100%', position: 'relative' }}>
      {isScaled ? (
        <div
          ref={viewportRef}
          style={{
            width: '100%',
            height: Math.ceil(contentHeight * scale) + VIEWPORT_PAD_TOP * 2,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            background: '#e2e8f0',
            borderRadius: 12,
            padding: `${VIEWPORT_PAD_TOP}px 0`,
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)'
            // touchAction is written directly to the DOM by the gesture engine
          }}
        >
          <div
            ref={layerRef}
            style={{
              width: A4_WIDTH,
              transformOrigin: 'top center',
              flexShrink: 0
              // transform / transition / willChange are written directly to the DOM (no re-render)
            }}
          >
            <div ref={contentRef}>
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            overflowX: 'visible',
            background: '#e2e8f0',
            borderRadius: 12,
            padding: '24px 16px',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div
            ref={layerRef}
            style={{
              width: A4_WIDTH,
              margin: '0 auto',
              flexShrink: 0
            }}
          >
            <div ref={contentRef}>
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
