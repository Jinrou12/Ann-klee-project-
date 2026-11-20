import React from 'react';

/**
 * ReportEditableZone:
 * Zero-layout-shift clickable overlay for A4 documents & Mobile Cards.
 * - When `editMode` is false (View Mode or PDF export): returns children untouched (0 extra DOM nodes).
 * - When `editMode` is true: wraps children in a clickable dashed-outline zone with a floating `✏️ {label}` badge.
 */
export default function ReportEditableZone({
  editMode = false,
  sectionId,
  label = 'កែប្រែ',
  activeSectionId = null,
  onSelectSection = null,
  style = null,
  children
}) {
  if (!editMode || !sectionId) {
    return <>{children}</>;
  }

  const isActive = activeSectionId === sectionId;

  return (
    <div
      className="report-edit-zone"
      data-edit-section={sectionId}
      data-active={isActive ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      title={`ចុចដើម្បីកែ៖ ${label}`}
      style={style || undefined}
      onClick={e => {
        e.stopPropagation();
        if (onSelectSection) onSelectSection(sectionId);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (onSelectSection) onSelectSection(sectionId);
        }
      }}
    >
      <span className="report-edit-zone-badge no-print" aria-hidden="true">
        ✎ {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Group consecutive flow blocks sharing the same `editSectionId` on a single rendered A4 page
 * into one cohesive clickable `<ReportEditableZone>` (0px height/margin impact).
 * When `!editMode`, returns raw `b.node` elements directly.
 */
export function renderBlocksWithEditZones(
  items = [],
  { editMode = false, activeSectionId = null, onSelectSection = null, sectionLabels = {} } = {}
) {
  if (!editMode) {
    return items.map(b => b.node);
  }

  const groups = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sid = item.editSectionId || null;
    const prev = groups[groups.length - 1];
    if (prev && sid && prev.sectionId === sid) {
      prev.items.push(item);
    } else {
      groups.push({
        key: `${sid || 'raw'}-${item.id || i}-${i}`,
        sectionId: sid,
        items: [item]
      });
    }
  }

  return groups.map(grp => {
    if (!grp.sectionId) {
      return <React.Fragment key={grp.key}>{grp.items.map(it => it.node)}</React.Fragment>;
    }
    const label = sectionLabels[grp.sectionId] || 'កែប្រែ';
    return (
      <ReportEditableZone
        key={grp.key}
        editMode
        sectionId={grp.sectionId}
        label={label}
        activeSectionId={activeSectionId}
        onSelectSection={onSelectSection}
      >
        {grp.items.map(it => it.node)}
      </ReportEditableZone>
    );
  });
}

