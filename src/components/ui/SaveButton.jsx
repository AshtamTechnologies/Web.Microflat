import { IconSave } from '../../constants/icons';
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
 *   iconSize?: number (accepted but ignored for backward compatibility)
 *   iconClassName?: string (accepted but ignored for backward compatibility)
 *   iconRight?: React.ComponentType | React.ReactNode
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
  icon: Icon = IconSave,
  iconSize: _iconSize, // accepted but ignored for backward compatibility
  iconClassName: _iconClassName, // accepted but ignored for backward compatibility
  iconRight,
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
  void _iconSize; void _iconClassName;
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
      icon={showIcon ? Icon : undefined}
      iconRight={iconRight}
      {...rest}
    >
      {displayedText}
    </Button>
  );
}
