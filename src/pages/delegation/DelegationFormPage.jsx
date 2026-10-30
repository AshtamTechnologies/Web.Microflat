/**
 * DelegationFormPage.jsx — Full-page form for delegating Approval page access.
 *
 * Routes:
 *   - /delegation/new
 *   - /delegation/:id/edit
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Card,
  CollapsibleCard,
  Input,
  SearchableSelect,
  DatePicker,
  Textarea,
  Badge,
  IconButton,
  SaveButton,
  CancelButton,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import {
  IconDelegation,
  IconBack,
  IconUserCheck,
  IconUser,
  IconLayers,
  IconAdd,
  IconClose,
  IconError,
  IconEdit,
  IconCheck,
} from '../../constants/icons';
import { useDelegationForm } from './hooks/useDelegationForm';
import { useUserOptions, getUserName } from '../../context/UsersContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  APPROVAL_PAGE_OPTIONS,
  DELEGATION_REASON_OPTIONS,
  getApprovalPage,
} from '../../constants/delegation';
import { formatDate, getTodayISO } from '../../utils/dateUtils';

export default function DelegationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from || '/delegation';

  const { user } = useAuthContext();
  const { options: userOptions, loading: usersLoading } = useUserOptions();

  const {
    isLoadingRecord,
    loadError,
    formData,
    assignments,
    draftAssignment,
    editingAssignmentId,
    errors,
    isSubmitting,
    currentUserId,
    setFieldValue,
    setDraftValue,
    addAssignment,
    removeAssignment,
    startEditAssignment,
    cancelEditAssignment,
    handleBlur,
    handleSubmit,
  } = useDelegationForm({
    id,
    onSuccess: () =>
      navigate(isEdit ? `/delegation/${id}` : '/delegation?tab=given', {
        replace: isEdit,
        state: isEdit ? { from: returnPath } : undefined,
      }),
    onClose: () =>
      navigate(isEdit ? `/delegation/${id}` : returnPath, {
        replace: isEdit,
        state: isEdit ? { from: returnPath } : undefined,
      }),
  });

  const today = getTodayISO();

  // Column resizing state for Assigned Approval Authorities table
  const [columnWidths, setColumnWidths] = useState({
    approvalPage: 230,
    delegate: 230,
    period: 190,
    note: 280,
    action: 110,
  });
  const [resizingCol, setResizingCol] = useState(null);

  const handleResizeStart = (colKey) => (e) => {
    e.preventDefault();
    setResizingCol(colKey);
    const startX = e.clientX || e.touches?.[0]?.clientX || 0;
    const startWidth = columnWidths[colKey] || 200;

    const onMouseMove = (moveEvent) => {
      const currentX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX || 0;
      const diff = currentX - startX;
      const minWidth = colKey === 'action' ? 90 : 120;
      const newWidth = Math.max(minWidth, startWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
  };

  // Logged-in user display details
  const currentUserName = user?.name || user?.fullName || getUserName(currentUserId);
  const firstRole = Array.isArray(user?.roles) ? user.roles[0] : user?.role;
  const currentUserRole =
    typeof firstRole === 'object' && firstRole !== null
      ? firstRole.roleName || firstRole.name || 'User'
      : typeof firstRole === 'string' && firstRole
      ? firstRole
      : 'User';

  // Active colleague options excluding the current user
  const delegateOptions = useMemo(() => {
    return userOptions.filter(
      (opt) => String(opt.value).trim() !== String(currentUserId).trim()
    );
  }, [userOptions, currentUserId]);

  const handleCancel = () => {
    navigate(isEdit ? `/delegation/${id}` : returnPath, {
      replace: isEdit,
      state: isEdit ? { from: returnPath } : undefined,
    });
  };

  // Loading existing record in Edit mode
  if (isEdit && isLoadingRecord) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs text-text-muted">Loading delegation details for editing…</p>
      </div>
    );
  }

  // Load error in Edit mode
  if (isEdit && loadError) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4 bg-bg border border-border shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Failed to Load Delegation</h2>
          <p className="text-sm text-text-muted">{loadError}</p>
          <Button variant="primary" size="sm" onClick={() => navigate('/delegation')}>
            Back to Delegations
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20 w-full">
      {/* ── Top Header & Actions ── */}
      <PageHeader
        title={isEdit ? 'Edit Delegation' : 'New Delegation'}
        subtitle={
          isEdit
            ? 'Modify colleague assignment, delegated dates, or approval page authority.'
            : 'Temporarily delegate your approval authorities to designated colleagues during your absence.'
        }
        icon={<IconDelegation className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            {isEdit ? 'Back to Details' : 'Back to Delegations'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={handleCancel}
              disabled={isSubmitting}
              size="sm"
            />
            <SaveButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              size="sm"
              className="shadow-2xs"
            >
              {isEdit ? 'Save Changes' : 'Save Delegation'}
            </SaveButton>
          </div>
        }
      />

      {/* ── Section 1: Delegation Parameters ── */}
      <CollapsibleCard
        title="Delegation Parameters"
        subtitle="Delegator details, authority period, and reason."
        icon={<IconUserCheck size={18} />}
        defaultOpen={true}
        hasError={Boolean(errors.fromDate || errors.toDate || errors.reason)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Col 1: Current User — Read-only inline with other fields */}
          <div>
            <Input
              id="delegator"
              label="Current User"
              value={`${currentUserName} (${currentUserRole})`}
              disabled
              leftIcon={<IconUser size={15} />}
              hint="Current logged-in user"
              className="bg-border/30 font-medium text-text cursor-not-allowed"
            />
          </div>

          {/* Col 2: From (Start date) */}
          <div>
            <DatePicker
              id="fromDate"
              name="fromDate"
              label="From (Start date)"
              value={formData.fromDate}
              min={isEdit ? undefined : today}
              onChange={(e) => setFieldValue('fromDate', e.target.value)}
              onBlur={handleBlur}
              error={errors.fromDate}
              required
            />
          </div>

          {/* Col 3: To (End date) */}
          <div>
            <DatePicker
              id="toDate"
              name="toDate"
              label="To (End date)"
              value={formData.toDate}
              min={formData.fromDate || today}
              onChange={(e) => setFieldValue('toDate', e.target.value)}
              onBlur={handleBlur}
              error={errors.toDate}
              required
            />
          </div>

          {/* Col 4: Reason */}
          <div>
            <SearchableSelect
              id="reason"
              name="reason"
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFieldValue('reason', e.target.value)}
              onBlur={handleBlur}
              options={DELEGATION_REASON_OPTIONS}
              placeholder="Select reason"
              error={errors.reason}
              required
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Section 2: Approval Authority Handover ── */}
      <CollapsibleCard
        title="Approval Authority Handover"
        subtitle={
          isEdit
            ? 'Review or adjust the delegated approval page and assigned colleague.'
            : 'Assign each approval page to a colleague with specific handover instructions.'
        }
        icon={<IconLayers size={18} />}
        defaultOpen={true}
        hasError={Boolean(errors.assignments || errors.approvalPageKey || errors.delegateId)}
        badge={
          !isEdit && assignments.length > 0 ? (
            <Badge variant="role" size="sm">
              {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
            </Badge>
          ) : null
        }
      >
        {isEdit ? (
          /* EDIT MODE: Single Assignment Edit Form */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SearchableSelect
                  id="approvalPageKey"
                  name="approvalPageKey"
                  label="Approval Page"
                  value={formData.approvalPageKey}
                  onChange={(e) => setFieldValue('approvalPageKey', e.target.value)}
                  options={APPROVAL_PAGE_OPTIONS}
                  placeholder="Select approval page"
                  error={errors.approvalPageKey}
                  required
                />
              </div>

              <div>
                <SearchableSelect
                  id="delegateId"
                  name="delegateId"
                  label="Delegate To (Colleague)"
                  value={formData.delegateId}
                  onChange={(e) => setFieldValue('delegateId', e.target.value)}
                  options={delegateOptions}
                  disabled={usersLoading}
                  placeholder={usersLoading ? 'Loading users…' : 'Select a colleague'}
                  error={errors.delegateId}
                  required
                />
              </div>
            </div>

            <div>
              <Textarea
                id="note"
                name="note"
                label="Note for the delegate"
                placeholder="e.g. Please verify vendor tax documents and bank account verification forms."
                value={formData.note}
                onChange={(e) => setFieldValue('note', e.target.value)}
                onBlur={handleBlur}
                maxLength={250}
                rows={2}
                error={errors.note}
                hint={`${(formData.note || '').length}/250 characters (optional)`}
              />
            </div>
          </div>
        ) : (
          /* CREATE MODE: Add Assignment Row & Table */
          <div className="space-y-5">
            {/* Add Assignment Sub-Form */}
            <div className={`p-4 rounded-xl border transition-colors ${editingAssignmentId ? 'bg-primary/5 border-primary/30' : 'bg-surface/50 border-border'} space-y-3`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-heading uppercase tracking-wider">
                  {editingAssignmentId ? 'Edit Approval Assignment' : 'Add Approval Assignment'}
                </span>
                <span className="text-2xs text-text-muted">
                  {editingAssignmentId ? 'Update the colleague or note for this approval page' : 'Each assignment has its own delegate and note'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-3">
                  <SearchableSelect
                    id="draftApprovalPage"
                    name="approvalPageKey"
                    label="Approval Page"
                    value={draftAssignment.approvalPageKey}
                    onChange={(e) => setDraftValue('approvalPageKey', e.target.value)}
                    options={APPROVAL_PAGE_OPTIONS}
                    placeholder="Select approval page"
                  />
                </div>

                <div className="sm:col-span-3">
                  <SearchableSelect
                    id="draftDelegateId"
                    label="Delegate To"
                    value={draftAssignment.delegateId}
                    onChange={(e) => setDraftValue('delegateId', e.target.value)}
                    options={delegateOptions}
                    disabled={usersLoading}
                    placeholder={usersLoading ? 'Loading users…' : 'Select colleague'}
                  />
                </div>

                <div className="sm:col-span-4">
                  <Input
                    id="draftNote"
                    label="Note for Delegate"
                    placeholder="e.g. Expedite urgent pending items (optional)"
                    value={draftAssignment.note}
                    onChange={(e) => setDraftValue('note', e.target.value)}
                    maxLength={250}
                  />
                </div>

                <div className="sm:col-span-2 pt-0 sm:pt-6">
                  {editingAssignmentId ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon={IconCheck}
                        onClick={addAssignment}
                        className="flex-1 justify-center h-[34px] shadow-2xs text-xs font-semibold"
                      >
                        Update
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditAssignment}
                        className="h-[34px] px-2 text-xs"
                        title="Cancel edit"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={IconAdd}
                      onClick={addAssignment}
                      className="w-full justify-center h-[34px] shadow-2xs text-xs font-semibold"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>

              {/* Draft validation error */}
              {errors.assignmentDraft && (
                <p className="text-xs text-danger font-medium mt-1">{errors.assignmentDraft}</p>
              )}
            </div>

            {/* Assigned Authorities Grid / Table */}
            <div className="space-y-2">
              <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                Assigned Approval Authorities ({assignments.length})
              </span>

              {assignments.length > 0 ? (
                <>
                  {/* Desktop / Tablet Table View (hidden on small mobile <640px) */}
                  <div className="hidden sm:block">
                    <TableContainer tableClassName="table-fixed min-w-full">
                      <thead>
                        <tr>
                          <Th
                            style={{ width: `${columnWidths.approvalPage}px` }}
                            isResizing={resizingCol === 'approvalPage'}
                            resizeHandler={handleResizeStart('approvalPage')}
                          >
                            Approval Page
                          </Th>
                          <Th
                            style={{ width: `${columnWidths.delegate}px` }}
                            isResizing={resizingCol === 'delegate'}
                            resizeHandler={handleResizeStart('delegate')}
                          >
                            Delegated Colleague
                          </Th>
                          <Th
                            style={{ width: `${columnWidths.period}px` }}
                            isResizing={resizingCol === 'period'}
                            resizeHandler={handleResizeStart('period')}
                          >
                            Handover Period
                          </Th>
                          <Th
                            style={{ width: `${columnWidths.note}px` }}
                            isResizing={resizingCol === 'note'}
                            resizeHandler={handleResizeStart('note')}
                          >
                            Note for Delegate
                          </Th>
                          <Th
                            style={{ width: `${columnWidths.action}px` }}
                            className="text-right"
                          >
                            Action
                          </Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70 bg-bg">
                        {assignments.map((item) => {
                          const pageMeta = getApprovalPage(item.approvalPageKey);
                          const delegateName = getUserName(item.delegateId);
                          const isCurrentEditing = editingAssignmentId === item.id;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isCurrentEditing
                                  ? 'bg-primary/10 hover:bg-primary/15'
                                  : 'hover:bg-surface/50'
                              }`}
                            >
                              {/* Approval Page */}
                              <Td style={{ width: `${columnWidths.approvalPage}px` }} className="align-middle">
                                <Badge variant="role" size="sm" className="font-semibold">
                                  {pageMeta?.label || item.approvalPageLabel}
                                </Badge>
                                {pageMeta?.description && (
                                  <span className="text-2xs text-text-muted truncate block mt-1 leading-tight">
                                    {pageMeta.description}
                                  </span>
                                )}
                              </Td>

                              {/* Colleague */}
                              <Td style={{ width: `${columnWidths.delegate}px` }} className="align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xs shrink-0">
                                    {delegateName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold text-heading truncate block">
                                      {delegateName}
                                    </span>
                                    <span className="text-2xs text-text-muted font-mono block">
                                      ID: {item.delegateId}
                                    </span>
                                  </div>
                                </div>
                              </Td>

                              {/* Handover Period */}
                              <Td style={{ width: `${columnWidths.period}px` }} className="align-middle">
                                <span className="font-mono text-xs text-heading whitespace-nowrap block">
                                  {formatDate(formData.fromDate)}
                                </span>
                                <span className="text-2xs text-text-muted block">
                                  to {formatDate(formData.toDate)}
                                </span>
                              </Td>

                              {/* Individual Note — Plain Text */}
                              <Td style={{ width: `${columnWidths.note}px` }} className="align-middle">
                                <span className="text-xs text-text block max-w-sm break-words">
                                  {item.note || '—'}
                                </span>
                              </Td>

                              {/* Action: Edit & Delete */}
                              <Td style={{ width: `${columnWidths.action}px` }} className="align-middle text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    icon={IconEdit}
                                    title="Edit assignment"
                                    aria-label="Edit assignment"
                                    onClick={() => startEditAssignment(item)}
                                    className="text-text-muted hover:text-primary hover:bg-primary/10"
                                  />
                                  <IconButton
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    icon={IconClose}
                                    title="Remove assignment"
                                    aria-label="Remove assignment"
                                    onClick={() => removeAssignment(item.id)}
                                    className="text-text-muted hover:text-danger hover:bg-danger/10"
                                  />
                                </div>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </TableContainer>
                  </div>

                  {/* Mobile Stacked Card View (visible only on <640px screens) */}
                  <div className="block sm:hidden space-y-3">
                    {assignments.map((item) => {
                      const pageMeta = getApprovalPage(item.approvalPageKey);
                      const delegateName = getUserName(item.delegateId);
                      const isCurrentEditing = editingAssignmentId === item.id;

                      return (
                        <Card
                          key={item.id}
                          padding="sm"
                          className={`border shadow-2xs space-y-2.5 transition-colors ${
                            isCurrentEditing ? 'bg-primary/5 border-primary/40' : 'bg-bg border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                            <div>
                              <Badge variant="role" size="sm" className="font-semibold">
                                {pageMeta?.label || item.approvalPageLabel}
                              </Badge>
                              {pageMeta?.description && (
                                <span className="text-2xs text-text-muted block mt-1">
                                  {pageMeta.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <IconButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                icon={IconEdit}
                                title="Edit assignment"
                                aria-label="Edit assignment"
                                onClick={() => startEditAssignment(item)}
                                className="text-text-muted hover:text-primary hover:bg-primary/10"
                              />
                              <IconButton
                                type="button"
                                size="sm"
                                variant="ghost"
                                icon={IconClose}
                                title="Remove assignment"
                                aria-label="Remove assignment"
                                onClick={() => removeAssignment(item.id)}
                                className="text-text-muted hover:text-danger hover:bg-danger/10"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-2xs text-text-muted block">Delegate</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xs shrink-0">
                                  {delegateName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-heading truncate">
                                  {delegateName}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-2xs text-text-muted block">Period</span>
                              <span className="font-mono text-heading text-2xs block mt-0.5">
                                {formatDate(formData.fromDate)} – {formatDate(formData.toDate)}
                              </span>
                            </div>
                          </div>

                          {item.note && (
                            <div className="pt-1 border-t border-border/40">
                              <span className="text-2xs text-text-muted block mb-0.5">Note:</span>
                              <p className="text-xs text-text break-words">
                                {item.note}
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Empty state placeholder when no rows added */
                <div className="border border-dashed border-border rounded-xl p-6 text-center bg-surface/20">
                  <p className="text-xs text-text-muted">
                    No approval pages assigned yet. Fill in the approval page, delegate, and note above, then click{' '}
                    <span className="font-semibold text-heading">&ldquo;Add&rdquo;</span>.
                  </p>
                </div>
              )}

              {/* Top-level assignments error */}
              {errors.assignments && (
                <p className="text-xs text-danger font-medium mt-1.5">{errors.assignments}</p>
              )}
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* ── Bottom Action Buttons ── */}
      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
        <CancelButton
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        />
        <SaveButton
          type="submit"
          size="sm"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="font-semibold shadow-2xs"
        >
          {isEdit ? 'Save Changes' : 'Save Delegation'}
        </SaveButton>
      </div>
    </form>
  );
}
