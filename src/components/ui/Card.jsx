/**
 * Card — elevated surface container.
 *
 * Props:
 *   title:         ReactNode | string           (optional card header title)
 *   subtitle:      ReactNode | string           (optional card header subtitle)
 *   bodyClassName: string                       (optional className for body container)
 *   padding:       'none' | 'sm' | 'md' | 'lg'  (default: 'md')
 *   shadow:        boolean                      (default: false)
 *   className:     string
 *   children:      ReactNode
 */

const paddingClasses = {
  none: '',
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-6 sm:p-8',
};

export default function Card({
  title,
  subtitle,
  bodyClassName = '',
  padding = 'md',
  shadow = false,
  className = '',
  children,
  ...rest
}) {
  const hasHeader = Boolean(title || subtitle);

  return (
    <div
      className={[
        'rounded-card border border-border bg-surface',
        shadow ? 'shadow-card' : '',
        !hasHeader ? paddingClasses[padding] : '',
        !hasHeader && bodyClassName ? bodyClassName : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {hasHeader && (
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border">
          {title && <h3 className="text-sm font-bold text-heading">{title}</h3>}
          {subtitle && <p className="text-2xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      {hasHeader ? (
        <div className={[paddingClasses[padding], bodyClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
