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
  required = false,
  className = '',
  rows = 3,
  maxLength,
  showCharCount = false,
  value,
  ...rest
}) {
  const hasError = Boolean(error);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="form-label"
        >
          {label}
          {required && (
            <span className="form-label-required" aria-hidden="true">
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
          'w-full rounded-lg border bg-bg text-text text-sm',
          'px-3 py-2.5 leading-relaxed resize-y',
          'placeholder:text-text-muted/50 placeholder:font-normal',
          'transition-colors duration-150 ease-in-out',
          /* focus */
          'outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          /* error */
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
      />

      <div className="flex items-center justify-between text-xs min-h-[1rem]">
        {hasError ? (
          <p id={`${id}-error`} className="text-danger font-medium leading-none">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="text-text-muted leading-none">
            {hint}
          </p>
        ) : (
          <span />
        )}

        {showCharCount && maxLength && (
          <span className="text-text-muted font-mono tabular-nums text-right ml-auto leading-none">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
