// Clean "One Door -> Two Isolated Rooms" OCR Orchestrator & Router
// Routes every uploaded document into EITHER:
//   1. `leaveOcrEngine.js`   (100% isolated Student Leave Slip pipeline)
//   2. `financeOcrEngine.js` (100% isolated Finance Receipt pipeline)
// Leaving zero shared prompts, zero cross-crops, and zero cross-regressions.

import { matchStudentName } from './studentMaster';
import {
  DEFAULT_GEMINI_KEYS,
  getStoredApiKey,
  getStoredTrainingDataset,
  fetchTrainingFromCloud,
  isBareGenericCameraFilename,
  normalizeOriginalFilename
} from './storage';
import {
  callGeminiJsonWithResilience,
  formatKhmerScanError,
  fileToBase64,
  loadImageElement,
  getImageDimensions,
  rotateImageDataUrl,
  makeRotatedThumbBase64,
  compressImageForOCR,
  computeDocumentLayoutMetrics,
  isSidewaysLayout,
  computeImageFingerprint,
  matchByImageFingerprint
} from './ocrCore';
import {
  runLeaveSlipOcrPipeline,
  createBlankLeaveResult,
  cropLeaveSlipNameLineZone
} from './leaveOcrEngine';
import {
  runFinanceReceiptOcrPipeline,
  createBlankFinanceResult,
  normalizeFinanceItems
} from './financeOcrEngine';

export {
  fileToBase64,
  rotateImageDataUrl,
  compressImageForOCR,
  getImageDimensions,
  computeImageFingerprint,
  matchByImageFingerprint,
  formatKhmerScanError,
  normalizeFinanceItems,
  cropLeaveSlipNameLineZone
};

export const MOBILE_CAPTURE_MIN_BRIGHTNESS = 100;
export const MOBILE_CAPTURE_MIN_EDGE_FRACTION = 0.03;

/**
 * Lightweight (~14 KB) AI Document Classifier & Upright Orientation Router.
 * Determines in ~0.8s (or ~3s on weak 3G) whether an image is a Student Leave Slip ("leave")
 * or a Finance Receipt ("finance"), plus the clockwise rotation (0/90/180/270) needed to stand upright.
 */
export async function classifyAndOrientDocument(dataUrl, apiKey = '') {
  const img = await loadImageElement(dataUrl);
  if (!img) {
    return { docType: 'leave', degrees: 0, confidence: 0, error: null };
  }

  const thumbBase64 = makeRotatedThumbBase64(img, 0, 460, 0.62);
  if (!thumbBase64) {
    return { docType: 'leave', degrees: 0, confidence: 0, error: null };
  }

  const prompt = [
    'Inspect this Cambodian school document thumbnail and classify BOTH its document type and upright orientation:',
    '1. "docType":',
    '   - "leave": Buddhist monastic school Student Leave Slip (លិខិតសុំច្បាប់ / ពាក្យសុំច្បាប់ / ព្រះរាជាណាចក្រកម្ពុជា / ជាតិ សាសនា ព្រះមហាក្សត្រ / ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ / មូលហេតុ).',
    '   - "finance": Financial receipt, cash bill, print-shop invoice, purchase slip, or income/expense voucher (វិក្កយបត្រ / INVOICE / ប៉ុង / បង្កាន់ដៃ / តារាង ឈ្មោះទំនិញ ចំនួន តម្លៃរាយ តម្លៃសរុប).',
    '2. "rotateClockwiseDegrees":',
    '   - 0 if text lines already run horizontally upright (normal reading position).',
    '   - 90, 180, or 270 clockwise degrees needed to make the header stand at the TOP and text read horizontally left-to-right.',
    'Return ONLY JSON: {"docType":"leave"|"finance","rotateClockwiseDegrees":0,"confidence":0.99}'
  ].join('\n');

  const parsed = await callGeminiJsonWithResilience({
    parts: [
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: thumbBase64 } }
    ],
    apiKey,
    thinkingBudget: 0,
    timeoutMs: 18000,
    maxTimeoutAttempts: 2
  });

  const rawType = String(parsed?.docType || '').trim().toLowerCase();
  const docType = rawType === 'finance' ? 'finance' : 'leave';
  const rawDeg = Number(parsed?.rotateClockwiseDegrees) || 0;
  const degrees = [0, 90, 180, 270].includes(rawDeg) ? rawDeg : 0;
  const confidence = Number(parsed?.confidence) || 0.9;

  return { docType, degrees, confidence, error: null };
}

