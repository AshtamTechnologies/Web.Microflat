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
  icon: Icon,
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
  const hasContent = value !== undefined && value !== null && value !== '' && value !== false;

  const renderContent = () => {
    if (children) {
      return children;
    }

    if (!hasContent) {
      return <span className="text-text-muted">{emptyText}</span>;
    }

    if (isEmail && typeof value === 'string') {
      return (
        <a
          href={`mailto:${value}`}
          className="font-medium text-primary hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
        >
          {Icon && <Icon size={14} className="shrink-0 text-primary/80" />}
          <span className="truncate">{value}</span>
        </a>
      );
    }

    if (isPhone && typeof value === 'string') {
      return (
        <a
          href={`tel:${value}`}
          className={`font-medium text-heading hover:text-primary hover:underline inline-flex items-center gap-1.5 ${
            mono ? 'font-mono tabular-nums' : ''
          }`}
        >
          {Icon && <Icon size={14} className="shrink-0 text-text-muted" />}
          <span>{value}</span>
        </a>
      );
    }

    if (isLink) {
      const targetHref = href || (typeof value === 'string' ? value : '');
      const fullHref = targetHref.startsWith('http') ? targetHref : `https://${targetHref}`;
      return (
        <a
          href={fullHref}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {Icon && <Icon size={14} className="shrink-0" />}
          <span>{value}</span>
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
        {Icon && <Icon size={14} className="shrink-0 text-text-muted" />}
        <span className="break-words">{value}</span>
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
