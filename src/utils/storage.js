// Central State Storage and Mutator Guard (Rule 7)
import { DEFAULT_STUDENT_MASTER, matchStudentName } from './studentMaster';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Default Gemini API Key Pool safely loaded from environment variables
const envKeys = import.meta.env?.VITE_GEMINI_KEYS;
export const DEFAULT_GEMINI_KEYS = envKeys
  ? envKeys.split(',').map(k => k.trim()).filter(Boolean)
  : [];

const STORAGE_KEYS = {
  APP_STATE: 'ann_klee_app_state_v1',
  STUDENT_MASTER: 'ann_klee_student_master_v1',
  API_KEY: 'ann_klee_gemini_api_key_v1',
  OFFLINE_QUEUE: 'ann_klee_offline_queue_v1',
  TRAINING_DATASET: 'ann_klee_training_dataset_v1',
};

// Initial default Leave Data matching PDF 2
export const INITIAL_LEAVE_DATA = {
  '2026-07': [
    { id: 'l1', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'អាពាធ គ្រិចដៃ', duration: '១ថ្ងៃ', date: '01/07/2026', note: '' },
    { id: 'l2', name: 'ស៊ឹង វណ្ណេត', grade: '៣', reason: 'អាពាធ ឈឺក្បាល', duration: '១ថ្ងៃ', date: '01/07/2026', note: '' },
    { id: 'l3', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'អាពាធ គ្រុនក្ដៅ', duration: '១ថ្ងៃ', date: '06/07/2026', note: '' },
    { id: 'l4', name: 'គឹម សុភាព', grade: '១', reason: 'អាពាធ ឈឺរលាកក្បាល', duration: '១ថ្ងៃ', date: '03/07/2026', note: '' },
    { id: 'l5', name: 'បាន សម្បត្តិ', grade: '៣', reason: 'អាពាធ ទៅពេទ្យ', duration: '១ថ្ងៃ', date: '06/07/2026', note: '' },
    { id: 'l6', name: 'បាន សម្បត្តិ', grade: '៣', reason: 'អាពាធ ទៅពេទ្យ', duration: '១ថ្ងៃ', date: '07/07/2026', note: '' },
    { id: 'l7', name: 'យិន លាភ', grade: '៣', reason: 'អាពាធ វិលមុខ', duration: '១ល្ងាច', date: '07/07/2026', note: '' },
    { id: 'l8', name: 'សេងលី ទីសា', grade: '២', reason: 'អាពាធ គ្រុនឈាម', duration: '៥ថ្ងៃ', date: '04/07/2026', note: '' },
    { id: 'l9', name: 'ជួង ចិត្រា', grade: '២', reason: 'ទៅបុណ្យ ខួប', duration: '១ថ្ងៃកន្លះ', date: '16/07/2026', note: '' },
    { id: 'l10', name: 'ឡឿន រ៉ាដូ', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យ ខួប', duration: '១ថ្ងៃកន្លះ', date: '16/07/2026', note: '' },
    { id: 'l11', name: 'ប៊ិន ធឿនឧត្តម', grade: '២', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '13/07/2026', note: '' },
    { id: 'l12', name: 'តួរញ្ញា', grade: '១', reason: 'ឈឺក្បាល វិលមុខ', duration: '១ថ្ងៃ', date: '20/07/2026', note: '' },
    { id: 'l13', name: 'ណា ទិចគាង', grade: '៣', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '20/07/2026', note: '' },
  ]
};

// Initial default Finance Data matching PDF 1
export const INITIAL_FINANCE_DATA = {
  '2026-07': {
    income: [
      { id: 'inc1', desc: 'ប្រាក់សល់ពីខែមិថុនា', qty: '', unitPrice: '', total: 3443031, note: '' },
      { id: 'inc2', desc: 'ប្រាក់ពីសមណសិស្សដាក់ច្បាប់ ខែកក្កដា', qty: '១៣អង្គ', unitPrice: 2000, total: 26000, note: '' },
      { id: 'inc3', desc: 'ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែកក្កដា', qty: '៧អង្គ', unitPrice: 27500, total: 27500, note: '' }
    ],
    expense: [
      { id: 'exp1', desc: 'ម៉ាស៊ីនស្កេនកាតសិស្ស 2D Desktop Barcode Scanner', qty: '1 ម៉ាស៊ីន', unitPrice: 268670, total: 268670, note: '' },
      { id: 'exp2', desc: 'ក្តារឈើលើខែស TY(1.22MX2.22M)', qty: '2 សន្លឹក', unitPrice: 42848, total: 85696, note: '' },
      { id: 'exp3', desc: 'វីសរាយ', qty: '0.8គីឡូក្រាម', unitPrice: 20211, total: 16169, note: '' },
      { id: 'exp4', desc: 'សាយូវ៉ាវីសធំ', qty: '4 គ្រាប់', unitPrice: 1010, total: 4042, note: '' },
      { id: 'exp5', desc: 'សាំងក្រអូប -802', qty: '3 លីត្រ', unitPrice: 8084, total: 24253, note: '' },
      { id: 'exp6', desc: 'ឈ្វៀកនីតូអាឈលែ -T8000-1L', qty: '1 កំប៉ុង', unitPrice: 22232, total: 22232, note: '' },
      { id: 'exp7', desc: 'សេវាថ្លៃដឹកដល់ផ្ទះ -$2.50', qty: '1 ជើង', unitPrice: 10105, total: 10105, note: '' },
      { id: 'exp8', desc: 'ព្រីនធឺរខាតរៀវ ABC', qty: '1 គ្រាប់', unitPrice: 6669, total: 6669, note: '' },
      { id: 'exp9', desc: 'ឈ្វៀកនីតូអាឈលែ -T8000-1L', qty: '1 កំប៉ុង', unitPrice: 22232, total: 22232, note: '' },
      { id: 'exp10', desc: 'វីសរ៉ីករាយ', qty: '0.25គីឡូក្រាម', unitPrice: 20211, total: 5052, note: '' },
      { id: 'exp11', desc: 'ក្តារឈើលើខែស TY(1.22MX2.22M)', qty: '1 សន្លឹក', unitPrice: 42848, total: 42848, note: '' },
      { id: 'exp12', desc: 'សេវាថ្លៃដឹកដល់ផ្ទះ -$2.50', qty: '1 ជើង', unitPrice: 10105, total: 10105, note: '' },
      { id: 'exp13', desc: 'ចំណាយលើគ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '94 ម៉ោង', unitPrice: 4000, total: 376000, note: '' }
    ]
  }
};

export const INITIAL_METADATA = {
  ministry: 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម',
  school: 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង',
  location: 'ក្រុងកំពង់ចាម',
  wat: 'វត្តខេមវ័ន',
  directorTitle: 'នាយកសាលា',
  reporterTitle: 'អ្នកធ្វើរបាយការណ៍',
  currentMonth: '2026-07',
  lunarDateHeader: 'ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមីអដ្ឋស័ក ព.ស.២៥៧០',
  solarDateHeader: 'ត្រូវនឹងថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦',
  useKhmerNumerals: true,
};

/**
 * Load complete application state from LocalStorage
 */
export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!raw) {
      return {
        leaves: INITIAL_LEAVE_DATA,
        finance: INITIAL_FINANCE_DATA,
        meta: INITIAL_METADATA,
        studentMaster: DEFAULT_STUDENT_MASTER,
      };
    }
    const parsed = JSON.parse(raw);
    const mergedMeta = { ...INITIAL_METADATA, ...(parsed.meta || {}) };
    // Automatically migrate school name if it was using the older version
    if (!mergedMeta.school || mergedMeta.school.includes('ហ៊ុន សែន')) {
      mergedMeta.school = 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង';
    }
    // Automatically migrate director title to match official PDF 2 standard ('នាយកសាលា')
    if (!mergedMeta.directorTitle || mergedMeta.directorTitle === 'ព្រះនាយក' || mergedMeta.directorTitle === 'ព្រះចៅអធិការ') {
      mergedMeta.directorTitle = 'នាយកសាលា';
    }

    // Normalize any cached quantities in finance to avoid line-breaks
    const rawFinance = parsed.finance || INITIAL_FINANCE_DATA;
    const normalizedFinance = { ...rawFinance };
    Object.keys(normalizedFinance).forEach(month => {
      const mData = normalizedFinance[month];
      if (mData && mData.expense) {
        mData.expense = mData.expense.map(e => ({
          ...e,
          qty: e.qty ? e.qty.replace(/0\.25\s+គីឡូក្រាម/, '0.25គីឡូក្រាម').replace(/0\.8\s+គីឡូក្រាម/, '0.8គីឡូក្រាម') : e.qty
        }));
      }
    });

    // Synchronize studentMaster: Filter out old legacy mock test names and guarantee 80 official students
    const legacyMockNames = new Set([
      'កែវ វិសាល', 'ឡុង វិបុល', 'ស៊ូ សំណាង', 'ម៉ៅ ដារ៉ា',
      'ខៀវ វិចិត្រ', 'ព្រំ សុខា', 'ជា ពិសិដ្ឋ', 'ចាន់ វណ្ណា', 'ហេង សុវណ្ណ'
    ]);
    const legacyMockIds = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']);

    let rawStudents = Array.isArray(parsed.studentMaster) ? parsed.studentMaster : DEFAULT_STUDENT_MASTER;
    // Filter out old mock records
    let loadedStudents = rawStudents.filter(s => !legacyMockNames.has(s.name) && !legacyMockIds.has(String(s.id)));

    // Guarantee all 80 official students from DEFAULT_STUDENT_MASTER are present
    const currentNames = new Set(loadedStudents.map(s => s.name));
    DEFAULT_STUDENT_MASTER.forEach(def => {
      if (!currentNames.has(def.name)) {
        loadedStudents.push(def);
      }
    });

    // Synchronize metadata (id, grade, aliases) from DEFAULT_STUDENT_MASTER
    loadedStudents = loadedStudents.map(s => {
      const def = DEFAULT_STUDENT_MASTER.find(d => d.name === s.name);
      if (def) {
        return {
          ...s,
          id: def.id,
          grade: def.grade || s.grade,
          aliases: Array.from(new Set([...(def.aliases || []), ...(s.aliases || [])]))
        };
      }
      return s;
    });

    // Clean and normalize all leave dates: strip any "ដល់...", replace 2024 with 2026
    const rawLeaves = parsed.leaves || INITIAL_LEAVE_DATA;
    const normalizedLeaves = { ...rawLeaves };
    Object.keys(normalizedLeaves).forEach(month => {
      const records = normalizedLeaves[month];
      if (Array.isArray(records)) {
        normalizedLeaves[month] = records.map(r => {
          let cleanDate = String(r.date || '').trim();
          cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
          if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
            const parts = cleanDate.split(/ដល់|-|\/to\//i);
            if (parts[0] && parts[0].trim().length >= 6) {
              cleanDate = parts[0].trim();
            }
          }
          let cleanReason = String(r.reason || '').replace(/\s+/g, ' ').trim();
          return {
            ...r,
            reason: cleanReason,
            date: cleanDate
          };
        });
      }
    });

    return {
      leaves: normalizedLeaves,
      finance: normalizedFinance,
      meta: mergedMeta,
      studentMaster: loadedStudents,
    };
  } catch (e) {
    console.error('Failed to load local app state:', e);
    return {
      leaves: INITIAL_LEAVE_DATA,
      finance: INITIAL_FINANCE_DATA,
      meta: INITIAL_METADATA,
      studentMaster: DEFAULT_STUDENT_MASTER,
    };
  }
}

