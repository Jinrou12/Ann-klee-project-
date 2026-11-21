import React, { useRef } from 'react';

/**
 * Resolve which (group, targetId) a zone matches for the active drag source.
 * Supports exact group match AND smart fallback when dragging a top-level Roman section over a child sub-section.
 */
function resolveMatchingDropTarget(dragState, dragGroup, dragId, fallbackTopId) {
  if (!dragState || !dragState.group || !dragState.fromId) return null;
  if (dragGroup && dragId && dragState.group === dragGroup) {
    return { group: dragGroup, targetId: dragId };
  }
  if (fallbackTopId && dragState.group === 'top') {
    return { group: 'top', targetId: fallbackTopId };
  }
  return null;
}

/**
 * Find the matching drop target element underneath a touch coordinate (x, y) for Mobile Touch Drag & Drop.
 */
export function findTouchDropTargetAtPoint(clientX, clientY, activeGroup) {
  if (typeof document === 'undefined' || !activeGroup) return null;
  const stack = document.elementsFromPoint ? document.elementsFromPoint(clientX, clientY) : [];
  for (const el of stack) {
    if (!el || !el.closest) continue;
    const direct = el.closest(`[data-drag-group="${activeGroup}"][data-drag-id]`);
    if (direct) {
      const id = direct.getAttribute('data-drag-id');
      if (id) return { group: activeGroup, targetId: id };
    }
    if (activeGroup === 'top') {
      const fb = el.closest('[data-fallback-top-id]');
      if (fb) {
        const id = fb.getAttribute('data-fallback-top-id');
        if (id) return { group: 'top', targetId: id };
      }
    }
  }
  return null;
}

/**
 * ReportEditableZone:
 * Zero-layout-shift clickable & draggable overlay for A4 documents & Mobile Cards.
 * - When `editMode` is false (View Mode or PDF export): returns children untouched (0 extra DOM nodes).
 * - When `editMode` is true: wraps children in a clickable dashed-outline zone with a floating badge.
 * - When `dragGroup` + `dragId` + `dragController` are supplied: supports native HTML5 Drag & Drop (PC)
 *   AND long-press Touch Drag & Drop (Mobile) with ZERO extra buttons.
 */
