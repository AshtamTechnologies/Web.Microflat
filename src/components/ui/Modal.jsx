/**
 * Modal — accessible dialog popup overlay with theme styling.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   title: string
 *   children: ReactNode
 *   maxWidth?: string (default: 'max-w-2xl')
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) {
  const overlayRef = useRef(null);

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
          'w-full bg-bg border border-border rounded-2xl shadow-2xl',
          'flex flex-col max-h-[92vh] overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-150',
          maxWidth,
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-bg shrink-0">
          <h2
            id="modal-title"
            className="text-lg sm:text-xl font-bold text-heading tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={[
              'p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface',
              'transition-colors duration-150 focus-ring',
            ].join(' ')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content container with smooth scrolling */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
