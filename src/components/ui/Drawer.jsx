/**
 * Drawer — accessible slide-over panel from the right edge with Enterprise design standards.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   title: ReactNode | string
 *   subtitle?: string
 *   icon?: React.ComponentType | ReactNode
 *   children: ReactNode
 *   footer?: ReactNode
 *   size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 *   maxWidth?: string (default derived from size or 'max-w-2xl')
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  full: 'max-w-5xl',
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: IconComponent,
  children,
  footer,
  size = 'lg',
  maxWidth,
}) {
  const overlayRef = useRef(null);

  const effectiveMaxWidth =
    maxWidth || (size ? SIZE_CLASSES[size] || size : 'max-w-2xl');

  // Close on Escape key press and prevent background scrolling
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const drawerNode = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        className={[
          'w-full h-full bg-bg border-l border-border shadow-2xl',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-200 ease-out',
          effectiveMaxWidth,
        ].join(' ')}
      >
        {/* Enterprise Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {IconComponent && (
              <div className="w-8 h-8 rounded-control bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {React.isValidElement(IconComponent) ? (
                  IconComponent
                ) : (
                  <IconComponent size={18} aria-hidden="true" />
                )}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="drawer-title"
                className="text-base sm:text-lg font-bold text-heading tracking-tight truncate leading-snug"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-text-muted mt-0.5 truncate leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className={[
              'p-1.5 rounded-control text-text-muted hover:text-heading hover:bg-surface',
              'transition-colors duration-150 focus-ring cursor-pointer shrink-0',
            ].join(' ')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content container with smooth scrolling */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {children}
        </div>

        {/* Sticky Footer Actions */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-border bg-surface/60 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerNode, document.body)
    : drawerNode;
};


