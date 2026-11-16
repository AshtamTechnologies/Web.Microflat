/**
 * src/pages/approvals/ApprovalSettingsPage.jsx
 * Admin Configuration for Module-Level Approval Rules & Approver Roles.
 *
 * Implements Frontend-API-Guide 1.md (Section 5.5 Setup - Admin):
 *   - GET    /api/approval-settings/modules?isModuleActive=true (Grid overview)
 *   - POST   /api/approval-settings (Create module rule)
 *   - PUT    /api/approval-settings/{id} (Update rule / approver role)
 *   - DELETE /api/approval-settings/{id} (Disable approval for module)
 *   - GET    /api/roles (via rolesService.getRoles for approver role dropdown)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IconApproval,
  IconCheck,
  IconClose,
  IconRefresh,
  IconShieldCheck,
  IconClock,
  IconEdit,
  IconBuilding,
  IconAdd,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Modal,
  Badge,
  PageHeader,
  Card,
  TableToolbar,
  SearchableSelect,
  SaveButton,
  CancelButton,
} from '../../components/ui';
import { approvalsService, roleService } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

export default function ApprovalSettingsPage() {
  const { user } = useAuthContext();
  const [modules, setModules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Configure Modal State
  const [selectedModule, setSelectedModule] = useState(null);
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Add Modal State (explicit POST /api/approval-settings)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModuleId, setAddModuleId] = useState('');
  const [addIsApprovalRequired, setAddIsApprovalRequired] = useState(true);
  const [addRoleId, setAddRoleId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // RBAC: Admin check
  const userRole = (user?.role || user?.roleName || user?.roles?.[0]?.name || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  /* ── 1. Fetch System Roles & Module Settings ── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, rolesRes] = await Promise.allSettled([
        approvalsService.getApprovalSettingsModules({ isModuleActive: true }),
        roleService.getRoles({ isActive: true }),
      ]);

      if (modulesRes.status === 'fulfilled' && Array.isArray(modulesRes.value)) {
        setModules(modulesRes.value);
      } else {
        setModules([]);
      }

      if (rolesRes.status === 'fulfilled' && Array.isArray(rolesRes.value)) {
        setRoles(rolesRes.value);
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error('Failed to load approval settings:', err);
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

  /* ── 2. Open Modal to Configure Module Rule ── */
  function handleOpenConfig(mod) {
    setSelectedModule(mod);
    setIsApprovalRequired(Boolean(mod.isApprovalRequired));
    setSelectedRoleId(mod.approverRoleId ? String(mod.approverRoleId) : '');
  }

  function handleCloseConfig() {
    if (isSaving) return;
    setSelectedModule(null);
    setIsApprovalRequired(false);
    setSelectedRoleId('');
  }

  /* ── 3. Save Module Configuration ── */
  async function handleSaveConfig() {
    if (!selectedModule) return;

    if (isApprovalRequired && !selectedRoleId) {
      toast.error('Please select an active Approver Role when approval is required.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        isApprovalRequired,
        approverRoleId: isApprovalRequired ? Number(selectedRoleId) : undefined,
      };

      if (selectedModule.approvalSettingId) {
        // Update existing setting
        await approvalsService.updateApprovalSetting(
          selectedModule.approvalSettingId,
          payload
        );
        toast.success(`Approval rules for ${selectedModule.moduleName} updated successfully.`);
      } else {
        // Create new setting for module
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

  /* ── 4. Add Setting Handlers (POST /api/approval-settings) ── */
  function handleOpenAdd() {
    setIsAddModalOpen(true);
    // Suggest first module that has no approval setting configured yet
    const unconfigured = modules.find((m) => !m.isApprovalRequired && !m.approvalSettingId);
    setAddModuleId(unconfigured ? String(unconfigured.moduleId) : (modules[0]?.moduleId ? String(modules[0].moduleId) : ''));
    setAddIsApprovalRequired(true);
    setAddRoleId('');
  }

  function handleCloseAdd() {
    if (isAdding) return;
    setIsAddModalOpen(false);
    setAddModuleId('');
    setAddIsApprovalRequired(true);
    setAddRoleId('');
  }

  async function handleConfirmAdd() {
    if (!addModuleId) {
      toast.error('Please select a target module to configure.');
      return;
    }

    if (addIsApprovalRequired && !addRoleId) {
      toast.error('Please select an active Approver Role when approval is required.');
      return;
    }

    try {
      setIsAdding(true);
      const payload = {
        moduleId: Number(addModuleId),
        isApprovalRequired: addIsApprovalRequired,
        approverRoleId: addIsApprovalRequired ? Number(addRoleId) : undefined,
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

  /* ── 5. Options & Filtered Modules ── */
  const moduleOptions = useMemo(() => {
    return modules.map((m) => ({
      value: String(m.moduleId),
      label: `${m.moduleName || m.moduleCode} (${m.moduleCode})`,
    }));
  }, [modules]);

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({
      value: String(role.id || role.roleId),
      label: role.roleName || role.name,
    }));
  }, [roles]);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.moduleName?.toLowerCase().includes(q) ||
        m.moduleCode?.toLowerCase().includes(q) ||
        m.approverRoleName?.toLowerCase().includes(q)
    );
  }, [modules, search]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-8 sm:pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Approval Settings"
        subtitle="Configure module-level approval workflows, toggle approval requirements, and assign approver roles."
        icon={<IconApproval className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={isLoading || isRefreshing}
              className="text-xs shadow-xs"
            >
              <IconRefresh size={14} className="mr-1.5 shrink-0" aria-hidden="true" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs shadow-xs flex items-center gap-1.5"
            >
              <IconAdd size={14} className="shrink-0" aria-hidden="true" />
              <span>Add Setting</span>
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
            When <strong>Approval is Required</strong> for a module, new submissions enter the Global Approval Queue and trigger notifications for all active users holding the designated Approver Role. Modules where approval is disabled bypass the approval queue and are automatically saved in an approved state.
          </p>
        </div>
      </div>

      {/* ── Table & Search Toolbar ── */}
      <div className="bg-surface rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search module name or assigned role..."
            hasActiveFilters={Boolean(search.trim())}
            onReset={() => setSearch('')}
          />
        </div>

        {/* Modules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle/80 text-text-muted font-semibold border-b border-border select-none">
                <th className="py-3 px-4">Module Name</th>
                <th className="py-3 px-4">Module Code</th>
                <th className="py-3 px-4">Approval Required</th>
                <th className="py-3 px-4">Approver Role</th>
                <th className="py-3 px-4 text-center">Pending In Queue</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconRefresh size={20} className="animate-spin text-primary" />
                      <span>Loading module configurations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    No modules found matching your search.
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const isRequired = Boolean(mod.isApprovalRequired);
                  return (
                    <tr
                      key={mod.moduleId || mod.moduleCode}
                      className="hover:bg-surface-subtle/40 transition-colors"
                    >
                      {/* Module Name */}
                      <td className="py-3.5 px-4 font-semibold text-heading text-sm">
                        {mod.moduleName || mod.moduleCode}
                      </td>

                      {/* Module Code */}
                      <td className="py-3.5 px-4 font-mono text-xs text-text-muted">
                        <span className="bg-surface-subtle border border-border px-2 py-0.5 rounded">
                          {mod.moduleCode}
                        </span>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        {isRequired ? (
                          <Badge variant="approved">Required</Badge>
                        ) : (
                          <Badge variant="neutral">Not Required</Badge>
                        )}
                      </td>

                      {/* Approver Role */}
                      <td className="py-3.5 px-4">
                        {isRequired ? (
                          <span className="font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                            <IconShieldCheck size={12} />
                            {mod.approverRoleName || 'Admin'}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>

                      {/* Pending In Queue */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded-full text-xs ${
                            mod.pendingRequestCount > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'text-text-muted'
                          }`}
                        >
                          {mod.pendingRequestCount || 0}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-text-muted text-2xs">
                        {mod.lastUpdatedOn ? (
                          <div>
                            <span className="block text-heading font-medium">
                              {mod.lastUpdatedByName || 'System'}
                            </span>
                            <span>{formatDate(mod.lastUpdatedOn)}</span>
                          </div>
                        ) : (
                          'Default'
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="!px-3 !py-1 text-xs inline-flex items-center gap-1.5"
                          onClick={() => handleOpenConfig(mod)}
                          disabled={!isAdmin}
                          title={isAdmin ? 'Configure approval setting' : 'Admin access required'}
                        >
                          <IconEdit size={12} />
                          <span>Configure</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  Submissions require explicit role review and decision.
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

          {/* Approver Role Dropdown (conditional on isApprovalRequired) */}
          {isApprovalRequired && (
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
                hint="Only users holding this active role (or Super Admin) can approve submissions for this module."
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ── MODAL: ADD APPROVAL SETTING (POST /api/approval-settings) ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAdd}
        title="Add Approval Setting"
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
                  Submissions require explicit role review and decision.
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

          {/* Approver Role Dropdown (conditional on addIsApprovalRequired) */}
          {addIsApprovalRequired && (
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
                hint="Only users holding this active role (or Super Admin) can approve submissions for this module."
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
