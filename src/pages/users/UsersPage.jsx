/**
 * UsersPage — Polished user management dashboard.
 *
 * Visual Improvements:
 *   1. Container: Whole table (toolbar + table + pagination) in a single unified Card.
 *   2. Header: Contrasting bg-surface, clean hover sort indicator & solid active chevron, hover resize bar.
 *   3. Rows: 36px circular avatar with brand initials, py-4 px-6 breathing room,
 *      divide-y border-border, 120ms hover transition, proper pill status & multi-role badges.
 *   4. Actions: Icon-only ghost buttons (View, Edit & Delete) with tooltips.
 *   5. Pagination: Filled bg-primary pill for active page, ghost buttons for others, disabled Prev/Next.
 *   6. Empty & Loading States: 5 pulsing skeleton rows during load, centered empty state with "Clear search".
 *   7. Modals: Direct User View Modal, Add/Edit User Form modal, and Delete confirmation.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconClock,
  IconDelete,
  IconEdit,
  IconLocation,
  IconMail,
  IconPhone,
  IconSeriesSetup,
  IconShieldCheck,
  IconSmartphone,
  IconUserPlus,
  IconUsers,
  IconView,
} from '../../constants/icons';

import {
  Button,
  Modal,
  SearchableSelect,
  ConfirmModal,
  PageHeader,
  DataTable,
  TableToolbar,
  TableActions,
  StatusBadge,
} from '../../components/ui';
import { useUsersContext } from '../../context/UsersContext';
import { useUserSessions } from '../../context/UserSessionsContext';
import { formatDateTime, formatRelative } from '../../utils/dateUtils';
import { ROLE_OPTIONS } from '../../mocks/users';
import UserFormModal from './UserFormModal';

const columnHelper = createColumnHelper();

const ROLE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  ...ROLE_OPTIONS,
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function UsersPage() {
  const navigate = useNavigate();
  const {
    users,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    deleteUser,
    createUser,
    updateUser,
  } = useUsersContext();

  const { getLastLogin } = useUserSessions();

  const lastLoginMap = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.id] = getLastLogin(u.id);
    });
    return map;
  }, [users, getLastLogin]);

  const hasActiveFilters = Boolean(
    search.trim() || roleFilter !== 'ALL' || statusFilter !== 'ALL'
  );

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [loading] = useState(false);

  /* Modal state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToView, setUserToView] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  function handleOpenAdd() {
    setSelectedUser(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(user) {
    setSelectedUser(user);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedUser(null);
  }

  async function handleModalSubmit(formData) {
    if (selectedUser?.id) {
      await updateUser(selectedUser.id, formData);
    } else {
      await createUser(formData);
    }
  }

  /* ── Column definitions for desktop table ── */
  const columns = useMemo(
    () => [
      /* 1. NAME */
      columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: 'name',
        header: 'NAME',
        minSize: 210,
        size: 260,
        cell: (info) => {
          const row = info.row.original;
          const initials = `${(row.firstName || '')[0] || ''}${(row.lastName || '')[0] || ''}`.toUpperCase() || 'U';

          return (
            <div className="flex items-center gap-3 py-0.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-heading text-sm leading-snug truncate">
                  {row.firstName} {row.lastName}
                </span>
                <span className="text-text-muted text-xs leading-normal truncate">
                  {row.email}
                </span>
              </div>
            </div>
          );
        },
      }),

      /* 2. MOBILE */
      columnHelper.accessor('mobile', {
        header: 'MOBILE',
        minSize: 140,
        size: 170,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <span className="font-mono tabular-nums text-xs text-heading font-medium">
                {row.mobile || '—'}
              </span>
              {row.secondaryPhone && (
                <span className="font-mono tabular-nums text-2xs text-text-muted">
                  Sec: {row.secondaryPhone}
                </span>
              )}
            </div>
          );
        },
      }),

      /* 3. ROLES — Multi-role pill badges */
      columnHelper.accessor((row) => {
        if (Array.isArray(row.roles) && row.roles.length > 0) return row.roles.join(', ');
        return row.role || 'Viewer';
      }, {
        id: 'roles',
        header: 'ROLES',
        minSize: 180,
        size: 220,
        cell: (info) => {
          const row = info.row.original;
          const roles = Array.isArray(row.roles) && row.roles.length > 0
            ? row.roles
            : row.role
              ? [row.role]
              : ['Viewer'];

          return (
            <div className="flex flex-wrap gap-1 items-center py-0.5">
              {roles.slice(0, 2).map((r, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-border/60 text-text-muted border border-border truncate max-w-[130px]"
                  title={r}
                >
                  {r}
                </span>
              ))}
              {roles.length > 2 && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 cursor-default"
                  title={roles.slice(2).join(', ')}
                >
                  +{roles.length - 2}
                </span>
              )}
            </div>
          );
        },
      }),

      /* 4. LAST LOGIN */
      columnHelper.accessor((row) => lastLoginMap[row.id] || '', {
        id: 'lastLogin',
        header: 'LAST LOGIN',
        minSize: 170,
        size: 200,
        sortingFn: (rowA, rowB) => {
          const dateA = lastLoginMap[rowA.original.id]
            ? new Date(lastLoginMap[rowA.original.id]).getTime()
            : 0;
          const dateB = lastLoginMap[rowB.original.id]
            ? new Date(lastLoginMap[rowB.original.id]).getTime()
            : 0;
          return dateA - dateB;
        },
        cell: (info) => {
          const row = info.row.original;
          const loginIso = lastLoginMap[row.id];

          if (!loginIso) {
            return (
              <span className="text-xs text-text-muted select-none">
                Never
              </span>
            );
          }

          return (
            <div className="flex flex-col py-0.5" title={formatDateTime(loginIso)}>
              <span className="font-mono tabular-nums text-xs font-semibold text-heading">
                {formatDateTime(loginIso)}
              </span>
              <span className="text-2xs text-text-muted leading-tight">
                {formatRelative(loginIso)}
              </span>
            </div>
          );
        },
      }),

      /* 5. STATUS — Tinted pill badge with dot */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 110,
        size: 130,
        cell: (info) => <StatusBadge status={info.getValue()} size="sm" />,
      }),

      /* 6. ACTIONS — View, Edit & Delete Ghost buttons */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 130,
        size: 140,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <TableActions
              onView={() => navigate(`/users/${row.id}`)}
              onEdit={() => handleOpenEdit(row)}
              viewTitle="View user details & login sessions"
              editTitle="Edit user"
            />
          );
        },
      }),
    ],
    [lastLoginMap, navigate]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, columnSizing, pagination },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });



  // Roles array for user currently viewed
  const viewUserRoles = useMemo(() => {
    if (!userToView) return [];
    if (Array.isArray(userToView.roles) && userToView.roles.length > 0) return userToView.roles;
    if (userToView.role) return [userToView.role];
    return ['Viewer'];
  }, [userToView]);

  const viewUserInitials = useMemo(() => {
    if (!userToView) return 'U';
    return `${(userToView.firstName || '')[0] || ''}${(userToView.lastName || '')[0] || ''}`.toUpperCase() || 'U';
  }, [userToView]);

  return (
    <div className="space-y-6">
      {/* ── Page Header with Add User Button Outside the Card ── */}
      <PageHeader
        title="User Management"
        subtitle="Manage system users, role assignments, address details, and active account statuses."
        icon={<IconUsers className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            id="add-user-btn"
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="shadow-xs"
          >
            <IconUserPlus size={16} className="mr-1.5" aria-hidden="true" />
            Add User
          </Button>
        }
      />

      {/* ── Table Toolbar: Search + Role Filter + Status Filter ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, phone, address..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
        {/* Role Filter Dropdown */}
        <div className="w-full sm:w-52">
          <SearchableSelect
            id="filter-role"
            placeholder="All Roles"
            searchPlaceholder="Search roles..."
            options={ROLE_FILTER_OPTIONS}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={users.length}
        entityName="users"
        emptyTitle="No users found"
        emptyDescription={
          hasActiveFilters
            ? 'No users match your current filter criteria.'
            : 'No users have been added to the system yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs"
            >
              <IconUserPlus size={14} className="mr-1.5" />
              Add User
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const user = row.original;
          const roles = Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : user.role
              ? [user.role]
              : ['Viewer'];

          return (
            <div
              key={user.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Header: Name, Roles, Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-heading leading-tight">
                    {user.firstName} {user.lastName}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {roles.map((r, i) => (
                      <span
                        key={i}
                        className="inline-block text-2xs font-medium text-text-muted bg-border/50 px-2 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status Badge */}
                <StatusBadge status={user.isActive} size="sm" />
              </div>

              {/* Contact details */}
              <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <IconMail size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{user.mobile || '—'}</span>
                </div>
                {user.secondaryPhone && (
                  <div className="flex items-center gap-2">
                    <IconSmartphone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                    <span className="font-mono tabular-nums">Sec: {user.secondaryPhone}</span>
                  </div>
                )}
                {user.address && (
                  <div className="flex items-start gap-2">
                    <IconLocation size={13} className="shrink-0 text-text-muted/70 mt-0.5" aria-hidden="true" />
                    <span className="line-clamp-2">{user.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-xs">
                  <IconClock size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                  <span className="font-mono tabular-nums">
                    Last login:{' '}
                    {lastLoginMap[user.id] ? (
                      <strong className="text-heading font-semibold">
                        {formatDateTime(lastLoginMap[user.id])}
                      </strong>
                    ) : (
                      <span className="text-text-muted">Never</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(user)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── View User Details Modal using generic Modal component ── */}
      <Modal
        isOpen={Boolean(userToView)}
        onClose={() => setUserToView(null)}
        title="User Details"
        maxWidth="max-w-xl"
      >
        {userToView && (
          <div className="space-y-5">
            {/* Header Profile Card */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface/60 border border-border">
              <div className="w-13 h-13 rounded-full bg-primary/15 border-2 border-primary/20 text-primary font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                {viewUserInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-heading truncate">
                    {userToView.firstName} {userToView.lastName}
                  </h3>
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none shrink-0',
                      userToView.isActive
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-danger/10 text-danger border border-danger/20',
                    ].join(' ')}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${userToView.isActive ? 'bg-success' : 'bg-danger'
                        }`}
                      aria-hidden="true"
                    />
                    {userToView.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5 flex items-center gap-1.5">
                  <IconMail size={13} className="shrink-0 text-text-muted/70" />
                  <span className="truncate">{userToView.email || '—'}</span>
                </p>
                {userToView.id && (
                  <div className="mt-2 flex items-center gap-1 text-2xs font-mono text-text-muted bg-bg/80 border border-border px-2 py-0.5 rounded-md w-fit">
                    <IconSeriesSetup size={11} className="shrink-0 text-text-muted/60" />
                    <span>ID: {userToView.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <IconPhone size={13} className="text-primary" />
                Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-bg border border-border rounded-lg space-y-1">
                  <span className="text-2xs font-medium text-text-muted block">Primary Mobile</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
                    <IconPhone size={14} className="text-text-muted/70 shrink-0" />
                    <span>{userToView.mobile || '—'}</span>
                  </div>
                </div>
                <div className="p-3 bg-bg border border-border rounded-lg space-y-1">
                  <span className="text-2xs font-medium text-text-muted block">Secondary Phone</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
                    <IconSmartphone size={14} className="text-text-muted/70 shrink-0" />
                    <span>{userToView.secondaryPhone || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Roles */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <IconShieldCheck size={13} className="text-primary" />
                Assigned Roles ({viewUserRoles.length})
              </h4>
              <div className="p-3 bg-bg border border-border rounded-lg flex flex-wrap gap-1.5">
                {viewUserRoles.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    <IconShieldCheck size={12} className="shrink-0" />
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <IconLocation size={13} className="text-primary" />
                Address
              </h4>
              <div className="p-3 bg-bg border border-border rounded-lg flex items-start gap-2.5">
                <IconLocation size={15} className="text-text-muted/80 shrink-0 mt-0.5" />
                <p className="text-sm text-heading leading-relaxed">
                  {userToView.address || <span className="text-text-muted italic">No address provided</span>}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setUserToView(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const target = userToView;
                  setUserToView(null);
                  handleOpenEdit(target);
                }}
                className="flex items-center gap-1.5"
              >
                <IconEdit size={15} />
                Edit User
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add / Edit User Modal ── */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        onSubmit={handleModalSubmit}
      />

      {/* ── Delete User Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="Delete User"
        confirmText="Delete User"
        variant="danger"
        message={
          userToDelete ? (
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-heading font-semibold">
                {userToDelete.firstName} {userToDelete.lastName}
              </strong>{' '}
              ({userToDelete.email})? This action cannot be undone.
            </p>
          ) : null
        }
        onConfirm={() => {
          if (userToDelete) {
            deleteUser(userToDelete.id);
            setUserToDelete(null);
          }
        }}
      />
    </div>
  );
}
