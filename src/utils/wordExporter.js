// Authentic OpenXML (.docx) Word Document Exporter matching the Official A4 Documents in the App
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  sumByCurrency,
  combineCurrencyTotals,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit,
  normalizeRecordDateStr,
  sortRecordsByDateAsc
} from './khmerNumerals.js';
import { getMonthEndReportDates } from './khmerCalendar.js';
import { buildFinanceSummaryModel } from './financeSummaryBuilder.js';
import {
  formatMinistryLunarDateLine,
  formatMinistrySolarDateLine
} from './ministryReportBuilder.js';
import { buildZipArchive, escapeXml, triggerBlobDownload, loadOfficialLogoBytes } from './openXmlZip.js';

const FONT_MOUL = 'Khmer OS Muol Light';
const FONT_SIEMREAP = 'Khmer OS Siemreap';
const FONT_BATTAMBANG = 'Khmer OS Battambang';
const FONT_TACTEING = 'Tacteing';

/**
 * Create the authentic Khmer ornamental divider paragraph using character '3' in Font "Tacteing"
 * matching the original Word (.docx) templates (w:ascii="Tacteing" w:hAnsi="Tacteing" w:cs="Tacteing", 28pt = w:sz 56).
 */
function wTacteingDividerParagraph({ color = '000000', sizePt = 28 } = {}) {
  const halfPts = Math.round(sizePt * 2);
  const colorXml = color && color !== '000000' ? `<w:color w:val="${color}"/>` : '';
  return `<w:p>
    <w:pPr>
      <w:keepLines/>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="${FONT_TACTEING}" w:hAnsi="${FONT_TACTEING}" w:cs="${FONT_TACTEING}"/>
        ${colorXml}
        <w:sz w:val="${halfPts}"/>
        <w:szCs w:val="${halfPts}"/>
      </w:rPr>
      <w:t>3</w:t>
    </w:r>
  </w:p>`;
}

/**
 * Create a Word paragraph (<w:p>) with Khmer font, size (in pt), alignment, and spacing
 * (Strict ECMA-376 element order: <w:spacing> before <w:ind> before <w:jc>, and <w:color>/<w:sz> before <w:u>)
 * Matches the original templates: single line spacing (w:line=240) and zero paragraph spacing by default,
 * and never applies faux-bold to Khmer OS Muol Light (it is already a display face).
 */
function wParagraph(text, {
  font = FONT_SIEMREAP,
  sizePt = 11,
  bold = false,
  underline = false,
  align = 'left', // 'left' | 'center' | 'right' | 'both'
  color = '000000',
  spaceBefore = 0,
  spaceAfter = 0,
  indentLeft = 0,
  firstLine = 0,
  keepNext = false
} = {}) {
  const halfPts = Math.round(sizePt * 2);
  const bXml = bold && font !== FONT_MOUL ? '<w:b/><w:bCs/>' : '';
  const uXml = underline
    ? `<w:u w:val="${underline === 'double' ? 'double' : 'single'}"/>`
    : '';
  const colorXml = color && color !== '000000' ? `<w:color w:val="${color}"/>` : '';
  const indAttrs = [
    indentLeft > 0 ? `w:left="${indentLeft}"` : '',
    firstLine > 0 ? `w:firstLine="${firstLine}"` : ''
  ].filter(Boolean).join(' ');
  const indXml = indAttrs ? `<w:ind ${indAttrs}/>` : '';
  const keepXml = keepNext ? '<w:keepNext/><w:keepLines/>' : '<w:keepLines/>';

  return `<w:p>
    <w:pPr>
      ${keepXml}
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>
      ${indXml}
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
        <w:cs/>
        <w:lang w:val="km-KH" w:eastAsia="en-US" w:bidi="km-KH"/>
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
  vMerge = '',
  shdFill = '',
  vAlign = 'center',
  marginsDxa = { top: 24, bottom: 24, left: 40, right: 40 }
} = {}) {
  const spanXml = gridSpan > 1 ? `<w:gridSpan w:val="${gridSpan}"/>` : '';
  const vmXml = vMerge === 'restart'
    ? '<w:vMerge w:val="restart"/>'
    : vMerge === 'continue'
      ? '<w:vMerge/>'
      : '';
  const shdXml = shdFill ? `<w:shd w:val="clear" w:color="auto" w:fill="${shdFill}"/>` : '';
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${spanXml}
      ${vmXml}
      ${shdXml}
      <w:tcMar>
        <w:top w:w="${marginsDxa.top}" w:type="dxa"/>
        <w:left w:w="${marginsDxa.left}" w:type="dxa"/>
        <w:bottom w:w="${marginsDxa.bottom}" w:type="dxa"/>
        <w:right w:w="${marginsDxa.right}" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="${vAlign}"/>
    </w:tcPr>
    ${paragraphsXml}
  </w:tc>`;
}

// Zero cell padding for borderless layout tables (header / signatures) so long lines never wrap
const ZERO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Create a bordered or borderless Word table (<w:tbl>)
 * Bordered tables use thin 0.5pt (w:sz=4) lines exactly like the original templates.
 */
function wTable(colWidthsDxa = [], rowsXml = [], { bordered = true } = {}) {
  const totalWidth = colWidthsDxa.reduce((s, w) => s + w, 0);
  const gridColsXml = colWidthsDxa.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  const borderAttr = bordered
    ? 'w:val="single" w:sz="4" w:space="0" w:color="000000"'
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

// Usable width of the official Leave / ID Card / Finance templates (A4 11906 - 567 - 567)
const OFFICIAL_CONTENT_DXA = 10772;
const OFFICIAL_PAGE_MARGINS = { top: 709, right: 567, bottom: 568, left: 567 };

/**
 * Build the 2-column Official Ministry & Kingdom Header Table
 * (school name printed exactly as in the original template, without an extra 'សាលា' prefix)
 */
function buildWordOfficialHeader(
  metadata = {},
  _includeSalaPrefix = false,
  hasLogo = false,
  totalWidthDxa = OFFICIAL_CONTENT_DXA,
  headerOpts = {}
) {
  const ministry = metadata.ministry || 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម';
  const school = String(metadata.school || 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង').replace(/^សាលា(?=ពុទ្ធិក)/, '');
  const location = metadata.location || 'ក្រុងកំពង់ចាម';
  const logoEmu = headerOpts.logoEmu || 420000;
  const lineSpaceAfter = headerOpts.lineSpaceAfter || 0;

  const leftParas = [
    ...(hasLogo ? [wLogoParagraph(logoEmu)] : []),
    wParagraph(ministry, { font: FONT_MOUL, sizePt: 11, align: 'center', spaceAfter: lineSpaceAfter }),
    wParagraph(school, { font: FONT_MOUL, sizePt: 11, align: 'center', spaceAfter: lineSpaceAfter }),
    wParagraph(location, { font: FONT_MOUL, sizePt: 11, align: 'center', spaceAfter: lineSpaceAfter })
  ].join('');

  const rightParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 14, align: 'center', spaceAfter: lineSpaceAfter }),
    wParagraph('ជាតិ សាសនា ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 12, align: 'center', spaceAfter: lineSpaceAfter }),
    wTacteingDividerParagraph({ color: '000000', sizePt: 28 })
  ].join('');

  const leftW = Math.round((5500 / OFFICIAL_CONTENT_DXA) * totalWidthDxa);
  const widths = [leftW, totalWidthDxa - leftW];
  const rowXml = `<w:tr>
    ${wCell(leftParas, { widthDxa: widths[0], vAlign: 'top', marginsDxa: ZERO_MARGINS })}
    ${wCell(rightParas, { widthDxa: widths[1], vAlign: 'top', marginsDxa: ZERO_MARGINS })}
  </w:tr>`;

  return wTable(widths, [rowXml], { bordered: false });
}

/**
 * Build the 3-line official report title (របាយការណ៍ / ស្ដីពី / title) used by every original template
 */
function buildWordReportTitle(titleText, titleOpts = {}) {
  const line1Pt = titleOpts.line1Pt || 14;
  const line2Pt = titleOpts.line2Pt || 14;
  const line3Pt = titleOpts.line3Pt || 14;
  return [
    wParagraph('របាយការណ៍', { font: FONT_MOUL, sizePt: line1Pt, align: 'center', spaceBefore: 120 }),
    wParagraph('ស្ដីពី', { font: FONT_MOUL, sizePt: line2Pt, align: 'center' }),
    wParagraph(titleText, { font: FONT_MOUL, sizePt: line3Pt, align: 'center', spaceAfter: 120 })
  ].join('');
}

/**
 * Build the 2-column Official Director & Reporter Signatures Block Table
 */