/**
 * 4-Thumbnail Upright Picker (kept for explicit upright check compatibility).
 */
export async function detectUprightRotationWithAI(dataUrl, apiKey = '') {
  const img = await loadImageElement(dataUrl);
  if (!img) return null;

  const angles = [0, 90, 180, 270];
  const labels = ['A', 'B', 'C', 'D'];
  let thumbs;
  try {
    thumbs = angles.map(a => makeRotatedThumbBase64(img, a, 340, 0.58));
  } catch {
    return null;
  }
  if (thumbs.some(t => !t)) return null;

  const instruction = [
    'The next 4 images (A, B, C, D) are the SAME Khmer document rotated by 4 angles.',
    'Pick the ONE image where the printed Khmer text lines run horizontally upright (header at TOP, readable normally).',
    'Return ONLY JSON: {"uprightImage":"A"|"B"|"C"|"D","confidence":0.95}'
  ].join('\n');

  const parts = [{ text: instruction }];
  labels.forEach((label, i) => {
    parts.push({ text: `Image ${label}:` });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: thumbs[i] } });
  });

  try {
    const parsed = await callGeminiJsonWithResilience({
      parts,
      apiKey,
      thinkingBudget: 0,
      timeoutMs: 18000,
      maxTimeoutAttempts: 1
    });
    const idx = labels.indexOf(String(parsed?.uprightImage || '').trim().toUpperCase());
    const confidence = Number(parsed?.confidence);
    if (idx >= 0 && (Number.isNaN(confidence) || confidence >= 0.5)) {
      return { degrees: angles[idx], confidence: Number.isNaN(confidence) ? 0.85 : confidence };
    }
  } catch (err) {
    console.warn('4-thumb orientation check failed:', err?.message || err);
  }
  return null;
}

/**
 * Offline local pixel heuristic for document type & sideways leave-slip orientation when no internet is available.
 */
async function classifyAndOrientOfflineHeuristic(dataUrl, docTypeHint = 'auto', fileName = '') {
  const unchanged = {
    dataUrl,
    base64: dataUrl ? dataUrl.split(',')[1] || '' : '',
    rotatedDegrees: 0,
    detectedDocType: docTypeHint === 'finance' ? 'finance' : 'leave',
    method: 'heuristic'
  };
  if (!dataUrl) return unchanged;

  const lowerName = String(fileName || '').toLowerCase();
  const nameSuggestsFinance = /receipt|invoice|bill|finance|expense|ប៉ុង|វិក្កយបត្រ|ចំណាយ/.test(lowerName);
  const nameSuggestsLeave = /leave|student|ច្បាប់|សមណសិស្ស/.test(lowerName);

  const img = await loadImageElement(dataUrl);
  if (!img) return unchanged;

  const m = computeDocumentLayoutMetrics(img);
  if (!m) return unchanged;

  let resolvedType = docTypeHint;
  if (!resolvedType || resolvedType === 'auto') {
    if (nameSuggestsFinance) {
      resolvedType = 'finance';
    } else if (nameSuggestsLeave) {
      resolvedType = 'leave';
    } else {
      // Receipts are commonly narrow vertical slips with strong table column lines (vertLineMod close to horizLineMod)
      const isNarrowPortrait = m.h > m.w * 1.18;
      const hasStrongVerticalGrid = m.vertLineMod > m.horizLineMod * 0.82 && !isSidewaysLayout(m);
      resolvedType = (isNarrowPortrait && hasStrongVerticalGrid) ? 'finance' : 'leave';
    }
  }

  if (resolvedType === 'finance') {
    return { ...unchanged, detectedDocType: 'finance' };
  }

  if (!isSidewaysLayout(m)) {
    return { ...unchanged, detectedDocType: 'leave' };
  }

  const scoreTopOnRight = (m.topRightE * 1.15 + m.bottomRightE * 0.75) - (m.topLeftE * 0.85);
  const scoreTopOnLeft = (m.bottomLeftE * 1.15 + m.topLeftE * 0.75) - (m.bottomRightE * 0.85);
  const degreesToRotate = scoreTopOnLeft > scoreTopOnRight * 1.6 && scoreTopOnLeft > 0 ? 90 : 270;
  const rotated = await rotateImageDataUrl(dataUrl, degreesToRotate);
  return {
    ...rotated,
    detectedDocType: 'leave',
    method: 'heuristic'
  };
}

