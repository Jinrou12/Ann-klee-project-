// Hybrid OCR & Multimodal Vision Service for Leave Slips and Receipts
import { matchStudentName, normalizeStudentGrade, cleanHandwrittenStudentName } from './studentMaster';
import { parseKhmerNumber, toArabicDigits } from './khmerNumerals';
import {
  DEFAULT_GEMINI_KEYS,
  getStoredApiKey,
  getStoredTrainingDataset,
  fetchTrainingFromCloud,
  isBareGenericCameraFilename,
  normalizeOriginalFilename
} from './storage';

/**
 * Convert browser File or Blob to base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve({ base64: base64String, dataUrl: reader.result });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Smart Image Compressor — Safe for Khmer Cursive Handwriting
 *
 * Strategy:
 *  - Max long-edge: 1800px  (ល្អសម្រាប់ Khmer cursive — លាក់ detail ទំនញ)
 *  - JPEG quality: 0.88     (ខ្ពស់ — preserve fine strokes)
 *  - Only compress if image > 1800px OR file > 2.5MB
 *  - Always return { base64, dataUrl, mimeType, wasCompressed, originalSize, compressedSize }
 */
export function compressImageForOCR(dataUrl, originalFileSizeBytes, mimeType = 'image/jpeg') {
  return new Promise((resolve) => {
    const MAX_LONG_EDGE = 1800;
    const QUALITY = 0.88;
    const SIZE_THRESHOLD_BYTES = 2.5 * 1024 * 1024; // 2.5MB

    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const longEdge = Math.max(w, h);

      // Skip compression if image is already small enough
      if (longEdge <= MAX_LONG_EDGE && originalFileSizeBytes <= SIZE_THRESHOLD_BYTES) {
        const base64 = dataUrl.split(',')[1];
        return resolve({
          base64,
          dataUrl,
          mimeType,
          wasCompressed: false,
          originalSize: originalFileSizeBytes,
          compressedSize: originalFileSizeBytes,
        });
      }

      // Scale down proportionally
      let targetW = w;
      let targetH = h;
      if (longEdge > MAX_LONG_EDGE) {
        const ratio = MAX_LONG_EDGE / longEdge;
        targetW = Math.round(w * ratio);
        targetH = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      // Sharpen rendering for fine Khmer strokes
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Always output JPEG for consistent compression (PNG too large for base64)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY);
      const compressedBase64 = compressedDataUrl.split(',')[1];
      const compressedSize = Math.round((compressedBase64.length * 3) / 4);

      console.log(
        `🗜️ [OCR Compress] ${Math.round(originalFileSizeBytes / 1024)}KB → ${Math.round(compressedSize / 1024)}KB` +
        ` | ${w}×${h} → ${targetW}×${targetH} | quality=0.88`
      );

      resolve({
        base64: compressedBase64,
        dataUrl: compressedDataUrl,
        mimeType: 'image/jpeg',
        wasCompressed: true,
        originalSize: originalFileSizeBytes,
        compressedSize,
      });
    };
    img.onerror = () => {
      // Fallback: return original if compression fails
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, dataUrl, mimeType, wasCompressed: false, originalSize: originalFileSizeBytes, compressedSize: originalFileSizeBytes });
    };
    img.src = dataUrl;
  });
}

/**
 * Compute a 512-bit Perceptual Visual Fingerprint (dHash) for Cross-Device Image Recognition.
 * Combines:
 *  1) 256-bit full-image dHash (17x16 grayscale horizontal gradient)
 *  2) 256-bit center-crop dHash (focusing on the handwritten name/reason region: x=15%..85%, y=20%..75%)
 *  3) Aspect ratio integer (width/height * 100)
 * Invariant to file renaming, device transfer, Telegram/Messenger compression, and resolution scaling.
 */
