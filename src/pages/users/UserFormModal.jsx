/**
 * UserFormModal — Add & Edit User modal dialog with custom StatusSwitch button.
 *
 * Form fields:
 *   - First Name *
 *   - Last Name *
 *   - Email *
 *   - Mobile Number (Primary) *
 *   - Secondary Phone
 *   - Roles * (Multi-select)
 *   - Address (Textarea/Input)
 *   - Status (Custom Pill StatusSwitch button)
 *
 * Fully responsive and uses design tokens for styling.
 */

import { useState, useEffect } from 'react';
import { Modal, Input, SearchableMultiSelect, Button, StatusSwitch } from '../../components/ui';
import { ROLE_OPTIONS } from '../../mocks/users';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  secondaryPhone: '',
  roles: [],
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return 'Enter a valid email address.';
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
    case 'roles':
      if (!Array.isArray(value) || value.length === 0) return 'Please select at least one role.';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  ['firstName', 'lastName', 'email', 'mobile', 'secondaryPhone', 'roles'].forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });
  return errors;
}

export default function UserFormModal({
  isOpen,
  onClose,
  user = null, // null for Add, user object for Edit
  onSubmit,
}) {
  const isEdit = Boolean(user?.id);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        const userRoles = Array.isArray(user.roles) && user.roles.length > 0
          ? user.roles
          : user.role
          ? [user.role]
          : [];

        setForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          secondaryPhone: user.secondaryPhone || '',
          roles: userRoles,
          address: user.address || '',
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
      } else {
        setForm(INITIAL_FORM);
      }
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    const err = validateField(name, value);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : '',
        roles: form.roles,
        role: form.roles[0] || '',
        address: form.address ? form.address.trim() : '',
        isActive: form.isActive,
      };

      await onSubmit(payload);
      onClose();
    } catch {
      // Error handled by caller / toast
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Add New User'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Form fields in responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            required
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
          />

          {/* Primary Mobile */}
          <Input
            id="user-mobile"
            name="mobile"
            type="tel"
            label="Primary Mobile"
            placeholder="9876543210"
            required
            maxLength={10}
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
            maxLength={10}
            value={form.secondaryPhone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.secondaryPhone}
            autoComplete="tel"
          />

          {/* Roles Multi-Select */}
          <div>
            <SearchableMultiSelect
              id="user-roles"
              name="roles"
              label="Roles"
              placeholder="Select user roles..."
              searchPlaceholder="Search roles..."
              required
              value={form.roles}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.roles}
              options={ROLE_OPTIONS}
            />
          </div>

          {/* Address (Spans 2 columns on desktop) */}
          <div className="sm:col-span-2">
            <label
              htmlFor="user-address"
              className="text-sm font-medium text-heading block leading-none mb-1.5"
            >
              Address
            </label>
            <textarea
              id="user-address"
              name="address"
              rows={2}
              value={form.address}
              onChange={handleChange}
              placeholder="Enter full address, street, city, state, postal code..."
              className={[
                'w-full rounded-lg border bg-bg text-heading text-sm px-3 py-2',
                'border-border placeholder:text-text-muted transition-all duration-150',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none',
              ].join(' ')}
            />
          </div>

          {/* Status Switch Button */}
          <div className="sm:col-span-2 flex flex-col justify-between pt-1">
            <label className="text-sm font-medium text-heading block leading-none mb-1.5">
              Account Status <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <div className="flex items-center h-[42px]">
              <StatusSwitch
                id="user-status-switch"
                checked={form.isActive}
                onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-6 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
          >
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
