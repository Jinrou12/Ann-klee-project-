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

export const toEnglishDigits = toArabicDigits;

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

  // Format with thousand separators (safe for negative amounts)
  const isNegative = cleanNumber < 0;
  const absVal = Math.abs(Math.round(cleanNumber));
  const parts = absVal.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = (isNegative ? '-' : '') + parts.join('.') + '៛';

  return useKhmerNumerals ? toKhmerDigits(formatted) : formatted;
}

/**
 * Multi-Currency Support (Riel ៛ / US Dollar $)
 * Every finance record may carry `currency: 'KHR' | 'USD'`. Records without the field are legacy Riel (KHR).
 */
export const CURRENCY_KHR = 'KHR';
export const CURRENCY_USD = 'USD';

/** Normalize any AI / user currency hint ("$", "usd", "ដុល្លារ", "៛", "រៀល", "KHR") to 'KHR' | 'USD' */
export function normalizeCurrency(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return CURRENCY_KHR;
  if (s.includes('$') || s.includes('usd') || s.includes('dollar') || s.includes('ដុល្លារ')) return CURRENCY_USD;
  return CURRENCY_KHR;
}

/** Currency symbol for a record / currency code */
export function getCurrencySymbol(currency) {
  return normalizeCurrency(currency) === CURRENCY_USD ? '$' : '៛';
}

/**
 * Format an amount in its own currency.
 *  - KHR -> "៤៧ ៣៥០៛" (same as formatKhmerCurrency)
 *  - USD -> "$១២.៥០" / "$12.50" (2 decimals only when there are cents)
 */
