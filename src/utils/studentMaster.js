// Student Master List & Fuzzy Name Matching Utility
import * as XLSX from 'xlsx';

// Official default student master list based on actual school records (80 students)
export const DEFAULT_STUDENT_MASTER = [
  // ថ្នាក់មត្តេយ្យ (15 នាក់)
  { id: 'm-1', name: 'ឃី ម៉េងលាភ', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-2', name: 'ឆាន មាសឆៃ', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-3', name: 'ឆាន រ៉ាយុទ្ធ', aliases: ['ឆាន់ រ៉ាយុទ្ធ'], grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-4', name: 'ឌី សុខហេង', aliases: ['ឌី សុកហេង'], grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-5', name: 'ឌឿន រ៉ាដូ', aliases: ['ឡឿន រ៉ាដូ'], grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-6', name: 'ថុង ចិន', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-7', name: 'នី ផានុត', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-8', name: 'បាវ ឈីន', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-9', name: 'បាវ សុខណា', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-10', name: 'ភេត សាវរី', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-11', name: 'យាន គូម៉ាន់', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-12', name: 'រិទ្ធ ធារ័ត្ម', aliases: ['រិទ្ធ ធារ័ត្ន', 'រិទ្ធិ ធារ័ត្ម'], grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-13', name: 'សាន ដារ៉ា', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-14', name: 'អេង គីមសាន', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-15', name: 'ថេង សុខឡូត', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },

  // ថ្នាក់ទី១ (14 នាក់)
  { id: 'g1-1', name: 'ខុំ វណ្ណេត', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-2', name: 'គីម សុភាព', aliases: ['គឹម សុភាព'], grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-3', name: 'ណាត សុធា', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-4', name: 'ណាត សូជីន', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-5', name: 'តួ បញ្ញា', aliases: ['តួរញ្ញា'], grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-6', name: 'ពោង ជីវ័ន្ត', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-7', name: 'ភាក់ សុខផាន', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-8', name: 'យ៉ុន រ័ត្ននា', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-9', name: 'វណ្ណា ដារ៉ា', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-10', name: 'ស៊ឹម ពិសិដ្ឋ', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-11', name: 'ស្រឿន សុខខា', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-12', name: 'ហ៊ាង ដារ៉ូ', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-13', name: 'ហុង វិច្ឆិកា', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g1-14', name: 'ហ៊ុំ រ៉ានុ', grade: '១', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },

  // ថ្នាក់ទី២ (30 នាក់)
  { id: 'g2-1', name: 'ឃិន ស៊ិវម៉ិញ', aliases: ['ឃិន សៀវម៉ិញ', 'ឃិន សៀវមិញ', 'ឃិន សៀវម៉ីញ', 'គិន ស៊ិវម៉ិញ', 'ឃិន ស៊ីវម៉ិញ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-2', name: 'ចាន់ ឆៃអ៊ង', aliases: ['ចាន់ ឆៃអ៊័ង', 'ឆាន ឆៃអ៊ង', 'ចាន់ ឆៃអង', 'ឆាន ឆៃអង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-3', name: 'ចាន់ណា រ៉ាបូ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  {
    id: 'g2-4',
    name: 'ឆេងអាន ឈាងហេង',
    aliases: [
      'ឆេង អានឈាងហេង',
      'ឆេងអាន ឈាងហេង',
      'ឆេង អានលាងហេង',
      'ឈេង អានលាងហេង',
      'ឈេងអាន លាងហេង',
      'ឈេងអាន ឈាងហេង',
      'ឈេង អានឈាងហេង',
      'ឆេងអាន លាងហេង'
    ],
    grade: '២',
    gender: 'សមណសិស្ស',
    monkStatus: 'សាមណេរ'
  },
  { id: 'g2-5', name: 'ជួង ចិត្រា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-6', name: 'ឈុនហ៊ាង គីមហុង', aliases: ['ឈុន ហ៊ាងគីមហុង', 'ឈុនហ៊ាង គឹមហុង', 'ឆុនហ៊ាង គីមហុង', 'ហ៊ាង គឹមហុង', 'ហ៊ាង គីមហុង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-7', name: 'ណុន តាវ៉ាន់', aliases: ['ណុន តាវ៉ាន'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-8', name: 'ប៉ុនធឿន ឧត្តម', aliases: ['ប៊ិន ធឿនឧត្តម', 'ប៊ិនធឿន ឧត្តម', 'ប៊ុន ធឿនឧត្តម', 'ប៊ុនធឿន ឧត្តម'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-9', name: 'ថេង សុខលីន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-10', name: 'ពិសិដ្ធ សុបញ្ញា', aliases: ['ពិសិដ្ឋ សុបញ្ញា'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-11', name: 'ភាក់ សុភាព', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-12', name: 'ម៉េង ទិត្យ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-13', name: 'ម៉េង ទី', aliases: ['ម៉េងទី'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-14', name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា', aliases: ['ម៉េង ស្រ៊ីសីរ៉ា', 'ម៉េង ស្រីស៊ីរ៉ា', 'ម៉េង ស្រ៊ីសុីរ៉ា', 'ម៉េង ស្រីសុីរ៉ា'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-15', name: 'ម៉ែន សីហា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-16', name: 'មី ស៊ីនូ', aliases: ['មី សុីនូ', 'មី សីនូ', 'ម៉ី ស៊ីនូ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-17', name: 'យ៉េន ចាន់រ៉ា', aliases: ['យ៉េន ចានរ៉ា'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-18', name: 'រ៉េត ណារ៉ុង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-19', name: 'រ៉េន វ៉ានុន', aliases: ['រ៉េន វាន់នុន'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-20', name: 'លី ពីន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-21', name: 'ស៊ីម សុវណ្ណរាជ', aliases: ['ស៊ឹម សុវណ្ណរាជ', 'ស៊ិម សុវណ្ណរាជ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-22', name: 'សារ៉ាត់ ចិត្ត្រា', aliases: ['សារ៉ាត់ ចិត្រា'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-23', name: 'សុន ម៉ែងអ៊័ង', aliases: ['សុន ម៉េងអ៊័ង', 'សុន ម៉េងអ័ង', 'សុន ម៉េងអង', 'សុន ម៉ែងអង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-24', name: 'សេងលី ទីសា', aliases: ['សេង លីទីសា'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-25', name: 'ហេន សិលា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-26', name: 'ឡាយ ប៊ុនយ៉ុង', aliases: ['ឡាយ ប៉ុនយ៉ុង', 'លាយ ប៊ុនយ៉ុង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-27', name: 'ឡាយ វីរះ', aliases: ['ឡាយ វិរះ', 'ឡាយ វីរៈ', 'លាយ វីរះ', 'លាយ វីរៈ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-28', name: 'ឡេង ហេងលាន', aliases: ['លេង ហេងលាន', 'ឡេង ហេងលាង', 'លេង ហេងលាង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-29', name: 'អ៊ុន សារ៉េន', aliases: ['អុន សារ៉េន', 'អ៊ន សារ៉េន', 'ឯល សារ៉េន'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-30', name: 'អាន វឌ្ឍនា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },

  // ថ្នាក់ទី៣ (21 នាក់)
  { id: 'g3-1', name: 'ខុម បូរី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-2', name: 'ខុម ភក្ដី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-3', name: 'ឃុន លាងហៃ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-4', name: 'ចិន្តា តុលា', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-5', name: 'ជឿន សូវីត', aliases: ['ជឿន សុវីត', 'ជឿន សូវិត'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-6', name: 'ណា តិចគាង', aliases: ['ណា ទិចគាង', 'ណាត ធីណាង', 'ណា តិចកាង', 'ណា ទិចកាង'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-7', name: 'ណាក់ វាន់នី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-8', name: 'ទី ស៊ុយទ្រី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-9', name: 'ធន ដាវីត', aliases: ['ធន ដាវិត', 'ថន ដាវីត'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-10', name: 'ប៊ុន បេត', aliases: ['ប៊ុន ប៉េត'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-11', name: 'បាន សម្បត្តិ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-12', name: 'យិន លាព', aliases: ['យិន លាភ'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-13', name: 'រស់ ណារ៉ាន់', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-14', name: 'វី សេងហ៊ី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-15', name: 'វេង សុវណ្ណ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-16', name: 'ស៊ីម វ៉ាន់ណេត', aliases: ['ស៊ឹង វណ្ណេត'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-17', name: 'សីហា ជីវ៉ា', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-18', name: 'ហត់ ម៉េងហួង', aliases: ['ហ៊ត់ ម៉េងហួង'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-19', name: 'ហ៊ី រ៉ាឌី', aliases: ['ហី រ៉ាឌី'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-20', name: 'អ៊ល សំណាង', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-21', name: 'អេន ដាវីន', aliases: ['ធន ដាវីន'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Normalize grade string to standard Khmer grade ('មត្តេយ្យ', '១', '២', '៣')
 */
export function normalizeStudentGrade(gradeStr) {
  const g = String(gradeStr || '').trim();
  if (!g) return '';
  if (g.includes('មត្តេយ្យ') || g.includes('មតេយ្យ') || g.toLowerCase().includes('k')) return 'មត្តេយ្យ';
  if (g.includes('១') || g.includes('1') || g.includes('មួយ')) return '១';
  if (g.includes('២') || g.includes('2') || g.includes('ពីរ')) return '២';
  if (g.includes('៣') || g.includes('3') || g.includes('បី')) return '៣';
  return g;
}

/**
 * Strip printed form prefixes/titles and Line-2 monastery/school bleed around a handwritten student name,
 * and normalize Khmer Unicode vowel+diacritic ordering (e.g. សុី -> ស៊ី).
 */
export function cleanHandwrittenStudentName(rawName) {
  return String(rawName || '')
    // Normalize Khmer "ុ" + "ី/ិ/ឹ/ឺ" (common OCR/typing substitute for "៊" + vowel)
    .replace(/\u17BB([\u17B7\u17B8\u17B9\u17BA])/g, '\u17CA$1')
    // Normalize vowel before shifter (e.g. ី + ៊ -> ៊ + ី)
    .replace(/([\u17B7-\u17C5])([\u17C9\u17CA])/g, '$2$1')
    // Strip printed prefixes on Line 1 (including "ខ្ញុំបាទ/នាងខ្ញុំឈ្មោះ:")
    .replace(/^(ខ្ញុំបាទ\/នាងខ្ញុំឈ្មោះ|ខ្ញុំបាទ\/នាងខ្ញុំ|ខ្ញុំបាទសមណសិស្សឈ្មោះ|ខ្ញុំបាទ|នាងខ្ញុំឈ្មោះ|នាងខ្ញុំ|សមណសិស្សឈ្មោះ|សមណសិស្ស|សាមណេរ|ភិក្ខុ|ព្រះនាម|ឈ្មោះ|នាម)[\s៖:.…]*/gi, '')
    // Strip printed or handwritten suffixes from Line 1 ("ភេទ...", "អាយុ...", "ថ្នាក់ទី...") and Line 2 bleed ("កម្រង ហ៊ុន ណេង", "ពុទ្ធិកបឋមសិក្សា", "វត្តខេមវ័ន")
    .replace(/\s*(ភេទ|បព្វជិត|អាយុ|ជាសមណសិស្ស|ជាសិស្ស|ថ្នាក់ទី|នៃសាលា|ពុទ្ធិកបឋមសិក្សា|កម្រង|វត្តខេមវ័ន|ខេមវ័ន|បឹងកុក|ហ៊ុន\s*ណេង).*$/gi, '')
    .replace(/[៖:.…_()[\]«»"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize Khmer cursive pen-ink skeleton (collapsing visually similar vowels & faint pen diacritics)
 */
export function normalizeKhmerHandwritingSkeleton(str) {
  return cleanHandwrittenStudentName(str)
    .replace(/[\s\u200B.…]/g, '')
    .replace(/្ដ/g, '្ត')
    .replace(/ត្ត្រ/g, 'ត្រ')
    .replace(/ត្ត/g, 'ត')
    .replace(/[ិីឹឺ]/g, 'ិ')
    .replace(/[ុូួ]/g, 'ុ')
    .replace(/[េែៃ]/g, 'េ')
    .replace(/[ោៅ]/g, 'ោ')
    .replace(/[់័៏៌៉៊ំះ]/g, '');
}

/**
 * Normalize visually similar handwritten Khmer pen-ink consonants + vowels
 * (e.g. cursive loops ម/ប/ព, ជ/ឈ/ញ, ច/ឆ, ក/គ/ឃ, ដ/ឌ/ត/ទ/ធ, ន/ណ)
 */
export function normalizeKhmerPenVisualSkeleton(str) {
  return normalizeKhmerHandwritingSkeleton(str)
    .replace(/[ខគឃ]/g, 'ក')
    .replace(/[ឆជឈញ]/g, 'ច')
    .replace(/[ឌតទធថឋឍ]/g, 'ដ')
    .replace(/[ណ]/g, 'ន')
    .replace(/[ផពភ]/g, 'ប')
    .replace(/[ឡ]/g, 'ល');
}

/**
 * Compute visual & structural similarity (0.0 to 1.0) between two Khmer student names
 */
export function computeKhmerNameSimilarity(nameA, nameB) {
  const cleanA = cleanHandwrittenStudentName(nameA);
  const cleanB = cleanHandwrittenStudentName(nameB);
  const compactA = cleanA.replace(/[\s\u200B]/g, '');
  const compactB = cleanB.replace(/[\s\u200B]/g, '');
  if (!compactA || !compactB) return 0;
  if (compactA === compactB) return 1.0;

  const dist = levenshteinDistance(compactA, compactB);
  const maxLen = Math.max(compactA.length, compactB.length);
  const rawSim = maxLen > 0 ? 1 - (dist / maxLen) : 0;

  const skelA = normalizeKhmerHandwritingSkeleton(cleanA);
  const skelB = normalizeKhmerHandwritingSkeleton(cleanB);
  const skelDist = levenshteinDistance(skelA, skelB);
  const maxSkelLen = Math.max(skelA.length, skelB.length);
  const skelSim = maxSkelLen > 0 ? (1 - (skelDist / maxSkelLen)) * 0.97 : 0;

  const penA = normalizeKhmerPenVisualSkeleton(cleanA);
  const penB = normalizeKhmerPenVisualSkeleton(cleanB);
  const penDist = levenshteinDistance(penA, penB);
  const maxPenLen = Math.max(penA.length, penB.length);
  const penSim = maxPenLen > 0 ? (1 - (penDist / maxPenLen)) * 0.92 : 0;

  // Cursive 3-loop lookalike skeleton (in fast Khmer ballpoint pen ink, ឈ, ណ, and ញ share the same 3-loop baseline)
  const loopA = penA.replace(/ន/g, 'ច');
  const loopB = penB.replace(/ន/g, 'ច');
  const maxLoopLen = Math.max(loopA.length, loopB.length);
  const loopSim = maxLoopLen >= 6 ? (1 - (levenshteinDistance(loopA, loopB) / maxLoopLen)) * 0.89 : 0;

  // Word-by-word (Surname + Given Name) structural comparison
  const wordsA = cleanA.split(/\s+/).filter(Boolean);
  const wordsB = cleanB.split(/\s+/).filter(Boolean);
  let wordPartSim = 0;
  if (wordsA.length >= 2 && wordsB.length >= 2) {
    const surA = normalizeKhmerHandwritingSkeleton(wordsA[0]);
    const surB = normalizeKhmerHandwritingSkeleton(wordsB[0]);
    const givA = normalizeKhmerHandwritingSkeleton(wordsA.slice(1).join(''));
    const givB = normalizeKhmerHandwritingSkeleton(wordsB.slice(1).join(''));

    const surMax = Math.max(surA.length, surB.length);
    const givMax = Math.max(givA.length, givB.length);
    const surScore = surMax > 0 ? 1 - (levenshteinDistance(surA, surB) / surMax) : 0;
    const givScore = givMax > 0 ? 1 - (levenshteinDistance(givA, givB) / givMax) : 0;
    wordPartSim = (surScore * 0.48 + givScore * 0.52) * 0.96;
  }

  return Math.max(rawSim, skelSim, penSim, loopSim, wordPartSim);
}

/**
 * Fuzzy search to match an OCR extracted student name with master list.
 * Supports Grade-First priority, Two-Syllable (Surname + Given Name) matching, and Khmer Pen-Ink Cursive Skeleton matching.
 * @param {string} rawName 
 * @param {Array} studentList 
 * @param {string} extractedGrade
 * @returns {object|null} Matched student object or null
 */
export function matchStudentName(rawName, studentList = DEFAULT_STUDENT_MASTER, extractedGrade = '') {
  if (!rawName || !studentList || studentList.length === 0) return null;
  const strippedName = cleanHandwrittenStudentName(rawName);
  const cleanInput = strippedName.replace(/[\s\u200B]/g, '').trim();
  if (!cleanInput) return null;

  const normGrade = normalizeStudentGrade(extractedGrade);
  const skelInput = normalizeKhmerHandwritingSkeleton(strippedName);

  // 1. Exact match (preferring student in the same grade if extractedGrade is provided)
  const exactMatches = studentList.filter(s => {
    const sClean = s.name.replace(/[\s\u200B]/g, '');
    if (sClean === cleanInput) return true;
    if (s.aliases && s.aliases.some(a => a.replace(/[\s\u200B]/g, '') === cleanInput)) return true;
    return false;
  });
  if (exactMatches.length > 0) {
    const sameGradeExact = normGrade ? exactMatches.find(s => s.grade === normGrade) : null;
    if (sameGradeExact) {
      return { student: sameGradeExact, confidence: 1.0, isExact: true };
    }
    // If exact match is in a different grade than the slip's grade, still return it but with slightly lower confidence if grade conflicts
    return {
      student: exactMatches[0],
      confidence: normGrade ? 0.91 : 1.0,
      isExact: !normGrade
    };
  }

  // 2. Exact Khmer Handwriting Skeleton match (when only faint pen diacritics/vowels differ, e.g. ៉/៊ or ិ/ី or សុី/ស៊ី)
  if (skelInput.length >= 3) {
    const skelMatches = studentList.filter(s => {
      const candidates = [s.name, ...(s.aliases || [])];
      return candidates.some(c => normalizeKhmerHandwritingSkeleton(c) === skelInput);
    });
    if (skelMatches.length === 1) {
      const isRightGrade = !normGrade || skelMatches[0].grade === normGrade;
      return { student: skelMatches[0], confidence: isRightGrade ? 0.97 : 0.88, isExact: false };
    } else if (skelMatches.length > 1 && normGrade) {
      const gradeFiltered = skelMatches.filter(s => s.grade === normGrade);
      if (gradeFiltered.length === 1) return { student: gradeFiltered[0], confidence: 0.97, isExact: false };
    }
  }

  // 2.5. Phonetic / Homophone Consonant Skeleton match for young novices who confuse similar sounds
  //      (e.g. ឆ↔ឈ↔ជ↔ច: writing "ឈេងអាន ឈាងហេង" for "ឆេងអាន ឈាងហេង", គ↔ឃ, ណ↔ន, ដ↔ឌ↔ត↔ទ↔ធ, ល↔ឡ)
  const penInput = normalizeKhmerPenVisualSkeleton(strippedName);
  if (penInput.length >= 4) {
    const penMatches = studentList.filter(s => {
      const candidates = [s.name, ...(s.aliases || [])];
      return candidates.some(c => normalizeKhmerPenVisualSkeleton(c) === penInput);
    });
    if (penMatches.length === 1) {
      const isRightGrade = !normGrade || penMatches[0].grade === normGrade;
      return { student: penMatches[0], confidence: isRightGrade ? 0.96 : 0.87, isExact: false };
    } else if (penMatches.length > 1 && normGrade) {
      const gradeFiltered = penMatches.filter(s => s.grade === normGrade);
      if (gradeFiltered.length === 1) return { student: gradeFiltered[0], confidence: 0.96, isExact: false };
    }
  }

  // 3. Substring match (Only when input contains full student name e.g. "សមណសិស្ស ណា ទិចគាង" or high overlap)
  const subMatches = studentList.filter(s => {
    const sClean = s.name.replace(/[\s\u200B]/g, '');
    const candidates = [sClean, ...(s.aliases || []).map(a => a.replace(/[\s\u200B]/g, ''))];
    return candidates.some(candidate => {
      if (cleanInput.includes(candidate) && candidate.length >= 4) return true;
      if (candidate.includes(cleanInput) && cleanInput.length >= candidate.length * 0.85) return true;
      return false;
    });
  });
  if (subMatches.length === 1) {
    const isRightGrade = !normGrade || subMatches[0].grade === normGrade;
    return { student: subMatches[0], confidence: isRightGrade ? 0.92 : 0.84, isExact: false };
  } else if (subMatches.length > 1 && normGrade) {
    const gradeSub = subMatches.find(s => s.grade === normGrade) || subMatches[0];
    return { student: gradeSub, confidence: 0.93, isExact: false };
  }

  // 3.5. Grade + Unique Given-Name Match (when cursive surname is hard to read, e.g. "ឯល សារ៉េន" -> "អ៊ុន សារ៉េន" in Grade 2)
  const inputWords = strippedName.split(/\s+/).filter(Boolean);
  if (normGrade && inputWords.length >= 2) {
    const inputGivenSkel = normalizeKhmerHandwritingSkeleton(inputWords.slice(1).join(''));
    if (inputGivenSkel.length >= 3) {
      const sameGradeStudents = studentList.filter(s => s.grade === normGrade);
      const uniqueGivenMatches = sameGradeStudents.filter(s => {
        const candidates = [s.name, ...(s.aliases || [])];
        return candidates.some(cand => {
          const cWords = cleanHandwrittenStudentName(cand).split(/\s+/).filter(Boolean);
          if (cWords.length < 2) return false;
          const cGivenSkel = normalizeKhmerHandwritingSkeleton(cWords.slice(1).join(''));
          if (!cGivenSkel) return false;
          if (cGivenSkel === inputGivenSkel) return true;
          const maxLen = Math.max(cGivenSkel.length, inputGivenSkel.length);
          const sim = maxLen > 0 ? 1 - (levenshteinDistance(cGivenSkel, inputGivenSkel) / maxLen) : 0;
          return sim >= 0.85;
        });
      });
      if (uniqueGivenMatches.length === 1) {
        return { student: uniqueGivenMatches[0], confidence: 0.89, isExact: false };
      }
    }
  }

  // 3.6. Grade + Unique Multi-Syllable Prefix Match (when a 3- or 4-syllable name squeezes its last syllable
  //      against printed "ភេទ:" on Line 1, e.g. reading "ឈាង អាន ណាង" / "ឈេងអាន ឈាង" for "ឆេងអាន ឈាងហេង" in Grade 2)
  const inputLoopSkel = normalizeKhmerPenVisualSkeleton(strippedName).replace(/ន/g, 'ច');
  if (normGrade && inputLoopSkel.length >= 7) {
    const sameGradeStudents = studentList.filter(s => s.grade === normGrade);
    const uniquePrefixMatches = sameGradeStudents.filter(s => {
      const candidates = [s.name, ...(s.aliases || [])];
      return candidates.some(cand => {
        const candLoop = normalizeKhmerPenVisualSkeleton(cand).replace(/ន/g, 'ច');
        if (candLoop.length < inputLoopSkel.length || candLoop.length > inputLoopSkel.length + 4) return false;
        const candPrefix = candLoop.slice(0, inputLoopSkel.length);
        const sim = 1 - (levenshteinDistance(inputLoopSkel, candPrefix) / inputLoopSkel.length);
        return sim >= 0.85;
      });
    });
    if (uniquePrefixMatches.length === 1) {
      return { student: uniquePrefixMatches[0], confidence: 0.91, isExact: false };
    }
  }

  // 4. Grade-First + Two-Syllable + Khmer Cursive Skeleton Fuzzy Match
  let bestMatch = null;
  let bestScore = 0;

  for (const s of studentList) {
    const namesToTest = [s.name, ...(s.aliases || [])];
    for (const nameCandidate of namesToTest) {
      let combinedScore = computeKhmerNameSimilarity(strippedName, nameCandidate);

      // Apply strong Grade-First Bonus/Penalty when grade was read from the slip
      if (normGrade) {
        if (s.grade === normGrade) {
          combinedScore = Math.min(0.99, combinedScore + 0.08);
        } else if (combinedScore < 0.92) {
          combinedScore = Math.max(0, combinedScore - 0.12);
        }
      }

      if (combinedScore > bestScore && combinedScore >= 0.72) {
        bestScore = combinedScore;
        bestMatch = { student: s, confidence: combinedScore, isExact: false };
      }
    }
  }

  return bestMatch;
}

/**
 * Rank the closest official roster students for one or more raw OCR handwriting readings
 * (Line 1 pen-ink name + bottom-right signature name), preferring the slip's grade.
 * Used to fill / suggest a student when the deterministic matcher is below its strict threshold,
 * so the name box is never left completely blank when AI did read handwriting.
 *
 * @param {string|string[]} rawNames
 * @param {Array} studentList
 * @param {string} extractedGrade
 * @param {number} limit
 * @returns {Array<{ student: object, score: number, sameGrade: boolean }>}
 */
export function getClosestStudentsByOcr(rawNames, studentList = DEFAULT_STUDENT_MASTER, extractedGrade = '', limit = 4) {
  const readings = (Array.isArray(rawNames) ? rawNames : [rawNames])
    .map(n => cleanHandwrittenStudentName(n))
    .filter(n => n.replace(/[\s\u200B]/g, '').length >= 2);
  if (readings.length === 0 || !Array.isArray(studentList) || studentList.length === 0) return [];

  const normGrade = normalizeStudentGrade(extractedGrade);
  const ranked = [];
  for (const s of studentList) {
    const candidates = [s.name, ...(s.aliases || [])];
    let best = 0;
    for (const reading of readings) {
      for (const cand of candidates) {
        const sim = computeKhmerNameSimilarity(reading, cand);
        if (sim > best) best = sim;
      }
    }
    const sameGrade = Boolean(normGrade) && s.grade === normGrade;
    let score = best;
    if (normGrade) {
      score = sameGrade ? Math.min(0.99, best + 0.08) : Math.max(0, best - 0.12);
    }
    ranked.push({ student: s, score, sameGrade });
  }

  return ranked
    .sort((a, b) => (b.score - a.score) || (Number(b.sameGrade) - Number(a.sameGrade)))
    .slice(0, Math.max(1, limit));
}

/**
 * Khmer Consonant Phonetic / Homophone Groups (ក្រុមព្យញ្ជនៈមានសម្លេងស្រដៀងគ្នា)
 */
export const KHMER_PHONETIC_MAP = {
  'ក': ['ខ', 'គ', 'ឃ', 'ង'],
  'ខ': ['ក', 'ឃ', 'គ'],
  'គ': ['ក', 'ឃ', 'ខ', 'ង'],
  'ឃ': ['គ', 'ខ', 'ក'],
  'ង': ['ក', 'គ', 'ញ'],

  'ច': ['ឆ', 'ជ', 'ឈ', 'ញ'],
  'ឆ': ['ច', 'ឈ', 'ជ'],
  'ជ': ['ច', 'ឈ', 'ឆ', 'ញ'],
  'ឈ': ['ជ', 'ឆ', 'ច'],
  'ញ': ['ច', 'ជ', 'ន', 'ណ'],

  'ដ': ['ឌ', 'ត', 'ទ', 'ឋ', 'ឍ'],
  'ឋ': ['ថ', 'ដ', 'ត'],
  'ឌ': ['ដ', 'ទ', 'ត', 'ធ'],
  'ឍ': ['ធ', 'ឌ', 'ថ'],
  'ណ': ['ន', 'ញ'],

  'ត': ['ថ', 'ទ', 'ធ', 'ដ', 'ឌ'],
  'ថ': ['ត', 'ធ', 'ទ', 'ឋ'],
  'ទ': ['ត', 'ធ', 'ថ', 'ឌ', 'ដ'],
  'ធ': ['ទ', 'ថ', 'ត', 'ឍ', 'ឌ'],
  'ន': ['ណ', 'ញ'],

  'ប': ['ផ', 'ព', 'ភ', 'ម'],
  'ផ': ['ប', 'ភ', 'ព'],
  'ព': ['ប', 'ភ', 'ផ', 'វ'],
  'ភ': ['ព', 'ផ', 'ប'],
  'ម': ['ប', 'ព', 'វ'],

  'យ': ['រ', 'ល', 'វ'],
  'រ': ['ល', 'ឡ', 'យ', 'វ'],
  'ល': ['ឡ', 'រ', 'យ'],
  'វ': ['ព', 'ប', 'រ', 'យ'],
  'ឡ': ['ល', 'រ'],

  'ស': ['ហ', 'អ', 'ឆ'],
  'ហ': ['ស', 'អ'],
  'អ': ['ហ', 'ស']
};

/**
 * Normalize Khmer vowels/diacritics that are commonly confused when typing quickly
 * (e.g. ឈី vs ឈឺ vs ឈឹ, ់ vs ័)
 */
function normalizeKhmerPhoneticString(str) {
  return String(str || '')
    .replace(/[\s\u200B]/g, '')
    .replace(/[ីឹឺ]/g, 'ី')
    .replace(/[ុូួ]/g, 'ុ')
    .replace(/[េែៃ]/g, 'េ')
    .replace(/[ោៅ]/g, 'ោ')
    .replace(/[់័៏៌]/g, '');
}

/**
 * Suggest student names based on:
 *  1. Direct prefix / word-start match (e.g., typing "ច" suggests names starting with "ច")
 *  2. Phonetic consonant group match (e.g., typing "ច" suggests names starting with "ឆ, ជ, ឈ")
 *
 * @param {string} rawQuery
 * @param {Array} studentList
 * @returns {{ exactMatches: Array, phoneticMatches: Array, similarConsonants: Array }}
 */
export function getPhoneticStudentSuggestions(rawQuery, studentList = DEFAULT_STUDENT_MASTER) {
  if (!studentList || studentList.length === 0) {
    return { exactMatches: [], phoneticMatches: [], similarConsonants: [] };
  }

  const trimmed = String(rawQuery || '').replace(/\u200B/g, '').trim();
  if (!trimmed) {
    return { exactMatches: [], phoneticMatches: [], similarConsonants: [] };
  }

  const cleanQuery = trimmed.replace(/\s+/g, '');
  const normQuery = normalizeKhmerPhoneticString(cleanQuery);
  const firstChar = cleanQuery.charAt(0);
  const similarConsonants = KHMER_PHONETIC_MAP[firstChar] || [];

  const exactSurnameMatches = [];
  const exactGivenMatches = [];
  const exactContainsMatches = [];
  const usedIds = new Set();

  // Pass 1: Direct Prefix & Substring Matches
  for (const s of studentList) {
    const fullClean = s.name.replace(/[\s\u200B]/g, '');
    const parts = s.name.trim().split(/\s+/);
    const surname = parts[0] || '';
    const givenName = parts.slice(1).join('') || '';
    const aliases = s.aliases || [];

    if (
      surname.startsWith(cleanQuery) ||
      fullClean.startsWith(cleanQuery) ||
      aliases.some(a => a.replace(/[\s\u200B]/g, '').startsWith(cleanQuery))
    ) {
      exactSurnameMatches.push(s);
      usedIds.add(s.id || s.name);
    } else if (
      givenName.startsWith(cleanQuery) ||
      parts.some(p => p.startsWith(cleanQuery))
    ) {
      exactGivenMatches.push(s);
      usedIds.add(s.id || s.name);
    } else if (
      fullClean.includes(cleanQuery) ||
      normalizeKhmerPhoneticString(fullClean).startsWith(normQuery) ||
      aliases.some(a => a.replace(/[\s\u200B]/g, '').includes(cleanQuery))
    ) {
      exactContainsMatches.push(s);
      usedIds.add(s.id || s.name);
    }
  }

  const exactMatches = [
    ...exactSurnameMatches,
    ...exactGivenMatches,
    ...exactContainsMatches
  ];

  // Pass 2: Phonetic / Homophone Consonant Group Matches (e.g. ច -> ឆ, ជ, ឈ)
  const phoneticSurnameMatches = [];
  const phoneticGivenMatches = [];

  if (similarConsonants.length > 0) {
    const restOfQuery = cleanQuery.slice(1);
    const normRest = normalizeKhmerPhoneticString(restOfQuery);

    // Order by similarConsonants priority
    for (const simChar of similarConsonants) {
      const altQuery = simChar + restOfQuery;
      const normAltQuery = simChar + normRest;

      for (const s of studentList) {
        const key = s.id || s.name;
        if (usedIds.has(key)) continue;

        const fullClean = s.name.replace(/[\s\u200B]/g, '');
        const parts = s.name.trim().split(/\s+/);
        const surname = parts[0] || '';
        const givenName = parts.slice(1).join('') || '';
        const normFull = normalizeKhmerPhoneticString(fullClean);
        const normGiven = normalizeKhmerPhoneticString(givenName);

        if (
          surname.startsWith(altQuery) ||
          fullClean.startsWith(altQuery) ||
          normFull.startsWith(normAltQuery) ||
          (cleanQuery.length <= 2 && surname.startsWith(simChar))
        ) {
          phoneticSurnameMatches.push(s);
          usedIds.add(key);
        } else if (
          givenName.startsWith(altQuery) ||
          normGiven.startsWith(normAltQuery) ||
          (cleanQuery.length === 1 && givenName.startsWith(simChar))
        ) {
          phoneticGivenMatches.push(s);
          usedIds.add(key);
        }
      }
    }
  }

  const phoneticMatches = [
    ...phoneticSurnameMatches,
    ...phoneticGivenMatches
  ];

  return {
    exactMatches: exactMatches.slice(0, 8),
    phoneticMatches: phoneticMatches.slice(0, 8),
    similarConsonants: similarConsonants.slice(0, 4)
  };
}

/**
 * Extract 100% real historical leave reasons from actual app records (Zero fabricated reasons)
 * and filter/rank them based on user input (including phonetic/vowel tolerance).
 *
 * @param {string} rawQuery
 * @param {object} sources - { allLeaves, trainingDataset, queue }
 * @returns {Array<string>}
 */
export function getRealReasonSuggestions(rawQuery, { allLeaves = {}, trainingDataset = [], queue = [] } = {}) {
  const reasonCounts = new Map();

  const recordReason = (r, weight = 1) => {
    const clean = String(r || '').replace(/\s+/g, ' ').trim();
    if (!clean || clean.length < 2) return;
    reasonCounts.set(clean, (reasonCounts.get(clean) || 0) + weight);
  };

  // 1. From all saved monthly leave records in appState.leaves (real historical data)
  if (allLeaves && typeof allLeaves === 'object') {
    Object.values(allLeaves).forEach(monthList => {
      if (Array.isArray(monthList)) {
        monthList.forEach(item => {
          if (item && item.reason) recordReason(item.reason, 2);
        });
      }
    });
  }

  // 2. From verified training dataset (real approved leave slips)
  if (Array.isArray(trainingDataset)) {
    trainingDataset.forEach(sample => {
      if (sample?.docType === 'leave' && sample?.groundTruth?.reason) {
        recordReason(sample.groundTruth.reason, 2);
      }
    });
  }

  // 3. From current scanned queue items (if processed)
  if (Array.isArray(queue)) {
    queue.forEach(q => {
      const r = q?.processedData?.leaveItems?.[0]?.reason || q?.processedData?.result?.leaveItems?.[0]?.reason;
      if (r && q?.status === 'processed') {
        recordReason(r, 1);
      }
    });
  }

  // Sort all real reasons by frequency descending
  const allRealReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => reason);

  const trimmed = String(rawQuery || '').replace(/\u200B/g, '').trim();
  if (!trimmed) {
    return allRealReasons;
  }

  const cleanQuery = trimmed.replace(/\s+/g, '');
  const normQuery = normalizeKhmerPhoneticString(cleanQuery);
  const firstChar = cleanQuery.charAt(0);
  const similarConsonants = KHMER_PHONETIC_MAP[firstChar] || [];

  const startsWithMatches = [];
  const containsMatches = [];
  const phoneticMatches = [];

  for (const reason of allRealReasons) {
    const cleanReason = reason.replace(/\s+/g, '');
    const normReason = normalizeKhmerPhoneticString(cleanReason);

    if (
      reason.startsWith(trimmed) ||
      cleanReason.startsWith(cleanQuery) ||
      normReason.startsWith(normQuery)
    ) {
      startsWithMatches.push(reason);
    } else if (
      reason.includes(trimmed) ||
      cleanReason.includes(cleanQuery) ||
      normReason.includes(normQuery)
    ) {
      containsMatches.push(reason);
    } else {
      // Check if individual words in query (e.g. "អាពាធ ឈី") match words in reason with phonetic/vowel tolerance
      const queryWords = trimmed.split(/\s+/).filter(Boolean);
      const allWordsMatch = queryWords.length > 0 && queryWords.every(qw => {
        const normQw = normalizeKhmerPhoneticString(qw);
        if (normReason.includes(normQw)) return true;
        const qwFirst = qw.charAt(0);
        const qwSim = KHMER_PHONETIC_MAP[qwFirst] || [];
        return qwSim.some(sc => normReason.includes(sc + normQw.slice(1)));
      });

      if (allWordsMatch) {
        phoneticMatches.push(reason);
      } else if (
        similarConsonants.some(sc =>
          cleanReason.startsWith(sc + cleanQuery.slice(1)) ||
          normReason.includes(sc + normQuery.slice(1))
        )
      ) {
        phoneticMatches.push(reason);
      }
    }
  }

  const combined = [...startsWithMatches, ...containsMatches, ...phoneticMatches];
  return combined.length > 0 ? combined : allRealReasons;
}

/**
 * Parse uploaded Excel or CSV file containing student names
 * @param {File} file 
 * @returns {Promise<Array>} List of students
 */
export function parseStudentFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          resolve([]);
          return;
        }

        const students = [];
        // Detect header row index
        let headerRowIndex = 0;
        let nameColIdx = 0;
        let gradeColIdx = 1;

        for (let r = 0; r < Math.min(rawJson.length, 5); r++) {
          const row = rawJson[r];
          if (!row) continue;
          row.forEach((cell, c) => {
            const str = String(cell || '');
            if (str.includes('ឈ្មោះ') || str.includes('នាម') || str.toLowerCase().includes('name')) {
              nameColIdx = c;
              headerRowIndex = r;
            }
            if (str.includes('ថ្នាក់') || str.toLowerCase().includes('grade') || str.toLowerCase().includes('class')) {
              gradeColIdx = c;
            }
          });
        }

        // Read records starting after header
        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || !row[nameColIdx]) continue;
          const name = String(row[nameColIdx]).trim();
          const grade = row[gradeColIdx] !== undefined ? String(row[gradeColIdx]).trim() : '១';
          if (name.length > 1) {
            students.push({
              id: `imported-${Date.now()}-${r}`,
              name,
              grade,
              gender: 'សមណសិស្ស',
              monkStatus: 'សាមណេរ'
            });
          }
        }

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normalize Khmer phonetic sound groups for live autocomplete recommendation
 * (e.g. typing "ក" also recommends students starting with or containing ក, ខ, គ, ឃ)
 */
function normalizeKhmerPhoneticSoundGroup(str) {
  return normalizeKhmerHandwritingSkeleton(str)
    .replace(/[ខគឃ]/g, 'ក')
    .replace(/[ឆជឈញ]/g, 'ច')
    .replace(/[ឌតទធថឋឍ]/g, 'ដ')
    .replace(/[ណ]/g, 'ន')
    .replace(/[ផពភ]/g, 'ប')
    .replace(/[ឡ]/g, 'ល');
}

/**
 * Recommend students from the 80-student master roster based on character prefix,
 * substring, vowel skeleton, or phonetic sound similarity (e.g. typing "ក" recommends ក/គ/ឃ/ខ).
 *
 * @param {string} query - User's typed query
 * @param {Array} studentList - Full 80-student master array
 * @param {number} limit - Max number of recommendations to return
 * @returns {Array<{ student: object, score: number, matchReason: string }>}
 */
export function recommendStudentsByPhoneticQuery(query, studentList = DEFAULT_STUDENT_MASTER, limit = 20) {
  const list = Array.isArray(studentList) && studentList.length > 0 ? studentList : DEFAULT_STUDENT_MASTER;
  const rawQuery = String(query || '').trim();
  if (!rawQuery) {
    return list.slice(0, limit).map(student => ({
      student,
      score: 50,
      matchReason: 'បញ្ជីសមណសិស្ស'
    }));
  }

  const compactQuery = rawQuery.replace(/[\s\u200B]/g, '');
  const skelQuery = normalizeKhmerHandwritingSkeleton(rawQuery);
  const phoneticQuery = normalizeKhmerPhoneticSoundGroup(rawQuery);

  const scored = [];

  for (const student of list) {
    const candidates = [student.name, ...(student.aliases || [])].filter(Boolean);
    let bestScore = 0;
    let bestReason = '';

    for (const cand of candidates) {
      const words = cand.trim().split(/\s+/).filter(Boolean);
      const compactCand = cand.replace(/[\s\u200B]/g, '');
      const skelCand = normalizeKhmerHandwritingSkeleton(cand);
      const phoneticCand = normalizeKhmerPhoneticSoundGroup(cand);

      // 1. Exact word prefix (Surname or Given Name starts with query)
      if (words.some(w => w.startsWith(compactQuery)) || compactCand.startsWith(compactQuery)) {
        if (100 > bestScore) {
          bestScore = 100;
          bestReason = 'ត្រូវអក្សរដើម';
        }
        continue;
      }

      // 2. Vowel-skeleton word prefix
      if (skelQuery) {
        const wordSkels = words.map(w => normalizeKhmerHandwritingSkeleton(w));
        if (wordSkels.some(ws => ws.startsWith(skelQuery)) || skelCand.startsWith(skelQuery)) {
          if (94 > bestScore) {
            bestScore = 94;
            bestReason = 'ស្រដៀងស្រៈ';
          }
          continue;
        }
      }

      // 3. Phonetic sound group word-initial match (e.g. typing "ក" matches words starting with ក, គ, ឃ, ខ)
      if (phoneticQuery) {
        const wordPhonetics = words.map(w => normalizeKhmerPhoneticSoundGroup(w));
        if (wordPhonetics.some(wp => wp.startsWith(phoneticQuery)) || phoneticCand.startsWith(phoneticQuery)) {
          if (88 > bestScore) {
            bestScore = 88;
            bestReason = 'សំនឿងស្រដៀង';
          }
          continue;
        }
      }

      // 4. Exact substring anywhere in name
      if (compactCand.includes(compactQuery)) {
        if (78 > bestScore) {
          bestScore = 78;
          bestReason = 'ត្រូវតួអក្សរ';
        }
        continue;
      }

      // 5. Vowel-skeleton substring
      if (skelQuery && skelCand.includes(skelQuery)) {
        if (72 > bestScore) {
          bestScore = 72;
          bestReason = 'ស្រដៀងស្រៈ';
        }
        continue;
      }

      // 6. Phonetic sound group substring
      if (phoneticQuery && phoneticCand.includes(phoneticQuery)) {
        if (66 > bestScore) {
          bestScore = 66;
          bestReason = 'សំនឿងស្រដៀង';
        }
        continue;
      }

      // 5. Fuzzy similarity for 2+ character queries
      if (compactQuery.length >= 2) {
        const sim = computeKhmerNameSimilarity(rawQuery, cand);
        if (sim >= 0.45) {
          const simScore = Math.round(sim * 72);
          if (simScore > bestScore) {
            bestScore = simScore;
            bestReason = 'សំនឿងស្រដៀង';
          }
        }
      }
    }

    if (bestScore > 0) {
      scored.push({
        student,
        score: bestScore,
        matchReason: bestReason
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.student.name.localeCompare(b.student.name, 'km'));
  return scored.slice(0, limit);
}
