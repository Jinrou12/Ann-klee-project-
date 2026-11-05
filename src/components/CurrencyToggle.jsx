import React from 'react';
import { normalizeCurrency, CURRENCY_KHR, CURRENCY_USD } from '../utils/khmerNumerals';

/**
 * Compact segmented currency switch [៛ | $] for a single finance line.
 * Self-contained inline styles (no global CSS classes touched).
 */
export default function CurrencyToggle({ value, onChange, size = 'sm', title = 'ប្ដូររូបិយប័ណ្ណ' }) {
  const current = normalizeCurrency(value);
  const isSmall = size === 'sm';
  const options = [
    { code: CURRENCY_KHR, label: '៛', activeBg: '#b45309' },
    { code: CURRENCY_USD, label: '$', activeBg: '#15803d' }
  ];

  return (
    <div
      role="group"
      title={title}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: 6,
        padding: 2,
        gap: 2
      }}
    >
      {options.map(opt => {
        const isActive = current === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { if (!isActive) onChange?.(opt.code); }}
            aria-pressed={isActive}
            style={{
              minWidth: isSmall ? 22 : 28,
              padding: isSmall ? '1px 5px' : '3px 8px',
              fontSize: isSmall ? 12 : 13,
              fontWeight: 800,
              lineHeight: 1.3,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? opt.activeBg : 'transparent',
              color: isActive ? '#ffffff' : '#64748b'
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

