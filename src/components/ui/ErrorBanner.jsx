/**
 * ErrorBanner — notification banner for errors, warnings, and alerts.
 *
 * Props:
 *   message: string | null  — when falsy, renders nothing
 *   onDismiss: () => void   — optional dismiss callback
 *   variant?: 'danger' | 'warning' | 'info' | 'success' (default: 'danger')
 */

import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

const VARIANT_STYLES = {
  danger: {
    container: 'border-danger/30 bg-danger/10 text-danger',
    icon: AlertCircle,
    dismiss: 'text-danger/70 hover:text-danger hover:bg-danger/10 focus-visible:outline-danger',
  },
  warning: {
    container: 'border-warning/30 bg-warning/10 text-warning',
    icon: AlertTriangle,
    dismiss: 'text-warning/70 hover:text-warning hover:bg-warning/10 focus-visible:outline-warning',
  },
  info: {
    container: 'border-primary/30 bg-primary/10 text-primary',
    icon: Info,
    dismiss: 'text-primary/70 hover:text-primary hover:bg-primary/10 focus-visible:outline-primary',
  },
  success: {
    container: 'border-success/30 bg-success/10 text-success',
    icon: CheckCircle2,
    dismiss: 'text-success/70 hover:text-success hover:bg-success/10 focus-visible:outline-success',
  },
};

export default function ErrorBanner({ message, onDismiss, variant = 'danger' }) {
  if (!message) return null;

  const currentVariant = VARIANT_STYLES[variant] || VARIANT_STYLES.danger;
  const Icon = currentVariant.icon;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-start gap-3 rounded-xl px-4 py-3 border',
        currentVariant.container,
        'text-sm leading-snug',
      ].join(' ')}
    >
      <Icon
        size={17}
        className="shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 font-medium">{message}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className={[
            'shrink-0 rounded p-0.5',
            currentVariant.dismiss,
            'transition-colors duration-150 cursor-pointer',
          ].join(' ')}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
