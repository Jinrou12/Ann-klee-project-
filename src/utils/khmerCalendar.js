// Khmer Buddhist Era and Lunar Date Utilities
import { toKhmerDigits } from './khmerNumerals.js';

export const KHMER_SOLAR_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

export const KHMER_DAYS = [
  'ថ្ងៃអាទិត្យ', 'ថ្ងៃចន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'
];

export const KHMER_ZODIAC_ANIMALS = [
  'ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់', 'មមី', 'មមែ', 'វក', 'រកា', 'ច', 'កុរ'
];

export const KHMER_SAK = [
  'សំរឹទ្ធិស័ក', 'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក',
  'បញ្ចស័ក', 'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក'
];

/**
 * Verified Khmer Chhankitek Lunar Month Table (2025-11 through 2028-01)
 * Each entry defines the Gregorian start date of `១កើត` (YYYY-MM-DD), month name, length (29 or 30 days),
 * Animal Year (zodiac), Sak era, and Buddhist Era (ព.ស.) on `១កើត` (with optional `beAfterFullMoon` for ខែពិសាខ
 * where ព.ស. increments on `១រោច ខែពិសាខ`, and `newYearTransitionDate` for ខែចេត្រ where Zodiac/Sak shift on April 14).
 */
const KHMER_LUNAR_MONTH_TABLE = [
  { start: '2025-11-21', days: 29, month: 'មិគសិរ', zodiac: 'ម្សាញ់', sak: 'សប្តស័ក', be: 2569 },
  { start: '2025-12-20', days: 30, month: 'បុស្ស', zodiac: 'ម្សាញ់', sak: 'សប្តស័ក', be: 2569 },
  { start: '2026-01-19', days: 29, month: 'មាឃ', zodiac: 'ម្សាញ់', sak: 'សប្តស័ក', be: 2569 },
  { start: '2026-02-17', days: 30, month: 'ផល្គុន', zodiac: 'ម្សាញ់', sak: 'សប្តស័ក', be: 2569 },
  {
    start: '2026-03-19',
    days: 29,
    month: 'ចេត្រ',
    zodiac: 'ម្សាញ់',
    sak: 'សប្តស័ក',
    be: 2569,
    newYearDate: '2026-04-14',
    zodiacAfterNewYear: 'មមី',
    sakAfterNewYear: 'អដ្ឋស័ក'
  },
  {
    start: '2026-04-17',
    days: 30,
    month: 'ពិសាខ',
    zodiac: 'មមី',
    sak: 'អដ្ឋស័ក',
    be: 2569,
    beAfterFullMoon: 2570
  },
  { start: '2026-05-17', days: 29, month: 'ជេស្ឋ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-06-15', days: 30, month: 'បឋមាសាឍ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-07-15', days: 30, month: 'ទុតិយាសាឍ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-08-14', days: 29, month: 'ស្រាពណ៍', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-09-12', days: 30, month: 'ភទ្របទ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-10-12', days: 29, month: 'អស្សុជ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-11-10', days: 30, month: 'កត្តិក', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2026-12-10', days: 29, month: 'មិគសិរ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2027-01-08', days: 30, month: 'បុស្ស', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2027-02-07', days: 29, month: 'មាឃ', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  { start: '2027-03-08', days: 30, month: 'ផល្គុន', zodiac: 'មមី', sak: 'អដ្ឋស័ក', be: 2570 },
  {
    start: '2027-04-07',
    days: 29,
    month: 'ចេត្រ',
    zodiac: 'មមី',
    sak: 'អដ្ឋស័ក',
    be: 2570,
    newYearDate: '2027-04-14',
    zodiacAfterNewYear: 'មមែ',
    sakAfterNewYear: 'នព្វស័ក'
  },
  {
    start: '2027-05-06',
    days: 30,
    month: 'ពិសាខ',
    zodiac: 'មមែ',
    sak: 'នព្វស័ក',
    be: 2570,
    beAfterFullMoon: 2571
  },
  { start: '2027-06-05', days: 29, month: 'ជេស្ឋ', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-07-04', days: 30, month: 'អាសាឍ', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-08-03', days: 29, month: 'ស្រាពណ៍', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-09-01', days: 30, month: 'ភទ្របទ', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-10-01', days: 29, month: 'អស្សុជ', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-10-30', days: 30, month: 'កត្តិក', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-11-29', days: 29, month: 'មិគសិរ', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 },
  { start: '2027-12-28', days: 30, month: 'បុស្ស', zodiac: 'មមែ', sak: 'នព្វស័ក', be: 2571 }
];

const STANDARD_LUNAR_MONTH_CYCLE = [
  { month: 'មិគសិរ', days: 29 },
  { month: 'បុស្ស', days: 30 },
  { month: 'មាឃ', days: 29 },
  { month: 'ផល្គុន', days: 30 },
  { month: 'ចេត្រ', days: 29 },
  { month: 'ពិសាខ', days: 30 },
  { month: 'ជេស្ឋ', days: 29 },
  { month: 'អាសាឍ', days: 30 },
  { month: 'ស្រាពណ៍', days: 29 },
  { month: 'ភទ្របទ', days: 30 },
  { month: 'អស្សុជ', days: 29 },
  { month: 'កត្តិក', days: 30 }
];

function toUtcMidnightMs(y, m1Based, d) {
  return Date.UTC(y, m1Based - 1, d);
}

function parseIsoToUtcMs(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Compute the exact Khmer Chhankitek Lunar Date (ចន្ទគតិ) for any Gregorian Date.
 * @param {Date} date
 * @param {boolean} useKhmerNumerals
 * @returns {{
 *   dayNameKhmer: string,
 *   lunarDayNum: number,
 *   lunarPhase: string,
 *   lunarMonthName: string,
 *   lunarBody: string,
 *   zodiac: string,
 *   sak: string,
 *   beYear: string,
 *   lunarDateText: string
 * }}
 */
export function computeKhmerLunarDate(date = new Date(), useKhmerNumerals = true) {
  const fmt = (n) => (useKhmerNumerals ? toKhmerDigits(n) : String(n));
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const targetMs = toUtcMidnightMs(y, m, d);
  const dayNameKhmer = KHMER_DAYS[date.getDay()];

  // 1. Search in verified Chhankitek table first
  for (const entry of KHMER_LUNAR_MONTH_TABLE) {
    const startMs = parseIsoToUtcMs(entry.start);
    const diffDays = Math.round((targetMs - startMs) / 86400000);
    if (diffDays >= 0 && diffDays < entry.days) {
      const dayOfLunarMonth = diffDays + 1; // 1..29 or 1..30
      const isWaxing = dayOfLunarMonth <= 15;
      const lunarDayNum = isWaxing ? dayOfLunarMonth : dayOfLunarMonth - 15;
      const lunarPhase = isWaxing ? 'កើត' : 'រោច';
      const lunarBody = `${fmt(lunarDayNum)}${lunarPhase} ខែ${entry.month}`;

      let zodiac = entry.zodiac;
      let sak = entry.sak;
      if (entry.newYearDate && targetMs >= parseIsoToUtcMs(entry.newYearDate)) {
        zodiac = entry.zodiacAfterNewYear || zodiac;
        sak = entry.sakAfterNewYear || sak;
      }

      const beNum = (!isWaxing && entry.beAfterFullMoon) ? entry.beAfterFullMoon : entry.be;
      const beYear = fmt(beNum);
      const lunarDateText = `${dayNameKhmer} ${lunarBody} ឆ្នាំ${zodiac} ${sak} ព.ស ${beYear}`;

      return {
        dayNameKhmer,
        lunarDayNum,
        lunarPhase,
        lunarMonthName: entry.month,
        lunarBody,
        zodiac,
        sak,
        beYear,
        lunarDateText
      };
    }
  }

  // 2. Fallback extrapolation using the alternating 29/30-day Chhankitek cycle anchored at 2026-09-12 (១កើត ខែភទ្របទ)
  const anchorMs = parseIsoToUtcMs('2026-09-12');
  let deltaDays = Math.round((targetMs - anchorMs) / 86400000);
  let cycleIdx = 9; // 'ភទ្របទ' in STANDARD_LUNAR_MONTH_CYCLE

  if (deltaDays >= 0) {
    while (deltaDays >= STANDARD_LUNAR_MONTH_CYCLE[cycleIdx].days) {
      deltaDays -= STANDARD_LUNAR_MONTH_CYCLE[cycleIdx].days;
      cycleIdx = (cycleIdx + 1) % STANDARD_LUNAR_MONTH_CYCLE.length;
    }
  } else {
    while (deltaDays < 0) {
      cycleIdx = (cycleIdx - 1 + STANDARD_LUNAR_MONTH_CYCLE.length) % STANDARD_LUNAR_MONTH_CYCLE.length;
      deltaDays += STANDARD_LUNAR_MONTH_CYCLE[cycleIdx].days;
    }
  }

  const monthObj = STANDARD_LUNAR_MONTH_CYCLE[cycleIdx];
  const dayOfLunarMonth = deltaDays + 1;
  const isWaxing = dayOfLunarMonth <= 15;
  const lunarDayNum = isWaxing ? dayOfLunarMonth : dayOfLunarMonth - 15;
  const lunarPhase = isWaxing ? 'កើត' : 'រោច';
  const lunarBody = `${fmt(lunarDayNum)}${lunarPhase} ខែ${monthObj.month}`;

  const effectiveSolarYear = (m < 4 || (m === 4 && d < 14)) ? y - 1 : y;
  const zodiac = getKhmerZodiac(effectiveSolarYear);
  const sak = getKhmerSak(effectiveSolarYear);
  const beNum = (m < 5 || (m === 5 && d < 2)) ? y + 543 : y + 544;
  const beYear = fmt(beNum);
  const lunarDateText = `${dayNameKhmer} ${lunarBody} ឆ្នាំ${zodiac} ${sak} ព.ស ${beYear}`;

  return {
    dayNameKhmer,
    lunarDayNum,
    lunarPhase,
    lunarMonthName: monthObj.month,
    lunarBody,
    zodiac,
    sak,
    beYear,
    lunarDateText
  };
}

/**
 * Calculate Buddhist Era (ព.ស.) from Gregorian Year
 * @param {number} year 
 * @returns {number}
 */
export function getBuddhistEra(year) {
  // Khmer Buddhist Era is Year + 544 (after Visak Bochea)
  return year + 544;
}

/**
 * Get Khmer Animal Year based on Gregorian year
 * @param {number} year 
 * @returns {string}
 */
export function getKhmerZodiac(year) {
  // 2026 is Year of the Horse (មមី)
  // 2020: ជូត (index 0), 2021: ឆ្លូវ (1), 2022: ខាល (2), 2023: ថោះ (3), 2024: រោង (4), 2025: ម្សាញ់ (5), 2026: មមី (6)
  const offset = (year - 2020) % 12;
  const index = offset >= 0 ? offset : offset + 12;
  return KHMER_ZODIAC_ANIMALS[index];
}

/**
 * Get Sak era (ស័ក) based on year
 * @param {number} year 
 * @returns {string}
 */
export function getKhmerSak(year) {
  // 2026 is អដ្ឋស័ក (8th year of the decade, last digit 6 -> 8)
  const lastDigit = year % 10;
  // mapping for 2026 -> 6 gives index 8 (អដ្ឋស័ក)
  const sakIndex = (lastDigit + 2) % 10;
  return KHMER_SAK[sakIndex];
}

/**
 * Generate formatted Khmer Official Date string
 * Example: "ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមីអដ្ឋស័ក ព.ស.២៥៧០ ត្រូវនឹងថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦"
 * @param {Date} date 
 * @param {string} customLunarPrefix 
 * @returns {string}
 */
export function getFormattedKhmerDate(date = new Date(), customLunarPrefix = '') {
  const dayNum = toKhmerDigits(date.getDate());
  const monthName = KHMER_SOLAR_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const yearKhmer = toKhmerDigits(year);
  const lunar = computeKhmerLunarDate(date, true);

  if (customLunarPrefix) {
    return `${customLunarPrefix} ឆ្នាំ${lunar.zodiac}${lunar.sak} ព.ស.${lunar.beYear} ត្រូវនឹងថ្ងៃទី${dayNum} ខែ${monthName} ឆ្នាំ${yearKhmer}`;
  }
  return `${lunar.dayNameKhmer} ${lunar.lunarBody} ឆ្នាំ${lunar.zodiac} ${lunar.sak} ព.ស.${lunar.beYear} ត្រូវនឹងថ្ងៃទី${dayNum} ខែ${monthName} ឆ្នាំ${yearKhmer}`;
}

/**
 * Get the last working day (business day: Monday-Friday) for a given year and month.
 * If the last day of month is Saturday (6), rolls back by 1 day to Friday (5).
 * If the last day of month is Sunday (0), rolls back by 2 days to Friday (5).
 *
 * @param {number|string} year - e.g. 2026
 * @param {number|string} month - 1-based month index (1 for Jan, 12 for Dec) or '07', '08'
 * @returns {Date}
 */
export function getLastWorkingDayOfMonth(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  // new Date(y, m, 0) gives the last day of month m (0-indexed month parameter)
  const lastDate = new Date(y, m, 0);
  const dayOfWeek = lastDate.getDay(); // 0 is Sunday, 6 is Saturday

  if (dayOfWeek === 6) {
    // Saturday -> roll back 1 day to Friday
    lastDate.setDate(lastDate.getDate() - 1);
  } else if (dayOfWeek === 0) {
    // Sunday -> roll back 2 days to Friday
    lastDate.setDate(lastDate.getDate() - 2);
  }

  return lastDate;
}

/**
 * Calculate both Solar and Lunar month-end dates automatically for official report footers.
 * Ensures the report is dated on the last working day of the month (excluding Saturday/Sunday).
 *
 * @param {string} monthKey - "YYYY-MM" (e.g. "2026-07", "2026-08", "2026-09", "2026-10", "2026-11")
 * @param {Object} options
 * @param {string} options.watName - Wat name (for PDF 1, e.g. "វត្តខេមវ័ន")
 * @param {string} options.customLunarTemplate - optional override only if explicitly different from default July template
 * @param {boolean} options.useKhmerNumerals - true
 * @returns {{
 *   lastWorkingDate: Date,
 *   solarDateTextLeave: string,    // "ត្រូវនឹងថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦"
 *   solarDateTextFinance: string,  // "វត្តខេមវ័ន ថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦"
 *   lunarDateText: string,         // "ថ្ងៃសុក្រ ២រោច ខែទុតិយាសាឍ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០"
 *   dayNumKhmer: string,
 *   monthName: string,
 *   yearKhmer: string,
 *   dayNameKhmer: string
 * }}
 */
export function getMonthEndReportDates(monthKey = '2026-07', options = {}) {
  const [yearStr, monthStr] = String(monthKey || '2026-07').split('-');
  const y = parseInt(yearStr, 10) || 2026;
  const m = parseInt(monthStr, 10) || 7;
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));

  const lastDate = getLastWorkingDayOfMonth(y, m);
  const dayNum = lastDate.getDate();
  const dayNumKhmer = fmt(dayNum);
  const monthIdx = lastDate.getMonth();
  const monthName = KHMER_SOLAR_MONTHS[monthIdx] || monthStr;
  const yearKhmer = fmt(lastDate.getFullYear());
  const dayNameKhmer = KHMER_DAYS[lastDate.getDay()]; // e.g. "ថ្ងៃសុក្រ", "ថ្ងៃចន្ទ", etc.

  // Solar date text for PDF 2 (Leave / ID Card Report)
  const solarDateTextLeave = `ត្រូវនឹងថ្ងៃទី${dayNumKhmer} ខែ${monthName} ឆ្នាំ${yearKhmer}`;

  // Solar date text for PDF 1 (Finance Report)
  const wat = options.watName || 'វត្តខេមវ័ន';
  const solarDateTextFinance = `${wat} ថ្ងៃទី${dayNumKhmer} ខែ${monthName} ឆ្នាំ${yearKhmer}`;

  // Calculate exact Khmer Chhankitek Lunar Date for lastDate
  const lunar = computeKhmerLunarDate(lastDate, useKhmer);
  const { lunarBody, zodiac, sak, beYear, lunarDateText } = lunar;

  const leftBlankLunar = `ថ្ងៃ..............ខែ...........ឆ្នាំ${zodiac}${sak} ព.ស ${beYear}`;
  const leftBlankSolar = `ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ${yearKhmer}`;

  return {
    lastWorkingDate: lastDate,
    solarDateTextLeave,
    solarDateTextFinance,
    lunarDateText,
    lunarHeader: lunarDateText,
    solarHeader: solarDateTextLeave,
    leftBlankLunar,
    leftBlankSolar,
    dayNumKhmer,
    monthName,
    yearKhmer,
    dayNameKhmer,
    lunarBody,
    zodiac,
    sak,
    beYear
  };
}
