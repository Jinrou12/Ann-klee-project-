// Authentic OpenXML (.docx) Word Document Exporter matching the Official A4 Documents in the App
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  sumByCurrency,
  combineCurrencyTotals,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit
} from './khmerNumerals.js';
import { getMonthEndReportDates } from './khmerCalendar.js';
import { buildFinanceSummaryModel } from './financeSummaryBuilder.js';
import { buildZipArchive, escapeXml, triggerBlobDownload, loadOfficialLogoBytes } from './openXmlZip.js';

const FONT_MOUL = 'Khmer OS Muol Light';
const FONT_SIEMREAP = 'Khmer OS Siemreap';

/**
 * Create a Word paragraph (<w:p>) with Khmer font, size (in pt), alignment, and spacing
 * (Strict ECMA-376 element order: <w:spacing> before <w:jc>, and <w:color>/<w:sz> before <w:u>)
 */
function wParagraph(text, {
  font = FONT_SIEMREAP,
  sizePt = 11,
  bold = false,
  underline = false,
  align = 'left', // 'left' | 'center' | 'right'
  color = '000000',
  spaceBefore = 0,
  spaceAfter = 40
} = {}) {
  const halfPts = Math.round(sizePt * 2);
  const bXml = bold ? '<w:b/><w:bCs/>' : '';
  const uXml = underline
    ? `<w:u w:val="${underline === 'double' ? 'double' : 'single'}"/>`
    : '';
  const colorXml = color && color !== '000000' ? `<w:color w:val="${color}"/>` : '';

  return `<w:p>
    <w:pPr>
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>
      <w:jc w:val="${align}"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>
        ${bXml}
        ${colorXml}
        <w:sz w:val="${halfPts}"/>
        <w:szCs w:val="${halfPts}"/>
        ${uXml}
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;
}

/**
 * Create a centered inline Logo paragraph (<w:p>) embedding rIdLogo (word/media/logo.png)
 */
function wLogoParagraph(sizeEmu = 520000) {
  return `<w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:noProof/>
      </w:rPr>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${sizeEmu}" cy="${sizeEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="1" name="Official School Logo"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="1" name="logo.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="rIdLogo"/>
                  <a:stretch>
                    <a:fillRect/>
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${sizeEmu}" cy="${sizeEmu}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst/>
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}

/**
 * Create a Word table cell (<w:tc>)
 */
function wCell(paragraphsXml, {
  widthDxa = 1500,
  gridSpan = 1,
  shdFill = '',
  vAlign = 'center'
} = {}) {
  const spanXml = gridSpan > 1 ? `<w:gridSpan w:val="${gridSpan}"/>` : '';
  const shdXml = shdFill ? `<w:shd w:val="clear" w:color="auto" w:fill="${shdFill}"/>` : '';
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${spanXml}
      ${shdXml}
      <w:tcMar>
        <w:top w:w="60" w:type="dxa"/>
        <w:bottom w:w="60" w:type="dxa"/>
        <w:left w:w="90" w:type="dxa"/>
        <w:right w:w="90" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="${vAlign}"/>
    </w:tcPr>
    ${paragraphsXml}
  </w:tc>`;
}

/**
 * Create a bordered or borderless Word table (<w:tbl>)
 */
function wTable(colWidthsDxa = [], rowsXml = [], { bordered = true } = {}) {
  const totalWidth = colWidthsDxa.reduce((s, w) => s + w, 0);
  const gridColsXml = colWidthsDxa.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  const borderAttr = bordered
    ? 'w:val="single" w:sz="6" w:space="0" w:color="000000"'
    : 'w:val="none" w:sz="0" w:space="0" w:color="auto"';

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${totalWidth}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top ${borderAttr}/>
        <w:left ${borderAttr}/>
        <w:bottom ${borderAttr}/>
        <w:right ${borderAttr}/>
        <w:insideH ${borderAttr}/>
        <w:insideV ${borderAttr}/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>${gridColsXml}</w:tblGrid>
    ${rowsXml.join('')}
  </w:tbl>`;
}

/**
 * Build the 2-column Official Ministry & Kingdom Header Table
 */
function buildWordOfficialHeader(metadata = {}, includeSalaPrefix = false, hasLogo = false) {
  const ministry = metadata.ministry || 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម';
  const rawSchool = metadata.school || 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង';
  const school = includeSalaPrefix && !String(rawSchool).startsWith('សាលា')
    ? `សាលា${rawSchool}`
    : rawSchool;
  const location = metadata.location || 'ក្រុងកំពង់ចាម';

  const leftParas = [
    ...(hasLogo ? [wLogoParagraph(520000)] : []),
    wParagraph(ministry, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 20 }),
    wParagraph(school, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 20 }),
    wParagraph(location, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 20 })
  ].join('');

  const rightParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceAfter: 20 }),
    wParagraph('ជាតិ សាសនា ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 11, align: 'center', spaceAfter: 20 }),
    wParagraph('~ ~ ~ ❁ ~ ~ ~', { font: FONT_SIEMREAP, sizePt: 10.5, align: 'center', spaceAfter: 20 })
  ].join('');

  const rowXml = `<w:tr>
    ${wCell(leftParas, { widthDxa: 5200, vAlign: 'top' })}
    ${wCell(rightParas, { widthDxa: 5000, vAlign: 'top' })}
  </w:tr>`;

  return wTable([5200, 5000], [rowXml], { bordered: false });
}

