// Khmer Digits and Number Formatting Utilities

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const ARABIC_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Convert any number or string with digits to Khmer digits
 * @param {number|string} input 
 * @returns {string}
 */
export function toKhmerDigits(input) {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  return str.replace(/\d/g, (d) => KHMER_DIGITS[parseInt(d, 10)] || d);
}

/**
 * Convert Khmer digits to Arabic digits
 * @param {string} input 
 * @returns {string}
 */
export function toArabicDigits(input) {
  if (!input) return '';
  let res = input.toString();
  KHMER_DIGITS.forEach((kd, idx) => {
    res = res.replaceAll(kd, idx.toString());
  });
  return res;
}

/**
 * Format currency in Khmer Riel (៛) with space separators
 * Example: 3443031 -> "៣ ៤៤៣ ០៣១៛"
 * @param {number|string} amount 
 * @param {boolean} useKhmerNumerals 
 * @returns {string}
 */
export function formatKhmerCurrency(amount, useKhmerNumerals = true) {
  if (amount === null || amount === undefined || amount === '') return '០៛';
  const cleanNumber = typeof amount === 'number' ? amount : parseFloat(toArabicDigits(amount.toString()).replace(/[^0-9.-]/g, '')) || 0;
  
  // Format with thousand separators
  const parts = Math.round(cleanNumber).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = parts.join('.') + '៛';

  return useKhmerNumerals ? toKhmerDigits(formatted) : formatted;
}

/**
 * Parse a raw string to a pure float number
 * Handles both Khmer and Arabic digits
 * @param {string|number} input 
 * @returns {number}
 */
export function parseKhmerNumber(input) {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const arabicStr = toArabicDigits(input.toString());
  const cleaned = arabicStr.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
