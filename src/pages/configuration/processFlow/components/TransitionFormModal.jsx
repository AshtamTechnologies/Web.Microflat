import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  FormGrid,
  Input,
  SearchableSelect,
  StatusSwitch,
  SaveButton,
  CancelButton,
} from '../../../../components/ui';
import {
  FLOW_LIMITS,
  OUTCOME_TYPE_OPTIONS,
} from '../../../../constants/processFlow';
import { IconProcessFlow } from '../../../../constants/icons';
import { processFlowService } from '../../../../services';

/**
 * TransitionFormModal — Create or edit a transition between flow steps.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {number|string} props.flowId
 * @param {object|null} [props.transition] - Existing transition when editing, null when creating
 * @param {Array<object>} props.steps - All steps in current flow
 * @param {Array<object>} props.existingTransitions - All transitions in current flow
 * @param {() => void} props.onSuccess - Callback on successful save
 */
export default function TransitionFormModal({
  isOpen,
  onClose,
  flowId,
  transition,
  steps = [],
  existingTransitions = [],
  onSuccess,
}) {
  const isEditing = Boolean(transition);

  const [formData, setFormData] = useState({
    fromStepId: '',
    toStepId: '',
    label: '',
    outcomeType: 'Normal',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active steps or existing participating steps when editing
  const selectableSteps = useMemo(() => {
    return steps.filter(
      (s) => s.isActive || (transition && (s.id === transition.fromStepId || s.id === transition.toStepId))
    );
  }, [steps, transition]);

  // Options for 'From' step: "Title (col,row)"
  const fromOptions = useMemo(
    () =>
      selectableSteps.map((s) => ({
        value: String(s.id),
        label: `${s.title} (${s.colNo},${s.rowNo})`,
      })),
    [selectableSteps]
  );

  // Options for 'To' step: selectable steps excluding the selected 'From' step
  const toOptions = useMemo(() => {
    return selectableSteps
      .filter((s) => String(s.id) !== String(formData.fromStepId))
      .map((s) => ({
        value: String(s.id),
        label: `${s.title} (${s.colNo},${s.rowNo})`,
      }));
  }, [selectableSteps, formData.fromStepId]);

  useEffect(() => {
    if (isOpen) {
      if (transition) {
        setFormData({
          fromStepId: String(transition.fromStepId || ''),
          toStepId: String(transition.toStepId || ''),
          label: transition.label || '',
          outcomeType: transition.outcomeType || 'Normal',
          isActive: transition.isActive !== false,
        });
      } else {
        setFormData({
          fromStepId: selectableSteps[0] ? String(selectableSteps[0].id) : '',
          toStepId: selectableSteps[1] ? String(selectableSteps[1].id) : '',
          label: '',
          outcomeType: 'Normal',
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, transition, selectableSteps]);

  const handleChange = (field, val) => {
    const value = val?.target ? val.target.value : val;
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // If fromStepId changed to match toStepId, clear toStepId
      if (field === 'fromStepId' && String(value) === String(next.toStepId)) {
        next.toStepId = '';
      }
      return next;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.fromStepId) {
      nextErrors.fromStepId = 'Origin step is required';
    }

    if (!formData.toStepId) {
      nextErrors.toStepId = 'Destination step is required';
    }

    if (
      formData.fromStepId &&
      formData.toStepId &&
      String(formData.fromStepId) === String(formData.toStepId)
    ) {
      nextErrors.toStepId = 'Origin and destination cannot be the same step (no self-loops)';
    }

    if (
      formData.label &&
      formData.label.length > FLOW_LIMITS.MAX_TRANSITION_LABEL_LENGTH
    ) {
      nextErrors.label = `Max length is ${FLOW_LIMITS.MAX_TRANSITION_LABEL_LENGTH} characters`;
    }

    // Check for duplicate ACTIVE transition between same (fromStepId, toStepId)
    if (formData.isActive && formData.fromStepId && formData.toStepId && !nextErrors.toStepId) {
      const isDuplicate = existingTransitions.some((t) => {
        if (!t.isActive) return false;
        if (transition && t.id === transition.id) return false;
        return (
          String(t.fromStepId) === String(formData.fromStepId) &&
          String(t.toStepId) === String(formData.toStepId)
        );
      });

      if (isDuplicate) {
        nextErrors.toStepId = 'A transition between these two steps already exists';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        fromStepId: Number(formData.fromStepId),
        toStepId: Number(formData.toStepId),
        label: formData.label?.trim() || null,
        outcomeType: formData.outcomeType,
        isActive: Boolean(formData.isActive),
      };

      if (isEditing) {
        await processFlowService.updateTransition(transition.id, payload);
        toast.success('Transition updated');
      } else {
        await processFlowService.createTransition(flowId, payload);
        toast.success('Transition created');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err?.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      } else if (err?.status === 409 || err?.message?.toLowerCase().includes('duplicate')) {
        setErrors((prev) => ({
          ...prev,
          toStepId: err.message || 'Duplicate transition already exists',
        }));
      } else {
        toast.error(err?.message || 'Failed to save transition');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Transition' : 'Add Transition'}
      icon={IconProcessFlow}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormGrid columns={1} gap="md">
          <SearchableSelect
            label="From Step"
            required
            value={formData.fromStepId}
            onChange={(val) => handleChange('fromStepId', val)}
            options={fromOptions}
            error={errors.fromStepId}
            disabled={isSubmitting}
            placeholder="Select origin step..."
          />

          <SearchableSelect
            label="To Step"
            required
            value={formData.toStepId}
            onChange={(val) => handleChange('toStepId', val)}
            options={toOptions}
            error={errors.toStepId}
            disabled={isSubmitting || !formData.fromStepId}
            placeholder={
              formData.fromStepId ? 'Select destination step...' : 'Choose origin first'
            }
            hint="Looping back to an earlier step and bidirectional transitions are allowed"
          />

          <Input
            label="Transition Label (Optional)"
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            error={errors.label}
            disabled={isSubmitting}
            placeholder="e.g. Approved, Rejected, Revision Required"
            maxLength={FLOW_LIMITS.MAX_TRANSITION_LABEL_LENGTH}
            helperText="Short action text displayed on the connecting diagram arrow"
          />

          <SearchableSelect
            label="Outcome Type"
            value={formData.outcomeType}
            onChange={(val) => handleChange('outcomeType', val?.target ? val.target.value : val)}
            options={OUTCOME_TYPE_OPTIONS}
            disabled={isSubmitting}
            placeholder="Select outcome type..."
            hint="Visual theme for this connector line"
          />

          <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
            <div>
              <span className="text-xs font-semibold text-heading block">Status</span>
              <p className="text-2xs text-text-muted mt-0.5">
                {formData.isActive ? 'Active — transition connector visible in diagram' : 'Inactive — transition is archived/disabled'}
              </p>
            </div>

            <StatusSwitch
              id="transition-modal-status"
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
            label={isEditing ? 'Save Changes' : 'Create Transition'}
          />
        </div>
      </form>
    </Modal>
  );
}
