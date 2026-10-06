/**
 * VendorEffectiveDatesGrid.jsx — ERP Effective Date Management Grid.
 *
 * Tracks vendor effective dates, version revisions, and scheduled/past effective records.
 * Statuses:
 * - Current Active: Latest revision with Effective Date <= Today
 * - Scheduled: Future Effective Date (> Today)
 * - Gone (Past): Historical revision superseded by a newer active date
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  History,
  Check,
  Info,
  CalendarCheck,
  CalendarClock,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Badge,
  Modal,
} from '../../components/ui';
import {
  getEffectiveDateStatus,
  computeRevisionStatuses,
  formatDateDisplay,
  getTodayIsoDate,
  generateNextRevisionNo,
} from '../../utils/effectiveDateUtils';

export default function VendorEffectiveDatesGrid({
  history = [],
  currentEffectiveDate = '',
  onChange,
  editable = true,
  vendorCode = '',
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Local state to guarantee immediate responsive UI updates
  const [localRevisions, setLocalRevisions] = useState(() => {
    let list = Array.isArray(history) && history.length > 0 ? [...history] : [];
    if (list.length === 0 && currentEffectiveDate) {
      list = [
        {
          id: 'eff_init',
          revisionNo: 'REV-001',
          effectiveDate: currentEffectiveDate,
          reason: 'Initial Vendor Master Onboarding & Registration',
          updatedBy: 'System / Ian Chesnut',
          updatedOn: `${currentEffectiveDate} 10:00 AM`,
        },
      ];
    }
    return computeRevisionStatuses(list);
  });

  // Sync with incoming prop changes
  useEffect(() => {
    let list = Array.isArray(history) && history.length > 0 ? [...history] : [];
    if (list.length === 0 && currentEffectiveDate) {
      list = [
        {
          id: 'eff_init',
          revisionNo: 'REV-001',
          effectiveDate: currentEffectiveDate,
          reason: 'Initial Vendor Master Onboarding & Registration',
          updatedBy: 'System / Ian Chesnut',
          updatedOn: `${currentEffectiveDate} 10:00 AM`,
        },
      ];
    }
    setLocalRevisions(computeRevisionStatuses(list));
  }, [history, currentEffectiveDate]);

  // Modal form state
  const [revisionForm, setRevisionForm] = useState({
    revisionNo: '',
    effectiveDate: getTodayIsoDate(),
    reason: '',
    updatedBy: 'Ian Chesnut',
  });
  const [formErrors, setFormErrors] = useState({});

  // Filtered by search
  const filteredRevisions = useMemo(() => {
    if (!searchTerm.trim()) return localRevisions;
    const q = searchTerm.toLowerCase();
    return localRevisions.filter(
      (r) =>
        r.revisionNo?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.effectiveDate?.includes(q) ||
        r.status?.toLowerCase().includes(q)
    );
  }, [localRevisions, searchTerm]);

  // Summary counts for Current Active, Scheduled, and Gone (Past)
  const summary = useMemo(() => {
    let activeCount = 0;
    let scheduledCount = 0;
    let goneCount = 0;

    localRevisions.forEach((r) => {
      const key = r.liveStatusInfo?.key || r.status;
      if (key === 'ACTIVE') activeCount++;
      else if (key === 'SCHEDULED') scheduledCount++;
      else if (key === 'GONE') goneCount++;
    });

    return {
      total: localRevisions.length,
      activeCount,
      scheduledCount,
      goneCount,
    };
  }, [localRevisions]);

  // Open modal to add a new revision
  const handleOpenAddModal = () => {
    const nextRev = generateNextRevisionNo(localRevisions);
    setEditingItem(null);
    setRevisionForm({
      revisionNo: nextRev,
      effectiveDate: getTodayIsoDate(),
      reason: '',
      updatedBy: 'Ian Chesnut',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal to edit existing revision
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setRevisionForm({
      revisionNo: item.revisionNo || '',
      effectiveDate: item.effectiveDate || getTodayIsoDate(),
      reason: item.reason || '',
      updatedBy: item.updatedBy || 'Ian Chesnut',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Save new or updated revision
  const handleSaveRevision = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = {};

    if (!revisionForm.revisionNo.trim()) {
      errors.revisionNo = 'Revision / Version No is required.';
    }
    if (!revisionForm.effectiveDate) {
      errors.effectiveDate = 'Effective Date is required.';
    }
    if (!revisionForm.reason.trim()) {
      errors.reason = 'Please enter a change description or revision reason.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let rawList = localRevisions.map((r) => ({
      id: r.id,
      revisionNo: r.revisionNo,
      effectiveDate: r.effectiveDate,
      reason: r.reason,
      updatedBy: r.updatedBy,
      updatedOn: r.updatedOn,
    }));

    if (editingItem) {
      // Update existing
      rawList = rawList.map((item) => {
        if (item.id === editingItem.id || item.revisionNo === editingItem.revisionNo) {
          return {
            ...item,
            revisionNo: revisionForm.revisionNo.trim().toUpperCase(),
            effectiveDate: revisionForm.effectiveDate,
            reason: revisionForm.reason.trim(),
            updatedBy: revisionForm.updatedBy || 'Ian Chesnut',
            updatedOn: `${timeStr} (Updated)`,
          };
        }
        return item;
      });
      toast.success(`Revision ${revisionForm.revisionNo} updated.`);
    } else {
      // Create new revision
      const newEntry = {
        id: `eff_${Date.now()}`,
        revisionNo: revisionForm.revisionNo.trim().toUpperCase(),
        effectiveDate: revisionForm.effectiveDate,
        reason: revisionForm.reason.trim(),
        updatedBy: revisionForm.updatedBy || 'Ian Chesnut',
        updatedOn: `${timeStr} 10:00 AM`,
      };
      rawList = [newEntry, ...rawList];
      toast.success(`New effective revision ${newEntry.revisionNo} added.`);
    }

    const recomputedList = computeRevisionStatuses(rawList);

    // Determine current active revision for parent sync
    const activeRevision =
      recomputedList.find((r) => r.liveStatusInfo?.key === 'ACTIVE') ||
      recomputedList[0];

    setLocalRevisions(recomputedList);
    setIsModalOpen(false);

    if (onChange) {
      onChange({
        effectiveDateHistory: recomputedList,
        effectiveDate: activeRevision?.effectiveDate || revisionForm.effectiveDate,
      });
    }
  };

  // Remove a revision
  const handleRemoveRevision = (item) => {
    if (localRevisions.length <= 1) {
      toast.error('At least one effective date revision record must be maintained.');
      return;
    }

    const rawList = localRevisions
      .filter((r) => r.id !== item.id && r.revisionNo !== item.revisionNo)
      .map((r) => ({
        id: r.id,
        revisionNo: r.revisionNo,
        effectiveDate: r.effectiveDate,
        reason: r.reason,
        updatedBy: r.updatedBy,
        updatedOn: r.updatedOn,
      }));

    const recomputedList = computeRevisionStatuses(rawList);
    const activeRevision =
      recomputedList.find((r) => r.liveStatusInfo?.key === 'ACTIVE') ||
      recomputedList[0];

    setLocalRevisions(recomputedList);

    if (onChange) {
      onChange({
        effectiveDateHistory: recomputedList,
        effectiveDate: activeRevision?.effectiveDate || '',
      });
    }
    toast.success(`Revision ${item.revisionNo} removed.`);
  };

  // Set selected revision as the active effective period immediately
  const handleMakeActiveNow = (item) => {
    const today = getTodayIsoDate();
    const rawList = localRevisions.map((r) => {
      if (r.id === item.id || r.revisionNo === item.revisionNo) {
        return {
          id: r.id,
          revisionNo: r.revisionNo,
          effectiveDate: today,
          reason: r.reason,
          updatedBy: r.updatedBy,
          updatedOn: r.updatedOn,
        };
      }
      return {
        id: r.id,
        revisionNo: r.revisionNo,
        effectiveDate: r.effectiveDate,
        reason: r.reason,
        updatedBy: r.updatedBy,
        updatedOn: r.updatedOn,
      };
    });

    const recomputedList = computeRevisionStatuses(rawList);

    setLocalRevisions(recomputedList);

    if (onChange) {
      onChange({
        effectiveDateHistory: recomputedList,
        effectiveDate: today,
      });
    }
    toast.success(`Revision ${item.revisionNo} is now set as effective today.`);
  };

  return (
    <div className="space-y-4">
      {/* ── ERP Grid Top Metrics Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface/70 border border-border">
        {/* Left: Summary Metric Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="font-semibold text-heading flex items-center gap-1.5">
            <History size={15} className="text-primary" />
            <span>Effective Revisions:</span>
            <span className="font-mono bg-bg px-2 py-0.5 rounded border border-border font-bold">
              {summary.total}
            </span>
          </span>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {summary.activeCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-medium border border-success/20">
              <CheckCircle2 size={12} />
              <span>{summary.activeCount} Current Active</span>
            </span>
          )}

          {summary.scheduledCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[11px] font-medium border border-warning/20">
              <CalendarClock size={12} />
              <span>{summary.scheduledCount} Scheduled</span>
            </span>
          )}

          {summary.goneCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral/10 text-text-muted text-[11px] font-medium border border-border">
              <Clock size={12} />
              <span>{summary.goneCount} Gone (Past)</span>
            </span>
          )}
        </div>

        {/* Right: Actions */}
        {editable && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="shrink-0"
          >
            <Plus size={14} className="mr-1" />
            <span>Add New Effective Date</span>
          </Button>
        )}
      </div>

      {/* ── ERP Revisions Data Table ── */}
      <div className="border border-border rounded-xl overflow-hidden bg-bg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface/80 border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5 font-medium">Rev No</th>
                <th className="py-3 px-3.5 font-medium">Effective Date</th>
                <th className="py-3 px-3.5 font-medium">ERP Status</th>
                <th className="py-3 px-3.5 font-medium min-w-[220px]">Change Description / Scope</th>
                <th className="py-3 px-3.5 font-medium">Logged By</th>
                {editable && <th className="py-3 px-3.5 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filteredRevisions.length === 0 ? (
                <tr>
                  <td colSpan={editable ? 6 : 5} className="py-8 text-center text-text-muted">
                    <History size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-heading">No revision history found</p>
                    <p className="text-[11px] mt-0.5">
                      Click &quot;Add New Effective Date&quot; to log a new effective revision.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRevisions.map((rev) => {
                  const statusInfo = rev.liveStatusInfo || getEffectiveDateStatus(rev.effectiveDate);
                  const isCurrent = statusInfo.key === 'ACTIVE';
                  const isFuture = statusInfo.key === 'SCHEDULED';
                  const isGone = statusInfo.key === 'GONE';

                  return (
                    <tr
                      key={rev.id || rev.revisionNo}
                      className={`transition-colors hover:bg-surface/50 ${
                        isCurrent ? 'bg-success/[0.03]' : isGone ? 'opacity-75' : ''
                      }`}
                    >
                      {/* Revision Code */}
                      <td className="py-3 px-3.5 font-mono font-bold text-heading whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{rev.revisionNo}</span>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-success ring-2 ring-success/20" title="Current Active Version" />
                          )}
                        </div>
                      </td>

                      {/* Effective Date */}
                      <td className="py-3 px-3.5 font-mono text-heading whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-primary shrink-0" />
                          <span>{formatDateDisplay(rev.effectiveDate)}</span>
                        </div>
                      </td>

                      {/* ERP Status Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Badge variant={statusInfo.badgeVariant}>
                          {statusInfo.label}
                        </Badge>
                      </td>

                      {/* Change Description */}
                      <td className="py-3 px-3.5 text-text leading-relaxed">
                        <p className="line-clamp-2 text-xs" title={rev.reason}>
                          {rev.reason || '—'}
                        </p>
                      </td>

                      {/* Logged By */}
                      <td className="py-3 px-3.5 text-text-muted whitespace-nowrap">
                        <div className="text-[11px]">
                          <p className="font-medium text-heading">{rev.updatedBy || 'Ian Chesnut'}</p>
                          <p className="text-[10px] font-mono">{rev.updatedOn || '—'}</p>
                        </div>
                      </td>

                      {/* Actions */}
                      {editable && (
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {isFuture && (
                              <button
                                type="button"
                                onClick={() => handleMakeActiveNow(rev)}
                                title="Activate revision immediately (set Effective Date = Today)"
                                className="px-2 py-1 rounded bg-success/10 hover:bg-success/20 text-success text-[11px] font-medium border border-success/20 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Check size={12} />
                                <span>Apply Now</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rev)}
                              title="Edit revision details"
                              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-border transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>

                            {localRevisions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRevision(rev)}
                                title="Remove this revision"
                                className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 border border-border transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Informational Footer Note */}
        <div className="p-3 bg-surface/40 border-t border-border flex items-center gap-2 text-[11px] text-text-muted">
          <Info size={14} className="text-primary shrink-0" />
          <span>
            Current Active revision applies to all vendor transactions. Scheduled revisions activate automatically on their effective date; past revisions are kept as historical audit trail (Gone).
          </span>
        </div>
      </div>

      {/* ── Add / Edit Revision Modal (using div container to prevent nested form HTML errors) ── */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            editingItem
              ? `Edit Effective Revision (${revisionForm.revisionNo})`
              : 'Add New Effective Date'
          }
          maxWidth="max-w-lg"
        >
          <div
            className="space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handleSaveRevision(e);
              }
            }}
          >
            {/* Top ERP Info Alert */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-text">
              <CalendarCheck size={16} className="text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-heading">
                  ERP Master Effective Date
                </p>
                <p className="text-text-muted text-[11px]">
                  Specify the date from which this revision takes effect. Dates in the future are Scheduled; the latest date on or before today is Current Active.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Revision / Version No */}
              <Input
                id="modalRevisionNo"
                name="revisionNo"
                label="Revision / Version No"
                placeholder="e.g. REV-002"
                required
                value={revisionForm.revisionNo}
                onChange={(e) =>
                  setRevisionForm((prev) => ({ ...prev, revisionNo: e.target.value.toUpperCase() }))
                }
                error={formErrors.revisionNo}
                className="font-mono uppercase"
              />

              {/* Effective Date Input */}
              <Input
                id="modalEffectiveDate"
                name="effectiveDate"
                type="date"
                label="Effective Date"
                required
                value={revisionForm.effectiveDate}
                onChange={(e) =>
                  setRevisionForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
                }
                error={formErrors.effectiveDate}
              />
            </div>

            {/* Change Reason / Scope Description */}
            <div className="space-y-1.5">
              <label htmlFor="modalReason" className="text-xs font-semibold text-heading">
                Change Description / Revision Scope <span className="text-danger">*</span>
              </label>
              <textarea
                id="modalReason"
                rows={3}
                placeholder="Detail the reason for this effective date revision (e.g. rate revision, contract renewal, new terms)..."
                value={revisionForm.reason}
                onChange={(e) =>
                  setRevisionForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-bg text-text text-xs p-2.5 placeholder:text-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {formErrors.reason && (
                <p className="text-[11px] text-danger">{formErrors.reason}</p>
              )}
            </div>

            {/* Live Effective Status Preview Badge */}
            <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between text-xs">
              <span className="text-text-muted">Expected ERP Status:</span>
              <Badge
                variant={
                  getEffectiveDateStatus(revisionForm.effectiveDate).badgeVariant
                }
              >
                {
                  getEffectiveDateStatus(revisionForm.effectiveDate).label
                }
              </Badge>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveRevision}
              >
                <Check size={14} className="mr-1" />
                {editingItem ? 'Update Revision' : 'Save Effective Date'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
