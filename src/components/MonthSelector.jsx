import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Smartphone, Monitor, FileText, LayoutGrid, Lock, Unlock, ChevronDown, Check } from 'lucide-react';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import { isAcademicMonthKey } from '../utils/summaryAnalytics';

export default function MonthSelector({
  currentMonth,
  availableMonths,
  onSelectMonth,
  isMobile = false,
  mobilePreviewA4 = false,
  onToggleMobilePreviewA4,
  appMode = 'main',
  onToggleAppMode,
  isOldLockedMonth = false,
  isMonthLocked,
  authRole = 'user',
  onToggleMonthLock
}) {
  const [isMobileMonthOpen, setIsMobileMonthOpen] = useState(false);
  const mobileDropdownRef = useRef(null);

  useEffect(() => {
    if (!isMobileMonthOpen) return undefined;

    const handleOutside = (e) => {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target)) {
        setIsMobileMonthOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileMonthOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMonthOpen]);

  const formatMonthLabel = (mKey) => {
    // mKey is in format "YYYY-MM"
    const [, m] = mKey.split('-');
    const monthName = KHMER_SOLAR_MONTHS[parseInt(m, 10) - 1] || m;
    return `ខែ${monthName}`;
  };

  // Filter out March (03) & April (04)
  const cleanAvailableMonths = (availableMonths || []).filter(isAcademicMonthKey);

  const renderMonthPopover = (minWidth = 188) => (
    <div
      className="month-popover-shell"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        minWidth,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06)',
        zIndex: 1100
      }}
    >
      <div
        role="listbox"
        className="month-popover-scroll"
        style={{
          maxHeight: 212,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: '5px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        {cleanAvailableMonths.map((mKey, idx) => {
          const isSelected = mKey === currentMonth;
          const isLatestMonth = idx === 0;
          const isOldMonth = !isLatestMonth;
          const isUnlockedOld = isOldMonth && typeof isMonthLocked === 'function' && !isMonthLocked(mKey);
          return (
            <button
              key={mKey}
              type="button"
              role="option"
              aria-selected={isSelected}
              title={isUnlockedOld ? 'ខែចាស់ (បានបើកសិទ្ធិកែ)' : undefined}
              className={`month-popover-item${isSelected ? ' is-selected' : ''}`}
              onClick={() => {
                onSelectMonth(mKey);
                setIsMobileMonthOpen(false);
              }}
              style={{
                width: '100%',
                height: 38,
                minHeight: 38,
                flexShrink: 0,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '0 10px',
                borderRadius: 9,
                border: isSelected ? '1px solid #fcd34d' : '1px solid transparent',
                background: isSelected
                  ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                  : 'transparent',
                boxShadow: isSelected ? '0 1px 2px rgba(180, 83, 9, 0.08)' : 'none',
                color: isSelected ? '#b45309' : (isOldMonth ? '#94a3b8' : '#0f172a'),
                fontSize: 13.5,
                fontWeight: isSelected ? 700 : (isOldMonth ? 500 : 700),
                opacity: !isSelected && isOldMonth ? 0.78 : 1,
                textAlign: 'left',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: isLatestMonth ? 8 : 6,
                  height: isLatestMonth ? 8 : 6,
                  borderRadius: '50%',
                  background: isLatestMonth
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : (isSelected ? '#d97706' : '#cbd5e1'),
                  boxShadow: isLatestMonth ? '0 0 0 3px rgba(37, 99, 235, 0.16)' : 'none',
                  flexShrink: 0
                }} />
                <span>{formatMonthLabel(mKey)}</span>
                {isLatestMonth && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    lineHeight: 1.4
                  }}>
                    ថ្មី
                  </span>
                )}
              </span>
              {isSelected && (
                <span style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Check size={12} strokeWidth={2.8} color="#b45309" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="no-print" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: isMobile ? '10px 12px' : '12px 16px',
      marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Single-Row Top Bar: Month picker [ខែ ▾] on Left + Report & Toggle Switch on Right */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: 6
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 8,
          flexWrap: 'nowrap',
          flex: 1,
          minWidth: 0
        }}>
          {isMobile ? (
            <>
              {/* Mobile Compact Month Trigger + Semester-Free Popover */}
              <div
                ref={mobileDropdownRef}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <button
                  type="button"
                  onClick={() => setIsMobileMonthOpen(prev => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isMobileMonthOpen}
                  style={{
                    height: 34,
                    padding: '0 10px',
                    borderRadius: 9,
                    border: isMobileMonthOpen ? '1.5px solid #d97706' : '1.5px solid #cbd5e1',
                    background: isMobileMonthOpen ? '#fffbeb' : '#f8fafc',
                    color: '#0f172a',
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer'
                  }}
                >
                  <Calendar size={15} color="#b45309" style={{ flexShrink: 0 }} />
                  <span>{formatMonthLabel(currentMonth)}</span>
                  <ChevronDown
                    size={14}
                    color="#64748b"
                    style={{
                      flexShrink: 0,
                      transform: isMobileMonthOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.16s ease'
                    }}
                  />
                </button>

                {isMobileMonthOpen && renderMonthPopover(184)}
              </div>

              {/* Old Month Lock / Unlock Toggle (Owner & Admin) */}
              {(authRole === 'owner' || authRole === 'admin') && onToggleMonthLock ? (
                <button
                  type="button"
                  onClick={() => onToggleMonthLock(currentMonth)}
                  title={
                    isOldLockedMonth
                      ? 'ខែចាស់កំពុងជាប់សោរការពារ (ចុចដើម្បីដោះសោ 🔓 កែប្រែទិន្នន័យ)'
                      : 'កំពុងបើកសិទ្ធិកែប្រែ (ចុចដើម្បីចាក់សោរ 🔒 ការពារ)'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isOldLockedMonth ? '#fef3c7' : '#ecfdf5',
                    border: `1px solid ${isOldLockedMonth ? '#f59e0b' : '#6ee7b7'}`,
                    color: isOldLockedMonth ? '#b45309' : '#047857',
                    padding: '4px 6px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {isOldLockedMonth ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#b45309',
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                <Calendar size={18} />
                <span>ខែប្រចាំការ៖</span>
              </div>

              {/* [ខែ ▾] Custom Semester-Free Month Dropdown */}
              <div
                ref={mobileDropdownRef}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <button
                  type="button"
                  onClick={() => setIsMobileMonthOpen(prev => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isMobileMonthOpen}
                  style={{
                    height: 36,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: isMobileMonthOpen ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                    background: isMobileMonthOpen ? '#fffbeb' : '#f8fafc',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{formatMonthLabel(currentMonth)}</span>
                  <ChevronDown
                    size={15}
                    color="#64748b"
                    style={{
                      flexShrink: 0,
                      transform: isMobileMonthOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.16s ease'
                    }}
                  />
                </button>

                {isMobileMonthOpen && renderMonthPopover(196)}
              </div>

              {/* Old Month Lock / Unlock Toggle (Owner & Admin) */}
              {(authRole === 'owner' || authRole === 'admin') && onToggleMonthLock ? (
                <button
                  type="button"
                  onClick={() => onToggleMonthLock(currentMonth)}
                  title={
                    isOldLockedMonth
                      ? 'ខែចាស់កំពុងជាប់សោរការពារ (ចុចដើម្បីដោះសោ 🔓 កែប្រែទិន្នន័យ)'
                      : 'កំពុងបើកសិទ្ធិកែប្រែ (ចុចដើម្បីចាក់សោរ 🔒 ការពារ)'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: isOldLockedMonth ? '#fef3c7' : '#ecfdf5',
                    border: `1px solid ${isOldLockedMonth ? '#f59e0b' : '#6ee7b7'}`,
                    color: isOldLockedMonth ? '#b45309' : '#047857',
                    padding: '5px 9px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {isOldLockedMonth ? <Lock size={13} /> : <Unlock size={13} />}
                  <span>{isOldLockedMonth ? 'ចាក់សោខែចាស់' : 'បើកសិទ្ធិកែ'}</span>
                </button>
              ) : null}
            </>
          )}
        </div>

        {/* Right Side Controls:
            - On PC: ONLY the "របាយការណ៍" button
            - On Mobile: "របាយការណ៍" button + Mobile/PC Toggle Switch [📱 | 🖥️] */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 6 : 10,
          flexShrink: 0
        }}>
          {/* Mode Switch Button: Main System ⇄ Administrative Reports (របាយការណ៍ ខែ/ឆមាស/ឆ្នាំ) */}
          {onToggleAppMode && (
            <button
              type="button"
              onClick={onToggleAppMode}
              title={
                appMode === 'admin_report'
                  ? 'ត្រឡប់ទៅផ្ទាំងច្បាប់សមណសិស្ស និងចំណូល-ចំណាយ'
                  : 'ចូលផ្ទាំងរបាយការណ៍រដ្ឋបាលប្រចាំខែ ឆមាស និងឆ្នាំ'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: isMobile ? 4 : 6,
                height: 34,
                padding: isMobile ? '0 10px' : '0 14px',
                borderRadius: 999,
                border: appMode === 'admin_report' ? '1.5px solid #b45309' : '1.5px solid #0284c7',
                background: appMode === 'admin_report'
                  ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                  : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: isMobile ? 12 : 13,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: appMode === 'admin_report'
                  ? '0 2px 6px rgba(180, 83, 9, 0.28)'
                  : '0 2px 6px rgba(2, 132, 199, 0.28)',
                transition: 'all 0.2s ease'
              }}
            >
              {appMode === 'admin_report' ? (
                <>
                  <LayoutGrid size={isMobile ? 14 : 15} strokeWidth={2.5} />
                  <span>ត្រឡប់ដើម</span>
                </>
              ) : (
                <>
                  <FileText size={isMobile ? 14 : 15} strokeWidth={2.5} />
                  <span>របាយការណ៍</span>
                </>
              )}
            </button>
          )}

          {/* Mobile-Only Sliding Toggle Switch (📱 Mobile Card ⇄ 🖥️ PC A4 Preview) */}
          {isMobile && onToggleMobilePreviewA4 && (
            <button
              type="button"
              role="switch"
              aria-checked={mobilePreviewA4}
              onClick={onToggleMobilePreviewA4}
              title={mobilePreviewA4 ? 'ប្ដូរមកទម្រង់កាតទូរសព្ទ (Mobile)' : 'ប្ដូរទៅមើលទម្រង់ក្រដាសកុំព្យូទ័រ (PC A4)'}
              style={{
                position: 'relative',
                width: 64,
                height: 34,
                borderRadius: 999,
                border: mobilePreviewA4 ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                background: mobilePreviewA4
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : '#f1f5f9',
                padding: 3,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: mobilePreviewA4
                  ? '0 2px 6px rgba(2, 132, 199, 0.28)'
                  : 'inset 0 1px 3px rgba(15, 23, 42, 0.08)',
                flexShrink: 0
              }}
            >
              {/* Background Ghost Icons on Track */}
              <span style={{
                width: 26,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mobilePreviewA4 ? 'rgba(255,255,255,0.65)' : 'transparent',
                transition: 'color 0.2s'
              }}>
                <Smartphone size={14} strokeWidth={2.2} />
              </span>
              <span style={{
                width: 26,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mobilePreviewA4 ? 'transparent' : '#64748b',
                transition: 'color 0.2s'
              }}>
                <Monitor size={14} strokeWidth={2.2} />
              </span>

              {/* Sliding Circular Thumb showing active 📱 or 🖥️ icon */}
              <span style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#ffffff',
                color: mobilePreviewA4 ? '#0284c7' : '#b45309',
                boxShadow: '0 2px 5px rgba(15, 23, 42, 0.22)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: mobilePreviewA4 ? 'translateX(30px)' : 'translateX(0px)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s'
              }}>
                {mobilePreviewA4 ? (
                  <Monitor size={15} strokeWidth={2.5} />
                ) : (
                  <Smartphone size={15} strokeWidth={2.5} />
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
