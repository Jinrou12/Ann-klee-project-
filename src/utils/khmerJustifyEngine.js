// True Word-Level Khmer Justification Engine (Microsoft Word-style for HTML Preview & html2canvas PDF)
// - Uses Intl.Segmenter('km', { granularity: 'word' }) so Khmer consonant+subscript clusters (ជើងអក្សរ)
//   are NEVER broken apart on screen OR during html2canvas PDF export.
// - Glues punctuation, brackets, quotes, abbreviations (ព.ប.ហ.ណ, ២០១២-២០១៣, ២៦៨/១២) cleanly to neighbors.
// - Measures exact glyph widths with the loaded Khmer @font-face via offscreen Canvas 2D context.

export const KHMER_SIEMREAP_FONT = "'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif";
export const KHMER_MOUL_FONT = "'Khmer OS Muol Light', 'Khmer OS Moul Light', 'Khmer OS Muol', 'Moul', serif";
export const KHMER_BATTAMBANG_FONT =
  "'Khmer OS Battambang', 'Kh Battambang', 'Battambang', 'Khmer OS Siemreap', sans-serif";
export const KHMER_UI_FONT = "'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function normalizeKhmerSpaces(str = '') {
  return String(str || '')
    .replace(/\u200B/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Split a narrative paragraph into styled runs (Muol Light monastic titles + bold phrases + normal text).
 * Monastic titles (`ព្រះធម្មសាលវង្ស`, `ព្រះអនុគណ`) are marked `noBreak: true` so they never split mid-title.
 */
export function buildMuolHighlightRuns(text = '', boldPhrases = []) {
  const cleanText = normalizeKhmerSpaces(text);
  if (!cleanText) return [];

  const tokens = [
    'ព្រះធម្មសាលវង្ស',
    'ព្រះអនុគណ',
    ...(boldPhrases || []).map(b => normalizeKhmerSpaces(b)).filter(Boolean)
  ];

  let parts = [{ text: cleanText, type: 'normal', noBreak: false }];
  tokens.forEach(token => {
    const isMuol = token === 'ព្រះអនុគណ' || token === 'ព្រះធម្មសាលវង្ស';
    const nextParts = [];
    parts.forEach(part => {
      if (part.type !== 'normal' || !part.text.includes(token)) {
        nextParts.push(part);
        return;
      }
      const splitArr = part.text.split(token);
      splitArr.forEach((seg, idx) => {
        if (seg) nextParts.push({ text: seg, type: 'normal', noBreak: false });
        if (idx < splitArr.length - 1) {
          nextParts.push({
            text: token,
            type: isMuol ? 'moul' : 'bold',
            noBreak: isMuol
          });
        }
      });
    });
    parts = nextParts;
  });

  return parts;
}

// Singleton Intl.Segmenter for Khmer word boundaries
let cachedSegmenter = undefined;
function getKhmerWordSegmenter() {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      cachedSegmenter = new Intl.Segmenter('km', { granularity: 'word' });
      return cachedSegmenter;
    }
  } catch {
    // Fallback below
  }
  cachedSegmenter = null;
  return null;
}

const COMPACT_NUMBER_UNITS = new Set([
  'អង្គ',
  'នាក់',
  'ឆ្នាំ',
  'ខែ',
  'ថ្ងៃ',
  'ម៉ោង',
  'ថ្នាក់',
  'រៀល',
  'ដុល្លារ',
  'គ្រឿង',
  'វត្ត',
  'ច្បាប់',
  'លើក',
  'ក្រុម',
  'បន្ទប់',
  'រូប',
  'ក្បាល'
]);

const OPENING_PUNCT_RE = /^[([{«“‘]+$/;
const CLOSING_PUNCT_RE = /^[)\]}»”’។៕៖ៗ៘៛,;:!?%]+$/;
const CONNECTOR_PUNCT_RE = /^[.\-/–—]+$/;
const LEADING_KHMER_MARK_RE = /^[\u17B6-\u17D3\u17DD]/;
const KHMER_OR_ASCII_DIGIT_RE = /^[\u17E0-\u17E90-9]+$/;

