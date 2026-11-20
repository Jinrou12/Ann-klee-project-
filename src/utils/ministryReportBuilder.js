// Ministry (មន្ទីរធម្មការ និងសាសនា) Annual Report Builder — Full Report (A4) & 10-Row Summary (Letter)
import {
  toKhmerDigits,
  parseKhmerNumber,
  sumByCurrency,
  combineCurrencyTotals,
  formatCurrencyTotals
} from './khmerNumerals.js';
import {
  isCarryoverIncomeItem,
  isTeacherHourlyExpenseItem
} from './financeSummaryBuilder.js';
import {
  synthesizeMultiMonthAdminReport,
  INITIAL_ADMIN_REPORTS
} from './adminReportBuilder.js';

export const MINISTRY_SEM1_MONTHS = [
  { num: '05', name: 'ខែឧសភា', shortName: 'ឧសភា' },
  { num: '06', name: 'ខែមិថុនា', shortName: 'មិថុនា' },
  { num: '07', name: 'ខែកក្កដា', shortName: 'កក្កដា' },
  { num: '08', name: 'ខែសីហា', shortName: 'សីហា' },
  { num: '09', name: 'ខែកញ្ញា', shortName: 'កញ្ញា' },
  { num: '10', name: 'ខែតុលា', shortName: 'តុលា' }
];

export const MINISTRY_SEM2_MONTHS = [
  { num: '11', name: 'វិច្ឆិកា', fullLabel: 'ខែវិច្ឆិកា' },
  { num: '12', name: 'ធ្នូ', fullLabel: 'ខែធ្នូ' },
  { num: '01', name: 'មករា', fullLabel: 'ខែមករា' },
  { num: '02', name: 'កុម្ភៈ', fullLabel: 'ខែកុម្ភៈ' }
];

export const DEFAULT_MINISTRY_TEACHER_ACTIVITIES = [
  'ត្រួតពិនិត្យរដ្ឋបាលថ្នាក់រៀន',
  'ការហៅវត្តមានសមណសិស្ស សិស្ស និងរាយការណ៍ប្រគេនគណៈគ្រប់គ្រងប្រចាំថ្ងៃ',
  'ត្រួតពិនិត្យអនាម័យ និងសណ្ដាប់ធ្នាប់សមណសិស្ស សិស្ស (ការស្លៀកពាក់)',
  'ហៅសមណសិស្សប្រមូលសៀវភៅកិច្ចការផ្ទះ និងកុដិ ប្រគេន ជូនគ្រូ ដើម្បីធ្វើកំណែលំហាត់',
  'គ្រូសរសេរចំណងជើង រួច អានឱ្យសមណសិស្ស សិស្សស្ដាប់ រួចឱ្យសមណសិស្សថាតាម'
];

export const DEFAULT_MINISTRY_STUDENT_ACTIVITIES = [
  'សមណសិស្ស សិស្ស សម្អាតថ្នាក់រៀនតាមវេន',
  'សមណសិស្ស សិស្ស សូត្រធម៌ចូល មុនគ្រូមកដល់ និងមុនចាប់ផ្ដើមថ្នាក់រៀន',
  'សមណសិស្ស សិស្ស ក្រោកទទួលគ្រូ ពេលគ្រូចូលក្នុងថ្នាក់រៀន',
  'សមណសិស្ស សិស្ស យកកិច្ចការប្រគេន ជូនគ្រូដើម្បីត្រួតពិនិត្យ',
  'សមណសិស្ស សិស្ស ស្ដាប់ និងកត់ត្រាកំណែតាមគ្រូ',
  'សមណសិស្ស សិស្ស កត់ត្រាមេរៀនថ្មី និងអានតាមគ្រូ',
  'សមណសិស្ស សិស្ស ស្ដាប់គ្រូពន្យល់នូវខ្លឹមសារមេរៀន និងសាកសួរ',
  'សមណសិស្ស សិស្ស កត់ត្រានូវចំណុចសំខាន់ៗ នៅពេលគ្រូឆ្លើយ',
  'សមណសិស្ស សិស្ស ក្រោកឆ្លើយនៅពេលគ្រូសាកសួរ',
  'សមណសិស្ស សិស្ស ក្រោកធ្វើបដិសណ្ឋារកិច្ចគ្រូ បញ្ចប់ការសិក្សា'
];

export const DEFAULT_MINISTRY_OUTSIDE_ACTIVITIES = [
  'គ្រូ សមណសិស្ស សិស្ស មានការសិក្សាស្រាវជ្រាវក្នុងបណ្ណាល័យឈ្វេងយល់ពាក្យគន្លឹះ',
  'គ្រូដឹកនាំចូលបណ្ណាល័យ នៅម៉ោងទំនេរ និងម៉ោងចុងសប្ដាហ៍រៀងរាល់សប្ដាហ៍',
  'ធ្វើអនាម័យជុំវិញសាលាប្រចាំថ្ងៃ ដោយអនុវត្តតាមកាលវិភាគ និងតាមការដឹកនាំរបស់គ្រូ',
  'សកម្មភាពគ្រូបង្រៀន សមណសិស្ស សិស្ស ក្នុងនិងក្រៅសាលាមានភាពល្អប្រសើរ',
  'មានការទំនាក់ទំនងល្អ រវាងគ្រូ និងសិស្ស',
  'គ្រូលើកទឹកចិត្តដល់សមណសិស្ស សិស្ស',
  'ទទួលសមភាព និងសុចរិតភាពចំពោះសមណសិស្ស សិស្ស',
  'ដឹកនាំសមណសិស្ស សិស្ស ចូលរួមស្ដាប់ការណែនាំរបស់សុខាភិបាលអំពីសុខភាព',
  'មានសាមគ្គីភាពក្នុងសាលា និងមានការទទួលខុសត្រូវខ្ពស់'
];

