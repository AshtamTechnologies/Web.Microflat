/**
 * DelegationFormPage.jsx — Full-page form for delegating Approval page access.
 *
 * Routes:
 *   - /delegation/new
 *   - /delegation/:id/edit
 */

import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Card,
  CollapsibleCard,
  Input,
  SearchableSelect,
  DatePicker,
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
  IconLayers,
  IconAdd,
  IconClose,
  IconError,
  IconEdit,
  IconCheck,
} from '../../constants/icons';
import { useDelegationForm } from './hooks/useDelegationForm';
import { formatDate, getTodayISO } from '../../utils/dateUtils';

export default function DelegationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from || '/delegation';
  const isFromAllDelegations = returnPath.startsWith('/delegation/all');

  const {
    isInForceEdit,
    isLoadingRecord,
    lookupsLoading,
    delegatesLoading,
    loadError,
    formData,
    assignments,
    draftAssignment,
    editingAssignmentId,
    approvalPageOptions,
    delegatorOptions,
    delegateOptions,
    errors,
    isSubmitting,
    getApprovalPageMeta,
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
    onSuccess: () => {
      const destination = returnPath.startsWith('/delegation/all')
        ? '/delegation/all'
        : isEdit
        ? `/delegation/${id}`
        : '/delegation?tab=given';
      navigate(destination, {
        replace: isEdit,
        state: isEdit ? { from: returnPath } : undefined,
      });
    },
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
        hasError={Boolean(
          errors.delegatorUserId || errors.startDate || errors.endDate || errors.reason
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Col 1: Delegating User (From) */}
          <div>
            <SearchableSelect
              id="delegatorUserId"
              name="delegatorUserId"
              label="Delegating User (From)"
              value={formData.delegatorUserId}
              onChange={(e) => setFieldValue('delegatorUserId', e.target.value)}
              options={delegatorOptions}
              disabled={isEdit || !isFromAllDelegations || lookupsLoading}
              placeholder={lookupsLoading ? 'Loading users…' : 'Select delegating user'}
              error={errors.delegatorUserId}
              required
            />
          </div>

          {/* Col 2: From (Start date) */}
          <div>
            <DatePicker
              id="startDate"
              name="startDate"
              label="From (Start date)"
              value={formData.startDate}
              min={isEdit ? undefined : today}
              disabled={isInForceEdit}
              onChange={(e) => setFieldValue('startDate', e.target.value)}
              onBlur={handleBlur}
              error={errors.startDate}
              required
            />
          </div>

          {/* Col 3: To (End date) */}
          <div>
            <DatePicker
              id="endDate"
              name="endDate"
              label="To (End date)"
              value={formData.endDate}
              min={isInForceEdit ? today : formData.startDate || today}
              onChange={(e) => setFieldValue('endDate', e.target.value)}
              onBlur={handleBlur}
              error={errors.endDate}
              required
            />
          </div>

          {/* Col 4: Reason */}
          <div>
            <Input
              id="reason"
              name="reason"
              label="Reason"
              value={formData.reason}
              onChange={(e) => setFieldValue('reason', e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g. Leave, Travel, Training..."
              maxLength={250}
              error={errors.reason}
              required
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Section 2: Approval Authority Handover ── */}
      <CollapsibleCard
        title="Approval Authority Handover"
        subtitle="Assign each approval page to a colleague with specific handover instructions."
        icon={<IconLayers size={18} />}
        defaultOpen={true}
        hasError={Boolean(errors.assignments)}
        badge={
          assignments.length > 0 ? (
            <Badge variant="role" size="sm">
              {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
            </Badge>
          ) : null
        }
      >
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
              <div className="lg:col-span-3">
                <SearchableSelect
                  id="draftApprovalPage"
                  name="moduleId"
                  label="Approval Page"
                  value={draftAssignment.moduleId}
                  onChange={(e) => setDraftValue('moduleId', e.target.value)}
                  options={approvalPageOptions}
                  disabled={lookupsLoading}
                  placeholder={lookupsLoading ? 'Loading pages…' : 'Select approval page'}
                />
              </div>

              <div className="lg:col-span-3">
                <SearchableSelect
                  id="draftDelegateId"
                  label="Delegate To"
                  value={draftAssignment.delegateUserId}
                  onChange={(e) => setDraftValue('delegateUserId', e.target.value)}
                  options={delegateOptions}
                  disabled={delegatesLoading}
                  placeholder={delegatesLoading ? 'Loading users…' : 'Select colleague'}
                />
              </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    id="draftNote"
                    label="Note for Delegate"
                    placeholder="e.g. Expedite urgent pending items (optional)"
                    value={draftAssignment.note}
                    onChange={(e) => setDraftValue('note', e.target.value)}
                    maxLength={250}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3 pt-0 lg:pt-6">
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
                  {/* Desktop Table View (hidden on mobile/tablet <1024px) */}
                  <div className="hidden lg:block">
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
                          const pageMeta = getApprovalPageMeta(item.moduleId);
                          const delegateName =
                            item.delegateName || `User #${item.delegateUserId}`;
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
                                  {pageMeta?.moduleName || item.moduleName || `Module #${item.moduleId}`}
                                </Badge>
                                {(pageMeta?.approverRoleName || item.moduleCode) && (
                                  <span className="text-2xs text-text-muted truncate block mt-1 leading-tight">
                                    {pageMeta?.approverRoleName
                                      ? `Role: ${pageMeta.approverRoleName}`
                                      : item.moduleCode}
                                  </span>
                                )}
                              </Td>

                              {/* Colleague */}
                              <Td style={{ width: `${columnWidths.delegate}px` }} className="align-middle">
                                <div className="min-w-0">
                                  <span className="font-semibold text-heading truncate block">
                                    {delegateName}
                                  </span>
                                  {item.delegateEmail && (
                                    <span className="text-2xs text-text-muted truncate block">
                                      {item.delegateEmail}
                                    </span>
                                  )}
                                </div>
                              </Td>

                              {/* Handover Period */}
                              <Td style={{ width: `${columnWidths.period}px` }} className="align-middle">
                                <span className="font-mono text-xs text-heading whitespace-nowrap block">
                                  {formatDate(formData.startDate)}
                                </span>
                                <span className="text-2xs text-text-muted block">
                                  to {formatDate(formData.endDate)}
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

                  {/* Mobile / Tablet Stacked Card View (visible on <1024px screens) */}
                  <div className="block lg:hidden space-y-3">
                    {assignments.map((item) => {
                      const pageMeta = getApprovalPageMeta(item.moduleId);
                      const delegateName =
                        item.delegateName || `User #${item.delegateUserId}`;
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
                                {pageMeta?.moduleName || item.moduleName || `Module #${item.moduleId}`}
                              </Badge>
                              {(pageMeta?.approverRoleName || item.moduleCode) && (
                                <span className="text-2xs text-text-muted block mt-1">
                                  {pageMeta?.approverRoleName
                                    ? `Role: ${pageMeta.approverRoleName}`
                                    : item.moduleCode}
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
                              <span className="font-semibold text-heading truncate block mt-0.5">
                                {delegateName}
                              </span>
                            </div>

                            <div>
                              <span className="text-2xs text-text-muted block">Period</span>
                              <span className="font-mono text-heading text-2xs block mt-0.5">
                                {formatDate(formData.startDate)} – {formatDate(formData.endDate)}
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
