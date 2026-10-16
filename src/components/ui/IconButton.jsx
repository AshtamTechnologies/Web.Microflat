import React, { forwardRef } from 'react';
import Button from './Button';

/**
 * IconButton — accessible, standardized icon-only action button.
 *
 * Sizing rules:
 *   - 'sm': 32px (h-8 w-8 / mf-btn--sm)
 *   - 'md': 40px (h-10 w-10 / mf-btn--md)
 *   - 'lg': 44px (h-11 w-11 / mf-btn--lg)
 *
 * Props:
 *   - icon: React component or element
 *   - aria-label / title: required for accessible screen-reader name
 *   - variant: standard Button variants ('primary'|'secondary'|'danger'|'ghost'|'outline')
 *   - size: 'sm' | 'md' | 'lg'
 */
const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    children,
    size = 'md',
    variant = 'ghost',
    className = '',
    'aria-label': ariaLabel,
    title,
    ...rest
  },
  ref
) {
  const accessibleName = ariaLabel || title;

  return (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-label={accessibleName}
      title={title || ariaLabel}
      className={`${size === 'sm' ? 'mf-btn--sm !h-8 !w-8' : size === 'lg' ? 'mf-btn--lg !h-11 !w-11' : '!h-10 !w-10'} ${className}`}
      {...rest}
    >
      {Icon ? (React.isValidElement(Icon) ? Icon : <Icon aria-hidden="true" />) : children}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