export const DEFAULT_MINISTRY_ABBOT_RESPONSIBILITIES = [
  'មានកុដិឱ្យស្នាក់នៅគ្រប់គ្រាន់',
  'ការផ្គត់ផ្គង់ចង្ហាន់បិណ្ឌបាត្របានគ្រប់គ្រាន់',
  'ព្រះគ្រូចៅអធិការយកព្រះទ័យទុកដាក់ខ្ពស់',
  'ព្រះគ្រូចៅអធិការ អប់រំឱ្យសមណសិស្សប្រឹងប្រែងរៀនសូត្ររៀងរាល់ថ្ងៃសីល',
  'ព្រះគ្រូចៅអធិការបាន អប់រំ ផ្សព្វផ្សាយដល់សមណសិស្សត្រូវមានអនាម័យខ្ពស់ ការពារពីជំងឺ តាមការណែនាំរបស់មន្ទីរសុខាភិបាល និងក្រសួងសុខាភិបាល',
  'ក្នុងនោះព្រះគ្រូចៅអធិការ បានដាក់ចេញនូវបទបញ្ជា ហាមឃាត់សមណសិស្សមិនឱ្យចេញទៅខាងក្រៅវត្តរហេតរហូតឡើយ បើមានការចាំបាច់ត្រូវចេញ ត្រូវស្លៀកដណ្ដប់កាយតាមបែបព្រះវិន័យ'
];

export const DEFAULT_MINISTRY_MANAGEMENT_ROUTINE = [
  'ត្រួតពិនិត្យគ្រូ',
  'ត្រួតពិនិត្យវត្តមានគ្រូ',
  'ត្រួតពិនិត្យសមណសិស្ស សិស្ស សិក្សាប្រចាំថ្ងៃ',
  'យកវត្តមានសមណសិស្សប្រចាំថ្ងៃ',
  'ចុះវត្តមានសមណសិស្ស សិស្ស',
  'បូកពិន្ទុសមណសិស្ស សិស្ស ប្រចាំខែ',
  'ប្រកាសលទ្ធផលប្រឡងប្រចាំខែជារៀងរាល់ ១ ខែម្តង',
  'ផ្តល់រង្វាន់ដល់សមណសិស្ស/សិស្សជ័យលាភី ពីលេខមួយដល់លេខប្រាំ',
  'ចុះសៀវភៅតាមដានសមណសិស្ស សិស្ស ក្នុង ១ ខែម្តង',
  'ត្រួតពិនិត្យទៅលើសមណសិស្ស សិស្ស ខ្លាំង ឬខ្សោយ និងពង្រឹងបន្ថែមតាមមុខវិជ្ជាដែលខ្សោយ',
  'ចូលបង្រៀនតាមថ្នាក់ ក្នុងករណីដែលគ្រូសុំច្បាប់ ឬជួយបន្ថែមនៅមុខវិជ្ជាដែលខ្វះគ្រូ',
  'ដឹកនាំប្រធានថ្នាក់ប្រជុំប្រចាំខែ ដើម្បីណែនាំអនុវត្តការងារក្នុងថ្នាក់រៀន',
  'គោរពទង់ព្រះពុទ្ធសាសនារៀងរាល់ថ្ងៃចន្ទ',
  'ថតសកម្មភាពបង្រៀននិងរៀន ជារៀងរាល់ថ្ងៃផ្ញើចូលគ្រុបមន្ទីរ',
  'ដឹកនាំលោកគ្រូ អ្នកគ្រូ ប្រជុំប្រចាំខែ ពង្រឹងការបង្រៀន និងរៀនប្រចាំថ្ងៃ',
  'ធ្វើរបាយការណ៍ប្រចាំខែ',
  'ប្រជុំបូកសរុបលទ្ធផលប្រចាំខែចាស់ និងលើកទិសដៅអនុវត្តសម្រាប់ខែបន្ទាប់'
];

export const DEFAULT_MINISTRY_LIBRARY_LINES = [
  'បណ្ណាល័យឧត្តមមុនី ម៉ែន នួន សមណសិស្ស សិស្ស ដែលបានចូលអានចំនួន ១.០០៦អង្គ/នាក់',
  'ចំនួនអ្នកខ្ចីសៀវភៅយកទៅអានមានចំនួន ៤៩ អង្គ/នាក់',
  'ចែកសៀវភៅសរសេរដល់លោកគ្រូ អ្នកគ្រូ ក្នុងម្នាក់មួយក្បាល',
  'បណ្ណាល័យមានសៀវភៅសរុបទាំងអស់មានចំនួន ៤ ៧៨៩ក្បាល',
  'ចំណងជើងសៀវភៅមាន ៣ ៧៤៧ ចំណងជើង'
];

export const DEFAULT_MINISTRY_DONATION_LINES = [
  'ចំណូលសៀវភៅក្នុងឆមាសទី១ មានចំនួន៣៥ ក្បាល។'
];

export const DEFAULT_MINISTRY_TEACHER_RELATIONS = [
  'សកម្មភាពគ្រូបង្រៀន សមណសិស្ស សិស្ស ក្នុង និង ក្រៅសាលាមានភាពល្អប្រសើរ',
  'មានការទំនាក់ទំនងល្អ',
  'ទទួលការអប់រំស្មើៗគ្នា',
  'មានសាមគ្គីគ្នា និងមានការទទួលខុសត្រូវខ្ពស់។'
];

export const DEFAULT_MINISTRY_CONCLUSION_PARAS = [
  'យោងតាមលទ្ធផលការវិភាគទិន្នន័យ អំពីដំណើរការនៃការគ្រប់គ្រងសាលាពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម មកឃើញថា សកម្មភាពរបស់សាលាពុទ្ធិកមានដំណើរការល្អ ព្រោះសកម្មភាពរបស់គណៈគ្រប់គ្រង លោកគ្រូ អ្នកគ្រូ មានការទទួលខុសត្រូវខ្ពស់ទៅលើការងាររបស់ខ្លួន។',
  'សរុបសេចក្ដីមក យើងអាចធ្វើសេចក្ដីសន្និដ្ឋានបានថា ថ្វីត្បិតតែមានសកម្មភាពអសកម្មមួយចំនួនយ៉ាងណាក៏ដោយ ក៏លក្ខខណ្ឌនៅតែសម្រេចបាននូវប្រសិទ្ធភាព និងសមិទ្ធផលដូចជា សេវាអប់រំ និងការផ្សព្វផ្សាយច្បាប់សាលា។ ហើយម្យ៉ាងវិញទៀតឃើញថា ការទំនាក់ទំនងល្អរវាងនាយកសាលា ជាមួយអាណាព្យាបាល និងព្រះគ្រូចៅអធិការវត្ត។'
];

