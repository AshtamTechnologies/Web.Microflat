/**
 * ContactsEditor.jsx — Child Contact Person Rows Manager for Client Registration.
 *
 * Implements "form above, grid below, edit-in-place" pattern using useRowsEditor hook.
 * Manages adding, editing, and toggling contact persons with field validation and responsive design.
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import {
  IconAdd,
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconMail,
  IconPhone,
  IconUser,
  IconUsers,
} from '../../../constants/icons';
import {
  Button,
  IconButton,
  CancelButton,
  Card,
  Input,
  StatusSwitch,
  Badge,
  TableContainer,
  Th,
  Td,
  ConfirmModal,
} from '../../../components/ui';
import { useRowsEditor } from '../../../hooks/useRowsEditor';

const INITIAL_CONTACT_FORM = {
  clientContactPersonId: null,
  firstName: '',
  lastName: '',
  mobile1: '',
  mobile2: '',
  email: '',
  isPrimary: false,
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

export default function ContactsEditor({ rows, contacts, onChange }) {
  const [contactToDelete, setContactToDelete] = useState(null);

  const effectiveRows = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (Array.isArray(contacts)) return contacts;
    return [];
  }, [rows, contacts]);

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

  const formStateRef = useRef(null);
  const editingRef = useRef({});

  // Intercept changes to ensure only one contact is marked as primary
  const handleEditorChange = useCallback(
    (nextRows) => {
      if (!onChange) return;

      const isPrimary = Boolean(formStateRef.current?.isPrimary);
      const isEditingNow = Boolean(editingRef.current?.isEditing);
      const currentEditIndex = editingRef.current?.editingIndex;

      if (isPrimary) {
        if (isEditingNow && currentEditIndex !== undefined && currentEditIndex >= 0) {
          const sanitized = nextRows.map((r, idx) => ({
            ...r,
            isPrimary: idx === currentEditIndex,
          }));
          onChange(sanitized);
          return;
        } else {
          const lastIdx = nextRows.length - 1;
          const sanitized = nextRows.map((r, idx) => ({
            ...r,
            isPrimary: idx === lastIdx,
          }));
          onChange(sanitized);
          return;
        }
      }

      // If this is the only contact and none was set, auto-set as primary
      if (nextRows.length === 1 && !nextRows[0].isPrimary && effectiveRows.length === 0) {
        onChange([{ ...nextRows[0], isPrimary: true }]);
        return;
      }

      onChange(nextRows);
    },
    [onChange, effectiveRows.length]
  );

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
    rows: effectiveRows,
    onChange: handleEditorChange,
    initialFormValues: INITIAL_CONTACT_FORM,
    idField: 'clientContactPersonId',
    rowName: 'Contact Person',
    validateRow: validateContact,
  });

  // Keep refs synchronized with latest values on each render
  formStateRef.current = formState;
  editingRef.current = { isEditing, editingIndex };

  const handleSetPrimary = (targetRowId) => {
    const nextRows = effectiveRows.map((r, idx) => {
      const key = r.clientContactPersonId || r.id || `clientContactPersonId_${idx}`;
      return {
        ...r,
        isPrimary: key === targetRowId || r.clientContactPersonId === targetRowId || r.id === targetRowId,
      };
    });
    onChange?.(nextRows);
    toast.success('Primary contact updated');
  };

  const handleConfirmSingleDelete = () => {
    if (!contactToDelete) return;
    const rowId = contactToDelete.clientContactPersonId || contactToDelete.id;
    handleRemove(rowId);
    setContactToDelete(null);
  };

  const onEdit = (row) => {
    handleStartEdit({
      ...row,
      mobile1: row.mobile1 ? String(row.mobile1).replace(/\D/g, '').slice(-10) : '',
      mobile2: row.mobile2 ? String(row.mobile2).replace(/\D/g, '').slice(-10) : '',
      isPrimary: Boolean(row.isPrimary),
      isActive: row.isActive !== false,
    });
  };

  return (
    <Card padding="md" className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconUsers size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-heading">Contact Persons</h3>
              <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
                {effectiveRows.length}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Add primary liaisons, sales points of contact, or finance coordinators
            </p>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
              Editing contact #{editingIndex + 1}
            </span>
            <CancelButton
              size="sm"
              onClick={handleCancelEdit}
              className="text-xs shadow-2xs"
            />
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
              id="con-firstName"
              name="firstName"
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
              id="con-lastName"
              name="lastName"
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
              label="Email Address"
              id="con-email"
              name="email"
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

          {/* Primary Contact */}
          <div>
            <label className="mf-label" htmlFor="con-primary-switch">
              Primary Contact
            </label>
            <div className="flex items-center gap-3 h-[42px]">
              <StatusSwitch
                id="con-primary-switch"
                checked={Boolean(formState.isPrimary)}
                onChange={(checked) => handleFieldChange('isPrimary', checked)}
              />
              <span className="text-xs text-text-muted">
                {formState.isPrimary ? 'Primary contact person' : 'Secondary contact'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Switch & Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-3">
            <StatusSwitch
              id="con-active-switch"
              checked={formState.isActive !== false}
              onChange={(checked) => handleFieldChange('isActive', checked)}
            />
            <span className="text-xs text-text-muted">
              {formState.isActive !== false ? 'Active contact person' : 'Inactive contact record'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <CancelButton
                size="sm"
                onClick={handleCancelEdit}
                className="text-xs shadow-2xs"
              />
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddOrUpdate}
              className="text-xs font-semibold cursor-pointer"
            >
              {isEditing ? (
                <>
                  <IconCheck size={14} className="mr-1.5" />
                  Update Contact
                </>
              ) : (
                <>
                  <IconAdd size={14} className="mr-1.5" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Grid Below (Responsive Table on Desktop/Tablet, Responsive Cards on Mobile) ── */}
      <div className="space-y-2.5">
        {effectiveRows.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-surface/20 space-y-1.5">
            <IconUser size={22} className="mx-auto text-text-muted/60" />
            <p className="text-xs font-medium text-heading">No contact persons added</p>
            <p className="text-2xs text-text-muted">
              Use the form above to add primary coordinators or executives for this client.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (md+) */}
            <div className="hidden md:block">
              <TableContainer
                className="overflow-x-auto rounded-xl border border-border"
                tableClassName="min-w-full text-left border-collapse text-xs table-auto"
              >
                <thead className="bg-surface/80 border-b border-border">
                  <tr>
                    <Th className="py-2.5 px-3.5 min-w-[180px]">FULL NAME</Th>
                    <Th className="py-2.5 px-3.5 min-w-[140px] whitespace-nowrap">PRIMARY PHONE</Th>
                    <Th className="py-2.5 px-3.5 min-w-[140px] whitespace-nowrap">ALTERNATE PHONE</Th>
                    <Th className="py-2.5 px-3.5 min-w-[190px]">EMAIL</Th>
                    <Th className="py-2.5 px-3.5 w-28 text-center whitespace-nowrap">STATUS</Th>
                    <Th className="py-2.5 px-3.5 w-24 text-right whitespace-nowrap">ACTIONS</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg">
                  {effectiveRows.map((row, index) => {
                    const rowId = row.clientContactPersonId || row.id || `clientContactPersonId_${index}`;
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
                        <Td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-2xs font-bold">
                              {row.firstName ? row.firstName[0].toUpperCase() : 'U'}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-heading text-xs">{fullName}</span>
                              {row.isPrimary ? (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30">
                                  Primary
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(rowId)}
                                  title="Set this contact as primary"
                                  className="text-2xs text-text-muted hover:text-primary transition-colors cursor-pointer hover:underline"
                                >
                                  Make Primary
                                </button>
                              )}
                            </div>
                          </div>
                        </Td>

                        {/* Mobile 1 */}
                        <Td className="py-3 px-3.5 font-mono tabular-nums text-text">
                          {row.mobile1 ? (
                            <a
                              href={`tel:${row.mobile1}`}
                              className="hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <IconPhone size={12} className="text-text-muted shrink-0" />
                              <span>{row.mobile1}</span>
                            </a>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </Td>

                        {/* Mobile 2 */}
                        <Td className="py-3 px-3.5 font-mono tabular-nums text-text-muted">
                          {row.mobile2 ? (
                            <a
                              href={`tel:${row.mobile2}`}
                              className="hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <IconPhone size={12} className="text-text-muted/60 shrink-0" />
                              <span>{row.mobile2}</span>
                            </a>
                          ) : (
                            '—'
                          )}
                        </Td>

                        {/* Email */}
                        <Td className="py-3 px-3.5 text-xs">
                          {row.email ? (
                            <a
                              href={`mailto:${row.email}`}
                              className="text-text hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <IconMail size={12} className="text-text-muted shrink-0" />
                              <span className="truncate max-w-[200px]">{row.email}</span>
                            </a>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </Td>

                        {/* Status Badge (Static, edited via edit action) */}
                        <Td className="py-3 px-3.5 text-center">
                          <span
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none shadow-2xs',
                              row.isActive !== false
                                ? 'bg-success/10 text-success border border-success/30'
                                : 'bg-surface text-text-muted border border-border',
                            ].join(' ')}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                row.isActive !== false ? 'bg-success' : 'bg-text-muted/60'
                              }`}
                              aria-hidden="true"
                            />
                            {row.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </Td>

                        {/* Actions */}
                        <Td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <IconButton
                              icon={IconEdit}
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit(row)}
                              title="Edit Contact"
                              aria-label="Edit Contact"
                              className="hover:text-primary hover:bg-surface"
                            />
                            <IconButton
                              icon={IconDelete}
                              size="sm"
                              variant="ghost"
                              onClick={() => setContactToDelete(row)}
                              title="Remove Contact"
                              aria-label="Remove Contact"
                              className="hover:text-danger hover:bg-danger/10"
                            />
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>

            {/* Mobile Responsive Cards (< md) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
              {effectiveRows.map((row, index) => {
                const rowId = row.clientContactPersonId || row.id || `clientContactPersonId_${index}`;
                const isCurrentEditing = editingId === rowId;
                const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || '—';

                return (
                  <div
                    key={rowId}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 bg-surface/40 ${
                      isCurrentEditing
                        ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-2xs font-bold">
                          {row.firstName ? row.firstName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-heading text-xs">{fullName}</span>
                          {row.isPrimary ? (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30">
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(rowId)}
                              title="Set this contact as primary"
                              className="text-2xs text-text-muted hover:text-primary transition-colors cursor-pointer hover:underline"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                      </div>
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium select-none shadow-2xs',
                          row.isActive !== false
                            ? 'bg-success/10 text-success border border-success/30'
                            : 'bg-surface text-text-muted border border-border',
                        ].join(' ')}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.isActive !== false ? 'bg-success' : 'bg-text-muted/60'
                          }`}
                        />
                        {row.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="text-2xs text-text space-y-1.5 pt-1 border-t border-border/50">
                      {row.mobile1 && (
                        <div className="flex items-center gap-1.5">
                          <IconPhone size={12} className="text-text-muted shrink-0" />
                          <a href={`tel:${row.mobile1}`} className="font-mono text-heading hover:text-primary">
                            {row.mobile1}
                          </a>
                        </div>
                      )}
                      {row.mobile2 && (
                        <div className="flex items-center gap-1.5">
                          <IconPhone size={12} className="text-text-muted/60 shrink-0" />
                          <a href={`tel:${row.mobile2}`} className="font-mono text-text-muted hover:text-primary">
                            {row.mobile2} (alt)
                          </a>
                        </div>
                      )}
                      {row.email && (
                        <div className="flex items-center gap-1.5">
                          <IconMail size={12} className="text-text-muted shrink-0" />
                          <a href={`mailto:${row.email}`} className="text-primary truncate hover:underline">
                            {row.email}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onEdit(row)}
                        className="text-xs"
                      >
                        <IconEdit size={13} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger-soft"
                        size="xs"
                        onClick={() => setContactToDelete(row)}
                        className="text-xs text-danger"
                      >
                        <IconDelete size={13} className="mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Single Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Remove Contact Person"
        message={
          <span>
            Are you sure you want to remove contact person{' '}
            <strong className="text-heading font-semibold">
              &quot;{`${contactToDelete?.firstName || ''} ${contactToDelete?.lastName || ''}`.trim()}&quot;
            </strong>
            ? This action cannot be undone.
          </span>
        }
        confirmText="Remove Contact"
        cancelText="Cancel"
        variant="danger"
      />
    </Card>
  );
}
