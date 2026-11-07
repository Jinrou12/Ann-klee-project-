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
  const uXml = underline ? '<w:u w:val="single"/>' : '';
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

  const colWidths = [600, 2200, 900, 3200, 1150, 1350, 1000]; // Total = 10,400 dxa
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
