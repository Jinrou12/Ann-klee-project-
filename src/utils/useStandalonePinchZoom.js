import { useEffect, useRef } from 'react';

/**
 * useStandalonePinchZoom:
 * Ensures 2-finger pinch-to-zoom works smoothly inside Mobile Home Screen Apps (PWA Standalone mode)
 * even on iOS/Android standalone WebViews that restrict native viewport zoom, without adding any zoom buttons.
 *
 * - Inside `.a4-scaler-root`, `A4SheetScaler` handles high-res A4 pinch-to-zoom directly.
 * - Outside `.a4-scaler-root` (e.g. Mobile Card views), if native `visualViewport` zoom is active,
 *   the browser handles it natively; if locked at 1.0 in standalone mode, this hook smoothly scales
 *   and pans the mobile container with 2 fingers.
 */
export function useStandalonePinchZoom(containerRef, isMobile) {
  const stateRef = useRef({
    zoom: 1,
    panX: 0,
    panY: 0,
    mode: null, // 'pinch' | 'pan' | null
    startDist: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startMidX: 0,
    startMidY: 0,
    startTouchX: 0,
    startTouchY: 0,
    originY: 0,
    lastTapTime: 0
  });

  useEffect(() => {
    const el = containerRef?.current;
    if (!el || !isMobile) {
      if (el) {
        el.style.transform = '';
        el.style.transformOrigin = '';
        el.style.transition = '';
      }
      return;
    }

    const applyTransform = (zoom, panX, panY, originY, animate = false) => {
      if (zoom <= 1.01) {
        el.style.transition = animate ? 'transform 0.18s ease-out' : '';
        el.style.transform = '';
        el.style.transformOrigin = '';
      } else {
        el.style.transition = animate ? 'transform 0.18s ease-out' : 'none';
        el.style.transformOrigin = `50% ${originY}px`;
        el.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
      }
    };

    const clampPan = (nx, ny, nz) => {
      if (nz <= 1.01) return { x: 0, y: 0 };
      const vw = window.innerWidth || 360;
      const vh = window.innerHeight || 640;
      const maxX = Math.max(0, (vw * (nz - 1)) / 2 + 16);
      const maxY = Math.max(0, vh * (nz - 1) + 40);
      return {
        x: Math.min(maxX, Math.max(-maxX, nx)),
        y: Math.min(maxY, Math.max(-maxY, ny))
      };
    };

    const getDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const isNativeZoomActive = () => {
      return Boolean(window.visualViewport && window.visualViewport.scale > 1.04);
    };

    const handleTouchStart = (e) => {
      // Let A4SheetScaler handle touches inside .a4-scaler-root
      if (e.target && e.target.closest && e.target.closest('.a4-scaler-root')) {
        return;
      }

      if (isNativeZoomActive()) {
        if (stateRef.current.zoom > 1.01) {
          stateRef.current.zoom = 1;
          stateRef.current.panX = 0;
          stateRef.current.panY = 0;
          applyTransform(1, 0, 0, 0, false);
        }
        return;
      }

      const st = stateRef.current;

      if (e.touches.length === 2) {
        const dist = getDist(e.touches[0], e.touches[1]);
        const rect = el.getBoundingClientRect();
        const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        if (st.zoom <= 1.01) {
          st.originY = Math.max(0, midClientY - rect.top);
        }

        st.mode = 'pinch';
        st.startDist = Math.max(10, dist);
        st.startZoom = st.zoom;
        st.startPanX = st.panX;
        st.startPanY = st.panY;
        st.startMidX = midClientX - window.innerWidth / 2;
        st.startMidY = midClientY;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (st.zoom > 1.02 && now - st.lastTapTime < 280) {
          e.preventDefault();
          st.lastTapTime = 0;
          st.mode = null;
          st.zoom = 1;
          st.panX = 0;
          st.panY = 0;
          applyTransform(1, 0, 0, 0, true);
          return;
        }
        st.lastTapTime = now;

        if (st.zoom > 1.02) {
          st.mode = 'pan';
          st.startTouchX = e.touches[0].clientX;
          st.startTouchY = e.touches[0].clientY;
          st.startPanX = st.panX;
          st.startPanY = st.panY;
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.target && e.target.closest && e.target.closest('.a4-scaler-root')) {
        return;
      }

      if (isNativeZoomActive()) {
        if (stateRef.current.zoom > 1.01) {
          stateRef.current.zoom = 1;
          stateRef.current.panX = 0;
          stateRef.current.panY = 0;
          applyTransform(1, 0, 0, 0, false);
        }
        return;
      }

      const st = stateRef.current;

      if (e.touches.length === 2 && st.mode === 'pinch') {
        e.preventDefault();
        const dist = getDist(e.touches[0], e.touches[1]);
        const ratio = dist / st.startDist;
        const nextZoom = Math.min(3.5, Math.max(1, st.startZoom * ratio));

        const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const currMidX = midClientX - window.innerWidth / 2;
        const currMidY = midClientY;

        const zoomFactor = nextZoom / st.startZoom;
        const rawPanX = currMidX - (st.startMidX - st.startPanX) * zoomFactor;
        const rawPanY = (currMidY - st.startMidY) + st.startPanY * zoomFactor;

        const clamped = clampPan(rawPanX, rawPanY, nextZoom);
        st.zoom = nextZoom;
        st.panX = clamped.x;
        st.panY = clamped.y;
        applyTransform(st.zoom, st.panX, st.panY, st.originY, false);
      } else if (e.touches.length === 1 && st.mode === 'pan' && st.zoom > 1.02) {
        const dx = e.touches[0].clientX - st.startTouchX;
        const dy = e.touches[0].clientY - st.startTouchY;
        const clamped = clampPan(st.startPanX + dx, st.startPanY + dy, st.zoom);
        // Only prevent default horizontal pan or in-bounds pan so user can still scroll when at edge
        if (Math.abs(dx) > Math.abs(dy) || Math.abs(clamped.y - st.panY) > 0.5) {
          e.preventDefault();
        }
        st.panX = clamped.x;
        st.panY = clamped.y;
        applyTransform(st.zoom, st.panX, st.panY, st.originY, false);
      }
    };

    const handleTouchEnd = (e) => {
      const st = stateRef.current;
      if (e.touches.length === 0) {
        st.mode = null;
        if (st.zoom <= 1.03) {
          st.zoom = 1;
          st.panX = 0;
          st.panY = 0;
          applyTransform(1, 0, 0, 0, true);
        }
      } else if (e.touches.length === 1 && st.mode === 'pinch') {
        if (st.zoom > 1.02) {
          st.mode = 'pan';
          st.startTouchX = e.touches[0].clientX;
          st.startTouchY = e.touches[0].clientY;
          st.startPanX = st.panX;
          st.startPanY = st.panY;
        } else {
          st.mode = null;
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.transition = '';
    };
  }, [containerRef, isMobile]);
}

