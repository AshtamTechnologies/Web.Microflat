import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Hash,
  Plus,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  History,
  AlertCircle,
  HelpCircle,
  Edit3,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  Card,
  Input,
  SearchableSelect,
  Button,
  Badge,
  Modal,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import SubSidebar from '../../components/layout/SubSidebar';
import { SERIES_TYPES, getSeriesTypeByKey } from '../../config/seriesTypes';
import { useSeriesContext } from '../../context/SeriesContext';
import {
  formatSeriesNumber,
  formatSeriesPattern,
  normalizeDateString,
  getSeriesStatus,
} from '../../utils/seriesUtils';

const SEPARATOR_OPTIONS = [
  { value: '-', label: 'Hyphen ( - )' },
  { value: '/', label: 'Slash ( / )' },
  { value: 'None', label: 'None (No separator)' },
];

const YEAR_FORMAT_OPTIONS = [
  { value: 'YYYY', label: 'YYYY (e.g. 2026)' },
  { value: 'YY', label: 'YY (e.g. 26)' },
  { value: 'None', label: 'None (No Year)' },
];

const RESET_COUNTER_OPTIONS = [
  { value: 'Yearly', label: 'Yearly (Resets on Jan 1st)' },
  { value: 'Never', label: 'Never (Continuous Sequential)' },
];

