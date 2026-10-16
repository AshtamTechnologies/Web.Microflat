import IconButton from './IconButton';
import { IconView, IconEdit, IconDelete } from '../../constants/icons';

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
  viewTooltip = 'View',
  editTooltip = 'Edit',
  deleteTooltip = 'Delete',
  viewAriaLabel = 'View details',
  editAriaLabel = 'Edit item',
  deleteAriaLabel = 'Delete item',
  className = '',
  disabled = false,
  extraActions,
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {extraActions}
      {onView && (
        <IconButton
          icon={IconView}
          size="sm"
          variant="ghost"
          onClick={onView}
          title={viewTooltip}
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
          title={editTooltip}
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
          title={deleteTooltip}
          aria-label={deleteAriaLabel}
          disabled={disabled}
          className="hover:text-danger hover:bg-danger/10"
        />
      )}
    </div>
  );
}

