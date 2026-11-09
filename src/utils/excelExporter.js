// Styled OpenXML (.xlsx) Excel Exporter matching the Official A4 Documents in the App
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

/**
 * Style indices in xl/styles.xml:
 * 0: Default (Khmer OS Siemreap 11pt, left, vcenter)
 * 1: Moul Header 11pt Center (for Ministry / School / Kingdom / Signatures)
 * 2: Moul Main Title 13pt Center (for របាយការណ៍ ស្ដីពី ...)
 * 3: Moul Section Title 11.5pt Center Underline (for ចំណូល / ចំណាយ)
 * 4: Table Header (Khmer OS Siemreap 11pt Bold, Center, Border All, Fill #F8FAFC)
 * 5: Table Cell Center (Khmer OS Siemreap 11pt, Center, Border All)
 * 6: Table Cell Left (Khmer OS Siemreap 11pt, Left, Border All, Wrap)
 * 7: Table Cell Right (Khmer OS Siemreap 11pt, Right, Border All)
 * 8: Table Cell Right Bold (Khmer OS Siemreap 11pt Bold, Right, Border All)
 * 9: Subtotal Label (Khmer OS Muol Light 11pt, Center, Border All, Fill #FAFAFA)
 * 10: Subtotal Value Right Bold (Khmer OS Siemreap 11pt Bold, Right, Border All, Fill #FAFAFA)
 * 11: Subtotal Note Center Bold (Khmer OS Siemreap 10.5pt Bold, Center, Border All, Fill #FAFAFA)
 * 12: Summary Bold Left (Khmer OS Siemreap 11pt Bold, Left, vcenter)
 * 13: Center Normal (Khmer OS Siemreap 11pt, Center, vcenter — for dates & divider)
 * 14: Balance Box Positive (Khmer OS Siemreap 11pt Bold Green #15803D, Right, Border All, Fill #F0FDF4)
 * 15: Balance Box Deficit (Khmer OS Siemreap 11pt Bold Red #B91C1C, Right, Border All, Fill #FEF2F2)
 */
function buildExcelStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="11">
    <font>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Siemreap"/>
    </font>
    <font>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <sz val="12.5"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <u/>
      <sz val="11.5"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Siemreap"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FF15803D"/>
      <name val="Khmer OS Siemreap"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FFB91C1C"/>
      <name val="Khmer OS Siemreap"/>
    </font>
    <font>
      <u val="single"/>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <u val="single"/>
      <sz val="11"/>
      <color rgb="FFB91C1C"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <u val="double"/>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Muol Light"/>
    </font>
    <font>
      <u val="double"/>
      <sz val="11"/>
      <color rgb="FFB91C1C"/>
      <name val="Khmer OS Muol Light"/>
    </font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF8FAFC"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFFAFAFA"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF0FDF4"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFFEF2F2"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="22">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 1: Moul Header 11pt Center -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Moul Main Title 12.5pt Center -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: Moul Section Title 11.5pt Center Underline -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 4: Table Header -->
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 5: Table Cell Center -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: Table Cell Left -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1"/>
    </xf>
    <!-- 7: Table Cell Right -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 8: Table Cell Right Bold -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 9: Subtotal Label (Moul Center Border Fill) -->
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 10: Subtotal Value Right Bold -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 11: Subtotal Note Center Bold -->
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 12: Summary Bold Left -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 13: Center Normal (Dates / Divider) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 14: Balance Positive -->
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 15: Balance Deficit -->
    <xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 16: Summary Table Header (Moul Center Border) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 17: Summary Subtotal Label (Siemreap Bold Center Border) -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 18: Summary Subtotal Value (Moul Single Underline Right Border) -->
    <xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 19: Summary Subtotal Value Deficit (Moul Red Single Underline Right Border) -->
    <xf numFmtId="0" fontId="8" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 20: Summary Balance Value (Moul Double Underline Right Border) -->
    <xf numFmtId="0" fontId="9" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 21: Summary Balance Value Deficit (Moul Red Double Underline Right Border) -->
    <xf numFmtId="0" fontId="10" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
}

