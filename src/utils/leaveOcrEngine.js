// 100% Isolated Student Leave Slip OCR Engine (សម្រាប់តែក្រដាសសុំច្បាប់សមណសិស្សប៉ុណ្ណោះ)
// ZERO Finance / Receipt / Currency imports or rules exist in this file.
import {
  matchStudentName,
  normalizeStudentGrade,
  cleanHandwrittenStudentName,
  computeKhmerNameSimilarity,
  getClosestStudentsByOcr
} from './studentMaster';
import { toArabicDigits, toKhmerDigits } from './khmerNumerals';
import {
  callGeminiJsonWithResilience,
  formatKhmerScanError,
  loadImageElement
} from './ocrCore';

/**
 * Crisp 2x Super-Zoom Crop of Line 1 ONLY ("ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ ... ថ្នាក់ទី ...")
 * Cuts cleanly above Line 2 ("ពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង") to avoid bottom-stroke bleed.
 */
export async function cropLeaveSlipNameLineZone(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    // Capture the entire Line 1 band (y: 25%..44%, x: 11%..95%) so slightly tilted pages never clip
    // the 3rd/4th name syllables before "ភេទ:" or the grade numeral after "ជាសិស្សរៀននៅថ្នាក់ទី" on the right.
    const sx = Math.round(w * 0.11);
    const sy = Math.round(h * 0.25);
    const sw = Math.max(1, Math.round(w * 0.84));
    const sh = Math.max(1, Math.round(h * 0.19));

    const targetW = Math.min(1480, Math.max(1120, Math.round(sw * 1.7)));
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

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    canvas.width = 0;
    canvas.height = 0;
    return croppedDataUrl.split(',')[1] || '';
  } catch (e) {
    console.warn('Leave Line-1 crop failed:', e);
    return '';
  }
}

/**
 * Lightweight crop of bottom-right student signature/written name ("ស្នាមមេដៃស្ដាំនិងឈ្មោះរបស់សិស្ស")
 * Used ONLY as a secondary pen-ink cross-check when Line 1 handwriting is cramped or smudged.
 */
export async function cropLeaveSlipSignatureNameZone(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    const sx = Math.round(w * 0.52);
    const sy = Math.round(h * 0.74);
    const sw = Math.max(1, Math.round(w * 0.47));
    const sh = Math.max(1, Math.round(h * 0.25));

    const targetW = Math.min(900, Math.max(600, Math.round(sw * 1.35)));
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

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
    canvas.width = 0;
    canvas.height = 0;
    return croppedDataUrl.split(',')[1] || '';
  } catch (e) {
    console.warn('Leave signature crop failed:', e);
    return '';
  }
}

/**
 * Crisp crop of Reason & Date Zone ("កម្មវត្ថុ : សំណើសុំច្បាប់ចំនួន... គិតចាប់ពីថ្ងៃទី..." and "មូលហេតុ : ...")
 * so cursive monastic words like "អាពាធ" are read with 100% clarity.
 */
export async function cropLeaveSlipReasonAndDateZone(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    const sx = Math.round(w * 0.04);
    const sy = Math.round(h * 0.44);
    const sw = Math.max(1, Math.round(w * 0.88));
    const sh = Math.max(1, Math.round(h * 0.22));

    const targetW = Math.min(1280, Math.max(960, Math.round(sw * 1.5)));
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
    console.warn('Leave reason/date crop failed:', e);
    return '';
  }
}

/**
 * Honest Blank Leave Item when Offline or Network Failed (Strictly Leave Type — NEVER Finance)
 */
export function createBlankLeaveResult(errorMessage = '', { isTrulyOffline } = {}) {
  const trulyOffline = typeof isTrulyOffline === 'boolean'
    ? isTrulyOffline
    : (typeof navigator !== 'undefined' && navigator.onLine === false);
  return {
    detectedType: 'leave',
    confidence: 0,
    isOfflineNoScan: true,
    isTrulyOffline: trulyOffline,
    scanError: errorMessage || (trulyOffline
      ? 'មិនទាន់បានស្កេនក្រដាសសុំច្បាប់ (ត្រូវការសេវាអ៊ីនធឺណិត)'
      : 'មិនទាន់អាចស្កេនក្រដាសសុំច្បាប់ដោយ AI បានបណ្ដោះអាសន្ន'),
    leaveItems: [
      {
        name: '',
        grade: '៣',
        reason: '',
        duration: '១ថ្ងៃ',
        date: toKhmerDigits(new Date().toLocaleDateString('en-GB')),
        note: ''
      }
    ],
    financeItems: []
  };
}

