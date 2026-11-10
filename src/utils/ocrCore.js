// Pure Document-Agnostic Image, Fingerprint & Network-Resilient Gemini Transport Layer
// Zero Leave-Slip rules and Zero Finance-Receipt rules live here.
import {
  DEFAULT_GEMINI_KEYS,
  getGeminiKeyPool,
  parseApiKeyList,
  ensureCloudApiKeyPoolLoaded
} from './storage';

const sessionBadKeys = new Set();
const sessionRateLimitedKeys = new Map(); // `${model}:${key}` -> { ts: number, ttl: number }
const RATE_LIMIT_STORAGE_KEY = 'ann_klee_rate_limited_keys_v2';
const RATE_LIMIT_RPM_COOLDOWN_MS = 60 * 1000;
const RATE_LIMIT_DAILY_COOLDOWN_MS = 30 * 60 * 1000;

// Hydrate active rate-limit marks from sessionStorage so refreshes skip exhausted keys immediately
try {
  if (typeof sessionStorage !== 'undefined') {
    const raw = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      Object.entries(parsed || {}).forEach(([k, entry]) => {
        const ts = typeof entry === 'number' ? entry : entry?.ts;
        const ttl = typeof entry === 'object' && entry?.ttl ? entry.ttl : RATE_LIMIT_RPM_COOLDOWN_MS;
        if (typeof ts === 'number' && (now - ts) < ttl) {
          sessionRateLimitedKeys.set(k, { ts, ttl });
        }
      });
    }
  }
} catch {
  // Ignore sessionStorage errors in private/restricted contexts
}

function markKeyRateLimited(model, key, errorBodyText = '') {
  const now = Date.now();
  const lower = String(errorBodyText || '').toLowerCase();
  const isDailyQuota =
    lower.includes('perday') ||
    lower.includes('per_day') ||
    /retry in \d+h/i.test(lower) ||
    /retry in [5-9]\dm/i.test(lower);
  const ttl = isDailyQuota ? RATE_LIMIT_DAILY_COOLDOWN_MS : RATE_LIMIT_RPM_COOLDOWN_MS;
  const compositeKey = `${model}:${key}`;
  sessionRateLimitedKeys.set(compositeKey, { ts: now, ttl });
  try {
    if (typeof sessionStorage !== 'undefined') {
      const obj = {};
      sessionRateLimitedKeys.forEach((val, k) => {
        if (val && typeof val.ts === 'number' && (now - val.ts) < (val.ttl || RATE_LIMIT_RPM_COOLDOWN_MS)) {
          obj[k] = val;
        }
      });
      sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(obj));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export const GEMINI_VISION_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
];

// Router & Orientation models: use `gemini-3-flash-preview` first for accurate 90° vs 270° rotation detection
export const GEMINI_ROUTER_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
];

export function isKeyUsable(key, model = '') {
  if (!key || sessionBadKeys.has(key)) return false;
  if (model) {
    const entry = sessionRateLimitedKeys.get(`${model}:${key}`);
    if (entry && typeof entry.ts === 'number') {
      const ttl = entry.ttl || RATE_LIMIT_RPM_COOLDOWN_MS;
      if ((Date.now() - entry.ts) < ttl) {
        return false;
      }
    }
  }
  return true;
}

let roundRobinKeyCursor = 0;

