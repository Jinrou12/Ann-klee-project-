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
  { id: 'm-12', name: 'រិទ្ធ ធារ័ត្ម', grade: 'មត្តេយ្យ', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
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
  { id: 'g2-1', name: 'ឃិន ស៊ិវម៉ិញ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-2', name: 'ចាន់ ឆៃអ៊ង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-3', name: 'ចាន់ណា រ៉ាបូ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
  { id: 'g2-4', name: 'ឆេងអាន ឈាងហេង', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
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
  { id: 'g2-21', name: 'ស៊ីម សុវណ្ណរាជ', grade: '២', gender: 'សមណសិស្ស', monkStatus: 'សាមណេរ' },
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
 * Fuzzy search to match an OCR extracted student name with master list
 * @param {string} rawName 
 * @param {Array} studentList 
 * @returns {object|null} Matched student object or null
 */
export function matchStudentName(rawName, studentList = DEFAULT_STUDENT_MASTER) {
  if (!rawName || !studentList || studentList.length === 0) return null;
  const cleanInput = rawName.replace(/[\s\u200B]/g, '').trim();
  if (!cleanInput) return null;

  // 1. Exact match (ignoring whitespace and checking aliases)
  const exact = studentList.find(s => {
    const sClean = s.name.replace(/[\s\u200B]/g, '');
    if (sClean === cleanInput) return true;
    if (s.aliases && s.aliases.some(a => a.replace(/[\s\u200B]/g, '') === cleanInput)) return true;
    return false;
  });
  if (exact) return { student: exact, confidence: 1.0, isExact: true };

  // 2. Substring match (Only when input contains full student name e.g. "សមណសិស្ស ណា ទិចគាង" or high overlap)
  const sub = studentList.find(s => {
    const sClean = s.name.replace(/[\s\u200B]/g, '');
    const candidates = [sClean, ...(s.aliases || []).map(a => a.replace(/[\s\u200B]/g, ''))];
    return candidates.some(candidate => {
      // Input contains the full student name (e.g. "សមណសិស្ស ណា ទិចគាង" includes "ណាទិចគាង")
      if (cleanInput.includes(candidate) && candidate.length >= 4) return true;
      // Or candidate contains input, but input must cover at least 85% of student name length
      if (candidate.includes(cleanInput) && cleanInput.length >= candidate.length * 0.85) return true;
      return false;
    });
  });
  if (sub) return { student: sub, confidence: 0.90, isExact: false };

  // 3. Levenshtein fuzzy match
  let bestMatch = null;
  let minDistance = 999;
  for (const s of studentList) {
    const namesToTest = [s.name, ...(s.aliases || [])];
    for (const nameCandidate of namesToTest) {
      const sClean = nameCandidate.replace(/[\s\u200B]/g, '');
      const dist = levenshteinDistance(cleanInput, sClean);
      const maxLen = Math.max(cleanInput.length, sClean.length);
      const similarity = 1 - (dist / maxLen);

      // Only match if similarity is high (>= 75%) to avoid misidentifying distinct Khmer names
      if (dist < minDistance && similarity >= 0.75) {
        minDistance = dist;
        bestMatch = { student: s, confidence: similarity, isExact: false };
      }
    }
  }

  return bestMatch;
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
