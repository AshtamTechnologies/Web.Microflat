import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { IconChevronLeft, IconChevronRight } from '../../../constants/icons';
import KanbanColumn from './KanbanColumn';

/**
 * KanbanBoard — Reusable multi-column Drag-and-Drop Kanban container.
 *
 * Supports:
 * - Pinned on-screen viewport height with permanently visible scrollbar (Option 2)
 * - Floating left & right smooth navigation arrows (Option 1)
 * - Auto-scroll on drag (edge scrolling when card is near container edges) (Option 3)
 */
export default function KanbanBoard({
  columns = [],
  items = [],
  getItemId = (item) => item.id || item.InquiryId,
  getItemStatus = (item) => item.StatusId || item.status,
  onItemMove,
  renderCard,
  renderColumnHeader,
  renderColumnFooter,
  emptyColumnText = 'No items in this stage',
  className = '',
  columnWidth = 'w-76 min-w-[290px] max-w-[310px]',
  boardHeightClass = 'h-[calc(100vh-230px)] min-h-[520px]',
}) {
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef(null);
  const edgeScrollRef = useRef(null);

  // Group items by column ID
  const columnItemsMap = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });

    items.forEach((item) => {
      const status = getItemStatus(item);
      const matchedCol = columns.find(
        (c) => c.id === status || c.id.toLowerCase() === String(status).toLowerCase()
      );
      if (matchedCol) {
        map[matchedCol.id].push(item);
      } else if (columns.length > 0) {
        map[columns[0].id].push(item);
      }
    });

    return map;
  }, [columns, items, getItemStatus]);

  // Update left/right scroll button visibility
  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;

    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [updateScrollButtons, columns.length, items.length]);

  // Scroll by one column width smoothly
  const scrollByAmount = useCallback((direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -320 : 320;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  // Auto-scroll loop while dragging near edges
  const stopEdgeScroll = useCallback(() => {
    if (edgeScrollRef.current) {
      cancelAnimationFrame(edgeScrollRef.current);
      edgeScrollRef.current = null;
    }
  }, []);

  const startEdgeScroll = useCallback(
    (direction, speed) => {
      stopEdgeScroll();
      const step = () => {
        if (!scrollContainerRef.current) return;
        scrollContainerRef.current.scrollLeft += direction === 'left' ? -speed : speed;
        updateScrollButtons();
        edgeScrollRef.current = requestAnimationFrame(step);
      };
      edgeScrollRef.current = requestAnimationFrame(step);
    },
    [stopEdgeScroll, updateScrollButtons]
  );

  const handleDragStart = useCallback((id) => {
    setDraggedItemId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    stopEdgeScroll();
  }, [stopEdgeScroll]);

  // Track pointer during drag over container for edge scrolling
  const handleContainerDragOver = useCallback(
    (e) => {
      if (!draggedItemId || !scrollContainerRef.current) return;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const edgeZone = 90;
      const distLeft = e.clientX - rect.left;
      const distRight = rect.right - e.clientX;

      if (distLeft < edgeZone && distLeft > 0) {
        const speed = Math.max(5, Math.min(22, Math.round((edgeZone - distLeft) / 3)));
        startEdgeScroll('left', speed);
      } else if (distRight < edgeZone && distRight > 0) {
        const speed = Math.max(5, Math.min(22, Math.round((edgeZone - distRight) / 3)));
        startEdgeScroll('right', speed);
      } else {
        stopEdgeScroll();
      }
    },
    [draggedItemId, startEdgeScroll, stopEdgeScroll]
  );

  const handleItemMove = useCallback(
    (itemId, targetColumnId, targetItemId = null, position = 'top') => {
      stopEdgeScroll();
      if (!itemId || !targetColumnId) return;

      const targetItem = items.find((i) => String(getItemId(i)) === String(itemId));
      const currentStatus = targetItem ? getItemStatus(targetItem) : null;

      if (onItemMove) {
        onItemMove(itemId, targetColumnId, currentStatus, targetItemId, position);
      }
      setDraggedItemId(null);
    },
    [items, getItemId, getItemStatus, onItemMove, stopEdgeScroll]
  );

  useEffect(() => {
    return () => stopEdgeScroll();
  }, [stopEdgeScroll]);

  return (
    <div className={`relative group/kanban w-full ${className}`}>
      {/* ── Floating Left Scroll Button (Option 1) ── */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount('left')}
          aria-label="Scroll board left"
          title="Scroll left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-surface/95 hover:bg-surface text-heading shadow-xl border border-border/90 backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
        >
          <IconChevronLeft size={18} />
        </button>
      )}

      {/* ── Floating Right Scroll Button (Option 1) ── */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          aria-label="Scroll board right"
          title="Scroll right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-surface/95 hover:bg-surface text-heading shadow-xl border border-border/90 backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer opacity-90 hover:opacity-100"
        >
          <IconChevronRight size={18} />
        </button>
      )}

      {/* ── Scrollable Viewport Container (Option 2 & Option 3) ── */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButtons}
        onDragOver={handleContainerDragOver}
        onDragLeave={stopEdgeScroll}
        onDrop={stopEdgeScroll}
        className={`w-full overflow-x-auto overflow-y-hidden pb-3 pt-1 px-0.5 custom-horizontal-scrollbar ${boardHeightClass}`}
      >
        <div className="flex items-stretch gap-4 min-w-max h-full">
          {columns.map((column) => {
            const colItems = columnItemsMap[column.id] || [];

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                items={colItems}
                draggedItemId={draggedItemId}
                getItemId={getItemId}
                onItemMove={handleItemMove}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                renderCard={renderCard}
                renderColumnHeader={renderColumnHeader}
                renderColumnFooter={renderColumnFooter}
                emptyColumnText={emptyColumnText}
                widthClass={columnWidth}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

