/**
 * MeetingTable.jsx — TanStack DataTable presentation for Meetings module.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - Columns: Meeting Title, Date & Time, Type, Reference (Inquiry #), Attendees (count), Status, Actions.
 * - Supports both attendeeCount number and attendees array from backend responses.
 * - Draggable resizable columns with optimal sizing.
 * - Fully responsive with mobile card view (< md).
 */

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  DataTable,
  Badge,
  StatusBadge,
  IconButton,
  Button,
  Card,
} from '../../../components/ui';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconUsers,
  IconCheck,
  IconClose,
  IconView,
  IconEdit,
} from '../../../constants/icons';
import { formatDate } from '../../../utils/dateUtils';

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

export default function MeetingTable({
  meetings = [],
  loading = false,
  onView = () => {},
  onEdit = () => {},
  onComplete = () => {},
  onCancel = () => {},
}) {
  const columns = useMemo(() => {
    return [
      {
        id: 'title',
        header: 'MEETING TITLE',
        minSize: 180,
        size: 230,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="min-w-0 pr-2">
              <button
                type="button"
                onClick={() => onView(m)}
                className="font-semibold text-heading hover:text-primary transition-colors text-left text-xs sm:text-sm block leading-snug cursor-pointer"
                title={m.meetingTitle}
              >
                {m.meetingTitle}
              </button>
              {m.location && (
                <div className="flex items-center gap-1.5 text-2xs sm:text-xs text-text-muted mt-0.5 truncate">
                  <IconMapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{m.location}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'dateTime',
        header: 'DATE & TIME',
        minSize: 135,
        size: 145,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="whitespace-nowrap text-xs">
              <div className="flex items-center gap-1.5 font-medium text-text">
                <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>{formatDate(m.meetingDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted mt-0.5 font-mono text-2xs">
                <IconClock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {formatTime12(m.startTime)}
                  {m.endTime ? ` – ${formatTime12(m.endTime)}` : ''}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'type',
        header: 'TYPE',
        minSize: 85,
        size: 90,
        cell: ({ row }) => {
          const type = row.original.meetingType;
          return (
            <Badge
              variant={
                type === 'Client'
                  ? 'primary'
                  : type === 'Vendor'
                    ? 'warning'
                    : 'neutral'
              }
              size="sm"
            >
              {type}
            </Badge>
          );
        },
      },
      {
        id: 'reference',
        header: 'REFERENCE',
        minSize: 90,
        size: 100,
        cell: ({ row }) => {
          const ref = row.original.inquiryNumber || row.original.inquiryNo;
          return ref ? (
            <span className="font-mono text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 whitespace-nowrap inline-block">
              {ref}
            </span>
          ) : (
            <span className="text-xs text-text-muted italic">General</span>
          );
        },
      },
      {
        id: 'attendees',
        header: 'ATTENDEES',
        minSize: 105,
        size: 110,
        cell: ({ row }) => {
          const count =
            row.original.attendeeCount !== undefined && row.original.attendeeCount !== null
              ? Number(row.original.attendeeCount)
              : row.original.attendees?.length || 0;

          const attendeeNames = (row.original.attendees || [])
            .map((a) => a.name || a.externalName)
            .filter(Boolean)
            .join(', ');

          return (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-medium text-text whitespace-nowrap cursor-default"
              title={attendeeNames || `${count} Attendees`}
            >
              <IconUsers className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {count} {count === 1 ? 'Attendee' : 'Attendees'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'STATUS',
        minSize: 95,
        size: 100,
        cell: ({ row }) => {
          return <StatusBadge status={row.original.status} size="sm" />;
        },
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        minSize: 145,
        size: 150,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const m = row.original;
          const isScheduled = m.status === 'Scheduled';

          return (
            <div className="flex items-center justify-end gap-1 w-full">
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconView}
                title="View Details"
                aria-label="View Details"
                onClick={() => onView(m)}
                className="text-text-muted hover:text-primary hover:bg-surface transition-colors shrink-0"
              />
              {isScheduled && (
                <>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={IconEdit}
                    title="Edit Schedule"
                    aria-label="Edit Schedule"
                    onClick={() => onEdit(m)}
                    className="text-text-muted hover:text-primary hover:bg-surface transition-colors shrink-0"
                  />
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={IconCheck}
                    title="Mark as Completed"
                    aria-label="Mark as Completed"
                    onClick={() => onComplete(m)}
                    className="text-text-muted hover:text-success hover:bg-success/10 transition-colors shrink-0"
                  />
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={IconClose}
                    title="Cancel Meeting"
                    aria-label="Cancel Meeting"
                    onClick={() => onCancel(m)}
                    className="text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                  />
                </>
              )}
            </div>
          );
        },
      },
    ];
  }, [onView, onEdit, onComplete, onCancel]);

  const table = useReactTable({
    data: meetings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  /* ── Responsive Mobile Card Renderer (< md) ── */
  const renderMobileCard = (row) => {
    const m = row.original;
    const isScheduled = m.status === 'Scheduled';
    const attendeesCount =
      m.attendeeCount !== undefined && m.attendeeCount !== null
        ? Number(m.attendeeCount)
        : m.attendees?.length || 0;
    const ref = m.inquiryNumber || m.inquiryNo;

    return (
      <Card key={m.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Top Header: Title & Status */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onView(m)}
              className="font-bold text-sm text-heading hover:text-primary transition-colors text-left block"
            >
              {m.meetingTitle}
            </button>
            {m.location && (
              <div className="flex items-center gap-1.5 text-2xs text-text-muted mt-0.5">
                <IconMapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{m.location}</span>
              </div>
            )}
          </div>
          <StatusBadge status={m.status} size="sm" />
        </div>

        {/* Date, Time & Reference Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs py-1">
          <div>
            <span className="text-2xs text-text-muted block">Schedule</span>
            <div className="flex items-center gap-1 font-medium text-text mt-0.5">
              <IconCalendar className="w-3 h-3 text-text-muted shrink-0" />
              <span>{formatDate(m.meetingDate)}</span>
            </div>
            <span className="text-2xs text-text-muted font-mono block mt-0.5">
              {formatTime12(m.startTime)} {m.endTime ? `– ${formatTime12(m.endTime)}` : ''}
            </span>
          </div>

          <div>
            <span className="text-2xs text-text-muted block">Type & Reference</span>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <Badge
                variant={
                  m.meetingType === 'Client'
                    ? 'primary'
                    : m.meetingType === 'Vendor'
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {m.meetingType}
              </Badge>
              {ref && (
                <span className="font-mono text-2xs text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                  {ref}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attendees & Actions Footer */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface border border-border text-2xs font-medium text-text">
            <IconUsers className="w-3 h-3 text-primary shrink-0" />
            <span>
              {attendeesCount} {attendeesCount === 1 ? 'Attendee' : 'Attendees'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onView(m)}
              className="text-xs h-7 px-2"
            >
              Details
            </Button>
            {isScheduled && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onEdit(m)}
                className="text-xs h-7 px-2"
              >
                Edit
              </Button>
            )}
            {isScheduled && (
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconCheck}
                title="Mark Completed"
                onClick={() => onComplete(m)}
                className="text-text-muted hover:text-success hover:bg-success/10 h-7 w-7"
              />
            )}
            {isScheduled && (
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconClose}
                title="Cancel Meeting"
                onClick={() => onCancel(m)}
                className="text-text-muted hover:text-danger hover:bg-danger/10 h-7 w-7"
              />
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DataTable
      table={table}
      columns={columns}
      isLoading={loading}
      entityName="meetings"
      emptyTitle="No meetings found"
      emptyDescription="Try adjusting your search criteria, dates, or clearing filters."
      renderMobileCard={renderMobileCard}
      showPagination={true}
    />
  );
}
