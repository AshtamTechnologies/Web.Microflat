import { memo, useState } from 'react';

/**
 * KanbanCard — Draggable wrapper for any kanban board card.
 *
 * @param {Object} props
 * @param {string|number} props.id - Unique ID of the card/item
 * @param {Object} props.item - The data item
 * @param {boolean} props.isDragging - Whether this specific card is currently dragged
 * @param {string|number} [props.draggedItemId] - Currently dragged card ID across board
 * @param {Function} props.onDragStart - Drag start callback
 * @param {Function} props.onDragEnd - Drag end callback
 * @param {Function} [props.onCardDrop] - Callback when another card is dropped on this card
 * @param {Function} props.renderCard - Custom render function for card interior
 */
function KanbanCard({
  id,
  item,
  isDragging = false,
  draggedItemId,
  onDragStart,
  onDragEnd,
  onCardDrop,
  renderCard,
}) {
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | null

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
    // Fallback data for cross-browser reliability
    try {
      e.dataTransfer.setData('application/json', JSON.stringify({ id }));
    } catch {
      // ignore
    }
    if (onDragStart) onDragStart(id, item, e);
  };

  const handleDragEnd = (e) => {
    setDropPosition(null);
    if (onDragEnd) onDragEnd(id, item, e);
  };

  const handleDragOver = (e) => {
    if (String(draggedItemId) === String(id)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    if (dropPosition !== pos) {
      setDropPosition(pos);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropPosition(null);
    }
  };

  const handleDrop = (e) => {
    if (String(draggedItemId) === String(id)) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = dropPosition || 'after';
    setDropPosition(null);

    const rawId = e.dataTransfer.getData('text/plain');
    const incomingId = rawId || draggedItemId;

    if (incomingId && onCardDrop) {
      onCardDrop(incomingId, id, pos);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-xl transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 scale-[0.98] border-2 border-dashed border-primary shadow-inner pointer-events-none'
          : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* Top drop insertion indicator line */}
      {dropPosition === 'before' && (
        <div className="absolute -top-1 left-1 right-1 h-1 bg-primary rounded-full shadow-sm z-20 pointer-events-none animate-pulse" />
      )}

      {renderCard ? renderCard(item, { isDragging }) : null}

      {/* Bottom drop insertion indicator line */}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1 left-1 right-1 h-1 bg-primary rounded-full shadow-sm z-20 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

export default memo(KanbanCard);

