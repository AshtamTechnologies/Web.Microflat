/**
 * UserViewPage.jsx — Comprehensive User profile view with roles, account badges, and audit trail.
 *
 * Route: /users/:id
 *
 * Rules:
 *   - Fetches user via GET /api/users/{id}.
 *   - Displays secondary phone, address, roles (primary highlighted).
 *   - Displays Locked and Must-change-password badges, temporary password expiry.
 *   - Displays created and updated timestamps via formatDateTime.
 *   - In API mode: hides Recent Logins / Activity card.
 *   - Hides Delete button when capabilities.delete is false.
 *   - Activate / Deactivate status button with ConfirmModal and toast.
 */

import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconBack,
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconHistory,
  IconLaptop,
  IconLocation,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldAlert,
  IconShieldCheck,
  IconSmartphone,
  IconTablet,
  IconUser,
  IconUsers,
} from '../../constants/icons';

import {
  Card,
  Button,
  Badge,
  DetailField,
  TableContainer,
  Th,
  Td,
  ConfirmModal,
  PageHeader,
} from '../../components/ui';
import { useUsersContext } from '../../context/UsersContext';
import { useUserSessions } from '../../context/UserSessionsContext';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';
import UserFormModal from './UserFormModal';

export default function UserViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    getUserById,
    updateUser,
    toggleStatus,
    deleteUser,
    capabilities,
    isMockApi,
  } = useUsersContext();

  const { getRecentSessions, getSessionStatus } = useUserSessions();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load user data on mount / ID change
  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      try {
        const fetchedUser = await getUserById(id);
        if (!ignore) {
          if (fetchedUser) {
            setUser(fetchedUser);
          } else {
            setNotFound(true);
          }
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      ignore = true;
    };
  }, [id, getUserById]);

  // Recent sessions for mock mode
  const recentSessions = useMemo(() => {
    if (!isMockApi || !user) return [];
    return getRecentSessions(user.id, 5);
  }, [isMockApi, user, getRecentSessions]);

  // User details computations
  const userRoles = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
    if (user.role) return [{ roleName: user.role, isPrimary: true }];
    return [{ roleName: 'Viewer', isPrimary: true }];
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return 'U';
    return `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase() || 'U';
  }, [user]);

  function getDeviceIcon(device = '') {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <IconSmartphone size={14} className="text-primary/70 shrink-0" />;
      case 'tablet':
        return <IconTablet size={14} className="text-primary/70 shrink-0" />;
      default:
        return <IconLaptop size={14} className="text-primary/70 shrink-0" />;
    }
  }

  async function handleEditSubmit(formData) {
    if (user?.id) {
      const res = await updateUser(user.id, formData);
      if (res?.user) {
        setUser(res.user);
      }
      setIsEditModalOpen(false);
    }
  }

  async function handleConfirmStatusToggle() {
    if (user?.id) {
      const res = await toggleStatus(user.id, !user.isActive);
      if (res?.user) {
        setUser(res.user);
      }
      setIsStatusModalOpen(false);
    }
  }

  async function handleDeleteConfirm() {
    if (user?.id) {
      await deleteUser(user.id);
      setIsDeleteModalOpen(false);
      navigate('/users', { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-12 w-full">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/users')}>
            <IconBack className="mr-1.5" /> Back to Users
          </Button>
        </div>
        <Card padding="lg" className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-text-muted font-medium">Loading user details…</p>
        </Card>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="space-y-6 pb-12 w-full">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/users')}>
            <IconBack className="mr-1.5" /> Back to Users
          </Button>
        </div>

        <Card padding="lg" className="text-center py-16">
          <IconUser size={40} className="mx-auto text-text-muted/40 mb-3" />
          <h2 className="text-lg font-bold text-heading">User Not Found</h2>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            The requested user account (ID: <code className="font-mono text-primary">{id}</code>) does not exist or has been removed.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/users')} className="mt-5">
            Back to Users
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Navigation & Actions Bar ── */}
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        icon={<IconUsers className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={{
          onClick: () => navigate('/users'),
          label: 'Back to Users',
        }}
        badge={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${
                user.isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  user.isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {user.isActive ? 'Active' : 'Inactive'}
            </span>

            {/* Lockout Badge */}
            {user.isLockedOut && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                <IconLock size={12} />
                Locked Account
              </span>
            )}

            {/* Must Change Password Badge */}
            {user.mustChangePassword && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                <IconShieldAlert size={12} />
                Temporary Password Active
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsEditModalOpen(true)}
              icon={<IconEdit />}
            >
              Edit User
            </Button>

            {/* Activate / Deactivate Button */}
            <Button
              variant={user.isActive ? 'warning-soft' : 'primary'}
              size="md"
              onClick={() => setIsStatusModalOpen(true)}
              icon={user.isActive ? <IconClose /> : <IconCheck />}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>

            {/* Delete Button (Only when capabilities.delete is true) */}
            {capabilities.delete && (
              <Button
                variant="danger-soft"
                size="md"
                onClick={() => setIsDeleteModalOpen(true)}
                icon={<IconDelete />}
              >
                Delete
              </Button>
            )}
          </div>
        }
      />

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
              <IconMail size={13} className="shrink-0 text-text-muted/70" />
              <span className="truncate font-medium">{user.email || '—'}</span>
            </p>
          </div>
        </div>

        {/* Contact & Role Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Mobile */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl">
            <DetailField
              label="Primary Mobile"
              value={user.mobile}
              icon={IconPhone}
              isPhone
              mono
            />
          </div>

          {/* Secondary Phone */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl">
            <DetailField
              label="Secondary Phone"
              value={user.secondaryPhone || 'Not provided'}
              icon={IconSmartphone}
              mono
            />
          </div>

          {/* Assigned Roles with Primary Indicator */}
          <div className="p-3.5 bg-surface/40 border border-border rounded-xl">
            <DetailField label={`Assigned Roles (${userRoles.length})`}>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {userRoles.map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium border ${
                      r.isPrimary
                        ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                        : 'bg-surface text-text-muted border-border'
                    }`}
                  >
                    <IconShieldCheck size={12} className="shrink-0" />
                    {r.roleName || r}
                    {r.isPrimary && (
                      <span className="ml-0.5 px-1 rounded bg-primary text-white text-3xs font-bold uppercase">
                        Primary
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </DetailField>
          </div>
        </div>

        {/* Address */}
        <div className="p-3.5 bg-surface/40 border border-border rounded-xl flex items-start gap-3">
          <IconLocation size={16} className="text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0 flex-1">
            <DetailField
              label="Registered Address"
              value={user.address || 'No address provided'}
              valueClassName="text-xs sm:text-sm text-heading leading-relaxed font-normal"
            />
          </div>
        </div>

        {/* Audit & Security Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/80 text-xs text-text-muted">
          <div>
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
              Created On
            </span>
            <span className="font-mono text-heading mt-0.5 block">
              {user.createdAt || user.createdOn ? formatDateTime(user.createdAt || user.createdOn) : '—'}
            </span>
          </div>

          <div>
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
              Last Updated On
            </span>
            <span className="font-mono text-heading mt-0.5 block">
              {user.updatedAt || user.lastUpdatedOn ? formatDateTime(user.updatedAt || user.lastUpdatedOn) : 'Never'}
            </span>
          </div>

          <div>
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
              Temporary Password Expiry
            </span>
            <span className="font-mono text-heading mt-0.5 block">
              {user.temporaryPasswordExpiresOn
                ? formatDateTime(user.temporaryPasswordExpiresOn)
                : 'Not applicable'}
            </span>
          </div>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CARD 2: Recent Logins Card (Rendered ONLY in mock mode)          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isMockApi && (
        <Card padding="md" className="bg-bg border border-border shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-heading tracking-tight flex items-center gap-2">
                <IconHistory size={17} className="text-primary" />
                Recent Logins (Mock Simulation)
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Last 5 sessions
              </p>
            </div>
            <span className="font-mono text-xs text-text-muted">
              {recentSessions.length} {recentSessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>

          {/* Table */}
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
                        <Td>
                          <span className="font-mono tabular-nums text-xs font-semibold text-heading">
                            {formatDateTime(sess.loginAt)}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono tabular-nums text-xs text-text-muted">
                            {sess.logoutAt ? formatDateTime(sess.logoutAt) : '—'}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`font-mono tabular-nums text-xs ${
                              isActive ? 'text-success font-semibold' : 'text-text'
                            }`}
                          >
                            {durationText}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-mono tabular-nums text-xs text-text-muted bg-surface/70 border border-border px-2 py-0.5 rounded-md">
                            {sess.ipAddress}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                              {getDeviceIcon(sess.device)}
                              {sess.device}
                            </span>
                            <span className="text-2xs text-text-muted truncate">
                              {sess.browser} • {sess.os}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <Badge variant={status.variant} className="text-2xs px-2.5 py-0.5">
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
                <IconHistory size={26} className="mx-auto text-text-muted/50 mb-2" />
                <p className="font-semibold text-heading text-xs">No login history yet</p>
                <p className="text-2xs mt-0.5">This user has not authenticated to the system.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Edit User Modal ── */}
      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSubmit={handleEditSubmit}
      />

      {/* ── Status Toggle Confirmation Modal ── */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={user.isActive ? 'Deactivate User Account' : 'Activate User Account'}
        confirmText={user.isActive ? 'Deactivate User' : 'Activate User'}
        variant={user.isActive ? 'warning' : 'primary'}
        message={
          <p>
            Are you sure you want to {user.isActive ? 'deactivate' : 'activate'}{' '}
            <strong className="text-heading font-semibold">
              {user.firstName} {user.lastName}
            </strong>{' '}
            ({user.email})?
            {user.isActive && (
              <span className="block mt-1 text-xs text-text-muted">
                Deactivating this user will revoke all their active login sessions immediately.
              </span>
            )}
          </p>
        }
        onConfirm={handleConfirmStatusToggle}
      />

      {/* ── Delete Confirmation Modal ── */}
      {capabilities.delete && (
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
      )}
    </div>
  );
}
