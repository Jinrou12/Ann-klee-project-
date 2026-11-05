import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarRange,
  Search,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Users,
  Wallet
} from 'lucide-react';
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  formatCurrencyTotals
} from '../../utils/khmerNumerals';
import {
  getAvailablePeriods,
  computePeriodSummary,
  formatDurationTotals,
  formatMonthKeyLabel,
  exportSummaryToExcel,
  exportFinanceSummaryToExcel
} from '../../utils/summaryAnalytics';
import { KHMER_SOLAR_MONTHS } from '../../utils/khmerCalendar';
import PeriodDropdown from '../PeriodDropdown';

export default function SummaryMobileView({
  currentMonthKey = '2026-07',
  allLeaves = {},
  allFinance = {},
  studentMaster = [],
  useKhmerNumerals = true,
  onSelectMonth,
  onSelectYear
}) {
  // 0. Top-Level Section Switch: 'students' ⇄ 'finance'
  const [sectionMode, setSectionMode] = useState('students'); // 'students' | 'finance'

  // 1. Period Selection State ('month' vs 'year')
  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(() => (currentMonthKey || '2026-07').split('-')[0] || '2026');

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

  const { years, months } = useMemo(
    () => getAvailablePeriods(allLeaves, allFinance, currentMonthKey),
    [allLeaves, allFinance, currentMonthKey]
  );

  const monthsForYearSelector = useMemo(() => {
    const list = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      list.push(`${selectedYear}-${mStr}`);
    }
    return list;
  }, [selectedYear]);

  const summary = useMemo(() => computePeriodSummary({
    periodMode,
    selectedMonth,
    selectedYear,
    allLeaves,
    allFinance,
    studentMaster
  }), [periodMode, selectedMonth, selectedYear, allLeaves, allFinance, studentMaster]);

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
    if (g.includes('មត្តេយ្យ')) return 'មត្តេយ្យ';
    return `ថ្នាក់ទី ${fmtNum(g)}`;
  };

  return (
    <div className="summary-mobile-scope" style={{ paddingBottom: 88, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ================================================================== */}
      {/* 1. TOP CONTROL CARD: SECTION SWITCH + PERIOD SELECTOR              */}
      {/* ================================================================== */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {/* Row 1: Prominent 2-Section Switch (ផ្នែកសមណសិស្ស ⇄ ផ្នែកហិរញ្ញវត្ថុ) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 10,
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => setSectionMode('students')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 8px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              background: sectionMode === 'students' ? '#b45309' : 'transparent',
              color: sectionMode === 'students' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'students' ? '0 2px 6px rgba(180,83,9,0.2)' : 'none'
            }}
          >
            <Users size={15} />
            <span>ផ្នែកសមណសិស្ស</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionMode('finance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 8px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              background: sectionMode === 'finance' ? '#0f766e' : 'transparent',
              color: sectionMode === 'finance' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'finance' ? '0 2px 6px rgba(15,118,110,0.2)' : 'none'
            }}
          >
            <Wallet size={15} />
            <span>ផ្នែកហិរញ្ញវត្ថុ</span>
          </button>
        </div>

        {/* Row 2: Unified Period Selector (Custom Dropdown) + Excel Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            isMobile={true}
          />

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              background: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BRANCH A: STUDENT LEAVE SUMMARY (ផ្នែកសមណសិស្ស)                    */}
      {/* ================================================================== */}
      {sectionMode === 'students' && (
        <>
          {/* 3 Interactive Filter Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilterMode('has_leave')}
              style={{
                background: filterMode === 'has_leave' ? '#fffbeb' : '#ffffff',
                border: filterMode === 'has_leave' ? '2px solid #d97706' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>🟠 មានច្បាប់</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {fmtNum(summary.withLeaveCount)}
              </div>
              <div style={{ fontSize: 10, color: '#78716c' }}>
                {fmtNum(summary.totalLeaveRequests)} លើក
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('no_leave')}
              style={{
                background: filterMode === 'no_leave' ? '#f0fdf4' : '#ffffff',
                border: filterMode === 'no_leave' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>🟢 ច្បាប់ ០ដង</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {fmtNum(summary.withoutLeaveCount)}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                ទៀងទាត់
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                background: filterMode === 'all' ? '#eff6ff' : '#ffffff',
                border: filterMode === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>🔵 ទាំងអស់</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {fmtNum(summary.totalStudentsCount)}
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                អង្គសរុប
              </div>
            </button>
          </div>

          {/* Search, Grade Filter & Student Cards */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះសមណសិស្ស..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                {[
                  { id: 'all', label: 'ទាំងអស់' },
                  { id: 'មត្តេយ្យ', label: 'មត្តេយ្យ' },
                  { id: '១', label: `ទី${fmtNum(1)}` },
                  { id: '២', label: `ទី${fmtNum(2)}` },
                  { id: '៣', label: `ទី${fmtNum(3)}` }
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGradeFilter(g.id)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: gradeFilter === g.id ? '1px solid #b45309' : '1px solid #cbd5e1',
                      background: gradeFilter === g.id ? '#fef3c7' : '#f8fafc',
                      color: gradeFilter === g.id ? '#b45309' : '#475569'
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: '#334155'
              }}>
                <input
                  type="checkbox"
                  checked={showDurationColumn}
                  onChange={e => setShowDurationColumn(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#b45309' }}
                />
                <span>បង្ហាញថ្ងៃសរុប</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {displayedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                  មិនមានទិន្នន័យសមណសិស្សក្នុងជម្រើសនេះទេ។
                </div>
              ) : (
                displayedStudents.map((s, idx) => {
                  const isExpanded = expandedStudentId === s.id;
                  const hasLeave = s.leaveCount > 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => hasLeave && setExpandedStudentId(isExpanded ? null : s.id)}
                      style={{
                        border: isExpanded ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '10px 12px',
                        background: isExpanded ? '#fffbeb' : '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {fmtNum(idx + 1)}
                          </span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{formatGradeBadge(s.grade)}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {showDurationColumn && hasLeave && (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#334155',
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: 8
                            }}>
                              {formatDurationTotals(s.durationTotals, useKhmerNumerals)}
                            </span>
                          )}

                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 700,
                            background: hasLeave ? '#fef3c7' : '#dcfce7',
                            color: hasLeave ? '#b45309' : '#15803d'
                          }}>
                            {fmtNum(s.leaveCount)} ដង
                          </span>

                          {hasLeave && (
                            isExpanded ? <ChevronUp size={16} color="#b45309" /> : <ChevronDown size={16} color="#94a3b8" />
                          )}
                        </div>
                      </div>

                      {isExpanded && hasLeave && (
                        <div style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: '1px dashed #fcd34d',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          {s.records.map((r, rIdx) => (
                            <div
                              key={r.id || rIdx}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #fde68a',
                                borderRadius: 6,
                                padding: '6px 10px',
                                fontSize: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 6
                              }}
                            >
                              <span>
                                <strong>លើកទី {fmtNum(rIdx + 1)}៖</strong> {r.reason || '—'}
                              </span>
                              <span style={{ color: '#b45309', fontWeight: 700 }}>
                                {useKhmerNumerals ? toKhmerDigits(r.duration) : r.duration} • {useKhmerNumerals ? toKhmerDigits(r.date) : r.date}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* BRANCH B: FINANCE SUMMARY (ផ្នែកហិរញ្ញវត្ថុ - នៅខាងលើគេ!)            */}
      {/* ================================================================== */}
      {sectionMode === 'finance' && (
        <>
          {/* 3 Interactive Finance Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('income')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: financeCategoryFilter === 'income' ? '#dcfce7' : '#f0fdf4',
                border: financeCategoryFilter === 'income' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                padding: '12px 14px',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                💰 ចំណូលសរុប ({fmtNum(summary.financeSummary.incomeItems.length)} មុខ)
              </span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#14532d' }}>
                {formatCurrencyTotals(summary.financeSummary.incomeTotals, useKhmerNumerals)}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('expense')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: financeCategoryFilter === 'expense' ? '#fee2e2' : '#fef2f2',
                border: financeCategoryFilter === 'expense' ? '2px solid #dc2626' : '1px solid #fecaca',
                padding: '12px 14px',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
                💸 ចំណាយសរុប ({fmtNum(summary.financeSummary.expenseItems.length)} មុខ)
              </span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#7f1d1d' }}>
                {formatCurrencyTotals(summary.financeSummary.expenseTotals, useKhmerNumerals)}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('all')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: financeCategoryFilter === 'all' ? '#dbeafe' : '#eff6ff',
                border: financeCategoryFilter === 'all' ? '2px solid #2563eb' : '1px solid #bfdbfe',
                padding: '12px 14px',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                ⚖️ ប្រាក់នៅសល់សរុប (មើលទាំងអស់)
              </span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a' }}>
                {formatCurrencyTotals(summary.financeSummary.netTotals, useKhmerNumerals)}
              </strong>
            </button>
          </div>

          {/* Finance Items List */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                placeholder="ស្វែងរកមុខទំនិញ ឬបរិយាយ..."
                value={financeSearchTerm}
                onChange={e => setFinanceSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayedFinanceItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                  មិនមានទិន្នន័យចំណូល-ចំណាយក្នុងជម្រើសនេះទេ។
                </div>
              ) : (
                displayedFinanceItems.map((item, idx) => {
                  const isIncome = item.category === 'income';
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            background: isIncome ? '#dcfce7' : '#fee2e2',
                            color: isIncome ? '#15803d' : '#b91c1c'
                          }}>
                            {isIncome ? 'ចំណូល' : 'ចំណាយ'}
                          </span>
                          {periodMode === 'year' && (
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              {formatMonthKeyLabel(item.monthKey, useKhmerNumerals)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          {item.desc || '—'}
                        </div>
                        {item.qty && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            បរិមាណ៖ {useKhmerNumerals ? toKhmerDigits(item.qty) : item.qty}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: isIncome ? '#15803d' : '#b91c1c',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatMoney(item.total || 0, item.currency, useKhmerNumerals)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
