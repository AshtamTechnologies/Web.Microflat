/**
 * UserFormModal — Add & Edit User modal dialog with custom StatusSwitch button.
 *
 * Form fields:
 *   - First Name *
 *   - Last Name *
 *   - Email *
 *   - Mobile Number *
 *   - Role * (Select)
 *   - Status (Custom Pill StatusSwitch button)
 *
 * Fully responsive and uses design tokens for styling.
 */

import { useState, useEffect } from 'react';
import { Modal, Input, SearchableSelect, Button, StatusSwitch } from '../../components/ui';
import { ROLE_OPTIONS } from '../../mocks/users';


const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  role: 'Admin',
  isActive: true,
};

function validateField(name, value) {
  switch (name) {
    case 'firstName':
      if (!value.trim()) return 'First name is required.';
      return '';
    case 'lastName':
      if (!value.trim()) return 'Last name is required.';
      return '';
    case 'email':
      if (!value.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return 'Enter a valid email address.';
      return '';
    case 'mobile':
      if (!value.trim()) return 'Mobile number is required.';
      if (!/^\d+$/.test(value)) return 'Mobile must contain digits only.';
      if (value.length < 10) return 'Mobile must be at least 10 digits.';
      return '';
    case 'role':
      if (!value) return 'Role is required.';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  ['firstName', 'lastName', 'email', 'mobile', 'role'].forEach((field) => {
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
        setForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          role: user.role || 'Admin',
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
        role: form.role,
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
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Form fields in 2-column responsive layout */}
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
            label="Email"
            placeholder="user@example.com"
            required
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
          />

          {/* Mobile */}
          <Input
            id="user-mobile"
            name="mobile"
            type="tel"
            label="Mobile Number"
            placeholder="9876543210"
            required
            maxLength={10}
            value={form.mobile}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.mobile}
            autoComplete="tel"
          />

          {/* Role */}
          <div>
            <SearchableSelect
              id="user-role"
              name="role"
              label="Role"
              placeholder="Select a role..."
              searchPlaceholder="Search roles..."
              required
              value={form.role}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.role}
              options={ROLE_OPTIONS}
            />
          </div>


          {/* Status Switch Button */}
          <div className="flex flex-col justify-between">
            <label className="text-sm font-medium text-heading block leading-none mb-1.5">
              Status <span className="text-danger" aria-hidden="true">*</span>
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
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