// Common Khmer compound words that ICU Intl.Segmenter occasionally splits in half
const KHMER_COMPOUND_PAIRS = new Set([
  'ព្រះមេ|គណ',
  'មុ|ន្នី',
  'សុ|ភ័ក្ត្រ',
  'ម៉េ|ង',
  'កិ|ច្ច',
  'ភារ|កិច្ច',
  'សីល|វ័ន្ត',
  'បច្ចេក|ទេស',
  'បណ្ណា|រក្ស',
  'ធម្ម|ការ',
  'កិត្តិ|យស',
  'កម្ម|វត្ថុ',
  'ព្រះ|ករុណា',
  'បឋម|សិក្សា',
  'សូម|អនុញ្ញាត',
  'គណៈ|គ្រប់គ្រង',
  'របាយ|ការណ៍',
  'សមណ|សិស្ស',
  'ឯក|ឧត្តម',
  'លោក|ជំទាវ',
  'ទី|តាំង',
  'លទ្ធ|ផល',
  'រៀន|សូត្រ',
  'ថ្នាក់|រៀន',
  'ពុទ្ធ|ចក្រ',
  'ព្រះ|សង្ឃ'
]);

// Multi-word Khmer phrases that ICU glues into oversized 70–110px chunks;
// splitting them on authentic Khmer word boundaries allows tighter packing and eliminates wide gaps
const KHMER_LONG_CHUNK_SPLITS = {
  ប្រចាំឆមាស: ['ប្រចាំ', 'ឆមាស'],
  បំពេញការងារ: ['បំពេញ', 'ការងារ'],
  គោលនយោបាយ: ['គោល', 'នយោបាយ'],
  រាជរដ្ឋាភិបាល: ['រាជ', 'រដ្ឋាភិបាល'],
  ប្រធានមន្ទីរ: ['ប្រធាន', 'មន្ទីរ'],
  ព្រះគ្រូចៅអធិការ: ['ព្រះគ្រូ', 'ចៅអធិការ'],
  ក្នុងអំឡុងឆ្នាំ: ['ក្នុង', 'អំឡុង', 'ឆ្នាំ'],
  និងសាសនា: ['និង', 'សាសនា'],
  បណ្ដាលមកពី: ['បណ្ដាល', 'មកពី'],
  នាមឈ្មោះ: ['នាម', 'ឈ្មោះ'],
  មួយចំនួន: ['មួយ', 'ចំនួន'],
  ទាំងពីរ: ['ទាំង', 'ពីរ'],
  ក្រោយមក: ['ក្រោយ', 'មក'],
  ម្ដងទៀត: ['ម្ដង', 'ទៀត'],
  មានការ: ['មាន', 'ការ'],
  ឃើញថា: ['ឃើញ', 'ថា'],
  កន្លងទៅ: ['កន្លង', 'ទៅ'],
  ទៅទៀត: ['ទៅ', 'ទៀត']
};

/**
 * Segment a single string into clean Khmer word chunks, repairing common ICU dictionary quirks
 * (e.g. `របស់ក្រ|សួង` -> `របស់|ក្រសួង`, `ទី១កន្លងទៅ` -> `ទី១|កន្លងទៅ`, `សិក្សា២០១២` -> `សិក្សា|២០១២`).
 */
