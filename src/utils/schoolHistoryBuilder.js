// School History (ប្រវត្តិសាលាពុទ្ធិកសិក្សាកម្រង ហ៊ុន ណេង) Builder & Single Source of Truth
// Shared across Standalone School History Document AND Semester 1 Combined Report (PC & Mobile /mp)
import { toKhmerDigits, toEnglishDigits } from './khmerNumerals.js';

export const SCHOOL_HISTORY_STORAGE_KEY = 'school-history';

export const DEFAULT_SCHOOL_HISTORY_TITLE =
  'ប្រវត្តិសាលាពុទ្ធិកសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម';

export const DEFAULT_SCHOOL_HISTORY_BACKGROUND = [
  'សាលានេះត្រូវបានបង្កើតឡើងក្រោមគំនិតផ្ដួចផ្ដើមរបស់ព្រះនាគមុន្នី អន ធានអាន ព្រះមេគណខេត្តកំពង់ចាម និងលោក ស្រី សុភ័ក្ត្រ ប្រធានមន្ទីរធម្មការនិងសាសនាខេត្តកំពង់ចាម ព្រះគ្រូចៅអធិការ គណៈកម្មការទាំងពីរវត្តបានស្នើសុំនាមឈ្មោះឯកឧត្តម ហ៊ុន ណេង ដាក់ឈ្មោះថា «សាលាពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង» ក្រោមការចូលរួមឧបត្ថម្ភពីសំណាក់ឯកឧត្តម ហ៊ុន ណេង និងលោកជំទាវ ព្រមទាំងក្រុមគ្រួសារ។',
  'ត្រូវបានអនុញ្ញាតឱ្យបើកពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម (ព.ប.ហ.ណ) ទីតាំងដំបូងឡើយគឺស្ថិតនៅសង្កាត់វាលវង់ ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម សម្រាប់ឆ្នាំសិក្សា២០១២-២០១៣ ដែលបានបង្កើតឡើងដោយប្រកាសលេខ ២៦៨/១២ របស់ក្រសួងធម្មការនិងសាសនា ចុះថ្ងៃទី២២ ខែសីហា ឆ្នាំ២០១២ ដែលមានវត្តចំនួនពីរ គឺវត្តបទុមរតនៈ (ដីដុះ) បើកចំនួនពីរថ្នាក់ (ថ្នាក់ទី២, ទី៣) ចំណែកវត្តខេមវ័ន (បឹងស្នាយ) បើកមួយថ្នាក់ (ថ្នាក់ទី១)។ កាលនោះដឹកនាំដោយព្រះគ្រូ មាស ភន ជានាយក ព្រះគ្រូ ម៉ៅ ម៉ន ជានាយករងបច្ចេកទេស ភិក្ខុសីលសំវរោ សេខ ឧត្តមបញ្ញា ជានាយករងរដ្ឋបាល។ ក្រោយមកក្នុងអំឡុងឆ្នាំ២០១៤-២០១៥ ក៏មានការផ្លាស់ប្ដូរគណៈគ្រប់គ្រងជាថ្មី ដែលមានសមាសភាពភិក្ខុ គង់ វណ្ណា ជានាយក ភិក្ខុ វ៉ាន់ សុក ជានាយករងទទួលបន្ទុករដ្ឋបាល ភិក្ខុ ហូ លាងគ្រី ជានាយករងទទួលបន្ទុកបច្ចេកទេស ដោយមានប្រកាសលេខ ១៣២/២០១៨ របស់ក្រសួងធម្មការនិងសាសនា។ បន្តបន្ទាប់មកទៀតក្នុងអំឡុងឆ្នាំ២០២១ ក៏មានការផ្លាស់ប្ដូរក្រោយពីភិក្ខុ ហូ លាងគ្រី លាឈប់ពីការងារ ក៏មានការផ្លាស់ប្ដូរនាយករងបច្ចេកទេសជំនួសដោយភិក្ខុ ម៉េង ហ៊ល។ នៅចុងឆ្នាំ២០២៥ មានការផ្លាស់ប្ដូរម្ដងទៀតក្រោយពីព្រះរតនៈសីលវ័ន្ត គង់ វណ្ណា លាចាកសិក្ខាបទ បានលាឈប់ពីការងារ ទើបជ្រើសរើសបេក្ខភាពភិក្ខុ វ៉ាន់ សុក ជានាយក ភិក្ខុ អ៊ាន់ ឃ្លី ជានាយករងទទួលបន្ទុកផ្នែករដ្ឋបាល ដោយប្រកាសលេខ ០៧/២៦ ក.ធ.ស.ប្រក ចុះថ្ងៃទី៦ ខែមករា ឆ្នាំ២០២៦ ក្រោមការជ្រោមជ្រែងរបស់ព្រះធម្មសាលវង្ស សា វិរៈ ព្រះគ្រូចៅអធិការ ជាប្រធានក្រុមប្រឹក្សាសាលារហូតមក។'
];

