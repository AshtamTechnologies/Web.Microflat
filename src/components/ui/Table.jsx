/**
 * Table primitives — thin, reusable wrappers.
 *
 * Exports:
 *   TableContainer  — horizontally scrollable wrapper
 *   Th              — header cell with hover & dragging resize handle
 *   Td              — data cell with comfortable padding
 */

/**
 * TableContainer — wraps <table> in an overflow-x-auto scroll box with fixed layout support.
 */
export function TableContainer({
  children,
  className = '',
  tableStyle,
  tableClassName = '',
}) {
  return (
    <div
      className={[
        'w-full overflow-x-auto',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <table
        style={tableStyle}
        className={[
          'w-full text-sm text-left border-collapse table-fixed',
          tableClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </table>
    </div>
  );
}

/**
 * Th — <th> wrapper.
 *
 * Props:
 *   colSpan, style   — forwarded
 *   isResizing       — boolean, renders active dragging resize bar
 *   resizeHandler    — onMouseDown/onTouchStart handler for column resize
 *   children
 */
export function Th({
  children,
  style,
  isResizing = false,
  resizeHandler,
  className = '',
  ...rest
}) {
  return (
    <th
      className={[
        'relative select-none group/th',
        'px-5 py-3.5',
        'text-xs font-semibold uppercase tracking-wider text-text-muted',
        'border-b border-border bg-surface',
        'whitespace-nowrap overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...rest}
    >
      <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">{children}</div>

        {/* Visible Column Resize Grip Button */}
        {resizeHandler && (
          <div
            onMouseDown={resizeHandler}
            onTouchStart={resizeHandler}
            title="Drag to resize column"
            className={[
              'shrink-0 flex items-center justify-center cursor-col-resize select-none touch-none',
              'w-5 h-6 -mr-2 px-0.5 rounded transition-colors duration-100',
              isResizing
                ? 'text-primary bg-primary/20'
                : 'text-text-muted/40 hover:text-primary hover:bg-border/60 group-hover/th:text-text-muted',
            ].join(' ')}
            aria-hidden="true"
          >
            <svg
              width="6"
              height="12"
              viewBox="0 0 6 12"
              fill="currentColor"
              className="opacity-70 group-hover/th:opacity-100"
            >
              <circle cx="1.5" cy="2" r="1" />
              <circle cx="1.5" cy="6" r="1" />
              <circle cx="1.5" cy="10" r="1" />
              <circle cx="4.5" cy="2" r="1" />
              <circle cx="4.5" cy="6" r="1" />
              <circle cx="4.5" cy="10" r="1" />
            </svg>
          </div>
        )}
      </div>

      {/* Hit area drag bar centered over the cell boundary */}
      {resizeHandler && (
        <span
          onMouseDown={resizeHandler}
          onTouchStart={resizeHandler}
          className="absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize select-none touch-none z-10 flex justify-center"
          aria-hidden="true"
        >
          <span
            className={[
              'h-full transition-colors duration-100',
              isResizing
                ? 'w-[3px] bg-primary shadow-xs'
                : 'w-[2px] bg-transparent group-hover/th:bg-border hover:bg-primary',
            ].join(' ')}
          />
        </span>
      )}
    </th>
  );
}

/**
 * Td — <td> wrapper.
 */
export function Td({ children, style, className = '', ...rest }) {
  return (
    <td
      className={[
        'px-5 py-4',
        'text-sm text-text',
        'align-middle whitespace-nowrap overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </td>
  );
}
