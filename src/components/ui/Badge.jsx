/**
 * Badge — small pill label.
 *
 * Props:
 *   variant:   'role' | 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'warning' | 'success' | 'danger' | 'info' | 'neutral'
 *   size:      'sm' | 'md' (default: 'md')
 *   children:  ReactNode
 *   className: string
 */

const variantClasses = {
  role:     'bg-primary/10 text-primary border border-primary/20',
  active:   'bg-success-bg text-success border border-success-border',
  inactive: 'bg-danger-bg text-danger border border-danger-border',
  pending:  'bg-warning-bg text-warning border border-warning-border',
  approved: 'bg-success-bg text-success border border-success-border',
  rejected: 'bg-danger-bg text-danger border border-danger-border',
  warning:  'bg-warning-bg text-warning border border-warning-border',
  success:  'bg-success-bg text-success border border-success-border',
  danger:   'bg-danger-bg text-danger border border-danger-border',
  info:     'bg-info-bg text-info border border-info-border',
  neutral:  'bg-surface text-text-muted border border-border',
};

const sizeClasses = {
  sm: 'text-2xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Badge({ variant = 'role', size = 'md', className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center font-medium leading-none rounded-badge whitespace-nowrap',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] ?? variantClasses.role,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