/**
 * AUTO-ORIENT & PRE-CLASSIFY:
 * Rotates sideways/upside-down documents upright AND detects `detectedDocType` ('leave' | 'finance')
 * in ONE lightweight ~14 KB call so `processUploadedImage` can go straight into the isolated engine.
 */
export async function autoOrientDocumentImage(dataUrl, docTypeHint = 'auto', apiKey = '') {
  const noChange = (method, detectedDocType = docTypeHint, routerError = '') => ({
    dataUrl,
    base64: dataUrl ? dataUrl.split(',')[1] || '' : '',
    rotatedDegrees: 0,
    detectedDocType: detectedDocType === 'finance' ? 'finance' : (detectedDocType === 'leave' ? 'leave' : ''),
    routerError,
    method
  });
  if (!dataUrl) return noChange('none');
  if (docTypeHint === 'finance') return noChange('none', 'finance');

  const key = apiKey || getStoredApiKey() || DEFAULT_GEMINI_KEYS[0];
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (online && key) {
    try {
      const routed = await classifyAndOrientDocument(dataUrl, key);
      const finalType = (docTypeHint === 'leave' || docTypeHint === 'finance')
        ? docTypeHint
        : routed.docType;
      console.log(`🧭 [One-Door Router] type=${finalType}, rotate=${routed.degrees}° (confidence ${routed.confidence})`);
      if (routed.degrees === 0 || finalType === 'finance' && routed.degrees === 0) {
        return noChange('ai', finalType);
      }
      const rotated = await rotateImageDataUrl(dataUrl, routed.degrees);
      return {
        ...rotated,
        detectedDocType: finalType,
        routerError: '',
        method: 'ai'
      };
    } catch (err) {
      const khmerErr = formatKhmerScanError(err);
      console.warn('Router check failed, falling back to local heuristic:', khmerErr);
      const fallback = await classifyAndOrientOfflineHeuristic(dataUrl, docTypeHint);
      return { ...fallback, routerError: khmerErr };
    }
  }

  return classifyAndOrientOfflineHeuristic(dataUrl, docTypeHint);
}