export function formatMoney(amount, currency = CURRENCY_KHR, useKhmerNumerals = true) {
  if (normalizeCurrency(currency) !== CURRENCY_USD) {
    return formatKhmerCurrency(amount, useKhmerNumerals);
  }
  const num = typeof amount === 'number'
    ? amount
    : parseFloat(toArabicDigits(String(amount ?? '')).replace(/[^0-9.-]/g, '')) || 0;
  const rounded = Math.round((Number(num) || 0) * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.000001;
  const fixed = Math.abs(rounded).toFixed(hasCents ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${rounded < 0 ? '-' : ''}$${grouped}${decPart ? '.' + decPart : ''}`;
  return useKhmerNumerals ? toKhmerDigits(formatted) : formatted;
}

/** Sum a list of finance records per currency -> { KHR: number, USD: number } */
export function sumByCurrency(list) {
  const totals = { KHR: 0, USD: 0 };
  (Array.isArray(list) ? list : []).forEach(item => {
    const cur = normalizeCurrency(item?.currency);
    const val = typeof item?.total === 'number' ? item.total : parseKhmerNumber(item?.total);
    totals[cur] += Number(val) || 0;
  });
  totals.USD = Math.round(totals.USD * 100) / 100;
  return totals;
}

/** Add / subtract two per-currency totals objects */
export function combineCurrencyTotals(a = {}, b = {}, sign = 1) {
  return {
    KHR: (Number(a.KHR) || 0) + sign * (Number(b.KHR) || 0),
    USD: Math.round(((Number(a.USD) || 0) + sign * (Number(b.USD) || 0)) * 100) / 100
  };
}

/**
 * Display per-currency totals:
 *  - only Riel   -> "៤៧ ៣៥០៛"
 *  - only Dollar -> "$១២.៥០"
 *  - both        -> "៤៧ ៣៥០៛ + $១២.៥០"
 *  - none        -> "០៛"
 */
export function formatCurrencyTotals(totals = {}, useKhmerNumerals = true, separator = ' + ') {
  const khr = Number(totals.KHR) || 0;
  const usd = Number(totals.USD) || 0;
  const parts = [];
  if (khr !== 0) parts.push(formatMoney(khr, CURRENCY_KHR, useKhmerNumerals));
  if (usd !== 0) parts.push(formatMoney(usd, CURRENCY_USD, useKhmerNumerals));
  if (parts.length === 0) return formatKhmerCurrency(0, useKhmerNumerals);
  return parts.join(separator);
}

/**
 * Checks whether balance totals or net balance indicates a deficit (ចាយលើសចំណូល).
 * @param {object} balanceTotals - { KHR: number, USD: number }
 * @param {number|null} netBalance - Numeric balance
 * @returns {boolean}
 */
export function isFinanceDeficit(balanceTotals = {}, netBalance = null) {
  const khr = Number(balanceTotals?.KHR) || 0;
  const usd = Number(balanceTotals?.USD) || 0;
  if (khr < 0 || usd < 0) return true;
  if (typeof netBalance === 'number' && netBalance < 0) return true;
  return false;
}

/**
 * Format expense totals:
 * When isDeficit is true (expense > income), prefix with '-' (e.g. -១ ២០០៛, -$៥០).
 * When isDeficit is false, retain positive representation (១ ២០០៛).
 * @param {object} totals - { KHR: number, USD: number }
 * @param {boolean} isDeficit - Whether expenses exceed income
 * @param {boolean} useKhmerNumerals - Display in Khmer numerals
 * @param {string} separator - Separator for multi-currency
 * @returns {string}
 */
export function formatExpenseTotals(totals = {}, isDeficit = false, useKhmerNumerals = true, separator = ' + ') {
  if (!isDeficit) {
    return formatCurrencyTotals(totals, useKhmerNumerals, separator);
  }
  const negated = {
    KHR: (Number(totals?.KHR) || 0) > 0 ? -(Number(totals.KHR)) : (Number(totals?.KHR) || 0),
    USD: (Number(totals?.USD) || 0) > 0 ? -(Number(totals.USD)) : (Number(totals?.USD) || 0)
  };
  return formatCurrencyTotals(negated, useKhmerNumerals, separator);
}

/**
 * Dynamically scale font size for currency / money strings so long numbers never truncate with '...'
 * and always display 100% of their digits on a single line.
 * @param {string} text
 * @param {number} basePt
 * @param {number} minPt
 * @returns {string} CSS font-size in pt (e.g. "11pt", "10pt", "9.2pt", "8.5pt", "8pt")
 */
export function getAdaptiveMoneyFontSize(text = '', basePt = 11, minPt = 8) {
  const len = String(text || '').trim().length;
  if (len <= 11) return `${basePt}pt`;
  if (len <= 13) return `${Math.max(minPt, Number((basePt - 1).toFixed(1)))}pt`;
  if (len <= 16) return `${Math.max(minPt, Number((basePt - 1.8).toFixed(1)))}pt`;
  if (len <= 20) return `${Math.max(minPt, Number((basePt - 2.5).toFixed(1)))}pt`;
  return `${minPt}pt`;
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

  // Convert Khmer digits to Arabic digits for uniform regex matching (plus common Khmer word typos)
  const norm = toArabicDigits(
    withoutLeadDash
      .replace(/លា្ងច/g, 'ល្ងាច')
      .replace(/ព្រក/g, 'ព្រឹក')
      .replace(/^មួយ\s*/, '1')
  );

  // 1. Morning shorthand: "1ព", "1A", "1a", "1am", "ព", "a", "am" (and Nព្រឹក)
  const morningMatch = norm.match(/^(\d+)?\s*(?:ព|ព្រឹក|a|am)$/i);
  if (morningMatch) {
    const num = morningMatch[1] ? toKhmerDigits(morningMatch[1]) : '១';
    return `${num}ព្រឹក`;
  }

  // 2. Afternoon/Evening shorthand: "1ល", "1P", "1p", "1pm", "ល", "p", "pm" (and Nល្ងាច / Nរសៀល)
  const afternoonMatch = norm.match(/^(\d+)?\s*(?:ល|ល្ងាច|p|pm)$/i);
  if (afternoonMatch) {
    const num = afternoonMatch[1] ? toKhmerDigits(afternoonMatch[1]) : '១';
    return `${num}ល្ងាច`;
  }
  const afternoonResielMatch = norm.match(/^(\d+)?\s*រសៀល$/);
  if (afternoonResielMatch) {
    const num = afternoonResielMatch[1] ? toKhmerDigits(afternoonResielMatch[1]) : '១';
    return `${num}រសៀល`;
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

  // 6. If already contains Khmer duration words (e.g. "1 ថ្ងៃ", "1ថ្ងៃកន្លះ", "1រសៀល"), normalize digits to Khmer
  if (/(ថ្ងៃ|ព្រឹក|ល្ងាច|រសៀល|កន្លះ)/.test(withoutLeadDash)) {
    return toKhmerDigits(
      withoutLeadDash
        .replace(/លា្ងច/g, 'ល្ងាច')
        .replace(/ព្រក/g, 'ព្រឹក')
        .replace(/^មួយ\s*/, '១')
        .replace(/\s+/g, '')
    );
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

/**
 * Parse a record date string (e.g. "03/11/2026", "៤/១១/២០២៦", "2026-11-03")
 * into a numeric YYYYMMDD sort key so earlier dates always sort to the top (ល.រ ១, ២, ៣...).
 * Returns null if the string is not a calendar date (e.g. "៣ លើក" or "—").
 * @param {string} rawDate
 * @returns {number|null}
 */
export function parseRecordDateSortKey(rawDate) {
  if (!rawDate) return null;
  let str = toArabicDigits(String(rawDate).replace(/\u200B/g, '').trim());
  if (!str) return null;
  str = str.replace(/2024/g, '2026');

  if (str.includes('ដល់') || /to/i.test(str)) {
    const parts = str.split(/ដល់|to/i);
    if (parts[0] && parts[0].trim().length >= 5) {
      str = parts[0].trim();
    }
  }

  // Match DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return year * 10000 + month * 100 + day;
    }
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return year * 10000 + month * 100 + day;
    }
  }

  return null;
}

/**
 * Normalize a calendar date string into clean DD/MM/YYYY format (with 2-digit day & month)
 * while leaving non-date summary strings (e.g. "៣ លើក", "—") untouched.
 * @param {string} rawDate
 * @returns {string}
 */
export function normalizeRecordDateStr(rawDate) {
  if (rawDate === null || rawDate === undefined) return '';
  let cleanDate = String(rawDate).replace(/\u200B/g, '').trim();
  if (!cleanDate) return '';
  cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');

  if (cleanDate.includes('ដល់') || (cleanDate.includes('-') && cleanDate.includes('/')) || /to/i.test(cleanDate)) {
    const parts = cleanDate.split(/ដល់|-|\/to\//i);
    if (parts[0] && parts[0].trim().length >= 5) {
      cleanDate = parts[0].trim();
    }
  }

  const arabic = toArabicDigits(cleanDate);
  const dmy = arabic.match(/^(\d{1,2})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{2,4})$/);
  if (dmy) {
    const dd = String(parseInt(dmy[1], 10)).padStart(2, '0');
    const mm = String(parseInt(dmy[2], 10)).padStart(2, '0');
    let yyyy = parseInt(dmy[3], 10);
    if (yyyy < 100) yyyy += 2000;
    return `${dd}/${mm}/${yyyy}`;
  }

  const ymd = arabic.match(/^(\d{4})\s*[\/.-]\s*(\d{1,2})\s*[\/.-]\s*(\d{1,2})$/);
  if (ymd) {
    const yyyy = ymd[1];
    const mm = String(parseInt(ymd[2], 10)).padStart(2, '0');
    const dd = String(parseInt(ymd[3], 10)).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  return cleanDate;
}

/**
 * Sort records chronologically by `date` ascending (priority 1: earliest date at top ល.រ ១, ២, ៣...),
 * preserving original relative order for records with the same date or non-date summary strings.
 * @param {Array} records
 * @returns {Array}
 */
export function sortRecordsByDateAsc(records = []) {
  if (!Array.isArray(records) || records.length <= 1) return Array.isArray(records) ? [...records] : [];
  return records
    .map((item, idx) => ({
      item,
      idx,
      sortKey: parseRecordDateSortKey(item?.date)
    }))
    .sort((a, b) => {
      if (a.sortKey !== null && b.sortKey !== null) {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        return a.idx - b.idx;
      }
      if (a.sortKey !== null && b.sortKey === null) return -1;
      if (a.sortKey === null && b.sortKey !== null) return 1;
      return a.idx - b.idx;
    })
    .map(entry => entry.item);
}