function segmentRawKhmerText(str) {
  if (!str) return [];
  const segmenter = getKhmerWordSegmenter();
  let raw;
  if (segmenter) {
    raw = Array.from(segmenter.segment(str)).map(s => s.segment);
  } else {
    // Graceful fallback: split around whitespace & punctuation while preserving Khmer clusters
    raw = str.split(/(\s+|[([{«“‘)\]}»”’។៕៖ៗ,;:!?%/\-–—]+)/).filter(Boolean);
  }

  // Pass 1: Refine mixed letter+digit chunks (e.g. `សិក្សា២០១២`, `ទី១កន្លងទៅ`)
  const refined = [];
  for (let i = 0; i < raw.length; i++) {
    const seg = raw[i];
    if (!seg) continue;

    // Repair 3-part ICU glitch `ភារ` + `កិ` + `ច្ច` -> `ភារកិច្ច`
    if (seg === 'ភារ' && raw[i + 1] === 'កិ' && raw[i + 2] === 'ច្ច') {
      refined.push('ភារកិច្ច');
      i += 2;
      continue;
    }

    // Repair ICU mis-split `ជានា` + `យក` -> `ជា` + `នាយក`, and `ជារ` + `ដូវ` -> `ជា` + `រដូវ`
    if (seg === 'ជានា' && raw[i + 1] === 'យក') {
      refined.push('ជា');
      refined.push('នាយក');
      i += 1;
      continue;
    }
    if (seg === 'ជារ' && raw[i + 1] === 'ដូវ') {
      refined.push('ជា');
      refined.push('រដូវ');
      i += 1;
      continue;
    }

    // Repair ICU glitch `របស់ក្រ` + `សួង` -> `របស់` + `ក្រសួង`, and `ពុទ្ធិកបឋម` + `សិក្សា` -> `ពុទ្ធិក` + `បឋមសិក្សា`
    if (seg.endsWith('ក្រ') && seg.length > 3 && raw[i + 1] === 'សួង') {
      refined.push(seg.slice(0, -3));
      refined.push('ក្រសួង');
      i += 1;
      continue;
    }
    if (seg.endsWith('បឋម') && seg.length > 3 && raw[i + 1] === 'សិក្សា') {
      refined.push(seg.slice(0, -3));
      refined.push('បឋមសិក្សា');
      i += 1;
      continue;
    }

    // Split oversized multi-word Khmer chunks on natural word boundaries
    const longSplit = KHMER_LONG_CHUNK_SPLITS[seg];
    if (longSplit) {
      for (const part of longSplit) refined.push(part);
      continue;
    }

    // Keep common Khmer compound words & proper names unbroken (`កម្មវត្ថុ`, `ព្រះករុណា`, `បឋមសិក្សា`, ...)
    if (raw[i + 1] && KHMER_COMPOUND_PAIRS.has(`${seg}|${raw[i + 1]}`)) {
      refined.push(seg + raw[i + 1]);
      i += 1;
      continue;
    }

    // Split `ទី១កន្លងទៅ` -> `ទី១` + `កន្លងទៅ`, and `ឆមាសទី១មាន` -> `ឆមាសទី១` + `មាន`
    const tiPrefixMatch = seg.match(/^((?:[\u1780-\u17DF]+)?ទី[\u17E0-\u17E90-9]+)([\u1780-\u17DF].+)$/);
    if (tiPrefixMatch) {
      refined.push(tiPrefixMatch[1]);
      refined.push(tiPrefixMatch[2]);
      continue;
    }

    // Split `សិក្សា២០១២` (Khmer letters + digits, except `ទី` + digits and `ថ្ងៃទី` + digits)
    const letterThenDigit = seg.match(/^([\u1780-\u17DF]+)([\u17E0-\u17E90-9]+)$/);
    if (letterThenDigit && !letterThenDigit[1].endsWith('ទី')) {
      refined.push(letterThenDigit[1]);
      refined.push(letterThenDigit[2]);
      continue;
    }

    // Split `២២ខែ...` only when trailing Khmer word is NOT a compact numeric unit
    const digitThenLetter = seg.match(/^([\u17E0-\u17E90-9]+)([\u1780-\u17DF]+)$/);
    if (digitThenLetter && !COMPACT_NUMBER_UNITS.has(digitThenLetter[2])) {
      refined.push(digitThenLetter[1]);
      refined.push(digitThenLetter[2]);
      continue;
    }

    refined.push(seg);
  }

  return refined;
}

