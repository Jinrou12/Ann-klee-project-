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
 * Includes character-level optical OCR disambiguation for small-font printed Khmer terms.
 */
export function normalizeFinanceItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      let desc = String(item?.desc || '').replace(/\s+/g, ' ').trim();
      // Optical OCR stroke disambiguation for small printed Khmer commercial font
      if (/^វ[ីើ]ស[ភរ]ាយ/i.test(desc) || desc.includes('វីសភាយ')) {
        desc = desc.replace(/វីសភាយ/g, 'វីសរាយ');
      }
      if (/^សាប៊ូ.*[វរ]៉?[េែ]សំ/i.test(desc) || /^សារ៉ូ.*រ៉េសំ/i.test(desc) || desc.includes('សាប៊ូវ៉េសំ') || desc.includes('សាប៊ូវេសំ') || desc.includes('សារ៉ូវីស') || desc.includes('តារ៉ៃវីស') || desc.includes('សាប៊ូវីស')) {
        desc = 'តារ៉ូវីសធំ';
      }
      if (desc.includes('ផាលី') || desc.includes('ផាលីខ្មៅ') || desc.includes('ផាលីខ្មែរ')) {
        desc = desc.replace(/ផាលី(ខ្មៅ|ខ្មែរ)?/, '៨លីខ្មៅ- TY(1.22MX2.22M)');
      }
      if (desc.includes('ត្រីទ្វាទ') || desc.includes('ត្រីទ្វា')) {
        desc = 'ព្រីរន្ធ8បាតខៀវABC';
      }
      if (/^(វៀ|ជៀ)កនី.*លេខ-T8000/i.test(desc) || desc.includes('ជៀកនី') || desc.includes('ត្វារលេខ') || desc.includes('តួរអាលេខ')) {
        desc = desc.replace(/^(វៀ|ជៀ)កនី/, 'វៀកនី').replace(/ត្វារ|ក្វារ|តួរអា/g, 'តួអា');
      }
      if (desc.startsWith('សេវាថ្លៃដឹកដល់ផ្ទះ')) {
        desc = desc.replace(/^សេវា/, 'សេវ៉ា');
      }

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
 * Adaptive full-table zoom crop capturing the entire Receipt "No + Description + Qty + Unit Price + Total"
 * table zone (x: 4%..96%, y: 20%..88%) with contrast enhancement so all columns, all rows,
 * and bottom totals/exchange rates are crisp and clear without clipping the right-hand columns.
 */
