/**
 * Button — reusable action primitive.
 *
 * Props:
 *   variant: 'primary' | 'secondary' | 'danger'  (default: 'primary')
 *   size:    'sm' | 'md' | 'lg'                   (default: 'md')
 *   loading: boolean                               (default: false)
 *   fullWidth: boolean                             (default: false)
 *   disabled: boolean                              (default: false)
 *   type, onClick, children … (standard button attrs)
 */

import { Loader2 } from 'lucide-react';

const variantClasses = {
  primary: [
    'bg-primary text-white',
    'hover:bg-primary-hover',
    'active:bg-primary-active',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  ].join(' '),

  secondary: [
    'bg-transparent text-text border border-border',
    'hover:bg-surface hover:border-text-muted',
    'active:bg-surface',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  ].join(' '),

  danger: [
    'bg-transparent text-danger border border-danger',
    'hover:bg-danger/10',
    'active:bg-danger/20',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  ].join(' '),

  ghost: [
    'bg-transparent text-text-muted',
    'hover:bg-surface hover:text-text',
    'active:bg-surface/80',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
  ].join(' '),
};

const sizeClasses = {
  sm:   'h-8  px-3 text-sm  rounded-md gap-1.5',
  md:   'h-10 px-4 text-sm  rounded-lg gap-2',
  lg:   'h-11 px-5 text-base rounded-lg gap-2',
  icon: 'w-8 h-8 p-0 rounded-md gap-0 justify-center shrink-0',
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
        'inline-flex items-center justify-center font-medium',
        'transition-colors duration-150 ease-in-out',
        'cursor-pointer select-none whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
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
