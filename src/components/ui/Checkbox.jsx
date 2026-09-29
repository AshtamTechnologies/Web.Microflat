/**
 * Checkbox — accessible checkbox with label.
 *
 * Props:
 *   id:       string
 *   label:    ReactNode
 *   checked:  boolean
 *   onChange: (e) => void
 *   ...rest  — forwarded to <input type="checkbox">
 */

export default function Checkbox({ id, label, checked, onChange, className = '', ...rest }) {
  return (
    <label
      htmlFor={id}
      className={[
        'inline-flex items-center gap-2.5 cursor-pointer select-none',
        'text-sm text-text',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="relative flex items-center justify-center shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
          {...rest}
        />
        {/* Custom checkbox box */}
        <span
          className={[
            'w-4 h-4 rounded flex items-center justify-center',
            'border transition-colors duration-150 ease-in-out',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-1',
            checked
              ? 'bg-primary border-primary'
              : 'bg-bg border-border hover:border-primary',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          {checked && (
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </span>
      {label}
    </label>
  );
}
