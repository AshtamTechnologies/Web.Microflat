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
  return (
    <label
      htmlFor={id}
      className={[
        'inline-flex items-center gap-3 cursor-pointer select-none',
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
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
        role="switch"
        aria-checked={checked}
        {...rest}
      />

      {/* Visual track + thumb */}
      <span
        aria-hidden="true"
        className={[
          /* track — w=40px h=22px */
          'relative inline-flex shrink-0 rounded-full',
          'transition-colors duration-200 ease-in-out',
          'border-2 border-transparent',
          checked ? 'bg-primary' : 'bg-border',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: '40px', height: '22px' }}
      >
        {/* Thumb */}
        <span
          className="block w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform duration-200 ease-in-out"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </span>

      {label && (
        <span className="text-sm text-text">{label}</span>
      )}
    </label>
  );
}