function buildWordOfficialSignatures(
  metadata = {},
  reportDates = {},
  isFinance = false,
  totalWidthDxa = OFFICIAL_CONTENT_DXA,
  sigOpts = {}
) {
  const directorTitle = (!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
    ? 'នាយកសាលា'
    : metadata.directorTitle;
  const reporterTitle = metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍';
  const approvalSizePt = sigOpts.approvalSizePt || 11;
  const dateSizePt = sigOpts.dateSizePt || 11;
  const dateSpaceAfter = sigOpts.dateSpaceAfter || 0;
  const titleSpaceBefore = sigOpts.titleSpaceBefore ?? 30;

  const leftLunar = isFinance
    ? `ថ្ងៃ………..…….ខែ………..….ឆ្នាំ${reportDates.zodiac || 'មមី'} ${reportDates.sak || 'អដ្ឋស័ក'} ព.ស.${reportDates.beYear || '២៥៧០'}`
    : `ថ្ងៃ..............ខែ...........ឆ្នាំ${reportDates.zodiac || 'មមី'}${reportDates.sak || 'អដ្ឋស័ក'} ព.ស ${reportDates.beYear || '២៥៧០'}`;
  const leftSolar = isFinance
    ? `ថ្ងៃទី………. ខែ……….. ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`
    : `ត្រូវនឹងថ្ងៃទី....... ខែ............ ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`;

  const rightLunar = reportDates.lunarDateText || '';
  const rightSolar = isFinance ? (reportDates.solarDateTextFinance || '') : (reportDates.solarDateTextLeave || '');

  const leftParas = [
    wParagraph('បានឃើញ និង……………..', { font: FONT_MOUL, sizePt: approvalSizePt, align: 'center', spaceAfter: dateSpaceAfter, keepNext: true }),
    wParagraph(leftLunar, { font: FONT_SIEMREAP, sizePt: dateSizePt, align: 'center', spaceAfter: dateSpaceAfter, keepNext: true }),
    wParagraph(leftSolar, { font: FONT_SIEMREAP, sizePt: dateSizePt, align: 'center', spaceAfter: dateSpaceAfter, keepNext: true }),
    wParagraph(directorTitle, { font: FONT_MOUL, sizePt: 12, align: 'center', spaceBefore: titleSpaceBefore, spaceAfter: 0 })
  ].join('');

  const rightParas = [
    wParagraph(rightLunar, { font: FONT_SIEMREAP, sizePt: dateSizePt, align: 'center', spaceAfter: dateSpaceAfter, keepNext: true }),
    wParagraph(rightSolar, { font: FONT_SIEMREAP, sizePt: dateSizePt, align: 'center', spaceAfter: dateSpaceAfter, keepNext: true }),
    wParagraph(reporterTitle, { font: FONT_MOUL, sizePt: 12, align: 'center', spaceBefore: titleSpaceBefore, spaceAfter: 0 })
  ].join('');

  const leftW = Math.round((5000 / OFFICIAL_CONTENT_DXA) * totalWidthDxa);
  const widths = [leftW, totalWidthDxa - leftW];
  const rowXml = `<w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    ${wCell(leftParas, { widthDxa: widths[0], vAlign: 'top', marginsDxa: ZERO_MARGINS })}
    ${wCell(rightParas, { widthDxa: widths[1], vAlign: 'top', marginsDxa: ZERO_MARGINS })}
  </w:tr>`;

  return wTable(widths, [rowXml], { bordered: false });
}

/**
 * Scale template column widths proportionally so they fill the official usable width exactly
 */
function fitColumns(widths, total = OFFICIAL_CONTENT_DXA) {
  const sum = widths.reduce((s, w) => s + w, 0);
  const scaled = widths.map(w => Math.floor((w * total) / sum));
  scaled[scaled.length - 1] += total - scaled.reduce((s, w) => s + w, 0);
  return scaled;
}

const TACTEING_FONT_GUID = '{4B544143-5445-494E-4746-4F4E54303031}';
let cachedTacteingOdttfBytes = null;

/**
 * Load /fonts/Tacteing.ttf and obfuscate the first 32 bytes per ECMA-376 Part 1 §17.8.1
 * so Microsoft Word embeds and renders the Tacteing '3' ornamental divider even if Tacteing is not installed in Windows Fonts.
 */
async function loadTacteingOdttfBytes() {
  if (cachedTacteingOdttfBytes) return cachedTacteingOdttfBytes;
  try {
    if (typeof fetch !== 'function') return null;
    const res = await fetch('/fonts/Tacteing.ttf', { cache: 'force-cache' });
    if (!res.ok) return null;
    const raw = new Uint8Array(await res.arrayBuffer());
    if (raw.length < 64) return null;
    const hex = TACTEING_FONT_GUID.replace(/[{}-]/g, '');
    const key = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      key[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    const odttf = new Uint8Array(raw);
    for (let i = 0; i < 16; i++) {
      const k = key[15 - i];
      odttf[i] ^= k;
      odttf[i + 16] ^= k;
    }
    cachedTacteingOdttfBytes = odttf;
    return cachedTacteingOdttfBytes;
  } catch {
    return null;
  }
}

/**
 * Package Word body XML into a complete .docx ZIP archive and trigger browser download
 * options.pageMargins  — official page margins (dxa)
 * options.headerXml    — optional word/header1.xml body (e.g. full-page background watermark)
 * options.footerXml    — optional word/footer1.xml body (e.g. page number)
 * options.headerMedia  — optional { path, bytes, ext, contentType } image referenced by rIdBg in header1.xml
 */
function downloadDocxDocument(bodyContentXml, fileName = 'Report.docx', logoBytes = null, options = {}) {
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const tacteingOdttf = options.tacteingOdttf || cachedTacteingOdttfBytes;
  const hasEmbeddedTacteing = Boolean(tacteingOdttf && tacteingOdttf.length > 0);
  const m = { ...OFFICIAL_PAGE_MARGINS, ...(options.pageMargins || {}) };
  const pgSz = options.pageSize || { w: 11906, h: 16838 };
  const hasHeader = Boolean(options.headerXml);
  const hasFooter = Boolean(options.footerXml);
  const headerMedia = hasHeader && options.headerMedia && options.headerMedia.bytes?.length ? options.headerMedia : null;
  const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w10="urn:schemas-microsoft-com:office:word"`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  ${NS}>
  <w:body>
    ${bodyContentXml}
    <w:sectPr>
      ${hasHeader ? '<w:headerReference w:type="default" r:id="rIdHdr1"/>' : ''}
      ${hasFooter ? '<w:footerReference w:type="default" r:id="rIdFtr1"/>' : ''}
      <w:pgSz w:w="${pgSz.w}" w:h="${pgSz.h}"${pgSz.orient ? ` w:orient="${pgSz.orient}"` : ''}/>
      <w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}" w:header="${m.header ?? 284}" w:footer="${m.footer ?? 284}" w:gutter="0"/>
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
        <w:lang w:val="km-KH" w:eastAsia="en-US" w:bidi="km-KH"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${hasEmbeddedTacteing ? '<w:embedTrueTypeFonts/>' : ''}
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

  const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:font w:name="Khmer OS Muol Light">
    <w:panose1 w:val="02000500000000020004"/>
    <w:charset w:val="00"/>
    <w:family w:val="auto"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="A00000EF" w:usb1="5000204A" w:usb2="00010000" w:usb3="00000000" w:csb0="00000111" w:csb1="00000000"/>
  </w:font>
  <w:font w:name="Khmer OS Siemreap">
    <w:panose1 w:val="02000500000000020004"/>
    <w:charset w:val="00"/>
    <w:family w:val="auto"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="A00000EF" w:usb1="5000204A" w:usb2="00010000" w:usb3="00000000" w:csb0="00000111" w:csb1="00000000"/>
  </w:font>
  <w:font w:name="Khmer OS Battambang">
    <w:panose1 w:val="02000500000000020004"/>
    <w:charset w:val="00"/>
    <w:family w:val="auto"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="A00000EF" w:usb1="5000204A" w:usb2="00010000" w:usb3="00000000" w:csb0="00000111" w:csb1="00000000"/>
  </w:font>
  <w:font w:name="Tacteing">
    <w:panose1 w:val="00000000000000000000"/>
    <w:charset w:val="00"/>
    <w:family w:val="auto"/>
    <w:pitch w:val="variable"/>
    <w:sig w:usb0="00000003" w:usb1="00000000" w:usb2="00000000" w:usb3="00000000" w:csb0="00000001" w:csb1="00000000"/>
    ${hasEmbeddedTacteing ? `<w:embedRegular r:id="rIdTacteing" w:fontKey="${TACTEING_FONT_GUID}"/>` : ''}
  </w:font>
</w:fonts>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasEmbeddedTacteing ? '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>' : ''}
  ${hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  ${headerMedia && headerMedia.ext !== 'png' ? `<Default Extension="${headerMedia.ext}" ContentType="${headerMedia.contentType}"/>` : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  ${hasHeader ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}
  ${hasFooter ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  ${hasLogo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}
  ${hasHeader ? '<Relationship Id="rIdHdr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ''}
  ${hasFooter ? '<Relationship Id="rIdFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : ''}
</Relationships>`;

  const entries = [
    { path: '[Content_Types].xml', data: contentTypesXml },
    { path: '_rels/.rels', data: relsXml },
    { path: 'word/document.xml', data: documentXml },
    { path: 'word/_rels/document.xml.rels', data: docRelsXml },
    { path: 'word/styles.xml', data: stylesXml },
    { path: 'word/settings.xml', data: settingsXml },
    { path: 'word/fontTable.xml', data: fontTableXml }
  ];

  if (hasEmbeddedTacteing) {
    entries.push({
      path: 'word/_rels/fontTable.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdTacteing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/Tacteing.odttf"/>
</Relationships>`
    });
    entries.push({ path: 'word/fonts/Tacteing.odttf', data: tacteingOdttf });
  }

  if (hasLogo) {
    entries.push({ path: 'word/media/logo.png', data: logoBytes });
  }

  if (hasHeader) {
    entries.push({
      path: 'word/header1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${NS}>
  ${options.headerXml}
</w:hdr>`
    });
    if (headerMedia) {
      entries.push({
        path: 'word/_rels/header1.xml.rels',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdBg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${headerMedia.path}"/>
</Relationships>`
      });
      entries.push({ path: `word/${headerMedia.path}`, data: headerMedia.bytes });
    }
  }

  if (hasFooter) {
    entries.push({
      path: 'word/footer1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${NS}>
  ${options.footerXml}
</w:ftr>`
    });
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
  const [logoBytes, tacteingOdttf] = await Promise.all([
    options.logoBytes || loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));
  const sortedRecords = sortRecordsByDateAsc(records);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  const colWidths = fitColumns(options.compactReasonColumn
    ? [520, 2080, 780, 2740, 1680, 1680, 940] // 1-line 2-reason & 1-line ចំនួនឈប់សរុប for Semester/Year
    : [580, 2150, 920, 2550, 1480, 1680, 1040]);
  const sixthColHeader = options.dateColumnHeader || (options.compactReasonColumn ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ');
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'មូលហេតុ', 'ចំនួនឈប់', sixthColHeader, 'ផ្សេងៗ'];

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
    wParagraph(h, { font: FONT_MOUL, sizePt: 11, align: 'center' }),
    { widthDxa: colWidths[i] }
  )).join('')}
  </w:tr>`;

  const dataRowsXml = sortedRecords.length === 0
    ? [
      `<w:tr>${wCell(
        wParagraph('មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។', { font: FONT_SIEMREAP, sizePt: 11, align: 'center' }),
        { widthDxa: OFFICIAL_CONTENT_DXA, gridSpan: 7 }
      )}</w:tr>`
    ]
    : sortedRecords.map((r, idx) => {
      const cleanDate = normalizeRecordDateStr(r.date || '', useKhmer);
      const vals = [
        { text: fmt(idx + 1), align: 'center', sizePt: 11 },
        { text: r.name || '', align: 'left', sizePt: 11 },
        { text: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), align: 'center', sizePt: 11 },
        { text: String(r.reason || '').replace(/\s+/g, ' ').trim(), align: 'left', sizePt: 11 },
        { text: r.duration || '', align: 'center', sizePt: String(r.duration || '').length > 12 ? 9.5 : 11 },
        { text: cleanDate, align: 'center', sizePt: 11 },
        { text: r.note || '', align: 'center', sizePt: 11 }
      ];
      return `<w:tr>${vals.map((v, i) => wCell(
        wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: v.sizePt || 11, align: v.align }),
        { widthDxa: colWidths[i] }
      )).join('')}</w:tr>`;
    });

  const monthNameOnly = String(monthLabel || '').trim().split(/\s+/)[0] || monthLabel;
  const titleText = options.customPeriodTitle || `ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ${monthLabel}`;
  const sumText = options.customSummaryText || `ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ${monthNameOnly} សរុប ${fmt(sortedRecords.length)}អង្គ`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, false, hasLogo),
    buildWordReportTitle(titleText),
    wTable(colWidths, [headerRowXml, ...dataRowsXml], { bordered: true }),
    wParagraph(sumText, { font: FONT_SIEMREAP, sizePt: 11, bold: false, align: 'left', indentLeft: 0, spaceBefore: 100, spaceAfter: 80, keepNext: true }),
    buildWordOfficialSignatures(metadata, reportDates, false)
  ].join('');

  downloadDocxDocument(bodyXml, `របាយការណ៍ច្បាប់សមណសិស្ស_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes, { tacteingOdttf });
}

/**
 * 2. Export ID Card Purchase Records to Official Word (.docx) matching OfficialIdCardDocument.jsx
 */
export async function exportIdCardToWord(records = [], monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const [logoBytes, tacteingOdttf] = await Promise.all([
    options.logoBytes || loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));
  const sortedRecords = sortRecordsByDateAsc(records);
  const totalAmount = sortedRecords.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  const colWidths = fitColumns([600, 2500, 1000, 2000, 1000, 1620, 1680]);
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'បរិយាយ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ'];

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
    wParagraph(h, { font: FONT_MOUL, sizePt: 11, align: 'center' }),
    { widthDxa: colWidths[i] }
  )).join('')}
  </w:tr>`;

  const dataRowsXml = sortedRecords.length === 0
    ? [
      `<w:tr>${wCell(
        wParagraph('មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID សម្រាប់ខែនេះនៅឡើយទេ។', { font: FONT_SIEMREAP, sizePt: 11, align: 'center' }),
        { widthDxa: OFFICIAL_CONTENT_DXA, gridSpan: 7 }
      )}</w:tr>`
    ]
    : sortedRecords.map((r, idx) => {
      const vals = [
        { text: fmt(idx + 1), align: 'center' },
        { text: r.name || '', align: 'left' },
        { text: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), align: 'center' },
        { text: r.item || '', align: 'center' },
        { text: fmt(r.qty || 1), align: 'center' },
        { text: formatKhmerCurrency(r.price || 0, useKhmer), align: 'right' },
        { text: normalizeRecordDateStr(r.date || '', useKhmer), align: 'center' }
      ];
      return `<w:tr>${vals.map((v, i) => wCell(
        wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: 11, align: v.align }),
        { widthDxa: colWidths[i] }
      )).join('')}</w:tr>`;
    });

  const firstFiveWidth = colWidths.slice(0, 5).reduce((s, w) => s + w, 0);
  const totalRowXml = `<w:tr>
    ${wCell(wParagraph('សរុប', { font: FONT_MOUL, sizePt: 11, align: 'center' }), { widthDxa: firstFiveWidth, gridSpan: 5 })}
    ${wCell(wParagraph(formatKhmerCurrency(totalAmount, useKhmer), { font: FONT_SIEMREAP, sizePt: 11, bold: true, align: 'right' }), { widthDxa: colWidths[5] })}
    ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 11, align: 'center' }), { widthDxa: colWidths[6] })}
  </w:tr>`;

  const titleText = options.customPeriodTitle || `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញ (ID) កាតក្នុងខែ${monthLabel}`;
  const sumText = options.customSummaryText || `សរុបសមណសិស្សទិញ (ID) កាត ចំនួន ${fmt(sortedRecords.length)} អង្គ សរុបទឹកប្រាក់ចំនួន ${formatKhmerCurrency(totalAmount, useKhmer)}។`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, false, hasLogo),
    buildWordReportTitle(titleText),
    wTable(colWidths, [headerRowXml, ...dataRowsXml, totalRowXml], { bordered: true }),
    wParagraph(sumText, { font: FONT_SIEMREAP, sizePt: 11, bold: false, align: 'left', indentLeft: 0, spaceBefore: 100, spaceAfter: 80, keepNext: true }),
    buildWordOfficialSignatures(metadata, reportDates, false)
  ].join('');

  downloadDocxDocument(bodyXml, `តារាងបង់ថ្លៃទិញកាត_ID_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes, { tacteingOdttf });
}

