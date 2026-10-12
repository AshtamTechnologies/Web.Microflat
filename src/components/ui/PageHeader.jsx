/**
 * PageHeader — standard responsive top header for ERP pages.
 *
 * Props:
 *   title:       ReactNode | string
 *   subtitle?:   ReactNode | string
 *   actions?:    ReactNode
 *   badge?:      ReactNode
 *   icon?:       ReactNode | React.ComponentType
 *   backButton?: ReactNode | { onClick: () => void, label?: string }
 *   className?:  string
 *   children?:   ReactNode (rendered in actions if actions prop not provided)
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  icon,
  backButton,
  className = '',
  children,
}) {
  const actionsContent = actions || children;

  // Support both React elements (<Inbox />) and component types (Inbox)
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent size={24} className="text-primary shrink-0" aria-hidden="true" />;
    }
    return null;
  };

  // Support both React elements (<Link /> / <Button />) and config objects ({ onClick, label })
  const renderBackButton = () => {
    if (!backButton) return null;
    if (React.isValidElement(backButton)) {
      return backButton;
    }
    if (typeof backButton === 'object' && backButton.onClick) {
      return (
        <button
          type="button"
          onClick={backButton.onClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer shrink-0"
        >
          <ArrowLeft
            size={14}
            className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform shrink-0"
            aria-hidden="true"
          />
          <span>{backButton.label || 'Back'}</span>
        </button>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {backButton && (
        <div className="flex items-center">
          {renderBackButton()}
        </div>
      )}
      <div className="mf-page-header">
        <div className="min-w-0 flex-1">
          <h1 className="mf-page-title">
            {renderIcon()}
            <span className="truncate">{title}</span>
            {badge}
          </h1>
          {subtitle && <p className="mf-page-subtitle">{subtitle}</p>}
        </div>

        {actionsContent && (
          <div className="mf-page-actions shrink-0">
            {actionsContent}
          </div>
        )}
      </div>
    </div>
  );
}
