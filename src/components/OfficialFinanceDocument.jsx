import React from 'react';
import { Trash2 } from 'lucide-react';
import { toKhmerDigits, formatKhmerCurrency } from '../utils/khmerNumerals';
import KhmerRoyalDivider from './KhmerRoyalDivider';

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
  isEditable = false,
  editingId = null,
  setEditingId = () => {},
  handleCellChange = () => {},
  handleDeleteRow = () => {}
}) {
  const incomeList = financeData?.income || [];
  const expenseList = financeData?.expense || [];

  const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalExpense = expenseList.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  return (
    <div id={id} className="printable-document">
      {/* Header Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
      }}>
        {/* Left: Ministry & School with Centered Logo on top */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.5 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: 55, height: 55, objectFit: 'contain', marginBottom: 4 }}
          />
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center' }}>
            {metadata.ministry}
          </div>
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center' }}>
            {metadata.school}
          </div>
          <div className="font-moul" style={{ fontSize: 12, textAlign: 'center' }}>
            {metadata.location}
          </div>
        </div>

        {/* Right: National Kingdom & Motto */}
        <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
          <div className="font-moul" style={{ fontSize: 13.5 }}>
            ព្រះរាជាណាចក្រកម្ពុជា
          </div>
          <div className="font-moul" style={{ fontSize: 13 }}>
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <KhmerRoyalDivider />
        </div>
      </div>

      {/* Report Title */}
      <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 16 }}>
        <div className="font-moul" style={{ fontSize: 15, marginBottom: 4 }}>
          របាយការណ៍
        </div>
        <div className="font-moul" style={{ fontSize: 13.5, marginBottom: 4 }}>
          ស្ដីពី
        </div>
        <div className="font-moul" style={{ fontSize: 14.5 }}>
          តារាងចំណូលចំណាយប្រចាំខែ{monthName} ឆ្នាំ{yearDisplay}
        </div>
      </div>

      {/* Table 1: ចំណូល (Income) */}
      <div style={{ marginBottom: 20 }}>
        <div className="font-moul" style={{
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 6,
          textDecoration: 'underline'
        }}>
          ចំណូល
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: 13
        }}>
          <thead>
            <tr style={{ background: '#ffffff', textAlign: 'center', height: 34 }}>
              <th style={{ border: '1px solid #000', width: '5%', padding: '6px 2px', fontWeight: 700 }}>ល.រ</th>
              <th style={{ border: '1px solid #000', width: '38%', padding: '6px 8px', fontWeight: 700 }}>បរិយាយ</th>
              <th style={{ border: '1px solid #000', width: '16%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
              <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
              <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
              <th style={{ border: '1px solid #000', width: '7%', padding: '6px 2px', fontWeight: 700 }}>ផ្សេងៗ</th>
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
                <tr key={item.id} style={{ height: 30 }}>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>{rowNum}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
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
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px' }}>
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
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        {item.unitPrice ? formatKhmerCurrency(item.unitPrice, useKhmerNumerals) : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.total}
                        onChange={e => handleCellChange('income', item.id, 'total', e.target.value)}
                        style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                      />
                    ) : (
                      <div 
                        onClick={() => isEditable && setEditingId(item.id)} 
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        {formatKhmerCurrency(item.total, useKhmerNumerals)}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleCellChange('income', item.id, 'note', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                      />
                    ) : (
                      <div 
                        onClick={() => isEditable && setEditingId(item.id)} 
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
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
            <tr style={{ height: 32, fontWeight: 700, background: '#fafafa' }}>
              <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>
                <span className="font-moul" style={{ fontSize: 13 }}>សរុបចំណូល</span>
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 8px' }}>
                {formatKhmerCurrency(totalIncome, useKhmerNumerals)}
              </td>
              <td style={{ border: '1px solid #000' }}></td>
              {isEditable && <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Table 2: ចំណាយ (Expense) */}
      <div>
        <div className="font-moul" style={{
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 6,
          textDecoration: 'underline'
        }}>
          ចំណាយ
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: 13
        }}>
          <thead>
            <tr style={{ background: '#ffffff', textAlign: 'center', height: 34 }}>
              <th style={{ border: '1px solid #000', width: '5%', padding: '6px 2px', fontWeight: 700 }}>ល.រ</th>
              <th style={{ border: '1px solid #000', width: '38%', padding: '6px 8px', fontWeight: 700 }}>បរិយាយ</th>
              <th style={{ border: '1px solid #000', width: '16%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>ចំនួន</th>
              <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃរាយ</th>
              <th style={{ border: '1px solid #000', width: '17%', padding: '6px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}>តម្លៃសរុប</th>
              <th style={{ border: '1px solid #000', width: '7%', padding: '6px 2px', fontWeight: 700 }}>ផ្សេងៗ</th>
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
                <tr key={item.id} style={{ height: 30 }}>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>{rowNum}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 8px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.desc}
                        onChange={e => handleCellChange('expense', item.id, 'desc', e.target.value)}
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
                        onChange={e => handleCellChange('expense', item.id, 'qty', e.target.value)}
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
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.unitPrice}
                        onChange={e => handleCellChange('expense', item.id, 'unitPrice', e.target.value)}
                        style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                      />
                    ) : (
                      <div 
                        onClick={() => isEditable && setEditingId(item.id)} 
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        {item.unitPrice ? formatKhmerCurrency(item.unitPrice, useKhmerNumerals) : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.total}
                        onChange={e => handleCellChange('expense', item.id, 'total', e.target.value)}
                        style={{ width: '100%', textAlign: 'right', fontSize: 13 }}
                      />
                    ) : (
                      <div 
                        onClick={() => isEditable && setEditingId(item.id)} 
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
                        {formatKhmerCurrency(item.total, useKhmerNumerals)}
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px' }}>
                    {isItemEditing ? (
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleCellChange('expense', item.id, 'note', e.target.value)}
                        style={{ width: '100%', textAlign: 'center', fontSize: 13 }}
                      />
                    ) : (
                      <div 
                        onClick={() => isEditable && setEditingId(item.id)} 
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
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
            <tr style={{ height: 32, fontWeight: 700, background: '#fafafa' }}>
              <td colSpan={4} style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>
                <span className="font-moul" style={{ fontSize: 13 }}>សរុបចំណាយ</span>
              </td>
              <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 8px' }}>
                {formatKhmerCurrency(totalExpense, useKhmerNumerals)}
              </td>
              <td style={{ border: '1px solid #000' }}></td>
              {isEditable && <td className="no-print" style={{ border: '1px solid #cbd5e1' }}></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official Signatures Block (Exact match with PDF 1) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 24,
        fontSize: 13,
        lineHeight: 1.6
      }}>
        {/* Left Signature: School Director */}
        <div style={{ textAlign: 'center', flex: 1, maxWidth: '48%' }}>
          <div className="font-moul" style={{ fontSize: 13, marginBottom: 4 }}>
            បានឃើញ និង……………..
          </div>
          <div>ថ្ងៃ………..…….ខែ………..….ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០</div>
          <div>ថ្ងៃទី………. ខែ……….. ឆ្នាំ២០២៦</div>
          <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45 }}>
            {(!metadata.directorTitle || metadata.directorTitle === 'ព្រះចៅអធិការ' || metadata.directorTitle === 'ព្រះនាយក')
              ? 'នាយកសាលា'
              : metadata.directorTitle}
          </div>
        </div>

        {/* Right Signature: Reporter */}
        <div style={{ textAlign: 'center', flex: 1, maxWidth: '48%' }}>
          <div>ថ្ងៃសុក្រ២រោច ខែទុតិយាសាឍ ឆ្នាំមមីអដ្ឋស័ក ព.ស.២៥៧០</div>
          <div>{metadata.wat || 'វត្តខេមវ័ន'} ថ្ងៃទី៣១ ខែកក្កដា ឆ្នាំ២០២៦</div>
          <div className="font-moul" style={{ fontSize: 13, marginTop: 8, paddingBottom: 45 }}>
            {metadata.reporterTitle || 'អ្នកធ្វើរបាយការណ៍'}
          </div>
        </div>
      </div>
    </div>
  );
}
