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
    container: 'border-danger-border bg-danger-bg text-danger',
    icon: AlertCircle,
    dismiss: 'text-danger/70 hover:text-danger hover:bg-danger/10 focus-visible:outline-danger',
  },
  warning: {
    container: 'border-warning-border bg-warning-bg text-warning',
    icon: AlertTriangle,
    dismiss: 'text-warning/70 hover:text-warning hover:bg-warning/10 focus-visible:outline-warning',
  },
  info: {
    container: 'border-info-border bg-info-bg text-info',
    icon: Info,
    dismiss: 'text-info/70 hover:text-info hover:bg-info/10 focus-visible:outline-primary',
  },
  success: {
    container: 'border-success-border bg-success-bg text-success',
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
        'flex items-start gap-3 rounded-control px-4 py-3 border',
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
            'shrink-0 rounded-control p-0.5',
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
