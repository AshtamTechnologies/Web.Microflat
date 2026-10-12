/**
 * FormGrid & FormSection — standard responsive field grid & section containers.
 *
 * FormGrid Props:
 *   columns?: 1 | 2 | 3 | 4 (default 2) - breakpoint responsive grid
 *   className?: string
 *   children: ReactNode
 *
 * FormSection Props:
 *   title?: string
 *   subtitle?: string
 *   className?: string
 *   children: ReactNode
 */

export function FormGrid({ columns = 2, className = '', children, ...rest }) {
  const colClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      className={`grid gap-4 ${colClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function FormSection({ title, subtitle, className = '', children, ...rest }) {
  return (
    <div className={`space-y-3 ${className}`} {...rest}>
      {(title || subtitle) && (
        <div className="border-b border-border pb-2">
          {title && <h3 className="text-sm font-semibold text-heading">{title}</h3>}
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export default FormGrid;
