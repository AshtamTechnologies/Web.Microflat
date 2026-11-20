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
import { FLOW_LIMITS } from '../../../../constants/processFlow';
import { IconProcessFlow } from '../../../../constants/icons';
import { processFlowService, documentSeriesService } from '../../../../services';

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
  const [modules, setModules] = useState([]);
  const [isModulesLoading, setIsModulesLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active system modules when the modal opens
  useEffect(() => {
    let isMounted = true;
    async function fetchModules() {
      try {
        setIsModulesLoading(true);
        const data = await documentSeriesService.listModules({ isActive: true });
        if (isMounted && Array.isArray(data)) {
          setModules(data);
        }
      } catch (err) {
        console.warn('Failed to fetch modules for process flow:', err);
      } finally {
        if (isMounted) setIsModulesLoading(false);
      }
    }

    if (isOpen) {
      fetchModules();
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

    return () => {
      isMounted = false;
    };
  }, [isOpen, flow]);

  const moduleOptions = useMemo(() => {
    return modules.map((m) => ({
      value: m.moduleCode,
      label: m.moduleName ? `${m.moduleName} (${m.moduleCode})` : m.moduleCode,
    }));
  }, [modules]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleModuleChange = (value) => {
    handleChange('moduleCode', value);
    // Auto-suggest flow name if not already filled
    if (!formData.name?.trim()) {
      const selected = modules.find((m) => m.moduleCode === value);
      if (selected?.moduleName) {
        handleChange('name', `${selected.moduleName} Process Flow`);
      }
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!isEditing) {
      if (!formData.moduleCode?.trim()) {
        nextErrors.moduleCode = 'Please select a module';
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
          moduleCode: err.message || 'A process flow for this module code already exists',
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
          {isEditing ? (
            <Input
              id="flow-module-code"
              label="Module Code"
              value={formData.moduleCode}
              disabled
              helperText="Module code is unique and immutable once created."
            />
          ) : (
            <SearchableSelect
              id="flow-module-code"
              label="Module Code"
              required
              value={formData.moduleCode}
              onChange={(e) => handleModuleChange(e.target.value)}
              options={moduleOptions}
              error={errors.moduleCode}
              disabled={isSubmitting || isModulesLoading}
              placeholder={isModulesLoading ? 'Loading modules...' : 'Select a module...'}
              searchPlaceholder="Search module by name or code..."
              hint="Select the system module this process flow will control."
            />
          )}

          <Input
            id="flow-name"
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
