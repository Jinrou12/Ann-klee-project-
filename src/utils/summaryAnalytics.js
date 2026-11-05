// Monthly & Yearly Summary Analytics Engine (Shared across PC & Mobile /mp)
import * as XLSX from 'xlsx';
import { toKhmerDigits, toArabicDigits, formatKhmerCurrency, formatMoney, sumByCurrency, combineCurrencyTotals, formatCurrencyTotals } from './khmerNumerals';
import { KHMER_SOLAR_MONTHS } from './khmerCalendar';
import { matchStudentName } from './studentMaster';

/**
 * Parse a single leave duration string (e.g., "១ថ្ងៃ", "១ថ្ងៃកន្លះ", "១ព្រឹក", "១ល្ងាច")
 * into structured counters: { days, mornings, afternoons, otherText }
 */
export function parseSingleDuration(rawDuration) {
  const result = { days: 0, mornings: 0, afternoons: 0, other: [] };
  if (!rawDuration) return result;

  const clean = toArabicDigits(String(rawDuration).replace(/\u200B/g, '').trim());
  if (!clean) return result;

  // 1. Check "Nថ្ងៃកន្លះ" (e.g. "1ថ្ងៃកន្លះ")
  const halfWithInt = clean.match(/(\d+)\s*ថ្ងៃ\s*កន្លះ/);
  if (halfWithInt) {
    result.days += parseInt(halfWithInt[1], 10) + 0.5;
    return result;
  }

  // 2. Check pure "កន្លះថ្ងៃ" or "0.5ថ្ងៃ"
  if (/កន្លះ\s*ថ្ងៃ|0\.5\s*ថ្ងៃ/.test(clean)) {
    result.days += 0.5;
    return result;
  }

  let matchedAny = false;

  // 3. Check "Nថ្ងៃ" (including decimal like 1.5ថ្ងៃ)
  const dayMatch = clean.match(/(\d+(?:\.\d+)?)\s*ថ្ងៃ/);
  if (dayMatch) {
    result.days += parseFloat(dayMatch[1]) || 0;
    matchedAny = true;
  }

  // 4. Check "Nព្រឹក"
  const morningMatch = clean.match(/(\d+)?\s*ព្រឹក/);
  if (morningMatch) {
    result.mornings += morningMatch[1] ? parseInt(morningMatch[1], 10) : 1;
    matchedAny = true;
  }

  // 5. Check "Nល្ងាច"
  const afternoonMatch = clean.match(/(\d+)?\s*ល្ងាច/);
  if (afternoonMatch) {
    result.afternoons += afternoonMatch[1] ? parseInt(afternoonMatch[1], 10) : 1;
    matchedAny = true;
  }

  // 6. Bare number fallback -> days
  if (!matchedAny) {
    const bareNum = clean.match(/^(\d+(?:\.\d+)?)$/);
    if (bareNum) {
      result.days += parseFloat(bareNum[1]) || 0;
    } else {
      result.other.push(String(rawDuration).trim());
    }
  }

  return result;
}

/**
 * Format accumulated duration totals into natural Khmer text
 * e.g. { days: 2.5, mornings: 1, afternoons: 0 } -> "២ថ្ងៃកន្លះ ១ព្រឹក"
 */
export function formatDurationTotals(totals, useKhmerNumerals = true) {
  if (!totals) return '—';
  const parts = [];
  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

  if (totals.days > 0) {
    const whole = Math.floor(totals.days);
    const hasHalf = Math.abs((totals.days - whole) - 0.5) < 0.01;
    if (whole > 0 && hasHalf) {
      parts.push(`${fmtNum(whole)}ថ្ងៃកន្លះ`);
    } else if (whole === 0 && hasHalf) {
      parts.push('កន្លះថ្ងៃ');
    } else {
      parts.push(`${fmtNum(totals.days)}ថ្ងៃ`);
    }
  }

  if (totals.mornings > 0) {
    parts.push(`${fmtNum(totals.mornings)}ព្រឹក`);
  }

  if (totals.afternoons > 0) {
    parts.push(`${fmtNum(totals.afternoons)}ល្ងាច`);
  }

  if (Array.isArray(totals.other) && totals.other.length > 0) {
    parts.push(...totals.other);
  }

  return parts.length > 0 ? parts.join(' ') : '—';
}

