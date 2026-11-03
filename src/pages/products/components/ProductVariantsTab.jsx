/**
 * ProductVariantsTab.jsx — Tab for displaying, adding, and managing Product Variants and Specs.
 * Aligns with "Product Tables Guide for Frontend" (Nov 2, 2026).
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  SearchableSelect,
  StatusSwitch,
  Modal,
  ConfirmModal,
  Badge,
  TableContainer,
  Th,
} from '../../../components/ui';
import {
  IconAdd,
  IconLayers,
  IconEdit,
  IconDelete,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconStandards,
} from '../../../constants/icons';
import { productService } from '../../../services';

export default function ProductVariantsTab({
  productId,
  grades = [],
  specParameters = [],
  onVariantAdded,
  readOnly = false,
}) {
  const [variantsList, setVariantsList] = useState([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Add / Edit Variant Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantToDelete, setVariantToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantForm, setVariantForm] = useState({
    variantCode: '',
    gradeId: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    diameterMm: '',
    isActive: true,
  });

  // Specs Modal state
  const [selectedVariantForSpecs, setSelectedVariantForSpecs] = useState(null);
  const [variantSpecs, setVariantSpecs] = useState([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specToDelete, setSpecToDelete] = useState(null);

  // Inline Specs Expansion State & Cache
  const [expandedVariantIds, setExpandedVariantIds] = useState(new Set());
  const [specsCache, setSpecsCache] = useState({});
  const [loadingSpecsMap, setLoadingSpecsMap] = useState({});

  // Toggle inline specs expansion
  const toggleExpandVariant = async (variantId) => {
    setExpandedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });

    // Fetch specs if not in cache
    if (!specsCache[variantId]) {
      setLoadingSpecsMap((prev) => ({ ...prev, [variantId]: true }));
      try {
        const data = await productService.getVariantById(variantId);
        setSpecsCache((prev) => ({ ...prev, [variantId]: data?.specs || [] }));
      } catch (err) {
        console.warn('Failed to load specs for variant', variantId, err);
        setSpecsCache((prev) => ({ ...prev, [variantId]: [] }));
      } finally {
        setLoadingSpecsMap((prev) => ({ ...prev, [variantId]: false }));
      }
    }
  };

  // Fetch variants from GET /api/product-variants?productId={productId}
  const loadVariants = useCallback(async () => {
    if (!productId) return;
    setIsLoadingVariants(true);
    try {
      const res = await productService.listProductVariants(productId);
      const items = res.items || [];
      setVariantsList(items);

      // Auto-expand and load specs for the first variant so specs are immediately visible
      if (items.length > 0) {
        const firstId = items[0].id;
        setExpandedVariantIds((prev) => new Set(prev).add(firstId));
        try {
          const data = await productService.getVariantById(firstId);
          setSpecsCache((prev) => ({ ...prev, [firstId]: data?.specs || [] }));
        } catch (e) {
          console.warn('Could not auto-load specs for first variant:', e);
        }
      }
    } catch (err) {
      console.warn('Could not load product variants:', err);
    } finally {
      setIsLoadingVariants(false);
    }
  }, [productId]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const gradeOptions = grades.map((g) => ({
    value: Number(g.id),
    label: g.gradeCode,
  }));

  const handleOpenAddModal = () => {
    setEditingVariant(null);
    setVariantForm({
      variantCode: '',
      gradeId: '',
      lengthMm: '',
      widthMm: '',
      heightMm: '',
      diameterMm: '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (variant) => {
    setEditingVariant(variant);
    setVariantForm({
      variantCode: variant.variantCode || '',
      gradeId: variant.gradeId ? Number(variant.gradeId) : '',
      lengthMm: variant.lengthMm ?? '',
      widthMm: variant.widthMm ?? '',
      heightMm: variant.heightMm ?? '',
      diameterMm: variant.diameterMm ?? '',
      isActive: variant.isActive !== false,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveVariant = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!variantForm.variantCode.trim()) {
      toast.error('Variant code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        variantCode: variantForm.variantCode.trim(),
        gradeId: variantForm.gradeId ? Number(variantForm.gradeId) : null,
        lengthMm: variantForm.lengthMm || null,
        widthMm: variantForm.widthMm || null,
        heightMm: variantForm.heightMm || null,
        diameterMm: variantForm.diameterMm || null,
        isActive: variantForm.isActive,
      };

      if (editingVariant) {
        // 1. Update variant basic details & dimensions
        await productService.updateVariant(editingVariant.id, payload);

        // 2. Only call the status PATCH API if the status was changed in the modal
        if (editingVariant.isActive !== variantForm.isActive) {
          await productService.updateVariantStatus(editingVariant.id, variantForm.isActive);
        }

        toast.success('Variant updated successfully');
      } else {
        await productService.addVariant(productId, payload);
        toast.success('Variant added successfully');
      }
      setIsAddModalOpen(false);
      setEditingVariant(null);
      loadVariants();
      onVariantAdded?.();
    } catch (err) {
      toast.error(err?.message || (editingVariant ? 'Failed to update variant' : 'Failed to add variant'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteVariant = async () => {
    if (!variantToDelete) return;
    try {
      await productService.deleteVariant(variantToDelete.id);
      toast.success(`Variant "${variantToDelete.variantCode}" removed`);
      loadVariants();
      onVariantAdded?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to remove variant');
    } finally {
      setVariantToDelete(null);
    }
  };

  // Open Specs Modal for a specific variant
  const handleOpenSpecsModal = async (variant) => {
    setSelectedVariantForSpecs(variant);
    setIsLoadingSpecs(true);
    try {
      const data = await productService.getVariantById(variant.id);
      setVariantSpecs(data?.specs || []);
    } catch (err) {
      toast.error(err?.message || 'Failed to load variant specifications');
      setVariantSpecs([]);
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  // Add a spec row in Specs Modal
  const handleAddSpecRow = () => {
    setVariantSpecs((prev) => [
      ...prev,
      {
        specParameterId: '',
        parameterName: '',
        unitSymbol: '',
        valueDecimal: '',
        valueText: '',
        tolerancePlus: '',
        toleranceMinus: '',
      },
    ]);
  };

  // Confirm delete spec row
  const handleConfirmDeleteSpec = () => {
    if (!specToDelete) return;
    setVariantSpecs((prev) => prev.filter((_, i) => i !== specToDelete.index));
    toast.success(`Removed parameter "${specToDelete.name}"`);
    setSpecToDelete(null);
  };

  // Change parameter in spec row
  const handleChangeSpecParam = (index, paramId) => {
    const param = specParameters.find((p) => p.id === Number(paramId));
    setVariantSpecs((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        specParameterId: Number(paramId),
        parameterName: param?.parameterName || '',
        unitSymbol: param?.unitSymbol || '',
      };
      return next;
    });
  };

  // Save all specs for variant
  const handleSaveSpecs = async (e) => {
    e?.preventDefault();
    if (!selectedVariantForSpecs) return;

    // Validate that either decimal or text is filled
    for (const spec of variantSpecs) {
      const hasDecimal = spec.valueDecimal !== '' && spec.valueDecimal !== null && spec.valueDecimal !== undefined;
      const hasText = Boolean(spec.valueText && String(spec.valueText).trim());
      if (!hasDecimal && !hasText) {
        toast.error(`Please provide a value for parameter "${spec.parameterName || 'Spec'}"`);
        return;
      }
      if (hasDecimal && hasText) {
        toast.error(`Parameter "${spec.parameterName}" can have decimal OR text value, not both.`);
        return;
      }
    }

    setIsSavingSpecs(true);
    try {
      await productService.setVariantSpecs(selectedVariantForSpecs.id, variantSpecs);
      toast.success('Accuracy specifications saved');
      setSpecsCache((prev) => ({ ...prev, [selectedVariantForSpecs.id]: variantSpecs }));
      setExpandedVariantIds((prev) => new Set(prev).add(selectedVariantForSpecs.id));
      setSelectedVariantForSpecs(null);
      loadVariants();
    } catch (err) {
      toast.error(err?.message || 'Failed to save accuracy specifications');
    } finally {
      setIsSavingSpecs(false);
    }
  };

  const specParamOptions = specParameters.map((p) => ({
    value: Number(p.id),
    label: `${p.parameterName}${p.unitSymbol ? ` (${p.unitSymbol})` : ''}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Product Variants & Sizes</h3>
          <p className="text-xs text-muted-foreground">
            Manage sizes, grades, and dimensional figures. Click any variant to manage accuracy specs.
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5"
          >
            <IconAdd size={14} />
            <span>Add Variant</span>
          </Button>
        )}
      </div>

      {isLoadingVariants ? (
        <div className="h-40 bg-muted/20 animate-pulse rounded-lg border border-border" />
      ) : variantsList.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
          <IconLayers size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No variants registered yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Variants define specific physical dimensions and grade ratings.
          </p>
        </div>
      ) : (
        <TableContainer
          className="border border-border rounded-lg max-h-80 overflow-y-auto bg-card"
          tableClassName="w-full text-xs table-auto"
        >
          <thead className="sticky top-0 bg-surface z-10">
            <tr className="bg-surface border-b border-border">
              <Th className="w-8"></Th>
              <Th>Variant Code</Th>
              <Th>Grade</Th>
              <Th className="text-right">Length (mm)</Th>
              <Th className="text-right">Width (mm)</Th>
              <Th className="text-right">Height (mm)</Th>
              <Th className="text-right">Diameter (mm)</Th>
              <Th className="text-center">Accuracy Specs</Th>
              <Th className="w-24 text-center">Status</Th>
              <Th className="w-36 text-center">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {variantsList.map((v) => {
              const isExpanded = expandedVariantIds.has(v.id);
              const specs = specsCache[v.id] || [];
              const isLoadingThisSpecs = Boolean(loadingSpecsMap[v.id]);

              return (
                <React.Fragment key={v.id}>
                  <tr className={`hover:bg-muted/20 transition-colors ${isExpanded ? 'bg-surface/50' : ''}`}>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpandVariant(v.id)}
                        className="p-1 rounded text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse Accuracy Specifications' : 'Expand Accuracy Specifications'}
                      >
                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="p-2.5 font-medium text-foreground font-mono">
                      <button
                        type="button"
                        onClick={() => toggleExpandVariant(v.id)}
                        className="text-left font-mono font-semibold text-primary hover:underline cursor-pointer"
                        title="Click to view/hide specifications"
                      >
                        {v.variantCode}
                      </button>
                    </td>
                    <td className="p-2.5">
                      <Badge variant="neutral">{v.gradeCode || grades.find((g) => g.id === v.gradeId)?.gradeCode || '-'}</Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono">{v.lengthMm ?? '—'}</td>
                    <td className="p-2.5 text-right font-mono">{v.widthMm ?? '—'}</td>
                    <td className="p-2.5 text-right font-mono">{v.heightMm ?? '—'}</td>
                    <td className="p-2.5 text-right font-mono">{v.diameterMm ?? '—'}</td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleExpandVariant(v.id)}
                        className="inline-flex items-center gap-1 cursor-pointer"
                        title="Click to toggle accuracy specifications"
                      >
                        <Badge variant={v.specCount > 0 ? 'accent' : 'neutral'} size="sm">
                          {v.specCount ?? 0} {v.specCount === 1 ? 'spec' : 'specs'}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge variant={v.isActive !== false ? 'active' : 'inactive'} size="xs">
                        {v.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-center">
                      {!readOnly ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenSpecsModal(v)}
                            className="text-xs flex items-center gap-1"
                            title="Configure Accuracy Specifications"
                          >
                            <IconStandards size={12} />
                            <span>Specs</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleOpenEditModal(v)}
                            className="text-xs flex items-center gap-1 hover:text-primary"
                            title="Edit Variant"
                          >
                            <IconEdit size={12} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => setVariantToDelete(v)}
                            className="text-danger hover:bg-danger/10"
                            title="Remove Variant"
                          >
                            <IconDelete size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => toggleExpandVariant(v.id)}
                          className="text-xs text-primary"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </Button>
                      )}
                    </td>
                  </tr>

                  {/* ── Inline Expanded Accuracy Specifications ── */}
                  {isExpanded && (
                    <tr className="bg-surface/30 border-b border-border/70">
                      <td colSpan={10} className="p-3 sm:p-4 pl-6 sm:pl-10">
                        <div className="rounded-lg border border-border/80 bg-card p-3.5 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <IconStandards size={16} className="text-primary" />
                              <h4 className="text-xs font-bold text-heading">
                                Accuracy Specifications: <span className="font-mono text-primary">{v.variantCode}</span>
                              </h4>
                              {v.gradeCode && (
                                <Badge variant="neutral" size="xs">
                                  Grade: {v.gradeCode}
                                </Badge>
                              )}
                            </div>
                            {!readOnly && (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => handleOpenSpecsModal(v)}
                                className="flex items-center gap-1 text-xs"
                              >
                                <IconEdit size={12} />
                                <span>Edit Accuracy Specs</span>
                              </Button>
                            )}
                          </div>

                          {isLoadingThisSpecs ? (
                            <div className="h-16 bg-muted/20 animate-pulse rounded" />
                          ) : specs.length === 0 ? (
                            <div className="p-4 text-center rounded border border-dashed border-border bg-surface/30 text-text-muted text-xs">
                              No accuracy specifications recorded for this size yet.
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSpecsModal(v)}
                                  className="ml-2 text-primary underline font-medium cursor-pointer"
                                >
                                  Click here to add accuracy figures.
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded border border-border/70 bg-bg">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-surface/80 border-b border-border text-text-muted">
                                    <th className="py-2 px-3 text-left font-medium">Measured Parameter</th>
                                    <th className="py-2 px-3 text-right font-medium">Measured Figure</th>
                                    <th className="py-2 px-3 text-center font-medium">Tolerance (±)</th>
                                    <th className="py-2 px-3 text-left font-medium">Total Tolerance Display</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {specs.map((spec, sIdx) => {
                                    const hasTol = spec.tolerancePlus !== null || spec.toleranceMinus !== null;
                                    const hasDecimal = spec.valueDecimal !== null && spec.valueDecimal !== undefined;
                                    return (
                                      <tr key={spec.id || sIdx} className="hover:bg-surface/30">
                                        <td className="py-2 px-3 font-semibold text-heading">
                                          {spec.parameterName} {spec.unitSymbol ? `(${spec.unitSymbol})` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-medium text-heading">
                                          {hasDecimal
                                            ? `${spec.valueDecimal} ${spec.unitSymbol || ''}`
                                            : spec.valueText || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono text-xs">
                                          {hasTol ? (
                                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                              +{spec.tolerancePlus ?? 0} / -{spec.toleranceMinus ?? 0}
                                            </span>
                                          ) : (
                                            <span className="text-text-muted">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-xs text-text-muted">
                                          {spec.valueText ? (
                                            <span className="font-medium text-heading">{spec.valueText}</span>
                                          ) : hasDecimal && hasTol ? (
                                            <span className="font-medium text-heading">
                                              {spec.valueDecimal} ± {spec.tolerancePlus || spec.toleranceMinus} {spec.unitSymbol || ''}
                                            </span>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </TableContainer>
      )}

      {/* Add / Edit Variant Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title={editingVariant ? `Edit Variant: ${editingVariant.variantCode}` : 'Add Product Variant'}
        size="md"
      >
        <form onSubmit={handleSaveVariant} className="space-y-4">
          <div className="space-y-3">
            <Input
              id="variantCode"
              label="Variant Code"
              required
              value={variantForm.variantCode}
              onChange={(e) => setVariantForm({ ...variantForm, variantCode: e.target.value })}
              placeholder="e.g. SP-GR-250x250-GR0"
              hint="Unique identifier, e.g. ProductCode + size + grade"
              autoFocus
            />

            <SearchableSelect
              id="gradeId"
              name="gradeId"
              label="Accuracy Grade"
              value={variantForm.gradeId || ''}
              onChange={(e) => {
                const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                setVariantForm({ ...variantForm, gradeId: val ? Number(val) : '' });
              }}
              options={gradeOptions}
              placeholder="Select Grade"
              hint="Accuracy grade rating (optional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="lengthMm"
                label="Length (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.lengthMm}
                onChange={(e) => setVariantForm({ ...variantForm, lengthMm: e.target.value })}
                placeholder="Leave blank if not applicable"
              />
              <Input
                id="widthMm"
                label="Width (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.widthMm}
                onChange={(e) => setVariantForm({ ...variantForm, widthMm: e.target.value })}
                placeholder="Leave blank if not applicable"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="heightMm"
                label="Height (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.heightMm}
                onChange={(e) => setVariantForm({ ...variantForm, heightMm: e.target.value })}
                placeholder="Leave blank if not applicable"
              />
              <Input
                id="diameterMm"
                label="Diameter (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.diameterMm}
                onChange={(e) => setVariantForm({ ...variantForm, diameterMm: e.target.value })}
                placeholder="Leave blank if not applicable"
              />
            </div>

            {editingVariant && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/40">
                <div>
                  <span className="text-xs font-semibold text-heading block">Variant Status</span>
                  <p className="text-2xs text-text-muted">
                    {variantForm.isActive !== false
                      ? 'Variant is active and available for inquiries and quotations.'
                      : 'Variant is inactive and disabled.'}
                  </p>
                </div>
                <StatusSwitch
                  size="sm"
                  checked={variantForm.isActive !== false}
                  onChange={(checked) => setVariantForm({ ...variantForm, isActive: checked })}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            />
            <SaveButton
              size="sm"
              label={editingVariant ? 'Update Variant' : 'Add Variant'}
              loading={isSubmitting}
            />
          </div>
        </form>
      </Modal>

      {/* Specs Grid Modal (Step 3 in Guide: PUT /api/product-variants/{id}/specs) */}
      <Modal
        isOpen={Boolean(selectedVariantForSpecs)}
        onClose={() => !isSavingSpecs && setSelectedVariantForSpecs(null)}
        title={`Accuracy Specifications: ${selectedVariantForSpecs?.variantCode || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Define measured values (Flatness, Squareness, etc.) with ± tolerances. Fill Decimal OR Text.
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAddSpecRow}
                className="flex items-center gap-1"
              >
                <IconAdd size={13} />
                <span>Add Spec</span>
              </Button>
            )}
          </div>

          {isLoadingSpecs ? (
            <div className="h-32 bg-muted/20 animate-pulse rounded-lg" />
          ) : variantSpecs.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-border bg-muted/10 text-muted-foreground text-xs">
              No specifications recorded for this variant yet. Click "Add Spec" to configure.
            </div>
          ) : (
            <TableContainer
              className="border border-border rounded-lg overflow-hidden"
              tableClassName="w-full text-xs table-auto"
            >
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <Th className="w-48">Parameter</Th>
                  <Th className="w-24">Decimal</Th>
                  <Th className="w-20">+ Tol</Th>
                  <Th className="w-20">− Tol</Th>
                  <Th className="w-36">Or Text Value</Th>
                  {!readOnly && <Th className="w-12 text-center">Action</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variantSpecs.map((spec, sIdx) => (
                  <tr key={sIdx}>
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-medium">
                          {spec.parameterName} {spec.unitSymbol ? `(${spec.unitSymbol})` : ''}
                        </span>
                      ) : (
                        <SearchableSelect
                          value={spec.specParameterId ? Number(spec.specParameterId) : ''}
                          onChange={(val) => {
                            const rawId = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                            handleChangeSpecParam(sIdx, rawId);
                          }}
                          options={specParamOptions}
                          placeholder="Select Parameter"
                          size="sm"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-mono">{spec.valueDecimal ?? '—'}</span>
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          size="sm"
                          value={spec.valueDecimal ?? ''}
                          onChange={(e) => {
                            const next = [...variantSpecs];
                            next[sIdx].valueDecimal = e.target.value;
                            setVariantSpecs(next);
                          }}
                          placeholder="e.g. 3"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-mono text-muted-foreground">{spec.tolerancePlus ?? '—'}</span>
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          size="sm"
                          value={spec.tolerancePlus ?? ''}
                          onChange={(e) => {
                            const next = [...variantSpecs];
                            next[sIdx].tolerancePlus = e.target.value;
                            setVariantSpecs(next);
                          }}
                          placeholder="+0.5"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <span className="font-mono text-muted-foreground">{spec.toleranceMinus ?? '—'}</span>
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          size="sm"
                          value={spec.toleranceMinus ?? ''}
                          onChange={(e) => {
                            const next = [...variantSpecs];
                            next[sIdx].toleranceMinus = e.target.value;
                            setVariantSpecs(next);
                          }}
                          placeholder="0.5"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {readOnly ? (
                        <span>{spec.valueText ?? '—'}</span>
                      ) : (
                        <Input
                          size="sm"
                          value={spec.valueText ?? ''}
                          onChange={(e) => {
                            const next = [...variantSpecs];
                            next[sIdx].valueText = e.target.value;
                            setVariantSpecs(next);
                          }}
                          placeholder="e.g. 3 – 25"
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            const pName =
                              spec.parameterName ||
                              specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))?.parameterName ||
                              `Parameter #${sIdx + 1}`;
                            setSpecToDelete({
                              index: sIdx,
                              name: pName,
                            });
                          }}
                          className="text-danger hover:bg-danger/10"
                          title="Remove parameter"
                        >
                          <IconDelete size={14} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton
              size="sm"
              label="Close"
              onClick={() => setSelectedVariantForSpecs(null)}
              disabled={isSavingSpecs}
            />
            {!readOnly && (
              <SaveButton
                type="button"
                size="sm"
                label="Save Specifications"
                onClick={handleSaveSpecs}
                loading={isSavingSpecs}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Variant Deletion */}
      <ConfirmModal
        isOpen={Boolean(variantToDelete)}
        onClose={() => setVariantToDelete(null)}
        onConfirm={handleConfirmDeleteVariant}
        title="Remove Variant"
        message={`Are you sure you want to remove variant "${variantToDelete?.variantCode}"?`}
        confirmText="Remove"
        variant="danger"
      />

      {/* Confirmation Modal for Spec Deletion */}
      <ConfirmModal
        isOpen={Boolean(specToDelete)}
        onClose={() => setSpecToDelete(null)}
        onConfirm={handleConfirmDeleteSpec}
        title="Remove Specification Parameter"
        message={`Are you sure you want to remove "${specToDelete?.name}"?`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