function appendPieceToToken(token, text, type) {
  const pieces = token.pieces;
  const last = pieces[pieces.length - 1];
  if (last && last.type === type) {
    last.text += text;
  } else {
    pieces.push({ text, type });
  }
}

/**
 * Convert styled runs into atomic justification tokens:
 * Each token = { pieces: [{ text, type }], spaceBefore: boolean }
 * Guarantees:
 * - Zero broken Khmer subscripts / vowels / diacritics
 * - Brackets, quotes, punctuation, dates (`២០១២-២០១៣`), decree numbers (`២៦៨/១២`),
 *   and abbreviations (`ព.ប.ហ.ណ`) stay glued together atomically.
 */
export function tokenizeStyledRuns(runs = []) {
  const atoms = [];
  let pendingSpace = false;

  for (const run of runs) {
    if (!run || !run.text) continue;
    const type = run.type || 'normal';
    const rawStr = String(run.text).replace(/\u200B/g, '').replace(/[ \t]+/g, ' ');

    if (run.noBreak) {
      const hasLeadSpace = /^\s/.test(rawStr);
      const hasTrailSpace = /\s$/.test(rawStr);
      const trimmed = rawStr.trim();
      if (hasLeadSpace && atoms.length > 0) pendingSpace = true;
      if (trimmed) {
        atoms.push({
          text: trimmed,
          type,
          spaceBefore: atoms.length > 0 && pendingSpace,
          noBreak: true,
          noStretchAfter: Boolean(run.noStretchAfter)
        });
        pendingSpace = false;
      }
      if (hasTrailSpace) pendingSpace = true;
      continue;
    }

    const segs = segmentRawKhmerText(rawStr);
    for (const seg of segs) {
      if (!seg) continue;
      if (/^\s+$/.test(seg)) {
        if (atoms.length > 0) pendingSpace = true;
        continue;
      }
      atoms.push({
        text: seg,
        type,
        spaceBefore: atoms.length > 0 && pendingSpace,
        noBreak: false
      });
      pendingSpace = false;
    }
  }

  const tokens = [];
  let pendingPrefix = [];
  let pendingPrefixSpace = false;
  let glueNextIfNoSpace = false;

  const flushPrefixInto = (tok) => {
    if (pendingPrefix.length > 0) {
      const merged = [];
      for (const p of pendingPrefix) {
        const last = merged[merged.length - 1];
        if (last && last.type === p.type) {
          last.text += p.text;
        } else {
          merged.push({ text: p.text, type: p.type });
        }
      }
      for (const p of tok.pieces) {
        const last = merged[merged.length - 1];
        if (last && last.type === p.type) {
          last.text += p.text;
        } else {
          merged.push({ text: p.text, type: p.type });
        }
      }
      tok.pieces = merged;
      tok.spaceBefore = pendingPrefixSpace;
      pendingPrefix = [];
      pendingPrefixSpace = false;
    }
  };

  for (const atom of atoms) {
    const prevTok = tokens[tokens.length - 1];
    const prevLastPiece = prevTok ? prevTok.pieces[prevTok.pieces.length - 1] : null;
    const prevText = prevLastPiece ? prevLastPiece.text : '';

    // 1. Opening brackets / quotes glue onto the FOLLOWING token
    if (OPENING_PUNCT_RE.test(atom.text)) {
      if (pendingPrefix.length === 0) {
        pendingPrefixSpace = atom.spaceBefore;
      }
      pendingPrefix.push({ text: atom.text, type: atom.type });
      glueNextIfNoSpace = false;
      continue;
    }

    // 2. Never detach leading Khmer combining marks / vowels / subscripts from previous base consonant
    const mustAttachCluster =
      !atom.spaceBefore &&
      prevTok &&
      pendingPrefix.length === 0 &&
      (LEADING_KHMER_MARK_RE.test(atom.text) || prevText.endsWith('\u17D2'));

    // 3. Closing punctuation (`។`, `៖`, `ៗ`, `»`, `)`, `,`, ...) ALWAYS glues onto previous token
    // (even if user accidentally typed a space before it) so punctuation never wraps alone onto a new line
    const isClosingPunct = prevTok && pendingPrefix.length === 0 && CLOSING_PUNCT_RE.test(atom.text);

    // 4. Inline connector (`.`, `/`, `-`, `–`, `—`) without preceding space glues prev + next (`២០១២-២០១៣`, `២៦៨/១២`, `ព.ប.ហ.ណ`)
    const isInlineConnector =
      !atom.spaceBefore && prevTok && pendingPrefix.length === 0 && CONNECTOR_PUNCT_RE.test(atom.text);

    // 5. Keep `ទី` + digit (`ទី១`, `ទី២`, `ទី៣`) glued
    const isTiDigit =
      !atom.spaceBefore &&
      prevTok &&
      pendingPrefix.length === 0 &&
      prevText.endsWith('ទី') &&
      KHMER_OR_ASCII_DIGIT_RE.test(atom.text);

    if (mustAttachCluster || isClosingPunct || isTiDigit || (!atom.spaceBefore && glueNextIfNoSpace && prevTok && pendingPrefix.length === 0)) {
      appendPieceToToken(prevTok, atom.text, atom.type);
      glueNextIfNoSpace = false;
      continue;
    }

    if (isInlineConnector) {
      appendPieceToToken(prevTok, atom.text, atom.type);
      glueNextIfNoSpace = true;
      continue;
    }

    glueNextIfNoSpace = false;
    const newTok = {
      pieces: [{ text: atom.text, type: atom.type }],
      spaceBefore: atom.spaceBefore,
      noStretchAfter: Boolean(atom.noStretchAfter)
    };
    flushPrefixInto(newTok);
    tokens.push(newTok);
  }

  // If paragraph ended with a lone opening bracket/quote, keep it safely
  if (pendingPrefix.length > 0) {
    tokens.push({
      pieces: pendingPrefix,
      spaceBefore: pendingPrefixSpace
    });
  }

  return tokens;
}

