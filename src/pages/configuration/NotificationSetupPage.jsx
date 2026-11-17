/**
 * src/pages/configuration/NotificationSetupPage.jsx
 * Admin screen for Configurable Notification Rules and Events.
 * Conforms strictly to MicroFlat ERP visual standards and Section 5 of Notification-WorkQueue-API.md.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconEdit,
  IconEye,
  IconTrash,
  IconNotificationSetup,
  IconBell,
  IconMyQueue,
  IconInfo,
} from '../../constants/icons';
import { Mail, UserCheck, Shield, Users, Sparkles, Tag } from 'lucide-react';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  Textarea,
  Modal,
  StatusSwitch,
  StatusBadge,
  PageHeader,
  TableToolbar,
  TableActions,
  DataTable,
  SearchableSelect,
  Badge,
  Card,
  Checkbox,
  ConfirmModal,
} from '../../components/ui';
import { useNotificationSetupContext } from '../../context/NotificationSetupContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_RULE_FORM = {
  notificationEventId: '',
  recipientType: 'Role', // 'Role' | 'User' | 'AssignedTo' | 'Creator'
  roleId: '',
  roleName: '',
  userId: '',
  userName: '',
  sendInApp: true,
  sendEmail: false,
  addToWorkQueue: false,
  includeActor: false,
  titleTemplate: '',
  messageTemplate: '',
  workQueueDueDateRule: 'Today', // 'Today' | 'EventDate' | 'None'
  isActive: true,
};

const INITIAL_EVENT_FORM = {
  moduleId: 3,
  moduleCode: 'INQUIRY',
  moduleName: 'Inquiry Management',
  eventType: 'Create',
  eventName: '',
  isActive: true,
};

export default function NotificationSetupPage() {
  const {
    lookups,
    modulesList,
    events,
    rules,
    rolesList,
    usersList,
    selectedModule,
    setSelectedModule,
    selectedEventId,
    setSelectedEventId,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    createRule,
    updateRule,
    deleteRule,
    getPlaceholdersForModule,
  } = useNotificationSetupContext();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // TanStack table state
  const [sorting, setSorting] = useState([{ id: 'id', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modals state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [viewingRule, setViewingRule] = useState(null);
  const [ruleFormData, setRuleFormData] = useState(INITIAL_RULE_FORM);
  const [ruleErrors, setRuleErrors] = useState({});
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventFormData, setEventFormData] = useState(INITIAL_EVENT_FORM);
  const [eventErrors, setEventErrors] = useState({});
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  const [confirmDeleteRule, setConfirmDeleteRule] = useState(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);

  // Field focus tracker for placeholder insertion
  const [lastFocusedField, setLastFocusedField] = useState('messageTemplate');
  const titleInputRef = useRef(null);
  const messageInputRef = useRef(null);

  /* ── Module Dropdown Options with Counts ── */
  const moduleFilterOptions = useMemo(() => {
    const countsByModule = {};
    rules.forEach((r) => {
      const code = r.moduleCode || 'OTHER';
      countsByModule[code] = (countsByModule[code] || 0) + 1;
    });

    return [
      { value: 'ALL', label: `All Modules (${rules.length})` },
      ...modulesList.map((m) => ({
        value: m.moduleCode,
        label: `${m.moduleName} (${countsByModule[m.moduleCode] || 0})`,
      })),
    ];
  }, [rules, modulesList]);

  // Events filtered by selected module tab
  const filteredEventsForSelector = useMemo(() => {
    if (selectedModule === 'ALL') return events;
    return events.filter((e) => e.moduleCode === selectedModule);
  }, [events, selectedModule]);

  // Rules filtered by module, eventId, search, and status
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (selectedModule !== 'ALL' && rule.moduleCode !== selectedModule) {
        return false;
      }

      if (selectedEventId !== 'ALL' && String(rule.notificationEventId) !== String(selectedEventId)) {
        return false;
      }

      if (statusFilter === 'ACTIVE' && !rule.isActive) return false;
      if (statusFilter === 'INACTIVE' && rule.isActive) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const eventMatch = (rule.eventName || '').toLowerCase().includes(query);
        const moduleMatch = (rule.moduleCode || '').toLowerCase().includes(query);
        const titleMatch = (rule.titleTemplate || '').toLowerCase().includes(query);
        const messageMatch = (rule.messageTemplate || '').toLowerCase().includes(query);
        const recipientMatch =
          (rule.recipientType || '').toLowerCase().includes(query) ||
          (rule.roleName || '').toLowerCase().includes(query) ||
          (rule.userName || '').toLowerCase().includes(query);
        return eventMatch || moduleMatch || titleMatch || messageMatch || recipientMatch;
      }

      return true;
    });
  }, [rules, selectedModule, selectedEventId, statusFilter, searchQuery]);

  /* ── Target Event Options for Form ── */
  const eventSelectOptions = useMemo(() => {
    return events.map((e) => ({
      value: String(e.id),
      label: `[${e.moduleCode}] ${e.eventName} (${e.eventType})`,
      moduleCode: e.moduleCode,
      moduleId: e.moduleId,
      eventName: e.eventName,
      eventType: e.eventType,
    }));
  }, [events]);

  const activeEventObj = useMemo(() => {
    if (!ruleFormData.notificationEventId) return null;
    return events.find((e) => String(e.id) === String(ruleFormData.notificationEventId)) || null;
  }, [events, ruleFormData.notificationEventId]);

  const availablePlaceholders = useMemo(() => {
    const modCode = activeEventObj?.moduleCode || (selectedModule !== 'ALL' ? selectedModule : 'INQUIRY');
    return getPlaceholdersForModule(modCode);
  }, [activeEventObj, selectedModule, getPlaceholdersForModule]);

  /* ── Recipient Options ── */
  const roleSelectOptions = useMemo(() => {
    return rolesList.map((r) => ({
      value: String(r.id),
      label: r.roleName || r.name || `Role #${r.id}`,
    }));
  }, [rolesList]);

  const userSelectOptions = useMemo(() => {
    return usersList.map((u) => ({
      value: String(u.id || u.userId),
      label: `${u.fullName || u.userName || u.name || 'User'} (${u.email || u.userName || 'user'})`,
    }));
  }, [usersList]);

  /* ── Insert Placeholder into Template ── */
  const handleInsertPlaceholder = (placeholder) => {
    const tag = `{${placeholder}}`;
    if (lastFocusedField === 'titleTemplate') {
      const current = ruleFormData.titleTemplate || '';
      setRuleFormData((prev) => ({ ...prev, titleTemplate: current + tag }));
    } else {
      const current = ruleFormData.messageTemplate || '';
      setRuleFormData((prev) => ({ ...prev, messageTemplate: current + tag }));
    }
  };

  /* ── Rule Handlers ── */
  const handleOpenAddRule = () => {
    const defaultEv =
      selectedEventId !== 'ALL'
        ? selectedEventId
        : filteredEventsForSelector.length > 0
        ? String(filteredEventsForSelector[0].id)
        : events.length > 0
        ? String(events[0].id)
        : '';

    setEditingRule(null);
    setRuleFormData({
      ...INITIAL_RULE_FORM,
      notificationEventId: defaultEv,
      roleId: rolesList.length > 0 ? String(rolesList[0].id) : '',
      roleName: rolesList.length > 0 ? rolesList[0].roleName || rolesList[0].name : '',
    });
    setRuleErrors({});
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule) => {
    setEditingRule(rule);
    setRuleFormData({
      notificationEventId: String(rule.notificationEventId),
      recipientType: rule.recipientType || 'Role',
      roleId: rule.roleId ? String(rule.roleId) : '',
      roleName: rule.roleName || '',
      userId: rule.userId ? String(rule.userId) : '',
      userName: rule.userName || '',
      sendInApp: Boolean(rule.sendInApp),
      sendEmail: Boolean(rule.sendEmail),
      addToWorkQueue: Boolean(rule.addToWorkQueue),
      includeActor: Boolean(rule.includeActor),
      titleTemplate: rule.titleTemplate || '',
      messageTemplate: rule.messageTemplate || '',
      workQueueDueDateRule: rule.workQueueDueDateRule || 'Today',
      isActive: Boolean(rule.isActive),
    });
    setRuleErrors({});
    setIsRuleModalOpen(true);
  };

  const handleOpenViewRule = (rule) => {
    setViewingRule(rule);
  };

  const validateRuleForm = () => {
    const errors = {};
    if (!ruleFormData.notificationEventId) {
      errors.notificationEventId = 'Target event is required.';
    }
    if (ruleFormData.recipientType === 'Role' && !ruleFormData.roleId) {
      errors.roleId = 'Please select a recipient role.';
    }
    if (ruleFormData.recipientType === 'User' && !ruleFormData.userId) {
      errors.userId = 'Please select a recipient user.';
    }
    if (!ruleFormData.sendInApp && !ruleFormData.sendEmail && !ruleFormData.addToWorkQueue) {
      errors.channels = 'Choose at least one channel: In-App, Email, or Work Queue.';
    }
    if (!ruleFormData.titleTemplate?.trim()) {
      errors.titleTemplate = 'Title template is required.';
    } else if (ruleFormData.titleTemplate.length > 150) {
      errors.titleTemplate = 'Title template cannot exceed 150 characters.';
    }
    if (!ruleFormData.messageTemplate?.trim()) {
      errors.messageTemplate = 'Message template is required.';
    } else if (ruleFormData.messageTemplate.length > 500) {
      errors.messageTemplate = 'Message template cannot exceed 500 characters.';
    }
    setRuleErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveRule = async (e) => {
    e?.preventDefault();
    if (!validateRuleForm()) return;

    setIsSubmittingRule(true);
    try {
      const selectedRole = rolesList.find((r) => String(r.id) === String(ruleFormData.roleId));
      const selectedUser = usersList.find((u) => String(u.id || u.userId) === String(ruleFormData.userId));

      const payload = {
        notificationEventId: Number(ruleFormData.notificationEventId),
        recipientType: ruleFormData.recipientType,
        roleId: ruleFormData.recipientType === 'Role' ? Number(ruleFormData.roleId) : null,
        roleName: ruleFormData.recipientType === 'Role' ? selectedRole?.roleName || selectedRole?.name || null : null,
        userId: ruleFormData.recipientType === 'User' ? Number(ruleFormData.userId) : null,
        userName: ruleFormData.recipientType === 'User' ? selectedUser?.fullName || selectedUser?.name || null : null,
        sendInApp: Boolean(ruleFormData.sendInApp),
        sendEmail: Boolean(ruleFormData.sendEmail),
        addToWorkQueue: Boolean(ruleFormData.addToWorkQueue),
        includeActor: Boolean(ruleFormData.includeActor),
        titleTemplate: ruleFormData.titleTemplate.trim(),
        messageTemplate: ruleFormData.messageTemplate.trim(),
        workQueueDueDateRule: ruleFormData.addToWorkQueue ? ruleFormData.workQueueDueDateRule : 'None',
        isActive: Boolean(ruleFormData.isActive),
      };

      if (editingRule) {
        await updateRule(editingRule.id, payload);
      } else {
        await createRule(payload);
      }
      setIsRuleModalOpen(false);
      setEditingRule(null);
    } catch {
      // Handled in context toast
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!confirmDeleteRule) return;
    try {
      await deleteRule(confirmDeleteRule.id);
      setConfirmDeleteRule(null);
    } catch {
      // Handled in context toast
    }
  };

  /* ── Event Handlers ── */
  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    const mod =
      selectedModule !== 'ALL'
        ? modulesList.find((m) => m.moduleCode === selectedModule) || modulesList[0]
        : modulesList[0];

    setEventFormData({
      moduleId: mod ? mod.moduleId || 3 : 3,
      moduleCode: mod ? mod.moduleCode : 'INQUIRY',
      moduleName: mod ? mod.moduleName : 'Inquiry Management',
      eventType: 'Create',
      eventName: '',
      isActive: true,
    });
    setEventErrors({});
    setIsEventModalOpen(true);
  };

  const validateEventForm = () => {
    const errors = {};
    if (!eventFormData.eventName?.trim()) {
      errors.eventName = 'Event name is required.';
    } else if (eventFormData.eventName.length > 150) {
      errors.eventName = 'Event name cannot exceed 150 characters.';
    }
    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEvent = async (e) => {
    e?.preventDefault();
    if (!validateEventForm()) return;

    setIsSubmittingEvent(true);
    try {
      const payload = {
        moduleId: Number(eventFormData.moduleId),
        moduleCode: eventFormData.moduleCode,
        moduleName: eventFormData.moduleName,
        eventType: eventFormData.eventType,
        eventName: eventFormData.eventName.trim(),
        isActive: Boolean(eventFormData.isActive),
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
      } else {
        await createEvent(payload);
      }
      setIsEventModalOpen(false);
      setEditingEvent(null);
    } catch {
      // Handled in context toast
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  /* ── TanStack Columns ── */
  const columns = useMemo(
    () => [
      /* 1. EVENT & MODULE */
      columnHelper.accessor('moduleCode', {
        id: 'event',
        header: 'EVENT & MODULE',
        size: 230,
        minSize: 180,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col gap-1 py-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-2xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {item.moduleCode}
                </span>
                <span className="text-2xs font-medium text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                  {item.eventType}
                </span>
              </div>
              <span className="font-semibold text-text text-xs line-clamp-1" title={item.eventName}>
                {item.eventName}
              </span>
            </div>
          );
        },
      }),

      /* 2. RECIPIENT TARGET */
      columnHelper.accessor('recipientType', {
        id: 'recipient',
        header: 'RECIPIENT TARGET',
        size: 200,
        minSize: 160,
        cell: ({ row }) => {
          const item = row.original;
          let icon = <Users size={13} className="text-primary shrink-0" />;
          let label = item.recipientType;
          let sub = null;

          if (item.recipientType === 'Role') {
            icon = <Shield size={13} className="text-amber-600 shrink-0" />;
            sub = item.roleName || `Role #${item.roleId}`;
          } else if (item.recipientType === 'User') {
            icon = <UserCheck size={13} className="text-emerald-600 shrink-0" />;
            sub = item.userName || `User #${item.userId}`;
          } else if (item.recipientType === 'AssignedTo') {
            sub = 'Record Assigned User';
          } else if (item.recipientType === 'Creator') {
            sub = 'Record Creator';
          }

          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                {icon}
                <span className="font-medium text-xs text-text">{label}</span>
                {item.includeActor && (
                  <span
                    className="inline-flex items-center text-[10px] px-1 py-0.2 bg-surface-ground text-text-muted rounded border border-border font-normal"
                    title="Includes user who triggered event"
                  >
                    +Actor
                  </span>
                )}
              </div>
              {sub && <span className="text-2xs text-text-muted line-clamp-1">{sub}</span>}
            </div>
          );
        },
      }),

      /* 3. CHANNELS */
      columnHelper.accessor('channels', {
        id: 'channels',
        header: 'CHANNELS',
        size: 180,
        minSize: 150,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.sendInApp && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  title="In-App Notification (Bell)"
                >
                  <IconBell size={11} />
                  <span>Bell</span>
                </span>
              )}
              {item.sendEmail && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                  title="Email Dispatch"
                >
                  <Mail size={11} />
                  <span>Email</span>
                </span>
              )}
              {item.addToWorkQueue && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  title={`Work Queue Item (Due: ${item.workQueueDueDateRule || 'Today'})`}
                >
                  <IconMyQueue size={11} />
                  <span>Queue</span>
                </span>
              )}
            </div>
          );
        },
      }),

      /* 4. TEMPLATE PREVIEW */
      columnHelper.accessor('messageTemplate', {
        id: 'template',
        header: 'TEMPLATE PREVIEW',
        size: 320,
        minSize: 220,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col gap-0.5 py-1">
              <span className="font-medium text-xs text-text line-clamp-1" title={item.titleTemplate}>
                {item.titleTemplate}
              </span>
              <span className="text-2xs text-text-muted line-clamp-1" title={item.messageTemplate}>
                {item.messageTemplate}
              </span>
            </div>
          );
        },
      }),

      /* 5. STATUS */
      columnHelper.accessor('isActive', {
        id: 'status',
        header: 'STATUS',
        size: 120,
        minSize: 110,
        enableResizing: false,
        cell: ({ row }) => <StatusBadge status={row.original.isActive} size="sm" />,
      }),

      /* 6. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 130,
        minSize: 125,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            onView={() => handleOpenViewRule(row.original)}
            onEdit={() => handleOpenEditRule(row.original)}
            onDelete={() => setConfirmDeleteRule(row.original)}
            viewTitle="View notification rule"
            editTitle="Edit notification rule"
            deleteTitle="Delete notification rule"
          />
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredRules,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  /* ── Mobile Card Renderer (< md) ── */
  const renderMobileCard = (row) => {
    const item = row.original;

    let recipientIcon = <Users size={13} className="text-primary shrink-0" />;
    let recipientLabel = item.recipientType;
    let recipientSub = null;

    if (item.recipientType === 'Role') {
      recipientIcon = <Shield size={13} className="text-amber-600 shrink-0" />;
      recipientSub = item.roleName || `Role #${item.roleId}`;
    } else if (item.recipientType === 'User') {
      recipientIcon = <UserCheck size={13} className="text-emerald-600 shrink-0" />;
      recipientSub = item.userName || `User #${item.userId}`;
    } else if (item.recipientType === 'AssignedTo') {
      recipientSub = 'Record Assigned User';
    } else if (item.recipientType === 'Creator') {
      recipientSub = 'Record Creator';
    }

    return (
      <Card key={item.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Header: Module Badge, Event Type & Status */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-2xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              {item.moduleCode}
            </span>
            <span className="text-2xs font-medium text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
              {item.eventType}
            </span>
          </div>
          <StatusBadge status={item.isActive} size="sm" />
        </div>

        {/* Event Name */}
        <div>
          <h4
            className="text-xs font-bold text-heading hover:text-primary cursor-pointer transition-colors"
            onClick={() => handleOpenViewRule(item)}
          >
            {item.eventName}
          </h4>
        </div>

        {/* Recipient & Channels info */}
        <div className="space-y-2 text-2xs">
          <div className="flex items-center gap-1.5">
            {recipientIcon}
            <span className="font-medium text-text">{recipientLabel}</span>
            {recipientSub && <span className="text-text-muted">({recipientSub})</span>}
            {item.includeActor && (
              <span className="text-[10px] px-1 py-0.2 bg-surface-ground text-text-muted rounded border border-border">
                +Actor
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {item.sendInApp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <IconBell size={11} />
                <span>Bell</span>
              </span>
            )}
            {item.sendEmail && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                <Mail size={11} />
                <span>Email</span>
              </span>
            )}
            {item.addToWorkQueue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <IconMyQueue size={11} />
                <span>Queue</span>
              </span>
            )}
          </div>
        </div>

        {/* Template Preview Snippet */}
        <div className="p-2.5 rounded bg-surface-ground border border-border/60 text-2xs space-y-1">
          <div className="font-semibold text-text line-clamp-1">{item.titleTemplate}</div>
          <div className="text-text-muted line-clamp-2">{item.messageTemplate}</div>
        </div>

        {/* Footer: Date & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-2xs">
          <span className="text-text-muted">
            {item.createdOn ? formatDate(item.createdOn) : '—'}
          </span>
          <TableActions
            onView={() => handleOpenViewRule(item)}
            onEdit={() => handleOpenEditRule(item)}
            onDelete={() => setConfirmDeleteRule(item)}
            viewTitle="View notification rule"
            editTitle="Edit notification rule"
            deleteTitle="Delete notification rule"
          />
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Notification Setup"
        subtitle="Configure automated notification events, recipient triggers, communication channels, and dynamic message templates."
        icon={<IconNotificationSetup className="text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenAddEvent}
              icon={<IconAdd size={16} />}
            >
              Add Event
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddRule}
              icon={<IconAdd size={16} />}
            >
              Add Rule
            </Button>
          </div>
        }
      />

      {/* ── Table Toolbar (Search + Filters as Children) ── */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search rules, templates, events, recipients…"
        hasActiveFilters={Boolean(
          searchQuery.trim() ||
            statusFilter !== 'ALL' ||
            selectedModule !== 'ALL' ||
            selectedEventId !== 'ALL'
        )}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
          setSelectedModule('ALL');
          setSelectedEventId('ALL');
        }}
        resetLabel="Reset Filters"
      >
        {/* Module Filter Dropdown */}
        <div className="w-full sm:w-56">
          <SearchableSelect
            id="filter-notification-module"
            placeholder="All Modules"
            searchPlaceholder="Search module…"
            options={moduleFilterOptions}
            value={selectedModule}
            onChange={(e) => {
              const val = typeof e === 'object' && e?.target ? e.target.value : e;
              setSelectedModule(val || 'ALL');
              setSelectedEventId('ALL');
            }}
          />
        </div>

        {/* Event Filter Dropdown */}
        <div className="w-full sm:w-56">
          <SearchableSelect
            id="filter-notification-event"
            placeholder={selectedModule === 'ALL' ? 'All Events' : 'All Module Events'}
            searchPlaceholder="Filter by event…"
            options={[
              { value: 'ALL', label: selectedModule === 'ALL' ? 'All Events' : 'All Module Events' },
              ...filteredEventsForSelector.map((e) => ({
                value: String(e.id),
                label: `${e.eventName} (${e.eventType})`,
              })),
            ]}
            value={selectedEventId}
            onChange={(e) => {
              const val = typeof e === 'object' && e?.target ? e.target.value : e;
              setSelectedEventId(val || 'ALL');
            }}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-40">
          <SearchableSelect
            id="filter-notification-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status…"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              const val = typeof e === 'object' && e?.target ? e.target.value : e;
              setStatusFilter(val || 'ALL');
            }}
          />
        </div>
      </TableToolbar>

      {/* ── Main DataTable (Direct Sibling, No Double Border) ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={filteredRules.length}
        entityName="notification rules"
        emptyTitle="No notification rules found"
        emptyDescription={
          searchQuery.trim() || statusFilter !== 'ALL' || selectedModule !== 'ALL' || selectedEventId !== 'ALL'
            ? 'Try resetting your search or filter options.'
            : "Click '+ Add Rule' to configure notification triggers and message templates."
        }
        renderMobileCard={renderMobileCard}
      />

      {/* ═══════════════════════════════════════════════════════════════
          ADD / EDIT RULE MODAL
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? 'Edit Notification Rule' : 'Add Notification Rule'}
        subtitle="Specify event trigger, recipient targeting, communication channels, and dynamic template formatting."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <CancelButton onClick={() => setIsRuleModalOpen(false)} />
            <SaveButton loading={isSubmittingRule} onClick={handleSaveRule} />
          </div>
        }
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          {/* Section 1: Event & Recipient */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              1. Event Trigger & Target Recipient
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Target Event <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={eventSelectOptions}
                  value={ruleFormData.notificationEventId}
                  onChange={(val) => {
                    const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                    setRuleFormData((prev) => ({ ...prev, notificationEventId: resolved }));
                    if (ruleErrors.notificationEventId) setRuleErrors((prev) => ({ ...prev, notificationEventId: null }));
                  }}
                  placeholder="Select event…"
                />
                {ruleErrors.notificationEventId && (
                  <p className="text-xs text-red-500 mt-1">{ruleErrors.notificationEventId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Recipient Type <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={(lookups.recipientTypes || ['Role', 'User', 'AssignedTo', 'Creator']).map((t) => ({
                    value: t,
                    label: t === 'AssignedTo' ? 'Assigned User (Record Owner)' : t === 'Creator' ? 'Creator (Author/Organizer)' : t,
                  }))}
                  value={ruleFormData.recipientType}
                  onChange={(val) => {
                    const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                    setRuleFormData((prev) => ({ ...prev, recipientType: resolved, roleId: '', userId: '' }));
                  }}
                />
              </div>
            </div>

            {/* Dynamic Recipient Target Field */}
            {ruleFormData.recipientType === 'Role' && (
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Target Role <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={roleSelectOptions}
                  value={ruleFormData.roleId}
                  onChange={(val) => {
                    const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                    setRuleFormData((prev) => ({ ...prev, roleId: resolved }));
                    if (ruleErrors.roleId) setRuleErrors((prev) => ({ ...prev, roleId: null }));
                  }}
                  placeholder="Select target role…"
                />
                {ruleErrors.roleId && <p className="text-xs text-red-500 mt-1">{ruleErrors.roleId}</p>}
                <p className="text-2xs text-text-muted mt-1">All active members in this role will receive this notification.</p>
              </div>
            )}

            {ruleFormData.recipientType === 'User' && (
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Target User <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={userSelectOptions}
                  value={ruleFormData.userId}
                  onChange={(val) => {
                    const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                    setRuleFormData((prev) => ({ ...prev, userId: resolved }));
                    if (ruleErrors.userId) setRuleErrors((prev) => ({ ...prev, userId: null }));
                  }}
                  placeholder="Select target user…"
                />
                {ruleErrors.userId && <p className="text-xs text-red-500 mt-1">{ruleErrors.userId}</p>}
              </div>
            )}

            {(ruleFormData.recipientType === 'AssignedTo' || ruleFormData.recipientType === 'Creator') && (
              <div className="bg-surface-ground border border-border rounded p-2.5 text-2xs text-text-muted leading-relaxed">
                <span className="font-semibold text-text">Contextual Recipient: </span>
                {ruleFormData.recipientType === 'AssignedTo'
                  ? 'Resolves dynamically at runtime to the assigned user (Inquiry assigned sales rep, Quotation/Sales Order assigned owner, or Meeting internal attendees).'
                  : 'Resolves dynamically at runtime to the user who created or organized the record.'}
              </div>
            )}

            <div className="pt-0.5">
              <Checkbox
                id="includeActorCheckbox"
                checked={ruleFormData.includeActor}
                onChange={(e) => setRuleFormData((prev) => ({ ...prev, includeActor: e.target.checked }))}
                label="Include Actor (Notify the user who performed the action as well)"
              />
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Section 2: Delivery Channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              2. Delivery Channels & Work Queue
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-border rounded-lg p-3 hover:border-primary/50 transition-colors bg-surface">
                <Checkbox
                  id="sendInAppCheckbox"
                  checked={ruleFormData.sendInApp}
                  onChange={(e) => {
                    setRuleFormData((prev) => ({ ...prev, sendInApp: e.target.checked }));
                    if (ruleErrors.channels) setRuleErrors((prev) => ({ ...prev, channels: null }));
                  }}
                  label="In-App (Bell Icon)"
                />
                <p className="text-2xs text-text-muted mt-1 ml-6">Real-time notification badge and history</p>
              </div>

              <div className="border border-border rounded-lg p-3 hover:border-primary/50 transition-colors bg-surface">
                <Checkbox
                  id="sendEmailCheckbox"
                  checked={ruleFormData.sendEmail}
                  onChange={(e) => {
                    setRuleFormData((prev) => ({ ...prev, sendEmail: e.target.checked }));
                    if (ruleErrors.channels) setRuleErrors((prev) => ({ ...prev, channels: null }));
                  }}
                  label="Email Notification"
                />
                <p className="text-2xs text-text-muted mt-1 ml-6">Sends to recipient's registered email</p>
              </div>

              <div className="border border-border rounded-lg p-3 hover:border-primary/50 transition-colors bg-surface">
                <Checkbox
                  id="addToWorkQueueCheckbox"
                  checked={ruleFormData.addToWorkQueue}
                  onChange={(e) => {
                    setRuleFormData((prev) => ({ ...prev, addToWorkQueue: e.target.checked }));
                    if (ruleErrors.channels) setRuleErrors((prev) => ({ ...prev, channels: null }));
                  }}
                  label="Add to Work Queue"
                />
                <p className="text-2xs text-text-muted mt-1 ml-6">Creates actionable task in My Queue</p>
              </div>
            </div>

            {ruleErrors.channels && <p className="text-xs text-red-500">{ruleErrors.channels}</p>}

            {/* Work Queue Due Date Rule */}
            {ruleFormData.addToWorkQueue && (
              <div className="bg-surface-ground border border-border rounded-lg p-3 mt-2">
                <label className="block text-xs font-medium text-text mb-1">
                  Work Queue Due Date Rule
                </label>
                <div className="w-64">
                  <SearchableSelect
                    options={[
                      { value: 'Today', label: 'Today (Due immediately)' },
                      { value: 'EventDate', label: 'Event Date (Due on record date)' },
                      { value: 'None', label: 'None (No specific deadline)' },
                    ]}
                    value={ruleFormData.workQueueDueDateRule}
                    onChange={(val) => {
                      const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                      setRuleFormData((prev) => ({ ...prev, workQueueDueDateRule: resolved || 'Today' }));
                    }}
                  />
                </div>
                <p className="text-2xs text-text-muted mt-1">
                  Determines the due date and badge color shown on the user's action task in My Queue.
                </p>
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Section 3: Dynamic Template Placeholders & Formatting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>3. Template Placeholders (Click chip to insert)</span>
              </h4>
              <span className="text-2xs text-text-muted">Targeting: {lastFocusedField === 'titleTemplate' ? 'Title' : 'Message'}</span>
            </div>

            {/* Clickable placeholder chips ribbon */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-surface-ground border border-border rounded-lg">
              {availablePlaceholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-surface hover:bg-primary/10 text-text hover:text-primary border border-border hover:border-primary/30 rounded font-mono font-medium transition-all cursor-pointer"
                  title={`Click to insert {${ph}} into template`}
                >
                  <Tag size={10} className="text-primary" />
                  <span>{`{${ph}}`}</span>
                </button>
              ))}
            </div>

            {/* Title Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-text">
                  Title Template <span className="text-red-500">*</span>
                </label>
                <span className="text-2xs text-text-muted">{ruleFormData.titleTemplate?.length || 0}/150</span>
              </div>
              <Input
                ref={titleInputRef}
                value={ruleFormData.titleTemplate}
                onChange={(e) => {
                  setRuleFormData((prev) => ({ ...prev, titleTemplate: e.target.value }));
                  if (ruleErrors.titleTemplate) setRuleErrors((prev) => ({ ...prev, titleTemplate: null }));
                }}
                onFocus={() => setLastFocusedField('titleTemplate')}
                placeholder="e.g. New inquiry {InquiryNo}"
                maxLength={150}
              />
              {ruleErrors.titleTemplate && <p className="text-xs text-red-500 mt-1">{ruleErrors.titleTemplate}</p>}
            </div>

            {/* Message Template */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-text">
                  Message Template <span className="text-red-500">*</span>
                </label>
                <span className="text-2xs text-text-muted">{ruleFormData.messageTemplate?.length || 0}/500</span>
              </div>
              <Textarea
                ref={messageInputRef}
                rows={3}
                value={ruleFormData.messageTemplate}
                onChange={(e) => {
                  setRuleFormData((prev) => ({ ...prev, messageTemplate: e.target.value }));
                  if (ruleErrors.messageTemplate) setRuleErrors((prev) => ({ ...prev, messageTemplate: null }));
                }}
                onFocus={() => setLastFocusedField('messageTemplate')}
                placeholder="e.g. Inquiry {InquiryNo} from {CompanyName} has been assigned to you by {ActorName}."
                maxLength={500}
              />
              {ruleErrors.messageTemplate && <p className="text-xs text-red-500 mt-1">{ruleErrors.messageTemplate}</p>}
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Section 4: Status */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-medium text-text block">Active Status</span>
              <span className="text-2xs text-text-muted">Disable this rule without deleting its configuration</span>
            </div>
            <StatusSwitch
              checked={ruleFormData.isActive}
              onChange={(checked) => setRuleFormData((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          ADD / EDIT EVENT MODAL
         ═══════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? 'Edit Notification Event' : 'Add Notification Event'}
        subtitle="Define an observable event type within a system module that can trigger notifications."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <CancelButton onClick={() => setIsEventModalOpen(false)} />
            <SaveButton loading={isSubmittingEvent} onClick={handleSaveEvent} />
          </div>
        }
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1">
              Module <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={modulesList.map((m) => ({
                value: String(m.moduleId || m.moduleCode),
                label: `${m.moduleName} (${m.moduleCode})`,
                moduleCode: m.moduleCode,
                moduleName: m.moduleName,
                moduleId: m.moduleId,
              }))}
              value={String(eventFormData.moduleId || eventFormData.moduleCode)}
              onChange={(val) => {
                const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                const found = modulesList.find(
                  (m) => String(m.moduleId) === String(resolved) || m.moduleCode === resolved
                );
                if (found) {
                  setEventFormData((prev) => ({
                    ...prev,
                    moduleId: found.moduleId || 3,
                    moduleCode: found.moduleCode,
                    moduleName: found.moduleName,
                  }));
                }
              }}
              disabled={Boolean(editingEvent)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1">
              Event Type <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={(lookups.eventTypes || ['Create', 'Update', 'StatusChanged', 'Approved', 'MeetingDue', 'POReceived']).map((t) => ({
                value: t,
                label: t,
              }))}
              value={eventFormData.eventType}
              onChange={(val) => {
                const resolved = typeof val === 'object' && val?.target ? val.target.value : val;
                setEventFormData((prev) => ({ ...prev, eventType: resolved }));
              }}
              disabled={Boolean(editingEvent)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1">
              Event Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={eventFormData.eventName}
              onChange={(e) => {
                setEventFormData((prev) => ({ ...prev, eventName: e.target.value }));
                if (eventErrors.eventName) setEventErrors((prev) => ({ ...prev, eventName: null }));
              }}
              placeholder="e.g. Inquiry created"
              maxLength={150}
            />
            {eventErrors.eventName && <p className="text-xs text-red-500 mt-1">{eventErrors.eventName}</p>}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div>
              <span className="text-xs font-medium text-text block">Active Status</span>
              <span className="text-2xs text-text-muted">Deactivating an event suspends all its underlying rules</span>
            </div>
            <StatusSwitch
              checked={eventFormData.isActive}
              onChange={(checked) => setEventFormData((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW RULE DETAILS MODAL
         ═══════════════════════════════════════════════════════════════ */}
      {viewingRule && (
        <Modal
          isOpen={Boolean(viewingRule)}
          onClose={() => setViewingRule(null)}
          title="Notification Rule Details"
          subtitle={`Rule ID #${viewingRule.id} • ${viewingRule.moduleCode}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const r = viewingRule;
                  setViewingRule(null);
                  handleOpenEditRule(r);
                }}
              >
                <IconEdit size={14} className="mr-1" />
                <span>Edit Rule</span>
              </Button>
              <CancelButton onClick={() => setViewingRule(null)} />
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border/60">
              <div>
                <span className="text-text-muted block mb-0.5 font-medium">Event Trigger</span>
                <span className="font-semibold text-text">{viewingRule.eventName}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="subtle" color="primary" size="xs">
                    {viewingRule.moduleCode}
                  </Badge>
                  <span className="text-2xs font-medium text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                    {viewingRule.eventType}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-text-muted block mb-0.5 font-medium">Recipient Target</span>
                <span className="font-semibold text-text">{viewingRule.recipientType}</span>
                <p className="text-text-muted mt-0.5">
                  {viewingRule.roleName || viewingRule.userName || 'Automatic Context Owner'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border/60">
              <div>
                <span className="text-text-muted block mb-1 font-medium">Delivery Channels</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {viewingRule.sendInApp && <Badge variant="subtle" color="primary" size="xs">In-App (Bell)</Badge>}
                  {viewingRule.sendEmail && <Badge variant="subtle" color="success" size="xs">Email</Badge>}
                  {viewingRule.addToWorkQueue && <Badge variant="subtle" color="warning" size="xs">Work Queue</Badge>}
                </div>
              </div>

              <div>
                <span className="text-text-muted block mb-0.5 font-medium">Queue Due Date Rule</span>
                <span className="font-medium text-text">
                  {viewingRule.addToWorkQueue ? viewingRule.workQueueDueDateRule || 'Today' : 'None (No Queue Item)'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pb-3 border-b border-border/60">
              <div>
                <span className="text-text-muted block mb-1 font-medium">Title Template</span>
                <div className="p-2.5 bg-surface-ground border border-border rounded font-mono text-text">
                  {viewingRule.titleTemplate}
                </div>
              </div>

              <div>
                <span className="text-text-muted block mb-1 font-medium">Message Template</span>
                <div className="p-2.5 bg-surface-ground border border-border rounded font-mono text-text whitespace-pre-wrap">
                  {viewingRule.messageTemplate}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-text-muted">
              <span>Status: <StatusBadge status={viewingRule.isActive} size="sm" /></span>
              <span>Created: {viewingRule.createdOn ? formatDate(viewingRule.createdOn) : '—'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Rule Modal ── */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteRule)}
        onCancel={() => setConfirmDeleteRule(null)}
        onConfirm={handleDeleteRule}
        title="Delete Notification Rule"
        message={`Are you sure you want to permanently delete this notification rule for '${confirmDeleteRule?.eventName}'?`}
        confirmText="Delete Rule"
        cancelText="Cancel"
        variant="danger"
      />

      {/* ── Confirm Delete Event Modal ── */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteEvent)}
        onCancel={() => setConfirmDeleteEvent(null)}
        onConfirm={async () => {
          if (!confirmDeleteEvent) return;
          try {
            await deleteEvent(confirmDeleteEvent.id, confirmDeleteEvent.eventName);
            setConfirmDeleteEvent(null);
          } catch {
            // Handled in context toast
          }
        }}
        title="Delete Notification Event"
        message={`Are you sure you want to delete '${confirmDeleteEvent?.eventName}'? Note: Events with existing rules cannot be deleted; deactivate them instead.`}
        confirmText="Delete Event"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
