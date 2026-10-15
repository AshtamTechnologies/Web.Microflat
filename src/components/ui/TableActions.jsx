import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Button from './Button';

/**
 * TableActions — Standardized row action buttons for grid tables & mobile cards.
 *
 * Props:
 *   onView?: () => void
 *   onEdit?: () => void
 *   onDelete?: () => void
 *   viewTitle?: string
 *   editTitle?: string
 *   deleteTitle?: string
 *   extraActions?: React.ReactNode
 *   className?: string
 */
export default function TableActions({
  onView,
  onEdit,
  onDelete,
  viewTitle = 'View details',
  editTitle = 'Edit record',
  deleteTitle = 'Delete record',
  extraActions,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-end gap-1 ${className}`}>
      {extraActions}

      {onView && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onView}
          title={viewTitle}
          className="h-8 w-8 text-text-muted hover:text-info hover:bg-surface transition-colors"
        >
          <Eye size={15} aria-hidden="true" />
        </Button>
      )}

      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          title={editTitle}
          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-surface transition-colors"
        >
          <Pencil size={15} aria-hidden="true" />
        </Button>
      )}

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          title={deleteTitle}
          className="h-8 w-8 text-text-muted hover:text-danger hover:bg-surface transition-colors"
        >
          <Trash2 size={15} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
