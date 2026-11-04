import { useState, useCallback } from 'react';

/**
 * useColumnResize — Reusable hook for drag-to-resize table columns.
 *
 * @param {Record<string, number>} initialWidths - Default column widths in px
 * @param {Record<string, number>} minWidths - Minimum column widths in px
 * @returns {{
 *   colWidths: Record<string, number>,
 *   resizingCol: string | null,
 *   handleStartResize: (e: React.MouseEvent | React.TouchEvent, colKey: string) => void
 * }}
 */
export function useColumnResize(initialWidths = {}, minWidths = {}) {
  const [colWidths, setColWidths] = useState(initialWidths);
  const [resizingCol, setResizingCol] = useState(null);

  const handleStartResize = useCallback(
    (e, colKey) => {
      e.preventDefault();
      e.stopPropagation();

      const thElement = e.currentTarget.closest('th');
      const startWidth = thElement
        ? Math.round(thElement.getBoundingClientRect().width)
        : (colWidths[colKey] || 100);

      const startX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);

      setResizingCol(colKey);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        const currentX =
          moveEvent.clientX ??
          (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : startX);
        const delta = currentX - startX;
        const minW = minWidths[colKey] || 50;
        const newWidth = Math.max(minW, Math.round(startWidth + delta));

        setColWidths((prev) => ({
          ...prev,
          [colKey]: newWidth,
        }));
      };

      const onMouseUp = () => {
        setResizingCol(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('touchend', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove, { passive: false });
      window.addEventListener('touchend', onMouseUp);
    },
    [colWidths, minWidths]
  );

  return { colWidths, setColWidths, resizingCol, handleStartResize };
}

export default useColumnResize;

