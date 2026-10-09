/**
 * Select — styled native <select> wrapper.
 *
 * Props (mirrors Input API):
 *   label:    string           — visible label
 *   id:       string           — ties label→select (a11y)
 *   error:    string | null    — field-level error message
 *   hint:     string | null    — helper text shown when no error
 *   options:  { value, label }[] — select options
 *   ...rest — forwarded to <select>
 */

import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  id,
  error,
  hint,
  options = [],
  required = false,
  className = '',
  ...rest
}) {
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-text leading-none"
        >
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={id}
          className={[
            'w-full rounded-lg border bg-bg text-text text-sm appearance-none',
            'px-3 py-2.5 pr-9 leading-snug',
            'transition-colors duration-150 ease-in-out',
            'outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'cursor-pointer',
            hasError
              ? 'border-danger focus:ring-danger/20 focus:border-danger'
              : 'border-border hover:border-text-muted',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          aria-invalid={hasError ? 'true' : undefined}
          {...rest}
        >
          {options.map(({ value, label: optLabel }) => (
            <option key={value} value={value}>
              {optLabel}
            </option>
          ))}
        </select>

        {/* Dropdown chevron */}
        <span className="absolute right-3 flex items-center pointer-events-none text-text-muted">
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </div>

      {/* Field-level error */}
      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-danger flex items-center gap-1"
        >
          {error}
        </p>
      )}

      {/* Hint text (only shown when no error) */}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
