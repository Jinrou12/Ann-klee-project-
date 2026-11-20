import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  KHMER_SIEMREAP_FONT,
  KHMER_MOUL_FONT,
  buildMuolHighlightRuns,
  layoutJustifiedLines,
  subscribeKhmerFontReady,
  getKhmerFontVersion,
  normalizeKhmerSpaces
} from '../utils/khmerJustifyEngine';

/**
 * Render an atomic Khmer token's pieces (normal / bold / moul).
 * Every piece stays unbroken on one line so html2canvas renders intact Khmer subscripts (ជើងអក្សរ).
 */
function renderTokenPieces(pieces, moulFontFamily) {
  if (pieces.length === 1) {
    const p = pieces[0];
    if (p.type === 'moul') {
      return <span style={{ fontFamily: moulFontFamily, fontWeight: 400 }}>{p.text}</span>;
    }
    if (p.type === 'bold') {
      return <strong style={{ fontWeight: 700 }}>{p.text}</strong>;
    }
    return p.text;
  }

  return pieces.map((p, idx) => {
    if (p.type === 'moul') {
      return (
        <span key={idx} style={{ fontFamily: moulFontFamily, fontWeight: 400 }}>
          {p.text}
        </span>
      );
    }
    if (p.type === 'bold') {
      return (
        <strong key={idx} style={{ fontWeight: 700 }}>
          {p.text}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{p.text}</React.Fragment>;
  });
}

/**
 * KhmerJustifiedText:
 * Renders razor-straight left & right edges (Microsoft Word-grade Khmer justification)
 * on BOTH Screen Preview (PC & Mobile /mp) AND html2canvas PDF export — with ZERO giant rivers
 * and ZERO detached Khmer subscripts (ជើងអក្សរ).
 *
 * Props:
 * - text: plain Khmer string (used when `runs` is not provided)
 * - boldPhrases: optional array of phrases to bold (plus automatic Muol Light for monastic titles when `highlightMonasticTitles` is true)
 * - highlightMonasticTitles: boolean (default false)
 * - runs: optional pre-built array of `{ text, type: 'normal'|'bold'|'moul', noBreak? }`
 * - maxWidthPx: exact content width in px (preferred for A4 sheets & measurement probe); if omitted, auto-measures container via ResizeObserver
 * - firstLineIndent: px indent for line 0 (replaces CSS textIndent)
 * - fontSize: px number (default 15.2)
 * - lineHeight: number (default 1.78)
 * - fontFamily: body font family
 * - moulFontFamily: monastic title font family
 * - style: extra outer container styles (margins, padding, color, etc.)
 */
export default function KhmerJustifiedText({
  text = '',
  boldPhrases = null,
  highlightMonasticTitles = false,
  firstParagraphPrefixBold = '',
  indentFirstParagraphOnly = false,
  runs = null,
  maxWidthPx = null,
  firstLineIndent = 0,
  fontSize = 15.2,
  lineHeight = 1.78,
  fontFamily = KHMER_SIEMREAP_FONT,
  moulFontFamily = KHMER_MOUL_FONT,
  style = null,
  className = ''
}) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(() =>
    typeof maxWidthPx === 'number' && maxWidthPx > 0 ? maxWidthPx : 0
  );
  const [fontVersion, setFontVersion] = useState(() => getKhmerFontVersion());

  useEffect(() => subscribeKhmerFontReady(setFontVersion), []);

  // Auto-measure container width only when fixed maxWidthPx is not provided (e.g. fluid mobile cards)
  useLayoutEffect(() => {
    if (typeof maxWidthPx === 'number' && maxWidthPx > 0) {
      return undefined;
    }
    const el = containerRef.current;
    if (!el) return undefined;

    const updateW = () => {
      const w = el.clientWidth;
      if (w > 40) {
        setMeasuredWidth(prev => (Math.abs(prev - w) > 1 ? w : prev));
      }
    };
    updateW();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateW);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateW);
    return () => window.removeEventListener('resize', updateW);
  }, [maxWidthPx]);

  const effectiveWidth =
    typeof maxWidthPx === 'number' && maxWidthPx > 0 ? maxWidthPx : measuredWidth;

  // Support explicit Enter (\n) line breaks: each non-empty line becomes its own justified paragraph
  // (last visual line before Enter stays left-aligned, and empty lines become real vertical line spacers).
  const paragraphEntries = useMemo(() => {
    if (Array.isArray(runs) && runs.length > 0) {
      return [{ isBlank: false, runs }];
    }
    const rawText = String(text ?? '').replace(/\u200B/g, '');
    if (!rawText.trim()) return [];
    const prefixClean = normalizeKhmerSpaces(firstParagraphPrefixBold);
    const rawLines = rawText.trim().split(/\r?\n/);
    let appliedPrefix = false;
    return rawLines.map(rawLine => {
      let cleanLine = normalizeKhmerSpaces(rawLine);
      if (!cleanLine) {
        return { isBlank: true, runs: [] };
      }
      let prependPrefixRuns = [];
      if (prefixClean && !appliedPrefix) {
        appliedPrefix = true;
        if (cleanLine.startsWith(prefixClean)) {
          cleanLine = cleanLine.slice(prefixClean.length).trim();
        }
        prependPrefixRuns = [
          { text: prefixClean, type: 'bold', noBreak: true, noStretchAfter: true },
          ...(cleanLine ? [{ text: ' ', type: 'normal', noBreak: false }] : [])
        ];
      }
      const lineRuns = !cleanLine
        ? []
        : highlightMonasticTitles || (Array.isArray(boldPhrases) && boldPhrases.length > 0)
          ? buildMuolHighlightRuns(cleanLine, boldPhrases || [])
          : [{ text: cleanLine, type: 'normal', noBreak: false }];
      return { isBlank: false, runs: [...prependPrefixRuns, ...lineRuns] };
    });
  }, [runs, text, boldPhrases, highlightMonasticTitles, firstParagraphPrefixBold]);

  const layoutBlocks = useMemo(() => {
    if (!paragraphEntries.length || !effectiveWidth || effectiveWidth < 60 || fontVersion < 0) {
      return [];
    }
    let seenNonBlank = false;
    return paragraphEntries.map(entry => {
      if (entry.isBlank) {
        return { isBlank: true, lines: [], spaceW: 4, blockIndent: 0 };
      }
      const blockIndent = indentFirstParagraphOnly && seenNonBlank ? 0 : firstLineIndent;
      seenNonBlank = true;
      const res = layoutJustifiedLines({
        runs: entry.runs,
        maxWidthPx: effectiveWidth,
        firstLineIndent: blockIndent,
        fontSize,
        fontFamily,
        moulFontFamily
      });
      return { isBlank: false, lines: res.lines, spaceW: res.spaceW, blockIndent };
    });
  }, [
    paragraphEntries,
    effectiveWidth,
    firstLineIndent,
    indentFirstParagraphOnly,
    fontSize,
    fontFamily,
    moulFontFamily,
    fontVersion
  ]);

  const outerStyle = {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily,
    fontSize,
    lineHeight,
    wordSpacing: 'normal',
    letterSpacing: 0,
    ...style
  };

  const blankLineHeightPx = Math.round(fontSize * lineHeight);

  // Fallback before fluid ResizeObserver completes on frame 0
  if (!layoutBlocks.length) {
    return (
      <div
        ref={containerRef}
        className={className || undefined}
        style={{
          ...outerStyle,
          textAlign: 'left'
        }}
      >
        {paragraphEntries.map((entry, pIdx) =>
          entry.isBlank ? (
            <div key={pIdx} aria-hidden="true" style={{ height: blankLineHeightPx }} />
          ) : (
            <div key={pIdx} style={{ textIndent: firstLineIndent || undefined }}>
              {entry.runs.map((r, i) => {
                if (r.type === 'moul') {
                  return (
                    <span key={i} style={{ fontFamily: moulFontFamily, fontWeight: 400, whiteSpace: 'nowrap' }}>
                      {r.text}
                    </span>
                  );
                }
                if (r.type === 'bold') {
                  return (
                    <strong key={i} style={{ fontWeight: 700 }}>
                      {r.text}
                    </strong>
                  );
                }
                return <React.Fragment key={i}>{r.text}</React.Fragment>;
              })}
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className || undefined} style={outerStyle}>
      {layoutBlocks.map((block, pIdx) => {
        if (block.isBlank) {
          return <div key={`blank-${pIdx}`} aria-hidden="true" style={{ height: blankLineHeightPx }} />;
        }

        return (
          <React.Fragment key={`para-${pIdx}`}>
            {block.lines.map((line, lineIdx) => {
              const leftIndent = line.isFirst && block.blockIndent > 0 ? block.blockIndent : 0;

              // Non-last lines with >= 2 tokens: weighted flex spacers snap both left & right edges cleanly
              if (line.shouldJustify) {
                return (
                  <div
                    key={`${pIdx}-${lineIdx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      width: '100%',
                      paddingLeft: leftIndent || undefined,
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {line.tokens.map((tok, tIdx) => {
                      const prevLocked = tIdx > 0 && Boolean(line.tokens[tIdx - 1]?.noStretchAfter);
                      return (
                        <React.Fragment key={tIdx}>
                          {tIdx > 0 && (
                            <span
                              aria-hidden="true"
                              style={{
                                display: 'inline-block',
                                flexGrow: prevLocked ? 0 : (tok.spaceBefore ? line.spaceWeight : 1),
                                flexShrink: 0,
                                flexBasis: tok.spaceBefore ? block.spaceW : 0,
                                minWidth: tok.spaceBefore ? block.spaceW : 0
                              }}
                            />
                          )}
                          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {renderTokenPieces(tok.pieces, moulFontFamily)}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              }

              // Last line (or single-token line): natural left-aligned text preserving exact original spaces
              const isSingleWideToken = line.tokens.length === 1;
              return (
                <div
                  key={`${pIdx}-${lineIdx}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    paddingLeft: leftIndent || undefined,
                    boxSizing: 'border-box',
                    textAlign: 'left',
                    wordBreak: isSingleWideToken ? 'break-word' : 'normal'
                  }}
                >
                  {line.tokens.map((tok, tIdx) => (
                    <React.Fragment key={tIdx}>
                      {tIdx > 0 && tok.spaceBefore ? ' ' : null}
                      {renderTokenPieces(tok.pieces, moulFontFamily)}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

