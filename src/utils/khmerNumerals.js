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

export const STANDARD_DURATION_OPTIONS = [
  '១ថ្ងៃ',
  '១ថ្ងៃកន្លះ',
  '១ព្រឹក',
  '១ល្ងាច',
  '២ថ្ងៃ',
  '៥ថ្ងៃ'
];

/**
 * Smart Duration Shorthand Parser & Auto-Formatter
 * Understands both Khmer (០-៩) and Latin (0-9) digits, plus shorthand codes:
 *  - "1" or "១" -> "១ថ្ងៃ" (supports any integer N -> "Nថ្ងៃ")
 *  - "1.5" or "1,5" or "1 5" or "១.៥" or "១ ៥" -> "១ថ្ងៃកន្លះ" (supports N.5 / N 5 -> "Nថ្ងៃកន្លះ")
 *  - "1ព" or "1A" or "1a" or "១ព" or "១a" or "ព" or "a" -> "១ព្រឹក"
 *  - "1ល" or "1P" or "1p" or "១ល" or "១p" or "ល" or "p" -> "១ល្ងាច"
 *
 * @param {string} rawInput
 * @returns {string} Canonical Khmer duration string
 */
export function parseDurationShorthand(rawInput) {
  if (rawInput === null || rawInput === undefined) return '';
  const trimmed = String(rawInput).replace(/\u200B/g, '').trim();
  if (!trimmed) return '';

  // Strip optional leading hyphen if user typed "-1", "-1.5", "-1a", "-1p"
  const withoutLeadDash = trimmed.replace(/^[-–—]+\s*/, '').trim();
  if (!withoutLeadDash) return trimmed;

  // Convert Khmer digits to Arabic digits for uniform regex matching
  const norm = toArabicDigits(withoutLeadDash);

  // 1. Morning shorthand: "1ព", "1A", "1a", "1am", "ព", "a", "am" (and Nព្រឹក)
  const morningMatch = norm.match(/^(\d+)?\s*(?:ព|ព្រឹក|a|am)$/i);
  if (morningMatch) {
    const num = morningMatch[1] ? toKhmerDigits(morningMatch[1]) : '១';
    return `${num}ព្រឹក`;
  }

  // 2. Afternoon/Evening shorthand: "1ល", "1P", "1p", "1pm", "ល", "p", "pm" (and Nល្ងាច)
  const afternoonMatch = norm.match(/^(\d+)?\s*(?:ល|ល្ងាច|p|pm)$/i);
  if (afternoonMatch) {
    const num = afternoonMatch[1] ? toKhmerDigits(afternoonMatch[1]) : '១';
    return `${num}ល្ងាច`;
  }

  // 3. Half-day with integer prefix: "1.5", "1,5", "1 5", "១.៥", "១ ៥", "2.5", "2 5"
  const halfDayMatch = norm.match(/^(\d+)(?:\s*[.,។]\s*|\s+)5(?:\s*ថ្ងៃ)?$/);
  if (halfDayMatch) {
    const intPart = parseInt(halfDayMatch[1], 10);
    if (intPart === 0) return 'កន្លះថ្ងៃ';
    return `${toKhmerDigits(intPart)}ថ្ងៃកន្លះ`;
  }

  // 4. Pure ".5" or "0.5"
  if (/^(?:0?\s*[.,។]\s*5|កន្លះ|កន្លះថ្ងៃ)$/.test(norm)) {
    return 'កន្លះថ្ងៃ';
  }

  // 5. Pure integer number: "1", "2", "3", "5", "១", "២" -> "១ថ្ងៃ", "២ថ្ងៃ"
  const intMatch = norm.match(/^(\d+)$/);
  if (intMatch) {
    return `${toKhmerDigits(intMatch[1])}ថ្ងៃ`;
  }

  // 6. If already contains Khmer duration words (e.g. "1 ថ្ងៃ", "1ថ្ងៃកន្លះ"), normalize digits to Khmer
  if (/(ថ្ងៃ|ព្រឹក|ល្ងាច|កន្លះ)/.test(withoutLeadDash)) {
    return toKhmerDigits(withoutLeadDash.replace(/\s+/g, ''));
  }

  return trimmed;
}

/**
 * Get live duration conversion preview and contextual quick options while typing
 * @param {string} rawInput
 * @returns {{ resolved: string, isShorthand: boolean, options: Array<string> }}
 */
export function getDurationSuggestions(rawInput) {
  const trimmed = String(rawInput || '').replace(/\u200B/g, '').trim();
  if (!trimmed) {
    return {
      resolved: '',
      isShorthand: false,
      options: STANDARD_DURATION_OPTIONS
    };
  }

  const resolved = parseDurationShorthand(trimmed);
  const isShorthand = Boolean(resolved && resolved !== trimmed);

  // Build contextual options based on the number typed (e.g. if user types "2", offer ២ថ្ងៃ, ២ថ្ងៃកន្លះ, etc.)
  const norm = toArabicDigits(trimmed.replace(/^[-–—]+\s*/, ''));
  const leadingIntMatch = norm.match(/^(\d+)/);
  const dynamicOptions = [];

  if (leadingIntMatch) {
    const kNum = toKhmerDigits(leadingIntMatch[1]);
    if (parseInt(leadingIntMatch[1], 10) > 0) {
      dynamicOptions.push(
        `${kNum}ថ្ងៃ`,
        `${kNum}ថ្ងៃកន្លះ`,
        `${kNum}ព្រឹក`,
        `${kNum}ល្ងាច`
      );
    }
  }

  const merged = Array.from(new Set([
    ...(isShorthand ? [resolved] : []),
    ...dynamicOptions,
    ...STANDARD_DURATION_OPTIONS
  ]));

  return {
    resolved,
    isShorthand,
    options: merged.slice(0, 6)
  };
}
