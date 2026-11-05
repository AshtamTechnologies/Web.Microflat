/**
 * TimePicker — Wheel drum / tumbler style Time Picker component with React Portal popover.
 *
 * Matches the requested 3-column scroll wheel design:
 *   - Hour (1 - 12)
 *   - Colon separator (:)
 *   - Minute (00 - 59)
 *   - Period (AM / PM)
 *   - Top & bottom cyan accent highlight lines on the active selection
 *   - Faded adjacent numbers above & below
 *   - Bottom "Cancel" | "OK" segmented action bar
 *   - Standard input event compatibility (name, value, onChange)
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const ITEM_HEIGHT = 44; // px per row (3 visible rows = 132px)

/**
 * Parses "HH:mm" (24h) string to { hour12, minuteStr, period }
 */
function parseTimeString(val) {
  if (!val || typeof val !== 'string') return null;
  const match = val.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  let h24 = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  if (isNaN(h24) || isNaN(m) || h24 < 0 || h24 > 23 || m < 0 || m > 59) {
    return null;
  }

  const period = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour12: h12,
    minuteStr: String(m).padStart(2, '0'),
    period,
    hour24: h24,
  };
}

/**
 * Formats hour12, minuteStr, and period into standard "HH:mm" 24h string.
 */
function to24HourString(hour12, minuteStr, period) {
  let h24 = Number(hour12) % 12;
  if (period === 'PM') {
    h24 += 12;
  }
  const hStr = String(h24).padStart(2, '0');
  const mStr = String(minuteStr).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

/**
 * Formats "HH:mm" 24h string into human-friendly 12h display string, e.g. "09:36 PM (21:36)"
 */
function formatDisplayTime(val, include24h = true) {
  const parsed = parseTimeString(val);
  if (!parsed) return '';
  const { hour12, minuteStr, period, hour24 } = parsed;
  const h12Str = String(hour12).padStart(2, '0');
  const h24Str = String(hour24).padStart(2, '0');

  if (include24h) {
    return `${h12Str}:${minuteStr} ${period} (${h24Str}:${minuteStr})`;
  }
  return `${h12Str}:${minuteStr} ${period}`;
}

/**
 * WheelColumn — Smooth scrollable drum column with cyan selection lines
 */
function WheelColumn({ items, value, onChange }) {
  const containerRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef(null);

  const selectedIndex = items.findIndex((it) => String(it) === String(value));

  // Sync scroll position with current selected value
  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0) {
      const targetScroll = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetScroll) > 1) {
        isProgrammaticScroll.current = true;
        containerRef.current.scrollTop = targetScroll;
        const timer = setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedIndex]);

  // Handle user scroll and snap
  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const top = containerRef.current.scrollTop;
      const rawIndex = Math.round(top / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, rawIndex));
      if (items[clampedIndex] !== undefined && String(items[clampedIndex]) !== String(value)) {
        onChange(items[clampedIndex]);
      }
    }, 80);
  };

  const handleItemClick = (item, index) => {
    onChange(item);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative flex-1 h-[132px] overflow-hidden select-none">
      {/* Cyan top and bottom highlight lines over the active center row */}
      <div
        className="absolute left-1 right-1 top-[44px] h-[44px] pointer-events-none border-t-2 border-b-2"
        style={{ borderColor: '#38bdf8' }}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top spacer so first item can sit in center row */}
        <div style={{ height: `${ITEM_HEIGHT}px` }} className="shrink-0 pointer-events-none" />

        {items.map((item, index) => {
          const isSelected = String(item) === String(value);
          const diff = Math.abs(index - selectedIndex);
          const isAdjacent = diff === 1;

          return (
            <div
              key={item}
              onClick={() => handleItemClick(item, index)}
              style={{ height: `${ITEM_HEIGHT}px` }}
              className={`snap-center flex items-center justify-center cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'text-xl font-medium text-heading'
                  : isAdjacent
                  ? 'text-base font-normal text-text-muted/60 hover:text-text'
                  : 'text-sm font-normal text-text-muted/20'
              }`}
            >
              {item}
            </div>
          );
        })}

        {/* Bottom spacer so last item can sit in center row */}
        <div style={{ height: `${ITEM_HEIGHT}px` }} className="shrink-0 pointer-events-none" />
      </div>
    </div>
  );
}

