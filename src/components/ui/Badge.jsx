/**
 * Badge — small pill label.
 *
 * Props:
 *   variant: 'role' | 'active' | 'inactive'
 *     role     → brand tint  (bg-primary/10 text-primary)
 *     active   → success tint (bg-success/10 text-success)
 *     inactive → gray tint   (bg-border/60 text-text-muted)
 *   children: ReactNode
 *   className: string
 */

const variantClasses = {
  role:     'bg-primary/10 text-primary border border-primary/20',
  active:   'bg-success/10 text-success border border-success/20',
  inactive: 'bg-danger/10 text-danger border border-danger/20',
  pending:  'bg-warning/10 text-warning border border-warning/20',
  approved: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-danger/10 text-danger border border-danger/20',
  warning:  'bg-warning/10 text-warning border border-warning/20',
  success:  'bg-success/10 text-success border border-success/20',
  danger:   'bg-danger/10 text-danger border border-danger/20',
  neutral:  'bg-border/60 text-text-muted border border-border',
};


export default function Badge({ variant = 'role', className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'text-xs font-medium leading-none',
        'rounded-full px-2.5 py-1',
        'whitespace-nowrap',
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
