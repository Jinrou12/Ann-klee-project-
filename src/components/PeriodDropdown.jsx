import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, CalendarRange, ChevronDown, Check, Sparkles, BookOpen } from 'lucide-react';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import { toKhmerDigits } from '../utils/khmerNumerals';
import { SEMESTER_1_MONTH_NUMS, SEMESTER_2_MONTH_NUMS, ACADEMIC_MONTH_NUMS } from '../utils/summaryAnalytics';

/**
 * Modern Custom Period Dropdown (Shared across PC & Mobile /mp)
 * Supports:
 * - Full Academic Year (ពេញមួយឆ្នាំសិក្សា - ១០ ខែសិក្សា ដកខែមីនា និងខែមេសា)
 * - Semester 1 (ឆមាសទី ១៖ ឧសភា - កញ្ញា)
 * - Semester 2 (ឆមាសទី ២៖ តុលា - កុម្ភៈ)
 * - Individual Academic Months (ឧសភា..កញ្ញា និង តុលា..កុម្ភៈ)
 */
export default function PeriodDropdown({
  periodMode = 'month',
  setPeriodMode,
  selectedYear = '2026',
  selectedMonth = '2026-07',
  onSelectMonth,
  monthsForYearSelector = [],
  allLeaves = {},
  allFinance = {},
  allIdCards = {},
  sectionMode = 'students',
  fmtNum = (n) => toKhmerDigits(n),
  isMobile = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const isFinance = sectionMode === 'finance';
  const isIdCards = sectionMode === 'idcards';
  const accentColor = isFinance ? '#0f766e' : isIdCards ? '#1d4ed8' : '#b45309';
  const accentSoftBg = isFinance ? '#f0fdfa' : isIdCards ? '#eff6ff' : '#fffbeb';
  const accentBorder = isFinance ? '#99f6e4' : isIdCards ? '#bfdbfe' : '#fde68a';
  const accentDot = isFinance ? '#14b8a6' : isIdCards ? '#3b82f6' : '#f59e0b';

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const buildMonthItem = (mNum) => {
    const mKey = `${selectedYear}-${mNum}`;
    const mIdx = Math.max(0, Math.min(11, (parseInt(mNum, 10) || 1) - 1));
    const monthLabel = `ខែ${KHMER_SOLAR_MONTHS[mIdx] || mNum}`;

    let recordCount = 0;
    if (isFinance) {
      const fin = allFinance?.[mKey];
      const inc = Array.isArray(fin?.income) ? fin.income.length : 0;
      const exp = Array.isArray(fin?.expense) ? fin.expense.length : 0;
      recordCount = inc + exp;
    } else if (isIdCards) {
      const idc = allIdCards?.[mKey];
      recordCount = Array.isArray(idc)
        ? idc.filter((r) => r && (r.name || r.item)).length
        : 0;
    } else {
      const lv = allLeaves?.[mKey];
      recordCount = Array.isArray(lv)
        ? lv.filter((r) => r && (r.name || r.reason)).length
        : 0;
    }

    return {
      mKey,
      mNum,
      label: monthLabel,
      recordCount,
      hasData: recordCount > 0
    };
  };

  const semester1Items = useMemo(
    () => SEMESTER_1_MONTH_NUMS.map(buildMonthItem),
    [selectedYear, isFinance, isIdCards, allFinance, allIdCards, allLeaves]
  );

  const semester2Items = useMemo(
    () => SEMESTER_2_MONTH_NUMS.map(buildMonthItem),
    [selectedYear, isFinance, isIdCards, allFinance, allIdCards, allLeaves]
  );

  const monthItems = useMemo(
    () => [...semester1Items, ...semester2Items],
    [semester1Items, semester2Items]
  );

  const semester1TotalRecords = useMemo(
    () => semester1Items.reduce((sum, m) => sum + m.recordCount, 0),
    [semester1Items]
  );

  const semester2TotalRecords = useMemo(
    () => semester2Items.reduce((sum, m) => sum + m.recordCount, 0),
    [semester2Items]
  );

  const activeMonthsInYear = useMemo(
    () => monthItems.filter((m) => m.hasData).length,
    [monthItems]
  );

  const currentTriggerLabel = useMemo(() => {
    if (periodMode === 'year') {
      return `${fmtNum(selectedYear)} (ពេញមួយឆ្នាំសិក្សា)`;
    }
    if (periodMode === 'semester1') {
      return `ឆមាសទី ${fmtNum(1)} (ឧសភា-កញ្ញា)`;
    }
    if (periodMode === 'semester2') {
      return `ឆមាសទី ${fmtNum(2)} (តុលា-កុម្ភៈ)`;
    }
    const found = monthItems.find((m) => m.mKey === selectedMonth);
    if (found) return found.label;
    const parts = String(selectedMonth || '').split('-');
    const mIdx = (parseInt(parts[1], 10) || 1) - 1;
    return KHMER_SOLAR_MONTHS[mIdx] ? `ខែ${KHMER_SOLAR_MONTHS[mIdx]}` : String(selectedMonth || '');
  }, [periodMode, selectedYear, selectedMonth, monthItems, fmtNum]);

  const handleChoosePeriodMode = (mode) => {
    if (setPeriodMode) setPeriodMode(mode);
    setIsOpen(false);
  };

  const handleChooseMonth = (mKey) => {
    if (setPeriodMode) setPeriodMode('month');
    if (onSelectMonth) onSelectMonth(mKey);
    setIsOpen(false);
  };

  const renderMonthButton = (item) => {
    const isSelected = periodMode === 'month' && selectedMonth === item.mKey;
    return (
      <button
        key={item.mKey}
        type="button"
        onClick={() => handleChooseMonth(item.mKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '7px 10px',
          borderRadius: 8,
          border: isSelected ? `1.5px solid ${accentColor}` : '1px solid #f1f5f9',
          background: isSelected ? accentSoftBg : '#ffffff',
          color: isSelected ? accentColor : item.hasData ? '#0f172a' : '#64748b',
          fontSize: 13,
          fontWeight: isSelected ? 700 : item.hasData ? 600 : 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.12s ease'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              flexShrink: 0,
              background: item.hasData ? accentDot : '#e2e8f0'
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        </span>
        {isSelected ? (
          <Check size={13} color={accentColor} style={{ flexShrink: 0 }} />
        ) : item.hasData ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '0.5px 5px',
              borderRadius: 999,
              flexShrink: 0
            }}
          >
            {fmtNum(item.recordCount)}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className="period-dropdown-scope"
      style={{
        position: 'relative',
        display: isMobile ? 'flex' : 'inline-flex',
        flex: isMobile ? 1 : '0 0 auto',
        minWidth: 0
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: isMobile ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: isMobile ? '8px 12px' : '7px 13px',
          background: '#ffffff',
          color: '#0f172a',
          border: isOpen ? `1.5px solid ${accentColor}` : '1.5px solid #cbd5e1',
          borderRadius: 10,
          fontSize: isMobile ? 13.5 : 14,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: isOpen
            ? `0 0 0 3px ${isFinance ? 'rgba(15,118,110,0.12)' : 'rgba(180,83,9,0.12)'}`
            : '0 1px 2px rgba(15,23,42,0.05)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          {periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2' ? (
            <CalendarRange size={15} color={accentColor} style={{ flexShrink: 0 }} />
          ) : (
            <Calendar size={15} color={accentColor} style={{ flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTriggerLabel}
          </span>
        </span>
        <ChevronDown
          size={15}
          color="#64748b"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease'
          }}
        />
      </button>

      {/* Grouped Popover Card */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: isMobile ? 'min(325px, 90vw)' : 330,
            maxHeight: '80vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 13,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(15, 23, 42, 0.06)',
            padding: 10,
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {/* Group 1: Full Academic Year Summary */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                padding: '2px 6px 5px',
                letterSpacing: '0.01em'
              }}
            >
              សរុបប្រចាំឆ្នាំសិក្សា (១០ ខែ)
            </div>
            <button
              type="button"
              onClick={() => handleChoosePeriodMode('year')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8.5px 11px',
                borderRadius: 9,
                border: periodMode === 'year' ? `1.5px solid ${accentBorder}` : '1.5px solid transparent',
                background: periodMode === 'year' ? accentSoftBg : '#f8fafc',
                color: periodMode === 'year' ? accentColor : '#1e293b',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={15} color={accentColor} />
                <span>{fmtNum(selectedYear)} (ពេញមួយឆ្នាំសិក្សា)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {activeMonthsInYear > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: periodMode === 'year' ? '#ffffff' : '#e2e8f0',
                      color: periodMode === 'year' ? accentColor : '#475569'
                    }}
                  >
                    {fmtNum(activeMonthsInYear)} ខែ
                  </span>
                )}
                {periodMode === 'year' && <Check size={15} color={accentColor} />}
              </span>
            </button>
          </div>

          <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px' }} />

          {/* Group 2: Semester 1 (ឧសភា - កញ្ញា) */}
          <div>
            <button
              type="button"
              onClick={() => handleChoosePeriodMode('semester1')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 10px',
                marginBottom: 6,
                borderRadius: 8,
                border: periodMode === 'semester1' ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
                background: periodMode === 'semester1' ? accentSoftBg : '#f8fafc',
                color: periodMode === 'semester1' ? accentColor : '#0f172a',
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              title="ចុចដើម្បីមើល និងទាញយក PDF សរុបឆមាសទី ១ (ឧសភា - កញ្ញា)"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color={accentColor} />
                <span>ឆមាសទី {fmtNum(1)} (ឧសភា - កញ្ញា)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: periodMode === 'semester1' ? '#ffffff' : '#e2e8f0',
                    color: periodMode === 'semester1' ? accentColor : '#475569'
                  }}
                >
                  សរុប {fmtNum(semester1TotalRecords)}
                </span>
                {periodMode === 'semester1' && <Check size={14} color={accentColor} />}
              </span>
            </button>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 5
              }}
            >
              {semester1Items.map(renderMonthButton)}
            </div>
          </div>

          <div style={{ height: 1, background: '#f1f5f9', margin: '0 2px' }} />

          {/* Group 3: Semester 2 (តុលា - កុម្ភៈ) */}
          <div>
            <button
              type="button"
              onClick={() => handleChoosePeriodMode('semester2')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 10px',
                marginBottom: 6,
                borderRadius: 8,
                border: periodMode === 'semester2' ? `1.5px solid ${accentColor}` : '1px solid #e2e8f0',
                background: periodMode === 'semester2' ? accentSoftBg : '#f8fafc',
                color: periodMode === 'semester2' ? accentColor : '#0f172a',
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              title="ចុចដើម្បីមើល និងទាញយក PDF សរុបឆមាសទី ២ (តុលា - កុម្ភៈ)"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color={accentColor} />
                <span>ឆមាសទី {fmtNum(2)} (តុលា - កុម្ភៈ)</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: periodMode === 'semester2' ? '#ffffff' : '#e2e8f0',
                    color: periodMode === 'semester2' ? accentColor : '#475569'
                  }}
                >
                  សរុប {fmtNum(semester2TotalRecords)}
                </span>
                {periodMode === 'semester2' && <Check size={14} color={accentColor} />}
              </span>
            </button>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 5
              }}
            >
              {semester2Items.map(renderMonthButton)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
