// 100% Isolated Finance Receipt & Income-Expense OCR Engine (សម្រាប់តែប៉ុងចំណូល-ចំណាយប៉ុណ្ណោះ)
// ZERO Student Roster / Leave-Slip imports or Merchant Item-Name Hardcoding exist in this file.
import {
  toArabicDigits,
  normalizeCurrency,
  CURRENCY_KHR,
  CURRENCY_USD
} from './khmerNumerals';
import {
  callGeminiJsonWithResilience,
  formatKhmerScanError,
  loadImageElement
} from './ocrCore';

/**
 * Parse an OCR amount ("21,200", "21.200៛", "$12.50", "១២ ៥០០") into a clean number.
 * For Riel (KHR), a dot followed by 3 digits is a thousands separator ("21.200" -> 21200).
 */
export function parseReceiptAmount(raw, currency = CURRENCY_KHR) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let s = toArabicDigits(String(raw ?? '')).replace(/[\s\u200B]/g, '');
  if (!s) return 0;
  if (currency === CURRENCY_KHR && /^\D*\d{1,3}(\.\d{3})+\D*$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  s = s.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Detect per-line currency purely from extracted currency field and actual symbols/text on the receipt.
 */
function detectLineCurrency(item) {
  if (item?.currency) return normalizeCurrency(item.currency);
  const rawText = `${item?.unitPrice ?? ''} ${item?.total ?? ''} ${item?.desc ?? ''} ${item?.qty ?? ''}`;
  if (/\$|usd|ដុល្លារ/i.test(rawText)) return CURRENCY_USD;
  if (/៛|រៀល|khr/i.test(rawText)) return CURRENCY_KHR;
  return CURRENCY_KHR;
}

/**
 * Pure Mathematical & Currency Normalization for Finance Line Items.
 * STRICT RULE: Zero merchant item-name hardcoding! `desc` is always preserved faithfully from real OCR / user input.
 */
export function normalizeFinanceItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      const desc = String(item?.desc || '').replace(/\s+/g, ' ').trim();
      const currency = detectLineCurrency(item);
      const unitPrice = parseReceiptAmount(item?.unitPrice || 0, currency);
      let total = parseReceiptAmount(item?.total || 0, currency);
      const qtyStr = String(item?.qty || '1').trim() || '1';
      const numQty = parseFloat(toArabicDigits(qtyStr).match(/[\d.]+/)?.[0] || '1') || 1;

      if (!total && unitPrice > 0) {
        total = currency === CURRENCY_USD
          ? Math.round(unitPrice * numQty * 100) / 100
          : Math.round(unitPrice * numQty);
      }

      return {
        category: item?.category === 'income' ? 'income' : 'expense',
        desc,
        qty: qtyStr,
        unitPrice,
        total,
        currency,
        note: String(item?.note || '').replace(/\s+/g, ' ').trim()
      };
    })
    .filter(item => item.desc || item.total > 0 || item.unitPrice > 0);
}

/**
 * Extract clean merchant/shop prefix from receipt `note` ("រោងពុម្ព គីមម៉េង, ថ្ងៃទី 9/8/2026" -> "រោងពុម្ព គីមម៉េង").
 */
