import { useState, useEffect } from 'react';

/**
 * Custom hook to detect whether the user is on a Mobile screen (< 860px) or Desktop (>= 860px).
 * Also supports a manual override so users can preview the PC A4 view on mobile, or Mobile view on PC!
 */
const STORAGE_KEY_FORCE_MODE = 'ann_klee_view_mode_preference'; // 'auto' | 'mobile' | 'desktop'

export function useDeviceMode(breakpoint = 860) {
  // Only track whether the screen is below the breakpoint (not the exact width), so that
  // pinch-zoom / browser-bar resize events on mobile do NOT re-render the whole App every frame.
  const [isAutoMobile, setIsAutoMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  const [overrideMode, setOverrideMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FORCE_MODE) || 'auto';
      // Never trap a desktop screen (>= breakpoint) in forced mobile mode
      if (saved === 'mobile' && typeof window !== 'undefined' && window.innerWidth >= breakpoint) {
        localStorage.setItem(STORAGE_KEY_FORCE_MODE, 'auto');
        return 'auto';
      }
      return saved;
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    let rafId = 0;
    const handleResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const next = window.innerWidth < breakpoint;
        setIsAutoMobile(prev => (prev !== next ? next : prev));
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [breakpoint]);

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  
  const isMobile = !isAutoMobile
    ? false
    : overrideMode === 'desktop'
      ? false
      : true;

  const isDesktop = !isMobile;

  const setViewMode = (mode) => {
    // mode: 'auto' | 'mobile' | 'desktop'
    setOverrideMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_FORCE_MODE, mode);
    } catch (e) {
      console.warn('Could not persist view mode:', e);
    }
  };

  return {
    isMobile,
    isDesktop,
    windowWidth,
    overrideMode,
    setViewMode,
  };
}
