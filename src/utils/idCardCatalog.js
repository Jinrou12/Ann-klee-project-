import { toKhmerDigits, toEnglishDigits } from './khmerNumerals';

/**
 * Standard ID Card items and prices (in Riels) requested by user:
 * - ថង = ១ ៥០០៛
 * - ID = ១ ៥០០៛
 * - ខ្សែ = ២ ០០០៛
 * - មួយឈុត = ៥ ០០០៛
 */
export const ID_CARD_ITEMS = [
  { id: 'thong', label: 'ថង', unitPrice: 1500, badgeColor: '#0284c7', badgeBg: '#e0f2fe', border: '#7dd3fc' },
  { id: 'khsae', label: 'ខ្សែ', unitPrice: 2000, badgeColor: '#d97706', badgeBg: '#fef3c7', border: '#fcd34d' },
  { id: 'id_card', label: 'ID', unitPrice: 1500, badgeColor: '#7c3aed', badgeBg: '#ede9fe', border: '#c4b5fd' },
  { id: 'full_set', label: 'មួយឈុត', unitPrice: 5000, badgeColor: '#15803d', badgeBg: '#dcfce7', border: '#86efac' }
];

const KHMER_MONTH_NAMES = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

const KHMER_WEEKDAYS = [
  'ថ្ងៃអាទិត្យ', 'ថ្ងៃចន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'
];

/**
 * Parse which standard items are present in a description string
 */
export function parseSelectedIdCardItems(desc = '') {
  const text = String(desc || '').trim();
  if (!text) return [];
  if (text.includes('ឈុត') || text.includes('ឈុស')) {
    return ['full_set'];
  }
  const selected = [];
  if (text.includes('ថង')) selected.push('thong');
  if (text.includes('ខ្សែ')) selected.push('khsae');
  if (/\bID\b/i.test(text) || text.includes('កាតពាក់ក') || (text.includes('កាត') && !text.includes('ថងកាត')) || text.includes('ថងកាតនិងកាត') || text.includes('ក្រដាសកាត') || text.includes('+ ID')) {
    selected.push('id_card');
  }
  return selected;
}

/**
 * Compute unit price from an item description string
 */
export function getUnitPriceForIdCardDesc(desc = '') {
  const clean = String(desc || '').trim();
  if (!clean) return 0;

  if (clean.includes('ឈុត') || clean.includes('ឈុស')) {
    return 5000;
  }

  let sum = 0;
  let matched = false;
  if (clean.includes('ថង')) {
    sum += 1500;
    matched = true;
  }
  if (clean.includes('ខ្សែ')) {
    sum += 2000;
    matched = true;
  }
  // Check if ID is explicitly included alongside or standalone
  const withoutThongKat = clean.replace(/ថងកាត/g, '');
  if (/\bID\b/i.test(clean) || withoutThongKat.includes('កាត')) {
    sum += 1500;
    matched = true;
  }

  if (matched) {
    // If all 3 individual items are selected together, it equals មួយឈុត (5000៛)
    return sum;
  }
  return 0;
}

/**
 * Compute total price = unitPrice * quantity
 */
export function computeIdCardTotalPrice(desc = '', qty = 1, fallbackPrice = 0) {
  const numQty = Math.max(1, parseInt(toEnglishDigits(String(qty || '1')), 10) || 1);
  const unitPrice = getUnitPriceForIdCardDesc(desc);
  if (unitPrice > 0) {
    return unitPrice * numQty;
  }
  return Number(toEnglishDigits(String(fallbackPrice || 0)).replace(/[^\d.-]/g, '')) || 0;
}

/**
 * Toggle or select an item from the 4 options ('ថង', 'ខ្សែ', 'ID', 'មួយឈុត').
 * Supports both instant single-choice click and multi-item combination (e.g. ថង + ខ្សែ).
 */
