import IconButton from './IconButton';
import { IconView, IconEdit, IconDelete } from '../../constants/icons';

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
  extraActions,
}) {
  const resolvedViewTooltip = viewTooltip || viewTitle || 'View';
  const resolvedEditTooltip = editTooltip || editTitle || 'Edit';
  const resolvedDeleteTooltip = deleteTooltip || deleteTitle || 'Delete';
  const alignClass = ALIGN_CLASSES[align] || ALIGN_CLASSES.right;

  return (
    <div className={`flex items-center gap-1 w-full ${alignClass} ${className}`}>
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
          onClick={onEdit}
          title={resolvedEditTooltip}
          aria-label={editAriaLabel}
          disabled={disabled}
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
    </div>
  );
}