export function computeImageFingerprint(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve('');
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return resolve('');

        const computeRegionDHash = (sx, sy, sw, sh) => {
          const canvas = document.createElement('canvas');
          canvas.width = 17;
          canvas.height = 16;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 17, 16);
          const pixels = ctx.getImageData(0, 0, 17, 16).data;

          let hex = '';
          let nibble = 0;
          let bitCount = 0;

          for (let row = 0; row < 16; row++) {
            for (let col = 0; col < 16; col++) {
              const idx1 = (row * 17 + col) * 4;
              const idx2 = (row * 17 + col + 1) * 4;
              const lum1 = pixels[idx1] * 0.299 + pixels[idx1 + 1] * 0.587 + pixels[idx1 + 2] * 0.114;
              const lum2 = pixels[idx2] * 0.299 + pixels[idx2 + 1] * 0.587 + pixels[idx2 + 2] * 0.114;
              nibble = (nibble << 1) | (lum1 > lum2 ? 1 : 0);
              bitCount++;
              if (bitCount === 4) {
                hex += nibble.toString(16);
                nibble = 0;
                bitCount = 0;
              }
            }
          }
          return hex;
        };

        const fullHash = computeRegionDHash(0, 0, w, h);
        const centerHash = computeRegionDHash(
          Math.round(w * 0.15),
          Math.round(h * 0.20),
          Math.max(1, Math.round(w * 0.70)),
          Math.max(1, Math.round(h * 0.55))
        );
        const aspect = Math.round((w / h) * 100);
        resolve(`${fullHash}:${centerHash}:${aspect}`);
      } catch (e) {
        console.warn('Fingerprint computation error:', e);
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

function hexHammingDistance(hex1, hex2) {
  if (!hex1 || !hex2 || hex1.length !== hex2.length) return 999;
  const popcount = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  let dist = 0;
  for (let i = 0; i < hex1.length; i++) {
    const v1 = parseInt(hex1[i], 16);
    const v2 = parseInt(hex2[i], 16);
    if (Number.isNaN(v1) || Number.isNaN(v2)) return 999;
    dist += popcount[v1 ^ v2];
  }
  return dist;
}

/**
 * Match an image's 512-bit fingerprint against stored training samples.
 * Handles both exact bit matches and re-compressed/resized copies across devices.
 */
export function matchByImageFingerprint(targetHash, trainingDataset = []) {
  if (!targetHash || !Array.isArray(trainingDataset) || trainingDataset.length === 0) return null;
  const [tFull, tCenter, tAspectStr] = targetHash.split(':');
  const tAspect = Number(tAspectStr) || 0;
  if (!tFull || !tCenter) return null;

  let bestSample = null;
  let bestScore = 999;

  for (const s of trainingDataset) {
    if (!s?.imageHash || !s?.groundTruth) continue;
    if (s.imageHash === targetHash) {
      return s; // 100% exact visual match
    }
    const [sFull, sCenter, sAspectStr] = String(s.imageHash).split(':');
    const sAspect = Number(sAspectStr) || 0;
    if (!sFull || !sCenter) continue;
    if (tAspect && sAspect && Math.abs(tAspect - sAspect) > 5) continue;

    const fullDist = hexHammingDistance(tFull, sFull);
    const centerDist = hexHammingDistance(tCenter, sCenter);
    const totalDist = fullDist + centerDist;

    // Require high visual similarity in both full layout and inner handwriting crop (<= 16 bits each out of 256)
    if (fullDist <= 16 && centerDist <= 16 && totalDist < bestScore) {
      bestScore = totalDist;
      bestSample = s;
    }
  }

  return bestSample;
}

/**
 * Normalize date strings (e.g. "១៥/កញ្ញា/២០២៦" or "15/09/2026" or "១៥/០៩/២០២៦") for cross-checking
 */
function normalizeDateForComparison(dateStr) {
  if (!dateStr) return '';
  let s = toArabicDigits(String(dateStr)).trim();
  const khmerMonthMap = {
    'មករា': '01', 'កុម្ភៈ': '02', 'មីនា': '03', 'មេសា': '04',
    'ឧសភា': '05', 'មិថុនា': '06', 'កក្កដា': '07', 'សីហា': '08',
    'កញ្ញា': '09', 'តុលា': '10', 'វិច្ឆិកា': '11', 'ធ្នូ': '12'
  };
  for (const [mName, mNum] of Object.entries(khmerMonthMap)) {
    if (s.includes(mName)) {
      s = s.replace(mName, mNum);
    }
  }
  const nums = s.match(/\d+/g);
  if (nums && nums.length >= 2) {
    const day = nums[0].padStart(2, '0');
    const month = nums[1].padStart(2, '0');
    return `${day}/${month}`;
  }
  return s.replace(/\s+/g, '');
}

/**
 * Auto-Crop & Contrast-Boost the Student Pen-Ink Zone on a Leave Slip (y: 15%..68%, x: 3%..97%).
 * Cuts out the top printed national/ministry header and bottom teacher/director signatures,
 * zooming 2x-3x into the 5 handwritten ballpoint pen ink lines (Name, Grade, Duration, Date, Reason).
 */
export function cropLeaveSlipPenInkZone(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve('');
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return resolve('');

        // Only crop vertical/portrait full-page slips; if already a close-up landscape shot, keep full frame
        const isFullPagePortrait = h >= w * 1.12;
        const sx = isFullPagePortrait ? Math.round(w * 0.03) : 0;
        const sy = isFullPagePortrait ? Math.round(h * 0.15) : 0;
        const sw = isFullPagePortrait ? Math.round(w * 0.94) : w;
        const sh = isFullPagePortrait ? Math.round(h * 0.53) : h;

        const MAX_CROP_EDGE = 1600;
        const longEdge = Math.max(sw, sh);
        const scale = longEdge > MAX_CROP_EDGE ? MAX_CROP_EDGE / longEdge : 1;
        const targetW = Math.max(1, Math.round(sw * scale));
        const targetH = Math.max(1, Math.round(sh * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Enhance ballpoint pen ink contrast slightly against paper background
        ctx.filter = 'contrast(1.16) saturate(1.15)';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
        resolve(croppedDataUrl.split(',')[1] || '');
      } catch (e) {
        console.warn('Pen-ink zone crop failed:', e);
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

/**
 * Group student roster by grade ('មត្តេយ្យ', '១', '២', '៣') for Grade-First AI matching
 */
function buildGradeGroupedRosterPrompt(studentMaster = []) {
  if (!Array.isArray(studentMaster) || studentMaster.length === 0) return '';
  const groups = {
    'មត្តេយ្យ': [],
    '១': [],
    '២': [],
    '៣': [],
    'ផ្សេងៗ': []
  };
  studentMaster.forEach(s => {
    const g = normalizeStudentGrade(s.grade);
    const aliasText = s.aliases && s.aliases.length > 0 ? ` (អាចសរសេរ: ${s.aliases.join(', ')})` : '';
    const entry = `${s.name}${aliasText}`;
    if (groups[g]) {
      groups[g].push(entry);
    } else {
      groups['ផ្សេងៗ'].push(`${entry} [ថ្នាក់ ${s.grade}]`);
    }
  });

  let out = `\nOFFICIAL MONASTIC SCHOOL STUDENT ROSTER GROUPED BY GRADE (បញ្ជីឈ្មោះសមណសិស្សតាមថ្នាក់ទី):\n`;
  if (groups['មត្តេយ្យ'].length > 0) {
    out += `- ថ្នាក់មត្តេយ្យ (${groups['មត្តេយ្យ'].length} អង្គ): ${groups['មត្តេយ្យ'].join(' | ')}\n`;
  }
  if (groups['១'].length > 0) {
    out += `- ថ្នាក់ទី ១ (${groups['១'].length} អង្គ): ${groups['១'].join(' | ')}\n`;
  }
  if (groups['២'].length > 0) {
    out += `- ថ្នាក់ទី ២ (${groups['២'].length} អង្គ): ${groups['២'].join(' | ')}\n`;
  }
  if (groups['៣'].length > 0) {
    out += `- ថ្នាក់ទី ៣ (${groups['៣'].length} អង្គ): ${groups['៣'].join(' | ')}\n`;
  }
  if (groups['ផ្សេងៗ'].length > 0) {
    out += `- ថ្នាក់ផ្សេងៗ: ${groups['ផ្សេងៗ'].join(' | ')}\n`;
  }
  return out;
}

/**
 * Perform extraction using Gemini Vision API if API Key is available
 */
async function callGeminiVision(base64Data, mimeType, apiKey, docTypeHint, studentMaster, isPortrait = true, penInkCropBase64 = '') {
  const studentListContext = buildGradeGroupedRosterPrompt(studentMaster);

  const prompt = `
You are an expert OCR and administrative assistant in Cambodia specializing in Khmer documents for monastic Buddhist primary schools (សាលាពុទ្ធិកបឋមសិក្សា).
Examine the provided image(s) carefully. The document is either a Student Leave Slip (ក្រដាសសុំច្បាប់សមណសិស្ស) OR an Expense/Income Receipt (ប៉ុងលុយ/វិក្កយបត្រចំណាយ-ចំណូល).
${penInkCropBase64 ? 'Note: Image 1 is the full document, and Image 2 is a zoomed-in close-up of the middle student handwritten Pen-Ink section.' : ''}

STEP 1 — DOCUMENT CLASSIFICATION RULES:
1. LEAVE SLIP ("detectedType": "leave"):
   - Contains Cambodian national motto, "មន្ទីរធម្មការ និងសាសនា", "សាលាពុទ្ធិកបឋមសិក្សា", "លិខិតសុំច្បាប់", "សមណសិស្ស", "ខ្ញុំបាទ/នាងខ្ញុំ", "ថ្នាក់ទី", "កម្មវត្ថុ", "សុំឈប់សម្រាក", "មូលហេតុ", or close-up handwritten student name/class/illness reason.
2. FINANCE RECEIPT ("detectedType": "finance"):
   - Contains itemized store purchase lines, gasoline/fuel, hardware, store name, or totals in Riel (៛) or USD ($).

STEP 2 — IF THE DOCUMENT IS A LEAVE SLIP ("detectedType": "leave"):
CRITICAL PEN-INK ONLY FOCUS RULE (ច្បាប់មើលតែអក្សរទឹកប៊ិចសម្រាប់ក្រដាសសុំច្បាប់):
- On a Leave Slip, 90% of the page is black printed template text (អក្សរពុម្ពខ្មៅ). You MUST IGNORE all printed template words ("ព្រះរាជាណាចក្រកម្ពុជា", "សាលាពុទ្ធិកបឋមសិក្សា", "ខ្ញុំបាទ", "សមណសិស្សឈ្មោះ", "សាមណេរ", "ភិក្ខុ", "សូមគោរពជូន") and IGNORE the teacher/principal signatures at the bottom ("លោកគ្រូបន្ទុកថ្នាក់", "នាយកសាលា").
- FOCUS 100% ON THE HANDWRITTEN BALLPOINT PEN INK (អក្សរសរសេរដៃដោយទឹកប៊ិចពណ៌ខៀវ ឬខ្មៅ) written on the dotted fill-in lines (......) in the middle of the slip!
- Extract ONLY these 5 Pen-Ink handwritten values in this exact order:
  1. PEN-INK GRADE ("grade"):
     - Look at the pen ink written after "ថ្នាក់ទី ......".
     - Read the grade first ("មត្តេយ្យ", "១", "២", or "៣").
  2. PEN-INK RAW HANDWRITTEN NAME ("rawHandwrittenName"):
     - Look closely at the pen ink written after "ឈ្មោះ ........................" (use Image 2 zoomed crop if provided).
     - Transcribe the exact Khmer consonants, subscripts (ជើងអក្សរ), and vowels written in pen ink character-by-character BEFORE looking at the student roster.
  3. PEN-INK MATCHED STUDENT NAME ("name"):
     - Compare your "rawHandwrittenName" against the students listed under that specific "grade" in the Official Monastic School Student Roster below.
     - If the pen-ink letters match or closely resemble a student in that grade (accounting for cursive pen-ink handwriting), output that student's exact official name from the roster.
     - CRITICAL: Read the actual pen ink on THIS slip! NEVER guess a random student name that does not match the written pen-ink consonants! If the pen-ink name is a new student not in the roster, output the exact pen-ink name.
  4. PEN-INK DURATION ("duration"):
     - Read the pen ink written after "ចំនួន ......" (e.g. "១ ថ្ងៃ", "២ ថ្ងៃ", "១ ព្រឹក", "១ ល្ងាច").
  5. PEN-INK START DATE ("date"):
     - Read the pen ink written on the start date line "ចាប់ពីថ្ងៃទី... ខែ... ឆ្នាំ..." and format as a single start date "DD/MM/2026" in Khmer numerals (e.g. "១៥/០៩/២០២៦").
     - Academic year is strictly 2026 (២០២៦). NEVER include "ដល់..." or end dates.
  6. PEN-INK REASON ("reason"):
     - Read the pen ink written after "មូលហេតុ ........................" (e.g. "ក្ដៅខ្លួន ឈឺចុកពោះ", "អាពាធ គ្រុនក្ដៅ", "អាពាធ ឈឺក្បាល", "កិច្ចការផ្ទាល់ខ្លួន").
${studentListContext}
Task:
Output strictly valid JSON with this exact schema:

{
  "detectedType": "leave" | "finance",
  "confidence": 0.0 to 1.0,
  "leaveItems": [
    {
      "rawHandwrittenName": "តួអក្សរទឹកប៊ិចឆៅដែលអានឃើញផ្ទាល់លើបន្ទាត់ឈ្មោះ",
      "name": "ឈ្មោះសមណសិស្សដែលផ្គូផ្គងតាមទឹកប៊ិច និងថ្នាក់ទី",
      "grade": "ថ្នាក់ទី (មត្តេយ្យ, ១, ២, ឬ ៣)",
      "reason": "មូលហេតុសរសេរទឹកប៊ិច",
      "duration": "ចំនួនថ្ងៃឈប់សរសេរទឹកប៊ិច (ឧ. ១ ថ្ងៃ, ២ ថ្ងៃ, ១ ព្រឹក, ១ ល្ងាច)",
      "date": "កាលបរិច្ឆេទចាប់ផ្ដើមសរសេរទឹកប៊ិច (DD/MM/២០២៦ តែថ្ងៃមួយគត់ ហាមដាក់ពាក្យ ដល់)",
      "note": ""
    }
  ],
  "financeItems": [
    {
      "category": "expense" | "income",
      "desc": "ឈ្មោះឥវ៉ាន់ ឬបរិយាយ",
      "qty": "ចំនួន (ឧ. 1 ម៉ាស៊ីន, 2 សន្លឹក, 3 លីត្រ)",
      "unitPrice": 0,
      "total": 0,
      "note": "ផ្សេងៗ"
    }
  ]
}

Instructions:
- Return ONLY the raw JSON object without markdown or code fences (\`\`\`json).
- If currency is written in Riel (៛) or USD ($), convert numeric value to pure numbers in unitPrice and total.
`;

  // Use gemini-3.8-flash as primary candidate model (active & verified)
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  const keysToTry = [
    apiKey,
    ...DEFAULT_GEMINI_KEYS.filter(k => k && k !== apiKey)
  ].filter(Boolean);

  let lastError = null;
  const badKeys = new Set();

  const messageParts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data
      }
    }
  ];

  // Attach zoomed Pen-Ink Crop as second image for Leave Slips so AI sees pen-ink handwriting 3x clearer
  if (penInkCropBase64 && docTypeHint !== 'finance') {
    messageParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: penInkCropBase64
      }
    });
  }

  for (const model of candidateModels) {
    for (const activeKey of keysToTry) {
      if (badKeys.has(activeKey)) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: messageParts
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429) {
            console.warn(`Key rate-limited (429) for ${model}, rotating to next key in pool...`);
            continue;
          }
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            badKeys.add(activeKey);
            continue;
          }
          if (response.status === 404 || response.status === 503) {
            console.warn(`Model ${model} returned ${response.status}, switching candidate model...`);
            break;
          }
          throw new Error(`Gemini API Error (${response.status}): ${errText}`);
        }

        const result = await response.json();
        const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) throw new Error('No content generated by Gemini');

        const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${model} failed:`, err.message || err);
      }
    }
  }

  throw lastError || new Error('All Gemini Vision models and keys in pool failed.');
}

/**
 * Get image natural dimensions to detect orientation (Portrait vs Landscape)
 */
export function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

/**
 * Honest Blank Item Generator when Offline or without API key (No fake/dummy data!)
 */
function createManualBlankItem(file, docTypeHint, isPortrait = true, errorMessage = '') {
  const isLeave = docTypeHint === 'leave' || (docTypeHint === 'auto' && isPortrait);
  return {
    detectedType: isLeave ? 'leave' : 'finance',
    confidence: 0,
    isOfflineNoScan: true,
    scanError: errorMessage || 'មិនទាន់បានស្កេន (ត្រូវការអ៊ីនធឺណិត និង AI Key)',
    leaveItems: isLeave ? [
      {
        name: '',
        grade: '៣',
        reason: '',
        duration: '១ថ្ងៃ',
        date: new Date().toLocaleDateString('en-GB'),
        note: ''
      }
    ] : [],
    financeItems: !isLeave ? [
      {
        category: 'expense',
        desc: '',
        qty: '1',
        unitPrice: 0,
        total: 0,
        note: ''
      }
    ] : []
  };
}

/**
 * Main process function that handles single or batch image processing
 */
export async function processUploadedImage(file, { docTypeHint = 'auto', apiKey = '', studentMaster = [], allLeaves = {} } = {}) {
  // Step 0: Read raw file → dataUrl and compute 512-bit Visual Image Fingerprint (takes ~2ms)
  const { dataUrl: rawDataUrl } = await fileToBase64(file);
  const imageHash = await computeImageFingerprint(rawDataUrl);

  // Ensure we have latest training samples from Cloud (in case trained on another device moments ago)
  let trainingDataset = getStoredTrainingDataset();
  if (navigator.onLine) {
    try {
      const cloudMerged = await fetchTrainingFromCloud();
      if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
        trainingDataset = cloudMerged;
      }
    } catch {
      // Fallback to local trainingDataset if cloud fetch fails
    }
  }

  // Step 1: Cross-Device AI Flywheel Ground-Truth Memory Check
  //   1A: Match by 512-bit Visual Image Fingerprint (works even if file was renamed or compressed across devices!)
  let matchedSample = matchByImageFingerprint(imageHash, trainingDataset);

  //   1B: Match by Filename (for distinct filenames like "photo_2026-11-03_11-25-33.jpg", "IMG_1234.jpg", "b98eb...jpg")
  if (!matchedSample && !isBareGenericCameraFilename(file.name) && Array.isArray(trainingDataset)) {
    const cleanTargetName = normalizeOriginalFilename(file.name)
      .toLowerCase()
      .replace(/\s*\(\d+\)\s*(?=\.[^.]+$|$)/, '')
      .trim();

    matchedSample = trainingDataset.find(s => {
      const sOrig = normalizeOriginalFilename(s.originalFileName || s.fileName || '')
        .toLowerCase()
        .replace(/\s*\(\d+\)\s*(?=\.[^.]+$|$)/, '')
        .trim();
      return sOrig && !isBareGenericCameraFilename(sOrig) && sOrig === cleanTargetName;
    }) || null;
  }

  if (matchedSample && matchedSample.groundTruth) {
    console.log('✨ [AI Flywheel] Instant Cross-Device Ground-Truth memory recall for:', file.name);
    const gt = matchedSample.groundTruth;
    let cleanDate = String(gt.date || '').trim();
    cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
    if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
      const parts = cleanDate.split(/ដល់|-|\/to\//i);
      if (parts[0] && parts[0].trim().length >= 6) {
        cleanDate = parts[0].trim();
      }
    }
    const cleanReason = String(gt.reason || 'ការងារផ្ទាល់ខ្លួន').replace(/\s+/g, ' ').trim();
    const isLeave = matchedSample.docType !== 'finance';

    return {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      fileName: file.name,
      fileSize: file.size,
      imageHash,
      previewUrl: rawDataUrl,
      processingMode: 'ai_flywheel_memory',
      timestamp: new Date().toISOString(),
      result: {
        detectedType: matchedSample.docType || 'leave',
        confidence: 1.0,
        isLearnedMemory: true,
        imageHash,
        leaveItems: isLeave ? [{
          name: gt.name || 'សមណសិស្ស',
          grade: gt.grade || '២',
          reason: cleanReason,
          duration: gt.duration || '១ថ្ងៃ',
          date: cleanDate || new Date().toLocaleDateString('en-GB'),
          note: gt.note || ''
        }] : [],
        financeItems: !isLeave ? [gt] : []
      }
    };
  }

  // Step 2: Smart-compress for OCR (safe for Khmer cursive: max 1800px, quality 0.88)
  const {
    base64,
    dataUrl,
    mimeType: compressedMimeType,
    wasCompressed,
  } = await compressImageForOCR(rawDataUrl, file.size, file.type);

  if (wasCompressed) {
    console.log('🗜️ [OCR] Image compressed before Gemini API call (safe for Khmer cursive)');
  }

  const dimensions = await getImageDimensions(dataUrl);
  // Vertical / Portrait documents (height >= width * 1.05) are almost exclusively A4 leave slips
  const isPortrait = dimensions.height >= dimensions.width * 1.05;

  // Step 2B: For Leave Slips, create a zoomed, contrast-boosted Pen-Ink Zone crop (middle student fill-in lines)
  const penInkCropBase64 = (docTypeHint !== 'finance')
    ? await cropLeaveSlipPenInkZone(rawDataUrl)
    : '';

  let extractionResult;
  let processingMode = 'gemini_cloud';
  const effectiveApiKey = apiKey || getStoredApiKey() || DEFAULT_GEMINI_KEYS[0];

  if (!navigator.onLine) {
    extractionResult = createManualBlankItem(file, docTypeHint, isPortrait, 'គ្មានសេវាអ៊ីនធឺណិត (Offline) - សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីឱ្យ AI ស្កេន');
    processingMode = 'offline_no_internet';
  } else if (!effectiveApiKey) {
    extractionResult = createManualBlankItem(file, docTypeHint, isPortrait, 'មិនទាន់មាន AI Key - សូមបញ្ចូល AI Key ដើម្បីដំណើរការស្កេន');
    processingMode = 'missing_api_key';
  } else {
    try {
      extractionResult = await callGeminiVision(
        base64,
        compressedMimeType || file.type,
        effectiveApiKey,
        docTypeHint,
        studentMaster,
        isPortrait,
        penInkCropBase64
      );
      processingMode = 'gemini_cloud';
    } catch (err) {
      console.warn('Gemini Cloud OCR failed:', err);
      extractionResult = createManualBlankItem(file, docTypeHint, isPortrait, 'មិនអាចស្កេនបានដោយសារបញ្ហាបណ្ដាញ៖ ' + (err.message || 'Error'));
      processingMode = 'offline_error';
    }
  }

  // Build safe non-conflicting alias map from user corrections (only when rawOcrName is NOT another real student's official name)
  const officialStudentNames = new Set(
    (studentMaster || []).map(s => String(s.name || '').replace(/[\s\u200B]/g, ''))
  );
  const safeLearnedAliasMap = new Map();
  if (Array.isArray(trainingDataset)) {
    trainingDataset.forEach(s => {
      if (s.docType === 'finance' || !s.groundTruth?.name) return;
      const rawN = (s.rawOcrName || s.rawOcr?.initialOcrName || '').replace(/[\s\u200B]/g, '');
      if (rawN && !officialStudentNames.has(rawN)) {
        safeLearnedAliasMap.set(rawN, s.groundTruth);
      }
    });
  }

  // Cross-reference extracted pen-ink student names (using Grade-First + Khmer Cursive Skeleton matching) and normalize dates
  if (extractionResult.leaveItems && extractionResult.leaveItems.length > 0) {
    extractionResult.leaveItems = extractionResult.leaveItems.map((item) => {
      const rawHandwritten = cleanHandwrittenStudentName(item.rawHandwrittenName || '');
      const cleanedPrimaryName = cleanHandwrittenStudentName(item.name || rawHandwritten || '');
      const initialOcrName = cleanedPrimaryName || rawHandwritten;
      const normGrade = normalizeStudentGrade(item.grade);

      let cleanDate = String(item.date || '').trim();
      let cleanReason = String(item.reason || '').replace(/\s+/g, ' ').trim();
      // Enforce year 2026 instead of 2024
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');

      // Strip any "ដល់..." or "- date" or "to date" completely! Always keep only the single start date
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }

      // 1. Check safe non-conflicting learned spelling alias (e.g. "ឆានឆៃអ៊ង" -> "ចាន់ ឆៃអ៊ង")
      const cleanRawKey = initialOcrName.replace(/[\s\u200B]/g, '');
      if (cleanRawKey && safeLearnedAliasMap.has(cleanRawKey)) {
        const learnedGt = safeLearnedAliasMap.get(cleanRawKey);
        return {
          ...item,
          name: learnedGt.name,
          grade: normGrade || learnedGt.grade || item.grade,
          reason: cleanReason || learnedGt.reason,
          date: cleanDate,
          initialOcrName
        };
      }

      // 2. Grade-First + Khmer Cursive Skeleton Fuzzy Match on both `name` and `rawHandwrittenName`
      const matchPrimary = matchStudentName(cleanedPrimaryName, studentMaster, normGrade);
      const matchRaw = rawHandwritten && rawHandwritten !== cleanedPrimaryName
        ? matchStudentName(rawHandwritten, studentMaster, normGrade)
        : null;

      const bestMatch = (matchPrimary && matchRaw)
        ? (matchPrimary.confidence >= matchRaw.confidence ? matchPrimary : matchRaw)
        : (matchPrimary || matchRaw);

      if (bestMatch && bestMatch.confidence >= 0.74) {
        return {
          ...item,
          name: bestMatch.student.name,
          grade: bestMatch.student.grade || normGrade || item.grade,
          reason: cleanReason,
          date: cleanDate,
          matchedStudent: bestMatch.student,
          matchConfidence: bestMatch.confidence,
          initialOcrName
        };
      }

      return {
        ...item,
        name: cleanedPrimaryName || item.name,
        grade: normGrade || item.grade,
        reason: cleanReason,
        date: cleanDate,
        initialOcrName
      };
    });
  }

  extractionResult.imageHash = imageHash;
  extractionResult.initialOcrName = extractionResult.leaveItems?.[0]?.initialOcrName || '';

  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    fileName: file.name,
    fileSize: file.size,
    imageHash,
    // Use raw (uncompressed) dataUrl for preview so image quality is sharp for user review
    previewUrl: rawDataUrl,
    processingMode,
    timestamp: new Date().toISOString(),
    result: extractionResult
  };
}
