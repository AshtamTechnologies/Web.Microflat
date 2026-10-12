/**
 * FilterBar — standard responsive toolbar for search and filter controls.
 *
 * Props:
 *   className?: string
 *   children:   ReactNode
 */

export default function FilterBar({ className = '', children, ...rest }) {
  return (
    <div className={`mf-filter-bar ${className}`} {...rest}>
      {children}
    </div>
  );
}
