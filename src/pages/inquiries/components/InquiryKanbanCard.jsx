import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconEye,
  IconEdit,
  IconUserPlus,
  IconGrip,
  IconCalendar,
} from '../../../constants/icons';
import { Badge, Button } from '../../../components/ui';
import { getPriorityBadgeVariant } from '../../../mocks/inquiries';
import { formatDate } from '../../../utils/dateUtils';

/**
 * InquiryKanbanCard — MicroFlat ERP Kanban Card tailored for Inquiry management.
 */
function InquiryKanbanCard({
  inquiry,
  assigneeName = 'Unassigned',
  onAssignClick,
  onMoveStage,
  availableStages = [],
}) {
  const navigate = useNavigate();

  const id = inquiry.id || inquiry.InquiryId;
  const isUnassigned = !inquiry.AssignedTo || assigneeName === 'Unassigned';
  const displayDate = inquiry.RequiredByDate || inquiry.InquiryDate || inquiry.CreatedOn;

  return (
    <div
      onClick={() => navigate(`/inquiries/${id}`)}
      className="bg-surface border border-border hover:border-primary/50 rounded-xl p-3.5 shadow-2xs transition-all duration-200 cursor-pointer space-y-2.5 relative group"
    >
      {/* ── Card Top Row: Grip Handle + Inquiry No + Priority Badge ── */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-text-muted/40 group-hover:text-text-muted/80 transition-colors shrink-0 -ml-1 cursor-grab"
            title="Drag to change stage"
          >
            <IconGrip size={14} />
          </span>
          <span className="font-mono text-xs font-bold text-primary hover:underline truncate">
            {inquiry.InquiryNo}
          </span>
        </div>

        <Badge
          variant={getPriorityBadgeVariant(inquiry.Priority)}
          className="text-3xs uppercase font-semibold px-1.5 py-0.5 shrink-0"
        >
          {inquiry.Priority || 'Low'}
        </Badge>
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

      {/* ── Card Bottom: Assignee (Full width visible) + Desktop Hover Actions ── */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-border/40 min-h-[26px]">
        {/* Assignee display */}
        <div className="flex items-center gap-1.5 min-w-0 text-2xs flex-1">
          <span className="text-text-muted/70 text-3xs shrink-0">Assigned:</span>
          <span
            className={`font-medium truncate ${
              isUnassigned ? 'text-text-muted/60 italic' : 'text-heading'
            }`}
            title={assigneeName}
          >
            {assigneeName}
          </span>
        </div>

        {/* Quick action buttons on hover (Desktop only: hidden by default so it takes 0 width) */}
        <div
          className="hidden sm:group-hover:flex items-center gap-0.5 shrink-0 bg-surface/90 pl-1 rounded-l-md transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {onAssignClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={inquiry.AssignedTo ? 'Reassign' : 'Assign'}
              onClick={(e) => {
                e.stopPropagation();
                onAssignClick(inquiry);
              }}
              className="h-6 w-6 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
            >
              <IconUserPlus size={13} />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Edit Inquiry"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inquiries/${id}/edit`);
            }}
            className="h-6 w-6 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
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
            className="h-6 w-6 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
          >
            <IconEye size={13} />
          </Button>
        </div>
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
              value={inquiry.StatusId}
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
          {onAssignClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={inquiry.AssignedTo ? 'Reassign' : 'Assign'}
              onClick={(e) => {
                e.stopPropagation();
                onAssignClick(inquiry);
              }}
              className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
            >
              <IconUserPlus size={13} />
            </Button>
          )}

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
        </div>
      </div>
    </div>
  );
}

export default memo(InquiryKanbanCard);
