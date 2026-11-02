import React from 'react';

/**
 * Official Cambodian Administrative Decorative Flourish Divider
 * Used under "ជាតិ សាសនា ព្រះមហាក្សត្រ" in official Kingdom documents
 */
export default function KhmerRoyalDivider({ width = 110, height = 12 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2, marginBottom: 2 }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 140 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left horizontal line with taper */}
        <line x1="5" y1="7" x2="48" y2="7" stroke="#111827" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="52" cy="7" r="1" fill="#111827" />

        {/* Center decorative motif */}
        <path
          d="M57 7C57 5.2 59 4 61.5 4C63.5 4 65 5 66 6C67 5 68.5 4 70.5 4C73 4 75 5.2 75 7C75 8.8 73 10 70.5 10C68.5 10 67 9 66 8C65 9 63.5 10 61.5 10C59 10 57 8.8 57 7Z"
          stroke="#111827"
          strokeWidth="0.9"
          fill="none"
        />
        <circle cx="66" cy="7" r="1.4" fill="#111827" />
        <circle cx="61.5" cy="7" r="0.8" fill="#111827" />
        <circle cx="70.5" cy="7" r="0.8" fill="#111827" />
        <path d="M55 7L56.5 5.5L58 7L56.5 8.5Z" fill="#111827" />
        <path d="M74 7L75.5 5.5L77 7L75.5 8.5Z" fill="#111827" />

        {/* Right horizontal line with taper */}
        <circle cx="88" cy="7" r="1" fill="#111827" />
        <line x1="92" y1="7" x2="135" y2="7" stroke="#111827" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
