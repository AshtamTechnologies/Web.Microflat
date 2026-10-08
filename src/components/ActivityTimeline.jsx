/**
 * ActivityTimeline.jsx — Reusable vertical timeline component for audit trails & activity history.
 *
 * Props:
 *   - activities: Array<{ id, type: 'created'|'status'|'assignment', timestamp: string, changedBy: string, fromValue?: string, toValue?: string, remarks?: string, title?: string }>
 *   - emptyMessage?: string
 *   - className?: string
 */

import {
  PlusCircle,
  RefreshCw,
  UserCheck,
  UserPlus,
  Clock,
  ArrowRight,
  MessageSquare,
  FileCheck,
  Activity as ActivityIcon,
} from 'lucide-react';
import Badge from './ui/Badge';

function getActivityConfig(type = '') {
  switch (type.toLowerCase()) {
    case 'created':
      return {
        icon: <PlusCircle size={15} className="text-primary" />,
        badgeVariant: 'role',
        bgDot: 'bg-primary/10 border-primary/30',
        defaultTitle: 'Inquiry Created',
      };
    case 'status':
      return {
        icon: <RefreshCw size={14} className="text-warning" />,
        badgeVariant: 'warning',
        bgDot: 'bg-warning/10 border-warning/30',
        defaultTitle: 'Status Updated',
      };
    case 'assignment':
    case 'reassignment':
      return {
        icon: <UserCheck size={14} className="text-primary" />,
        badgeVariant: 'role',
        bgDot: 'bg-primary/10 border-primary/30',
        defaultTitle: 'Assigned / Reassigned',
      };
    case 'comment':
    case 'note':
      return {
        icon: <MessageSquare size={14} className="text-primary" />,
        badgeVariant: 'info',
        bgDot: 'bg-primary/10 border-primary/30',
        defaultTitle: 'Comment Added',
      };
    default:
      return {
        icon: <Clock size={14} className="text-text-muted" />,
        badgeVariant: 'neutral',
        bgDot: 'bg-surface border-border',
        defaultTitle: 'Activity Event',
      };
  }
}

export default function ActivityTimeline({
  activities = [],
  emptyMessage = 'No activity history recorded yet.',
  className = '',
}) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20">
        <Clock size={20} className="mx-auto text-text-muted/60 mb-2" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort activities newest first if timestamps are provided
  const sortedActivities = [...activities].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical Connecting Line */}
      <div
        className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-border pointer-events-none"
        aria-hidden="true"
      />

      {sortedActivities.map((item, index) => {
        const config = getActivityConfig(item.type);

        return (
          <div key={item.id || index} className="relative group">
            {/* Timeline Dot Node with Icon */}
            <div
              className={`absolute -left-6 top-0.5 w-7 h-7 rounded-full border flex items-center justify-center bg-surface shadow-2xs z-10 transition-transform duration-150 group-hover:scale-110 ${config.bgDot}`}
            >
              {config.icon}
            </div>

            {/* Timeline Entry Body */}
            <div className="bg-bg hover:bg-surface/40 p-3.5 sm:p-4 rounded-xl border border-border transition-colors duration-150 space-y-2">
              {/* Header: Title / Actor & Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-heading">
                    {item.title || config.defaultTitle}
                  </span>
                  {item.changedBy && (
                    <>
                      <span className="text-text-muted text-[11px]">•</span>
                      <span className="text-xs text-text font-medium">
                        by <strong className="text-heading">{item.changedBy}</strong>
                      </span>
                    </>
                  )}
                </div>

                {item.timestamp && (
                  <span className="font-mono text-[11px] text-text-muted shrink-0 tabular-nums">
                    {item.timestamp}
                  </span>
                )}
              </div>

              {/* Value Transition (fromValue -> toValue) */}
              {(item.fromValue || item.toValue) && (
                <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                  {item.fromValue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted font-medium line-through">
                      {item.fromValue}
                    </span>
                  )}
                  {item.fromValue && item.toValue && (
                    <ArrowRight size={13} className="text-text-muted shrink-0" />
                  )}
                  {item.toValue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-semibold">
                      {item.toValue}
                    </span>
                  )}
                </div>
              )}

              {/* Remarks / Comments */}
              {item.remarks && (
                <div className="pt-1.5 border-t border-border/60 flex items-start gap-1.5 text-xs text-text-muted bg-surface/30 p-2 rounded-lg">
                  <MessageSquare size={13} className="text-text-muted shrink-0 mt-0.5" />
                  <p className="italic text-text break-words leading-relaxed">
                    "{item.remarks}"
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
