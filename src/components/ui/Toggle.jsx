/**
 * Toggle / Switch — accessible on/off toggle.
 *
 * Props:
 *   id:       string           — unique id for a11y
 *   label:    string           — visible label (rendered right of switch)
 *   checked:  boolean          — controlled value
 *   onChange: (e) => void      — change handler (receives synthetic event with target.checked)
 *   disabled: boolean
 *   ...rest — forwarded to the hidden <input type="checkbox">
 */

export default function Toggle({
  id,
  label,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  ...rest
}) {
  const handleChange = (e) => {
    if (disabled) return;
    if (onChange) {
      onChange(e.target.checked, e);
    }
  };

  return (
    <label
      htmlFor={id}
      className={[
        'inline-flex items-center gap-3 cursor-pointer select-none mf-label',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Hidden real checkbox for form semantics */}
      <input
        type="checkbox"
        id={id}
        checked={Boolean(checked)}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only peer"
        role="switch"
        aria-checked={Boolean(checked)}
        {...rest}
      />

      {/* Visual track + thumb */}
      <span
        aria-hidden="true"
        className={[
          'relative inline-flex shrink-0 w-10 h-6 rounded-full',
          'transition-colors duration-200 ease-in-out',
          'border-2 border-transparent',
          checked ? 'bg-primary' : 'bg-border',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Thumb */}
        <span
          className={[
            'block w-4 h-4 rounded-full bg-bg shadow-sm absolute top-0.5',
            'transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>

      {label && (
        <span className="text-sm text-text font-normal">{label}</span>
      )}
    </label>
  );
}