export const DEFAULT_SCHOOL_HISTORY_TABLE_INTRO =
  'សាលាពុទ្ធិកបឋមសិក្សាផ្នែកពុទ្ធចក្រ សម្រាប់ព្រះសង្ឃ ដែលបួសក្នុងព្រះពុទ្ធសាសនា បានសិក្សារៀនសូត្រ។ សាលាបានបណ្ដុះបណ្ដាលធនធានមនុស្សក្នុងរយៈពេល១៦ឆ្នាំសម្រេចបានដូចខាងក្រោម៖';

export const DEFAULT_SCHOOL_HISTORY_ROWS = [
  { academicYear: '2011-2012', gradeKindergarten: 0, grade1: 10, grade2: 0, grade3: 0, note: '' },
  { academicYear: '2012-2013', gradeKindergarten: 0, grade1: 30, grade2: 0, grade3: 0, note: '' },
  { academicYear: '2013-2014', gradeKindergarten: 0, grade1: 30, grade2: 0, grade3: 0, note: '' },
  { academicYear: '2014-2015', gradeKindergarten: 0, grade1: 42, grade2: 20, grade3: 0, note: '' },
  { academicYear: '2015-2016', gradeKindergarten: 15, grade1: 28, grade2: 21, grade3: 0, note: '' },
  { academicYear: '2016-2017', gradeKindergarten: 23, grade1: 22, grade2: 21, grade3: 0, note: '' },
  { academicYear: '2017-2018', gradeKindergarten: 30, grade1: 30, grade2: 30, grade3: 0, note: '' },
  { academicYear: '2018-2019', gradeKindergarten: 23, grade1: 23, grade2: 23, grade3: 19, note: '' },
  { academicYear: '2019-2020', gradeKindergarten: 31, grade1: 50, grade2: 25, grade3: 0, note: '' },
  { academicYear: '2020-2021', gradeKindergarten: 23, grade1: 33, grade2: 25, grade3: 27, note: '' },
  { academicYear: '2021-2022', gradeKindergarten: 19, grade1: 15, grade2: 20, grade3: 11, note: '' },
  { academicYear: '2022-2023', gradeKindergarten: 28, grade1: 33, grade2: 36, grade3: 46, note: '' },
  { academicYear: '2023-2024', gradeKindergarten: 26, grade1: 38, grade2: 40, grade3: 29, note: '' },
  { academicYear: '2024-2025', gradeKindergarten: 28, grade1: 22, grade2: 34, grade3: 29, note: '' },
  { academicYear: '2025-2026', gradeKindergarten: 31, grade1: 36, grade2: 34, grade3: 25, note: '' },
  { academicYear: '2026-2027', gradeKindergarten: 21, grade1: 24, grade2: 32, grade3: 25, note: '' }
];