/**
 * Build the 2-column Official Director & Reporter Signatures Block Table
 */
function buildWordOfficialSignatures(metadata = {}, reportDates = {}, isFinance = false) {
  const directorTitle = (!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
    ? 'នាយកសាលា'
    : metadata.directorTitle;
  const reporterTitle = metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍';

  const leftLunar = isFinance
    ? `ថ្ងៃ………..…….ខែ………..….ឆ្នាំ${reportDates.zodiac || 'មមី'} ${reportDates.sak || 'អដ្ឋស័ក'} ព.ស.${reportDates.beYear || '២៥៧០'}`
    : `ថ្ងៃ.......................ខែ..................ឆ្នាំ${reportDates.zodiac || 'មមី'}${reportDates.sak || 'អដ្ឋស័ក'} ព.ស ${reportDates.beYear || '២៥៧០'}`;
  const leftSolar = isFinance
    ? `ថ្ងៃទី………. ខែ……….. ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`
    : `ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`;

  const rightLunar = reportDates.lunarDateText || '';
  const rightSolar = isFinance ? (reportDates.solarDateTextFinance || '') : (reportDates.solarDateTextLeave || '');

  const leftParas = [
    wParagraph('បានឃើញ និង……………..', { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 30 }),
    wParagraph(leftLunar, { font: FONT_SIEMREAP, sizePt: 10, align: 'center', spaceAfter: 20 }),
    wParagraph(leftSolar, { font: FONT_SIEMREAP, sizePt: 10, align: 'center', spaceAfter: 60 }),
    wParagraph(directorTitle, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 400 })
  ].join('');

  const rightParas = [
    wParagraph(rightLunar, { font: FONT_SIEMREAP, sizePt: 10, align: 'center', spaceAfter: 20 }),
    wParagraph(rightSolar, { font: FONT_SIEMREAP, sizePt: 10, align: 'center', spaceAfter: 60 }),
    wParagraph(reporterTitle, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 400 })
  ].join('');

  const rowXml = `<w:tr>
    ${wCell(leftParas, { widthDxa: 4800, vAlign: 'top' })}
    ${wCell(rightParas, { widthDxa: 5400, vAlign: 'top' })}
  </w:tr>`;

  return wTable([4800, 5400], [rowXml], { bordered: false });
}

/**
 * Package Word body XML into a complete .docx ZIP archive and trigger browser download
 */
