/**
 * EmptyState — standard zero-data state placeholder.
 *
 * Props:
 *   icon?:        React.ReactNode | React.ComponentType
 *   title:        ReactNode | string
 *   description?: ReactNode | string
 *   action?:      ReactNode
 *   className?:   string
 *   children?:    ReactNode
 */

import React from 'react';

export default function EmptyState({
  icon,
  title = 'No records found',
  description,
  action,
  className = '',
  children,
}) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent size={24} aria-hidden="true" />;
    }
    return null;
  };

  return (
    <div className={`mf-empty-state ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-control bg-surface border border-border flex items-center justify-center text-text-muted">
          {renderIcon()}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
        {description && (
          <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {(action || children) && (
        <div className="mt-2 flex items-center gap-2">
          {action || children}
        </div>
      )}
    </div>
  );
}
