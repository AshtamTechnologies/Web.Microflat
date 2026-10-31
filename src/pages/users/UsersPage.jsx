/**
 * UsersPage.jsx — User management dashboard for MicroFlat ERP.
 *
 * Route: /users
 *
 * Rules:
 *   - Search with ~400ms debounce, RoleId filter, IsActive status filter.
 *   - Server-side paging using totalCount / totalPages from backend API.
 *   - In API mode (capabilities.sort = false): disable sort headers.
 *   - In API mode: hide Last Login column (no backend endpoint).
 *   - Hide Delete action when capabilities.delete is false.
 *   - Activate / Deactivate status action with ConfirmModal and toast.
 *   - Follows unified ERP TableToolbar + DataTable layout pattern.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconEdit,
  IconLocation,
  IconMail,
  IconPhone,
  IconSmartphone,
  IconUserPlus,
  IconUsers,
  IconView,
} from '../../constants/icons';

import {
  Button,
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
import { useAuthContext } from '../../context/AuthContext';
import { userService } from '../../services';
import { formatDateTime, formatRelative } from '../../utils/dateUtils';
import UserFormModal from './UserFormModal';

const columnHelper = createColumnHelper();

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
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    loading,
    rolesList,
    capabilities,
    isMockApi,
    resetFilters,
    deleteUser,
    createUser,
    updateUser,
    updateUserRoles,
    updateProfile,
    toggleStatus,
    sendTemporaryPassword,
  } = useUsersContext();

  const { user: authUser, setUser: setAuthUser } = useAuthContext();

  const isSelfUser = (targetUser) => {
    if (!targetUser || !authUser) return false;
    if (authUser.id && targetUser.id && String(authUser.id) === String(targetUser.id)) return true;
    if (authUser.userId && targetUser.userId && String(authUser.userId) === String(targetUser.userId)) return true;
    if (authUser.email && targetUser.email && authUser.email.toLowerCase() === targetUser.email.toLowerCase()) return true;
    return false;
  };

  const { getLastLogin } = useUserSessions();

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Dynamic role filter options
  const roleFilterOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Roles' }];
    rolesList.forEach((r) => {
      list.push({
        value: String(r.id),
        label: r.name || r.roleName,
      });
    });
    return list;
  }, [rolesList]);

  // Last login map for mock mode
  const lastLoginMap = useMemo(() => {
    if (!isMockApi) return {};
    const map = {};
    users.forEach((u) => {
      map[u.id] = getLastLogin(u.id);
    });
    return map;
  }, [users, getLastLogin, isMockApi]);

  const hasActiveFilters = Boolean(
    search.trim() || roleFilter !== 'ALL' || statusFilter !== 'ALL'
  );

  function handleOpenAdd() {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  }

  async function handleOpenEdit(user) {
    if (isSelfUser(user)) {
      try {
        const meUser = await userService.getMe();
        setSelectedUser(meUser || user);
      } catch {
        setSelectedUser(user);
      }
    } else {
      try {
        const targetId = user?.id || user?.userId;
        const fullUser = await userService.getUserById(targetId);
        setSelectedUser(fullUser || user);
      } catch {
        setSelectedUser(user);
      }
    }
    setIsFormModalOpen(true);
  }

  function handleCloseModal() {
    setIsFormModalOpen(false);
    setSelectedUser(null);
  }

  async function handleModalSubmit(formData) {
    if (isSelfUser(selectedUser)) {
      const res = await updateProfile(formData);
      if (res?.user && setAuthUser) {
        setAuthUser(res.user);
      }
      return res;
    }
    if (selectedUser?.id) {
      return updateUser(selectedUser.id, formData);
    }
    return createUser(formData);
  }

  function handleConfirmToggleStatus() {
    if (userToToggleStatus?.id) {
      toggleStatus(userToToggleStatus.id, !userToToggleStatus.isActive);
      setUserToToggleStatus(null);
    }
  }

  function handleConfirmDelete() {
    if (userToDelete?.id) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  }

  /* ── Column Definitions ── */
  const columns = useMemo(() => {
    const cols = [
      /* 1. NAME */
      columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: 'name',
        header: 'NAME',
        minSize: 210,
        size: 260,
        enableSorting: Boolean(capabilities.sort),
        cell: (info) => {
          const row = info.row.original;

          return (
            <div className="flex flex-col min-w-0 py-0.5">
              <span className="font-semibold text-heading text-sm leading-snug truncate">
                {row.firstName} {row.lastName}
              </span>
              <span className="text-text-muted text-xs leading-normal truncate">
                {row.email}
              </span>
            </div>
          );
        },
      }),

      /* 2. MOBILE */
      columnHelper.accessor('mobile', {
        header: 'MOBILE',
        minSize: 140,
        size: 170,
        enableSorting: Boolean(capabilities.sort),
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

      /* 3. ROLES */
      columnHelper.accessor(
        (row) => {
          if (Array.isArray(row.roles) && row.roles.length > 0) {
            return row.roles
              .map((r) => (typeof r === 'object' ? r.roleName : r))
              .filter(Boolean)
              .join(', ');
          }
          return row.role || row.primaryRole || 'Viewer';
        },
        {
          id: 'roles',
          header: 'ROLES',
          minSize: 180,
          size: 220,
          enableSorting: Boolean(capabilities.sort),
          cell: (info) => {
            const row = info.row.original;
            const rawRoles =
              Array.isArray(row.roles) && row.roles.length > 0
                ? row.roles
                : [row.role || row.primaryRole || 'Viewer'];

            const roles = rawRoles
              .map((r) => (typeof r === 'object' ? r.roleName : r))
              .filter(Boolean);

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
        }
      ),
    ];

    /* 4. LAST LOGIN (Only rendered in mock mode) */
    if (isMockApi) {
      cols.push(
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
        })
      );
    }

    /* 5. STATUS */
    cols.push(
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 110,
        size: 130,
        enableSorting: Boolean(capabilities.sort),
        cell: (info) => {
          const row = info.row.original;
          return (
            <button
              type="button"
              onClick={() => setUserToToggleStatus(row)}
              className="cursor-pointer transition-opacity hover:opacity-80 text-left"
              title={`Click to ${row.isActive ? 'deactivate' : 'activate'} user`}
              aria-label={`${row.isActive ? 'Deactivate' : 'Activate'} ${row.firstName} ${row.lastName}`}
            >
              <StatusBadge status={info.getValue()} size="sm" />
            </button>
          );
        },
      })
    );

    /* 6. ACTIONS */
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 130,
        size: 140,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isSelf = isSelfUser(row);
          return (
            <TableActions
              onView={() => navigate(isSelf ? '/users/me' : `/users/${row.id}`)}
              onEdit={() => handleOpenEdit(row)}
              onDelete={capabilities.delete ? () => setUserToDelete(row) : undefined}
              viewTooltip="View user details"
              editTooltip="Edit user"
              deleteTooltip="Delete user"
            />
          );
        },
      })
    );

    return cols;
  }, [capabilities, isMockApi, lastLoginMap, navigate, authUser]);

  const pagination = useMemo(
    () => ({
      pageIndex: pageNumber - 1,
      pageSize,
    }),
    [pageNumber, pageSize]
  );

  const table = useReactTable({
    data: users,
    columns,
    pageCount: Math.max(1, totalPages),
    state: {
      pagination,
      sorting: capabilities.sort ? sorting : [],
      columnSizing,
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setPageNumber(next.pageIndex + 1);
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
      }
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: Boolean(capabilities.sort),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
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

      {/* ── Table Toolbar with Role & Status Dropdowns ── */}
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
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPageNumber(1);
            }}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPageNumber(1);
            }}
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Responsive Mobile Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={totalCount}
        entityName="users"
        emptyTitle="No users found"
        emptyDescription={
          hasActiveFilters
            ? 'No users match your active search and filter criteria.'
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
          const rawRoles =
            Array.isArray(user.roles) && user.roles.length > 0
              ? user.roles
              : [user.role || user.primaryRole || 'Viewer'];

          const roles = rawRoles
            .map((r) => (typeof r === 'object' ? r.roleName : r))
            .filter(Boolean);

          return (
            <div
              key={user.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
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

                <button
                  type="button"
                  onClick={() => setUserToToggleStatus(user)}
                  className="cursor-pointer"
                  title={`Click to ${user.isActive ? 'deactivate' : 'activate'} user`}
                >
                  <StatusBadge status={user.isActive} size="sm" />
                </button>
              </div>

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
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(isSelfUser(user) ? '/users/me' : `/users/${user.id}`)}
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

      {/* ── Add / Edit Modal ── */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        onSubmit={handleModalSubmit}
        isProfileMode={isSelfUser(selectedUser)}
      />

      {/* ── Status Toggle Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(userToToggleStatus)}
        onClose={() => setUserToToggleStatus(null)}
        title={
          userToToggleStatus?.isActive
            ? 'Deactivate User Account'
            : 'Activate User Account'
        }
        confirmText={
          userToToggleStatus?.isActive ? 'Deactivate User' : 'Activate User'
        }
        variant={userToToggleStatus?.isActive ? 'warning' : 'primary'}
        message={
          <p>
            Are you sure you want to{' '}
            <strong>
              {userToToggleStatus?.isActive ? 'deactivate' : 'activate'}
            </strong>{' '}
            <span className="text-heading font-semibold">
              {userToToggleStatus?.firstName} {userToToggleStatus?.lastName}
            </span>{' '}
            ({userToToggleStatus?.email})?
            {userToToggleStatus?.isActive && (
              <span className="block mt-1 text-xs text-text-muted">
                Deactivating this user will revoke all their active login sessions immediately.
              </span>
            )}
          </p>
        }
        onConfirm={handleConfirmToggleStatus}
      />

      {/* ── Delete Confirmation Modal (only when capabilities.delete is true) ── */}
      {capabilities.delete && (
        <ConfirmModal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          title="Delete User Account"
          confirmText="Delete User"
          variant="danger"
          message={
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-heading font-semibold">
                {userToDelete?.firstName} {userToDelete?.lastName}
              </strong>{' '}
              ({userToDelete?.email})?
            </p>
          }
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
