import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  FormGrid,
  Input,
  StatusSwitch,
  SaveButton,
  CancelButton,
} from '../../../../components/ui';
import { MODULE_CODE_REGEX, FLOW_LIMITS } from '../../../../constants/processFlow';
import { IconProcessFlow } from '../../../../constants/icons';
import { processFlowService } from '../../../../services';

/**
 * FlowFormModal — Create or edit a Process Flow.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {object|null} [props.flow] - Existing flow when editing, null when creating
 * @param {() => void} props.onSuccess - Callback on successful save
 */
export default function FlowFormModal({ isOpen, onClose, flow, onSuccess }) {
  const isEditing = Boolean(flow);

  const [formData, setFormData] = useState({
    moduleCode: '',
    name: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (flow) {
        setFormData({
          moduleCode: flow.moduleCode || '',
          name: flow.name || '',
          isActive: flow.isActive ?? true,
        });
      } else {
        setFormData({
          moduleCode: '',
          name: '',
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, flow]);

  const handleChange = (field, value) => {
    let finalVal = value;
    if (field === 'moduleCode') {
      // Auto-uppercase and sanitize to allowed chars
      finalVal = String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '')
        .slice(0, FLOW_LIMITS.MAX_MODULE_CODE_LENGTH);
    }
    setFormData((prev) => ({ ...prev, [field]: finalVal }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!isEditing) {
      if (!formData.moduleCode?.trim()) {
        nextErrors.moduleCode = 'Module code is required';
      } else if (!MODULE_CODE_REGEX.test(formData.moduleCode)) {
        nextErrors.moduleCode = 'Only uppercase letters (A-Z), numbers, and underscores allowed';
      } else if (formData.moduleCode.length > FLOW_LIMITS.MAX_MODULE_CODE_LENGTH) {
        nextErrors.moduleCode = `Max length is ${FLOW_LIMITS.MAX_MODULE_CODE_LENGTH} characters`;
      }
    }

    if (!formData.name?.trim()) {
      nextErrors.name = 'Flow name is required';
    } else if (formData.name.trim().length > FLOW_LIMITS.MAX_FLOW_NAME_LENGTH) {
      nextErrors.name = `Max length is ${FLOW_LIMITS.MAX_FLOW_NAME_LENGTH} characters`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await processFlowService.updateFlow(flow.id, {
          name: formData.name.trim(),
          isActive: formData.isActive,
        });
        toast.success('Flow updated');
      } else {
        await processFlowService.createFlow({
          moduleCode: formData.moduleCode.trim(),
          name: formData.name.trim(),
          isActive: formData.isActive,
        });
        toast.success('Flow created');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      // Map API validation or 409 conflict errors to field error
      if (err?.fieldErrors?.moduleCode) {
        setErrors((prev) => ({ ...prev, moduleCode: err.fieldErrors.moduleCode }));
      } else if (err?.fieldErrors?.name) {
        setErrors((prev) => ({ ...prev, name: err.fieldErrors.name }));
      } else if (err?.status === 409 || err?.message?.toLowerCase().includes('modulecode')) {
        setErrors((prev) => ({
          ...prev,
          moduleCode: err.message || 'Module code already exists',
        }));
      } else {
        toast.error(err?.message || 'Failed to save flow');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Process Flow' : 'Add Process Flow'}
      icon={IconProcessFlow}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormGrid columns={1} gap="md">
          <Input
            label="Module Code"
            required={!isEditing}
            value={formData.moduleCode}
            onChange={(e) => handleChange('moduleCode', e.target.value)}
            error={errors.moduleCode}
            disabled={isEditing || isSubmitting}
            placeholder="e.g. SALES, VENDOR, INQUIRY"
            helperText={
              isEditing
                ? 'Module code is unique and immutable once created.'
                : 'Uppercase letters, numbers, underscores only (e.g. PO_APPROVAL).'
            }
            maxLength={FLOW_LIMITS.MAX_MODULE_CODE_LENGTH}
          />

          <Input
            label="Flow Name"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            disabled={isSubmitting}
            placeholder="e.g. Sales Pipeline Workflow"
            maxLength={FLOW_LIMITS.MAX_FLOW_NAME_LENGTH}
          />

          <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
            <div>
              <span className="text-xs font-semibold text-heading block">Status</span>
              <p className="text-2xs text-text-muted mt-0.5">
                Set process flow active or inactive
              </p>
            </div>

            <StatusSwitch
              id="flow-modal-status"
              checked={formData.isActive}
              onChange={(checked) => handleChange('isActive', checked)}
              disabled={isSubmitting}
            />
          </div>
        </FormGrid>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-border mt-6">
          <CancelButton onClick={onClose} disabled={isSubmitting} />
          <SaveButton
            type="submit"
            loading={isSubmitting}
            label={isEditing ? 'Save Changes' : 'Create Flow'}
          />
        </div>
      </form>
    </Modal>
  );
}