export function selectOrCombineIdCardItem(currentDesc, clickedLabel, combineMode = false) {
  if (!combineMode || clickedLabel === 'មួយឈុត') {
    return clickedLabel;
  }

  const currentParts = String(currentDesc || '')
    .split(/\s*\+\s*|\s*និង\s*/)
    .map(s => s.trim())
    .filter(s => s === 'ថង' || s === 'ខ្សែ' || s === 'ID');

  const exists = currentParts.includes(clickedLabel);
  let nextParts;
  if (exists) {
    nextParts = currentParts.filter(p => p !== clickedLabel);
  } else {
    nextParts = [...currentParts, clickedLabel];
  }

  if (nextParts.length === 0) return clickedLabel;

  // Order consistently: ថង, ខ្សែ, ID
  const order = ['ថង', 'ខ្សែ', 'ID'];
  nextParts.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  // If all 3 (ថង + ខ្សែ + ID) are chosen, automatically become មួយឈុត (5000៛)
  if (nextParts.length === 3) {
    return 'មួយឈុត';
  }
  return nextParts.join(' + ');
}

/**
 * Get current system date formatted for ID Card entry + human-readable Khmer date
 * If activeMonthKey ('YYYY-MM') is passed and matches current month, uses exact today.
 * Otherwise uses today's day-of-month inside activeMonthKey so adding to a selected month stays consistent,
 * while also exposing realTodayDateStr for 1-click "ថ្ងៃនេះ (Auto Now)".
 */
export function getAutoSystemDateInfo(activeMonthKey = '') {
  const now = new Date();
  const realDayNum = now.getDate();
  const realMonthNum = now.getMonth() + 1;
  const realYearNum = now.getFullYear();

  const realDayStr = String(realDayNum).padStart(2, '0');
  const realMonthStr = String(realMonthNum).padStart(2, '0');
  const realYearStr = String(realYearNum);
  const realTodayDateStr = `${realDayStr}/${realMonthStr}/${realYearStr}`;
  const realTodayMonthKey = `${realYearStr}-${realMonthStr}`;

  let targetYear = realYearNum;
  let targetMonth = realMonthNum;
  if (activeMonthKey && /^\d{4}-\d{2}$/.test(activeMonthKey)) {
    const [y, m] = activeMonthKey.split('-').map(Number);
    if (y && m >= 1 && m <= 12) {
      targetYear = y;
      targetMonth = m;
    }
  }

  // Clamp day to max days in targetMonth
  const maxDaysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(realDayNum, maxDaysInTargetMonth);
  const entryDayStr = String(clampedDay).padStart(2, '0');
  const entryMonthStr = String(targetMonth).padStart(2, '0');
  const entryYearStr = String(targetYear);

  const entryDateStr = `${entryDayStr}/${entryMonthStr}/${entryYearStr}`;
  const targetDateObj = new Date(targetYear, targetMonth - 1, clampedDay);
  const weekdayName = KHMER_WEEKDAYS[targetDateObj.getDay()] || '';
  const monthName = KHMER_MONTH_NAMES[targetMonth - 1] || '';

  const khmerFullDateLabel = `${weekdayName} ទី${toKhmerDigits(entryDayStr)} ខែ${monthName} ឆ្នាំ${toKhmerDigits(entryYearStr)}`;

  return {
    entryDateStr,
    entryMonthKey: `${entryYearStr}-${entryMonthStr}`,
    realTodayDateStr,
    realTodayMonthKey,
    khmerFullDateLabel,
    monthName
  };
}

/**
 * Extract 'YYYY-MM' month key from a date string like '17/08/2026' or '១៧/០៨/២០២៦'
 */
export function extractMonthKeyFromDate(dateStr, fallbackMonthKey = '2026-07') {
  const clean = toEnglishDigits(String(dateStr || '').trim());
  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    // Fix common typo like 3036 -> 2026
    if (year > 2100) year = 2026;
    if (month >= 1 && month <= 12 && year >= 2020 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  return fallbackMonthKey;
}

/**
 * Format human-readable Khmer date breakdown from a 'DD/MM/YYYY' string
 */
export function formatDateBreakdownKhmer(dateStr, useKhmerNumerals = true) {
  const clean = toEnglishDigits(String(dateStr || '').trim());
  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return dateStr || '--';
  const d = String(parseInt(match[1], 10)).padStart(2, '0');
  const m = parseInt(match[2], 10);
  let y = parseInt(match[3], 10);
  if (y > 2100) y = 2026;
  const monthName = KHMER_MONTH_NAMES[m - 1] || '';
  const dDisp = useKhmerNumerals ? toKhmerDigits(d) : d;
  const yDisp = useKhmerNumerals ? toKhmerDigits(y) : y;
  return `ថ្ងៃទី${dDisp} ខែ${monthName} ឆ្នាំ${yDisp}`;
}

