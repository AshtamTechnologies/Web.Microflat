/**
 * UserViewPage.jsx — Comprehensive User profile view with Recent Logins & Activity audit trail.
 *
 * Route: /users/:id
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  ShieldCheck,
  Hash,
  Clock,
  Laptop,
  Smartphone as MobileIcon,
  Tablet,
  History,
  User,
  Shield,
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  TableContainer,
  Th,
  Td,
  ConfirmModal,
} from '../../components/ui';
import { useUsersContext } from '../../context/UsersContext';
import { useUserSessions } from '../../context/UserSessionsContext';
import { formatDateTime, formatDuration } from '../../utils/dateTime';
import UserFormModal from './UserFormModal';

export default function UserViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { users = [], allUsers = [], updateUser, deleteUser } = useUsersContext();
  const { getRecentSessions, getSessionStatus } = useUserSessions();

  const userList = allUsers.length > 0 ? allUsers : users;
  const user = useMemo(() => {
    return userList.find((u) => u.id === id) || null;
  }, [userList, id]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Recent 5 sessions
  const recentSessions = useMemo(() => {
    if (!user) return [];
    return getRecentSessions(user.id, 5);
  }, [user, getRecentSessions]);

  // User details computations
  const userRoles = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
    if (user.role) return [user.role];
    return ['Viewer'];
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return 'U';
    return `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'U';
  }, [user]);

  function getDeviceIcon(device = '') {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <MobileIcon size={14} className="text-primary/70 shrink-0" />;
      case 'tablet':
        return <Tablet size={14} className="text-primary/70 shrink-0" />;
      default:
        return <Laptop size={14} className="text-primary/70 shrink-0" />;
    }
  }

  async function handleEditSubmit(formData) {
    if (user?.id) {
      await updateUser(user.id, formData);
      setIsEditModalOpen(false);
    }
  }

  function handleDeleteConfirm() {
    if (user?.id) {
      deleteUser(user.id);
      setIsDeleteModalOpen(false);
      navigate('/users', { replace: true });
    }
  }

  if (!user) {
    return (
      <div className="space-y-6 pb-12 w-full">
        <div className="flex items-center gap-3">
          <Link
            to="/users"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-heading transition-colors"
          >
            <ArrowLeft size={14} /> Back to Users
          </Link>
        </div>

        <Card padding="lg" className="text-center py-16">
          <User size={40} className="mx-auto text-text-muted/40 mb-3" />
          <h2 className="text-lg font-bold text-heading">User Not Found</h2>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            The requested user account (ID: <code className="font-mono text-primary">{id}</code>) does not exist or has been removed.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/users')}
            className="mt-5"
          >
            Return to User Directory
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Navigation & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/users"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-heading transition-colors mb-1"
          >
            <ArrowLeft size={14} />
            Back to Users
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-heading tracking-tight">
              {user.firstName} {user.lastName}
            </h1>
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
                user.isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  user.isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 shadow-2xs"
          >
            <Pencil size={15} />
            Edit User
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-danger hover:bg-danger/10 hover:text-danger flex items-center gap-1.5"
          >
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CARD 1: User Details Card                                        */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card padding="md" className="bg-bg border border-border shadow-2xs space-y-6">
        {/* Header Profile Block */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-surface/60 border border-border">
          <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/20 text-primary font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-heading truncate">
                {user.firstName} {user.lastName}
              </h2>
              {user.id && (
                <span className="font-mono text-xs text-text-muted bg-bg border border-border px-2 py-0.5 rounded-md">
                  ID: {user.id}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-text-muted mt-1 flex items-center gap-1.5">
              <Mail size={13} className="shrink-0 text-text-muted/70" />
              <span className="truncate font-medium">{user.email || '—'}</span>
            </p>
          </div>
        </div>

        {/* Contact & Role Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Mobile */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl space-y-1">
            <span className="text-[11px] font-medium text-text-muted block uppercase tracking-wider">
              Primary Mobile
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
              <Phone size={14} className="text-primary shrink-0" />
              <span>{user.mobile || '—'}</span>
            </div>
          </div>

          {/* Secondary Phone */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl space-y-1">
            <span className="text-[11px] font-medium text-text-muted block uppercase tracking-wider">
              Secondary Phone
            </span>
            <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
              <Smartphone size={14} className="text-text-muted shrink-0" />
              <span>{user.secondaryPhone || 'Not provided'}</span>
            </div>
          </div>

          {/* Assigned Roles */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted block uppercase tracking-wider">
              Assigned Roles ({userRoles.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {userRoles.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  <ShieldCheck size={12} className="shrink-0" />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="p-3.5 bg-surface/40 border border-border rounded-xl flex items-start gap-3">
          <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-text-muted block uppercase tracking-wider">
              Registered Address
            </span>
            <p className="text-xs sm:text-sm text-heading leading-relaxed">
              {user.address || <span className="text-text-muted italic">No address provided</span>}
            </p>
          </div>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Recent Logins Card (between User Details & Activity)     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card padding="md" className="bg-bg border border-border shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-heading tracking-tight flex items-center gap-2">
              <History size={17} className="text-primary" />
              Recent Logins
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Last 5 sessions
            </p>
          </div>
          <span className="font-mono text-xs text-text-muted">
            {recentSessions.length} {recentSessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Desktop/Tablet Table (>= md) */}
        <div className="hidden md:block rounded-xl border border-border bg-bg overflow-hidden">
          {recentSessions.length > 0 ? (
            <TableContainer tableStyle={{ width: '100%' }}>
              <thead>
                <tr className="bg-surface">
                  <Th style={{ width: '20%' }}>LOGIN TIME</Th>
                  <Th style={{ width: '20%' }}>LOGOUT TIME</Th>
                  <Th style={{ width: '15%' }}>DURATION</Th>
                  <Th style={{ width: '15%' }}>IP ADDRESS</Th>
                  <Th style={{ width: '18%' }}>DEVICE</Th>
                  <Th style={{ width: '12%' }}>STATUS</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-bg">
                {recentSessions.map((sess) => {
                  const status = getSessionStatus(sess);
                  const isTimeout = sess.logoutType === 'timeout';
                  const isActive = !sess.logoutAt && !sess.logoutType;

                  let durationText = '—';
                  if (isActive) {
                    durationText = 'Active now';
                  } else if (isTimeout) {
                    durationText = '—';
                  } else if (sess.loginAt && sess.logoutAt) {
                    const start = new Date(sess.loginAt).getTime();
                    const end = new Date(sess.logoutAt).getTime();
                    const diff = Math.max(0, Math.abs(end - start));
                    durationText = formatDuration(diff);
                  }

                  return (
                    <tr key={sess.sessionId} className="hover:bg-surface/50 transition-colors">
                      {/* Login Time */}
                      <Td>
                        <span className="font-mono tabular-nums text-xs font-semibold text-heading">
                          {formatDateTime(sess.loginAt)}
                        </span>
                      </Td>

                      {/* Logout Time */}
                      <Td>
                        <span className="font-mono tabular-nums text-xs text-text-muted">
                          {sess.logoutAt ? formatDateTime(sess.logoutAt) : '—'}
                        </span>
                      </Td>

                      {/* Duration */}
                      <Td>
                        <span
                          className={`font-mono tabular-nums text-xs ${
                            isActive
                              ? 'text-success font-semibold'
                              : 'text-text'
                          }`}
                        >
                          {durationText}
                        </span>
                      </Td>

                      {/* IP Address */}
                      <Td>
                        <span className="font-mono tabular-nums text-xs text-text-muted bg-surface/70 border border-border px-2 py-0.5 rounded-md">
                          {sess.ipAddress}
                        </span>
                      </Td>

                      {/* Device (Browser + OS as muted second line, device type as main text) */}
                      <Td>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                            {getDeviceIcon(sess.device)}
                            {sess.device}
                          </span>
                          <span className="text-[11px] text-text-muted truncate">
                            {sess.browser} • {sess.os}
                          </span>
                        </div>
                      </Td>

                      {/* Status Badge */}
                      <Td>
                        <Badge variant={status.variant} className="text-[11px] px-2.5 py-0.5">
                          {status.label}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableContainer>
          ) : (
            <div className="py-10 text-center text-text-muted">
              <History size={26} className="mx-auto text-text-muted/50 mb-2" />
              <p className="font-semibold text-heading text-xs">No login history yet</p>
              <p className="text-[11px] mt-0.5">This user has not authenticated to the system.</p>
            </div>
          )}
        </div>

        {/* Mobile View (< md): Compact Stacked Blocks */}
        <div className="block md:hidden space-y-2.5">
          {recentSessions.length > 0 ? (
            recentSessions.map((sess) => {
              const status = getSessionStatus(sess);
              const isTimeout = sess.logoutType === 'timeout';
              const isActive = !sess.logoutAt && !sess.logoutType;

              let durationText = '—';
              if (isActive) {
                durationText = 'Active now';
              } else if (isTimeout) {
                durationText = '—';
              } else if (sess.loginAt && sess.logoutAt) {
                const start = new Date(sess.loginAt).getTime();
                const end = new Date(sess.logoutAt).getTime();
                const diff = Math.max(0, Math.abs(end - start));
                durationText = formatDuration(diff);
              }

              return (
                <div
                  key={sess.sessionId}
                  className="bg-surface/50 border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(sess.device)}
                      <span className="text-xs font-bold text-heading">{sess.device}</span>
                    </div>
                    <Badge variant={status.variant} className="text-[11px] px-2 py-0.5">
                      {status.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block">Login Time</span>
                      <span className="font-mono tabular-nums text-heading font-medium">
                        {formatDateTime(sess.loginAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block">Logout Time</span>
                      <span className="font-mono tabular-nums text-text-muted">
                        {sess.logoutAt ? formatDateTime(sess.logoutAt) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block">Duration</span>
                      <span
                        className={`font-mono tabular-nums ${
                          isActive ? 'text-success font-semibold' : 'text-heading'
                        }`}
                      >
                        {durationText}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase block">IP Address</span>
                      <span className="font-mono tabular-nums text-text-muted">
                        {sess.ipAddress}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted pt-1 border-t border-border/40 truncate">
                    {sess.browser} • {sess.os}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-surface/30 border border-dashed border-border rounded-xl text-text-muted">
              <History size={24} className="mx-auto text-text-muted/50 mb-1.5" />
              <p className="font-semibold text-heading text-xs">No login history yet</p>
              <p className="text-[11px] mt-0.5">This user has not authenticated to the system.</p>
            </div>
          )}
        </div>
      </Card>

      {/* ── Edit User Modal ── */}
      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSubmit={handleEditSubmit}
      />

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Account"
        confirmText="Delete User"
        variant="danger"
        message={
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-heading font-semibold">
              {user.firstName} {user.lastName}
            </strong>{' '}
            ({user.email})? All profile data and permissions will be removed.
          </p>
        }
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