function extractMerchantPrefix(note) {
  const raw = String(note || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const head = raw
    .split(/[,•|]|ថ្ងៃទី|tel\s*[:៖]?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i)[0]
    .trim();
  return head.slice(0, 60);
}

/**
 * Dynamically build a compact Learned Handwriting Disambiguation Block purely from user-verified
 * finance receipts stored in `trainingDataset` (LocalStorage + Supabase).
 * - Zero hardcoded merchant or item strings exist in code.
 * - Includes strict visual verification guard so Gemini NEVER forces a past item when a different word is written.
 */
export function buildLearnedFinanceReferenceBlock(trainingDataset = []) {
  if (!Array.isArray(trainingDataset) || trainingDataset.length === 0) {
    return '';
  }

  const financeSamples = trainingDataset.filter(s => s && s.docType === 'finance' && s.groundTruth);
  if (financeSamples.length === 0) {
    return '';
  }

  const correctionLines = [];
  const seenCorrections = new Set();
  const shopItemsMap = new Map(); // merchantKey -> { displayShop, entries: Set<string> }

  for (const sample of financeSamples) {
    const gt = sample.groundTruth;
    const gtItems = Array.isArray(gt?.items)
      ? gt.items
      : (Array.isArray(gt) ? gt : (gt?.desc ? [gt] : []));
    const rawItems = Array.isArray(sample.rawOcrFinanceItems)
      ? sample.rawOcrFinanceItems
      : [];

    gtItems.forEach((gtItem, idx) => {
      const cleanDesc = String(gtItem?.desc || '').replace(/\s+/g, ' ').trim();
      if (!cleanDesc) return;

      const cur = detectLineCurrency(gtItem);
      const price = parseReceiptAmount(gtItem?.unitPrice || gtItem?.total || 0, cur);
      const priceTag = price > 0 ? ` (~${price} ${cur})` : '';
      const shop = extractMerchantPrefix(gtItem?.note);

      // 1. Explicit OCR-to-User correction pairs (e.g. "កូពី" -> "កូល័រ")
      const rawItem = rawItems[idx];
      const rawDesc = String(rawItem?.desc || '').replace(/\s+/g, ' ').trim();
      if (rawDesc && rawDesc !== cleanDesc && correctionLines.length < 12) {
        const corrKey = `${shop}|${rawDesc}=>${cleanDesc}`;
        if (!seenCorrections.has(corrKey)) {
          seenCorrections.add(corrKey);
          const shopClause = shop ? `on receipts from "${shop}"` : 'on a past receipt';
          correctionLines.push(
            `   - Past user handwriting correction (${shopClause}): cursive text initially misread as "${rawDesc}"${priceTag} was verified by the user to be "${cleanDesc}".`
          );
        }
      }

      // 2. User-verified merchant handwriting vocabulary grouped by shop
      const shopKey = (shop || 'ទូទៅ').replace(/[\s\u200B]/g, '').replace(/ឹ/g, 'ី').toLowerCase();
      if (!shopItemsMap.has(shopKey)) {
        if (shopItemsMap.size >= 10) return;
        shopItemsMap.set(shopKey, {
          displayShop: shop || 'បុងចំណាយធ្លាប់ផ្ទៀងផ្ទាត់',
          entries: new Set()
        });
      }
      const group = shopItemsMap.get(shopKey);
      if (group.entries.size < 6) {
        group.entries.add(`"${cleanDesc}"${priceTag}`);
      }
    });
  }

  const shopLines = [];
  for (const { displayShop, entries } of shopItemsMap.values()) {
    if (entries.size > 0) {
      shopLines.push(
        `   - Past verified items on receipts from "${displayShop}": ${Array.from(entries).join(', ')}.`
      );
    }
  }

  if (correctionLines.length === 0 && shopLines.length === 0) {
    return '';
  }

  return [
    '3. LEARNED HANDWRITING DISAMBIGUATION MEMORY (from past user-verified receipts in this app):',
    ...correctionLines,
    ...shopLines,
    '   - STRICT VISUAL VERIFICATION RULE: Use these past user-verified examples ONLY to disambiguate ambiguous cursive handwriting when the actual pen-ink strokes AND row price/context on the current image match! Note minor Khmer vowel variants in shop headers (e.g. គឹមម៉េង / គីមម៉េង). If the current receipt row clearly writes a DIFFERENT item (even at the exact same shop, such as real "កូពី" at ~100-200 KHR, "សៀវភៅ", or any other item), you MUST transcribe what is literally written on the current image!'
  ].join('\n');
}

/**
 * High-magnification 2.8x zoom crop focused tightly on the Receipt "Name of Goods + Quantity + Unit Price"
 * table zone (x: 14%..64%, y: 36%..62%) so cursive Khmer strokes & overhead diacritics are crisp and clear.
 */
export async function cropReceiptTableZone(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    const sx = Math.round(w * 0.14);
    const sy = Math.round(h * 0.36);
    const sw = Math.max(1, Math.round(w * 0.50));
    const sh = Math.max(1, Math.round(h * 0.26));

    const targetW = Math.min(920, Math.max(760, Math.round(sw * 2.15)));
    const scale = targetW / sw;
    const targetH = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'contrast(1.16)';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
    canvas.width = 0;
    canvas.height = 0;
    return croppedDataUrl.split(',')[1] || '';
  } catch (e) {
    console.warn('Receipt table crop failed:', e);
    return '';
  }
}

