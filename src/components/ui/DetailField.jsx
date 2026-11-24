/**
 * DetailField — reusable responsive key-value display primitive for View / Detail pages.
 *
 * Props:
 *   label:          string          — field label / title
 *   value:          ReactNode       — field data value
 *   icon:           Component       — optional Lucide icon rendered beside the value
 *   mono:           boolean         — whether value should use monospace font (for codes, IDs, dates)
 *   isLink:         boolean         — renders value as an external clickable anchor
 *   href:           string          — URL for the link
 *   isEmail:        boolean         — auto creates mailto: link
 *   isPhone:        boolean         — auto creates tel: link
 *   emptyText:      string          — fallback text when value is empty (default '—')
 *   className:      string          — wrapper container classes (e.g. 'sm:col-span-2')
 *   valueClassName: string          — additional classes on the value element
 *   children:       ReactNode       — custom value content (overrides value prop)
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function DetailField({
  label,
  value,
  icon,
  mono = false,
  isLink = false,
  href = '',
  isEmail = false,
  isPhone = false,
  emptyText = '—',
  className = '',
  valueClassName = '',
  children,
}) {
  let displayValue = value;
  if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
    const parts = [
      value.addressLabel || value.addressType,
      value.address1 || value.addressLine1 || value.address,
      value.address2 || value.addressLine2,
      value.city,
      value.stateName || value.state,
      value.zipCode || value.pincode,
      value.countryName || value.country,
      value.name || value.contactPerson || value.label || value.title,
    ].filter(Boolean);
    displayValue = parts.length > 0 ? parts.join(', ') : '';
  }

  const hasContent = displayValue !== undefined && displayValue !== null && displayValue !== '' && displayValue !== false;

  const renderIcon = (extraClass = '') => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent size={14} className={`shrink-0 ${extraClass}`} />;
    }
    return null;
  };

  const renderContent = () => {
    if (children) {
      return children;
    }

    if (!hasContent) {
      return <span className="text-text-muted">{emptyText}</span>;
    }

    if (isEmail && typeof displayValue === 'string') {
      return (
        <a
          href={`mailto:${displayValue}`}
          className="font-medium text-primary hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
        >
          {renderIcon('text-primary/80')}
          <span className="truncate">{displayValue}</span>
        </a>
      );
    }

    if (isPhone && typeof displayValue === 'string') {
      return (
        <a
          href={`tel:${displayValue}`}
          className={`font-medium text-heading hover:text-primary hover:underline inline-flex items-center gap-1.5 ${
            mono ? 'font-mono tabular-nums' : ''
          }`}
        >
          {renderIcon('text-text-muted')}
          <span>{displayValue}</span>
        </a>
      );
    }

    if (isLink) {
      const targetHref = href || (typeof displayValue === 'string' ? displayValue : '');
      const fullHref = targetHref.startsWith('http') ? targetHref : `https://${targetHref}`;
      return (
        <a
          href={fullHref}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {renderIcon()}
          <span>{displayValue}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      );
    }

    return (
      <div
        className={`view-field-value mf-detail-value flex items-center gap-1.5 ${
          mono ? 'font-mono' : ''
        } ${valueClassName}`}
      >
        {renderIcon('text-text-muted')}
        <span className="break-words">{displayValue}</span>
      </div>
    );
  };

  return (
    <div className={`mf-detail-field min-w-0 ${className}`}>
      {label && <span className="view-field-label mf-detail-label">{label}</span>}
      <div className="min-w-0">{renderContent()}</div>
    </div>
  );
}
