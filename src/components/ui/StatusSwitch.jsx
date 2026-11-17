/**
 * StatusSwitch — Custom toggle switch matching the reference design.
 *
 * Compact, pill-shaped switch with sliding capsule thumb and clean typography.
 */

import { Check, Ban } from 'lucide-react';

export default function StatusSwitch({
  checked,
  isActive,
  onChange,
  onToggle,
  id = 'status-switch',
  disabled = false,
  className = '',
  size = 'sm', // 'sm' (sleek/compact, default) | 'md'
}) {
  const isChecked =
    checked !== undefined
      ? Boolean(checked)
      : isActive !== undefined
      ? Boolean(isActive)
      : true;

  function handleToggle() {
    if (disabled) return;
    if (onChange) {
      onChange(!isChecked);
    } else if (onToggle) {
      onToggle(!isChecked);
    }
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  }

  const isSmall = size === 'sm';

  return (
    <div
      role="switch"
      id={id}
      tabIndex={disabled ? -1 : 0}
      aria-checked={isChecked}
      aria-label="Status toggle"
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={[
        'relative inline-flex items-center justify-between',
        isSmall
          ? 'h-6.5 w-[84px] rounded-full p-0.5'
          : 'h-8 w-24 rounded-full p-1',
        'cursor-pointer select-none',
        'transition-colors duration-200 ease-in-out',
        'shadow-2xs border border-border',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        isChecked ? 'bg-primary border-primary' : 'bg-surface border-border',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Active text (left side) ── */}
      <span
        className={[
          'absolute inset-y-0 flex items-center select-none transition-opacity duration-150 pointer-events-none',
          isSmall
            ? 'left-2.5 text-[10px] font-bold tracking-tight text-on-primary'
            : 'left-3 text-2xs font-bold tracking-tight text-on-primary',
          isChecked ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        Active
      </span>

      {/* ── Inactive text (right side) ── */}
      <span
        className={[
          'absolute inset-y-0 flex items-center select-none transition-opacity duration-150 pointer-events-none',
          isSmall
            ? 'right-2.5 text-[10px] font-bold tracking-tight text-text-muted'
            : 'right-3 text-2xs font-bold tracking-tight text-text-muted',
          !isChecked ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        Inactive
      </span>

      {/* ── Sliding Oval Thumb ── */}
      <div
        className={[
          'absolute rounded-full bg-bg shadow-2xs flex items-center justify-center',
          'transition-all duration-200 ease-in-out border border-border/40',
          isSmall
            ? 'top-0.5 bottom-0.5 w-5.5'
            : 'top-1 bottom-1 w-6.5',
          isSmall
            ? isChecked ? 'left-[calc(100%-24px)]' : 'left-0.5'
            : isChecked ? 'left-[calc(100%-28px)]' : 'left-1',
        ].join(' ')}
      >
        {isChecked ? (
          <Check
            size={isSmall ? 11 : 12}
            strokeWidth={3}
            className="text-primary animate-in zoom-in-75 duration-150"
          />
        ) : (
          <Ban
            size={isSmall ? 11 : 12}
            strokeWidth={2.5}
            className="text-text-muted animate-in zoom-in-75 duration-150"
          />
        )}
      </div>
    </div>
  );
}
