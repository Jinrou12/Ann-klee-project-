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
export function getFormattedKhmerDate(date = new Date(), customLunarPrefix = 'ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ') {
  const dayName = KHMER_DAYS[date.getDay()];
  const dayNum = toKhmerDigits(date.getDate());
  const monthName = KHMER_SOLAR_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const yearKhmer = toKhmerDigits(year);
  const beYear = toKhmerDigits(getBuddhistEra(year));
  const zodiac = getKhmerZodiac(year);
  const sak = getKhmerSak(year);

  const lunarPart = customLunarPrefix || `${dayName}`;
  return `${lunarPart} ឆ្នាំ${zodiac}${sak} ព.ស.${beYear} ត្រូវនឹងថ្ងៃទី${dayNum} ខែ${monthName} ឆ្នាំ${yearKhmer}`;
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
 * @param {string} monthKey - "YYYY-MM" (e.g. "2026-07", "2026-08", "2026-10")
 * @param {Object} options
 * @param {string} options.watName - Wat name (for PDF 1, e.g. "វត្តខេមវ័ន")
 * @param {string} options.customLunarTemplate - e.g. "ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០"
 * @param {boolean} options.useKhmerNumerals - true
 * @returns {{
 *   lastWorkingDate: Date,
 *   solarDateTextLeave: string,    // "ត្រូវនឹងថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦"
 *   solarDateTextFinance: string,  // "វត្តខេមវ័ន ថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦"
 *   lunarDateText: string,         // "ថ្ងៃសុក្រ... ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០"
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

  const lastDate = getLastWorkingDayOfMonth(y, m);
  const dayNum = lastDate.getDate();
  const dayNumKhmer = toKhmerDigits(dayNum);
  const monthIdx = lastDate.getMonth();
  const monthName = KHMER_SOLAR_MONTHS[monthIdx] || monthStr;
  const yearKhmer = toKhmerDigits(lastDate.getFullYear());
  const dayNameKhmer = KHMER_DAYS[lastDate.getDay()]; // e.g. "ថ្ងៃសុក្រ", "ថ្ងៃចន្ទ", etc.

  // Solar date text for PDF 2 (Leave Report)
  const solarDateTextLeave = `ត្រូវនឹងថ្ងៃទី${dayNumKhmer} ខែ${monthName} ឆ្នាំ${yearKhmer}`;

  // Solar date text for PDF 1 (Finance Report)
  const wat = options.watName || 'វត្តខេមវ័ន';
  const solarDateTextFinance = `${wat} ថ្ងៃទី${dayNumKhmer} ខែ${monthName} ឆ្នាំ${yearKhmer}`;

  // Calculate or adapt lunar date header
  const beYear = toKhmerDigits(getBuddhistEra(lastDate.getFullYear()));
  const zodiac = getKhmerZodiac(lastDate.getFullYear());
  const sak = getKhmerSak(lastDate.getFullYear());

  let lunarBody = '២រោច ខែទុតិយាសាឍ';
  if (options.customLunarTemplate) {
    // Strip leading day name if template has one, to ensure day of week matches lastDate
    const stripped = options.customLunarTemplate
      .replace(/^ថ្ងៃ(អាទិត្យ|ចន្ទ|អង្គារ|ពុធ|ព្រហស្បតិ៍|សុក្រ|សៅរ៍)\s*/, '')
      .replace(/ឆ្នាំ.*$/, '')
      .trim();
    if (stripped) {
      lunarBody = stripped;
    }
  }

  const lunarDateText = `${dayNameKhmer}${lunarBody} ឆ្នាំ${zodiac} ${sak} ព.ស ${beYear}`;
  const leftBlankLunar = `ថ្ងៃ.......................ខែ..................ឆ្នាំ${zodiac}${sak} ព.ស ${beYear}`;
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
    zodiac,
    sak,
    beYear
  };
}
