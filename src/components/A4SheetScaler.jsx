import React, { useState, useEffect, useRef } from 'react';

/**
 * A4SheetScaler: Intelligent Auto-Fit Engine for A4 Documents on Mobile Devices
 * Automatically scales the authentic 794px desktop A4 paper sheet down to fit cleanly
 * on narrow mobile screens (< 820px) without any horizontal clipping or layout breaking.
 */
export default function A4SheetScaler({ children }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1123);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;

      // Standard A4 width is 794px (210mm at 96 DPI)
      if (containerWidth < 820) {
        // Leave 12px breathing room on each side
        const availWidth = Math.max(280, containerWidth - 16);
        const newScale = Math.min(1, availWidth / 794);
        setScale(newScale);
      } else {
        setScale(1);
      }

      if (contentRef.current) {
        setContentHeight(contentRef.current.offsetHeight || 1123);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Watch for dynamic DOM changes (e.g. adding rows)
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

  const isScaled = scale < 0.98;

  return (
    <div ref={containerRef} className="a4-scaler-root" style={{ width: '100%', position: 'relative' }}>
      {/* The Paper Sheet Container */}
      {isScaled ? (
        <div style={{
          width: '100%',
          height: Math.ceil(contentHeight * scale) + 20,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          background: '#e2e8f0',
          borderRadius: 12,
          padding: '10px 0',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            width: 794,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            flexShrink: 0
          }}>
            <div ref={contentRef}>
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          overflowX: 'visible',
          background: '#e2e8f0',
          borderRadius: 12,
          padding: '24px 16px',
          boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            width: 794,
            margin: '0 auto',
            flexShrink: 0
          }}>
            <div ref={contentRef}>
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
