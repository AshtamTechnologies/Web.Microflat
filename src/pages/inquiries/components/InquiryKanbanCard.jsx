import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconEye,
  IconEdit,
  IconUserPlus,
  IconGrip,
  IconCalendar,
  IconQuotation,
  IconMeeting,
} from '../../../constants/icons';
import { Badge, Button, TableActions } from '../../../components/ui';
import { formatDate } from '../../../utils/dateUtils';
import { getInquiryStage } from '../inquiryStages';

function getPriorityBadgeVariant(priority) {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'neutral';
}

/**
 * InquiryKanbanCard — MicroFlat ERP Kanban Card tailored for Inquiry management.
 */
function InquiryKanbanCard({
  inquiry,
  assigneeName = 'Unassigned',
  onAssignClick,
  onMoveStage,
  availableStages = [],
  linkedQuotation = null,
  inquiryStage = null,
}) {
  const navigate = useNavigate();

  const id = inquiry.id || inquiry.InquiryId;
  const isUnassigned = !inquiry.AssignedTo || assigneeName === 'Unassigned';
  const displayDate = inquiry.RequiredByDate || inquiry.InquiryDate || inquiry.CreatedOn;
  const activeStage = inquiryStage || inquiry.StatusId;
  const stageMeta = getInquiryStage(activeStage);
  const status = inquiry.status || inquiry.StatusId || '';
  const canCreateQuotation =
    status === 'New' || status === 'Quoting';

  const overflowActions = [
    ...(linkedQuotation
      ? [
          {
            label: `View Quotation (${linkedQuotation.quotationNo})`,
            icon: IconQuotation,
            onClick: () =>
              navigate(`/quotations/${linkedQuotation.id || linkedQuotation.quotationNo}`, {
                state: { from: '/inquiries' },
              }),
          },
        ]
      : canCreateQuotation
      ? [
          {
            label: 'Create Quotation',
            icon: IconQuotation,
            onClick: () =>
              navigate(`/quotations/new?inquiryId=${id}`, {
                state: { from: '/inquiries' },
              }),
          },
        ]
      : []),
    {
      label: 'Schedule Meeting',
      icon: IconMeeting,
      onClick: () =>
        navigate(`/meetings/new?inquiryId=${id}`, {
          state: { from: '/inquiries' },
        }),
    },
    ...(onAssignClick
      ? [
          {
            label: inquiry.AssignedTo ? 'Reassign Inquiry' : 'Assign Inquiry',
            icon: IconUserPlus,
            onClick: () => onAssignClick(inquiry),
          },
        ]
      : []),
  ];

  return (
    <div
      onClick={() => navigate(`/inquiries/${id}`)}
      className="bg-surface border border-border hover:border-primary/50 rounded-xl p-3.5 shadow-2xs transition-all duration-200 cursor-pointer space-y-2.5 relative group"
    >
      {/* ── Card Top Row: Grip Handle + Inquiry No + Status & Priority Badges ── */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-text-muted/40 group-hover:text-text-muted/80 transition-colors shrink-0 -ml-1 cursor-grab"
            title="Drag to change stage"
          >
            <IconGrip size={14} className="pointer-events-none select-none" />
          </span>
          <span className="font-mono text-xs font-bold text-primary hover:underline truncate">
            {inquiry.InquiryNo}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {stageMeta && (
            <span
              className={`text-[9.5px] leading-none uppercase font-semibold px-1.5 py-0.5 rounded border ${
                stageMeta.badgeClass || 'bg-surface text-text-muted border-border'
              }`}
            >
              {stageMeta.name || activeStage}
            </span>
          )}
          <Badge
            variant={getPriorityBadgeVariant(inquiry.Priority)}
            size="sm"
            className="text-[9.5px] leading-none uppercase font-semibold px-1.5 py-0.5 shrink-0"
          >
            {inquiry.Priority || ''}
          </Badge>
        </div>
      </div>

      {/* ── Customer Name & Subject ── */}
      <div>
        <h4
          className="text-xs font-semibold text-heading leading-snug line-clamp-1"
          title={inquiry.CustomerName}
        >
          {inquiry.CustomerName}
        </h4>
        {inquiry.Subject && (
          <p
            className="text-2xs text-text-muted line-clamp-2 mt-0.5 leading-relaxed"
            title={inquiry.Subject}
          >
            {inquiry.Subject}
          </p>
        )}
      </div>

      {/* ── Linked Quotation Pill ── */}
      {linkedQuotation && (
        <div
          className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-2xs cursor-pointer hover:bg-amber-500/20 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/quotations/${linkedQuotation.id || linkedQuotation.quotationNo}`);
          }}
          title={`View Quotation ${linkedQuotation.quotationNo}${linkedQuotation.status ? ` (${linkedQuotation.status})` : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <IconQuotation size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300 truncate text-[10px]">
              {linkedQuotation.quotationNo}
            </span>
          </div>
          {linkedQuotation.status && (
            <span className="text-[9.5px] uppercase font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              {linkedQuotation.status}
            </span>
          )}
        </div>
      )}

      {/* ── Date Meta ── */}
      {displayDate && (
        <div className="flex items-center justify-between text-2xs text-text-muted pt-1 border-t border-border/50">
          <span className="text-3xs text-text-muted">
            {inquiry.RequiredByDate ? 'Required by' : 'Date'}:
          </span>
          <div className="flex items-center gap-1 font-mono text-3xs font-medium text-heading">
            <IconCalendar size={11} className="text-text-muted/70 shrink-0" />
            <span>{formatDate(displayDate)}</span>
          </div>
        </div>
      )}

      {/* ── Assigned Meta (Full width visible) ── */}
      <div className="flex items-center justify-between gap-2 text-2xs pt-1 border-t border-border/40">
        <span className="text-text-muted/70 text-3xs shrink-0">Assigned:</span>
        <span
          className={`font-medium truncate text-right ${
            isUnassigned ? 'text-text-muted/60 italic' : 'text-heading'
          }`}
          title={assigneeName}
        >
          {assigneeName}
        </span>
      </div>

      {/* ── Card Bottom Actions (Desktop) ── */}
      <div
        className="hidden sm:flex items-center justify-end gap-1 pt-1.5 border-t border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Edit Inquiry"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inquiries/${id}/edit`);
          }}
          className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
        >
          <IconEdit size={13} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="View Details"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/inquiries/${id}`);
          }}
          className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
        >
          <IconEye size={13} />
        </Button>

        <TableActions overflowActions={overflowActions} />
      </div>

      {/* ── Mobile-Only Quick Stage Selector & Actions (sm:hidden) ── */}
      <div
        className="sm:hidden pt-2 border-t border-border/30 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {onMoveStage && availableStages.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-3xs text-text-muted font-medium shrink-0">Stage:</span>
            <select
              value={activeStage}
              onChange={(e) => {
                e.stopPropagation();
                onMoveStage(id, e.target.value);
              }}
              aria-label="Change inquiry stage"
              className="text-xs font-semibold bg-surface-muted text-heading border border-border rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer w-full"
            >
              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  Move to {stage.name || stage.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Edit Inquiry"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inquiries/${id}/edit`);
            }}
            className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
          >
            <IconEdit size={13} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="View Details"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inquiries/${id}`);
            }}
            className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
          >
            <IconEye size={13} />
          </Button>

          <TableActions overflowActions={overflowActions} />
        </div>
      </div>
    </div>
  );
}

export default memo(InquiryKanbanCard);
