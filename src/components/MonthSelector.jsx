import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { KHMER_SOLAR_MONTHS } from '../utils/khmerCalendar';
import { toKhmerDigits } from '../utils/khmerNumerals';

export default function MonthSelector({
  currentMonth,
  availableMonths,
  onSelectMonth,
  onAddNewMonth,
  useKhmerNumerals
}) {
  const activeYearFromMonth = (currentMonth || '2026-07').split('-')[0] || '2026';
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newYear, setNewYear] = useState(activeYearFromMonth);
  const [newMonthNum, setNewMonthNum] = useState('08');

  useEffect(() => {
    setNewYear(activeYearFromMonth);
  }, [activeYearFromMonth]);

  const formatMonthLabel = (mKey) => {
    // mKey is in format "YYYY-MM"
    const [, m] = mKey.split('-');
    const monthName = KHMER_SOLAR_MONTHS[parseInt(m, 10) - 1] || m;
    return `ខែ${monthName}`;
  };

  const handleCreateMonth = (e) => {
    e.preventDefault();
    const createdKey = `${newYear}-${newMonthNum}`;
    onAddNewMonth(createdKey);
    setShowAddMonth(false);
  };

  return (
    <div className="no-print" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '12px 16px',
      marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Month picker: [+] [ខែ ▾] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600, fontSize: 14 }}>
          <Calendar size={18} />
          <span>ខែប្រចាំការ៖</span>
        </div>

        {/* [+] Compact Add Month Button */}
        <button
          type="button"
          onClick={() => setShowAddMonth(!showAddMonth)}
          title="បង្កើតខែថ្មី"
          style={{
            background: showAddMonth ? '#b45309' : '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: showAddMonth ? '#ffffff' : '#334155',
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Plus size={16} />
        </button>

        {/* [ខែ ▾] Month Dropdown */}
        <select
          value={currentMonth}
          onChange={e => onSelectMonth(e.target.value)}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#0f172a',
            borderColor: '#cbd5e1',
            background: '#f8fafc',
            padding: '6px 14px',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          {availableMonths.map(mKey => (
            <option key={mKey} value={mKey}>
              {formatMonthLabel(mKey)}
            </option>
          ))}
        </select>
      </div>

      {/* New Month Popover Form */}
      {showAddMonth && (
        <form onSubmit={handleCreateMonth} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px dashed #e2e8f0',
          marginTop: 6
        }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>ជ្រើសរើសខែថ្មីក្នុងឆ្នាំ {useKhmerNumerals ? toKhmerDigits(newYear) : newYear}៖</span>
          <select
            value={newMonthNum}
            onChange={e => setNewMonthNum(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }}
          >
            {KHMER_SOLAR_MONTHS.map((mName, idx) => {
              const val = String(idx + 1).padStart(2, '0');
              return <option key={val} value={val}>{mName}</option>;
            })}
          </select>
          <button
            type="submit"
            style={{
              background: '#b45309',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            យល់ព្រម
          </button>
          <button
            type="button"
            onClick={() => setShowAddMonth(false)}
            style={{
              background: 'transparent',
              color: '#64748b',
              fontSize: 12
            }}
          >
            បោះបង់
          </button>
        </form>
      )}
    </div>
  );
}
