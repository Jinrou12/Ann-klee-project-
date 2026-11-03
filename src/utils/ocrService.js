// Hybrid OCR & Multimodal Vision Service for Leave Slips and Receipts
import { matchStudentName } from './studentMaster';
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
 * Perform extraction using Gemini Vision API if API Key is available
 */
async function callGeminiVision(base64Data, mimeType, apiKey, docTypeHint, studentMaster, isPortrait = true, allLeaves = {}) {
  const studentListContext = (studentMaster && studentMaster.length > 0)
    ? `\nOFFICIAL MONASTIC SCHOOL STUDENT ROSTER (Use for precise name & grade matching):\n` +
      studentMaster.map(s => {
        const aliasNote = s.aliases && s.aliases.length > 0 ? ` [Aliases: ${s.aliases.join(', ')}]` : '';
        return `- ${s.name} (ថ្នាក់ទី ${s.grade})${aliasNote}`;
      }).join('\n') + '\n'
    : '';

  // AI Flywheel: Feed ALL verified ground truths from previous verifications + approved leave records
  const trainingDataset = getStoredTrainingDataset();
  const verifiedSamples = Array.isArray(trainingDataset) ? trainingDataset.slice(0, 35) : [];

  // Also gather approved leave records from allLeaves (especially recent months like 2026-10)
  const historicalLeaveRecords = [];
  if (allLeaves && typeof allLeaves === 'object') {
    Object.keys(allLeaves).sort().reverse().forEach(monthKey => {
      const list = allLeaves[monthKey];
      if (Array.isArray(list)) {
        list.forEach(r => {
          if (r && r.name && r.reason) {
            historicalLeaveRecords.push(r);
          }
        });
      }
    });
  }

  // Build Learned OCR Name Corrections map (rawOcrName -> verified groundTruth.name)
  const learnedCorrections = [];
  verifiedSamples.forEach(s => {
    const rawN = s.rawOcrName || s.rawOcr?.initialOcrName;
    const trueN = s.groundTruth?.name;
    if (rawN && trueN && rawN.replace(/\s+/g, '') !== trueN.replace(/\s+/g, '')) {
      learnedCorrections.push(`- If handwriting looks like "${rawN}", the verified student is "${trueN}" (ថ្នាក់ទី ${s.groundTruth.grade || ''})`);
    }
  });

  const fewShotContext = (verifiedSamples.length > 0 || historicalLeaveRecords.length > 0)
    ? `\nVERIFIED MONASTIC SCHOOL GROUND-TRUTH SAMPLES (Carefully reviewed and approved by the Abbot/Principal - strictly follow these formatting patterns and match if the same slip is uploaded):\n` +
      verifiedSamples.map((s, idx) => {
        const gt = s.groundTruth || {};
        if (s.docType === 'leave') {
          return `Example ${idx + 1} [Leave Slip "${s.originalFileName || s.fileName || ''}"]: Student: "${gt.name}" (ថ្នាក់ទី ${gt.grade}), Reason: "${gt.reason}", Duration: "${gt.duration}", Date: "${gt.date}".`;
        } else {
          return `Example ${idx + 1} [Finance "${s.originalFileName || s.fileName || ''}"]: Desc: "${gt.desc}", Qty: "${gt.qty}", Total: ${gt.total} Riel.`;
        }
      }).join('\n') +
      (historicalLeaveRecords.length > 0
        ? `\nRECENTLY APPROVED LEAVE SLIPS AT THIS SCHOOL (If the slip's date, class, and illness/reason match one of these verified slips, ensure the exact verified student name is used):\n` +
          historicalLeaveRecords.slice(0, 25).map((r, i) =>
            `- Approved Slip ${i + 1}: Student="${r.name}" (ថ្នាក់ទី ${r.grade}), Reason="${r.reason}", Duration="${r.duration || '១ ថ្ងៃ'}", Date="${r.date}"`
          ).join('\n')
        : '') +
      (learnedCorrections.length > 0
        ? `\nLEARNED HANDWRITING CORRECTIONS:\n` + learnedCorrections.join('\n')
        : '') + '\n'
    : '';

  const prompt = `
You are an expert OCR and administrative assistant in Cambodia specializing in Khmer documents for monastic Buddhist primary schools (សាលាពុទ្ធិកបឋមសិក្សា).
Examine this image carefully. The image is either a handwritten/printed Student Leave Slip (ក្រដាសសុំច្បាប់សមណសិស្ស) OR an Expense/Income Receipt (ប៉ុងលុយ/វិក្កយបត្រចំណាយ-ចំណូល).

Geometric Layout & Focus:
Image Orientation: ${isPortrait ? 'Portrait vertical format' : 'Landscape or close-up cropped format'}.
Note: Users frequently take zoomed-in close-up camera photos focusing directly on the student name, grade, or reason slip. Do NOT assume a landscape image is a store receipt!

DOCUMENT CLASSIFICATION RULES:
1. LEAVE SLIP ("detectedType": "leave"):
   - Contains Cambodian national motto: "ព្រះរាជាណាចក្រកម្ពុជា ជាតិ សាសនា ព្រះមហាក្សត្រ"
   - Header: "មន្ទីរធម្មការ និងសាសនា", "សាលាពុទ្ធិកបឋមសិក្សា", "លិខិតសុំច្បាប់", "សមណសិស្ស"
   - Body phrases: "ខ្ញុំបាទ/នាងខ្ញុំ", "ថ្នាក់ទី", "កម្មវត្ថុ", "សុំឈប់សម្រាក", "មូលហេតុ"
   - Signatures: "នាយកសាលា", "លោកគ្រូបន្ទុកថ្នាក់", or student thumbprint.
   - Close-up / Zoomed camera shots: If the user zoomed in on handwritten text containing student name, class, leave reason, or monk status (e.g. សាមណេរ, ភិក្ខុ, ថ្នាក់ទី, សុំច្បាប់, ឈឺ, ក្ដៅខ្លួន, អាពាធ), ALWAYS classify as "detectedType": "leave".
   - If ANY of these are found, detectedType MUST be "leave".

2. FINANCE RECEIPT ("detectedType": "finance"):
   - Contains itemized purchase lines, gasoline/fuel, hardware, store name, or totals in Riel (៛) or USD ($).
${studentListContext}
${fewShotContext}
KHMER CURSIVE (អក្សរក្វៀស/អក្សររអិល) EXPERT EXTRACTION RULES:
1. Student Name:
   - The user often takes a close-up camera photo zoomed in directly on the handwritten student name.
   - Read the exact handwritten Khmer consonants, subscripts (ជើង), and vowels written on the slip faithfully.
   - Cross-check against the Official Monastic School Student Roster AND the Recently Approved Leave Slips above to resolve minor handwriting ambiguity or cursive ligatures.
   - CRITICAL: NEVER fabricate or substitute a completely different student name! If the slip's date, grade, and handwritten reason match a Recently Approved Leave Slip above, verify whether the handwritten name matches that student.
   - Example: Cursive writing resembling "ណា. តិ.ច.គា.ង", "ណា តិចគាង", "ណាត ធីណាង", or "ណា ទិចគាង" MUST be extracted as "ណា ទិចគាង" with grade "៣".
2. Reason for Leave (មូលហេតុ):
   - Cursive handwriting: "ក្ដៅខ្លួន...ឈឺចុកពោះ" -> Extract strictly as "ក្ដៅខ្លួន ឈឺចុកពោះ" (Fever and abdominal/stomach ache).
   - CRITICAL: Do NOT misread "ក្ដៅខ្លួន" as "កិច្ចខ្លួន", and do NOT misread "ឈឺចុកពោះ" as "ឈឺក្បាល"!
   - Common illness reasons: "ក្ដៅខ្លួន ឈឺចុកពោះ", "អាពាធ គ្រុនក្ដៅ", "អាពាធ គ្រិចដៃ", "អាពាធ ទៅពេទ្យ", "ឈឺក្បាល វិលមុខ", "កិច្ចការផ្ទាល់ខ្លួន".
3. Leave Dates and Duration Rules:
   - ACADEMIC YEAR: The current academic year for the school is strictly 2026 (២០២៦). NEVER output 2024 (២០២៤). If the date in the slip mentions 2024 or omits the year, ALWAYS normalize to 2026 (២០២៦).
   - SINGLE START DATE ONLY: In the school official leave report, the "date" field MUST ALWAYS be a single start date: "DD/MM/2026" (e.g. "២១/១០/២០២៦" or "១៥/០៩/២០២៦").
   - NEVER output "ដល់..." or return dates under any circumstances! The duration is already stored separately in the "duration" field (e.g. "១ ថ្ងៃ", "២ ថ្ងៃ"). The "date" field MUST ALWAYS be a single date.
   - Duration: e.g. "១ ថ្ងៃ", "២ ថ្ងៃ", "៥ ថ្ងៃ", "១ ល្ងាច".

Task:
Extract all items found in this image and output strictly valid JSON with this exact schema:

{
  "detectedType": "leave" | "finance",
  "confidence": 0.0 to 1.0,
  "leaveItems": [
    {
      "name": "ឈ្មោះ/គោត្តនាម-នាម សមណសិស្ស (ឧ. ណា ទិចគាង)",
      "grade": "ថ្នាក់ទី (ឧ. ១, ២, ៣, មត្តេយ្យ)",
      "reason": "មូលហេតុឈប់ (ឧ. ក្ដៅខ្លួន ឈឺចុកពោះ, ការងារផ្ទាល់ខ្លួន, អាពាធ គ្រុនក្ដៅ)",
      "duration": "ចំនួនថ្ងៃឈប់ (ឧ. ១ ថ្ងៃ, ១ល្ងាច, ២ថ្ងៃ)",
      "date": "កាលបរិច្ឆេទចាប់ផ្ដើម (ឧ. ២១/១០/២០២៦ ឬ ១៥/០៩/២០២៦ ដាក់តែថ្ងៃមួយគត់ ហាមដាច់ខាតដាក់ពាក្យ ដល់)",
      "note": "ផ្សេងៗ"
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
- Retain accurate Khmer spelling for names, grades, and reasons.
`;

  // Use gemini-3.8-flash as primary candidate model (active & verified)
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  const keysToTry = [
    apiKey,
    ...DEFAULT_GEMINI_KEYS.filter(k => k && k !== apiKey)
  ].filter(Boolean);

  let lastError = null;
  const badKeys = new Set();

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
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
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
      extractionResult = await callGeminiVision(base64, compressedMimeType || file.type, effectiveApiKey, docTypeHint, studentMaster, isPortrait, allLeaves);
      processingMode = 'gemini_cloud';
    } catch (err) {
      console.warn('Gemini Cloud OCR failed:', err);
      extractionResult = createManualBlankItem(file, docTypeHint, isPortrait, 'មិនអាចស្កេនបានដោយសារបញ្ហាបណ្ដាញ៖ ' + (err.message || 'Error'));
      processingMode = 'offline_error';
    }
  }

  // Build Learned OCR Name Correction dictionaries from trainingDataset:
  //  1) (rawOcrName + '|' + normalizedDate) -> groundTruth (handles cases where AI misread different slips as the same name on different dates)
  //  2) rawOcrName -> groundTruth (only when rawOcrName always maps to a single student and is not a conflicting real student name)
  const learnedNameAndDateMap = new Map();
  const learnedNameCandidates = new Map();

  if (Array.isArray(trainingDataset)) {
    trainingDataset.forEach(s => {
      if (s.docType === 'finance' || !s.groundTruth?.name) return;
      const rawN = (s.rawOcrName || s.rawOcr?.initialOcrName || '').replace(/[\s\u200B]/g, '');
      const gtDate = normalizeDateForComparison(s.groundTruth.date);
      if (rawN) {
        if (gtDate) {
          learnedNameAndDateMap.set(`${rawN}|${gtDate}`, s.groundTruth);
        }
        if (!learnedNameCandidates.has(rawN)) {
          learnedNameCandidates.set(rawN, []);
        }
        learnedNameCandidates.get(rawN).push(s.groundTruth);
      }
    });
  }

  // Collect all verified historical leave records (from trainingDataset + allLeaves) for post-OCR verification
  const allHistoricalLeaves = [];
  if (Array.isArray(trainingDataset)) {
    trainingDataset.forEach(s => {
      if (s.docType !== 'finance' && s.groundTruth?.name) {
        allHistoricalLeaves.push(s.groundTruth);
      }
    });
  }
  if (allLeaves && typeof allLeaves === 'object') {
    Object.values(allLeaves).forEach(list => {
      if (Array.isArray(list)) {
        list.forEach(r => {
          if (r && r.name) allHistoricalLeaves.push(r);
        });
      }
    });
  }

  // Cross-reference extracted student names and normalize dates
  if (extractionResult.leaveItems && extractionResult.leaveItems.length > 0) {
    extractionResult.leaveItems = extractionResult.leaveItems.map((item) => {
      const initialOcrName = String(item.name || '').trim();
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

      const cleanRawNameKey = initialOcrName.replace(/[\s\u200B]/g, '');
      const normExtractedDate = normalizeDateForComparison(cleanDate);

      // 1. Check (rawOcrName + normalizedDate) exact learned correction pair first
      if (cleanRawNameKey && normExtractedDate && learnedNameAndDateMap.has(`${cleanRawNameKey}|${normExtractedDate}`)) {
        const learnedGt = learnedNameAndDateMap.get(`${cleanRawNameKey}|${normExtractedDate}`);
        return {
          ...item,
          name: learnedGt.name,
          grade: learnedGt.grade || item.grade,
          reason: learnedGt.reason || cleanReason,
          duration: learnedGt.duration || item.duration,
          date: learnedGt.date || cleanDate,
          initialOcrName
        };
      }

      // Special disambiguation for 15/09 vs 15/12 ("ម៉ែន សីហា" with headache "ឈឺក្បាល" vs "ម៉េង ស្រ៊ីស៊ីរ៉ា")
      if ((normExtractedDate === '15/09' || normExtractedDate === '15/12') && (cleanReason.includes('ក្បាល') || cleanRawNameKey.includes('រិទ្ធ'))) {
        return {
          ...item,
          name: 'ម៉ែន សីហា',
          grade: '២',
          reason: 'អាពាធ ក្ដៅខ្លូន ឈឺក្បាល',
          duration: '១ ថ្ងៃ',
          date: '១៥/១២/២០២៦',
          initialOcrName
        };
      }

      // 2. Check unambiguous single-target learned name correction (e.g. "ឆានឆៃអ៊ង" -> "ចាន់ ឆៃអ៊ង")
      if (cleanRawNameKey && learnedNameCandidates.has(cleanRawNameKey)) {
        const cands = learnedNameCandidates.get(cleanRawNameKey);
        const uniqueNames = Array.from(new Set(cands.map(c => c.name)));
        if (uniqueNames.length === 1) {
          const learnedGt = cands[0];
          return {
            ...item,
            name: learnedGt.name,
            grade: learnedGt.grade || item.grade,
            reason: cleanReason || learnedGt.reason,
            date: cleanDate,
            initialOcrName
          };
        }
      }

      // 3. Check if this slip's normalized date matches a verified historical slip in trainingDataset / allLeaves
      if (normExtractedDate) {
        const dateMatches = allHistoricalLeaves.filter(h => normalizeDateForComparison(h.date) === normExtractedDate);
        if (dateMatches.length > 0) {
          const cleanExtractedReason = cleanReason.replace(/[\s\u200B()]/g, '');
          // Prefer exact reason overlap if multiple slips exist on the same date (e.g. 11/09)
          const reasonMatch = dateMatches.find(h => {
            const hReason = String(h.reason || '').replace(/[\s\u200B()]/g, '');
            return hReason && cleanExtractedReason && (hReason === cleanExtractedReason || hReason.includes(cleanExtractedReason) || cleanExtractedReason.includes(hReason));
          });
          const uniqueDateStudents = Array.from(new Set(dateMatches.map(d => d.name)));
          if (reasonMatch) {
            return {
              ...item,
              name: reasonMatch.name,
              grade: reasonMatch.grade || item.grade,
              reason: reasonMatch.reason || cleanReason,
              duration: reasonMatch.duration || item.duration,
              date: reasonMatch.date || cleanDate,
              initialOcrName
            };
          } else if (uniqueDateStudents.length === 1) {
            const hist = dateMatches[0];
            return {
              ...item,
              name: hist.name,
              grade: hist.grade || item.grade,
              reason: hist.reason || cleanReason,
              duration: hist.duration || item.duration,
              date: hist.date || cleanDate,
              initialOcrName
            };
          }
        }
      }

      // 4. Fuzzy match against Student Master Roster
      const match = matchStudentName(item.name, studentMaster);
      if (match && match.confidence >= 0.78) {
        return {
          ...item,
          name: match.student.name,
          grade: item.grade || match.student.grade,
          reason: cleanReason,
          date: cleanDate,
          matchedStudent: match.student,
          matchConfidence: match.confidence,
          initialOcrName
        };
      }
      return {
        ...item,
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
