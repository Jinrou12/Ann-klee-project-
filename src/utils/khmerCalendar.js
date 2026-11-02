// Khmer Buddhist Era and Lunar Date Utilities
import { toKhmerDigits } from './khmerNumerals';

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
