// 100% Isolated Student Leave Slip OCR Engine (សម្រាប់តែក្រដាសសុំច្បាប់សមណសិស្សប៉ុណ្ណោះ)
// ZERO Finance / Receipt / Currency imports or rules exist in this file.
import {
  matchStudentName,
  normalizeStudentGrade,
  cleanHandwrittenStudentName,
  computeKhmerNameSimilarity
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
 * Honest Blank Leave Item when Offline or Network Failed (Strictly Leave Type — NEVER Finance)
 */
export function createBlankLeaveResult(errorMessage = '') {
  return {
    detectedType: 'leave',
    confidence: 0,
    isOfflineNoScan: true,
    scanError: errorMessage || 'មិនទាន់បានស្កេនក្រដាសសុំច្បាប់ (ត្រូវការសេវាអ៊ីនធឺណិត)',
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
 * Pure Literal Pen-Ink Transcription for Student Leave Slips (Zero Roster Bias in Prompt!)
 * Enables thinkingBudget: 1024 so Gemini traces every Khmer consonant, subscript, and vowel accurately.
 */
export async function extractLeaveSlipWithGemini({
  base64,
  mimeType = 'image/jpeg',
  apiKey = '',
  nameLineCropBase64 = '',
  signatureCropBase64 = ''
}) {
  const prompt = [
    'You are an expert Khmer handwriting Paleographer reading a Cambodian Buddhist monastic primary school Student Leave Slip (លិខិតសុំច្បាប់).',
    'Your ONLY task is LITERAL, CHARACTER-BY-CHARACTER transcription of the blue/black ballpoint pen ink written on the form.',
    'CRITICAL RULES:',
    '1. ORIENTATION ("rotateClockwiseDegrees"): 0 if text runs horizontally upright, or 90 / 180 / 270 clockwise degrees needed to make text upright.',
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
    '   - Read ONLY the exact handwritten Khmer words after printed "មូលហេតុ :" (e.g. "ឈឺក្បាលវិលមុខ"). Do not add extra words.',
    'Return strictly valid JSON:',
    '{"detectedType":"leave","rotateClockwiseDegrees":0,"confidence":0.98,"leaveItems":[{"grade":"","line1PenInkName":"","signaturePenInkName":"","duration":"","date":"","reason":"","note":""}]}'
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
  if (signatureCropBase64) {
    parts.push({ text: 'Zoomed Bottom-Right Student Signature & Written Name:' });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: signatureCropBase64 } });
  }

  return callGeminiJsonWithResilience({
    parts,
    apiKey,
    thinkingBudget: 2048,
    timeoutMs: 26000,
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

    if (bestMatch && bestMatch.confidence >= 0.72) {
      return {
        ...item,
        rawHandwrittenName: initialOcrName,
        name: bestMatch.student.name,
        grade: bestMatch.student.grade || normGrade || item.grade,
        reason: cleanReason,
        duration: cleanDuration,
        date: cleanDate,
        note: String(item.note || '').trim(),
        matchedStudent: bestMatch.student,
        matchConfidence: bestMatch.confidence,
        initialOcrName
      };
    }

    // Strict 80-student roster guard: never emit an unverified name outside the 80 official students
    return {
      ...item,
      rawHandwrittenName: initialOcrName,
      name: '',
      grade: normGrade || item.grade || '៣',
      reason: cleanReason,
      duration: cleanDuration,
      date: cleanDate,
      note: String(item.note || '').trim(),
      initialOcrName
    };
  });
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
      extractionResult: createBlankLeaveResult('គ្មានសេវាអ៊ីនធឺណិត (Offline) — សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីស្កេនក្រដាសសុំច្បាប់')
    };
  }

  try {
    onStageChange?.('ocr');
    const [nameLineCropBase64, signatureCropBase64] = await Promise.all([
      cropLeaveSlipNameLineZone(dataUrl),
      cropLeaveSlipSignatureNameZone(dataUrl)
    ]);

    const rawResult = await extractLeaveSlipWithGemini({
      base64,
      mimeType,
      apiKey,
      nameLineCropBase64,
      signatureCropBase64
    });

    onStageChange?.('match');
    const rawItemsList = Array.isArray(rawResult?.leaveItems)
      ? rawResult.leaveItems
      : (Array.isArray(rawResult)
        ? rawResult
        : ((rawResult && (rawResult.line1PenInkName || rawResult.rawHandwrittenName || rawResult.grade || rawResult.reason))
          ? [rawResult]
          : []));
    const resolvedLeaveItems = resolveLeaveSlipItems(rawItemsList, {
      studentMaster,
      trainingDataset
    });

    return {
      processingMode: 'gemini_cloud',
      extractionResult: {
        detectedType: 'leave',
        rotateClockwiseDegrees: Number(rawResult?.rotateClockwiseDegrees) || 0,
        confidence: Number(rawResult?.confidence) || 0.96,
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

