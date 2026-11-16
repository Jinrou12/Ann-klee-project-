import React, { useState, useEffect, useRef, Children, isValidElement } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * MobileCustomSelect:
 * Clean, compact white popover dropdown for Mobile views that replaces the large dark native OS <select> modal.
 * Supports `<option value="...">...</option>` children or an `options={[{ value, label }]}` array,
 * and passes a standard `{ target: { value } }` synthetic event to `onChange`.
 * When `mobileOnly` is true, renders a native `<select>` on PC screens (> 768px) to preserve PC isolation.
 */
export default function MobileCustomSelect({
  value,
  onChange,
  options,
  children,
  style = {},
  mobileOnly = false,
  disabled = false,
  title
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState({ alignRight: false, openUp: false, minW: 148 });
  const rootRef = useRef(null);

  const isDesktopViewport =
    mobileOnly && typeof window !== 'undefined' && window.innerWidth > 768;

  // Extract options from `options` prop or `<option>` children
  const parsedOptions = React.useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map(o => ({
        value: String(o.value ?? ''),
        label: o.label ?? String(o.value ?? '')
      }));
    }
    const list = [];
    Children.forEach(children, child => {
      if (!isValidElement(child)) return;
      if (child.type === 'option') {
        list.push({
          value: String(child.props.value ?? ''),
          label: child.props.children ?? String(child.props.value ?? '')
        });
      }
    });
    return list;
  }, [options, children]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (isDesktopViewport) {
    return (
      <select
        value={value}
        onChange={onChange}
        style={style}
        disabled={disabled}
        title={title}
      >
        {children}
      </select>
    );
  }

  const strValue = String(value ?? '');
  const selectedOption =
    parsedOptions.find(o => o.value === strValue) ||
    parsedOptions[0] || { value: strValue, label: strValue };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && rootRef.current && typeof window !== 'undefined') {
      const rect = rootRef.current.getBoundingClientRect();
      const vw = window.innerWidth || 360;
      const vh = window.innerHeight || 640;
      const alignRight = rect.left > vw * 0.45;
      const openUp = vh - rect.bottom < 210 && rect.top > 220;
      setPlacement({
        alignRight,
        openUp,
        minW: Math.max(148, Math.ceil(rect.width || 140))
      });
    }
    setIsOpen(prev => !prev);
  };

  const handleSelectOption = (nextVal) => {
    setIsOpen(false);
    if (typeof onChange === 'function') {
      onChange({
        target: { value: nextVal },
        currentTarget: { value: nextVal }
      });
    }
  };

  const {
    width,
    marginTop,
    flex,
    flexShrink,
    padding = '8px 10px',
    border = '1px solid #cbd5e1',
    borderRadius = 8,
    background = '#ffffff',
    color = '#334155',
    fontSize = 13,
    fontWeight = 600,
    ...restStyle
  } = style || {};

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        display: width === '100%' ? 'block' : 'inline-block',
        width: width || 'auto',
        marginTop: marginTop || 0,
        flex: flex,
        flexShrink: flexShrink ?? 0
      }}
    >
      <button
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={handleToggle}
        style={{
          ...restStyle,
          width: '100%',
          padding,
          borderRadius,
          border: isOpen ? '1.5px solid #d97706' : border,
          background: isOpen ? '#fffbeb' : background,
          color,
          fontSize,
          fontWeight,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          textAlign: 'left'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption.label}
        </span>
        <ChevronDown
          size={14}
          color="#64748b"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.16s ease'
          }}
        />
      </button>

      {isOpen && (
        <div
          className="month-popover-shell"
          style={{
            position: 'absolute',
            ...(placement.openUp
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            ...(placement.alignRight ? { right: 0 } : { left: 0 }),
            minWidth: placement.minW,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
            zIndex: 1300
          }}
        >
          <div
            role="listbox"
            className="month-popover-scroll"
            style={{
              maxHeight: 212,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              padding: '5px 6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            {parsedOptions.map(opt => {
              const isSelected = opt.value === strValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`month-popover-item${isSelected ? ' is-selected' : ''}`}
                  onClick={() => handleSelectOption(opt.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    minHeight: 36,
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '0 10px',
                    borderRadius: 9,
                    border: isSelected ? '1px solid #fcd34d' : '1px solid transparent',
                    background: isSelected
                      ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                      : 'transparent',
                    boxShadow: isSelected ? '0 1px 2px rgba(180, 83, 9, 0.08)' : 'none',
                    color: isSelected ? '#b45309' : '#0f172a',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isSelected ? '#d97706' : '#cbd5e1',
                        flexShrink: 0
                      }}
                    />
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Check size={12} strokeWidth={2.8} color="#b45309" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

