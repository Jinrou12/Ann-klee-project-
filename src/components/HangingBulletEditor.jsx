import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * HangingBulletEditor: Renders each bullet item (❖ or -) with a true hanging indent
 * matching the A4 document layout so wrapped 2nd/3rd lines align cleanly under the text,
 * never flush-left under the bullet symbol.
 */
export default function HangingBulletEditor({ value = '', onChange, bullet = '-', rows = 5, maxHeight = 320 }) {
  const rowRefs = useRef([]);
  const [isFocused, setIsFocused] = useState(false);

  const items = useMemo(() => {
    const raw = String(value ?? '');
    if (!raw.trim()) return [''];
    return raw
      .split('\n')
      .map(line => line.replace(/^[-•❖▪◦]+\s*/, ''));
  }, [value]);

  const commitItems = (nextItems) => {
    const safeItems = nextItems.length > 0 ? nextItems : [''];
    const serialized = safeItems.map(line => `${bullet} ${line}`).join('\n');
    if (onChange) onChange(serialized);
  };

  useEffect(() => {
    rowRefs.current.forEach(el => {
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.max(23, el.scrollHeight)}px`;
      }
    });
  }, [items]);

  const focusRowAt = (targetIdx, cursorPos = null) => {
    requestAnimationFrame(() => {
      const el = rowRefs.current[targetIdx];
      if (el) {
        el.focus();
        const pos = cursorPos !== null ? cursorPos : el.value.length;
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          // ignore
        }
      }
    });
  };

  const handleRowChange = (idx, rawText, targetEl) => {
    if (targetEl) {
      targetEl.style.height = 'auto';
      targetEl.style.height = `${Math.max(23, targetEl.scrollHeight)}px`;
    }
    if (rawText.includes('\n')) {
      const pastedLines = rawText
        .split('\n')
        .map(l => l.replace(/^[-•❖▪◦]+\s*/, ''));
      const next = [...items];
      next.splice(idx, 1, ...pastedLines);
      commitItems(next);
      focusRowAt(idx + pastedLines.length - 1);
      return;
    }
    const next = [...items];
    next[idx] = rawText;
    commitItems(next);
  };

  const handleRowKeyDown = (e, idx) => {
    if (e.nativeEvent?.isComposing) return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const curText = items[idx] ?? '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const before = curText.slice(0, start);
      const after = curText.slice(end).replace(/^[-•❖▪◦]+\s*/, '');
      const next = [...items];
      next.splice(idx, 1, before, after);
      commitItems(next);
      focusRowAt(idx + 1, 0);
      return;
    }

    if (e.key === 'Backspace' && start === 0 && end === 0) {
      if (idx > 0) {
        e.preventDefault();
        const prevText = items[idx - 1] ?? '';
        const joinPos = prevText.length;
        const merged = prevText + curText;
        const next = [...items];
        next.splice(idx - 1, 2, merged);
        commitItems(next);
        focusRowAt(idx - 1, joinPos);
      } else if (idx === 0 && items.length > 1 && !curText.trim()) {
        e.preventDefault();
        const next = items.slice(1);
        commitItems(next);
        focusRowAt(0, 0);
      }
      return;
    }

    if (e.key === 'ArrowUp' && idx > 0 && start === 0) {
      e.preventDefault();
      focusRowAt(idx - 1);
      return;
    }

    if (e.key === 'ArrowDown' && idx < items.length - 1 && start === curText.length) {
      e.preventDefault();
      focusRowAt(idx + 1, 0);
    }
  };

  const minHeightPx = Math.max(115, rows * 25 + 16);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          focusRowAt(items.length - 1);
        }
      }}
      style={{
        width: '100%',
        minHeight: minHeightPx,
        maxHeight,
        overflowY: 'auto',
        padding: '8px 10px',
        borderRadius: 8,
        border: isFocused ? '1.5px solid #d97706' : '1px solid #cbd5e1',
        background: '#ffffff',
        boxSizing: 'border-box',
        cursor: 'text',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      {items.map((lineText, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            width: '100%'
          }}
        >
          <span
            style={{
              width: bullet === '❖' ? 16 : 12,
              flexShrink: 0,
              fontSize: 13,
              lineHeight: '23px',
              color: '#0f172a',
              userSelect: 'none'
            }}
          >
            {bullet}
          </span>
          <textarea
            ref={el => {
              rowRefs.current[idx] = el;
            }}
            rows={1}
            value={lineText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={e => handleRowChange(idx, e.target.value, e.currentTarget)}
            onKeyDown={e => handleRowKeyDown(e, idx)}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              fontSize: 13,
              lineHeight: '23px',
              color: '#0f172a',
              fontFamily: 'inherit',
              overflow: 'hidden'
            }}
          />
        </div>
      ))}
    </div>
  );
}

