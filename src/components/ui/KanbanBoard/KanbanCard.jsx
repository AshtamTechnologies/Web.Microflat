import { memo } from 'react';

/**
 * KanbanCard — Draggable wrapper for any kanban board card.
 *
 * @param {Object} props
 * @param {string|number} props.id - Unique ID of the card/item
 * @param {Object} props.item - The data item
 * @param {boolean} props.isDragging - Whether this specific card is currently dragged
 * @param {Function} props.onDragStart - Drag start callback
 * @param {Function} props.onDragEnd - Drag end callback
 * @param {Function} props.renderCard - Custom render function for card interior
 */
function KanbanCard({
  id,
  item,
  isDragging = false,
  onDragStart,
  onDragEnd,
  renderCard,
}) {
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
    if (onDragEnd) onDragEnd(id, item, e);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative rounded-xl transition-all duration-200 select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 scale-[0.98] border-2 border-dashed border-primary shadow-inner'
          : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {renderCard ? renderCard(item, { isDragging }) : null}
    </div>
  );
}

export default memo(KanbanCard);

