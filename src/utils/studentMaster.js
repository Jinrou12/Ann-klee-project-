// Student Master List & Fuzzy Name Matching Utility
import * as XLSX from 'xlsx';

// Official default student master list based on actual school records (80 students)
export const DEFAULT_STUDENT_MASTER = [
  // ថ្នាក់មត្តេយ្យ (15 នាក់)
  { id: 'm-1', name: 'ឃី ម៉េងលាភ', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-2', name: 'ឆាន មាសឆៃ', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-3', name: 'ឆាន រ៉ាយុទ្ធ', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'm-4', name: 'ឌី សុខហេង', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
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
  { id: 'g2-1', name: 'ឃិន ស៊ិវម៉ិញ', aliases: ['ឃិន សៀវម៉ិញ', 'គិន ស៊ិវម៉ិញ', 'ឃិន ស៊ីវម៉ិញ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-2', name: 'ចាន់ ឆៃអ៊ង', aliases: ['ឆាន ឆៃអ៊ង', 'ចាន់ ឆៃអង', 'ឆាន ឆៃអង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-3', name: 'ចាន់ណា រ៉ាបូ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-4', name: 'ឆេងអាន ឈាងហេង', aliases: ['ឆេង អានឈាងហេង', 'ឆេងអាន ឈាងហេង'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-5', name: 'ជួង ចិត្រា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-6', name: 'ឈុនហ៊ាង គីមហុង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-7', name: 'ណុន តាវ៉ាន់', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-8', name: 'ប៉ុនធឿន ឧត្តម', aliases: ['ប៊ិន ធឿនឧត្តម', 'ប៊ិនធឿន ឧត្តម'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-9', name: 'ថេង សុខលីន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-10', name: 'ពិសិដ្ធ សុបញ្ញា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-11', name: 'ភាក់ សុភាព', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-12', name: 'ម៉េង ទិត្យ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-13', name: 'ម៉េង ទី', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-14', name: 'ម៉េង ស្រ៊ីស៊ីរ៉ា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-15', name: 'ម៉ែន សីហា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-16', name: 'មី ស៊ីនូ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-17', name: 'យ៉េន ចាន់រ៉ា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-18', name: 'រ៉េត ណារ៉ុង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-19', name: 'រ៉េន វ៉ានុន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-20', name: 'លី ពីន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-21', name: 'ស៊ីម សុវណ្ណរាជ', aliases: ['ស៊ឹម សុវណ្ណរាជ', 'ស៊ិម សុវណ្ណរាជ'], grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-22', name: 'សារ៉ាត់ ចិត្ត្រា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-23', name: 'សុន ម៉ែងអ៊័ង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-24', name: 'សេងលី ទីសា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-25', name: 'ហេន សិលា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-26', name: 'ឡាយ ប៊ុនយ៉ុង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-27', name: 'ឡាយ វីរះ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-28', name: 'ឡេង ហេងលាន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-29', name: 'អ៊ុន សារ៉េន', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-30', name: 'អាន វឌ្ឍនា', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },

  // ថ្នាក់ទី៣ (21 នាក់)
  { id: 'g3-1', name: 'ខុម បូរី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-2', name: 'ខុម ភក្ដី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-3', name: 'ឃុន លាងហៃ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-4', name: 'ចិន្តា តុលា', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-5', name: 'ជឿន សូវីត', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-6', name: 'ណា តិចគាង', aliases: ['ណា ទិចគាង', 'ណាត ធីណាង', 'ណា តិចកាង', 'ណា ទិចកាង'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-7', name: 'ណាក់ វាន់នី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-8', name: 'ទី ស៊ុយទ្រី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-9', name: 'ធន ដាវីត', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-10', name: 'ប៊ុន បេត', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-11', name: 'បាន សម្បត្តិ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-12', name: 'យិន លាព', aliases: ['យិន លាភ'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-13', name: 'រស់ ណារ៉ាន់', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'ភិក្ខុ' },
  { id: 'g3-14', name: 'វី សេងហ៊ី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-15', name: 'វេង សុវណ្ណ', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-16', name: 'ស៊ីម វ៉ាន់ណេត', aliases: ['ស៊ឹង វណ្ណេត'], grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-17', name: 'សីហា ជីវ៉ា', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-18', name: 'ហត់ ម៉េងហួង', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-19', name: 'ហ៊ី រ៉ាឌី', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-20', name: 'អ៊ល សំណាង', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g3-21', name: 'អេន ដាវីន', grade: '៣', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
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
 * Strip printed form prefixes/titles around a handwritten student name
 */
export function cleanHandwrittenStudentName(rawName) {
  return String(rawName || '')
    .replace(/^(ខ្ញុំបាទ|នាងខ្ញុំ|សមណសិស្សឈ្មោះ|សមណសិស្ស|សាមណេរ|ភិក្ខុ|ព្រះនាម|ឈ្មោះ|នាម)[\s៖:.…]*/gi, '')
    .replace(/[៖:.…_()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize Khmer cursive pen-ink skeleton (collapsing visually similar vowels & faint pen diacritics)
 */
function normalizeKhmerHandwritingSkeleton(str) {
  return String(str || '')
    .replace(/[\s\u200B.…]/g, '')
    .replace(/្ដ/g, '្ត')
    .replace(/[ិីឹឺ]/g, 'ិ')
    .replace(/[ុូួ]/g, 'ុ')
    .replace(/[េែៃ]/g, 'េ')
    .replace(/[ោៅ]/g, 'ោ')
    .replace(/[់័៏៌៉៊ំះ]/g, '');
}

/**
 * Fuzzy search to match an OCR extracted student name with master list.
 * Supports Grade-First priority and Khmer Pen-Ink Cursive Skeleton matching.
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

  // 1. Exact match (ignoring whitespace and checking aliases)
  const exact = studentList.find(s => {
    const sClean = s.name.replace(/[\s\u200B]/g, '');
    if (sClean === cleanInput) return true;
    if (s.aliases && s.aliases.some(a => a.replace(/[\s\u200B]/g, '') === cleanInput)) return true;
    return false;
  });
  if (exact) return { student: exact, confidence: 1.0, isExact: true };

  // 2. Exact Khmer Handwriting Skeleton match (when only faint pen diacritics/vowels differ, e.g. ៉/៊ or ិ/ី)
  if (skelInput.length >= 4) {
    const skelMatches = studentList.filter(s => {
      const candidates = [s.name, ...(s.aliases || [])];
      return candidates.some(c => normalizeKhmerHandwritingSkeleton(c) === skelInput);
    });
    if (skelMatches.length === 1) {
      return { student: skelMatches[0], confidence: 0.95, isExact: false };
    } else if (skelMatches.length > 1 && normGrade) {
      const gradeFiltered = skelMatches.find(s => s.grade === normGrade);
      if (gradeFiltered) return { student: gradeFiltered, confidence: 0.96, isExact: false };
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
    return { student: subMatches[0], confidence: 0.90, isExact: false };
  } else if (subMatches.length > 1 && normGrade) {
    const gradeSub = subMatches.find(s => s.grade === normGrade) || subMatches[0];
    return { student: gradeSub, confidence: 0.92, isExact: false };
  }

  // 4. Grade-Aware + Khmer Cursive Skeleton & Levenshtein Fuzzy Match
  let bestMatch = null;
  let bestScore = 0;

  for (const s of studentList) {
    const namesToTest = [s.name, ...(s.aliases || [])];
    for (const nameCandidate of namesToTest) {
      const sClean = nameCandidate.replace(/[\s\u200B]/g, '');
      const dist = levenshteinDistance(cleanInput, sClean);
      const maxLen = Math.max(cleanInput.length, sClean.length);
      const rawSim = maxLen > 0 ? 1 - (dist / maxLen) : 0;

      const sSkel = normalizeKhmerHandwritingSkeleton(nameCandidate);
      const skelDist = levenshteinDistance(skelInput, sSkel);
      const maxSkelLen = Math.max(skelInput.length, sSkel.length);
      const skelSim = maxSkelLen > 0 ? (1 - (skelDist / maxSkelLen)) * 0.96 : 0;

      let combinedScore = Math.max(rawSim, skelSim);

      // Apply Grade-First Bonus/Penalty if grade was extracted from the slip
      if (normGrade) {
        if (s.grade === normGrade) {
          combinedScore = Math.min(0.99, combinedScore + 0.06);
        } else if (rawSim < 0.90) {
          combinedScore = Math.max(0, combinedScore - 0.05);
        }
      }

      if (combinedScore > bestScore && combinedScore >= 0.74) {
        bestScore = combinedScore;
        bestMatch = { student: s, confidence: combinedScore, isExact: false };
      }
    }
  }

  return bestMatch;
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
