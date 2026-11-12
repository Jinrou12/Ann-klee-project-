import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarRange,
  Search,
  FileSpreadsheet,
  Download,
  Loader2,
  FileText,
  Table2,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck,
  Clock,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale
} from 'lucide-react';
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit
} from '../utils/khmerNumerals';
import {
  getAvailablePeriods,
  computePeriodSummary,
  formatDurationTotals,
  formatCondensedReasons,
  formatMonthKeyLabel,
  exportSummaryToExcel,
  exportIdCardSummaryToExcel,
  exportFinanceSummaryToExcel,
  ACADEMIC_MONTH_NUMS
} from '../utils/summaryAnalytics';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import { exportLeaveToExcel, exportIdCardToExcel, exportFinanceDualExcel } from '../utils/excelExporter';
import { exportLeaveToWord, exportIdCardToWord, exportFinanceDualWord } from '../utils/wordExporter';
import { exportElementToPdf, exportDualElementsToPdf } from '../utils/pdfExporter';
import PeriodDropdown from './PeriodDropdown';
import A4SheetScaler from './A4SheetScaler';
import OfficialLeaveDocument from './OfficialLeaveDocument';
import OfficialIdCardDocument from './OfficialIdCardDocument';
import OfficialFinanceDocument from './OfficialFinanceDocument';
import OfficialFinanceSummaryDocument from './OfficialFinanceSummaryDocument';

