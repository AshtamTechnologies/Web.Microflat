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
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Search,
  UserPlus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Eye,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  ShieldCheck,
  Hash,
  SearchX,
  RotateCcw,
} from 'lucide-react';

import { Button, Input, Modal, SearchableSelect, ConfirmModal, TableContainer, Th, Td } from '../../components/ui';
import { useUsersContext } from '../../context/UsersContext';
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
                <span className="font-mono tabular-nums text-[11px] text-text-muted">
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

      /* 4. STATUS — Tinted pill badge with dot */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 110,
        size: 130,
        cell: (info) => {
          const row = info.row.original;
          const isActive = row.isActive;
          return (
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none',
                isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
      }),

      /* 5. ACTIONS — View, Edit & Delete Ghost buttons */
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
            <div className="flex items-center justify-end gap-1">
              {/* View Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUserToView(row)}
                title="View user details"
                className="text-text-muted hover:text-primary hover:bg-surface"
              >
                <Eye size={15} aria-hidden="true" />
              </Button>

              {/* Edit Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenEdit(row)}
                title="Edit user"
                className="text-text-muted hover:text-primary hover:bg-surface"
              >
                <Pencil size={15} aria-hidden="true" />
              </Button>

              {/* Delete Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUserToDelete(row)}
                title="Delete user"
                className="text-text-muted hover:text-danger hover:bg-surface"
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          );
        },
      }),
    ],
    []
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

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const totalRows = users.length;
  const startRow = totalRows === 0 ? 0 : currentPage * pagination.pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pagination.pageSize, totalRows);

  // Paginated data slice for Mobile Card View
  const paginatedMobileUsers = useMemo(() => {
    const start = currentPage * pagination.pageSize;
    return users.slice(start, start + pagination.pageSize);
  }, [users, currentPage, pagination.pageSize]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Manage system users, role assignments, address details, and active account statuses.
          </p>
        </div>

        {/* Add User Button (outside the card) */}
        <Button
          id="add-user-btn"
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="shrink-0 self-start sm:self-auto flex items-center justify-center shadow-xs"
        >
          <UserPlus size={16} className="mr-1.5" aria-hidden="true" />
          Add User
        </Button>
      </div>

      {/* ── UNIFIED CARD CONTAINER: Toolbar + Table/Cards + Pagination ── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* ── Toolbar: Search + Role Searchable Filter + Status Searchable Filter ── */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-3 flex-wrap">
            {/* Search Input */}
            <div className="w-full sm:w-72">
              <Input
                id="users-search"
                type="search"
                placeholder="Search by name, email, phone, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} aria-hidden="true" />}
              />
            </div>

            {/* Role Filter Dropdown using SearchableSelect */}
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

            {/* Status Filter Dropdown using SearchableSelect */}
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

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-text-muted hover:text-danger flex items-center gap-1.5 h-10 px-3"
                title="Reset all search & filters"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── DESKTOP TABLE VIEW (md+) ── */}
        <div className="hidden md:block">
          <TableContainer
            tableStyle={{ width: table.getTotalSize(), minWidth: '100%' }}
            tableClassName="table-fixed"
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const canResize = header.column.getCanResize();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={canResize ? header.getResizeHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="group/th-btn flex items-center gap-1.5 w-full text-left select-none cursor-pointer hover:text-heading transition-colors"
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>

                            {/* Sort indicator */}
                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <ChevronUp size={14} className="text-primary stroke-[2.5]" aria-hidden="true" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown size={14} className="text-primary stroke-[2.5]" aria-hidden="true" />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div className={`select-none ${header.id === 'actions' ? 'text-right w-full pr-1' : ''}`}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-border bg-bg">
              {loading ? (
                /* Skeleton Loading Rows */
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="bg-bg">
                    <Td>
                      <div className="space-y-1.5 flex-1 py-0.5">
                        <div className="h-3.5 w-28 bg-surface rounded-md animate-pulse" />
                        <div className="h-2.5 w-40 bg-surface rounded-md animate-pulse" />
                      </div>
                    </Td>
                    <Td>
                      <div className="h-3 w-24 bg-surface rounded-md animate-pulse" />
                    </Td>
                    <Td>
                      <div className="h-5 w-20 bg-surface rounded-full animate-pulse" />
                    </Td>
                    <Td>
                      <div className="h-5 w-16 bg-surface rounded-full animate-pulse" />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                      </div>
                    </Td>
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                /* Centered Empty State */
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 px-6">
                    <div className="flex flex-col items-center justify-center max-w-xs mx-auto text-center">
                      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
                        <SearchX size={22} className="opacity-60" aria-hidden="true" />
                      </div>
                      <h4 className="text-sm font-semibold text-heading">No users found</h4>
                      <p className="text-xs text-text-muted mt-1 mb-4">
                        {hasActiveFilters
                          ? 'No user records match the selected search or filter criteria.'
                          : 'Get started by creating your first user.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                /* Data Rows */
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface/80 transition-colors duration-120 bg-bg"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>
        </div>

        {/* ── MOBILE CARD VIEW (< md) ── */}
        <div className="block md:hidden p-4 space-y-3 bg-bg">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`mobile-skeleton-${idx}`} className="bg-surface/40 rounded-xl border border-border p-4 space-y-3 animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-surface rounded" />
                  <div className="h-2.5 w-32 bg-surface rounded" />
                </div>
              </div>
            ))
          ) : paginatedMobileUsers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mx-auto mb-3">
                <SearchX size={22} className="opacity-60" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-heading">No users found</h4>
              <p className="text-xs text-text-muted mt-1 mb-4">
                {hasActiveFilters
                  ? 'No user records match the selected search or filter criteria.'
                  : 'Get started by creating your first user.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            paginatedMobileUsers.map((user) => {
              const roles = Array.isArray(user.roles) && user.roles.length > 0
                ? user.roles
                : user.role
                ? [user.role]
                : ['Viewer'];

              return (
                <div
                  key={user.id}
                  className="bg-bg rounded-xl border border-border p-4 shadow-2xs space-y-3"
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
                            className="inline-block text-[11px] font-medium text-text-muted bg-border/50 px-2 py-0.5 rounded-full"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
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

                  {/* Contact details */}
                  <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{user.mobile || '—'}</span>
                    </div>
                    {user.secondaryPhone && (
                      <div className="flex items-center gap-2">
                        <Smartphone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                        <span className="font-mono tabular-nums">Sec: {user.secondaryPhone}</span>
                      </div>
                    )}
                    {user.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="shrink-0 text-text-muted/70 mt-0.5" aria-hidden="true" />
                        <span className="line-clamp-2">{user.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToView(user)}
                      className="flex-1 text-xs"
                    >
                      <Eye size={13} className="mr-1.5" aria-hidden="true" />
                      View
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(user)}
                      className="flex-1 text-xs"
                    >
                      <Pencil size={13} className="mr-1.5" aria-hidden="true" />
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setUserToDelete(user)}
                      className="flex-1 text-xs"
                    >
                      <Trash2 size={13} className="mr-1.5" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── PAGINATION FOOTER STRIP ── */}
        <div className="px-6 py-4 bg-bg border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            Showing <span className="font-medium text-heading">{startRow}-{endRow}</span> of <span className="font-medium text-heading">{totalRows}</span> users
          </p>

          {/* Page controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-xs h-8 px-2.5"
            >
              Prev
            </Button>

            {Array.from({ length: Math.max(1, pageCount) }, (_, i) => {
              const isActive = i === currentPage;
              return isActive ? (
                <button
                  key={i}
                  type="button"
                  className="min-w-[32px] h-8 px-2 text-xs font-semibold rounded-md bg-primary text-white shadow-xs select-none cursor-default"
                >
                  {i + 1}
                </button>
              ) : (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  onClick={() => table.setPageIndex(i)}
                  className="min-w-[32px] h-8 px-2 text-xs text-text-muted hover:text-heading hover:bg-surface"
                >
                  {i + 1}
                </Button>
              );
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-xs h-8 px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

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
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        userToView.isActive ? 'bg-success' : 'bg-danger'
                      }`}
                      aria-hidden="true"
                    />
                    {userToView.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5 flex items-center gap-1.5">
                  <Mail size={13} className="shrink-0 text-text-muted/70" />
                  <span className="truncate">{userToView.email || '—'}</span>
                </p>
                {userToView.id && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-text-muted bg-bg/80 border border-border px-2 py-0.5 rounded-md w-fit">
                    <Hash size={11} className="shrink-0 text-text-muted/60" />
                    <span>ID: {userToView.id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={13} className="text-primary" />
                Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-bg border border-border rounded-lg space-y-1">
                  <span className="text-[11px] font-medium text-text-muted block">Primary Mobile</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
                    <Phone size={14} className="text-text-muted/70 shrink-0" />
                    <span>{userToView.mobile || '—'}</span>
                  </div>
                </div>
                <div className="p-3 bg-bg border border-border rounded-lg space-y-1">
                  <span className="text-[11px] font-medium text-text-muted block">Secondary Phone</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-heading font-mono">
                    <Smartphone size={14} className="text-text-muted/70 shrink-0" />
                    <span>{userToView.secondaryPhone || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Roles */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-primary" />
                Assigned Roles ({viewUserRoles.length})
              </h4>
              <div className="p-3 bg-bg border border-border rounded-lg flex flex-wrap gap-1.5">
                {viewUserRoles.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    <ShieldCheck size={12} className="shrink-0" />
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" />
                Address
              </h4>
              <div className="p-3 bg-bg border border-border rounded-lg flex items-start gap-2.5">
                <MapPin size={15} className="text-text-muted/80 shrink-0 mt-0.5" />
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
                <Pencil size={15} />
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
