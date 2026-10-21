/**
 * IconPicker.jsx — Searchable icon grid picker component.
 *
 * Props:
 *   - label: string
 *   - value: string (selected iconKey)
 *   - onChange: function(newKey)
 *   - icons: Array<{ key: string, label: string, icon: ComponentType }> (defaults to FLOW_ICON_OPTIONS)
 *   - error?: string
 *   - hint?: string
 *   - required?: boolean
 *   - disabled?: boolean
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { FLOW_ICON_OPTIONS, getFlowIcon } from '../../constants/processFlowIcons';
import { IconSearch, IconChevronDown, IconClose } from '../../constants/icons';

export default function IconPicker({
  label = 'Icon',
  value = '',
  onChange,
  icons = FLOW_ICON_OPTIONS,
  error = null,
  hint = null,
  required = false,
  disabled = false,
  id = 'icon-picker',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter(
      (item) => item.key.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
    );
  }, [icons, search]);

  const SelectedIcon = getFlowIcon(value);
  const selectedItem = icons.find((item) => item.key === value);

  const handleSelect = (key) => {
    onChange?.(key);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="mf-label">
          {label}
          {required && (
            <span className="mf-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={[
          'w-full rounded-control border bg-bg text-left h-[var(--control-height-md)] text-sm px-3 flex items-center justify-between',
          'transition-all duration-150 ease-in-out cursor-pointer outline-none select-none',
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
            : error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-border hover:border-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SelectedIcon size={14} />
          </div>
          <span className="truncate text-heading font-medium text-xs">
            {selectedItem?.label || value || 'Select an icon...'}
          </span>
          {value && (
            <span className="text-2xs font-mono text-text-muted truncate">({value})</span>
          )}
        </div>
        <IconChevronDown
          size={16}
          className={`text-text-muted transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Grid */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-bg border border-border rounded-xl shadow-dropdown p-3 space-y-3 animate-in fade-in duration-100">
          {/* Search Box */}
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons..."
              autoFocus
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading"
                aria-label="Clear search"
              >
                <IconClose size={12} />
              </button>
            )}
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredIcons.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-text-muted">
                No icons match &quot;{search}&quot;
              </div>
            ) : (
              filteredIcons.map(({ key, label: iconLabel, icon: IconComponent }) => {
                const isSelected = value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelect(key)}
                    title={`${iconLabel} (${key})`}
                    className={[
                      'flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border text-center transition-all cursor-pointer group',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/10 text-primary'
                        : 'border-border/60 hover:border-primary/40 hover:bg-surface text-text',
                    ].join(' ')}
                  >
                    <IconComponent
                      size={18}
                      className={isSelected ? 'text-primary' : 'text-text group-hover:text-primary'}
                    />
                    <span className="text-3xs text-text-muted font-mono truncate w-full">
                      {key}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {!error && hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
