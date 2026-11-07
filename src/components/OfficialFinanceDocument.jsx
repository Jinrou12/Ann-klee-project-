import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import {
  toKhmerDigits,
  formatKhmerCurrency,
  formatMoney,
  sumByCurrency,
  combineCurrencyTotals,
  formatCurrencyTotals,
  formatExpenseTotals,
  isFinanceDeficit
} from '../utils/khmerNumerals';
import { getMonthEndReportDates } from '../utils/khmerCalendar';
import KhmerRoyalDivider from './KhmerRoyalDivider';
import CurrencyToggle from './CurrencyToggle';

/**
 * OfficialFinanceDocument: The canonical, authentic A4 Ministry replica for Income/Expense (PDF 1)
 * Used in FinanceTableView (interactive desktop) and FinanceMobileView (direct high-res PDF export).
 */
export default function OfficialFinanceDocument({
  id = 'printable-finance-document',
  financeData = { income: [], expense: [] },
  metadata = {},
  monthName = 'កក្កដា',
  yearDisplay = '២០២៦',
  useKhmerNumerals = true,
  monthKey = '2026-07',
  isEditable = false,
  editingId = null,
  setEditingId = () => { },
  handleCellChange = () => { },
  handleDeleteRow = () => { },
  customPeriodTitle = '',
  isDeficitOverride = null,
  categoryFilter = 'all'
}) {
  const incomeList = financeData?.income || [];
  const expenseList = financeData?.expense || [];
  const showIncomeTable = categoryFilter !== 'expense';
  const showExpenseTable = categoryFilter !== 'income';

  const incomeTotals = sumByCurrency(incomeList);
  const expenseTotals = sumByCurrency(expenseList);
  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const balanceTotals = combineCurrencyTotals(incomeTotals, expenseTotals, -1);
  const isDeficit = typeof isDeficitOverride === 'boolean'
    ? isDeficitOverride
    : isFinanceDeficit(balanceTotals, totalIncome - totalExpense);

  // Automatically calculate the last working day of the month (excluding Saturday/Sunday)
  const reportDates = useMemo(() => getMonthEndReportDates(monthKey, {
    watName: metadata.wat,
    customLunarTemplate: metadata.lunarDateHeader,
    useKhmerNumerals
  }), [monthKey, metadata.wat, metadata.lunarDateHeader, useKhmerNumerals]);

  return (
    <div id={id} className="printable-document">
      {/* Header Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
      }}>
        {/* Left: Ministry & School with Centered Logo on top */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.45 }}>
          <img
            src="/logo.png?v=nobg1"
            alt="Logo"
            style={{ width: 50, height: 50, objectFit: 'contain', marginBottom: 3 }}
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
        <div style={{ textAlign: 'center', lineHeight: 1.45 }}>
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
      <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 10 }}>
        <div className="font-moul" style={{ fontSize: 14.5, marginBottom: 2, whiteSpace: 'nowrap' }}>
          របាយការណ៍
        </div>
        <div className="font-moul" style={{ fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap' }}>
          ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
          {customPeriodTitle || `តារាងចំណូលចំណាយប្រចាំខែ${monthName} ឆ្នាំ${yearDisplay}`}
        </div>
      </div>

      {/* Table 1: ចំណូល (Income) */}
      {showIncomeTable && (
      <div style={{ marginBottom: showExpenseTable ? 12 : 4 }}>
        <div className="font-moul" style={{
          fontSize: 13.5,
          textAlign: 'center',
          marginBottom: 4,
          textDecoration: 'underline'
        }}>
          ចំណូល
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: 12.5
        }}>
          <thead>
            <tr style={{ background: '#ffffff', textAlign: 'center', height: 28 }}>
              <th style={{ border: '1px solid #000', width: '5%', padding: '4px 2px', fontWeight: 700 }}>ល.រ</th>
              <th style={{ border: '1px solid #000', width: '32%', padding: '4px 6px', fontWeight: 700 }}>បរិយាយ</th>
              <th style={{ border: '1px solid #000', width: '12%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
              <th style={{ border: '1px solid #000', width: '13%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
              <th style={{ border: '1px solid #000', width: '16%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
              <th style={{ border: '1px solid #000', width: '22%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ផ្សេងៗ</th>
              {isEditable && (
                <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 35, background: '#f8fafc' }}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {incomeList.map((item, index) => {
              const isItemEditing = isEditable && editingId === item.id;
              const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

              return (
                <tr key={item.id} style={{ height: 26 }}>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px' }}>{rowNum}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.desc}
                        onChange={e => handleCellChange('income', item.id, 'desc', e.target.value)}
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        {item.desc}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px', whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.qty}
                        onChange={e => handleCellChange('income', item.id, 'qty', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.qty}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.unitPrice}
                        onChange={e => handleCellChange('income', item.id, 'unitPrice', e.target.value)}
                        style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmerNumerals) : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={item.totalLabel && (!item.total || Number(item.total) === 0) ? item.totalLabel : item.total}
                          onChange={e => handleCellChange('income', item.id, 'total', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                        />
                        <CurrencyToggle
                          value={item.currency}
                          onChange={cur => handleCellChange('income', item.id, 'currency', cur)}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.totalLabel && (!item.total || Number(item.total) === 0)
                          ? (useKhmerNumerals ? toKhmerDigits(item.totalLabel) : item.totalLabel)
                          : formatMoney(item.total, item.currency, useKhmerNumerals)}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 6px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleCellChange('income', item.id, 'note', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 12 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{
                          cursor: isEditable ? 'pointer' : 'default',
                          fontSize: 11.5,
                          lineHeight: 1.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                      >
                        {item.note}
                      </div>
                    )}
                  </td>
                  {isEditable && (
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isItemEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: '#15803d', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                        >
                          រួច
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow('income', item.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Subtotal Income Row */}
            <tr style={{ height: 28, fontWeight: 700, background: '#fafafa' }}>
              <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                <span className="font-moul" style={{ fontSize: 12.5 }}>សរុបចំណូល</span>
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' }}>
                {formatCurrencyTotals(incomeTotals, useKhmerNumerals)}
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 6px', fontSize: 12 }}>
                {incomeList.some(it => it?.totalLabel)
                  ? incomeList.map(it => it.totalLabel).filter(Boolean).join(', ')
                  : ''}
              </td>
              {isEditable && <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>}
            </tr>
          </tbody>
        </table>
      </div>
      )}

      {/* Table 2: ចំណាយ (Expense) */}
      {showExpenseTable && (
      <div>
        <div className="font-moul" style={{
          fontSize: 13.5,
          textAlign: 'center',
          marginBottom: 4,
          textDecoration: 'underline'
        }}>
          ចំណាយ
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: 12.5
        }}>
          <thead>
            <tr style={{ background: '#ffffff', textAlign: 'center', height: 28 }}>
              <th style={{ border: '1px solid #000', width: '5%', padding: '4px 2px', fontWeight: 700 }}>ល.រ</th>
              <th style={{ border: '1px solid #000', width: '32%', padding: '4px 6px', fontWeight: 700 }}>បរិយាយ</th>
              <th style={{ border: '1px solid #000', width: '12%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
              <th style={{ border: '1px solid #000', width: '13%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
              <th style={{ border: '1px solid #000', width: '16%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
              <th style={{ border: '1px solid #000', width: '22%', padding: '4px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ផ្សេងៗ</th>
              {isEditable && (
                <th className="no-print" style={{ border: '1px solid #cbd5e1', width: 35, background: '#f8fafc' }}></th>
              )}
            </tr>
          </thead>
          <tbody>
            {expenseList.map((item, index) => {
              const isItemEditing = isEditable && editingId === item.id;
              const rowNum = useKhmerNumerals ? toKhmerDigits(index + 1) : (index + 1);

              return (
                <tr key={item.id} style={{ height: 26 }}>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px' }}>{rowNum}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.desc}
                        onChange={e => handleCellChange('expense', item.id, 'desc', e.target.value)}
                        style={{ width: '100%', fontSize: 12.5 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', lineHeight: 1.3 }}
                      >
                        {item.desc}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '3px 4px', whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.qty}
                        onChange={e => handleCellChange('expense', item.id, 'qty', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 12.5 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.qty}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.unitPrice}
                        onChange={e => handleCellChange('expense', item.id, 'unitPrice', e.target.value)}
                        style={{ width: '100%', textAlign: 'right', fontSize: 12.5 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.unitPrice ? formatMoney(item.unitPrice, item.currency, useKhmerNumerals) : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '3px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isItemEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={item.total}
                          onChange={e => handleCellChange('expense', item.id, 'total', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', fontSize: 12.5 }}
                        />
                        <CurrencyToggle
                          value={item.currency}
                          onChange={cur => handleCellChange('expense', item.id, 'currency', cur)}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{ cursor: isEditable ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                      >
                        {item.totalLabel && (!item.total || Number(item.total) === 0)
                          ? (useKhmerNumerals ? toKhmerDigits(item.totalLabel) : item.totalLabel)
                          : formatMoney(item.total, item.currency, useKhmerNumerals)}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '2px 5px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleCellChange('expense', item.id, 'note', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 12 }}
                      />
                    ) : (
                      <div
                        onClick={() => isEditable && setEditingId(item.id)}
                        style={{
                          cursor: isEditable ? 'pointer' : 'default',
                          fontSize: 11.5,
                          lineHeight: 1.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                      >
                        {item.note}
                      </div>
                    )}
                  </td>
                  {isEditable && (
                    <td className="no-print" style={{ border: '1px solid #cbd5e1', textAlign: 'center', padding: 2 }}>
                      {isItemEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: '#15803d', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
                        >
                          រួច
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRow('expense', item.id)}
                          style={{ background: 'transparent', color: '#ef4444', padding: 2 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Subtotal Expense Row */}
            <tr style={{ height: 28, fontWeight: 700, background: isDeficit ? '#fff8f8' : '#fafafa' }}>
              <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                <span className="font-moul" style={{ fontSize: 12.5, color: isDeficit ? '#b91c1c' : '#000000' }}>
                  សរុបចំណាយ
                </span>
              </td>
              <td style={{
                border: '1px solid #000',
                textAlign: 'right',
                padding: '4px 6px',
                color: isDeficit ? '#b91c1c' : '#000000',
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}>
                {formatExpenseTotals(expenseTotals, isDeficit, useKhmerNumerals)}
              </td>
              <td style={{ border: '1px solid #000' }}></td>
              {isEditable && <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>}
            </tr>
          </tbody>
        </table>
      </div>
      )}

      {/* Official Signatures Block (Exact match with PDF 1) */}
      <div
        className="signature-block"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginTop: 14,
          fontSize: 12,
          lineHeight: 1.5
        }}
      >
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: '0 0 43%', maxWidth: '43%' }}>
          <div className="font-moul" style={{ fontSize: 12.5, marginBottom: 3, whiteSpace: 'nowrap' }}>
            បានឃើញ និង……………..
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃ………..…….ខែ………..….ឆ្នាំ{reportDates.zodiac || 'មមី'} {reportDates.sak || 'អដ្ឋស័ក'} ព.ស.{reportDates.beYear || '២៥៧០'}</div>
          <div style={{ whiteSpace: 'nowrap' }}>ថ្ងៃទី………. ខែ……….. ឆ្នាំ{reportDates.yearKhmer}</div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 6, paddingBottom: 20, whiteSpace: 'nowrap' }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter (Automatically calculated last working day, excluding Sat/Sun) */}
        <div style={{ textAlign: 'center', flex: '0 0 55%', maxWidth: '55%' }}>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.lunarDateText}</div>
          <div style={{ whiteSpace: 'nowrap' }}>{reportDates.solarDateTextFinance}</div>
          <div className="font-moul" style={{ fontSize: 12.5, marginTop: 6, paddingBottom: 20, whiteSpace: 'nowrap' }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}
