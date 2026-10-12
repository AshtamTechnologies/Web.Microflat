/**
 * ContactsEditor.jsx — Child Contact Person Rows Manager for Client Registration.
 *
 * Implements "form above, grid below, edit-in-place" pattern using useRowsEditor hook.
 * Manages adding, editing, and toggling contact persons with field validation.
 */

import { useCallback } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Toggle,
  Badge,
  TableContainer,
  Th,
  Td,
} from '../../../components/ui';
import { useRowsEditor } from '../../../hooks/useRowsEditor';

const INITIAL_CONTACT_FORM = {
  clientContactPersonId: null,
  firstName: '',
  lastName: '',
  mobile1: '',
  mobile2: '',
  email: '',
  isActive: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(value, isRequired = false, fieldName = 'Phone number') {
  const str = String(value || '').trim();
  if (!str) {
    return isRequired ? `${fieldName} is required.` : '';
  }
  if (!/^\d+$/.test(str)) {
    return `${fieldName} must contain digits only.`;
  }
  if (str.length < 10) {
    return `${fieldName} must be at least 10 digits.`;
  }
  return '';
}

export default function ContactsEditor({ rows = [], onChange }) {
  const validateContact = useCallback((form) => {
    const errors = {};
    if (!form.firstName?.trim()) errors.firstName = 'First name is required';
    if (form.firstName && form.firstName.length > 100) errors.firstName = 'Max 100 characters';
    if (form.lastName && form.lastName.length > 100) errors.lastName = 'Max 100 characters';

    const m1Err = validatePhone(form.mobile1, true, 'Phone number');
    if (m1Err) errors.mobile1 = m1Err;

    const m2Err = validatePhone(form.mobile2, false, 'Alternate phone');
    if (m2Err) errors.mobile2 = m2Err;

    if (form.email?.trim()) {
      if (form.email.length > 254) {
        errors.email = 'Max 254 characters';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }

    return errors;
  }, []);

  const {
    formState,
    handleFieldChange,
    fieldErrors,
    editingId,
    isEditing,
    editingIndex,
    handleAddOrUpdate,
    handleStartEdit,
    handleCancelEdit,
    handleRemove,
    handleToggleRowActive,
  } = useRowsEditor({
    rows,
    onChange,
    initialFormValues: INITIAL_CONTACT_FORM,
    idField: 'clientContactPersonId',
    rowName: 'Contact Person',
    validateRow: validateContact,
  });

  const onEdit = (row) => {
    handleStartEdit({
      ...row,
      mobile1: row.mobile1 ? String(row.mobile1).replace(/\D/g, '').slice(-10) : '',
      mobile2: row.mobile2 ? String(row.mobile2).replace(/\D/g, '').slice(-10) : '',
    });
  };

  return (
    <Card padding="md" className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-heading">Contact Persons</h3>
              <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
                {rows.length}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Key personnel, purchasing leads, accounts, and technical contacts
            </p>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
              Editing contact #{editingIndex + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleCancelEdit}
              className="text-xs text-text-muted hover:text-danger"
            >
              <X size={13} className="mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── Form Above ── */}
      <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* First Name */}
          <div>
            <Input
              label="First Name"
              id="con-first-name"
              required
              maxLength={100}
              value={formState.firstName}
              onChange={(e) => handleFieldChange('firstName', e.target.value)}
              placeholder="e.g. Rajesh"
              error={fieldErrors.firstName}
            />
          </div>

          {/* Last Name */}
          <div>
            <Input
              label="Last Name"
              id="con-last-name"
              maxLength={100}
              value={formState.lastName}
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              placeholder="e.g. Panchal"
              error={fieldErrors.lastName}
            />
          </div>

          {/* Email */}
          <div>
            <Input
              label="Email"
              id="con-email"
              type="email"
              maxLength={254}
              value={formState.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="e.g. rajesh@company.com"
              error={fieldErrors.email}
            />
          </div>

          {/* Mobile 1 */}
          <div>
            <Input
              label="Primary Phone Number"
              id="con-mobile1"
              name="mobile1"
              type="tel"
              required
              maxLength={10}
              value={formState.mobile1}
              onChange={(e) => handleFieldChange('mobile1', e.target.value)}
              placeholder="9876543210"
              hint="10-digit primary mobile or landline"
              className="font-mono tabular-nums"
              error={fieldErrors.mobile1}
              autoComplete="tel"
            />
          </div>

          {/* Mobile 2 */}
          <div>
            <Input
              label="Alternate Phone Number"
              id="con-mobile2"
              name="mobile2"
              type="tel"
              maxLength={10}
              value={formState.mobile2}
              onChange={(e) => handleFieldChange('mobile2', e.target.value)}
              placeholder="9823456781 (optional)"
              hint="Optional secondary contact number"
              className="font-mono tabular-nums"
              error={fieldErrors.mobile2}
            />
          </div>

          {/* Is Active Toggle */}
          <div className="flex flex-col justify-end pb-1.5">
            <Toggle
              label="Active Contact"
              id="con-active-toggle"
              checked={formState.isActive}
              onChange={(checked) => handleFieldChange('isActive', checked)}
            />
            <span className="text-2xs text-text-muted mt-1">
              {formState.isActive ? 'Active recipient for communications' : 'Inactive contact'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddOrUpdate}
            className="text-xs font-semibold"
          >
            {isEditing ? (
              <>
                <Check size={14} className="mr-1.5" />
                Update Contact
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1.5" />
                Add Contact
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Grid Below ── */}
      <div>
        {rows.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-surface/20 space-y-1.5">
            <User size={22} className="mx-auto text-text-muted/60" />
            <p className="text-xs font-medium text-heading">No contact persons added</p>
            <p className="text-2xs text-text-muted">
              Add primary, finance, or technical contacts using the form above.
            </p>
          </div>
        ) : (
          <TableContainer
            className="overflow-x-auto"
            tableClassName="min-w-[720px] w-full text-left border-collapse text-xs table-auto sm:table-fixed"
          >
            <thead className="bg-surface/80 border-b border-border">
              <tr>
                <Th className="py-2.5 px-3 min-w-[180px]">NAME</Th>
                <Th className="py-2.5 px-3 w-48 whitespace-nowrap">MOBILE 1 / MOBILE 2</Th>
                <Th className="py-2.5 px-3 min-w-[200px] whitespace-nowrap">EMAIL</Th>
                <Th className="py-2.5 px-3 w-32 text-center whitespace-nowrap">STATUS</Th>
                <Th className="py-2.5 px-3 w-24 text-right whitespace-nowrap">ACTIONS</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {rows.map((row, index) => {
                const rowId = row.clientContactPersonId || row.id || `con_${index}`;
                const isCurrentEditing = editingId === rowId;
                const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || '—';

                return (
                  <tr
                    key={rowId}
                    className={`transition-colors hover:bg-surface/50 ${
                      isCurrentEditing ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    {/* Name */}
                    <Td className="py-3 px-3">
                      <span className="font-semibold text-heading text-xs">{fullName}</span>
                    </Td>

                    {/* Mobile 1 / Mobile 2 */}
                    <Td className="py-3 px-3 font-mono tabular-nums text-xs">
                      <div className="text-heading font-medium">{row.mobile1 || '—'}</div>
                      {row.mobile2 && (
                        <div className="text-2xs text-text-muted mt-0.5">{row.mobile2}</div>
                      )}
                    </Td>

                    {/* Email */}
                    <Td className="py-3 px-3 text-xs">
                      {row.email ? (
                        <span className="text-text hover:text-primary transition-colors">
                          {row.email}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </Td>

                    {/* Status */}
                    <Td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRowActive(rowId)}
                        title={`Click to mark ${row.isActive ? 'Inactive' : 'Active'}`}
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors select-none',
                          row.isActive
                            ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                            : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
                        ].join(' ')}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            row.isActive ? 'bg-success' : 'bg-danger'
                          }`}
                          aria-hidden="true"
                        />
                        {row.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </Td>

                    {/* Actions */}
                    <Td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(row)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border text-text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-2xs cursor-pointer"
                          title="Edit Contact"
                          aria-label="Edit Contact"
                        >
                          <Pencil size={14} className="shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(rowId)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface border border-border text-text-muted hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-all shadow-2xs cursor-pointer"
                          title="Remove Contact"
                          aria-label="Remove Contact"
                        >
                          <Trash2 size={14} className="shrink-0" />
                        </button>
                      </div>
                    </Td>
                    </tr>
                  );
                })}
              </tbody>
          </TableContainer>
        )}
      </div>
    </Card>
  );
}
