import React from 'react';
import { Save,SavePlus } from 'lucide-react';
import Button from './Button';

/**
 * SaveButton — Centralized Save Action Button.
 *
 * Centralizes the Save icon, loading state, default variant ('primary'),
 * and default type ('submit') across the entire application.
 * Changing the Save icon or behavior here updates all pages automatically from ONE place.
 *
 * Props:
 *   label?: string
 *   icon?: React.ComponentType | null
 *   iconSize?: number (default: 16)
 *   iconClassName?: string (default: 'mr-1.5 shrink-0')
 *   showIcon?: boolean (default: true)
 *   loading?: boolean (default: false)
 *   loadingText?: string
 *   variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' (default: 'primary')
 *   size?: 'sm' | 'md' | 'lg' | 'icon' (default: 'md')
 *   type?: 'submit' | 'button' (default: 'submit')
 *   children?: ReactNode
 *   ...rest: standard Button attrs
 */
export default function SaveButton({
  children,
  label,
  icon: Icon = SavePlus,
  iconSize = 16,
  iconClassName = 'mr-1.5 shrink-0',
  showIcon = true,
  loading = false,
  loadingText,
  variant = 'primary',
  type = 'submit',
  size = 'md',
  className = '',
  disabled = false,
  ...rest
}) {
  const content = children ?? label ?? 'Save';
  const displayedText = loading && loadingText ? loadingText : content;

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {!loading && showIcon && Icon && (
        <Icon size={iconSize} className={iconClassName} aria-hidden="true" />
      )}
      {displayedText}
    </Button>
  );
}
