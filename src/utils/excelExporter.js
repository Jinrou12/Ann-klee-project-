// Styled OpenXML (.xlsx) Excel Exporter matching the Official A4 Documents in the App
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
  <fonts count="14">
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
      <sz val="14"/>
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
    <font>
      <sz val="11"/>
      <color rgb="FF000000"/>
      <name val="Khmer OS Siemreap"/>
    </font>
    <font>
      <sz val="22"/>
      <color rgb="FF000000"/>
      <name val="Tacteing"/>
    </font>
    <font>
      <sz val="12"/>
      <color rgb="FF000000"/>
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
  <borders count="3">
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
    <border>
      <left/><right/><top/>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="26">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <!-- 1: Moul Header 11pt Center -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Moul Main Title 12pt Center -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: Moul Section Title 11.5pt Center Underline with Bottom Thin Border -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 4: Table Header (Moul 11pt Clean White Fill) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 5: Table Cell Center -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: Table Cell Left -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center" wrapText="1" indent="1"/>
    </xf>
    <!-- 7: Table Cell Right -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 8: Table Cell Right Bold -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 9: Subtotal Label (Moul Center Border Clean White) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 10: Subtotal Value Right Bold -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 11: Subtotal Note Center Bold -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 12: Summary Bold Left -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 13: Center Normal 10pt (Dates / Divider) -->
    <xf numFmtId="0" fontId="11" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
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
    <!-- 22: Moul 12pt Center Bottom (for ព្រះរាជាណាចក្រកម្ពុជា in Row 1 with Logo) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="bottom"/>
    </xf>
    <!-- 23: Spacer Row Bottom Thin Border (reinforces top border of table headers in Print Preview) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"/>
    <!-- 24: Tacteing 22pt Center (for character '3' ornamental divider) -->
    <xf numFmtId="0" fontId="12" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 25: Moul 12pt Center (for ជាតិ សាសនា ព្រះមហាក្សត្រ, នាយកសាលា, អ្នកធ្វើរបាយការណ៍) -->
    <xf numFmtId="0" fontId="13" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
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
function downloadStyledXlsx({ sheetName = 'របាយការណ៍', colWidths = [], rows = [], merges = [], fileName = 'Report.xlsx', logoBytes = null, orientation = 'portrait' }) {
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
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
  ${mergesXml}
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.3" right="0.3" top="0.45" bottom="0.45" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="${orientation}" fitToWidth="1" fitToHeight="0"/>
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
    // Calculate horizontal offset in Column B (index 1) so the 480,000 EMU logo is centered across A1:C1
    const totalLeftEmu = ((colWidths[0] || 8) + (colWidths[1] || 28) + (colWidths[2] || 12)) * 71437;
    const col0Emu = (colWidths[0] || 8) * 71437;
    const logoSizeEmu = 480000;
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
  const school = String(rawSchool).replace(/^សាលា(?=ពុទ្ធិក)/, '');
  const location = metadata.location || 'ក្រុងកំពង់ចាម';

  const leftEndCol = 2; // Columns A..C (0..2)
  const rightStartCol = 3; // Merge D..lastCol so right-side header never clips
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
    // Row 1: Left A1:C1 hosts the centered Logo; Right D1:lastCol has ព្រះរាជាណាចក្រកម្ពុជា bottom-aligned (s: 22 = 14pt) right above Row 2
    makeHeaderRow('', 'ព្រះរាជាណាចក្រកម្ពុជា', 22, 44);
    makeHeaderRow(ministry, 'ជាតិ សាសនា ព្រះមហាក្សត្រ', 25, 24);
    makeHeaderRow(school, '3', 24, 24);
    makeHeaderRow(location, '', 1, 22);
  } else {
    makeHeaderRow(ministry, 'ព្រះរាជាណាចក្រកម្ពុជា', 2, 24);
    makeHeaderRow(school, 'ជាតិ សាសនា ព្រះមហាក្សត្រ', 25, 24);
    makeHeaderRow(location, '3', 24, 24);
  }

  // Blank spacer row
  rows.push({ height: 10, cells: [] });
}

/**
 * Helper to create a spacer row immediately above a bordered table header so its bottom border reinforces the table's top border in Print Preview
 */
function makeTableTopSpacerRow(numCols, height = 10) {
  return {
    height,
    cells: new Array(numCols).fill(null).map(() => ({ v: '', s: 23 }))
  };
}

/**
 * Helper to append the official 2-column Signature & Date block at the bottom
 */
