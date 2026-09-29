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
        'h-[38px] w-[122px] rounded-full p-1 cursor-pointer select-none',
        'transition-colors duration-200 ease-in-out',
        'shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] border border-black/10 dark:border-white/10',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        checked ? 'bg-primary' : 'bg-gray-400 dark:bg-gray-600',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Active text (left side) ── */}
      <span
        className={[
          'text-[13px] font-bold tracking-tight text-white pl-2.5 select-none transition-opacity duration-150',
          checked ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        Active
      </span>

      {/* ── Inactive text (right side) ── */}
      <span
        className={[
          'text-[13px] font-bold tracking-tight text-gray-900 dark:text-gray-100 pr-2 select-none transition-opacity duration-150 ml-auto',
          !checked ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        Inactive
      </span>

      {/* ── Sliding White Oval Thumb ── */}
      <div
        className={[
          'absolute top-[3px] bottom-[3px] w-[42px] rounded-full bg-white',
          'shadow-[0_2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center',
          'transition-all duration-200 ease-in-out',
          checked ? 'left-[calc(100%-45px)]' : 'left-[3px]',
        ].join(' ')}
      >
        {checked ? (
          <Check
            size={16}
            strokeWidth={3.5}
            className="text-primary animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          />
        ) : (
          <Ban
            size={15}
            strokeWidth={2.5}
            className="text-gray-600 dark:text-gray-700 animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