// ---- Canvas 2D Font Measurement Cache + Font-Ready Subscription ----

let sharedCanvasCtx = null;
function getMeasureCtx() {
  if (sharedCanvasCtx) return sharedCanvasCtx;
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    sharedCanvasCtx = canvas.getContext('2d');
    return sharedCanvasCtx;
  } catch {
    return null;
  }
}

let globalFontVersion = 0;
const fontListeners = new Set();
let fontHookInitialized = false;

function bumpFontVersion() {
  globalFontVersion += 1;
  widthCache.clear();
  fontListeners.forEach(fn => {
    try {
      fn(globalFontVersion);
    } catch {
      // ignore
    }
  });
}

export function initKhmerFontReadyHook() {
  if (fontHookInitialized || typeof document === 'undefined' || !document.fonts) return;
  fontHookInitialized = true;
  if (document.fonts.ready) {
    document.fonts.ready.then(bumpFontVersion).catch(() => {});
  }
  if (typeof document.fonts.addEventListener === 'function') {
    document.fonts.addEventListener('loadingdone', bumpFontVersion);
  }
}

export function subscribeKhmerFontReady(listener) {
  initKhmerFontReadyHook();
  fontListeners.add(listener);
  return () => fontListeners.delete(listener);
}

export function getKhmerFontVersion() {
  return globalFontVersion;
}

const widthCache = new Map();

function resolveCanvasFontFamily(family) {
  const s = String(family || KHMER_SIEMREAP_FONT);
  if (!s.includes('var(')) return s;
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.documentElement) {
    const m = s.match(/var\(\s*(--[^,\s)]+)\s*\)/);
    if (m) {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
      if (resolved) return resolved;
    }
  }
  return KHMER_UI_FONT;
}

