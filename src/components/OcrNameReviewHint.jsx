import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Inline hint shown under the student-name field when the AI read handwriting
 * but the roster match was only medium-confidence (`leaveItem.needsReview`).
 * Shows what the AI literally read + one-tap official roster suggestions.
 * Used on both Mobile and PC (scoped inline styles only — no global CSS).
 */
export default function OcrNameReviewHint({ leaveItem, onPick, compact = false }) {
  if (!leaveItem?.needsReview) return null;
  const rawRead = String(leaveItem.initialOcrName || leaveItem.rawHandwrittenName || '').trim();
  const suggestions = Array.isArray(leaveItem.reviewSuggestions) ? leaveItem.reviewSuggestions : [];
  if (!rawRead && suggestions.length === 0) return null;

  return (
    <div
      data-ocr-name-review-hint
      style={{
        marginTop: 5,
        padding: compact ? '6px 8px' : '7px 10px',
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: 7,
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: '#92400e', fontWeight: 600, lineHeight: 1.45 }}>
        <AlertTriangle size={12} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          {leaveItem.name
            ? 'អក្សរដៃពិបាកអាន — សូមពិនិត្យឈ្មោះម្ដងទៀត'
            : 'AI អានអក្សរដៃបាន ប៉ុន្តែមិនទាន់ប្រាកដឈ្មោះ — សូមជ្រើសខាងក្រោម'}
          {rawRead && (
            <>
              {' '}(AI អានបាន៖ <strong style={{ color: '#78350f' }}>«{rawRead}»</strong>)
            </>
          )}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {suggestions.map(s => {
            const isSelected = leaveItem.name === s.name;
            return (
              <button
                key={`${s.name}-${s.grade}`}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onPick?.({ name: s.name, grade: s.grade })}
                style={{
                  fontSize: compact ? 11 : 12,
                  padding: '3px 9px',
                  borderRadius: 12,
                  background: isSelected ? '#b45309' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#9a3412',
                  border: isSelected ? '1px solid #b45309' : '1px solid #fdba74',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isSelected ? '✓ ' : ''}{s.name} ({s.grade === 'មត្តេយ្យ' ? 'ម' : s.grade})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