function downloadDocxDocument(bodyContentXml, fileName = 'Report.docx', logoBytes = null) {
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyContentXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="450" w:footer="450" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${FONT_SIEMREAP}" w:hAnsi="${FONT_SIEMREAP}" w:cs="${FONT_SIEMREAP}" w:eastAsia="${FONT_SIEMREAP}"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  ${hasLogo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}
</Relationships>`;

  const entries = [
    { path: '[Content_Types].xml', data: contentTypesXml },
    { path: '_rels/.rels', data: relsXml },
    { path: 'word/document.xml', data: documentXml },
    { path: 'word/_rels/document.xml.rels', data: docRelsXml },
    { path: 'word/styles.xml', data: stylesXml },
    { path: 'word/settings.xml', data: settingsXml }
  ];

  if (hasLogo) {
    entries.push({ path: 'word/media/logo.png', data: logoBytes });
  }

  const zipBytes = buildZipArchive(entries);

  const cleanFileName = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  triggerBlobDownload(
    zipBytes,
    cleanFileName,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

/**
 * 1. Export Leave Records to Official Word (.docx) matching OfficialLeaveDocument.jsx
 */
export async function exportLeaveToWord(records = [], monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  const colWidths = options.compactReasonColumn
    ? [600, 2250, 850, 2650, 1750, 1300, 1000] // Total = 10,400 dxa (compact reason box for Semester/Year)
    : [600, 2200, 900, 3200, 1150, 1350, 1000]; // Total = 10,400 dxa
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'មូលហេតុ', 'ចំនួនឈប់', 'កាលបរិច្ឆេទ', 'ផ្សេងៗ'];

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
      wParagraph(h, { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[i], shdFill: 'F8FAFC' }
    )).join('')}
  </w:tr>`;

  const dataRowsXml = records.length === 0
    ? [
      `<w:tr>${wCell(
        wParagraph('មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
        { widthDxa: 10400, gridSpan: 7 }
      )}</w:tr>`
    ]
    : records.map((r, idx) => {
      let cleanDate = String(r.date || '').trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
        const parts = cleanDate.split(/ដល់|-/);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      const vals = [
        { text: fmt(idx + 1), align: 'center' },
        { text: r.name || '', align: 'left' },
        { text: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), align: 'center' },
        { text: String(r.reason || '').replace(/\s+/g, ' ').trim(), align: 'left' },
        { text: r.duration || '', align: 'center' },
        { text: useKhmer ? toKhmerDigits(cleanDate) : cleanDate, align: 'center' },
        { text: r.note || '', align: 'center' }
      ];
      return `<w:tr>${vals.map((v, i) => wCell(
        wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: 10.5, align: v.align, spaceAfter: 0 }),
        { widthDxa: colWidths[i] }
      )).join('')}</w:tr>`;
    });

  const titleText = options.customPeriodTitle || `ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ${monthLabel}`;
  const sumText = options.customSummaryText || `ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ${monthLabel} សរុប ${fmt(records.length)}អង្គ`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, true, hasLogo),
    wParagraph('របាយការណ៍ ស្ដីពី', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 120, spaceAfter: 40 }),
    wParagraph(titleText, { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceAfter: 160 }),
    wTable(colWidths, [headerRowXml, ...dataRowsXml], { bordered: true }),
    wParagraph(sumText, { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'left', spaceBefore: 140, spaceAfter: 120 }),
    buildWordOfficialSignatures(metadata, reportDates, false)
  ].join('');

  downloadDocxDocument(bodyXml, `របាយការណ៍ច្បាប់សមណសិស្ស_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes);
}

/**
 * 2. Export ID Card Purchase Records to Official Word (.docx) matching OfficialIdCardDocument.jsx
 */
export async function exportIdCardToWord(records = [], monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));
  const totalAmount = records.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  const colWidths = [650, 2600, 1050, 2200, 950, 1550, 1400]; // Total = 10,400 dxa
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'បរិយាយ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ'];

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
      wParagraph(h, { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[i], shdFill: 'F8FAFC' }
    )).join('')}
  </w:tr>`;

  const dataRowsXml = records.length === 0
    ? [
      `<w:tr>${wCell(
        wParagraph('មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID សម្រាប់ខែនេះនៅឡើយទេ។', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
        { widthDxa: 10400, gridSpan: 7 }
      )}</w:tr>`
    ]
    : records.map((r, idx) => {
      const vals = [
        { text: fmt(idx + 1), align: 'center', bold: false },
        { text: r.name || '', align: 'left', bold: false },
        { text: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), align: 'center', bold: false },
        { text: r.item || '', align: 'center', bold: false },
        { text: fmt(r.qty || 1), align: 'center', bold: false },
        { text: formatKhmerCurrency(r.price || 0, useKhmer), align: 'right', bold: true },
        { text: useKhmer ? toKhmerDigits(r.date || '') : (r.date || ''), align: 'center', bold: false }
      ];
      return `<w:tr>${vals.map((v, i) => wCell(
        wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: 10.5, bold: v.bold, align: v.align, spaceAfter: 0 }),
        { widthDxa: colWidths[i] }
      )).join('')}</w:tr>`;
    });

  const totalRowXml = `<w:tr>
    ${wCell(wParagraph('សរុប', { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 0 }), { widthDxa: 7450, gridSpan: 5, shdFill: 'FAFAFA' })}
    ${wCell(wParagraph(formatKhmerCurrency(totalAmount, useKhmer), { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'right', spaceAfter: 0 }), { widthDxa: colWidths[5], shdFill: 'FAFAFA' })}
    ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 10.5, align: 'center', spaceAfter: 0 }), { widthDxa: colWidths[6], shdFill: 'FAFAFA' })}
  </w:tr>`;

  const titleText = options.customPeriodTitle || `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញកាតពាក់ក (ID) ក្នុងខែ${monthLabel}`;
  const sumText = options.customSummaryText || `សរុបសមណសិស្សទិញកាតពាក់ក (ID) ចំនួន ${fmt(records.length)} អង្គ សរុបទឹកប្រាក់ចំនួន ${formatKhmerCurrency(totalAmount, useKhmer)}។`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, true, hasLogo),
    wParagraph('របាយការណ៍ ស្ដីពី', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 120, spaceAfter: 40 }),
    wParagraph(titleText, { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceAfter: 160 }),
    wTable(colWidths, [headerRowXml, ...dataRowsXml, totalRowXml], { bordered: true }),
    wParagraph(sumText, { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'left', spaceBefore: 140, spaceAfter: 120 }),
    buildWordOfficialSignatures(metadata, reportDates, false)
  ].join('');

  downloadDocxDocument(bodyXml, `តារាងបង់ថ្លៃទិញកាត_ID_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes);
}

/**
 * 3. Export Financial Records (Income + Expense) to Official Word (.docx) matching OfficialFinanceDocument.jsx & the 5 DOCX files
 */
export async function exportFinanceToWord(financeData = { income: [], expense: [] }, monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));

  const incomeList = financeData?.income || [];
  const expenseList = financeData?.expense || [];
  const categoryFilter = options.categoryFilter || 'all';
  const showIncomeTable = categoryFilter !== 'expense';
  const showExpenseTable = categoryFilter !== 'income';

  const incomeTotals = sumByCurrency(incomeList);
  const expenseTotals = sumByCurrency(expenseList);
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const balanceTotals = combineCurrencyTotals(incomeTotals, expenseTotals, -1);
  const isDeficit = isFinanceDeficit(balanceTotals, totalIncome - totalExpense);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  const colWidths = [550, 3450, 1250, 1400, 1750, 2000]; // Total = 10,400 dxa
  const tableHeaders = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ'];

  const buildHeaderRow = () => `<w:tr>
    ${tableHeaders.map((h, i) => wCell(
      wParagraph(h, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[i], shdFill: 'F8FAFC' }
    )).join('')}
  </w:tr>`;

  const buildItemRows = (list) => list.map((item, idx) => {
    const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
      ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
      : formatMoney(item.total, item.currency, useKhmer);
    const vals = [
      { text: fmt(idx + 1), align: 'center', bold: false },
      { text: item.desc || '', align: 'left', bold: false },
      { text: item.qty || '', align: 'center', bold: false },
      { text: item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '', align: 'right', bold: false },
      { text: displayTotal, align: 'right', bold: true },
      { text: item.note || '', align: 'center', bold: false }
    ];
    return `<w:tr>${vals.map((v, i) => wCell(
      wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: 10.5, bold: v.bold, align: v.align, spaceAfter: 0 }),
      { widthDxa: colWidths[i] }
    )).join('')}</w:tr>`;
  });

  const sectionsXml = [];

  if (showIncomeTable) {
    const inKindNote = incomeList.some(it => it?.totalLabel)
      ? incomeList.map(it => it.totalLabel).filter(Boolean).join(', ')
      : '';
    const subIncRowXml = `<w:tr>
      ${wCell(wParagraph('សរុបចំណូល', { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceAfter: 0 }), { widthDxa: 6650, gridSpan: 4, shdFill: 'FAFAFA' })}
      ${wCell(wParagraph(formatCurrencyTotals(incomeTotals, useKhmer), { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'right', spaceAfter: 0 }), { widthDxa: colWidths[4], shdFill: 'FAFAFA' })}
      ${wCell(wParagraph(inKindNote, { font: FONT_SIEMREAP, sizePt: 10, bold: true, align: 'center', spaceAfter: 0 }), { widthDxa: colWidths[5], shdFill: 'FAFAFA' })}
    </w:tr>`;

    sectionsXml.push(
      wParagraph('ចំណូល', { font: FONT_MOUL, sizePt: 11, underline: true, align: 'center', spaceBefore: 80, spaceAfter: 60 }),
      wTable(colWidths, [buildHeaderRow(), ...buildItemRows(incomeList), subIncRowXml], { bordered: true })
    );
  }

  if (showExpenseTable) {
    const subExpRowXml = `<w:tr>
      ${wCell(wParagraph('សរុបចំណាយ', { font: FONT_MOUL, sizePt: 10.5, align: 'center', color: isDeficit ? 'B91C1C' : '000000', spaceAfter: 0 }), { widthDxa: 6650, gridSpan: 4, shdFill: isDeficit ? 'FFF8F8' : 'FAFAFA' })}
      ${wCell(wParagraph(formatExpenseTotals(expenseTotals, isDeficit, useKhmer), { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'right', color: isDeficit ? 'B91C1C' : '000000', spaceAfter: 0 }), { widthDxa: colWidths[4], shdFill: isDeficit ? 'FFF8F8' : 'FAFAFA' })}
      ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 10, align: 'center', spaceAfter: 0 }), { widthDxa: colWidths[5], shdFill: isDeficit ? 'FFF8F8' : 'FAFAFA' })}
    </w:tr>`;

    sectionsXml.push(
      wParagraph('ចំណាយ', { font: FONT_MOUL, sizePt: 11, underline: true, align: 'center', spaceBefore: 140, spaceAfter: 60 }),
      wTable(colWidths, [buildHeaderRow(), ...buildItemRows(expenseList), subExpRowXml], { bordered: true })
    );
  }

  const title3Text = options.customPeriodTitle || `តារាងចំណូលចំណាយប្រចាំខែ${monthLabel}`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, false, hasLogo),
    wParagraph('របាយការណ៍', { font: FONT_MOUL, sizePt: 12, align: 'center', spaceBefore: 80, spaceAfter: 20 }),
    wParagraph('ស្ដីពី', { font: FONT_MOUL, sizePt: 11, align: 'center', spaceAfter: 20 }),
    wParagraph(title3Text, { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceAfter: 100 }),
    ...sectionsXml,
    wParagraph('', { sizePt: 6, spaceAfter: 60 }),
    buildWordOfficialSignatures(metadata, reportDates, true)
  ].join('');

  downloadDocxDocument(bodyXml, `របាយការណ៍ចំណូលចំណាយ_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes);
}