export default function TimePicker({
  label,
  id,
  name,
  value = '',
  onChange,
  onBlur,
  placeholder = 'Select time...',
  required = false,
  error = null,
  hint = null,
  disabled = false,
  size = 'md',
  className = '',
  show24hInDisplay = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  // Parse external value or fallback to current time
  const parsed = useMemo(() => parseTimeString(value), [value]);

  // Working state inside the picker popover
  const [tempHour, setTempHour] = useState(parsed ? parsed.hour12 : 9);
  const [tempMinute, setTempMinute] = useState(parsed ? parsed.minuteStr : '30');
  const [tempPeriod, setTempPeriod] = useState(parsed ? parsed.period : 'AM');

  // Keep temporary state in sync when value changes or when reopened
  const syncWithCurrentValue = useCallback(() => {
    if (parsed) {
      setTempHour(parsed.hour12);
      setTempMinute(parsed.minuteStr);
      setTempPeriod(parsed.period);
    } else {
      const now = new Date();
      let h24 = now.getHours();
      let m = now.getMinutes();
      const p = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      setTempHour(h12);
      setTempMinute(String(m).padStart(2, '0'));
      setTempPeriod(p);
    }
  }, [parsed]);

  useEffect(() => {
    syncWithCurrentValue();
  }, [value, syncWithCurrentValue]);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hasError = Boolean(error);

  // Compute popover coordinates
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 185;
      const popoverWidth = 270;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 4;
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        top = Math.max(10, rect.top - popoverHeight - 4);
      }

      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }

      setCoords({
        top,
        left: Math.max(10, left),
        width: popoverWidth,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  // Click outside and escape listeners
  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    const handleClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      // Revert and close
      syncWithCurrentValue();
      setIsOpen(false);
      if (onBlur) {
        onBlur({ target: { name, id, value } });
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        syncWithCurrentValue();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollResize = () => updateCoords();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, [isOpen, updateCoords, onBlur, name, id, value, syncWithCurrentValue]);

  const emitChange = (time24Str) => {
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          id,
          value: time24Str,
        },
      });
    }
  };

  const handleConfirm = () => {
    const timeStr = to24HourString(tempHour, tempMinute, tempPeriod);
    emitChange(timeStr);
    setIsOpen(false);
    if (onBlur) {
      onBlur({ target: { name, id, value: timeStr } });
    }
  };

  const handleCancel = () => {
    syncWithCurrentValue();
    setIsOpen(false);
    if (onBlur) {
      onBlur({ target: { name, id, value } });
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emitChange('');
    if (onBlur) {
      onBlur({ target: { name, id, value: '' } });
    }
  };

  const currentDisplay = formatDisplayTime(value, show24hInDisplay);

  return (
    <div className="relative w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger Button Input */}
      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              syncWithCurrentValue();
              setIsOpen((prev) => !prev);
            }
          }}
          className={[
            'w-full flex items-center justify-between rounded-control border bg-bg text-text text-left',
            size === 'sm'
              ? 'h-[var(--control-height-sm)] text-xs'
              : size === 'lg'
              ? 'h-[var(--control-height-lg)] text-base'
              : 'h-[var(--control-height-md)] text-sm',
            'px-3 leading-snug cursor-pointer select-none transition-all duration-150',
            hasError
              ? 'border-danger focus:ring-danger/20 focus:border-danger'
              : isOpen
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-text-muted',
            disabled ? 'opacity-50 cursor-not-allowed bg-surface/50' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-invalid={hasError ? 'true' : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Clock
              size={16}
              className={`shrink-0 transition-colors ${
                isOpen || value ? 'text-primary' : 'text-text-muted'
              }`}
            />
            {value ? (
              <span className="font-mono tabular-nums text-heading font-medium truncate">
                {currentDisplay}
              </span>
            ) : (
              <span className="text-text-muted/50 font-normal truncate">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClear(e);
                }}
                className="p-1 rounded hover:bg-surface text-text-muted hover:text-danger cursor-pointer transition-colors"
                title="Clear time"
              >
                <X size={14} />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Field Error / Hint */}
      {hasError && (
        <p id={`${id}-error`} role="alert" className="mf-error flex items-center gap-1 mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="mf-hint mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}

      {/* Wheel TimePicker Popover via React Portal */}
      {isOpen && coords &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
              backgroundColor: 'var(--bg)',
            }}
            className="border border-border rounded-xl shadow-dropdown overflow-hidden animate-in fade-in duration-100 select-none text-text"
            role="dialog"
            aria-label="Time picker wheel"
          >
            {/* 3-Column Drum Wheels with Colon Separator */}
            <div
              style={{ backgroundColor: 'var(--bg)' }}
              className="flex items-center px-4 py-3"
            >
              {/* Column 1: Hour (1 - 12) */}
              <WheelColumn
                items={HOURS}
                value={tempHour}
                onChange={setTempHour}
              />

              {/* Colon Separator in the active center row */}
              <div className="flex items-center justify-center h-[132px] px-1 text-lg font-bold text-heading select-none pointer-events-none">
                :
              </div>

              {/* Column 2: Minute (00 - 59) */}
              <WheelColumn
                items={MINUTES}
                value={tempMinute}
                onChange={setTempMinute}
              />

              {/* Column 3: Period (AM / PM) */}
              <WheelColumn
                items={PERIODS}
                value={tempPeriod}
                onChange={setTempPeriod}
              />
            </div>

            {/* Bottom Segmented Action Bar: Cancel | OK */}
            <div
              style={{ backgroundColor: 'var(--surface)' }}
              className="border-t border-border flex items-center text-sm font-medium"
            >
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 text-center text-text hover:text-heading hover:bg-bg transition-colors cursor-pointer border-r border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 text-center text-primary font-semibold hover:bg-bg transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