export function getCandidateApiKeys(explicitApiKey = '', targetModel = '') {
  const pool = getGeminiKeyPool();
  const explicitList = parseApiKeyList(explicitApiKey);
  const customFirst = explicitList.filter(k => !pool.includes(k));
  const merged = Array.from(new Set([
    ...customFirst,
    ...pool,
    ...explicitList,
    ...DEFAULT_GEMINI_KEYS
  ])).filter(k => k && !sessionBadKeys.has(k));

  const primaryModel = targetModel || GEMINI_VISION_MODELS[0];
  const readyKeys = merged.filter(k => isKeyUsable(k, primaryModel));
  const coolingKeys = merged.filter(k => !isKeyUsable(k, primaryModel));

  if (readyKeys.length > 1) {
    const offset = roundRobinKeyCursor % readyKeys.length;
    roundRobinKeyCursor = (roundRobinKeyCursor + 1) % readyKeys.length;
    const rotatedReady = [
      ...readyKeys.slice(offset),
      ...readyKeys.slice(0, offset)
    ];
    return [...rotatedReady, ...coolingKeys];
  }

  return [...readyKeys, ...coolingKeys];
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Translate technical network / fetch / AbortController errors into clear, polite Khmer messages.
 */
export function formatKhmerScanError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'គ្មានសេវាអ៊ីនធឺណិត (Offline) — សូមភ្ជាប់ Wi-Fi ឬទិន្នន័យចល័ត រួចសាកល្បងម្ដងទៀត';
  }
  if (!err) {
    return 'ប្រព័ន្ធស្កេន AI រវល់បណ្ដោះអាសន្ន — សូមរង់ចាំបន្តិច រួចសាកល្បងម្ដងទៀត';
  }
  const msg = String(err.message || err || '').toLowerCase();
  const isAbort = err.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout');
  if (isAbort) {
    return 'អ៊ីនធឺណិតយឺតពេក ឬដាច់រអាក់រអួល (ផុតម៉ោងរង់ចាំ) — សូមពិនិត្យសេវាអ៊ីនធឺណិត រួចសាកល្បងម្ដងទៀត';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
    return 'ការតភ្ជាប់អ៊ីនធឺណិតដាច់រអាក់រអួល — សូមពិនិត្យសេវាអ៊ីនធឺណិត រួចសាកល្បងម្ដងទៀត';
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
    return 'ប្រព័ន្ធ AI កំពុងមមាញឹកខ្លាំង (អស់កូតាបណ្ដោះអាសន្ន) — សូមរង់ចាំបន្តិច រួចសាកល្បងម្ដងទៀត';
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('api key')) {
    return 'AI Key មិនត្រឹមត្រូវ ឬផុតកំណត់ — សូមពិនិត្យការកំណត់ AI Key';
  }
  // If already in Khmer, return as-is
  if (/[\u1780-\u17FF]/.test(String(err.message || ''))) {
    return String(err.message);
  }
  return 'មិនអាចស្កេនដោយ AI បានបណ្ដោះអាសន្ន — សូមសាកល្បងម្ដងទៀត';
}

function unwrapTopLevelJsonEnvelope(parsed) {
  let current = parsed;
  while (Array.isArray(current) && current.length > 0) {
    const first = current[0];
    if (
      current.length === 1 &&
      first &&
      typeof first === 'object' &&
      !Array.isArray(first)
    ) {
      current = first;
    } else if (
      first &&
      typeof first === 'object' &&
      !Array.isArray(first) &&
      ('leaveItems' in first ||
        'financeItems' in first ||
        'detectedType' in first ||
        'docType' in first ||
        'uprightImage' in first)
    ) {
      current = first;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Extract JSON payload from Gemini response parts, safely skipping internal `{ thought: true }` parts
 * when `thinkingBudget > 0` is enabled, and unwrapping top-level `[ {...} ]` array envelopes.
 */
function parseGeminiJsonCandidate(result) {
  const parts = result?.candidates?.[0]?.content?.parts || [];
  const nonThoughtText = parts
    .filter(p => !p?.thought && typeof p?.text === 'string')
    .map(p => p.text)
    .join('\n')
    .trim();
  const rawText = nonThoughtText || parts.map(p => p?.text || '').join('\n').trim();
  if (!rawText) {
    throw new Error('Empty Gemini response');
  }
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return unwrapTopLevelJsonEnvelope(JSON.parse(cleaned));
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return unwrapTopLevelJsonEnvelope(JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)));
    }
    throw new Error('Invalid JSON from Gemini');
  }
}

/**
 * Resilient Gemini Multimodal JSON caller designed for both fast broadband AND flaky/weak 3G/4G networks:
 * - Retries transient packet-drop / `Failed to fetch` hiccups on the primary fast model after 400ms
 * - Uses an adaptive timeout (`timeoutMs`, default 26s) so slow 120-450 kbps mobile uploads finish cleanly
 * - Caps full-timeout fallbacks (`maxTimeoutAttempts = 2`) so completely dead internet fails cleanly in Khmer without hanging 90s
 */
