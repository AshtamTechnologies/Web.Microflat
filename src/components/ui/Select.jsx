/**
 * Select — styled native <select> wrapper.
 *
 * Props (mirrors Input API):
 *   label:    string           — visible label
 *   id:       string           — ties label→select (a11y)
 *   size:     'sm'|'md'|'lg'   — optional select height (default 'md')
 *   error:    string | null    — field-level error message
 *   hint:     string | null    — helper text shown when no error
 *   options:  { value, label }[] — select options
 *   ...rest — forwarded to <select>
 */

import { IconChevronDown } from '../../constants/icons';

export default function Select({
  label,
  id,
  size = 'md',
  error,
  hint,
  options = [],
  required = false,
  className = '',
  ...rest
}) {
  const hasError = Boolean(error);
  const sizeClass = size === 'sm' ? 'mf-select--sm' : size === 'lg' ? 'mf-select--lg' : '';

  return (
    <div className="mf-field">
      {label && (
        <label htmlFor={id} className="mf-label">
          {label}
          {required && (
            <span className="mf-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={id}
          className={[
            'mf-select appearance-none pr-9 cursor-pointer',
            sizeClass,
            hasError ? 'mf-select--err' : '',
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
          <IconChevronDown size={15} aria-hidden="true" />
        </span>
      </div>

      {/* Field-level error */}
      {hasError && (
        <p id={`${id}-error`} role="alert" className="mf-error flex items-center gap-1">
          {error}
        </p>
      )}

      {/* Hint text */}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="mf-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
