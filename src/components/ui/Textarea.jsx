/**
 * Textarea — reusable multi-line text input primitive.
 *
 * Props:
 *   label:         string          — visible label (rendered as <label>)
 *   id:            string          — ties label→textarea (required for a11y)
 *   error:         string | null   — field-level error message
 *   hint:          string | null   — helper text shown when no error
 *   required:      boolean         — renders red asterisk on label
 *   rows:          number          — number of visible text rows (default 3)
 *   maxLength:     number          — optional maximum character limit
 *   showCharCount: boolean         — shows 0/250 counter below textarea
 *   ...rest — forwarded to <textarea>
 */

export default function Textarea({
  label,
  id,
  error,
  hint,
  helperText,
  required = false,
  className = '',
  rows = 3,
  maxLength,
  showCharCount = false,
  value,
  ...rest
}) {
  const hasError = Boolean(error);
  const effectiveHint = hint || helperText;
  const currentLength = typeof value === 'string' ? value.length : 0;

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

      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={[
          'mf-textarea',
          hasError ? 'mf-textarea--err' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-describedby={
          error ? `${id}-error` : effectiveHint ? `${id}-hint` : undefined
        }
        aria-invalid={hasError ? 'true' : undefined}
        {...rest}
      />

      <div className="flex items-center justify-between min-h-[1rem]">
        {hasError ? (
          <p id={`${id}-error`} role="alert" className="mf-error">
            {error}
          </p>
        ) : effectiveHint ? (
          <p id={`${id}-hint`} className="mf-hint">
            {effectiveHint}
          </p>
        ) : (
          <span />
        )}

        {showCharCount && maxLength && (
          <span className="text-2xs text-text-muted font-mono tabular-nums text-right ml-auto">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
