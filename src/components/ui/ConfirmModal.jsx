/**
 * ConfirmModal — Reusable system confirmation dialog for destructive and high-impact actions.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onConfirm: () => void | Promise<void>
 *   title?: string (default: 'Confirm Action')
 *   message?: ReactNode (descriptive confirmation body)
 *   confirmText?: string (default: 'Delete')
 *   cancelText?: string (default: 'Cancel')
 *   variant?: 'danger' | 'warning' | 'primary' (default: 'danger')
 *   icon?: React.ComponentType (default: AlertTriangle for danger/warning, HelpCircle for primary)
 *   loading?: boolean
 *   maxWidth?: string (default: 'max-w-md')
 */

import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const iconVariants = {
  danger: 'bg-danger/10 text-danger border border-danger/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  primary: 'bg-primary/10 text-primary border border-primary/20',
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: CustomIcon,
  loading = false,
  maxWidth = 'max-w-md',
}) {
  if (!isOpen) return null;

  const IconComponent =
    CustomIcon ||
    (variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : HelpCircle);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
    >
      <div className="space-y-4">
        {/* Visual Icon & Content */}
        <div className="flex items-start gap-4">
          <div
            className={[
              'w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-2xs',
              iconVariants[variant] || iconVariants.danger,
            ].join(' ')}
          >
            <IconComponent size={20} aria-hidden="true" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-heading leading-snug">
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'primary' ? 'primary' : 'danger'}
            size="md"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
