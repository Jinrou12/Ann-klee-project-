import React from 'react';

/**
 * Official Cambodian Administrative Decorative Flourish Divider
 * Used under "ជាតិ សាសនា ព្រះមហាក្សត្រ" in official Kingdom documents
 */
export default function KhmerRoyalDivider({ width = 85, height = 10 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 1, marginBottom: 2 }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left line */}
        <line x1="2" y1="5" x2="38" y2="5" stroke="#000000" strokeWidth="0.7" />
        <circle cx="41" cy="5" r="0.9" fill="#000000" />

        {/* Delicate Center flourish */}
        <circle cx="50" cy="5" r="1.5" stroke="#000000" strokeWidth="0.7" fill="none" />
        <circle cx="50" cy="5" r="0.6" fill="#000000" />
        <path d="M44 5C45.5 3.5 47 3.5 48.5 5C47 6.5 45.5 6.5 44 5Z" stroke="#000000" strokeWidth="0.6" fill="none" />
        <path d="M56 5C54.5 3.5 53 3.5 51.5 5C53 6.5 54.5 6.5 56 5Z" stroke="#000000" strokeWidth="0.6" fill="none" />

        {/* Right line */}
        <circle cx="59" cy="5" r="0.9" fill="#000000" />
        <line x1="62" y1="5" x2="98" y2="5" stroke="#000000" strokeWidth="0.7" />
      </svg>
    </div>
  );
}