export default function SeriesSetupPage() {
  const { docType: rawDocType } = useParams();
  const navigate = useNavigate();

  const currentType = useMemo(() => {
    return getSeriesTypeByKey(rawDocType || 'po');
  }, [rawDocType]);

  const docType = currentType.key;

  // Context
  const {
    getVersionsFor,
    getActiveVersion,
    addVersion,
    updateVersion,
  } = useSeriesContext();

  const versions = useMemo(() => getVersionsFor(docType), [getVersionsFor, docType]);
  const activeVersion = useMemo(() => getActiveVersion(docType), [getActiveVersion, docType]);

  // Form State (New Version)
  const [form, setForm] = useState({
    prefix: '',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: normalizeDateString(new Date()),
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingVersion, setEditingVersion] = useState(null);
  const [editForm, setEditForm] = useState({
    prefix: '',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync form values whenever docType or activeVersion changes
  useEffect(() => {
    const todayStr = normalizeDateString(new Date());
    setForm({
      prefix: activeVersion?.prefix || currentType.defaultPrefix || 'DOC',
      separator:
        activeVersion?.separator !== undefined
          ? activeVersion.separator === ''
            ? 'None'
            : activeVersion.separator
          : '-',
      yearFormat: activeVersion?.yearFormat || 'YYYY',
      numberLength: activeVersion?.numberLength || 6,
      startingNumber: activeVersion?.startingNumber || 1,
      resetCounter: activeVersion?.resetCounter || 'Yearly',
      effectiveDate: todayStr,
    });
    setErrors({});
  }, [docType, activeVersion, currentType.defaultPrefix]);

  // Reset form handler
  const handleReset = () => {
    const todayStr = normalizeDateString(new Date());
    setForm({
      prefix: activeVersion?.prefix || currentType.defaultPrefix || 'DOC',
      separator:
        activeVersion?.separator !== undefined
          ? activeVersion.separator === ''
            ? 'None'
            : activeVersion.separator
          : '-',
      yearFormat: activeVersion?.yearFormat || 'YYYY',
      numberLength: activeVersion?.numberLength || 6,
      startingNumber: activeVersion?.startingNumber || 1,
      resetCounter: activeVersion?.resetCounter || 'Yearly',
      effectiveDate: todayStr,
    });
    setErrors({});
  };

  // Live sample preview number for New Version Form
  const previewSampleNumber = useMemo(() => {
    return formatSeriesNumber(
      {
        prefix: form.prefix || currentType.defaultPrefix || 'DOC',
        separator: form.separator,
        yearFormat: form.yearFormat,
        numberLength: form.numberLength,
        startingNumber: form.startingNumber,
      },
      form.startingNumber,
      form.effectiveDate ? new Date(form.effectiveDate) : new Date()
    );
  }, [form, currentType.defaultPrefix]);

  // Clean schema format pattern for New Version Form
  const previewFormatPattern = useMemo(() => {
    return formatSeriesPattern({
      prefix: form.prefix || currentType.defaultPrefix || 'DOC',
      separator: form.separator,
      yearFormat: form.yearFormat,
      numberLength: form.numberLength,
      startingNumber: form.startingNumber,
    });
  }, [form, currentType.defaultPrefix]);

  // Live sample preview number for Edit Form
  const editPreviewSampleNumber = useMemo(() => {
    return formatSeriesNumber(
      {
        prefix: editForm.prefix || 'DOC',
        separator: editForm.separator,
        yearFormat: editForm.yearFormat,
        numberLength: editForm.numberLength,
        startingNumber: editForm.startingNumber,
      },
      editForm.startingNumber,
      editForm.effectiveDate ? new Date(editForm.effectiveDate) : new Date()
    );
  }, [editForm]);

  // Clean schema format pattern for Edit Form
  const editPreviewFormatPattern = useMemo(() => {
    return formatSeriesPattern({
      prefix: editForm.prefix || 'DOC',
      separator: editForm.separator,
      yearFormat: editForm.yearFormat,
      numberLength: editForm.numberLength,
      startingNumber: editForm.startingNumber,
    });
  }, [editForm]);

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};
    const todayStr = normalizeDateString(new Date());

    // Prefix validation: 2-6 chars, letters only
    const cleanPrefix = (form.prefix || '').trim();
    if (!cleanPrefix) {
      newErrors.prefix = 'Prefix is required.';
    } else if (!/^[A-Za-z]{2,6}$/.test(cleanPrefix)) {
      newErrors.prefix = 'Prefix must be 2 to 6 alphabetic letters (A-Z).';
    }

    // Number length validation: 3 to 10
    const numLen = Number(form.numberLength);
    if (isNaN(numLen) || numLen < 3 || numLen > 10) {
      newErrors.numberLength = 'Number length must be between 3 and 10 digits.';
    }

    // Starting number validation: >= 1
    const startNum = Number(form.startingNumber);
    if (isNaN(startNum) || startNum < 1) {
      newErrors.startingNumber = 'Starting number must be at least 1.';
    }

    // Effective date validation:
    if (!form.effectiveDate) {
      newErrors.effectiveDate = 'Effective Date is required.';
    } else {
      const selectedDateStr = normalizeDateString(form.effectiveDate);

      // Cannot be earlier than today
      if (selectedDateStr < todayStr) {
        newErrors.effectiveDate = 'Effective Date cannot be earlier than today (no backdating).';
      }

      // Must not duplicate an existing version date for this docType
      const isDuplicate = versions.some(
        (v) => normalizeDateString(v.effectiveDate) === selectedDateStr
      );
      if (isDuplicate) {
        newErrors.effectiveDate = `A version with effective date ${selectedDateStr} already exists for this document type.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler for New Version
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await addVersion(docType, form);
      if (result?.ok) {
        const todayStr = normalizeDateString(new Date());
        setForm((prev) => ({
          ...prev,
          effectiveDate: todayStr,
        }));
        setErrors({});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (version) => {
    setEditingVersion(version);
    setEditForm({
      prefix: version.prefix || '',
      separator:
        version.separator !== undefined
          ? version.separator === ''
            ? 'None'
            : version.separator
          : '-',
      yearFormat: version.yearFormat || 'YYYY',
      numberLength: version.numberLength || 6,
      startingNumber: version.startingNumber || 1,
      resetCounter: version.resetCounter || 'Yearly',
      effectiveDate: version.effectiveDate || '',
    });
    setEditErrors({});
  };

  const handleCloseEditModal = () => {
    setEditingVersion(null);
    setEditErrors({});
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const newErrors = {};

    const cleanPrefix = (editForm.prefix || '').trim();
    if (!cleanPrefix) {
      newErrors.prefix = 'Prefix is required.';
    } else if (!/^[A-Za-z]{2,6}$/.test(cleanPrefix)) {
      newErrors.prefix = 'Prefix must be 2 to 6 alphabetic letters (A-Z).';
    }

    const numLen = Number(editForm.numberLength);
    if (isNaN(numLen) || numLen < 3 || numLen > 10) {
      newErrors.numberLength = 'Number length must be between 3 and 10 digits.';
    }

    const startNum = Number(editForm.startingNumber);
    if (isNaN(startNum) || startNum < 1) {
      newErrors.startingNumber = 'Starting number must be at least 1.';
    }

    if (!editForm.effectiveDate) {
      newErrors.effectiveDate = 'Effective Date is required.';
    } else {
      const selectedDateStr = normalizeDateString(editForm.effectiveDate);
      const isDuplicate = versions.some(
        (v) =>
          v.id !== editingVersion?.id &&
          normalizeDateString(v.effectiveDate) === selectedDateStr
      );
      if (isDuplicate) {
        newErrors.effectiveDate = `A version with effective date ${selectedDateStr} already exists.`;
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save Edit Handler
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateEditForm() || isUpdating || !editingVersion) return;

    setIsUpdating(true);
    try {
      const result = await updateVersion(editingVersion.id, editForm);
      if (result?.ok) {
        handleCloseEditModal();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper for Status Badge & Label
  const getStatusInfo = (ver) => {
    const status = getSeriesStatus(ver, versions);
    if (status === 'current') {
      return {
        variant: 'success',
        label: 'Current',
        isCurrent: true,
      };
    }
    if (status === 'scheduled') {
      return {
        variant: 'role',
        label: 'Scheduled',
        isScheduled: true,
      };
    }
    return {
      variant: 'neutral',
      label: 'Expired',
      isExpired: true,
    };
  };

  const TypeIcon = currentType.icon || Hash;
  const todayMinDate = normalizeDateString(new Date());

  return (
    <div className="space-y-5 sm:space-y-6 pb-20">
      {/* ── Top Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1.5 truncate">
            <span>Configuration</span>
            <span>/</span>
            <span className="text-text">Series Setup</span>
            <span>/</span>
            <span className="text-primary font-semibold truncate">{currentType.shortLabel || currentType.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs shrink-0">
              <TypeIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight leading-tight truncate">
                {currentType.label} Series Setup
              </h1>
              <p className="text-xs text-text-muted mt-0.5 truncate sm:whitespace-normal">
                {currentType.description || 'Configure sequence numbering formats, prefix structure, and revision dates.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Responsive Layout: SubSidebar (Tabs on mobile / Vertical rail on desktop) + Content ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* Secondary Navigation (SubSidebar) */}
        <SubSidebar items={SERIES_TYPES} title="Document Series" className="w-full lg:w-auto" />

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6 w-full">
          {/* ── CARD 1: NEW SERIES VERSION FORM ── */}
          <Card padding="md" className="bg-bg shadow-2xs">
            {/* Header with Title and Active Version Pill */}
            <div className="border-b border-border pb-3.5 mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Plus size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-heading">New Series Version</h2>
                  <p className="text-[11px] text-text-muted">
                    Pre-populated from currently active version. Create a new revision to change numbering rules.
                  </p>
                </div>
              </div>

              {activeVersion && (
                <div className="self-start sm:self-auto flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-text-muted bg-surface/90 px-3 py-1.5 rounded-xl border border-border shadow-2xs">
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <span>Active Prefix:</span>
                    <strong className="font-mono font-bold text-primary">{activeVersion.prefix}</strong>
                  </span>
                  <span className="text-text-muted/60 hidden sm:inline">•</span>
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <span>Effective Since:</span>
                    <strong className="font-mono font-medium text-heading tabular-nums">{activeVersion.effectiveDate}</strong>
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
              {/* Responsive Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {/* 1. Prefix */}
                <div>
                  <Input
                    label="Prefix"
                    id="series-prefix"
                    required
                    value={form.prefix}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
                      setForm((prev) => ({ ...prev, prefix: clean }));
                      if (errors.prefix) setErrors((prev) => ({ ...prev, prefix: null }));
                    }}
                    placeholder="e.g. PO"
                    maxLength={6}
                    error={errors.prefix}
                    hint="2-6 letters (A-Z), automatically uppercased"
                    className="font-mono uppercase font-bold"
                  />
                </div>

                {/* 2. Separator */}
                <div>
                  <SearchableSelect
                    label="Separator"
                    id="series-separator"
                    value={form.separator}
                    onChange={(e) => setForm((prev) => ({ ...prev, separator: e.target.value }))}
                    options={SEPARATOR_OPTIONS}
                    error={errors.separator}
                    hint="Delimiter character between segments"
                    placeholder="Select separator..."
                    searchPlaceholder="Search separators..."
                  />
                </div>

                {/* 3. Year Format */}
                <div>
                  <SearchableSelect
                    label="Year Format"
                    id="series-year-format"
                    value={form.yearFormat}
                    onChange={(e) => setForm((prev) => ({ ...prev, yearFormat: e.target.value }))}
                    options={YEAR_FORMAT_OPTIONS}
                    error={errors.yearFormat}
                    hint="Optional year segment representation"
                    placeholder="Select year format..."
                    searchPlaceholder="Search year formats..."
                  />
                </div>

                {/* 4. Number Length */}
                <div>
                  <Input
                    label="Number Length"
                    id="series-number-length"
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={form.numberLength}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, numberLength: e.target.value }));
                      if (errors.numberLength) setErrors((prev) => ({ ...prev, numberLength: null }));
                    }}
                    error={errors.numberLength}
                    hint="Zero-padded length (1 to 10 digits)"
                    className="font-mono tabular-nums"
                  />
                </div>

                {/* 5. Starting Number */}
                <div>
                  <Input
                    label="Starting Number"
                    id="series-starting-number"
                    type="number"
                    min={1}
                    required
                    value={form.startingNumber}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, startingNumber: e.target.value }));
                      if (errors.startingNumber) setErrors((prev) => ({ ...prev, startingNumber: null }));
                    }}
                    error={errors.startingNumber}
                    hint="First sequence value (minimum 1)"
                    className="font-mono tabular-nums"
                  />
                </div>

                {/* 6. Reset Counter */}
                <div>
                  <SearchableSelect
                    label="Reset Counter"
                    id="series-reset-counter"
                    value={form.resetCounter}
                    onChange={(e) => setForm((prev) => ({ ...prev, resetCounter: e.target.value }))}
                    options={RESET_COUNTER_OPTIONS}
                    error={errors.resetCounter}
                    hint="Reset schedule for sequence counter"
                    placeholder="Select reset schedule..."
                    searchPlaceholder="Search reset options..."
                  />
                </div>

                {/* 7. Effective Date */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="w-full sm:max-w-md">
                    <Input
                      label="Effective Date"
                      id="series-effective-date"
                      type="date"
                      min={todayMinDate}
                      required
                      value={form.effectiveDate}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, effectiveDate: e.target.value }));
                        if (errors.effectiveDate) setErrors((prev) => ({ ...prev, effectiveDate: null }));
                      }}
                      error={errors.effectiveDate}
                      hint="Date when this numbering configuration becomes active (No backdating)"
                      className="font-mono tabular-nums"
                      leftIcon={<Calendar size={15} />}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                      Live Sample Preview
                    </span>
                    <span className="font-mono font-bold text-base sm:text-lg text-primary tabular-nums tracking-wide break-all">
                      {previewSampleNumber}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-text-muted font-mono bg-bg px-3 py-1.5 rounded-lg border border-border/80 self-start sm:self-auto break-all">
                  Format: {previewFormatPattern}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="text-xs justify-center"
                >
                  <RotateCcw size={14} className="mr-1.5" />
                  Reset
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  className="text-xs font-semibold shadow-2xs justify-center"
                >
                  <Plus size={15} className="mr-1.5" />
                  {isSubmitting ? 'Adding Series Version...' : 'Add Series Version'}
                </Button>
              </div>
            </form>
          </Card>

          {/* ── CARD 2: SERIES HISTORY (Cards on Mobile / Table on Desktop) ── */}
          <Card padding="md" className="bg-bg shadow-2xs">
            <div className="border-b border-border pb-3.5 mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface text-text-muted flex items-center justify-center border border-border shrink-0">
                  <History size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-heading">Series Version History</h2>
                  <p className="text-[11px] text-text-muted">
                    Read-only audit history of past, current active, and scheduled series numbering rules.
                  </p>
                </div>
              </div>

              <Badge variant="neutral" className="text-xs font-mono px-2.5 py-0.5 self-start sm:self-auto">
                {versions.length} Version{versions.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Empty State */}
            {versions.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20 space-y-2">
                <Layers size={24} className="mx-auto text-text-muted/60" />
                <p className="font-semibold text-heading text-sm">No series configured yet</p>
                <p>Add the initial series version for {currentType.label} using the form above.</p>
              </div>
            ) : (
              <>
                {/* ── Mobile View: Responsive Cards (< md screens) ── */}
                <div className="max-h-[480px] overflow-y-auto pr-1 space-y-3 block md:hidden">
                  {versions.map((ver) => {
                    const statusInfo = getStatusInfo(ver);
                    const sampleNum = formatSeriesNumber(
                      ver,
                      ver.startingNumber,
                      ver.effectiveDate ? new Date(ver.effectiveDate) : new Date()
                    );

                    return (
                      <div
                        key={ver.id}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                          statusInfo.isCurrent
                            ? 'border-primary/40 bg-primary/5 shadow-2xs'
                            : 'border-border bg-surface/40'
                        }`}
                      >
                        {/* Header: Effective Date & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted block">
                              Effective Date
                            </span>
                            <span className="font-mono font-bold text-sm text-heading tabular-nums">
                              {ver.effectiveDate}
                            </span>
                          </div>

                          <Badge variant={statusInfo.variant} className="text-xs px-2.5 py-0.5 font-medium">
                            {statusInfo.label}
                          </Badge>
                        </div>

                        {/* Example Number Box */}
                        <div className="bg-bg/95 px-3 py-2 rounded-lg border border-border/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-muted font-medium">Example Number:</span>
                          <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 break-all">
                            {sampleNum}
                          </span>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs py-2 px-1 border-t border-b border-border/60 bg-bg/40 rounded-lg">
                          <div>
                            <span className="text-[10px] text-text-muted block">Prefix</span>
                            <span className="font-mono font-bold text-heading">{ver.prefix}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-muted block">Separator</span>
                            <span className="font-mono text-heading">
                              {ver.separator === '' || ver.separator === 'None' ? 'None' : ver.separator}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-muted block">Year Fmt</span>
                            <span className="font-mono text-heading">{ver.yearFormat || 'None'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-muted block">Length</span>
                            <span className="font-mono text-heading tabular-nums">{ver.numberLength} digits</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-muted block">Start No</span>
                            <span className="font-mono text-heading tabular-nums">{ver.startingNumber}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-muted block">Reset</span>
                            <span className="text-heading truncate block">{ver.resetCounter || 'Yearly'}</span>
                          </div>
                        </div>

                        {/* Audit Details & Actions */}
                        <div className="flex items-center justify-between gap-2.5 pt-1">
                          <div className="text-[11px] text-text-muted truncate">
                            By <span className="font-medium text-text">{ver.createdBy || 'Ian Chesnut'}</span> • {ver.createdOn || '—'}
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleOpenEditModal(ver)}
                            className="text-xs px-2.5 py-1 text-text hover:text-primary border border-border shrink-0"
                          >
                            <Edit3 size={12} className="mr-1 text-primary" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Desktop View: Data Table (>= md screens) ── */}
                <div className="hidden md:block w-full max-h-[480px] overflow-y-auto overflow-x-auto border border-border rounded-xl">
                  <TableContainer tableClassName="table-auto w-full min-w-[1020px]">
                    <thead className="sticky top-0 z-10 bg-surface shadow-2xs">
                      <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
                        <Th className="py-3 px-4 whitespace-nowrap">EFFECTIVE DATE</Th>
                        <Th className="py-3 px-3 whitespace-nowrap">PREFIX</Th>
                        <Th className="py-3 px-3 text-center whitespace-nowrap">SEPARATOR</Th>
                        <Th className="py-3 px-3 whitespace-nowrap">YEAR FORMAT</Th>
                        <Th className="py-3 px-3 text-center whitespace-nowrap">LENGTH</Th>
                        <Th className="py-3 px-3 text-center whitespace-nowrap">START NUMBER</Th>
                        <Th className="py-3 px-3 whitespace-nowrap">RESET</Th>
                        <Th className="py-3 px-4 whitespace-nowrap">EXAMPLE</Th>
                        <Th className="py-3 px-4 text-center whitespace-nowrap">STATUS</Th>
                        <Th className="py-3 px-4 whitespace-nowrap">CREATED BY</Th>
                        <Th className="py-3 px-4 whitespace-nowrap">CREATED ON</Th>
                        <Th className="py-3 px-4 text-center whitespace-nowrap">ACTIONS</Th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border bg-bg text-xs">
                      {versions.map((ver) => {
                        const statusInfo = getStatusInfo(ver);
                        const sampleNum = formatSeriesNumber(
                          ver,
                          ver.startingNumber,
                          ver.effectiveDate ? new Date(ver.effectiveDate) : new Date()
                        );

                        return (
                          <tr
                            key={ver.id}
                            className={`transition-colors hover:bg-surface/50 ${
                              statusInfo.isCurrent ? 'bg-primary/5' : ''
                            }`}
                          >
                            {/* Effective Date */}
                            <Td className="py-3.5 px-4 font-mono font-semibold text-heading tabular-nums whitespace-nowrap">
                              {ver.effectiveDate}
                            </Td>

                            {/* Prefix */}
                            <Td className="py-3.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                              {ver.prefix}
                            </Td>

                            {/* Separator */}
                            <Td className="py-3.5 px-3 text-center font-mono text-text-muted whitespace-nowrap">
                              {ver.separator === '' || ver.separator === 'None' ? (
                                <span className="text-text-muted/60 italic text-[11px]">None</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded bg-surface border border-border text-xs font-semibold text-heading">
                                  {ver.separator}
                                </span>
                              )}
                            </Td>

                            {/* Year Format */}
                            <Td className="py-3.5 px-3 font-mono text-text whitespace-nowrap">
                              {ver.yearFormat || 'None'}
                            </Td>

                            {/* Number Length */}
                            <Td className="py-3.5 px-3 text-center font-mono tabular-nums text-text whitespace-nowrap">
                              {ver.numberLength}
                            </Td>

                            {/* Starting Number */}
                            <Td className="py-3.5 px-3 text-center font-mono tabular-nums text-text whitespace-nowrap">
                              {ver.startingNumber}
                            </Td>

                            {/* Reset Counter */}
                            <Td className="py-3.5 px-3 text-text whitespace-nowrap">
                              {ver.resetCounter || 'Yearly'}
                            </Td>

                            {/* Example Generated Number */}
                            <Td className="py-3.5 px-4 font-mono font-bold text-heading tabular-nums whitespace-nowrap">
                              <span className="inline-block bg-surface/90 px-2.5 py-1 rounded-md border border-border text-xs">
                                {sampleNum}
                              </span>
                            </Td>

                            {/* Status Badge */}
                            <Td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <Badge variant={statusInfo.variant} className="text-xs px-2.5 py-0.5">
                                {statusInfo.label}
                              </Badge>
                            </Td>

                            {/* Created By */}
                            <Td className="py-3.5 px-4 text-text font-medium whitespace-nowrap">
                              {ver.createdBy || 'Ian Chesnut'}
                            </Td>

                            {/* Created On */}
                            <Td className="py-3.5 px-4 font-mono text-[11px] text-text-muted tabular-nums whitespace-nowrap">
                              {ver.createdOn || '—'}
                            </Td>

                            {/* Actions Column */}
                            <Td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(ver)}
                                title="Edit Version"
                                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-medium"
                              >
                                <Edit3 size={14} />
                              </button>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableContainer>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── EDIT SERIES VERSION MODAL ── */}
      <Modal
        isOpen={Boolean(editingVersion)}
        onClose={handleCloseEditModal}
        title={`Edit ${currentType.label} Series Version`}
        maxWidth="max-w-xl"
      >
        {editingVersion && (
          <form onSubmit={handleSaveEdit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Prefix */}
              <div>
                <Input
                  label="Prefix"
                  id="edit-series-prefix"
                  required
                  value={editForm.prefix}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
                    setEditForm((prev) => ({ ...prev, prefix: clean }));
                    if (editErrors.prefix) setEditErrors((prev) => ({ ...prev, prefix: null }));
                  }}
                  maxLength={6}
                  error={editErrors.prefix}
                  className="font-mono uppercase font-bold"
                />
              </div>

              {/* Separator */}
              <div>
                <SearchableSelect
                  label="Separator"
                  id="edit-series-separator"
                  value={editForm.separator}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, separator: e.target.value }))}
                  options={SEPARATOR_OPTIONS}
                  placeholder="Select separator..."
                  searchPlaceholder="Search separators..."
                />
              </div>

              {/* Year Format */}
              <div>
                <SearchableSelect
                  label="Year Format"
                  id="edit-series-year-format"
                  value={editForm.yearFormat}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, yearFormat: e.target.value }))}
                  options={YEAR_FORMAT_OPTIONS}
                  placeholder="Select year format..."
                  searchPlaceholder="Search year formats..."
                />
              </div>

              {/* Number Length */}
              <div>
                <Input
                  label="Number Length"
                  id="edit-series-number-length"
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={editForm.numberLength}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, numberLength: e.target.value }));
                    if (editErrors.numberLength) setEditErrors((prev) => ({ ...prev, numberLength: null }));
                  }}
                  error={editErrors.numberLength}
                  className="font-mono tabular-nums"
                />
              </div>

              {/* Starting Number */}
              <div>
                <Input
                  label="Starting Number"
                  id="edit-series-starting-number"
                  type="number"
                  min={1}
                  required
                  value={editForm.startingNumber}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, startingNumber: e.target.value }));
                    if (editErrors.startingNumber) setEditErrors((prev) => ({ ...prev, startingNumber: null }));
                  }}
                  error={editErrors.startingNumber}
                  className="font-mono tabular-nums"
                />
              </div>

              {/* Reset Counter */}
              <div>
                <SearchableSelect
                  label="Reset Counter"
                  id="edit-series-reset-counter"
                  value={editForm.resetCounter}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, resetCounter: e.target.value }))}
                  options={RESET_COUNTER_OPTIONS}
                  placeholder="Select reset schedule..."
                  searchPlaceholder="Search reset options..."
                />
              </div>

              {/* Effective Date */}
              <div className="sm:col-span-2">
                <Input
                  label="Effective Date"
                  id="edit-series-effective-date"
                  type="date"
                  required
                  value={editForm.effectiveDate}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, effectiveDate: e.target.value }));
                    if (editErrors.effectiveDate) setEditErrors((prev) => ({ ...prev, effectiveDate: null }));
                  }}
                  error={editErrors.effectiveDate}
                  className="font-mono tabular-nums"
                  leftIcon={<Calendar size={15} />}
                />
              </div>
            </div>

            {/* Live Sample Preview Box inside Modal */}
            <div className="p-3.5 rounded-xl bg-surface/60 border border-border flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
                    Updated Number Preview
                  </span>
                  <span className="font-mono font-bold text-sm text-primary tabular-nums">
                    {editPreviewSampleNumber}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-text-muted font-mono bg-bg px-2.5 py-1 rounded-lg border border-border/80">
                Format: {editPreviewFormatPattern}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleCloseEditModal}
                disabled={isUpdating}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isUpdating}
                className="text-xs font-semibold shadow-2xs"
              >
                <Save size={14} className="mr-1.5" />
                {isUpdating ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