export async function callGeminiJsonWithResilience({
  parts,
  apiKey = '',
  thinkingBudget = 0,
  thinkingLevel = '',
  timeoutMs = 26000,
  maxTimeoutAttempts = 2,
  models = GEMINI_VISION_MODELS
}) {
  const modelList = Array.isArray(models) && models.length > 0 ? models : GEMINI_VISION_MODELS;
  let initialKeys = getCandidateApiKeys(apiKey, modelList[0]);
  if (initialKeys.length <= 1 && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    const hydratedPool = await ensureCloudApiKeyPoolLoaded();
    if (hydratedPool.length > 0) {
      initialKeys = getCandidateApiKeys(apiKey, modelList[0]);
    }
  }
  if (initialKeys.length === 0) {
    throw new Error('មិនទាន់មាន AI Key — សូមបញ្ចូល AI Key ដើម្បីដំណើរការស្កេន');
  }

  let lastError = null;
  let timeoutCount = 0;

  for (let mIdx = 0; mIdx < modelList.length; mIdx++) {
    const model = modelList[mIdx];
    const keysToTry = mIdx === 0 ? initialKeys : getCandidateApiKeys(apiKey, model);
    let emptyResponseCount = 0;
    const supportsThinking = !model.includes('lite');
    const supportsThinkingLevel = Boolean(thinkingLevel) && model === 'gemini-3-flash-preview';
    const generationConfig = supportsThinking
      ? {
          temperature: 0.0,
          responseMimeType: 'application/json',
          thinkingConfig: supportsThinkingLevel
            ? { thinkingLevel }
            : { thinkingBudget }
        }
      : {
          temperature: 0.0,
          responseMimeType: 'application/json'
        };

    let transientRetriedOnModel = false;

    for (let kIdx = 0; kIdx < keysToTry.length; kIdx++) {
      const activeKey = keysToTry[kIdx];
      if (!isKeyUsable(activeKey, model)) continue;

      const attemptStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
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
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          if (response.status === 429) {
            markKeyRateLimited(model, activeKey, errText);
            lastError = new Error('429 Quota Exceeded');
            continue;
          }
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            const lowerErr = errText.toLowerCase();
            const isKeyProblem =
              response.status === 401 ||
              response.status === 403 ||
              lowerErr.includes('api_key_invalid') ||
              lowerErr.includes('api key not valid') ||
              lowerErr.includes('key not valid') ||
              lowerErr.includes('api key expired');
            if (isKeyProblem) {
              // Only genuinely dead/revoked keys are blacklisted for the session
              sessionBadKeys.add(activeKey);
              lastError = new Error(`${response.status} API Key error`);
              continue;
            }
            // Request-level 400 (thinkingConfig / schema / payload) is model-specific — never poison the key pool.
            // Retry once on the same model without thinkingConfig, then move to the next model.
            if (generationConfig.thinkingConfig && !transientRetriedOnModel) {
              transientRetriedOnModel = true;
              delete generationConfig.thinkingConfig;
              console.warn(`⚠️ [400 Retry] ${model} rejected request config → retrying without thinkingConfig...`);
              kIdx--;
              continue;
            }
            lastError = new Error(`Gemini API Error (${response.status})`);
            break;
          }
          if (response.status === 404 || response.status === 503 || response.status >= 500) {
            lastError = new Error(`Gemini API Error (${response.status})`);
            break;
          }
          throw new Error(`Gemini API Error (${response.status})`);
        }

        const result = await response.json();
        return parseGeminiJsonCandidate(result);
      } catch (err) {
        lastError = err;
        const elapsed = Date.now() - attemptStart;
        const msg = String(err?.message || err || '').toLowerCase();
        const isAbort = err?.name === 'AbortError' || msg.includes('aborted');
        const isFastNetworkDrop = !isAbort && elapsed < timeoutMs * 0.75 && (
          msg.includes('failed to fetch') ||
          msg.includes('network') ||
          msg.includes('load failed')
        );

        // Flaky Wi-Fi / 3G packet drop recovery: retry same fast primary model once after brief 400ms pause
        if (isFastNetworkDrop && !transientRetriedOnModel && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
          transientRetriedOnModel = true;
          console.warn(`⚡ [Network Retry] Transient drop on ${model} (${elapsed}ms) → retrying immediately...`);
          await sleep(400);
          kIdx--; // Retry with same valid key first
          continue;
        }

        if (isAbort) {
          timeoutCount++;
          console.warn(`⏱️ [OCR Timeout] ${model} timed out after ${elapsed}ms (${timeoutCount}/${maxTimeoutAttempts})`);
          if (timeoutCount >= maxTimeoutAttempts) {
            throw new Error(formatKhmerScanError(err));
          }
          break; // Try 1 fallback model at most on slow/dead connection
        }

        // Empty / malformed JSON response: retry once with the next key on the same model before falling back
        const isEmptyOrBadJson = err?.name === 'SyntaxError' || msg.includes('empty gemini response') || msg.includes('invalid json');
        if (isEmptyOrBadJson && emptyResponseCount < 1) {
          emptyResponseCount++;
          console.warn(`🔁 [Empty Response] ${model} returned empty/invalid JSON → trying next key...`);
          continue;
        }

        break;
      }
    }
  }

  throw new Error(formatKhmerScanError(lastError));
}