function appendOfficialSignatures(rows, merges, numCols, metadata = {}, reportDates = {}, isFinance = false) {
  const leftEndCol = 2; // A..C
  const rightStartCol = 3; // Merge D..lastCol so right-side lunar/solar dates fit on 1 line
  const lastCol = numCols - 1;

  const directorTitle = (!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
    ? 'នាយកសាលា'
    : metadata.directorTitle;
  const reporterTitle = metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍';

  const leftLunar = isFinance
    ? `ថ្ងៃ........ខែ........ឆ្នាំ${reportDates.zodiac || 'មមី'} ${reportDates.sak || 'អដ្ឋស័ក'} ព.ស.${reportDates.beYear || '២៥៧០'}`
    : `ថ្ងៃ........ខែ........ឆ្នាំ${reportDates.zodiac || 'មមី'}${reportDates.sak || 'អដ្ឋស័ក'} ព.ស ${reportDates.beYear || '២៥៧០'}`;
  const leftSolar = isFinance
    ? `ថ្ងៃទី...... ខែ........ ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`
    : `ត្រូវនឹងថ្ងៃទី..... ខែ........ ឆ្នាំ${reportDates.yearKhmer || '២០២៦'}`;

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

  rows.push({ height: 12, cells: [] });
  addSigRow('បានឃើញ និង...........', 1, rightLunar, 13, 24);
  addSigRow(leftLunar, 13, rightSolar, 13, 23);
  addSigRow(leftSolar, 13, reporterTitle, 25, 25);
  addSigRow(directorTitle, 25, '', 25, 25);
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
  const sortedRecords = sortRecordsByDateAsc(records);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  // 2. Centered 3-Line Report Title (matching OfficialLeaveDocument.jsx)
  const title1Row = rows.length + 1;
  rows.push({ height: 24, cells: [{ v: 'របាយការណ៍', s: 2 }] });
  merges.push(`${cellRef(title1Row, 0)}:${cellRef(title1Row, numCols - 1)}`);

  const titleMidRow = rows.length + 1;
  rows.push({ height: 23, cells: [{ v: 'ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(titleMidRow, 0)}:${cellRef(titleMidRow, numCols - 1)}`);

  const title2Text = options.customPeriodTitle || `ចំនួនសមណសិស្សសុំច្បាប់ ក្នុងខែ${monthLabel}`;
  const title2Row = rows.length + 1;
  rows.push({ height: 25, cells: [{ v: title2Text, s: 2 }] });
  merges.push(`${cellRef(title2Row, 0)}:${cellRef(title2Row, numCols - 1)}`);

  rows.push(makeTableTopSpacerRow(numCols, 10));

  // 3. Table Header Row
  const sixthColHeader = options.dateColumnHeader || (options.compactReasonColumn ? 'ចំនួនឈប់សរុប' : 'កាលបរិច្ឆេទ');
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'មូលហេតុ', 'ចំនួនឈប់', sixthColHeader, 'ផ្សេងៗ'];
  rows.push({
    height: 28,
    cells: headers.map(h => ({ v: h, s: 4 }))
  });

  // 4. Table Body Rows
  if (sortedRecords.length === 0) {
    const emptyRow = rows.length + 1;
    const cells = new Array(numCols).fill(null).map((_, idx) => ({
      v: idx === 0 ? 'មិនទាន់មានទិន្នន័យច្បាប់សម្រាប់ខែនេះនៅឡើយទេ។' : '',
      s: 5
    }));
    rows.push({ height: 28, cells });
    merges.push(`${cellRef(emptyRow, 0)}:${cellRef(emptyRow, numCols - 1)}`);
  } else {
    sortedRecords.forEach((r, idx) => {
      const cleanDate = normalizeRecordDateStr(r.date || '', useKhmer);
      const cleanReasonText = String(r.reason || '').replace(/\s+/g, ' ').trim();
      rows.push({
        height: 25,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: r.name || '', s: 6 },
          { v: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), s: 5 },
          { v: cleanReasonText, s: 6 },
          { v: r.duration || '', s: 5 },
          { v: cleanDate, s: 5 },
          { v: r.note || '', s: 5 }
        ]
      });
    });
  }

  // 5. Summary Count Line (Regular Khmer OS Siemreap matching original template)
  rows.push({ height: 10, cells: [] });
  const sumRowNum = rows.length + 1;
  const monthNameOnly = String(monthLabel || '').trim().split(/\s+/)[0] || monthLabel;
  const sumText = options.customSummaryText || `ចំនួនសមណសិស្សសុំច្បាប់ក្នុងខែ${monthNameOnly} សរុប ${fmt(sortedRecords.length)}អង្គ`;
  rows.push({
    height: 24,
    cells: [{ v: sumText, s: 0 }]
  });
  merges.push(`${cellRef(sumRowNum, 0)}:${cellRef(sumRowNum, numCols - 1)}`);

  // 6. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, false);

  downloadStyledXlsx({
    sheetName: 'ច្បាប់សមណសិស្ស',
    colWidths: options.compactReasonColumn
      ? [6, 22, 9, 28, 13, 17, 10]
      : [6, 23, 9, 26, 13, 15, 10],
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
  const sortedRecords = sortRecordsByDateAsc(records);
  const totalAmount = sortedRecords.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const reportDates = getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals: useKhmer
  });

  // 1. Official Ministry & Kingdom Header
  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  // 2. Centered 3-Line Report Title (matching OfficialIdCardDocument.jsx)
  const title1Row = rows.length + 1;
  rows.push({ height: 24, cells: [{ v: 'របាយការណ៍', s: 2 }] });
  merges.push(`${cellRef(title1Row, 0)}:${cellRef(title1Row, numCols - 1)}`);

  const titleMidRow = rows.length + 1;
  rows.push({ height: 23, cells: [{ v: 'ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(titleMidRow, 0)}:${cellRef(titleMidRow, numCols - 1)}`);

  const title2Text = options.customPeriodTitle || `តារាងរាយនាមសមណសិស្ស បង់ថ្លៃទិញ (ID) កាតក្នុងខែ${monthLabel}`;
  const title2Row = rows.length + 1;
  rows.push({ height: 25, cells: [{ v: title2Text, s: 2 }] });
  merges.push(`${cellRef(title2Row, 0)}:${cellRef(title2Row, numCols - 1)}`);

  rows.push(makeTableTopSpacerRow(numCols, 10));

  // 3. Table Header Row
  const headers = ['ល.រ', 'គោត្តនាម-និងនាម', 'ថ្នាក់', 'បរិយាយ', 'ចំនួន', 'តម្លៃ', 'កាលបរិច្ឆេទ'];
  rows.push({
    height: 28,
    cells: headers.map(h => ({ v: h, s: 4 }))
  });

  // 4. Table Body Rows
  if (sortedRecords.length === 0) {
    const emptyRow = rows.length + 1;
    const cells = new Array(numCols).fill(null).map((_, idx) => ({
      v: idx === 0 ? 'មិនទាន់មានទិន្នន័យសមណសិស្សទិញកាត ID សម្រាប់ខែនេះនៅឡើយទេ។' : '',
      s: 5
    }));
    rows.push({ height: 28, cells });
    merges.push(`${cellRef(emptyRow, 0)}:${cellRef(emptyRow, numCols - 1)}`);
  } else {
    sortedRecords.forEach((r, idx) => {
      rows.push({
        height: 25,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: r.name || '', s: 6 },
          { v: useKhmer ? toKhmerDigits(r.grade || '') : (r.grade || ''), s: 5 },
          { v: r.item || '', s: 5 },
          { v: fmt(r.qty || 1), s: 5 },
          { v: formatKhmerCurrency(r.price || 0, useKhmer), s: 8 },
          { v: normalizeRecordDateStr(r.date || '', useKhmer), s: 5 }
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
    `សរុបសមណសិស្សទិញ (ID) កាត ចំនួន ${fmt(sortedRecords.length)} អង្គ សរុបទឹកប្រាក់ចំនួន ${formatKhmerCurrency(totalAmount, useKhmer)}។`
  );
  rows.push({
    height: 24,
    cells: [{ v: sumText, s: 0 }]
  });
  merges.push(`${cellRef(sumRowNum, 0)}:${cellRef(sumRowNum, numCols - 1)}`);

  // 7. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, false);

  downloadStyledXlsx({
    sheetName: 'ទិញកាត ID',
    colWidths: [6, 22, 10, 19, 10, 16, 16],
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
  rows.push({ height: 23, cells: [{ v: 'ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(rTitle2, 0)}:${cellRef(rTitle2, numCols - 1)}`);

  const title3Text = options.customPeriodTitle || `តារាងចំណូលចំណាយប្រចាំខែ${monthLabel}`;
  const rTitle3 = rows.length + 1;
  rows.push({ height: 25, cells: [{ v: title3Text, s: 2 }] });
  merges.push(`${cellRef(rTitle3, 0)}:${cellRef(rTitle3, numCols - 1)}`);

  rows.push(makeTableTopSpacerRow(numCols, 10));

  const tableHeaders = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'តម្លៃរាយ', 'តម្លៃសរុប', 'ផ្សេងៗ'];

  // 3. Section 1: ចំណូល (Income) inside Unified 6-Column Table
  if (showIncomeTable) {
    const incSecRow = rows.length + 1;
    rows.push({
      height: 25,
      cells: new Array(numCols).fill(null).map((_, idx) => ({ v: idx === 0 ? 'ចំណូល' : '', s: 4 }))
    });
    merges.push(`${cellRef(incSecRow, 0)}:${cellRef(incSecRow, numCols - 1)}`);

    rows.push({
      height: 25,
      cells: tableHeaders.map(h => ({ v: h, s: 4 }))
    });

    incomeList.forEach((item, idx) => {
      const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
        ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
        : formatMoney(item.total, item.currency, useKhmer);
      rows.push({
        height: 23,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: item.desc || '', s: 6 },
          { v: item.qty || '', s: 5 },
          { v: item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '', s: 7 },
          { v: displayTotal, s: 7 },
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
      height: 25,
      cells: [
        { v: 'សរុបចំណូល', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: formatCurrencyTotals(incomeTotals, useKhmer), s: 18 },
        { v: inKindNote, s: 5 }
      ]
    });
    merges.push(`${cellRef(subIncRow, 0)}:${cellRef(subIncRow, 3)}`);
  }

  // 4. Section 2: ចំណាយ (Expense) inside Unified 6-Column Table
  if (showExpenseTable) {
    const expSecRow = rows.length + 1;
    rows.push({
      height: 25,
      cells: new Array(numCols).fill(null).map((_, idx) => ({ v: idx === 0 ? 'ចំណាយ' : '', s: 4 }))
    });
    merges.push(`${cellRef(expSecRow, 0)}:${cellRef(expSecRow, numCols - 1)}`);

    rows.push({
      height: 25,
      cells: tableHeaders.map(h => ({ v: h, s: 4 }))
    });

    expenseList.forEach((item, idx) => {
      const displayTotal = item.totalLabel && (!item.total || Number(item.total) === 0)
        ? (useKhmer ? toKhmerDigits(item.totalLabel) : item.totalLabel)
        : formatMoney(item.total, item.currency, useKhmer);
      rows.push({
        height: 23,
        cells: [
          { v: fmt(idx + 1), s: 5 },
          { v: item.desc || '', s: 6 },
          { v: item.qty || '', s: 5 },
          { v: item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmer) : '', s: 7 },
          { v: displayTotal, s: 7 },
          { v: item.note || '', s: 5 }
        ]
      });
    });

    // Subtotal Expense Row (សរុបចំណាយ merged A..D)
    const subExpRow = rows.length + 1;
    rows.push({
      height: 25,
      cells: [
        { v: 'សរុបចំណាយ', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: formatExpenseTotals(expenseTotals, isDeficit, useKhmer), s: isDeficit ? 19 : 18 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(subExpRow, 0)}:${cellRef(subExpRow, 3)}`);
  }

  // 5. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, true);

  downloadStyledXlsx({
    sheetName: 'ចំណូល-ចំណាយ',
    colWidths: [6, 44, 15, 13, 16, 15],
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
  rows.push({ height: 23, cells: [{ v: 'ស្ដីពី', s: 2 }] });
  merges.push(`${cellRef(rTitle2, 0)}:${cellRef(rTitle2, numCols - 1)}`);

  const rTitle3 = rows.length + 1;
  rows.push({ height: 24, cells: [{ v: summaryModel.reportTitle, s: 25 }] });
  merges.push(`${cellRef(rTitle3, 0)}:${cellRef(rTitle3, numCols - 1)}`);

  rows.push(makeTableTopSpacerRow(numCols, 10));

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
      { v: summaryModel.inKindNotes || '', s: 5 }
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
      { v: summaryModel.inKindNotes || '', s: 5 }
    ]
  });
  merges.push(`${cellRef(balRow, 0)}:${cellRef(balRow, 2)}`);

  // 4. Official Signatures & Dates Block
  appendOfficialSignatures(rows, merges, numCols, metadata, reportDates, true);

  downloadStyledXlsx({
    sheetName: 'សង្ខេបចំណូលចំណាយ',
    colWidths: [8, 46, 17, 22, 20],
    rows,
    merges,
    fileName: `របាយការណ៍ចំណូលចំណាយសង្ខេប_${String(monthLabel).replace(/\s+/g, '_')}.xlsx`,
    logoBytes,
    orientation: 'landscape'
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
  const includeHist = Boolean(displayModel.includeHistory && displayModel.schoolHistory);
  const secNums = displayModel.sectionNumbers || {
    background: null,
    management: 'I',
    stats: 'II',
    progress: 'III',
    challenges: 'IV',
    directions: 'V',
    conclusion: 'VI'
  };
  const rows = [];
  const merges = [];
  const numCols = includeHist ? 8 : 5;

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

  // Optional I. សាវតារ (Combined Mode)
  if (includeHist) {
    pushFullRow('I. សាវតារ', 12, 26);
    (displayModel.schoolHistory.backgroundParagraphs || []).forEach(p => {
      const ht = Math.max(42, Math.ceil(String(p || '').length / 100) * 20);
      pushFullRow(p, 0, ht);
    });
    rows.push({ height: 8, cells: [] });
  }

  // I (or II). តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា
  pushFullRow(`${secNums.management}.តួនាទី និងភារកិច្ចគណៈគ្រប់គ្រងសាលា`, 12, 26);
  pushFullRow(displayModel.section1Intro, 0, 38);
  const fmtNum = (n) => toKhmerDigits(n);
  (displayModel.managementRoles || []).forEach((m, idx) => {
    pushFullRow(`${fmtNum(idx + 1)}. ${m.name}     ${m.role}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // II (or III). ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស
  pushFullRow(`${secNums.stats}.ស្ថិតិ គណៈគ្រប់គ្រង គ្រូ និងសមណសិស្ស`, 12, 26);
  pushFullRow('ក-គណៈគ្រប់គ្រង មន្ត្រី គ្រូ', 12, 24);
  (displayModel.staffStats || []).forEach(line => {
    pushFullRow(`❖ ${line}`, 0, 24);
  });
  pushFullRow('ខ-ចំនួនថ្នាក់ សមណសិស្ស', 12, 24);
  (displayModel.studentStatLines || []).forEach(line => {
    pushFullRow(`❖ ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // III (or IV). វឌ្ឍនភាពការងារ
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

  // Optional 16-Year Human Resource Training Table placed between ខ and គ
  if (includeHist) {
    if (displayModel.schoolHistory.tableIntro) {
      pushFullRow(displayModel.schoolHistory.tableIntro, 0, 42);
    }
    rows.push({
      height: 26,
      cells: ['ល.រ', 'ឆ្នាំសិក្សា', 'ថ្នាក់មត្តេយ្យ', 'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'សរុប', 'ផ្សេងៗ'].map(h => ({ v: h, s: 4 }))
    });
    (displayModel.schoolHistory.rows || []).forEach(r => {
      rows.push({
        height: 24,
        cells: [
          { v: r.no, s: 5 },
          { v: r.academicYearDisplay, s: 5 },
          { v: r.kgText, s: 5 },
          { v: r.g1Text, s: 5 },
          { v: r.g2Text, s: 5 },
          { v: r.g3Text, s: 5 },
          { v: r.totalText, s: 5 },
          { v: r.note || '', s: 5 }
        ]
      });
    });
    if (displayModel.schoolHistory.totals) {
      const t = displayModel.schoolHistory.totals;
      rows.push({
        height: 26,
        cells: [
          { v: '', s: 9 },
          { v: t.label, s: 9 },
          { v: t.kgText, s: 9 },
          { v: t.g1Text, s: 9 },
          { v: t.g2Text, s: 9 },
          { v: t.g3Text, s: 9 },
          { v: t.grandTotalText, s: 9 },
          { v: '', s: 9 }
        ]
      });
    }
    rows.push({ height: 8, cells: [] });
  }

  pushFullRow(displayModel.section3SubCHeading, 12, 24);
  pushFullRow(displayModel.section3SubDHeading, 12, 24);
  (displayModel.appendixItems || []).forEach((line, idx) => {
    pushFullRow(`${fmtNum(idx + 1)}. ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // IV (or V). បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ
  pushFullRow(`${secNums.challenges}.បញ្ហាប្រឈម ដំណោះស្រាយ និងសំណូមពរ`, 12, 26);
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

  // V (or VI). ទិសដៅបន្ត
  pushFullRow(`${secNums.directions}.ទិសដៅបន្ត`, 12, 26);
  (displayModel.directions || []).forEach(line => {
    pushFullRow(`- ${line}`, 0, 24);
  });
  rows.push({ height: 8, cells: [] });

  // VI (or VII). សន្និដ្ឋាន
  pushFullRow(`${secNums.conclusion}.សន្និដ្ឋាន`, 12, 26);
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
    colWidths: includeHist ? [7, 18, 15, 15, 15, 15, 16, 12] : [12, 30, 19, 19, 19],
    rows,
    merges,
    fileName: `របាយការណ៍_${displayModel.shortFileNameTag}.xlsx`,
    logoBytes
  });
}

/**
 * Export Ministry 10-Row Summary Report (របាយការណ៍សង្ខេបប្រចាំឆ្នាំ) to Styled Excel (.xlsx)
 */
export async function exportMinistrySummaryToExcel(ministryModel, metadata = {}) {
  if (!ministryModel) return;
  const logoBytes = await loadOfficialLogoBytes();
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const rows = [];
  const merges = [];
  const numCols = 4;

  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  const titleRow = rows.length + 1;
  rows.push({ height: 28, cells: [{ v: ministryModel.summaryReportTitle, s: 2 }] });
  merges.push(`${cellRef(titleRow, 0)}:${cellRef(titleRow, numCols - 1)}`);

  rows.push(makeTableTopSpacerRow(numCols, 10));

  const headers = ['ល.រ', 'បរិយាយ', 'ចំនួន', 'ផ្សេងៗ'];
  rows.push({
    height: 28,
    cells: headers.map(h => ({ v: h, s: 4 }))
  });

  (ministryModel.summaryRows || []).forEach(r => {
    const descFull = [r.desc, ...(r.subDescLines || []).map(s => `   ${s}`)].join('\n');
    const countFull = [r.count, ...(r.subCountLines || [])].join('\n');
    const isMultiLine = Array.isArray(r.subDescLines) && r.subDescLines.length > 0;
    rows.push({
      height: isMultiLine ? 58 : 26,
      cells: [
        { v: r.no, s: 5 },
        { v: descFull, s: 6 },
        { v: countFull, s: 5 },
        { v: r.note || '', s: 5 }
      ]
    });
  });

  rows.push({ height: 14, cells: [] });
  const pushSigRow = (leftText, leftStyle, rightText, rightStyle, height = 23) => {
    const rNum = rows.length + 1;
    rows.push({
      height,
      cells: [
        { v: leftText, s: leftStyle },
        { v: '', s: leftStyle },
        { v: rightText, s: rightStyle },
        { v: '', s: rightStyle }
      ]
    });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, 1)}`);
    merges.push(`${cellRef(rNum, 2)}:${cellRef(rNum, 3)}`);
  };

  pushSigRow('', 13, ministryModel.lunarDateLine || '', 13);
  pushSigRow(`លេខ ${ministryModel.docNumber || '.....................................'}`, 13, ministryModel.solarDateLine || '', 13);
  pushSigRow('បានឃើញ និងឯកភាព', 1, ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍', 1);
  pushSigRow(ministryModel.lunarDateLine || '', 13, '', 13);
  pushSigRow(ministryModel.solarDateLine || '', 13, '', 13);
  pushSigRow(ministryModel.signerTitle || 'ព្រះនាយក', 1, '', 13);

  downloadStyledXlsx({
    sheetName: 'សង្ខេបប្រចាំឆ្នាំ',
    colWidths: [8, 42, 24, 28],
    rows,
    merges,
    fileName: `របាយការណ៍_${ministryModel.shortSummaryFileNameTag}.xlsx`,
    logoBytes
  });
}

/**
 * Export Ministry Full Annual Report (របាយការណ៍ប្រចាំឆ្នាំ — មន្ទីរ) to Styled Excel (.xlsx)
 */
export async function exportMinistryReportToExcel(ministryModel, metadata = {}) {
  if (!ministryModel) return;
  const logoBytes = await loadOfficialLogoBytes();
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const rows = [];
  const merges = [];
  const numCols = 7;

  const pushFullRow = (text, styleIdx = 0, height = 24) => {
    const rNum = rows.length + 1;
    rows.push({
      height,
      cells: [{ v: text, s: styleIdx }]
    });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, numCols - 1)}`);
  };

  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  pushFullRow('របាយការណ៍', 2, 24);
  pushFullRow('ស្តីពី', 2, 23);
  pushFullRow(ministryModel.fullReportTitle, 2, 25);
  rows.push({ height: 8, cells: [] });

  // ក.ព័ត៌មានទូទៅ
  pushFullRow('ក.ព័ត៌មានទូទៅ', 12, 26);
  (ministryModel.generalInfoLines || []).forEach(r => {
    const txt = r.value ? `-${r.label}     ${r.value}` : `-${r.label}`;
    pushFullRow(txt, 0, 24);
  });

  // ខ, គ, ឃ, ង, ង.១, ង.២
  pushFullRow('ខ.អំពីសកម្មភាពនៅក្នុងសាលា៖ (គ្រូ និង សមណសិស្ស សិស្ស)', 12, 26);
  pushFullRow('ខ.១. សកម្មភាពរបស់គ្រូ', 12, 24);
  (ministryModel.teacherActivities || []).forEach(l => pushFullRow(`-${l}`, 0, 24));
  pushFullRow('ខ.២. សកម្មភាពសមណសិស្ស សិស្ស', 12, 24);
  (ministryModel.studentActivities || []).forEach(l => pushFullRow(`-${l}`, 0, 24));

  pushFullRow('គ.អំពីសកម្មភាពនៅក្រៅសាលា (គ្រូ និង សមណសិស្ស សិស្ស)', 12, 26);
  (ministryModel.outsideActivities || []).forEach(l => pushFullRow(`-${l}`, 0, 24));

  pushFullRow('ឃ.អំពីការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ ឬអាណាព្យាបាល៖', 12, 26);
  pushFullRow('ឃ.១. ការទទួលខុសត្រូវរបស់ព្រះគ្រូចៅអធិការ', 12, 24);
  (ministryModel.abbotResponsibilities || []).forEach(l => pushFullRow(`-${l}`, 0, l.length > 90 ? 38 : 24));

  pushFullRow('ង.អំពីសកម្មភាពគណៈគ្រប់គ្រង (ទាំងក្នុង និងក្រៅសាលា)', 12, 26);
  (ministryModel.managementActivities || []).forEach(l => pushFullRow(`-${l}`, 0, l.length > 90 ? 44 : 24));
  pushFullRow('ង.១. ពុទ្ធិកបណ្ណាល័យ', 12, 24);
  (ministryModel.libraryLines || []).forEach(l => pushFullRow(`-${l}`, 0, 24));
  pushFullRow('ង.២. ការទទួលជំនួយពីសប្បុរសជន', 12, 24);
  (ministryModel.donationLines || []).forEach(l => pushFullRow(`-${l}`, 0, 24));

  const appendHourlySemTable = (title, tblData) => {
    pushFullRow(title, 12, 26);
    rows.push({
      height: 26,
      cells: ['ល.រ', 'បរិយាយ', 'ចំណូលរួម', 'ចំណាយ', 'ចំនួនម៉ោង', 'សមតុល្យ', 'ផ្សេងៗ'].map(h => ({ v: h, s: 4 }))
    });
    (tblData?.rows || []).forEach(r => {
      rows.push({
        height: 24,
        cells: [
          { v: r.no, s: 5 },
          { v: r.label, s: 5 },
          { v: r.incomeText, s: 5 },
          { v: r.expenseText, s: 5 },
          { v: r.hoursText, s: 5 },
          { v: r.balanceText, s: 5 },
          { v: r.note || '', s: 5 }
        ]
      });
    });
    const totR = rows.length + 1;
    rows.push({
      height: 26,
      cells: [
        { v: 'សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់', s: 9 },
        { v: '', s: 9 },
        { v: tblData?.sumIncomeText, s: 9 },
        { v: tblData?.sumExpenseText, s: 9 },
        { v: tblData?.sumHoursText, s: 9 },
        { v: tblData?.totalBalanceText, s: 9 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(totR, 0)}:${cellRef(totR, 1)}`);
  };

  appendHourlySemTable('ច. ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី១', ministryModel.hourlySem1);
  appendHourlySemTable('ច.១ ចំណូល-ចំណាយ ប្រាក់ម៉ោង ប្រចាំឆមាសទី២', ministryModel.hourlySem2);

  // ច.២
  pushFullRow(`ច.២ ចំណូលចំណាយប្រាក់ម៉ោងប្រចាំឆ្នាំ ${ministryModel.yearKhmer}`, 12, 26);
  rows.push({
    height: 26,
    cells: ['ល.រ', 'បរិយាយ', 'ចំណូល', 'ចំណាយ', 'ចំនួនម៉ោង', 'សមតុល្យ', ''].map(h => ({ v: h, s: 4 }))
  });
  (ministryModel.hourlyAnnual?.rows || []).forEach(r => {
    rows.push({
      height: 24,
      cells: [
        { v: r.no, s: 5 },
        { v: r.label, s: 5 },
        { v: r.incomeText, s: 5 },
        { v: r.expenseText, s: 5 },
        { v: r.hoursText, s: 5 },
        { v: r.balanceText, s: 5 },
        { v: '', s: 5 }
      ]
    });
  });
  const hAnnTotR = rows.length + 1;
  rows.push({
    height: 26,
    cells: [
      { v: 'សមតុល្យសាច់ប្រាក់ចំណូល និងចំណាយនៅសល់', s: 9 },
      { v: '', s: 9 },
      { v: ministryModel.hourlyAnnual?.sumIncomeText, s: 9 },
      { v: ministryModel.hourlyAnnual?.sumExpenseText, s: 9 },
      { v: ministryModel.hourlyAnnual?.sumHoursText, s: 9 },
      { v: ministryModel.hourlyAnnual?.totalBalanceText, s: 9 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(hAnnTotR, 0)}:${cellRef(hAnnTotR, 1)}`);

  // ច.៣ & ច.៤ Office Supplies Semester Tables
  const appendOfficeSemTable = (title, semData) => {
    pushFullRow(title, 12, 26);
    const expHdrR = rows.length + 1;
    rows.push({
      height: 24,
      cells: Array.from({ length: numCols }, (_, i) => ({ v: i === 0 ? 'តារាងចំណាយ' : '', s: 4 }))
    });
    merges.push(`${cellRef(expHdrR, 0)}:${cellRef(expHdrR, numCols - 1)}`);

    const expColHdrR = rows.length + 1;
    rows.push({
      height: 26,
      cells: ['ល.រ', 'បរិយាយ', 'ចំណូលរួម', 'ចំណាយ', 'ចំនួន', 'ផ្សេងៗ', ''].map(h => ({ v: h, s: 4 }))
    });
    merges.push(`${cellRef(expColHdrR, 5)}:${cellRef(expColHdrR, 6)}`);

    if ((semData?.expenseRows || []).length === 0) {
      const emptyR = rows.length + 1;
      rows.push({
        height: 24,
        cells: Array.from({ length: numCols }, (_, i) => ({ v: i === 0 ? 'គ្មាន' : '', s: 5 }))
      });
      merges.push(`${cellRef(emptyR, 0)}:${cellRef(emptyR, numCols - 1)}`);
    } else {
      (semData.expenseRows || []).forEach(r => {
        const expRowIdx = rows.length + 1;
        rows.push({
          height: 24,
          cells: [
            { v: r.no, s: 5 },
            { v: r.desc, s: 6 },
            { v: r.source, s: 5 },
            { v: r.amountText, s: 5 },
            { v: r.qty, s: 5 },
            { v: r.note || '', s: 5 },
            { v: '', s: 5 }
          ]
        });
        merges.push(`${cellRef(expRowIdx, 5)}:${cellRef(expRowIdx, 6)}`);
      });
    }

    const expTotR = rows.length + 1;
    rows.push({
      height: 26,
      cells: [
        { v: 'ចំណាយសរុប', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: semData?.totalExpenseText, s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(expTotR, 0)}:${cellRef(expTotR, 2)}`);
    merges.push(`${cellRef(expTotR, 4)}:${cellRef(expTotR, 6)}`);

    const incHdrR = rows.length + 1;
    rows.push({
      height: 24,
      cells: Array.from({ length: numCols }, (_, i) => ({ v: i === 0 ? 'តារាងចំណូល' : '', s: 4 }))
    });
    merges.push(`${cellRef(incHdrR, 0)}:${cellRef(incHdrR, numCols - 1)}`);

    rows.push({
      height: 26,
      cells: ['ល.រ', 'បរិយាយ', 'ថវិកា (រៀល)', 'ថវិកា (ដុល្លារ)', 'សេចក្ដីផ្សេងៗ', '', ''].map(h => ({ v: h, s: 4 }))
    });

    if ((semData?.incomeRows || []).length === 0) {
      const emptyIncR = rows.length + 1;
      rows.push({
        height: 24,
        cells: Array.from({ length: numCols }, (_, i) => ({ v: i === 0 ? 'គ្មាន' : '', s: 5 }))
      });
      merges.push(`${cellRef(emptyIncR, 0)}:${cellRef(emptyIncR, numCols - 1)}`);
    } else {
      (semData.incomeRows || []).forEach(r => {
        rows.push({
          height: 24,
          cells: [
            { v: r.no, s: 5 },
            { v: r.desc, s: 6 },
            { v: r.khrText, s: 5 },
            { v: r.usdText, s: 5 },
            { v: r.note || '', s: 5 },
            { v: '', s: 5 },
            { v: '', s: 5 }
          ]
        });
      });
    }

    const incTotR = rows.length + 1;
    rows.push({
      height: 26,
      cells: [
        { v: 'សរុបចំណូល', s: 9 },
        { v: '', s: 9 },
        { v: semData?.totalIncomeKHRText, s: 9 },
        { v: semData?.totalIncomeUSDText, s: 9 },
        { v: semData?.inKindSummary || '', s: 5 },
        { v: '', s: 9 },
        { v: '', s: 9 }
      ]
    });
    merges.push(`${cellRef(incTotR, 0)}:${cellRef(incTotR, 1)}`);
  };

  appendOfficeSemTable(
    `ច.៣ ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី១ ឆ្នាំ${ministryModel.yearKhmer}`,
    ministryModel.officeSem1
  );
  appendOfficeSemTable(
    `ច.៤ ចំណាយ ចំណូល លើសម្ភារៈការិយាល័យ ប្រចាំឆមាសទី២ ឆ្នាំ${ministryModel.yearKhmer}`,
    ministryModel.officeSem2
  );

  // ច.៥
  pushFullRow(`ច.៥ ចំណូល ចំណាយ លើសម្ភារៈការិយាល័យ ប្រចាំឆ្នាំ ${ministryModel.yearKhmer}`, 12, 26);
  rows.push({
    height: 26,
    cells: ['ល.រ', 'បរិយាយ', 'ចំណូល', 'ចំណាយ', 'ផ្សេងៗ', '', ''].map(h => ({ v: h, s: 4 }))
  });
  (ministryModel.officeAnnual?.rows || []).forEach(r => {
    rows.push({
      height: 24,
      cells: [
        { v: r.no, s: 5 },
        { v: r.label, s: 5 },
        { v: r.incomeText, s: 5 },
        { v: r.expenseText, s: 5 },
        { v: r.note || '', s: 5 },
        { v: '', s: 5 },
        { v: '', s: 5 }
      ]
    });
  });
  const offTotR = rows.length + 1;
  rows.push({
    height: 26,
    cells: [
      { v: 'សរុបទាំងពីរឆមាស', s: 9 },
      { v: '', s: 9 },
      { v: ministryModel.officeAnnual?.totalIncomeText, s: 9 },
      { v: ministryModel.officeAnnual?.totalExpenseText, s: 9 },
      { v: ministryModel.officeAnnual?.inKindSummary || '', s: 5 },
      { v: '', s: 9 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(offTotR, 0)}:${cellRef(offTotR, 1)}`);

  // ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ
  pushFullRow('ចំណូល ចំណាយ កម្មវិធីចែកបណ្ណសរសើរ', 12, 26);
  rows.push({
    height: 24,
    cells: [
      { v: '១', s: 5 },
      { v: 'ចំណូលពីការចែកបណ្ណសរសើរ', s: 6 },
      { v: ministryModel.awardCeremonyTable?.income1Text, s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 }
    ]
  });
  rows.push({
    height: 24,
    cells: [
      { v: '២', s: 5 },
      { v: 'ចំណូលពីវត្ត', s: 6 },
      { v: ministryModel.awardCeremonyTable?.income2Text, s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 }
    ]
  });
  const awIncTotR = rows.length + 1;
  rows.push({
    height: 26,
    cells: [
      { v: 'ចំណូលសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ', s: 9 },
      { v: '', s: 9 },
      { v: ministryModel.awardCeremonyTable?.totalIncomeText, s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(awIncTotR, 0)}:${cellRef(awIncTotR, 1)}`);

  const awExpTotR = rows.length + 1;
  rows.push({
    height: 26,
    cells: [
      { v: 'ចំណាយសរុបក្នុងកម្មវិធីចែកបណ្ណសរសើរ', s: 9 },
      { v: '', s: 9 },
      { v: ministryModel.awardCeremonyTable?.totalExpenseText, s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(awExpTotR, 0)}:${cellRef(awExpTotR, 1)}`);

  // ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ
  pushFullRow(`ចំណូល ចំណាយ សរុបរួមប្រចាំឆ្នាំ${ministryModel.yearKhmer}`, 12, 26);
  rows.push({
    height: 26,
    cells: ['ល.រ', 'បរិយាយ', 'រៀល', 'ដុល្លារ', 'ផ្សេងៗ', '', ''].map(h => ({ v: h, s: 4 }))
  });
  rows.push({
    height: 24,
    cells: [
      { v: '១', s: 5 },
      { v: 'ចំណូលរួមប្រចាំឆ្នាំ', s: 6 },
      { v: ministryModel.grandAnnualTable?.incomeKHRText, s: 9 },
      { v: ministryModel.grandAnnualTable?.incomeUSDText, s: 9 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 }
    ]
  });
  rows.push({
    height: 24,
    cells: [
      { v: '២', s: 5 },
      { v: 'ចំណាយរួមប្រចាំឆ្នាំ', s: 6 },
      { v: ministryModel.grandAnnualTable?.expenseKHRText, s: 9 },
      { v: ministryModel.grandAnnualTable?.expenseUSDText, s: 9 },
      { v: '', s: 5 },
      { v: '', s: 5 },
      { v: '', s: 5 }
    ]
  });
  const grTotR = rows.length + 1;
  rows.push({
    height: 26,
    cells: [
      { v: 'សមតុល្យ', s: 9 },
      { v: '', s: 9 },
      { v: ministryModel.grandAnnualTable?.balanceKHRText, s: 9 },
      { v: ministryModel.grandAnnualTable?.balanceUSDText, s: 9 },
      { v: ministryModel.grandAnnualTable?.balanceNote, s: 5 },
      { v: '', s: 9 },
      { v: '', s: 9 }
    ]
  });
  merges.push(`${cellRef(grTotR, 0)}:${cellRef(grTotR, 1)}`);

  // ឆ, ជ, ឈ, ញ, ដ
  pushFullRow('ឆ.អំពីសកម្មភាពគ្រូបង្រៀន (ជាមួយសមណសិស្ស សិស្ស ក្នុង និងក្រៅសាលា)', 12, 26);
  (ministryModel.teacherRelations || []).forEach(l => pushFullRow(`-${l}`, 0, 24));
  pushFullRow('ជ.បញ្ហាប្រឈម', 12, 26);
  (ministryModel.challenges || []).forEach(l => pushFullRow(`-${l}`, 0, 24));
  pushFullRow('ឈ. ដំណោះស្រាយ', 12, 26);
  (ministryModel.solutions || []).forEach(l => pushFullRow(`-${l}`, 0, 24));
  pushFullRow('ញ.សេចក្ដីសន្និដ្ឋាន', 12, 26);
  (ministryModel.conclusionParas || []).forEach(p => pushFullRow(p, 0, 44));
  pushFullRow('ដ.សំណូមពរ', 12, 26);
  (ministryModel.requests || []).forEach(l => pushFullRow(`-${l}`, 0, 24));

  rows.push({ height: 12, cells: [] });
  pushFullRow(ministryModel.lunarDateLine || '', 13, 22);
  pushFullRow(ministryModel.solarDateLine || '', 13, 22);
  pushFullRow(ministryModel.reporterTitle || 'អ្នកធ្វើរបាយការណ៍', 1, 24);
  pushFullRow(`លេខ ${ministryModel.docNumber || '.....................................'}`, 13, 22);
  pushFullRow('បានឃើញ និងឯកភាព', 1, 24);
  pushFullRow(ministryModel.signerTitle || 'ព្រះនាយក', 1, 26);

  pushFullRow('ចម្លងប្រគេនជូន', 12, 24);
  (ministryModel.ccList || []).forEach(cc => pushFullRow(`-${cc}`, 0, 22));

  downloadStyledXlsx({
    sheetName: 'របាយការណ៍មន្ទីរ',
    colWidths: [8, 28, 18, 18, 16, 16, 14],
    rows,
    merges,
    fileName: `របាយការណ៍_${ministryModel.shortFullFileNameTag}.xlsx`,
    logoBytes
  });
}

/**
 * Export Standalone School History Report (របាយការណ៍ស្ដីពី ប្រវត្តិសាលា) to Styled Excel (.xlsx)
 */
export async function exportSchoolHistoryToExcel(historyModel, metadata = {}) {
  if (!historyModel) return;
  const logoBytes = await loadOfficialLogoBytes();
  const hasLogo = Boolean(logoBytes && logoBytes.length > 0);
  const rows = [];
  const merges = [];
  const numCols = 8;

  const pushFullRow = (text, styleIdx = 0, height = 24) => {
    const rNum = rows.length + 1;
    rows.push({
      height,
      cells: [{ v: text, s: styleIdx }]
    });
    merges.push(`${cellRef(rNum, 0)}:${cellRef(rNum, numCols - 1)}`);
  };

  appendOfficialHeader(rows, merges, numCols, metadata, false, hasLogo);

  pushFullRow('របាយការណ៍', 1, 26);
  pushFullRow('ស្ដីពី', 1, 24);
  pushFullRow(historyModel.title || 'ប្រវត្តិសាលាពុទ្ធិកសិក្សាកម្រង ហ៊ុន ណេង ក្រុងកំពង់ចាម', 2, 28);
  rows.push({ height: 8, cells: [] });

  pushFullRow('១.១. សាវតារ', 12, 26);
  (historyModel.backgroundParagraphs || []).forEach(p => {
    const ht = Math.max(44, Math.ceil(String(p || '').length / 100) * 20);
    pushFullRow(p, 0, ht);
  });
  if (historyModel.tableIntro) {
    pushFullRow(historyModel.tableIntro, 0, 42);
  }
  rows.push({ height: 8, cells: [] });

  rows.push({
    height: 26,
    cells: ['ល.រ', 'ឆ្នាំសិក្សា', 'ថ្នាក់មត្តេយ្យ', 'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'សរុប', 'ផ្សេងៗ'].map(h => ({ v: h, s: 4 }))
  });
  (historyModel.rows || []).forEach(r => {
    rows.push({
      height: 24,
      cells: [
        { v: r.no, s: 5 },
        { v: r.academicYearDisplay, s: 5 },
        { v: r.kgText, s: 5 },
        { v: r.g1Text, s: 5 },
        { v: r.g2Text, s: 5 },
        { v: r.g3Text, s: 5 },
        { v: r.totalText, s: 5 },
        { v: r.note || '', s: 5 }
      ]
    });
  });
  if (historyModel.totals) {
    const t = historyModel.totals;
    rows.push({
      height: 26,
      cells: [
        { v: '', s: 9 },
        { v: t.label, s: 9 },
        { v: t.kgText, s: 9 },
        { v: t.g1Text, s: 9 },
        { v: t.g2Text, s: 9 },
        { v: t.g3Text, s: 9 },
        { v: t.grandTotalText, s: 9 },
        { v: '', s: 9 }
      ]
    });
  }

  rows.push({ height: 14, cells: [] });
  pushFullRow(historyModel.lunarDateLine || '', 13, 22);
  pushFullRow(historyModel.solarDateLine || '', 13, 22);
  pushFullRow(historyModel.signerTitle || 'នាយកសាលា', 1, 26);

  downloadStyledXlsx({
    sheetName: 'ប្រវត្តិសាលា',
    colWidths: [7, 18, 15, 15, 15, 15, 16, 12],
    rows,
    merges,
    fileName: `របាយការណ៍_${historyModel.shortFileNameTag}.xlsx`,
    logoBytes
  });
}

