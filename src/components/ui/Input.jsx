/**
 * Input — reusable text-input primitive.
 *
 * Props:
 *   label:       string          — visible label (rendered as <label>)
 *   id:          string          — ties label→input (required for a11y)
 *   error:       string | null   — field-level error message
 *   hint:        string | null   — helper text shown when no error
 *   leftIcon:    ReactNode        — icon placed inside left side of input
 *   rightElement: ReactNode      — arbitrary element placed on the right
 *                                  (e.g. show/hide button for password)
 *   ...rest — forwarded to <input>
 */

export default function Input({
  label,
  id,
  error,
  hint,
  leftIcon,
  rightElement,
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
        {leftIcon && (
          <span className="absolute left-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </span>
        )}

        <input
          id={id}
          className={[
            'w-full rounded-lg border bg-bg text-text text-sm',
            'px-3 py-2.5 leading-snug',
            'placeholder:text-text-muted',
            'transition-colors duration-150 ease-in-out',
            /* focus */
            'outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            /* error */
            hasError
              ? 'border-danger focus:ring-danger/20 focus:border-danger'
              : 'border-border hover:border-text-muted',
            /* icon padding */
            leftIcon ? 'pl-10' : '',
            rightElement ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          aria-invalid={hasError ? 'true' : undefined}
          {...rest}
        />

        {rightElement && (
          <span className="absolute right-2 flex items-center">
            {rightElement}
          </span>
        )}
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