/**
 * Save complete application state to LocalStorage
 */
export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

/**
 * API Key Management
 */
export function getStoredApiKey() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (saved && saved.trim()) return saved.trim();

    // Check if cached in app_state meta
    const rawState = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (parsed.meta?.geminiKey) return parsed.meta.geminiKey;
    }

    return DEFAULT_GEMINI_KEYS[0] || '';
  } catch (err) {
    console.error('Error reading API key from localStorage:', err);
    return DEFAULT_GEMINI_KEYS[0] || '';
  }
}

export function getGeminiKeyPool() {
  return DEFAULT_GEMINI_KEYS;
}

export function setStoredApiKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }
}

/**
 * Offline Queue Management (with automated date sanitization)
 */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!raw) return [];
    const queue = JSON.parse(raw);
    return queue.map(item => {
      // Auto-sanitize any existing leave items in queue
      const sanitizeLeaveItems = (items) => {
        if (!Array.isArray(items)) return items;
        return items.map(l => {
          let cleanDate = String(l.date || '').trim();
          cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
          if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
            const parts = cleanDate.split(/ដល់|-|\/to\//i);
            if (parts[0] && parts[0].trim().length >= 6) {
              cleanDate = parts[0].trim();
            }
          }
          let cleanName = String(l.name || '').trim();
          if (cleanName.replace(/[\s\u200B]/g, '') === 'ឡេងអាន') {
            cleanName = 'ឆេងអាន ឈាងហេង';
          } else if (cleanName) {
            const m = matchStudentName(cleanName, DEFAULT_STUDENT_MASTER, l.grade);
            cleanName = (m && m.confidence >= 0.72) ? m.student.name : '';
          }
          return { ...l, name: cleanName, date: cleanDate };
        });
      };

      if (item.processedData?.leaveItems) {
        item.processedData.leaveItems = sanitizeLeaveItems(item.processedData.leaveItems);
      }
      if (item.processedData?.result?.leaveItems) {
        item.processedData.result.leaveItems = sanitizeLeaveItems(item.processedData.result.leaveItems);
      }
      return item;
    });
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  if (!Array.isArray(queue)) return;
  try {
    const slimQueue = queue.map(({ file: _file, ...item }) => {
      if (item.processedData?.rawScan?.previewUrl) {
        return {
          ...item,
          processedData: {
            ...item.processedData,
            rawScan: {
              ...item.processedData.rawScan,
              previewUrl: undefined
            }
          }
        };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(slimQueue));
  } catch {
    // If localStorage 5MB quota is exceeded with many photos, save metadata without heavy dataURL strings
    try {
      const metadataOnlyQueue = queue.map(({ file: _file, previewUrl, ...item }) => ({
        ...item,
        previewUrl: previewUrl && !previewUrl.startsWith('data:') ? previewUrl : ''
      }));
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(metadataOnlyQueue));
    } catch (e2) {
      console.warn('Offline queue persistence skipped (quota full):', e2);
    }
  }
}

