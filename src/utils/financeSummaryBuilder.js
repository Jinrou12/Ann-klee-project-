import {
  toKhmerDigits,
  parseKhmerNumber,
  sumByCurrency,
  combineCurrencyTotals,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit
} from './khmerNumerals.js';
import { KHMER_SOLAR_MONTHS } from './khmerCalendar.js';

/**
 * Detect whether an income item represents an opening balance / carryover row
 */
export function isCarryoverIncomeItem(item) {
  const desc = String(item?.desc || '').trim();
  return (
    desc.includes('ប្រាក់សល់ពីខែ') ||
    desc.includes('ប្រាក់សល់ពី') ||
    desc.includes('ប្រាក់តម្កល់') ||
    desc.includes('ប្រាក់តម្ដល់') ||
    desc.includes('ប្រាក់តម្កាល') ||
    item?.autoChannel === 'carryover'
  );
}

/**
 * Detect whether an expense item represents hourly volunteer teacher pay
 * (Avoids false positives on school supply items such as "គ្រូណូ" or photo printing)
 */
export function isTeacherHourlyExpenseItem(item) {
  const desc = String(item?.desc || '').trim();
  return (
    desc.includes('ប្រាក់ម៉ោង') ||
    desc.includes('គ្រូស្ម័គ្រចិត្ត') ||
    desc.includes('គ្រូស្ម័ក្រចិត្ត') ||
    desc.includes('ជួលគ្រូ')
  );
}

/**
 * Build the structured 8-row Official Finance Summary model
 * matching របាយការណ៍ចំណូលចំណាយសង្ខេប (.docx official template)
 */
