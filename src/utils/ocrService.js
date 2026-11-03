// Hybrid OCR & Multimodal Vision Service for Leave Slips and Receipts
import {
  matchStudentName,
  normalizeStudentGrade,
  cleanHandwrittenStudentName,
  computeKhmerNameSimilarity
} from './studentMaster';
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
 * Rotate a dataUrl image by 90, 180, or 270 degrees clockwise on an HTML5 Canvas.
 * Returns { dataUrl, base64, width, height, rotatedDegrees }.
 */
export function rotateImageDataUrl(dataUrl, degreesClockwise = 0) {
  const normDeg = ((degreesClockwise % 360) + 360) % 360;
  if (!dataUrl || normDeg === 0) {
    const base64 = dataUrl ? dataUrl.split(',')[1] || '' : '';
    return Promise.resolve({ dataUrl, base64, rotatedDegrees: 0 });
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }

        const swapDims = normDeg === 90 || normDeg === 270;
        const canvas = document.createElement('canvas');
        canvas.width = swapDims ? h : w;
        canvas.height = swapDims ? w : h;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((normDeg * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const rotatedBase64 = rotatedDataUrl.split(',')[1] || '';
        resolve({
          dataUrl: rotatedDataUrl,
          base64: rotatedBase64,
          width: canvas.width,
          height: canvas.height,
          rotatedDegrees: normDeg
        });
      } catch (e) {
        console.warn('Image rotation failed:', e);
        resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
      }
    };
    img.onerror = () => resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
    img.src = dataUrl;
  });
}

/**
 * Automatically detect when a photographed Leave Slip is rotated 90° sideways (e.g. phone camera portrait capture
 * where the horizontal slip's text lines run vertically) and rotate it upright (Landscape, top header at top)
 * to match the clean horizontal preview format.
 */
export function autoOrientDocumentImage(dataUrl, docTypeHint = 'auto') {
  return new Promise((resolve) => {
    if (!dataUrl || docTypeHint === 'finance') {
      return resolve({ dataUrl, base64: dataUrl ? dataUrl.split(',')[1] || '' : '', rotatedDegrees: 0 });
    }

    const img = new Image();
    img.onload = async () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }

        const S = 240;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, S, S);
        const pixels = ctx.getImageData(0, 0, S, S).data;

        const lum = new Float32Array(S * S);
        for (let i = 0; i < S * S; i++) {
          const p = i * 4;
          lum[i] = pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114;
        }

        // 1. Measure Row-to-Row vs Column-to-Column Line Modulation in center document area (12%..88%)
        const start = Math.round(S * 0.12);
        const end = Math.round(S * 0.88);
        const span = end - start;

        const rowAvg = new Float32Array(S);
        const colAvg = new Float32Array(S);
        for (let y = start; y < end; y++) {
          let rSum = 0;
          for (let x = start; x < end; x++) {
            rSum += lum[y * S + x];
          }
          rowAvg[y] = rSum / span;
        }
        for (let x = start; x < end; x++) {
          let cSum = 0;
          for (let y = start; y < end; y++) {
            cSum += lum[y * S + x];
          }
          colAvg[x] = cSum / span;
        }

        let horizLineMod = 0;
        let vertLineMod = 0;
        for (let i = start + 1; i < end; i++) {
          horizLineMod += Math.abs(rowAvg[i] - rowAvg[i - 1]);
          vertLineMod += Math.abs(colAvg[i] - colAvg[i - 1]);
        }

        // 2. Measure Quadrant Text Edge Energy to know whether the top header is on the Right side or Left side
        const quadEnergy = (x0, x1, y0, y1) => {
          let energy = 0;
          for (let y = y0 + 1; y < y1; y++) {
            for (let x = x0 + 1; x < x1; x++) {
              const idx = y * S + x;
              const dx = Math.abs(lum[idx] - lum[idx - 1]);
              const dy = Math.abs(lum[idx] - lum[idx - S]);
              if (dx + dy > 22) {
                energy += dx + dy;
              }
            }
          }
          return energy;
        };

        const topLeftE = quadEnergy(20, 110, 20, 110);
        const topRightE = quadEnergy(130, 220, 20, 110);
        const bottomLeftE = quadEnergy(20, 110, 130, 220);
        const bottomRightE = quadEnergy(130, 220, 130, 220);

        const isPortraitFrame = h > w * 1.05;
        // A leave slip is sideways if captured in a portrait frame with vertical text lines, or if vertical line modulation strongly dominates
        const isSideways =
          (isPortraitFrame && vertLineMod >= horizLineMod * 0.72) ||
          vertLineMod > horizLineMod * 1.22;

        if (!isSideways) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }

        // Determine whether top of slip ("ព្រះរាជាណាចក្រកម្ពុជា" & "មន្ទីរធម្មការ") is on the RIGHT edge (needs 270° CCW) or LEFT edge (needs 90° CW).
        // When top of slip is on the RIGHT edge (standard phone camera tilt), Top-Right has the dense Ministry header while Top-Left is the blank bottom-left corner of the slip.
        const scoreTopOnRight = (topRightE * 1.15 + bottomRightE * 0.75) - (topLeftE * 0.85);
        const scoreTopOnLeft = (bottomLeftE * 1.15 + topLeftE * 0.75) - (bottomRightE * 0.85);

        const degreesToRotate = scoreTopOnRight >= scoreTopOnLeft * 0.90 ? 270 : 90;
        console.log(`🔄 [Auto-Orient] Sideways Leave Slip detected (w=${w}, h=${h}, vMod=${Math.round(vertLineMod)}, hMod=${Math.round(horizLineMod)}) → rotating ${degreesToRotate}° clockwise to upright landscape`);

        const rotated = await rotateImageDataUrl(dataUrl, degreesToRotate);
        resolve(rotated);
      } catch (e) {
        console.warn('Auto-orient analysis failed:', e);
        resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
      }
    };
    img.onerror = () => resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
    img.src = dataUrl;
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
 * Dedicated 3x Super-Zoom Crop on Line 1 of a Leave Slip (Student Name & Grade Line: y: 15%..40%, x: 4%..96%).
 * Works on BOTH Portrait and Landscape photos!
 * Isolates "ខ្ញុំបាទសមណសិស្សឈ្មោះ [NAME] អាយុ [AGE] ឆ្នាំ ជាសមណសិស្សថ្នាក់ទី [GRADE]" and upscales to >=1600px width
 * with enhanced ballpoint pen contrast so Gemini Vision allocates 10x more visual tokens to the student's name.
 */
