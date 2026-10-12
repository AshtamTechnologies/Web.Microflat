/**
 * StatusSwitch — Custom toggle switch matching the reference design.
 *
 * Compact, pill-shaped switch with sliding capsule thumb and clean typography.
 */

import { Check, Ban } from 'lucide-react';

export default function StatusSwitch({
  checked = true,
  onChange,
  id = 'status-switch',
  disabled = false,
  className = '',
}) {
  function handleToggle() {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  }

  return (
    <div
      role="switch"
      id={id}
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-label="Account status toggle"
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={[
        'relative inline-flex items-center justify-between',
        'h-9 w-28 rounded-full p-1 cursor-pointer select-none',
        'transition-colors duration-200 ease-in-out',
        'shadow-xs border border-border',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        checked ? 'bg-primary border-primary' : 'bg-surface border-border',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Active text (left side) ── */}
      <span
        className={[
          'text-xs font-bold tracking-tight text-on-primary pl-2.5 select-none transition-opacity duration-150',
          checked ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        Active
      </span>

      {/* ── Inactive text (right side) ── */}
      <span
        className={[
          'text-xs font-bold tracking-tight text-text-muted pr-2 select-none transition-opacity duration-150 ml-auto',
          !checked ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        Inactive
      </span>

      {/* ── Sliding Oval Thumb ── */}
      <div
        className={[
          'absolute top-1 bottom-1 w-9 rounded-full bg-bg shadow-sm flex items-center justify-center',
          'transition-all duration-200 ease-in-out border border-border/40',
          checked ? 'left-[calc(100%-40px)]' : 'left-1',
        ].join(' ')}
      >
        {checked ? (
          <Check
            size={15}
            strokeWidth={3}
            className="text-primary animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          />
        ) : (
          <Ban
            size={14}
            strokeWidth={2.5}
            className="text-text-muted animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
