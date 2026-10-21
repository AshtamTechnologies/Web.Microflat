import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  FormGrid,
  Input,
  Textarea,
  SearchableSelect,
  StatusSwitch,
  SaveButton,
  CancelButton,
  IconPicker,
} from '../../../../components/ui';
import {
  FLOW_LIMITS,
  OUTCOME_TYPE_OPTIONS,
} from '../../../../constants/processFlow';
import { IconProcessFlow } from '../../../../constants/icons';
import { processFlowService } from '../../../../services';

/**
 * StepFormModal — Create or edit a Process Flow Step.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {number|string} props.flowId
 * @param {object|null} [props.step] - Existing step when editing, null when creating
 * @param {Array<object>} props.existingSteps - All steps in the current flow (for cell collision check)
 * @param {() => void} props.onSuccess - Callback on successful save
 */
export default function StepFormModal({
  isOpen,
  onClose,
  flowId,
  step,
  existingSteps = [],
  onSuccess,
}) {
  const isEditing = Boolean(step);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    iconKey: 'message-square',
    colNo: 1,
    rowNo: 1,
    outcomeType: 'Normal',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute sensible default position for new steps
  const computeDefaultPosition = () => {
    const activeSteps = existingSteps.filter((s) => s.isActive);
    if (activeSteps.length === 0) {
      return { colNo: 1, rowNo: 1 };
    }
    const maxCol = Math.max(...activeSteps.map((s) => Number(s.colNo) || 1));
    const lastStep = activeSteps[activeSteps.length - 1];
    const candidateRow = Number(lastStep?.rowNo) || 1;
    const candidateCol = maxCol + 1;

    // Verify candidate is free
    const isOccupied = activeSteps.some(
      (s) => Number(s.colNo) === candidateCol && Number(s.rowNo) === candidateRow
    );

    return {
      colNo: candidateCol <= FLOW_LIMITS.MAX_COL_NO ? candidateCol : 1,
      rowNo: isOccupied ? 1 : candidateRow,
    };
  };

  useEffect(() => {
    if (isOpen) {
      if (step) {
        setFormData({
          title: step.title || '',
          description: step.description || '',
          iconKey: step.iconKey || 'message-square',
          colNo: Number(step.colNo) || 1,
          rowNo: Number(step.rowNo) || 1,
          outcomeType: step.outcomeType || 'Normal',
          isActive: step.isActive !== false,
        });
      } else {
        const defaults = computeDefaultPosition();
        setFormData({
          title: '',
          description: '',
          iconKey: 'message-square',
          colNo: defaults.colNo,
          rowNo: defaults.rowNo,
          outcomeType: 'Normal',
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, step, existingSteps]);

  const handleChange = (field, val) => {
    const value = val?.target ? val.target.value : val;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.title?.trim()) {
      nextErrors.title = 'Title is required';
    } else if (formData.title.trim().length > FLOW_LIMITS.MAX_STEP_TITLE_LENGTH) {
      nextErrors.title = `Max length is ${FLOW_LIMITS.MAX_STEP_TITLE_LENGTH} characters`;
    }

    if (formData.description && formData.description.length > FLOW_LIMITS.MAX_STEP_DESCRIPTION_LENGTH) {
      nextErrors.description = `Max length is ${FLOW_LIMITS.MAX_STEP_DESCRIPTION_LENGTH} characters`;
    }

    if (!formData.iconKey) {
      nextErrors.iconKey = 'Icon is required';
    }

    const c = Number(formData.colNo);
    const r = Number(formData.rowNo);

    if (isNaN(c) || c < FLOW_LIMITS.MIN_COL_NO || c > FLOW_LIMITS.MAX_COL_NO) {
      nextErrors.colNo = `Column must be between ${FLOW_LIMITS.MIN_COL_NO} and ${FLOW_LIMITS.MAX_COL_NO}`;
    }

    if (isNaN(r) || r < FLOW_LIMITS.MIN_ROW_NO || r > FLOW_LIMITS.MAX_ROW_NO) {
      nextErrors.rowNo = `Row must be between ${FLOW_LIMITS.MIN_ROW_NO} and ${FLOW_LIMITS.MAX_ROW_NO}`;
    }

    // Client-side cell collision check against ACTIVE steps (only if step itself is active)
    if (formData.isActive && !nextErrors.colNo && !nextErrors.rowNo) {
      const collision = existingSteps.find(
        (s) =>
          s.isActive &&
          (!step || s.id !== step.id) &&
          Number(s.colNo) === c &&
          Number(s.rowNo) === r
      );
      if (collision) {
        nextErrors.colNo = `This cell is already used by "${collision.title}"`;
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
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        iconKey: formData.iconKey,
        colNo: Number(formData.colNo),
        rowNo: Number(formData.rowNo),
        outcomeType: formData.outcomeType,
        isActive: Boolean(formData.isActive),
      };

      if (isEditing) {
        await processFlowService.updateStep(step.id, payload);
        toast.success('Step updated');
      } else {
        await processFlowService.createStep(flowId, payload);
        toast.success('Step created');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err?.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      } else if (err?.status === 409 || err?.message?.toLowerCase().includes('cell')) {
        setErrors((prev) => ({
          ...prev,
          colNo: err.message || 'Cell (col, row) is already occupied',
        }));
      } else {
        toast.error(err?.message || 'Failed to save step');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Step' : 'Add Step'}
      icon={IconProcessFlow}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormGrid columns={2} gap="md">
          <div className="col-span-2">
            <Input
              label="Step Title"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={errors.title}
              disabled={isSubmitting}
              placeholder="e.g. Quotation Sent"
              maxLength={FLOW_LIMITS.MAX_STEP_TITLE_LENGTH}
            />
          </div>

          <div className="col-span-2">
            <IconPicker
              label="Step Icon"
              required
              value={formData.iconKey}
              onChange={(val) => handleChange('iconKey', val)}
              error={errors.iconKey}
            />
          </div>

          <div>
            <Input
              label="Column (X)"
              type="number"
              required
              min={FLOW_LIMITS.MIN_COL_NO}
              max={FLOW_LIMITS.MAX_COL_NO}
              value={formData.colNo}
              onChange={(e) => handleChange('colNo', parseInt(e.target.value, 10) || '')}
              error={errors.colNo}
              disabled={isSubmitting}
              helperText={`Grid column (${FLOW_LIMITS.MIN_COL_NO}–${FLOW_LIMITS.MAX_COL_NO})`}
            />
          </div>

          <div>
            <Input
              label="Row (Y)"
              type="number"
              required
              min={FLOW_LIMITS.MIN_ROW_NO}
              max={FLOW_LIMITS.MAX_ROW_NO}
              value={formData.rowNo}
              onChange={(e) => handleChange('rowNo', parseInt(e.target.value, 10) || '')}
              error={errors.rowNo}
              disabled={isSubmitting}
              helperText={`Grid row (${FLOW_LIMITS.MIN_ROW_NO}–${FLOW_LIMITS.MAX_ROW_NO})`}
            />
          </div>

          <div className="col-span-2">
            <SearchableSelect
              label="Outcome Type"
              value={formData.outcomeType}
              onChange={(val) => handleChange('outcomeType', val?.target ? val.target.value : val)}
              options={OUTCOME_TYPE_OPTIONS}
              disabled={isSubmitting}
              placeholder="Select outcome type..."
              hint="Determines node color and visual weight on the diagram"
            />
          </div>

          <div className="col-span-2">
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={errors.description}
              disabled={isSubmitting}
              placeholder="Brief summary of actions taken during this step..."
              rows={3}
              maxLength={FLOW_LIMITS.MAX_STEP_DESCRIPTION_LENGTH}
            />
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
              <div>
                <span className="text-xs font-semibold text-heading block">Status</span>
                <p className="text-2xs text-text-muted mt-0.5">
                  {formData.isActive ? 'Active — step is visible in flow and diagram' : 'Inactive — step is archived/hidden'}
                </p>
              </div>

              <StatusSwitch
                id="step-modal-status"
                checked={formData.isActive}
                onChange={(checked) => handleChange('isActive', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </FormGrid>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-border mt-6">
          <CancelButton onClick={onClose} disabled={isSubmitting} />
          <SaveButton
            type="submit"
            loading={isSubmitting}
            label={isEditing ? 'Save Changes' : 'Create Step'}
          />
        </div>
      </form>
    </Modal>
  );
}