export function cropLeaveSlipNameLineZone(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve('');
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return resolve('');

        // Crop the upper-middle student identity band (Line 1 below "លិខិតសុំច្បាប់") on BOTH Portrait and Landscape photos
        const sx = Math.round(w * 0.04);
        const sy = Math.round(h * 0.15);
        const sw = Math.max(1, Math.round(w * 0.92));
        const sh = Math.max(1, Math.round(h * 0.25));

        // Upscale width to at least 1600px (up to 2000px) so small cursive Khmer subscripts & vowels are magnified 2.5x-3x
        const targetW = Math.min(2000, Math.max(1600, Math.round(sw * 2.2)));
        const scale = targetW / sw;
        const targetH = Math.max(1, Math.round(sh * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Boost ballpoint pen ink contrast & saturation against paper background
        ctx.filter = 'contrast(1.22) saturate(1.20)';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(croppedDataUrl.split(',')[1] || '');
      } catch (e) {
        console.warn('Name-line super-zoom crop failed:', e);
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

/**
 * Auto-Crop & Contrast-Boost the Student Pen-Ink Zone on a Leave Slip (y: 15%..68%, x: 3%..97%).
 * Works on BOTH Portrait and Landscape photos!
 * Cuts out the top printed national/ministry header and bottom teacher/director signatures,
 * zooming into all 5 handwritten ballpoint pen ink lines (Name, Grade, Duration, Date, Reason).
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

        // Crop middle pen-ink zone on BOTH Portrait and Landscape leave slip photos
        const sx = Math.round(w * 0.03);
        const sy = Math.round(h * 0.15);
        const sw = Math.max(1, Math.round(w * 0.94));
        const sh = Math.max(1, Math.round(h * 0.54));

        const targetW = Math.min(1800, Math.max(1400, Math.round(sw * 1.5)));
        const scale = targetW / sw;
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
async function callGeminiVision(
  base64Data,
  mimeType,
  apiKey,
  docTypeHint,
  studentMaster,
  isPortrait = true,
  penInkCropBase64 = '',
  nameLineCropBase64 = ''
) {
  const studentListContext = buildGradeGroupedRosterPrompt(studentMaster);

  const prompt = `
You are an expert OCR and administrative assistant in Cambodia specializing in Khmer documents for monastic Buddhist primary schools (សាលាពុទ្ធិកបឋមសិក្សា).
Examine the provided image(s) carefully. The document is either a Student Leave Slip (ក្រដាសសុំច្បាប់សមណសិស្ស) OR an Expense/Income Receipt (ប៉ុងលុយ/វិក្កយបត្រចំណាយ-ចំណូល).
${nameLineCropBase64 ? 'Note: Image 1 is the full document. Image 2 is a 3x SUPER-ZOOMED close-up of Line 1 (where the Student Name and Grade are written in pen ink). Image 3 is a zoomed close-up of the middle fill-in section.' : ''}

STEP 1 — DOCUMENT CLASSIFICATION RULES:
1. LEAVE SLIP ("detectedType": "leave"):
   - Contains Cambodian national motto, "មន្ទីរធម្មការ និងសាសនា", "សាលាពុទ្ធិកបឋមសិក្សា", "លិខិតសុំច្បាប់", "សមណសិស្ស", "ខ្ញុំបាទ/នាងខ្ញុំ", "ថ្នាក់ទី", "កម្មវត្ថុ", "សុំឈប់សម្រាក", "មូលហេតុ", or close-up handwritten student name/class/illness reason.
2. FINANCE RECEIPT ("detectedType": "finance"):
   - Contains itemized store purchase lines, gasoline/fuel, hardware, store name, or totals in Riel (៛) or USD ($).

STEP 2 — IF THE DOCUMENT IS A LEAVE SLIP ("detectedType": "leave"):
CRITICAL PEN-INK ONLY FOCUS & LINE-BY-LINE ANATOMY RULE (ច្បាប់មើលតែអក្សរទឹកប៊ិចតាមបន្ទាត់នីមួយៗ):
- On a Leave Slip, 90% of the page is black printed template text (អក្សរពុម្ពខ្មៅ). IGNORE all printed template words and IGNORE the bottom signature ("ហត្ថលេខា/ស្នាមមេដៃសាមីខ្លួន").
- Understand the EXACT Line-by-Line Anatomy below the heading "លិខិតសុំច្បាប់":
  * LINE 1 (បន្ទាត់ទី ១ — កន្លែងសរសេរឈ្មោះសិស្ស និងថ្នាក់ទី):
    Printed template: "ខ្ញុំបាទសមណសិស្សឈ្មោះ ........................ អាយុ ....... ឆ្នាំ ជាសមណសិស្សថ្នាក់ទី ....... នៃសាលា"
    -> THE STUDENT'S NAME IS WRITTEN IN PEN INK STRICTLY ON LINE 1, in the blank space immediately after "ខ្ញុំបាទសមណសិស្សឈ្មោះ" and before "អាយុ"!
  * LINE 2 (បន្ទាត់ទី ២ — គ្រោះថ្នាក់! ជាឈ្មោះវត្ត/សាលា ហាមអានយកមកធ្វើជាឈ្មោះសិស្សដាច់ខាត!):
    Printed template: "ពុទ្ធិកបឋមសិក្សា ........................................................ ។"
    -> WARNING: On Line 2 (directly underneath the student's name!), the student writes the school/monastery name in pen ink, such as "វត្តខេមវ័ន (បឹងកុក)" or "ហ៊ុន ណេង".
    -> NEVER read or blend the pen-ink letters of "វត្តខេមវ័ន (បឹងកុក)" on Line 2 into the student's name! (For example, NEVER misread "វត្ត" on Line 2 as "ចិត្រា" or "ជួង ចិត្រា"!).
  * LINE 3 (បន្ទាត់ទី ៣):
    Printed template: "តាមរយៈ ៖ លោកគ្រូបន្ទុកថ្នាក់ទី ......." -> The grade is written a second time here in pen ink.

- Extract the Pen-Ink handwritten values in this exact step-by-step order:
  1. PEN-INK GRADE ("grade"):
     - Read the grade written in pen ink after "ជាសមណសិស្សថ្នាក់ទី ..." (Line 1) and "លោកគ្រូបន្ទុកថ្នាក់ទី ..." (Line 3).
     - Output "មត្តេយ្យ", "១", "២", or "៣".
  2. PEN-INK SURNAME & GIVEN NAME ON LINE 1 ("surnamePenInk", "givenNamePenInk", "rawHandwrittenName"):
     - Look at Image 2 (the 3x Super-Zoomed strip of Line 1) right after the printed word "ខ្ញុំបាទសមណសិស្សឈ្មោះ" and before "អាយុ".
     - Read ONLY the top handwritten line (Line 1), completely ignoring "វត្តខេមវ័ន (បឹងកុក)" below it.
     - Read the first word / surname ("surnamePenInk", e.g. "មី", "ម៉េង", "លី", "ឡាយ", "ឃិន", "ចាន់", "អ៊ុន", "ណា", "ឆាន") and the second word / given name ("givenNamePenInk", e.g. "ស៊ីនូ", "ទី", "ពីន", "ប៊ុនយ៉ុង", "សារ៉េន", "តិចគាង").
     - Combine them into "rawHandwrittenName": the literal character-by-character transcription of the pen ink on Line 1 BEFORE looking at the roster.
  3. PEN-INK MATCHED STUDENT NAME ("topNameCandidates" & "name"):
     - Look ONLY at the students in the extracted "grade" within the Official Monastic School Student Roster below.
     - Find which student in that grade has Khmer consonants, subscripts, and vowels that genuinely match "surnamePenInk" + "givenNamePenInk" ("rawHandwrittenName").
     - List up to 3 closest visual matches in "topNameCandidates", and put the single best match in "name".
     - STRICT ANTI-GUESSING RULE: NEVER pick "ជួង ចិត្រា" or any other roster name unless the pen ink on Line 1 actually starts with those consonants! For example, if Line 1 pen ink has 2 short words starting with "ម" and "ស" (like "មី ស៊ីនូ"), you MUST match "មី ស៊ីនូ", NOT "ជួង ចិត្រា"!
  4. PEN-INK DURATION ("duration"):
     - Read the pen ink written after "សំណើសុំច្បាប់ចំនួន ......" (e.g. "១ ថ្ងៃ", "២ ថ្ងៃ", "១ ព្រឹក", "១ ល្ងាច").
  5. PEN-INK START DATE ("date"):
     - Read the pen ink written on "គិតចាប់ពីថ្ងៃទី... ខែ... ឆ្នាំ..." and format as a single start date "DD/MM/២០២៦" in Khmer numerals (e.g. "២១/១០/២០២៦").
     - Academic year is strictly 2026 (២០២៦). NEVER include "ដល់..." or end dates.
  6. PEN-INK REASON ("reason"):
     - Read the pen ink written after "មូលហេតុ ៖ ........................" (e.g. "ក្ដៅខ្លួន", "ក្ដៅខ្លួន ឈឺចុកពោះ", "អាពាធ គ្រុនក្ដៅ", "អាពាធ ឈឺក្បាល").
${studentListContext}
Task:
Output strictly valid JSON with this exact schema:

{
  "detectedType": "leave" | "finance",
  "confidence": 0.0 to 1.0,
  "leaveItems": [
    {
      "surnamePenInk": "នាមត្រកូលទឹកប៊ិចលើបន្ទាត់ទី១ (ពាក្យទី១)",
      "givenNamePenInk": "នាមខ្លួនទឹកប៊ិចលើបន្ទាត់ទី១ (ពាក្យទី២)",
      "rawHandwrittenName": "តួអក្សរទឹកប៊ិចឆៅពេញលេញដែលអានឃើញផ្ទាល់លើបន្ទាត់ទី១ (ហាមលាយបន្ទាត់ទី២ វត្តខេមវ័ន)",
      "topNameCandidates": ["បេក្ខភាពឈ្មោះទី១", "បេក្ខភាពឈ្មោះទី២"],
      "name": "ឈ្មោះសមណសិស្សដែលត្រូវនឹងតួអក្សរទឹកប៊ិចពិតប្រាកដក្នុងថ្នាក់នោះ",
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

  // Attach Image 2: 3x Super-Zoomed Student Name & Grade Line 1 crop
  if (nameLineCropBase64 && docTypeHint !== 'finance') {
    messageParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: nameLineCropBase64
      }
    });
  }

  // Attach Image 3: Zoomed Middle Pen-Ink Fill-In Section crop
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
  const isLeave = docTypeHint !== 'finance';
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
export async function processUploadedImage(file, { docTypeHint = 'auto', apiKey = '', studentMaster = [], allLeaves = {}, preOrientedDataUrl = '' } = {}) {
  // Step 0: Read raw file → auto-orient sideways camera photos upright (like Image 3) → compute 512-bit Visual Image Fingerprint
  let rawDataUrl = preOrientedDataUrl;
  if (!rawDataUrl) {
    const { dataUrl: initialDataUrl } = await fileToBase64(file);
    const oriented = await autoOrientDocumentImage(initialDataUrl, docTypeHint);
    rawDataUrl = oriented.dataUrl || initialDataUrl;
  }
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

  // Step 2B: For Leave Slips (BOTH Portrait and Landscape), generate:
  //   1) 3x Super-Zoomed Student Name & Grade Line 1 crop (nameLineCropBase64)
  //   2) Middle 5-Line Pen-Ink Fill-In section crop (penInkCropBase64)
  const [nameLineCropBase64, penInkCropBase64] = (docTypeHint !== 'finance')
    ? await Promise.all([
        cropLeaveSlipNameLineZone(rawDataUrl),
        cropLeaveSlipPenInkZone(rawDataUrl)
      ])
    : ['', ''];

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
        penInkCropBase64,
        nameLineCropBase64
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

  // Cross-reference extracted pen-ink student names (Raw Pen-Ink First + Grade-Scoped Two-Syllable Matching)
  if (extractionResult.leaveItems && extractionResult.leaveItems.length > 0) {
    extractionResult.leaveItems = extractionResult.leaveItems.map((item) => {
      const combinedPenParts = cleanHandwrittenStudentName(
        [item.surnamePenInk, item.givenNamePenInk].filter(Boolean).join(' ')
      );
      const rawHandwritten = cleanHandwrittenStudentName(item.rawHandwrittenName || combinedPenParts || '');
      const cleanedPrimaryName = cleanHandwrittenStudentName(item.name || rawHandwritten || '');
      const initialOcrName = rawHandwritten || cleanedPrimaryName;
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

      // 2. RAW PEN-INK FIRST MATCHING:
      //    Never let a guessed roster name in `item.name` win with fake 1.0 confidence if `rawHandwritten` matches a different student!
      const matchRaw = rawHandwritten
        ? matchStudentName(rawHandwritten, studentMaster, normGrade)
        : null;
      const matchParts = (combinedPenParts && combinedPenParts !== rawHandwritten)
        ? matchStudentName(combinedPenParts, studentMaster, normGrade)
        : null;
      const bestRawMatch = (matchRaw && matchParts)
        ? (matchRaw.confidence >= matchParts.confidence ? matchRaw : matchParts)
        : (matchRaw || matchParts);

      const matchPrimary = cleanedPrimaryName
        ? matchStudentName(cleanedPrimaryName, studentMaster, normGrade)
        : null;

      // Also evaluate topNameCandidates against rawHandwritten if provided
      let bestCandidateMatch = null;
      if (Array.isArray(item.topNameCandidates) && rawHandwritten) {
        let highestCandScore = 0;
        for (const cand of item.topNameCandidates) {
          const cleanCand = cleanHandwrittenStudentName(cand);
          const mCand = matchStudentName(cleanCand, studentMaster, normGrade);
          if (mCand) {
            const simToRaw = computeKhmerNameSimilarity(rawHandwritten, mCand.student.name);
            const totalCandScore = (mCand.confidence * 0.45) + (simToRaw * 0.55);
            if (totalCandScore > highestCandScore) {
              highestCandScore = totalCandScore;
              bestCandidateMatch = mCand;
            }
          }
        }
      }

      let bestMatch = null;
      if (bestRawMatch && matchPrimary) {
        if (bestRawMatch.student.name === matchPrimary.student.name) {
          bestMatch = matchPrimary.confidence >= bestRawMatch.confidence ? matchPrimary : bestRawMatch;
        } else {
          // Different students! Compare which student's name actually resembles the raw handwritten pen ink!
          const simRawStudent = computeKhmerNameSimilarity(rawHandwritten, bestRawMatch.student.name);
          const simPrimaryStudent = computeKhmerNameSimilarity(rawHandwritten, matchPrimary.student.name);
          bestMatch = simRawStudent >= simPrimaryStudent ? bestRawMatch : matchPrimary;
        }
      } else {
        bestMatch = bestRawMatch || bestCandidateMatch || matchPrimary;
      }

      if (bestMatch && bestMatch.confidence >= 0.72) {
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
        name: rawHandwritten || cleanedPrimaryName || item.name,
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
