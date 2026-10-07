/**
 * AssignInquiryModal.jsx — Shared modal for assigning or reassigning an inquiry to an internal user.
 *
 * Sourced directly from UsersContext (useUsersContext) to reuse the active users array.
 */

import { useState, useEffect, useMemo } from 'react';
import { UserPlus, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '../../../components/ui';
import { useInquiriesContext } from '../../../context/InquiriesContext';
import { useUsersContext } from '../../../context/UsersContext';

export default function AssignInquiryModal({ isOpen, onClose, inquiry }) {
  const { reassignInquiry } = useInquiriesContext();
  const { allUsers = [], users = [] } = useUsersContext();

  const userList = allUsers.length > 0 ? allUsers : users;

  const [selectedUserId, setSelectedUserId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Derive current assignee display
  const currentAssigneeUser = useMemo(() => {
    if (!inquiry?.AssignedTo) return null;
    return userList.find((u) => u.id === inquiry.AssignedTo);
  }, [inquiry, userList]);

  const currentAssigneeName = currentAssigneeUser
    ? `${currentAssigneeUser.firstName} ${currentAssigneeUser.lastName}`
    : 'Unassigned';

  // Build user options for SearchableSelect
  const userOptions = useMemo(() => {
    return userList.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${Array.isArray(u.roles) ? u.roles.join(', ') : u.role || 'Staff'})`,
    }));
  }, [userList]);

  // Sync state on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(inquiry?.AssignedTo || '');
      setRemarks('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, inquiry]);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!selectedUserId) {
      setError('Please select an assignee from the list.');
      return;
    }

    setSubmitting(true);
    try {
      const res = reassignInquiry(inquiry.id || inquiry.InquiryId, selectedUserId, remarks);
      if (res.ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!inquiry) return null;

  const isReassignment = Boolean(inquiry.AssignedTo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReassignment ? 'Reassign Inquiry' : 'Assign Inquiry'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current State Info Banner */}
        <div className="p-3.5 bg-surface rounded-xl border border-border flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Inquiry Reference
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              {inquiry.InquiryNo}
            </span>
            <span className="text-xs text-text block truncate max-w-xs mt-0.5">
              {inquiry.CustomerName}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Current Assignee
            </span>
            <span className="text-xs font-medium text-heading">
              {currentAssigneeName}
            </span>
          </div>
        </div>

        {/* User SearchableSelect */}
        <div className="space-y-1.5">
          <SearchableSelect
            id="assignee-select"
            name="assignedUser"
            label="Select Assignee"
            placeholder="Search and choose team member..."
            searchPlaceholder="Search team members by name or role..."
            emptyText="No active team members found"
            required
            options={userOptions}
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              if (error) setError('');
            }}
            error={error}
          />
        </div>

        {/* Remarks */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="assignee-remarks"
            className="text-sm font-medium text-heading leading-none flex items-center gap-1.5"
          >
            <MessageSquare size={14} className="text-text-muted" />
            <span>Assignment Remarks / Handover Note (Optional)</span>
          </label>
          <textarea
            id="assignee-remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Assigned for technical feasibility review and BOM pricing estimate..."
            className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting}
          >
            {isReassignment ? (
              <>
                <UserCheck size={16} className="mr-1.5" />
                Confirm Reassignment
              </>
            ) : (
              <>
                <UserPlus size={16} className="mr-1.5" />
                Assign Inquiry
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