/**
 * Format "YYYY-MM" into Khmer month & year label
 */
export function formatMonthKeyLabel(mKey, useKhmerNumerals = true) {
  if (!mKey || !mKey.includes('-')) return mKey || '';
  const [y, m] = mKey.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = KHMER_SOLAR_MONTHS[monthIdx] || m;
  const yearDisplay = useKhmerNumerals ? toKhmerDigits(y) : y;
  return `ខែ${monthName} ឆ្នាំ${yearDisplay}`;
}

/**
 * Extract available years and months from appState.leaves and appState.finance
 */
export function getAvailablePeriods(allLeaves = {}, allFinance = {}, currentMonthKey = '2026-07') {
  const monthSet = new Set([
    ...Object.keys(allLeaves || {}),
    ...Object.keys(allFinance || {}),
    currentMonthKey
  ].filter(Boolean));

  const months = Array.from(monthSet).sort().reverse();
  const yearSet = new Set(months.map(m => m.split('-')[0]).filter(Boolean));
  // Ensure current year and adjacent years are easy to browse
  yearSet.add('2026');
  const years = Array.from(yearSet).sort().reverse();

  return { years, months };
}

/**
 * Compute complete student leave summary & finance summary for a chosen period
 * @param {Object} params
 * @param {'month'|'year'} params.periodMode - 'month' (single month) or 'year' (entire year)
 * @param {string} params.selectedMonth - e.g. '2026-07'
 * @param {string} params.selectedYear - e.g. '2026'
 * @param {Object} params.allLeaves - appState.leaves
 * @param {Object} params.allFinance - appState.finance
 * @param {Array} params.studentMaster - appState.studentMaster (80 official students)
 */