/**
 * 4. Export Official Summary Financial Report (របាយការណ៍ចំណូលចំណាយសង្ខេប) to Word (.docx)
 * matching the official 1-page 5-column summary DOCX templates (July & September 2026)
 */
export async function exportFinanceSummaryReportToWord(
  financeData = { income: [], expense: [] },
  monthLabel = 'កក្កដា ២០២៦',
  metadata = {},
  options = {}
) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;

  const summaryModel = buildFinanceSummaryModel(financeData, {
    monthKey,
    monthName: options.monthName || '',
    yearDisplay: options.yearDisplay || '',
    periodMode: options.periodMode || 'month',
    useKhmerNumerals: useKhmer,
    customSummaryTitle: options.customSummaryTitle || '',
    isDeficitOverride: options.isDeficitOverride ?? null
  });

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  // 5 columns proportional to official template (818 : 6690 : 2268 : 2779 : 2571 -> total 10,400 dxa)
  const colWidths = [560, 4600, 1560, 1920, 1760];
  const mergedLabelWidth = colWidths[0] + colWidths[1] + colWidths[2]; // 6,720 dxa
  const headers = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'ចំនួនថវិកា', 'ផ្សេងៗ'];
  const { isDeficit } = summaryModel;
  const deficitColor = isDeficit ? 'B91C1C' : '000000';

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
      wParagraph(h, { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: colWidths[i] }
    )).join('')}
  </w:tr>`;

  const buildDataRowXml = (row) => {
    const cells = [
      { text: row.no, align: 'center' },
      { text: row.desc, align: 'left' },
      { text: row.qty, align: 'center' },
      { text: row.amountText, align: 'right' },
      { text: row.note || '', align: 'center' }
    ];
    return `<w:tr>${cells.map((c, i) => wCell(
      wParagraph(c.text, { font: FONT_SIEMREAP, sizePt: 11.5, align: c.align, spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: colWidths[i] }
    )).join('')}</w:tr>`;
  };

  const subtotalIncRowXml = `<w:tr>
    ${wCell(
      wParagraph(summaryModel.totalIncomeLabel, { font: FONT_SIEMREAP, sizePt: 11.5, bold: true, align: 'center', spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: mergedLabelWidth, gridSpan: 3 }
    )}
    ${wCell(
      wParagraph(summaryModel.totalIncomeText, { font: FONT_MOUL, sizePt: 11.5, underline: 'single', align: 'right', spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: colWidths[3] }
    )}
    ${wCell(
      wParagraph('', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[4] }
    )}
  </w:tr>`;

  const subtotalExpRowXml = `<w:tr>
    ${wCell(
      wParagraph(summaryModel.totalExpenseLabel, { font: FONT_SIEMREAP, sizePt: 11.5, bold: true, align: 'center', color: deficitColor, spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: mergedLabelWidth, gridSpan: 3 }
    )}
    ${wCell(
      wParagraph(summaryModel.totalExpenseText, { font: FONT_MOUL, sizePt: 11.5, underline: 'single', align: 'right', color: deficitColor, spaceBefore: 30, spaceAfter: 30 }),
      { widthDxa: colWidths[3] }
    )}
    ${wCell(
      wParagraph('', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[4] }
    )}
  </w:tr>`;

  const balanceRowXml = `<w:tr>
    ${wCell(
      wParagraph(summaryModel.balanceLabel, { font: FONT_MOUL, sizePt: 11.5, align: 'center', color: deficitColor, spaceBefore: 40, spaceAfter: 40 }),
      { widthDxa: mergedLabelWidth, gridSpan: 3 }
    )}
    ${wCell(
      wParagraph(summaryModel.balanceText, { font: FONT_MOUL, sizePt: 11.5, underline: 'double', align: 'right', color: deficitColor, spaceBefore: 40, spaceAfter: 40 }),
      { widthDxa: colWidths[3] }
    )}
    ${wCell(
      wParagraph('', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
      { widthDxa: colWidths[4] }
    )}
  </w:tr>`;

  const allTableRowsXml = [
    headerRowXml,
    ...summaryModel.incomeRows.map(buildDataRowXml),
    subtotalIncRowXml,
    ...summaryModel.expenseRows.map(buildDataRowXml),
    subtotalExpRowXml,
    balanceRowXml
  ];

  const bodyXml = [
    buildWordOfficialHeader(metadata, false, hasLogo),
    wParagraph('របាយការណ៍', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 120, spaceAfter: 30 }),
    wParagraph('ស្ដីពី', { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceAfter: 30 }),
    wParagraph(summaryModel.reportTitle, { font: FONT_MOUL, sizePt: 12, align: 'center', spaceAfter: 160 }),
    wTable(colWidths, allTableRowsXml, { bordered: true }),
    wParagraph('', { sizePt: 10, spaceAfter: 140 }),
    buildWordOfficialSignatures(metadata, reportDates, true)
  ].join('');

  downloadDocxDocument(
    bodyXml,
    `របាយការណ៍ចំណូលចំណាយសង្ខេប_${String(monthLabel).replace(/\s+/g, '_')}.docx`,
    logoBytes
  );
}

/**
 * Dual-file Word exporter for PC Finance:
 * File 1: Full Detailed Finance Report (.docx)
 * File 2: Summary Finance Report (.docx)
 */
export async function exportFinanceDualWord(
  financeData = { income: [], expense: [] },
  monthLabel = 'កក្កដា ២០២៦',
  metadata = {},
  options = {}
) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const sharedOptions = { ...options, logoBytes };
  await exportFinanceToWord(financeData, monthLabel, metadata, sharedOptions);
  await new Promise(resolve => setTimeout(resolve, 400));
  const summarySourceData = options.summaryFinanceData || financeData;
  await exportFinanceSummaryReportToWord(summarySourceData, monthLabel, metadata, sharedOptions);
}

/**
 * Create a multi-run Word paragraph (<w:p>) for mixed Moul + Siemreap lines (e.g. "កម្មវត្ថុ៖ ..." or Management Roles)
 */
function wMultiRunParagraph(runs = [], {
  align = 'both',
  spaceBefore = 0,
  spaceAfter = 40,
  indentLeft = 0
} = {}) {
  const indXml = indentLeft > 0 ? `<w:ind w:left="${indentLeft}"/>` : '';
  const runsXml = runs.map(r => {
    const font = r.font || FONT_SIEMREAP;
    const halfPts = Math.round((r.sizePt || 12) * 2);
    const bXml = r.bold ? '<w:b/><w:bCs/>' : '';
    const uXml = r.underline ? '<w:u w:val="single"/>' : '';
    return `<w:r>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>
        ${bXml}
        <w:sz w:val="${halfPts}"/>
        <w:szCs w:val="${halfPts}"/>
        ${uXml}
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(r.text || '')}</w:t>
    </w:r>`;
  }).join('');

  return `<w:p>
    <w:pPr>
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>
      ${indXml}
      <w:jc w:val="${align}"/>
    </w:pPr>
    ${runsXml}
  </w:p>`;
}

/**
 * Export Administrative Narrative Report (Monthly / Semester 1 / Semester 2 / Annual) to Official .docx
 */
export async function exportAdminReportToWord(displayModel, _metadata = {}) {
  const logoBytes = await loadOfficialLogoBytes();
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const NAVY = '002060';

  const topKingdomParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 14, color: NAVY, align: 'center', spaceAfter: 20 }),
    wParagraph('ជាតិ   សាសនា   ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 12, color: NAVY, align: 'center', spaceAfter: 20 }),
    wParagraph('~ ~ ~ ❁ ~ ~ ~', { font: FONT_SIEMREAP, sizePt: 10.5, color: NAVY, align: 'center', spaceAfter: 30 })
  ].join('');

  const leftSchoolParas = [
    ...(hasLogo ? [wLogoParagraph(520000)] : []),
    wParagraph('សាលាអនុគណក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: 12, color: NAVY, align: 'center', spaceAfter: 20 }),
    wParagraph('ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង', { font: FONT_MOUL, sizePt: 12, color: NAVY, align: 'center', spaceAfter: 20 }),
    wParagraph('ក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: 12, color: NAVY, align: 'center', spaceAfter: 20 }),
    wParagraph(`លេខ ${displayModel.docNumber || '......................'}ព.ប.ហ.ណ`, { font: FONT_SIEMREAP, sizePt: 12, color: NAVY, align: 'center', spaceAfter: 20 })
  ].join('');

  const leftSchoolTableXml = wTable(
    [5200, 5000],
    [`<w:tr>${wCell(leftSchoolParas, { widthDxa: 5200, vAlign: 'top' })}${wCell(wParagraph('', { sizePt: 11 }), { widthDxa: 5000, vAlign: 'top' })}</w:tr>`],
    { bordered: false }
  );

  // Signature Table at bottom right
  const sigLeftXml = wParagraph('', { sizePt: 11, spaceAfter: 20 });
  const sigRightXml = [
    wParagraph(displayModel.lunarDateLine || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'right', spaceAfter: 20 }),
    wParagraph(displayModel.solarDateLine || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'right', spaceAfter: 60 }),
    wParagraph(displayModel.signerTitle || 'ព្រះនាយក', { font: FONT_MOUL, sizePt: 12, align: 'center', spaceAfter: 480 })
  ].join('');

  const signatureTableXml = wTable(
    [4000, 6200],
    [`<w:tr>${wCell(sigLeftXml, { widthDxa: 4000, vAlign: 'top' })}${wCell(sigRightXml, { widthDxa: 6200, vAlign: 'top' })}</w:tr>`],
    { bordered: false }
  );

  const bodyParts = [
    topKingdomParas,
    leftSchoolTableXml,
    wParagraph('សូមក្រាបថ្វាយបង្គំ', { font: FONT_MOUL, sizePt: 14, color: NAVY, align: 'center', spaceBefore: 80, spaceAfter: 30 }),
    wParagraph(displayModel.recipientTitle, { font: FONT_MOUL, sizePt: 13, color: NAVY, align: 'center', spaceAfter: 30 }),
    wParagraph('ជាទីគោរពសក្ការៈដ៏ខ្ពង់ខ្ពស់!', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'right', spaceAfter: 100 }),

    // Subject (កម្មវត្ថុ)
    wMultiRunParagraph([
      { text: 'កម្មវត្ថុ៖ ', font: FONT_MOUL, sizePt: 12 },
      { text: displayModel.subjectText, font: FONT_SIEMREAP, sizePt: 12 }
    ], { align: 'both', spaceAfter: 80 }),

    // Intro Paragraph
    wParagraph(`         ${displayModel.introParagraph}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', spaceAfter: 100 }),

    // I. តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
    wParagraph('I.តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា', { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 80, spaceAfter: 40 }),
    wParagraph(`         ${displayModel.section1Intro}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', spaceAfter: 40 }),
    ...(displayModel.managementRoles || []).map((m) =>
      wMultiRunParagraph([
        { text: '- ', font: FONT_SIEMREAP, sizePt: 12 },
        { text: `${m.name}     `, font: FONT_MOUL, sizePt: 12 },
        { text: m.role, font: FONT_SIEMREAP, sizePt: 12 }
      ], { align: 'left', indentLeft: 360, spaceAfter: 30 })
    ),

    // II. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
    wParagraph('II.ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស', { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 100, spaceAfter: 40 }),
    wParagraph('ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceAfter: 30 }),
    ...(displayModel.staffStats || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'left', indentLeft: 360, spaceAfter: 30 })
    ),
    wParagraph('ខ-ចំនួនថ្នាក់ សមណសិស្ស', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceBefore: 40, spaceAfter: 30 }),
    ...(displayModel.studentStatLines || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'left', indentLeft: 360, spaceAfter: 30 })
    ),

    // III. វឌ្ឍនភាពការងារ
    wParagraph(displayModel.section3Heading, { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 100, spaceAfter: 40 }),
    wParagraph(displayModel.section3SubAHeading, { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceAfter: 30 }),
    ...(displayModel.activities || []).map(line =>
      wParagraph(`❖ ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', indentLeft: 360, spaceAfter: 30 })
    ),
    wParagraph('ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល កំណត់ហេតុ និងរបាយការណ៍', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceBefore: 40, spaceAfter: 30 }),
    ...(displayModel.adminDocLines || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'left', indentLeft: 360, spaceAfter: 30 })
    ),
    wParagraph(displayModel.section3SubCHeading, { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceBefore: 40, spaceAfter: 30 }),
    wParagraph(displayModel.section3SubDHeading, { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceAfter: 30 }),
    ...(displayModel.appendixItems || []).map((line) =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'left', indentLeft: 360, spaceAfter: 25 })
    ),

    // IV. បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ
    wParagraph('IV.បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ', { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 100, spaceAfter: 40 }),
    wParagraph('១-បញ្ហាប្រឈម', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceAfter: 30 }),
    ...(displayModel.challenges || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', indentLeft: 360, spaceAfter: 30 })
    ),
    wParagraph('២-ដំណោះស្រាយ', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceBefore: 40, spaceAfter: 30 }),
    ...(displayModel.solutions || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', indentLeft: 360, spaceAfter: 30 })
    ),
    wParagraph('៣-សំណូមពរ', { font: FONT_SIEMREAP, sizePt: 12, bold: true, align: 'left', indentLeft: 240, spaceBefore: 40, spaceAfter: 30 }),
    ...(displayModel.requests || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', indentLeft: 360, spaceAfter: 30 })
    ),

    // V. ទិសដៅបន្ត
    wParagraph('V.ទិសដៅបន្ត', { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 100, spaceAfter: 40 }),
    ...(displayModel.directions || []).map(line =>
      wParagraph(`- ${line}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', indentLeft: 360, spaceAfter: 30 })
    ),

    // VI. សន្និដ្ឋាន
    wParagraph('VI.សន្និដ្ឋាន', { font: FONT_MOUL, sizePt: 12, align: 'left', spaceBefore: 100, spaceAfter: 40 }),
    wParagraph(`         ${displayModel.conclusionText}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', spaceAfter: 40 }),
    wParagraph(`         ${displayModel.closingLine1}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', spaceAfter: 30 }),
    wParagraph(`         ${displayModel.closingLine2}`, { font: FONT_SIEMREAP, sizePt: 12, align: 'both', spaceAfter: 100 }),
    signatureTableXml
  ];

  downloadDocxDocument(
    bodyParts.join(''),
    `របាយការណ៍_${displayModel.shortFileNameTag}.docx`,
    logoBytes
  );
}