/**
 * Export full backup as JSON file
 */
export function exportBackup(state) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `Monastic_Admin_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Import backup from JSON file
 */
export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.leaves && json.finance) {
          saveAppState(json);
          resolve(json);
        } else {
          reject(new Error('Invalid backup file structure'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * AI Data Flywheel (Ground-Truth Training Dataset Harvester)
 */
export const INITIAL_TRAINING_SAMPLES = [
  {
    id: 'sample-na-tichkeang-001',
    docType: 'leave',
    fileName: 'លិខិតសុំច្បាប់_ណា_ទិចគាង.jpg',
    originalFileName: 'លិខិតសុំច្បាប់_ណា_ទិចគាង.jpg',
    rawOcrName: 'ណា តិចគាង',
    groundTruth: {
      name: 'ណា តិចគាង',
      grade: '៣',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ថ្ងៃ',
      date: '១៧/០៩/២០២៦'
    }
  },
  {
    id: 'train-1793647998273-zk99t',
    docType: 'leave',
    fileName: 'b98eb33712521d28c7553405fc3ad5e8f36e855f.jpg',
    originalFileName: 'b98eb33712521d28c7553405fc3ad5e8f36e855f.jpg',
    rawOcrName: 'ឆាន រ៉ាយុទ្ធ',
    groundTruth: {
      name: 'ឆាន រ៉ាយុទ្ធ',
      grade: 'មត្តេយ្យ',
      reason: 'អាពាធឈឺសន្លាក់ឆ្អឹងខ្នង',
      duration: '១ ថ្ងៃ',
      date: '១២/០១/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998330-mjgh1',
    docType: 'leave',
    fileName: 'verified_meng_sreysira.jpg',
    originalFileName: 'verified_meng_sreysira.jpg',
    rawOcrName: 'ណា តិចគាង',
    groundTruth: {
      name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា',
      grade: '២',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '២ ថ្ងៃ',
      date: '១៥/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998357-0puup',
    docType: 'leave',
    fileName: 'verified_un_saren.jpg',
    originalFileName: 'verified_un_saren.jpg',
    rawOcrName: 'ស៊ីម សុវណ្ណរាជ',
    groundTruth: {
      name: 'អ៊ុន សារ៉េន',
      grade: '២',
      reason: 'អាពាធ (ក្ដៅខ្លួន ឈឺក)',
      duration: '១ ល្ងាច',
      date: '១៨/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998374-5o54u',
    docType: 'leave',
    fileName: 'verified_men_seyha.jpg',
    originalFileName: 'verified_men_seyha.jpg',
    rawOcrName: 'រិទ្ធ ធារ័ត្ម',
    groundTruth: {
      name: 'ម៉ែន សីហា',
      grade: '២',
      reason: 'អាពាធ ក្ដៅខ្លូន ឈឺក្បាល',
      duration: '១ ថ្ងៃ',
      date: '១៥/១២/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998388-096gv',
    docType: 'leave',
    fileName: 'verified_khun_leanghai.jpg',
    originalFileName: 'verified_khun_leanghai.jpg',
    rawOcrName: 'ឃិន ស៊ិវម៉ិញ',
    groundTruth: {
      name: 'ឃុន លាងហៃ',
      grade: '៣',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ថ្ងៃ',
      date: '១៤/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998395-zmh3k',
    docType: 'leave',
    fileName: 'verified_chan_chaiorng_1.jpg',
    originalFileName: 'verified_chan_chaiorng_1.jpg',
    rawOcrName: 'ឆាន ឆៃអ៊ង',
    groundTruth: {
      name: 'ចាន់ ឆៃអ៊ង',
      grade: '២',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ព្រឹក',
      date: '១១/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998400-gzjyc',
    docType: 'leave',
    fileName: 'photo_2026-11-03_11-25-33.jpg',
    originalFileName: 'photo_2026-11-03_11-25-33.jpg',
    rawOcrName: 'ណា តិចគាង',
    groundTruth: {
      name: 'ឡាយ ប៊ុនយ៉ុង',
      grade: '២',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ថ្ងៃ',
      date: '២១/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998402-8pdnu',
    docType: 'leave',
    fileName: 'verified_chan_chaiorng_2.jpg',
    originalFileName: 'verified_chan_chaiorng_2.jpg',
    rawOcrName: 'ឆាន ឆៃអ៊ង',
    groundTruth: {
      name: 'ចាន់ ឆៃអ៊ង',
      grade: '២',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ថ្ងៃ',
      date: '១១/០៨/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793647998403-7h293',
    docType: 'leave',
    fileName: 'verified_chan_chaiorng_3.jpg',
    originalFileName: 'verified_chan_chaiorng_3.jpg',
    rawOcrName: 'ឆាន ឆៃអ៊ង',
    groundTruth: {
      name: 'ចាន់ ឆៃអ៊ង',
      grade: '២',
      reason: 'អាពាធ ឈឺពោះ',
      duration: '១ ថ្ងៃ',
      date: '១១/០៩/២០២៦'
    }
  },
  {
    id: 'train-verified-leave-1793679227852',
    docType: 'leave',
    fileName: 'verified_mi_sinou.jpg',
    originalFileName: 'verified_mi_sinou.jpg',
    rawOcrName: 'ឆេងអាន ឈាងហេង',
    groundTruth: {
      name: 'មី ស៊ីនូ',
      grade: '២',
      reason: 'ក្ដៅខ្លួន',
      duration: '១ ថ្ងៃ',
      date: '២១/១០/២០២៦'
    }
  },
  {
    id: 'train-verified-finance-kimmeng-001',
    docType: 'finance',
    imageHash: 'c08c1000161037121922213269b20892029202428c028d4619061f840ff00ff8:dd1c68b065b0e130923892ccb34810d802c884c8942c942a85289426ba427922:75',
    fileName: 'media_1793820582939_13a4cbe6.jpg',
    originalFileName: 'media_1793820582939_13a4cbe6.jpg',
    rawOcrFinanceItems: [
      { desc: 'រូបថត 4x6', unitPrice: 6000, currency: 'KHR', note: 'រោងពុម្ព គឹមម៉េង' },
      { desc: 'កូពី', unitPrice: 500, currency: 'KHR', note: 'រោងពុម្ព គឹមម៉េង' }
    ],
    groundTruth: {
      items: [
        {
          category: 'expense',
          desc: 'រូបថត & អ៊ុត',
          qty: '5',
          unitPrice: 6000,
          total: 30000,
          note: 'រោងពុម្ព គឹមម៉េង, ថ្ងៃទី 09/08/2026'
        },
        {
          category: 'expense',
          desc: 'កូល័រ',
          qty: '2',
          unitPrice: 500,
          total: 1000,
          note: 'រោងពុម្ព គឹមម៉េង, ថ្ងៃទី 09/08/2026'
        }
      ]
    }
  },
  {
    id: 'train-verified-finance-galaxy-001',
    docType: 'finance',
    imageHash: 'c0a5c32fc3af81a50147000f000f003f002f006f803f803f802fe03fe034e03f:21d90161016100b500b7013700360836003600b600b700b70037003700370037:75',
    fileName: 'media_1793819578299_73a57b72.jpg',
    originalFileName: 'media_1793819578299_73a57b72.jpg',
    groundTruth: {
      items: [
        {
          category: 'expense',
          desc: '2D Desktop Barcode Scanner',
          qty: '1 គ្រឿង',
          unitPrice: 65,
          total: 65,
          note: 'Galaxy Shop, TEL: 086 605 168'
        },
        {
          category: 'expense',
          desc: 'សេវាផ្ញើ (Delivery Service)',
          qty: '1',
          unitPrice: 2,
          total: 2,
          note: 'Galaxy Shop, ផ្ញើទៅវីរៈប៊ុនថាំ សាខាស្រុកពញាក្រែក'
        }
      ]
    }
  }
];

/**
 * Helper: Check ONLY bare generic live-camera filenames that lack any timestamp/ID numbers
 * (e.g., "image.jpg", "photo.jpg", "camera.jpg").
 * NEVER treat Telegram/phone filenames with numbers (e.g. "photo_2026-11-03_11-25-33.jpg", "IMG_1234.jpg") as generic!
 */
export function isBareGenericCameraFilename(fn) {
  const clean = String(fn || '').toLowerCase().trim();
  return /^(image|img|photo|camera|capture|file|pic|snapshot)\.(jpe?g|png|webp|heic)$/i.test(clean);
}

/**
 * Strip legacy "camera_<timestamp>_" prefix if it was prepended to a real filename like "photo_2026-..."
 */
export function normalizeOriginalFilename(fn) {
  const clean = String(fn || '').trim();
  const stripped = clean.replace(/^camera_\d+_/i, '');
  return stripped || clean;
}

const OFFICIAL_ROSTER_COMPACT_MAP = new Map(
  DEFAULT_STUDENT_MASTER.map(s => [s.name.replace(/[\s\u200B]/g, ''), s.name])
);

function sanitizeTrainingSample(s) {
  if (!s || typeof s !== 'object') return s;
  const copy = { ...s };
  if (copy.fileName) {
    const orig = normalizeOriginalFilename(copy.originalFileName || copy.fileName);
    copy.originalFileName = orig;
    if (!isBareGenericCameraFilename(orig)) {
      copy.fileName = orig;
    }
  }
  // Extract initial OCR name/reason or initial finance items before stripping heavy base64 rawScan payloads
  const rawLeave = copy.rawOcr?.rawScan?.result?.leaveItems?.[0] || copy.rawOcr?.leaveItems?.[0];
  if (!copy.rawOcrName && rawLeave?.name) {
    copy.rawOcrName = String(rawLeave.name).trim();
  }
  if (copy.docType === 'finance') {
    const seedMatch = !copy.rawOcrFinanceItems
      ? INITIAL_TRAINING_SAMPLES.find(init => init.id === copy.id && Array.isArray(init.rawOcrFinanceItems))
      : null;
    const rawFinSource =
      copy.rawOcrFinanceItems ||
      seedMatch?.rawOcrFinanceItems ||
      copy.rawOcr?.initialFinanceItems ||
      copy.rawOcr?.rawScan?.result?.initialFinanceItems ||
      copy.rawOcr?.rawScan?.result?.financeItems;
    if (Array.isArray(rawFinSource) && rawFinSource.length > 0) {
      copy.rawOcrFinanceItems = rawFinSource.slice(0, 15).map(it => ({
        desc: String(it?.desc || '').trim(),
        unitPrice: Number(it?.unitPrice) || 0,
        currency: it?.currency || 'KHR',
        note: String(it?.note || '').trim().slice(0, 100)
      })).filter(it => it.desc);
    }
  }
  if (copy.rawOcr) {
    // Strip heavy base64 previewUrl inside rawOcr to keep localStorage and Supabase fast & clean
    copy.rawOcr = {
      detectedType: copy.rawOcr.detectedType || copy.docType || 'leave',
      initialOcrName: copy.rawOcr.initialOcrName || copy.rawOcrName || '',
    };
  }
  // Never store dead blob: URLs or multi-MB base64 strings in imagePreview
  if (copy.imagePreview && (String(copy.imagePreview).startsWith('blob:') || String(copy.imagePreview).length > 2048)) {
    delete copy.imagePreview;
  }
  if (copy.groundTruth) {
    let fixedGt = { ...copy.groundTruth };
    if (fixedGt.date) {
      let cleanDate = String(fixedGt.date).trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      fixedGt.date = cleanDate;
    }
    // Heal corrupted/truncated groundTruth student names (e.g. "ឡេង អាន" on slip of "ឆេងអាន ឈាងហេង")
    if (copy.docType !== 'finance' && fixedGt.name) {
      const compactGtName = String(fixedGt.name).replace(/[\s\u200B]/g, '');
      if (copy.id === 'train-1793701698386-rx94ts' || compactGtName === 'ឡេងអាន') {
        fixedGt.name = 'ឆេងអាន ឈាងហេង';
        fixedGt.grade = '២';
      } else if (OFFICIAL_ROSTER_COMPACT_MAP.has(compactGtName)) {
        fixedGt.name = OFFICIAL_ROSTER_COMPACT_MAP.get(compactGtName);
      } else {
        const matched = matchStudentName(fixedGt.name, DEFAULT_STUDENT_MASTER, fixedGt.grade);
        if (matched && matched.confidence >= 0.72) {
          fixedGt.name = matched.student.name;
        } else {
          // Never keep a non-roster name in training groundTruth
          fixedGt.name = '';
        }
      }
    }
    copy.groundTruth = fixedGt;
  }
  return copy;
}

export function getStoredTrainingDataset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRAINING_DATASET);
    const parsed = raw ? JSON.parse(raw) : INITIAL_TRAINING_SAMPLES;
    const list = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TRAINING_SAMPLES;
    const existingIds = new Set(list.map(s => s?.id));
    const missingInitial = INITIAL_TRAINING_SAMPLES.filter(init => !existingIds.has(init.id));

    // Never purge user-trained samples! Always include baseline verified samples and sanitize dates.
    return [...list, ...missingInitial].map(sanitizeTrainingSample);
  } catch (e) {
    console.error('Failed to parse training dataset:', e);
    return INITIAL_TRAINING_SAMPLES;
  }
}

export function saveTrainingSample(sample) {
  return saveTrainingBatch([sample]);
}

export function saveTrainingBatch(samples = []) {
  try {
    if (!Array.isArray(samples) || samples.length === 0) {
      return getStoredTrainingDataset();
    }

    let current = getStoredTrainingDataset();

    for (const rawSample of samples) {
      let sampleToSave = sanitizeTrainingSample({ ...rawSample });
      const origName = normalizeOriginalFilename(sampleToSave.originalFileName || sampleToSave.fileName || '');
      sampleToSave.originalFileName = origName;

      // Only assign timestamped unique fileName if it is a bare "image.jpg" without any numbers
      if (isBareGenericCameraFilename(origName)) {
        sampleToSave.fileName = `camera_${Date.now()}_${Math.random().toString(36).slice(2, 5)}_${origName}`;
      } else {
        sampleToSave.fileName = origName;
      }

      const normTarget = origName.toLowerCase().replace(/\s*\(\d+\)\s*(?=\.[^.]+$|$)/, '').trim();

      // Deduplicate by id, or by imageHash, or by non-generic filename
      current = [
        sampleToSave,
        ...current.filter(existing => {
          if (existing.id === sampleToSave.id) return false;
          if (sampleToSave.imageHash && existing.imageHash && existing.imageHash === sampleToSave.imageHash) {
            return false;
          }
          if (!isBareGenericCameraFilename(origName) && normTarget) {
            const existOrig = normalizeOriginalFilename(existing.originalFileName || existing.fileName || '')
              .toLowerCase()
              .replace(/\s*\(\d+\)\s*(?=\.[^.]+$|$)/, '')
              .trim();
            if (existOrig === normTarget) return false;
          }
          return true;
        })
      ];
    }

    localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(current));

    // Auto-sync to Supabase cloud (fire-and-forget — non-blocking)
    syncTrainingToCloud(current).catch(err =>
      console.warn('[Training Sync] Cloud sync failed silently:', err)
    );

    return current;
  } catch (e) {
    console.error('Failed to save training batch:', e);
    return [];
  }
}

/**
 * AI Training Dataset — Auto-Sync to Supabase Cloud
 * Runs silently in background. User never needs to touch Backup/Export manually.
 */
export async function syncTrainingToCloud(dataset) {
  if (!supabase) return false;
  try {
    const cleaned = (Array.isArray(dataset) ? dataset : []).map(sanitizeTrainingSample);
    const { error } = await supabase
      .from('training_samples')
      .upsert({
        id: 'current',
        data: cleaned,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[Training Sync] Supabase error:', error.message);
      return false;
    }
    console.log(`☁️ [Training Sync] ${cleaned.length} samples synced to cloud.`);
    return true;
  } catch (err) {
    console.warn('[Training Sync] Failed:', err);
    return false;
  }
}

/**
 * AI Training Dataset — Auto-Load from Supabase on App Start & Before Scan
 * Merges cloud data with local, cloud wins if newer.
 */
export async function fetchTrainingFromCloud() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('training_samples')
      .select('data, updated_at')
      .eq('id', 'current')
      .maybeSingle();

    if (error) {
      console.warn('[Training Sync] Fetch error:', error.message);
      return null;
    }
    if (data?.data && Array.isArray(data.data)) {
      const cloudSamples = data.data.map(sanitizeTrainingSample);
      const local = getStoredTrainingDataset();
      const cloudIds = new Set(cloudSamples.map(s => s.id));
      const cloudHashes = new Set(cloudSamples.map(s => s.imageHash).filter(Boolean));
      const cloudNames = new Set(
        cloudSamples
          .map(s => normalizeOriginalFilename(s.originalFileName || s.fileName || '').toLowerCase())
          .filter(n => n && !isBareGenericCameraFilename(n))
      );

      const localOnly = local.filter(s => {
        if (cloudIds.has(s.id)) return false;
        if (s.imageHash && cloudHashes.has(s.imageHash)) return false;
        const n = normalizeOriginalFilename(s.originalFileName || s.fileName || '').toLowerCase();
        if (n && !isBareGenericCameraFilename(n) && cloudNames.has(n)) return false;
        return true;
      });

      const merged = [...cloudSamples, ...localOnly];
      localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(merged));

      // If local had additional samples or sanitized filenames, push merged back to cloud
      if (localOnly.length > 0 || JSON.stringify(data.data) !== JSON.stringify(merged)) {
        syncTrainingToCloud(merged).catch(() => { });
      }

      console.log(`☁️ [Training Sync] Loaded ${cloudSamples.length} samples from cloud, merged ${localOnly.length} local-only.`);
      return merged;
    }
    return null;
  } catch (err) {
    console.warn('[Training Sync] Fetch failed:', err);
    return null;
  }
}

/**
 * Subscribe to realtime updates on `training_samples` table so all devices stay in sync
 */
export function subscribeToCloudTraining(onRemoteTrainingUpdate) {
  if (!supabase) return () => { };
  try {
    const channel = supabase
      .channel('public:training_samples')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_samples', filter: 'id=eq.current' },
        (payload) => {
          if (payload.new && Array.isArray(payload.new.data)) {
            const cleaned = payload.new.data.map(sanitizeTrainingSample);
            localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(cleaned));
            if (onRemoteTrainingUpdate) onRemoteTrainingUpdate(cleaned);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to Supabase training_samples realtime:', err);
    return () => { };
  }
}

export function exportTrainingDataset() {
  const dataset = getStoredTrainingDataset();
  if (dataset.length === 0) {
    alert('មិនទាន់មានទិន្នន័យបង្វឹកនៅឡើយទេ។ ពេលបងស្កេន និងផ្ទៀងផ្ទាត់ក្រដាសច្បាប់ ឬប៉ុងលុយ ប្រព័ន្ធនឹងរក្សាទុកស្វ័យប្រវត្តិ!');
    return;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `AI_Handwriting_Dataset_${dataset.length}_samples_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function enrichStudentMasterAliases(rawStudents) {
  if (!Array.isArray(rawStudents) || rawStudents.length === 0) return DEFAULT_STUDENT_MASTER;
  return rawStudents.map(s => {
    const def = DEFAULT_STUDENT_MASTER.find(d => d.name === s.name);
    if (def) {
      return {
        ...s,
        id: def.id,
        grade: def.grade || s.grade,
        aliases: Array.from(new Set([...(def.aliases || []), ...(s.aliases || [])]))
      };
    }
    return s;
  });
}

/**
 * Supabase Cloud Database Realtime Sync
 */
export async function fetchCloudAppState() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('id', 'current')
      .maybeSingle();

    if (error) {
      console.warn('Notice from Supabase fetch:', error.message);
      return null;
    }
    if (data && data.data) {
      return {
        ...data.data,
        studentMaster: enrichStudentMasterAliases(data.data.studentMaster)
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch from Supabase:', err);
    return null;
  }
}

export async function syncAppStateToCloud(state) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({
        id: 'current',
        data: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Notice from Supabase sync:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to sync to Supabase:', err);
    return false;
  }
}

export function subscribeToCloudAppState(onRemoteUpdate) {
  if (!supabase) return () => { };
  try {
    const channel = supabase
      .channel('public:app_state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: 'id=eq.current' },
        (payload) => {
          if (payload.new && payload.new.data) {
            onRemoteUpdate({
              ...payload.new.data,
              studentMaster: enrichStudentMasterAliases(payload.new.data.studentMaster)
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to Supabase realtime:', err);
    return () => { };
  }
}