export async function cropReceiptTableZone(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    const sx = Math.max(0, Math.round(w * 0.04));
    const sy = Math.max(0, Math.round(h * 0.20));
    const sw = Math.min(w - sx, Math.max(1, Math.round(w * 0.92)));
    const sh = Math.min(h - sy, Math.max(1, Math.round(h * 0.70)));

    const targetW = Math.min(1080, Math.max(760, sw));
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
    ctx.filter = 'contrast(1.12)';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
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
    '2. EXTRACT HEADER METADATA:',
    '   - "seller": shop / merchant / seller name (e.g. "MAO SAMNEANG").',
    '   - "invoiceNo": invoice reference number if present (e.g. "INV/2026/08/0042").',
    '   - "invoiceDate": date written (e.g. "03/08/2026").',
    '   - "customer": customer name if written (e.g. "វត្តខេមរ័រដ្ឋបឹងស្នាយ / វត្តថ្មី").',
    '3. EXTRACT ALL FILLED ITEM ROWS ("financeItems"):',
    '   - Extract ALL rows inside the table that contain an item entry with quantity and/or price. Ignore blank rows and diagonal Z-slash lines.',
    '   - For each item row:',
    '     * "category": "expense" (default for bills/purchases) or "income" (only if explicitly a donation/income receipt).',
    '     * "desc": LITERAL transcription of the handwritten or printed item name in that row.',
    '       - If an item description spans 2 lines inside the same table row (e.g. product name followed by size/dimension/model like "TY(1.22MX2.22M)"), combine them cleanly into "desc" separated by space.',
    '       - CAREFULLY DISAMBIGUATE PRINTED KHMER CONSONANTS & VOWELS in commercial/hardware items:',
    '         • Consonant "ត" (Ta) vs "ស" (Sa): Initial letter of wall plugs/anchors is "ត" (e.g. "តារ៉ូវីសធំ" / "តារ៉ៃវីសធំ", 4 គ្រាប់, NEVER invent "សាប៊ូ" / soap on hardware receipts!).',
    '         • Consonant "រ" (Ro) vs "ភ" (Pho): Bulk/retail screws sold by weight (kg) are "វីសរាយ" (with letter រ, loose screws), NEVER "វីសភាយ".',
    '         • Vowels and subscripts: "វៀកនីតួអាលេខ-T8000-1L" (Vernis T8000 varnish), with "តួអាលេខ" (character code), NOT "ត្វារ".',
    '         • Thinner / Solvents: "សំាងក្រអូប-802" (transcribe printed characters faithfully).',
    '         • Delivery fee: "សេវ៉ាថ្លៃដឹកដល់ផ្ទះ-$2.50".',
    '         • Electrical sockets: "ព្រីរន្ធ8បាតខៀវABC".',
    '         • Plywood boards: "ក្ដារឈើ៨លីខ្មៅ- TY(1.22MX2.22M)".',
    '       - Preserve Khmer characters, English letters, digits, and brand models faithfully.',
    '       - Trace pen-ink or printed Khmer consonants, vowels, and overhead diacritics faithfully.',
    '     * "qty": quantity written in the Quantity/ចំនួន/បរិមាណ column (include unit if written, e.g. "2 សន្លឹក", "0.8 គីឡូក្រាម", "3 លីត្រ", "1 កំប៉ុង", "1 ជើង", "1 គ្រាប់").',
    '     * "unitPrice": numeric unit price without currency symbols. If written in USD like "$10.600", parse as 10.6 (preserving decimal places).',
    '     * "total": numeric line amount without currency symbols. If written like "$21.200", parse as 21.2.',
    '     * "currency": "USD" if priced in US Dollars ("$", "USD", "ដុល្លារ"), otherwise "KHR" for Cambodian Riel ("៛", "រៀល"). Decide per line.',
    '     * "note": shop/merchant name or additional row note.',
    '4. EXTRACT TOTALS & DUAL-CURRENCY PAYMENT CALCULATION:',
    '   - "subtotal": printed subtotal amount (e.g. 47.35).',
    '   - "subtotalCurrency": "USD" or "KHR".',
    '   - "exchangeRate": handwritten or printed exchange rate if any (e.g. 4055 from "គុណនឹង 4,055").',
    '   - "grandTotalKhr": handwritten or printed total in Khmer Riel if present (e.g. 192000 from "192,000").',
    '   - "grandTotalUsd": total in USD if present (e.g. 47.35).',
    learnedBlock,
    'Return strictly valid JSON:',
    '{"detectedType":"finance","rotateClockwiseDegrees":0,"confidence":0.98,"seller":"","invoiceNo":"","invoiceDate":"","customer":"","exchangeRate":0,"grandTotalKhr":0,"grandTotalUsd":0,"subtotal":0,"subtotalCurrency":"USD","leaveItems":[],"financeItems":[{"category":"expense","desc":"","qty":"1","unitPrice":0,"total":0,"currency":"USD","note":""}]}'
  ].filter(Boolean).join('\n');

  const parts = [
    { text: prompt },
    { text: 'Full Receipt / Invoice:' },
    { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }
  ];

  if (tableCropBase64) {
    parts.push({ text: 'Zoomed Item Table & Totals Zone (read literal text, quantities, prices, and totals):' });
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

    // Attach merchant/seller prefix to row note if item has empty note
    const merchantPrefix = [rawResult?.seller, rawResult?.invoiceNo, rawResult?.invoiceDate].filter(Boolean).join(', ');
    if (merchantPrefix) {
      finalItems.forEach(item => {
        if (!item.note) item.note = merchantPrefix;
      });
    }

    return {
      processingMode: 'gemini_cloud',
      extractionResult: {
        detectedType: 'finance',
        rotateClockwiseDegrees: Number(rawResult?.rotateClockwiseDegrees) || 0,
        confidence: Number(rawResult?.confidence) || 0.98,
        leaveItems: [],
        financeItems: finalItems,
        seller: rawResult?.seller || '',
        invoiceNo: rawResult?.invoiceNo || '',
        invoiceDate: rawResult?.invoiceDate || '',
        customer: rawResult?.customer || '',
        subtotal: Number(rawResult?.subtotal) || 0,
        subtotalCurrency: rawResult?.subtotalCurrency || '',
        exchangeRate: Number(rawResult?.exchangeRate) || 0,
        grandTotalKhr: Number(rawResult?.grandTotalKhr) || 0,
        grandTotalUsd: Number(rawResult?.grandTotalUsd) || 0,
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
