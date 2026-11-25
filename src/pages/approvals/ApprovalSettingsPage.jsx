/**
 * src/pages/approvals/ApprovalSettingsPage.jsx
 * Admin Configuration for Module-Level Approval Rules & Approver Roles / Users.
 *
 * Implements Global Approval Guide (Section 1 Setup - Admin & Migration AddApproverTypeUser):
 *   - GET    /api/approval-settings/lookups (Dropdowns: approverTypes, roles, users)
 *   - GET    /api/approval-settings/modules?isModuleActive=true (Grid overview)
 *   - POST   /api/approval-settings (Create module rule with approverType Role=1 | User=2)
 *   - PUT    /api/approval-settings/{id} (Update rule / approver type & target)
 *   - DELETE /api/approval-settings/{id} (Reset approval rule -> module no longer needs approval)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';

import {
  IconApproval,
  IconRefresh,
  IconShieldCheck,
  IconUser,
  IconUsers,
  IconEdit,
  IconDelete,
  IconAdd,
  IconClock,
  IconView,
} from '../../constants/icons';

import {
  Button,
  Modal,
  ConfirmModal,
  Badge,
  PageHeader,
  Card,
  TableToolbar,
  DataTable,
  TableActions,
  SearchableSelect,
  SaveButton,
  CancelButton,
  DetailField,
} from '../../components/ui';

import { approvalsService, roleService, userService } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import { ApproverType } from '../../constants/approvalStatus';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'REQUIRED', label: 'Approval Required' },
  { value: 'NOT_REQUIRED', label: 'Not Required' },
];

const APPROVER_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Approver Types' },
  { value: 'ROLE', label: 'Role Based' },
  { value: 'USER', label: 'User Based' },
];

export default function ApprovalSettingsPage() {
  const { user } = useAuthContext();
  const [modules, setModules] = useState([]);
  const [lookups, setLookups] = useState({
    approverTypes: [
      { id: ApproverType.Role, name: 'Role' },
      { id: ApproverType.User, name: 'User' },
    ],
    roles: [],
    users: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // TanStack table state
  const [sorting, setSorting] = useState([{ id: 'moduleName', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Configure Modal State (PUT or initial POST for row)
  const [selectedModule, setSelectedModule] = useState(null);
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [approverType, setApproverType] = useState(ApproverType.Role);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // View Modal State (GET /api/approval-settings/by-module/{moduleCode})
  const [viewingModule, setViewingModule] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // Add Modal State (explicit POST /api/approval-settings)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModuleId, setAddModuleId] = useState('');
  const [addIsApprovalRequired, setAddIsApprovalRequired] = useState(true);
  const [addApproverType, setAddApproverType] = useState(ApproverType.Role);
  const [addRoleId, setAddRoleId] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Delete / Reset Confirmation Modal State
  const [deletingSetting, setDeletingSetting] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // RBAC: Admin check
  const userRole = (user?.role || user?.roleName || user?.roles?.[0]?.name || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  /* ── 1. Fetch Lookups & Modules ── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, lookupsRes, rolesFallbackRes, usersFallbackRes] = await Promise.allSettled([
        approvalsService.getApprovalSettingsModules({ isModuleActive: true }),
        approvalsService.getApprovalSettingsLookups(),
        roleService.getRoles({ isActive: true }),
        userService.getUsers({ isActive: true, pageSize: 100 }),
      ]);

      if (modulesRes.status === 'fulfilled' && Array.isArray(modulesRes.value)) {
        setModules(modulesRes.value);
      } else {
        setModules([]);
      }

      let fetchedRoles = [];
      let fetchedUsers = [];
      let fetchedTypes = [
        { id: ApproverType.Role, name: 'Role' },
        { id: ApproverType.User, name: 'User' },
      ];

      if (lookupsRes.status === 'fulfilled' && lookupsRes.value) {
        if (Array.isArray(lookupsRes.value.roles) && lookupsRes.value.roles.length > 0) {
          fetchedRoles = lookupsRes.value.roles;
        }
        if (Array.isArray(lookupsRes.value.users)) {
          fetchedUsers = lookupsRes.value.users;
        }
        if (Array.isArray(lookupsRes.value.approverTypes) && lookupsRes.value.approverTypes.length > 0) {
          fetchedTypes = lookupsRes.value.approverTypes;
        }
      }

      // Fallback roles if lookups didn't return them
      if (fetchedRoles.length === 0 && rolesFallbackRes.status === 'fulfilled' && Array.isArray(rolesFallbackRes.value)) {
        fetchedRoles = rolesFallbackRes.value;
      }

      // Fallback users if lookups didn't return them
      if (fetchedUsers.length === 0 && usersFallbackRes.status === 'fulfilled') {
        const uItems = usersFallbackRes.value?.items || (Array.isArray(usersFallbackRes.value) ? usersFallbackRes.value : []);
        fetchedUsers = uItems;
      }

      setLookups({
        approverTypes: fetchedTypes,
        roles: fetchedRoles,
        users: fetchedUsers,
      });
    } catch (err) {
      console.error('Failed to load approval settings data:', err);
      toast.error('Failed to load module approval settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  /* ── 2. View Modal Handlers ── */
  async function handleOpenView(mod) {
    setViewingModule(mod);
    setIsFetchingDetail(true);

    try {
      const code = mod.moduleCode;
      if (code) {
        const fresh = await approvalsService.getApprovalSettingByModule(code);
        if (fresh) {
          setViewingModule((prev) => ({
            ...prev,
            ...fresh,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch module approval setting detail:', err);
    } finally {
      setIsFetchingDetail(false);
    }
  }

  function handleCloseView() {
    setViewingModule(null);
    setIsFetchingDetail(false);
  }

  /* ── 3. Configure Modal Handlers ── */
  function handleOpenConfig(mod) {
    setSelectedModule(mod);
    const req = Boolean(mod.isApprovalRequired);
    setIsApprovalRequired(req);

    const type = mod.approverType === ApproverType.User || mod.approverType === 2
      ? ApproverType.User
      : ApproverType.Role;
    setApproverType(type);

    setSelectedRoleId(mod.approverRoleId ? String(mod.approverRoleId) : '');
    setSelectedUserId(mod.approverUserId ? String(mod.approverUserId) : '');
  }

  function handleCloseConfig() {
    if (isSaving) return;
    setSelectedModule(null);
    setIsApprovalRequired(false);
    setApproverType(ApproverType.Role);
    setSelectedRoleId('');
    setSelectedUserId('');
  }

  async function handleSaveConfig() {
    if (!selectedModule) return;

    if (isApprovalRequired) {
      if (approverType === ApproverType.Role && !selectedRoleId) {
        toast.error('Please select an active Approver Role when role-based approval is required.');
        return;
      }
      if (approverType === ApproverType.User && !selectedUserId) {
        toast.error('Please select an active Approver User when user-based approval is required.');
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload = {
        isApprovalRequired,
        approverType,
        approverRoleId: isApprovalRequired && approverType === ApproverType.Role ? Number(selectedRoleId) : null,
        approverUserId: isApprovalRequired && approverType === ApproverType.User ? Number(selectedUserId) : null,
      };

      if (selectedModule.approvalSettingId) {
        await approvalsService.updateApprovalSetting(selectedModule.approvalSettingId, payload);
        toast.success(`Approval rules for ${selectedModule.moduleName} updated successfully.`);
      } else {
        await approvalsService.createApprovalSetting({
          moduleId: selectedModule.moduleId,
          ...payload,
        });
        toast.success(`Approval rules for ${selectedModule.moduleName} configured successfully.`);
      }

      handleCloseConfig();
      loadData();
    } catch (err) {
      console.error('Failed to save approval setting:', err);
      toast.error(err?.detail || err?.message || 'Failed to save approval setting.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── 3. Add Modal Handlers ── */
  function handleOpenAdd() {
    setIsAddModalOpen(true);
    const unconfigured = modules.find((m) => !m.isApprovalRequired && !m.approvalSettingId);
    setAddModuleId(unconfigured ? String(unconfigured.moduleId) : (modules[0]?.moduleId ? String(modules[0].moduleId) : ''));
    setAddIsApprovalRequired(true);
    setAddApproverType(ApproverType.Role);
    setAddRoleId('');
    setAddUserId('');
  }

  function handleCloseAdd() {
    if (isAdding) return;
    setIsAddModalOpen(false);
    setAddModuleId('');
    setAddIsApprovalRequired(true);
    setAddApproverType(ApproverType.Role);
    setAddRoleId('');
    setAddUserId('');
  }

  async function handleConfirmAdd() {
    if (!addModuleId) {
      toast.error('Please select a target module to configure.');
      return;
    }

    if (addIsApprovalRequired) {
      if (addApproverType === ApproverType.Role && !addRoleId) {
        toast.error('Please select an active Approver Role when role-based approval is required.');
        return;
      }
      if (addApproverType === ApproverType.User && !addUserId) {
        toast.error('Please select an active Approver User when user-based approval is required.');
        return;
      }
    }

    try {
      setIsAdding(true);
      const payload = {
        moduleId: Number(addModuleId),
        isApprovalRequired: addIsApprovalRequired,
        approverType: addApproverType,
        approverRoleId: addIsApprovalRequired && addApproverType === ApproverType.Role ? Number(addRoleId) : null,
        approverUserId: addIsApprovalRequired && addApproverType === ApproverType.User ? Number(addUserId) : null,
      };

      await approvalsService.createApprovalSetting(payload);
      const targetMod = modules.find((m) => String(m.moduleId) === String(addModuleId));
      toast.success(`Approval setting for ${targetMod?.moduleName || 'module'} created successfully.`);
      handleCloseAdd();
      loadData();
    } catch (err) {
      console.error('Failed to create approval setting:', err);
      toast.error(err?.detail || err?.message || 'Failed to create approval setting.');
    } finally {
      setIsAdding(false);
    }
  }

  /* ── 4. Delete / Reset Setting Handlers ── */
  function handleOpenDelete(mod) {
    setDeletingSetting(mod);
  }

  function handleCloseDelete() {
    if (isDeleting) return;
    setDeletingSetting(null);
  }

  async function handleConfirmDelete() {
    if (!deletingSetting?.approvalSettingId) return;

    try {
      setIsDeleting(true);
      await approvalsService.deleteApprovalSetting(deletingSetting.approvalSettingId);
      toast.success(`Approval requirement removed for ${deletingSetting.moduleName || 'module'}.`);
      handleCloseDelete();
      loadData();
    } catch (err) {
      console.error('Failed to delete approval setting:', err);
      toast.error(err?.detail || err?.message || 'Failed to remove approval setting.');
    } finally {
      setIsDeleting(false);
    }
  }

  /* ── 5. Options Memoization ── */
  const moduleOptions = useMemo(() => {
    return modules.map((m) => ({
      value: String(m.moduleId),
      label: `${m.moduleName || m.moduleCode} (${m.moduleCode})`,
    }));
  }, [modules]);

  const roleOptions = useMemo(() => {
    return (lookups.roles || []).map((role) => ({
      value: String(role.roleId || role.id),
      label: role.roleName || role.name || `Role #${role.roleId || role.id}`,
    }));
  }, [lookups.roles]);

  const userOptions = useMemo(() => {
    return (lookups.users || []).map((u) => ({
      value: String(u.userId || u.id),
      label: `${u.name || u.userName || 'User'}${u.email ? ` (${u.email})` : ''}`,
    }));
  }, [lookups.users]);

  /* ── 6. Filtered Data ── */
  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((m) => {
      // Search match
      const matchesSearch =
        !q ||
        m.moduleName?.toLowerCase().includes(q) ||
        m.moduleCode?.toLowerCase().includes(q) ||
        m.approverRoleName?.toLowerCase().includes(q) ||
        m.approverUserName?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status match
      if (statusFilter === 'REQUIRED' && !m.isApprovalRequired) return false;
      if (statusFilter === 'NOT_REQUIRED' && m.isApprovalRequired) return false;

      // Approver Type match
      if (typeFilter === 'ROLE' && (m.approverType === ApproverType.User || m.approverType === 2)) return false;
      if (typeFilter === 'USER' && (m.approverType !== ApproverType.User && m.approverType !== 2)) return false;

      return true;
    });
  }, [modules, search, statusFilter, typeFilter]);

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'ALL' || typeFilter !== 'ALL');

  function handleResetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  }

  /* ── 7. Column Definitions (TanStack) ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('moduleName', {
        id: 'moduleName',
        header: 'MODULE NAME',
        size: 210,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span className="font-semibold text-heading text-sm block">
              {row.original.moduleName || row.original.moduleCode}
            </span>
            <span className="text-2xs text-text-muted font-mono sm:hidden">
              {row.original.moduleCode}
            </span>
          </div>
        ),
      }),

      columnHelper.accessor('moduleCode', {
        id: 'moduleCode',
        header: 'MODULE CODE',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
            {row.original.moduleCode}
          </span>
        ),
      }),

      columnHelper.accessor('isApprovalRequired', {
        id: 'isApprovalRequired',
        header: 'APPROVAL WORKFLOW',
        size: 160,
        cell: ({ row }) => {
          const req = Boolean(row.original.isApprovalRequired);
          return req ? (
            <Badge variant="approved">Required</Badge>
          ) : (
            <Badge variant="neutral">Not Required</Badge>
          );
        },
      }),

      columnHelper.accessor('approver', {
        id: 'approver',
        header: 'DESIGNATED APPROVER',
        size: 230,
        cell: ({ row }) => {
          const req = Boolean(row.original.isApprovalRequired);
          if (!req) {
            return <span className="text-text-muted">—</span>;
          }

          const isUserType = row.original.approverType === ApproverType.User || row.original.approverType === 2;

          if (isUserType) {
            return (
              <span className="font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1.5">
                <IconUser size={13} className="shrink-0" />
                <span className="truncate max-w-[170px]" title={row.original.approverUserName || 'User'}>
                  User: {row.original.approverUserName || 'Assigned User'}
                </span>
              </span>
            );
          }

          return (
            <span className="font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1.5">
              <IconShieldCheck size={13} className="shrink-0" />
              <span className="truncate max-w-[170px]" title={row.original.approverRoleName || 'Admin'}>
                Role: {row.original.approverRoleName || 'Admin'}
              </span>
            </span>
          );
        },
      }),

      columnHelper.accessor('pendingRequestCount', {
        id: 'pendingRequestCount',
        header: 'PENDING IN QUEUE',
        size: 150,
        cell: ({ row }) => {
          const count = row.original.pendingRequestCount || 0;
          return (
            <div className="w-full text-center">
              <span
                className={`font-mono font-semibold px-2 py-0.5 rounded-full text-xs inline-block ${
                  count > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'text-text-muted'
                }`}
              >
                {count}
              </span>
            </div>
          );
        },
      }),

      columnHelper.accessor('lastUpdatedOn', {
        id: 'lastUpdatedOn',
        header: 'LAST UPDATED',
        size: 160,
        cell: ({ row }) => {
          if (!row.original.lastUpdatedOn) {
            return <span className="text-text-muted text-xs">Default</span>;
          }
          return (
            <div className="text-2xs text-text-muted">
              <span className="block text-heading font-medium">
                {row.original.lastUpdatedByName || 'System'}
              </span>
              <span>{formatDate(row.original.lastUpdatedOn)}</span>
            </div>
          );
        },
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        cell: ({ row }) => {
          // const canDelete = Boolean(row.original.approvalSettingId && row.original.isApprovalRequired);
          return (
            <TableActions
              onView={() => handleOpenView(row.original)}
              viewTitle="View module approval setting"
              onEdit={isAdmin ? () => handleOpenConfig(row.original) : undefined}
              /* onDelete={isAdmin && canDelete ? () => handleOpenDelete(row.original) : undefined} */
              editTitle="Configure approval rule"
              /* deleteTitle="Reset approval requirement" */
              editDisabled={!isAdmin}
            />
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modules, isAdmin]
  );

  /* ── 8. TanStack Table Instance ── */
  const table = useReactTable({
    data: filteredModules,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /* ── 9. Mobile Card Renderer ── */
  const renderMobileCard = (row) => {
    const mod = row.original;
    const req = Boolean(mod.isApprovalRequired);
    const isUserType = mod.approverType === ApproverType.User || mod.approverType === 2;
    const canDelete = Boolean(mod.approvalSettingId && mod.isApprovalRequired);

    return (
      <Card key={mod.moduleId || mod.moduleCode} className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-heading text-sm">{mod.moduleName || mod.moduleCode}</h4>
            <span className="font-mono text-2xs text-text-muted bg-surface-subtle border border-border px-1.5 py-0.5 rounded">
              {mod.moduleCode}
            </span>
          </div>
          {req ? (
            <Badge variant="approved">Required</Badge>
          ) : (
            <Badge variant="neutral">Not Required</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border">
          <div>
            <span className="text-2xs text-text-muted block">Designated Approver</span>
            {req ? (
              isUserType ? (
                <span className="text-emerald-700 dark:text-emerald-300 font-medium inline-flex items-center gap-1 mt-0.5">
                  <IconUser size={12} />
                  {mod.approverUserName || 'User'}
                </span>
              ) : (
                <span className="text-primary font-medium inline-flex items-center gap-1 mt-0.5">
                  <IconShieldCheck size={12} />
                  {mod.approverRoleName || 'Admin'}
                </span>
              )
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </div>
          <div>
            <span className="text-2xs text-text-muted block">Pending In Queue</span>
            <span className="font-mono font-medium text-heading mt-0.5 inline-block">
              {mod.pendingRequestCount || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border text-2xs text-text-muted">
          <span>{mod.lastUpdatedOn ? `Updated: ${formatDate(mod.lastUpdatedOn)}` : 'Default'}</span>
          <TableActions
            onView={() => handleOpenView(mod)}
            viewTitle="View module approval setting"
            onEdit={isAdmin ? () => handleOpenConfig(mod) : undefined}
            /* onDelete={isAdmin && canDelete ? () => handleOpenDelete(mod) : undefined} */
            editTitle="Configure approval rule"
            /* deleteTitle="Reset approval requirement" */
            editDisabled={!isAdmin}
          />
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-8 sm:pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Approval Settings"
        subtitle="Configure module-level approval workflows, toggle approval requirements, and assign approver roles or specific users."
        icon={<IconApproval className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs shadow-xs flex items-center gap-1.5"
            >
              <IconAdd size={14} className="shrink-0" aria-hidden="true" />
              <span>Add Approval Flow</span>
            </Button>
          </div>
        }
      />

      {/* ── Informational Tip Banner ── */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 shadow-2xs">
        <IconShieldCheck className="text-primary h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-heading">
            Enterprise Workflow Architecture
          </p>
          <p className="text-text-muted leading-relaxed">
            When <strong>Approval is Required</strong>, new submissions enter the Global Approval Queue and trigger notifications for either all active users with the designated <strong>Role</strong> or specifically assigned <strong>User</strong>. Modules where approval is disabled bypass the approval queue and are automatically saved in an approved state.
          </p>
        </div>
      </div>

      {/* ── Standard Table Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search module name, code, or approver..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="approval-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="approver-type-filter"
            placeholder="All Approver Types"
            searchPlaceholder="Search types..."
            options={APPROVER_TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Standard DataTable ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={filteredModules.length}
        entityName="modules"
        renderMobileCard={renderMobileCard}
        emptyTitle="No module approval settings found"
        emptyDescription={
          hasActiveFilters
            ? 'No modules match your current filter criteria. Try resetting filters.'
            : 'No configurable modules found.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-primary"
            >
              Clear Filters
            </Button>
          ) : undefined
        }
      />

      {/* ── MODAL: CONFIGURE MODULE APPROVAL RULE ── */}
      <Modal
        isOpen={Boolean(selectedModule)}
        onClose={handleCloseConfig}
        title={`Configure Approval — ${selectedModule?.moduleName || ''}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <CancelButton onClick={handleCloseConfig} disabled={isSaving} />
            <SaveButton
              onClick={handleSaveConfig}
              loading={isSaving}
              label="Save Changes"
            />
          </div>
        }
      >
        <div className="space-y-5 text-sm">
          {/* Module Information Card */}
          <div className="p-3.5 bg-surface-subtle border border-border rounded-lg space-y-1">
            <span className="text-2xs uppercase tracking-wider font-semibold text-text-muted">
              Target Module
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-heading text-sm">
                {selectedModule?.moduleName}
              </span>
              <span className="font-mono text-xs text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                {selectedModule?.moduleCode}
              </span>
            </div>
          </div>

          {/* Toggle: Approval Requirement */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-heading">
              Approval Workflow Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  isApprovalRequired
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-surface hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-heading">Required</span>
                  <input
                    type="radio"
                    name="approvalRequiredRadio"
                    checked={isApprovalRequired}
                    onChange={() => setIsApprovalRequired(true)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-2xs text-text-muted">
                  Submissions require explicit review and decision.
                </span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  !isApprovalRequired
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-surface hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-heading">Not Required</span>
                  <input
                    type="radio"
                    name="approvalRequiredRadio"
                    checked={!isApprovalRequired}
                    onChange={() => setIsApprovalRequired(false)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-2xs text-text-muted">
                  Submissions automatically bypass queue into approved state.
                </span>
              </label>
            </div>
          </div>

          {/* Approver Type Selection (conditional on isApprovalRequired) */}
          {isApprovalRequired && (
            <div className="space-y-3 pt-2 border-t border-border animate-fadeIn">
              <label className="block text-xs font-semibold text-heading">
                Approver Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    approverType === ApproverType.Role
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border bg-surface hover:bg-surface-subtle text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconShieldCheck size={16} />
                    <span className="text-xs">Role Based</span>
                  </div>
                  <input
                    type="radio"
                    name="configApproverTypeRadio"
                    checked={approverType === ApproverType.Role}
                    onChange={() => setApproverType(ApproverType.Role)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </label>

                <label
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    approverType === ApproverType.User
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border bg-surface hover:bg-surface-subtle text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconUser size={16} />
                    <span className="text-xs">Specific User</span>
                  </div>
                  <input
                    type="radio"
                    name="configApproverTypeRadio"
                    checked={approverType === ApproverType.User}
                    onChange={() => setApproverType(ApproverType.User)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Conditional Approver Select */}
              {approverType === ApproverType.Role ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <SearchableSelect
                    label="Designated Approver Role"
                    id="approverRoleId"
                    name="approverRoleId"
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    options={roleOptions}
                    placeholder="-- Select Approver Role --"
                    searchPlaceholder="Search roles..."
                    hint="Every active user holding this role (except the submitter) receives the approval task."
                  />
                </div>
              ) : (
                <div className="space-y-1.5 animate-fadeIn">
                  <SearchableSelect
                    label="Designated Approver User"
                    id="approverUserId"
                    name="approverUserId"
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    options={userOptions}
                    placeholder="-- Select Approver User --"
                    searchPlaceholder="Search users by name or email..."
                    hint="Only this specific user (and their designated delegates) receives the approval task."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── MODAL: ADD APPROVAL SETTING (POST /api/approval-settings) ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAdd}
        title="Add Approval Flow"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <CancelButton onClick={handleCloseAdd} disabled={isAdding} />
            <SaveButton
              onClick={handleConfirmAdd}
              loading={isAdding}
              label="Save Setting"
            />
          </div>
        }
      >
        <div className="space-y-5 text-sm">
          {/* Target Module Dropdown */}
          <div className="space-y-1.5">
            <SearchableSelect
              label="Target System Module"
              id="add-module-select"
              name="addModuleId"
              required
              value={addModuleId}
              onChange={(e) => setAddModuleId(e.target.value)}
              options={moduleOptions}
              placeholder="-- Select Module --"
              searchPlaceholder="Search module..."
            />
          </div>

          {/* Workflow Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-heading">
              Approval Workflow Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  addIsApprovalRequired
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-surface hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-heading">Required</span>
                  <input
                    type="radio"
                    name="addApprovalRequiredRadio"
                    checked={addIsApprovalRequired}
                    onChange={() => setAddIsApprovalRequired(true)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-2xs text-text-muted">
                  Submissions require explicit review and decision.
                </span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  !addIsApprovalRequired
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-surface hover:bg-surface-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-heading">Not Required</span>
                  <input
                    type="radio"
                    name="addApprovalRequiredRadio"
                    checked={!addIsApprovalRequired}
                    onChange={() => setAddIsApprovalRequired(false)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
                <span className="text-2xs text-text-muted">
                  Submissions automatically bypass queue into approved state.
                </span>
              </label>
            </div>
          </div>

          {/* Approver Type & Target (conditional on addIsApprovalRequired) */}
          {addIsApprovalRequired && (
            <div className="space-y-3 pt-2 border-t border-border animate-fadeIn">
              <label className="block text-xs font-semibold text-heading">
                Approver Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    addApproverType === ApproverType.Role
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border bg-surface hover:bg-surface-subtle text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconShieldCheck size={16} />
                    <span className="text-xs">Role Based</span>
                  </div>
                  <input
                    type="radio"
                    name="addApproverTypeRadio"
                    checked={addApproverType === ApproverType.Role}
                    onChange={() => setAddApproverType(ApproverType.Role)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </label>

                <label
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    addApproverType === ApproverType.User
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border bg-surface hover:bg-surface-subtle text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconUser size={16} />
                    <span className="text-xs">Specific User</span>
                  </div>
                  <input
                    type="radio"
                    name="addApproverTypeRadio"
                    checked={addApproverType === ApproverType.User}
                    onChange={() => setAddApproverType(ApproverType.User)}
                    className="text-primary focus:ring-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Conditional Approver Select */}
              {addApproverType === ApproverType.Role ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <SearchableSelect
                    label="Designated Approver Role"
                    id="add-role-select"
                    name="addRoleId"
                    required
                    value={addRoleId}
                    onChange={(e) => setAddRoleId(e.target.value)}
                    options={roleOptions}
                    placeholder="-- Select Approver Role --"
                    searchPlaceholder="Search roles..."
                    hint="Every active user holding this role (except the submitter) receives the approval task."
                  />
                </div>
              ) : (
                <div className="space-y-1.5 animate-fadeIn">
                  <SearchableSelect
                    label="Designated Approver User"
                    id="add-user-select"
                    name="addUserId"
                    required
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    options={userOptions}
                    placeholder="-- Select Approver User --"
                    searchPlaceholder="Search users by name or email..."
                    hint="Only this specific user (and their designated delegates) receives the approval task."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── MODAL: VIEW MODULE APPROVAL SETTING (GET /api/approval-settings/by-module/{moduleCode}) ── */}
      <Modal
        isOpen={Boolean(viewingModule)}
        onClose={handleCloseView}
        title="Module Approval Setting"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const target = viewingModule;
                  handleCloseView();
                  handleOpenConfig(target);
                }}
                className="text-xs"
              >
                <IconEdit size={14} className="mr-1.5" />
                Configure
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleCloseView} className="text-xs">
              Close
            </Button>
          </div>
        }
      >
        {viewingModule && (
          <div className="space-y-4 text-sm">
            {/* ── Top Target Module Header Card ── */}
            <div className="p-3.5 bg-surface-subtle border border-border rounded-xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-2xs uppercase tracking-wider font-semibold text-text-muted block">
                  Target Module
                </span>
                <h4 className="font-bold text-heading text-base truncate">
                  {viewingModule.moduleName || viewingModule.moduleCode}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-text-muted bg-surface px-2.5 py-1 rounded-md border border-border">
                  {viewingModule.moduleCode}
                </span>
                <Badge variant={viewingModule.isModuleActive !== false ? 'approved' : 'neutral'}>
                  {viewingModule.isModuleActive !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* ── Key-Value Grid using DetailField ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-surface border border-border rounded-xl">
              {/* Workflow Requirement */}
              <DetailField label="Approval Workflow">
                {viewingModule.isApprovalRequired ? (
                  <Badge variant="approved">Required</Badge>
                ) : (
                  <Badge variant="neutral">Not Required</Badge>
                )}
              </DetailField>

              {/* Approver Type */}
              <DetailField label="Approver Type">
                {!viewingModule.isApprovalRequired ? (
                  <span className="text-text-muted">—</span>
                ) : viewingModule.approverType === ApproverType.User || viewingModule.approverType === 2 ? (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                    <IconUser size={13} /> Specific User
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <IconShieldCheck size={13} /> Role Based
                  </span>
                )}
              </DetailField>

              {/* Designated Approver Target */}
              <DetailField
                label={viewingModule.approverType === ApproverType.User || viewingModule.approverType === 2 ? 'Assigned Approver User' : 'Assigned Approver Role'}
                className="sm:col-span-2"
              >
                {!viewingModule.isApprovalRequired ? (
                  <span className="text-text-muted">No approval required</span>
                ) : viewingModule.approverType === ApproverType.User || viewingModule.approverType === 2 ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconUser size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold text-heading text-xs truncate">
                        {viewingModule.approverUserName || `User #${viewingModule.approverUserId}`}
                      </span>
                    </div>
                    {viewingModule.approverUserId && (
                      <span className="font-mono text-2xs text-text-muted bg-surface px-2 py-0.5 rounded border border-border shrink-0 ml-2">
                        User #{viewingModule.approverUserId}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <IconShieldCheck size={16} className="text-primary shrink-0" />
                      <span className="font-semibold text-heading text-xs truncate">
                        {viewingModule.approverRoleName || 'Admin'}
                      </span>
                    </div>
                    {viewingModule.approverRoleId && (
                      <span className="font-mono text-2xs text-text-muted bg-surface px-2 py-0.5 rounded border border-border shrink-0 ml-2">
                        Role #{viewingModule.approverRoleId}
                      </span>
                    )}
                  </div>
                )}
              </DetailField>

              {/* Setting ID & System State */}
              <DetailField label="Setting ID" mono>
                {viewingModule.approvalSettingId ? `#${viewingModule.approvalSettingId}` : 'Default / Not Saved'}
              </DetailField>

              <DetailField label="Module System ID" mono>
                #{viewingModule.moduleId}
              </DetailField>
            </div>

            {/* Dynamic Submissions Policy Notice */}
            <div className="p-3 bg-surface-subtle/70 border border-border rounded-lg text-2xs text-text-muted leading-relaxed">
              {viewingModule.isApprovalRequired ? (
                viewingModule.approverType === ApproverType.User || viewingModule.approverType === 2 ? (
                  <span>
                    All new submissions in <strong>{viewingModule.moduleName || viewingModule.moduleCode}</strong> will be routed directly to{' '}
                    <strong>{viewingModule.approverUserName || 'the assigned user'}</strong> and their active delegates.
                  </span>
                ) : (
                  <span>
                    All new submissions in <strong>{viewingModule.moduleName || viewingModule.moduleCode}</strong> will be broadcast to all active members of the{' '}
                    <strong>{viewingModule.approverRoleName || 'assigned role'}</strong>.
                  </span>
                )
              ) : (
                <span>
                  New submissions in this module are automatically saved in an approved state and bypass the approval queue.
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── CONFIRM MODAL: RESET / DELETE APPROVAL SETTING ── */}
      <ConfirmModal
        isOpen={Boolean(deletingSetting)}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title="Reset Approval Requirement"
        confirmText="Remove Approval"
        variant="danger"
        loading={isDeleting}
        message={`Are you sure you want to remove the approval requirement for "${deletingSetting?.moduleName || 'this module'}"? New submissions will immediately bypass approval.`}
      />
    </div>
  );
}