function colLetter(colIdx0) {
  let n = colIdx0 + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellRef(row1, col0) {
  return `${colLetter(col0)}${row1}`;
}

/**
 * Package a styled worksheet into a valid .xlsx file and trigger browser download
 */
function downloadStyledXlsx({ sheetName = 'របាយការណ៍', colWidths = [], rows = [], merges = [], fileName = 'Report.xlsx', logoBytes = null }) {
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const colsXml = colWidths.map((w, i) => (
    `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`
  )).join('');

  const rowsXml = rows.map((rowObj, rIdx) => {
    const rNum = rIdx + 1;
    const htAttr = rowObj.height ? ` ht="${rowObj.height}" customHeight="1"` : ' ht="24" customHeight="1"';
    const cellsXml = (rowObj.cells || []).map((cell, cIdx) => {
      if (!cell) return '';
      const ref = cellRef(rNum, cIdx);
      const styleIdx = cell.s ?? 0;
      const valStr = String(cell.v ?? '');
      if (!valStr && styleIdx === 0) return '';
      return `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t>${escapeXml(valStr)}</t></is></c>`;
    }).join('');
    return `<row r="${rNum}"${htAttr}>${cellsXml}</row>`;
  }).join('');

  const mergesXml = merges.length > 0
    ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
  ${mergesXml}
  <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
  ${hasLogo ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasLogo ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${hasLogo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''}
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const entries = [
    { path: '[Content_Types].xml', data: contentTypesXml },
    { path: '_rels/.rels', data: relsXml },
    { path: 'xl/workbook.xml', data: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
    { path: 'xl/styles.xml', data: buildExcelStylesXml() },
    { path: 'xl/worksheets/sheet1.xml', data: sheetXml }
  ];

  if (hasLogo) {
    // Calculate horizontal offset in Column B (index 1) so the 520,000 EMU logo is centered across A1:C1
    const totalLeftEmu = ((colWidths[0] || 8) + (colWidths[1] || 28) + (colWidths[2] || 12)) * 71437;
    const col0Emu = (colWidths[0] || 8) * 71437;
    const logoSizeEmu = 520000;
    const logoColOff = Math.max(0, Math.round((totalLeftEmu / 2) - (logoSizeEmu / 2) - col0Emu));

    const sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;

    const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from>
      <xdr:col>1</xdr:col>
      <xdr:colOff>${logoColOff}</xdr:colOff>
      <xdr:row>0</xdr:row>
      <xdr:rowOff>28575</xdr:rowOff>
    </xdr:from>
    <xdr:ext cx="${logoSizeEmu}" cy="${logoSizeEmu}"/>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="2" name="Official School Logo"/>
        <xdr:cNvPicPr>
          <a:picLocks noChangeAspect="1"/>
        </xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip r:embed="rIdLogo"/>
        <a:stretch>
          <a:fillRect/>
        </a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${logoSizeEmu}" cy="${logoSizeEmu}"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;

    const drawingRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/>
</Relationships>`;

    entries.push(
      { path: 'xl/worksheets/_rels/sheet1.xml.rels', data: sheetRelsXml },
      { path: 'xl/drawings/drawing1.xml', data: drawingXml },
      { path: 'xl/drawings/_rels/drawing1.xml.rels', data: drawingRelsXml },
      { path: 'xl/media/logo.png', data: logoBytes }
    );
  }

  const zipBytes = buildZipArchive(entries);

  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  triggerBlobDownload(
    zipBytes,
    cleanFileName,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/**
 * Helper to append the official Ministry & Kingdom 2-column header to rows + merges
 */
function appendOfficialHeader(rows, merges, numCols, metadata = {}, includeSalaprefix = false, hasLogo = false) {
  const ministry = metadata.ministry || 'មន្ទីរធម្មការ និងសាសនា ខេត្តកំពង់ចាម';
  const rawSchool = metadata.school || 'ពុទ្ធិកបឋមសិក្សាកម្រង ហ៊ុន ណេង';
  const school = includeSalaprefix && !String(rawSchool).startsWith('សាលា')
    ? `សាលា${rawSchool}`
    : rawSchool;
  const location = metadata.location || 'ក្រុងកំពង់ចាម';

  const leftEndCol = 2; // Columns A..C (0..2)
  const rightStartCol = Math.max(3, numCols - 3); // Right 3 columns
  const lastCol = numCols - 1;

  const makeHeaderRow = (leftText, rightText, rightStyle = 1, height = 24) => {
    const rNum = rows.length + 1;
    const cells = new Array(numCols).fill(null);
    cells[0] = { v: leftText, s: 1 };
    cells[rightStartCol] = { v: rightText, s: rightStyle };
    rows.push({ height, cells });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, leftEndCol)}`);
    merges.push(`${cellRef(rNum, rightStartCol)}:${cellRef(rNum, lastCol)}`);
  };

  if (hasLogo) {
    // Row 1: Left A1:C1 hosts the centered Logo (height = 46pt ~ 61px); Right has ព្រះរាជាណាចក្រកម្ពុជា
    makeHeaderRow('', 'ព្រះរាជាណាចក្រកម្ពុជា', 1, 46);
    makeHeaderRow(ministry, 'ជាតិ សាសនា ព្រះមហាក្សត្រ', 1, 24);
    makeHeaderRow(school, '~ ~ ~ ❁ ~ ~ ~', 13, 24);
    makeHeaderRow(location, '', 1, 22);
  } else {
    makeHeaderRow(ministry, 'ព្រះរាជាណាចក្រកម្ពុជា', 1, 24);
    makeHeaderRow(school, 'ជាតិ សាសនា ព្រះមហាក្សត្រ', 1, 24);
    makeHeaderRow(location, '~ ~ ~ ❁ ~ ~ ~', 13, 22);
  }

  // Blank spacer row
  rows.push({ height: 14, cells: [] });
}

/**
 * Helper to append the official 2-column Signature & Date block at the bottom
 */
function appendOfficialSignatures(rows, merges, numCols, metadata = {}, reportDates = {}, isFinance = false) {
  const leftEndCol = 2; // A..C
  const rightStartCol = Math.max(3, numCols - 3);
  const lastCol = numCols - 1;

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

  const addSigRow = (leftText, leftStyle, rightText, rightStyle, height = 22) => {
    const rNum = rows.length + 1;
    const cells = new Array(numCols).fill(null);
    cells[0] = { v: leftText, s: leftStyle };
    cells[rightStartCol] = { v: rightText, s: rightStyle };
    rows.push({ height, cells });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, leftEndCol)}`);
    merges.push(`${cellRef(rNum, rightStartCol)}:${cellRef(rNum, lastCol)}`);
  };

  rows.push({ height: 14, cells: [] });
  addSigRow('បានឃើញ និង……………..', 1, rightLunar, 13, 24);
  addSigRow(leftLunar, 13, rightSolar, 13, 22);
  addSigRow(leftSolar, 13, reporterTitle, 1, 24);
  addSigRow(directorTitle, 1, '', 1, 24);
}

/**
 * 1. Export Leave Records to Styled Official Excel (.xlsx) matching OfficialLeaveDocument.jsx
 */
export async function exportLeaveToExcel(records = [], monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const numCols = 7;
  const rows = [];
  const merges = [];
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, true, hasLogo);

  // 2. Centered Report Title
  const title1Row = rows.length + 1;
  rows.push({ height: 26, cells: [{ v: 'របាយការណ៍ ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(title1Row, 0)}:${cellRef(title1Row, numCols - 1)}`);

  const title2Text = options.customPeriodTitle || `ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ${monthLabel}`;
  const title2Row = rows.length + 1;
  rows.push({ height: 26, cells: [{ v: title2Text, s: 2 }] });
  merges.push(`${cellRef(title2Row, 0)}:${cellRef(title2Row, numCols - 1)}`);

  rows.push({ height: 12, cells: [] });

  // 3. Table Header Row
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'មូលហេតុ', 'ចំនួនឈប់', 'កាលបរិច្ឆេទ', 'ផ្សេងៗ'];
  rows.push({
    height: 28,
    cells: headers.map(h => ({ v: h, s: 4 }))
  });

  // 4. Table Body Rows
  if (records.length === 0) {
    const emptyRow = rows.length + 1;
    const cells = new Array(numCols).fill(null).map((_, idx) => ({
      v: idx === 0 ? 'មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។' : '',
      s: 5
    }));
    rows.push({ height: 28, cells });
    merges.push(`${cellRef(emptyRow, 0)}:${cellRef(emptyRow, numCols - 1)}`);
  } else {
    records.forEach((r, idx) => {
      let cleanDate = String(r.date || '').trim();
      cleanDate = cleanDate.replace(/2024/g, '2026').replace(/២០២៤/g, '២០២៦');
      if (cleanDate.includes('ដល់') || cleanDate.includes('-')) {
        const parts = cleanDate.split(/ដល់|-/);
        if (parts[0] && parts[0].trim().length >= 6) {
          cleanDate = parts[0].trim();
        }
      }
      const cleanReasonText = String(r.reason || '').replace(/\s+/g, ' ').trim();
      const rowHeight = (options.compactReasonColumn && cleanReasonText.length > 26) ? 36 : 25;
      rows.push({
        height: rowHeight,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: r.name || '', s: 6 },
          { v: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), s: 5 },
          { v: cleanReasonText, s: 6 },
          { v: r.duration || '', s: 5 },
          { v: useKhmer ? toKhmerDigits(cleanDate) : cleanDate, s: 5 },
          { v: r.note || '', s: 5 }
        ]
      });
    });
  }

  // 5. Summary Count Line
  rows.push({ height: 10, cells: [] });
  const sumRowNum = rows.length + 1;
  const sumText = options.customSummaryText || `ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ${monthLabel} សរុប ${fmt(records.length)}អង្គ`;
  rows.push({
    height: 24,
    cells: [{ v: sumText, s: 12 }]
  });
  merges.push(`${cellRef(sumRowNum, 0)}:${cellRef(sumRowNum, numCols - 1)}`);

  // 6. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, false);

  downloadStyledXlsx({
    sheetName: 'ច្បាប់សមណសិស្ស',
    colWidths: options.compactReasonColumn
      ? [8, 25, 11, 25, 20, 15, 14]
      : [8, 25, 11, 32, 15, 18, 16],
    rows,
    merges,
    fileName: `របាយការណ៍ច្បាប់សមណសិស្ស_${String(monthLabel).replace(/\s+/g, '_')}.xlsx`,
    logoBytes
  });
}

