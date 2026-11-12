import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A4SheetScaler: Intelligent Auto-Fit & Two-Finger Pinch-to-Zoom Engine for A4 Documents on Mobile
 * Automatically scales the authentic 794px desktop A4 paper sheet down to fit cleanly
 * on narrow mobile screens (< 820px) and supports native-feel 2-finger pinch-to-zoom & pan
 * (without any zoom buttons) for both Browser and Home Screen PWA Standalone modes.
 */
export default function A4SheetScaler({ children }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1123);

  // Two-finger pinch-to-zoom state (Mobile only, zero buttons)
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const gestureRef = useRef({
    mode: null, // 'pinch' | 'pan' | null
    startDist: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startMidX: 0,
    startMidY: 0,
    startTouchX: 0,
    startTouchY: 0,
    lastTapTime: 0
  });

  const stateRef = useRef({ userZoom: 1, pan: { x: 0, y: 0 }, scale: 1, contentHeight: 1123 });
  stateRef.current = { userZoom, pan, scale, contentHeight };

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;

      // Standard A4 width is 794px (210mm at 96 DPI)
      if (containerWidth < 820) {
        const availWidth = Math.max(280, containerWidth - 16);
        const newScale = Math.min(1, availWidth / 794);
        setScale(newScale);
      } else {
        setScale(1);
        setUserZoom(1);
        setPan({ x: 0, y: 0 });
      }

      if (contentRef.current) {
        setContentHeight(contentRef.current.offsetHeight || 1123);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    let observer;
    if (contentRef.current && window.MutationObserver) {
      observer = new MutationObserver(updateDimensions);
      observer.observe(contentRef.current, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (observer) observer.disconnect();
    };
  }, []);

  const clampPan = useCallback((nextX, nextY, nextZoom) => {
    if (nextZoom <= 1.01) return { x: 0, y: 0 };
    const vp = viewportRef.current;
    const { scale: baseScale, contentHeight: cHeight } = stateRef.current;
    const vpWidth = vp ? vp.clientWidth : 794 * baseScale;
    const vpHeight = vp ? vp.clientHeight : cHeight * baseScale;

    const scaledW = 794 * baseScale * nextZoom;
    const scaledH = cHeight * baseScale * nextZoom;

    const maxX = Math.max(0, (scaledW - vpWidth) / 2 + 24);
    const maxY = Math.max(0, scaledH - vpHeight + 24);

    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(20, Math.max(-maxY, nextY))
    };
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const getDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e) => {
      if (stateRef.current.scale >= 0.98) return;

      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const rect = vp.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect.left + rect.width / 2);
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        gestureRef.current.mode = 'pinch';
        gestureRef.current.startDist = Math.max(10, dist);
        gestureRef.current.startZoom = stateRef.current.userZoom;
        gestureRef.current.startPanX = stateRef.current.pan.x;
        gestureRef.current.startPanY = stateRef.current.pan.y;
        gestureRef.current.startMidX = midX;
        gestureRef.current.startMidY = midY;
        setIsGesturing(true);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (stateRef.current.userZoom > 1.02 && now - gestureRef.current.lastTapTime < 280) {
          // Double-tap while zoomed resets smoothly to 1x
          e.preventDefault();
          gestureRef.current.lastTapTime = 0;
          gestureRef.current.mode = null;
          setIsGesturing(false);
          setUserZoom(1);
          setPan({ x: 0, y: 0 });
          return;
        }
        gestureRef.current.lastTapTime = now;

        if (stateRef.current.userZoom > 1.02) {
          gestureRef.current.mode = 'pan';
          gestureRef.current.startTouchX = e.touches[0].clientX;
          gestureRef.current.startTouchY = e.touches[0].clientY;
          gestureRef.current.startPanX = stateRef.current.pan.x;
          gestureRef.current.startPanY = stateRef.current.pan.y;
          setIsGesturing(true);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (stateRef.current.scale >= 0.98) return;

      if (e.touches.length === 2 && gestureRef.current.mode === 'pinch') {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const ratio = dist / gestureRef.current.startDist;
        const nextZoom = Math.min(4, Math.max(1, gestureRef.current.startZoom * ratio));

        const rect = vp.getBoundingClientRect();
        const currMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect.left + rect.width / 2);
        const currMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const zoomFactor = nextZoom / gestureRef.current.startZoom;
        const rawPanX = currMidX - (gestureRef.current.startMidX - gestureRef.current.startPanX) * zoomFactor;
        const rawPanY = currMidY - (gestureRef.current.startMidY - gestureRef.current.startPanY) * zoomFactor;

        setUserZoom(nextZoom);
        setPan(clampPan(rawPanX, rawPanY, nextZoom));
      } else if (e.touches.length === 1 && gestureRef.current.mode === 'pan' && stateRef.current.userZoom > 1.02) {
        e.preventDefault();
        const dx = e.touches[0].clientX - gestureRef.current.startTouchX;
        const dy = e.touches[0].clientY - gestureRef.current.startTouchY;
        const nextPan = clampPan(
          gestureRef.current.startPanX + dx,
          gestureRef.current.startPanY + dy,
          stateRef.current.userZoom
        );
        setPan(nextPan);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length === 0) {
        gestureRef.current.mode = null;
        setIsGesturing(false);
        if (stateRef.current.userZoom <= 1.03) {
          setUserZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && gestureRef.current.mode === 'pinch') {
        // Transition smoothly from 2-finger pinch to 1-finger pan if still zoomed
        if (stateRef.current.userZoom > 1.02) {
          gestureRef.current.mode = 'pan';
          gestureRef.current.startTouchX = e.touches[0].clientX;
          gestureRef.current.startTouchY = e.touches[0].clientY;
          gestureRef.current.startPanX = stateRef.current.pan.x;
          gestureRef.current.startPanY = stateRef.current.pan.y;
        } else {
          gestureRef.current.mode = null;
          setIsGesturing(false);
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
    };
  }, [clampPan]);

  const isScaled = scale < 0.98;
  const effectiveScale = scale * userZoom;

  return (
    <div ref={containerRef} className="a4-scaler-root" style={{ width: '100%', position: 'relative' }}>
      {/* The Paper Sheet Container */}
      {isScaled ? (
        <div
          ref={viewportRef}
          style={{
            width: '100%',
            height: Math.ceil(contentHeight * scale) + 20,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            background: '#e2e8f0',
            borderRadius: 12,
            padding: '10px 0',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)',
            touchAction: userZoom > 1.02 ? 'none' : 'pan-y'
          }}
        >
          <div
            style={{
              width: 794,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${effectiveScale})`,
              transformOrigin: 'top center',
              transition: isGesturing ? 'none' : 'transform 0.18s ease-out',
              flexShrink: 0,
              willChange: 'transform'
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
            style={{
              width: 794,
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
