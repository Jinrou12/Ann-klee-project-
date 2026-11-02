// Excel Export Utility using SheetJS
import * as XLSX from 'xlsx';
import { toKhmerDigits, formatKhmerCurrency } from './khmerNumerals';

/**
 * Export Leave Records to Excel file
 */
export function exportLeaveToExcel(records, monthLabel = 'កក្កដា ២០២៦', metadata = {}) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [metadata.ministry || 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម', '', '', 'ព្រះរាជាណាចក្រកម្ពុជា'],
    [metadata.school || 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង', '', '', 'ជាតិ សាសនា ព្រះមហាក្សត្រ'],
    [metadata.location || 'ក្រុងកំពង់ចាម', '', '', ''],
    [],
    ['របាយការណ៍ ស្ដីពី ចំនួនសមណសិស្សសុំច្បាប់ប្រចាំខែ ' + monthLabel],
    [],
    ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'មូលហេតុ', 'ចំនួនឈប់', 'កាលបរិច្ឆេទ', 'ផ្សេងៗ']
  ];

  const dataRows = records.map((r, index) => {
    let cleanDate = String(r.date || '').trim();
    cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
    if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
      const parts = cleanDate.split(/ដល់|-/);
      if (parts[0] && parts[0].trim().length >= 6) {
        cleanDate = parts[0].trim();
      }
    }
    return [
      toKhmerDigits(index + 1),
      r.name || '',
      r.grade || '',
      r.reason || '',
      r.duration || '',
      toKhmerDigits(cleanDate),
      r.note || ''
    ];
  });

  const summaryRow = [
    '',
    `ចំនួនសមណសិស្សសុំច្បាប់ សរុប ${toKhmerDigits(records.length)} អង្គ`,
    '', '', '', '', ''
  ];

  const fullData = [...titleRows, ...dataRows, [], summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // ល.រ
    { wch: 22 }, // គោត្តនាម-និងនាម
    { wch: 10 }, // ថ្នាក់
    { wch: 25 }, // មូលហេតុ
    { wch: 14 }, // ចំនួនឈប់
    { wch: 16 }, // កាលបរិច្ឆេទ
    { wch: 15 }  // ផ្សេងៗ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ច្បាប់សមណសិស្ស');
  XLSX.writeFile(wb, `របាយការណ៍ច្បាប់សមណសិស្ស_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Export Financial Records (Income + Expense) to Excel file
 */
export function exportFinanceToExcel(financeData, monthLabel = 'កក្កដា ២០២៦', metadata = {}) {
  const wb = XLSX.utils.book_new();
  const incomeList = financeData.income || [];
  const expenseList = financeData.expense || [];

  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const balance = totalIncome - totalExpense;

  const aoa = [
    [metadata.ministry || 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម', '', '', 'ព្រះរាជាណាចក្រកម្ពុជា'],
    [metadata.school || 'សាលាពុទ្ធិកបឋមសិក្សាកម្ពុជា ហ៊ុន សែន', '', '', 'ជាតិ សាសនា ព្រះមហាក្សត្រ'],
    [metadata.location || 'ក្រុងកំពង់ចាម', '', '', ''],
    [],
    ['របាយការណ៍ ស្ដីពី តារាងចំណូលចំណាយប្រចាំខែ ' + monthLabel],
    [],
    ['--- ចំណូល ---'],
    ['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ']
  ];

  incomeList.forEach((item, idx) => {
    aoa.push([
      toKhmerDigits(idx + 1),
      item.desc,
      item.qty,
      item.unitPrice ? formatKhmerCurrency(item.unitPrice) : '',
      formatKhmerCurrency(item.total),
      item.note || ''
    ]);
  });

  aoa.push(['', 'សរុបចំណូល', '', '', formatKhmerCurrency(totalIncome), '']);
  aoa.push([]);
  aoa.push(['--- ចំណាយ ---']);
  aoa.push(['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ']);

  expenseList.forEach((item, idx) => {
    aoa.push([
      toKhmerDigits(idx + 1),
      item.desc,
      item.qty,
      item.unitPrice ? formatKhmerCurrency(item.unitPrice) : '',
      formatKhmerCurrency(item.total),
      item.note || ''
    ]);
  });

  aoa.push(['', 'សរុបចំណាយ', '', '', formatKhmerCurrency(totalExpense), '']);
  aoa.push([]);
  aoa.push(['', 'សមតុល្យនៅសល់ (ចំណូល - ចំណាយ)', '', '', formatKhmerCurrency(balance), '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 8 },  // ល.រ
    { wch: 45 }, // បរិយាយ
    { wch: 14 }, // ចំនួន
    { wch: 16 }, // តម្លៃរាយ
    { wch: 18 }, // តម្លៃសរុប
    { wch: 15 }  // ផ្សេងៗ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ចំណូល-ចំណាយ');
  XLSX.writeFile(wb, `របាយការណ៍ចំណូលចំណាយ_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
}