function buildCanvasFont(type, fontSize, fontFamily, moulFontFamily) {
  const resolvedBody = resolveCanvasFontFamily(fontFamily);
  const resolvedMoul = resolveCanvasFontFamily(moulFontFamily);
  if (type === 'moul') {
    return `400 ${fontSize}px ${resolvedMoul}`;
  }
  if (type === 'bold') {
    return `700 ${fontSize}px ${resolvedBody}`;
  }
  return `400 ${fontSize}px ${resolvedBody}`;
}

function approxVisualWidthPx(text, fontSize, type) {
  const s = String(text || '');
  let units = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x17d2) {
      const next = s.charCodeAt(i + 1) || 0;
      if (next === 0x179a || next === 0x179c) units += 0.3;
      i += 1;
      continue;
    }
    if ((c >= 0x17b7 && c <= 0x17bd) || c === 0x17c6 || (c >= 0x17c9 && c <= 0x17d3) || c === 0x17dd) {
      continue;
    }
    if (c === 32) {
      units += 0.3;
    } else if (c >= 0x1780 && c <= 0x17ff) {
      units += 0.56;
    } else {
      units += 0.48;
    }
  }
  const factor = type === 'moul' ? 1.15 : type === 'bold' ? 1.05 : 1.0;
  return units * fontSize * factor;
}

export function measurePieceWidth(text, type, fontSize, fontFamily, moulFontFamily) {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  const fontSpec = buildCanvasFont(type, fontSize, fontFamily, moulFontFamily);
  const cacheKey = `${fontSpec}|${text}`;
  const cached = widthCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let w;
  if (ctx) {
    ctx.font = fontSpec;
    w = ctx.measureText(text).width;
    // Account for synthetic faux-bold widening on single-weight Khmer TTFs
    if (type === 'bold') {
      w *= 1.025;
    }
  } else {
    w = approxVisualWidthPx(text, fontSize, type);
  }

  if (widthCache.size > 12000) {
    widthCache.clear();
  }
  widthCache.set(cacheKey, w);
  return w;
}

export function measureSpaceWidth(fontSize, fontFamily, moulFontFamily) {
  const raw = measurePieceWidth(' ', 'normal', fontSize, fontFamily, moulFontFamily);
  return Math.max(3, Math.min(fontSize * 0.42, raw || fontSize * 0.28));
}

// Singleton Intl.Segmenter for grapheme clusters (used only when splitting an oversized single token > line width)
let cachedGraphemeSegmenter = undefined;
function getGraphemeSegmenter() {
  if (cachedGraphemeSegmenter !== undefined) return cachedGraphemeSegmenter;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      cachedGraphemeSegmenter = new Intl.Segmenter('km', { granularity: 'grapheme' });
      return cachedGraphemeSegmenter;
    }
  } catch {
    // fallback
  }
  cachedGraphemeSegmenter = null;
  return null;
}

function splitTextIntoGraphemes(str) {
  if (!str) return [];
  const seg = getGraphemeSegmenter();
  if (seg) {
    return Array.from(seg.segment(str)).map(s => s.segment);
  }
  // Safe fallback keeping Khmer consonant+subscript+vowel clusters intact
  return str.match(/[\u1780-\u17A2](?:\u17D2[\u1780-\u17A2])*[\u17B6-\u17D3\u17DD]*|./gu) || [str];
}

/**
 * Split a single oversized token (e.g. 90 dots `.......` or a long URL) on safe grapheme boundaries
 * so it never overflows the right edge or strands 1 word alone on the previous line.
 */
