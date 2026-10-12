/**
 * Card — elevated surface container.
 *
 * Props:
 *   padding:   'none' | 'sm' | 'md' | 'lg'  (default: 'md')
 *   shadow:    boolean                        (default: false)
 *   className: string
 *   children:  ReactNode
 */

const paddingClasses = {
  none: '',
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-6 sm:p-8',
};

export default function Card({
  padding = 'md',
  shadow = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <div
      className={[
        'rounded-card border border-border bg-surface',
        shadow ? 'shadow-card' : '',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
