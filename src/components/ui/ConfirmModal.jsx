/**
 * ConfirmModal — Reusable system confirmation dialog for destructive and high-impact actions.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onConfirm: () => void | Promise<void>
 *   title?: string (default: 'Confirm Action')
 *   message?: ReactNode (or description prop)
 *   description?: ReactNode
 *   children?: ReactNode
 *   confirmText?: string (default: 'Confirm')
 *   cancelText?: string (default: 'Cancel')
 *   variant?: 'danger' | 'warning' | 'primary' (default: 'danger')
 *   confirmVariant?: 'danger' | 'warning' | 'primary'
 *   icon?: React.ComponentType
 *   loading?: boolean
 *   size?: 'sm' | 'md' | 'lg'
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
  description,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  confirmVariant,
  icon: CustomIcon,
  loading = false,
  size = 'sm',
  maxWidth,
}) {
  if (!isOpen) return null;

  const effectiveVariant = confirmVariant || variant;
  const content = message || description || children;

  const IconComponent =
    CustomIcon ||
    (effectiveVariant === 'danger'
      ? Trash2
      : effectiveVariant === 'warning'
      ? AlertTriangle
      : HelpCircle);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      maxWidth={maxWidth}
    >
      <div className="space-y-4">
        {/* Visual Icon & Content */}
        <div className="flex items-start gap-3.5">
          <div
            className={[
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
              iconVariants[effectiveVariant] || iconVariants.danger,
            ].join(' ')}
          >
            <IconComponent size={20} aria-hidden="true" />
          </div>
          <div className="space-y-1 flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-heading leading-snug">
              {title}
            </h3>
            {content && (
              <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {content}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
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
            variant={effectiveVariant === 'primary' ? 'primary' : 'danger'}
            size="md"
            loading={loading}
            disabled={loading}
            onClick={async (e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              if (onConfirm) {
                await onConfirm();
              }
              onClose?.();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
