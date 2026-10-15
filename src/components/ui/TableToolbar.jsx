import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import Input from './Input';
import Button from './Button';

/**
 * TableToolbar — Standard responsive toolbar for tables.
 * Houses a search input, custom filter controls (selects, tabs), and an optional Reset button.
 *
 * Props:
 *   searchValue: string
 *   onSearchChange: (value: string) => void
 *   searchPlaceholder?: string
 *   hasActiveFilters?: boolean
 *   onReset?: () => void
 *   resetLabel?: string
 *   children?: React.ReactNode (extra filters like SearchableSelect, dropdowns, etc.)
 *   className?: string
 */
export default function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  hasActiveFilters = false,
  onReset,
  resetLabel = 'Reset',
  children,
  className = '',
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-3 sm:p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 ${className}`}
    >
      {/* Left side: Search & Custom Filter Controls */}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0">
        {onSearchChange !== undefined && (
          <div className="w-full sm:w-64 md:w-72 shrink-0">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search size={16} aria-hidden="true" />}
              className="w-full text-xs"
            />
          </div>
        )}

        {/* Custom filter dropdowns or select controls */}
        {children && (
          <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
            {children}
          </div>
        )}
      </div>

      {/* Right side: Reset Filters action */}
      {hasActiveFilters && onReset && (
        <div className="shrink-0 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-text-muted hover:text-danger h-9 px-3 gap-1.5 border border-dashed border-border hover:border-danger/40 transition-colors"
            title="Clear all search criteria and filters"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>{resetLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
