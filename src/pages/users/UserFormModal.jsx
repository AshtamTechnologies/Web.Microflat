/**
 * UserFormModal — Add & Edit User modal dialog.
 *
 * Rules:
 *   - Add User: POST /api/auth/register.
 *     Fields: First Name, Last Name, Email, Mobile, Secondary Phone, Address,
 *             Roles (multi-select, at least 1), Primary Role (auto if 1 selected).
 *     No password field.
 *     Shows Temporary Password confirmation modal on success.
 *   - Edit User: PUT /api/users/{id}.
 *     Roles are read-only (no backend endpoint to change roles on PUT /users/{id}).
 *     Email is editable per spec.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Textarea,
  SearchableMultiSelect,
  SaveButton,
  CancelButton,
  Button,
  StatusSwitch,
} from '../../components/ui';
import { roleService } from '../../services';
import { IconCheck, IconCopy, IconMail, IconShieldCheck } from '../../constants/icons';
import { formatDateTime } from '../../utils/dateUtils';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  secondaryPhone: '',
  roleIds: [],
  primaryRoleId: '',
  address: '',
  isActive: true,
};

function validateField(name, value) {
  switch (name) {
    case 'firstName':
      if (!value || !value.trim()) return 'First name is required.';
      return '';
    case 'lastName':
      if (!value || !value.trim()) return 'Last name is required.';
      return '';
    case 'email':
      if (!value || !value.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
      return '';
    case 'mobile':
      if (!value || !value.trim()) return 'Mobile number is required.';
      if (!/^\d+$/.test(value)) return 'Mobile must contain digits only.';
      if (value.length < 10) return 'Mobile must be at least 10 digits.';
      return '';
    case 'secondaryPhone':
      if (value && value.trim()) {
        if (!/^\d+$/.test(value.trim())) return 'Secondary phone must contain digits only.';
        if (value.trim().length < 10) return 'Secondary phone must be at least 10 digits.';
      }
      return '';
    case 'roleIds':
      if (!Array.isArray(value) || value.length === 0) return 'Please select at least one role.';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  const fields = ['firstName', 'lastName', 'email', 'mobile', 'secondaryPhone', 'roleIds'];

  fields.forEach((field) => {
    const err = validateField(field, form[field], form);
    if (err) errors[field] = err;
  });
  return errors;
}

export default function UserFormModal({
  isOpen,
  onClose,
  user = null, // null for Add, user object for Edit
  onSubmit,
  isProfileMode = false,
}) {
  const isEdit = Boolean(user?.id);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Post-registration temporary password notification modal state
  const [tempPassResult, setTempPassResult] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Load available roles from roleService
  useEffect(() => {
    let isMounted = true;
    async function fetchRoles() {
      try {
        const roles = await roleService.getRoles({ isActive: true });
        if (isMounted) {
          setAvailableRoles(roles);
        }
      } catch {
        /* ignore */
      }
    }
    if (isOpen) {
      fetchRoles();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Transform availableRoles into options for select
  const roleSelectOptions = useMemo(() => {
    return availableRoles.map((r) => ({
      value: String(r.id),
      label: r.name || r.roleName,
    }));
  }, [availableRoles]);

  // Populate form on open or user change
  useEffect(() => {
    if (isOpen) {
      if (user) {
        const existingRoleIds = (user.roles || [])
          .map((r) => {
            const idVal = r.roleId ?? r.id;
            if (idVal !== undefined && idVal !== null && idVal !== '') return String(idVal);
            const match = availableRoles.find(
              (ar) =>
                (ar.name || ar.roleName || '').toLowerCase() ===
                (r.roleName || r || '').toLowerCase()
            );
            return match ? String(match.id) : null;
          })
          .filter(Boolean);

        const primaryRoleObj = (user.roles || []).find((r) => r.isPrimary);
        const primaryId = primaryRoleObj?.roleId ?? primaryRoleObj?.id;
        const initialPrimary = primaryId
          ? String(primaryId)
          : existingRoleIds[0]
          ? String(existingRoleIds[0])
          : '';

        setForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          secondaryPhone: user.secondaryPhone || '',
          roleIds: existingRoleIds,
          primaryRoleId: initialPrimary,
          address: user.address || '',
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true,
        });
      } else {
        setForm(INITIAL_FORM);
      }
      setErrors({});
      setLoading(false);
      setTempPassResult(null);
      setHasCopied(false);
    }
  }, [isOpen, user, availableRoles]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'roleIds') {
      const newRoleIds = Array.isArray(value) ? value : [];
      setForm((prev) => {
        let newPrimary = prev.primaryRoleId;
        if (newRoleIds.length === 1) {
          newPrimary = String(newRoleIds[0]);
        } else if (!newRoleIds.includes(String(newPrimary))) {
          newPrimary = newRoleIds[0] ? String(newRoleIds[0]) : '';
        }
        return { ...prev, roleIds: newRoleIds, primaryRoleId: newPrimary };
      });
      if (errors.roleIds) setErrors((prev) => ({ ...prev, roleIds: '' }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (isProfileMode && (name === 'email' || name === 'roleIds')) return;
    const err = validateField(name, value, form);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateAll(form);
    if (isProfileMode) {
      delete fieldErrors.email;
      delete fieldErrors.roleIds;
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      let payload;
      if (isProfileMode) {
        payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          mobile: form.mobile.trim(),
          secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : null,
          address: form.address ? form.address.trim() : null,
        };
      } else {
        const effectivePrimaryRoleId =
          form.roleIds.length === 1
            ? Number(form.roleIds[0])
            : Number(form.primaryRoleId) || (form.roleIds[0] ? Number(form.roleIds[0]) : 0);

        payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : null,
          address: form.address ? form.address.trim() : null,
          roleIds: form.roleIds.map(Number),
          primaryRoleId: effectivePrimaryRoleId,
          isActive: Boolean(form.isActive),
        };
      }

      const result = await onSubmit(payload);

      // If creating user returned temporary password info, show confirmation dialog
      if (!isEdit && !isProfileMode && result?.data) {
        setTempPassResult(result.data);
      } else {
        onClose();
      }
    } catch (err) {
      // Map server field errors if returned from ProblemDetails
      if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopyTempPassword(text) {
    if (text) {
      navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  }

  // If a temporary password confirmation is active, show the confirmation modal
  if (tempPassResult) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="User Account Created"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <IconShieldCheck size={28} />
          </div>

          <div className="text-center">
            <h3 className="text-base font-bold text-heading">
              {tempPassResult.user?.firstName} {tempPassResult.user?.lastName}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              {tempPassResult.user?.email}
            </p>
          </div>

          <div className="p-3.5 bg-surface rounded-xl border border-border text-xs space-y-2">
            <div className="flex items-start gap-2 text-text">
              <IconMail size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-heading">Temporary Password Dispatched</p>
                <p className="text-text-muted mt-0.5">
                  An email has been sent with a temporary password. The user must change it at their first sign-in.
                </p>
              </div>
            </div>

            {tempPassResult.temporaryPasswordExpiresOn && (
              <div className="pt-2 border-t border-border/80 flex items-center justify-between text-2xs text-text-muted">
                <span>Password Expiry:</span>
                <span className="font-mono font-medium text-heading">
                  {formatDateTime(tempPassResult.temporaryPasswordExpiresOn)}
                </span>
              </div>
            )}

            {/* If backend returns a temporary password string in payload, display copy button */}
            {tempPassResult.temporaryPassword && (
              <div className="pt-2 border-t border-border/80">
                <span className="text-2xs text-text-muted block mb-1">Temporary Password:</span>
                <div className="flex items-center justify-between gap-2 bg-bg p-2 rounded-lg border border-border font-mono text-xs">
                  <span className="font-semibold text-heading select-all">
                    {tempPassResult.temporaryPassword}
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopyTempPassword(tempPassResult.temporaryPassword)}
                  >
                    {hasCopied ? <IconCheck size={14} className="text-success" /> : <IconCopy size={14} />}
                    {hasCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" size="md" onClick={onClose} fullWidth>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isProfileMode ? 'Edit Profile' : isEdit ? 'Edit User' : 'Add New User'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isProfileMode && (
            <div className="sm:col-span-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-text-muted leading-relaxed">
              Updates your signed-in contact details. Email, roles, and status cannot be modified here.
            </div>
          )}

          {/* First Name */}
          <Input
            id="user-first-name"
            name="firstName"
            type="text"
            label="First Name"
            placeholder="Enter first name"
            required
            value={form.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.firstName}
            autoComplete="given-name"
          />

          {/* Last Name */}
          <Input
            id="user-last-name"
            name="lastName"
            type="text"
            label="Last Name"
            placeholder="Enter last name"
            required
            value={form.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.lastName}
            autoComplete="family-name"
          />

          {/* Email */}
          <Input
            id="user-email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="user@example.com"
            required={!isProfileMode}
            disabled={isProfileMode}
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
            hint={isProfileMode ? 'Email cannot be changed' : ''}
          />

          {/* Primary Mobile */}
          <Input
            id="user-mobile"
            name="mobile"
            type="tel"
            label="Primary Mobile"
            placeholder="9876543210"
            required
            maxLength={15}
            value={form.mobile}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.mobile}
            autoComplete="tel"
          />

          {/* Secondary Phone */}
          <Input
            id="user-secondary-phone"
            name="secondaryPhone"
            type="tel"
            label="Secondary Phone"
            placeholder="9876543211 (Optional)"
            maxLength={15}
            value={form.secondaryPhone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.secondaryPhone}
            autoComplete="tel"
          />

          {/* Roles Selection (Hidden in Profile Mode per API spec) */}
          {!isProfileMode && (
            <div className="sm:col-span-2 space-y-2.5">
              <SearchableMultiSelect
                id="user-roles"
                name="roleIds"
                label="Assigned Roles"
                placeholder="Select roles..."
                searchPlaceholder="Search roles..."
                required
                value={form.roleIds}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.roleIds}
                options={roleSelectOptions}
              />

              {/* Single Role Auto-Assigned as Primary */}
              {form.roleIds.length === 1 && (
                <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs">
                  <span className="text-text-muted">Primary Role:</span>
                  <span className="font-semibold text-primary">
                    {roleSelectOptions.find((o) => o.value === String(form.roleIds[0]))?.label ||
                      `Role #${form.roleIds[0]}`}{' '}
                    <span className="text-2xs font-normal text-text-muted">(Auto-assigned)</span>
                  </span>
                </div>
              )}

              {/* Multiple Roles: User selects which one is Primary */}
              {form.roleIds.length > 1 && (
                <div className="p-3 rounded-xl bg-surface/70 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-heading">
                      Select Primary Role <span className="text-danger">*</span>
                    </label>
                    <span className="text-2xs text-text-muted">
                      Determines primary permissions & role badge
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {form.roleIds.map((rid) => {
                      const option = roleSelectOptions.find((o) => o.value === String(rid));
                      const label = option?.label || `Role #${rid}`;
                      const isSelected = String(form.primaryRoleId) === String(rid);
                      return (
                        <label
                          key={rid}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-heading font-semibold shadow-2xs'
                              : 'border-border bg-bg hover:bg-surface text-text'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="radio"
                              name="primaryRoleId"
                              value={String(rid)}
                              checked={isSelected}
                              onChange={() =>
                                setForm((prev) => ({ ...prev, primaryRoleId: String(rid) }))
                              }
                              className="text-primary focus:ring-primary h-3.5 w-3.5 shrink-0"
                            />
                            <span className="text-xs truncate">{label}</span>
                          </div>
                          {isSelected && (
                            <span className="text-2xs bg-primary text-white px-1.5 py-0.5 rounded font-medium shrink-0">
                              Primary
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address */}
          <div className="sm:col-span-2">
            <Textarea
              id="user-address"
              name="address"
              label="Address"
              rows={2}
              value={form.address}
              onChange={handleChange}
              placeholder="Enter full address, street, city, state, postal code..."
            />
          </div>

          {/* Account Status Switch (Add & Edit mode, hidden in profile mode) */}
          {!isProfileMode && (
            <div className="sm:col-span-2 pt-1">
              <span className="mf-label block mb-2">
                Account Status <span className="mf-required" aria-hidden="true">*</span>
              </span>
              <div className="flex items-center gap-3">
                <StatusSwitch
                  id="user-status-switch"
                  checked={form.isActive}
                  onChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-6 border-t border-border">
          <CancelButton
            onClick={onClose}
            disabled={loading}
            className="flex-1 sm:flex-none justify-center"
          />
          <SaveButton
            type="submit"
            loading={loading}
            disabled={loading}
            className="flex-1 sm:flex-none justify-center font-semibold shadow-2xs"
          >
            {isProfileMode ? 'Update Profile' : isEdit ? 'Save Changes' : 'Create User'}
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}