/**
 * Convert browser File or Blob to base64 string + dataUrl
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64String = resultStr.split(',')[1] || '';
      resolve({ base64: base64String, dataUrl: resultStr });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function getImageDimensions(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return { width: 0, height: 0 };
  return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

/**
 * Rotate a dataUrl image by 90, 180, or 270 degrees clockwise on an HTML5 Canvas.
 */
export async function rotateImageDataUrl(dataUrl, degreesClockwise = 0, maxEdge = 1600) {
  const normDeg = ((degreesClockwise % 360) + 360) % 360;
  if (!dataUrl || normDeg === 0) {
    const base64 = dataUrl ? dataUrl.split(',')[1] || '' : '';
    return { dataUrl, base64, rotatedDegrees: 0 };
  }

  const img = await loadImageElement(dataUrl);
  if (!img) {
    return { dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 };
  }

  try {
    const rawW = img.naturalWidth || img.width;
    const rawH = img.naturalHeight || img.height;
    if (!rawW || !rawH) {
      return { dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 };
    }

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
    const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
    canvas.width = 0;
    canvas.height = 0;
    const rotatedBase64 = rotatedDataUrl.split(',')[1] || '';
    if (!rotatedBase64 || rotatedBase64.length < 100) {
      return { dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 };
    }
    return {
      dataUrl: rotatedDataUrl,
      base64: rotatedBase64,
      width: outW,
      height: outH,
      rotatedDegrees: normDeg
    };
  } catch (e) {
    console.warn('Image rotation failed:', e);
    return { dataUrl, base64: dataUrl.split(',')[1] || '', rotatedDegrees: 0 };
  }
}

/**
 * Build a lightweight JPEG thumbnail (~12-18 KB) rotated by `degreesClockwise`.
 */
export function makeRotatedThumbBase64(img, degreesClockwise = 0, maxEdge = 460, quality = 0.62) {
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
  const out = canvas.toDataURL('image/jpeg', quality).split(',')[1] || '';
  canvas.width = 0;
  canvas.height = 0;
  return out;
}

/**
 * Bandwidth-Smart Image Compressor — Preserves crisp Khmer cursive strokes while trimming heavy camera JPEG bloat
 * (e.g. shrinks a 427 KB 768x1024 photo to ~95 KB at full 768x1024 resolution so 3G uploads finish 4x faster!).
 */
