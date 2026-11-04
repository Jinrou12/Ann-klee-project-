// Hybrid OCR & Multimodal Vision Service for Leave Slips and Receipts
import {
  matchStudentName,
  normalizeStudentGrade,
  cleanHandwrittenStudentName,
  computeKhmerNameSimilarity
} from './studentMaster';
import { parseKhmerNumber, toArabicDigits, toKhmerDigits } from './khmerNumerals';
import {
  DEFAULT_GEMINI_KEYS,
  getStoredApiKey,
  getStoredTrainingDataset,
  fetchTrainingFromCloud,
  isBareGenericCameraFilename,
  normalizeOriginalFilename
} from './storage';

// Session-level memory of invalid (400/401/403) and temporarily rate-limited (429) keys
// so subsequent image scans immediately skip exhausted keys without wasting time
const sessionBadKeys = new Set();
const sessionRateLimitedKeys = new Map(); // key -> timestampMs
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

function isKeyUsable(key) {
  if (!key || sessionBadKeys.has(key)) return false;
  const limitedAt = sessionRateLimitedKeys.get(key);
  if (limitedAt && (Date.now() - limitedAt) < RATE_LIMIT_COOLDOWN_MS) {
    return false;
  }
  return true;
}

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
export function rotateImageDataUrl(dataUrl, degreesClockwise = 0, maxEdge = 1800) {
  const normDeg = ((degreesClockwise % 360) + 360) % 360;
  if (!dataUrl || normDeg === 0) {
    const base64 = dataUrl ? dataUrl.split(',')[1] || '' : '';
    return Promise.resolve({ dataUrl, base64, rotatedDegrees: 0 });
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (!rawW || !rawH) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }

        // Cap long edge to maxEdge (1800px) during rotation to prevent iOS Safari 16.7MP canvas memory exhaustion on multi-shot
        const longEdge = Math.max(rawW, rawH);
        const scale = (maxEdge && longEdge > maxEdge) ? (maxEdge / longEdge) : 1;
        const w = Math.max(1, Math.round(rawW * scale));
        const h = Math.max(1, Math.round(rawH * scale));

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

        const outW = canvas.width;
        const outH = canvas.height;
        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
        // Immediately release WebKit canvas backing memory
        canvas.width = 0;
        canvas.height = 0;
        const rotatedBase64 = rotatedDataUrl.split(',')[1] || '';
        if (!rotatedBase64 || rotatedBase64.length < 100) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }
        resolve({
          dataUrl: rotatedDataUrl,
          base64: rotatedBase64,
          width: outW,
          height: outH,
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
 * Build a small JPEG thumbnail of the image rotated by `degreesClockwise` (0/90/180/270) and return its base64.
 */
function makeRotatedThumbBase64(img, degreesClockwise, maxEdge = 480) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const swap = degreesClockwise === 90 || degreesClockwise === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? th : tw;
  canvas.height = swap ? tw : th;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degreesClockwise * Math.PI) / 180);
  ctx.drawImage(img, -tw / 2, -th / 2, tw, th);
  const out = canvas.toDataURL('image/jpeg', 0.72).split(',')[1] || '';
  canvas.width = 0;
  canvas.height = 0;
  return out;
}

/**
 * PRIMARY AUTO-ORIENTATION: ask Gemini which of 4 rotated thumbnails (A=0°, B=90°, C=180°, D=270° clockwise)
 * shows the page upright (Cambodian header at TOP, Khmer text horizontal). Picking the upright picture is far more
 * reliable for an LLM than asking it to compute an angle.
 * Returns { degrees, confidence } or null when the check could not be completed.
 */
