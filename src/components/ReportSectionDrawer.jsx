import React, { useEffect } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Edit3, CheckCircle2 } from 'lucide-react';

/**
 * ReportEditModeBar (Quick Jump Section Switcher — Idea 2):
 * Compact 1-bar banner shown right above the A4 paper / Mobile Cards when Edit Mode is active.
 * Lets the user either click directly on the paper (Idea 1) OR tap any section chip here to jump straight to editing.
 */
export function ReportEditModeBar({
  sections = [],
  activeSectionId = null,
  onSelectSection,
  onCloseEditMode,
  isMobile = false,
  savedToastText = '',
  theme = 'amber' // 'amber' | 'sky'
}) {
  const isSky = theme === 'sky';
  const bg = isSky ? '#f0f9ff' : '#fffbeb';
  const border = isSky ? '#7dd3fc' : '#fcd34d';
  const accent = isSky ? '#0369a1' : '#92400e';
  const chipActiveBg = isSky ? '#0284c7' : '#b45309';

  return (
    <div
      className="no-print"
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 12,
        padding: isMobile ? '9px 10px' : '10px 14px',
        marginBottom: 12,
        boxShadow: '0 3px 10px rgba(15, 23, 42, 0.06)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 8
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: isMobile ? 12 : 12.5,
            fontWeight: 700,
            color: accent
          }}
        >
          <Edit3 size={14} />
          <span>
            {isMobile
              ? 'របៀបកែប្រែបើកហើយ៖ ចុចលើផ្នែកណាមួយ ឬជ្រើសខាងក្រោម'
              : 'របៀបកែប្រែបើកហើយ — ចុចផ្ទាល់លើចំណុចណាមួយលើក្រដាស A4 ឬចុចជ្រើសផ្នែកខាងក្រោម៖'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              cursor: 'pointer'
            }}
          >
            <X size={13} />
            <span>បិទ Edit Mode</span>
          </button>
        </div>
      </div>

      {/* Quick Jump Section Chips */}
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
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(sec.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '5px 10px' : '4px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
                background: active ? chipActiveBg : '#ffffff',
                color: active ? '#ffffff' : '#334155',
                border: `1px solid ${active ? chipActiveBg : '#cbd5e1'}`,
                boxShadow: active ? '0 2px 6px rgba(15, 23, 42, 0.16)' : 'none',
                transition: 'all 0.14s ease'
              }}
            >
              <span>{sec.shortLabel || sec.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ReportSectionDrawer (Focused Single-Section Editor — Idea 1 + Prev/Next Navigation):
 * - PC: Right-side slide drawer (470px) so the A4 paper remains visible on the left,
 *       OR wide centered modal (860px) for multi-column tables/grids (`wide: true`).
 * - Mobile: Rounded Bottom Sheet (`maxHeight: 88vh`) with sticky header & sticky touch-friendly footer.
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
  children
}) {
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

  const isSky = theme === 'sky';
  const headerBg = isSky ? '#f0f9ff' : '#fffbeb';
  const headerBorder = isSky ? '#bae6fd' : '#fde68a';
  const headerText = isSky ? '#0c4a6e' : '#92400e';

  const panelStyle = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '88vh',
        background: '#ffffff',
        borderRadius: '18px 18px 0 0',
        boxShadow: '0 -10px 34px rgba(15, 23, 42, 0.28)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001,
        overflow: 'hidden',
        animation: 'reportSheetSlideUp 0.18s ease-out'
      }
    : isWide
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
          zIndex: 1001,
          overflow: 'hidden'
        }
      : {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(480px, 94vw)',
          background: '#ffffff',
          boxShadow: '-10px 0 36px rgba(15, 23, 42, 0.22)',
          borderLeft: `1.5px solid ${headerBorder}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          overflow: 'hidden',
          animation: 'reportDrawerSlideIn 0.18s ease-out'
        };

  return (
    <div className="no-print" role="dialog" aria-modal="true" aria-label={activeSec.label}>
      {/* Semi-transparent Backdrop (lighter on PC side-drawer so user can still glance at the A4 sheet!) */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: isMobile || isWide ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0.22)',
          zIndex: 1000
        }}
      />

      {/* Focused Section Panel */}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (onSave) onSave();
        }}
        style={panelStyle}
      >
        {/* Mobile grab handle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px', background: headerBg }}>
            <div style={{ width: 42, height: 4, borderRadius: 999, background: '#cbd5e1' }} />
          </div>
        )}

        {/* Sticky Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
            padding: isMobile ? '10px 14px 12px' : '14px 18px',
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            flexShrink: 0
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>
              កំពុងកែផ្នែកទី {currentIdx + 1} / {sections.length}
            </div>
            <h3
              className="font-moul"
              style={{
                margin: 0,
                fontSize: isMobile ? 13.5 : 14.5,
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

        {/* Scrollable Focused Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '12px 14px 16px' : '16px 18px',
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
            padding: isMobile ? '10px 14px 14px' : '12px 18px',
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

