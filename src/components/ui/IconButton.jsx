/**
 * IconButton — square icon action button.
 *
 * Props:
 *   icon:        React.ReactNode | React.ComponentType
 *   ariaLabel:   string (or aria-label)
 *   variant?:    'primary' | 'secondary' | 'danger' | 'ghost' (default 'ghost')
 *   size?:       'sm' | 'md' | 'lg' (default 'md')
 *   title?:      string
 *   className?:  string
 *   disabled?:   boolean
 *   loading?:    boolean
 *   onClick?:    (e) => void
 */

import React from 'react';
import Button from './Button';

export default function IconButton({
  icon,
  ariaLabel,
  'aria-label': ariaLabelProp,
  variant = 'ghost',
  size = 'md',
  title,
  className = '',
  children,
  ...rest
}) {
  const label = ariaLabel || ariaLabelProp || title;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComponent = icon;
      return <IconComponent size={iconSize} aria-hidden="true" />;
    }
    return null;
  };

  return (
    <Button
      variant={variant}
      size="icon"
      aria-label={label}
      title={title || label}
      className={[
        size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {renderIcon() || children}
    </Button>
  );
}