/**
 * Build a compact official roster block grouped by grade for visual pen-ink cross-checking.
 */
function buildOfficialRosterBlock(studentMaster = []) {
  if (!Array.isArray(studentMaster) || studentMaster.length === 0) return '';
  const order = ['មត្តេយ្យ', '១', '២', '៣'];
  const byGrade = new Map();
  studentMaster.forEach(s => {
    if (!s?.name) return;
    const g = s.grade || '';
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g).push(s.name);
  });
  const grades = Array.from(byGrade.keys()).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return grades
    .map(g => `   - ថ្នាក់ ${g || '?'}: ${byGrade.get(g).join(', ')}`)
    .join('\n');
}

/**
 * Literal Pen-Ink Transcription for Student Leave Slips + Visual Roster Cross-Check.
 * Step 1 transcribes the literal ink (zero bias), Step 2 re-examines those same ink strokes against
 * the official roster of the slip's grade so cursive / novice spellings resolve to the real student.
 */
export async function extractLeaveSlipWithGemini({
  base64,
  mimeType = 'image/jpeg',
  apiKey = '',
  nameLineCropBase64 = '',
  reasonDateCropBase64 = '',
  signatureCropBase64 = '',
  studentMaster = []
}) {
  const rosterBlock = buildOfficialRosterBlock(studentMaster);
  const prompt = [
    'You are an expert Khmer handwriting Paleographer reading a Cambodian Buddhist monastic primary school Student Leave Slip (លិខិតសុំច្បាប់).',
    'Your ONLY task is LITERAL, CHARACTER-BY-CHARACTER transcription of the blue/black ballpoint pen ink written on the form.',
    'CRITICAL RULES:',
    '1. ORIENTATION ("rotateClockwiseDegrees"): 0 if text runs horizontally upright, 270 if top header is on the RIGHT edge, 90 if top header is on the LEFT edge, or 180 if upside-down.',
    '2. LITERAL STUDENT NAME ON LINE 1 ("line1PenInkName"):',
    '   - Locate Line 1 right below "លិខិតសុំច្បាប់", starting after printed "ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ:" and reading ALL THE WAY UP TO printed "ភេទ:" (or "អាយុ").',
    '   - CRITICAL MULTI-SYLLABLE RULE: Do NOT stop after reading only 2 syllables! Many Khmer monastic students have 3 or 4 syllables (e.g., a 2-syllable surname PLUS a 2-syllable given name written slightly smaller right before printed "ភេទ:"). Read EVERY handwritten word/syllable on that dotted line before "ភេទ:"!',
    '   - Trace EVERY handwritten Khmer vowel (េ, ែ, ៃ, ា, ិ, ី, ឹ, ឺ, ុ, ូ, ោ, ៅ), consonant (carefully distinguish ឈ vs ឆ vs ណ vs ជ vs ល vs ឡ, គ vs ឃ, ហ vs អ vs ស), and subscript stroke-by-stroke.',
    '   - DO NOT read Line 2 underneath ("ពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម").',
    '   - DO NOT invent, guess, or "correct" the student\'s spelling! Transcribe the EXACT Khmer characters literally written in pen ink!',
    '3. SECONDARY STUDENT NAME AT BOTTOM-RIGHT ("signaturePenInkName"):',
    '   - Look at bottom-right under printed "ស្នាមមេដៃស្ដាំនិងឈ្មោះរបស់សិស្ស". Read ALL handwritten Khmer name words beside/under the signature (including both surname and given name if written).',
    '4. GRADE ("grade"):',
    '   - Read the handwritten Khmer numeral grade after "ជាសិស្សរៀននៅថ្នាក់ទី" (on the right end of Line 1) AND cross-check with "លោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ទី" (Line 3).',
    '   - Carefully distinguish Khmer numeral "២" (has a loop + horizontal bottom tail) from "១" (simple small curved hook) and "៣". Output "មត្តេយ្យ", "១", "២", or "៣".',
    '5. DURATION ("duration"):',
    '   - Read pen ink after "សំណើសុំច្បាប់ចំនួន" before/around printed "ថ្ងៃ" (e.g. "1", "១ថ្ងៃ", "១ព្រឹក", "១ល្ងាច", "១ថ្ងៃកន្លះ").',
    '6. START DATE ("date"):',
    '   - Read ONLY the start date after "គិតចាប់ពីថ្ងៃទី... ខែ... ឆ្នាំ..." (ignore end date after "រហូតដល់ថ្ងៃទី" and return date after "ចូលរៀនវិញនៅថ្ងៃទី").',
    '   - Output format "DD/MM/YYYY" (e.g. day 20, month "តុលា" = 10, year 2026 -> "20/10/2026").',
    '7. REASON ("reason"):',
    '   - Read ONLY the exact handwritten Khmer words after printed "មូលហេតុ :".',
    '   - CRITICAL MONASTIC REASON RULE: In Buddhist monastic schools, novices very frequently write "អាពាធ" (illness/sick: អ + ា + ព + ា + ធ). Carefully trace the 4 characters of cursive "អាពាធ" and NEVER misread "អាពាធ" as "រវល់ការ" or "រវល់ការផ្ទះ"!',
    '   - Other common reasons: "ឈឺក្បាល", "ឈឺក្បាលវិលមុខ", "ឈឺពោះ", "គ្រុនក្ដៅ", "ទៅមន្ទីរពេទ្យ", "រវល់ការងារផ្ទាល់ខ្លួន", "ទៅស្រុកកំណើត". Do not add extra words.',
    ...(rosterBlock
      ? [
          '8. OFFICIAL ROSTER VISUAL CROSS-CHECK ("rosterMatchedName" + "rosterConfidence"):',
          '   - CRITICAL: NEVER alter or replace "line1PenInkName" or "signaturePenInkName" using this roster! Those two fields MUST remain your 100% raw literal character-by-character pen-ink readings!',
          '   - CRITICAL GRADE LOCK: When picking "rosterMatchedName", you MUST ONLY look inside the roster of the SAME GRADE written on the slip (e.g. if grade is "២", ONLY consider students in "ថ្នាក់ ២" — NEVER pick a student from "ថ្នាក់ ១", "ថ្នាក់ ៣", or "មត្តេយ្យ"!).',
          '   - Young novices often write ឆ/ឈ/ជ, គ/ឃ, ណ/ន, ល/ឡ, ិ/ី/ឹ interchangeably, squeeze the last syllable before "ភេទ:", or join surname + given name in fast cursive.',
          '   - Output the EXACT official roster spelling ONLY when the visible ink strokes genuinely correspond to that student in that grade.',
          '   - If the name area is blank/unreadable or no student in that grade truly matches, output "" with rosterConfidence 0. NEVER pick a student just to fill the field.',
          '   OFFICIAL STUDENT ROSTER BY GRADE:',
          rosterBlock
        ]
      : []),
    'Return strictly valid JSON:',
    '{"detectedType":"leave","rotateClockwiseDegrees":0,"confidence":0.98,"leaveItems":[{"grade":"","line1PenInkName":"","signaturePenInkName":"","rosterMatchedName":"","rosterConfidence":0,"duration":"","date":"","reason":"","note":""}]}'
  ].join('\n');

  const parts = [
    { text: prompt },
    { text: 'Full Leave Slip Document:' },
    { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }
  ];

  if (nameLineCropBase64) {
    parts.push({ text: 'Zoomed Line 1 (Student Name & Grade ONLY — ignore Line 2 school name at bottom edge):' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: nameLineCropBase64 } });
  }
  if (reasonDateCropBase64) {
    parts.push({ text: 'Zoomed Duration, Start Date & Reason ("មូលហេតុ :") Zone:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: reasonDateCropBase64 } });
  }
  if (signatureCropBase64) {
    parts.push({ text: 'Zoomed Bottom-Right Student Signature & Written Name:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: signatureCropBase64 } });
  }

  return callGeminiJsonWithResilience({
    parts,
    apiKey,
    thinkingBudget: 2048,
    timeoutMs: 36000,
    maxTimeoutAttempts: 2
  });
}

function normalizeLeaveDuration(rawDuration) {
  const raw = String(rawDuration || '').trim();
  if (!raw) return '១ថ្ងៃ';
  const dKhmer = toKhmerDigits(raw).replace(/\s+/g, '');
  const numMatch = dKhmer.match(/[០-៩]+/);
  const num = numMatch ? numMatch[0] : '១';
  if (dKhmer.includes('ល្ងាច')) return `${num}ល្ងាច`;
  if (dKhmer.includes('ព្រឹក')) return `${num}ព្រឹក`;
  if (dKhmer.includes('កន្លះ')) return `${num}ថ្ងៃកន្លះ`;
  return `${num}ថ្ងៃ`;
}

function normalizeLeaveStartDate(rawDate) {
  let cleanDate = String(rawDate || '').trim();
  if (!cleanDate) return '';

  if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
    const parts = cleanDate.split(/ដល់|-|\/to\//i);
    if (parts[0] && parts[0].trim().length >= 4) {
      cleanDate = parts[0].trim();
    }
  }

  const khmerMonthMap = {
    'មករា': '01', 'កុម្ភៈ': '02', 'កុម្ភះ': '02', 'មីនា': '03', 'មេសា': '04',
    'ឧសភា': '05', 'មិថុនា': '06', 'កក្កដា': '07', 'សីហា': '08',
    'កញ្ញា': '09', 'តុលា': '10', 'វិច្ឆិកា': '11', 'ធ្នូ': '12'
  };
  let arabicDate = toArabicDigits(cleanDate);
  for (const [mName, mNum] of Object.entries(khmerMonthMap)) {
    if (arabicDate.includes(mName)) {
      arabicDate = arabicDate.replace(mName, `/${mNum}/`);
    }
  }
  const dateNums = arabicDate.match(/\d+/g);
  if (dateNums && dateNums.length >= 2) {
    const day = dateNums[0].padStart(2, '0');
    const month = dateNums[1].padStart(2, '0');
    return toKhmerDigits(`${day}/${month}/2026`);
  }
  return toKhmerDigits(cleanDate.replace(/2024|2025|2014|២០២៤|២០២៥|២០១៤/g, '២០២៦'));
}

function buildSafeLearnedAliasMap(trainingDataset = [], studentMaster = []) {
  const officialStudentNames = new Set(
    (studentMaster || []).map(s => String(s.name || '').replace(/[\s\u200B]/g, ''))
  );
  const allOfficialAndAliasNames = new Set();
  (studentMaster || []).forEach(s => {
    if (s.name) allOfficialAndAliasNames.add(String(s.name).replace(/[\s\u200B]/g, ''));
    if (Array.isArray(s.aliases)) {
      s.aliases.forEach(a => allOfficialAndAliasNames.add(String(a).replace(/[\s\u200B]/g, '')));
    }
  });

  const safeMap = new Map();
  if (!Array.isArray(trainingDataset)) return safeMap;

  trainingDataset.forEach(s => {
    if (s.docType === 'finance' || !s.groundTruth?.name) return;
    const gtName = String(s.groundTruth.name || '').trim();
    const gtCompact = gtName.replace(/[\s\u200B]/g, '');
    if (!officialStudentNames.has(gtCompact)) return;
    const rawN = (s.rawOcrName || s.rawOcr?.initialOcrName || '').replace(/[\s\u200B]/g, '');
    if (rawN && !allOfficialAndAliasNames.has(rawN) && computeKhmerNameSimilarity(rawN, gtName) >= 0.70) {
      safeMap.set(rawN, s.groundTruth);
    }
  });
  return safeMap;
}

/**
 * Deterministic Phonetic + Visual + Grade Matcher against the Official 80-Student Roster.
 * Handles novice phonetic misspellings (ឆ↔ឈ, គ↔ឃ, ណ↔ន, ល↔ឡ, etc.) without ever inventing an 81st student.
 */
export function resolveLeaveSlipItems(rawItems = [], { studentMaster = [], trainingDataset = [] } = {}) {
  const safeLearnedAliasMap = buildSafeLearnedAliasMap(trainingDataset, studentMaster);

  return (Array.isArray(rawItems) ? rawItems : []).map((item) => {
    const line1Raw = cleanHandwrittenStudentName(
      item.line1PenInkName || item.rawHandwrittenName || item.name || ''
    );
    const sigRaw = cleanHandwrittenStudentName(item.signaturePenInkName || '');
    const initialOcrName = line1Raw || sigRaw;
    const normGrade = normalizeStudentGrade(item.grade);

    const cleanDuration = normalizeLeaveDuration(item.duration);
    const cleanDate = normalizeLeaveStartDate(item.date);
    const cleanReason = String(item.reason || '').replace(/\s+/g, ' ').trim();

    // 1. Check safe user-learned spelling alias first
    const cleanRawKey = initialOcrName.replace(/[\s\u200B]/g, '');
    if (cleanRawKey && safeLearnedAliasMap.has(cleanRawKey)) {
      const learnedGt = safeLearnedAliasMap.get(cleanRawKey);
      return {
        ...item,
        rawHandwrittenName: initialOcrName,
        name: learnedGt.name,
        grade: normGrade || learnedGt.grade || item.grade,
        reason: cleanReason || learnedGt.reason,
        duration: cleanDuration,
        date: cleanDate,
        initialOcrName
      };
    }

    // 2. Match Line 1 literal pen-ink reading (primary) and Bottom-Right signature name (secondary cross-check)
    const matchLine1 = line1Raw ? matchStudentName(line1Raw, studentMaster, normGrade) : null;
    const matchSig = sigRaw ? matchStudentName(sigRaw, studentMaster, normGrade) : null;

    let bestMatch = null;
    if (matchLine1 && matchSig) {
      if (matchLine1.student.id === matchSig.student.id) {
        bestMatch = {
          student: matchLine1.student,
          confidence: Math.min(1.0, Math.max(matchLine1.confidence, matchSig.confidence) + 0.02),
          isExact: matchLine1.isExact || matchSig.isExact
        };
      } else {
        // Prefer whichever reading has clearly stronger phonetic/visual confidence in this grade
        bestMatch = (matchSig.confidence > matchLine1.confidence + 0.06) ? matchSig : matchLine1;
      }
    } else {
      bestMatch = matchLine1 || matchSig;
    }

    // 3. Gemini visual roster cross-check (validated strictly against the official roster + literal ink)
    const rosterPick = resolveRosterPick(item, { studentMaster, normGrade, line1Raw, sigRaw });
    if (rosterPick) {
      if (bestMatch && bestMatch.student.id === rosterPick.student.id) {
        bestMatch = {
          student: bestMatch.student,
          confidence: Math.min(1.0, Math.max(bestMatch.confidence, rosterPick.confidence) + 0.03),
          isExact: bestMatch.isExact
        };
      } else if (!bestMatch || bestMatch.confidence < 0.97) {
        bestMatch = rosterPick;
      }
    }

    const baseResult = {
      ...item,
      rawHandwrittenName: initialOcrName,
      reason: cleanReason,
      duration: cleanDuration,
      date: cleanDate,
      note: String(item.note || '').trim(),
      initialOcrName
    };

    if (bestMatch && bestMatch.confidence >= 0.72) {
      return {
        ...baseResult,
        name: bestMatch.student.name,
        grade: bestMatch.student.grade || normGrade || item.grade,
        matchedStudent: bestMatch.student,
        matchConfidence: bestMatch.confidence,
        needsReview: false
      };
    }

    // 4. Medium-confidence fallback: AI DID read handwriting but spelling drifted below the strict threshold.
    //    Fill the closest official student of the same grade and flag it for a quick human check,
    //    instead of wiping the name box completely blank. Never invents an 81st student.
    const closest = initialOcrName
      ? getClosestStudentsByOcr([line1Raw, sigRaw], studentMaster, normGrade, 4)
      : [];
    const top = closest[0];
    const reviewSuggestions = closest
      .filter(c => c.score >= 0.45)
      .map(c => ({ name: c.student.name, grade: c.student.grade, score: Number(c.score.toFixed(2)) }));

    if (top && top.score >= 0.55 && (!normGrade || top.sameGrade)) {
      return {
        ...baseResult,
        name: top.student.name,
        grade: top.student.grade || normGrade || item.grade,
        matchedStudent: top.student,
        matchConfidence: top.score,
        needsReview: true,
        reviewSuggestions
      };
    }

    // Strict 80-student roster guard: no plausible official student → keep box empty but surface suggestions
    return {
      ...baseResult,
      name: '',
      grade: normGrade || item.grade || '៣',
      needsReview: Boolean(initialOcrName),
      reviewSuggestions
    };
  });
}

/**
 * Validate Gemini's `rosterMatchedName` so it can only ever resolve to an official roster student,
 * and only when it is consistent with the literal ink readings / grade (anti-hallucination guard).
 */
function resolveRosterPick(item, { studentMaster = [], normGrade = '', line1Raw = '', sigRaw = '' }) {
  const rosterRaw = cleanHandwrittenStudentName(item?.rosterMatchedName || '');
  const rosterCompact = rosterRaw.replace(/[\s\u200B]/g, '');
  if (!rosterCompact || !Array.isArray(studentMaster) || studentMaster.length === 0) return null;
  // No literal ink was read at all → refuse a roster-only guess
  if (!line1Raw && !sigRaw) return null;

  const rosterConf = Number(item?.rosterConfidence);
  if (Number.isFinite(rosterConf) && rosterConf > 0 && rosterConf < 0.6) return null;

  const student = studentMaster.find(s => {
    const names = [s.name, ...(s.aliases || [])].map(n => String(n || '').replace(/[\s\u200B]/g, ''));
    return names.includes(rosterCompact);
  });
  if (!student) return null;

  // Grade consistency: if slip grade was read, the roster pick must be in that grade
  if (normGrade && student.grade && student.grade !== normGrade) return null;

  // Ink consistency: the roster pick must share visible structure with what was literally written
  const candidates = [student.name, ...(student.aliases || [])];
  let inkSim = 0;
  [line1Raw, sigRaw].filter(Boolean).forEach(reading => {
    candidates.forEach(c => {
      inkSim = Math.max(inkSim, computeKhmerNameSimilarity(reading, c));
    });
  });
  if (inkSim < 0.4) return null;

  const confidence = Math.min(0.97, Math.max(0.8, 0.72 + inkSim * 0.3));
  return { student, confidence, isExact: false, source: 'roster' };
}

/**
 * Execute the isolated Leave Slip OCR pipeline end-to-end.
 */
export async function runLeaveSlipOcrPipeline({
  base64,
  dataUrl,
  mimeType = 'image/jpeg',
  apiKey = '',
  studentMaster = [],
  trainingDataset = [],
  onStageChange = null
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      processingMode: 'offline_no_internet',
      extractionResult: createBlankLeaveResult(
        'គ្មានសេវាអ៊ីនធឺណិត (Offline) — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីស្កេនក្រដាសសុំច្បាប់',
        { isTrulyOffline: true }
      )
    };
  }

  try {
    onStageChange?.('ocr');
    const [nameLineCropBase64, reasonDateCropBase64, signatureCropBase64] = await Promise.all([
      cropLeaveSlipNameLineZone(dataUrl),
      cropLeaveSlipReasonAndDateZone(dataUrl),
      cropLeaveSlipSignatureNameZone(dataUrl)
    ]);

    const rawResult = await extractLeaveSlipWithGemini({
      base64,
      mimeType,
      apiKey,
      nameLineCropBase64,
      reasonDateCropBase64,
      signatureCropBase64,
      studentMaster
    });

    onStageChange?.('match');
    const rawObj = Array.isArray(rawResult)
      ? (rawResult.find(el => el && typeof el === 'object' && Array.isArray(el.leaveItems)) || rawResult[0] || {})
      : (rawResult || {});
    const rawItemsList = Array.isArray(rawObj?.leaveItems)
      ? rawObj.leaveItems
      : (Array.isArray(rawResult)
        ? rawResult.flatMap(el => Array.isArray(el?.leaveItems) ? el.leaveItems : ((el && (el.line1PenInkName || el.rawHandwrittenName || el.grade || el.reason)) ? [el] : []))
        : ((rawObj && (rawObj.line1PenInkName || rawObj.rawHandwrittenName || rawObj.grade || rawObj.reason))
          ? [rawObj]
          : []));
    const resolvedLeaveItems = resolveLeaveSlipItems(rawItemsList, {
      studentMaster,
      trainingDataset
    });

    return {
      processingMode: 'gemini_cloud',
      extractionResult: {
        detectedType: 'leave',
        rotateClockwiseDegrees: Number(rawObj?.rotateClockwiseDegrees) || 0,
        confidence: Number(rawObj?.confidence) || 0.96,
        leaveItems: resolvedLeaveItems,
        financeItems: [],
        initialOcrName: resolvedLeaveItems[0]?.initialOcrName || ''
      }
    };
  } catch (err) {
    console.warn('Leave Slip OCR Engine failed:', err);
    return {
      processingMode: 'offline_error',
      extractionResult: createBlankLeaveResult(formatKhmerScanError(err))
    };
  }
}