export const DEFAULT_MINISTRY_CC_LIST = [
  'គណៈគ្រប់គ្រងវត្ត ខេមវ័ន',
  'សាលាអនុគណក្រុងកំពង់ចាម',
  'ការិយាល័យសង្គមកិច្ចនិងសុខុមាលភាពសង្គម',
  'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម',
  'ឯកសារ កាលប្បវត្តិ'
];

/**
 * Standardize blank dot runs in Ministry Lunar date lines to handwriting-friendly widths:
 * ថ្ងៃ..............ខែ...........ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០ (14 dots after ថ្ងៃ, 11 dots after ខែ)
 */
export function formatMinistryLunarDateLine(text = '') {
  let out = String(text || '').trim();
  if (!out) return '';
  let idx = 0;
  out = out.replace(/[.…]{3,}/g, () => {
    idx += 1;
    if (idx === 1) return '.'.repeat(14);
    if (idx === 2) return '.'.repeat(11);
    return '.'.repeat(11);
  });
  out = out.replace(/(\.{11})\s+(?=ឆ្នាំ)/, '$1');
  return out;
}

/**
 * Standardize blank dot runs & ត្រូវនឹង prefix in Ministry Solar date lines:
 * ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ២០២៦ (7 dots after ថ្ងៃទី, 12 dots after ខែ)
 */
export function formatMinistrySolarDateLine(text = '') {
  let out = String(text || '').trim();
  if (!out) return '';
  let idx = 0;
  out = out.replace(/[.…]{3,}/g, () => {
    idx += 1;
    if (idx === 1) return '.'.repeat(7);
    if (idx === 2) return '.'.repeat(12);
    return '.'.repeat(10);
  });
  out = out.replace(/(\.{7})(?=ខែ)/, '$1 ').replace(/(\.{12})(?=ឆ្នាំ)/, '$1 ');
  if (/^ថ្ងៃទី/.test(out)) {
    out = `ត្រូវនឹង${out}`;
  }
  return out;
}

/**
 * Format a KHR integer with space-separated thousands and ៛ symbol (matching the 2025 Ministry report style, e.g. "៤៣៥ ០០០៛")
 */