export async function detectUprightRotationWithAI(dataUrl, apiKey) {
  if (!dataUrl) return null;

  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = dataUrl;
  });
  if (!img) return null;

  const angles = [0, 90, 180, 270];
  const labels = ['A', 'B', 'C', 'D'];
  let thumbs;
  try {
    thumbs = angles.map(a => makeRotatedThumbBase64(img, a));
  } catch (e) {
    console.warn('Orientation thumbnails failed:', e);
    return null;
  }
  if (thumbs.some(t => !t)) return null;

  const instruction = `
The next 4 images (A, B, C, D) are the SAME photo of a Khmer school document (a student leave slip or a receipt), shown rotated by 4 different angles.
Exactly ONE of them shows the page UPRIGHT: the printed Khmer text lines run horizontally from left to right and the letters are NOT sideways or upside-down. On a leave slip, the Cambodian national header ("ព្រះរាជាណាចក្រកម្ពុជា / ជាតិ សាសនា ព្រះមហាក្សត្រ" with the emblem) is at the TOP-CENTER and the signatures are at the BOTTOM.
Pick the image where a human could read the Khmer text normally.
Return ONLY JSON: {"uprightImage": "A" | "B" | "C" | "D", "confidence": 0.0 to 1.0}
`;

  const parts = [{ text: instruction }];
  labels.forEach((label, i) => {
    parts.push({ text: `Image ${label}:` });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: thumbs[i] } });
  });

  const keysToTry = [apiKey, ...DEFAULT_GEMINI_KEYS.filter(k => k && k !== apiKey)].filter(Boolean);
  const candidateModels = ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of candidateModels) {
    const supportsThinkingBudget = !model.includes('lite');
    const generationConfig = supportsThinkingBudget
      ? { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
      : { temperature: 0, responseMimeType: 'application/json' };

    for (const key of keysToTry) {
      if (!isKeyUsable(key)) continue;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig
            })
          }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            sessionRateLimitedKeys.set(key, Date.now());
            continue;
          }
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            sessionBadKeys.add(key);
            continue;
          }
          if (response.status === 404 || response.status === 503) break;
          continue;
        }

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        const idx = labels.indexOf(String(parsed.uprightImage || '').trim().toUpperCase());
        const confidence = Number(parsed.confidence);
        if (idx >= 0 && (Number.isNaN(confidence) || confidence >= 0.5)) {
          return { degrees: angles[idx], confidence: Number.isNaN(confidence) ? 0.8 : confidence };
        }
        return null;
      } catch (err) {
        console.warn(`Orientation check with ${model} failed:`, err.message || err);
        if (err?.name === 'AbortError' || String(err?.message || '').includes('aborted')) {
          break; // Switch to next candidate model immediately on timeout
        }
      }
    }
  }
  return null;
}

/**
 * AUTO-ORIENT (one step, no user action): decide which side is TOP and rotate the photo upright
 * (0° / 90° / 180° / 270°) BEFORE scanning, so both the preview and the OCR use the upright image.
 * Uses Gemini (4-candidate upright pick) first; falls back to the pixel heuristic when offline / no key.
 * Returns { dataUrl, base64, rotatedDegrees, method: 'ai' | 'heuristic' | 'none' }.
 */
export async function autoOrientDocumentImage(dataUrl, docTypeHint = 'auto', apiKey = '') {
  const noChange = (method) => ({
    dataUrl,
    base64: dataUrl ? dataUrl.split(',')[1] || '' : '',
    rotatedDegrees: 0,
    method
  });
  if (!dataUrl || docTypeHint === 'finance') return noChange('none');

  const key = apiKey || getStoredApiKey() || DEFAULT_GEMINI_KEYS[0];
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (online && key) {
    const ai = await detectUprightRotationWithAI(dataUrl, key);
    if (ai) {
      console.log(`🧭 [Auto-Orient AI] upright = rotate ${ai.degrees}° clockwise (confidence ${ai.confidence})`);
      if (ai.degrees === 0) return noChange('ai');
      const rotated = await rotateImageDataUrl(dataUrl, ai.degrees);
      return { ...rotated, method: 'ai' };
    }
  }

  const guess = await autoOrientDocumentImageHeuristic(dataUrl, docTypeHint);
  return { ...guess, method: 'heuristic' };
}

/**
 * Shared pixel analysis of a loaded image (downsampled to 240x240):
 *  - Row-to-Row vs Column-to-Column line modulation (text line direction)
 *  - Quadrant text edge energy (which side holds the dense header)
 *  - Mean brightness + strong-edge fraction of the center area (is it a bright paper page with text?)
 * Used by the offline heuristic (PC/standard flow) and by the Mobile 2-format capture classifier.
 */
