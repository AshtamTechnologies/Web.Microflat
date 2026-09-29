/**
 * ErrorBanner — top-of-form error notification.
 *
 * Props:
 *   message: string | null  — when falsy, renders nothing
 *   onDismiss: () => void   — optional dismiss callback
 */

import { AlertCircle, X } from 'lucide-react';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-start gap-3 rounded-lg px-4 py-3',
        'border border-danger/30 bg-danger/8 text-danger',
        'text-sm leading-snug',
      ].join(' ')}
    >
      <AlertCircle
        size={16}
        className="shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className={[
            'shrink-0 rounded p-0.5 text-danger/70',
            'hover:text-danger hover:bg-danger/10',
            'transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-danger',
          ].join(' ')}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
