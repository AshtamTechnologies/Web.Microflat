/**
 * src/pages/deals/components/DealKanbanCard.jsx — MicroFlat ERP Kanban Card tailored for Deals & Negotiations.
 * Modeled directly after InquiryKanbanCard.jsx for 100% design consistency.
 */

import { memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  IconEye,
  IconEdit,
  IconGrip,
  IconCalendar,
  IconQuotation,
  IconInquiry,
  IconMessageSquare,
} from '../../../constants/icons';
import { Badge, Button, TableActions } from '../../../components/ui';
import { formatDate } from '../../../utils/dateUtils';

function formatCurrency(val, currency = 'INR') {
  if (val === null || val === undefined || val === '') return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${Number(val).toLocaleString('en-IN')}`;
}

function DealKanbanCard({
  deal,
  onMoveStage,
  availableStages = [],
  onEditClick,
  onLogDiscussionClick,
}) {
  const navigate = useNavigate();
  const id = deal.id;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Won':
        return 'success';
      case 'On Hold':
        return 'warning';
      case 'Lost':
        return 'danger';
      default:
        return 'primary';
    }
  };

  const overflowActions = [
    ...(deal.canQuote !== false
      ? [
          {
            label: 'Create Quotation',
            icon: IconQuotation,
            onClick: () =>
              navigate(`/quotations/new`, {
                state: {
                  fromDeal: true,
                  dealId: deal.id,
                  dealNo: deal.dealNo,
                  inquiryId: deal.inquiryId,
                  inquiryNo: deal.inquiryNo,
                  clientId: deal.clientId,
                  clientName: deal.clientName,
                  quotationValue: deal.negotiatedValue ?? deal.expectedValue,
                },
              }),
          },
        ]
      : []),
    ...(onLogDiscussionClick && deal.isEditable !== false
      ? [
          {
            label: 'Log Discussion',
            icon: IconMessageSquare,
            onClick: () => onLogDiscussionClick(deal),
          },
        ]
      : []),
  ];

  return (
    <div
      onClick={() => navigate(`/deals/${id}`)}
      className="bg-surface border border-border hover:border-primary/50 rounded-xl p-3.5 shadow-2xs transition-all duration-200 cursor-pointer space-y-2.5 relative group"
    >
      {/* ── Card Top Row: Grip Handle + Deal No + Status Badge ── */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-text-muted/40 group-hover:text-text-muted/80 transition-colors shrink-0 -ml-1 cursor-grab"
            title="Drag to change stage"
          >
            <IconGrip size={14} className="pointer-events-none select-none" />
          </span>
          <span className="font-mono text-xs font-bold text-primary hover:underline truncate">
            {deal.dealNo}
          </span>
        </div>

        <Badge
          variant={getStatusVariant(deal.dealStatus)}
          className="text-3xs uppercase font-semibold px-1.5 py-0.5 shrink-0"
        >
          {deal.dealStatus || 'Open'}
        </Badge>
      </div>

      {/* ── Customer Name & Inquiry Link ── */}
      <div>
        <h4
          className="text-xs font-semibold text-heading leading-snug line-clamp-1 group-hover:text-primary transition-colors"
          title={deal.clientName}
        >
          {deal.clientName}
        </h4>
        <div className="flex items-center gap-1.5 text-3xs text-text-muted font-mono mt-0.5">
          <IconInquiry size={11} className="text-text-muted/70 shrink-0" />
          <span className="truncate">{deal.inquiryNo}</span>
          {deal.clientCode && <span>• {deal.clientCode}</span>}
        </div>
      </div>

      {/* ── Commercial Figures ── */}
      <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-3xs text-text-muted block">Expected</span>
          <span className="font-mono text-xs font-semibold text-heading tabular-nums">
            {formatCurrency(deal.expectedValue, deal.currencyCode)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-3xs text-text-muted block">Negotiated</span>
          <span
            className={`font-mono text-xs tabular-nums font-bold ${
              deal.negotiatedValue !== null
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-text-muted font-normal italic'
            }`}
          >
            {deal.negotiatedValue !== null
              ? formatCurrency(deal.negotiatedValue, deal.currencyCode)
              : 'In Discussion'}
          </span>
        </div>
      </div>

      {/* ── Date Meta ── */}
      {deal.dealDate && (
        <div className="flex items-center justify-between text-2xs text-text-muted pt-1 border-t border-border/50">
          <span className="text-3xs text-text-muted">Deal Date:</span>
          <div className="flex items-center gap-1 font-mono text-3xs font-medium text-heading">
            <IconCalendar size={11} className="text-text-muted/70 shrink-0" />
            <span>{formatDate(deal.dealDate)}</span>
          </div>
        </div>
      )}

      {/* ── Card Bottom Actions (Desktop) ── */}
      <div
        className="hidden sm:flex items-center justify-end gap-1 pt-1.5 border-t border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {deal.isEditable !== false && onEditClick && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Edit Deal"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(deal);
            }}
            className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface-muted cursor-pointer"
          >
            <IconEdit size={13} />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="View Details"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/deals/${id}`);
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
              value={deal.dealStatus}
              onChange={(e) => {
                e.stopPropagation();
                onMoveStage(id, e.target.value, deal.dealStatus);
              }}
              aria-label="Change deal stage"
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
            title="View Details"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/deals/${id}`);
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

export default memo(DealKanbanCard);
