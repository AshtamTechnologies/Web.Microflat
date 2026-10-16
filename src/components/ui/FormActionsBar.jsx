import SaveButton from './SaveButton';
import CancelButton from './CancelButton';

/**
 * FormActionsBar — Standardized sticky bottom action bar for full-page forms.
 *
 * Features:
 * - Sticky bottom respecting safe-area-inset-bottom
 * - Cancel on the left of Save, right-aligned on desktop
 * - Mobile stacked and full width with Save on top
 * - Safe padding so form contents are never covered
 */
export default function FormActionsBar({
  onSave,
  onCancel,
  saveText = 'Save',
  cancelText = 'Cancel',
  saveLoading = false,
  saveDisabled = false,
  cancelDisabled = false,
  saveVariant = 'primary',
  saveIcon,
  cancelIcon,
  form, // optional form id to link submit button to form
  children,
  className = '',
  leftContent,
}) {
  return (
    <div
      className={`sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-8 px-4 py-3 sm:px-6 bg-surface/95 backdrop-blur-xs border-t border-border shadow-xs ${className}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {leftContent}
        </div>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          {children ? (
            children
          ) : (
            <>
              {onCancel && (
                <CancelButton
                  onClick={onCancel}
                  disabled={cancelDisabled || saveLoading}
                  label={cancelText}
                  icon={cancelIcon}
                  className="w-full sm:w-auto"
                />
              )}
              <SaveButton
                onClick={onSave}
                form={form}
                type={onSave ? 'button' : 'submit'}
                loading={saveLoading}
                disabled={saveDisabled}
                label={saveText}
                icon={saveIcon}
                variant={saveVariant}
                className="w-full sm:w-auto"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