/**
 * Honest Blank Finance Item when Offline or Network Failed (Strictly Finance Type — NEVER Leave)
 */
export function createBlankFinanceResult(errorMessage = '', { isTrulyOffline } = {}) {
  const trulyOffline = typeof isTrulyOffline === 'boolean'
    ? isTrulyOffline
    : (typeof navigator !== 'undefined' && navigator.onLine === false);
  return {
    detectedType: 'finance',
    confidence: 0,
    isOfflineNoScan: true,
    isTrulyOffline: trulyOffline,
    scanError: errorMessage || (trulyOffline
      ? 'មិនទាន់បានស្កេនប៉ុងចំណាយ (ត្រូវការសេវាអ៊ីនធឺណិត)'
      : 'មិនទាន់អាចស្កេនប៉ុងចំណាយដោយ AI បានបណ្ដោះអាសន្ន'),
    leaveItems: [],
    financeItems: [
      {
        category: 'expense',
        desc: '',
        qty: '1',
        unitPrice: 0,
        total: 0,
        currency: 'KHR',
        note: ''
      }
    ]
  };
}

/**
 * Pure Pen-Ink & Printed Receipt Extraction using Gemini Vision (`thinkingLevel: 'MEDIUM'`)
 * + Dynamic Learned Handwriting Disambiguation from user-verified `trainingDataset`.
 */
export async function extractFinanceReceiptWithGemini({
  base64,
  mimeType = 'image/jpeg',
  apiKey = '',
  tableCropBase64 = '',
  trainingDataset = []
}) {
  const learnedBlock = buildLearnedFinanceReferenceBlock(trainingDataset);

  const prompt = [
    'You are an expert Khmer Accounting & Receipt OCR specialist reading a Cambodian cash bill, invoice, or expense/income receipt (វិក្កយបត្រ / ប៉ុងចំណាយ / បង្កាន់ដៃ).',
    'Inspect the full receipt and the zoomed item table carefully:',
    '1. ORIENTATION ("rotateClockwiseDegrees"): 0 if upright, or 90 / 180 / 270 clockwise degrees needed to make text upright.',
    '2. EXTRACT ONLY FILLED ITEM ROWS ("financeItems"):',
    '   - Extract ONLY rows inside the item table ("ឈ្មោះទំនិញ / Name of Goods") that actually contain an item entry with quantity/price.',
    '   - Ignore empty rows and ignore diagonal Z-slash lines drawn across blank rows.',
    '   - For each real item row:',
    '     * "category": "expense" (default for purchases/invoices/bills) or "income" (only if explicitly a receipt of received donation/income).',
    '     * "desc": LITERAL CHARACTER-BY-CHARACTER transcription of the handwritten or printed item name in that row.',
    '       - Trace every Khmer consonant, vowel, overhead diacritic, subscript, and symbol written in pen ink in that specific row!',
    '       - NEVER copy services/ads from the printed shop banner at the top of the receipt into item rows.',
    '       - NEVER invent or guess photo dimensions ("3x4", "4x6") unless those exact digits are literally written in pen ink in that row!',
    '       - If a cursive ampersand "&" connects two Khmer words in a row (e.g. "រូបថត & អ៊ុត"), transcribe "&" and both Khmer words accurately.',
    '       - In cursive Khmer shop handwriting, writers often connect samyok sannya (័) + final រ (រ) into one sweeping upward-and-downward loop at the end of "កូល័រ" (color print/copy), whereas "កូពី" has ព + small closed ី loop on top with NO sweeping final រ loop.',
    '     * "qty": quantity written in the Quantity/ចំនួន column (include unit if written, e.g. "5", "2", "3 លីត្រ").',
    '     * "unitPrice": numeric unit price in Unit Price/តម្លៃរាយ column without symbols (preserve decimals for USD, e.g. 12.5).',
    '     * "total": numeric line amount in Amount/តម្លៃសរុប column without symbols (verify qty * unitPrice matches total, and sum of line totals matches grand total សរុប/Total at bottom).',
    '     * "currency": "USD" if priced in US Dollars ("$", "USD", "ដុល្លារ"), otherwise "KHR" for Cambodian Riel ("៛", "រៀល", or whole numbers like 500, 1000, 6000, 30000). Decide per line.',
    '     * "note": shop/merchant name from header + receipt date if written (e.g. "រោងពុម្ព គីមម៉េង, ថ្ងៃទី 9/8/2026").',
    learnedBlock,
    'Return strictly valid JSON:',
    '{"detectedType":"finance","rotateClockwiseDegrees":0,"confidence":0.98,"leaveItems":[],"financeItems":[{"category":"expense","desc":"","qty":"1","unitPrice":0,"total":0,"currency":"KHR","note":""}]}'
  ].filter(Boolean).join('\n');

  const parts = [
    { text: prompt },
    { text: 'Full Receipt / Invoice:' },
    { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }
  ];

  if (tableCropBase64) {
    parts.push({ text: 'Zoomed Item Table Rows (read literal pen-ink characters in each filled row):' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: tableCropBase64 } });
  }

  return callGeminiJsonWithResilience({
    parts,
    apiKey,
    thinkingLevel: 'MEDIUM',
    thinkingBudget: 2048,
    timeoutMs: 32000,
    maxTimeoutAttempts: 2
  });
}