function splitOversizedTokenToChunks(tok, firstBudgetPx, nextBudgetPx, fontSize, fontFamily, moulFontFamily) {
  const flatUnits = [];
  for (const p of tok.pieces) {
    const gs = splitTextIntoGraphemes(p.text);
    for (const g of gs) {
      flatUnits.push({
        text: g,
        type: p.type,
        w: measurePieceWidth(g, p.type, fontSize, fontFamily, moulFontFamily)
      });
    }
  }
  if (flatUnits.length <= 1) return [tok];

  const chunks = [];
  let idx = 0;
  while (idx < flatUnits.length) {
    const budget = chunks.length === 0 ? firstBudgetPx : nextBudgetPx;
    const pieces = [];
    let chunkW = 0;
    while (idx < flatUnits.length) {
      const u = flatUnits[idx];
      if (pieces.length > 0 && chunkW + u.w > budget) break;
      const last = pieces[pieces.length - 1];
      if (last && last.type === u.type) {
        last.text += u.text;
      } else {
        pieces.push({ text: u.text, type: u.type });
      }
      chunkW += u.w;
      idx += 1;
    }
    chunks.push({
      pieces,
      spaceBefore: chunks.length === 0 ? tok.spaceBefore : false,
      noStretchAfter: chunks.length === 0 ? Boolean(tok.noStretchAfter) : false,
      width: chunkW
    });
  }
  return chunks;
}

/**
 * Pack tokenized Khmer runs into visual lines with exact pixel budgets.
 * Returns { lines, spaceW } where each line = { tokens, isLast, isFirst, naturalWidth, lineMaxW, justify }
 */