/**
 * 3. Export Financial Records (Income + Expense) to Official Word (.docx) matching OfficialFinanceDocument.jsx & the 5 DOCX files
 */
export async function exportFinanceToWord(financeData = { income: [], expense: [] }, monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const [logoBytes, tacteingOdttf] = await Promise.all([
    options.logoBytes || loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
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

  // Column proportions matching OfficialFinanceDocument.jsx (5% | 40% | 12.5% | 12.5% | 18% | 12%) so long money & កុំព្យូទ័រ១គ្រឿង stay on 1 line
  const colWidths = fitColumns([520, 4160, 1300, 1300, 1872, 1248]);
  const firstFourWidth = colWidths.slice(0, 4).reduce((s, w) => s + w, 0);
  const tableHeaders = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ'];
  const getWordMoneyPt = (txt, base = 11) => {
    const len = String(txt || '').trim().length;
    if (len <= 12) return base;
    if (len <= 15) return Math.max(8.5, base - 1);
    return Math.max(8, base - 2);
  };

  const buildHeaderRow = () => `<w:tr>
    ${tableHeaders.map((h, i) => wCell(
    wParagraph(h, { font: FONT_MOUL, sizePt: 11, align: 'center' }),
    { widthDxa: colWidths[i] }
  )).join('')}
  </w:tr>`;

  const buildItemRows = (list) => list.map((item, idx) => {
    const unitPriceText = item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '';
    const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
      ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
      : formatMoney(item.total, item.currency, useKhmer);
    const vals = [
      { text: fmt(idx + 1), align: 'center', sizePt: 11 },
      { text: item.desc || '', align: 'left', sizePt: String(item.desc || '').length > 42 ? 10 : 11 },
      { text: item.qty || '', align: 'center', sizePt: 11 },
      { text: unitPriceText, align: 'right', sizePt: getWordMoneyPt(unitPriceText, 11) },
      { text: displayTotal, align: 'right', sizePt: getWordMoneyPt(displayTotal, 11) },
      { text: item.note || '', align: 'center', sizePt: 11 }
    ];
    return `<w:tr>${vals.map((v, i) => wCell(
      wParagraph(v.text, { font: FONT_SIEMREAP, sizePt: v.sizePt || 11, align: v.align }),
      { widthDxa: colWidths[i] }
    )).join('')}</w:tr>`;
  });

  const unifiedRowsXml = [];

  if (showIncomeTable) {
    const incTitleRowXml = `<w:tr>
      ${wCell(wParagraph('ចំណូល', { font: FONT_MOUL, sizePt: 12, align: 'center' }), { widthDxa: OFFICIAL_CONTENT_DXA, gridSpan: 6 })}
    </w:tr>`;
    const inKindNote = incomeList.some(it => it?.totalLabel)
      ? incomeList.map(it => it.totalLabel).filter(Boolean).join(', ')
      : '';
    const subIncRowXml = `<w:tr>
      ${wCell(wParagraph('សរុបចំណូល', { font: FONT_MOUL, sizePt: 11, align: 'center' }), { widthDxa: firstFourWidth, gridSpan: 4 })}
      ${wCell(wParagraph(formatCurrencyTotals(incomeTotals, useKhmer), { font: FONT_MOUL, sizePt: 11, underline: 'single', align: 'right' }), { widthDxa: colWidths[4] })}
      ${wCell(wParagraph(inKindNote, { font: FONT_SIEMREAP, sizePt: 10, align: 'center' }), { widthDxa: colWidths[5] })}
    </w:tr>`;

    unifiedRowsXml.push(incTitleRowXml, buildHeaderRow(), ...buildItemRows(incomeList), subIncRowXml);
  }

  if (showExpenseTable) {
    const expTitleRowXml = `<w:tr>
      ${wCell(wParagraph('ចំណាយ', { font: FONT_MOUL, sizePt: 12, align: 'center' }), { widthDxa: OFFICIAL_CONTENT_DXA, gridSpan: 6 })}
    </w:tr>`;
    const subExpRowXml = `<w:tr>
      ${wCell(wParagraph('សរុបចំណាយ', { font: FONT_MOUL, sizePt: 11, align: 'center', color: isDeficit ? 'B91C1C' : '000000' }), { widthDxa: firstFourWidth, gridSpan: 4 })}
      ${wCell(wParagraph(formatExpenseTotals(expenseTotals, isDeficit, useKhmer), { font: FONT_MOUL, sizePt: 11, underline: 'single', align: 'right', color: isDeficit ? 'B91C1C' : '000000' }), { widthDxa: colWidths[4] })}
      ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 10, align: 'center' }), { widthDxa: colWidths[5] })}
    </w:tr>`;

    unifiedRowsXml.push(expTitleRowXml, buildHeaderRow(), ...buildItemRows(expenseList), subExpRowXml);
  }

  const title3Text = options.customPeriodTitle || `តារាងចំណូលចំណាយប្រចាំខែ${monthLabel}`;

  const bodyXml = [
    buildWordOfficialHeader(metadata, false, hasLogo),
    buildWordReportTitle(title3Text),
    ...(unifiedRowsXml.length > 0 ? [wTable(colWidths, unifiedRowsXml, { bordered: true })] : []),
    wParagraph('', { sizePt: 6, spaceAfter: 60 }),
    buildWordOfficialSignatures(metadata, reportDates, true)
  ].join('');

  downloadDocxDocument(bodyXml, `របាយការណ៍ចំណូលចំណាយ_${String(monthLabel).replace(/\s+/g, '_')}.docx`, logoBytes, { tacteingOdttf });
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
  const [logoBytes, tacteingOdttf] = await Promise.all([
    options.logoBytes || loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
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

  // 5 columns matching official A4 Landscape template (818 + 6690 + 2268 + 2779 + 2571 = 15,126 dxa)
  const LANDSCAPE_CONTENT_DXA = 15126;
  const colWidths = [818, 6690, 2268, 2779, 2571];
  const mergedLabelWidth = colWidths[0] + colWidths[1] + colWidths[2]; // 9,776 dxa
  const headers = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'ចំនួនថវិកា', 'ផ្សេងៗ'];
  const { isDeficit } = summaryModel;
  const deficitColor = isDeficit ? 'B91C1C' : '000000';

  const headerRowXml = `<w:tr>
    ${headers.map((h, i) => wCell(
    wParagraph(h, { font: FONT_MOUL, sizePt: 11, align: 'center', spaceBefore: 30, spaceAfter: 30 }),
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
      wParagraph(c.text, { font: FONT_SIEMREAP, sizePt: 11, align: c.align, spaceBefore: 30, spaceAfter: 30 }),
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
    wParagraph(summaryModel.inKindNotes || '', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
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
    wParagraph(summaryModel.inKindNotes || '', { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceAfter: 0 }),
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
    buildWordOfficialHeader(metadata, false, hasLogo, LANDSCAPE_CONTENT_DXA, {
      logoEmu: 560000,
      lineSpaceAfter: 60
    }),
    buildWordReportTitle(summaryModel.reportTitle, { line1Pt: 14, line2Pt: 14, line3Pt: 12 }),
    wTable(colWidths, allTableRowsXml, { bordered: true }),
    wParagraph('', { sizePt: 10, spaceAfter: 120 }),
    buildWordOfficialSignatures(metadata, reportDates, true, LANDSCAPE_CONTENT_DXA, {
      approvalSizePt: 12,
      dateSizePt: 12,
      dateSpaceAfter: 80,
      titleSpaceBefore: 80
    })
  ].join('');

  downloadDocxDocument(
    bodyXml,
    `របាយការណ៍ចំណូលចំណាយសង្ខេប_${String(monthLabel).replace(/\s+/g, '_')}.docx`,
    logoBytes,
    {
      tacteingOdttf,
      pageSize: { w: 16838, h: 11906, orient: 'landscape' },
      pageMargins: { top: 850, right: 856, bottom: 850, left: 856 }
    }
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
 * Runs may be { text, font, sizePt, bold, underline, color } or { tab: true } for a tab character.
 */
function wMultiRunParagraph(runs = [], {
  align = 'both',
  spaceBefore = 0,
  spaceAfter = 0,
  indentLeft = 0,
  firstLine = 0,
  hanging = 0,
  tabStops = []
} = {}) {
  const indAttrs = [
    indentLeft > 0 ? `w:left="${indentLeft}"` : '',
    hanging > 0 ? `w:hanging="${hanging}"` : (firstLine > 0 ? `w:firstLine="${firstLine}"` : '')
  ].filter(Boolean).join(' ');
  const indXml = indAttrs ? `<w:ind ${indAttrs}/>` : '';
  const tabsXml = tabStops.length > 0
    ? `<w:tabs>${tabStops
        .map(t =>
          typeof t === 'object' && t !== null
            ? `<w:tab w:val="${t.val || 'left'}" w:pos="${t.pos}"/>`
            : `<w:tab w:val="left" w:pos="${t}"/>`
        )
        .join('')}</w:tabs>`
    : '';
  const runsXml = runs.map(r => {
    if (r.tab) return '<w:r><w:tab/></w:r>';
    const font = r.font || FONT_SIEMREAP;
    const halfPts = Math.round((r.sizePt || 12) * 2);
    const bXml = r.bold && font !== FONT_MOUL ? '<w:b/><w:bCs/>' : '';
    const colorXml = r.color && r.color !== '000000' ? `<w:color w:val="${r.color}"/>` : '';
    const uXml = r.underline ? '<w:u w:val="single"/>' : '';
    return `<w:r>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>
        ${bXml}
        ${colorXml}
        <w:sz w:val="${halfPts}"/>
        <w:szCs w:val="${halfPts}"/>
        ${uXml}
        <w:cs/>
        <w:lang w:val="km-KH" w:eastAsia="en-US" w:bidi="km-KH"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(r.text || '')}</w:t>
    </w:r>`;
  }).join('');

  return `<w:p>
    <w:pPr>
      ${tabsXml}
      <w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>
      ${indXml}
      <w:jc w:val="${align}"/>
    </w:pPr>
    ${runsXml}
  </w:p>`;
}

/**
 * Split body text into runs: monastic titles in Muol Light and period phrases in bold,
 * mirroring renderParagraphWithMuolHighlights() in OfficialAdminReportDocument.jsx
 */
function buildHighlightedRuns(text = '', boldPhrases = [], sizePt = 12) {
  const tokens = ['ព្រះធម្មសាលវង្ស ព្រះអនុគណ', 'ព្រះអនុគណ', ...boldPhrases.filter(Boolean)];
  let parts = [{ text: String(text || ''), type: 'normal' }];
  tokens.forEach(token => {
    const isMuol = token.includes('ព្រះអនុគណ') || token.includes('ព្រះធម្មសាលវង្ស');
    const next = [];
    parts.forEach(part => {
      if (part.type !== 'normal' || !part.text.includes(token)) {
        next.push(part);
        return;
      }
      const segs = part.text.split(token);
      segs.forEach((seg, idx) => {
        if (seg) next.push({ text: seg, type: 'normal' });
        if (idx < segs.length - 1) next.push({ text: token, type: isMuol ? 'moul' : 'bold' });
      });
    });
    parts = next;
  });
  return parts.map(p => ({
    text: p.text,
    font: p.type === 'moul' ? FONT_MOUL : FONT_SIEMREAP,
    bold: p.type === 'bold',
    sizePt
  }));
}

/**
 * Split a monk's title + name: title prefix in Siemreap, personal name in Muol Light (as in the original .docx)
 */
function splitMonkTitleAndName(fullName = '') {
  const clean = String(fullName || '').trim();
  const prefixes = ['ព្រះបុណ្ណមេធា ', 'ព្រះគ្រូរាជសីហោ ', 'ភិក្ខុ '];
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix)) {
      return { prefix, personal: clean.slice(prefix.length).trim() };
    }
  }
  return { prefix: '', personal: clean };
}

/**
 * Fetch a binary asset from /public (e.g. the official background watermark)
 */
async function loadPublicAssetBytes(url) {
  try {
    if (typeof fetch !== 'function') return null;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Full-page floral watermark exactly as positioned in the original .docx header (VML, behind text)
const ADMIN_WATERMARK_HEADER_XML = `<w:p>
  <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:r>
    <w:rPr><w:noProof/></w:rPr>
    <w:pict>
      <v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f">
        <v:stroke joinstyle="miter"/>
        <v:formulas>
          <v:f eqn="if lineDrawn pixelLineWidth 0"/>
          <v:f eqn="sum @0 1 0"/>
          <v:f eqn="sum 0 0 @1"/>
          <v:f eqn="prod @2 1 2"/>
          <v:f eqn="prod @3 21600 pixelWidth"/>
          <v:f eqn="prod @3 21600 pixelHeight"/>
          <v:f eqn="sum @0 0 1"/>
          <v:f eqn="prod @6 1 2"/>
          <v:f eqn="prod @7 21600 pixelWidth"/>
          <v:f eqn="sum @8 21600 0"/>
          <v:f eqn="prod @7 21600 pixelHeight"/>
          <v:f eqn="sum @10 21600 0"/>
        </v:formulas>
        <v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/>
        <o:lock v:ext="edit" aspectratio="t"/>
      </v:shapetype>
      <v:shape id="WordPictureWatermark1" o:spid="_x0000_s2049" type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:765pt;height:990pt;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f">
        <v:imagedata r:id="rIdBg" o:title="Background"/>
        <w10:wrap anchorx="margin" anchory="margin"/>
      </v:shape>
    </w:pict>
  </w:r>
</w:p>`;

// Centered page number (PAGE field) in the footer, same font setup as the original template
const ADMIN_PAGE_NUMBER_FOOTER_XML = (() => {
  const rPr = '<w:rPr><w:rFonts w:ascii="Limon F3" w:hAnsi="Limon F3" w:cs="Khmer OS Siemreap"/><w:sz w:val="32"/><w:szCs w:val="28"/></w:rPr>';
  return `<w:p>
  <w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
  <w:r>${rPr}<w:fldChar w:fldCharType="begin"/></w:r>
  <w:r>${rPr}<w:instrText xml:space="preserve"> PAGE \\* MERGEFORMAT </w:instrText></w:r>
  <w:r>${rPr}<w:fldChar w:fldCharType="separate"/></w:r>
  <w:r>${rPr}<w:t>1</w:t></w:r>
  <w:r>${rPr}<w:fldChar w:fldCharType="end"/></w:r>
</w:p>`;
})();

/**
 * Export Administrative Narrative Report (Monthly / Semester 1 / Semester 2 / Annual) to Official .docx
 * Layout mirrors របាយការណ៍_ប្រចាំខែ..._ឆ្នាំ២០២៦.docx: single spacing, 12pt body, official margins,
 * floral watermark in the header and a centered page number in the footer.
 */
/**
 * Shared 8-column School History Training Table XML builder with auto-repeating header (<w:tblHeader/>)
 */
function buildSchoolHistoryTableXml(historyModel, contentWidth) {
  const cols = fitColumns([620, 1850, 1520, 1460, 1460, 1460, 1720, 825], contentWidth);
  const headers = ['ល.រ', 'ឆ្នាំសិក្សា', 'ថ្នាក់មត្តេយ្យ', 'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'សរុប', 'ផ្សេងៗ'];
  const hdrRow = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${headers
    .map((h, i) =>
      wCell(wParagraph(h, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceBefore: 36, spaceAfter: 36 }), {
        widthDxa: cols[i]
      })
    )
    .join('')}</w:tr>`;

  const dataRows = (historyModel?.rows || []).map(r => {
    const vals = [r.no, r.academicYearDisplay, r.kgText, r.g1Text, r.g2Text, r.g3Text, r.totalText, r.note || ''];
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${vals
      .map((val, i) =>
        wCell(wParagraph(val, { font: FONT_SIEMREAP, sizePt: 11, align: 'center', spaceBefore: 24, spaceAfter: 24 }), {
          widthDxa: cols[i]
        })
      )
      .join('')}</w:tr>`;
  });

  const totals = historyModel?.totals;
  const totalRow = totals
    ? `<w:tr><w:trPr><w:cantSplit/></w:trPr>
      ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 10.5, align: 'center' }), { widthDxa: cols[0] })}
      ${wCell(wParagraph(totals.label, { font: FONT_MOUL, sizePt: 10, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[1] })}
      ${wCell(wParagraph(totals.kgText, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[2] })}
      ${wCell(wParagraph(totals.g1Text, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[3] })}
      ${wCell(wParagraph(totals.g2Text, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[4] })}
      ${wCell(wParagraph(totals.g3Text, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[5] })}
      ${wCell(wParagraph(totals.grandTotalText, { font: FONT_SIEMREAP, sizePt: 10.5, bold: true, align: 'center', spaceBefore: 32, spaceAfter: 32 }), { widthDxa: cols[6] })}
      ${wCell(wParagraph('', { font: FONT_SIEMREAP, sizePt: 10.5, align: 'center' }), { widthDxa: cols[7] })}
    </w:tr>`
    : '';

  return wTable(cols, [hdrRow, ...dataRows, ...(totalRow ? [totalRow] : [])], { bordered: true });
}

export async function exportAdminReportToWord(displayModel, _metadata = {}) {
  const [logoBytes, bgBytes, tacteingOdttf] = await Promise.all([
    loadOfficialLogoBytes(),
    loadPublicAssetBytes('/report-bg-pattern.jpg'),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const NAVY = '002060';
  const SZ = 12;
  const BODY_INDENT = 567; // list items
  const SUB_INDENT = 284; // ក / ខ / ១ / ២ sub-headings
  const FIRST_LINE = 1134; // paragraph first-line indent

  const pageMargins = { top: 709, right: 425, bottom: 1134, left: 567, header: 720, footer: 284 };
  const contentWidth = 11907 - pageMargins.left - pageMargins.right; // 10,915 dxa

  const topKingdomParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 14, color: NAVY, align: 'center' }),
    wParagraph('ជាតិ   សាសនា   ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 12, color: NAVY, align: 'center' }),
    wTacteingDividerParagraph({ color: NAVY, sizePt: 28 })
  ].join('');

  // Left school block on ONE line each (never wraps): wide zero-margin cell
  const leftSchoolParas = [
    ...(hasLogo ? [wLogoParagraph(460000)] : []),
    wParagraph('សាលាអនុគណក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: SZ, color: NAVY, align: 'center' }),
    wParagraph('ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: SZ, color: NAVY, align: 'center' }),
    wParagraph(`លេខ ${displayModel.docNumber || '......................'}ព.ប.ហ.ណ`, { font: FONT_SIEMREAP, sizePt: SZ, color: NAVY, align: 'center' })
  ].join('');

  const leftColWidth = 6000;
  const leftSchoolTableXml = wTable(
    [leftColWidth, contentWidth - leftColWidth],
    [`<w:tr>${wCell(leftSchoolParas, { widthDxa: leftColWidth, vAlign: 'top', marginsDxa: ZERO_MARGINS })}${wCell(wParagraph('', { sizePt: 11 }), { widthDxa: contentWidth - leftColWidth, vAlign: 'top', marginsDxa: ZERO_MARGINS })}</w:tr>`],
    { bordered: false }
  );

  // Signature block at bottom right
  const sigLeftWidth = 4300;
  const sigRightXml = [
    wParagraph(displayModel.lunarDateLine || '', { font: FONT_SIEMREAP, sizePt: SZ, align: 'center', keepNext: true }),
    wParagraph(displayModel.solarDateLine || '', { font: FONT_SIEMREAP, sizePt: SZ, align: 'center', keepNext: true }),
    wParagraph(displayModel.signerTitle || 'ព្រះនាយក', { font: FONT_MOUL, sizePt: SZ, align: 'center', spaceBefore: 40, spaceAfter: 0 })
  ].join('');

  const signatureTableXml = wTable(
    [sigLeftWidth, contentWidth - sigLeftWidth],
    [`<w:tr><w:trPr><w:cantSplit/></w:trPr>${wCell(wParagraph('', { sizePt: 11 }), { widthDxa: sigLeftWidth, vAlign: 'top', marginsDxa: ZERO_MARGINS })}${wCell(sigRightXml, { widthDxa: contentWidth - sigLeftWidth, vAlign: 'top', marginsDxa: ZERO_MARGINS })}</w:tr>`],
    { bordered: false }
  );

  const sectionHeading = (text) =>
    wParagraph(text, { font: FONT_MOUL, sizePt: SZ, align: 'left', indentLeft: SUB_INDENT, spaceBefore: 60 });
  const subHeading = (text, spaceBefore = 0) =>
    wParagraph(text, { font: FONT_SIEMREAP, sizePt: SZ, bold: true, align: 'left', indentLeft: SUB_INDENT * 2, spaceBefore });
  const listItem = (text, bullet = '-') =>
    wParagraph(`${bullet} ${text}`, { font: FONT_SIEMREAP, sizePt: SZ, align: 'both', indentLeft: BODY_INDENT + SUB_INDENT });
  const bodyPara = (text, boldPhrases = []) =>
    String(text || '')
      .split(/\r?\n/)
      .map(ln => {
        const cleanLn = ln.trim();
        if (!cleanLn) return wParagraph('', { font: FONT_SIEMREAP, sizePt: SZ });
        return wMultiRunParagraph(buildHighlightedRuns(cleanLn, boldPhrases, SZ), {
          align: 'both',
          firstLine: FIRST_LINE
        });
      })
      .join('');

  const buildIntroParas = (introStr, boldPhrases = []) =>
    String(introStr || '')
      .split(/\r?\n/)
      .map(ln => {
        const cleanLn = ln.trim();
        if (!cleanLn) return wParagraph('', { font: FONT_SIEMREAP, sizePt: SZ, indentLeft: 1080 });
        return wMultiRunParagraph(buildHighlightedRuns(cleanLn, boldPhrases, SZ), {
          align: 'both',
          indentLeft: 1080,
          firstLine: 0
        });
      })
      .join('');

  const buildSubjectParas = (subjectStr, boldPhrases = []) => {
    const subjLines = String(subjectStr || '').trim().split(/\r?\n/);
    return subjLines
      .map((ln, idx) => {
        const cleanLn = ln.trim();
        const isLast = idx === subjLines.length - 1;
        if (idx === 0) {
          return wMultiRunParagraph(
            [
              { text: 'កម្មវត្ថុ៖ ', font: FONT_MOUL, sizePt: SZ },
              ...buildHighlightedRuns(cleanLn, boldPhrases, SZ)
            ],
            { align: 'both', indentLeft: 0, spaceAfter: isLast ? 60 : 0 }
          );
        }
        if (!cleanLn) {
          return wParagraph('', { font: FONT_SIEMREAP, sizePt: SZ, spaceAfter: isLast ? 60 : 0 });
        }
        return wMultiRunParagraph(buildHighlightedRuns(cleanLn, boldPhrases, SZ), {
          align: 'both',
          indentLeft: 1080,
          spaceAfter: isLast ? 60 : 0
        });
      })
      .join('');
  };

  const roleTabPos = 4680;
  const includeHist = Boolean(displayModel.includeHistory && displayModel.schoolHistory);
  const resolvedOrder = displayModel.resolvedOrder || {
    top: includeHist
      ? ['background', 'management', 'stats', 'progress', 'challenges', 'directions', 'conclusion']
      : ['management', 'stats', 'progress', 'challenges', 'directions', 'conclusion'],
    progressSub: includeHist
      ? ['activities', 'admin_docs', 'history_table', 'appendix']
      : ['activities', 'admin_docs', 'appendix'],
    challengesSub: ['challenges', 'solutions', 'requests']
  };
  const secNums = displayModel.sectionNumbers || {
    background: includeHist ? 'I' : null,
    management: includeHist ? 'II' : 'I',
    stats: includeHist ? 'III' : 'II',
    progress: includeHist ? 'IV' : 'III',
    challenges: includeHist ? 'V' : 'IV',
    directions: includeHist ? 'VI' : 'V',
    conclusion: includeHist ? 'VII' : 'VI'
  };
  const chalHeadings = displayModel.challengesSubHeadings || {
    challenges: '១-បញ្ហាប្រឈម',
    solutions: '២-ដំណោះស្រាយ',
    requests: '៣-សំណូមពរ'
  };

  const renderAlignedLetterSubHead = (txt) => {
    const m = String(txt || '').match(/^([ក-អ]\.)\s*(.*)$/);
    if (!m) return subHeading(txt);
    const dotPos = SUB_INDENT * 2 + 225;
    const textPos = SUB_INDENT * 2 + 305;
    return wMultiRunParagraph(
      [
        { tab: true },
        { text: m[1], font: FONT_SIEMREAP, sizePt: SZ, bold: true },
        { tab: true },
        { text: m[2], font: FONT_SIEMREAP, sizePt: SZ, bold: true }
      ],
      {
        align: 'left',
        indentLeft: 0,
        tabStops: [
          { val: 'right', pos: dotPos },
          { val: 'left', pos: textPos }
        ]
      }
    );
  };

  const buildTopSectionXml = (topKey) => {
    if (topKey === 'background') {
      if (!includeHist || !displayModel.schoolHistory) return [];
      return [
        sectionHeading(`${secNums.background || 'I'}. សាវតារ`),
        ...(displayModel.schoolHistory.backgroundParagraphs || []).map(p => {
          const cleanP = String(p || '').trim();
          if (!cleanP) return wParagraph('', { font: FONT_SIEMREAP, sizePt: SZ });
          return wParagraph(cleanP, { font: FONT_SIEMREAP, sizePt: SZ, align: 'both', firstLine: FIRST_LINE, spaceAfter: 40 });
        })
      ];
    }
    if (topKey === 'management') {
      return [
        sectionHeading(`${secNums.management}. តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា`),
        String(displayModel.section1Intro || '')
          .split(/\r?\n/)
          .map(ln => {
            const cleanLn = ln.trim();
            if (!cleanLn) return wParagraph('', { font: FONT_SIEMREAP, sizePt: SZ });
            return wMultiRunParagraph(buildHighlightedRuns(cleanLn, [], SZ), {
              align: 'both',
              indentLeft: BODY_INDENT + SUB_INDENT,
              firstLine: 680
            });
          })
          .join(''),
        ...(displayModel.managementRoles || []).map((m) => {
          const { prefix, personal } = splitMonkTitleAndName(m.name);
          return wMultiRunParagraph([
            { text: '- ', font: FONT_SIEMREAP, sizePt: SZ },
            ...(prefix ? [{ text: prefix, font: FONT_SIEMREAP, sizePt: SZ }] : []),
            { text: personal, font: FONT_MOUL, sizePt: SZ },
            { tab: true },
            { text: m.role || '', font: FONT_SIEMREAP, sizePt: SZ }
          ], { align: 'left', indentLeft: BODY_INDENT + SUB_INDENT, tabStops: [roleTabPos] });
        })
      ];
    }
    if (topKey === 'stats') {
      return [
        sectionHeading(`${secNums.stats}. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស`),
        subHeading('ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ'),
        ...(displayModel.staffStats || []).map(line => listItem(line)),
        subHeading('ខ-ចំនួនថ្នាក់ សមណសិស្ស'),
        ...(displayModel.studentStatLines || []).map(line => listItem(line))
      ];
    }
    if (topKey === 'progress') {
      const progressParts = [
        sectionHeading(
          `${secNums.progress}. ${String(displayModel.section3Heading || '').replace(/^[IVX]+\.+\s*/, '')}`
        )
      ];
      (resolvedOrder.progressSub || []).forEach(subKey => {
        if (subKey === 'activities') {
          progressParts.push(renderAlignedLetterSubHead(displayModel.section3SubAHeading));
          (displayModel.activities || []).forEach(line => progressParts.push(listItem(line, '❖')));
        } else if (subKey === 'admin_docs') {
          progressParts.push(
            renderAlignedLetterSubHead(
              displayModel.section3SubBHeading ||
                'ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល កំណត់ហេតុ និងរបាយការណ៍'
            )
          );
          (displayModel.adminDocLines || []).forEach(line => progressParts.push(listItem(line)));
        } else if (subKey === 'history_table' && includeHist && displayModel.schoolHistory) {
          const dynamicPrefix = displayModel.section3HistoryPrefix || 'គ.';
          if (displayModel.schoolHistory.tableIntro) {
            const gSubLeft = SUB_INDENT * 2;
            const introLines = String(displayModel.schoolHistory.tableIntro || '').trim().split(/\r?\n/);
            let appliedPrefix = false;
            introLines.forEach((ln, idx) => {
              let cleanLn = ln.trim();
              const isFirst = idx === 0;
              const isLast = idx === introLines.length - 1;
              if (!cleanLn) {
                progressParts.push(
                  wParagraph('', {
                    font: FONT_SIEMREAP,
                    sizePt: SZ,
                    indentLeft: 0,
                    spaceBefore: isFirst ? 60 : 0,
                    spaceAfter: isLast ? 60 : 0
                  })
                );
                return;
              }
              if (!appliedPrefix) {
                appliedPrefix = true;
                cleanLn = cleanLn.replace(/^[ក-អ]\.\s*/, '').trim();
                progressParts.push(
                  wMultiRunParagraph(
                    [
                      { text: `${dynamicPrefix} `, font: FONT_SIEMREAP, sizePt: SZ, bold: true },
                      ...(cleanLn ? [{ text: cleanLn, font: FONT_SIEMREAP, sizePt: SZ }] : [])
                    ],
                    {
                      align: 'both',
                      indentLeft: 0,
                      firstLine: gSubLeft,
                      spaceBefore: 60,
                      spaceAfter: isLast ? 60 : 0
                    }
                  )
                );
                return;
              }
              progressParts.push(
                wParagraph(cleanLn, {
                  font: FONT_SIEMREAP,
                  sizePt: SZ,
                  align: 'both',
                  indentLeft: 0,
                  firstLine: 0,
                  spaceAfter: isLast ? 60 : 0
                })
              );
            });
          }
          progressParts.push(buildSchoolHistoryTableXml(displayModel.schoolHistory, contentWidth));
          progressParts.push(wParagraph('', { sizePt: 6, spaceAfter: 40 }));
        } else if (subKey === 'appendix') {
          progressParts.push(renderAlignedLetterSubHead(displayModel.section3SubCHeading));
          progressParts.push(renderAlignedLetterSubHead(displayModel.section3SubDHeading));
          (displayModel.appendixItems || []).forEach(line => progressParts.push(listItem(line)));
        }
      });
      return progressParts;
    }
    if (topKey === 'challenges') {
      const chalParts = [sectionHeading(`${secNums.challenges}. បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ`)];
      const subDataMap = {
        challenges: { heading: chalHeadings.challenges, items: displayModel.challenges || [] },
        solutions: { heading: chalHeadings.solutions, items: displayModel.solutions || [] },
        requests: { heading: chalHeadings.requests, items: displayModel.requests || [] }
      };
      (resolvedOrder.challengesSub || ['challenges', 'solutions', 'requests']).forEach(subKey => {
        const cfg = subDataMap[subKey];
        if (!cfg) return;
        chalParts.push(subHeading(cfg.heading));
        cfg.items.forEach(line => chalParts.push(listItem(line)));
      });
      return chalParts;
    }
    if (topKey === 'directions') {
      return [
        sectionHeading(`${secNums.directions}. ទិសដៅបន្ត`),
        ...(displayModel.directions || []).map(line => listItem(line))
      ];
    }
    if (topKey === 'conclusion') {
      return [
        sectionHeading(`${secNums.conclusion}. សន្និដ្ឋាន`),
        bodyPara(displayModel.conclusionText)
      ];
    }
    return [];
  };

  const bodyParts = [
    topKingdomParas,
    leftSchoolTableXml,
    wParagraph('សូមក្រាបថ្វាយបង្គំ', { font: FONT_MOUL, sizePt: 14, color: NAVY, align: 'center', spaceBefore: 60 }),
    wParagraph(displayModel.recipientTitle, { font: FONT_MOUL, sizePt: SZ, color: NAVY, align: 'center' }),
    wParagraph('ជាទីគោរពសក្ការៈដ៏ខ្ពង់ខ្ពស់!', { font: FONT_SIEMREAP, sizePt: SZ, bold: true, align: 'right', spaceAfter: 120 }),

    // Subject (កម្មវត្ថុ) — period phrase bold, monastic titles in Muol Light, respects Enter line breaks
    buildSubjectParas(displayModel.subjectText, [displayModel.periodTitlePhrase]),

    // Intro Paragraph (aligned straight under កម្មវត្ថុ៖ text at 1080 dxa — exact match with A4 Preview/PDF)
    buildIntroParas(displayModel.introParagraph, [displayModel.inPeriodPhrase]),

    // Dynamic Option-B Ordered Sections (I..VII, ក..ង, ១-..៣-)
    ...(resolvedOrder.top || []).flatMap(buildTopSectionXml),

    // Closing statement & Official Signature block anchored cleanly at the end
    bodyPara(displayModel.closingLine1),
    bodyPara(displayModel.closingLine2),
    wParagraph('', { sizePt: 8, spaceAfter: 60 }),
    signatureTableXml
  ];

  downloadDocxDocument(
    bodyParts.join(''),
    `របាយការណ៍_${displayModel.shortFileNameTag}.docx`,
    logoBytes,
    {
      tacteingOdttf,
      pageSize: { w: 11907, h: 16840 },
      pageMargins,
      headerXml: bgBytes ? ADMIN_WATERMARK_HEADER_XML : '',
      headerMedia: bgBytes ? { path: 'media/bg.jpeg', bytes: bgBytes, ext: 'jpeg', contentType: 'image/jpeg' } : null,
      footerXml: ADMIN_PAGE_NUMBER_FOOTER_XML
    }
  );
}

/**
 * Export Ministry 1-Page Summary Report (របាយការណ៍សង្ខេបប្រចាំឆ្នាំ — Letter Portrait) to Word (.docx)
 */
export async function exportMinistrySummaryToWord(ministryModel) {
  if (!ministryModel) return;
  const [logoBytes, tacteingOdttf] = await Promise.all([
    loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);

  // Letter Portrait (12240 x 15840 dxa) with margins matching 2025 template
  const pageMargins = { top: 568, right: 920, bottom: 820, left: 920 };
  const contentWidth = 12240 - pageMargins.left - pageMargins.right; // 10400 dxa

  const leftHeaderParas = [
    ...(hasLogo ? [wLogoParagraph(440000)] : []),
    wParagraph('មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, align: 'center' }),
    wParagraph('ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង', { font: FONT_MOUL, sizePt: 11, align: 'center' }),
    wParagraph('ក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, align: 'center' })
  ].join('');

  const rightHeaderParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 12.5, align: 'center' }),
    wParagraph('ជាតិ សាសនា ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 11.5, align: 'center' }),
    wTacteingDividerParagraph({ color: '000000', sizePt: 26 })
  ].join('');

  const headerWidths = [5200, contentWidth - 5200];
  const headerTableXml = wTable(
    headerWidths,
    [
      `<w:tr>${wCell(leftHeaderParas, { widthDxa: headerWidths[0], vAlign: 'top', marginsDxa: ZERO_MARGINS })}${wCell(
        rightHeaderParas,
        { widthDxa: headerWidths[1], vAlign: 'top', marginsDxa: ZERO_MARGINS }
      )}</w:tr>`
    ],
    { bordered: false }
  );

  const colWidths = fitColumns([900, 4300, 2270, 2502], contentWidth);
  const headers = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'ផ្សេងៗ'];
  const headerRowXml = `<w:tr>${headers
    .map((h, i) =>
      wCell(wParagraph(h, { font: FONT_MOUL, sizePt: 11.5, align: 'center', spaceBefore: 40, spaceAfter: 40 }), {
        widthDxa: colWidths[i]
      })
    )
    .join('')}</w:tr>`;

  const bodyRowsXml = (ministryModel.summaryRows || []).map(row => {
    const descParas = [
      wParagraph(row.desc || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'left', spaceBefore: 24, spaceAfter: 24 }),
      ...(row.subDescLines || []).map(sub =>
        wParagraph(sub, { font: FONT_SIEMREAP, sizePt: 12, align: 'left', indentLeft: 240, spaceBefore: 10, spaceAfter: 20 })
      )
    ].join('');

    const countParas = [
      wParagraph(row.count || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'center', spaceBefore: 24, spaceAfter: 24 }),
      ...(row.subCountLines || []).map(subC =>
        wParagraph(subC, { font: FONT_SIEMREAP, sizePt: 12, align: 'center', spaceBefore: 10, spaceAfter: 20 })
      )
    ].join('');

    return `<w:tr>
      ${wCell(wParagraph(row.no || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'center' }), { widthDxa: colWidths[0] })}
      ${wCell(descParas, { widthDxa: colWidths[1] })}
      ${wCell(countParas, { widthDxa: colWidths[2] })}
      ${wCell(wParagraph(row.note || '', { font: FONT_SIEMREAP, sizePt: 12, align: 'center' }), { widthDxa: colWidths[3] })}
    </w:tr>`;
  });

  const compactLunar = formatMinistryLunarDateLine(ministryModel.lunarDateLine);
  const compactSolar = formatMinistrySolarDateLine(ministryModel.solarDateLine);
  const compactDocNo = String(ministryModel.docNumber || '................').replace(/[.…]{4,}/g, '................').trim();

  const leftSigParas = [
    wParagraph('', { sizePt: 11.5 }),
    wParagraph(`លេខ ${compactDocNo}`, {
      font: FONT_SIEMREAP,
      sizePt: 11.5,
      align: 'center',
      keepNext: true
    }),
    wParagraph('បានឃើញ និងឯកភាព', { font: FONT_MOUL, sizePt: 12, align: 'center', keepNext: true }),
    wParagraph(compactLunar, { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(compactSolar, { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(ministryModel.signerTitle || 'ព្រះនាយក', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 60 })
  ].join('');

  const rightSigParas = [
    wParagraph(compactLunar, { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(compactSolar, { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍', {
      font: FONT_MOUL,
      sizePt: 12.5,
      align: 'center',
      spaceBefore: 60
    })
  ].join('');

  const sigWidths = [5160, contentWidth - 5160];
  const sigTableXml = wTable(
    sigWidths,
    [
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>${wCell(leftSigParas, {
        widthDxa: sigWidths[0],
        vAlign: 'top',
        marginsDxa: ZERO_MARGINS
      })}${wCell(rightSigParas, { widthDxa: sigWidths[1], vAlign: 'top', marginsDxa: ZERO_MARGINS })}</w:tr>`
    ],
    { bordered: false }
  );

  const bodyXml = [
    headerTableXml,
    wParagraph(ministryModel.summaryReportTitle, {
      font: FONT_MOUL,
      sizePt: 14,
      align: 'center',
      spaceBefore: 160,
      spaceAfter: 180
    }),
    wTable(colWidths, [headerRowXml, ...bodyRowsXml], { bordered: true }),
    wParagraph('', { sizePt: 10, spaceAfter: 140 }),
    sigTableXml
  ].join('');

  downloadDocxDocument(bodyXml, `របាយការណ៍_${ministryModel.shortSummaryFileNameTag}.docx`, logoBytes, {
    tacteingOdttf,
    pageSize: { w: 12240, h: 15840 },
    pageMargins
  });
}

