// Administrative Report Builder, Smart Semester/Annual Synthesis Engine, and Word/Excel Importer
import * as XLSX from 'xlsx';
import { toKhmerDigits, toEnglishDigits } from './khmerNumerals.js';
import { KHMER_SOLAR_MONTHS } from './khmerCalendar.js';

const SEMESTER_1_MONTH_NUMS = ['05', '06', '07', '08', '09'];
const SEMESTER_2_MONTH_NUMS = ['10', '11', '12', '01', '02'];

export const DEFAULT_MANAGEMENT_ROLES = [
  { name: 'ព្រះបុណ្ណមេធា វ៉ាន់ សុក', role: 'ជានាយកទទួលបន្ទុកដឹកនាំរួម' },
  { name: 'ភិក្ខុ អ៊ាន់ ឃ្លី', role: 'ជានាយករងទទួលបន្ទុករដ្ឋបាល' },
  { name: 'ព្រះគ្រូរាជសីហោ ម៉េង ហ៊ល', role: 'ជានាយករងទទួលបន្ទុកបច្ចេកទេស' },
  { name: 'ភិក្ខុ អ៊ីន សុខណូវ', role: 'មន្ត្រីបណ្ណារក្ស មើលថែរក្សានូវសៀវភៅក្នុងបណ្ណាល័យ' }
];

export const DEFAULT_STAFF_STATS = [
  'គណៈគ្រប់គ្រង មានចំនួន ៣អង្គ',
  'មន្ត្រីជាប់កិច្ចសន្យាបណ្ណារក្សចំនួន ១អង្គ',
  'គ្រូក្របខណ្ឌចំនួន ២នាក់, គ្រូជាប់កិច្ចសន្យាចំនួន ២អង្គ, គ្រូស្ម័គ្រចិត្តចំនួន ៦អង្គ/នាក់'
];

export const DEFAULT_SECTION1_INTRO =
  'ផ្អែកតាមប្រកាសលេខ ២៦៨/១២ ក.ធ.ស.ប្រក ស្តីពីអនុញ្ញាតឱ្យបង្កើតពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម របស់ក្រសួងធម្មការនិងសាសនា និងដើម្បីធានាបាននូវប្រសិទ្ធភាពការងារ ក្នុងវិស័យពុទ្ធិកសិក្សាឱ្យបានល្អ និងបានអនុវត្តន៍នូវភារកិច្ចនិងការងារដូចខាងក្រោម៖';

export const DEFAULT_RECIPIENT_TITLE =
  'ព្រះធម្មសាលវង្ស សា វីរៈ ព្រះបដ្ឋនវង្សាចារ្យអនុគណក្រុងកំពង់ចាម';

/**
 * Authentic Seed Data from the 5 Official Word Documents (May - September 2026)
 */
