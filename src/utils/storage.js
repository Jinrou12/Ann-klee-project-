// Central State Storage and Mutator Guard (Rule 7)
import { DEFAULT_STUDENT_MASTER, matchStudentName, normalizeStudentGrade } from './studentMaster';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { INITIAL_ADMIN_REPORTS } from './adminReportBuilder';

// Helper to parse comma/newline/whitespace-separated API key strings or arrays into clean unique keys
export function parseApiKeyList(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(/[,\n\r\s]+/);
  const cleaned = items
    .map(k => String(k || '').trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

// Default Gemini API Key Pool safely loaded from environment variables
const envKeys = import.meta.env?.VITE_GEMINI_KEYS;
export const DEFAULT_GEMINI_KEYS = parseApiKeyList(envKeys);

const STORAGE_KEYS = {
  APP_STATE: 'ann_klee_app_state_v1',
  STUDENT_MASTER: 'ann_klee_student_master_v1',
  API_KEY: 'ann_klee_gemini_api_key_v1',
  API_KEY_POOL: 'ann_klee_gemini_key_pool_v1',
  OFFLINE_QUEUE: 'ann_klee_offline_queue_v1',
  TRAINING_DATASET: 'ann_klee_training_dataset_v1',
};

// Initial default Leave Data matching របាយការណ៍_សិស្សសុំច្បាប់_ឆ្នាំ២០២៦_២០២៧.xlsx (110 authentic records across May - October 2026)
export const INITIAL_LEAVE_DATA = {
  '2026-05': [],
  '2026-06': [
    { id: 'lv-06-1', name: 'ឡា រក្សា', grade: '១', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '11/06/2026', note: '' },
    { id: 'lv-06-2', name: 'គីម សុភាព', grade: '១', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '14/06/2026', note: '' },
    { id: 'lv-06-3', name: 'ហេន សិលា', grade: '២', reason: 'អាពាធ (គ្រុនឈាម)', duration: '២០ថ្ងៃ', date: '03/06/2026', note: '' },
    { id: 'lv-06-4', name: 'យ៉េន ចាន់រ៉ា', grade: '២', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '12/06/2026', note: '' },
    { id: 'lv-06-5', name: 'ជួរ មករា', grade: '២', reason: 'ទៅបុណ្យនៅវត្ត', duration: '១ថ្ងៃ', date: '13/06/2026', note: '' },
    { id: 'lv-06-6', name: 'ឃិន ស៊ិវម៉ិញ', grade: '២', reason: 'ទៅបុណ្យនៅវត្ត', duration: '១ថ្ងៃ', date: '15/06/2026', note: '' },
    { id: 'lv-06-7', name: 'រ៉េត ណារ៉ុង', grade: '២', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '16/06/2026', note: '' },
    { id: 'lv-06-8', name: 'ឡាយ វីរះ', grade: '២', reason: 'ទៅបុណ្យដាពិស្ដានៅវត្ត', duration: '១ថ្ងៃ', date: '20/06/2026', note: '' },
    { id: 'lv-06-9', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'ទៅបុណ្យដាពិស្ដានៅវត្ត', duration: '១ថ្ងៃ', date: '20/06/2026', note: '' },
    { id: 'lv-06-10', name: 'ម៉េង ទី', grade: '២', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '26/06/2026', note: '' },
    { id: 'lv-06-11', name: 'ម៉ែន សីហា', grade: '២', reason: 'អាពាធ(ទៅពេទ្យជួសឈាម)', duration: '១ថ្ងៃ', date: '15/06/2026', note: '' },
    { id: 'lv-06-12', name: 'ធន ដាវីត', grade: '៣', reason: 'ទៅបុណ្យនៅវត្ត', duration: '១ថ្ងៃ', date: '04/06/2026', note: '' },
    { id: 'lv-06-13', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ទៅបុណ្យបញ្ចុះសីមានៅវត្ដ', duration: '១ថ្ងៃ', date: '08/06/2026', note: '' },
    { id: 'lv-06-14', name: 'ខុម បូរី', grade: '៣', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '09/06/2026', note: '' },
    { id: 'lv-06-15', name: 'ខុម ភក្ដី', grade: '៣', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '10/06/2026', note: '' },
    { id: 'lv-06-16', name: 'ឈឿន ឆេង', grade: '៣', reason: 'ទៅបុណ្យនៅវត្ត', duration: '២ថ្ងៃ', date: '11/06/2026', note: '' },
    { id: 'lv-06-17', name: 'ជឿន សូវីត', grade: '៣', reason: 'គ្រុនផ្ដាសាយ', duration: '១ថ្ងៃ', date: '12/06/2026', note: '' },
    { id: 'lv-06-18', name: 'ហ៊ី រ៉ាឌី', grade: '៣', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '16/06/2026', note: '' },
    { id: 'lv-06-19', name: 'ជឿន សូវីត', grade: '៣', reason: 'គ្រុនផ្ដាសាយ', duration: '១ថ្ងៃ', date: '17/06/2026', note: '' },
    { id: 'lv-06-20', name: 'ឌី សុខហេង', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យនៅវត្ត', duration: '១ថ្ងៃ', date: '03/06/2026', note: '' },
    { id: 'lv-06-21', name: 'សាន ដារ៉ា', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យគោចរបិណ្ឌបាតនៅវត្ត', duration: '១ថ្ងៃ', date: '07/06/2026', note: '' },
    { id: 'lv-06-22', name: 'យាន គូម៉ាន់', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យនៅវត្ត', duration: '២ថ្ងៃ', date: '11/06/2026', note: '' },
    { id: 'lv-06-23', name: 'វឿន វ៉ាន់', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យនៅវត្ត', duration: '២ថ្ងៃ', date: '11/06/2026', note: '' },
    { id: 'lv-06-24', name: 'ឃី ម៉េងលាភ', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យនៅវត្ត', duration: '២ថ្ងៃ', date: '11/06/2026', note: '' },
    { id: 'lv-06-25', name: 'ឌី សុខហេង', grade: 'មត្តេយ្យ', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '26/06/2026', note: '' }
  ],
  '2026-07': [
    { id: 'lv-07-1', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'អាពាធ គ្រិចដៃ', duration: '១ថ្ងៃ', date: '01/07/2026', note: '' },
    { id: 'lv-07-2', name: 'ស៊ីម វ៉ាន់ណេត', grade: '៣', reason: 'អាពាធ ឈឺក្បាល', duration: '១ថ្ងៃ', date: '01/07/2026', note: '' },
    { id: 'lv-07-3', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'អាពាធ គ្រុនក្ដៅ', duration: '១ថ្ងៃ', date: '06/07/2026', note: '' },
    { id: 'lv-07-4', name: 'គីម សុភាព', grade: '១', reason: 'អាពាធ ឈឺប្រកេស', duration: '១ថ្ងៃ', date: '03/07/2026', note: '' },
    { id: 'lv-07-5', name: 'បាន សម្បត្តិ', grade: '៣', reason: 'អាពាធ ទៅពេទ្យ', duration: '១ថ្ងៃ', date: '06/07/2026', note: '' },
    { id: 'lv-07-6', name: 'បាន សម្បត្តិ', grade: '៣', reason: 'អាពាធ ទៅពេទ្យ', duration: '១ថ្ងៃ', date: '07/07/2026', note: '' },
    { id: 'lv-07-7', name: 'យិន លាព', grade: '៣', reason: 'អាពាធ វិលមុខ', duration: '១ល្ងាច', date: '07/07/2026', note: '' },
    { id: 'lv-07-8', name: 'សេងលី ទីសា', grade: '២', reason: 'អាពាធ គ្រុនឈាម', duration: '៥ថ្ងៃ', date: '04/07/2026', note: '' },
    { id: 'lv-07-9', name: 'ជួង ចិត្រា', grade: '២', reason: 'ទៅបុណ្យ ខួប', duration: '១ថ្ងៃកន្លះ', date: '16/07/2026', note: '' },
    { id: 'lv-07-10', name: 'ឌឿន រ៉ាដូ', grade: 'មត្តេយ្យ', reason: 'ទៅបុណ្យ ខួប', duration: '១ថ្ងៃកន្លះ', date: '16/07/2026', note: '' },
    { id: 'lv-07-11', name: 'ប៉ុនធឿន ឧត្តម', grade: '២', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '13/07/2026', note: '' },
    { id: 'lv-07-12', name: 'តួ បញ្ញា', grade: '១', reason: 'ឈឺក្បាល វិលមុខ', duration: '១ថ្ងៃ', date: '20/07/2026', note: '' },
    { id: 'lv-07-13', name: 'ណា តិចគាង', grade: '៣', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '20/07/2026', note: '' }
  ],
  '2026-08': [
    { id: 'lv-08-1', name: 'ហ៊ី រ៉ាឌី', grade: '៣', reason: 'ឈឺភ្នែក', duration: '១ល្ងាច', date: '03/08/2026', note: '' },
    { id: 'lv-08-2', name: 'មី ស៊ីនូ', grade: '២', reason: 'អត់មានចីវរស្លៀក (ចីវរសើម)', duration: '១ថ្ងៃ', date: '04/08/2026', note: '' },
    { id: 'lv-08-3', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ឈឺធ្មេញ', duration: '១ល្ងាច', date: '04/08/2026', note: '' },
    { id: 'lv-08-4', name: 'បាន សម្បត្តិ', grade: '៣', reason: 'ឈឺធ្មេញ', duration: '១ល្ងាច', date: '04/08/2026', note: '' },
    { id: 'lv-08-5', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'ក្ដៅខ្លួន (កើតពងបែក)', duration: '២ថ្ងៃ', date: '04/08/2026', note: '' },
    { id: 'lv-08-6', name: 'យិន លាព', grade: '៣', reason: 'ឈឺក្បាលក្ដៅខ្លួន', duration: '១រសៀល', date: '04/08/2026', note: '' },
    { id: 'lv-08-7', name: 'ណា តិចគាង', grade: '៣', reason: 'ឈឺជើង', duration: '១ថ្ងៃ', date: '06/08/2026', note: '' },
    { id: 'lv-08-8', name: 'ធន ដាវីត', grade: '៣', reason: 'និមន្តទៅបុណ្យ', duration: '១ថ្ងៃ', date: '07/08/2026', note: '' },
    { id: 'lv-08-9', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'ហើមធ្មេញ', duration: '១ថ្ងៃ', date: '07/08/2026', note: '' },
    { id: 'lv-08-10', name: 'ជឿន សូវីត', grade: '៣', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '07/08/2026', note: '' },
    { id: 'lv-08-11', name: 'ភាក់ សុភាព', grade: '២', reason: 'អាពាធ (វិលមុខ ឈឺប្រកេស)', duration: '១ថ្ងៃ', date: '07/08/2026', note: '' },
    { id: 'lv-08-12', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ជុក ក្រពះ ពោះវៀន', duration: '១រសៀល', date: '07/08/2026', note: '' },
    { id: 'lv-08-13', name: 'អេន ដាវីន', grade: '៣', reason: 'ទៅបុណ្យ', duration: '១រសៀល', date: '07/08/2026', note: '' },
    { id: 'lv-08-14', name: 'ហ៊ី រ៉ាឌី', grade: '៣', reason: 'ចុកពោះ', duration: '១ថ្ងៃ', date: '10/08/2026', note: '' },
    { id: 'lv-08-15', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'ចុកពោះ', duration: '១ថ្ងៃ', date: '10/08/2026', note: '' },
    { id: 'lv-08-16', name: 'យិន លាព', grade: '៣', reason: 'ឈឺក្បាល', duration: '១រសៀល', date: '10/08/2026', note: '' },
    { id: 'lv-08-17', name: 'សីហា ជីវ៉ា', grade: '៣', reason: 'ឈីជើង', duration: '១រសៀល', date: '11/08/2026', note: '' },
    { id: 'lv-08-18', name: 'រ៉េត ណារ៉ុង', grade: '២', reason: 'ជាប់ធ្វើការនៅកុដិ', duration: '១ថ្ងៃ', date: '13/08/2026', note: '' },
    { id: 'lv-08-19', name: 'ហ៊ី រ៉ាឌី', grade: '៣', reason: 'អាពាធ', duration: '១ថ្ងៃ', date: '13/08/2026', note: '' },
    { id: 'lv-08-20', name: 'សេងលី ទីសា', grade: '២', reason: 'សឹងខក', duration: '១ព្រឹក', date: '14/08/2026', note: '' },
    { id: 'lv-08-21', name: 'ឡាយ ប៊ុនយ៉ុង', grade: '២', reason: 'សឹងខក', duration: '១ព្រឹក', date: '14/08/2026', note: '' },
    { id: 'lv-08-22', name: 'ប៊ុន បេត', grade: '៣', reason: 'ឈឺក្បាល', duration: '១ថ្ងៃ', date: '18/08/2026', note: '' },
    { id: 'lv-08-23', name: 'យិន លាព', grade: '៣', reason: 'ឈឺភ្នែក', duration: '១ថ្ងៃ', date: '18/08/2026', note: '' },
    { id: 'lv-08-24', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ទៅពេទ្យទិញថ្នាំលេប', duration: '១ថ្ងៃ', date: '18/08/2026', note: '' },
    { id: 'lv-08-25', name: 'សុន ម៉ែងអ៊័ង', grade: '២', reason: 'ឈឺជើង', duration: '១ថ្ងៃ', date: '18/08/2026', note: '' },
    { id: 'lv-08-26', name: 'អេន ដាវីន', grade: '៣', reason: 'ទៅបុណ្យ', duration: '១ថ្ងៃ', date: '21/08/2026', note: '' },
    { id: 'lv-08-27', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ឈឺធ្មេញ', duration: '១ព្រឹក', date: '25/08/2026', note: '' },
    { id: 'lv-08-28', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ទៅពេទ្យប៉ះធ្មេញ', duration: '១ល្ងាច', date: '26/08/2026', note: '' },
    { id: 'lv-08-29', name: 'ឃុន លាងហៃ', grade: '៣', reason: 'គ្រិចជើង', duration: '១ល្ងាច', date: '26/08/2026', note: '' },
    { id: 'lv-08-30', name: 'សេងលី ទីសា', grade: '២', reason: 'អត់មានចីវរស្លៀក (ចីវរសើម)', duration: '១ព្រឹក', date: '31/08/2026', note: '' },
    { id: 'lv-08-31', name: 'ម៉ែន សីហា', grade: '២', reason: 'អត់មានចីវរស្លៀក (ចីវរសើម)', duration: '១ព្រឹក', date: '31/08/2026', note: '' },
    { id: 'lv-08-32', name: 'ឃុន លាងហៃ', grade: '៣', reason: 'ឈឺប្រកេស', duration: '១ល្ងាច', date: '26/08/2026', note: '' }
  ],
  '2026-09': [
    { id: 'lv-09-1', name: 'ណុន តាវ៉ាន់', grade: '២', reason: 'អាពាធ', duration: '១ព្រឹក', date: '07/09/2026', note: '' },
    { id: 'lv-09-2', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'អាពាធ (ចុកពោះ)', duration: '១ព្រឹក', date: '07/09/2026', note: '' },
    { id: 'lv-09-3', name: 'ឆាន រ៉ាយុទ្ធ', grade: 'មត្តេយ្យ', reason: 'ក្ដៅខ្លួន ឈឺក្បាល', duration: '១ល្ងាច', date: '07/09/2026', note: '' },
    { id: 'lv-09-4', name: 'ឃុន លាងហៃ', grade: '៣', reason: 'ក្ដៅខ្លួន ឈឺក្បាល', duration: '១ព្រឹក', date: '08/09/2026', note: '' },
    { id: 'lv-09-5', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'សើមចីវរ', duration: '១ព្រឹក', date: '08/09/2026', note: '' },
    { id: 'lv-09-6', name: 'ឃិន ស៊ិវម៉ិញ', grade: '២', reason: 'សើមចីវរ', duration: '១ព្រឹក', date: '08/09/2026', note: '' },
    { id: 'lv-09-7', name: 'ហ៊ី រ៉ាឌី', grade: '៣', reason: 'អាពាធ (ឈឺក្បាល)', duration: '១ថ្ងៃ', date: '08/09/2026', note: '' },
    { id: 'lv-09-8', name: 'ណា តិចគាង', grade: '៣', reason: 'ឈឺធ្នេញ', duration: '១ល្ងាច', date: '08/09/2026', note: '' },
    { id: 'lv-09-9', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ឈឺក្រពះ', duration: '១ល្ងាច', date: '11/09/2026', note: '' },
    { id: 'lv-09-10', name: 'ចាន់ ឆៃអ៊ង', grade: '២', reason: 'អាពាធ (ចុកពោះ)', duration: '១ព្រឹក', date: '11/09/2026', note: '' },
    { id: 'lv-09-11', name: 'ឈុនហ៊ាង គីមហុង', grade: '២', reason: 'អាពាធ (ឈឺក្បាល)', duration: '១ថ្ងៃ', date: '11/09/2026', note: '' },
    { id: 'lv-09-12', name: 'ឃុន លាងហៃ', grade: '៣', reason: 'ចីវរសើម', duration: '១ថ្ងៃ', date: '14/09/2026', note: '' },
    { id: 'lv-09-13', name: 'យ៉េន ចាន់រ៉ា', grade: '២', reason: 'ក្ដៅខ្លួន ផ្ដាសាយ', duration: '១ថ្ងៃ', date: '14/09/2026', note: '' },
    { id: 'lv-09-14', name: 'រស់ ណារ៉ាន់', grade: '៣', reason: 'ឈឺករ', duration: '១ព្រឹក', date: '14/09/2026', note: '' },
    { id: 'lv-09-15', name: 'ម៉ែន សីហា', grade: '២', reason: 'អាពាធ (ក្ដៅខ្លួន ឈឺក្បាល)', duration: '១ព្រឹក', date: '15/09/2026', note: '' },
    { id: 'lv-09-16', name: 'ជឿន សូវីត', grade: '៣', reason: 'អាពាធ(ឈឺក្បាល)', duration: '១ល្ងាច', date: '15/09/2026', note: '' },
    { id: 'lv-09-17', name: 'ឡាយ វីរះ', grade: '២', reason: 'ឈឺករ', duration: '១ថ្ងៃ', date: '15/09/2026', note: '' },
    { id: 'lv-09-18', name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា', grade: '២', reason: 'អាពាធ(ឈឺក្បាល)', duration: '១ល្ងាច', date: '15/09/2026', note: '' },
    { id: 'lv-09-19', name: 'សុន ម៉ែងអ៊័ង', grade: '២', reason: 'អាពាធ(ចុកពោះ)', duration: '១ថ្ងៃ', date: '15/09/2026', note: '' },
    { id: 'lv-09-20', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ឈឺក្រពះ ក្អួត', duration: '១ថ្ងៃ', date: '16/09/2026', note: '' },
    { id: 'lv-09-21', name: 'ណា តិចគាង', grade: '៣', reason: 'អាពាធ ក្ដៅខ្លួន', duration: '១ថ្ងៃ', date: '17/09/2026', note: '' },
    { id: 'lv-09-22', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'អាពាធ ក្ដៅខ្លួនឈឺក', duration: '១ល្ងាច', date: '18/09/2026', note: '' },
    { id: 'lv-09-23', name: 'ខុម បូរី', grade: '៣', reason: 'ចីវរសើម', duration: '១ព្រឹក', date: '21/09/2026', note: '' },
    { id: 'lv-09-24', name: 'សុន ម៉ែងអ៊័ង', grade: '២', reason: 'អាពាធ ក្ដៅខ្លួន ឈឺក', duration: '១ព្រឹក', date: '21/09/2026', note: '' },
    { id: 'lv-09-25', name: 'រ៉េន វ៉ានុន', grade: '២', reason: 'ផ្ដាសាយ ក្ដៅខ្លួន', duration: '១ថ្ងៃ', date: '21/09/2026', note: '' },
    { id: 'lv-09-26', name: 'សេងលី ទីសា', grade: '២', reason: 'ឈឺក្បាល វិលមុខ', duration: '១ថ្ងៃ', date: '28/09/2026', note: '' },
    { id: 'lv-09-27', name: 'ជឿន សូវីត', grade: '៣', reason: 'អាពាធ(ឈឺក្បាល)', duration: '១ថ្ងៃ', date: '28/09/2026', note: '' },
    { id: 'lv-09-28', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'ឈឺពោះ', duration: '១ព្រឹក', date: '29/09/2026', note: '' },
    { id: 'lv-09-29', name: 'ភាក់ សុភាព', grade: '២', reason: 'អាពាធ(ឈឺក្បាល)', duration: '១ព្រឹក', date: '29/09/2026', note: '' },
    { id: 'lv-09-30', name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា', grade: '២', reason: 'អាពាធ(ក្ដៅខ្លួន)', duration: '១ថ្ងៃ', date: '29/09/2026', note: '' }
  ],
  '2026-10': [
    { id: 'lv-10-1', name: 'ហ៊ុំ រ៉ានុ', grade: '១', reason: 'ទៅវត្ត', duration: '១ថ្ងៃ', date: '02/10/2026', note: '' },
    { id: 'lv-10-2', name: 'ឃុន លាងហៃ', grade: '៣', reason: 'អត់ស្រួលខ្លួន (រាគ)', duration: 'កន្លះថ្ងៃ', date: '19/10/2026', note: '' },
    { id: 'lv-10-3', name: 'ហត់ ម៉េងហួង', grade: '៣', reason: 'ទៅពេទ្យដកឆ្នេញ', duration: '១ល្ងាច', date: '19/10/2026', note: '' },
    { id: 'lv-10-4', name: 'ស្រឿន សុខខា', grade: '១', reason: 'ឈឺក្បាល', duration: '១ថ្ងៃ', date: '20/10/2026', note: '' },
    { id: 'lv-10-5', name: 'ចាន់ ឆៃអ៊ង', grade: '២', reason: 'ឈឺក្បាល', duration: '១ល្ងាច', date: '21/10/2026', note: '' },
    { id: 'lv-10-6', name: 'អ៊ុន សារ៉េន', grade: '២', reason: 'ឈឺក្បាលចុះពោះ', duration: '១ល្ងាច', date: '20/10/2026', note: '' },
    { id: 'lv-10-7', name: 'ឆេងអាន ឈាងហេង', grade: '២', reason: 'ឈឺក្បាលវិលមុខ', duration: '១ល្ងាច', date: '20/10/2026', note: '' },
    { id: 'lv-10-8', name: 'ឡាយ វីរះ', grade: '២', reason: 'ឈឺពោះ', duration: '១ថ្ងៃ', date: '21/10/2026', note: '' },
    { id: 'lv-10-9', name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា', grade: '២', reason: 'ចុកពោះ(រាគ)', duration: '១ថ្ងៃ', date: '21/10/2026', note: '' },
    { id: 'lv-10-10', name: 'មី ស៊ីនូ', grade: '២', reason: 'ក្ដៅខ្លួន', duration: '១ថ្ងៃ', date: '21/10/2026', note: '' }
  ]
};

const TEST_LEAVE_IDS_TO_PURGE = new Set([
  'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12', 'l13',
  'leave-1793647998299-hppn0',
  'leave-1793647998330-mjgh1',
  'leave-1793647998357-0puup',
  'leave-1793647998374-5o54u',
  'leave-1793647998388-096gv',
  'leave-1793647998395-zmh3k',
  'leave-1793647998400-gzjyc',
  'leave-1793647998402-8pdnu',
  'leave-1793647998403-7h293',
  'leave-1793679227852',
  'leave-1793701695313',
  'leave-1793701698386',
  'leave-1793701704084',
  'leave-1793701709079',
  'leave-1793803197564-ov5pn',
  'leave-1793963477076',
  'leave-1793968585561'
]);

export function sanitizeLeaveState(rawLeaves = {}) {
  const result = {
    '2026-05': [],
    '2026-06': [],
    '2026-07': [],
    '2026-08': [],
    '2026-09': [],
    '2026-10': []
  };

  Object.keys(rawLeaves || {}).forEach(month => {
    if (month === '2025-01' || month === '2027-01') return;
    const records = rawLeaves[month];
    if (!Array.isArray(records)) return;

    const cleaned = records
      .filter(r => r && !TEST_LEAVE_IDS_TO_PURGE.has(r.id))
      .map(r => {
        let cleanDate = String(r.date || '').replace(/\u200B/g, '').trim();
        cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
        if (cleanDate.includes('ដល់') || cleanDate.includes('-') || cleanDate.toLowerCase().includes('to')) {
          const parts = cleanDate.split(/ដល់|-|\/to\//i);
          if (parts[0] && parts[0].trim().length >= 6) {
            cleanDate = parts[0].trim();
          }
        }
        const cleanReason = String(r.reason || '').replace(/\u200B/g, '').replace(/\s+/g, ' ').trim();
        const cleanGrade = normalizeStudentGrade(r.grade);
        return {
          ...r,
          grade: cleanGrade || r.grade || '',
          reason: cleanReason,
          date: cleanDate
        };
      });

    if (cleaned.length > 0 || Object.prototype.hasOwnProperty.call(result, month)) {
      result[month] = cleaned;
    }
  });

  // Guarantee baseline official leave records (June - October 2026) when a month has not been populated yet
  Object.keys(INITIAL_LEAVE_DATA).forEach(mKey => {
    const official = INITIAL_LEAVE_DATA[mKey];
    if (Array.isArray(official) && official.length > 0) {
      if (!Array.isArray(result[mKey]) || result[mKey].length === 0) {
        result[mKey] = official.map(item => ({ ...item }));
      }
    }
  });

  return result;
}

// Initial default Finance Data matching the 5 Official DOCX Reports (May - September 2026)
export const INITIAL_FINANCE_DATA = {
  '2026-05': {
    income: [
      { id: 'inc-05-1', desc: 'បានពីវិភាគទានសមណសិស្សដាក់ពាក្យចូលរៀន', qty: '១០១អង្គ', unitPrice: 40000, total: 4040000, note: '' },
      { id: 'inc-05-2', desc: 'ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់', qty: '', unitPrice: '', total: 2000000, note: '' }
    ],
    expense: [
      { id: 'exp-05-1', desc: 'ម៉ាស៊ីនព្រីនMG6230', qty: '១គ្រឿង', unitPrice: 544860, total: 544860, note: '' },
      { id: 'exp-05-2', desc: 'ទឹកថ្នាំសខ្មៅ', qty: '៣ប្រអប់', unitPrice: 30270, total: 90810, note: '' },
      { id: 'exp-05-3', desc: 'ថងកាតថ្លា', qty: '១០០ថង់', unitPrice: 280, total: 28000, note: '' },
      { id: 'exp-05-4', desc: 'កាតរឹង+ខ្សែ', qty: '២០ខ្សែ', unitPrice: 650, total: 13000, note: '' },
      { id: 'exp-05-5', desc: 'ក្រដាសរឹងA4', qty: '២០សន្លឹក', unitPrice: 500, total: 10000, note: '' },
      { id: 'exp-05-6', desc: 'ក្រដាសរាមស', qty: '១កេស', unitPrice: 60000, total: 60000, note: '' },
      { id: 'exp-05-7', desc: 'ហ្វឺតក្ដារ Pilot', qty: '៤ប្រអប់', unitPrice: 52074, total: 211900, note: '' },
      { id: 'exp-05-8', desc: 'មេគីបST HD', qty: '១គ្រឿង', unitPrice: 97200, total: 97200, note: '' },
      { id: 'exp-05-9', desc: 'ទឹកហ្វឺតក្ដារGR WI', qty: '២សុង', unitPrice: 21992, total: 44000, note: '' },
      { id: 'exp-05-10', desc: 'មេគីប10Gangaro mini', qty: '១ដើម', unitPrice: 2228, total: 2228, note: '' },
      { id: 'exp-05-11', desc: 'ក្រដាសរ៉ាមពណ៌30g ដិត/ស្រាលចំរុះ', qty: '១ដុំ', unitPrice: 10976, total: 10976, note: '' },
      { id: 'exp-05-12', desc: 'គ្រូណូ Elephen210F', qty: '២គ្រឿង', unitPrice: 7500, total: 15000, note: '' },
      { id: 'exp-05-13', desc: 'គ្រូណូ112A4 LN', qty: '១គ្រឿង', unitPrice: 5000, total: 5000, note: '' },
      { id: 'exp-05-14', desc: 'ឃ្នាបសៀតរូបត្រី (Paper Clip)', qty: '១០ប្រអប់', unitPrice: 490, total: 4900, note: '' },
      { id: 'exp-05-15', desc: 'មេគីប HS 45P', qty: '១គ្រឿង', unitPrice: 10400, total: 10400, note: '' },
      { id: 'exp-05-16', desc: 'គ្រាបគីបkangSS 23/15', qty: '១ប្រអប់', unitPrice: 5300, total: 5300, note: '' },
      { id: 'exp-05-17', desc: 'គ្រាបគីបkangSS 23/10', qty: '១ប្រអប់', unitPrice: 4900, total: 4900, note: '' },
      { id: 'exp-05-18', desc: 'ដែកខ្ទាស់សឺមីHUA JIE (H1001)', qty: '១ប្រអប់', unitPrice: 5300, total: 5300, note: '' },
      { id: 'exp-05-19', desc: 'មេគីបលេខ10Gangaro', qty: '១ដើម', unitPrice: 3400, total: 3400, note: '' },
      { id: 'exp-05-20', desc: 'ដែកគោលមួកប្រអប់ជ័រ', qty: '២ប្រអប់', unitPrice: 1300, total: 2600, note: '' },
      { id: 'exp-05-21', desc: 'ស្កុតក្រដាត់ធំ៦កង', qty: '១សុង', unitPrice: 22000, total: 22000, note: '' },
      { id: 'exp-05-22', desc: 'មេគីបលេខ DS 45N Elephen1', qty: '១ដើម', unitPrice: 10400, total: 10400, note: '' },
      { id: 'exp-05-23', desc: 'ស្កុតមុខពីរថ្លាក្រាស', qty: '៣កង', unitPrice: 4066, total: 12200, note: '' },
      { id: 'exp-05-24', desc: 'ឃ្នាបខ្មៅ Black Clip 111', qty: '១២ប្រអប់', unitPrice: 1441, total: 18500, note: '' },
      { id: 'exp-05-25', desc: 'ឃ្នាបខ្មៅ Black Clip 112', qty: '១២ប្រអប់', unitPrice: 991, total: 11900, note: '' },
      { id: 'exp-05-26', desc: 'ឃ្នាបខ្មៅ Black Clip 113', qty: '១២ប្រអប់', unitPrice: 991, total: 11900, note: '' },
      { id: 'exp-05-27', desc: 'ដែកគោស៊ីម៉ង់', qty: '៤កញ្ចប់', unitPrice: 700, total: 2800, note: '' },
      { id: 'exp-05-28', desc: 'ផ្លាស្ទិកគ្រប់រឹងA4 LN 101(0.15mm)', qty: '១រ៉ាម', unitPrice: 13500, total: 13500, note: '' },
      { id: 'exp-05-29', desc: 'ស្រោមគគីA4(9x12)', qty: '១ដុំ', unitPrice: 9000, total: 9000, note: '' },
      { id: 'exp-05-30', desc: 'សមីក្រដាសស្ដើង', qty: '១០សមី', unitPrice: 120, total: 1200, note: '' },
      { id: 'exp-05-31', desc: 'សមីក្រដាសរឹងA4', qty: '១០សមី', unitPrice: 450, total: 4500, note: '' },
      { id: 'exp-05-32', desc: 'សមីក្រដាសរឹងF4', qty: '៥សមី', unitPrice: 520, total: 2600, note: '' },
      { id: 'exp-05-33', desc: 'កាវស្ងួត GR GS04', qty: '១ដើម', unitPrice: 3500, total: 3500, note: '' },
      { id: 'exp-05-34', desc: 'ស្កុតមុខពីរកំប៉ុងខ្មៅធំ', qty: '២កង', unitPrice: 1700, total: 3400, note: '' },
      { id: 'exp-05-35', desc: 'គាវទឹក GiralleGR', qty: '១ដើម', unitPrice: 10000, total: 10000, note: '' },
      { id: 'exp-05-36', desc: 'ទូដែក(១៥ថត)', qty: '១ទូ', unitPrice: 559995, total: 559995, note: '' },
      { id: 'exp-05-37', desc: 'ម៉ូតូឌុប', qty: '២ដង', unitPrice: 5000, total: 10000, note: '' },
      { id: 'exp-05-38', desc: 'ចំណាយ លើគ្រូស្ម័គ្រចិត្ត (ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '៩០ម៉ោង', unitPrice: 4000, total: 360000, note: '' }
    ]
  },
  '2026-06': {
    income: [
      { id: 'inc-06-1', desc: 'ប្រាក់សល់ពីខែឧសភា', qty: '', unitPrice: '', total: 3802831, note: '' },
      { id: 'inc-06-2', desc: 'ប្រាក់ពីសមណសិស្សដាក់ច្បាប់', qty: '២៥អង្គ', unitPrice: 2000, total: 50000, note: '' },
      { id: 'inc-06-3', desc: 'ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែមិថុនា', qty: '៥អង្គ', unitPrice: 5000, total: 22500, note: '' },
      { id: 'inc-06-4', desc: 'ទទួលបានពីសប្បុរសជន', qty: '១ដង', unitPrice: 50000, total: 50000, note: '' },
      { id: 'inc-06-5', desc: 'ព្រះធម្មសាលាវង្ស សា វីរៈ ព្រះគ្រូចៅអធិការវត្ត', qty: 'កុំព្យូទ័រ១គ្រឿង', unitPrice: '', total: 0, totalLabel: 'កុំព្យូទ័រ១គ្រឿង', note: '' }
    ],
    expense: [
      { id: 'exp-06-1', desc: 'ខ្សែពាក់កក្រាស់', qty: '៥០ខ្សែ', unitPrice: 324, total: 16200, note: '' },
      { id: 'exp-06-2', desc: 'ស្រោមកាតឈរកណ្ដាលX-805/207/B002', qty: '៥០សន្លឹក', unitPrice: 182, total: 9100, note: '' },
      { id: 'exp-06-3', desc: 'ម៉ូតូឌុប', qty: '១ដង', unitPrice: 5000, total: 5000, note: '' },
      { id: 'exp-06-4', desc: 'ចំណាយលើគ្រូស្ម័គ្រចិត្ត (ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '១១៣ម៉ោង', unitPrice: 4000, total: 452000, note: '' }
    ]
  },
  '2026-07': {
    income: [
      { id: 'inc1', desc: 'ប្រាក់សល់ពីខែមិថុនា', qty: '', unitPrice: '', total: 3443031, note: '' },
      { id: 'inc2', desc: 'ប្រាក់ពីសមណសិស្សដាក់ច្បាប់ ខែកក្កដា', qty: '១៣អង្គ', unitPrice: 2000, total: 26000, note: '' },
      { id: 'inc3', desc: 'ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែកក្កដា', qty: '៧អង្គ', unitPrice: 27500, total: 27500, note: '' }
    ],
    expense: [
      { id: 'exp1', desc: 'ម៉ាស៊ីនស្កែនកាតសិស្ស 2D Desktop Barcode Scanner', qty: '1ម៉ាស៊ីន', unitPrice: 268670, total: 268670, note: '' },
      { id: 'exp2', desc: 'ក្ដាឈើ៨លីខ្សែ TY(1.22MX2.22M)', qty: '2សន្លឹក', unitPrice: 42848, total: 85696, note: '' },
      { id: 'exp3', desc: 'វីសរាយ', qty: '0.8គីឡូក្រាម', unitPrice: 20211, total: 16169, note: '' },
      { id: 'exp4', desc: 'សាយ៉ូវវីសធំ', qty: '4 គ្រាប់', unitPrice: 1010, total: 4042, note: '' },
      { id: 'exp5', desc: 'សាំងក្រអូប -802', qty: '3 លីត្រ', unitPrice: 8084, total: 24253, note: '' },
      { id: 'exp6', desc: 'វៀកនីតូអាលេខ -T8000-1L', qty: '1 កំប៉ុង', unitPrice: 22232, total: 22232, note: '' },
      { id: 'exp7', desc: 'សេវ៉ាថ្លៃដឹកដល់ផ្ទះ -$2.50', qty: '1 ជើង', unitPrice: 10105, total: 10105, note: '' },
      { id: 'exp8', desc: 'ព្រីរន្ធ8បាតខៀវ ABC', qty: '1 គ្រាប់', unitPrice: 6669, total: 6669, note: '' },
      { id: 'exp9', desc: 'វៀកនីតូអាលេខ-T8000-1L', qty: '1 កំប៉ុង', unitPrice: 22232, total: 22232, note: '' },
      { id: 'exp10', desc: 'វីសរីករាយ', qty: '0.25គីឡូក្រាម', unitPrice: 20211, total: 5052, note: '' },
      { id: 'exp11', desc: 'ក្ដាឈើ៨លីខ្សែ TY(1.22MX2.22M)', qty: '1 សន្លឹក', unitPrice: 42848, total: 42848, note: '' },
      { id: 'exp12', desc: 'សេវ៉ាថ្លៃដឹកដល់ផ្ទះ -$2.50', qty: '1 ជើង', unitPrice: 10105, total: 10105, note: '' },
      { id: 'exp13', desc: 'ចំណាយលើគ្រូស្ម័គ្រចិត្ត (ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '94ម៉ោង', unitPrice: 4000, total: 376000, note: '' }
    ]
  },
  '2026-08': {
    income: [
      { id: 'inc-08-1', desc: 'ប្រាក់សល់ពីខែកក្កដា', qty: '', unitPrice: '', total: 2602458, note: '' },
      { id: 'inc-08-2', desc: 'ប្រាក់ពីសមណសិស្សដាក់ច្បាប់ ខែសីហា', qty: '៣០អង្គ', unitPrice: 2000, total: 60000, note: '' },
      { id: 'inc-08-3', desc: 'ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែសីហា', qty: '១០អង្គ', unitPrice: 46500, total: 46500, note: '' }
    ],
    expense: [
      { id: 'exp-08-1', desc: 'ព្រីនរូបថត មន្ត្រីនិងគ្រូបង្រៀនអ៊ុតរឹង', qty: '៥ រូប', unitPrice: 6000, total: 30000, note: '' },
      { id: 'exp-08-2', desc: 'ព្រីនឈ្មោះ កូល័រ', qty: '២ សន្លឹក', unitPrice: 500, total: 1000, note: '' },
      { id: 'exp-08-3', desc: 'ម៉ូតូឌុប', qty: '១ជើង', unitPrice: 5000, total: 5000, note: '' },
      { id: 'exp-08-4', desc: 'ចំណាយលើគ្រូស្ម័គ្រចិត្ត (ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '១០៦ម៉ោង', unitPrice: 4000, total: 424000, note: '' }
    ]
  },
  '2026-09': {
    income: [
      { id: 'inc-09-1', desc: 'ប្រាក់សល់ពីខែសីហា', qty: '', unitPrice: '', total: 2248958, note: '' },
      { id: 'inc-09-2', desc: 'ប្រាក់ពីសមណសិស្សដាក់ច្បាប់ ខែកញ្ញា', qty: '៣០អង្គ', unitPrice: 2000, total: 60000, note: '' },
      { id: 'inc-09-3', desc: 'ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែកញ្ញា', qty: '១០អង្គ', unitPrice: 46500, total: 35500, note: '' }
    ],
    expense: [
      { id: 'exp-09-1', desc: 'ទឹកថ្នាំដាក់ម៉ាស៊ីនព្រីន', qty: '១ឈុត', unitPrice: 140000, total: 140000, note: '' },
      { id: 'exp-09-2', desc: 'ទិញថងកាត ID', qty: '១០០ថង', unitPrice: 400, total: 40000, note: '' },
      { id: 'exp-09-3', desc: 'ម៉ូតូឌុប', qty: '១ដង', unitPrice: 5000, total: 5000, note: '' },
      { id: 'exp-09-4', desc: 'ចំណាយលើគ្រូស្ម័គ្រចិត្ត (ប្រាក់ម៉ោង)៦អង្គ/រូប', qty: '៩៦ម៉ោង', unitPrice: 4000, total: 384000, note: '' }
    ]
  }
};

const TEST_FINANCE_IDS_TO_PURGE = new Set([
  'fin-1793656199703',
  'income-1793966901150',
  'fin-1793963017532',
  'fin-1793964044496-0-9lz8',
  'fin-1793964044496-1-vkb5',
  'fin-1793964143143-0-qyh6',
  'fin-1793964143143-1-a2ng',
  'fin-1793964143143-2-bi0d',
  'fin-1793964143143-3-m5qm',
  'fin-1793964143143-4-c4on',
  'fin-1793964143143-5-kf2h',
  'fin-1793964143143-6-itzh',
  'fin-1793964143143-7-u1ge',
  'expense-1793966904124'
]);

export function sanitizeFinanceState(rawFinance = {}) {
  const result = {};

  // 1. Copy over non-test months & filter out known test items
  Object.keys(rawFinance || {}).forEach(mKey => {
    if (mKey === '2025-01' || mKey === '2027-01') return;
    const mData = rawFinance[mKey];
    if (!mData) return;

    const cleanIncome = (Array.isArray(mData.income) ? mData.income : []).filter(item => {
      if (!item) return false;
      if (TEST_FINANCE_IDS_TO_PURGE.has(item.id)) return false;
      if (String(item.desc || '').trim().toLowerCase() === 'saly') return false;
      return true;
    }).map(item => (
      mKey === '2026-05' && (String(item.desc || '').trim() === 'ប្រាក់សល់ពីខែឧសភា' || String(item.desc || '').trim() === 'ប្រាក់តម្កល់ពីឆ្នាំចាស់២០២៥')
        ? { ...item, desc: 'ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់' }
        : item
    ));

    const cleanExpense = (Array.isArray(mData.expense) ? mData.expense : []).filter(item => {
      if (!item) return false;
      if (TEST_FINANCE_IDS_TO_PURGE.has(item.id)) return false;
      if (item.desc === 'ទំនិញ/សេវា' && Number(item.total) === 0) return false;
      if (!String(item.desc || '').trim() && Number(item.total) === 0) return false;
      return true;
    }).map(e => ({
      ...e,
      qty: e.qty ? e.qty.replace(/0\.25\s+គីឡូក្រាម/, '0.25គីឡូក្រាម').replace(/0\.8\s+គីឡូក្រាម/, '0.8គីឡូក្រាម') : e.qty
    }));

    if (cleanIncome.length > 0 || cleanExpense.length > 0) {
      result[mKey] = { income: cleanIncome, expense: cleanExpense };
    }
  });

  // 2. Guarantee the 5 official DOCX months (2026-05 .. 2026-09) have authentic baseline data
  Object.keys(INITIAL_FINANCE_DATA).forEach(mKey => {
    const official = INITIAL_FINANCE_DATA[mKey];
    const current = result[mKey];
    if (
      !current ||
      !Array.isArray(current.income) ||
      current.income.length < official.income.length ||
      !Array.isArray(current.expense) ||
      current.expense.length < official.expense.length
    ) {
      result[mKey] = {
        income: [...official.income],
        expense: [...official.expense]
      };
    }
  });

  return result;
}

const KHMER_DIGITS_MAP = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const KHMER_MONTH_NAMES_LIST = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

function numToKhmerStr(num) {
  return String(num ?? '').replace(/[0-9]/g, d => KHMER_DIGITS_MAP[Number(d)]);
}

/**
 * 3-Channel Real-Time Auto-Sync Engine (Option 1):
 * 1. Channel 1 (Leave Paper Sales): 1 slip = 2,000 KHR (with Smart Fallback Guard for 0-leave historical DOCX months)
 * 2. Channel 2 (ID Card Purchases): Sum of student ID card purchases in the month
 * 3. Channel 3 (Donor Cash / In-Kind): Auto-preserves in-kind material labels (e.g., កុំព្យូទ័រ១គ្រឿង)
 * 4. Cascading Monthly Carryover: Updates next month's `ប្រាក់សល់ពីខែមុន` automatically
 */
export function recomputeLinkedFinance(rawFinance = {}, allLeaves = {}, allIdCards = {}, extraMonthKeys = []) {
  const baseFinance = sanitizeFinanceState(rawFinance);
  const result = {};

  // Collect all active finance months in chronological order
  const activeMonthKeys = Array.from(new Set([
    ...Object.keys(baseFinance),
    ...extraMonthKeys.filter(Boolean),
    ...Object.keys(allLeaves || {}).filter(k => Array.isArray(allLeaves[k]) && allLeaves[k].length > 0),
    ...Object.keys(allIdCards || {}).filter(k => Array.isArray(allIdCards[k]) && allIdCards[k].length > 0)
  ]))
    .filter(k => k && k !== '2025-01' && k !== '2027-01')
    .sort();

  let prevNetBalance = null;
  let prevMonthKey = null;

  activeMonthKeys.forEach(mKey => {
    const [, mStr] = mKey.split('-');
    const mIdx = Math.max(0, Math.min(11, (parseInt(mStr, 10) || 7) - 1));
    const monthName = KHMER_MONTH_NAMES_LIST[mIdx];
    const prevMIdx = prevMonthKey
      ? Math.max(0, Math.min(11, (parseInt(prevMonthKey.split('-')[1], 10) || 6) - 1))
      : (mIdx === 0 ? 11 : mIdx - 1);
    const prevMonthName = KHMER_MONTH_NAMES_LIST[prevMIdx];

    const existingMonth = baseFinance[mKey] || { income: [], expense: [] };
    let income = Array.isArray(existingMonth.income) ? existingMonth.income.map(it => ({ ...it })) : [];
    const expense = Array.isArray(existingMonth.expense) ? existingMonth.expense.map(it => ({ ...it })) : [];

    const officialBaseline = INITIAL_FINANCE_DATA[mKey];
    const monthLeaves = Array.isArray(allLeaves?.[mKey]) ? allLeaves[mKey] : [];
    const monthIdCards = Array.isArray(allIdCards?.[mKey]) ? allIdCards[mKey] : [];

    // --- 0. Carryover Balance Row (`ប្រាក់សល់ពីខែ...` / `ប្រាក់តម្កល់...`) ---
    const carryIdx = income.findIndex(it => it && (
      String(it.desc || '').includes('ប្រាក់សល់ពី') ||
      String(it.desc || '').includes('ប្រាក់តម្កល់') ||
      String(it.desc || '').includes('ប្រាក់តម្កាល') ||
      it.autoChannel === 'carryover'
    ));

    // Note: In official May 2026 PDF report, May starts with ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់ (2,000,000 KHR)
    // and ends with 3,802,831 KHR, which cascades into June 2026 as ប្រាក់សល់ពីខែឧសភា (3,802,831 KHR).
    if (mKey === '2026-05') {
      const targetCarryDesc = 'ប្រាក់តម្កល់សល់ពីឆ្នាំចាស់';
      if (carryIdx >= 0) {
        income[carryIdx] = {
          ...income[carryIdx],
          desc: targetCarryDesc,
          total: Number(income[carryIdx].total) || 2000000
        };
      } else {
        income.push({
          id: 'inc-05-2',
          autoChannel: 'carryover',
          desc: targetCarryDesc,
          qty: '',
          unitPrice: '',
          total: 2000000,
          note: ''
        });
      }
    } else if (prevNetBalance !== null) {
      if (carryIdx >= 0) {
        income[carryIdx] = {
          ...income[carryIdx],
          desc: `ប្រាក់សល់ពីខែ${prevMonthName}`,
          total: prevNetBalance
        };
      } else {
        income.unshift({
          id: `inc-${mKey}-carry`,
          autoChannel: 'carryover',
          desc: `ប្រាក់សល់ពីខែ${prevMonthName}`,
          qty: '',
          unitPrice: '',
          total: prevNetBalance,
          note: ''
        });
      }
    }

    // --- 1. Channel 1: Leave Paper Sales (`១ ក្រដាស = ២,០០០៛`) ---
    const leaveIdx = income.findIndex(it => it && (
      String(it.desc || '').includes('ដាក់ច្បាប់') ||
      it.autoChannel === 'leave'
    ));

    if (monthLeaves.length > 0) {
      const leaveCount = monthLeaves.length;
      const leaveTotal = leaveCount * 2000;
      const qtyLabel = `${numToKhmerStr(leaveCount)}អង្គ`;
      if (leaveIdx >= 0) {
        income[leaveIdx] = {
          ...income[leaveIdx],
          autoChannel: 'leave',
          qty: qtyLabel,
          unitPrice: 2000,
          total: leaveTotal
        };
      } else {
        const insertAt = carryIdx >= 0 ? carryIdx + 1 : Math.min(1, income.length);
        income.splice(insertAt, 0, {
          id: `inc-${mKey}-leave`,
          autoChannel: 'leave',
          desc: `ប្រាក់ពីសមណសិស្សដាក់ច្បាប់ ខែ${monthName}`,
          qty: qtyLabel,
          unitPrice: 2000,
          total: leaveTotal,
          note: ''
        });
      }
    } else if (officialBaseline) {
      // Smart Fallback Guard: preserve official DOCX leave row when 0 leave records are entered yet
      const baseLeaveRow = officialBaseline.income.find(it => String(it.desc || '').includes('ដាក់ច្បាប់'));
      if (baseLeaveRow) {
        if (leaveIdx >= 0) {
          income[leaveIdx] = { ...baseLeaveRow };
        } else {
          const insertAt = carryIdx >= 0 ? carryIdx + 1 : Math.min(1, income.length);
          income.splice(insertAt, 0, { ...baseLeaveRow });
        }
      }
    } else if (leaveIdx >= 0 && income[leaveIdx].autoChannel === 'leave') {
      income[leaveIdx] = {
        ...income[leaveIdx],
        qty: '០អង្គ',
        unitPrice: 2000,
        total: 0
      };
    }

    // --- 2. Channel 2: Student ID Card Purchases (`ប្រាក់ពីសមណសិស្សជាវ IDថ្មី`) ---
    const idcIdx = income.findIndex(it => it && (
      String(it.desc || '').includes('ជាវ ID') ||
      String(it.desc || '').includes('ទិញ ID') ||
      it.autoChannel === 'idcard'
    ));

    if (monthIdCards.length > 0) {
      const idcCount = monthIdCards.length;
      const idcTotal = monthIdCards.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
      const qtyLabel = `${numToKhmerStr(idcCount)}អង្គ`;

      if (idcIdx >= 0) {
        const currentRow = income[idcIdx];
        const baseIdcRow = officialBaseline?.income?.find(it => String(it.desc || '').includes('ជាវ ID'));
        const matchesBaseline = baseIdcRow && Number(baseIdcRow.total) === idcTotal && baseIdcRow.qty === qtyLabel;
        income[idcIdx] = {
          ...currentRow,
          autoChannel: 'idcard',
          qty: qtyLabel,
          unitPrice: matchesBaseline ? baseIdcRow.unitPrice : idcTotal,
          total: idcTotal
        };
      } else {
        const currentLeaveIdx = income.findIndex(it => it && (String(it.desc || '').includes('ដាក់ច្បាប់') || it.autoChannel === 'leave'));
        const currentCarryIdx = income.findIndex(it => it && (
          String(it.desc || '').includes('ប្រាក់សល់ពី') ||
          String(it.desc || '').includes('ប្រាក់តម្កល់') ||
          String(it.desc || '').includes('ប្រាក់តម្កាល') ||
          it.autoChannel === 'carryover'
        ));
        const insertAt = currentLeaveIdx >= 0
          ? currentLeaveIdx + 1
          : (currentCarryIdx >= 0 ? currentCarryIdx + 1 : Math.min(2, income.length));
        income.splice(insertAt, 0, {
          id: `inc-${mKey}-idcard`,
          autoChannel: 'idcard',
          desc: `ប្រាក់ពីសមណសិស្សជាវ IDថ្មី ខែ${monthName}`,
          qty: qtyLabel,
          unitPrice: idcTotal,
          total: idcTotal,
          note: ''
        });
      }
    } else if (officialBaseline) {
      const baseIdcRow = officialBaseline.income.find(it => String(it.desc || '').includes('ជាវ ID'));
      if (baseIdcRow) {
        if (idcIdx >= 0) {
          income[idcIdx] = { ...baseIdcRow };
        } else {
          income.push({ ...baseIdcRow });
        }
      }
    } else if (idcIdx >= 0 && income[idcIdx].autoChannel === 'idcard') {
      income[idcIdx] = {
        ...income[idcIdx],
        qty: '០អង្គ',
        unitPrice: 0,
        total: 0
      };
    }

    // --- 3. Channel 3: Donor Cash or In-Kind Donations (`សប្បុរសជនចូលបច្ច័យ ឬវត្ថុ`) ---
    income = income.map(it => {
      if (!it) return it;
      const desc = String(it.desc || '');
      const isSystemRow = (
        desc.includes('ប្រាក់សល់ពី') ||
        desc.includes('ប្រាក់តម្កល់') ||
        desc.includes('ប្រាក់តម្កាល') ||
        desc.includes('ដាក់ច្បាប់') ||
        desc.includes('ជាវ ID') ||
        desc.includes('ទិញ ID') ||
        it.autoChannel === 'carryover' ||
        it.autoChannel === 'leave' ||
        it.autoChannel === 'idcard'
      );
      if (isSystemRow) return it;

      const numTotal = Number(it.total) || 0;
      const numUnit = Number(it.unitPrice) || 0;
      const qtyText = String(it.qty || '').trim();
      if (numTotal === 0 && numUnit === 0 && qtyText && !/^[0-9០-៩\s.,]+$/.test(qtyText)) {
        return {
          ...it,
          total: 0,
          totalLabel: it.totalLabel || qtyText
        };
      }
      if (numTotal > 0 && it.totalLabel && it.totalLabel === qtyText) {
        const { totalLabel, ...rest } = it;
        return rest;
      }
      return it;
    });

    result[mKey] = {
      income,
      expense
    };

    const monthIncomeSum = income.reduce((s, it) => s + (Number(it?.total) || 0), 0);
    const monthExpenseSum = expense.reduce((s, it) => s + (Number(it?.total) || 0), 0);
    prevNetBalance = monthIncomeSum - monthExpenseSum;
    prevMonthKey = mKey;
  });

  return result;
}

// Initial default ID Card Purchase Data matching តារាងបង់ថ្លៃទិញកាត ID.xlsx
export const INITIAL_ID_CARD_DATA = {
  '2026-06': [
    { id: 'idc-06-1', name: 'ហ៊ុំ រ៉ានុ', grade: '១', item: 'ថង', qty: 1, price: 2500, date: '17/06/2026', note: '' },
    { id: 'idc-06-2', name: 'ឌឿន រ៉ាដូ', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '19/06/2026', note: '' },
    { id: 'idc-06-3', name: 'ធឿន ប៊ុនលាភ', grade: '១', item: 'មួយឈុត', qty: 1, price: 5000, date: '19/06/2026', note: '' },
    { id: 'idc-06-4', name: 'ពិសិដ្ធ សុបញ្ញា', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/06/2026', note: '' },
    { id: 'idc-06-5', name: 'ឈុនហ៊ាង គីមហុង', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '29/06/2026', note: '' }
  ],
  '2026-07': [
    { id: 'idc-07-1', name: 'ណាត សូជីន', grade: '១', item: 'ថង', qty: 1, price: 2500, date: '01/07/2026', note: '' },
    { id: 'idc-07-2', name: 'ហុង វិច្ឆិកា', grade: '១', item: 'ថង', qty: 1, price: 2500, date: '01/07/2026', note: '' },
    { id: 'idc-07-3', name: 'ស្រឿន សុខខា', grade: '១', item: 'មួយឈុត', qty: 1, price: 5000, date: '01/07/2026', note: '' },
    { id: 'idc-07-4', name: 'ស៊ឹម ពិសិដ្ឋ', grade: '១', item: 'ថង', qty: 1, price: 2500, date: '01/07/2026', note: '' },
    { id: 'idc-07-5', name: 'យាន គូម៉ាន់', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '01/07/2026', note: '' },
    { id: 'idc-07-6', name: 'ពោង ជីវ័ន្ត', grade: '១', item: 'មួយឈុត', qty: 1, price: 5000, date: '03/07/2026', note: '' },
    { id: 'idc-07-7', name: 'បាវ សុខណា', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '13/07/2026', note: '' }
  ],
  '2026-08': [
    { id: 'idc-08-1', name: 'យាន គូម៉ាន់', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '05/08/2026', note: '' },
    { id: 'idc-08-2', name: 'ភាក់ សុភាព', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '05/08/2026', note: '' },
    { id: 'idc-08-3', name: 'ឌឿន រ៉ាដូ', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '05/08/2026', note: '' },
    { id: 'idc-08-4', name: 'ឆាន មាសឆៃ', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '05/08/2026', note: '' },
    { id: 'idc-08-5', name: 'តួ បញ្ញា', grade: '១', item: 'មួយឈុត', qty: 1, price: 5000, date: '17/08/2026', note: '' },
    { id: 'idc-08-6', name: 'ហ៊ុំ រ៉ានុ', grade: '១', item: 'ថង', qty: 1, price: 1500, date: '17/08/2026', note: '' },
    { id: 'idc-08-7', name: 'ម៉េង ទិត្យ', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '19/08/2026', note: '' },
    { id: 'idc-08-8', name: 'ណាក់ វាន់នី', grade: '៣', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/08/2026', note: '' },
    { id: 'idc-08-9', name: 'ឡេង ហេងលាន', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/08/2026', note: '' },
    { id: 'idc-08-10', name: 'ឃី ម៉េងលាភ', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '26/08/2026', note: '' }
  ],
  '2026-09': [
    { id: 'idc-09-1', name: 'ពិសិដ្ធ សុបញ្ញា', grade: '២', item: 'ថង', qty: 1, price: 1500, date: '04/09/2026', note: '' },
    { id: 'idc-09-2', name: 'នី ផានុត', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '07/09/2026', note: '' },
    { id: 'idc-09-3', name: 'ជួង ចិត្រា', grade: '២', item: 'ថង', qty: 1, price: 1500, date: '09/09/2026', note: '' },
    { id: 'idc-09-4', name: 'វេង សុវណ្ណ', grade: '៣', item: 'ថង', qty: 1, price: 1500, date: '17/09/2026', note: '' },
    { id: 'idc-09-5', name: 'ជួង ចិត្រា', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '21/09/2026', note: '' },
    { id: 'idc-09-6', name: 'ឃិន ស៊ិវម៉ិញ', grade: '២', item: 'មួយឈុត', qty: 1, price: 5000, date: '21/09/2026', note: '' },
    { id: 'idc-09-7', name: 'ឆាន រ៉ាយុទ្ធ', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/09/2026', note: '' },
    { id: 'idc-09-8', name: 'ភេត សាវរី', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/09/2026', note: '' },
    { id: 'idc-09-9', name: 'សាន ដារ៉ា', grade: 'មត្តេយ្យ', item: 'មួយឈុត', qty: 1, price: 5000, date: '25/09/2026', note: '' },
    { id: 'idc-09-10', name: 'ចាន់ ឆៃអ៊ង', grade: '២', item: 'ID', qty: 1, price: 1000, date: '25/09/2026', note: '' }
  ],
  '2026-10': [
    { id: 'idc-10-1', name: 'ហ៊ាង ដារ៉ូ', grade: '១', item: 'ថង + ID', qty: 1, price: 3500, date: '15/10/2026', note: '' },
    { id: 'idc-10-2', name: 'ស៊ឹម ពិសិដ្ឋ', grade: '១', item: 'ID', qty: 1, price: 1500, date: '15/10/2026', note: '' },
    { id: 'idc-10-3', name: 'ណាត សូជីន', grade: '១', item: 'ថង + ID', qty: 1, price: 3500, date: '15/10/2026', note: '' }
  ],
  '2026-11': [
    { id: 'idc-11-1', name: 'ស៊ឹម ពិសិដ្ឋ', grade: '១', item: 'ID', qty: 1, price: 1500, date: '05/11/2026', note: '' }
  ]
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
        finance: recomputeLinkedFinance(INITIAL_FINANCE_DATA, INITIAL_LEAVE_DATA, INITIAL_ID_CARD_DATA),
        idCards: INITIAL_ID_CARD_DATA,
        adminReports: INITIAL_ADMIN_REPORTS,
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

    // Normalize and sanitize finance data (purges test entries & ensures 5 official DOCX months)
    const rawFinance = parsed.finance || INITIAL_FINANCE_DATA;
    const normalizedFinance = sanitizeFinanceState(rawFinance);

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

    // Clean and normalize all leave dates & purge test leave records
    const rawLeaves = parsed.leaves || INITIAL_LEAVE_DATA;
    const normalizedLeaves = sanitizeLeaveState(rawLeaves);

    const rawIdCards = parsed.idCards || {};
    const mergedIdCards = { ...INITIAL_ID_CARD_DATA };
    Object.keys(rawIdCards).forEach(month => {
      if (Array.isArray(rawIdCards[month]) && rawIdCards[month].length > 0) {
        mergedIdCards[month] = rawIdCards[month];
      } else if (rawIdCards[month] && !INITIAL_ID_CARD_DATA[month]) {
        mergedIdCards[month] = rawIdCards[month];
      }
    });

    const syncedFinance = recomputeLinkedFinance(normalizedFinance, normalizedLeaves, mergedIdCards);
    const mergedAdminReports = { ...INITIAL_ADMIN_REPORTS, ...(parsed.adminReports || {}) };

    return {
      leaves: normalizedLeaves,
      finance: syncedFinance,
      idCards: mergedIdCards,
      adminReports: mergedAdminReports,
      meta: mergedMeta,
      studentMaster: loadedStudents,
    };
  } catch (e) {
    console.error('Failed to load local app state:', e);
    return {
      leaves: INITIAL_LEAVE_DATA,
      finance: recomputeLinkedFinance(INITIAL_FINANCE_DATA, INITIAL_LEAVE_DATA, INITIAL_ID_CARD_DATA),
      idCards: INITIAL_ID_CARD_DATA,
      adminReports: INITIAL_ADMIN_REPORTS,
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
 * API Key & Multi-Key Pool Management (Local + Cloud Synced)
 */
export function getGeminiKeyPool() {
  try {
    const savedPool = parseApiKeyList(localStorage.getItem(STORAGE_KEYS.API_KEY_POOL));
    const savedSingle = parseApiKeyList(localStorage.getItem(STORAGE_KEYS.API_KEY));

    let stateKeys = [];
    const rawState = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (rawState) {
      const parsed = JSON.parse(rawState);
      stateKeys = [
        ...parseApiKeyList(parsed.meta?.geminiKeys),
        ...parseApiKeyList(parsed.meta?.geminiKey)
      ];
    }

    const basePool = Array.from(new Set([
      ...savedPool,
      ...stateKeys,
      ...DEFAULT_GEMINI_KEYS
    ]));

    // Only prepend savedSingle ahead of basePool if it's a brand-new custom key not already in basePool
    const customFirst = savedSingle.filter(k => !basePool.includes(k));
    return Array.from(new Set([
      ...customFirst,
      ...basePool,
      ...savedSingle
    ]));
  } catch (err) {
    console.error('Error reading Gemini key pool from localStorage:', err);
    return DEFAULT_GEMINI_KEYS;
  }
}

export function setStoredApiKeyPool(keysOrString) {
  try {
    const list = parseApiKeyList(keysOrString);
    if (list.length > 0) {
      localStorage.setItem(STORAGE_KEYS.API_KEY_POOL, list.join(','));
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY_POOL);
    }
  } catch (err) {
    console.error('Error saving Gemini key pool:', err);
  }
}

export function getStoredApiKey() {
  const pool = getGeminiKeyPool();
  return pool[0] || '';
}

export function setStoredApiKey(key) {
  const list = parseApiKeyList(key);
  if (list.length > 0) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, list[0]);
    if (list.length > 1) {
      setStoredApiKeyPool(list);
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }
}

let inflightKeyPoolPromise = null;

/**
 * Cold-start guard for Vercel / fresh browsers:
 * Ensures the multi-key pool from Supabase (`app_state.meta.geminiKeys`) is hydrated
 * before running OCR when local keys have not yet arrived.
 */
export async function ensureCloudApiKeyPoolLoaded() {
  const existing = getGeminiKeyPool();
  if (existing.length > 1) return existing;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return existing;
  if (!supabase) return existing;

  if (!inflightKeyPoolPromise) {
    inflightKeyPoolPromise = Promise.race([
      fetchCloudAppState().catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 4000))
    ]).then(cloudData => {
      inflightKeyPoolPromise = null;
      if (cloudData?.meta) {
        const cloudPool = Array.from(new Set([
          ...parseApiKeyList(cloudData.meta.geminiKeys),
          ...parseApiKeyList(cloudData.meta.geminiKey),
          ...DEFAULT_GEMINI_KEYS
        ]));
        if (cloudPool.length > 0) {
          setStoredApiKeyPool(cloudPool);
          if (!localStorage.getItem(STORAGE_KEYS.API_KEY)) {
            setStoredApiKey(cloudPool[0]);
          }
        }
      }
      return getGeminiKeyPool();
    }).catch(() => {
      inflightKeyPoolPromise = null;
      return getGeminiKeyPool();
    });
  }

  return inflightKeyPoolPromise;
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
      const cleanLeaves = sanitizeLeaveState(data.data.leaves);
      const mergedIdCards = { ...INITIAL_ID_CARD_DATA, ...(data.data.idCards || {}) };
      const mergedAdminReports = { ...INITIAL_ADMIN_REPORTS, ...(data.data.adminReports || {}) };
      return {
        ...data.data,
        leaves: cleanLeaves,
        idCards: mergedIdCards,
        adminReports: mergedAdminReports,
        finance: recomputeLinkedFinance(data.data.finance, cleanLeaves, mergedIdCards),
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
            const cleanLeaves = sanitizeLeaveState(payload.new.data.leaves);
            const mergedIdCards = { ...INITIAL_ID_CARD_DATA, ...(payload.new.data.idCards || {}) };
            const mergedAdminReports = { ...INITIAL_ADMIN_REPORTS, ...(payload.new.data.adminReports || {}) };
            onRemoteUpdate({
              ...payload.new.data,
              leaves: cleanLeaves,
              idCards: mergedIdCards,
              adminReports: mergedAdminReports,
              finance: recomputeLinkedFinance(payload.new.data.finance, cleanLeaves, mergedIdCards),
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