/**
 * MOBILE CAPTURE GUARD (on-device, ~0.08s):
 * Rejects pitch-black / covered-lens / empty frames immediately without wasting network calls.
 * When `docTypeHint === 'leave'`, applies the 2-format rule; when `'auto'`, never blindly rotates receipts 270°.
 */
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

  const img = await loadImageElement(dataUrl);
  if (!img) return unchanged('unknown');

  const m = computeDocumentLayoutMetrics(img);
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
    if (docTypeHint === 'leave') {
      return unchanged('unknown', roundedMetrics);
    }
    if (m.meanLum < 30 || m.edgeFraction < 0.005) {
      return unchanged('unknown', roundedMetrics);
    }
    return unchanged('upright', roundedMetrics);
  }

  // Only auto-rotate 270° locally when explicitly in 'leave' mode or completely offline.
  // In 'auto' mode while online, `autoOrientDocumentImage` classifies 'leave' vs 'finance' cleanly first
  // so receipts with vertical table borders are NEVER falsely rotated sideways!
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (docTypeHint === 'leave' || isOffline) {
    if (isSidewaysLayout(m)) {
      const rotated = await rotateImageDataUrl(dataUrl, 270, 1600);
      return { ...rotated, format: 'sideways_half', metrics: roundedMetrics };
    }
  }

  if (Math.max(m.w, m.h) > 1600) {
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

/**
 * Main Entry Point ("One Door -> Two 100% Isolated Rooms"):
 *  1. Resolves orientation + document type ('leave' vs 'finance')
 *  2. Checks Cross-Device AI Flywheel Ground-Truth Memory (with 1.2s cloud timeout guard)
 *  3. Compresses image cleanly (~90-120 KB) for fast 3G/4G transmission
 *  4. Dispatches EXCLUSIVELY to `runLeaveSlipOcrPipeline` OR `runFinanceReceiptOcrPipeline`
 */
export async function processUploadedImage(
  file,
  {
    docTypeHint = 'auto',
    resolvedDocType = '',
    preRouterError = '',
    apiKey = '',
    studentMaster = [],
    preOrientedDataUrl = '',
    skipOrientRetry = false,
    isMobileCapture = false,
    prefetchedTrainingDataset = null,
    onStageChange = null
  } = {}
) {
  onStageChange?.('orient');

  const effectiveApiKey = apiKey || getStoredApiKey() || DEFAULT_GEMINI_KEYS[0] || '';
  let rawDataUrl = preOrientedDataUrl;
  let targetEngine = (resolvedDocType === 'leave' || resolvedDocType === 'finance')
    ? resolvedDocType
    : ((docTypeHint === 'leave' || docTypeHint === 'finance') ? docTypeHint : '');
  let routerNetworkError = preRouterError || '';

  // Step 0: Read raw image + resolve upright orientation & document type if not already pre-routed
  if (!rawDataUrl) {
    const { dataUrl: initialDataUrl } = await fileToBase64(file);
    if (isMobileCapture) {
      const mobileCheck = await classifyMobileCapture(initialDataUrl, docTypeHint);
      if (mobileCheck.format === 'unknown') {
        const rejectMsg = docTypeHint === 'leave'
          ? 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបងងឹត ព្រិល ឬមិនមែនជាក្រដាសច្បាប់)។ សូមថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។'
          : 'ប្រព័ន្ធមិនអាចសម្គាល់ឯកសារបានទេ (រូបងងឹតខ្លាំង ឬព្រិលខ្លាំង)។ សូមថតឱ្យច្បាស់ម្ដងទៀត។';
        return {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          fileSize: file.size,
          imageHash: '',
          previewUrl: initialDataUrl,
          processingMode: 'unrecognized_format',
          unrecognizedFormat: true,
          unrecognizedReason: rejectMsg,
          timestamp: new Date().toISOString(),
          result: {
            detectedType: docTypeHint === 'finance' ? 'finance' : 'leave',
            unrecognizedFormat: true,
            unrecognizedReason: rejectMsg,
            leaveItems: [],
            financeItems: []
          }
        };
      }
      rawDataUrl = mobileCheck.dataUrl || initialDataUrl;
    } else {
      rawDataUrl = initialDataUrl;
    }
  }

  // If docType is still 'auto' (not yet classified by caller), run the lightweight ~14 KB One-Door Router now
  if (!targetEngine) {
    const oriented = await autoOrientDocumentImage(rawDataUrl, docTypeHint, effectiveApiKey);
    if (oriented?.dataUrl) {
      rawDataUrl = oriented.dataUrl;
    }
    targetEngine = oriented?.detectedDocType === 'finance' ? 'finance' : 'leave';
    if (oriented?.routerError) {
      routerNetworkError = oriented.routerError;
    }
  } else if (!preOrientedDataUrl && targetEngine === 'leave' && !isMobileCapture) {
    const oriented = await autoOrientDocumentImage(rawDataUrl, 'leave', effectiveApiKey);
    if (oriented?.dataUrl) {
      rawDataUrl = oriented.dataUrl;
    }
    if (oriented?.routerError) {
      routerNetworkError = oriented.routerError;
    }
  }

  const imageHash = await computeImageFingerprint(rawDataUrl);

  // Step 1: Time-boxed Training Dataset Sync (max 1.2s wait so flaky internet never stalls on Supabase!)
  let trainingDataset = Array.isArray(prefetchedTrainingDataset)
    ? prefetchedTrainingDataset
    : getStoredTrainingDataset();
  if (!Array.isArray(prefetchedTrainingDataset) && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const cloudMerged = await Promise.race([
        fetchTrainingFromCloud().catch(() => null),
        new Promise(resolve => setTimeout(() => resolve(null), 1200))
      ]);
      if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
        trainingDataset = cloudMerged;
      }
    } catch {
      // Keep local trainingDataset
    }
  }

  // Step 1B: AI Flywheel Visual & Filename Memory Lookup
  let matchedSample = matchByImageFingerprint(imageHash, trainingDataset);
  if (!matchedSample && file?.name && !isBareGenericCameraFilename(file.name) && Array.isArray(trainingDataset)) {
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
    const gt = matchedSample.groundTruth;
    const isLeave = matchedSample.docType !== 'finance';
    const verifiedMatch = isLeave && gt.name
      ? matchStudentName(gt.name, studentMaster, gt.grade)
      : null;

    if (!isLeave || (verifiedMatch && verifiedMatch.confidence >= 0.75)) {
      let cleanDate = String(gt.date || '').trim()
        .replace(/2024/g, '2026')
        .replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      const cleanReason = String(gt.reason || 'ការងារផ្ទាល់ខ្លួន').replace(/\s+/g, ' ').trim();

      return {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileSize: file.size,
        imageHash,
        previewUrl: rawDataUrl,
        processingMode: 'ai_flywheel_memory',
        timestamp: new Date().toISOString(),
        result: {
          detectedType: isLeave ? 'leave' : 'finance',
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
          financeItems: !isLeave
            ? normalizeFinanceItems(Array.isArray(gt.items) ? gt.items : (Array.isArray(gt) ? gt : [gt]))
            : []
        }
      };
    }
  }

  // Step 2: Bandwidth-Smart Compression (~90-120 KB JPEG)
  const {
    base64,
    dataUrl,
    mimeType: compressedMimeType
  } = await compressImageForOCR(rawDataUrl, file?.size || 0, file?.type || 'image/jpeg');

  // Fast-fail guard: if the lightweight router already timed out / failed on a dead connection,
  // return the right blank template immediately in Khmer instead of waiting a second full timeout!
  if (!effectiveApiKey) {
    const missingKeyMsg = 'មិនទាន់មាន AI Key — សូមបញ្ចូល AI Key ដើម្បីដំណើរការស្កេន';
    const blank = targetEngine === 'finance'
      ? createBlankFinanceResult(missingKeyMsg)
      : createBlankLeaveResult(missingKeyMsg);
    blank.imageHash = imageHash;
    return {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.name,
      fileSize: file.size,
      imageHash,
      previewUrl: dataUrl || rawDataUrl,
      processingMode: 'missing_api_key',
      timestamp: new Date().toISOString(),
      result: blank
    };
  }

  if (routerNetworkError) {
    const fallbackType = (await classifyAndOrientOfflineHeuristic(rawDataUrl, docTypeHint, file?.name)).detectedDocType;
    const blank = fallbackType === 'finance'
      ? createBlankFinanceResult(routerNetworkError)
      : createBlankLeaveResult(routerNetworkError);
    blank.imageHash = imageHash;
    return {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.name,
      fileSize: file.size,
      imageHash,
      previewUrl: dataUrl || rawDataUrl,
      processingMode: 'offline_error',
      timestamp: new Date().toISOString(),
      result: blank
    };
  }

  // ============================================================================
  // Step 3: STRICT ISOLATED ENGINE DISPATCH (Zero Shared Logic!)
  // ============================================================================
  let processingMode;
  let extractionResult;

  if (targetEngine === 'finance') {
    const finOut = await runFinanceReceiptOcrPipeline({
      base64,
      dataUrl: rawDataUrl || dataUrl,
      mimeType: compressedMimeType || 'image/jpeg',
      apiKey: effectiveApiKey,
      trainingDataset,
      onStageChange
    });
    processingMode = finOut.processingMode;
    extractionResult = finOut.extractionResult;

    // If receipt was sideways/upside-down and not yet rotated, rotate once and re-run Finance Engine
    const finRotate = Number(extractionResult?.rotateClockwiseDegrees) || 0;
    if (!skipOrientRetry && processingMode === 'gemini_cloud' && [90, 180, 270].includes(finRotate)) {
      const fixed = await rotateImageDataUrl(rawDataUrl, finRotate);
      if (fixed?.dataUrl && fixed.rotatedDegrees) {
        return processUploadedImage(file, {
          docTypeHint: 'finance',
          resolvedDocType: 'finance',
          apiKey: effectiveApiKey,
          studentMaster,
          preOrientedDataUrl: fixed.dataUrl,
          skipOrientRetry: true,
          isMobileCapture,
          prefetchedTrainingDataset: trainingDataset,
          onStageChange
        });
      }
    }
  } else {
    const leaveOut = await runLeaveSlipOcrPipeline({
      base64,
      dataUrl: rawDataUrl || dataUrl,
      mimeType: compressedMimeType || 'image/jpeg',
      apiKey: effectiveApiKey,
      studentMaster,
      trainingDataset,
      onStageChange
    });
    processingMode = leaveOut.processingMode;
    extractionResult = leaveOut.extractionResult;

    // Post-OCR orientation guard for Leave Slips
    const leaveRotate = Number(extractionResult?.rotateClockwiseDegrees) || 0;
    if (!skipOrientRetry && processingMode === 'gemini_cloud' && [90, 180, 270].includes(leaveRotate)) {
      if (isMobileCapture && docTypeHint === 'leave') {
        const unrecognizedMsg = 'ប្រព័ន្ធមិនស្គាល់ទម្រង់រូបនេះទេ (រូបបញ្ច្រាស ឬខុសពី ២ ទម្រង់កំណត់)។ សូមចុចប៊ូតុងបង្វិល ↻ លើរូប ឬថតម្ដងទៀតតាមទម្រង់ទី ១ ឬទី ២។';
        return {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
            detectedType: 'leave',
            unrecognizedFormat: true,
            unrecognizedReason: unrecognizedMsg
          }
        };
      }

      const fixed = await rotateImageDataUrl(rawDataUrl, leaveRotate);
      if (fixed?.dataUrl && fixed.rotatedDegrees) {
        return processUploadedImage(file, {
          docTypeHint: 'leave',
          resolvedDocType: 'leave',
          apiKey: effectiveApiKey,
          studentMaster,
          preOrientedDataUrl: fixed.dataUrl,
          skipOrientRetry: true,
          isMobileCapture: false,
          prefetchedTrainingDataset: trainingDataset,
          onStageChange
        });
      }
    }
  }

  extractionResult.imageHash = imageHash;
  extractionResult.initialOcrName = extractionResult.leaveItems?.[0]?.initialOcrName || '';

  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    fileSize: file.size,
    imageHash,
    previewUrl: dataUrl || rawDataUrl,
    processingMode,
    timestamp: new Date().toISOString(),
    result: extractionResult
  };
}