export function computePeriodSummary({
  periodMode = 'month',
  selectedMonth = '2026-07',
  selectedYear = '2026',
  allLeaves = {},
  allFinance = {},
  studentMaster = []
}) {
  // 1. Determine which month keys belong to the selected period
  const targetMonthKeys = periodMode === 'year'
    ? Object.keys({ ...allLeaves, ...allFinance })
        .filter(k => k.startsWith(`${selectedYear}-`))
        .sort()
    : [selectedMonth];

  // 2. Initialize student map from official Student Master (80 monks)
  const studentMap = new Map();
  const compactNameLookup = new Map();

  (studentMaster || []).forEach((s, idx) => {
    const key = s.id || `std-${idx}`;
    studentMap.set(key, {
      id: key,
      name: s.name,
      grade: s.grade || '',
      orderIndex: idx,
      leaveCount: 0,
      durationTotals: { days: 0, mornings: 0, afternoons: 0, other: [] },
      records: []
    });

    const compactPrimary = String(s.name || '').replace(/[\s\u200B]/g, '');
    if (compactPrimary) compactNameLookup.set(compactPrimary, key);

    if (Array.isArray(s.aliases)) {
      s.aliases.forEach(alias => {
        const compactAlias = String(alias || '').replace(/[\s\u200B]/g, '');
        if (compactAlias) compactNameLookup.set(compactAlias, key);
      });
    }
  });

  // Helper to resolve a leave record's student name to a studentMap entry
  const resolveStudentEntry = (rawName, rawGrade) => {
    const cleanName = String(rawName || '').trim();
    const compact = cleanName.replace(/[\s\u200B]/g, '');

    // Special known alias in historical data
    if (compact === 'ឡេងអាន') {
      const targetKey = compactNameLookup.get('ឆេងអានឈាងហេង');
      if (targetKey && studentMap.has(targetKey)) return studentMap.get(targetKey);
    }

    // 1. Direct or alias compact lookup
    if (compact && compactNameLookup.has(compact)) {
      return studentMap.get(compactNameLookup.get(compact));
    }

    // 2. Fuzzy match against studentMaster
    if (cleanName && studentMaster && studentMaster.length > 0) {
      const matched = matchStudentName(cleanName, studentMaster, rawGrade);
      if (matched && matched.confidence >= 0.72 && matched.student) {
        const mCompact = String(matched.student.name || '').replace(/[\s\u200B]/g, '');
        const mKey = compactNameLookup.get(mCompact);
        if (mKey && studentMap.has(mKey)) {
          return studentMap.get(mKey);
        }
      }
    }

    // 3. Unlisted student fallback (so no leave record in the table is ever omitted)
    const fallbackKey = `unlisted-${compact || 'unknown'}`;
    if (!studentMap.has(fallbackKey)) {
      studentMap.set(fallbackKey, {
        id: fallbackKey,
        name: cleanName || 'សមណសិស្ស',
        grade: rawGrade || '—',
        orderIndex: 9999 + studentMap.size,
        leaveCount: 0,
        durationTotals: { days: 0, mornings: 0, afternoons: 0, other: [] },
        records: []
      });
    }
    return studentMap.get(fallbackKey);
  };

  // 3. Aggregate all leave records across targetMonthKeys
  let totalLeaveRequests = 0;
  const overallDurationTotals = { days: 0, mornings: 0, afternoons: 0, other: [] };

  targetMonthKeys.forEach(mKey => {
    const monthLeaves = allLeaves?.[mKey];
    if (!Array.isArray(monthLeaves)) return;

    monthLeaves.forEach(rec => {
      if (!rec || (!rec.name && !rec.reason)) return;
      const entry = resolveStudentEntry(rec.name, rec.grade);
      entry.leaveCount += 1;
      totalLeaveRequests += 1;

      const parsedDur = parseSingleDuration(rec.duration);
      entry.durationTotals.days += parsedDur.days;
      entry.durationTotals.mornings += parsedDur.mornings;
      entry.durationTotals.afternoons += parsedDur.afternoons;
      if (parsedDur.other.length > 0) {
        entry.durationTotals.other.push(...parsedDur.other);
      }

      overallDurationTotals.days += parsedDur.days;
      overallDurationTotals.mornings += parsedDur.mornings;
      overallDurationTotals.afternoons += parsedDur.afternoons;

      entry.records.push({
        ...rec,
        monthKey: mKey
      });
    });
  });

  // 4. Build sorted lists
  const allStudentsList = Array.from(studentMap.values());

  // Students with leave: sort by leaveCount DESC, then days DESC, then original order
  const studentsWithLeave = allStudentsList
    .filter(s => s.leaveCount > 0)
    .sort((a, b) => {
      if (b.leaveCount !== a.leaveCount) return b.leaveCount - a.leaveCount;
      if (b.durationTotals.days !== a.durationTotals.days) return b.durationTotals.days - a.durationTotals.days;
      return a.orderIndex - b.orderIndex;
    });

  // Students with 0 leave: keep roster order
  const studentsWithoutLeave = allStudentsList
    .filter(s => s.leaveCount === 0)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // All students: sort by leaveCount DESC first so active ones are easy to see, or roster order
  const allStudentsSorted = [...studentsWithLeave, ...studentsWithoutLeave];

  // 5. Aggregate Finance across targetMonthKeys
  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyFinanceBreakdown = [];
  const incomeItems = [];
  const expenseItems = [];

  targetMonthKeys.forEach(mKey => {
    const fin = allFinance?.[mKey];
    if (!fin) return;
    const incList = Array.isArray(fin.income) ? fin.income : [];
    const expList = Array.isArray(fin.expense) ? fin.expense : [];

    const mIncome = incList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const mExpense = expList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const mIncTotals = sumByCurrency(incList);
    const mExpTotals = sumByCurrency(expList);
    const mBalTotals = combineCurrencyTotals(mIncTotals, mExpTotals, -1);

    incList.forEach(item => {
      incomeItems.push({ ...item, category: 'income', monthKey: mKey });
    });
    expList.forEach(item => {
      expenseItems.push({ ...item, category: 'expense', monthKey: mKey });
    });

    if (mIncome > 0 || mExpense > 0 || periodMode === 'month') {
      totalIncome += mIncome;
      totalExpense += mExpense;
      monthlyFinanceBreakdown.push({
        monthKey: mKey,
        income: mIncome,
        expense: mExpense,
        balance: mIncome - mExpense,
        incomeTotals: mIncTotals,
        expenseTotals: mExpTotals,
        balanceTotals: mBalTotals,
        incomeCount: incList.length,
        expenseCount: expList.length
      });
    }
  });

  const overallIncomeTotals = sumByCurrency(incomeItems);
  const overallExpenseTotals = sumByCurrency(expenseItems);
  const overallNetTotals = combineCurrencyTotals(overallIncomeTotals, overallExpenseTotals, -1);

  return {
    periodMode,
    targetMonthKeys,
    totalStudentsCount: allStudentsList.length,
    withLeaveCount: studentsWithLeave.length,
    withoutLeaveCount: studentsWithoutLeave.length,
    totalLeaveRequests,
    overallDurationTotals,
    studentsWithLeave,
    studentsWithoutLeave,
    allStudentsSorted,
    financeSummary: {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      incomeTotals: overallIncomeTotals,
      expenseTotals: overallExpenseTotals,
      netTotals: overallNetTotals,
      incomeItems,
      expenseItems,
      allItems: [...incomeItems, ...expenseItems],
      monthlyBreakdown: monthlyFinanceBreakdown
    }
  };
}

