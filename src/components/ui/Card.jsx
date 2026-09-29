/**
 * Card — elevated surface container.
 *
 * Props:
 *   padding: 'none' | 'sm' | 'md' | 'lg'  (default: 'md')
 *   shadow:  boolean                        (default: false)
 *   className: string
 *   children: ReactNode
 */

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
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
        'rounded-xl border border-border bg-surface',
        shadow ? 'shadow-sm' : '',
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
