import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import IconButton from './IconButton';
import { IconView, IconEdit, IconDelete, IconMoreVertical } from '../../constants/icons';

/**
 * Global default alignment for data table actions across the entire application.
 * Options: 'right' | 'center' | 'left'
 * Change here in one place to update all table action alignments across MicroFlat ERP.
 */
export const DEFAULT_TABLE_ACTIONS_ALIGN = 'right';

const ALIGN_CLASSES = {
  right: 'justify-end',
  center: 'justify-center',
  left: 'justify-start',
};

/**
 * TableActions — Standardized action buttons for data table rows.
 *
 * Uses IconButton size="sm" (32px) everywhere:
 * - View / Edit hover primary
 * - Delete hover danger
 * - Optional overflowActions rendered inside a 3-dot dropdown menu
 */
export default function TableActions({
  onView,
  onEdit,
  onDelete,
  viewTooltip,
  viewTitle,
  editTooltip,
  editTitle,
  deleteTooltip,
  deleteTitle,
  viewAriaLabel = 'View details',
  editAriaLabel = 'Edit item',
  deleteAriaLabel = 'Delete item',
  className = '',
  align = DEFAULT_TABLE_ACTIONS_ALIGN,
  disabled = false,
  editDisabled = false,
  extraActions,
  overflowActions = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const resolvedViewTooltip = viewTooltip || viewTitle || 'View';
  const resolvedEditTooltip = editTooltip || editTitle || 'Edit';
  const resolvedDeleteTooltip = deleteTooltip || deleteTitle || 'Delete';
  const alignClass = ALIGN_CLASSES[align] || ALIGN_CLASSES.right;

  const hasInlineActions = Boolean(onView || onEdit || onDelete || extraActions);
  const hasOverflow = Array.isArray(overflowActions) && overflowActions.length > 0;

  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsideClick(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    function handleScroll() {
      setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuOpen]);

  const handleToggleMenu = () => {
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = overflowActions.length * 36 + 12;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setMenuCoords({
        top: openUpward ? rect.top - estimatedHeight - 4 : rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setMenuOpen((prev) => !prev);
  };

  return (
    <div className={`flex items-center gap-1 ${hasInlineActions ? 'w-full' : 'w-auto shrink-0'} ${alignClass} ${className}`}>
      {extraActions}
      {onView && (
        <IconButton
          icon={IconView}
          size="sm"
          variant="ghost"
          onClick={onView}
          title={resolvedViewTooltip}
          aria-label={viewAriaLabel}
          disabled={disabled}
          className="hover:text-primary hover:bg-surface"
        />
      )}
      {onEdit && (
        <IconButton
          icon={IconEdit}
          size="sm"
          variant="ghost"
          onClick={editDisabled ? undefined : onEdit}
          title={resolvedEditTooltip}
          aria-label={editAriaLabel}
          disabled={disabled || editDisabled}
          className="hover:text-primary hover:bg-surface"
        />
      )}
      {onDelete && (
        <IconButton
          icon={IconDelete}
          size="sm"
          variant="ghost"
          onClick={onDelete}
          title={resolvedDeleteTooltip}
          aria-label={deleteAriaLabel}
          disabled={disabled}
          className="hover:text-danger hover:bg-danger/10"
        />
      )}
      {hasOverflow && (
        <div ref={triggerRef} className="relative inline-flex">
          <IconButton
            icon={IconMoreVertical}
            size="sm"
            variant="ghost"
            onClick={handleToggleMenu}
            title="More actions"
            aria-label="More actions"
            aria-expanded={menuOpen}
            disabled={disabled}
            className="hover:text-primary hover:bg-surface"
          />
          {menuOpen &&
            createPortal(
              <div
                ref={menuRef}
                role="menu"
                onClick={(e) => e.stopPropagation()}
                style={{ top: `${menuCoords.top}px`, right: `${menuCoords.right}px` }}
                className="fixed z-50 min-w-[180px] rounded-lg border border-border bg-bg shadow-lg py-1 text-left"
              >
                {overflowActions.map((action, idx) => {
                  const ItemIcon = action.icon;
                  const isDanger = action.variant === 'danger';
                  return (
                    <button
                      key={action.label || idx}
                      type="button"
                      role="menuitem"
                      disabled={action.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        action.onClick?.();
                      }}
                      className={[
                        'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                        isDanger
                          ? 'text-danger hover:bg-danger/10'
                          : 'text-heading hover:bg-surface hover:text-primary',
                      ].join(' ')}
                    >
                      {ItemIcon && <ItemIcon size={14} className="shrink-0" aria-hidden="true" />}
                      <span className="truncate">{action.label}</span>
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
        </div>
      )}
    </div>
  );
}