/**
 * Export the currently viewed Student Leave Summary to Excel (.xlsx)
 */
export function exportSummaryToExcel({
  rows = [],
  periodLabel = '',
  showDuration = true,
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

  const data = rows.map((s, idx) => {
    const base = {
      'ល.រ': fmtNum(idx + 1),
      'គោត្តនាម-នាម': s.name,
      'ថ្នាក់': String(s.grade).includes('មត្តេយ្យ') ? 'មត្តេយ្យ' : `ថ្នាក់ទី ${fmtNum(s.grade)}`,
      'ចំនួនដងសុំច្បាប់': `${fmtNum(s.leaveCount)} ដង`
    };
    if (showDuration) {
      base['រយៈពេលសរុប'] = formatDurationTotals(s.durationTotals, useKhmerNumerals);
    }
    base['កាលបរិច្ឆេទ និងមូលហេតុ'] = s.records
      .map(r => `${r.date || ''} (${r.duration || ''} - ${r.reason || ''})`)
      .join(' | ') || '—';
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'បូកសរុបច្បាប់សមណសិស្ស');
  const safeFileLabel = String(periodLabel || 'Summary').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `បូកសរុបច្បាប់សមណសិស្ស_${safeFileLabel}.xlsx`);
}

/**
 * Export the Finance Summary (Monthly or Yearly) to Excel (.xlsx)
 */
export function exportFinanceSummaryToExcel({
  financeSummary,
  periodLabel = '',
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));
  const items = financeSummary?.allItems || [];

  const rows = items.map((item, idx) => ({
    'ល.រ': fmtNum(idx + 1),
    'ប្រភេទ': item.category === 'income' ? 'ចំណូល' : 'ចំណាយ',
    'ខែ': formatMonthKeyLabel(item.monthKey, useKhmerNumerals),
    'បរិយាយ': item.desc || '',
    'បរិមាណ': item.qty || '',
    'តម្លៃរាយ': item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmerNumerals) : '',
    'តម្លៃសរុប': formatMoney(item.total || 0, item.currency, useKhmerNumerals)
  }));

  rows.push({
    'ល.រ': '',
    'ប្រភេទ': 'សរុបរួម',
    'ខែ': periodLabel,
    'បរិយាយ': `ចំណូលសរុប៖ ${formatCurrencyTotals(financeSummary?.incomeTotals, useKhmerNumerals)} | ចំណាយសរុប៖ ${formatCurrencyTotals(financeSummary?.expenseTotals, useKhmerNumerals)}`,
    'បរិមាណ': '',
    'តម្លៃរាយ': 'នៅសល់៖',
    'តម្លៃសរុប': formatCurrencyTotals(financeSummary?.netTotals, useKhmerNumerals)
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'បូកសរុបហិរញ្ញវត្ថុ');
  const safeFileLabel = String(periodLabel || 'Finance').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `បូកសរុបហិរញ្ញវត្ថុ_${safeFileLabel}.xlsx`);
}