const MINISTRY_FULL_RUNNING_HF_TEXT =
  'របាយការណ៍ ប្រចាំឆ្នាំ សាលាពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម';

// Authentic running header for Ministry Full Annual Report
// (Khmer OS Battambang 10pt Italic + thickThinSmallGap 3pt #823B0B bottom border)
const MINISTRY_FULL_HEADER_XML = `<w:p>
  <w:pPr>
    <w:pBdr>
      <w:bottom w:val="thickThinSmallGap" w:sz="24" w:space="1" w:color="823B0B"/>
    </w:pBdr>
    <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
    <w:jc w:val="left"/>
  </w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="${FONT_BATTAMBANG}" w:hAnsi="${FONT_BATTAMBANG}" w:cs="${FONT_BATTAMBANG}" w:eastAsia="${FONT_BATTAMBANG}"/>
      <w:i/><w:iCs/>
      <w:sz w:val="20"/><w:szCs w:val="20"/>
    </w:rPr>
    <w:t>${escapeXml(MINISTRY_FULL_RUNNING_HF_TEXT)}</w:t>
  </w:r>
</w:p>`;

// Authentic running footer for Ministry Full Annual Report
// (thinThickSmallGap 3pt #823B0B top border + left italic title + right "ទំព័រ ១")
function buildMinistryFullFooterXml(contentWidthDxa = 10206) {
  const leftRPr = `<w:rPr><w:rFonts w:ascii="${FONT_BATTAMBANG}" w:hAnsi="${FONT_BATTAMBANG}" w:cs="${FONT_BATTAMBANG}" w:eastAsia="${FONT_BATTAMBANG}"/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>`;
  const rightRPr = `<w:rPr><w:rFonts w:ascii="${FONT_BATTAMBANG}" w:hAnsi="${FONT_BATTAMBANG}" w:cs="${FONT_BATTAMBANG}" w:eastAsia="${FONT_BATTAMBANG}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="km-KH" w:bidi="km-KH"/></w:rPr>`;
  return `<w:p>
  <w:pPr>
    <w:pBdr>
      <w:top w:val="thinThickSmallGap" w:sz="24" w:space="1" w:color="823B0B"/>
    </w:pBdr>
    <w:tabs>
      <w:tab w:val="right" w:pos="${contentWidthDxa}"/>
    </w:tabs>
    <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
  </w:pPr>
  <w:r>${leftRPr}<w:t>${escapeXml(MINISTRY_FULL_RUNNING_HF_TEXT)}</w:t></w:r>
  <w:r>${rightRPr}<w:tab/></w:r>
  <w:r>${rightRPr}<w:t xml:space="preserve">ទំព័រ </w:t></w:r>
  <w:r>${rightRPr}<w:fldChar w:fldCharType="begin"/></w:r>
  <w:r>${rightRPr}<w:instrText xml:space="preserve"> PAGE \\* MERGEFORMAT </w:instrText></w:r>
  <w:r>${rightRPr}<w:fldChar w:fldCharType="separate"/></w:r>
  <w:r>${rightRPr}<w:t>១</w:t></w:r>
  <w:r>${rightRPr}<w:fldChar w:fldCharType="end"/></w:r>
</w:p>`;
}

