import React, { useMemo } from 'react';
import { getMonthEndReportDates } from '../utils/khmerCalendar';
import { buildFinanceSummaryModel } from '../utils/financeSummaryBuilder';
import KhmerRoyalDivider from './KhmerRoyalDivider';

/**
 * OfficialFinanceSummaryDocument: Authentic 1-Page A4 Ministry Summary Replica
 * matching របាយការណ៍ចំណូលចំណាយសង្ខេប (.docx templates for July & September 2026)
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
    <div id={id} className="printable-document" data-spacious-single-page="true">
      {/* Header Block */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14
        }}
      >
        {/* Left: Ministry & School with Centered Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.5 }}>
          <img
            src="/logo.png?v=nobg1"
            alt="Logo"
            style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 4 }}
          />
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.school}
          </div>
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {metadata.location}
          </div>
        </div>

        {/* Right: National Kingdom & Motto */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div className="font-moul" style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div className="font-moul" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <KhmerRoyalDivider />
        </div>
      </div>

      {/* Report Title */}
      <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 18 }}>
        <div className="font-moul" style={{ fontSize: 14.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
          របាយការណ៍
        </div>
        <div className="font-moul" style={{ fontSize: 13.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
          ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          {summaryModel.reportTitle}
        </div>
      </div>

      {/* Unified 5-Column Summary Table */}
      <table
        className="official-grid"
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: 12
        }}
      >
        <thead>
          <tr style={{ background: '#ffffff', textAlign: 'center', height: 28 }}>
            <th className="font-moul" style={{ border: '1px solid #000', width: '6%', padding: '3px 4px', fontSize: 12 }}>
              ល.រ
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '44%', padding: '3px 8px', fontSize: 12 }}>
              បរិយាយ
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '15%', padding: '3px 6px', fontSize: 12 }}>
              ចំនួន
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '19%', padding: '3px 6px', fontSize: 12 }}>
              ចំនួនថវិកា
            </th>
            <th className="font-moul" style={{ border: '1px solid #000', width: '16%', padding: '3px 6px', fontSize: 12 }}>
              ផ្សេងៗ
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Income Rows (1 & 2) */}
          {summaryModel.incomeRows.map((row, idx) => (
            <tr key={`inc-sum-${idx}`} style={{ height: 26 }}>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px' }}>{row.no}</td>
              <td style={{ border: '1px solid #000', textAlign: 'left', padding: '3px 8px' }}>{row.desc}</td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                {row.qty}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'right', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                {row.amountText}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px', fontSize: 11.5 }}>
                {row.note}
              </td>
            </tr>
          ))}

          {/* Subtotal Income Row */}
          <tr className="official-total" style={{ height: 27 }}>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '3px 8px',
                fontWeight: 600,
                fontSize: 12.5
              }}
            >
              {summaryModel.totalIncomeLabel}
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '3px 8px',
                fontSize: 12,
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ display: 'inline-block', borderBottom: '1px solid #000000', paddingBottom: 0.5 }}>
                {summaryModel.totalIncomeText}
              </span>
            </td>
            <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
          </tr>

          {/* Expense Rows (1 & 2) */}
          {summaryModel.expenseRows.map((row, idx) => (
            <tr key={`exp-sum-${idx}`} style={{ height: 26 }}>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px' }}>{row.no}</td>
              <td style={{ border: '1px solid #000', textAlign: 'left', padding: '3px 8px' }}>{row.desc}</td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                {row.qty}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'right', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                {row.amountText}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px', fontSize: 11.5 }}>
                {row.note}
              </td>
            </tr>
          ))}

          {/* Subtotal Expense Row */}
          <tr className="official-total" style={{ height: 27 }}>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '3px 8px',
                fontWeight: 600,
                fontSize: 12.5,
                color: isDeficit ? '#b91c1c' : '#000000'
              }}
            >
              {summaryModel.totalExpenseLabel}
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '3px 8px',
                fontSize: 12,
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
            <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
          </tr>

          {/* Final Net Balance Row (Double Underlined) */}
          <tr className="official-total" style={{ height: 29 }}>
            <td
              colSpan={3}
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'center',
                padding: '4px 8px',
                fontSize: 12.5,
                color: isDeficit ? '#b91c1c' : '#000000'
              }}
            >
              {summaryModel.balanceLabel}
            </td>
            <td
              className="font-moul"
              style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '4px 8px',
                fontSize: 12.5,
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
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
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
          marginTop: 28,
          fontSize: 12.5,
          lineHeight: 1.6
        }}
      >
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: '0 0 43%', maxWidth: '43%' }}>
          <div className="font-moul" style={{ fontSize: 12.5, marginBottom: 4, whiteSpace: 'nowrap' }}>
            បានឃើញ និង……………..
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>
            ថ្ងៃ………..…….ខែ………..….ឆ្នាំ{reportDates.zodiac || 'មមី'} {reportDates.sak || 'អដ្ឋស័ក'} ព.ស.{reportDates.beYear || '២៥៧០'}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃទី………. ខែ……….. ឆ្នាំ{reportDates.yearKhmer}</div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 8, paddingBottom: 24, whiteSpace: 'nowrap' }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter */}
        <div style={{ textAlign: 'center', flex: '0 0 55%', maxWidth: '55%' }}>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.lunarDateText}</div>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.solarDateTextFinance}</div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 8, paddingBottom: 24, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}

