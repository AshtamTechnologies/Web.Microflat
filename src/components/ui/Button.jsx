/**
 * Button — reusable action primitive.
 *
 * Props:
 *   variant:   'primary' | 'secondary' | 'success' | 'danger' | 'danger-soft' | 'ghost' (default: 'primary')
 *   size:      'sm' | 'md' | 'lg' | 'icon'                   (default: 'md')
 *   loading:   boolean                                       (default: false)
 *   fullWidth: boolean                                       (default: false)
 *   disabled:  boolean                                       (default: false)
 *   type, onClick, children … (standard button attrs)
 */

import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: 'mf-btn--primary',
  'primary-soft': 'mf-btn--primary-soft',
  secondary: 'mf-btn--secondary',
  success: 'mf-btn--success',
  danger: 'mf-btn--danger',
  'danger-soft': 'mf-btn--danger-soft',
  ghost: 'mf-btn--ghost',
};

const sizeClasses = {
  sm: 'mf-btn--sm',
  md: 'mf-btn--md',
  lg: 'mf-btn--lg',
  icon: 'mf-btn--icon',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'mf-btn',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <Loader2
          size={16}
          className="animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