/**
 * Export Ministry Full Multi-Page Report (របាយការណ៍ប្រចាំឆ្នាំ — A4 Portrait) to Word (.docx)
 */
export async function exportMinistryReportToWord(ministryModel) {
  if (!ministryModel) return;
  const [logoBytes, tacteingOdttf] = await Promise.all([
    loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);

  const pageMargins = { top: 1020, right: 850, bottom: 980, left: 850, header: 420, footer: 420 };
  const contentWidth = 11906 - pageMargins.left - pageMargins.right; // 10206 dxa
  const SZ = 12;

  const hCell = (text, widthDxa, extra = {}) =>
    wCell(wParagraph(text, { font: FONT_MOUL, sizePt: 10.5, align: 'center', spaceBefore: 24, spaceAfter: 24 }), {
      widthDxa,
      ...extra
    });

  const dCell = (text, widthDxa, align = 'center', extra = {}) =>
    wCell(
      wParagraph(text || '', {
        font: extra.moul ? FONT_MOUL : FONT_BATTAMBANG,
        sizePt: extra.sizePt || (extra.moul ? 11 : 12),
        bold: Boolean(extra.bold),
        align,
        spaceBefore: 20,
        spaceAfter: 20
      }),
      { widthDxa, gridSpan: extra.gridSpan || 1, vMerge: extra.vMerge || '' }
    );

  // Build Hourly Semester Table XML (ច & ច.១)
  const buildHourlySemTableXml = (tblData) => {
    const cols = fitColumns([612, 1633, 1837, 1837, 1531, 1633, 1123], contentWidth);
    const hdrRow = `<w:tr>${['ល.រ', 'បរិយាយ', 'ចំណូលរួម', 'ចំណាយ', 'ចំនួនម៉ោង', 'សមតុល្យ', 'ផ្សេងៗ']
      .map((h, i) => hCell(h, cols[i]))
      .join('')}</w:tr>`;
    const dataRows = (tblData?.rows || []).map(
      r =>
        `<w:tr>${dCell(r.no, cols[0])}${dCell(r.label, cols[1])}${dCell(r.incomeText, cols[2])}${dCell(
          r.expenseText,
          cols[3]
        )}${dCell(r.hoursText, cols[4])}${dCell(r.balanceText, cols[5])}${dCell(r.note || '', cols[6])}</w:tr>`
    );
    const totalRow = `<w:tr>
      ${dCell('សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់', cols[0] + cols[1], 'center', { gridSpan: 2, moul: true, sizePt: 10 })}
      ${dCell(tblData?.sumIncomeText, cols[2], 'center', { bold: true })}
      ${dCell(tblData?.sumExpenseText, cols[3], 'center', { bold: true })}
      ${dCell(tblData?.sumHoursText, cols[4], 'center', { bold: true })}
      ${dCell(tblData?.totalBalanceText, cols[5], 'center', { bold: true })}
      ${dCell('', cols[6])}
    </w:tr>`;
    return wTable(cols, [hdrRow, ...dataRows, totalRow], { bordered: true });
  };

  // Build Hourly Annual Table XML (ច.២)
  const buildHourlyAnnualTableXml = (tblData) => {
    const cols = fitColumns([800, 2200, 2000, 2000, 1500, 1706], contentWidth);
    const hdrRow = `<w:tr>${['ល.រ', 'បរិយាយ', 'ចំណូល', 'ចំណាយ', 'ចំនួនម៉ោង', 'សមតុល្យ']
      .map((h, i) => hCell(h, cols[i]))
      .join('')}</w:tr>`;
    const dataRows = (tblData?.rows || []).map(
      r =>
        `<w:tr>${dCell(r.no, cols[0])}${dCell(r.label, cols[1])}${dCell(r.incomeText, cols[2])}${dCell(
          r.expenseText,
          cols[3]
        )}${dCell(r.hoursText, cols[4])}${dCell(r.balanceText, cols[5])}</w:tr>`
    );
    const totalRow = `<w:tr>
      ${dCell('សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់', cols[0] + cols[1], 'center', { gridSpan: 2, moul: true, sizePt: 10 })}
      ${dCell(tblData?.sumIncomeText, cols[2], 'center', { bold: true })}
      ${dCell(tblData?.sumExpenseText, cols[3], 'center', { bold: true })}
      ${dCell(tblData?.sumHoursText, cols[4], 'center', { bold: true })}
      ${dCell(tblData?.totalBalanceText, cols[5], 'center', { bold: true })}
    </w:tr>`;
    return wTable(cols, [hdrRow, ...dataRows, totalRow], { bordered: true });
  };

  // Build Office Supplies Semester Tables XML (ច.៣ & ច.៤)
  const buildOfficeSemTablesXml = (semData) => {
    const expCols = fitColumns([612, 3980, 1327, 1531, 1633, 1123], contentWidth);
    const expBanner = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${hCell('តារាងចំណាយ', contentWidth, { gridSpan: 6 })}</w:tr>`;
    const expHdr = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ']
      .map((h, i) => hCell(h, expCols[i]))
      .join('')}</w:tr>`;
    const expRows =
      (semData?.expenseRows || []).length === 0
        ? [`<w:tr>${dCell('គ្មាន', contentWidth, 'center', { gridSpan: 6 })}</w:tr>`]
        : semData.expenseRows.map(
          r =>
            `<w:tr>${dCell(r.no, expCols[0])}${dCell(r.desc, expCols[1], 'left')}${dCell(
              r.qty,
              expCols[2]
            )}${dCell(r.unitPriceText, expCols[3])}${dCell(r.amountText, expCols[4])}${dCell(
              r.note,
              expCols[5]
            )}</w:tr>`
        );
    const expTotal = `<w:tr>
      ${dCell('ចំណាយសរុប', expCols[0] + expCols[1] + expCols[2] + expCols[3], 'center', { gridSpan: 4, moul: true })}
      ${dCell(semData?.totalExpenseText, expCols[4], 'center', { bold: true })}
      ${dCell('', expCols[5], 'center')}
    </w:tr>`;

    const incCols = fitColumns([800, 4100, 1850, 1450, 2006], contentWidth);
    const incBanner = `<w:tr>${hCell('តារាងចំណូល', contentWidth, { gridSpan: 5 })}</w:tr>`;
    const incHdr1 = `<w:tr>
      ${hCell('ល.រ', incCols[0], { vMerge: 'restart' })}
      ${hCell('បរិយាយ', incCols[1], { vMerge: 'restart' })}
      ${hCell('ថវិកា', incCols[2] + incCols[3], { gridSpan: 2 })}
      ${hCell('សេចក្ដីផ្សេងៗ', incCols[4], { vMerge: 'restart' })}
    </w:tr>`;
    const incHdr2 = `<w:tr>
      ${hCell('', incCols[0], { vMerge: 'continue' })}
      ${hCell('', incCols[1], { vMerge: 'continue' })}
      ${hCell('រៀល', incCols[2])}
      ${hCell('ដុល្លារ', incCols[3])}
      ${hCell('', incCols[4], { vMerge: 'continue' })}
    </w:tr>`;
    const incRows =
      (semData?.incomeRows || []).length === 0
        ? [`<w:tr>${dCell('គ្មាន', contentWidth, 'center', { gridSpan: 5 })}</w:tr>`]
        : semData.incomeRows.map(
          r =>
            `<w:tr>${dCell(r.no, incCols[0])}${dCell(r.desc, incCols[1], 'left')}${dCell(
              r.khrText,
              incCols[2]
            )}${dCell(r.usdText, incCols[3])}${dCell(r.note, incCols[4])}</w:tr>`
        );
    const incTotal = `<w:tr>
      ${dCell('សរុបចំណូល', incCols[0] + incCols[1], 'center', { gridSpan: 2, moul: true })}
      ${dCell(semData?.totalIncomeKHRText, incCols[2], 'center', { bold: true })}
      ${dCell(semData?.totalIncomeUSDText, incCols[3], 'center', { bold: true })}
      ${dCell(semData?.inKindSummary || '', incCols[4], 'center')}
    </w:tr>`;

    return [
      wTable(expCols, [expBanner, expHdr, ...expRows, expTotal], { bordered: true }),
      wTable(incCols, [incBanner, incHdr1, incHdr2, ...incRows, incTotal], { bordered: true })
    ].join('');
  };

  // ច.៥ Office Annual Table
  const officeAnnCols = fitColumns([800, 2400, 2300, 2300, 2406], contentWidth);
  const officeAnnXml = wTable(
    officeAnnCols,
    [
      `<w:tr>${['ល.រ', 'បរិយាយ', 'ចំណូល', 'ចំណាយ', 'ផ្សេងៗ'].map((h, i) => hCell(h, officeAnnCols[i])).join('')}</w:tr>`,
      ...(ministryModel.officeAnnual?.rows || []).map(
        r =>
          `<w:tr>${dCell(r.no, officeAnnCols[0])}${dCell(r.label, officeAnnCols[1])}${dCell(
            r.incomeText,
            officeAnnCols[2]
          )}${dCell(r.expenseText, officeAnnCols[3])}${dCell(r.note || '', officeAnnCols[4])}</w:tr>`
      ),
      `<w:tr>
        ${dCell('សរុបទាំងពីរឆមាស', officeAnnCols[0] + officeAnnCols[1], 'center', { gridSpan: 2, moul: true })}
        ${dCell(ministryModel.officeAnnual?.totalIncomeText, officeAnnCols[2], 'center', { bold: true })}
        ${dCell(ministryModel.officeAnnual?.totalExpenseText, officeAnnCols[3], 'center', { bold: true })}
        ${dCell(ministryModel.officeAnnual?.inKindSummary || '', officeAnnCols[4], 'center')}
      </w:tr>`
    ],
    { bordered: true }
  );

  // Award Ceremony Table
  const awardCols = fitColumns([800, 4800, 2500, 2106], contentWidth);
  const awardXml = wTable(
    awardCols,
    [
      `<w:tr>${dCell('១', awardCols[0])}${dCell('ចំណូលពីការចែកបណ្ណសរសើរ', awardCols[1], 'left')}${dCell(
        ministryModel.awardCeremonyTable?.income1Text,
        awardCols[2]
      )}${dCell('', awardCols[3])}</w:tr>`,
      `<w:tr>${dCell('២', awardCols[0])}${dCell('ចំណូលពីវត្ត', awardCols[1], 'left')}${dCell(
        ministryModel.awardCeremonyTable?.income2Text,
        awardCols[2]
      )}${dCell('', awardCols[3])}</w:tr>`,
      `<w:tr>${dCell('ចំណូលសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ', awardCols[0] + awardCols[1], 'center', {
        gridSpan: 2,
        moul: true
      })}${dCell(ministryModel.awardCeremonyTable?.totalIncomeText, awardCols[2], 'center', { bold: true })}${dCell(
        '',
        awardCols[3]
      )}</w:tr>`,
      `<w:tr>${dCell('ចំណាយសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ', awardCols[0] + awardCols[1], 'center', {
        gridSpan: 2,
        moul: true
      })}${dCell(ministryModel.awardCeremonyTable?.totalExpenseText, awardCols[2], 'center', { bold: true })}${dCell(
        '',
        awardCols[3]
      )}</w:tr>`
    ],
    { bordered: true }
  );

  // Grand Annual Table
  const grandCols = fitColumns([714, 3470, 2450, 1531, 2041], contentWidth);
  const grandXml = wTable(
    grandCols,
    [
      `<w:tr>
        ${hCell('ល.រ', grandCols[0], { vMerge: 'restart' })}
        ${hCell('បរិយាយ', grandCols[1], { vMerge: 'restart' })}
        ${hCell('ថវិកា', grandCols[2] + grandCols[3], { gridSpan: 2 })}
        ${hCell('ផ្សេងៗ', grandCols[4], { vMerge: 'restart' })}
      </w:tr>`,
      `<w:tr>
        ${hCell('', grandCols[0], { vMerge: 'continue' })}
        ${hCell('', grandCols[1], { vMerge: 'continue' })}
        ${hCell('រៀល', grandCols[2])}
        ${hCell('ដុល្លារ', grandCols[3])}
        ${hCell('', grandCols[4], { vMerge: 'continue' })}
      </w:tr>`,
      `<w:tr>${dCell('១', grandCols[0])}${dCell('ចំណូលរួមប្រចាំឆ្នាំ', grandCols[1], 'left')}${dCell(
        ministryModel.grandAnnualTable?.incomeKHRText,
        grandCols[2],
        'center',
        { bold: true }
      )}${dCell(ministryModel.grandAnnualTable?.incomeUSDText, grandCols[3], 'center', { bold: true })}${dCell(
        '',
        grandCols[4]
      )}</w:tr>`,
      `<w:tr>${dCell('២', grandCols[0])}${dCell('ចំណាយរួមប្រចាំឆ្នាំ', grandCols[1], 'left')}${dCell(
        ministryModel.grandAnnualTable?.expenseKHRText,
        grandCols[2],
        'center',
        { bold: true }
      )}${dCell(ministryModel.grandAnnualTable?.expenseUSDText, grandCols[3], 'center', { bold: true })}${dCell(
        '',
        grandCols[4]
      )}</w:tr>`,
      `<w:tr>${dCell('សមតុល្យ', grandCols[0] + grandCols[1], 'center', { gridSpan: 2, moul: true })}${dCell(
        ministryModel.grandAnnualTable?.balanceKHRText,
        grandCols[2],
        'center',
        { moul: true }
      )}${dCell(ministryModel.grandAnnualTable?.balanceUSDText, grandCols[3], 'center', { moul: true })}${dCell(
        ministryModel.grandAnnualTable?.balanceNote,
        grandCols[4],
        'center'
      )}</w:tr>`
    ],
    { bordered: true }
  );

  const secHead = (txt) => wParagraph(txt, { font: FONT_MOUL, sizePt: SZ, align: 'left', spaceBefore: 80, spaceAfter: 30 });
  const subHead = (txt) =>
    wParagraph(txt, { font: FONT_BATTAMBANG, sizePt: SZ, bold: true, align: 'left', indentLeft: 280, spaceBefore: 40, spaceAfter: 20 });
  const bulletPara = (txt) =>
    wParagraph(`-${txt}`, { font: FONT_BATTAMBANG, sizePt: SZ, align: 'both', indentLeft: 360, spaceAfter: 16 });

  const leftSchoolTableXml = wTable(
    [5500, contentWidth - 5500],
    [
      `<w:tr>${wCell(
        [
          ...(hasLogo ? [wLogoParagraph(450000)] : []),
          wParagraph('មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, align: 'center' }),
          wParagraph('ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង', { font: FONT_MOUL, sizePt: 11, align: 'center' }),
          wParagraph('ក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, align: 'center' })
        ].join(''),
        { widthDxa: 5500, vAlign: 'top', marginsDxa: ZERO_MARGINS }
      )}${wCell(wParagraph('', { sizePt: 10 }), {
        widthDxa: contentWidth - 5500,
        vAlign: 'top',
        marginsDxa: ZERO_MARGINS
      })}</w:tr>`
    ],
    { bordered: false }
  );

  const compactFullLunar = formatMinistryLunarDateLine(ministryModel.lunarDateLine);
  const compactFullSolar = formatMinistrySolarDateLine(ministryModel.solarDateLine);
  const compactFullDocNo = String(ministryModel.docNumber || '................').replace(/[.…]{4,}/g, '................').trim();

  const sigRightParas = [
    wParagraph(compactFullLunar, { font: FONT_BATTAMBANG, sizePt: 12, align: 'center', keepNext: true }),
    wParagraph(compactFullSolar, { font: FONT_BATTAMBANG, sizePt: 12, align: 'center', keepNext: true }),
    wParagraph(ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 60 })
  ].join('');

  const sigLeftParas = [
    wParagraph('', { sizePt: 11.5 }),
    wParagraph(`លេខ ${compactFullDocNo}`, {
      font: FONT_BATTAMBANG,
      sizePt: 12,
      align: 'center',
      keepNext: true
    }),
    wParagraph('បានឃើញ និងឯកភាព', { font: FONT_MOUL, sizePt: 12.5, align: 'center', keepNext: true }),
    wParagraph(ministryModel.signerTitle || 'ព្រះនាយក', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 60 })
  ].join('');

  const sigTableXml = wTable(
    [4600, contentWidth - 4600],
    [
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>${wCell(sigLeftParas, {
        widthDxa: 4600,
        vAlign: 'top',
        marginsDxa: ZERO_MARGINS
      })}${wCell(sigRightParas, { widthDxa: contentWidth - 4600, vAlign: 'top', marginsDxa: ZERO_MARGINS })}</w:tr>`
    ],
    { bordered: false }
  );

  const bodyParts = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 13, align: 'center' }),
    wParagraph('ជាតិ សាសនា ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 12, align: 'center' }),
    wTacteingDividerParagraph({ color: '000000', sizePt: 26 }),
    leftSchoolTableXml,
    wParagraph('របាយការណ៍', { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceBefore: 60 }),
    wParagraph('ស្តីពី', { font: FONT_MOUL, sizePt: 12, align: 'center' }),
    wParagraph(ministryModel.fullReportTitle, { font: FONT_MOUL, sizePt: 12.5, align: 'center', spaceAfter: 80 }),

    // ក.ព័ត៌មានទូទៅ
    secHead('ក.ព័ត៌មានទូទៅ'),
    ...(ministryModel.generalInfoLines || []).map(row =>
      row.value
        ? wMultiRunParagraph(
          [
            { text: `-${row.label}`, font: FONT_BATTAMBANG, sizePt: SZ },
            { tab: true },
            { text: row.value, font: FONT_BATTAMBANG, sizePt: SZ }
          ],
          { align: 'left', indentLeft: 280, tabStops: [6600] }
        )
        : bulletPara(row.label)
    ),

    // ខ
    secHead('ខ.អំពីសកម្មភាពនៅក្នុងសាលា៖ (គ្រូ និង សមណសិស្ស សិស្ស)'),
    subHead('ខ.១. សកម្មភាពរបស់គ្រូ'),
    ...(ministryModel.teacherActivities || []).map(bulletPara),
    subHead('ខ.២. សកម្មភាពសមណសិស្ស សិស្ស'),
    ...(ministryModel.studentActivities || []).map(bulletPara),

    // គ
    secHead('គ.អំពីសកម្មភាពនៅក្រៅសាលា (គ្រូ និង សមណសិស្ស សិស្ស)'),
    ...(ministryModel.outsideActivities || []).map(bulletPara),

    // ឃ
    secHead('ឃ.អំពីការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ ឬអាណាព្យាបាល៖'),
    subHead('ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ'),
    ...(ministryModel.abbotResponsibilities || []).map(bulletPara),

    // ង
    secHead('ង.អំពីសកម្មភាពគណៈគ្រប់គ្រង (ទាំងក្នុង និងក្រៅសាលា)'),
    ...(ministryModel.managementActivities || []).map(bulletPara),
    subHead('ង.១. ពុទ្ធិកបណ្ណាល័យ'),
    ...(ministryModel.libraryLines || []).map(bulletPara),
    subHead('ង.២. ការទទួលជំនួយពីសប្បុរសជន'),
    ...(ministryModel.donationLines || []).map(bulletPara),

    // ច, ច.១, ច.២, ច.៣, ច.៤, ច.៥, បណ្ណសរសើរ, សរុបរួម
    secHead('ច. ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី១'),
    buildHourlySemTableXml(ministryModel.hourlySem1),
    secHead('ច.១ ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី២'),
    buildHourlySemTableXml(ministryModel.hourlySem2),
    secHead(`ច.២ ចំណូលចំណាយប្រាក់ម៉ោងប្រចាំឆ្នាំ ${ministryModel.yearKhmer}`),
    buildHourlyAnnualTableXml(ministryModel.hourlyAnnual),
    secHead(`ច.៣ ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី១ ឆ្នាំ${ministryModel.yearKhmer}`),
    buildOfficeSemTablesXml(ministryModel.officeSem1),
    secHead(`ច.៤ ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី២ ឆ្នាំ${ministryModel.yearKhmer}`),
    buildOfficeSemTablesXml(ministryModel.officeSem2),
    secHead(`ច.៥ ចំណូល ចំណាយ លើសម្ភារៈការិយាល័យ ប្រចាំឆ្នាំ ${ministryModel.yearKhmer}`),
    officeAnnXml,
    secHead('ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ'),
    awardXml,
    secHead(`ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ${ministryModel.yearKhmer}`),
    grandXml,

    // ឆ, ជ, ឈ, ញ, ដ
    secHead('ឆ.អំពីសកម្មភាពគ្រូបង្រៀន (ជាមួយសមណសិស្ស សិស្ស ក្នុង និងក្រៅសាលា)'),
    ...(ministryModel.teacherRelations || []).map(bulletPara),
    secHead('ជ.បញ្ហាប្រឈម'),
    ...(ministryModel.challenges || []).map(bulletPara),
    secHead('ឈ. ដំណោះស្រាយ'),
    ...(ministryModel.solutions || []).map(bulletPara),
    secHead('ញ.សេចក្ដីសន្និដ្ឋាន'),
    ...(ministryModel.conclusionParas || []).map(p => {
      const cleanP = String(p || '').trim();
      if (!cleanP) return wParagraph('', { font: FONT_BATTAMBANG, sizePt: SZ });
      return wParagraph(cleanP, { font: FONT_BATTAMBANG, sizePt: SZ, align: 'both', firstLine: 720, spaceAfter: 40 });
    }),
    secHead('ដ.សំណូមពរ'),
    ...(ministryModel.requests || []).map(bulletPara),
    wParagraph('', { sizePt: 8, spaceAfter: 60 }),
    sigTableXml,
    wParagraph('', { sizePt: 8, spaceAfter: 80 }),
    wParagraph('ចម្លងប្រគេនជូន', { font: FONT_BATTAMBANG, sizePt: 10, bold: true, align: 'left' }),
    ...(ministryModel.ccList || []).map(cc =>
      wParagraph(`-${cc}`, { font: FONT_BATTAMBANG, sizePt: 9.5, align: 'left' })
    )
  ];

  downloadDocxDocument(bodyParts.join(''), `របាយការណ៍_${ministryModel.shortFullFileNameTag}.docx`, logoBytes, {
    tacteingOdttf,
    pageSize: { w: 11906, h: 16838 },
    pageMargins,
    headerXml: MINISTRY_FULL_HEADER_XML,
    footerXml: buildMinistryFullFooterXml(contentWidth)
  });
}

/**
 * Export Standalone School History Report (របាយការណ៍ស្ដីពី ប្រវត្តិសាលា — A4 Portrait) to Word (.docx)
 */
export async function exportSchoolHistoryToWord(historyModel) {
  if (!historyModel) return;
  const [logoBytes, tacteingOdttf] = await Promise.all([
    loadOfficialLogoBytes(),
    loadTacteingOdttfBytes()
  ]);
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const NAVY = '002060';
  const pageMargins = { top: 680, right: 620, bottom: 900, left: 620, header: 450, footer: 320 };
  const contentWidth = 11906 - pageMargins.left - pageMargins.right; // 10,666 dxa

  const leftHeaderParas = [
    ...(hasLogo ? [wLogoParagraph(480000)] : []),
    wParagraph('មន្ទីរធម្មការ និងសាសនាខេត្តកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, color: NAVY, align: 'center' }),
    wParagraph('សាលាពុទ្ធិកបឋមសិក្សា កម្រង ហ៊ុន ណេង', { font: FONT_MOUL, sizePt: 11, color: NAVY, align: 'center' }),
    wParagraph('ក្រុងកំពង់ចាម', { font: FONT_MOUL, sizePt: 11, color: NAVY, align: 'center' })
  ].join('');

  const rightHeaderParas = [
    wParagraph('ព្រះរាជាណាចក្រកម្ពុជា', { font: FONT_MOUL, sizePt: 13.5, align: 'center' }),
    wParagraph('ជាតិ   សាសនា   ព្រះមហាក្សត្រ', { font: FONT_MOUL, sizePt: 12, align: 'center' }),
    wTacteingDividerParagraph({ color: '000000', sizePt: 26 })
  ].join('');

  const hdrWidths = [5800, contentWidth - 5800];
  const headerTableXml = wTable(
    hdrWidths,
    [
      `<w:tr>${wCell(leftHeaderParas, { widthDxa: hdrWidths[0], vAlign: 'top', marginsDxa: ZERO_MARGINS })}${wCell(
        rightHeaderParas,
        { widthDxa: hdrWidths[1], vAlign: 'top', marginsDxa: ZERO_MARGINS }
      )}</w:tr>`
    ],
    { bordered: false }
  );

  const sigLeftW = 4400;
  const sigRightParas = [
    wParagraph(historyModel.lunarDateLine || '', { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(historyModel.solarDateLine || '', { font: FONT_SIEMREAP, sizePt: 11.5, align: 'center', keepNext: true }),
    wParagraph(historyModel.signerTitle || 'នាយកសាលា', { font: FONT_MOUL, sizePt: 12, align: 'center', spaceBefore: 40 })
  ].join('');
  const sigTableXml = wTable(
    [sigLeftW, contentWidth - sigLeftW],
    [
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>${wCell(wParagraph('', { sizePt: 11 }), {
        widthDxa: sigLeftW,
        vAlign: 'top',
        marginsDxa: ZERO_MARGINS
      })}${wCell(sigRightParas, { widthDxa: contentWidth - sigLeftW, vAlign: 'top', marginsDxa: ZERO_MARGINS })}</w:tr>`
    ],
    { bordered: false }
  );

  const bodyParts = [
    headerTableXml,
    wParagraph('របាយការណ៍', { font: FONT_MOUL, sizePt: 13.5, color: NAVY, align: 'center', spaceBefore: 80 }),
    wParagraph('ស្ដីពី', { font: FONT_MOUL, sizePt: 12.5, color: NAVY, align: 'center' }),
    wParagraph(historyModel.title || 'ប្រវត្តិសាលាពុទ្ធិកសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម', {
      font: FONT_MOUL,
      sizePt: 12.5,
      color: NAVY,
      align: 'center',
      spaceAfter: 120
    }),
    wParagraph('១.១. សាវតារ', { font: FONT_MOUL, sizePt: 11.5, color: NAVY, align: 'left', indentLeft: 280, spaceAfter: 40 }),
    ...(historyModel.backgroundParagraphs || []).map(p => {
      const cleanP = String(p || '').trim();
      if (!cleanP) return wParagraph('', { font: FONT_SIEMREAP, sizePt: 11.5 });
      return wParagraph(cleanP, { font: FONT_SIEMREAP, sizePt: 11.5, align: 'both', firstLine: 720, spaceAfter: 60 });
    }),
    ...(historyModel.tableIntro
      ? String(historyModel.tableIntro)
        .trim()
        .split(/\r?\n/)
        .map((ln, idx, arr) => {
          const cleanLn = ln.trim();
          const isLast = idx === arr.length - 1;
          return wParagraph(cleanLn, {
            font: FONT_SIEMREAP,
            sizePt: 11.5,
            align: 'both',
            firstLine: cleanLn ? 720 : 0,
            spaceAfter: isLast ? 80 : 0
          });
        })
      : []),
    buildSchoolHistoryTableXml(historyModel, contentWidth),
    wParagraph('', { sizePt: 8, spaceAfter: 120 }),
    sigTableXml
  ];

  downloadDocxDocument(bodyParts.join(''), `របាយការណ៍_${historyModel.shortFileNameTag}.docx`, logoBytes, {
    tacteingOdttf,
    pageSize: { w: 11906, h: 16838 },
    pageMargins,
    footerXml: ADMIN_PAGE_NUMBER_FOOTER_XML
  });
}