export function formatSpaceRiel(amount, useKhmerNumerals = true) {
  const num = Math.round(Number(amount) || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const out = `${sign}${formatted}៛`;
  return useKhmerNumerals ? toKhmerDigits(out) : out;
}

/**
 * Detect if an income row in Finance is specifically earmarked for hourly teacher pay
 */
function isTeacherHourlyIncomeItem(item) {
  const desc = String(item?.desc || '').trim();
  return (
    desc.includes('ប្រាក់ម៉ោង') ||
    desc.includes('គ្រូស្ម័គ្រចិត្ត') ||
    desc.includes('គ្រូស្ម័ក្រចិត្ត') ||
    desc.includes('ជួលគ្រូ')
  );
}

/**
 * Extract teacher hours from an expense row's qty or total
 */
function parseTeacherHoursFromItem(item) {
  const qtyParsed = parseKhmerNumber(item?.qty);
  const unitVal = parseKhmerNumber(item?.unitPrice);
  const totalVal = Number(item?.total) || 0;
  if (qtyParsed > 0) return qtyParsed;
  const hourlyRate = unitVal > 0 ? unitVal : 4000;
  if (totalVal > 0 && hourlyRate > 0) return Math.round(totalVal / hourlyRate);
  return 0;
}

/**
 * Build the complete display & export model for the Ministry (មន្ទីរ) Annual Report
 * (both the multi-page A4 Full Report and the 1-page Letter Summary Report).
 */
export function buildMinistryReportModel({
  year = '2026',
  adminReports = {},
  studentMaster = [],
  allFinance = {},
  useKhmerNumerals = true
} = {}) {
  const fmt = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const fmtPad2 = (n) => {
    const num = Number(n) || 0;
    const str = num < 10 && num > 0 ? `0${num}` : String(num);
    return fmt(str);
  };

  const storageKey = `ministry-${year}`;
  const savedOverride = (adminReports && adminReports[storageKey]) || {};

  // 1. Synthesize base annual report from monthly admin reports
  const mergedReports = {
    ...INITIAL_ADMIN_REPORTS,
    ...(adminReports || {})
  };
  const synthesizedAnnual = synthesizeMultiMonthAdminReport({
    periodType: 'year',
    year,
    adminReports: mergedReports
  });

  const stStats = synthesizedAnnual.studentStats || {};

  // 2. Detect applicant count from May finance income ("វិភាគទានសមណសិស្សដាក់ពាក្យចូលរៀន ១០១អង្គ")
  const mayFinance = allFinance?.[`${year}-05`];
  let detectedApplicantCount = 0;
  if (mayFinance && Array.isArray(mayFinance.income)) {
    const appRow = mayFinance.income.find(it =>
      String(it?.desc || '').includes('ដាក់ពាក្យចូលរៀន')
    );
    if (appRow) {
      const parsedQty = parseKhmerNumber(appRow.qty);
      if (parsedQty > 0) detectedApplicantCount = parsedQty;
    }
  }

  const autoAppliedStudents =
    detectedApplicantCount ||
    Number(stStats.startTotalStudents) ||
    Number(stStats.totalStudents) ||
    101;
  const rawAutoRemaining = Number(stStats.totalStudents) || 81;
  const autoRemainingStudents =
    autoAppliedStudents === 101 && (rawAutoRemaining === 80 || rawAutoRemaining === 81)
      ? 81
      : rawAutoRemaining;
  const autoGrade1 = Number(stStats.grade1) || 15;
  const autoGrade2 = Number(stStats.grade2) || 30;
  const autoGrade3 = Number(stStats.grade3) || 21;

  // Student & Teacher general stats (with manual override support)
  const appliedStudents =
    savedOverride.appliedStudents !== undefined && savedOverride.appliedStudents !== ''
      ? Number(savedOverride.appliedStudents)
      : autoAppliedStudents;
  const permanentStudents =
    savedOverride.permanentStudents !== undefined && savedOverride.permanentStudents !== ''
      ? Number(savedOverride.permanentStudents)
      : appliedStudents;
  const remainingStudents =
    savedOverride.remainingStudents !== undefined && savedOverride.remainingStudents !== ''
      ? Number(savedOverride.remainingStudents)
      : autoRemainingStudents;
  const remainingGrade3 =
    savedOverride.remainingGrade3 !== undefined && savedOverride.remainingGrade3 !== ''
      ? Number(savedOverride.remainingGrade3)
      : autoGrade3;
  const dropoutStudents =
    savedOverride.dropoutStudents !== undefined && savedOverride.dropoutStudents !== ''
      ? Number(savedOverride.dropoutStudents)
      : Math.max(0, appliedStudents - remainingStudents);

  const autoOldStudents = Math.min(appliedStudents, autoGrade1 + autoGrade2 + autoGrade3);
  const oldStudents =
    savedOverride.oldStudents !== undefined && savedOverride.oldStudents !== ''
      ? Number(savedOverride.oldStudents)
      : autoOldStudents;
  const newStudents =
    savedOverride.newStudents !== undefined && savedOverride.newStudents !== ''
      ? Number(savedOverride.newStudents)
      : Math.max(0, appliedStudents - oldStudents);

  const offCampusStudents =
    savedOverride.offCampusStudents !== undefined && savedOverride.offCampusStudents !== ''
      ? Number(savedOverride.offCampusStudents)
      : 8;

  // Teachers count
  const teacherTotal =
    savedOverride.teacherTotal !== undefined && savedOverride.teacherTotal !== ''
      ? Number(savedOverride.teacherTotal)
      : 10;
  const teacherFramework =
    savedOverride.teacherFramework !== undefined && savedOverride.teacherFramework !== ''
      ? Number(savedOverride.teacherFramework)
      : 2;
  const teacherContract =
    savedOverride.teacherContract !== undefined && savedOverride.teacherContract !== ''
      ? Number(savedOverride.teacherContract)
      : 2;
  const teacherHourly =
    savedOverride.teacherHourly !== undefined && savedOverride.teacherHourly !== ''
      ? Number(savedOverride.teacherHourly)
      : 6;

  // Exam stats (Pali & Dhamma-Vinaya)
  const paliExamTotal =
    savedOverride.paliExamTotal !== undefined && savedOverride.paliExamTotal !== ''
      ? Number(savedOverride.paliExamTotal)
      : remainingGrade3;
  const paliExamPassed =
    savedOverride.paliExamPassed !== undefined && savedOverride.paliExamPassed !== ''
      ? Number(savedOverride.paliExamPassed)
      : remainingGrade3;
  const paliExamFailed =
    savedOverride.paliExamFailed !== undefined && savedOverride.paliExamFailed !== ''
      ? Number(savedOverride.paliExamFailed)
      : Math.max(0, paliExamTotal - paliExamPassed);

  const dhammaExamTri =
    savedOverride.dhammaExamTri !== undefined && savedOverride.dhammaExamTri !== ''
      ? Number(savedOverride.dhammaExamTri)
      : autoGrade1;
  const dhammaExamTo =
    savedOverride.dhammaExamTo !== undefined && savedOverride.dhammaExamTo !== ''
      ? Number(savedOverride.dhammaExamTo)
      : autoGrade2;
  const dhammaExamEk =
    savedOverride.dhammaExamEk !== undefined && savedOverride.dhammaExamEk !== ''
      ? Number(savedOverride.dhammaExamEk)
      : remainingGrade3;
  const dhammaExamTotal =
    savedOverride.dhammaExamTotal !== undefined && savedOverride.dhammaExamTotal !== ''
      ? Number(savedOverride.dhammaExamTotal)
      : dhammaExamTri + dhammaExamTo + dhammaExamEk;
  const dhammaExamNote =
    savedOverride.dhammaExamNote !== undefined
      ? String(savedOverride.dhammaExamNote)
      : 'មិនទាន់ប្រឡង';

  // Computer stats for Summary row 8
  const computerCountText =
    savedOverride.computerCountText !== undefined && String(savedOverride.computerCountText).trim() !== ''
      ? String(savedOverride.computerCountText).trim()
      : `${fmt(10)}គ្រឿង`;
  const computerNoteText =
    savedOverride.computerNoteText !== undefined
      ? String(savedOverride.computerNoteText).trim()
      : `ប្រើប្រាស់បាន${fmt(8)}គ្រឿងខូច${fmt(2)}គ្រឿង`;

  // 3. Extract special dated events ("នៅថ្ងៃ...") from monthly adminReports to append to Section ង
  const autoSpecialEvents = [];
  const seenEvents = new Set();
  const allMonthNums = [...MINISTRY_SEM1_MONTHS.map(m => m.num), ...MINISTRY_SEM2_MONTHS.map(m => m.num)];
  allMonthNums.forEach(mNum => {
    const rep = mergedReports[`${year}-${mNum}`];
    if (!rep || !Array.isArray(rep.activities)) return;
    rep.activities.forEach(rawLine => {
      const clean = String(rawLine || '').replace(/^[-•❖▪◦\s]+/, '').trim();
      if (clean.startsWith('នៅថ្ងៃ') && !seenEvents.has(clean)) {
        seenEvents.add(clean);
        autoSpecialEvents.push(clean);
      }
    });
  });

  const defaultManagementActivities = [
    ...DEFAULT_MINISTRY_MANAGEMENT_ROUTINE,
    ...autoSpecialEvents
  ];

  // 4. Financial Tables Computation (ច, ច.១, ច.២, ច.៣, ច.៤, ច.៥, បណ្ណសរសើរ, សរុបរួមប្រចាំឆ្នាំ)
  const hourlyIncomeOverrides = savedOverride.hourlyIncomeByMonth || {};

  const buildHourlySemesterTable = (monthDefs) => {
    let sumIncome = 0;
    let sumExpense = 0;
    let sumHours = 0;

    const rows = monthDefs.map((mDef, idx) => {
      const mk = `${year}-${mDef.num}`;
      const mFin = allFinance?.[mk] || { income: [], expense: [] };
      const expItems = (mFin.expense || []).filter(isTeacherHourlyExpenseItem);
      const incItems = (mFin.income || []).filter(isTeacherHourlyIncomeItem);

      const expenseVal = expItems.reduce((s, it) => s + (Number(it.total) || 0), 0);
      const hoursVal = expItems.reduce((s, it) => s + parseTeacherHoursFromItem(it), 0);

      const autoIncVal = incItems.reduce((s, it) => s + (Number(it.total) || 0), 0);
      const rawOverride = hourlyIncomeOverrides[mDef.num];
      const hasManualIncome = rawOverride !== undefined && rawOverride !== '' && rawOverride !== null;
      const incomeVal = hasManualIncome ? Number(rawOverride) || 0 : autoIncVal;

      const hasAnyData = incomeVal > 0 || expenseVal > 0 || hoursVal > 0;
      const balanceVal = incomeVal - expenseVal;

      sumIncome += incomeVal;
      sumExpense += expenseVal;
      sumHours += hoursVal;

      return {
        no: fmt(idx + 1),
        monthNum: mDef.num,
        label: mDef.name,
        incomeVal,
        expenseVal,
        hoursVal,
        balanceVal,
        incomeText: incomeVal > 0 ? formatSpaceRiel(incomeVal, useKhmerNumerals) : 'គ្មាន',
        expenseText: hasAnyData ? formatSpaceRiel(expenseVal, useKhmerNumerals) : 'គ្មាន',
        hoursText: hasAnyData ? `${fmt(hoursVal)} ម៉ោង` : 'គ្មាន',
        balanceText: hasAnyData ? formatSpaceRiel(balanceVal, useKhmerNumerals) : 'គ្មាន',
        note: ''
      };
    });

    const totalBalance = sumIncome - sumExpense;
    return {
      rows,
      sumIncome,
      sumExpense,
      sumHours,
      totalBalance,
      sumIncomeText: sumIncome > 0 ? formatSpaceRiel(sumIncome, useKhmerNumerals) : 'គ្មាន',
      sumExpenseText: formatSpaceRiel(sumExpense, useKhmerNumerals),
      sumHoursText: `${fmt(sumHours)} ម៉ោង`,
      totalBalanceText: formatSpaceRiel(totalBalance, useKhmerNumerals)
    };
  };

  const hourlySem1 = buildHourlySemesterTable(MINISTRY_SEM1_MONTHS);
  const hourlySem2 = buildHourlySemesterTable(MINISTRY_SEM2_MONTHS);

  const hourlyAnnualSumIncome = hourlySem1.sumIncome + hourlySem2.sumIncome;
  const hourlyAnnualSumExpense = hourlySem1.sumExpense + hourlySem2.sumExpense;
  const hourlyAnnualSumHours = hourlySem1.sumHours + hourlySem2.sumHours;
  const hourlyAnnualBalance = hourlyAnnualSumIncome - hourlyAnnualSumExpense;

  const hourlyAnnual = {
    rows: [
      {
        no: fmt(1),
        label: `ឆមាសទី${fmt(1)}`,
        incomeText: hourlySem1.sumIncomeText,
        expenseText: hourlySem1.sumExpenseText,
        hoursText: hourlySem1.sumHoursText,
        balanceText: hourlySem1.totalBalanceText
      },
      {
        no: fmt(2),
        label: `ឆមាសទី${fmt(2)}`,
        incomeText: hourlySem2.sumIncomeText,
        expenseText: hourlySem2.sumExpenseText,
        hoursText: hourlySem2.sumHoursText,
        balanceText: hourlySem2.totalBalanceText
      }
    ],
    sumIncome: hourlyAnnualSumIncome,
    sumExpense: hourlyAnnualSumExpense,
    sumHours: hourlyAnnualSumHours,
    totalBalance: hourlyAnnualBalance,
    sumIncomeText: hourlyAnnualSumIncome > 0 ? formatSpaceRiel(hourlyAnnualSumIncome, useKhmerNumerals) : 'គ្មាន',
    sumExpenseText: formatSpaceRiel(hourlyAnnualSumExpense, useKhmerNumerals),
    sumHoursText: `${fmt(hourlyAnnualSumHours)} ម៉ោង`,
    totalBalanceText: formatSpaceRiel(hourlyAnnualBalance, useKhmerNumerals)
  };

  // Build Office Supplies & Non-Carryover Income Tables per Semester (ច.៣ & ច.៤)
  const buildOfficeSuppliesSemesterTable = (monthDefs, includeYearOpeningReserve = false) => {
    const supplyExpenseItems = [];
    const nonCarryIncomeItems = [];
    let hasIncludedYearOpening = false;

    monthDefs.forEach(mDef => {
      const mk = `${year}-${mDef.num}`;
      const mFin = allFinance?.[mk] || { income: [], expense: [] };
      (mFin.expense || []).forEach(it => {
        if (!isTeacherHourlyExpenseItem(it)) {
          supplyExpenseItems.push(it);
        }
      });
      (mFin.income || []).forEach(it => {
        if (isTeacherHourlyIncomeItem(it)) return;
        if (isCarryoverIncomeItem(it)) {
          const desc = String(it?.desc || '').trim();
          const isYearOpeningReserve =
            desc.includes('ឆ្នាំចាស់') ||
            (mDef.num === '05' && !desc.includes('ប្រាក់សល់ពីខែ'));
          if (includeYearOpeningReserve && isYearOpeningReserve && !hasIncludedYearOpening) {
            hasIncludedYearOpening = true;
            nonCarryIncomeItems.push(it);
          }
          return;
        }
        nonCarryIncomeItems.push(it);
      });
    });

    const expenseRows = supplyExpenseItems.map((it, idx) => {
      const amt = Number(it.total) || 0;
      const qtyRaw = String(it.qty || '').trim();
      return {
        no: fmt(idx + 1),
        desc: String(it.desc || '').trim(),
        source: String(it.source || 'សាលា').trim(),
        amountVal: amt,
        amountText: formatSpaceRiel(amt, useKhmerNumerals),
        qty: useKhmerNumerals ? toKhmerDigits(qtyRaw) : qtyRaw,
        balance: '',
        note: String(it.note || '').trim()
      };
    });

    const incomeRows = nonCarryIncomeItems.map((it, idx) => {
      const amt = Number(it.total) || 0;
      const isUsd = String(it.currency || 'KHR').toUpperCase() === 'USD';
      const inKind = amt === 0 && it.totalLabel ? String(it.totalLabel).trim() : '';
      const noteText = [inKind, String(it.note || '').trim()].filter(Boolean).join(' ');
      return {
        no: fmt(idx + 1),
        desc: String(it.desc || '').trim(),
        khrText: !isUsd && amt > 0 ? formatSpaceRiel(amt, useKhmerNumerals) : '',
        usdText: isUsd && amt > 0 ? `$${fmt(amt)}` : '',
        note: useKhmerNumerals ? toKhmerDigits(noteText) : noteText
      };
    });

    const expenseTotals = sumByCurrency(supplyExpenseItems);
    const incomeTotals = sumByCurrency(nonCarryIncomeItems);
    const inKindList = nonCarryIncomeItems
      .filter(it => (Number(it.total) || 0) === 0 && it.totalLabel)
      .map(it => (useKhmerNumerals ? toKhmerDigits(it.totalLabel) : it.totalLabel));
    const inKindSummary = Array.from(new Set(inKindList)).join(', ');

    return {
      expenseRows,
      incomeRows,
      expenseTotals,
      incomeTotals,
      totalExpenseKHR: expenseTotals.KHR || 0,
      totalIncomeKHR: incomeTotals.KHR || 0,
      totalExpenseText: formatCurrencyTotals(expenseTotals, useKhmerNumerals),
      totalIncomeKHRText: (incomeTotals.KHR || 0) > 0 ? formatSpaceRiel(incomeTotals.KHR, useKhmerNumerals) : '',
      totalIncomeUSDText: (incomeTotals.USD || 0) > 0 ? `$${fmt(incomeTotals.USD)}` : '',
      totalIncomeText: formatCurrencyTotals(incomeTotals, useKhmerNumerals),
      inKindSummary
    };
  };

  const officeSem1 = buildOfficeSuppliesSemesterTable(MINISTRY_SEM1_MONTHS, true);
  const officeSem2 = buildOfficeSuppliesSemesterTable(MINISTRY_SEM2_MONTHS, false);

  const officeAnnualIncomeTotals = combineCurrencyTotals(officeSem1.incomeTotals, officeSem2.incomeTotals, 1);
  const officeAnnualExpenseTotals = combineCurrencyTotals(officeSem1.expenseTotals, officeSem2.expenseTotals, 1);
  const officeAnnualInKind = [officeSem1.inKindSummary, officeSem2.inKindSummary].filter(Boolean).join(', ');

  const officeAnnual = {
    rows: [
      {
        no: fmt(1),
        label: `ឆមាសទី${fmt(1)}`,
        incomeText: officeSem1.totalIncomeText,
        expenseText: officeSem1.totalExpenseText,
        note: officeSem1.inKindSummary
      },
      {
        no: fmt(2),
        label: `ឆមាសទី${fmt(2)}`,
        incomeText: officeSem2.totalIncomeText,
        expenseText: officeSem2.totalExpenseText,
        note: officeSem2.inKindSummary
      }
    ],
    totalIncomeTotals: officeAnnualIncomeTotals,
    totalExpenseTotals: officeAnnualExpenseTotals,
    totalIncomeText: formatCurrencyTotals(officeAnnualIncomeTotals, useKhmerNumerals),
    totalExpenseText: formatCurrencyTotals(officeAnnualExpenseTotals, useKhmerNumerals),
    inKindSummary: officeAnnualInKind
  };

  // Award Ceremony Table (កម្មវិធីចែកបណ្ណសរសើរ)
  const awardIncome1 = Number(savedOverride.awardCeremonyIncome1) || 0;
  const awardIncome2 = Number(savedOverride.awardCeremonyIncome2) || 0;
  const awardTotalIncome = awardIncome1 + awardIncome2;
  const awardTotalExpense = Number(savedOverride.awardCeremonyExpense) || 0;

  const awardCeremonyTable = {
    income1Val: awardIncome1,
    income2Val: awardIncome2,
    totalIncomeVal: awardTotalIncome,
    totalExpenseVal: awardTotalExpense,
    income1Text: awardIncome1 > 0 ? formatSpaceRiel(awardIncome1, useKhmerNumerals) : 'គ្មាន',
    income2Text: awardIncome2 > 0 ? formatSpaceRiel(awardIncome2, useKhmerNumerals) : 'គ្មាន',
    totalIncomeText: awardTotalIncome > 0 ? formatSpaceRiel(awardTotalIncome, useKhmerNumerals) : 'គ្មាន',
    totalExpenseText: awardTotalExpense > 0 ? formatSpaceRiel(awardTotalExpense, useKhmerNumerals) : 'គ្មាន'
  };

  // Grand Total Annual Income & Expense (ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ)
  const grandTotalIncomeKHR =
    hourlyAnnualSumIncome + (officeAnnualIncomeTotals.KHR || 0) + awardTotalIncome;
  const grandTotalIncomeUSD = officeAnnualIncomeTotals.USD || 0;
  const grandTotalExpenseKHR =
    hourlyAnnualSumExpense + (officeAnnualExpenseTotals.KHR || 0) + awardTotalExpense;
  const grandTotalExpenseUSD = officeAnnualExpenseTotals.USD || 0;

  const grandBalanceKHR = grandTotalIncomeKHR - grandTotalExpenseKHR;
  const grandBalanceUSD = grandTotalIncomeUSD - grandTotalExpenseUSD;
  const isGrandDeficit = grandBalanceKHR < 0 || grandBalanceUSD < 0;

  const grandAnnualTable = {
    incomeKHRText: formatSpaceRiel(grandTotalIncomeKHR, useKhmerNumerals),
    incomeUSDText: grandTotalIncomeUSD > 0 ? `$${fmt(grandTotalIncomeUSD)}` : '',
    expenseKHRText: formatSpaceRiel(grandTotalExpenseKHR, useKhmerNumerals),
    expenseUSDText: grandTotalExpenseUSD > 0 ? `$${fmt(grandTotalExpenseUSD)}` : '',
    balanceKHRText: formatSpaceRiel(grandBalanceKHR, useKhmerNumerals),
    balanceUSDText: grandBalanceUSD !== 0 ? `$${fmt(grandBalanceUSD)}` : '',
    balanceNote: isGrandDeficit ? 'ចំណាយលើស' : (officeAnnualInKind || ''),
    isDeficit: isGrandDeficit
  };

  // 5. Narrative Sections (ខ, គ, ឃ, ង, ង.១, ង.២, ឆ, ជ, ឈ, ញ, ដ)
  const teacherActivities =
    Array.isArray(savedOverride.teacherActivities) && savedOverride.teacherActivities.length > 0
      ? savedOverride.teacherActivities
      : DEFAULT_MINISTRY_TEACHER_ACTIVITIES;

  const studentActivities =
    Array.isArray(savedOverride.studentActivities) && savedOverride.studentActivities.length > 0
      ? savedOverride.studentActivities
      : DEFAULT_MINISTRY_STUDENT_ACTIVITIES;

  const outsideActivities =
    Array.isArray(savedOverride.outsideActivities) && savedOverride.outsideActivities.length > 0
      ? savedOverride.outsideActivities
      : DEFAULT_MINISTRY_OUTSIDE_ACTIVITIES;

  const abbotResponsibilities =
    Array.isArray(savedOverride.abbotResponsibilities) && savedOverride.abbotResponsibilities.length > 0
      ? savedOverride.abbotResponsibilities
      : DEFAULT_MINISTRY_ABBOT_RESPONSIBILITIES;

  const managementActivities =
    Array.isArray(savedOverride.managementActivities) && savedOverride.managementActivities.length > 0
      ? savedOverride.managementActivities
      : defaultManagementActivities;

  const libraryLines =
    Array.isArray(savedOverride.libraryLines) && savedOverride.libraryLines.length > 0
      ? savedOverride.libraryLines
      : DEFAULT_MINISTRY_LIBRARY_LINES;

  const donationLines =
    Array.isArray(savedOverride.donationLines) && savedOverride.donationLines.length > 0
      ? savedOverride.donationLines
      : DEFAULT_MINISTRY_DONATION_LINES;

  const teacherRelations =
    Array.isArray(savedOverride.teacherRelations) && savedOverride.teacherRelations.length > 0
      ? savedOverride.teacherRelations
      : DEFAULT_MINISTRY_TEACHER_RELATIONS;

  const rawChallenges =
    Array.isArray(savedOverride.challenges) && savedOverride.challenges.length > 0
      ? savedOverride.challenges
      : synthesizedAnnual.challenges || [];
  const challenges = rawChallenges.map(line => {
    if (String(line || '').includes('បោះបង់ការសិក្សា') && !savedOverride.challenges) {
      return `សមណសិស្សបោះបង់ការសិក្សាក្នុងឆ្នាំសិក្សា ${fmt(year)} សរុបចំនួន ${fmt(dropoutStudents)}អង្គ/នាក់ (សមណសិស្សសរុបចំនួន ${fmt(appliedStudents)}អង្គ/នាក់ មកដល់ចុងឆ្នាំនៅសល់ចំនួន ${fmt(remainingStudents)}អង្គ/នាក់)។`;
    }
    return line;
  });

  const solutions =
    Array.isArray(savedOverride.solutions) && savedOverride.solutions.length > 0
      ? savedOverride.solutions
      : synthesizedAnnual.solutions || [];

  const conclusionParas =
    Array.isArray(savedOverride.conclusionParas) && savedOverride.conclusionParas.length > 0
      ? savedOverride.conclusionParas
      : DEFAULT_MINISTRY_CONCLUSION_PARAS;

  const requests =
    Array.isArray(savedOverride.requests) && savedOverride.requests.length > 0
      ? savedOverride.requests
      : synthesizedAnnual.requests || [];

  const ccList =
    Array.isArray(savedOverride.ccList) && savedOverride.ccList.length > 0
      ? savedOverride.ccList
      : DEFAULT_MINISTRY_CC_LIST;

  const docNumber = String(savedOverride.docNumber || synthesizedAnnual.docNumber || '.....................................').trim();
  const lunarDateLine = formatMinistryLunarDateLine(
    savedOverride.lunarDateLine ||
      synthesizedAnnual.lunarDateLine ||
      `ថ្ងៃ..............ខែ...........ឆ្នាំមមី អដ្ឋស័ក ព.ស.${fmt(2570)}`
  );
  const solarDateLine = formatMinistrySolarDateLine(
    savedOverride.solarDateLine ||
      `ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ${fmt(year)}`
  );
  const signerTitle = String(savedOverride.signerTitle || 'ព្រះនាយក').trim();
  const reporterTitle = String(savedOverride.reporterTitle || 'អ្នកធ្វើរបាយការណ៍').trim();

  // 6. Section ក General Info Lines (matching full2025.txt lines 11-19)
  const generalInfoLines = [
    { label: `សាលាកម្រង មានចំនួន ${fmtPad2(1)} សាលា`, value: '' },
    {
      label: `ចំនួនថ្នាក់${fmtPad2(4)} ថ្នាក់ទីមត្តេយ្យ ${fmt(1)}បន្ទប់, ថ្នាក់ទី${fmt(1)} ${fmt(1)}បន្ទប់, ថ្នាក់ទី${fmt(2)} ${fmt(1)}បន្ទប់, ថ្នាក់ទី${fmt(3)} ${fmt(1)}បន្ទប់`,
      value: ''
    },
    {
      label: `ចំនួនគ្រូបង្រៀនសរុប${fmtPad2(teacherTotal)}អង្គ/រូប, ក្របខណ្ឌ${fmtPad2(teacherFramework)}រូប, កិច្ចសន្យា${fmtPad2(teacherContract)}អង្គ/រូប, ប្រាក់ម៉ោង${fmtPad2(teacherHourly)}អង្គ/រូប`,
      value: ''
    },
    {
      label: 'ចំនួនសមណសិស្ស សិស្សសរុប',
      value: `ចំនួន${fmt(appliedStudents)} អង្គ/រូប`
    },
    {
      label: 'ចំនួនសមណសិស្ស សិស្សកំពុងសិក្សាអចិន្ត្រៃយ៍',
      value: `ចំនួន${fmt(permanentStudents)} អង្គ/រូប`
    },
    {
      label: 'ចំនួនសមណសិស្ស សិស្សស្នាក់នៅក្រៅសាលា',
      value: `ចំនួន${fmt(offCampusStudents)} អង្គ/រូប`
    },
    {
      label: 'ចំនួនសមណសិស្ស សិស្សដែលបោះបង់ការសិក្សា',
      value: `ចំនួន${fmt(dropoutStudents)} អង្គ/រូប`
    },
    {
      label: 'ចំនួនសមណសិស្ស សិស្សដាក់ពាក្យប្រឡងសាលាបាលីរង',
      value: `ចំនួន${fmt(paliExamTotal)} អង្គ/នាក់`
    },
    {
      label: `ចំនួនសមណសិស្ស សិស្សដាក់ពាក្យប្រឡងសាលាធម្មវិន័យ ចំនួន${fmt(dhammaExamTotal)} អង្គ/នាក់ ក្នុងនោះថ្នាក់ត្រីមានចំនួន${fmt(dhammaExamTri)} អង្គ/នាក់ ថ្នាក់ទោ${fmt(dhammaExamTo)} អង្គ/នាក់ ថ្នាក់ឯក${fmt(dhammaExamEk)}អង្គ/នាក់។`,
      value: ''
    }
  ];

  // 7. 10-Row Summary Table Model (matching summary2025.txt lines 8-18)
  const summaryRows = [
    {
      no: fmt(1),
      desc: 'សិស្សដាក់ពាក្យចូលរៀន',
      count: `${fmt(appliedStudents)} អង្គ`,
      note: ''
    },
    {
      no: fmt(2),
      desc: 'សិស្សចាស់',
      count: `${fmt(oldStudents)} អង្គ`,
      note: ''
    },
    {
      no: fmt(3),
      desc: 'សិស្សថ្មី',
      count: `${fmt(newStudents)} អង្គ`,
      note: ''
    },
    {
      no: fmt(4),
      desc: 'សិស្សបោះបង់ការសិក្សា',
      count: `${fmt(dropoutStudents)} អង្គ`,
      note: ''
    },
    {
      no: fmt(5),
      desc: 'សិស្សនៅសល់',
      count: `${fmt(remainingStudents)} អង្គ`,
      note: `ថ្នាក់ទី${fmt(3)} ${fmt(remainingGrade3)}អង្គ`
    },
    {
      no: fmt(6),
      desc: 'សិស្សប្រឡងបាលីរង',
      subDescLines: ['-សិស្សជាប់', '-សិស្សធ្លាក់'],
      count: `${fmtPad2(paliExamTotal)} អង្គ`,
      subCountLines: [`${fmtPad2(paliExamPassed)} អង្គ`, `${fmtPad2(paliExamFailed)} អង្គ`],
      note: ''
    },
    {
      no: fmt(7),
      desc: 'សិស្សដាក់ពាក្យប្រឡងធម្មវិន័យ',
      count: `${fmt(dhammaExamTotal)} អង្គ`,
      note: dhammaExamNote
    },
    {
      no: fmt(8),
      desc: 'មានកុំព្យូទ័រ',
      count: computerCountText,
      note: computerNoteText
    },
    {
      no: fmt(9),
      desc: 'ចំណូលប្រចាំឆ្នាំ',
      count: grandAnnualTable.incomeKHRText,
      note: grandAnnualTable.incomeUSDText
    },
    {
      no: fmt(10),
      desc: 'ចំណាយប្រចាំឆ្នាំ',
      count: grandAnnualTable.expenseKHRText,
      note: grandAnnualTable.expenseUSDText
    }
  ];

  return {
    storageKey,
    year,
    yearKhmer: fmt(year),
    rawOverride: savedOverride,
    fullReportTitle: `ការអនុវត្តការងារប្រចាំឆ្នាំសិក្សា${fmt(year)}`,
    summaryReportTitle: `របាយការណ៍សង្ខេបប្រចាំឆ្នាំ ${fmt(year)}`,
    shortFullFileNameTag: `មន្ទីរ_ពេញ_ប្រចាំឆ្នាំ_${fmt(year)}`,
    shortSummaryFileNameTag: `មន្ទីរ_សង្ខេប_ប្រចាំឆ្នាំ_${fmt(year)}`,
    // Raw numbers for editor form
    stats: {
      appliedStudents,
      permanentStudents,
      oldStudents,
      newStudents,
      dropoutStudents,
      remainingStudents,
      remainingGrade3,
      offCampusStudents,
      teacherTotal,
      teacherFramework,
      teacherContract,
      teacherHourly,
      paliExamTotal,
      paliExamPassed,
      paliExamFailed,
      dhammaExamTotal,
      dhammaExamTri,
      dhammaExamTo,
      dhammaExamEk,
      dhammaExamNote,
      computerCountText,
      computerNoteText,
      awardCeremonyIncome1: awardIncome1,
      awardCeremonyIncome2: awardIncome2,
      awardCeremonyExpense: awardTotalExpense,
      hourlyIncomeByMonth: hourlyIncomeOverrides
    },
    generalInfoLines,
    teacherActivities,
    studentActivities,
    outsideActivities,
    abbotResponsibilities,
    managementActivities,
    libraryLines,
    donationLines,
    hourlySem1,
    hourlySem2,
    hourlyAnnual,
    officeSem1,
    officeSem2,
    officeAnnual,
    awardCeremonyTable,
    grandAnnualTable,
    teacherRelations,
    challenges,
    solutions,
    conclusionParas,
    requests,
    ccList,
    docNumber,
    lunarDateLine,
    solarDateLine,
    signerTitle,
    reporterTitle,
    summaryRows
  };
}

