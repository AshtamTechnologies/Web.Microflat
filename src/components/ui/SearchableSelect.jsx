/**
 * SearchableSelect — Custom searchable dropdown combobox using React Portal.
 *
 * Features:
 *   - Synchronous layout measurement to prevent any position glitch on first open.
 *   - Renders outside the popup/modal into document.body via createPortal.
 *   - Live search filter with instant clear.
 *   - Keyboard navigation (Arrow keys, Enter, Escape).
 *   - Click-outside dismiss.
 *   - Strictly theme tokens.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function SearchableSelect({
  label,
  id,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found',
  required = false,
  error = null,
  hint = null,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState(null);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const hasError = Boolean(error);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) =>
      String(opt.label || '').toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  // Measure trigger element and update fixed coordinates synchronously
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Synchronously compute coords BEFORE paint
  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  // Handle open state lifecycle (reset search, auto-focus, attach scroll/resize listeners)
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const selectedIdx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);

      const handleScrollResize = () => updateCoords();
      window.addEventListener('resize', handleScrollResize);
      window.addEventListener('scroll', handleScrollResize, true);

      // Auto-focus search input
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleScrollResize);
        window.removeEventListener('scroll', handleScrollResize, true);
      };
    } else {
      setCoords(null);
    }
  }, [isOpen, updateCoords, options, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      const clickedTrigger = triggerRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedDropdown) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.({ target: { name, value } });
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur, name, value]);

  function handleOpen() {
    if (disabled) return;
    updateCoords();
    setIsOpen((prev) => !prev);
  }

  function handleSelect(optionValue) {
    onChange?.({
      target: {
        name,
        value: optionValue,
      },
    });
    setIsOpen(false);
  }

  function handleTriggerKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      updateCoords();
      setIsOpen(true);
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  }

  return (
    <div className="flex flex-col gap-1.5 relative">
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-heading leading-none"
        >
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleOpen}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'w-full rounded-lg border bg-bg text-left text-sm',
          'px-3 py-2.5 flex items-center justify-between',
          'transition-all duration-150 ease-in-out cursor-pointer',
          'outline-none select-none',
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
            : hasError
            ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
            : 'border-border hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={
            selectedOption
              ? 'text-heading font-medium truncate'
              : 'text-text-muted truncate'
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <span className="flex items-center gap-1.5 text-text-muted shrink-0 ml-2">
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={[
              'transition-transform duration-200 ease-in-out',
              isOpen ? 'rotate-180 text-primary' : '',
            ].join(' ')}
          />
        </span>
      </button>

      {/* Portal Dropdown Menu: Only rendered once valid coordinates are calculated */}
      {isOpen &&
        coords &&
        coords.width > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-bg border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100"
          >
            {/* Search box inside dropdown */}
            <div className="p-2 border-b border-border bg-surface/60 flex items-center gap-2">
              <Search size={14} className="text-text-muted shrink-0 ml-1" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-heading placeholder:text-text-muted outline-none py-0.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded text-text-muted hover:text-text cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              className="max-h-52 overflow-y-auto p-1 space-y-0.5"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-text-muted">
                  {emptyText}
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={[
                        'px-3 py-2 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : isHighlighted
                          ? 'bg-surface text-heading'
                          : 'text-text hover:bg-surface/70',
                      ].join(' ')}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check
                          size={15}
                          strokeWidth={2.5}
                          className="text-primary shrink-0 ml-2"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}

      {/* Field-level error */}
      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-danger flex items-center gap-1"
        >
          {error}
        </p>
      )}

      {/* Hint text */}
      {!hasError && hint && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
