/**
 * HandoverScopeSelector.jsx — Generic module and single-record scope selector for delegation.
 *
 * Props:
 *   modules: DelegationModuleConfig[]
 *   value: { modules: string[], records: Array<{ moduleKey: string, recordId: string|number, label: string }> }
 *   onChange: (nextValue: { modules: string[], records: Array<...> }) => void
 *   loadRecords: (moduleKey: string, params: { delegatorId?: string|number, search?: string }) => Promise<Array<{ id, label }>>
 *   delegatorId: string|number
 *   error?: string
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Checkbox,
  Select,
  SearchableSelect,
  Button,
  IconButton,
  Badge,
  FormGrid,
} from '../../../components/ui';
import { IconAdd, IconClose } from '../../../constants/icons';

export default function HandoverScopeSelector({
  modules = [],
  value = { modules: [], records: [] },
  onChange,
  loadRecords,
  delegatorId,
  error,
}) {
  const selectedModules = value.modules || [];
  const selectedRecords = value.records || [];

  const [recordModuleKey, setRecordModuleKey] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [recordOptions, setRecordOptions] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  const previousDelegatorRef = useRef(delegatorId);

  // Available modules for single record selection (not ticked as whole module, and supports records)
  const availableRecordModules = useMemo(() => {
    return modules.filter((m) => m.supportsRecords && !selectedModules.includes(m.key));
  }, [modules, selectedModules]);

  // Synchronize recordModuleKey when available modules change
  useEffect(() => {
    if (availableRecordModules.length > 0) {
      if (!recordModuleKey || !availableRecordModules.some((m) => m.key === recordModuleKey)) {
        setRecordModuleKey(availableRecordModules[0].key);
        setSelectedRecordId('');
      }
    } else {
      setRecordModuleKey('');
      setSelectedRecordId('');
    }
  }, [availableRecordModules, recordModuleKey]);

  // When delegatorId changes, clear single records as specified
  useEffect(() => {
    if (previousDelegatorRef.current !== undefined && previousDelegatorRef.current !== delegatorId) {
      if (selectedRecords.length > 0) {
        onChange?.({
          modules: selectedModules,
          records: [],
        });
      }
      setSelectedRecordId('');
    }
    previousDelegatorRef.current = delegatorId;
  }, [delegatorId, selectedModules, selectedRecords.length, onChange]);

  // Active module config for record picker
  const activeRecordModuleConfig = useMemo(() => {
    return modules.find((m) => m.key === recordModuleKey) || null;
  }, [modules, recordModuleKey]);

  // Fetch record options when recordModuleKey or delegatorId changes
  useEffect(() => {
    let isCurrent = true;

    async function fetchModuleRecords() {
      if (!recordModuleKey || !loadRecords) {
        setRecordOptions([]);
        return;
      }

      setRecordsLoading(true);
      try {
        const raw = await loadRecords(recordModuleKey, {
          delegatorId,
          search: '',
        });
        if (isCurrent) {
          // Exclude already added records
          const alreadyAddedIds = new Set(
            selectedRecords
              .filter((r) => r.moduleKey === recordModuleKey)
              .map((r) => String(r.recordId))
          );

          const opts = (raw || [])
            .filter((item) => !alreadyAddedIds.has(String(item.id)))
            .map((item) => ({
              value: String(item.id),
              label: item.label,
            }));
          setRecordOptions(opts);
        }
      } catch {
        if (isCurrent) setRecordOptions([]);
      } finally {
        if (isCurrent) setRecordsLoading(false);
      }
    }

    fetchModuleRecords();

    return () => {
      isCurrent = false;
    };
  }, [recordModuleKey, delegatorId, loadRecords, selectedRecords]);

  // Toggle whole module handler
  const handleToggleModule = useCallback(
    (moduleKey) => {
      const isCurrentlySelected = selectedModules.includes(moduleKey);
      let nextModules;
      let nextRecords = [...selectedRecords];

      if (isCurrentlySelected) {
        nextModules = selectedModules.filter((k) => k !== moduleKey);
        setNoticeMessage('');
      } else {
        nextModules = [...selectedModules, moduleKey];
        // Remove that module's single records and show notice
        const hadSingleRecords = nextRecords.some((r) => r.moduleKey === moduleKey);
        if (hadSingleRecords) {
          nextRecords = nextRecords.filter((r) => r.moduleKey !== moduleKey);
          const modDef = modules.find((m) => m.key === moduleKey);
          const modLabel = modDef?.label || moduleKey;
          setNoticeMessage(`Single ${modLabel} removed because all ${modLabel} are handed over.`);
        }
      }

      onChange?.({
        modules: nextModules,
        records: nextRecords,
      });
    },
    [selectedModules, selectedRecords, modules, onChange]
  );

  // Add individual record handler
  const handleAddRecord = useCallback(() => {
    if (!recordModuleKey || !selectedRecordId) return;

    const matchedOption = recordOptions.find((opt) => String(opt.value) === String(selectedRecordId));
    if (!matchedOption) return;

    const newRecord = {
      moduleKey: recordModuleKey,
      recordId: selectedRecordId,
      label: matchedOption.label,
    };

    onChange?.({
      modules: selectedModules,
      records: [...selectedRecords, newRecord],
    });

    setSelectedRecordId('');
    setNoticeMessage('');
  }, [recordModuleKey, selectedRecordId, recordOptions, selectedModules, selectedRecords, onChange]);

  // Remove individual record handler
  const handleRemoveRecord = useCallback(
    (indexToRemove) => {
      const nextRecords = selectedRecords.filter((_, idx) => idx !== indexToRemove);
      onChange?.({
        modules: selectedModules,
        records: nextRecords,
      });
    },
    [selectedRecords, selectedModules, onChange]
  );

  return (
    <div className="space-y-4">
      {/* ── Section 1: Whole Modules ── */}
      <div className="space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-heading">What is handed over</h4>
          <p className="text-xs text-text-muted mt-0.5">
            Tick a module to hand over all of it, or choose single records below.
          </p>
        </div>

        <FormGrid columns={3}>
          {modules.map((mod) => {
            const isChecked = selectedModules.includes(mod.key);
            return (
              <div
                key={mod.key}
                onClick={() => handleToggleModule(mod.key)}
                className={`p-3 rounded-control border transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'border-primary bg-primary/5 shadow-2xs'
                    : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      id={`delegation-mod-${mod.key}`}
                      checked={isChecked}
                      onChange={() => handleToggleModule(mod.key)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`delegation-mod-${mod.key}`}
                      className="text-xs font-semibold text-heading block cursor-pointer"
                    >
                      {mod.label}
                    </label>
                    <p className="text-2xs text-text-muted mt-0.5 leading-snug line-clamp-2">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </FormGrid>
      </div>

      {/* Info notice when single records were cleared due to whole module toggle */}
      {noticeMessage && (
        <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-control px-3 py-2 flex items-center justify-between">
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setNoticeMessage('')}
            className="text-text-muted hover:text-heading cursor-pointer ml-2"
          >
            <IconClose size={13} />
          </button>
        </div>
      )}

      {/* ── Section 2: Single Records ── */}
      <div className="space-y-3 pt-2 border-t border-border/70">
        <div>
          <h4 className="text-sm font-semibold text-heading">Only these records</h4>
          <p className="text-xs text-text-muted mt-0.5">
            For a module that is not ticked above, you can hand over single records instead.
          </p>
        </div>

        {availableRecordModules.length > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            {/* Module Picker */}
            <div className="w-full sm:w-48 shrink-0">
              <Select
                id="delegation-single-module"
                label="Module"
                size="sm"
                value={recordModuleKey}
                onChange={(e) => {
                  setRecordModuleKey(e.target.value);
                  setSelectedRecordId('');
                }}
                options={availableRecordModules.map((m) => ({
                  value: m.key,
                  label: m.label,
                }))}
              />
            </div>

            {/* Record SearchableSelect */}
            <div className="flex-1 min-w-0">
              <SearchableSelect
                id="delegation-single-record"
                label={`Select ${activeRecordModuleConfig?.recordLabel || 'Record'}`}
                size="sm"
                value={selectedRecordId}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                options={recordOptions}
                placeholder={
                  recordsLoading
                    ? 'Loading records…'
                    : `Search ${activeRecordModuleConfig?.label?.toLowerCase() || 'records'}…`
                }
                emptyText={
                  recordsLoading
                    ? 'Loading…'
                    : activeRecordModuleConfig?.emptyText || 'No records found'
                }
                disabled={recordsLoading || recordOptions.length === 0}
              />
            </div>

            {/* Add Button */}
            <div className="shrink-0 self-end sm:self-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={IconAdd}
                onClick={handleAddRecord}
                disabled={!selectedRecordId}
                className="h-9 px-3.5"
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-2xs text-text-muted italic bg-surface/50 p-2.5 rounded-control border border-border">
            All modules supporting individual records have been selected above.
          </p>
        )}

        {/* Added Single Records List */}
        {selectedRecords.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
              Handed over records ({selectedRecords.length})
            </span>
            <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-control bg-surface/30 overscroll-contain">
              {selectedRecords.map((rec, idx) => {
                const modConfig = modules.find((m) => m.key === rec.moduleKey);
                return (
                  <div
                    key={`${rec.moduleKey}-${rec.recordId}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-surface/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="role" size="sm" className="shrink-0">
                        {modConfig?.recordLabel || rec.moduleKey}
                      </Badge>
                      <span className="truncate text-heading font-medium" title={rec.label}>
                        {rec.label}
                      </span>
                    </div>
                    <IconButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={IconClose}
                      title="Remove this record"
                      aria-label={`Remove ${rec.label}`}
                      onClick={() => handleRemoveRecord(idx)}
                      className="h-7 w-7 text-text-muted hover:text-danger hover:bg-danger/10 shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scope validation error */}
      {error && (
        <p className="text-xs text-danger font-medium mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

