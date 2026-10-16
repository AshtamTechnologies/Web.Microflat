import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * CancelButton — Centralized Cancel Action Button.
 *
 * Centralizes the Cancel button styling (secondary), action type ('button'),
 * icon (X), and default text ('Cancel') across the entire application.
 * Changing the Cancel button styling, icon, or behavior here updates all pages
 * automatically from ONE place.
 *
 * Props:
 *   label?: string
 *   icon?: React.ComponentType | null (default: X)
 *   iconSize?: number (default: 16)
 *   iconClassName?: string (default: 'mr-1.5 shrink-0')
 *   showIcon?: boolean (default: true)
 *   variant?: 'secondary' | 'ghost' | 'danger-soft' (default: 'secondary')
 *   size?: 'sm' | 'md' | 'lg' | 'icon' (default: 'md')
 *   type?: 'button' | 'submit' (default: 'button')
 *   onClick?: (e: React.MouseEvent) => void
 *   children?: ReactNode
 *   ...rest: standard Button attrs
 */
export default function CancelButton({
  children,
  label,
  icon: Icon = X,
  iconSize = 16,
  iconClassName = 'mr-1.5 shrink-0',
  showIcon = true,
  variant = 'secondary',
  type = 'button',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  ...rest
}) {
  const content = children ?? label ?? 'Cancel';

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {showIcon && Icon && (
        <Icon size={iconSize} className={iconClassName} aria-hidden="true" />
      )}
      {content}
    </Button>
  );
}