export function buildFinanceSummaryModel(
  financeData = { income: [], expense: [] },
  options = {}
) {
  const {
    monthKey = '2026-07',
    monthName = '',
    yearDisplay = '',
    periodMode = 'month', // 'month' | 'semester1' | 'semester2' | 'year'
    useKhmerNumerals = true,
    customSummaryTitle = '',
    isDeficitOverride = null
  } = options;

  const fmt = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));

  const [rawYear, rawMonth] = String(monthKey || '2026-07').split('-');
  const monthIdx = Math.max(0, Math.min(11, (parseInt(rawMonth, 10) || 7) - 1));
  const resolvedMonthName = monthName || KHMER_SOLAR_MONTHS[monthIdx] || 'កក្កដា';
  const resolvedYearDisplay = yearDisplay || fmt(rawYear || '2026');

  const incomeList = Array.isArray(financeData?.income) ? financeData.income : [];
  const expenseList = Array.isArray(financeData?.expense) ? financeData.expense : [];

  // 1. Split Income into Carryover (Row 1) vs Current Period New Income (Row 2)
  const carryoverItems = incomeList.filter(isCarryoverIncomeItem);
  const newIncomeItems = incomeList.filter(item => !isCarryoverIncomeItem(item));

  const carryoverTotals = sumByCurrency(carryoverItems);
  const newIncomeTotals = sumByCurrency(newIncomeItems);
  const incomeTotals = sumByCurrency(incomeList);

  // Derive Carryover Description
  let carryoverDesc = '';
  const firstCarryDesc = String(carryoverItems[0]?.desc || '').trim();
  if (
    periodMode === 'semester1' ||
    periodMode === 'year' ||
    firstCarryDesc.includes('ឆ្នាំចាស់')
  ) {
    carryoverDesc = 'ចំណូល ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់';
  } else {
    let prevMonthLabel = '';
    const parenMatch = firstCarryDesc.match(/\(([^)]+)\)/);
    const khMonthMatch = firstCarryDesc.match(/ខែ([^\s()]+)/);
    if (parenMatch && parenMatch[1]) {
      prevMonthLabel = parenMatch[1].trim();
    } else if (khMonthMatch && khMonthMatch[1] && !khMonthMatch[1].includes('ចាស់') && !khMonthMatch[1].includes('ចាស')) {
      prevMonthLabel = khMonthMatch[1].trim();
    } else if (periodMode === 'semester2') {
      prevMonthLabel = 'កញ្ញា';
    } else if (rawMonth === '05') {
      carryoverDesc = 'ចំណូល ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់';
    } else {
      const prevIdx = (monthIdx + 11) % 12;
      prevMonthLabel = KHMER_SOLAR_MONTHS[prevIdx] || '';
    }

    if (!carryoverDesc) {
      carryoverDesc = prevMonthLabel
        ? `ចំណូល ប្រាក់តម្កល់សល់ពីខែចាស់ (${prevMonthLabel})`
        : 'ចំណូល ប្រាក់តម្កល់សល់ពីខែចាស់';
    }
  }

  // Derive Row 2 New Income Description
  let newIncomeDesc = `ចំណូលក្នុងខែ${resolvedMonthName}`;
  if (periodMode === 'year') {
    newIncomeDesc = `ចំណូលក្នុងឆ្នាំសិក្សា ${resolvedYearDisplay}`;
  } else if (periodMode === 'semester1') {
    newIncomeDesc = `ចំណូលក្នុងឆមាសទី ${fmt(1)}`;
  } else if (periodMode === 'semester2') {
    newIncomeDesc = `ចំណូលក្នុងឆមាសទី ${fmt(2)}`;
  }

  const inKindNotes = newIncomeItems
    .map(it => it?.totalLabel)
    .filter(Boolean)
    .map(lbl => (useKhmerNumerals ? toKhmerDigits(lbl) : lbl))
    .join(', ');

  // 2. Split Expense into School Supplies/General (Row 1) vs Teacher Hourly Pay (Row 2)
  const teacherExpenseItems = expenseList.filter(isTeacherHourlyExpenseItem);
  const supplyExpenseItems = expenseList.filter(item => !isTeacherHourlyExpenseItem(item));

  const supplyExpenseTotals = sumByCurrency(supplyExpenseItems);
  const teacherExpenseTotals = sumByCurrency(teacherExpenseItems);
  const expenseTotals = sumByCurrency(expenseList);

  let teacherCountNum = teacherExpenseItems.length > 0 ? 6 : 0;
  for (const tItem of teacherExpenseItems) {
    const m = String(tItem?.desc || '').match(/([0-9០-៩]+)\s*អង្គ/);
    if (m && m[1]) {
      const parsed = parseKhmerNumber(m[1]);
      if (parsed > 0 && Number.isFinite(parsed)) {
        teacherCountNum = parsed;
        break;
      }
    }
  }

  let totalTeacherHours = 0;
  for (const tItem of teacherExpenseItems) {
    const qtyRaw = String(tItem?.qty || '').trim();
    const qtyParsed = parseKhmerNumber(qtyRaw);
    if (qtyParsed > 0 && !/អង្គ|នាក់|រូប/.test(qtyRaw)) {
      totalTeacherHours += qtyParsed;
    } else if (Number(tItem?.total) > 0) {
      const unit = parseKhmerNumber(tItem?.unitPrice) || 4000;
      if (unit > 0) {
        totalTeacherHours += Math.round(Number(tItem.total) / unit);
      }
    }
  }

  const isMultiMonthPeriod =
    periodMode === 'semester1' || periodMode === 'semester2' || periodMode === 'year';
  const teacherQtyText = isMultiMonthPeriod
    ? `${fmt(totalTeacherHours)}ម៉ោង`
    : `${fmt(teacherCountNum)}អង្គ/នាក់`;

  // 3. Net Balance & Deficit check
  const totalIncomeRaw = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpenseRaw = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const balanceTotals = combineCurrencyTotals(incomeTotals, expenseTotals, -1);
  const isDeficit = typeof isDeficitOverride === 'boolean'
    ? isDeficitOverride
    : isFinanceDeficit(balanceTotals, totalIncomeRaw - totalExpenseRaw);

  // 4. Report Title Line 3 & File Name Slug
  let reportTitle = customSummaryTitle;
  if (!reportTitle) {
    if (periodMode === 'year') {
      reportTitle = `តារាងចំណូលចំណាយសង្ខេបប្រចាំឆ្នាំសិក្សា ${resolvedYearDisplay}`;
    } else if (periodMode === 'semester1') {
      reportTitle = `តារាងចំណូលចំណាយសង្ខេបប្រចាំឆមាសទី ${fmt(1)} ឆ្នាំ${resolvedYearDisplay}`;
    } else if (periodMode === 'semester2') {
      reportTitle = `តារាងចំណូលចំណាយសង្ខេបប្រចាំឆមាសទី ${fmt(2)} ឆ្នាំ${resolvedYearDisplay}`;
    } else {
      reportTitle = `តារាងចំណូលចំណាយសង្ខេបខែ ${resolvedMonthName} ឆ្នាំ${resolvedYearDisplay}`;
    }
  }

  return {
    reportTitle,
    isDeficit,
    incomeRows: [
      {
        no: fmt(1),
        desc: carryoverDesc,
        qty: `${fmt(1)}ឆ្នាំ`,
        amountText: formatCurrencyTotals(carryoverTotals, useKhmerNumerals),
        note: ''
      },
      {
        no: fmt(2),
        desc: newIncomeDesc,
        qty: `${fmt(newIncomeItems.length)}មុខ`,
        amountText: formatCurrencyTotals(newIncomeTotals, useKhmerNumerals),
        note: inKindNotes
      }
    ],
    totalIncomeLabel: 'សរុបចំណូល',
    totalIncomeText: formatCurrencyTotals(incomeTotals, useKhmerNumerals),
    expenseRows: [
      {
        no: fmt(1),
        desc: 'ចំណាយ ទិញសម្ភារៈប្រើប្រាស់ក្នុងសាលា',
        qty: `${fmt(supplyExpenseItems.length)}មុខ`,
        amountText: formatCurrencyTotals(supplyExpenseTotals, useKhmerNumerals),
        note: ''
      },
      {
        no: fmt(2),
        desc: 'ចំណាយ លើការជួលគ្រូប្រាក់ម៉ោង',
        qty: teacherQtyText,
        amountText: formatCurrencyTotals(teacherExpenseTotals, useKhmerNumerals),
        note: ''
      }
    ],
    totalExpenseLabel: 'សរុបចំណាយ',
    totalExpenseText: formatExpenseTotals(expenseTotals, isDeficit, useKhmerNumerals),
    balanceLabel: isDeficit ? 'ខ្វះថវិកា' : 'សមតុល្យនៅសល់',
    balanceText: formatCurrencyTotals(balanceTotals, useKhmerNumerals)
  };
}

