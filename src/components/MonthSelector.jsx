import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Smartphone, Monitor, FileText, LayoutGrid } from 'lucide-react';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { SEMESTER_1_MONTH_NUMS, SEMESTER_2_MONTH_NUMS, isAcademicMonthKey } from '../utils/summaryAnalytics';

export default function MonthSelector({
  currentMonth,
  availableMonths,
  onSelectMonth,
  onAddNewMonth,
  useKhmerNumerals,
  isMobile = false,
  mobilePreviewA4 = false,
  onToggleMobilePreviewA4,
  appMode = 'main',
  onToggleAppMode
}) {
  const activeYearFromMonth = (currentMonth || '2026-07').split('-')[0] || '2026';
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newYear, setNewYear] = useState(activeYearFromMonth);
  const [newMonthNum, setNewMonthNum] = useState('08');

  useEffect(() => {
    setNewYear(activeYearFromMonth);
  }, [activeYearFromMonth]);

  const formatMonthLabel = (mKey) => {
    // mKey is in format "YYYY-MM"
    const [, m] = mKey.split('-');
    const monthName = KHMER_SOLAR_MONTHS[parseInt(m, 10) - 1] || m;
    return `ខែ${monthName}`;
  };

  const handleCreateMonth = (e) => {
    e.preventDefault();
    const createdKey = `${newYear}-${newMonthNum}`;
    onAddNewMonth(createdKey);
    setShowAddMonth(false);
  };

  // Filter out March (03) & April (04) and group available months by Semester 1 & Semester 2
  const cleanAvailableMonths = (availableMonths || []).filter(isAcademicMonthKey);
  const sem1Available = cleanAvailableMonths.filter(k => SEMESTER_1_MONTH_NUMS.includes(k.split('-')[1]));
  const sem2Available = cleanAvailableMonths.filter(k => SEMESTER_2_MONTH_NUMS.includes(k.split('-')[1]));

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
      padding: '12px 16px',
      marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Single-Row Top Bar: Month picker [+] [ខែ ▾] on Left + Sliding Toggle Switch (📱 ⇄ 🖥️) on Right */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 4 : 6,
            color: '#b45309',
            fontWeight: 600,
            fontSize: isMobile ? 13 : 14,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <Calendar size={isMobile ? 16 : 18} />
            <span>ខែប្រចាំការ៖</span>
          </div>

          {/* [+] Compact Add Month Button */}
          <button
            type="button"
            onClick={() => setShowAddMonth(!showAddMonth)}
            title="បង្កើតខែថ្មី"
            style={{
              background: showAddMonth ? '#b45309' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: showAddMonth ? '#ffffff' : '#334155',
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0
            }}
          >
            <Plus size={16} />
          </button>

          {/* [ខែ ▾] Month Dropdown grouped by 2 Semesters (excluding March & April) */}
          <select
            value={currentMonth}
            onChange={e => onSelectMonth(e.target.value)}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0f172a',
              borderColor: '#cbd5e1',
              background: '#f8fafc',
              padding: isMobile ? '5px 8px' : '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              maxWidth: isMobile ? 115 : 'none',
              minWidth: 0
            }}
          >
            {sem1Available.length > 0 && (
              <optgroup label="ឆមាសទី ១ (ឧសភា - កញ្ញា)">
                {sem1Available.map(mKey => (
                  <option key={mKey} value={mKey}>
                    {formatMonthLabel(mKey)}
                  </option>
                ))}
              </optgroup>
            )}
            {sem2Available.length > 0 && (
              <optgroup label="ឆមាសទី ២ (តុលា - កុម្ភៈ)">
                {sem2Available.map(mKey => (
                  <option key={mKey} value={mKey}>
                    {formatMonthLabel(mKey)}
                  </option>
                ))}
              </optgroup>
            )}
            {sem1Available.length === 0 && sem2Available.length === 0 && cleanAvailableMonths.map(mKey => (
              <option key={mKey} value={mKey}>
                {formatMonthLabel(mKey)}
              </option>
            ))}
          </select>
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

      {/* New Month Popover Form (Grouped by Semester 1 & Semester 2, excluding March & April) */}
      {showAddMonth && (
        <form onSubmit={handleCreateMonth} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px dashed #e2e8f0',
          marginTop: 6
        }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>ជ្រើសរើសខែថ្មីក្នុងឆ្នាំ {useKhmerNumerals ? toKhmerDigits(newYear) : newYear}៖</span>
          <select
            value={newMonthNum}
            onChange={e => setNewMonthNum(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          >
            <optgroup label="ឆមាសទី ១ (ឧសភា - កញ្ញា)">
              {SEMESTER_1_MONTH_NUMS.map(val => {
                const mName = KHMER_SOLAR_MONTHS[parseInt(val, 10) - 1] || val;
                return <option key={val} value={val}>ខែ{mName}</option>;
              })}
            </optgroup>
            <optgroup label="ឆមាសទី ២ (តុលា - កុម្ភៈ)">
              {SEMESTER_2_MONTH_NUMS.map(val => {
                const mName = KHMER_SOLAR_MONTHS[parseInt(val, 10) - 1] || val;
                return <option key={val} value={val}>ខែ{mName}</option>;
              })}
            </optgroup>
          </select>
          <button
            type="submit"
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            យល់ព្រម
          </button>
          <button
            type="button"
            onClick={() => setShowAddMonth(false)}
            style={{
              background: 'transparent',
              color: '#64748b',
              fontSize: 12
            }}
          >
            បោះបង់
          </button>
        </form>
      )}
    </div>
  );
}
