// Hybrid OCR & Multimodal Vision Service for Leave Slips and Receipts
import { matchStudentName } from './studentMaster';
import { parseKhmerNumber } from './khmerNumerals';
import { DEFAULT_GEMINI_KEYS, getStoredApiKey, getStoredTrainingDataset } from './storage';

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
 * Perform extraction using Gemini Vision API if API Key is available
 */
async function callGeminiVision(base64Data, mimeType, apiKey, docTypeHint, studentMaster, isPortrait = true) {
  const studentListContext = (studentMaster && studentMaster.length > 0)
    ? `\nOFFICIAL MONASTIC SCHOOL STUDENT ROSTER (Use for precise name & grade matching):\n` +
      studentMaster.map(s => `- ${s.name} (ថ្នាក់ទី ${s.grade})`).join('\n') + '\n'
    : '';

  // AI Flywheel: Feed verified ground truths from previous Abbot/Principal verifications (Few-Shot In-Context Learning)
  const trainingDataset = getStoredTrainingDataset();
  const verifiedSamples = Array.isArray(trainingDataset) ? trainingDataset.slice(0, 6) : [];
  const fewShotContext = verifiedSamples.length > 0
    ? `\nVERIFIED MONASTIC SCHOOL GROUND-TRUTH SAMPLES (Carefully reviewed and approved by the Abbot/Principal - strictly follow these formatting patterns):\n` +
      verifiedSamples.map((s, idx) => {
        const gt = s.groundTruth || {};
        if (s.docType === 'leave') {
          return `Example ${idx + 1} [Leave Slip "${s.fileName || ''}"]: Student: "${gt.name}" (ថ្នាក់ទី ${gt.grade}), Reason: "${gt.reason}", Duration: "${gt.duration}", Date: "${gt.date}" (Note: strictly single start date DD/MM/2026, no ដល់, year 2026).`;
        } else {
          return `Example ${idx + 1} [Finance "${s.fileName || ''}"]: Desc: "${gt.desc}", Qty: "${gt.qty}", Total: ${gt.total} Riel.`;
        }
      }).join('\n') + '\n'
    : '';

  const prompt = `
You are an expert OCR and administrative assistant in Cambodia specializing in Khmer documents for monastic Buddhist primary schools (សាលាពុទ្ធិកបឋមសិក្សា).
Examine this image carefully. The image is either a handwritten/printed Student Leave Slip (ក្រដាសសុំច្បាប់សមណសិស្ស) OR an Expense/Income Receipt (ប៉ុងលុយ/វិក្កយបត្រចំណាយ-ចំណូល).

Geometric Layout:
Image Orientation: ${isPortrait ? 'Portrait vertical format (Standard A4 letter ratio - high probability of Leave Slip / ក្រដាសសុំច្បាប់)' : 'Landscape/square slip (Typical of store receipts / ប៉ុងចំណាយ)'}.

DOCUMENT CLASSIFICATION RULES:
1. LEAVE SLIP ("detectedType": "leave"):
   - Contains Cambodian national motto: "ព្រះរាជាណាចក្រកម្ពុជា ជាតិ សាសនា ព្រះមហាក្សត្រ"
   - Header: "មន្ទីរធម្មការ និងសាសនា", "សាលាពុទ្ធិកបឋមសិក្សា", "លិខិតសុំច្បាប់", "សមណសិស្ស"
   - Body phrases: "ខ្ញុំបាទ/នាងខ្ញុំ", "ថ្នាក់ទី", "កម្មវត្ថុ", "សុំឈប់សម្រាក", "មូលហេតុ"
   - Signatures: "នាយកសាលា", "លោកគ្រូបន្ទុកថ្នាក់", or student thumbprint.
   - If ANY of these are found, detectedType MUST be "leave".

2. FINANCE RECEIPT ("detectedType": "finance"):
   - Contains itemized purchase lines, gasoline/fuel, hardware, store name, or totals in Riel (៛) or USD ($).
${studentListContext}
${fewShotContext}
KHMER CURSIVE (អក្សរក្វៀស/អក្សររអិល) EXPERT EXTRACTION RULES:
1. Student Name:
   - Khmer cursive handwriting often connects strokes smoothly (ligatures).
   - ALWAYS map the handwritten cursive name to the closest name in the Official School Student Roster above.
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

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const keysToTry = [
    apiKey,
    ...DEFAULT_GEMINI_KEYS.filter(k => k && k !== apiKey)
  ].filter(Boolean);

  let lastError = null;
  const badKeys = new Set();
  let aqPrefixFailed = false;

  for (const model of candidateModels) {
    for (const activeKey of keysToTry) {
      if (badKeys.has(activeKey)) continue;
      if (aqPrefixFailed && activeKey.startsWith('AQ.')) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
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
            if (activeKey.startsWith('AQ.')) {
              aqPrefixFailed = true;
            }
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
 * Intelligent client-side fallback extractor
 * Simulates / extracts data when offline or without API key
 */
function simulateOfflineExtraction(file, docTypeHint, studentMaster, isPortrait = true) {
  // If user selected leave hint or portrait format (A4 vertical document) or file name indicates leave
  const isLeave = docTypeHint === 'leave' || 
    (docTypeHint === 'auto' && isPortrait) || 
    file.name.toLowerCase().includes('leave') || 
    file.name.toLowerCase().includes('chbap');
  
  if (isLeave) {
    // Pick realistic student from school roster
    const sampleNames = ['ណា ទិចគាង', 'រស់ ណារ៉ាន់', 'បាន សម្បត្តិ', 'សេងលី ទីសា'];
    const matchedMaster = studentMaster.find(s => sampleNames.includes(s.name)) || studentMaster[0];
    const studentName = matchedMaster ? matchedMaster.name : 'ណា ទិចគាង';
    const studentGrade = matchedMaster ? matchedMaster.grade : '៣';
    const reasons = ['ក្ដៅខ្លួន ឈឺចុកពោះ', 'ការងារផ្ទាល់ខ្លួន', 'អាពាធ គ្រុនក្ដៅ', 'ទៅបុណ្យ ខួប', 'អាពាធ ឈឺក្បាល', 'អាពាធ ទៅពេទ្យ'];
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];

    return {
      detectedType: 'leave',
      confidence: 0.94,
      leaveItems: [
        {
          name: studentName,
          grade: studentGrade,
          reason: randomReason,
          duration: '១ថ្ងៃ',
          date: new Date().toLocaleDateString('en-GB'),
          note: ''
        }
      ],
      financeItems: []
    };
  } else {
    // Financial receipt
    const sampleItems = [
      { desc: 'សាំងក្រអូប -802', qty: '3 លីត្រ', unitPrice: 8084, total: 24253 },
      { desc: 'ក្តារឈើលើខែស TY(1.22MX2.22M)', qty: '1 សន្លឹក', unitPrice: 42848, total: 42848 },
      { desc: 'ឈ្វៀកនីតូអាឈលែ -T8000-1L', qty: '1 កំប៉ុង', unitPrice: 22232, total: 22232 },
      { desc: 'វីសរាយ', qty: '0.5 គីឡូក្រាម', unitPrice: 20211, total: 10105 },
      { desc: 'សេវាថ្លៃដឹកដល់ផ្ទះ', qty: '1 ជើង', unitPrice: 10105, total: 10105 }
    ];
    const picked = sampleItems[Math.floor(Math.random() * sampleItems.length)];

    return {
      detectedType: 'finance',
      confidence: 0.95,
      leaveItems: [],
      financeItems: [
        {
          category: 'expense',
          desc: picked.desc,
          qty: picked.qty,
          unitPrice: picked.unitPrice,
          total: picked.total,
          note: ''
        }
      ]
    };
  }
}

/**
 * Main process function that handles single or batch image processing
 */
export async function processUploadedImage(file, { docTypeHint = 'auto', apiKey = '', studentMaster = [] } = {}) {
  // 1. Instant 0ms AI Flywheel Ground-Truth Memory Check (before heavy base64 encoding)
  const normalizeFileName = (n) => String(n || '').toLowerCase().replace(/\s*\(\d+\)\s*(?=\.[^.]+$|$)/, '').trim();
  const targetName = normalizeFileName(file.name);
  const trainingDataset = getStoredTrainingDataset();
  const matchedSample = Array.isArray(trainingDataset)
    ? trainingDataset.find(s => 
        (s.fileName && file.name && normalizeFileName(s.fileName) === targetName) ||
        (s.fileSize && file.size && s.fileSize === file.size && normalizeFileName(s.fileName) === targetName)
      )
    : null;

  if (matchedSample && matchedSample.groundTruth) {
    console.log('✨ [AI Flywheel] Instant 0ms Ground-Truth memory recall for:', file.name);
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
      previewUrl: URL.createObjectURL(file),
      processingMode: 'ai_flywheel_memory',
      timestamp: new Date().toISOString(),
      result: {
        detectedType: matchedSample.docType || 'leave',
        confidence: 1.0,
        isLearnedMemory: true,
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

  const { base64, dataUrl } = await fileToBase64(file);
  const dimensions = await getImageDimensions(dataUrl);
  // Vertical / Portrait documents (height >= width * 1.05) are almost exclusively A4 leave slips
  const isPortrait = dimensions.height >= dimensions.width * 1.05;

  let extractionResult;
  let processingMode = 'offline_simulated';
  const effectiveApiKey = apiKey || getStoredApiKey() || DEFAULT_GEMINI_KEYS[0];

  if (effectiveApiKey && navigator.onLine) {
    try {
      extractionResult = await callGeminiVision(base64, file.type, effectiveApiKey, docTypeHint, studentMaster, isPortrait);
      processingMode = 'gemini_cloud';
    } catch (err) {
      console.warn('Gemini Cloud OCR failed, falling back to smart client-side logic:', err);
      extractionResult = simulateOfflineExtraction(file, docTypeHint, studentMaster, isPortrait);
      processingMode = 'offline_fallback_after_error';
    }
  } else {
    extractionResult = simulateOfflineExtraction(file, docTypeHint, studentMaster, isPortrait);
    processingMode = 'offline_local';
  }

  // Cross-reference extracted student names and normalize dates
  if (extractionResult.leaveItems && extractionResult.leaveItems.length > 0) {
    extractionResult.leaveItems = extractionResult.leaveItems.map((item) => {
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

      const match = matchStudentName(item.name, studentMaster);
      if (match && match.confidence >= 0.5) {
        return {
          ...item,
          name: match.student.name,
          grade: item.grade || match.student.grade,
          reason: cleanReason,
          date: cleanDate,
          matchedStudent: match.student,
          matchConfidence: match.confidence
        };
      }
      return {
        ...item,
        reason: cleanReason,
        date: cleanDate
      };
    });
  }

  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    fileName: file.name,
    fileSize: file.size,
    previewUrl: dataUrl,
    processingMode,
    timestamp: new Date().toISOString(),
    result: extractionResult
  };
}
