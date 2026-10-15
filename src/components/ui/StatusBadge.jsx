import React from 'react';
import Badge from './Badge';

/**
 * StatusBadge — Standardized status pill with auto-detected variants and status dot.
 *
 * Props:
 *   status: string | boolean (e.g. true, 'Active', 'Approved', 'Pending', 'Draft', 'Inactive')
 *   showDot?: boolean (default: true)
 *   size?: 'sm' | 'md'
 *   className?: string
 */
export default function StatusBadge({
  status,
  showDot = true,
  size = 'md',
  className = '',
}) {
  // Normalize boolean or string
  let label = '';
  let variant = 'neutral';
  let dotColor = 'bg-text-muted';

  if (typeof status === 'boolean') {
    label = status ? 'Active' : 'Inactive';
    variant = status ? 'active' : 'inactive';
    dotColor = status ? 'bg-success' : 'bg-danger';
  } else if (typeof status === 'string') {
    label = status.trim();
    const lower = label.toLowerCase();

    if (['active', 'approved', 'success', 'completed', 'verified'].includes(lower)) {
      variant = 'success';
      dotColor = 'bg-success';
    } else if (['inactive', 'rejected', 'danger', 'cancelled', 'failed'].includes(lower)) {
      variant = 'danger';
      dotColor = 'bg-danger';
    } else if (['pending', 'warning', 'in progress', 'under review', 'submitted'].includes(lower)) {
      variant = 'warning';
      dotColor = 'bg-warning';
    } else if (['draft', 'new'].includes(lower)) {
      variant = 'info';
      dotColor = 'bg-info';
    } else {
      variant = 'neutral';
      dotColor = 'bg-text-muted';
    }
  } else {
    label = 'Unknown';
    variant = 'neutral';
    dotColor = 'bg-text-muted';
  }

  return (
    <Badge
      variant={variant}
      size={size}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </Badge>
  );
}
