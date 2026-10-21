/**
 * CollapsibleCard.jsx — Centralized collapsible card container for form sections.
 *
 * Provides a standardized header with icon, title, subtitle, badges/actions,
 * and an animated toggle chevron. Supports controlled and uncontrolled open state,
 * and auto-expands if validation errors are detected.
 */

import { useState, useEffect } from 'react';
import Card from './Card';
import { IconChevronDown } from '../../constants/icons';

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export default function CollapsibleCard({
  title,
  subtitle,
  icon,
  badge,
  actions,
  defaultOpen = true,
  isOpen,
  onToggle,
  hasError = false,
  collapsible = true,
  padding = 'md',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;

  // Auto-expand if an error is present inside this section
  useEffect(() => {
    if (hasError && !open) {
      if (isControlled) {
        onToggle?.(true);
      } else {
        setInternalOpen(true);
      }
    }
  }, [hasError, open, isControlled, onToggle]);

  const handleToggle = () => {
    if (!collapsible) return;
    const nextState = !open;
    if (isControlled) {
      onToggle?.(nextState);
    } else {
      setInternalOpen(nextState);
    }
  };

  return (
    <Card padding="none" className={`overflow-hidden transition-shadow ${className}`} {...rest}>
      {/* ── Section Header ── */}
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? open : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleToggle();
          }
        }}
        onClick={handleToggle}
        className={[
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 sm:py-4 select-none',
          collapsible ? 'cursor-pointer hover:bg-surface-hover/40 transition-colors' : '',
          open ? 'border-b border-border' : '',
          headerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-heading leading-snug">{title}</h2>
              {hasError && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-danger/10 text-danger border border-danger/20">
                  Errors inside
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Badges, Actions & Chevron */}
        <div
          className="flex items-center gap-2.5 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          {badge}
          {actions}
          {collapsible && (
            <button
              type="button"
              onClick={handleToggle}
              aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-heading hover:bg-border/40 transition-colors focus:outline-none"
            >
              <IconChevronDown
                size={18}
                className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Section Body ── */}
      {open && (
        <div className={[paddingClasses[padding], bodyClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      )}
    </Card>
  );
}
