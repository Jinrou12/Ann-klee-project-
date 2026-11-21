import React, { useEffect, useState, useRef } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Edit3, CheckCircle2, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { findTouchDropTargetAtPoint } from './ReportEditableZone';

/**
 * ReportEditModeBar (Quick Jump Section Switcher + Direct Chip Drag & Drop — ZERO extra buttons):
 * Compact 1-bar banner shown right above the A4 paper / Mobile Cards when Edit Mode is active.
 * Lets the user click directly on the paper, tap any section chip, OR drag any reorderable chip
 * to another chip in the same level (super fast for cross-page reordering!).
 */
export function ReportEditModeBar({
  sections = [],
  activeSectionId = null,
  onSelectSection,
  onCloseEditMode,
  onResetOverride = null,
  resetLabel = 'បូកសរុបស្វ័យប្រវត្តិឡើងវិញ',
  isMobile = false,
  savedToastText = '',
  theme = 'amber', // 'amber' | 'sky'
  dragController = null,
  supportsReorder = false,
  headerHeight = 76,
  barRef = null,
  pcLayoutStyle = null,
  compact = false
}) {
  const isSky = theme === 'sky';
  const bg = isSky ? 'rgba(240, 249, 255, 0.97)' : 'rgba(255, 251, 235, 0.97)';
  const border = isSky ? '#7dd3fc' : '#fcd34d';
  const accent = isSky ? '#0369a1' : '#92400e';
  const chipActiveBg = isSky ? '#0284c7' : '#b45309';

  const touchTimerRef = useRef(null);
  const touchOriginRef = useRef(null);
  const touchActiveDragRef = useRef(null);
  const suppressChipClickRef = useRef(false);

  const clearTouchTimer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  useEffect(() => clearTouchTimer, []);

  const dragState = dragController?.dragState || null;

  return (
    <div
      ref={barRef}
      className="no-print admin-report-paper-shift"
      style={{
        position: 'sticky',
        top: Math.max(0, Math.round(headerHeight) + (isMobile ? 2 : 4)),
        zIndex: 85,
        background: bg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1.5px solid ${border}`,
        borderRadius: 12,
        padding: isMobile ? '8px 10px' : compact ? '7px 12px' : '9px 14px',
        marginBottom: 12,
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.10)',
        boxSizing: 'border-box',
        ...(pcLayoutStyle || {})
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: compact ? 6 : 8
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: isMobile ? 11.5 : compact ? 12 : 12.5,
            fontWeight: 700,
            color: accent,
            minWidth: 0
          }}
        >
          <Edit3 size={14} style={{ flexShrink: 0 }} />
          <span>
            {isMobile
              ? supportsReorder
                ? 'របៀបកែប្រែ៖ ចុចកែ • ចុចសង្កត់អូសប្ដូរទីតាំង'
                : 'របៀបកែប្រែ៖ ចុចលើផ្នែកណាមួយ ឬជ្រើសខាងក្រោម'
              : supportsReorder
                ? 'របៀបកែប្រែ៖ ចុចលើចំណុចដើម្បីកែ • អូសទាញលើក្រដាស ឬបន្ទះខាងក្រោមដើម្បីប្ដូរទីតាំង • Ctrl+Z ត្រឡប់ក្រោយ'
                : 'របៀបកែប្រែបើកហើយ — ចុចផ្ទាល់លើចំណុចណាមួយលើក្រដាស A4 ឬចុចជ្រើសផ្នែកខាងក្រោម (Ctrl+Z ត្រឡប់ក្រោយ)៖'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {savedToastText && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #86efac',
                borderRadius: 999,
                padding: '2px 9px',
                fontSize: 11.5,
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={13} />
              <span>{savedToastText}</span>
            </span>
          )}

          {onResetOverride && (
            <button
              type="button"
              onClick={onResetOverride}
              title={resetLabel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#ffffff',
                color: '#0369a1',
                border: '1px solid #38bdf8',
                borderRadius: 7,
                padding: isMobile ? '4px 8px' : '4px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <RotateCcw size={12.5} style={{ flexShrink: 0 }} />
              <span>{resetLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCloseEditMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 7,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <X size={13} />
            <span>បិទ Edit Mode</span>
          </button>
        </div>
      </div>

      {/* Quick Jump Section Chips (also directly draggable when sec.dragGroup & sec.dragId exist!) */}
      <div
        className="report-edit-chips-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? 3 : 0,
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {sections.map(sec => {
          const active = activeSectionId === sec.id;
          const canDrag = Boolean(dragController && sec.dragGroup && sec.dragId);
          const isDraggingSelf = Boolean(
            canDrag && dragState && dragState.group === sec.dragGroup && dragState.fromId === sec.dragId
          );
          const resolvedChipDrop =
            dragController && dragState?.group && dragState?.fromId
              ? canDrag && dragState.group === sec.dragGroup
                ? { group: sec.dragGroup, targetId: sec.dragId }
                : sec.fallbackTopId && dragState.group === 'top'
                  ? { group: 'top', targetId: sec.fallbackTopId }
                  : null
              : null;
          const isMatchingTarget = Boolean(
            resolvedChipDrop && dragState.fromId !== resolvedChipDrop.targetId
          );
          const isDragOver = Boolean(
            isMatchingTarget && dragState?.overId === resolvedChipDrop.targetId
          );

          return (
            <button
              key={sec.id}
              type="button"
              className="report-edit-chip"
              draggable={canDrag && !isMobile}
              data-draggable={canDrag ? 'true' : 'false'}
              data-dragging={isDraggingSelf ? 'true' : 'false'}
              data-drag-over={isDragOver ? 'true' : 'false'}
              data-drag-group={sec.dragGroup || undefined}
              data-drag-id={sec.dragId || undefined}
              data-fallback-top-id={sec.fallbackTopId || undefined}
              title={
                canDrag
                  ? `ចុចដើម្បីកែ ឬអូសទាញប្ដូរទីតាំង៖ ${sec.label}`
                  : sec.label
              }
              onDragStart={e => {
                if (!canDrag || isMobile) return;
                try {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData(
                    'text/plain',
                    JSON.stringify({ group: sec.dragGroup, fromId: sec.dragId })
                  );
                } catch {
                  // Ignore browser drag restrictions
                }
                dragController.onStart(sec.dragGroup, sec.dragId);
              }}
              onDragOver={e => {
                if (!isMatchingTarget || !resolvedChipDrop) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                if (dragState?.overId !== resolvedChipDrop.targetId) {
                  dragController.onOver(resolvedChipDrop.group, resolvedChipDrop.targetId);
                }
              }}
              onDrop={e => {
                if (!isMatchingTarget || !resolvedChipDrop) return;
                e.preventDefault();
                dragController.onDrop(resolvedChipDrop.group, dragState.fromId, resolvedChipDrop.targetId);
              }}
              onDragEnd={() => {
                if (canDrag) dragController.onEnd();
              }}
              onTouchStart={e => {
                if (!isMobile || !canDrag || !e.touches || e.touches.length !== 1) return;
                const t = e.touches[0];
                touchOriginRef.current = { x: t.clientX, y: t.clientY };
                touchActiveDragRef.current = null;
                clearTouchTimer();
                touchTimerRef.current = setTimeout(() => {
                  touchActiveDragRef.current = { group: sec.dragGroup, fromId: sec.dragId };
                  suppressChipClickRef.current = true;
                  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate(25);
                  }
                  dragController.onStart(sec.dragGroup, sec.dragId);
                }, 300);
              }}
              onTouchMove={e => {
                if (!isMobile || !canDrag || !e.touches || e.touches.length !== 1) return;
                const t = e.touches[0];
                if (!touchActiveDragRef.current) {
                  const orig = touchOriginRef.current;
                  if (orig && (Math.abs(t.clientX - orig.x) > 10 || Math.abs(t.clientY - orig.y) > 10)) {
                    clearTouchTimer();
                  }
                  return;
                }
                e.preventDefault();
                const hit = findTouchDropTargetAtPoint(t.clientX, t.clientY, sec.dragGroup);
                dragController.onOver(sec.dragGroup, hit ? hit.targetId : null);
              }}
              onTouchEnd={e => {
                clearTouchTimer();
                const activeDrag = touchActiveDragRef.current;
                if (!activeDrag) return;
                touchActiveDragRef.current = null;
                const t = e.changedTouches && e.changedTouches[0];
                const hit = t ? findTouchDropTargetAtPoint(t.clientX, t.clientY, activeDrag.group) : null;
                if (hit && hit.targetId && hit.targetId !== activeDrag.fromId) {
                  dragController.onDrop(activeDrag.group, activeDrag.fromId, hit.targetId);
                } else {
                  dragController.onEnd();
                }
                setTimeout(() => {
                  suppressChipClickRef.current = false;
                }, 80);
              }}
              onTouchCancel={() => {
                clearTouchTimer();
                if (touchActiveDragRef.current) {
                  touchActiveDragRef.current = null;
                  dragController?.onEnd();
                }
              }}
              onClick={() => {
                if (suppressChipClickRef.current) {
                  suppressChipClickRef.current = false;
                  return;
                }
                onSelectSection(sec.id);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '4.5px 9px' : compact ? '3px 8px' : '4px 10px',
                borderRadius: 999,
                fontSize: compact ? 11 : 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: canDrag && !isMobile ? 'grab' : 'pointer',
                background: active ? chipActiveBg : '#ffffff',
                color: active ? '#ffffff' : '#334155',
                border: `1px solid ${active ? chipActiveBg : '#cbd5e1'}`,
                boxShadow: active ? '0 2px 6px rgba(15, 23, 42, 0.16)' : 'none',
                transition: 'all 0.14s ease'
              }}
            >
              {canDrag && (
                <span style={{ opacity: active ? 0.85 : 0.48, fontSize: 10, letterSpacing: -1 }} aria-hidden="true">
                  ⋮⋮
                </span>
              )}
              <span>{sec.shortLabel || sec.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ConfirmReorderModal:
 * Safety confirmation popup triggered ONLY after dropping a dragged section onto another slot,
 * preventing accidental drag-and-drop rearrangements while previewing the auto-renumbered result.
 */
export function ConfirmReorderModal({
  pendingReorder = null,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!pendingReorder) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onCancel) onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (onConfirm) onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingReorder, onConfirm, onCancel]);

  if (!pendingReorder) return null;

  return (
    <div
      className="no-print"
      role="dialog"
      aria-modal="true"
      aria-label="បញ្ជាក់ការប្ដូរទីតាំង"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.48)'
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 94vw)',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 22px 54px rgba(15, 23, 42, 0.34)',
          border: '1.5px solid #bae6fd',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '13px 16px',
            background: '#f0f9ff',
            borderBottom: '1px solid #bae6fd',
            color: '#0c4a6e'
          }}
        >
          <ArrowRightLeft size={17} />
          <h3 className="font-moul" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
            បញ្ជាក់ការប្ដូរទីតាំងចំណុច
          </h3>
        </div>

        <div style={{ padding: '14px 16px', fontSize: 13, color: '#1e293b', lineHeight: 1.65 }}>
          <div style={{ marginBottom: 10 }}>
            តើបងប្រាកដចង់ប្ដូរទីតាំង{' '}
            <strong style={{ color: '#b45309' }}>«{pendingReorder.fromLabel}»</strong>{' '}
            ទៅដាក់ជំនួសត្រង់ទីតាំង{' '}
            <strong style={{ color: '#0369a1' }}>«{pendingReorder.toLabel}»</strong>{' '}
            មែនទេ?
          </div>

          {Array.isArray(pendingReorder.previewItems) && pendingReorder.previewItems.length > 0 && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '9px 11px',
                fontSize: 12.2,
                marginBottom: 8
              }}
            >
              <div style={{ fontWeight: 700, color: '#475569', marginBottom: 5, fontSize: 11.5 }}>
                លំដាប់ និងលេខសម្គាល់ថ្មីក្រោយប្ដូរ (រៀបលេខស្វ័យប្រវត្តិ)៖
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {pendingReorder.previewItems.map(item => (
                  <div
                    key={item.key}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 6,
                      background: item.isMoved ? '#e0f2fe' : 'transparent',
                      color: item.isMoved ? '#0369a1' : '#334155',
                      fontWeight: item.isMoved ? 700 : 500
                    }}
                  >
                    {item.isMoved ? '➜ ' : '• '}
                    {item.newLabel}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            * បើបងច្រឡំអូស សូមចុច «បោះបង់» ឬក្រោយប្ដូរហើយអាចចុច <strong>Ctrl + Z</strong> ដើម្បីត្រឡប់ក្រោយវិញបានភ្លាមៗ។
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '11px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0'
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <X size={14} />
            <span>បោះបង់</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.28)'
            }}
          >
            <Check size={15} />
            <span>បញ្ជាក់ប្ដូរ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ReportSectionDrawer (Focused Single-Section Editor with Real-Time Live Preview — PC & Mobile /mp):
 * - PC: Right-side dock drawer with NO dimming backdrop so the live A4 paper stays 100% bright, crisp,
 *       and scrollable side-by-side while typing! Wide tables dock on the right on >= 1280px screens too.
 * - Mobile: Split-screen Bottom Sheet (50vh default so the live document above stays bright & visible) —
 *           tap or swipe the existing top grab handle bar to expand/collapse (ZERO extra buttons!).
 */
export default function ReportSectionDrawer({
  isOpen = false,
  isMobile = false,
  sections = [],
  activeSectionId = null,
  onSelectSection,
  onSave,
  onCancel,
  theme = 'amber',
  headerHeight = 76,
  drawerWidthPx = null,
  hasUnsavedChanges = false,
  children
}) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? (document.documentElement?.clientWidth || window.innerWidth) : 1440
  );
  const sheetSwipeStartYRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () =>
      setViewportWidth(document.documentElement?.clientWidth || window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onCancel) onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !activeSectionId) return null;

  const currentIdx = sections.findIndex(s => s.id === activeSectionId);
  const activeSec = currentIdx >= 0 ? sections[currentIdx] : null;
  if (!activeSec) return null;

  const prevSec = currentIdx > 0 ? sections[currentIdx - 1] : null;
  const nextSec = currentIdx >= 0 && currentIdx < sections.length - 1 ? sections[currentIdx + 1] : null;
  const isWide = !isMobile && Boolean(activeSec.wide);
  const useWideCenteredModal = isWide && viewportWidth < 1280;

  const isSky = theme === 'sky';
  const headerBg = isSky ? '#f0f9ff' : '#fffbeb';
  const headerBorder = isSky ? '#bae6fd' : '#fde68a';
  const headerText = isSky ? '#0c4a6e' : '#92400e';
  const safeHeaderHeight = Math.max(0, Math.round(headerHeight));

  const panelStyle = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: mobileExpanded ? `min(86vh, calc(100vh - ${safeHeaderHeight + 8}px))` : '50vh',
        maxHeight: `calc(100vh - ${safeHeaderHeight + 8}px)`,
        background: '#ffffff',
        borderRadius: '18px 18px 0 0',
        borderTop: `1.5px solid ${headerBorder}`,
        boxShadow: '0 -10px 30px rgba(15, 23, 42, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 95,
        overflow: 'hidden',
        transition: 'height 0.18s ease-out',
        animation: 'reportSheetSlideUp 0.18s ease-out'
      }
    : useWideCenteredModal
      ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(900px, 94vw)',
          maxHeight: '88vh',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 22px 60px rgba(15, 23, 42, 0.34)',
          border: `1.5px solid ${headerBorder}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 951,
          overflow: 'hidden'
        }
      : {
          position: 'fixed',
          top: safeHeaderHeight,
          right: 0,
          bottom: 0,
          width: drawerWidthPx || (isWide ? 'min(580px, 42vw)' : 'min(440px, 34vw)'),
          minWidth: isWide ? 440 : 340,
          background: '#ffffff',
          boxShadow: '-6px 4px 24px rgba(15, 23, 42, 0.14)',
          borderLeft: `1.5px solid ${headerBorder}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 95,
          overflow: 'hidden',
          animation: 'reportDrawerSlideIn 0.18s ease-out'
        };

  return (
    <div className="no-print" role="dialog" aria-modal={useWideCenteredModal} aria-label={activeSec.label}>
      {/* Only show backdrop for narrow-screen centered wide modals; keep PC Side Drawer & Mobile Live Sheet backdrop-free so the paper stays 100% bright & live! */}
      {useWideCenteredModal && (
        <div
          onClick={onCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.32)',
            zIndex: 950
          }}
        />
      )}

      {/* Focused Section Panel */}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (onSave) onSave();
        }}
        style={panelStyle}
      >
        {/* Mobile grab handle: tap or swipe up/down to toggle 50vh Live Preview vs 86vh Full Sheet (ZERO extra buttons!) */}
        {isMobile && (
          <div
            onClick={() => setMobileExpanded(prev => !prev)}
            onTouchStart={e => {
              sheetSwipeStartYRef.current = e.touches?.[0]?.clientY ?? null;
            }}
            onTouchEnd={e => {
              const startY = sheetSwipeStartYRef.current;
              const endY = e.changedTouches?.[0]?.clientY ?? null;
              sheetSwipeStartYRef.current = null;
              if (startY !== null && endY !== null) {
                if (startY - endY > 28) setMobileExpanded(true);
                else if (endY - startY > 28) setMobileExpanded(false);
              }
            }}
            title="ប៉ះ ឬអូសឡើង/ចុះដើម្បីពង្រីក ឬបង្រួមមើលក្រដាសខាងលើ"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 0 4px',
              background: headerBg,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ width: 46, height: 4.5, borderRadius: 999, background: '#94a3b8' }} />
          </div>
        )}

        {/* Sticky Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
            padding: isMobile ? '8px 14px 10px' : '14px 18px',
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            flexShrink: 0
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                marginBottom: 2
              }}
            >
              <span>
                កំពុងកែផ្នែកទី {currentIdx + 1} / {sections.length} • មើលផ្ទាល់លើក្រដាស
              </span>
              {hasUnsavedChanges && (
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fcd34d',
                    borderRadius: 999,
                    padding: '0.5px 7px',
                    fontSize: 10.5,
                    fontWeight: 700
                  }}
                >
                  • មិនទាន់រក្សាទុក
                </span>
              )}
            </div>
            <h3
              className="font-moul"
              style={{
                margin: 0,
                fontSize: isMobile ? 13 : 14.5,
                color: headerText,
                lineHeight: 1.45
              }}
            >
              {activeSec.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="បិទ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Focused Body (flex column so single-field editors fill Drawer height cleanly) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '10px 14px 14px' : '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>

        {/* Sticky Footer: Prev / Next Section + Cancel / Save */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: isMobile ? '9px 14px 12px' : '12px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            flexShrink: 0
          }}
        >
          {/* Prev / Next section steppers (preserves unsaved edits in draft!) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              disabled={!prevSec}
              onClick={() => prevSec && onSelectSection(prevSec.id)}
              title={prevSec ? `ផ្នែកមុន៖ ${prevSec.label}` : ''}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '7px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                background: prevSec ? '#ffffff' : '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: prevSec ? '#334155' : '#94a3b8',
                cursor: prevSec ? 'pointer' : 'not-allowed'
              }}
            >
              <ChevronLeft size={14} />
              <span>មុន</span>
            </button>
            <button
              type="button"
              disabled={!nextSec}
              onClick={() => nextSec && onSelectSection(nextSec.id)}
              title={nextSec ? `ផ្នែកបន្ទាប់៖ ${nextSec.label}` : ''}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '7px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                background: nextSec ? '#ffffff' : '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: nextSec ? '#334155' : '#94a3b8',
                cursor: nextSec ? 'pointer' : 'not-allowed'
              }}
            >
              <span>បន្ទាប់</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Cancel / Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <X size={14} />
              <span>បោះបង់</span>
            </button>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)'
              }}
            >
              <Check size={15} />
              <span>រក្សាទុក</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