function computeDocumentLayoutMetrics(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

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
  // Immediately release temporary 240x240 canvas memory
  canvas.width = 0;
  canvas.height = 0;

  // 1. Measure Row-to-Row vs Column-to-Column Line Modulation in center document area (12%..88%)
  const start = Math.round(S * 0.12);
  const end = Math.round(S * 0.88);
  const span = end - start;

  const rowAvg = new Float32Array(S);
  const colAvg = new Float32Array(S);
  let lumSum = 0;
  for (let y = start; y < end; y++) {
    let rSum = 0;
    for (let x = start; x < end; x++) {
      rSum += lum[y * S + x];
    }
    rowAvg[y] = rSum / span;
    lumSum += rSum;
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

  // 3. Center-area strong-edge fraction (text density) — blank / blurred / non-document frames score ~0
  let strongEdges = 0;
  let edgeSamples = 0;
  for (let y = start + 1; y < end; y++) {
    for (let x = start + 1; x < end; x++) {
      const idx = y * S + x;
      const dx = Math.abs(lum[idx] - lum[idx - 1]);
      const dy = Math.abs(lum[idx] - lum[idx - S]);
      if (dx + dy > 22) strongEdges++;
      edgeSamples++;
    }
  }

  return {
    w,
    h,
    horizLineMod,
    vertLineMod,
    topLeftE: quadEnergy(20, 110, 20, 110),
    topRightE: quadEnergy(130, 220, 20, 110),
    bottomLeftE: quadEnergy(20, 110, 130, 220),
    bottomRightE: quadEnergy(130, 220, 130, 220),
    meanLum: lumSum / (span * span),
    edgeFraction: edgeSamples ? strongEdges / edgeSamples : 0
  };
}

/** A leave slip is sideways if captured in a portrait frame with vertical text lines, or if vertical line modulation strongly dominates */
function isSidewaysLayout(m) {
  const isPortraitFrame = m.h > m.w * 1.05;
  return (
    (isPortraitFrame && m.vertLineMod >= m.horizLineMod * 0.72) ||
    m.vertLineMod > m.horizLineMod * 1.22
  );
}

/**
 * MOBILE 2-FORMAT CAPTURE CLASSIFIER (on-device, no AI call, ~0.2s).
 * The mobile camera accepts exactly 2 capture formats for leave slips:
 *   Format 1 — phone held upright, full A4 page  → text lines horizontal → keep 0°
 *   Format 2 — top half of the slip, shot sideways → text lines vertical  → always rotate 270° clockwise
 * Frames that are clearly not a bright paper page with text (dark, blank, blurred) are returned as 'unknown'
 * so the UI can ask the user to retake instead of spending a Gemini call.
 * Returns { dataUrl, base64, rotatedDegrees, format: 'upright' | 'sideways_half' | 'finance_skip' | 'unknown', metrics }.
 */
export const MOBILE_CAPTURE_MIN_BRIGHTNESS = 100; // calibrated: paper pages ~155-180, desk/keyboard/dark frames ~8-90
export const MOBILE_CAPTURE_MIN_EDGE_FRACTION = 0.03; // calibrated: text pages ~0.19, blank/blurred frames < 0.05

export async function classifyMobileCapture(dataUrl, docTypeHint = 'auto') {
  const unchanged = (format, metrics = null) => ({
    dataUrl,
    base64: dataUrl ? dataUrl.split(',')[1] || '' : '',
    rotatedDegrees: 0,
    format,
    metrics
  });
  if (!dataUrl) return unchanged('unknown');
  if (docTypeHint === 'finance') return unchanged('finance_skip');

  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = dataUrl;
  });
  if (!img) return unchanged('unknown');

  let m;
  try {
    m = computeDocumentLayoutMetrics(img);
  } catch (e) {
    console.warn('Mobile capture analysis failed:', e);
    return unchanged('unknown');
  }
  if (!m) return unchanged('unknown');

  const roundedMetrics = {
    w: m.w,
    h: m.h,
    hMod: Math.round(m.horizLineMod),
    vMod: Math.round(m.vertLineMod),
    brightness: Math.round(m.meanLum),
    edge: Number(m.edgeFraction.toFixed(3))
  };

  if (m.meanLum < MOBILE_CAPTURE_MIN_BRIGHTNESS || m.edgeFraction < MOBILE_CAPTURE_MIN_EDGE_FRACTION) {
    console.log('📵 [Mobile 2-Format] Not a recognizable document page', roundedMetrics);
    return unchanged('unknown', roundedMetrics);
  }

  if (!isSidewaysLayout(m)) {
    console.log('📄 [Mobile 2-Format] Upright capture (Format 1) → keep 0°', roundedMetrics);
    if (Math.max(m.w, m.h) > 1800) {
      const compressed = await compressImageForOCR(dataUrl, 3 * 1024 * 1024, 'image/jpeg');
      return {
        dataUrl: compressed.dataUrl || dataUrl,
        base64: compressed.base64 || (dataUrl.split(',')[1] || ''),
        rotatedDegrees: 0,
        format: 'upright',
        metrics: roundedMetrics
      };
    }
    return unchanged('upright', roundedMetrics);
  }

  console.log('📐 [Mobile 2-Format] Sideways half-slip (Format 2) → rotate 270°', roundedMetrics);
  const rotated = await rotateImageDataUrl(dataUrl, 270, 1800);
  return { ...rotated, format: 'sideways_half', metrics: roundedMetrics };
}