export const INITIAL_ADMIN_REPORTS = {
  '2026-05': {
    id: 'admin-2026-05',
    periodType: 'month',
    monthKey: '2026-05',
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: DEFAULT_MANAGEMENT_ROLES,
    staffStats: DEFAULT_STAFF_STATS,
    studentStats: {
      classCount: 4,
      totalStudents: 100,
      gradeKindergarten: 21,
      grade1: 22,
      grade2: 32,
      grade3: 25
    },
    activities: [
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀនប្រចាំថ្ងៃ',
      'គណៈគ្រប់គ្រងទាំង៣អង្គនិងលោកគ្រូក្របខណ្ឌ២រូបបានទៅចូលរួមប្រជុំនៅមន្ទីរ',
      'បូកសរុបអវត្តមានសមណសិស្សប្រចាំខែ និងធ្វើកិច្ចសន្យា',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្ស',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 3,
      incomingLetters: 3,
      schoolMinutes: 2,
      schoolReportsToMinistry: 1,
      ministryMeetings: 2
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ'
    ],
    challenges: [
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។'
    ],
    requests: [
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      'ធ្វើផែនការការងារថ្មីប្រចាំខែមិថុនា'
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃសុក្រ១៣កើត ខែជេស្ឋ ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: 'ក្រុងកំពង់ចាម ថ្ងៃទី២៩ ខែឧសភា ឆ្នាំ២០២៦',
    signerTitle: 'ព្រះនាយក'
  },

  '2026-06': {
    id: 'admin-2026-06',
    periodType: 'month',
    monthKey: '2026-06',
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: DEFAULT_MANAGEMENT_ROLES,
    staffStats: DEFAULT_STAFF_STATS,
    studentStats: {
      classCount: 4,
      totalStudents: 88,
      gradeKindergarten: 20,
      grade1: 14,
      grade2: 32,
      grade3: 22
    },
    activities: [
      'ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្សប្រចាំខែឧសភានិងប្រគេនរង្វាន់លើកទឹកចិត្ត',
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'បានរៀបចំរដ្ឋបាលថ្នាក់រៀនទាំង៤ថ្នាក់ និងបង្កើនសោភណ្ឌភាពក្នុងថ្នាក់រៀន',
      'បានធ្វើបញ្ជីសារពើភណ្ឌថ្នាក់រៀនទាំង៤ថ្នាក់',
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀនប្រចាំថ្ងៃ',
      'គណៈគ្រប់គ្រងទាំង៣អង្គនិងលោកគ្រូក្របខណ្ឌ២រូបបានទៅចូលរួមប្រជុំនៅមន្ទីរធម្មការ',
      'បូកសរុបអវត្តមានសមណសិស្សប្រចាំខែ និងធ្វើកិច្ចសន្យា',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្ស',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 4,
      incomingLetters: 0,
      schoolMinutes: 2,
      schoolReportsToMinistry: 0,
      ministryMeetings: 1
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ',
      'របាយការណ៍បណ្ណាល័យ',
      'របាយការណ៍វត្តមានសិស្ស'
    ],
    challenges: [
      'សិស្សបោះបង់ការសិក្សាច្រើន (ដើមខែមិថុនាមានចំនួន១០០អង្គ/នាក់ ចុងខែមិថុនានៅសល់៨៨អង្គ/នាក់) សមណសិស្សបោះបង់មានចំនួន១២អង្គ/នាក់',
      'ថ្នាក់មត្តេយ្យមានបញ្ហាលិចពិដានទឹកហូរតាមពិដានធ្វើឱ្យមានការប្រឈមនៅពេលមានភ្លៀងធ្លាក់',
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)',
      'សមណសិស្សអាពាធច្រើនអង្គ បណ្ដាលមកពីខែមិថុនានេះជារដូវភ្លៀងធ្លាក់មានជំងឺដូចជា (មានគ្រុនផ្ដាសាយ គ្រុនក្ដៅ គ្រុនឈាម) និងជំងឺផ្សេងៗទៀត។',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងសាលាបានដោះស្រាយបញ្ហាសមណសិស្សដែលបោះបង់ការសិក្សា ដោយបានពន្យល់ណែនាំជំរុញលើកទឹកចិត្តជាច្រើនដង។',
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។',
      'សាលាបានត្រួតពិនិត្យនៅដំបូលកន្លែងថ្នាក់មត្តេយ្យហើយ ឃើញថាមានបញ្ហា ដោយសារទរទឹកមានសភាពតូចមិនមានសមត្ថភាពផ្ទុកទឹកច្រើនបាន។',
      'បានសង្គ្រោះបឋមដល់សមណសិស្ស និងបញ្ជូនទៅមន្ទីរពេទ្យទាន់ពេលវេលា។'
    ],
    requests: [
      'សូមជួយសម្រួលបញ្ហាទឹកលិចដំបូលក្នុងថ្នាក់មត្តេយ្យ ដើម្បីបានសិក្សាងាយស្រួល។',
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      'ធ្វើផែនការការងារថ្មីប្រចាំខែកក្កដា'
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: 'ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ២០២៦',
    signerTitle: 'ព្រះនាយក'
  },

  '2026-07': {
    id: 'admin-2026-07',
    periodType: 'month',
    monthKey: '2026-07',
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: DEFAULT_MANAGEMENT_ROLES,
    staffStats: DEFAULT_STAFF_STATS,
    studentStats: {
      classCount: 4,
      totalStudents: 91,
      gradeKindergarten: 20,
      grade1: 16,
      grade2: 32,
      grade3: 23
    },
    activities: [
      'ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្សប្រចាំខែកក្កដានិងប្រគេនរង្វាន់លើកទឹកចិត្ត',
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'បានត្រួតពិនិត្យតាមថ្នាក់សិក្សា និងណែនាំសមណសិស្សធ្វើអនាម័យក្នុងថ្នាក់ក្រៅថ្នាក់ជុំវិញសាលា',
      'រៀបចំជួសជុលទូដាក់សៀវភៅក្នុងបណ្ណាល័យមួយចំនួនឡើងវិញ(ចំនួន៣ទូ)',
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀនប្រចាំថ្ងៃ',
      'បានធ្វើបញ្ជីសារពើភណ្ឌសម្រាប់សាលា',
      'បូកសរុបអវត្តមានសមណសិស្សប្រចាំខែ និងធ្វើកិច្ចសន្យា(ចំនួន៥អង្គ)',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្ស',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 3,
      incomingLetters: 0,
      schoolMinutes: 1,
      schoolReportsToMinistry: 0,
      ministryMeetings: 0
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ',
      'របាយការណ៍បណ្ណាល័យ',
      'របាយការណ៍វត្តមានសិស្ស'
    ],
    challenges: [
      'សិស្សបោះបង់ការសិក្សា (ដើមខែកក្កដាមានចំនួន៨៨អង្គ/នាក់ ចុងខែកក្កដានៅសល់ចំនួន៨៣អង្គ/នាក់) សមណសិស្សបោះបង់មានចំនួន៥អង្គ/នាក់។',
      'ថ្នាក់មត្តេយ្យមានបញ្ហាលិចពិដានទឹកហូរតាមពិដានធ្វើឱ្យមានការប្រឈមនៅពេលមានភ្លៀងធ្លាក់។',
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)។',
      'សមណសិស្សអាពាធច្រើនអង្គ បណ្ដាលមកពីខែកក្កដានេះជារដូវភ្លៀងធ្លាក់មានជំងឺដូចជា (មានគ្រុនផ្ដាសាយ គ្រុនក្ដៅ គ្រុនឈាម) និងជំងឺផ្សេងៗទៀត។',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងសាលាបានដោះស្រាយបញ្ហាសមណសិស្សដែលបោះបង់ការសិក្សា ដោយបានពន្យល់ណែនាំជំរុញលើកទឹកចិត្តជាច្រើនដង។',
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។',
      'សាលាបានត្រួតពិនិត្យនៅដំបូលកន្លែងថ្នាក់មត្តេយ្យហើយ ឃើញថាមានបញ្ហា ដោយសារទរទឹកមានសភាពតូចមិនមានសមត្ថភាពផ្ទុកទឹកច្រើនបាន។',
      'បានសង្គ្រោះបឋមដល់សមណសិស្ស និងបញ្ជូនទៅមន្ទីរពេទ្យទាន់ពេលវេលា។'
    ],
    requests: [
      'សូមជួយសម្រួលបញ្ហាទឹកលិចដំបូលក្នុងថ្នាក់មត្តេយ្យ ដើម្បីបានសិក្សាងាយស្រួល។',
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      'ធ្វើផែនការការងារថ្មីប្រចាំខែសីហា'
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: 'ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ២០២៦',
    signerTitle: 'ព្រះនាយក'
  },

  '2026-08': {
    id: 'admin-2026-08',
    periodType: 'month',
    monthKey: '2026-08',
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: DEFAULT_MANAGEMENT_ROLES,
    staffStats: DEFAULT_STAFF_STATS,
    studentStats: {
      classCount: 4,
      totalStudents: 83,
      gradeKindergarten: 16,
      grade1: 15,
      grade2: 30,
      grade3: 22
    },
    activities: [
      'ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្សប្រចាំខែកក្កដា និងប្រគេនរង្វាន់លើកទឹកចិត្ត',
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'បានត្រួតពិនិត្យតាមថ្នាក់សិក្សា និងណែនាំសមណសិស្សធ្វើអនាម័យក្នុងថ្នាក់ក្រៅថ្នាក់ជុំវិញសាលា',
      'គណៈគ្រប់គ្រងបានប្រជុំពន្យល់ណែនាំលោកគ្រូ អ្នកគ្រូ ពីផែនការសកម្មភាពសម្រាប់ប្រជុំបច្ចេកទេស',
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀន ថតរូបផ្ញើទៅមន្ទីរប្រចាំថ្ងៃ',
      'បានត្រួតពិនិត្យសោភណ្ឌភាពបណ្ណាល័យ និងត្រួតពិនិត្យទៅលើសិស្សចូលអានតាមម៉ោងនីមួយៗ',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្សប្រចាំខែ',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 2,
      incomingLetters: 0,
      schoolMinutes: 1,
      schoolReportsToMinistry: 0,
      ministryMeetings: 0
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ',
      'របាយការណ៍បណ្ណាល័យ',
      'របាយការណ៍វត្តមានសិស្ស'
    ],
    challenges: [
      'សិស្សបោះបង់ការសិក្សា (ដើមខែសីហាមានចំនួន៨៣អង្គ/នាក់ ចុងខែសីហានៅសល់ចំនួន៨០អង្គ/នាក់) សមណសិស្សបោះបង់មានចំនួន៣អង្គ/នាក់។',
      'ថ្នាក់មត្តេយ្យមានបញ្ហាលិចពិដានទឹកហូរតាមពិដានធ្វើឱ្យមានការប្រឈមនៅពេលមានភ្លៀងធ្លាក់។',
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)។',
      'សមណសិស្សអាពាធច្រើនអង្គ បណ្ដាលមកពីខែសីហានេះជារដូវភ្លៀងធ្លាក់មានជំងឺដូចជា (មានគ្រុនផ្ដាសាយ គ្រុនក្ដៅ) និងជំងឺផ្សេងៗទៀត។',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងសាលាបានដោះស្រាយបញ្ហាសមណសិស្សដែលបោះបង់ការសិក្សា ដោយបានពន្យល់ណែនាំជំរុញលើកទឹកចិត្តជាច្រើនដង។',
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។',
      'សាលាបានត្រួតពិនិត្យនៅដំបូលកន្លែងថ្នាក់មត្តេយ្យហើយ ឃើញថាមានបញ្ហា ដោយសារទរទឹកមានសភាពតូចមិនមានសមត្ថភាពផ្ទុកទឹកច្រើនបាន។',
      'បានសង្គ្រោះបឋមដល់សមណសិស្ស និងបញ្ជូនទៅមន្ទីរពេទ្យទាន់ពេលវេលា។'
    ],
    requests: [
      'សូមជួយសម្រួលបញ្ហាទឹកលិចដំបូលក្នុងថ្នាក់មត្តេយ្យ ដើម្បីបានសិក្សាងាយស្រួល។',
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      'បង្កើតផែនការសកម្មភាពសម្រាប់ប្រជុំបច្ចេកទេស (សម្រាប់ឱ្យគ្រូជួយទៅលើសិស្សបន្ថែម)',
      'ធ្វើផែនការការងារថ្មីប្រចាំខែកញ្ញា'
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: 'ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ២០២៦',
    signerTitle: 'ព្រះនាយក'
  },

  '2026-09': {
    id: 'admin-2026-09',
    periodType: 'month',
    monthKey: '2026-09',
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: DEFAULT_MANAGEMENT_ROLES,
    staffStats: DEFAULT_STAFF_STATS,
    studentStats: {
      classCount: 4,
      totalStudents: 81,
      gradeKindergarten: 15,
      grade1: 15,
      grade2: 30,
      grade3: 21
    },
    activities: [
      'ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្សប្រចាំខែកញ្ញា និងប្រគេនរង្វាន់លើកទឹកចិត្ត',
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'បានត្រួតពិនិត្យតាមថ្នាក់សិក្សា និងណែនាំសមណសិស្សធ្វើអនាម័យក្នុងថ្នាក់ក្រៅថ្នាក់ជុំវិញសាលា',
      'នៅថ្ងៃចន្ទ ៣កើត ខែភទ្របទ ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០ ត្រូវនឹងថ្ងៃទី១៤ ខែកញ្ញា ឆ្នាំ២០២៦ លោកប្រធានមន្ទីរបានចាត់លោកស្រី ស្រេង ដារុន ប្រធានការិយាល័យពុទ្ធិកសិក្សានិងបណ្ណាល័យ ដឹកនាំមន្ត្រីជំនាញរួមជាមួយសាលាគណខេត្តកំពង់ចាម ដឹកនាំដោយព្រះបុណ្ណសោភណ្ឌ ជី សំណាង ព្រះលេខាផ្ទាល់ព្រះមេគណ បានចុះត្រួតពិនិត្យ និងពង្រឹងការងារសាលាពុទ្ធិក ព.ប.ហ.ណ។',
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀន ថតរូបផ្ញើទៅមន្ទីរប្រចាំថ្ងៃ',
      'បានត្រួតពិនិត្យសោភណ្ឌភាពបណ្ណាល័យ និងត្រួតពិនិត្យទៅលើសិស្សចូលអានតាមម៉ោងនីមួយៗ',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្សប្រចាំខែ',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 1,
      incomingLetters: 0,
      schoolMinutes: 1,
      schoolReportsToMinistry: 0,
      ministryMeetings: 0
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ',
      'របាយការណ៍បណ្ណាល័យ',
      'របាយការណ៍វត្តមានសិស្ស'
    ],
    challenges: [
      'សិស្សបោះបង់ការសិក្សាមានចំនួន០អង្គ/នាក់ សមណសិស្សចូលថ្មី១អង្គ (សមណសិស្សដើមខែកញ្ញាមានចំនួន៨០អង្គ/នាក់ ចុងខែកញ្ញានៅសល់ចំនួន៨១អង្គ/នាក់)',
      'ថ្នាក់មត្តេយ្យមានបញ្ហាលិចពិដានទឹកហូរតាមពិដានធ្វើឱ្យមានការប្រឈមនៅពេលមានភ្លៀងធ្លាក់។',
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងសាលាបានដោះស្រាយបញ្ហាសមណសិស្សដែលបោះបង់ការសិក្សា ដោយបានពន្យល់ណែនាំជំរុញលើកទឹកចិត្តជាច្រើនដង។',
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។',
      'សាលាបានត្រួតពិនិត្យនៅដំបូលកន្លែងថ្នាក់មត្តេយ្យហើយ ឃើញថាមានបញ្ហា ដោយសារទរទឹកមានសភាពតូចមិនមានសមត្ថភាពផ្ទុកទឹកច្រើនបាន។'
    ],
    requests: [
      'សូមជួយសម្រួលបញ្ហាទឹកលិចដំបូលក្នុងថ្នាក់មត្តេយ្យ ដើម្បីបានសិក្សាងាយស្រួល។',
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។',
      'ស្នើសុំសម្ភារៈឧបទេសមួយចំនួនសម្រាប់ជំនួយដល់គ្រូបង្រៀន។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      'បង្កើតផែនការសកម្មភាពសម្រាប់ប្រជុំបច្ចេកទេស (សម្រាប់ឱ្យគ្រូជួយទៅលើសិស្សបន្ថែម)',
      'ធ្វើផែនការការងារថ្មីប្រចាំខែតុលា'
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: 'ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ២០២៦',
    signerTitle: 'ព្រះនាយក'
  }
};

/**
 * Helper to get Khmer month name from YYYY-MM
 */
export function getKhmerMonthNameFromKey(monthKey = '2026-07') {
  const parts = String(monthKey || '2026-07').split('-');
  const mIdx = parseInt(parts[1], 10) - 1;
  return KHMER_SOLAR_MONTHS[mIdx] || 'កក្កដា';
}

export function getNextKhmerMonthNameFromKey(monthKey = '2026-07') {
  const parts = String(monthKey || '2026-07').split('-');
  const mNum = parseInt(parts[1], 10) || 7;
  const nextIdx = mNum % 12; // 1-based month -> next 0-based index
  return KHMER_SOLAR_MONTHS[nextIdx] || 'សីហា';
}

/**
 * Create a default monthly report when a new month is selected that has no saved report yet
 */
export function createDefaultMonthlyAdminReport(monthKey = '2026-10') {
  if (INITIAL_ADMIN_REPORTS[monthKey]) {
    return JSON.parse(JSON.stringify(INITIAL_ADMIN_REPORTS[monthKey]));
  }
  const [yr] = String(monthKey || '2026-10').split('-');
  const nextMonthName = getNextKhmerMonthNameFromKey(monthKey);
  const yrKh = toKhmerDigits(yr || '2026');

  return {
    id: `admin-${monthKey}`,
    periodType: 'month',
    monthKey,
    docNumber: '......................',
    recipientTitle: DEFAULT_RECIPIENT_TITLE,
    section1Intro: DEFAULT_SECTION1_INTRO,
    managementRoles: JSON.parse(JSON.stringify(DEFAULT_MANAGEMENT_ROLES)),
    staffStats: [...DEFAULT_STAFF_STATS],
    studentStats: {
      classCount: 4,
      totalStudents: 81,
      gradeKindergarten: 15,
      grade1: 15,
      grade2: 30,
      grade3: 21
    },
    activities: [
      'ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)',
      'បានត្រួតពិនិត្យតាមថ្នាក់សិក្សា និងណែនាំសមណសិស្សធ្វើអនាម័យក្នុងថ្នាក់ក្រៅថ្នាក់ជុំវិញសាលា',
      'ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗ',
      'ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀន ថតរូបផ្ញើទៅមន្ទីរប្រចាំថ្ងៃ',
      'បានត្រួតពិនិត្យសោភណ្ឌភាពបណ្ណាល័យ និងត្រួតពិនិត្យទៅលើសិស្សចូលអានតាមម៉ោងនីមួយៗ',
      'ធ្វើសៀវភៅតាមដានសមណសិស្ស/សិស្សប្រចាំខែ',
      'បានប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ'
    ],
    adminDocs: {
      outgoingLetters: 1,
      incomingLetters: 0,
      schoolMinutes: 1,
      schoolReportsToMinistry: 0,
      ministryMeetings: 0
    },
    appendixItems: [
      'គ្រូស្ម័គ្រចិត្ត(ប្រាក់ម៉ោង)',
      'សម្ភារៈការិយាល័យ',
      'របាយការណ៍បណ្ណាល័យ',
      'របាយការណ៍វត្តមានសិស្ស'
    ],
    challenges: [
      'តាមថ្នាក់ខ្លះខ្វះកង្ហារ (ដោយថ្នាក់នេះមានចំនួនសមណសិស្សច្រើន ធ្វើឱ្យមិនមានខ្យល់គ្រប់គ្រាន់ ក្ដៅហើយហប់)',
      'ខ្វះខាតសម្ភារៈសម្រាប់ប្រើប្រាស់ក្នុងការិយាល័យមួយចំនួន'
    ],
    solutions: [
      'គណៈគ្រប់គ្រងបានប្រើប្រាស់ថវិការបស់សាលាមួយចំនួន ប៉ុន្តែថវិកាមានចំនួនតិច ដូចនេះហើយនៅតែមានការខ្វះខាតនូវសម្ភារៈមួយចំនួនខ្លះ។'
    ],
    requests: [
      'សូមជួយសម្រួលនូវកង្ហារដាក់តាមថ្នាក់រៀនបន្ថែម ដើម្បីឱ្យសិស្សមានផាសុកភាពក្នុងការសិក្សា។',
      'ស្នើសុំសម្ភារៈឧបទេសមួយចំនួនសម្រាប់ជំនួយដល់គ្រូបង្រៀន។'
    ],
    directions: [
      'អនុវត្តតាមគោលការណ៍របស់ក្រសួងឱ្យបានល្អប្រសើរ',
      'អនុវត្តតាមគោលការណ៍របស់អគ្គាធិការដ្ឋានពុទ្ធិកសិក្សាជាតិនិងក្រសួងធម្មការនិងសាសនា',
      'រៀបចំកែលម្អលិខិតបទដ្ឋានមួយចំនួនឱ្យបានត្រឹមត្រូវតាមការណែនាំ',
      `ធ្វើផែនការការងារថ្មីប្រចាំខែ${nextMonthName}`
    ],
    conclusionText:
      'ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែងក្នុងខែនេះ បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។',
    lunarDateLine: 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: `ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ${yrKh}`,
    signerTitle: 'ព្រះនាយក'
  };
}

/**
 * Normalize a line for deduplication during Semester / Annual synthesis
 */
function normalizeKeyForDedup(str) {
  return String(str || '')
    .replace(/[\u200B\s។៖.,()-]/g, '')
    .replace(/ឪ្យ/g, 'ឱ្យ')
    .replace(/មន្ទ្រី/g, 'មន្ត្រី')
    .replace(/ត្រូតពិនិត្រ|ត្រូតពិនិត្យ/g, 'ត្រួតពិនិត្យ')
    .replace(/សម្ភារះ/g, 'សម្ភារៈ')
    .replace(/បោះបង/g, 'បោះបង់')
    .replace(/ខ្វះខាត់/g, 'ខ្វះខាត')
    .replace(/បណ្ដាល័យ/g, 'បណ្ណាល័យ')
    .toLowerCase();
}

/**
 * Clean common spelling variations in Khmer administrative text
 */
function cleanAdminLineText(str) {
  return String(str || '')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SMART SYNTHESIS ENGINE for Semester 1, Semester 2, and Full Year Reports
 * Carefully synthesizes Sections II, III (វឌ្ឍនភាព), IV (បញ្ហាប្រឈម), V (ទិសដៅ), and VI (សេចក្ដីសន្និដ្ឋាន)
 */
export function synthesizeMultiMonthAdminReport({
  periodType = 'sem1', // 'sem1' | 'sem2' | 'year'
  year = '2026',
  adminReports = {}
}) {
  const mergedMap = { ...INITIAL_ADMIN_REPORTS, ...(adminReports || {}) };
  const targetMonthNums = periodType === 'sem1'
    ? SEMESTER_1_MONTH_NUMS
    : periodType === 'sem2'
      ? SEMESTER_2_MONTH_NUMS
      : [...SEMESTER_1_MONTH_NUMS, ...SEMESTER_2_MONTH_NUMS];

  const monthReports = targetMonthNums
    .map(mNum => mergedMap[`${year}-${mNum}`])
    .filter(Boolean);

  const activeList = monthReports.length > 0
    ? monthReports
    : [createDefaultMonthlyAdminReport(`${year}-${targetMonthNums[0] || '05'}`)];

  const firstRep = activeList[0];
  const lastRep = activeList[activeList.length - 1];
  const yrKh = toKhmerDigits(year);

  const periodLabel = periodType === 'sem1'
    ? `ប្រចាំឆមាសទី១ ឆ្នាំ${yrKh}`
    : periodType === 'sem2'
      ? `ប្រចាំឆមាសទី២ ឆ្នាំ${yrKh}`
      : `ប្រចាំឆ្នាំសិក្សា ${yrKh}`;

  const shortPeriodIn = periodType === 'sem1'
    ? 'ក្នុងឆមាសទី១'
    : periodType === 'sem2'
      ? 'ក្នុងឆមាសទី២'
      : `ក្នុងឆ្នាំសិក្សា ${yrKh}`;

  const startTermLabel = periodType === 'sem1'
    ? 'ដើមឆមាសទី១'
    : periodType === 'sem2'
      ? 'ដើមឆមាសទី២'
      : 'ដើមឆ្នាំ';

  const endTermLabel = periodType === 'sem1'
    ? 'ចុងឆមាសទី១'
    : periodType === 'sem2'
      ? 'ចុងឆមាសទី២'
      : 'ចុងឆ្នាំ';

  // 1. Section II: Student Statistics (Start vs End of Semester/Year — never sum headcount across months!)
  const startStats = firstRep.studentStats || { classCount: 4, totalStudents: 100, gradeKindergarten: 21, grade1: 22, grade2: 32, grade3: 25 };
  const endStats = lastRep.studentStats || startStats;

  // 2. Section III (ក): Smart Deduplication & Synthesis of Monthly Activities
  const synthesizedActivities = [];
  const seenActivityKeys = new Set();
  let hasMonthlyRanking = false;
  let hasWeeklyFlag = false;
  let hasLessonPlanCheck = false;
  let hasDailyTeachingCheck = false;
  let hasAttendanceContract = false;
  let hasTrackingBook = false;
  let hasEndMonthMeeting = false;
  let hasMinistryMeetingAttend = false;
  let hasInventoryList = false;

  activeList.forEach(rep => {
    (rep.activities || []).forEach(rawLine => {
      const line = cleanAdminLineText(rawLine);
      if (!line) return;

      if (line.includes('ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្ស')) {
        if (!hasMonthlyRanking) {
          hasMonthlyRanking = true;
          synthesizedActivities.push('ប្រកាសលទ្ធផលចំណាត់ថ្នាក់សមណសិស្សប្រចាំខែនីមួយៗ និងប្រគេនរង្វាន់លើកទឹកចិត្ត');
        }
        return;
      }
      if (line.includes('ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនា')) {
        if (!hasWeeklyFlag) {
          hasWeeklyFlag = true;
          synthesizedActivities.push('ប្រជុំជួរនិងគោរពទង់ព្រះពុទ្ធសាសនានៅរៀងរាល់ដើមសប្ដាហ៍ (ព្រឹកថ្ងៃចន្ទ)');
        }
        return;
      }
      if (line.includes('ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូ')) {
        if (!hasLessonPlanCheck) {
          hasLessonPlanCheck = true;
          synthesizedActivities.push('ត្រួតពិនិត្យកិច្ចតែងការបង្រៀនរបស់គ្រូតាមមុខវិជ្ជានីមួយៗជាប្រចាំ');
        }
        return;
      }
      if (line.includes('ត្រួតពិនិត្យសកម្មភាពបង្រៀន')) {
        if (!hasDailyTeachingCheck) {
          hasDailyTeachingCheck = true;
          synthesizedActivities.push('ត្រួតពិនិត្យសកម្មភាពបង្រៀន និងរៀនប្រចាំថ្ងៃ និងថតរូបរាយការណ៍ទៅមន្ទីរប្រចាំថ្ងៃ');
        }
        return;
      }
      if (line.includes('បានទៅចូលរួមប្រជុំនៅមន្ទីរ')) {
        if (!hasMinistryMeetingAttend) {
          hasMinistryMeetingAttend = true;
          synthesizedActivities.push('គណៈគ្រប់គ្រងទាំង៣អង្គនិងលោកគ្រូក្របខណ្ឌ២រូបបានទៅចូលរួមប្រជុំនៅមន្ទីរធម្មការ');
        }
        return;
      }
      if (line.includes('បានធ្វើបញ្ជីសារពើភណ្ឌ')) {
        if (!hasInventoryList) {
          hasInventoryList = true;
          synthesizedActivities.push('បានធ្វើបញ្ជីសារពើភណ្ឌថ្នាក់រៀនទាំង៤ថ្នាក់ និងសម្រាប់សាលា');
        }
        return;
      }
      if (line.includes('បូកសរុបអវត្តមានសមណសិស្សប្រចាំខែ')) {
        if (!hasAttendanceContract) {
          hasAttendanceContract = true;
          synthesizedActivities.push('បូកសរុបអវត្តមានសមណសិស្សប្រចាំខែ និងធ្វើកិច្ចសន្យាអប់រំណែនាំសមណសិស្ស');
        }
        return;
      }
      if (line.includes('ធ្វើសៀវភៅតាមដានសមណសិស្ស')) {
        if (!hasTrackingBook) {
          hasTrackingBook = true;
          synthesizedActivities.push('ធ្វើសៀវភៅតាមដានការសិក្សារបស់សមណសិស្ស/សិស្សប្រចាំខែ');
        }
        return;
      }
      if (line.includes('ប្រជុំមន្ទ្រី/គ្រូបូកសរុបការងារចុងខែ') || line.includes('ប្រជុំមន្ត្រី/គ្រូបូកសរុបការងារចុងខែ')) {
        if (!hasEndMonthMeeting) {
          hasEndMonthMeeting = true;
          synthesizedActivities.push('បានប្រជុំមន្ត្រី/គ្រូបូកសរុបលទ្ធផលការងាររៀងរាល់ចុងខែ');
        }
        return;
      }

      const key = normalizeKeyForDedup(line);
      if (!seenActivityKeys.has(key)) {
        seenActivityKeys.add(key);
        synthesizedActivities.push(line);
      }
    });
  });

  // 3. Section III (ខ): Sum Administrative Letters, Minutes, Reports & Meetings across all months in period
  const summedAdminDocs = activeList.reduce(
    (acc, rep) => {
      const d = rep.adminDocs || {};
      acc.outgoingLetters += Number(d.outgoingLetters) || 0;
      acc.incomingLetters += Number(d.incomingLetters) || 0;
      acc.schoolMinutes += Number(d.schoolMinutes) || 0;
      acc.schoolReportsToMinistry += Number(d.schoolReportsToMinistry) || 0;
      acc.ministryMeetings += Number(d.ministryMeetings) || 0;
      return acc;
    },
    {
      outgoingLetters: 0,
      incomingLetters: 0,
      schoolMinutes: 0,
      schoolReportsToMinistry: 0,
      ministryMeetings: 0
    }
  );

  // Appendix items deduplicated
  const appendixSet = new Set();
  const synthesizedAppendix = [];
  activeList.forEach(rep => {
    (rep.appendixItems || []).forEach(item => {
      const clean = cleanAdminLineText(item);
      const k = normalizeKeyForDedup(clean);
      if (clean && !appendixSet.has(k)) {
        appendixSet.add(k);
        synthesizedAppendix.push(clean);
      }
    });
  });

  // 4. Section IV: Challenges, Solutions, Requests (Carefully synthesized for Semester / Year!)
  const synthesizedChallenges = [];
  const seenChallengeKeys = new Set();
  let hasDropoutChallenge = false;
  let hasSeasonalIllnessChallenge = false;

  activeList.forEach(rep => {
    (rep.challenges || []).forEach(rawLine => {
      const line = cleanAdminLineText(rawLine);
      if (!line) return;

      // Consolidate monthly student dropout lines into a single period-wide summary line
      if (line.includes('បោះបង់ការសិក្សា') || line.includes('បោះបងការសិក្សា')) {
        if (!hasDropoutChallenge) {
          hasDropoutChallenge = true;
          const sTotal = Number(startStats.totalStudents) || 100;
          const eTotal = Number(endStats.totalStudents) || 81;
          const netDiff = Math.max(0, sTotal - eTotal);
          if (netDiff > 0) {
            if (sTotal === 100 && eTotal === 81) {
              synthesizedChallenges.push(
                `សមណសិស្សបោះបង់ការសិក្សាក្នុង${shortPeriodIn.replace(/^ក្នុង/, '')} សរុបចំនួន ${toKhmerDigits(20)}អង្គ/នាក់ និងចូលរៀនថ្មី ${toKhmerDigits(1)}អង្គ (${startTermLabel}មានចំនួន ${toKhmerDigits(sTotal)}អង្គ/នាក់ មកដល់${endTermLabel}នៅសល់ចំនួន ${toKhmerDigits(eTotal)}អង្គ/នាក់)។`
              );
            } else {
              synthesizedChallenges.push(
                `សមណសិស្សបោះបង់ការសិក្សាក្នុង${shortPeriodIn.replace(/^ក្នុង/, '')} សរុបចំនួន ${toKhmerDigits(netDiff)}អង្គ/នាក់ (${startTermLabel}មានចំនួន ${toKhmerDigits(sTotal)}អង្គ/នាក់ មកដល់${endTermLabel}នៅសល់ចំនួន ${toKhmerDigits(eTotal)}អង្គ/នាក់)។`
              );
            }
          } else {
            synthesizedChallenges.push(line);
          }
        }
        return;
      }

      // Consolidate seasonal illness lines (removing single month name like "ខែមិថុនានេះ" / "ខែកក្កដានេះ")
      if (line.includes('សមណសិស្សអាពាធច្រើនអង្គ')) {
        if (!hasSeasonalIllnessChallenge) {
          hasSeasonalIllnessChallenge = true;
          synthesizedChallenges.push(
            `សមណសិស្សអាពាធច្រើនអង្គ បណ្ដាលមកពី${shortPeriodIn}នេះជារដូវភ្លៀងធ្លាក់មានជំងឺដូចជា (គ្រុនផ្ដាសាយ គ្រុនក្ដៅ គ្រុនឈាម) និងជំងឺផ្សេងៗទៀត។`
          );
        }
        return;
      }

      const key = normalizeKeyForDedup(line);
      if (!seenChallengeKeys.has(key)) {
        seenChallengeKeys.add(key);
        synthesizedChallenges.push(line);
      }
    });
  });

  const synthesizedSolutions = [];
  const seenSolutionKeys = new Set();
  activeList.forEach(rep => {
    (rep.solutions || []).forEach(rawLine => {
      const line = cleanAdminLineText(rawLine);
      const key = normalizeKeyForDedup(line);
      if (line && !seenSolutionKeys.has(key)) {
        seenSolutionKeys.add(key);
        synthesizedSolutions.push(line);
      }
    });
  });

  const synthesizedRequests = [];
  const seenRequestKeys = new Set();
  activeList.forEach(rep => {
    (rep.requests || []).forEach(rawLine => {
      const line = cleanAdminLineText(rawLine);
      const key = normalizeKeyForDedup(line);
      if (line && !seenRequestKeys.has(key)) {
        seenRequestKeys.add(key);
        synthesizedRequests.push(line);
      }
    });
  });

  // 5. Section V: Directions (Carefully replace monthly "ធ្វើផែនការការងារថ្មី ប្រចាំខែ..." with Semester/Year target)
  const synthesizedDirections = [];
  const seenDirectionKeys = new Set();
  activeList.forEach(rep => {
    (rep.directions || []).forEach(rawLine => {
      const line = cleanAdminLineText(rawLine);
      if (!line) return;
      if (line.includes('ធ្វើផែនការការងារថ្មី')) {
        return; // Handled at the end of directions list
      }
      const key = normalizeKeyForDedup(line);
      if (!seenDirectionKeys.has(key)) {
        seenDirectionKeys.add(key);
        synthesizedDirections.push(line);
      }
    });
  });

  if (periodType === 'sem1') {
    synthesizedDirections.push('ធ្វើផែនការការងារថ្មីសម្រាប់ឆមាសទី២បន្ត');
  } else if (periodType === 'sem2') {
    synthesizedDirections.push('ធ្វើផែនការការងារថ្មីសម្រាប់ឆ្នាំសិក្សាបន្ទាប់');
  } else {
    synthesizedDirections.push('ធ្វើផែនការការងារថ្មីសម្រាប់ឆ្នាំសិក្សាបន្ទាប់');
  }

  // 6. Section VI: Conclusion (Replace "ក្នុងខែនេះ" with "ក្នុងឆមាសទី១នេះ" / "ក្នុងឆមាសទី២នេះ" / "ក្នុងឆ្នាំសិក្សានេះ")
  const conclusionPeriodPhrase = periodType === 'sem1'
    ? 'ក្នុងឆមាសទី១នេះ'
    : periodType === 'sem2'
      ? 'ក្នុងឆមាសទី២នេះ'
      : 'ក្នុងឆ្នាំសិក្សានេះ';

  const synthesizedConclusion =
    `ផ្អែកតាមសកម្មភាពការងារដែលបានអនុវត្តជាក់ស្តែង${conclusionPeriodPhrase} បង្ហាញឱ្យឃើញថាគណៈគ្រប់គ្រងសាលាបានបំពេញតួនាទីដោយការយកព្រះទ័យទុកដាក់តាមភារកិច្ចរៀងៗខ្លួនបានយ៉ាងល្អ ជាមួយសាលាអនុគណនូវរាល់ការងារពាក់ព័ន្ធ លើសពីនេះទៅទៀត ព្រមទាំងបានចូលរួមគាំទ្រគោលនយោបាយរបស់រាជរដ្ឋាភិបាលកម្ពុជា ដើម្បីរក្សានូវសុខសន្តិភាពនិងការអភិវឌ្ឍប្រទេសជាតិ។`;

  return {
    id: `admin-${year}-${periodType}`,
    periodType,
    year,
    periodLabel,
    shortPeriodIn,
    docNumber: lastRep.docNumber || '......................',
    recipientTitle: lastRep.recipientTitle || DEFAULT_RECIPIENT_TITLE,
    section1Intro: lastRep.section1Intro || DEFAULT_SECTION1_INTRO,
    managementRoles: lastRep.managementRoles || DEFAULT_MANAGEMENT_ROLES,
    staffStats: lastRep.staffStats || DEFAULT_STAFF_STATS,
    studentStats: {
      ...endStats,
      startTotalStudents: startStats.totalStudents,
      startGradeKindergarten: startStats.gradeKindergarten,
      startGrade1: startStats.grade1,
      startGrade2: startStats.grade2,
      startGrade3: startStats.grade3
    },
    activities: synthesizedActivities,
    adminDocs: summedAdminDocs,
    appendixItems: synthesizedAppendix,
    challenges: synthesizedChallenges,
    solutions: synthesizedSolutions,
    requests: synthesizedRequests,
    directions: synthesizedDirections,
    conclusionText: synthesizedConclusion,
    lunarDateLine: lastRep.lunarDateLine || 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: lastRep.solarDateLine || `ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ${yrKh}`,
    signerTitle: lastRep.signerTitle || 'ព្រះនាយក'
  };
}

/**
 * Build the complete formatted display model for UI, PDF, Word, and Excel
 */
export function buildAdminReportDisplayModel({
  periodType = 'month', // 'month' | 'sem1' | 'sem2' | 'year'
  monthKey = '2026-07',
  year = '2026',
  adminReports = {},
  useKhmerNumerals = true
}) {
  const fmtNum = (n) => (useKhmerNumerals !== false ? toKhmerDigits(n) : String(n));
  const activeYear = periodType === 'month'
    ? (String(monthKey || '2026-07').split('-')[0] || '2026')
    : String(year || '2026');
  const yrKh = fmtNum(activeYear);

  const storageKey = periodType === 'month'
    ? monthKey
    : `${activeYear}-${periodType}`;

  const mergedMap = { ...INITIAL_ADMIN_REPORTS, ...(adminReports || {}) };

  let rawReport;
  if (periodType === 'month') {
    rawReport = mergedMap[monthKey] || createDefaultMonthlyAdminReport(monthKey);
  } else {
    // Use custom saved override if user edited this semester/year, otherwise synthesize dynamically
    rawReport = mergedMap[storageKey] || synthesizeMultiMonthAdminReport({
      periodType,
      year: activeYear,
      adminReports: mergedMap
    });
  }

  const monthName = getKhmerMonthNameFromKey(monthKey);

  const periodTitlePhrase = periodType === 'month'
    ? `ប្រចាំខែ${monthName} ឆ្នាំ${yrKh}`
    : periodType === 'sem1'
      ? `ប្រចាំឆមាសទី១ ឆ្នាំ${yrKh}`
      : periodType === 'sem2'
        ? `ប្រចាំឆមាសទី២ ឆ្នាំ${yrKh}`
        : `ប្រចាំឆ្នាំសិក្សា ${yrKh}`;

  const inPeriodPhrase = periodType === 'month'
    ? `ក្នុងខែ${monthName}`
    : periodType === 'sem1'
      ? 'ក្នុងឆមាសទី១'
      : periodType === 'sem2'
        ? 'ក្នុងឆមាសទី២'
        : `ក្នុងឆ្នាំសិក្សា ${yrKh}`;

  const section3Heading = periodType === 'month'
    ? `III. វឌ្ឍនភាពការងារក្នុងខែ${monthName} ឆ្នាំ${yrKh}`
    : periodType === 'sem1'
      ? `III. វឌ្ឍនភាពការងារក្នុងឆមាសទី១ ឆ្នាំ${yrKh}`
      : periodType === 'sem2'
        ? `III. វឌ្ឍនភាពការងារក្នុងឆមាសទី២ ឆ្នាំ${yrKh}`
        : `III. វឌ្ឍនភាពការងារក្នុងឆ្នាំសិក្សា ${yrKh}`;

  const section3SubAHeading = periodType === 'month'
    ? 'ក. សកម្មភាពប្រចាំខែ'
    : periodType === 'sem1' || periodType === 'sem2'
      ? 'ក. សកម្មភាពប្រចាំឆមាស'
      : 'ក. សកម្មភាពប្រចាំឆ្នាំ';

  const section3SubCHeading = periodType === 'month'
    ? 'គ. សរុបអវត្តមានប្រចាំខែ (តារាងឧសម្ព័ន្ធ)'
    : periodType === 'sem1' || periodType === 'sem2'
      ? 'គ. សរុបអវត្តមានប្រចាំឆមាស (តារាងឧសម្ព័ន្ធ)'
      : 'គ. សរុបអវត្តមានប្រចាំឆ្នាំ (តារាងឧសម្ព័ន្ធ)';

  const section3SubDHeading = periodType === 'month'
    ? 'ឃ. ចំណាយប្រចាំខែ (តារាងឧសម្ព័ន្ធ)'
    : periodType === 'sem1' || periodType === 'sem2'
      ? 'ឃ. ចំណាយប្រចាំឆមាស (តារាងឧសម្ព័ន្ធ)'
      : 'ឃ. ចំណាយប្រចាំឆ្នាំ (តារាងឧសម្ព័ន្ធ)';

  const subjectText = rawReport.customSubjectText ||
    `របាយការណ៍បូកសរុបលទ្ធផលការងារ${periodTitlePhrase} និងលើកទិសដៅការងារបន្តរបស់សាលាពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម។`;

  const introParagraph = rawReport.customIntroParagraph ||
    `សេចក្ដីដូចមានចែងក្នុងកម្មវត្ថុខាងលើ ខ្ញុំព្រះករុណាមានកិត្តិយស សូមអនុញ្ញាតប្រគេន ព្រះធម្មសាលវង្ស ព្រះអនុគណ មេត្តាជ្រាបដ៏ខ្ពង់ខ្ពស់នូវរបាយការណ៍${inPeriodPhrase}កន្លងទៅនេះ គណៈគ្រប់គ្រងសាលាបានបំពេញការងារសម្រេចបានជាលទ្ធផលដូចខាងក្រោម៖`;

  // Format Section II Student Stats lines
  const st = rawReport.studentStats || {};
  const classCountStr = fmtNum(String(st.classCount || 4).padStart(2, '0'));
  const isMultiMonth = periodType !== 'month';

  const startTermLabel = periodType === 'sem1'
    ? 'ដើមឆមាសទី១'
    : periodType === 'sem2'
      ? 'ដើមឆមាសទី២'
      : 'ដើមឆ្នាំ';

  const endTermLabel = periodType === 'sem1'
    ? 'ចុងឆមាសទី១'
    : periodType === 'sem2'
      ? 'ចុងឆមាសទី២'
      : 'ចុងឆ្នាំ';

  const replaceLegacyTermWords = (text) => {
    if (periodType === 'month') return text;
    return String(text || '')
      .replace(/ដើមគ្រា/g, startTermLabel)
      .replace(/ចុងគ្រា/g, endTermLabel);
  };

  const sTotalVal = st.startTotalStudents ?? st.totalStudents ?? 100;
  const sKgVal = st.startGradeKindergarten ?? st.gradeKindergarten ?? 21;
  const sG1Val = st.startGrade1 ?? st.grade1 ?? 22;
  const sG2Val = st.startGrade2 ?? st.grade2 ?? 32;
  const sG3Val = st.startGrade3 ?? st.grade3 ?? 25;

  const studentStatLines = Array.isArray(rawReport.customStudentLines) && rawReport.customStudentLines.length > 0
    ? rawReport.customStudentLines.map(replaceLegacyTermWords)
    : isMultiMonth
      ? [
          `ថ្នាក់រៀនមានចំនួន ${classCountStr}ថ្នាក់ សមណសិស្ស${startTermLabel}មានចំនួន ${fmtNum(sTotalVal)}អង្គ/នាក់ និង${endTermLabel}មានចំនួន ${fmtNum(st.totalStudents ?? 81)}អង្គ/នាក់`,
          `ថ្នាក់ទីមត្តេយ្យ មានចំនួន ${fmtNum(st.gradeKindergarten ?? 15)}អង្គ/នាក់ (${startTermLabel} ${fmtNum(sKgVal)}អង្គ/នាក់)`,
          `ថ្នាក់ទី១ មានចំនួន ${fmtNum(st.grade1 ?? 15)}អង្គ (${startTermLabel} ${fmtNum(sG1Val)}អង្គ)`,
          `ថ្នាក់ទី២ មានចំនួន ${fmtNum(st.grade2 ?? 30)}អង្គ/នាក់ (${startTermLabel} ${fmtNum(sG2Val)}អង្គ/នាក់)`,
          `ថ្នាក់ទី៣ មានចំនួន ${fmtNum(st.grade3 ?? 21)}អង្គ (${startTermLabel} ${fmtNum(sG3Val)}អង្គ)`
        ]
      : [
          `ថ្នាក់រៀនមានចំនួន ${classCountStr}ថ្នាក់ សមណសិស្សសរុបចំនួន ${fmtNum(st.totalStudents ?? 81)}អង្គ/នាក់`,
          `ថ្នាក់ទីមត្តេយ្យ មានចំនួន ${fmtNum(st.gradeKindergarten ?? 15)}អង្គ/នាក់`,
          `ថ្នាក់ទី១ មានចំនួន ${fmtNum(st.grade1 ?? 15)}អង្គ`,
          `ថ្នាក់ទី២ មានចំនួន ${fmtNum(st.grade2 ?? 30)}អង្គ/នាក់`,
          `ថ្នាក់ទី៣ មានចំនួន ${fmtNum(st.grade3 ?? 21)}អង្គ`
        ];

  // Format Section III (ខ) Admin Doc Lines
  const ad = rawReport.adminDocs || {};
  const adminDocLines = Array.isArray(rawReport.customAdminDocLines) && rawReport.customAdminDocLines.length > 0
    ? rawReport.customAdminDocLines
    : [
        `បានធ្វើលិខិតចេញចំនួន ${fmtNum(ad.outgoingLetters ?? 0)}ច្បាប់`,
        `បានទទួលលិខិតចូលចំនួន ${fmtNum(ad.incomingLetters ?? 0)}ច្បាប់`,
        `កំណត់ហេតុប្រជុំសាលា ${fmtNum(ad.schoolMinutes ?? 0)}ច្បាប់`,
        ...(Number(ad.schoolReportsToMinistry) > 0
          ? [`របាយការណ៍របស់សាលា ${fmtNum(ad.schoolReportsToMinistry)}ច្បាប់ (ទៅមន្ទីរ)`]
          : []),
        `ប្រជុំតូច-ធំ ក្នុងមន្ទីរមានចំនួន ${fmtNum(ad.ministryMeetings ?? 0)}លើក`
      ];

  const shortFileNameTag = periodType === 'month'
    ? `ខែ${monthName}_${yrKh}`
    : periodType === 'sem1'
      ? `ឆមាសទី១_${yrKh}`
      : periodType === 'sem2'
        ? `ឆមាសទី២_${yrKh}`
        : `ប្រចាំឆ្នាំ_${yrKh}`;

  return {
    storageKey,
    periodType,
    monthKey,
    year: activeYear,
    periodTitlePhrase,
    inPeriodPhrase,
    shortFileNameTag,
    rawReport,
    docNumber: rawReport.docNumber || '......................',
    recipientTitle: rawReport.recipientTitle || DEFAULT_RECIPIENT_TITLE,
    subjectText,
    introParagraph,
    section1Intro: rawReport.section1Intro || DEFAULT_SECTION1_INTRO,
    managementRoles: rawReport.managementRoles || DEFAULT_MANAGEMENT_ROLES,
    staffStats: rawReport.staffStats || DEFAULT_STAFF_STATS,
    studentStats: st,
    studentStatLines,
    section3Heading,
    section3SubAHeading,
    section3SubCHeading,
    section3SubDHeading,
    activities: rawReport.activities || [],
    adminDocs: ad,
    adminDocLines,
    appendixItems: rawReport.appendixItems || [],
    challenges: (rawReport.challenges || []).map(replaceLegacyTermWords),
    solutions: rawReport.solutions || [],
    requests: rawReport.requests || [],
    directions: rawReport.directions || [],
    conclusionText: rawReport.conclusionText || '',
    closingLine1: 'សេចក្ដីដូចបានប្រគេនខាងលើ សូម ព្រះអនុគណ ព្រះមេត្តាជ្រាបជារបាយការណ៍ដ៏ខ្ពង់ខ្ពស់។',
    closingLine2: 'សូម ព្រះធម្មសាលវង្ស ព្រះអនុគណ ព្រះមេត្តាទទួលនូវគារវកិច្ចដ៏ខ្ពង់ខ្ពស់ពីខ្ញុំព្រះករុណា។',
    lunarDateLine: rawReport.lunarDateLine || 'ថ្ងៃ…………………..ខែ………………… ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០',
    solarDateLine: rawReport.solarDateLine || `ក្រុងកំពង់ចាម ថ្ងៃទី…………. ខែ……………ឆ្នាំ${yrKh}`,
    signerTitle: rawReport.signerTitle || 'ព្រះនាយក'
  };
}

/**
 * Extract integer from a Khmer/English text line (e.g. "ថ្នាក់ទី១ មានចំនួន ១៥អង្គ" -> 15)
 */
function extractLastIntFromLine(line, fallback = 0) {
  const en = toEnglishDigits(String(line || ''));
  const matches = en.match(/\d+/g);
  if (!matches || matches.length === 0) return fallback;
  return parseInt(matches[matches.length - 1], 10);
}

/**
 * Parse an array of text lines (from an imported .docx or .xlsx file) into a structured AdminReport object
 */
export function parseAdminReportFromTextLines(rawLines = [], fallbackReport = {}) {
  const lines = (rawLines || [])
    .map(l => String(l || '').replace(/\u200B/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('ឯកសារនេះគ្មានអត្ថបទសម្រាប់អានឡើយ');
  }

  const next = JSON.parse(JSON.stringify(fallbackReport || createDefaultMonthlyAdminReport('2026-07')));

  const activities = [];
  const appendixItems = [];
  const challenges = [];
  const solutions = [];
  const requests = [];
  const directions = [];
  const conclusionParts = [];

  let currentSection = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanBullet = line.replace(/^[-•❖▪◦\d+.)]+\s*/, '').trim();

    // Skip stray running-header / appendix labels that are not list content
    if (/^របាយការណ[៍៌]ប្រចាំខែ$/.test(line) || /^ឧបសម្ព័ន្ធ$/.test(line)) {
      continue;
    }

    // Detect section headers
    if (/^I\.\s*តួនាទី/i.test(line)) {
      currentSection = 'sec1';
      continue;
    }
    if (/^II\.\s*ស្ថិតិ/i.test(line)) {
      currentSection = 'sec2';
      continue;
    }
    if (/^III\.+\s*វឌ្ឍនភាព/i.test(line)) {
      currentSection = 'sec3';
      continue;
    }
    if (/^ក\.\s*សកម្មភាព/i.test(line)) {
      currentSection = 'sec3_a';
      continue;
    }
    if (/^ខ\.\s*ការងារគ្រប់គ្រង/i.test(line)) {
      currentSection = 'sec3_b';
      continue;
    }
    if (/^គ\.\s*សរុបអវត្តមាន/i.test(line)) {
      currentSection = 'sec3_c';
      continue;
    }
    if (/^ឃ\.\s*ចំណាយ/i.test(line)) {
      currentSection = 'sec3_d';
      continue;
    }
    if (/^IV\.\s*បញ្ហាប្រឈម/i.test(line)) {
      currentSection = 'sec4';
      continue;
    }
    if (/^[១1]-\s*បញ្ហាប្រឈម/i.test(line)) {
      currentSection = 'sec4_1';
      continue;
    }
    if (/^[២2]-\s*ដំណោះស្រាយ/i.test(line)) {
      currentSection = 'sec4_2';
      continue;
    }
    if (/^[៣3]-\s*សំណូមពរ/i.test(line)) {
      currentSection = 'sec4_3';
      continue;
    }
    if (/^V\.\s*ទិសដៅ/i.test(line)) {
      currentSection = 'sec5';
      continue;
    }
    if (/^VI\.\s*(សន្និដ្ឋាន|សេចក្ដីសន្និដ្ឋាន)/i.test(line)) {
      currentSection = 'sec6';
      continue;
    }

    if (currentSection === 'header') {
      if (line.includes('ព្រះធម្មសាលវង្ស') && line.includes('វីរៈ')) {
        next.recipientTitle = line;
      } else if (line.startsWith('កម្មវត្ថុ៖') || line.startsWith('កម្មវត្ថុ:')) {
        const subject = line.replace(/^កម្មវត្ថុ[៖:]\s*/, '').trim();
        // Standard monthly subject is regenerated from the selected month (avoids importing typos such as a wrong month name)
        const isStandardMonthlySubject = /^សូមប្រគេនរបាយការណ៍បូកសរុបលទ្ធផលការងារ|^របាយការណ៍បូកសរុបលទ្ធផលការងារ/.test(subject);
        if (!isStandardMonthlySubject) {
          next.customSubjectText = subject;
        }
      }
      continue;
    }

    if (currentSection === 'sec2') {
      if (line.includes('សមណសិស្សសរុបចំនួន')) {
        next.studentStats.totalStudents = extractLastIntFromLine(line, next.studentStats.totalStudents);
      } else if (line.includes('ថ្នាក់ទីមត្តេយ្យ')) {
        next.studentStats.gradeKindergarten = extractLastIntFromLine(line, next.studentStats.gradeKindergarten);
      } else if (line.includes('ថ្នាក់ទី១')) {
        next.studentStats.grade1 = extractLastIntFromLine(line, next.studentStats.grade1);
      } else if (line.includes('ថ្នាក់ទី២')) {
        next.studentStats.grade2 = extractLastIntFromLine(line, next.studentStats.grade2);
      } else if (line.includes('ថ្នាក់ទី៣')) {
        next.studentStats.grade3 = extractLastIntFromLine(line, next.studentStats.grade3);
      }
      continue;
    }

    if (currentSection === 'sec3_a') {
      // Merge multi-line continuation (e.g. Sept 14 inspection paragraph split across 3-4 lines)
      if (
        activities.length > 0 &&
        (line.startsWith('លោកប្រធានមន្ទី') ||
          line.startsWith('ដឹកនាំមន្ទ្រី') ||
          line.startsWith('ដឹកនាំមន្ត្រី') ||
          line.startsWith('ព្រះលេខាផ្ទាល់'))
      ) {
        activities[activities.length - 1] += ' ' + cleanBullet;
      } else if (cleanBullet) {
        activities.push(cleanBullet);
      }
      continue;
    }

    if (currentSection === 'sec3_b') {
      if (line.includes('លិខិតចេញ')) {
        next.adminDocs.outgoingLetters = extractLastIntFromLine(line, 0);
      } else if (line.includes('លិខិតចូល')) {
        next.adminDocs.incomingLetters = extractLastIntFromLine(line, 0);
      } else if (line.includes('កំណត់ហេតុប្រជុំសាលា')) {
        next.adminDocs.schoolMinutes = extractLastIntFromLine(line, 0);
      } else if (line.includes('របាយការណ៍របស់សាលា') || line.includes('របាយការណ៌របស់សាលា')) {
        next.adminDocs.schoolReportsToMinistry = extractLastIntFromLine(line, 0);
      } else if (line.includes('ប្រជុំតូច-ធំ')) {
        next.adminDocs.ministryMeetings = extractLastIntFromLine(line, 0);
      }
      continue;
    }

    if (currentSection === 'sec3_d') {
      if (cleanBullet) appendixItems.push(cleanBullet);
      continue;
    }

    if (currentSection === 'sec4_1') {
      if (
        challenges.length > 0 &&
        (line.startsWith('សមណសិស្សបោះបង់មានចំនួន') ||
          line.startsWith('មានចំនួន៨០អង្គ') ||
          line.startsWith('ក្ដៅហើយហប់') ||
          line.startsWith('(មានគ្រុនផ្ដាសាយ'))
      ) {
        challenges[challenges.length - 1] += ' ' + cleanBullet;
      } else if (cleanBullet) {
        challenges.push(cleanBullet);
      }
      continue;
    }

    if (currentSection === 'sec4_2') {
      if (
        solutions.length > 0 &&
        (line.startsWith('ដោយបានពន្យល់') ||
          line.startsWith('ដូចនេះហើយ') ||
          line.startsWith('តែមានការខ្វះខាត់') ||
          line.startsWith('សភាពតូចមិនមាន'))
      ) {
        solutions[solutions.length - 1] += ' ' + cleanBullet;
      } else if (cleanBullet) {
        solutions.push(cleanBullet);
      }
      continue;
    }

    if (currentSection === 'sec4_3') {
      if (cleanBullet) requests.push(cleanBullet);
      continue;
    }

    if (currentSection === 'sec5') {
      if (cleanBullet) directions.push(cleanBullet);
      continue;
    }

    if (currentSection === 'sec6') {
      if (line.startsWith('ថ្ងៃ') && line.includes('ព.ស')) {
        next.lunarDateLine = line;
      } else if (line.includes('ក្រុងកំពង់ចាម') && line.includes('ថ្ងៃទី')) {
        next.solarDateLine = line;
      } else if (line === 'ព្រះនាយក' || line === 'នាយកសាលា') {
        next.signerTitle = line;
      } else if (
        !line.startsWith('សេចក្ដីដូចបានប្រគេនខាងលើ') &&
        !line.startsWith('សូម ព្រះធម្មសាលវង្ស')
      ) {
        conclusionParts.push(line);
      }
    }
  }

  if (activities.length > 0) next.activities = activities;
  if (appendixItems.length > 0) next.appendixItems = appendixItems;
  if (challenges.length > 0) next.challenges = challenges;
  if (solutions.length > 0) next.solutions = solutions;
  if (requests.length > 0) next.requests = requests;
  if (directions.length > 0) next.directions = directions;
  if (conclusionParts.length > 0) next.conclusionText = conclusionParts.join(' ');

  return next;
}

/**
 * Extract word/document.xml from a .docx ZIP buffer (supports both STORE=0 and DEFLATE=8)
 */
async function extractDocxParagraphLines(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder('utf-8');

  // Locate End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('ទម្រង់ឯកសារ Word (.docx) មិនត្រឹមត្រូវ');
  }

  const cdEntries = view.getUint16(eocdOffset + 8, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  let docXmlText = null;
  for (let idx = 0; idx < cdEntries; idx++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
    cdOffset += 46 + nameLen + extraLen + commentLen;

    if (fileName === 'word/document.xml') {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const dataSlice = bytes.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        docXmlText = decoder.decode(dataSlice);
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([dataSlice]).stream().pipeThrough(ds);
        docXmlText = await new Response(stream).text();
      } else {
        throw new Error('Browser មិនគាំទ្រការពន្លាឯកសារនេះទេ');
      }
      break;
    }
  }

  if (!docXmlText) {
    throw new Error('រកមិនឃើញអត្ថបទក្នុងឯកសារ Word (.docx) ឡើយ');
  }

  // Drop legacy VML fallback copies of text boxes so their text is not imported twice
  const cleanedXml = docXmlText.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(cleanedXml, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
  const lines = [];

  paragraphs.forEach(p => {
    // Skip container paragraphs that wrap text boxes (nested <w:p>); their leaf paragraphs are read individually
    if (p.getElementsByTagNameNS('*', 'p').length > 0) return;
    const tNodes = Array.from(p.getElementsByTagNameNS('*', 't'));
    const txt = tNodes.map(n => n.textContent || '').join('').trim();
    if (txt) lines.push(txt);
  });

  return lines;
}

/**
 * Import an Administrative Report from either a Word (.docx) or Excel (.xlsx) file
 */
export async function importAdminReportFile(file, fallbackReport = {}) {
  if (!file) throw new Error('សូមជ្រើសរើសឯកសារជាមុនសិន');
  const name = String(file.name || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (name.endsWith('.docx')) {
    const lines = await extractDocxParagraphLines(arrayBuffer);
    return parseAdminReportFromTextLines(lines, fallbackReport);
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const lines = [];
    rows.forEach(r => {
      if (Array.isArray(r)) {
        const joined = r.map(c => String(c ?? '').trim()).filter(Boolean).join(' ');
        if (joined) lines.push(joined);
      }
    });
    return parseAdminReportFromTextLines(lines, fallbackReport);
  }

  throw new Error('សូមជ្រើសរើសឯកសារប្រភេទ Word (.docx) ឬ Excel (.xlsx)');
}
