/**
 * Modal — accessible dialog popup overlay with Enterprise design standards.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   title: ReactNode | string
 *   subtitle?: string
 *   icon?: React.ComponentType
 *   children: ReactNode
 *   size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 *   maxWidth?: string (default derived from size or 'max-w-2xl')
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-6xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: IconComponent,
  children,
  size,
  maxWidth,
}) {
  const overlayRef = useRef(null);

  const effectiveMaxWidth =
    maxWidth || (size ? SIZE_CLASSES[size] || size : 'max-w-2xl');

  // Close on Escape key press
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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-950/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={[
          'w-full bg-bg border border-border rounded-xl sm:rounded-2xl shadow-2xl',
          'flex flex-col max-h-[92vh] overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-150',
          effectiveMaxWidth,
        ].join(' ')}
      >
        {/* Enterprise Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-4.5 border-b border-border bg-bg shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {IconComponent && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconComponent size={18} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="modal-title"
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
            aria-label="Close dialog"
            className={[
              'p-1.5 rounded-lg text-text-muted hover:text-heading hover:bg-surface',
              'transition-colors duration-150 focus-ring cursor-pointer shrink-0',
            ].join(' ')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content container with smooth scrolling */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