export async function compressImageForOCR(dataUrl, originalFileSizeBytes = 0, mimeType = 'image/jpeg') {
  const MAX_LONG_EDGE = 1440;
  const QUALITY = 0.80;
  const SIZE_THRESHOLD_BYTES = 140 * 1024; // Re-encode anything over 140 KB for fast weak-network upload

  const img = await loadImageElement(dataUrl);
  if (!img) {
    const base64 = dataUrl ? dataUrl.split(',')[1] || '' : '';
    return {
      base64,
      dataUrl,
      mimeType,
      wasCompressed: false,
      originalSize: originalFileSizeBytes,
      compressedSize: originalFileSizeBytes
    };
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const longEdge = Math.max(w, h);
  const currentBase64 = dataUrl.split(',')[1] || '';
  const estimatedBytes = originalFileSizeBytes || Math.round((currentBase64.length * 3) / 4);

  if (longEdge <= MAX_LONG_EDGE && estimatedBytes <= SIZE_THRESHOLD_BYTES && mimeType === 'image/jpeg') {
    return {
      base64: currentBase64,
      dataUrl,
      mimeType: 'image/jpeg',
      wasCompressed: false,
      originalSize: estimatedBytes,
      compressedSize: estimatedBytes
    };
  }

  let targetW = w;
  let targetH = h;
  if (longEdge > MAX_LONG_EDGE) {
    const ratio = MAX_LONG_EDGE / longEdge;
    targetW = Math.max(1, Math.round(w * ratio));
    targetH = Math.max(1, Math.round(h * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  canvas.width = 0;
  canvas.height = 0;
  const compressedBase64 = compressedDataUrl.split(',')[1] || '';
  const compressedSize = Math.round((compressedBase64.length * 3) / 4);

  // If re-encoding somehow made a tiny file larger without resizing, keep the lighter original
  if (longEdge <= MAX_LONG_EDGE && compressedSize >= estimatedBytes && mimeType === 'image/jpeg') {
    return {
      base64: currentBase64,
      dataUrl,
      mimeType: 'image/jpeg',
      wasCompressed: false,
      originalSize: estimatedBytes,
      compressedSize: estimatedBytes
    };
  }

  return {
    base64: compressedBase64,
    dataUrl: compressedDataUrl,
    mimeType: 'image/jpeg',
    wasCompressed: true,
    originalSize: estimatedBytes,
    compressedSize
  };
}

/**
 * Downsampled 240x240 pixel layout metrics for instant local blank-frame & orientation heuristics.
 */
export function computeDocumentLayoutMetrics(img) {
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
  canvas.width = 0;
  canvas.height = 0;

  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const p = i * 4;
    lum[i] = pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114;
  }

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

export function isSidewaysLayout(m) {
  if (!m) return false;
  const isPortraitFrame = m.h > m.w * 1.05;
  if (!isPortraitFrame) return false;
  const rightSideEnergy = (m.topRightE || 0) + (m.bottomRightE || 0);
  const leftSideEnergy = (m.topLeftE || 0) + (m.bottomLeftE || 0);
  const hasStrongRightHeader = rightSideEnergy > leftSideEnergy * 1.15;
  const stronglyVerticalText = m.vertLineMod > m.horizLineMod * 1.25;
  return stronglyVerticalText && hasStrongRightHeader;
}

/**
 * 512-bit Perceptual Visual Fingerprint (dHash) for Cross-Device AI Flywheel Recognition.
 */
export async function computeImageFingerprint(dataUrl) {
  const img = await loadImageElement(dataUrl);
  if (!img) return '';
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return '';

    const computeRegionDHash = (sx, sy, sw, sh) => {
      const canvas = document.createElement('canvas');
      canvas.width = 17;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 17, 16);
      const pixels = ctx.getImageData(0, 0, 17, 16).data;
      canvas.width = 0;
      canvas.height = 0;

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
    return `${fullHash}:${centerHash}:${aspect}`;
  } catch (e) {
    console.warn('Fingerprint computation error:', e);
    return '';
  }
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
      return s;
    }
    const [sFull, sCenter, sAspectStr] = String(s.imageHash).split(':');
    const sAspect = Number(sAspectStr) || 0;
    if (!sFull || !sCenter) continue;
    if (tAspect && sAspect && Math.abs(tAspect - sAspect) > 5) continue;

    const fullDist = hexHammingDistance(tFull, sFull);
    const centerDist = hexHammingDistance(tCenter, sCenter);
    const totalDist = fullDist + centerDist;

    if (fullDist <= 16 && centerDist <= 16 && totalDist < bestScore) {
      bestScore = totalDist;
      bestSample = s;
    }
  }

  return bestSample;
}

