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
  CreditCard,
  Wallet
} from 'lucide-react';
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit
} from '../../utils/khmerNumerals';
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
} from '../../utils/summaryAnalytics';
import { KHMER_SOLAR_MONTHS } from '../../utils/khmerCalendar';
import { exportLeaveToExcel, exportIdCardToExcel, exportFinanceDualExcel } from '../../utils/excelExporter';
import { exportLeaveToWord, exportIdCardToWord, exportFinanceDualWord } from '../../utils/wordExporter';
import { exportElementToPdf, exportDualElementsToPdf } from '../../utils/pdfExporter';
import PeriodDropdown from '../PeriodDropdown';
import A4SheetScaler from '../A4SheetScaler';
import OfficialLeaveDocument from '../OfficialLeaveDocument';
import OfficialIdCardDocument from '../OfficialIdCardDocument';
import OfficialFinanceDocument from '../OfficialFinanceDocument';
import OfficialFinanceSummaryDocument from '../OfficialFinanceSummaryDocument';

export default function SummaryMobileView({
  currentMonthKey = '2026-07',
  allLeaves = {},
  allFinance = {},
  allIdCards = {},
  studentMaster = [],
  metadata = {},
  useKhmerNumerals = true,
  onSelectMonth,
  onSelectYear,
  mobilePreviewA4 = false
}) {
  // 0. Top-Level Section Switch: 'students' ⇄ 'idcards' ⇄ 'finance'
  const [sectionMode, setSectionMode] = useState('students'); // 'students' | 'idcards' | 'finance'

  // 1. Period Selection State ('month' | 'semester1' | 'semester2' | 'year')
  const [periodMode, setPeriodMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(() => (currentMonthKey || '2026-07').split('-')[0] || '2026');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const viewFormatMode = mobilePreviewA4 ? 'official_a4' : 'analytics';

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

  const { years, months } = useMemo(
    () => getAvailablePeriods(allLeaves, allFinance, currentMonthKey, allIdCards),
    [allLeaves, allFinance, currentMonthKey, allIdCards]
  );

  const monthsForYearSelector = useMemo(
    () => ACADEMIC_MONTH_NUMS.map(mStr => `${selectedYear}-${mStr}`),
    [selectedYear]
  );

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
          date: `${fmtNum(s.leaveCount)} លើក`,
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
    return displayedStudents.map(s => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      reason: s.leaveCount > 0
        ? (isMultiMonthPeriod
          ? formatCondensedReasons(s.records, { maxReasons: 2, useKhmerNumerals })
          : Array.from(new Set(s.records.map(r => r.reason).filter(Boolean))).join(', '))
        : 'មករៀនទៀងទាត់ (គ្មានច្បាប់)',
      duration: s.leaveCount > 0
        ? formatDurationTotals(s.durationTotals, useKhmerNumerals)
        : '០ថ្ងៃ',
      date: s.leaveCount > 0 ? `${fmtNum(s.leaveCount)} លើក` : '—',
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
    return `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញកាតពាក់ក (ID) ${periodPhraseForReport}`;
  }, [periodPhraseForReport]);

  const idCardCustomSummaryText = useMemo(() => {
    return `ចំនួនសមណសិស្សបានបង់ថ្លៃទិញកាតពាក់ក (ID)${periodShortPhrase} សរុប ${fmtNum(displayedIdCardRecords.length)}អង្គ ស្មើនឹងទឹកប្រាក់ ${formatKhmerCurrency(displayedIdCardTotalAmount, useKhmerNumerals)}`;
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
      exportLeaveToExcel(leaveRecordsForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: leaveCustomPeriodTitle,
        customSummaryText: leaveCustomSummaryText,
        compactReasonColumn: isMultiMonthPeriod
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
      exportLeaveToWord(leaveRecordsForOfficialDoc, periodTitleLabel, metadata, {
        monthKey: effectiveReportMonthKey,
        useKhmerNumerals,
        customPeriodTitle: leaveCustomPeriodTitle,
        customSummaryText: leaveCustomSummaryText,
        compactReasonColumn: isMultiMonthPeriod
      });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const safePeriodSlug = String(periodTitleLabel || activeMonthName).replace(/\s+/g, '_');
      if (sectionMode === 'finance') {
        await exportDualElementsToPdf(
          '#printable-mobile-summary-finance-document',
          `របាយការណ៍ហិរញ្ញវត្ថុ_${safePeriodSlug}`,
          '#printable-mobile-summary-finance-brief-document',
          `របាយការណ៍ចំណូលចំណាយសង្ខេប_${safePeriodSlug}`
        );
      } else if (sectionMode === 'idcards') {
        await exportElementToPdf(
          '#printable-mobile-summary-idcard-document',
          `របាយការណ៍សមណសិស្សទិញកាត_ID_${safePeriodSlug}`
        );
      } else {
        await exportElementToPdf(
          '#printable-mobile-summary-leave-document',
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
        {/* Row 1: Prominent 3-Section Switch (ផ្នែកសមណសិស្ស ⇄ ទិញ ID កាត ⇄ ផ្នែកហិរញ្ញវត្ថុ) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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
              gap: 5,
              padding: '9px 6px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: sectionMode === 'students' ? '#b45309' : 'transparent',
              color: sectionMode === 'students' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'students' ? '0 2px 6px rgba(180,83,9,0.2)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={14} />
            <span>សមណសិស្ស</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionMode('idcards')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '9px 6px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: sectionMode === 'idcards' ? '#1d4ed8' : 'transparent',
              color: sectionMode === 'idcards' ? '#ffffff' : '#334155',
              boxShadow: sectionMode === 'idcards' ? '0 2px 6px rgba(29,78,216,0.22)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            <CreditCard size={14} />
            <span>ទិញ ID កាត</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionMode('finance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '9px 6px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: sectionMode === 'finance'
                ? (isOverallDeficit ? '#b91c1c' : '#0f766e')
                : 'transparent',
              color: sectionMode === 'finance'
                ? '#ffffff'
                : (isOverallDeficit ? '#b91c1c' : '#334155'),
              boxShadow: sectionMode === 'finance'
                ? (isOverallDeficit ? '0 2px 6px rgba(185,28,28,0.25)' : '0 2px 6px rgba(15,118,110,0.2)')
                : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            <Wallet size={14} />
            <span>ហិរញ្ញវត្ថុ</span>
            {isOverallDeficit && (
              <span style={{
                fontSize: 10,
                background: sectionMode === 'finance' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                color: sectionMode === 'finance' ? '#ffffff' : '#b91c1c',
                padding: '1px 5px',
                borderRadius: 6,
                fontWeight: 800
              }}>
                ខ្វះ
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Unified Period Selector (Custom Dropdown) + Smart PDF Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            isMobile={true}
          />

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            style={{
              flex: 1,
              background: '#b91c1c',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12.5,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              opacity: isExportingPdf ? 0.7 : 1
            }}
          >
            {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{isExportingPdf ? 'កំពុងទាញយក PDF...' : 'Download PDF'}</span>
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
                background: filterMode === 'has_leave' ? '#fef3c7' : '#fffbeb',
                border: '2px solid #d97706',
                boxShadow: filterMode === 'has_leave' ? '0 3px 8px rgba(217,119,6,0.16)' : '0 1px 4px rgba(217,119,6,0.08)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>🟠 មានច្បាប់</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#78350f', margin: '2px 0' }}>
                {fmtNum(summary.withLeaveCount)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#92400e' }}>
                {fmtNum(summary.totalLeaveRequests)} លើក
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('no_leave')}
              style={{
                background: filterMode === 'no_leave' ? '#dcfce7' : '#f0fdf4',
                border: '2px solid #16a34a',
                boxShadow: filterMode === 'no_leave' ? '0 3px 8px rgba(22,163,74,0.16)' : '0 1px 4px rgba(22,163,74,0.08)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>🟢 ច្បាប់ ០ដង</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#14532d', margin: '2px 0' }}>
                {fmtNum(summary.withoutLeaveCount)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#166534' }}>
                ទៀងទាត់
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                background: filterMode === 'all' ? '#dbeafe' : '#eff6ff',
                border: '2px solid #2563eb',
                boxShadow: filterMode === 'all' ? '0 3px 8px rgba(37,99,235,0.16)' : '0 1px 4px rgba(37,99,235,0.08)',
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>🔵 ទាំងអស់</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', margin: '2px 0' }}>
                {fmtNum(summary.totalStudentsCount)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#1e40af' }}>
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

              {viewFormatMode === 'analytics' && (
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
              )}
            </div>

            {viewFormatMode === 'official_a4' ? (
              <div style={{ marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 10, overflow: 'hidden' }}>
                <A4SheetScaler>
                  <OfficialLeaveDocument
                    id="preview-mobile-summary-leave-document"
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
                    compactReasonColumn={isMultiMonthPeriod}
                  />
                </A4SheetScaler>
              </div>
            ) : (
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
                          border: isExpanded
                            ? '2px solid #f59e0b'
                            : (hasLeave ? '1.5px solid #fcd34d' : '1.5px solid #86efac'),
                          borderRadius: 10,
                          padding: '10px 12px',
                          background: isExpanded ? '#fffbeb' : '#ffffff',
                          boxShadow: hasLeave
                            ? '0 2px 5px rgba(180, 83, 9, 0.05)'
                            : '0 2px 5px rgba(22, 163, 74, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              background: hasLeave ? '#fef3c7' : '#dcfce7',
                              color: hasLeave ? '#b45309' : '#15803d',
                              border: hasLeave ? '1px solid #fde68a' : '1px solid #bbf7d0',
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
            )}
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* BRANCH A.5: STUDENT ID CARD PURCHASE SUMMARY (ផ្នែកទិញ ID កាត)      */}
      {/* ================================================================== */}
      {sectionMode === 'idcards' && (
        <>
          {/* Summary Cards for Mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIdCardItemFilter('all')}
                style={{
                  background: idCardItemFilter === 'all' ? '#dbeafe' : '#eff6ff',
                  border: '2px solid #2563eb',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1d4ed8' }}>🪪 ចំនួនសមណសិស្សទិញ</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', margin: '2px 0' }}>
                  {fmtNum(summary.idCardSummary.totalRecords)} អង្គ
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#1e40af' }}>
                  សរុប {fmtNum(summary.idCardSummary.totalQty)} មុខ
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIdCardItemFilter('all')}
                style={{
                  background: '#f0fdf4',
                  border: '2px solid #16a34a',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d' }}>💰 ទឹកប្រាក់សរុប</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#14532d', margin: '2px 0' }}>
                  {formatKhmerCurrency(summary.idCardSummary.totalAmount, useKhmerNumerals)}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#166534' }}>
                  បង្ហាញ៖ {fmtNum(displayedIdCardRecords.length)} អង្គ
                </div>
              </button>
            </div>

            {/* 4 Item Breakdown Quick Filter Buttons */}
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #f59e0b',
              borderRadius: 10,
              padding: '8px 10px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5
            }}>
              {[
                { key: 'ថង', label: 'ថង' },
                { key: 'ID', label: 'ID' },
                { key: 'ខ្សែ', label: 'ខ្សែ' },
                { key: 'មួយឈុត', label: 'មួយឈុត' }
              ].map(item => {
                const stat = summary.idCardSummary.itemBreakdown?.[item.key] || { count: 0 };
                const active = idCardItemFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIdCardItemFilter(active ? 'all' : item.key)}
                    style={{
                      padding: '5px 4px',
                      borderRadius: 7,
                      border: active ? '1.5px solid #b45309' : '1px solid #fde68a',
                      background: active ? '#b45309' : '#ffffff',
                      color: active ? '#ffffff' : '#78350f',
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>{item.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.9 }}>{fmtNum(stat.count)} លើក</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Breakdown for Multi-Month View in Analytics Mode */}
          {viewFormatMode === 'analytics' && (periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && summary.idCardSummary.monthlyBreakdown.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                📊 តារាងសង្ខេបទិញកាត ID តាមខែ ({fmtNum(selectedYear)})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.idCardSummary.monthlyBreakdown.map((mRow) => (
                  <div
                    key={mRow.monthKey}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      {formatMonthKeyLabel(mRow.monthKey, useKhmerNumerals)} ({fmtNum(mRow.count)} អង្គ)
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#15803d' }}>
                      {formatKhmerCurrency(mRow.totalAmount, useKhmerNumerals)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search, Grade Filter & ID Card Records */}
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
                placeholder="ស្វែងរកឈ្មោះសមណសិស្ស ឬមុខទំនិញ..."
                value={idCardSearchTerm}
                onChange={e => setIdCardSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1'
                }}
              />
            </div>

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
                  onClick={() => setIdCardGradeFilter(g.id)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: idCardGradeFilter === g.id ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                    background: idCardGradeFilter === g.id ? '#dbeafe' : '#f8fafc',
                    color: idCardGradeFilter === g.id ? '#1d4ed8' : '#475569'
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {viewFormatMode === 'official_a4' ? (
              <div style={{ marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 10, overflow: 'hidden' }}>
                <A4SheetScaler>
                  <OfficialIdCardDocument
                    id="preview-mobile-summary-idcard-document"
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayedIdCardRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>
                    មិនមានទិន្នន័យសមណសិស្សទិញកាត ID ក្នុងជម្រើសនេះទេ។
                  </div>
                ) : (
                  displayedIdCardRecords.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      style={{
                        border: '1.5px solid #93c5fd',
                        borderRadius: 10,
                        padding: '10px 12px',
                        boxShadow: '0 2px 5px rgba(2, 132, 199, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 8,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: '#dbeafe',
                            color: '#1d4ed8'
                          }}>
                            {r.item || '—'} ({fmtNum(r.qty || 1)})
                          </span>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 8,
                            fontSize: 10.5,
                            fontWeight: 600,
                            background: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {formatGradeBadge(r.grade)}
                          </span>
                          {(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && (
                            <span style={{ fontSize: 10.5, color: '#64748b' }}>
                              {formatMonthKeyLabel(r.monthKey, useKhmerNumerals)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                          {fmtNum(idx + 1)}. {r.name || '—'}
                        </div>
                        {r.date && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            កាលបរិច្ឆេទ៖ {useKhmerNumerals ? toKhmerDigits(r.date) : r.date}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#15803d',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatKhmerCurrency(r.price || 0, useKhmerNumerals)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* BRANCH B: FINANCE SUMMARY (ផ្នែកហិរញ្ញវត្ថុ - នៅខាងលើគេ!)            */}
      {/* ================================================================== */}
      {sectionMode === 'finance' && (
        <>
          {/* 3 Side-by-Side Interactive Finance Cards (ចំណូល | ចំណាយ | ប្រាក់នៅសល់) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('income')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                background: financeCategoryFilter === 'income' ? '#dcfce7' : '#f0fdf4',
                border: financeCategoryFilter === 'income' ? '2px solid #16a34a' : '1.5px solid #86efac',
                boxShadow: financeCategoryFilter === 'income' ? '0 3px 8px rgba(22,163,74,0.16)' : '0 1px 4px rgba(22,163,74,0.08)',
                padding: '8px 4px',
                borderRadius: 10,
                cursor: 'pointer',
                minWidth: 0
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>
                💰 ចំណូលសរុប
              </div>
              <strong style={{ fontSize: 12.5, fontWeight: 800, color: '#14532d', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {formatCurrencyTotals(summary.financeSummary.incomeTotals, useKhmerNumerals)}
              </strong>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#166534' }}>
                {fmtNum(summary.financeSummary.incomeItems.length)} មុខ
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('expense')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                background: financeCategoryFilter === 'expense' ? '#fee2e2' : '#fef2f2',
                border: financeCategoryFilter === 'expense' ? '2px solid #dc2626' : '1.5px solid #fca5a5',
                boxShadow: financeCategoryFilter === 'expense' ? '0 3px 8px rgba(220,38,38,0.16)' : '0 1px 4px rgba(220,38,38,0.08)',
                padding: '8px 4px',
                borderRadius: 10,
                cursor: 'pointer',
                minWidth: 0
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#b91c1c', whiteSpace: 'nowrap' }}>
                💸 ចំណាយសរុប
              </div>
              <strong style={{ fontSize: 12.5, fontWeight: 800, color: '#991b1b', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {formatExpenseTotals(summary.financeSummary.expenseTotals, isOverallDeficit, useKhmerNumerals)}
              </strong>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#991b1b' }}>
                {fmtNum(summary.financeSummary.expenseItems.length)} មុខ
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFinanceCategoryFilter('all')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                background: financeCategoryFilter === 'all'
                  ? (isOverallDeficit ? '#fee2e2' : '#dbeafe')
                  : (isOverallDeficit ? '#fef2f2' : '#eff6ff'),
                border: financeCategoryFilter === 'all'
                  ? (isOverallDeficit ? '2px solid #dc2626' : '2px solid #2563eb')
                  : (isOverallDeficit ? '1.5px solid #f87171' : '1.5px solid #60a5fa'),
                boxShadow: financeCategoryFilter === 'all'
                  ? (isOverallDeficit ? '0 3px 8px rgba(220,38,38,0.16)' : '0 3px 8px rgba(37,99,235,0.16)')
                  : (isOverallDeficit ? '0 1px 4px rgba(220,38,38,0.08)' : '0 1px 4px rgba(37,99,235,0.08)'),
                padding: '8px 4px',
                borderRadius: 10,
                cursor: 'pointer',
                minWidth: 0
              }}
            >
              <div style={{ fontSize: 10.5, fontWeight: 700, color: isOverallDeficit ? '#b91c1c' : '#1d4ed8', whiteSpace: 'nowrap' }}>
                ⚖️ ប្រាក់នៅសល់
              </div>
              <strong style={{ fontSize: 12.5, fontWeight: 800, color: isOverallDeficit ? '#b91c1c' : '#1e3a8a', margin: '3px 0', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {formatCurrencyTotals(summary.financeSummary.netTotals, useKhmerNumerals)}
              </strong>
              <div style={{ fontSize: 10, fontWeight: 600, color: isOverallDeficit ? '#991b1b' : '#1e40af' }}>
                មើលទាំងអស់
              </div>
            </button>
          </div>

          {/* Monthly Breakdown for Multi-Month View in Analytics Mode */}
          {viewFormatMode === 'analytics' && (periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && summary.financeSummary.monthlyBreakdown.length > 0 && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                📊 តារាងសង្ខេបចំណូល-ចំណាយតាមខែ ({fmtNum(selectedYear)})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.financeSummary.monthlyBreakdown.map((mRow, idx) => {
                  const isRowDeficit = isFinanceDeficit(mRow.balanceTotals, mRow.balance);
                  return (
                    <div
                      key={mRow.monthKey}
                      style={{
                        border: isRowDeficit ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        background: isRowDeficit ? '#fff8f8' : '#f8fafc',
                        borderRadius: 8,
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                          {formatMonthKeyLabel(mRow.monthKey, useKhmerNumerals)}
                        </span>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isRowDeficit ? '#dc2626' : '#1d4ed8'
                        }}>
                          {formatCurrencyTotals(mRow.balanceTotals, useKhmerNumerals)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                        <span>ចំណូល៖ <strong style={{ color: '#15803d' }}>{formatCurrencyTotals(mRow.incomeTotals, useKhmerNumerals)}</strong></span>
                        <span>ចំណាយ៖ <strong style={{ color: isRowDeficit ? '#b91c1c' : '#7f1d1d' }}>{formatExpenseTotals(mRow.expenseTotals, isRowDeficit, useKhmerNumerals)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

            {viewFormatMode === 'official_a4' ? (
              <div style={{ marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 10, overflow: 'hidden' }}>
                <A4SheetScaler>
                  <OfficialFinanceDocument
                    id="preview-mobile-summary-finance-document"
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
                </A4SheetScaler>
              </div>
            ) : (
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
                          border: isIncome ? '1.5px solid #86efac' : '1.5px solid #fca5a5',
                          borderRadius: 10,
                          padding: '10px 12px',
                          boxShadow: isIncome
                            ? '0 2px 5px rgba(22, 163, 74, 0.05)'
                            : '0 2px 5px rgba(220, 38, 38, 0.05)',
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
                            {(periodMode === 'year' || periodMode === 'semester1' || periodMode === 'semester2') && (
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
                          {item.totalLabel && (!item.total || Number(item.total) === 0)
                            ? (useKhmerNumerals ? toKhmerDigits(item.totalLabel) : item.totalLabel)
                            : formatMoney(item.total || 0, item.currency, useKhmerNumerals)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Offscreen Unscaled Official A4 Documents for Crisp Mobile PDF Export */}
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
          id="printable-mobile-summary-leave-document"
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
          compactReasonColumn={isMultiMonthPeriod}
        />
        <OfficialIdCardDocument
          id="printable-mobile-summary-idcard-document"
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
        <OfficialFinanceDocument
          id="printable-mobile-summary-finance-document"
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
          id="printable-mobile-summary-finance-brief-document"
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
    </div>
  );
}