/**
 * 2. Export ID Card Purchase Records to Styled Official Excel (.xlsx) matching OfficialIdCardDocument.jsx
 */
export async function exportIdCardToExcel(records = [], monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const numCols = 7;
  const rows = [];
  const merges = [];
  const monthKey = options.monthKey || metadata.currentMonth || '2026-07';
  const useKhmer = options.useKhmerNumerals !== false;
  const fmt = (n) => (useKhmer ? toKhmerDigits(n) : String(n));
  const totalAmount = records.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, true, hasLogo);

  // 2. Centered Report Title
  const title1Row = rows.length + 1;
  rows.push({ height: 26, cells: [{ v: 'របាយការណ៍ ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(title1Row, 0)}:${cellRef(title1Row, numCols - 1)}`);

  const title2Text = options.customPeriodTitle || `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញកាតពាក់ក (ID) ក្នុងខែ${monthLabel}`;
  const title2Row = rows.length + 1;
  rows.push({ height: 26, cells: [{ v: title2Text, s: 2 }] });
  merges.push(`${cellRef(title2Row, 0)}:${cellRef(title2Row, numCols - 1)}`);

  rows.push({ height: 12, cells: [] });

  // 3. Table Header Row
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'បរិយាយ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ'];
  rows.push({
    height: 28,
    cells: headers.map(h => ({ v: h, s: 4 }))
  });

  // 4. Table Body Rows
  if (records.length === 0) {
    const emptyRow = rows.length + 1;
    const cells = new Array(numCols).fill(null).map((_, idx) => ({
      v: idx === 0 ? 'មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID សម្រាប់ខែនេះនៅឡើយទេ។' : '',
      s: 5
    }));
    rows.push({ height: 28, cells });
    merges.push(`${cellRef(emptyRow, 0)}:${cellRef(emptyRow, numCols - 1)}`);
  } else {
    records.forEach((r, idx) => {
      rows.push({
        height: 25,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: r.name || '', s: 6 },
          { v: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), s: 5 },
          { v: r.item || '', s: 5 },
          { v: fmt(r.qty || 1), s: 5 },
          { v: formatKhmerCurrency(r.price || 0, useKhmer), s: 8 },
          { v: useKhmer ? toKhmerDigits(r.date || '') : (r.date || ''), s: 5 }
        ]
      });
    });
  }

  // 5. Total Footer Row inside table (សរុប merged A..E)
  const totalRowNum = rows.length + 1;
  rows.push({
    height: 27,
    cells: [
      { v: 'សរុប', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: formatKhmerCurrency(totalAmount, useKhmer), s: 10 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(totalRowNum, 0)}:${cellRef(totalRowNum, 4)}`);

  // 6. Summary Statement Line below table
  rows.push({ height: 10, cells: [] });
  const sumRowNum = rows.length + 1;
  const sumText = options.customSummaryText || (
    `សរុបសមណសិស្សទិញកាតពាក់ក (ID) ចំនួន ${fmt(records.length)} អង្គ សរុបទឹកប្រាក់ចំនួន ${formatKhmerCurrency(totalAmount, useKhmer)}។`
  );
  rows.push({
    height: 24,
    cells: [{ v: sumText, s: 12 }]
  });
  merges.push(`${cellRef(sumRowNum, 0)}:${cellRef(sumRowNum, numCols - 1)}`);

  // 7. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, false);

  downloadStyledXlsx({
    sheetName: 'ទិញកាត ID',
    colWidths: [8, 26, 12, 22, 11, 18, 18],
    rows,
    merges,
    fileName: `តារាងបង់ថ្លៃទិញកាត_ID_${String(monthLabel).replace(/\s+/g, '_')}.xlsx`,
    logoBytes
  });
}

/**
 * 3. Export Financial Records (Income + Expense) to Styled Official Excel (.xlsx) matching OfficialFinanceDocument.jsx
 */
export async function exportFinanceToExcel(financeData = { income: [], expense: [] }, monthLabel = 'កក្កដា ២០២៦', metadata = {}, options = {}) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const numCols = 6;
  const rows = [];
  const merges = [];
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

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  // 2. Centered 3-Line Report Title (matching OfficialFinanceDocument.jsx)
  const rTitle1 = rows.length + 1;
  rows.push({ height: 24, cells: [{ v: 'របាយការណ៍', s: 2 }] });
  merges.push(`${cellRef(rTitle1, 0)}:${cellRef(rTitle1, numCols - 1)}`);

  const rTitle2 = rows.length + 1;
  rows.push({ height: 22, cells: [{ v: 'ស្ដីពី', s: 1 }] });
  merges.push(`${cellRef(rTitle2, 0)}:${cellRef(rTitle2, numCols - 1)}`);

  const title3Text = options.customPeriodTitle || `តារាងចំណូលចំណាយប្រចាំខែ${monthLabel}`;
  const rTitle3 = rows.length + 1;
  rows.push({ height: 25, cells: [{ v: title3Text, s: 2 }] });
  merges.push(`${cellRef(rTitle3, 0)}:${cellRef(rTitle3, numCols - 1)}`);

  rows.push({ height: 10, cells: [] });

  const tableHeaders = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ'];

  // 3. Table 1: ចំណូល (Income)
  if (showIncomeTable) {
    const incSecRow = rows.length + 1;
    rows.push({ height: 25, cells: [{ v: 'ចំណូល', s: 3 }] });
    merges.push(`${cellRef(incSecRow, 0)}:${cellRef(incSecRow, numCols - 1)}`);

    rows.push({
      height: 27,
      cells: tableHeaders.map(h => ({ v: h, s: 4 }))
    });

    incomeList.forEach((item, idx) => {
      const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
        ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
        : formatMoney(item.total, item.currency, useKhmer);
      rows.push({
        height: 24,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: item.desc || '', s: 6 },
          { v: item.qty || '', s: 5 },
          { v: item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '', s: 7 },
          { v: displayTotal, s: 8 },
          { v: item.note || '', s: 5 }
        ]
      });
    });

    // Subtotal Income Row (សរុបចំណូល merged A..D)
    const inKindNote = incomeList.some(it => it?.totalLabel)
      ? incomeList.map(it => it.totalLabel).filter(Boolean).join(', ')
      : '';
    const subIncRow = rows.length + 1;
    rows.push({
      height: 27,
      cells: [
        { v: 'សរុបចំណូល', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: formatCurrencyTotals(incomeTotals, useKhmer), s: 10 },
        { v: inKindNote, s: 11 }
      ]
    });
    merges.push(`${cellRef(subIncRow, 0)}:${cellRef(subIncRow, 3)}`);
    rows.push({ height: 12, cells: [] });
  }

  // 4. Table 2: ចំណាយ (Expense)
  if (showExpenseTable) {
    const expSecRow = rows.length + 1;
    rows.push({ height: 25, cells: [{ v: 'ចំណាយ', s: 3 }] });
    merges.push(`${cellRef(expSecRow, 0)}:${cellRef(expSecRow, numCols - 1)}`);

    rows.push({
      height: 27,
      cells: tableHeaders.map(h => ({ v: h, s: 4 }))
    });

    expenseList.forEach((item, idx) => {
      const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
        ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
        : formatMoney(item.total, item.currency, useKhmer);
      rows.push({
        height: 24,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: item.desc || '', s: 6 },
          { v: item.qty || '', s: 5 },
          { v: item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '', s: 7 },
          { v: displayTotal, s: 8 },
          { v: item.note || '', s: 5 }
        ]
      });
    });

    // Subtotal Expense Row (សរុបចំណាយ merged A..D)
    const subExpRow = rows.length + 1;
    rows.push({
      height: 27,
      cells: [
        { v: 'សរុបចំណាយ', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: formatExpenseTotals(expenseTotals, isDeficit, useKhmer), s: 10 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(subExpRow, 0)}:${cellRef(subExpRow, 3)}`);
  }

  // 5. Net Balance Row (នៅសល់ / ខ្វះថវិកា) when showing both Income & Expense
  if (showIncomeTable && showExpenseTable) {
    rows.push({ height: 8, cells: [] });
    const balRow = rows.length + 1;
    rows.push({
      height: 27,
      cells: [
        { v: isDeficit ? 'ខ្វះថវិកា (ចំណូល - ចំណាយ)' : 'នៅសល់ (ចំណូល - ចំណាយ)', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: formatCurrencyTotals(balanceTotals, useKhmer), s: isDeficit ? 15 : 14 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(balRow, 0)}:${cellRef(balRow, 3)}`);
  }

  // 6. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, true);

  downloadStyledXlsx({
    sheetName: 'ចំណូល-ចំណាយ',
    colWidths: [8, 42, 15, 16, 20, 22],
    rows,
    merges,
    fileName: `របាយការណ៍ចំណូលចំណាយ_${String(monthLabel).replace(/\s+/g, '_')}.xlsx`,
    logoBytes
  });
}

/**
 * 4. Export Official Summary Financial Report (របាយការណ៍ចំណូលចំណាយសង្ខេប) to Styled Excel (.xlsx)
 * matching the 1-page 5-column summary DOCX templates (July & September 2026)
 */
export async function exportFinanceSummaryReportToExcel(
  financeData = { income: [], expense: [] },
  monthLabel = 'កក្កដា ២០២៦',
  metadata = {},
  options = {}
) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const numCols = 5;
  const rows = [];
  const merges = [];
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

  const { isDeficit } = summaryModel;

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  // 2. Centered 3-Line Report Title
  const rTitle1 = rows.length + 1;
  rows.push({ height: 24, cells: [{ v: 'របាយការណ៍', s: 2 }] });
  merges.push(`${cellRef(rTitle1, 0)}:${cellRef(rTitle1, numCols - 1)}`);

  const rTitle2 = rows.length + 1;
  rows.push({ height: 22, cells: [{ v: 'ស្ដីពី', s: 1 }] });
  merges.push(`${cellRef(rTitle2, 0)}:${cellRef(rTitle2, numCols - 1)}`);

  const rTitle3 = rows.length + 1;
  rows.push({ height: 26, cells: [{ v: summaryModel.reportTitle, s: 2 }] });
  merges.push(`${cellRef(rTitle3, 0)}:${cellRef(rTitle3, numCols - 1)}`);

  rows.push({ height: 12, cells: [] });

  // 3. Unified 5-Column Summary Table
  const tableHeaders = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'ចំនួនថវិកា', 'ផ្សេងៗ'];
  rows.push({
    height: 30,
    cells: tableHeaders.map(h => ({ v: h, s: 16 }))
  });

  // Income Rows 1 & 2
  summaryModel.incomeRows.forEach(r => {
    rows.push({
      height: 28,
      cells: [
        { v: r.no, s: 5 },
        { v: r.desc, s: 6 },
        { v: r.qty, s: 5 },
        { v: r.amountText, s: 7 },
        { v: r.note || '', s: 5 }
      ]
    });
  });

  // Subtotal Income Row (merged A..C)
  const subIncRow = rows.length + 1;
  rows.push({
    height: 30,
    cells: [
      { v: summaryModel.totalIncomeLabel, s: 17 },
      { v: '', s: 17 },
      { v: '', s: 17 },
      { v: summaryModel.totalIncomeText, s: 18 },
      { v: '', s: 5 }
    ]
  });
  merges.push(`${cellRef(subIncRow, 0)}:${cellRef(subIncRow, 2)}`);

  // Expense Rows 1 & 2
  summaryModel.expenseRows.forEach(r => {
    rows.push({
      height: 28,
      cells: [
        { v: r.no, s: 5 },
        { v: r.desc, s: 6 },
        { v: r.qty, s: 5 },
        { v: r.amountText, s: 7 },
        { v: r.note || '', s: 5 }
      ]
    });
  });

  // Subtotal Expense Row (merged A..C)
  const subExpRow = rows.length + 1;
  rows.push({
    height: 30,
    cells: [
      { v: summaryModel.totalExpenseLabel, s: 17 },
      { v: '', s: 17 },
      { v: '', s: 17 },
      { v: summaryModel.totalExpenseText, s: isDeficit ? 19 : 18 },
      { v: '', s: 5 }
    ]
  });
  merges.push(`${cellRef(subExpRow, 0)}:${cellRef(subExpRow, 2)}`);

  // Final Net Balance Row (merged A..C, double-underlined Moul value)
  const balRow = rows.length + 1;
  rows.push({
    height: 32,
    cells: [
      { v: summaryModel.balanceLabel, s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: summaryModel.balanceText, s: isDeficit ? 21 : 20 },
      { v: '', s: 5 }
    ]
  });
  merges.push(`${cellRef(balRow, 0)}:${cellRef(balRow, 2)}`);

  // 4. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, true);

  downloadStyledXlsx({
    sheetName: 'សង្ខេបចំណូលចំណាយ',
    colWidths: [8, 44, 16, 20, 18],
    rows,
    merges,
    fileName: `របាយការណ៍ចំណូលចំណាយសង្ខេប_${String(monthLabel).replace(/\s+/g, '_')}.xlsx`,
    logoBytes
  });
}

/**
 * Dual-file Excel exporter for PC Finance:
 * File 1: Full Detailed Finance Report (.xlsx)
 * File 2: Summary Finance Report (.xlsx)
 */
export async function exportFinanceDualExcel(
  financeData = { income: [], expense: [] },
  monthLabel = 'កក្កដា ២០២៦',
  metadata = {},
  options = {}
) {
  const logoBytes = options.logoBytes || (await loadOfficialLogoBytes());
  const sharedOptions = { ...options, logoBytes };
  await exportFinanceToExcel(financeData, monthLabel, metadata, sharedOptions);
  await new Promise(resolve => setTimeout(resolve, 400));
  const summarySourceData = options.summaryFinanceData || financeData;
  await exportFinanceSummaryReportToExcel(summarySourceData, monthLabel, metadata, sharedOptions);
}

/**
 * Export Administrative Narrative Report (Monthly / Semester 1 / Semester 2 / Annual) to Styled Excel (.xlsx)
 */
export async function exportAdminReportToExcel(displayModel, metadata = {}) {
  const logoBytes = await loadOfficialLogoBytes();
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const rows = [];
  const merges = [];
  const numCols = 5;

  const pushFullRow = (text, styleIdx = 0, height = 24) => {
    const rNum = rows.length + 1;
    rows.push({
      height,
      cells: [{ v: text, s: styleIdx }]
    });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, numCols - 1)}`);
  };

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, true, hasLogo);

  // 2. Salutation & Recipient
  pushFullRow('សូមក្រាបថ្វាយបង្គំ', 1, 24);
  pushFullRow(displayModel.recipientTitle, 2, 26);
  pushFullRow('ជាទីគោរពសក្ការៈដ៏ខ្ពង់ខ្ពស់!', 13, 22);
  rows.push({ height: 10, cells: [] });

  // 3. Subject & Intro
  pushFullRow(`កម្មវត្ថុ៖ ${displayModel.subjectText}`, 12, 36);
  pushFullRow(displayModel.introParagraph, 0, 42);
  rows.push({ height: 10, cells: [] });

  // I. តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
  pushFullRow('I.តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា', 12, 26);
  pushFullRow(displayModel.section1Intro, 0, 38);
  const fmtNum = (n) => toKhmerDigits(n);
  (displayModel.managementRoles || []).forEach((m, idx) => {
    pushFullRow(`${fmtNum(idx + 1)}. ${m.name}     ${m.role}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // II. ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
  pushFullRow('II.ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស', 12, 26);
  pushFullRow('ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ', 12, 24);
  (displayModel.staffStats || []).forEach(line => {
    pushFullRow(`❖ ${line}`, 0, 24);
  });
  pushFullRow('ខ-ចំនួនថ្នាក់ សមណសិស្ស', 12, 24);
  (displayModel.studentStatLines || []).forEach(line => {
    pushFullRow(`❖ ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // III. វឌ្ឍនភាពការងារ
  pushFullRow(displayModel.section3Heading, 12, 26);
  pushFullRow(displayModel.section3SubAHeading, 12, 24);
  (displayModel.activities || []).forEach(line => {
    const ht = line.length > 95 ? 42 : 24;
    pushFullRow(`- ${line}`, 0, ht);
  });
  pushFullRow('ខ. ការងារគ្រប់គ្រង តាក់តែងលិខិតរដ្ឋបាល កំណត់ហេតុ និងរបាយការណ៍', 12, 24);
  (displayModel.adminDocLines || []).forEach(line => {
    pushFullRow(`- ${line}`, 0, 24);
  });
  pushFullRow(displayModel.section3SubCHeading, 12, 24);
  pushFullRow(displayModel.section3SubDHeading, 12, 24);
  (displayModel.appendixItems || []).forEach((line, idx) => {
    pushFullRow(`${fmtNum(idx + 1)}. ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // IV. បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ
  pushFullRow('IV.បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ', 12, 26);
  pushFullRow('១-បញ្ហាប្រឈម', 12, 24);
  (displayModel.challenges || []).forEach(line => {
    const ht = line.length > 95 ? 38 : 24;
    pushFullRow(`- ${line}`, 0, ht);
  });
  pushFullRow('២-ដំណោះស្រាយ', 12, 24);
  (displayModel.solutions || []).forEach(line => {
    const ht = line.length > 95 ? 38 : 24;
    pushFullRow(`- ${line}`, 0, ht);
  });
  pushFullRow('៣-សំណូមពរ', 12, 24);
  (displayModel.requests || []).forEach(line => {
    pushFullRow(`- ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // V. ទិសដៅបន្ត
  pushFullRow('V.ទិសដៅបន្ត', 12, 26);
  (displayModel.directions || []).forEach(line => {
    pushFullRow(`- ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // VI. សន្និដ្ឋាន
  pushFullRow('VI.សន្និដ្ឋាន', 12, 26);
  pushFullRow(displayModel.conclusionText, 0, 48);
  pushFullRow(displayModel.closingLine1, 0, 24);
  pushFullRow(displayModel.closingLine2, 0, 24);
  rows.push({ height: 12, cells: [] });

  // Right-side Lunar/Solar Dates & Signer
  pushFullRow(displayModel.lunarDateLine, 13, 22);
  pushFullRow(displayModel.solarDateLine, 13, 22);
  pushFullRow(displayModel.signerTitle || 'ព្រះនាយក', 1, 26);

  downloadStyledXlsx({
    sheetName: 'របាយការណ៍រដ្ឋបាល',
    colWidths: [14, 34, 22, 22, 22],
    rows,
    merges,
    fileName: `របាយការណ៍_${displayModel.shortFileNameTag}.xlsx`,
    logoBytes
  });
}

