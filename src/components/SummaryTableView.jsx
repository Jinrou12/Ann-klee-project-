import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarRange,
  Search,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck,
  Clock,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  formatCurrencyTotals
} from '../utils/khmerNumerals';
import {
  getAvailablePeriods,
  computePeriodSummary,
  formatDurationTotals,
  formatMonthKeyLabel,
  exportSummaryToExcel,
  exportFinanceSummaryToExcel
} from '../utils/summaryAnalytics';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import PeriodDropdown from './PeriodDropdown';

export default function SummaryTableView({
  currentMonthKey = '2026-07',
  allLeaves = {},
  allFinance = {},
  studentMaster = [],
  useKhmerNumerals = true,
  onSelectMonth,
  onSelectYear
}) {
  // 0. Top-Level Section Switch: 'students' (ផ្នែកសមណសិស្ស) vs 'finance' (ផ្នែកហិរញ្ញវត្ថុ)
  const [sectionMode, setSectionMode] = useState('students'); // 'students' | 'finance'

  // 1. Period Selection State ('month' vs 'year')
  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(() => (currentMonthKey || '2026-07').split('-')[0] || '2026');

  // Keep selectedMonth in sync when user changes top MonthSelector bar
  useEffect(() => {
    if (currentMonthKey) {
      setSelectedMonth(currentMonthKey);
      const y = currentMonthKey.split('-')[0];
      if (y) setSelectedYear(y);
    }
  }, [currentMonthKey]);

  // 2. Student Section Filter State ('has_leave' | 'no_leave' | 'all')
  const [filterMode, setFilterMode] = useState('has_leave');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDurationColumn, setShowDurationColumn] = useState(true);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // 3. Finance Section Filter State ('all' | 'income' | 'expense')
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState('all');
  const [financeSearchTerm, setFinanceSearchTerm] = useState('');

  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

  // Available years & months
  const { years, months } = useMemo(
    () => getAvailablePeriods(allLeaves, allFinance, currentMonthKey),
    [allLeaves, allFinance, currentMonthKey]
  );

  // All 12 months in chronological order (01 to 12: មករា ដល់ ធ្នូ) for selectedYear
  const monthsForYearSelector = useMemo(() => {
    const list = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      list.push(`${selectedYear}-${mStr}`);
    }
    return list;
  }, [selectedYear]);

  // Core Aggregation
  const summary = useMemo(() => computePeriodSummary({
    periodMode,
    selectedMonth,
    selectedYear,
    allLeaves,
    allFinance,
    studentMaster
  }), [periodMode, selectedMonth, selectedYear, allLeaves, allFinance, studentMaster]);

  // Active Student Rows
  const displayedStudents = useMemo(() => {
    let base = summary.allStudentsSorted;
    if (filterMode === 'has_leave') {
      base = summary.studentsWithLeave;
    } else if (filterMode === 'no_leave') {
      base = summary.studentsWithoutLeave;
    }

    if (gradeFilter !== 'all') {
      base = base.filter(s => String(s.grade || '').trim() === gradeFilter);
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      base = base.filter(s =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.grade || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [summary, filterMode, gradeFilter, searchTerm]);

  // Active Finance Items
  const displayedFinanceItems = useMemo(() => {
    let items = summary.financeSummary.allItems || [];
    if (financeCategoryFilter === 'income') {
      items = summary.financeSummary.incomeItems || [];
    } else if (financeCategoryFilter === 'expense') {
      items = summary.financeSummary.expenseItems || [];
    }

    const q = financeSearchTerm.trim().toLowerCase();
    if (q) {
      items = items.filter(item =>
        String(item.desc || '').toLowerCase().includes(q) ||
        String(item.qty || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [summary.financeSummary, financeCategoryFilter, financeSearchTerm]);

  const periodTitleLabel = useMemo(() => {
    if (periodMode === 'year') {
      return `សរុបប្រចាំឆ្នាំ ${fmtNum(selectedYear)}`;
    }
    return formatMonthKeyLabel(selectedMonth, useKhmerNumerals);
  }, [periodMode, selectedMonth, selectedYear, useKhmerNumerals]);

  const handleMonthChange = (newMonthKey) => {
    setSelectedMonth(newMonthKey);
    const [y] = newMonthKey.split('-');
    if (y) setSelectedYear(y);
    if (onSelectMonth) {
      onSelectMonth(newMonthKey);
    }
  };

  const handleExportExcel = () => {
    if (sectionMode === 'finance') {
      exportFinanceSummaryToExcel({
        financeSummary: summary.financeSummary,
        periodLabel: periodTitleLabel,
        useKhmerNumerals
      });
    } else {
      exportSummaryToExcel({
        rows: displayedStudents,
        periodLabel: periodTitleLabel,
        showDuration: showDurationColumn,
        useKhmerNumerals
      });
    }
  };

  const formatGradeBadge = (grade) => {
    const g = String(grade || '').trim();
    if (!g || g === '—') return '—';
    if (g.includes('មត្តេយ្យ')) return 'ថ្នាក់មត្តេយ្យ';
    return `ថ្នាក់ទី ${fmtNum(g)}`;
  };

  return (
    <div className="summary-pc-scope" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ================================================================== */}
      {/* STEP 1: TOP CONTROL BAR (SECTION SWITCH + PERIOD SELECTOR)         */}
      {/* ================================================================== */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Row 1: Prominent 2-Section Switch (ផ្នែកសមណសិស្ស ⇄ ផ្នែកហិរញ្ញវត្ថុ) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: '#f1f5f9',
          padding: 6,
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setSectionMode('students')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '11px 18px',
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 700,
              border: sectionMode === 'students' ? '1.5px solid #b45309' : '1.5px solid transparent',
              cursor: 'pointer',
              background: sectionMode === 'students' ? '#b45309' : 'transparent',
              color: sectionMode === 'students' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'students' ? '0 3px 10px rgba(180,83,9,0.22)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Users size={19} />
            <span>ផ្នែកសមណសិស្ស (ច្បាប់ឈប់)</span>
            <span style={{
              fontSize: 12,
              padding: '2px 9px',
              borderRadius: 20,
              background: sectionMode === 'students' ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
              color: sectionMode === 'students' ? '#ffffff' : '#475569'
            }}>
              {fmtNum(summary.withLeaveCount)} អង្គសុំច្បាប់
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSectionMode('finance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '11px 18px',
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 700,
              border: sectionMode === 'finance' ? '1.5px solid #0f766e' : '1.5px solid transparent',
              cursor: 'pointer',
              background: sectionMode === 'finance' ? '#0f766e' : 'transparent',
              color: sectionMode === 'finance' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'finance' ? '0 3px 10px rgba(15,118,110,0.22)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Wallet size={19} />
            <span>ផ្នែកហិរញ្ញវត្ថុ (ចំណូល-ចំណាយ)</span>
            <span style={{
              fontSize: 12,
              padding: '2px 9px',
              borderRadius: 20,
              background: sectionMode === 'finance' ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
              color: sectionMode === 'finance' ? '#ffffff' : '#475569'
            }}>
              នៅសល់ {formatCurrencyTotals(summary.financeSummary.netTotals, useKhmerNumerals)}
            </span>
          </button>
        </div>

        {/* Row 2: Period Picker (មើលតាមខែ / ពេញ ១ ឆ្នាំ) + Export Excel */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Unified Period Selector: Year + Clean Months (Custom Dropdown) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={15} color="#b45309" />
                <span>កាលបរិច្ឆេទ៖</span>
              </span>
              <PeriodDropdown
                periodMode={periodMode}
                setPeriodMode={setPeriodMode}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleMonthChange}
                monthsForYearSelector={monthsForYearSelector}
                allLeaves={allLeaves}
                allFinance={allFinance}
                sectionMode={sectionMode}
                fmtNum={fmtNum}
              />
            </div>

            {periodMode === 'year' && (
              <span style={{
                fontSize: 12,
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '4px 10px',
                borderRadius: 20,
                fontWeight: 600
              }}>
                បូកសរុបពី {fmtNum(summary.targetMonthKeys.length)} ខែដែលមានទិន្នន័យ
              </span>
            )}
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              background: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>
              Export Excel ({sectionMode === 'finance' ? 'ហិរញ្ញវត្ថុ' : 'សមណសិស្ស'})
            </span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BRANCH A: STUDENT LEAVE SUMMARY SECTION (ផ្នែកសមណសិស្ស)             */}
      {/* ================================================================== */}
      {sectionMode === 'students' && (
        <>
          {/* 3 BIG INTERACTIVE FILTER CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14
          }}>
            {/* CARD 1: មានសុំច្បាប់ (Has Leave) */}
            <button
              type="button"
              onClick={() => setFilterMode('has_leave')}
              style={{
                textAlign: 'left',
                background: filterMode === 'has_leave' ? '#fffbeb' : '#ffffff',
                border: filterMode === 'has_leave' ? '2px solid #d97706' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'has_leave' ? '0 4px 12px rgba(217,119,6,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>
                  <span>🟠 សមណសិស្សមានសុំច្បាប់</span>
                  {filterMode === 'has_leave' && (
                    <span style={{ background: '#d97706', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {fmtNum(summary.withLeaveCount)} <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, color: '#78716c', marginTop: 4 }}>
                  សរុប {fmtNum(summary.totalLeaveRequests)} លើក ({formatDurationTotals(summary.overallDurationTotals, useKhmerNumerals)})
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={22} />
              </div>
            </button>

            {/* CARD 2: អត់សុំច្បាប់សោះ ០ ដង (Zero Leave) */}
            <button
              type="button"
              onClick={() => setFilterMode('no_leave')}
              style={{
                textAlign: 'left',
                background: filterMode === 'no_leave' ? '#f0fdf4' : '#ffffff',
                border: filterMode === 'no_leave' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'no_leave' ? '0 4px 12px rgba(22,163,74,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                  <span>🟢 អត់សុំច្បាប់សោះ (០ ដង)</span>
                  {filterMode === 'no_leave' && (
                    <span style={{ background: '#16a34a', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {fmtNum(summary.withoutLeaveCount)} <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  សមណសិស្សមករៀនទៀងទាត់ (គ្មានច្បាប់)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserCheck size={22} />
              </div>
            </button>

            {/* CARD 3: មើលទាំងអស់ (All Students) */}
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                textAlign: 'left',
                background: filterMode === 'all' ? '#eff6ff' : '#ffffff',
                border: filterMode === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'all' ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                  <span>🔵 សមណសិស្សទាំងអស់</span>
                  {filterMode === 'all' && (
                    <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {fmtNum(summary.totalStudentsCount)} <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  បង្ហាញបញ្ជីរួមទាំងអ្នកសុំច្បាប់ និងអត់សុំច្បាប់
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#dbeafe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={22} />
              </div>
            </button>
          </div>

          {/* STUDENT SUMMARY TABLE */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Table Toolbar */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                {/* Search Box */}
                <div style={{ position: 'relative', minWidth: 230 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
                  <input
                    type="text"
                    placeholder="ស្វែងរកឈ្មោះសមណសិស្ស..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px 6px 32px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff'
                    }}
                  />
                </div>

                {/* Grade Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'គ្រប់ថ្នាក់' },
                    { id: 'មត្តេយ្យ', label: 'មត្តេយ្យ' },
                    { id: '១', label: `ថ្នាក់ទី ${fmtNum(1)}` },
                    { id: '២', label: `ថ្នាក់ទី ${fmtNum(2)}` },
                    { id: '៣', label: `ថ្នាក់ទី ${fmtNum(3)}` }
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGradeFilter(g.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: gradeFilter === g.id ? '1px solid #b45309' : '1px solid #cbd5e1',
                        background: gradeFilter === g.id ? '#fef3c7' : '#ffffff',
                        color: gradeFilter === g.id ? '#b45309' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Checkbox for Total Duration Column */}
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none',
                background: '#ffffff',
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}>
                <input
                  type="checkbox"
                  checked={showDurationColumn}
                  onChange={e => setShowDurationColumn(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#b45309', cursor: 'pointer' }}
                />
                <span>បង្ហាញចំនួនថ្ងៃ/ពេលសរុប</span>
              </label>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', width: 65, textAlign: 'center' }}>ល.រ</th>
                    <th style={{ padding: '12px 14px' }}>គោត្តនាម-នាម</th>
                    <th style={{ padding: '12px 14px', width: 140, textAlign: 'center' }}>ថ្នាក់</th>
                    <th style={{ padding: '12px 14px', width: 160, textAlign: 'center' }}>ចំនួនដងសុំច្បាប់</th>
                    {showDurationColumn && (
                      <th style={{ padding: '12px 14px', width: 180, textAlign: 'center' }}>រយៈពេលសរុប</th>
                    )}
                    <th style={{ padding: '12px 14px', width: 150, textAlign: 'center' }}>ប្រវត្តិលម្អិត</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showDurationColumn ? 6 : 5}
                        style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b', fontSize: 14 }}
                      >
                        មិនមានទិន្នន័យសមណសិស្សក្នុងជម្រើសនេះទេ។
                      </td>
                    </tr>
                  ) : (
                    displayedStudents.map((s, idx) => {
                      const isExpanded = expandedStudentId === s.id;
                      const hasLeave = s.leaveCount > 0;
                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            onClick={() => hasLeave && setExpandedStudentId(isExpanded ? null : s.id)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isExpanded ? '#fffbeb' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfd'),
                              cursor: hasLeave ? 'pointer' : 'default',
                              transition: 'background 0.12s'
                            }}
                          >
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {fmtNum(idx + 1)}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                              {s.name}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600
                              }}>
                                {formatGradeBadge(s.grade)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 700,
                                background: hasLeave ? '#fef3c7' : '#dcfce7',
                                color: hasLeave ? '#b45309' : '#15803d',
                                border: hasLeave ? '1px solid #fde68a' : '1px solid #bbf7d0'
                              }}>
                                {fmtNum(s.leaveCount)} ដង
                              </span>
                            </td>
                            {showDurationColumn && (
                              <td style={{
                                padding: '10px 14px',
                                textAlign: 'center',
                                fontWeight: hasLeave ? 700 : 400,
                                color: hasLeave ? '#0f172a' : '#94a3b8'
                              }}>
                                {formatDurationTotals(s.durationTotals, useKhmerNumerals)}
                              </td>
                            )}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {hasLeave ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedStudentId(isExpanded ? null : s.id);
                                  }}
                                  style={{
                                    background: isExpanded ? '#b45309' : '#f8fafc',
                                    color: isExpanded ? '#ffffff' : '#b45309',
                                    border: '1px solid #fcd34d',
                                    borderRadius: 6,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span>{isExpanded ? 'លាក់ទុក' : 'មើលលម្អិត'}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>គ្មានច្បាប់</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Leave History Details */}
                          {isExpanded && hasLeave && (
                            <tr style={{ background: '#fffbeb', borderBottom: '2px solid #fde68a' }}>
                              <td colSpan={showDurationColumn ? 6 : 5} style={{ padding: '12px 24px' }}>
                                <div style={{
                                  background: '#ffffff',
                                  border: '1px solid #fde68a',
                                  borderRadius: 8,
                                  padding: '10px 14px'
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                                    📋 ប្រវត្តិសុំច្បាប់របស់ «{s.name}» ({periodTitleLabel})៖
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {s.records.map((r, rIdx) => (
                                      <div
                                        key={r.id || rIdx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: 10,
                                          padding: '6px 10px',
                                          background: '#f8fafc',
                                          borderRadius: 6,
                                          fontSize: 13
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{
                                            background: '#e2e8f0',
                                            color: '#334155',
                                            fontWeight: 700,
                                            fontSize: 11,
                                            padding: '2px 8px',
                                            borderRadius: 10
                                          }}>
                                            លើកទី {fmtNum(rIdx + 1)}
                                          </span>
                                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                            មូលហេតុ៖ {r.reason || '—'}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#475569' }}>
                                          <span>
                                            រយៈពេល៖ <strong style={{ color: '#b45309' }}>{useKhmerNumerals ? toKhmerDigits(r.duration) : r.duration}</strong>
                                          </span>
                                          <span>
                                            កាលបរិច្ឆេទ៖ <strong>{useKhmerNumerals ? toKhmerDigits(r.date) : r.date}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* BRANCH B: FINANCE SUMMARY SECTION (ផ្នែកហិរញ្ញវត្ថុ - នៅខាងលើគេ!)    */}
      {/* ================================================================== */}
      {sectionMode === 'finance' && (
        <>
          {/* 3 BIG INTERACTIVE FINANCE CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14
          }}>
            {/* CARD 1: ចំណូលសរុប (Total Income) */}
            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('income')}
              style={{
                textAlign: 'left',
                background: financeCategoryFilter === 'income' ? '#f0fdf4' : '#ffffff',
                border: financeCategoryFilter === 'income' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'income' ? '0 4px 12px rgba(22,163,74,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                  <span>💰 ចំណូលសរុប ({periodMode === 'year' ? 'ប្រចាំឆ្នាំ' : 'ប្រចាំខែ'})</span>
                  {financeCategoryFilter === 'income' && (
                    <span style={{ background: '#16a34a', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
                  {formatCurrencyTotals(summary.financeSummary.incomeTotals, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  សរុប {fmtNum(summary.financeSummary.incomeItems.length)} មុខទំនិញ (ចុចមើលតែចំណូល)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={22} />
              </div>
            </button>

            {/* CARD 2: ចំណាយសរុប (Total Expense) */}
            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('expense')}
              style={{
                textAlign: 'left',
                background: financeCategoryFilter === 'expense' ? '#fef2f2' : '#ffffff',
                border: financeCategoryFilter === 'expense' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'expense' ? '0 4px 12px rgba(220,38,38,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                  <span>💸 ចំណាយសរុប ({periodMode === 'year' ? 'ប្រចាំឆ្នាំ' : 'ប្រចាំខែ'})</span>
                  {financeCategoryFilter === 'expense' && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#7f1d1d', lineHeight: 1.2 }}>
                  {formatCurrencyTotals(summary.financeSummary.expenseTotals, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  សរុប {fmtNum(summary.financeSummary.expenseItems.length)} មុខទំនិញ (ចុចមើលតែចំណាយ)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingDown size={22} />
              </div>
            </button>

            {/* CARD 3: ប្រាក់នៅសល់សរុប (Net Balance / View All) */}
            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('all')}
              style={{
                textAlign: 'left',
                background: financeCategoryFilter === 'all' ? '#eff6ff' : '#ffffff',
                border: financeCategoryFilter === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'all' ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                  <span>⚖️ ប្រាក់នៅសល់សរុប (មើលទាំងអស់)</span>
                  {financeCategoryFilter === 'all' && (
                    <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
                  {formatCurrencyTotals(summary.financeSummary.netTotals, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  បង្ហាញរួមទាំងចំណូល និងចំណាយ ({fmtNum(summary.financeSummary.allItems.length)} មុខ)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#dbeafe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Scale size={22} />
              </div>
            </button>
          </div>

          {/* YEARLY BREAKDOWN BY MONTH (When viewing Full Year) */}
          {periodMode === 'year' && summary.financeSummary.monthlyBreakdown.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                padding: '12px 18px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 700,
                fontSize: 14,
                color: '#0f172a'
              }}>
                📊 តារាងសង្ខេបចំណូល-ចំណាយតាមខែនីមួយៗក្នុងឆ្នាំ {fmtNum(selectedYear)}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', width: 65, textAlign: 'center' }}>ល.រ</th>
                      <th style={{ padding: '10px 14px' }}>ខែ-ឆ្នាំ</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>ចំណូលសរុប</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>ចំណាយសរុប</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>ប្រាក់នៅសល់</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.financeSummary.monthlyBreakdown.map((mRow, idx) => (
                      <tr key={mRow.monthKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {fmtNum(idx + 1)}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {formatMonthKeyLabel(mRow.monthKey, useKhmerNumerals)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                          {formatCurrencyTotals(mRow.incomeTotals, useKhmerNumerals)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                          {formatCurrencyTotals(mRow.expenseTotals, useKhmerNumerals)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#1d4ed8' }}>
                          {formatCurrencyTotals(mRow.balanceTotals, useKhmerNumerals)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DETAILED FINANCE ITEMS TABLE */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ position: 'relative', minWidth: 250 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
                <input
                  type="text"
                  placeholder="ស្វែងរកមុខទំនិញ ឬបរិយាយ..."
                  value={financeSearchTerm}
                  onChange={e => setFinanceSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 32px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'all', label: 'បង្ហាញទាំងអស់' },
                  { id: 'income', label: '💰 តែចំណូល' },
                  { id: 'expense', label: '💸 តែចំណាយ' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFinanceCategoryFilter(tab.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: financeCategoryFilter === tab.id ? '1px solid #0f766e' : '1px solid #cbd5e1',
                      background: financeCategoryFilter === tab.id ? '#ccfbf1' : '#ffffff',
                      color: financeCategoryFilter === tab.id ? '#0f766e' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', width: 65, textAlign: 'center' }}>ល.រ</th>
                    <th style={{ padding: '12px 14px', width: 120, textAlign: 'center' }}>ប្រភេទ</th>
                    {periodMode === 'year' && (
                      <th style={{ padding: '12px 14px', width: 150, textAlign: 'center' }}>ខែ</th>
                    )}
                    <th style={{ padding: '12px 14px' }}>បរិយាយមុខទំនិញ / ចំណូល-ចំណាយ</th>
                    <th style={{ padding: '12px 14px', width: 130, textAlign: 'center' }}>បរិមាណ</th>
                    <th style={{ padding: '12px 14px', width: 150, textAlign: 'right' }}>តម្លៃរាយ</th>
                    <th style={{ padding: '12px 14px', width: 160, textAlign: 'right' }}>តម្លៃសរុប</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFinanceItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={periodMode === 'year' ? 7 : 6}
                        style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b', fontSize: 14 }}
                      >
                        មិនមានទិន្នន័យចំណូល-ចំណាយក្នុងជម្រើសនេះទេ។
                      </td>
                    </tr>
                  ) : (
                    displayedFinanceItems.map((item, idx) => {
                      const isIncome = item.category === 'income';
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {fmtNum(idx + 1)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: isIncome ? '#dcfce7' : '#fee2e2',
                              color: isIncome ? '#15803d' : '#b91c1c'
                            }}>
                              {isIncome ? 'ចំណូល' : 'ចំណាយ'}
                            </span>
                          </td>
                          {periodMode === 'year' && (
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                              {formatMonthKeyLabel(item.monthKey, useKhmerNumerals)}
                            </td>
                          )}
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.desc || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>
                            {item.qty ? (useKhmerNumerals ? toKhmerDigits(item.qty) : item.qty) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>
                            {item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmerNumerals) : '—'}
                          </td>
                          <td style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isIncome ? '#15803d' : '#b91c1c'
                          }}>
                            {formatMoney(item.total || 0, item.currency, useKhmerNumerals)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
