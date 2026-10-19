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
  IconKeyRound,
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
import { useAuthContext } from '../../context/AuthContext';
import { userService } from '../../services';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';
import UserFormModal from './UserFormModal';

export default function UserViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user: authUser, setUser: setAuthUser } = useAuthContext();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Derived isSelf: check route param or match with authUser by id, userId, or email
  const isSelf =
    id === 'me' ||
    Boolean(
      authUser &&
        ((user?.id && String(authUser.id) === String(user.id)) ||
          (user?.userId && String(authUser.userId) === String(user.userId)) ||
          (authUser.id && String(authUser.id) === String(id)) ||
          (authUser.userId && String(authUser.userId) === String(id)) ||
          (authUser.email &&
            user?.email &&
            authUser.email.toLowerCase() === user.email.toLowerCase()))
    );

  const {
    getUserById,
    updateUser,
    updateProfile,
    toggleStatus,
    deleteUser,
    sendTemporaryPassword,
    capabilities,
  } = useUsersContext();

  const { getRecentSessions } = useUserSessions();

  // Sessions state from GET /api/users/{id}/sessions?take=5
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTempPassModalOpen, setIsTempPassModalOpen] = useState(false);
  const [sendingTempPass, setSendingTempPass] = useState(false);

  // Load user data on mount / ID change
  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      setLoading(true);
      try {
        let fetchedUser = null;

        // 1. If explicitly /users/me or matching authUser ID directly, fetch via GET /api/users/me
        const isDirectSelf =
          id === 'me' ||
          (authUser &&
            (String(authUser.id) === String(id) || String(authUser.userId) === String(id)));

        if (isDirectSelf) {
          fetchedUser = await userService.getMe();
        } else {
          fetchedUser = await getUserById(id);

          // If the fetched user matches authUser (e.g. matching email or ID), load via getMe()
          if (
            fetchedUser &&
            authUser &&
            ((fetchedUser.email &&
              authUser.email &&
              fetchedUser.email.toLowerCase() === authUser.email.toLowerCase()) ||
              String(fetchedUser.id) === String(authUser.id) ||
              String(fetchedUser.userId) === String(authUser.userId))
          ) {
            const meUser = await userService.getMe().catch(() => null);
            if (meUser) fetchedUser = meUser;
          }
        }

        if (!ignore) {
          if (fetchedUser) {
            setUser(fetchedUser);

            // Fetch recent 5 sessions using GET /api/users/{id}/sessions?take=5
            setLoadingSessions(true);
            try {
              const sessionUserId = fetchedUser.userId || fetchedUser.id || id;
              const sessionList = await userService.getUserSessions(sessionUserId, { take: 5 });
              if (!ignore) {
                setSessions(Array.isArray(sessionList) ? sessionList : []);
              }
            } catch {
              if (!ignore) {
                // If API fails or in mock fallback mode
                setSessions(getRecentSessions(fetchedUser.id || fetchedUser.userId, 5));
              }
            } finally {
              if (!ignore) setLoadingSessions(false);
            }
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
  }, [id, authUser, getUserById, getRecentSessions]);

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

  function resolveSessionStatus(sess) {
    if (!sess) return { label: 'Unknown', variant: 'neutral' };
    if (sess.isActive) {
      return { label: 'Active', variant: 'success' };
    }
    const logoutType = (sess.logoutType || '').toLowerCase();
    if (logoutType === 'timeout') {
      return { label: 'Timed out', variant: 'warning' };
    }
    return { label: 'Signed out', variant: 'neutral' };
  }

  async function handleOpenEdit() {
    if (isSelf) {
      try {
        const meUser = await userService.getMe();
        if (meUser) {
          setUser(meUser);
          if (setAuthUser) setAuthUser(meUser);
        }
      } catch {
        /* fallback to current user */
      }
    } else if (user?.id || id) {
      try {
        const targetId = user?.id || id;
        const freshUser = await userService.getUserById(targetId);
        if (freshUser) setUser(freshUser);
      } catch {
        /* fallback to current user */
      }
    }
    setIsEditModalOpen(true);
  }

  async function handleEditSubmit(formData) {
    if (isSelf) {
      const res = await updateProfile(formData);
      if (res?.user) {
        setUser(res.user);
        if (setAuthUser) setAuthUser(res.user);
      }
      setIsEditModalOpen(false);
    } else if (user?.id) {
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

  async function handleConfirmSendTempPassword() {
    if (user?.id) {
      setSendingTempPass(true);
      try {
        const res = await sendTemporaryPassword(user.id);
        if (res?.user) {
          setUser(res.user);
        } else {
          const fresh = await getUserById(user.id).catch(() => null);
          if (fresh) setUser(fresh);
        }
        setIsTempPassModalOpen(false);
      } finally {
        setSendingTempPass(false);
      }
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
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${user.isActive
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.isActive ? 'bg-success' : 'bg-danger'
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
              onClick={handleOpenEdit}
              icon={<IconEdit />}
            >
              {isSelf ? 'Edit Profile' : 'Edit User'}
            </Button>

            {/* Activate / Deactivate Button (Only for other users) */}
            {!isSelf && (
              <Button
                variant={user.isActive ? 'warning-soft' : 'primary'}
                size="md"
                onClick={() => setIsStatusModalOpen(true)}
                icon={user.isActive ? <IconClose /> : <IconCheck />}
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            )}

            {/* Send Temporary Password Button (Only for other users) */}
            {!isSelf && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsTempPassModalOpen(true)}
                icon={<IconKeyRound className="text-warning" />}
              >
                Send Temporary Password
              </Button>
            )}

            {/* Delete Button (Only when capabilities.delete is true and not self) */}
            {!isSelf && capabilities.delete && (
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
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium border ${r.isPrimary
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
            {/* <span className="text-2xs font-semibold text-text-muted tracking-wider block"> */}
            <span className="view-field-label mf-detail-label">
              Created On
            </span>
            <span className="font-mono text-heading mt-0.5 block">
              {user.createdAt || user.createdOn ? formatDateTime(user.createdAt || user.createdOn) : '—'}
            </span>
          </div>

          <div>
            {/* <span className="text-2xs font-semibold text-text-muted tracking-wider block"> */}
            <span className="view-field-label mf-detail-label">
              Last Updated On
            </span>
            <span className="font-mono text-heading mt-0.5 block">
              {user.updatedAt || user.lastUpdatedOn ? formatDateTime(user.updatedAt || user.lastUpdatedOn) : 'Never'}
            </span>
          </div>

          <div>
            {/* <span className="text-2xs font-semibold text-text-muted tracking-wider block"> */}
            <span className="view-field-label mf-detail-label">
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
      {/* CARD 2: Recent Logins Card                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Card padding="md" className="bg-bg border border-border shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-heading tracking-tight flex items-center gap-2">
              <IconHistory size={17} className="text-primary" />
              Recent Logins
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Last 5 sessions
            </p>
          </div>
          <span className="font-mono text-xs text-text-muted">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Content */}
        {loadingSessions ? (
          <div className="py-12 text-center text-text-muted">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Loading session history…</p>
          </div>
        ) : sessions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-border bg-bg overflow-hidden">
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
                  {sessions.map((sess) => {
                    const status = resolveSessionStatus(sess);
                    const isTimeout = (sess.logoutType || '').toLowerCase() === 'timeout';
                    const isActive = Boolean(sess.isActive);

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

                    const sessKey =
                      sess.userSessionId || sess.sessionId || `${sess.loginAt}-${sess.ipAddress}`;

                    return (
                      <tr key={sessKey} className="hover:bg-surface/50 transition-colors">
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
                            {sess.ipAddress || '—'}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                              {getDeviceIcon(sess.device)}
                              {sess.device || 'Desktop'}
                            </span>
                            <span className="text-2xs text-text-muted truncate">
                              {sess.browser || 'Browser'} • {sess.os || 'OS'}
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
            </div>

            {/* Mobile Cards View (Visible on screens < md) */}
            <div className="md:hidden space-y-2.5">
              {sessions.map((sess) => {
                const status = resolveSessionStatus(sess);
                const isTimeout = (sess.logoutType || '').toLowerCase() === 'timeout';
                const isActive = Boolean(sess.isActive);

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

                const sessKey =
                  sess.userSessionId || sess.sessionId || `${sess.loginAt}-${sess.ipAddress}`;

                return (
                  <div
                    key={sessKey}
                    className="p-3.5 rounded-xl border border-border bg-surface/40 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-heading">
                        {getDeviceIcon(sess.device)}
                        <span>{sess.device || 'Desktop'}</span>
                        <span className="text-2xs text-text-muted font-normal">
                          ({sess.browser || 'Browser'} • {sess.os || 'OS'})
                        </span>
                      </div>
                      <Badge variant={status.variant} className="text-2xs px-2 py-0.5">
                        {status.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-2xs pt-2 border-t border-border/70">
                      <div>
                        <span className="text-text-muted block text-3xs font-semibold uppercase">
                          Login Time
                        </span>
                        <span className="font-mono font-medium text-heading tabular-nums text-xs">
                          {formatDateTime(sess.loginAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-3xs font-semibold uppercase">
                          Logout Time
                        </span>
                        <span className="font-mono text-text-muted tabular-nums text-xs">
                          {sess.logoutAt ? formatDateTime(sess.logoutAt) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-2xs pt-2 border-t border-border/70">
                      <div>
                        <span className="text-text-muted">Duration: </span>
                        <span
                          className={`font-mono font-medium ${
                            isActive ? 'text-success font-semibold' : 'text-text'
                          }`}
                        >
                          {durationText}
                        </span>
                      </div>
                      <span className="font-mono text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded text-3xs">
                        {sess.ipAddress || '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-text-muted rounded-xl border border-border bg-bg">
            <IconHistory size={26} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-xs">No login history yet</p>
            <p className="text-2xs mt-0.5">This user has not authenticated to the system.</p>
          </div>
        )}
      </Card>

      {/* ── Edit User / Profile Modal ── */}
      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSubmit={handleEditSubmit}
        isProfileMode={isSelf}
      />

      {/* ── Status Toggle Confirmation Modal (Only for other users) ── */}
      {!isSelf && (
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
      )}

      {/* ── Send Temporary Password Confirmation Modal (Only for other users) ── */}
      {!isSelf && (
        <ConfirmModal
          isOpen={isTempPassModalOpen}
          onClose={() => setIsTempPassModalOpen(false)}
          title="Send Temporary Password"
          confirmText={sendingTempPass ? 'Sending…' : 'Send Password'}
          variant="warning"
          message={
            <p>
              Are you sure you want to generate and send a new temporary password to{' '}
              <strong className="text-heading font-semibold">
                {user.firstName} {user.lastName}
              </strong>{' '}
              ({user.email})?
              <span className="block mt-1 text-xs text-text-muted">
                A temporary password will be dispatched to their registered email address. The user will be required to change it at their next login.
              </span>
            </p>
          }
          onConfirm={handleConfirmSendTempPassword}
        />
      )}

      {/* ── Delete Confirmation Modal (Only for other users) ── */}
      {!isSelf && capabilities.delete && (
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