export default function SummaryTableView({
  currentMonthKey = '2026-07',
  allLeaves = {},
  allFinance = {},
  allIdCards = {},
  studentMaster = [],
  metadata = {},
  useKhmerNumerals = true,
  onSelectMonth,
  onSelectYear
}) {
  // 0. Top-Level Section Switch: 'students' (ច្បាប់ឈប់) | 'idcards' (ទិញ ID កាត) | 'finance' (ចំណូល-ចំណាយ)
  const [sectionMode, setSectionMode] = useState('students'); // 'students' | 'idcards' | 'finance'

  // 1. Period Selection State ('month' | 'semester1' | 'semester2' | 'year')
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(() => (currentMonthKey || '2026-07').split('-')[0] || '2026');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [viewFormatMode, setViewFormatMode] = useState('official_a4'); // 'official_a4' | 'analytics'
  const [financeViewType, setFinanceViewType] = useState('full'); // 'full' (ពេញ) | 'summary' (សង្ខេប)

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

  // 2.5 ID Card Section Filter State ('all' | 'ថង' | 'ID' | 'ខ្សែ' | 'មួយឈុត')
  const [idCardItemFilter, setIdCardItemFilter] = useState('all');
  const [idCardGradeFilter, setIdCardGradeFilter] = useState('all');
  const [idCardSearchTerm, setIdCardSearchTerm] = useState('');

  // 3. Finance Section Filter State ('all' | 'income' | 'expense')
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState('all');
  const [financeSearchTerm, setFinanceSearchTerm] = useState('');

  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

  // Available years & months
  const { years, months } = useMemo(
    () => getAvailablePeriods(allLeaves, allFinance, currentMonthKey, allIdCards),
    [allLeaves, allFinance, currentMonthKey, allIdCards]
  );

  // Academic months (10 months, excluding March 03 & April 04) for selectedYear
  const monthsForYearSelector = useMemo(
    () => ACADEMIC_MONTH_NUMS.map(mStr => `${selectedYear}-${mStr}`),
    [selectedYear]
  );

  // Core Aggregation
  const summary = useMemo(() => computePeriodSummary({
    periodMode,
    selectedMonth,
    selectedYear,
    allLeaves,
    allFinance,
    allIdCards,
    studentMaster
  }), [periodMode, selectedMonth, selectedYear, allLeaves, allFinance, allIdCards, studentMaster]);

  const isOverallDeficit = useMemo(() => {
    return isFinanceDeficit(
      summary?.financeSummary?.netTotals,
      summary?.financeSummary?.netBalance
    );
  }, [summary?.financeSummary?.netTotals, summary?.financeSummary?.netBalance]);

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
        String(s.grade || '').toLowerCase().includes(q) ||
        (s.records || []).some(r => String(r.reason || '').toLowerCase().includes(q))
      );
    }

    return base;
  }, [summary, filterMode, gradeFilter, searchTerm]);

  // Active ID Card Purchase Records
  const displayedIdCardRecords = useMemo(() => {
    let list = summary?.idCardSummary?.allRecords || [];
    if (idCardItemFilter !== 'all') {
      list = list.filter(r => {
        const itemStr = String(r.item || '').trim();
        if (idCardItemFilter === 'មួយឈុត') {
          return itemStr.includes('មួយឈុត') || itemStr.includes('ឈុត');
        }
        if (idCardItemFilter === 'ID') {
          return (itemStr.toUpperCase().includes('ID') || itemStr.includes('កាត')) && !itemStr.includes('មួយឈុត');
        }
        return itemStr.includes(idCardItemFilter) && !itemStr.includes('មួយឈុត');
      });
    }

    if (idCardGradeFilter !== 'all') {
      list = list.filter(r => String(r.grade || '').trim() === idCardGradeFilter);
    }

    const q = idCardSearchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.item || '').toLowerCase().includes(q) ||
        String(r.grade || '').toLowerCase().includes(q) ||
        String(r.date || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary?.idCardSummary?.allRecords, idCardItemFilter, idCardGradeFilter, idCardSearchTerm]);

  const displayedIdCardTotalAmount = useMemo(
    () => displayedIdCardRecords.reduce((sum, r) => sum + (Number(r.price) || 0), 0),
    [displayedIdCardRecords]
  );

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

  const activeMonthName = useMemo(() => {
    const [, mStr] = String(selectedMonth || '2026-07').split('-');
    const idx = Math.max(0, Math.min(11, (parseInt(mStr, 10) || 7) - 1));
    return KHMER_SOLAR_MONTHS[idx] || 'កក្កដា';
  }, [selectedMonth]);

  const yearDisplay = useMemo(
    () => (useKhmerNumerals ? toKhmerDigits(selectedYear) : String(selectedYear)),
    [selectedYear, useKhmerNumerals]
  );

  const effectiveReportMonthKey = useMemo(() => {
    if (periodMode === 'semester1') return `${selectedYear}-09`;
    if (periodMode === 'semester2') return `${selectedYear}-02`;
    if (periodMode === 'year') return `${selectedYear}-02`;
    return selectedMonth;
  }, [periodMode, selectedMonth, selectedYear]);

  const periodTitleLabel = useMemo(() => {
    if (periodMode === 'year') {
      return `ឆ្នាំ${fmtNum(selectedYear)}`;
    }
    if (periodMode === 'semester1') {
      return `ឆមាសទី ${fmtNum(1)} ឆ្នាំ${fmtNum(selectedYear)}`;
    }
    if (periodMode === 'semester2') {
      return `ឆមាសទី ${fmtNum(2)} ឆ្នាំ${fmtNum(selectedYear)}`;
    }
    return formatMonthKeyLabel(selectedMonth, useKhmerNumerals);
  }, [periodMode, selectedMonth, selectedYear, useKhmerNumerals]);

  const periodPhraseForReport = useMemo(() => {
    if (periodMode === 'year') return `ក្នុងឆ្នាំសិក្សា ${yearDisplay}`;
    if (periodMode === 'semester1') return `ក្នុងឆមាសទី ${fmtNum(1)} ឆ្នាំ${yearDisplay}`;
    if (periodMode === 'semester2') return `ក្នុងឆមាសទី ${fmtNum(2)} ឆ្នាំ${yearDisplay}`;
    return `ក្នុងខែ${activeMonthName} ឆ្នាំ${yearDisplay}`;
  }, [periodMode, yearDisplay, activeMonthName, fmtNum]);

  const periodShortPhrase = useMemo(() => {
    if (periodMode === 'year') return `ក្នុងឆ្នាំសិក្សា${yearDisplay}`;
    if (periodMode === 'semester1') return `ក្នុងឆមាសទី ${fmtNum(1)}`;
    if (periodMode === 'semester2') return `ក្នុងឆមាសទី ${fmtNum(2)}`;
    return `ក្នុងខែ${activeMonthName}`;
  }, [periodMode, yearDisplay, activeMonthName, fmtNum]);

  const isMultiMonthPeriod = periodMode === 'semester1' || periodMode === 'semester2' || periodMode === 'year';

  // Records formatted for OfficialLeaveDocument (PDF 2 A4 Format)
  const leaveRecordsForOfficialDoc = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (filterMode === 'has_leave') {
      if (isMultiMonthPeriod) {
        return displayedStudents.map(s => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          reason: formatCondensedReasons(s.records, { maxReasons: 2, useKhmerNumerals }),
          duration: formatDurationTotals(s.durationTotals, useKhmerNumerals),
          date: `${fmtNum(s.leaveCount)} ដង`,
          note: ''
        }));
      }
      return (summary.allLeaveRecords || []).filter(r => {
        if (gradeFilter !== 'all' && String(r.grade || '').trim() !== gradeFilter) return false;
        if (q) {
          const matchName = String(r.name || '').toLowerCase().includes(q);
          const matchReason = String(r.reason || '').toLowerCase().includes(q);
          if (!matchName && !matchReason) return false;
        }
        return true;
      });
    }
    if (filterMode === 'no_leave') {
      return displayedStudents.map(s => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        reason: 'មករៀនទៀងទាត់ (គ្មានច្បាប់)',
        duration: '០ថ្ងៃ',
        date: '—',
        note: ''
      }));
    }
    // filterMode === 'all'
    return displayedStudents.map(s => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      reason: s.leaveCount > 0
        ? formatCondensedReasons(s.records, { maxReasons: 2, useKhmerNumerals })
        : 'មករៀនទៀងទាត់ (គ្មានច្បាប់)',
      duration: s.leaveCount > 0
        ? formatDurationTotals(s.durationTotals, useKhmerNumerals)
        : '០ថ្ងៃ',
      date: s.leaveCount > 0 ? `${fmtNum(s.leaveCount)} ដង` : '—',
      note: ''
    }));
  }, [summary.allLeaveRecords, filterMode, gradeFilter, searchTerm, displayedStudents, useKhmerNumerals, isMultiMonthPeriod, fmtNum]);

  const leaveCustomPeriodTitle = useMemo(() => {
    if (filterMode === 'no_leave') {
      return `បញ្ជីសមណសិស្សគ្មានច្បាប់សោះ (០ដង) ${periodPhraseForReport}`;
    }
    if (filterMode === 'all') {
      return `ស្ថិតិរួមសមណសិស្សទាំងអស់ ${periodPhraseForReport}`;
    }
    return `ចំនួនសមណសិស្សសុំច្បាប់ ${periodPhraseForReport}`;
  }, [filterMode, periodPhraseForReport]);

  const leaveCustomSummaryText = useMemo(() => {
    const countStr = fmtNum(leaveRecordsForOfficialDoc.length);
    if (filterMode === 'no_leave') {
      return `ចំនួនសមណសិស្សគ្មានច្បាប់សោះ${periodShortPhrase} សរុប ${countStr}អង្គ`;
    }
    if (filterMode === 'all') {
      return `ចំនួនសមណសិស្សសរុប${periodShortPhrase} សរុប ${countStr}អង្គ (មានច្បាប់ ${fmtNum(summary.withLeaveCount)}អង្គ, គ្មានច្បាប់ ${fmtNum(summary.withoutLeaveCount)}អង្គ)`;
    }
    return `ចំនួនសមណសិស្សសុំច្បាប់${periodShortPhrase} សរុប ${countStr}អង្គ`;
  }, [filterMode, leaveRecordsForOfficialDoc.length, periodShortPhrase, summary.withLeaveCount, summary.withoutLeaveCount, fmtNum]);

  const idCardCustomPeriodTitle = useMemo(() => {
    return `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញ (ID) កាត${periodPhraseForReport}`;
  }, [periodPhraseForReport]);

  const idCardCustomSummaryText = useMemo(() => {
    return `ចំនួនសមណសិស្សបានបង់ថ្លៃទិញ (ID) កាត${periodShortPhrase} សរុប ${fmtNum(displayedIdCardRecords.length)}អង្គ ស្មើនឹងទឹកប្រាក់ ${formatKhmerCurrency(displayedIdCardTotalAmount, useKhmerNumerals)}`;
  }, [displayedIdCardRecords.length, displayedIdCardTotalAmount, periodShortPhrase, fmtNum, useKhmerNumerals]);

  const financeDataForOfficialDoc = useMemo(() => {
    const inc = financeCategoryFilter === 'expense'
      ? []
      : displayedFinanceItems.filter(item => item.category === 'income');
    const exp = financeCategoryFilter === 'income'
      ? []
      : displayedFinanceItems.filter(item => item.category === 'expense');
    return { income: inc, expense: exp };
  }, [displayedFinanceItems, financeCategoryFilter]);

  const fullPeriodFinanceDataForSummary = useMemo(
    () => ({
      income: summary.financeSummary.incomeItems || [],
      expense: summary.financeSummary.expenseItems || []
    }),
    [summary.financeSummary]
  );

  const financeCustomPeriodTitle = useMemo(() => {
    const typeLabel = financeCategoryFilter === 'income'
      ? 'តារាងចំណូល'
      : financeCategoryFilter === 'expense'
        ? 'តារាងចំណាយ'
        : 'តារាងចំណូលចំណាយ';
    if (periodMode === 'year') {
      return `${typeLabel}ប្រចាំឆ្នាំសិក្សា ${yearDisplay}`;
    }
    if (periodMode === 'semester1') {
      return `${typeLabel}ប្រចាំឆមាសទី ${fmtNum(1)} ឆ្នាំ${yearDisplay}`;
    }
    if (periodMode === 'semester2') {
      return `${typeLabel}ប្រចាំឆមាសទី ${fmtNum(2)} ឆ្នាំ${yearDisplay}`;
    }
    return `${typeLabel}ប្រចាំខែ${activeMonthName} ឆ្នាំ${yearDisplay}`;
  }, [periodMode, yearDisplay, activeMonthName, fmtNum, financeCategoryFilter]);

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
      exportFinanceDualExcel(financeDataForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        monthName: activeMonthName,
        yearDisplay,
        periodMode,
        useKhmerNumerals,
        customPeriodTitle: financeCustomPeriodTitle,
        categoryFilter: financeCategoryFilter,
        isDeficitOverride: isOverallDeficit,
        summaryFinanceData: fullPeriodFinanceDataForSummary
      });
    } else if (sectionMode === 'idcards') {
      exportIdCardToExcel(displayedIdCardRecords, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: idCardCustomPeriodTitle,
        customSummaryText: idCardCustomSummaryText
      });
    } else {
      const isStudentAggregateView = isMultiMonthPeriod || filterMode !== 'has_leave';
      exportLeaveToExcel(leaveRecordsForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: leaveCustomPeriodTitle,
        customSummaryText: leaveCustomSummaryText,
        compactReasonColumn: isStudentAggregateView,
        dateColumnHeader: isStudentAggregateView ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ'
      });
    }
  };

  const handleExportWord = () => {
    if (sectionMode === 'finance') {
      exportFinanceDualWord(financeDataForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        monthName: activeMonthName,
        yearDisplay,
        periodMode,
        useKhmerNumerals,
        customPeriodTitle: financeCustomPeriodTitle,
        categoryFilter: financeCategoryFilter,
        isDeficitOverride: isOverallDeficit,
        summaryFinanceData: fullPeriodFinanceDataForSummary
      });
    } else if (sectionMode === 'idcards') {
      exportIdCardToWord(displayedIdCardRecords, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: idCardCustomPeriodTitle,
        customSummaryText: idCardCustomSummaryText
      });
    } else {
      const isStudentAggregateView = isMultiMonthPeriod || filterMode !== 'has_leave';
      exportLeaveToWord(leaveRecordsForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: leaveCustomPeriodTitle,
        customSummaryText: leaveCustomSummaryText,
        compactReasonColumn: isStudentAggregateView,
        dateColumnHeader: isStudentAggregateView ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ'
      });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const safePeriodSlug = String(periodTitleLabel || activeMonthName).replace(/\s+/g, '_');
      if (sectionMode === 'finance') {
        if (viewFormatMode === 'official_a4' && financeViewType === 'summary') {
          await exportElementToPdf(
            '#printable-summary-finance-brief-document',
            `របាយការណ៍ចំណូលចំណាយសង្ខេប_${safePeriodSlug}`
          );
        } else {
          await exportElementToPdf(
            '#printable-summary-finance-document',
            `របាយការណ៍ហិរញ្ញវត្ថុ_${safePeriodSlug}`
          );
        }
      } else if (sectionMode === 'idcards') {
        await exportElementToPdf(
          '#printable-summary-idcard-document',
          `របាយការណ៍សមណសិស្សទិញកាត_ID_${safePeriodSlug}`
        );
      } else {
        await exportElementToPdf(
          '#printable-summary-leave-document',
          `របាយការណ៍សមណសិស្សសុំច្បាប់_${safePeriodSlug}`
        );
      }
    } catch (err) {
      alert('មិនអាចទាញយក PDF បានទេ៖ ' + (err.message || 'Error'));
    } finally {
      setIsExportingPdf(false);
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
        {/* Row 1: Prominent 3-Section Switch (ផ្នែកសមណសិស្ស ⇄ ផ្នែកសមណសិស្សទិញ ID កាត ⇄ ផ្នែកហិរញ្ញវត្ថុ) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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
              gap: 8,
              padding: '11px 14px',
              borderRadius: 9,
              fontSize: 14.5,
              fontWeight: 700,
              border: sectionMode === 'students' ? '1.5px solid #b45309' : '1.5px solid transparent',
              cursor: 'pointer',
              background: sectionMode === 'students' ? '#b45309' : 'transparent',
              color: sectionMode === 'students' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'students' ? '0 3px 10px rgba(180,83,9,0.22)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Users size={18} />
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
            onClick={() => setSectionMode('idcards')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 14px',
              borderRadius: 9,
              fontSize: 14.5,
              fontWeight: 700,
              border: sectionMode === 'idcards' ? '1.5px solid #1d4ed8' : '1.5px solid transparent',
              cursor: 'pointer',
              background: sectionMode === 'idcards' ? '#1d4ed8' : 'transparent',
              color: sectionMode === 'idcards' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'idcards' ? '0 3px 10px rgba(29,78,216,0.22)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            <CreditCard size={18} />
            <span>សមណសិស្សទិញ ID កាត</span>
            <span style={{
              fontSize: 12,
              padding: '2px 9px',
              borderRadius: 20,
              background: sectionMode === 'idcards' ? 'rgba(255,255,255,0.22)' : '#dbeafe',
              color: sectionMode === 'idcards' ? '#ffffff' : '#1e40af',
              fontWeight: 700
            }}>
              {fmtNum(summary.idCardSummary.totalRecords)} អង្គ • {formatKhmerCurrency(summary.idCardSummary.totalAmount, useKhmerNumerals)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSectionMode('finance')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 14px',
              borderRadius: 9,
              fontSize: 14.5,
              fontWeight: 700,
              border: sectionMode === 'finance'
                ? (isOverallDeficit ? '1.5px solid #dc2626' : '1.5px solid #0f766e')
                : '1.5px solid transparent',
              cursor: 'pointer',
              background: sectionMode === 'finance'
                ? (isOverallDeficit ? '#b91c1c' : '#0f766e')
                : 'transparent',
              color: sectionMode === 'finance'
                ? '#ffffff'
                : (isOverallDeficit ? '#b91c1c' : '#334155'),
              boxShadow: sectionMode === 'finance'
                ? (isOverallDeficit ? '0 3px 10px rgba(185,28,28,0.25)' : '0 3px 10px rgba(15,118,110,0.22)')
                : 'none',
              transition: 'all 0.15s'
            }}
          >
            <Wallet size={18} />
            <span>ផ្នែកហិរញ្ញវត្ថុ (ចំណូល-ចំណាយ)</span>
            <span style={{
              fontSize: 12,
              padding: '2px 9px',
              borderRadius: 20,
              background: isOverallDeficit
                ? (sectionMode === 'finance' ? 'rgba(255,255,255,0.22)' : '#fee2e2')
                : (sectionMode === 'finance' ? 'rgba(255,255,255,0.22)' : '#e2e8f0'),
              color: isOverallDeficit
                ? (sectionMode === 'finance' ? '#ffffff' : '#b91c1c')
                : (sectionMode === 'finance' ? '#ffffff' : '#475569'),
              fontWeight: 700
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
                allIdCards={allIdCards}
                sectionMode={sectionMode}
                fmtNum={fmtNum}
              />
            </div>

            {(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && (
              <span style={{
                fontSize: 12,
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '4px 10px',
                borderRadius: 20,
                fontWeight: 600
              }}>
                បូកសរុបពី {fmtNum(summary.targetMonthKeys.length)} ខែសិក្សា
              </span>
            )}
          </div>

          {/* Action Buttons: View Mode Toggle + Export Excel + Smart Download PDF */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}>
              <button
                type="button"
                onClick={() => setViewFormatMode('official_a4')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewFormatMode === 'official_a4' ? '#ffffff' : 'transparent',
                  color: viewFormatMode === 'official_a4' ? '#b45309' : '#64748b',
                  boxShadow: viewFormatMode === 'official_a4' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
                title="បង្ហាញទម្រង់ក្រដាសរបាយការណ៍ផ្លូវការ A4"
              >
                <FileText size={14} />
                <span>ទម្រង់ផ្លូវការ (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFormatMode('analytics')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewFormatMode === 'analytics' ? '#ffffff' : 'transparent',
                  color: viewFormatMode === 'analytics' ? '#0f766e' : '#64748b',
                  boxShadow: viewFormatMode === 'analytics' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
                title="បង្ហាញតារាងបូកសរុបចំនួនដង និងប្រវត្តិលម្អិត"
              >
                <Table2 size={14} />
                <span>តារាងវិភាគលម្អិត</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              style={{
                background: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <FileText size={16} />
              <span>Download Word</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              style={{
                background: '#b91c1c',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                opacity: isExportingPdf ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(185, 28, 28, 0.25)'
              }}
              title="ទាញយករបាយការណ៍ផ្លូវការជា PDF តាមខែ/ឆមាស/ឆ្នាំដែលបានជ្រើសរើស"
            >
              {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isExportingPdf ? 'កំពុងទាញយក PDF...' : 'Download PDF'}</span>
            </button>
          </div>
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
                background: filterMode === 'has_leave' ? '#fef3c7' : '#fffbeb',
                border: '2px solid #d97706',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'has_leave' ? '0 4px 12px rgba(217,119,6,0.16)' : '0 2px 6px rgba(217,119,6,0.08)',
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
                <div style={{ fontSize: 26, fontWeight: 800, color: '#78350f', lineHeight: 1.2 }}>
                  {fmtNum(summary.withLeaveCount)} <span style={{ fontSize: 15, fontWeight: 700, color: '#b45309' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginTop: 4 }}>
                  សរុប {fmtNum(summary.totalLeaveRequests)} ដង ({formatDurationTotals(summary.overallDurationTotals, useKhmerNumerals)})
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#fde68a',
                color: '#b45309',
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
                background: filterMode === 'no_leave' ? '#dcfce7' : '#f0fdf4',
                border: '2px solid #16a34a',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'no_leave' ? '0 4px 12px rgba(22,163,74,0.16)' : '0 2px 6px rgba(22,163,74,0.08)',
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
                <div style={{ fontSize: 26, fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
                  {fmtNum(summary.withoutLeaveCount)} <span style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginTop: 4 }}>
                  សមណសិស្សមករៀនទៀងទាត់ (គ្មានច្បាប់)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#bbf7d0',
                color: '#15803d',
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
                background: filterMode === 'all' ? '#dbeafe' : '#eff6ff',
                border: '2px solid #2563eb',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: filterMode === 'all' ? '0 4px 12px rgba(37,99,235,0.16)' : '0 2px 6px rgba(37,99,235,0.08)',
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
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
                  {fmtNum(summary.totalStudentsCount)} <span style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>អង្គ</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginTop: 4 }}>
                  បង្ហាញបញ្ជីរួមទាំងអ្នកសុំច្បាប់ និងអត់សុំច្បាប់
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#bfdbfe',
                color: '#1d4ed8',
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

              {/* Toggle Checkbox for Total Duration Column (Shown in analytics mode) */}
              {viewFormatMode === 'analytics' && (
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
              )}
            </div>

            {/* OFFICIAL MINISTRY A4 DOCUMENT VIEW (Default - Exact replica of PDF 2) */}
            {viewFormatMode === 'official_a4' ? (
              <div style={{ padding: '20px 16px', background: '#f1f5f9' }}>
                <A4SheetScaler>
                  <OfficialLeaveDocument
                    id="printable-summary-leave-document"
                    records={leaveRecordsForOfficialDoc}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    isEditable={false}
                    studentMaster={studentMaster}
                    customPeriodTitle={leaveCustomPeriodTitle}
                    customSummaryText={leaveCustomSummaryText}
                    compactReasonColumn={isMultiMonthPeriod || filterMode !== 'has_leave'}
                    dateColumnHeader={(isMultiMonthPeriod || filterMode !== 'has_leave') ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ'}
                  />
                </A4SheetScaler>
              </div>
            ) : (
              <>
                {/* Offscreen Official A4 Document so Download PDF works even in analytics mode */}
                <div
                  className="offscreen-print-container"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: -9999,
                    width: 794,
                    minWidth: 794,
                    maxWidth: 794,
                    pointerEvents: 'none'
                  }}
                  aria-hidden="true"
                >
                  <OfficialLeaveDocument
                    id="printable-summary-leave-document"
                    records={leaveRecordsForOfficialDoc}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    isEditable={false}
                    studentMaster={studentMaster}
                    customPeriodTitle={leaveCustomPeriodTitle}
                    customSummaryText={leaveCustomSummaryText}
                    compactReasonColumn={isMultiMonthPeriod || filterMode !== 'has_leave'}
                    dateColumnHeader={(isMultiMonthPeriod || filterMode !== 'has_leave') ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ'}
                  />
                </div>

                {/* Analytical Per-Student Frequency Table */}
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
              </>
            )}
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* BRANCH A.5: STUDENT ID CARD PURCHASE SUMMARY (ផ្នែកសមណសិស្សទិញ ID កាត) */}
      {/* ================================================================== */}
      {sectionMode === 'idcards' && (
        <>
          {/* 3 BIG INTERACTIVE ID CARD SUMMARY CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14
          }}>
            {/* CARD 1: សមណសិស្សទិញសរុប (Total Purchases / Buyers) */}
            <button
              type="button"
              onClick={() => setIdCardItemFilter('all')}
              style={{
                textAlign: 'left',
                background: idCardItemFilter === 'all' ? '#dbeafe' : '#eff6ff',
                border: '2px solid #2563eb',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: idCardItemFilter === 'all' ? '0 4px 12px rgba(37,99,235,0.16)' : '0 2px 6px rgba(37,99,235,0.08)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                  <span>🪪 សមណសិស្សទិញកាត ID សរុប</span>
                  {idCardItemFilter === 'all' && (
                    <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
                  {fmtNum(summary.idCardSummary.totalRecords)} <span style={{ fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>អង្គ/លើក</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginTop: 4 }}>
                  សមណសិស្ស {fmtNum(summary.idCardSummary.uniqueBuyersCount)} អង្គ • សរុប {fmtNum(summary.idCardSummary.totalQty)} មុខ
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#bfdbfe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CreditCard size={22} />
              </div>
            </button>

            {/* CARD 2: បំបែកតាមមុខទំនិញ (Item Breakdown Pills) */}
            <div
              style={{
                background: '#fffbeb',
                border: '2px solid #d97706',
                borderRadius: 12,
                padding: '14px 16px',
                boxShadow: '0 2px 6px rgba(217,119,6,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>
                📦 បំបែកតាមប្រភេទមុខទំនិញ (ចុចជ្រើសរើស)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { key: 'ថង', label: 'ថង' },
                  { key: 'ID', label: 'ID' },
                  { key: 'ខ្សែ', label: 'ខ្សែ' },
                  { key: 'មួយឈុត', label: 'មួយឈុត' }
                ].map(item => {
                  const stat = summary.idCardSummary.itemBreakdown?.[item.key] || { count: 0, amount: 0 };
                  const active = idCardItemFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setIdCardItemFilter(active ? 'all' : item.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: 7,
                        border: active ? '1.5px solid #b45309' : '1px solid #fde68a',
                        background: active ? '#b45309' : '#ffffff',
                        color: active ? '#ffffff' : '#78350f',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: active ? 'rgba(255,255,255,0.22)' : '#fef3c7',
                        color: active ? '#ffffff' : '#b45309'
                      }}>
                        {fmtNum(stat.count)} លើក
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 3: ទឹកប្រាក់សរុប (Total Revenue from ID Cards) */}
            <button
              type="button"
              onClick={() => setIdCardItemFilter('all')}
              style={{
                textAlign: 'left',
                background: '#f0fdf4',
                border: '2px solid #16a34a',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(22,163,74,0.08)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                  <span>💰 ទឹកប្រាក់ទិញកាត ID សរុប</span>
                </div>
                <div style={{ fontSize: 25, fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
                  {formatKhmerCurrency(summary.idCardSummary.totalAmount, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginTop: 4 }}>
                  កំពុងបង្ហាញ៖ {fmtNum(displayedIdCardRecords.length)} អង្គ ({formatKhmerCurrency(displayedIdCardTotalAmount, useKhmerNumerals)})
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#bbf7d0',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={22} />
              </div>
            </button>
          </div>

          {/* YEARLY / SEMESTER BREAKDOWN BY MONTH (When viewing Analytics mode) */}
          {viewFormatMode === 'analytics' && (periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && summary.idCardSummary.monthlyBreakdown.length > 0 && (
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
                📊 តារាងសង្ខេបសមណសិស្សទិញកាត ID តាមខែនីមួយៗក្នុងឆ្នាំ {fmtNum(selectedYear)}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', width: 65, textAlign: 'center' }}>ល.រ</th>
                      <th style={{ padding: '10px 14px' }}>ខែ-ឆ្នាំ</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>ចំនួនសមណសិស្សទិញ</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>ទឹកប្រាក់សរុប</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.idCardSummary.monthlyBreakdown.map((mRow, idx) => (
                      <tr key={mRow.monthKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {fmtNum(idx + 1)}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {formatMonthKeyLabel(mRow.monthKey, useKhmerNumerals)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>
                          {fmtNum(mRow.count)} អង្គ/លើក
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                          {formatKhmerCurrency(mRow.totalAmount, useKhmerNumerals)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ID CARD SUMMARY TABLE & A4 REPORT */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            {/* Toolbar */}
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
                <div style={{ position: 'relative', minWidth: 230 }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
                  <input
                    type="text"
                    placeholder="ស្វែងរកឈ្មោះសមណសិស្ស ឬមុខទំនិញ..."
                    value={idCardSearchTerm}
                    onChange={e => setIdCardSearchTerm(e.target.value)}
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
                      onClick={() => setIdCardGradeFilter(g.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: idCardGradeFilter === g.id ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                        background: idCardGradeFilter === g.id ? '#dbeafe' : '#ffffff',
                        color: idCardGradeFilter === g.id ? '#1d4ed8' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Type Filter Pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'គ្រប់មុខទំនិញ' },
                  { id: 'ថង', label: 'ថង' },
                  { id: 'ID', label: 'ID' },
                  { id: 'ខ្សែ', label: 'ខ្សែ' },
                  { id: 'មួយឈុត', label: 'មួយឈុត' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setIdCardItemFilter(tab.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: idCardItemFilter === tab.id ? '1px solid #b45309' : '1px solid #cbd5e1',
                      background: idCardItemFilter === tab.id ? '#fef3c7' : '#ffffff',
                      color: idCardItemFilter === tab.id ? '#b45309' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* OFFICIAL MINISTRY A4 ID CARD DOCUMENT VIEW */}
            {viewFormatMode === 'official_a4' ? (
              <div style={{ padding: '20px 16px', background: '#f1f5f9' }}>
                <A4SheetScaler>
                  <OfficialIdCardDocument
                    id="printable-summary-idcard-document"
                    records={displayedIdCardRecords}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    isEditable={false}
                    studentMaster={studentMaster}
                    customPeriodTitle={idCardCustomPeriodTitle}
                    customSummaryText={idCardCustomSummaryText}
                  />
                </A4SheetScaler>
              </div>
            ) : (
              <>
                <div
                  className="offscreen-print-container"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: -9999,
                    width: 794,
                    minWidth: 794,
                    maxWidth: 794,
                    pointerEvents: 'none'
                  }}
                  aria-hidden="true"
                >
                  <OfficialIdCardDocument
                    id="printable-summary-idcard-document"
                    records={displayedIdCardRecords}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    isEditable={false}
                    studentMaster={studentMaster}
                    customPeriodTitle={idCardCustomPeriodTitle}
                    customSummaryText={idCardCustomSummaryText}
                  />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155', textAlign: 'left' }}>
                        <th style={{ padding: '12px 14px', width: 65, textAlign: 'center' }}>ល.រ</th>
                        {(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && (
                          <th style={{ padding: '12px 14px', width: 150, textAlign: 'center' }}>ខែ</th>
                        )}
                        <th style={{ padding: '12px 14px' }}>គោត្តនាម-និងនាម</th>
                        <th style={{ padding: '12px 14px', width: 130, textAlign: 'center' }}>ថ្នាក់</th>
                        <th style={{ padding: '12px 14px', width: 170, textAlign: 'center' }}>បរិយាយ (មុខទំនិញ)</th>
                        <th style={{ padding: '12px 14px', width: 100, textAlign: 'center' }}>ចំនួន</th>
                        <th style={{ padding: '12px 14px', width: 150, textAlign: 'right' }}>តម្លៃ</th>
                        <th style={{ padding: '12px 14px', width: 140, textAlign: 'center' }}>កាលបរិច្ឆេទ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedIdCardRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') ? 8 : 7}
                            style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b', fontSize: 14 }}
                          >
                            មិនមានទិន្នន័យសមណសិស្សទិញកាត ID ក្នុងជម្រើសនេះទេ។
                          </td>
                        </tr>
                      ) : (
                        displayedIdCardRecords.map((r, idx) => (
                          <tr key={r.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {fmtNum(idx + 1)}
                            </td>
                            {(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && (
                              <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                {formatMonthKeyLabel(r.monthKey, useKhmerNumerals)}
                              </td>
                            )}
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                              {r.name || '—'}
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
                                {formatGradeBadge(r.grade)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{
                                background: '#dbeafe',
                                color: '#1d4ed8',
                                padding: '3px 10px',
                                borderRadius: 12,
                                fontSize: 12.5,
                                fontWeight: 700
                              }}>
                                {r.item || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                              {fmtNum(r.qty || 1)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                              {formatKhmerCurrency(r.price || 0, useKhmerNumerals)}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                              {useKhmerNumerals ? toKhmerDigits(r.date || '—') : (r.date || '—')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
                background: financeCategoryFilter === 'income' ? '#dcfce7' : '#f0fdf4',
                border: '2px solid #16a34a',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'income' ? '0 4px 12px rgba(22,163,74,0.16)' : '0 2px 6px rgba(22,163,74,0.08)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
                  <span>💰 ចំណូលសរុប ({periodMode === 'year' ? 'ប្រចាំឆ្នាំ' : (periodMode === 'semester1' || periodMode === 'semester2') ? 'ប្រចាំឆមាស' : 'ប្រចាំខែ'})</span>
                  {financeCategoryFilter === 'income' && (
                    <span style={{ background: '#16a34a', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
                  {formatCurrencyTotals(summary.financeSummary.incomeTotals, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginTop: 4 }}>
                  សរុប {fmtNum(summary.financeSummary.incomeItems.length)} មុខទំនិញ (ចុចមើលតែចំណូល)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#bbf7d0',
                color: '#15803d',
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
                background: financeCategoryFilter === 'expense' ? '#fee2e2' : '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'expense' ? '0 4px 12px rgba(220,38,38,0.16)' : '0 2px 6px rgba(220,38,38,0.08)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>
                  <span>💸 ចំណាយសរុប ({periodMode === 'year' ? 'ប្រចាំឆ្នាំ' : (periodMode === 'semester1' || periodMode === 'semester2') ? 'ប្រចាំឆមាស' : 'ប្រចាំខែ'})</span>
                  {financeCategoryFilter === 'expense' && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, padding: '1px 7px', borderRadius: 10 }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#991b1b', lineHeight: 1.2 }}>
                  {formatExpenseTotals(summary.financeSummary.expenseTotals, isOverallDeficit, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c', marginTop: 4 }}>
                  សរុប {fmtNum(summary.financeSummary.expenseItems.length)} មុខទំនិញ (ចុចមើលតែចំណាយ)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#fecaca',
                color: '#b91c1c',
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
                background: financeCategoryFilter === 'all'
                  ? (isOverallDeficit ? '#fee2e2' : '#dbeafe')
                  : (isOverallDeficit ? '#fef2f2' : '#eff6ff'),
                border: isOverallDeficit ? '2px solid #dc2626' : '2px solid #2563eb',
                borderRadius: 12,
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: financeCategoryFilter === 'all'
                  ? (isOverallDeficit ? '0 4px 12px rgba(220,38,38,0.18)' : '0 4px 12px rgba(37,99,235,0.16)')
                  : (isOverallDeficit ? '0 2px 6px rgba(220,38,38,0.08)' : '0 2px 6px rgba(37,99,235,0.08)'),
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isOverallDeficit ? '#b91c1c' : '#1d4ed8',
                  marginBottom: 4
                }}>
                  <span>⚖️ ប្រាក់នៅសល់សរុប (មើលទាំងអស់)</span>
                  {financeCategoryFilter === 'all' && (
                    <span style={{
                      background: isOverallDeficit ? '#dc2626' : '#2563eb',
                      color: '#fff',
                      fontSize: 10,
                      padding: '1px 7px',
                      borderRadius: 10
                    }}>
                      កំពុងបង្ហាញ
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: isOverallDeficit ? '#b91c1c' : '#1e3a8a',
                  lineHeight: 1.2
                }}>
                  {formatCurrencyTotals(summary.financeSummary.netTotals, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: isOverallDeficit ? '#b91c1c' : '#1e40af', marginTop: 4 }}>
                  បង្ហាញរួមទាំងចំណូល និងចំណាយ ({fmtNum(summary.financeSummary.allItems.length)} មុខ)
                </div>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: isOverallDeficit ? '#fecaca' : '#bfdbfe',
                color: isOverallDeficit ? '#b91c1c' : '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Scale size={22} />
              </div>
            </button>
          </div>

          {/* YEARLY / SEMESTER BREAKDOWN BY MONTH (When viewing Analytics mode) */}
          {viewFormatMode === 'analytics' && (periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && summary.financeSummary.monthlyBreakdown.length > 0 && (
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
                    {summary.financeSummary.monthlyBreakdown.map((mRow, idx) => {
                      const isRowDeficit = isFinanceDeficit(mRow.balanceTotals, mRow.balance);
                      return (
                        <tr
                          key={mRow.monthKey}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isRowDeficit ? '#fff8f8' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {fmtNum(idx + 1)}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                            {formatMonthKeyLabel(mRow.monthKey, useKhmerNumerals)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                            {formatCurrencyTotals(mRow.incomeTotals, useKhmerNumerals)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: isRowDeficit ? '#b91c1c' : '#7f1d1d' }}>
                            {formatExpenseTotals(mRow.expenseTotals, isRowDeficit, useKhmerNumerals)}
                          </td>
                          <td style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 800,
                            color: isRowDeficit ? '#dc2626' : '#1d4ed8'
                          }}>
                            {formatCurrencyTotals(mRow.balanceTotals, useKhmerNumerals)}
                          </td>
                        </tr>
                      );
                    })}
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

            {/* OFFICIAL MINISTRY A4 FINANCE DOCUMENT VIEW (Default - Exact replica of PDF 1) */}
            {viewFormatMode === 'official_a4' ? (
              <div style={{ padding: '20px 16px', background: '#f1f5f9', position: 'relative' }}>
                {/* Toggle Button: ពេញ ⇄ សង្ខេប — Floating on top-right of paper BG */}
                <button
                  type="button"
                  onClick={() => setFinanceViewType(financeViewType === 'full' ? 'summary' : 'full')}
                  style={{
                    position: 'absolute',
                    top: 28,
                    right: 24,
                    zIndex: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: '1.5px solid #d97706',
                    background: financeViewType === 'summary' ? '#b45309' : '#fffbeb',
                    color: financeViewType === 'summary' ? '#ffffff' : '#b45309',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(180,83,9,0.18)',
                    transition: 'all 0.15s'
                  }}
                  title={financeViewType === 'full' ? 'ប្ដូរមើលតារាងសង្ខេប' : 'ប្ដូរមើលតារាងពេញ'}
                >
                  <FileText size={14} />
                  <span>{financeViewType === 'full' ? 'សង្ខេប' : 'ពេញ'}</span>
                </button>
                <A4SheetScaler>
                  {financeViewType === 'summary' ? (
                    <OfficialFinanceSummaryDocument
                      id="printable-summary-finance-brief-document"
                      financeData={fullPeriodFinanceDataForSummary}
                      metadata={metadata}
                      monthName={activeMonthName}
                      yearDisplay={yearDisplay}
                      useKhmerNumerals={useKhmerNumerals}
                      monthKey={effectiveReportMonthKey}
                      periodMode={periodMode}
                      isDeficitOverride={isOverallDeficit}
                    />
                  ) : (
                    <OfficialFinanceDocument
                      id="printable-summary-finance-document"
                      financeData={financeDataForOfficialDoc}
                      metadata={metadata}
                      monthName={activeMonthName}
                      yearDisplay={yearDisplay}
                      useKhmerNumerals={useKhmerNumerals}
                      monthKey={effectiveReportMonthKey}
                      isEditable={false}
                      customPeriodTitle={financeCustomPeriodTitle}
                      isDeficitOverride={isOverallDeficit}
                      categoryFilter={financeCategoryFilter}
                    />
                  )}
                </A4SheetScaler>
              </div>
            ) : (
              <>
                <div
                  className="offscreen-print-container"
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: -9999,
                    width: 794,
                    minWidth: 794,
                    maxWidth: 794,
                    pointerEvents: 'none'
                  }}
                  aria-hidden="true"
                >
                  <OfficialFinanceDocument
                    id="printable-summary-finance-document"
                    financeData={financeDataForOfficialDoc}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    isEditable={false}
                    customPeriodTitle={financeCustomPeriodTitle}
                    isDeficitOverride={isOverallDeficit}
                    categoryFilter={financeCategoryFilter}
                  />
                  <OfficialFinanceSummaryDocument
                    id="printable-summary-finance-brief-document"
                    financeData={fullPeriodFinanceDataForSummary}
                    metadata={metadata}
                    monthName={activeMonthName}
                    yearDisplay={yearDisplay}
                    useKhmerNumerals={useKhmerNumerals}
                    monthKey={effectiveReportMonthKey}
                    periodMode={periodMode}
                    isDeficitOverride={isOverallDeficit}
                  />
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
                            {item.totalLabel && (!item.total || Number(item.total) === 0)
                              ? (useKhmerNumerals ? toKhmerDigits(item.totalLabel) : item.totalLabel)
                              : formatMoney(item.total || 0, item.currency, useKhmerNumerals)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
              </>
            )}          </div>
        </>
      )}
    </div>
  );
}