export default function ReportEditableZone({
  editMode = false,
  sectionId,
  label = 'កែប្រែ',
  activeSectionId = null,
  onSelectSection = null,
  dragGroup = null,
  dragId = null,
  fallbackTopId = null,
  dragController = null,
  isMobile = false,
  style = null,
  children
}) {
  const touchTimerRef = useRef(null);
  const touchOriginRef = useRef(null);
  const touchDraggingRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  if (!editMode || !sectionId) {
    return <>{children}</>;
  }

  const isActive = activeSectionId === sectionId;
  const canDrag = Boolean(dragController && dragGroup && dragId);
  const dragState = dragController?.dragState || null;
  const isDraggingSelf = Boolean(
    canDrag && dragState && dragState.group === dragGroup && dragState.fromId === dragId
  );
  const matchedTarget = resolveMatchingDropTarget(dragState, dragGroup, dragId, fallbackTopId);
  const isDragOverTarget = Boolean(
    matchedTarget &&
      dragState &&
      dragState.overId === matchedTarget.targetId &&
      dragState.fromId !== matchedTarget.targetId
  );

  const clearTouchTimer = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchStart = (e) => {
    if (!isMobile || !canDrag || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchOriginRef.current = { x: t.clientX, y: t.clientY };
    touchDraggingRef.current = false;
    clearTouchTimer();
    touchTimerRef.current = setTimeout(() => {
      touchDraggingRef.current = true;
      suppressNextClickRef.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(25);
      }
      dragController.onStart(dragGroup, dragId);
    }, 300);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !canDrag || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (!touchDraggingRef.current) {
      const orig = touchOriginRef.current;
      if (orig && (Math.abs(t.clientX - orig.x) > 10 || Math.abs(t.clientY - orig.y) > 10)) {
        clearTouchTimer();
      }
      return;
    }
    e.preventDefault();
    const hit = findTouchDropTargetAtPoint(t.clientX, t.clientY, dragGroup);
    dragController.onOver(dragGroup, hit ? hit.targetId : null);
  };

  const handleTouchEnd = (e) => {
    clearTouchTimer();
    if (!touchDraggingRef.current) return;
    touchDraggingRef.current = false;
    const t = e.changedTouches && e.changedTouches[0];
    const hit = t ? findTouchDropTargetAtPoint(t.clientX, t.clientY, dragGroup) : null;
    if (hit && hit.targetId && hit.targetId !== dragId) {
      dragController.onDrop(dragGroup, dragId, hit.targetId);
    } else {
      dragController.onEnd();
    }
    setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 80);
  };

  const handleTouchCancel = () => {
    clearTouchTimer();
    if (touchDraggingRef.current) {
      touchDraggingRef.current = false;
      dragController?.onEnd();
    }
  };

  const badgeText = isDragOverTarget
    ? `⬇ ទម្លាក់ត្រង់៖ ${label}`
    : canDrag
      ? `⋮⋮ ✎ ${label}`
      : `✎ ${label}`;

  return (
    <div
      className="report-edit-zone"
      data-edit-section={sectionId}
      data-active={isActive ? 'true' : 'false'}
      data-draggable={canDrag ? 'true' : 'false'}
      data-dragging={isDraggingSelf ? 'true' : 'false'}
      data-drag-over={isDragOverTarget ? 'true' : 'false'}
      data-drag-group={dragGroup || undefined}
      data-drag-id={dragId || undefined}
      data-fallback-top-id={fallbackTopId || undefined}
      draggable={canDrag && !isMobile}
      role="button"
      tabIndex={0}
      title={canDrag ? `ចុចដើម្បីកែ ឬអូសទាញប្ដូរទីតាំង៖ ${label}` : `ចុចដើម្បីកែ៖ ${label}`}
      style={style || undefined}
      onDragStart={e => {
        if (!canDrag || isMobile) return;
        e.stopPropagation();
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({ group: dragGroup, fromId: dragId }));
        } catch {
          // Ignore browsers disallowing custom drag data
        }
        dragController.onStart(dragGroup, dragId);
      }}
      onDragOver={e => {
        if (!dragController || !matchedTarget) return;
        if (dragState?.fromId === matchedTarget.targetId) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        if (dragState?.overId !== matchedTarget.targetId) {
          dragController.onOver(matchedTarget.group, matchedTarget.targetId);
        }
      }}
      onDrop={e => {
        if (!dragController || !matchedTarget) return;
        e.preventDefault();
        e.stopPropagation();
        if (dragState?.fromId && dragState.fromId !== matchedTarget.targetId) {
          dragController.onDrop(matchedTarget.group, dragState.fromId, matchedTarget.targetId);
        } else {
          dragController.onEnd();
        }
      }}
      onDragEnd={e => {
        if (!canDrag) return;
        e.stopPropagation();
        dragController.onEnd();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={e => {
        e.stopPropagation();
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          return;
        }
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
        {badgeText}
      </span>
      {children}
    </div>
  );
}

/**
 * Group consecutive flow blocks sharing the same `editSectionId` + `dragGroup` + `dragId`
 * on a single rendered A4 page into one cohesive clickable/draggable `<ReportEditableZone>` (0px height/margin impact).
 * When `!editMode`, returns raw `b.node` elements directly.
 */
export function renderBlocksWithEditZones(
  items = [],
  {
    editMode = false,
    activeSectionId = null,
    onSelectSection = null,
    sectionLabels = {},
    dragController = null,
    isMobile = false
  } = {}
) {
  if (!editMode) {
    return items.map(b => b.node);
  }

  const groups = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sid = item.editSectionId || null;
    const dg = item.dragGroup || null;
    const di = item.dragId || null;
    const fb = item.fallbackTopId || null;
    const zoneLabel = item.zoneLabel || null;
    const prev = groups[groups.length - 1];
    if (
      prev &&
      sid &&
      prev.sectionId === sid &&
      prev.dragGroup === dg &&
      prev.dragId === di &&
      prev.fallbackTopId === fb
    ) {
      prev.items.push(item);
    } else {
      groups.push({
        key: `${sid || 'raw'}-${dg || 'x'}-${di || 'x'}-${item.id || i}-${i}`,
        sectionId: sid,
        dragGroup: dg,
        dragId: di,
        fallbackTopId: fb,
        zoneLabel,
        items: [item]
      });
    }
  }

  return groups.map(grp => {
    if (!grp.sectionId) {
      return <React.Fragment key={grp.key}>{grp.items.map(it => it.node)}</React.Fragment>;
    }
    const label = grp.zoneLabel || sectionLabels[grp.sectionId] || 'កែប្រែ';
    return (
      <ReportEditableZone
        key={grp.key}
        editMode
        sectionId={grp.sectionId}
        label={label}
        activeSectionId={activeSectionId}
        onSelectSection={onSelectSection}
        dragGroup={grp.dragGroup}
        dragId={grp.dragId}
        fallbackTopId={grp.fallbackTopId}
        dragController={dragController}
        isMobile={isMobile}
      >
        {grp.items.map(it => it.node)}
      </ReportEditableZone>
    );
  });
}

