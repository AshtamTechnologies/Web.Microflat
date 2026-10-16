import { IconClose } from '../../constants/icons';
import Button from './Button';

/**
 * CancelButton — Centralized Cancel Action Button.
 *
 * Centralizes the Cancel button styling (secondary), action type ('button'),
 * icon (IconClose), and default text ('Cancel') across the entire application.
 * Sized and spaced by CSS.
 *
 * Props:
 *   label?: string
 *   icon?: React.ComponentType | null (default: IconClose)
 *   iconSize?: number (accepted but ignored for backward compatibility)
 *   iconClassName?: string (accepted but ignored for backward compatibility)
 *   iconRight?: React.ComponentType | React.ReactNode
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
  icon: Icon = IconClose,
  iconSize: _iconSize, // accepted but ignored for backward compatibility
  iconClassName: _iconClassName, // accepted but ignored for backward compatibility
  iconRight,
  showIcon = true,
  variant = 'secondary',
  type = 'button',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  ...rest
}) {
  void _iconSize; void _iconClassName;
  const content = children ?? label ?? 'Cancel';

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
      icon={showIcon ? Icon : undefined}
      iconRight={iconRight}
      {...rest}
    >
      {content}
    </Button>
  );
}
