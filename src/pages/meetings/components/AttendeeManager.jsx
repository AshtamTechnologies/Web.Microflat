/**
 * AttendeeManager.jsx — Reusable attendee list editor for Meeting forms & view.
 *
 * Supports:
 * - Internal employees via custom SearchableSelect combobox
 * - External guests via Name & Email inputs
 * - Resizable column grid with draggable Th resize handles (TanStack Table)
 * - Clean text formatting without avatars
 * - Delete action with confirmation modal
 */

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Button,
  Input,
  SearchableSelect,
  Badge,
  TableContainer,
  Th,
  Td,
  ConfirmModal,
} from '../../../components/ui';
import {
  IconAdd,
  IconDelete,
  IconUsers,
} from '../../../constants/icons';
import { mockUsers } from '../../../mocks/users';

export default function AttendeeManager({
  attendees = [],
  onChange,
  userOptions = [],
  readOnly = false,
}) {
  const [attendeeType, setAttendeeType] = useState('internal'); // 'internal' | 'external'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [attendeeToDelete, setAttendeeToDelete] = useState(null);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Build resolved user options: userOptions or fallback to active mock users
  const resolvedUserOptions = useMemo(() => {
    if (Array.isArray(userOptions) && userOptions.length > 0) {
      return userOptions;
    }
    return mockUsers
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        value: String(u.id),
        label: `${u.firstName} ${u.lastName}`.trim() || u.email,
        email: u.email,
        role: u.role || (Array.isArray(u.roles) ? u.roles[0] : 'Team Member'),
        user: u,
      }));
  }, [userOptions]);

  // Filter out users already in attendee list
  const availableUserOptions = useMemo(() => {
    return resolvedUserOptions.filter(
      (u) => !attendees.some((a) => String(a.userId) === String(u.value))
    );
  }, [resolvedUserOptions, attendees]);

  function handleAddInternal() {
    if (!selectedUserId) {
      setAddError('Please select a team member from the dropdown.');
      return;
    }
    const option = resolvedUserOptions.find((u) => String(u.value) === String(selectedUserId));
    const newAttendee = {
      userId: selectedUserId,
      name: option?.label || (option?.user ? `${option.user.firstName} ${option.user.lastName}` : 'Staff Member'),
      email: option?.email || option?.user?.email || '',
      role: option?.role || option?.user?.role || option?.user?.primaryRole || 'Team Member',
      isInternal: true,
    };
    onChange([...attendees, newAttendee]);
    setSelectedUserId('');
    setAddError('');
  }

  function handleAddExternal() {
    const trimmedName = externalName.trim();
    const trimmedEmail = externalEmail.trim();

    if (!trimmedName) {
      setAddError('Please enter the guest name.');
      return;
    }

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    // Check duplicate email
    if (trimmedEmail && attendees.some((a) => (a.email || a.externalEmail || '').toLowerCase() === trimmedEmail.toLowerCase())) {
      setEmailError('An attendee with this email address has already been added.');
      return;
    }

    const newAttendee = {
      externalName: trimmedName,
      externalEmail: trimmedEmail,
      isInternal: false,
    };
    onChange([...attendees, newAttendee]);
    setExternalName('');
    setExternalEmail('');
    setAddError('');
    setEmailError('');
  }

  function handleRemove(index) {
    const updated = attendees.filter((_, i) => i !== index);
    onChange(updated);
  }

  function handleConfirmDelete() {
    if (attendeeToDelete) {
      handleRemove(attendeeToDelete.index);
      setAttendeeToDelete(null);
    }
  }

  // Resizable TanStack Columns
  const columns = useMemo(() => {
    const cols = [
      {
        id: 'name',
        header: 'PARTICIPANT',
        cell: ({ row }) => {
          const att = row.original;
          const isInternal = att.isInternal ?? Boolean(att.userId);
          const displayName = isInternal
            ? att.name || `User #${att.userId}`
            : att.externalName || 'Guest';
          return (
            <span className="font-semibold text-heading text-sm block truncate" title={displayName}>
              {displayName}
            </span>
          );
        },
        size: 260,
      },
      {
        id: 'type',
        header: 'TYPE',
        cell: ({ row }) => {
          const isInternal = row.original.isInternal ?? Boolean(row.original.userId);
          return (
            <Badge variant={isInternal ? 'primary' : 'warning'} size="sm">
              {isInternal ? 'Internal' : 'External'}
            </Badge>
          );
        },
        size: 110,
      },
      {
        id: 'email',
        header: 'EMAIL',
        cell: ({ row }) => {
          const att = row.original;
          const displayEmail = att.email || att.externalEmail || '—';
          return (
            <span className="text-text-muted text-xs font-mono block truncate" title={displayEmail}>
              {displayEmail}
            </span>
          );
        },
        size: 220,
      },
      {
        id: 'role',
        header: 'ROLE / ORG',
        cell: ({ row }) => {
          const att = row.original;
          const isInternal = att.isInternal ?? Boolean(att.userId);
          const displayRole = isInternal ? att.role || 'Internal' : 'External Guest';
          return (
            <span className="text-text-muted text-xs block truncate" title={displayRole}>
              {displayRole}
            </span>
          );
        },
        size: 180,
      },
    ];

    if (!readOnly) {
      cols.push({
        id: 'action',
        header: 'ACTION',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setAttendeeToDelete({ index: row.index, attendee: row.original })}
                className="p-1.5 text-text-muted hover:text-danger rounded-md hover:bg-danger/10 transition-colors"
                title="Remove attendee"
              >
                <IconDelete className="w-4 h-4" />
              </button>
            </div>
          );
        },
        size: 80,
      });
    }

    return cols;
  }, [readOnly]);

  const table = useReactTable({
    data: attendees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const totalTableWidth = table.getCenterTotalSize();

  return (
    <div className="space-y-4">
      {/* Add Attendee Bar (Hidden in readOnly mode) */}
      {!readOnly && (
        <div className="p-4 rounded-xl border border-border bg-surface-hover/30 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase text-text-muted">Add Attendee:</span>
            <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-surface border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setAttendeeType('internal');
                  setAddError('');
                  setEmailError('');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  attendeeType === 'internal'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Internal Team
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendeeType('external');
                  setAddError('');
                  setEmailError('');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  attendeeType === 'external'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                External Guest
              </button>
            </div>
          </div>

          {attendeeType === 'internal' ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 min-w-[240px]">
                <SearchableSelect
                  value={selectedUserId}
                  onChange={(e) => {
                    const val = e?.target?.value !== undefined ? e.target.value : e;
                    setSelectedUserId(val);
                    if (addError) setAddError('');
                  }}
                  options={availableUserOptions}
                  placeholder="Search and select colleague..."
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddInternal}
                className="gap-1.5 shrink-0"
              >
                <IconAdd className="w-4 h-4" />
                Add Internal
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <Input
                  value={externalName}
                  onChange={(e) => {
                    setExternalName(e.target.value);
                    if (addError) setAddError('');
                  }}
                  placeholder="Guest / Client Name *"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => {
                    setExternalEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (addError) setAddError('');
                  }}
                  placeholder="Email Address (e.g. name@company.com)"
                  error={emailError}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddExternal}
                className="gap-1.5 shrink-0"
              >
                <IconAdd className="w-4 h-4" />
                Add Guest
              </Button>
            </div>
          )}

          {addError && <p className="text-xs text-danger font-medium">{addError}</p>}
        </div>
      )}

      {/* Attendees List Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-heading">
            <IconUsers className="w-4 h-4 text-primary" />
            <span>Invited Attendees</span>
            <Badge variant="neutral" size="sm">
              {attendees.length}
            </Badge>
          </div>
        </div>

        {attendees.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-xl bg-surface/50 text-text-muted text-sm">
            No attendees added yet. Add team members or external participants above.
          </div>
        ) : (
          <div className="overflow-hidden border border-border rounded-xl">
            <TableContainer
              className="border-0 rounded-none overflow-x-auto"
              tableStyle={{
                width: totalTableWidth > 0 ? `${totalTableWidth}px` : '100%',
                minWidth: '100%',
              }}
              tableClassName="text-left text-sm table-fixed"
            >
              <thead className="bg-surface border-b border-border text-xs text-text-muted font-semibold tracking-wider uppercase select-none">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Th
                        key={header.id}
                        style={{ width: `${header.getSize()}px` }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={header.column.getCanResize() ? header.getResizeHandler() : undefined}
                        className="py-2.5 px-3"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/60">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: `${cell.column.getSize()}px` }}
                        className="py-2.5 px-3"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          </div>
        )}
      </div>

      {/* Remove Attendee Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(attendeeToDelete)}
        onClose={() => setAttendeeToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Attendee"
        message={
          <span>
            Are you sure you want to remove{' '}
            <strong className="text-heading">
              {attendeeToDelete?.attendee?.name || attendeeToDelete?.attendee?.externalName || 'this attendee'}
            </strong>{' '}
            from the meeting?
          </span>
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
