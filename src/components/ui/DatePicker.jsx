/**
 * DatePicker — Custom, accessible Calendar Date Picker component with React Portal popover.
 *
 * Features:
 *   - Custom calendar popup with full month/year navigation
 *   - Year fast-picker / jumper
 *   - Days grid with today indicator & active selection
 *   - Quick "Today" and "Clear" actions
 *   - React Portal rendering so it never clips inside modals or cards
 *   - Click-outside & Escape key dismissal
 *   - Standard input event compatibility (name, value, onChange)
 *   - Theme tokens & dark mode compliant
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  RotateCcw,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helpers for date calculations
function parseDateString(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateToISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(isoString) {
  if (!isoString) return '';
  const date = parseDateString(isoString);
  if (!date) return isoString;
  const d = String(date.getDate()).padStart(2, '0');
  const m = SHORT_MONTH_NAMES[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

export default function DatePicker({
  label,
  id,
  name,
  value = '',
  onChange,
  onBlur,
  min,
  max,
  placeholder = 'Select date...',
  required = false,
  error = null,
  hint = null,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'

  const parsedValue = useMemo(() => parseDateString(value), [value]);

  // Calendar navigation state (year and month currently displayed in calendar)
  const [navYear, setNavYear] = useState(() => parsedValue ? parsedValue.getFullYear() : new Date().getFullYear());
  const [navMonth, setNavMonth] = useState(() => parsedValue ? parsedValue.getMonth() : new Date().getMonth());

  // Sync nav state when value changes and calendar opens
  useEffect(() => {
    if (parsedValue) {
      setNavYear(parsedValue.getFullYear());
      setNavMonth(parsedValue.getMonth());
    }
  }, [value, parsedValue]);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const hasError = Boolean(error);
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => formatDateToISO(today), [today]);

  // Synchronously compute portal coords
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = 360;
      const popoverWidth = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 6;
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        top = Math.max(10, rect.top - popoverHeight - 6);
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

  // Click outside and resize listeners
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
      setIsOpen(false);
      setViewMode('days');
      if (onBlur) {
        onBlur({ target: { name, id, value } });
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setViewMode('days');
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
  }, [isOpen, updateCoords, onBlur, name, id, value]);

  const emitChange = (dateISO) => {
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          id,
          value: dateISO,
        },
      });
    }
  };

  const handleSelectDate = (date) => {
    const iso = formatDateToISO(date);
    emitChange(iso);
    setIsOpen(false);
    setViewMode('days');
    if (onBlur) {
      onBlur({ target: { name, id, value: iso } });
    }
  };

  const handleSelectToday = () => {
    const now = new Date();
    setNavYear(now.getFullYear());
    setNavMonth(now.getMonth());
    handleSelectDate(now);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emitChange('');
    if (onBlur) {
      onBlur({ target: { name, id, value: '' } });
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  const handlePrevYear = () => setNavYear((y) => y - 1);
  const handleNextYear = () => setNavYear((y) => y + 1);

  // Compute grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(navYear, navMonth, 1);
    const lastDayOfMonth = new Date(navYear, navMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Prev month trailing days
    const prevMonthLastDay = new Date(navYear, navMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const date = new Date(navYear, navMonth - 1, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
        iso: formatDateToISO(date),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(navYear, navMonth, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        iso: formatDateToISO(date),
      });
    }

    // Next month leading days to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(navYear, navMonth + 1, d);
      days.push({
        date,
        dayNum: d,
        isCurrentMonth: false,
        iso: formatDateToISO(date),
      });
    }

    return days;
  }, [navYear, navMonth]);

  // Year picker range (decade centered on navYear)
  const yearRangeStart = Math.floor(navYear / 12) * 12;
  const yearOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      list.push(yearRangeStart + i);
    }
    return list;
  }, [yearRangeStart]);

  const isSelected = (iso) => value === iso;
  const isToday = (iso) => todayISO === iso;

  const isDateDisabled = (iso) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-text leading-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
          </span>
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
              setIsOpen((prev) => !prev);
              setViewMode('days');
            }
          }}
          className={[
            'w-full flex items-center justify-between rounded-lg border bg-bg text-text text-sm text-left',
            'px-3 py-2.5 leading-snug cursor-pointer select-none transition-all duration-150',
            hasError
              ? 'border-danger focus:ring-danger/20 focus:border-danger'
              : isOpen
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-text-muted',
            disabled ? 'opacity-50 cursor-not-allowed bg-surface/50' : '',
            className,
          ].filter(Boolean).join(' ')}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-invalid={hasError ? 'true' : undefined}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <CalendarIcon
              size={16}
              className={`shrink-0 transition-colors ${
                isOpen || value ? 'text-primary' : 'text-text-muted'
              }`}
            />
            {value ? (
              <span className="font-mono tabular-nums text-heading font-medium truncate">
                {formatDisplayDate(value)}
                <span className="text-xs text-text-muted font-normal ml-2 hidden sm:inline">
                  ({value})
                </span>
              </span>
            ) : (
              <span className="text-text-muted truncate">{placeholder}</span>
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
                title="Clear date"
              >
                <X size={14} />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Field Error / Hint */}
      {hasError && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger flex items-center gap-1">
          {error}
        </p>
      )}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}

      {/* Calendar Portal Popover */}
      {isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
          className="bg-bg border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 select-none text-text"
          role="dialog"
          aria-label="Calendar date picker"
        >
          {/* Calendar Header */}
          <div className="p-3 bg-surface/80 border-b border-border flex items-center justify-between gap-1">
            {viewMode === 'days' ? (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    title="Previous year"
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Previous month"
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('months')}
                    className="px-2 py-1 text-xs font-bold text-heading hover:bg-surface rounded-md border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    {MONTH_NAMES[navMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('years')}
                    className="px-2 py-1 text-xs font-bold font-mono text-heading hover:bg-surface rounded-md border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    {navYear}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title="Next month"
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    title="Next year"
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                  >
                    <ChevronsRight size={15} />
                  </button>
                </div>
              </>
            ) : viewMode === 'months' ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-heading px-2">Select Month</span>
                <button
                  type="button"
                  onClick={() => setViewMode('days')}
                  className="p-1 text-xs font-medium text-text-muted hover:text-heading hover:bg-surface rounded-md cursor-pointer"
                >
                  Back to Days
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNavYear((y) => y - 12)}
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs font-bold font-mono text-heading px-1">
                    {yearRangeStart} – {yearRangeStart + 11}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNavYear((y) => y + 12)}
                    className="p-1 rounded-md text-text-muted hover:text-heading hover:bg-surface cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('days')}
                  className="p-1 text-xs font-medium text-text-muted hover:text-heading hover:bg-surface rounded-md cursor-pointer"
                >
                  Back
                </button>
              </div>
            )}
          </div>

          {/* Calendar Body */}
          <div className="p-3">
            {viewMode === 'days' && (
              <div>
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {DAY_NAMES.map((d, i) => (
                    <div
                      key={d}
                      className={`text-[11px] font-bold py-1 ${
                        i === 0 || i === 6 ? 'text-primary/80' : 'text-text-muted'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((item, idx) => {
                    const selected = isSelected(item.iso);
                    const currentDay = isToday(item.iso);
                    const disabledDay = isDateDisabled(item.iso);

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={disabledDay}
                        onClick={() => handleSelectDate(item.date)}
                        className={[
                          'h-8 w-full rounded-lg text-xs font-mono tabular-nums flex items-center justify-center transition-all cursor-pointer relative',
                          selected
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : currentDay
                            ? 'bg-primary/10 text-primary font-bold border border-primary/40 hover:bg-primary/20'
                            : item.isCurrentMonth
                            ? 'text-heading hover:bg-surface'
                            : 'text-text-muted/40 hover:bg-surface/50 hover:text-text-muted',
                          disabledDay ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {item.dayNum}
                        {currentDay && !selected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'months' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {SHORT_MONTH_NAMES.map((m, idx) => {
                  const isCurrentMonth = navMonth === idx;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setNavMonth(idx);
                        setViewMode('days');
                      }}
                      className={`py-2 px-1 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                        isCurrentMonth
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'text-heading hover:bg-surface border border-transparent hover:border-border'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {viewMode === 'years' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {yearOptions.map((y) => {
                  const isCurrentYear = navYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setNavYear(y);
                        setViewMode('months');
                      }}
                      className={`py-2 px-1 rounded-lg text-xs font-mono font-medium text-center transition-all cursor-pointer ${
                        isCurrentYear
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'text-heading hover:bg-surface border border-transparent hover:border-border'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Quick Actions */}
          <div className="p-2 bg-surface/50 border-t border-border flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Today</span>
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
