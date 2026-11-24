import React, { useId } from 'react';

/**
 * Input — reusable text-input primitive.
 *
 * Props:
 *   label:       string          — visible label (rendered as <label>)
 *   id:          string          — ties label→input (required for a11y)
 *   size:        'sm'|'md'|'lg'  — optional input height (default 'md')
 *   error:       string | null   — field-level error message
 *   hint:        string | null   — helper text shown when no error
 *   leftIcon:    ReactNode       — icon placed inside left side of input
 *   rightElement: ReactNode      — arbitrary element placed on the right
 *   ...rest — forwarded to <input>
 */

export default function Input({
  label,
  id,
  size = 'md',
  error,
  hint,
  helperText,
  leftIcon,
  rightElement,
  required = false,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const effectiveId = id || (label ? `input-${autoId}` : undefined);
  const hasError = Boolean(error);
  const effectiveHint = hint || helperText;

  const sizeClass = size === 'sm' ? 'mf-input--sm' : size === 'lg' ? 'mf-input--lg' : '';

  return (
    <div className="mf-field">
      {label && (
        <label htmlFor={effectiveId} className="mf-label">
          {label}
          {required && (
            <span className="mf-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </span>
        )}

        <input
          id={effectiveId}
          className={[
            'mf-input',
            sizeClass,
            hasError ? 'mf-input--err' : '',
            leftIcon ? '!pl-10 pl-10' : '',
            rightElement ? '!pr-10 pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          data-has-left-icon={leftIcon ? 'true' : undefined}
          data-has-right-element={rightElement ? 'true' : undefined}
          aria-describedby={
            effectiveId && error ? `${effectiveId}-error` : effectiveId && effectiveHint ? `${effectiveId}-hint` : undefined
          }
          aria-invalid={hasError ? 'true' : undefined}
          aria-label={label ? undefined : rest['aria-label']}
          {...rest}
        />

        {rightElement && (
          <span className="absolute right-2.5 flex items-center">
            {rightElement}
          </span>
        )}
      </div>

      {/* Field-level error */}
      {hasError && (
        <p id={effectiveId ? `${effectiveId}-error` : undefined} role="alert" className="mf-error flex items-center gap-1">
          {error}
        </p>
      )}

      {/* Hint text */}
      {!hasError && effectiveHint && (
        <p id={effectiveId ? `${effectiveId}-hint` : undefined} className="mf-hint">
          {effectiveHint}
        </p>
      )}
    </div>
  );
}
