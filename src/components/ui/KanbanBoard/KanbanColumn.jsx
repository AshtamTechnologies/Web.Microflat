import { memo, useState } from 'react';
import KanbanCard from './KanbanCard';

/**
 * KanbanColumn — Represents a single stage column inside the KanbanBoard.
 */
function KanbanColumn({
  column,
  items = [],
  draggedItemId,
  getItemId,
  onItemMove,
  onDragStart,
  onDragEnd,
  renderCard,
  renderColumnHeader,
  renderColumnFooter,
  emptyColumnText = 'No items in this stage',
  widthClass = 'w-80 min-w-[300px] max-w-[320px]',
}) {
  const [isOver, setIsOver] = useState(false);

  const columnId = column.id;
  const count = items.length;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e) => {
    // Only deactivate if leaving the column element itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const rawId = e.dataTransfer.getData('text/plain');
    const itemId = rawId || draggedItemId;

    if (itemId && onItemMove) {
      onItemMove(itemId, columnId);
    }
  };

  return (
    <div
      className={`flex flex-col shrink-0 rounded-2xl bg-surface-muted/50 dark:bg-surface-muted/20 border transition-all duration-200 select-none ${widthClass} ${
        isOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 dark:bg-primary/10'
          : 'border-border/80'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Column Header ── */}
      <div className="p-3 border-b border-border/60">
        {renderColumnHeader ? (
          renderColumnHeader({ column, count, items })
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  column.dotClass || 'bg-primary'
                }`}
              />
              <span className="font-semibold text-xs text-heading uppercase tracking-wider truncate">
                {column.name || column.label || column.id}
              </span>
            </div>
            <span
              className={`text-2xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                column.badgeClass ||
                'bg-surface text-text-muted border-border font-mono'
              }`}
            >
              {count}
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable Cards Body / Drop Target ── */}
      <div
        className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[140px] transition-colors rounded-b-2xl ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        {items.length === 0 ? (
          <div className="h-28 rounded-xl border-2 border-dashed border-border/70 flex flex-col items-center justify-center p-3 text-center">
            <p className="text-2xs text-text-muted/70 font-medium">
              {isOver ? 'Drop card here' : emptyColumnText}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const id = getItemId ? getItemId(item) : item.id;
            const isDragging = String(draggedItemId) === String(id);

            return (
              <KanbanCard
                key={id}
                id={id}
                item={item}
                isDragging={isDragging}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                renderCard={renderCard}
              />
            );
          })
        )}
      </div>

      {/* ── Optional Column Footer ── */}
      {renderColumnFooter && (
        <div className="p-2.5 border-t border-border/60 bg-surface/50 rounded-b-2xl">
          {renderColumnFooter({ column, items })}
        </div>
      )}
    </div>
  );
}

export default memo(KanbanColumn);

