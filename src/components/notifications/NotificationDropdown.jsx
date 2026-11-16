/**
 * NotificationDropdown.jsx — Floating dropdown popover for notifications.
 * Anchored directly under the header Bell icon.
 *
 * Replaces the right-hand slide-over Drawer with a compact, focused popover.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  ShieldCheck,
  Bell,
  Clock,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { useNotifications } from '../../context/NotificationsContext';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'Meeting':
      return <Calendar size={15} className="text-primary shrink-0" />;
    case 'Approval':
      return <CheckSquare size={15} className="text-warning shrink-0" />;
    case 'System':
      return <ShieldCheck size={15} className="text-success shrink-0" />;
    default:
      return <Bell size={15} className="text-secondary shrink-0" />;
  }
}

export default function NotificationDropdown({ isOpen, onClose }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const {
    recentNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotifications();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (!isOpen) return;
      // If clicking inside dropdown or on the trigger button, don't close here
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest('#header-notification-bell')
      ) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = recentNotifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onClose?.();
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleViewAll = () => {
    onClose?.();
    navigate('/my-queue?tab=notifications');
  };

  return (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-bg border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      {/* ── Dropdown Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-heading">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="primary" size="xs">
              {unreadCount} new
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || loading}
          className={`flex items-center gap-1 text-2xs font-medium transition-colors cursor-pointer ${
            unreadCount === 0 || loading
              ? 'text-text-muted opacity-50 cursor-not-allowed'
              : 'text-primary hover:text-primary/80'
          }`}
          title="Mark all as read"
        >
          <CheckCheck size={14} />
          <span>Mark all read</span>
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center px-4 py-2 border-b border-border bg-surface/30">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-primary text-on-primary'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
          >
            All ({recentNotifications.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'UNREAD'
                ? 'bg-primary text-on-primary'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* ── Scrollable Notifications List ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-border max-h-80 sm:max-h-96">
        {filteredItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="All caught up!"
              description={
                filter === 'UNREAD'
                  ? 'No unread notifications right now.'
                  : 'No recent activity or notifications.'
              }
            />
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(item);
                }
              }}
              className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                item.isRead ? 'bg-bg hover:bg-surface/70' : 'bg-primary/5 hover:bg-primary/10'
              }`}
            >
              {/* Type Icon Container */}
              <div className="p-1.5 rounded-lg bg-surface border border-border shadow-2xs mt-0.5 shrink-0">
                {getNotificationIcon(item.notificationType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1.5">
                  <p
                    className={`text-xs ${
                      item.isRead ? 'font-medium text-heading' : 'font-semibold text-primary'
                    }`}
                  >
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>

                <p className="text-2xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" size="xs">
                    {item.notificationType}
                  </Badge>
                  <span className="flex items-center gap-1 text-3xs text-text-muted">
                    <Clock size={11} />
                    {formatRelativeTime(item.createdOn)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Dropdown Footer ── */}
      <div className="p-2.5 border-t border-border bg-surface/50">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleViewAll}
          iconRight={<ExternalLink size={13} />}
        >
          View All in My Queue
        </Button>
      </div>
    </div>
  );
}

