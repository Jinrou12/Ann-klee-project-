// Central State Storage and Mutator Guard (Rule 7)
import { DEFAULT_STUDENT_MASTER } from './studentMaster';
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
    // Automatically migrate director title to match official PDF 2 standard
    if (!mergedMeta.directorTitle || mergedMeta.directorTitle === 'ព្រះនាយក') {
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
    const legacyMockIds = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20']);

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
      const sanitizeDates = (items) => {
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
          return { ...l, date: cleanDate };
        });
      };

      if (item.processedData?.leaveItems) {
        item.processedData.leaveItems = sanitizeDates(item.processedData.leaveItems);
      }
      if (item.processedData?.result?.leaveItems) {
        item.processedData.result.leaveItems = sanitizeDates(item.processedData.result.leaveItems);
      }
      return item;
    });
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue', e);
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
    groundTruth: {
      name: 'ណា ទិចគាង',
      grade: '៣',
      reason: 'ក្ដៅខ្លួន ឈឺចុកពោះ',
      duration: '១ ថ្ងៃ',
      date: '១៧/០៩/២០២៦',
      school: 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង',
      director: 'ព្រះបណ្ណាធម្មោ វ៉ាន់ សុគត'
    },
    notes: 'អក្សរក្វៀសខ្មែរ: ណា. តិ.ច.គា.ង (ណា ទិចគាង) ថ្នាក់ទី៣, ក្ដៅខ្លួន...ឈឺចុកពោះ (ក្ដៅខ្លួន ឈឺចុកពោះ), កាលបរិច្ឆេទ ១៧/០៩/២០២៦',
    verifiedAt: new Date().toISOString()
  }
];

export function getStoredTrainingDataset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRAINING_DATASET);
    const parsed = raw ? JSON.parse(raw) : INITIAL_TRAINING_SAMPLES;
    // Auto-clean any dates in stored ground truth
    return (Array.isArray(parsed) ? parsed : INITIAL_TRAINING_SAMPLES).map(s => {
      if (s.groundTruth?.date) {
        let cleanDate = String(s.groundTruth.date).trim();
        cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
        if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
          const parts = cleanDate.split(/ដល់|-|\/to\//i);
          if (parts[0] && parts[0].trim().length >= 6) {
            cleanDate = parts[0].trim();
          }
        }
        s.groundTruth.date = cleanDate;
      }
      return s;
    });
  } catch (e) {
    console.error('Failed to parse training dataset:', e);
    return INITIAL_TRAINING_SAMPLES;
  }
}

export function saveTrainingSample(sample) {
  try {
    // Sanitize groundTruth date before saving
    if (sample.groundTruth?.date) {
      let cleanDate = String(sample.groundTruth.date).trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
        const parts = cleanDate.split(/ដល់|-|\/to\//i);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      sample.groundTruth.date = cleanDate;
    }

    const current = getStoredTrainingDataset();
    // Overwrite if same id or same fileName exists to maintain updated ground truth
    const updated = [sample, ...current.filter(s => s.id !== sample.id && s.fileName !== sample.fileName)];
    localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(updated));

    // Auto-sync to Supabase cloud (fire-and-forget — non-blocking)
    syncTrainingToCloud(updated).catch(err =>
      console.warn('[Training Sync] Cloud sync failed silently:', err)
    );

    return updated;
  } catch (e) {
    console.error('Failed to save training sample:', e);
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
    const { error } = await supabase
      .from('training_samples')
      .upsert({
        id: 'current',
        data: dataset,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[Training Sync] Supabase error:', error.message);
      return false;
    }
    console.log(`☁️ [Training Sync] ${dataset.length} samples synced to cloud.`);
    return true;
  } catch (err) {
    console.warn('[Training Sync] Failed:', err);
    return false;
  }
}

/**
 * AI Training Dataset — Auto-Load from Supabase on App Start
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
      // Merge: cloud samples take priority, then fill in any local-only samples
      const local = getStoredTrainingDataset();
      const cloudIds = new Set(data.data.map(s => s.id));
      const localOnly = local.filter(s => !cloudIds.has(s.id));
      const merged = [...data.data, ...localOnly];

      // Persist merged result back to localStorage
      localStorage.setItem(STORAGE_KEYS.TRAINING_DATASET, JSON.stringify(merged));
      console.log(`☁️ [Training Sync] Loaded ${data.data.length} samples from cloud, merged ${localOnly.length} local-only.`);
      return merged;
    }
    return null;
  } catch (err) {
    console.warn('[Training Sync] Fetch failed:', err);
    return null;
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
      return data.data;
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
  if (!supabase) return () => {};
  try {
    const channel = supabase
      .channel('public:app_state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: 'id=eq.current' },
        (payload) => {
          if (payload.new && payload.new.data) {
            onRemoteUpdate(payload.new.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to Supabase realtime:', err);
    return () => {};
  }
}