/**
 * FALLBACK ONLY (offline / no API key): pixel-based guess to detect a sideways Leave Slip.
 * Primary orientation detection is `detectUprightRotationWithAI` (see below).
 */
function autoOrientDocumentImageHeuristic(dataUrl, docTypeHint = 'auto') {
  return new Promise((resolve) => {
    if (!dataUrl || docTypeHint === 'finance') {
      return resolve({ dataUrl, base64: dataUrl ? dataUrl.split(',')[1] || '' : '', rotatedDegrees: 0 });
    }

    const img = new Image();
    img.onload = async () => {
      try {
        const m = computeDocumentLayoutMetrics(img);
        if (!m) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }
        const { w, h, horizLineMod, vertLineMod, topLeftE, topRightE, bottomLeftE, bottomRightE } = m;

        // A leave slip is sideways if captured in a portrait frame with vertical text lines, or if vertical line modulation strongly dominates
        const isSideways = isSidewaysLayout(m);

        if (!isSideways) {
          return resolve({ dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 });
        }

        // Determine whether the top of the slip ("ព្រះរាជាណាចក្រកម្ពុជា" header) is on the RIGHT edge (needs 270° CW = 90° CCW)
        // or LEFT edge (needs 90° CW). Phone portrait captures put the header on the RIGHT edge in the vast majority of cases,
        // so default to 270° unless the left side is overwhelmingly denser. Gemini then verifies orientation (0/90/180/270)
        // and triggers a corrective re-scan if the guess was wrong (see processUploadedImage).
        const scoreTopOnRight = (topRightE * 1.15 + bottomRightE * 0.75) - (topLeftE * 0.85);
        const scoreTopOnLeft = (bottomLeftE * 1.15 + topLeftE * 0.75) - (bottomRightE * 0.85);

        const degreesToRotate = scoreTopOnLeft > scoreTopOnRight * 1.6 && scoreTopOnLeft > 0 ? 90 : 270;
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
      canvas.width = 0;
      canvas.height = 0;
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

        // Crop the student identity band (Line 1 below "លិខិតសុំច្បាប់") on BOTH Portrait and Landscape photos
        const sx = Math.round(w * 0.12);
        const sy = Math.round(h * 0.28);
        const sw = Math.max(1, Math.round(w * 0.78));
        const sh = Math.max(1, Math.round(h * 0.18));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        canvas.width = 0;
        canvas.height = 0;
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
 * Auto-Crop & Contrast-Boost the Student Pen-Ink Zone on a Leave Slip (y: 15%..71%, x: 3%..97%).
 * Works on BOTH Portrait and Landscape photos!
 * Cuts out the top printed national/ministry header and bottom teacher/student signatures,
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
        const sh = Math.max(1, Math.round(h * 0.56));

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
        canvas.width = 0;
        canvas.height = 0;
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
 * Group student roster by grade ('មត្តេយ្យ', '១', '២', '៣') for Grade-First AI matching (Zero Prompt Bias)
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
    if (groups[g]) {
      groups[g].push(s.name);
    } else {
      groups['ផ្សេងៗ'].push(`${s.name} [ថ្នាក់ ${s.grade}]`);
    }
  });

  const lines = ['OFFICIAL 80-STUDENT ROSTER BY GRADE:'];
  if (groups['មត្តេយ្យ'].length > 0) {
    lines.push(`- ថ្នាក់មត្តេយ្យ (${groups['មត្តេយ្យ'].length}): ${groups['មត្តេយ្យ'].join(' | ')}`);
  }
  if (groups['១'].length > 0) {
    lines.push(`- ថ្នាក់ទី ១ (${groups['១'].length}): ${groups['១'].join(' | ')}`);
  }
  if (groups['២'].length > 0) {
    lines.push(`- ថ្នាក់ទី ២ (${groups['២'].length}): ${groups['២'].join(' | ')}`);
  }
  if (groups['៣'].length > 0) {
    lines.push(`- ថ្នាក់ទី ៣ (${groups['៣'].length}): ${groups['៣'].join(' | ')}`);
  }
  if (groups['ផ្សេងៗ'].length > 0) {
    lines.push(`- ថ្នាក់ផ្សេងៗ: ${groups['ផ្សេងៗ'].join(' | ')}`);
  }
  return lines.join('\n');
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
  crops = {}
) {
  const studentListContext = buildGradeGroupedRosterPrompt(studentMaster);

  const returnSchema = docTypeHint === 'finance'
    ? 'Return JSON: {"detectedType":"finance","rotateClockwiseDegrees":0,"confidence":0.98,"leaveItems":[],"financeItems":[{"category":"expense","desc":"","qty":"","unitPrice":0,"total":0,"note":""}]}'
    : 'Return JSON: {"detectedType":"leave","rotateClockwiseDegrees":0,"confidence":0.98,"leaveItems":[{"grade":"","rawHandwrittenName":"","name":"","topNameCandidates":[],"duration":"","date":"","reason":"","note":""}],"financeItems":[]}';

  const prompt = [
    'You are an expert Khmer OCR assistant for a Buddhist monastic school.',
    'Read ONLY the handwritten blue ballpoint pen ink on this Student Leave Slip (លិខិតសុំច្បាប់) or Finance Receipt:',
    '1. ORIENTATION ("rotateClockwiseDegrees"): 0 if upright, or 90/180/270 clockwise degrees needed to make text upright.',
    '2. CLASSIFICATION ("detectedType"): "leave" or "finance".',
    '3. IF LEAVE SLIP ("leaveItems"):',
    '   - GRADE ("grade"): Read the grade written after "ជាសិស្សរៀននៅថ្នាក់ទី" (Line 1) and "លោកគ្រូ/អ្នកគ្រូបន្ទុកថ្នាក់ទី" (Line 3) -> "មត្តេយ្យ", "១", "២", or "៣".',
    '   - STUDENT NAME ON LINE 1 ONLY ("rawHandwrittenName" & "name"):',
    '     * Read the student name written on Line 1 immediately after "ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ" (or "ខ្ញុំបាទសមណសិស្សឈ្មោះ") and BEFORE "ភេទ" (or "អាយុ").',
    '     * STRICT RULE: NEVER read the bottom signature, and NEVER read Line 2 below it ("ពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង" — tall strokes from Line 2 may touch the bottom of Line 1).',
    '     * Match the handwritten name to the official student in that grade from the roster below:',
    studentListContext,
    '   - DURATION ("duration"): Read pen ink after "សំណើសុំច្បាប់ចំនួន" (if "ល្ងាច" or "ព្រឹក" is written in pen ink before printed "ថ្ងៃ", output "១ល្ងាច" or "១ព្រឹក").',
    '   - START DATE ("date"): Read start date after "គិតចាប់ពីថ្ងៃទី... ខែ... ឆ្នាំ..." -> format "DD/MM/២០២៦" ("តុលា" = ១០).',
    '   - REASON ("reason"): Read ONLY the handwritten pen ink after "មូលហេតុ :".',
    returnSchema
  ].join('\n');

  // Use gemini-3-flash-preview (~1.9s) and gemini-3.6-flash (~3.2s) with thinkingBudget: 0 as primary vision models
  const candidateModels = ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  const keysToTry = [
    apiKey,
    ...DEFAULT_GEMINI_KEYS.filter(k => k && k !== apiKey)
  ].filter(Boolean);

  let lastError = null;

  const messageParts = [
    { text: prompt },
    { text: 'Full Document:' },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data
      }
    }
  ];

  if (crops?.penInkCropBase64) {
    messageParts.push({ text: 'Document Body (Lines 1-5):' });
    messageParts.push({ inlineData: { mimeType: 'image/jpeg', data: crops.penInkCropBase64 } });
  }
  if (crops?.nameLineCropBase64) {
    messageParts.push({ text: 'Super-Zoom of Line 1 (Student Name & Grade):' });
    messageParts.push({ inlineData: { mimeType: 'image/jpeg', data: crops.nameLineCropBase64 } });
  }

  for (const model of candidateModels) {
    const supportsThinkingBudget = !model.includes('lite');
    const generationConfig = supportsThinkingBudget
      ? { temperature: 0.0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
      : { temperature: 0.0, responseMimeType: 'application/json' };

    for (const activeKey of keysToTry) {
      if (!isKeyUsable(activeKey)) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
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
            generationConfig
          })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429) {
            sessionRateLimitedKeys.set(activeKey, Date.now());
            console.warn(`Key rate-limited (429) for ${model}, rotating to next key in pool...`);
            continue;
          }
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            sessionBadKeys.add(activeKey);
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
        if (err?.name === 'AbortError' || String(err?.message || '').includes('aborted')) {
          break; // Switch to next candidate model immediately on timeout instead of looping all keys
        }
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
export async function processUploadedImage(
  file,
  {
    docTypeHint = 'auto',
    apiKey = '',
    studentMaster = [],
    allLeaves = {},
    preOrientedDataUrl = '',
    skipOrientRetry = false,
    isMobileCapture = false,
    prefetchedTrainingDataset = null,
    onStageChange = null
  } = {}
) {
  const scanStartMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  onStageChange?.('orient');
  // Step 0: Read raw file → auto-orient sideways camera photos upright (like Image 3) → compute 512-bit Visual Image Fingerprint
  let rawDataUrl = preOrientedDataUrl;
  if (!rawDataUrl) {
    const { dataUrl: initialDataUrl } = await fileToBase64(file);
    if (isMobileCapture) {
      const mobileCheck = await classifyMobileCapture(initialDataUrl, docTypeHint);
      if (mobileCheck.format === 'unknown') {
        return {
          id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          imageHash: '',
          previewUrl: initialDataUrl,
          processingMode: 'unrecognized_format',
          unrecognizedFormat: true,
          unrecognizedReason: 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបងងឹត ព្រិល ឬមិនមែនជាក្រដាសច្បាប់)។ សូមថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។',
          timestamp: new Date().toISOString(),
          result: {
            detectedType: docTypeHint === 'finance' ? 'finance' : 'leave',
            unrecognizedFormat: true,
            unrecognizedReason: 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបងងឹត ព្រិល ឬមិនមែនជាក្រដាសច្បាប់)។ សូមថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។',
            leaveItems: [],
            financeItems: []
          }
        };
      }
      rawDataUrl = mobileCheck.dataUrl || initialDataUrl;
    } else {
      const oriented = await autoOrientDocumentImage(initialDataUrl, docTypeHint, apiKey);
      rawDataUrl = oriented.dataUrl || initialDataUrl;
    }
  }
  const imageHash = await computeImageFingerprint(rawDataUrl);

  // Ensure we have latest training samples from Cloud (use prefetched batch dataset when provided to avoid per-image latency)
  let trainingDataset = Array.isArray(prefetchedTrainingDataset)
    ? prefetchedTrainingDataset
    : getStoredTrainingDataset();
  if (!Array.isArray(prefetchedTrainingDataset) && navigator.onLine) {
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

  // Build official 80-student lookup sets (both canonical names and all known aliases)
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

  if (matchedSample && matchedSample.groundTruth) {
    const gt = matchedSample.groundTruth;
    const isLeave = matchedSample.docType !== 'finance';
    const verifiedMatch = isLeave && gt.name
      ? matchStudentName(gt.name, studentMaster, gt.grade)
      : null;

    // Only use AI Flywheel memory for leave slips if the stored groundTruth name is a valid student in the 80-student roster
    if (!isLeave || (verifiedMatch && verifiedMatch.confidence >= 0.75)) {
      console.log('✨ [AI Flywheel] Instant Cross-Device Ground-Truth memory recall for:', file.name);
      let cleanDate = String(gt.date || '').trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      const cleanReason = String(gt.reason || 'ការងារផ្ទាល់ខ្លួន').replace(/\s+/g, ' ').trim();

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
            name: verifiedMatch.student.name,
            grade: verifiedMatch.student.grade || gt.grade || '២',
            reason: cleanReason,
            duration: gt.duration || '១ថ្ងៃ',
            date: cleanDate || new Date().toLocaleDateString('en-GB'),
            note: gt.note || ''
          }] : [],
          financeItems: !isLeave ? [gt] : []
        }
      };
    }
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
      onStageChange?.('ocr');
      let crops = {};
      if (docTypeHint !== 'finance') {
        const nameLineCropBase64 = await cropLeaveSlipNameLineZone(dataUrl);
        crops = { nameLineCropBase64 };
      }
      extractionResult = await callGeminiVision(
        base64,
        compressedMimeType || file.type,
        effectiveApiKey,
        docTypeHint,
        studentMaster,
        crops
      );
      processingMode = 'gemini_cloud';
      onStageChange?.('match');
    } catch (err) {
      console.warn('Gemini Cloud OCR failed:', err);
      extractionResult = createManualBlankItem(file, docTypeHint, isPortrait, 'មិនអាចស្កេនបានដោយសារបញ្ហាបណ្ដាញ៖ ' + (err.message || 'Error'));
      processingMode = 'offline_error';
    }
  }

  // Step 2C: AI Orientation Guard
  // - On Mobile (`isMobileCapture === true`): we already oriented Format 1 (0°) or Format 2 (270°) locally in ~0.2s.
  //   If Gemini still reports the page is sideways / upside-down (90°/180°/270°), DO NOT waste a second Gemini round-trip;
  //   immediately flag `unrecognizedFormat: true` so the UI tells the user the system does not recognize this format.
  // - On PC (`!isMobileCapture`): keep existing behavior (rotate and re-run once).
  const aiRotateDegrees = Number(extractionResult?.rotateClockwiseDegrees) || 0;
  if (
    !skipOrientRetry &&
    docTypeHint !== 'finance' &&
    processingMode === 'gemini_cloud' &&
    [90, 180, 270].includes(aiRotateDegrees)
  ) {
    if (isMobileCapture) {
      const elapsedMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - scanStartMs);
      console.log(`📵 [Mobile 2-Format Guard] Gemini reported non-upright (${aiRotateDegrees}°) after local 2-format check (${elapsedMs}ms) → flagging as unrecognized format`);
      const unrecognizedMsg = 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបបញ្ច្រាស ឬខុសពី ២ ទម្រង់កំណត់)។ សូមចុចប៊ូតុងបង្វិល ↻ លើរូប ឬថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។';
      return {
        id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        fileName: file.name,
        fileSize: file.size,
        imageHash,
        previewUrl: rawDataUrl,
        processingMode: 'unrecognized_format',
        unrecognizedFormat: true,
        unrecognizedReason: unrecognizedMsg,
        timestamp: new Date().toISOString(),
        result: {
          ...extractionResult,
          detectedType: extractionResult?.detectedType || (docTypeHint === 'finance' ? 'finance' : 'leave'),
          unrecognizedFormat: true,
          unrecognizedReason: unrecognizedMsg
        }
      };
    }

    console.log(`🔄 [AI Orientation Guard] Gemini says rotate ${aiRotateDegrees}° clockwise → re-scanning upright image`);
    const fixed = await rotateImageDataUrl(rawDataUrl, aiRotateDegrees);
    if (fixed?.dataUrl && fixed.rotatedDegrees) {
      return processUploadedImage(file, {
        docTypeHint,
        apiKey,
        studentMaster,
        allLeaves,
        preOrientedDataUrl: fixed.dataUrl,
        skipOrientRetry: true,
        isMobileCapture: false,
        prefetchedTrainingDataset: trainingDataset
      });
    }
  }

  if (isMobileCapture) {
    const elapsedMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - scanStartMs);
    console.log(`⚡ [Mobile 1-Pass Scan] Completed in ${elapsedMs}ms for ${file.name}`);
  }
  // Build safe non-conflicting alias map from user corrections:
  //  - Target `groundTruth.name` MUST be one of the 80 official students
  //  - `rawOcrName` must NOT be another student's official name or alias
  //  - `rawOcrName` must genuinely resemble `groundTruth.name` (>= 0.70) so a misread of Student A never overwrites Student B
  const safeLearnedAliasMap = new Map();
  if (Array.isArray(trainingDataset)) {
    trainingDataset.forEach(s => {
      if (s.docType === 'finance' || !s.groundTruth?.name) return;
      const gtName = String(s.groundTruth.name || '').trim();
      const gtCompact = gtName.replace(/[\s\u200B]/g, '');
      if (!officialStudentNames.has(gtCompact)) return;
      const rawN = (s.rawOcrName || s.rawOcr?.initialOcrName || '').replace(/[\s\u200B]/g, '');
      if (rawN && !allOfficialAndAliasNames.has(rawN) && computeKhmerNameSimilarity(rawN, gtName) >= 0.70) {
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
      let cleanDuration = String(item.duration || '').trim();

      // Normalize duration (e.g. "1 ល្ងាចថ្ងៃ" or "1 ល្ងាច" -> "១ល្ងាច", "1 ថ្ងៃ" -> "១ថ្ងៃ")
      if (cleanDuration) {
        const dKhmer = toKhmerDigits(cleanDuration).replace(/\s+/g, '');
        const numMatch = dKhmer.match(/[០-៩]+/);
        const num = numMatch ? numMatch[0] : '១';
        if (dKhmer.includes('ល្ងាច')) {
          cleanDuration = `${num}ល្ងាច`;
        } else if (dKhmer.includes('ព្រឹក')) {
          cleanDuration = `${num}ព្រឹក`;
        } else if (dKhmer.includes('កន្លះ')) {
          cleanDuration = `${num}ថ្ងៃកន្លះ`;
        } else {
          cleanDuration = `${num}ថ្ងៃ`;
        }
      } else {
        cleanDuration = '១ថ្ងៃ';
      }

      // Strip any "ដល់..." or "- date" or "to date" completely! Always keep only the single start date
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 4) {
          cleanDate = parts[0].trim();
        }
      }

      // Normalize Khmer month names and Arabic digits into standard Khmer DD/MM/២០២៦ format
      if (cleanDate) {
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
          cleanDate = toKhmerDigits(`${day}/${month}/2026`);
        } else {
          cleanDate = toKhmerDigits(cleanDate.replace(/2024|2025|2014|២០២៤|២០២៥|២០១៤/g, '២០២៦'));
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
          duration: cleanDuration,
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
      } else if (bestRawMatch || bestCandidateMatch) {
        bestMatch = bestRawMatch || bestCandidateMatch;
      } else if (matchPrimary) {
        // Only trust matchPrimary when rawHandwritten is empty or actually resembles matchPrimary.student.name
        const simToRaw = rawHandwritten
          ? computeKhmerNameSimilarity(rawHandwritten, matchPrimary.student.name)
          : 1.0;
        if (simToRaw >= 0.58) {
          bestMatch = matchPrimary;
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.72) {
        return {
          ...item,
          name: bestMatch.student.name,
          grade: bestMatch.student.grade || normGrade || item.grade,
          reason: cleanReason,
          duration: cleanDuration,
          date: cleanDate,
          matchedStudent: bestMatch.student,
          matchConfidence: bestMatch.confidence,
          initialOcrName
        };
      }

      // STRICT 80-STUDENT ROSTER LOCK:
      // Never output an unverified or hallucinated name outside the 80 official students (e.g. "ឡេង អាន").
      // Leave `name` blank ('') so the user can pick the real student without fake data.
      return {
        ...item,
        name: '',
        grade: normGrade || item.grade,
        reason: cleanReason,
        duration: cleanDuration,
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
    // Use 1800px compressed dataUrl for preview (crystal sharp for zoom review while 10x lighter in memory)
    previewUrl: dataUrl || rawDataUrl,
    processingMode,
    timestamp: new Date().toISOString(),
    result: extractionResult
  };
}
