/**
 * SearchableMultiSelect — Searchable multi-selection dropdown combobox using React Portal.
 *
 * Features:
 *   - Synchronous layout measurement for perfect portal positioning.
 *   - Live search filter with clear query button.
 *   - Multiple item selection with badge chips and counter.
 *   - Select All / Clear All quick actions.
 *   - Checkbox next to each option for clear UX.
 *   - Remove tag chips directly from trigger.
 *   - Keyboard navigation and click-outside dismiss.
 *   - Strictly theme tokens compliant.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export default function SearchableMultiSelect({
  label,
  id,
  name,
  value = [], // array of selected values e.g. ['Admin', 'Supervisor']
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select options...',
  searchPlaceholder = 'Search options...',
  emptyText = 'No options found',
  required = false,
  error = null,
  hint = null,
  disabled = false,
  maxDisplayTags = 2,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState(null);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const hasError = Boolean(error);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

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

  // Sync coords on window resize or scroll
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
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
  }, [isOpen, updateCoords]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      const clickedTrigger = triggerRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedDropdown) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.({ target: { name, value: selectedValues } });
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur, name, selectedValues]);

  function handleOpen() {
    if (disabled) return;
    updateCoords();
    setIsOpen((prev) => !prev);
  }

  function handleToggleOption(optVal, e) {
    e?.stopPropagation();
    let nextValues;
    if (selectedValues.includes(optVal)) {
      nextValues = selectedValues.filter((v) => v !== optVal);
    } else {
      nextValues = [...selectedValues, optVal];
    }

    onChange?.({
      target: {
        name,
        value: nextValues,
      },
    });
  }

  function handleRemoveTag(optVal, e) {
    e.stopPropagation();
    const nextValues = selectedValues.filter((v) => v !== optVal);
    onChange?.({
      target: {
        name,
        value: nextValues,
      },
    });
  }


  function handleClearAll(e) {
    e.stopPropagation();
    onChange?.({
      target: {
        name,
        value: [],
      },
    });
  }

  const selectedLabels = selectedValues.map(
    (v) => options.find((o) => o.value === v)?.label || v
  );

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
      <div
        ref={triggerRef}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            handleOpen();
          }
        }}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'w-full min-h-[42px] rounded-lg border bg-bg text-left text-sm',
          'px-3 py-1.5 flex items-center justify-between gap-2',
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
        {/* Selected chips or placeholder */}
        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0 py-0.5">
          {selectedValues.length === 0 ? (
            <span className="text-text-muted text-sm truncate">{placeholder}</span>
          ) : (
            <>
              {selectedValues.slice(0, maxDisplayTags).map((val) => {
                const opt = options.find((o) => o.value === val);
                const labelText = opt ? opt.label : val;
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-2 py-0.5 rounded-md leading-tight max-w-[140px] truncate"
                  >
                    <span className="truncate">{labelText}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTag(val, e)}
                      className="hover:text-danger rounded p-0.2 cursor-pointer inline-flex items-center justify-center shrink-0"
                      title={`Remove ${labelText}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                );
              })}
              {selectedValues.length > maxDisplayTags && (
                <span className="inline-flex items-center bg-surface border border-border text-text-muted text-xs font-semibold px-2 py-0.5 rounded-md">
                  +{selectedValues.length - maxDisplayTags} more
                </span>
              )}
            </>
          )}
        </div>

        {/* Chevron icon */}
        <span className="flex items-center gap-1 text-text-muted shrink-0 ml-1">
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={[
              'transition-transform duration-200 ease-in-out',
              isOpen ? 'rotate-180 text-primary' : '',
            ].join(' ')}
          />
        </span>
      </div>

      {/* Portal Dropdown Menu */}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-heading placeholder:text-text-muted outline-none py-0.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded text-text-muted hover:text-text cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Quick action helper: Selected count & Clear All */}
            {selectedValues.length > 0 && (
              <div className="px-3 py-1.5 bg-surface/30 border-b border-border/70 flex items-center justify-between text-xs text-text-muted">
                <span>{selectedValues.length} selected</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-text-muted hover:text-danger hover:underline cursor-pointer font-medium"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Options list */}
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              className="max-h-56 overflow-y-auto p-1 space-y-0.5"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-text-muted">
                  {emptyText}
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);

                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={(e) => handleToggleOption(option.value, e)}
                      className={[
                        'px-3 py-2 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors select-none',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text hover:bg-surface/70',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {/* Custom checkbox box */}
                        <span
                          className={[
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-border bg-bg',
                          ].join(' ')}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </div>
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