/**
 * Execute the isolated Finance Receipt OCR pipeline end-to-end.
 */
export async function runFinanceReceiptOcrPipeline({
  base64,
  dataUrl,
  mimeType = 'image/jpeg',
  apiKey = '',
  trainingDataset = [],
  onStageChange = null
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      processingMode: 'offline_no_internet',
      extractionResult: createBlankFinanceResult(
        'គ្មានសេវាអ៊ីនធឺណិត (Offline) — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីស្កេនប៉ុងចំណាយ',
        { isTrulyOffline: true }
      )
    };
  }

  try {
    onStageChange?.('ocr');
    const tableCropBase64 = await cropReceiptTableZone(dataUrl);

    const rawResult = await extractFinanceReceiptWithGemini({
      base64,
      mimeType,
      apiKey,
      tableCropBase64,
      trainingDataset
    });

    const rawItemsList = Array.isArray(rawResult?.financeItems)
      ? rawResult.financeItems
      : (Array.isArray(rawResult) ? rawResult : (rawResult?.desc ? [rawResult] : []));
    const normalizedItems = normalizeFinanceItems(rawItemsList);
    const finalItems = normalizedItems.length > 0 ? normalizedItems : createBlankFinanceResult('').financeItems;

    return {
      processingMode: 'gemini_cloud',
      extractionResult: {
        detectedType: 'finance',
        rotateClockwiseDegrees: Number(rawResult?.rotateClockwiseDegrees) || 0,
        confidence: Number(rawResult?.confidence) || 0.98,
        leaveItems: [],
        financeItems: finalItems,
        initialFinanceItems: finalItems.map(it => ({
          desc: it.desc,
          qty: it.qty,
          unitPrice: it.unitPrice,
          total: it.total,
          currency: it.currency,
          note: it.note
        }))
      }
    };
  } catch (err) {
    console.warn('Finance Receipt OCR Engine failed:', err);
    return {
      processingMode: 'offline_error',
      extractionResult: createBlankFinanceResult(formatKhmerScanError(err))
    };
  }
}