export function layoutJustifiedLines({
  runs = [],
  maxWidthPx = 694,
  firstLineIndent = 0,
  fontSize = 15.2,
  fontFamily = KHMER_SIEMREAP_FONT,
  moulFontFamily = KHMER_MOUL_FONT
}) {
  const tokens = tokenizeStyledRuns(runs);
  const spaceW = measureSpaceWidth(fontSize, fontFamily, moulFontFamily);
  if (!tokens.length || !maxWidthPx || maxWidthPx < 60) {
    return { lines: [], spaceW };
  }

  // Measure each atomic token's glyph width
  const measured = tokens.map(tok => {
    let w = 0;
    for (const p of tok.pieces) {
      w += measurePieceWidth(p.text, p.type, fontSize, fontFamily, moulFontFamily);
    }
    return { ...tok, width: w };
  });

  // 2.5px conservative packing margin keeps lines tightly packed while still preventing overflow across DirectWrite/CoreText/FreeType
  const SAFETY_PAD_PX = 2.5;
  const lines = [];
  let curTokens = [];
  let curWidth = 0;

  const getLineBudget = (lineIdx) => {
    const indent = lineIdx === 0 ? firstLineIndent : 0;
    return Math.max(60, maxWidthPx - indent);
  };

  const queue = [...measured];
  while (queue.length > 0) {
    const tok = queue.shift();
    const lineIdx = lines.length;
    const lineMaxW = getLineBudget(lineIdx);
    const packLimit = Math.max(50, lineMaxW - SAFETY_PAD_PX);

    // If a single token is wider than an entire line (e.g., long dots `........` or URL),
    // slice it on safe Khmer grapheme boundaries so it wraps cleanly with zero overflow!
    const nextLinePackLimit = Math.max(50, getLineBudget(lineIdx + 1) - SAFETY_PAD_PX);
    if (tok.width > packLimit) {
      const addSpaceIfCur = curTokens.length > 0 && tok.spaceBefore ? spaceW : 0;
      const availOnCur = packLimit - curWidth - addSpaceIfCur;
      const canStartOnCur = curTokens.length === 0 || availOnCur >= Math.min(80, packLimit * 0.25);
      if (canStartOnCur) {
        const chunks = splitOversizedTokenToChunks(
          tok,
          Math.max(40, curTokens.length === 0 ? packLimit : availOnCur),
          nextLinePackLimit,
          fontSize,
          fontFamily,
          moulFontFamily
        );
        if (chunks.length > 1) {
          for (let ci = chunks.length - 1; ci >= 0; ci--) {
            queue.unshift(chunks[ci]);
          }
          continue;
        }
      } else {
        // Flush current line first, then slice on the next fresh line
        lines.push({
          tokens: curTokens,
          naturalWidth: curWidth,
          lineMaxW,
          isFirst: lineIdx === 0,
          isLast: false
        });
        curTokens = [];
        curWidth = 0;
        queue.unshift({ ...tok, spaceBefore: false });
        continue;
      }
    }

    const addSpace = curTokens.length > 0 && tok.spaceBefore ? spaceW : 0;
    const nextWidth = curWidth + addSpace + tok.width;

    if (curTokens.length > 0 && nextWidth > packLimit) {
      lines.push({
        tokens: curTokens,
        naturalWidth: curWidth,
        lineMaxW,
        isFirst: lineIdx === 0,
        isLast: false
      });
      // First token on a new line never has a leading space
      curTokens = [{ ...tok, spaceBefore: false }];
      curWidth = tok.width;
    } else {
      curTokens.push(curTokens.length === 0 ? { ...tok, spaceBefore: false } : tok);
      curWidth = nextWidth;
    }
  }

  if (curTokens.length > 0) {
    const lineIdx = lines.length;
    lines.push({
      tokens: curTokens,
      naturalWidth: curWidth,
      lineMaxW: getLineBudget(lineIdx),
      isFirst: lineIdx === 0,
      isLast: true
    });
  }

  // Mark justification metadata on each line:
  // - Never justify last line or lines without stretchable gaps
  // - Cap explicit space stretching so explicit spaces NEVER blow up into 15–22px rivers
  // - Smart sparse guard prevents tearing narrow Mobile lines or overly sparse lines apart
  const BASE_SPACE_WEIGHT = 1.75;
  const maxExplicitExtra = Math.min(4.6, fontSize * 0.30);
  const isNarrow = maxWidthPx < 460;
  const maxAllowedZeroExtra = isNarrow ? Math.min(3.2, fontSize * 0.25) : Math.min(5.0, fontSize * 0.33);
  const maxAllowedExpOnlyExtra = isNarrow ? 7.5 : 10.5;

  const finalLines = lines.map((ln, idx) => {
    const isLast = idx === lines.length - 1;
    const remaining = Math.max(0, ln.lineMaxW - ln.naturalWidth);
    let expCount = 0;
    let zeroCount = 0;
    for (let gi = 0; gi < ln.tokens.length - 1; gi++) {
      if (ln.tokens[gi].noStretchAfter) continue;
      if (ln.tokens[gi + 1].spaceBefore) {
        expCount += 1;
      } else {
        zeroCount += 1;
      }
    }
    const stretchableGaps = expCount + zeroCount;

    let spaceWeight = BASE_SPACE_WEIGHT;
    let estExpExtra = 0;
    let estZeroExtra = 0;

    if (stretchableGaps > 0 && remaining > 0) {
      const baseTotalW = expCount * BASE_SPACE_WEIGHT + zeroCount;
      const rawExpExtra = expCount > 0 ? (remaining * BASE_SPACE_WEIGHT) / baseTotalW : 0;

      if (expCount > 0 && zeroCount > 0 && rawExpExtra > maxExplicitExtra) {
        estExpExtra = maxExplicitExtra;
        const leftover = Math.max(0, remaining - expCount * maxExplicitExtra);
        estZeroExtra = leftover / zeroCount;
        spaceWeight = estZeroExtra > 0.01 ? Number((maxExplicitExtra / estZeroExtra).toFixed(4)) : BASE_SPACE_WEIGHT;
      } else {
        estExpExtra = rawExpExtra;
        estZeroExtra = zeroCount > 0 ? remaining / baseTotalW : 0;
      }
    }

    const tooSparse =
      remaining > ln.lineMaxW * (isNarrow ? 0.30 : 0.38) ||
      (zeroCount > 0 && estZeroExtra > maxAllowedZeroExtra) ||
      (zeroCount === 0 && expCount > 0 && estExpExtra > maxAllowedExpOnlyExtra);
    const shouldJustify = !isLast && stretchableGaps >= 1 && !tooSparse;

    return {
      ...ln,
      isLast,
      remaining,
      shouldJustify,
      spaceWeight
    };
  });

  return { lines: finalLines, spaceW };
}
