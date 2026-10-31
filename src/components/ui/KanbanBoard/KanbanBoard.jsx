import { useState, useMemo, useCallback } from 'react';
import KanbanColumn from './KanbanColumn';

/**
 * KanbanBoard — Reusable multi-column Drag-and-Drop Kanban container.
 *
 * @param {Object} props
 * @param {Array<Object>} props.columns - Stage / Column definitions [{ id, name, ... }]
 * @param {Array<Object>} props.items - List of data items to display
 * @param {Function} [props.getItemId] - Function returning unique ID for an item
 * @param {Function} [props.getItemStatus] - Function returning the column ID an item belongs to
 * @param {Function} props.onItemMove - Callback when an item is dropped into a column: (itemId, newStatusId, oldStatusId) => void
 * @param {Function} props.renderCard - Render prop for individual card body
 * @param {Function} [props.renderColumnHeader] - Optional custom column header renderer
 * @param {Function} [props.renderColumnFooter] - Optional custom column footer renderer
 * @param {string} [props.emptyColumnText] - Custom empty message per column
 * @param {string} [props.className] - Wrapper custom CSS classes
 * @param {string} [props.columnWidth] - Column width Tailwind classes
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
}) {
  const [draggedItemId, setDraggedItemId] = useState(null);

  // Group items by column ID
  const columnItemsMap = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });

    items.forEach((item) => {
      const status = getItemStatus(item);
      // Find matching column, case-insensitively if needed
      const matchedCol = columns.find(
        (c) => c.id === status || c.id.toLowerCase() === String(status).toLowerCase()
      );
      if (matchedCol) {
        map[matchedCol.id].push(item);
      } else if (columns.length > 0) {
        // Fallback to first column if status unrecognized
        map[columns[0].id].push(item);
      }
    });

    return map;
  }, [columns, items, getItemStatus]);

  const handleDragStart = useCallback((id) => {
    setDraggedItemId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
  }, []);

  const handleItemMove = useCallback(
    (itemId, targetColumnId) => {
      if (!itemId || !targetColumnId) return;

      // Find current item and source status
      const targetItem = items.find((i) => String(getItemId(i)) === String(itemId));
      const currentStatus = targetItem ? getItemStatus(targetItem) : null;

      if (currentStatus !== targetColumnId && onItemMove) {
        onItemMove(itemId, targetColumnId, currentStatus);
      }
      setDraggedItemId(null);
    },
    [items, getItemId, getItemStatus, onItemMove]
  );

  return (
    <div
      className={`w-full overflow-x-auto pb-6 pt-1 px-0.5 custom-horizontal-scrollbar ${className}`}
    >
      <div className="flex items-start gap-4 min-w-max">
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
  );
}