function parseCount(val) {
  const cleaned = toEnglishDigits(String(val ?? '')).replace(/[^\d]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatSpaceThousands(val) {
  const n = Math.max(0, Math.round(Number(val) || 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Build the complete formatted School History model with mathematically auto-summed
 * row totals and column grand totals.
 */
export function buildSchoolHistoryModel({
  adminReports = {},
  year = '2026',
  useKhmerNumerals = true
} = {}) {
  const fmt = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const saved = (adminReports && adminReports[SCHOOL_HISTORY_STORAGE_KEY]) || {};
  const yrKh = fmt(year || '2026');

  const title =
    saved.title !== undefined && String(saved.title).trim() !== ''
      ? String(saved.title).trim()
      : DEFAULT_SCHOOL_HISTORY_TITLE;

  const backgroundParagraphs =
    Array.isArray(saved.backgroundParagraphs) && saved.backgroundParagraphs.length > 0
      ? saved.backgroundParagraphs.map(p => String(p || '').trim()).filter(Boolean)
      : [...DEFAULT_SCHOOL_HISTORY_BACKGROUND];

  const tableIntro =
    saved.tableIntro !== undefined
      ? String(saved.tableIntro).trim()
      : DEFAULT_SCHOOL_HISTORY_TABLE_INTRO;

  const rawRows =
    Array.isArray(saved.rows) && saved.rows.length > 0
      ? saved.rows
      : DEFAULT_SCHOOL_HISTORY_ROWS;

  let totalKg = 0;
  let totalG1 = 0;
  let totalG2 = 0;
  let totalG3 = 0;
  let grandTotal = 0;

  const formatCellCount = (num) => (num > 0 ? `${fmt(num)}អង្គ` : fmt(0));

  const rows = rawRows.map((r, idx) => {
    const kg = parseCount(r?.gradeKindergarten);
    const g1 = parseCount(r?.grade1);
    const g2 = parseCount(r?.grade2);
    const g3 = parseCount(r?.grade3);
    const rowSum = kg + g1 + g2 + g3;

    totalKg += kg;
    totalG1 += g1;
    totalG2 += g2;
    totalG3 += g3;
    grandTotal += rowSum;

    const rawYearStr = String(r?.academicYear || '').trim();
    const displayYear = useKhmerNumerals !== false ? toKhmerDigits(rawYearStr) : toEnglishDigits(rawYearStr);

    return {
      index: idx + 1,
      no: fmt(idx + 1),
      academicYear: rawYearStr,
      academicYearDisplay: displayYear,
      gradeKindergarten: kg,
      grade1: g1,
      grade2: g2,
      grade3: g3,
      total: rowSum,
      kgText: formatCellCount(kg),
      g1Text: formatCellCount(g1),
      g2Text: formatCellCount(g2),
      g3Text: formatCellCount(g3),
      totalText: formatCellCount(rowSum),
      note: String(r?.note || '').trim()
    };
  });

  const yearCount = rows.length;
  const fmtGrouped = (n) => fmt(formatSpaceThousands(n));
  const totals = {
    label: `សរុបទាំង${fmt(yearCount)}ឆ្នាំ`,
    gradeKindergarten: totalKg,
    grade1: totalG1,
    grade2: totalG2,
    grade3: totalG3,
    grandTotal,
    kgText: `${fmtGrouped(totalKg)}អង្គ/នាក់`,
    g1Text: `${fmtGrouped(totalG1)}អង្គ/នាក់`,
    g2Text: `${fmtGrouped(totalG2)}អង្គ/នាក់`,
    g3Text: `${fmtGrouped(totalG3)}អង្គ/នាក់`,
    grandTotalText: `${fmtGrouped(grandTotal)}អង្គ/នាក់`
  };

  const lunarDateLine =
    saved.lunarDateLine !== undefined && String(saved.lunarDateLine).trim() !== ''
      ? String(saved.lunarDateLine).trim()
      : 'ថ្ងៃ……………………ខែ………………ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០';

  const solarDateLine =
    saved.solarDateLine !== undefined && String(saved.solarDateLine).trim() !== ''
      ? String(saved.solarDateLine).trim()
      : `ធ្វើនៅកំពង់ចាម ថ្ងៃទី………….ខែ…………….${yrKh}`;

  const signerTitle =
    saved.signerTitle !== undefined && String(saved.signerTitle).trim() !== ''
      ? String(saved.signerTitle).trim()
      : 'នាយកសាលា';

  return {
    storageKey: SCHOOL_HISTORY_STORAGE_KEY,
    hasCustomOverride: Boolean(adminReports && adminReports[SCHOOL_HISTORY_STORAGE_KEY]),
    rawSaved: saved,
    year: String(year || '2026'),
    yearKhmer: yrKh,
    title,
    backgroundParagraphs,
    tableIntro,
    rows,
    totals,
    lunarDateLine,
    solarDateLine,
    signerTitle,
    shortFileNameTag: `ប្រវត្តិសាលា_${yrKh}`
  };
}

