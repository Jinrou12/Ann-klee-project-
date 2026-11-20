import React, { useMemo } from 'react';
import { getMonthEndReportDates } from '../utils/khmerCalendar';
import { buildFinanceSummaryModel } from '../utils/financeSummaryBuilder';
import { getAdaptiveMoneyFontSize } from '../utils/khmerNumerals';
import KhmerRoyalDivider from './KhmerRoyalDivider';

/**
 * OfficialFinanceSummaryDocument: Authentic 1-Page A4 Landscape Ministry Summary Replica
 * matching របាយការណ៍ចំណូលចំណាយសង្ខេប (.docx templates for July & September 2026 — A4 Landscape 297mm × 210mm)
 */
export default function OfficialFinanceSummaryDocument({
  id = 'printable-finance-summary-document',
  financeData = { income: [], expense: [] },
  metadata = {},
  monthName = 'កក្កដា',
  yearDisplay = '២០២៦',
  useKhmerNumerals = true,
  monthKey = '2026-07',
  periodMode = 'month',
  customSummaryTitle = '',
  isDeficitOverride = null
}) {
  const summaryModel = useMemo(
    () =>
      buildFinanceSummaryModel(financeData, {
        monthKey,
        monthName,
        yearDisplay,
        periodMode,
        useKhmerNumerals,
        customSummaryTitle,
        isDeficitOverride
      }),
    [financeData, monthKey, monthName, yearDisplay, periodMode, useKhmerNumerals, customSummaryTitle, isDeficitOverride]
  );

  const reportDates = useMemo(
    () =>
      getMonthEndReportDates(monthKey, {
        watName: metadata.wat,
        customLunarTemplate: metadata.lunarDateHeader,
        useKhmerNumerals
      }),
    [monthKey, metadata.wat, metadata.lunarDateHeader, useKhmerNumerals]
  );

  const { isDeficit } = summaryModel;

  return (
    <div
      id={id}
      className="printable-document printable-document-landscape"
      data-orientation="landscape"
      data-spacious-single-page="true"
    >
      {/* Header Block */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12
        }}
      >
        {/* Left: Ministry & School with Centered Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.85 }}>
          <img
            src="/logo.png?v=nobg1"
            alt="Logo"
            style={{ width: 68, height: 68, objectFit: 'contain', marginBottom: 6 }}
          />
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.school}
          </div>
          <div className="font-moul" style={{ fontSize: '11pt', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.location}
          </div>
        </div>

        {/* Right: National Kingdom & Motto */}
        <div style={{ textAlign: 'center', lineHeight: 1.8, paddingTop: 6 }}>
          <div className="font-moul" style={{ fontSize: '14pt', whiteSpace: 'nowrap' }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div className="font-moul" style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}>
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <div style={{ marginTop: 4 }}>
            <KhmerRoyalDivider />
          </div>
        </div>
      </div>

      {/* Report Title */}
      <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 14 }}>
        <div className="font-moul" style={{ fontSize: '14pt', marginBottom: 4, whiteSpace: 'nowrap' }}>
          របាយការណ៍
        </div>
        <div className="font-moul" style={{ fontSize: '14pt', marginBottom: 4, whiteSpace: 'nowrap' }}>
          ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}>
          {summaryModel.reportTitle}
        </div>
      </div>

      {/* Unified 5-Column Summary Table (Proportional to Original Landscape Template: 818 : 6690 : 2268 : 2779 : 2571) */}
      <table
        className="official-grid"
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: '11.5pt'
        }}
      >
        <thead>
          <tr style={{ background: '#ffffff', textAlign: 'center', height: 30 }}>
            <th className="font-moul" style={{ border: '1px solid #000', width: '5.5%', padding: '4px 4px', fontSize: '11.5pt', fontWeight: 400 }}>
              ល.រ
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '44.2%', padding: '4px 10px', fontSize: '11.5pt', fontWeight: 400 }}>
              បរិយាយ
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '15%', padding: '4px 6px', fontSize: '11.5pt', fontWeight: 400 }}>
              ចំនួន
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '18.3%', padding: '4px 8px', fontSize: '11.5pt', fontWeight: 400 }}>
              ចំនួនថវិកា
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '17%', padding: '4px 6px', fontSize: '11.5pt', fontWeight: 400 }}>
              ផ្សេងៗ
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Income Rows (1 & 2) */}
          {summaryModel.incomeRows.map((row, idx) => (
            <tr key={`inc-sum-${idx}`} style={{ height: 28 }}>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 4px', lineHeight: 1.45 }}>{row.no}</td>
              <td style={{ border: '1px solid #000', textAlign: 'left', padding: '4px 8px', lineHeight: 1.45 }}>{row.desc}</td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', lineHeight: 1.45, whiteSpace: 'nowrap' }}>
                {row.qty}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'right',
                  padding: '4px 6px',
                  lineHeight: 1.45,
                  whiteSpace: 'nowrap',
                  fontSize: getAdaptiveMoneyFontSize(row.amountText, 11.5, 9)
                }}
              >
                {row.amountText}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', lineHeight: 1.45, fontSize: '11.5pt' }}>
                {row.note}
              </td>
            </tr>
          ))}

          {/* Subtotal Income Row */}
          <tr className="official-total" style={{ height: 28, background: '#ffffff' }}>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '4px 8px'
              }}
            >
              <span className="font-moul" style={{ fontSize: '11.5pt' }}>
                {summaryModel.totalIncomeLabel}
              </span>
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '4px 6px',
                fontSize: getAdaptiveMoneyFontSize(summaryModel.totalIncomeText, 12, 9),
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'inline-block', borderBottom: '1px solid #000000', paddingBottom: 0.5 }}>
                {summaryModel.totalIncomeText}
              </span>
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', fontSize: '11.5pt', whiteSpace: 'nowrap' }}>
              {summaryModel.inKindNotes || ''}
            </td>
          </tr>

          {/* Expense Rows (1 & 2) */}
          {summaryModel.expenseRows.map((row, idx) => (
            <tr key={`exp-sum-${idx}`} style={{ height: 28 }}>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 4px', lineHeight: 1.45 }}>{row.no}</td>
              <td style={{ border: '1px solid #000', textAlign: 'left', padding: '4px 8px', lineHeight: 1.45 }}>{row.desc}</td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', lineHeight: 1.45, whiteSpace: 'nowrap' }}>
                {row.qty}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'right',
                  padding: '4px 6px',
                  lineHeight: 1.45,
                  whiteSpace: 'nowrap',
                  fontSize: getAdaptiveMoneyFontSize(row.amountText, 11.5, 9)
                }}
              >
                {row.amountText}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', lineHeight: 1.45, fontSize: '11.5pt' }}>
                {row.note}
              </td>
            </tr>
          ))}

          {/* Subtotal Expense Row */}
          <tr className="official-total" style={{ height: 28, background: '#ffffff' }}>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '4px 8px'
              }}
            >
              <span className="font-moul" style={{ fontSize: '11.5pt', color: isDeficit ? '#b91c1c' : '#000000' }}>
                {summaryModel.totalExpenseLabel}
              </span>
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '4px 6px',
                fontSize: getAdaptiveMoneyFontSize(summaryModel.totalExpenseText, 12, 9),
                color: isDeficit ? '#b91c1c' : '#000000',
                whiteSpace: 'nowrap'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: `1px solid ${isDeficit ? '#b91c1c' : '#000000'}`,
                  paddingBottom: 0.5
                }}
              >
                {summaryModel.totalExpenseText}
              </span>
            </td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
          </tr>

          {/* Final Net Balance Row (Double Underlined) */}
          <tr className="official-total" style={{ height: 30, background: '#ffffff' }}>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '4px 8px'
              }}
            >
              <span className="font-moul" style={{ fontSize: '11.5pt', color: isDeficit ? '#b91c1c' : '#000000' }}>
                {summaryModel.balanceLabel}
              </span>
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '4px 6px',
                fontSize: getAdaptiveMoneyFontSize(summaryModel.balanceText, 12, 9),
                color: isDeficit ? '#b91c1c' : '#000000',
                whiteSpace: 'nowrap'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  borderBottom: `2.5px double ${isDeficit ? '#b91c1c' : '#000000'}`,
                  paddingBottom: 1
                }}
              >
                {summaryModel.balanceText}
              </span>
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', fontSize: '11.5pt', whiteSpace: 'nowrap' }}>
              {summaryModel.inKindNotes || ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Official Signatures Block */}
      <div
        className="signature-block"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: 26,
          fontSize: '12pt',
          lineHeight: 1.9
        }}
      >
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: '0 0 46%', maxWidth: '46%' }}>
          <div className="font-moul" style={{ fontSize: '12pt', marginBottom: 6, whiteSpace: 'nowrap' }}>
            បានឃើញ និង……………..
          </div>
          <div style={{ whiteSpace: 'nowrap', marginBottom: 4 }}>
            ថ្ងៃ………..…….ខែ………..….ឆ្នាំ{reportDates.zodiac || 'មមី'} {reportDates.sak || 'អដ្ឋស័ក'} ព.ស.{reportDates.beYear || '២៥៧០'}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃទី………. ខែ……….. ឆ្នាំ{reportDates.yearKhmer}</div>
          <div className="font-moul" style={{ fontSize: '12pt', marginTop: 10, paddingBottom: 24, whiteSpace: 'nowrap' }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter */}
        <div style={{ textAlign: 'center', flex: '0 0 53%', maxWidth: '53%' }}>
          <div style={{ whiteSpace: 'nowrap', marginBottom: 4 }}>{reportDates.lunarDateText}</div>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.solarDateTextFinance}</div>
          <div className="font-moul" style={{ fontSize: '12pt', marginTop: 10, paddingBottom: 24, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}

