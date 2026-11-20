/**
 * ProductVariantsTab.jsx — Tab for displaying, adding, and managing Product Variants and Specs.
 * Aligns with "Product Tables Guide for Frontend" (Nov 2, 2026).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconRefresh,
  IconLock,
} from '../../../constants/icons';
import { productService } from '../../../services';
import { useStandardsContext } from '../../../context/StandardsContext';
import { useAuthContext } from '../../../context/AuthContext';
import { calculateFlatnessTolerance } from '../../../utils/flatnessFormula';

/**
 * Matches strictly the primary working surface Flatness (e.g. "Flatness (µm)" or "Flatness").
 * Excludes secondary surfaces like "Flatness of End Faces".
 */
const isExactFlatnessParameter = (paramName) => {
  const p = (paramName || '').toLowerCase().trim();
  return (
    p === 'flatness' ||
    p.startsWith('flatness (µm)') ||
    p.startsWith('flatness (um)') ||
    p === 'working surface flatness'
  );
};

export default function ProductVariantsTab({
  productId,
  product = null,
  standards = [],
  grades = [],
  specParameters = [],
  onVariantAdded,
  readOnly = false,
}) {
  const { gradeMapping = [], fetchGradeMapping } = useStandardsContext();
  const { user } = useAuthContext();

  const isAdmin = useMemo(() => {
    if (!user) return true;
    const roleString = `${user.primaryRole || ''} ${(user.roles || []).join(' ')}`.toLowerCase();
    return roleString.includes('admin') || roleString.includes('super');
  }, [user]);

  // Approved product RBAC check: Only Admins can modify specs on approved products
  const isProductApproved = Boolean(product?.approvalStatus === 3 || product?.isApproved);
  const isSpecsReadOnly = readOnly || (isProductApproved && !isAdmin);

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

  // Specs Modal state (Task 53)
  const [selectedVariantForSpecs, setSelectedVariantForSpecs] = useState(null);
  const [variantDetailData, setVariantDetailData] = useState(null);
  const [variantSpecs, setVariantSpecs] = useState([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specToDelete, setSpecToDelete] = useState(null);

  // Standard + Grade Scope State
  const [specsScope, setSpecsScope] = useState('STANDARD_GRADE'); // 'STANDARD_GRADE' | 'COMMON'
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [flatnessNotice, setFlatnessNotice] = useState(null);

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

  // Available standards combining product standards and grade mapping
  const availableStandards = useMemo(() => {
    const list = [];
    const seen = new Set();
    (standards || []).forEach((s) => {
      const sid = Number(s.standardId || s.id);
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        list.push({ value: sid, label: s.standardCode || `Standard #${sid}` });
      }
    });
    (gradeMapping || []).forEach((m) => {
      const sid = Number(m.standardId);
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        list.push({ value: sid, label: m.standardCode || `Standard #${sid}` });
      }
    });
    return list;
  }, [standards, gradeMapping]);

  // Dynamically filtered grades for the selected standard (strictly adhering to backend rule)
  const availableGradesForStandard = useMemo(() => {
    if (!selectedStandardId) return [];
    const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(selectedStandardId));
    if (mapping && Array.isArray(mapping.grades) && mapping.grades.length > 0) {
      return mapping.grades
        .filter((g) => g.isGradeActive !== false)
        .map((g) => ({
          value: Number(g.gradeId),
          label: g.gradeCode || `Grade #${g.gradeId}`,
        }));
    }
    // Fallback if mapping not loaded
    return (grades || []).map((g) => ({ value: Number(g.id), label: g.gradeCode }));
  }, [selectedStandardId, gradeMapping, grades]);

  // Helper to extract spec figures for the active scope from loaded variant specs
  const syncSpecsForScope = useCallback((allSpecs, scope, stdId, grdId) => {
    if (!allSpecs || !Array.isArray(allSpecs)) return [];
    return allSpecs.map((spec) => {
      const vals = Array.isArray(spec.values) ? spec.values : [];
      let matched = null;

      if (scope === 'COMMON') {
        matched = vals.find((v) => v.isCommon || (!v.standardId && !v.gradeId));
        return {
          specParameterId: spec.specParameterId,
          parameterName: spec.parameterName,
          unitSymbol: spec.unitSymbol,
          valueDecimal: matched ? (matched.valueDecimal ?? '') : (spec.valueDecimal ?? ''),
          valueText: matched ? (matched.valueText ?? '') : (spec.valueText ?? ''),
          tolerancePlus: matched ? (matched.tolerancePlus ?? '') : (spec.tolerancePlus ?? ''),
          toleranceMinus: matched ? (matched.toleranceMinus ?? '') : (spec.toleranceMinus ?? ''),
        };
      } else {
        matched = vals.find(
          (v) => Number(v.standardId) === Number(stdId) && Number(v.gradeId) === Number(grdId)
        );
        return {
          specParameterId: spec.specParameterId,
          parameterName: spec.parameterName,
          unitSymbol: spec.unitSymbol,
          valueDecimal: matched ? (matched.valueDecimal ?? '') : '',
          valueText: matched ? (matched.valueText ?? '') : '',
          tolerancePlus: matched ? (matched.tolerancePlus ?? '') : '',
          toleranceMinus: matched ? (matched.toleranceMinus ?? '') : '',
        };
      }
    });
  }, []);

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

  // Helper to compute standard formula flatness tolerance for this variant
  const computeStandardFlatness = useCallback(
    (stdId, grdId) => {
      if (!selectedVariantForSpecs) return null;
      const { lengthMm, widthMm } = selectedVariantForSpecs;
      if (!lengthMm || !widthMm) return null;
      if (!stdId || !grdId) return null;

      const stdItem = availableStandards.find((s) => Number(s.value) === Number(stdId));
      const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(stdId));
      let grdLabel = '';
      if (mapping && Array.isArray(mapping.grades)) {
        const match = mapping.grades.find((g) => Number(g.gradeId) === Number(grdId));
        if (match) grdLabel = match.gradeCode;
      }
      if (!grdLabel) {
        const grdItem = (grades || []).find((g) => Number(g.id) === Number(grdId));
        grdLabel = grdItem?.gradeCode || '';
      }

      return calculateFlatnessTolerance({
        standardCode: stdItem?.label || '',
        gradeCode: grdLabel,
        lengthMm,
        widthMm,
      });
    },
    [selectedVariantForSpecs, availableStandards, gradeMapping, grades]
  );

  // Open Specs Modal for a specific variant
  const handleOpenSpecsModal = async (variant) => {
    setSelectedVariantForSpecs(variant);
    setFlatnessNotice(null);
    setIsLoadingSpecs(true);
    try {
      const data = await productService.getVariantById(variant.id);
      setVariantDetailData(data);

      // Default scope determination
      let initScope = 'STANDARD_GRADE';
      let initStd = availableStandards[0]?.value || '';
      let initGrd = '';

      if (initStd) {
        const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(initStd));
        if (mapping?.grades?.length > 0) {
          initGrd = Number(mapping.grades[0].gradeId);
        }
      }

      // If no valid standard/grade exists, fall back to Common
      if (!initStd || !initGrd) {
        initScope = 'COMMON';
        initStd = '';
        initGrd = '';
      }

      setSpecsScope(initScope);
      setSelectedStandardId(initStd);
      setSelectedGradeId(initGrd);

      const initialSpecs = syncSpecsForScope(data?.specs, initScope, initStd, initGrd);

      // If in STANDARD_GRADE mode, auto-populate flatness from standard formula
      if (initScope === 'STANDARD_GRADE' && initStd && initGrd && variant.lengthMm && variant.widthMm) {
        const stdItem = availableStandards.find((s) => Number(s.value) === Number(initStd));
        const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(initStd));
        let grdLabel = mapping?.grades?.find((g) => Number(g.gradeId) === Number(initGrd))?.gradeCode || '';
        if (!grdLabel) {
          grdLabel = (grades || []).find((g) => Number(g.id) === Number(initGrd))?.gradeCode || '';
        }

        const calc = calculateFlatnessTolerance({
          standardCode: stdItem?.label || '',
          gradeCode: grdLabel,
          lengthMm: variant.lengthMm,
          widthMm: variant.widthMm,
        });

        if (calc.isSupported && calc.valueMicrons !== null) {
          setFlatnessNotice(calc.detailText);
          const withCalc = initialSpecs.map((spec) => {
            const pName =
              spec.parameterName ||
              specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))?.parameterName ||
              '';
            if (isExactFlatnessParameter(pName)) {
              return {
                ...spec,
                valueDecimal: calc.valueMicrons,
                valueText: '',
                tolerancePlus: '',
                toleranceMinus: '',
              };
            }
            return spec;
          });
          setVariantSpecs(withCalc);
          return;
        }
      }

      setVariantSpecs(initialSpecs);
    } catch (err) {
      toast.error(err?.message || 'Failed to load variant specifications');
      setVariantSpecs([]);
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  // Scope Toggle: Standard + Grade vs Common
  const handleScopeChange = (newScope) => {
    setSpecsScope(newScope);
    setFlatnessNotice(null);

    if (newScope === 'COMMON') {
      setSelectedStandardId('');
      setSelectedGradeId('');
      setVariantSpecs(syncSpecsForScope(variantDetailData?.specs, 'COMMON', '', ''));
    } else {
      const firstStd = availableStandards[0]?.value || '';
      setSelectedStandardId(firstStd);
      let firstGrd = '';
      if (firstStd) {
        const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(firstStd));
        firstGrd = mapping?.grades?.[0]?.gradeId ? Number(mapping.grades[0].gradeId) : '';
      }
      setSelectedGradeId(firstGrd);
      const synced = syncSpecsForScope(variantDetailData?.specs, 'STANDARD_GRADE', firstStd, firstGrd);
      const calc = computeStandardFlatness(firstStd, firstGrd);
      if (calc && calc.isSupported && calc.valueMicrons !== null) {
        setFlatnessNotice(calc.detailText);
        setVariantSpecs(
          synced.map((spec) => {
            const pName =
              spec.parameterName ||
              specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))?.parameterName ||
              '';
            if (isExactFlatnessParameter(pName)) {
              return {
                ...spec,
                valueDecimal: calc.valueMicrons,
                valueText: '',
                tolerancePlus: '',
                toleranceMinus: '',
              };
            }
            return spec;
          })
        );
      } else {
        setVariantSpecs(synced);
      }
    }
  };

  const handleStandardChange = (stdId) => {
    const sId = Number(stdId);
    setSelectedStandardId(sId);
    let nextGrade = '';
    const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === sId);
    if (mapping?.grades?.length > 0) {
      nextGrade = Number(mapping.grades[0].gradeId);
    }
    setSelectedGradeId(nextGrade);

    const synced = syncSpecsForScope(variantDetailData?.specs, 'STANDARD_GRADE', sId, nextGrade);
    const calc = computeStandardFlatness(sId, nextGrade);
    if (calc && calc.isSupported && calc.valueMicrons !== null) {
      setFlatnessNotice(calc.detailText);
      setVariantSpecs(
        synced.map((spec) => {
          const pName =
            spec.parameterName ||
            specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))?.parameterName ||
            '';
          if (isExactFlatnessParameter(pName)) {
            return {
              ...spec,
              valueDecimal: calc.valueMicrons,
              valueText: '',
              tolerancePlus: '',
              toleranceMinus: '',
            };
          }
          return spec;
        })
      );
    } else {
      setFlatnessNotice(null);
      setVariantSpecs(synced);
    }
  };

  const handleGradeChange = (grdId) => {
    const gId = Number(grdId);
    setSelectedGradeId(gId);

    const synced = syncSpecsForScope(variantDetailData?.specs, 'STANDARD_GRADE', selectedStandardId, gId);
    const calc = computeStandardFlatness(selectedStandardId, gId);
    if (calc && calc.isSupported && calc.valueMicrons !== null) {
      setFlatnessNotice(calc.detailText);
      setVariantSpecs(
        synced.map((spec) => {
          const pName =
            spec.parameterName ||
            specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))?.parameterName ||
            '';
          if (isExactFlatnessParameter(pName)) {
            return {
              ...spec,
              valueDecimal: calc.valueMicrons,
              valueText: '',
              tolerancePlus: '',
              toleranceMinus: '',
            };
          }
          return spec;
        })
      );
    } else {
      setFlatnessNotice(null);
      setVariantSpecs(synced);
    }
  };

  // Auto-calculate Flatness Tolerance from dimensions (L x W)
  const handleCalculateFlatness = (index) => {
    const calc = computeStandardFlatness(selectedStandardId, selectedGradeId);
    if (calc && calc.isSupported && calc.valueMicrons !== null) {
      const next = [...variantSpecs];
      next[index] = {
        ...next[index],
        valueDecimal: calc.valueMicrons,
        valueText: '',
        tolerancePlus: '',
        toleranceMinus: '',
      };
      setVariantSpecs(next);
      setFlatnessNotice(calc.detailText);
      toast.success(`Calculated: ${calc.valueMicrons} µm (${calc.formulaText})`);
    } else {
      toast.error(calc?.detailText || 'Formula not applicable for this standard and grade combination.');
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
    const rawId = Number(paramId);
    if (!rawId) return;

    // Backend rule: Each spec parameter can be listed only once
    const isDuplicate = variantSpecs.some(
      (s, i) => i !== index && Number(s.specParameterId) === rawId
    );
    if (isDuplicate) {
      toast.error('Each spec parameter can be listed only once.');
      return;
    }

    const param = specParameters.find((p) => p.id === rawId);
    const paramName = param?.parameterName || '';
    const isFlatness = isExactFlatnessParameter(paramName);

    setVariantSpecs((prev) => {
      const next = [...prev];
      let autoVal = next[index]?.valueDecimal ?? '';
      let autoText = next[index]?.valueText ?? '';
      let autoTolPlus = next[index]?.tolerancePlus ?? '';
      let autoTolMinus = next[index]?.toleranceMinus ?? '';

      if (isFlatness && specsScope === 'STANDARD_GRADE') {
        const calc = computeStandardFlatness(selectedStandardId, selectedGradeId);
        if (calc && calc.isSupported && calc.valueMicrons !== null) {
          autoVal = calc.valueMicrons;
          autoText = '';
          autoTolPlus = '';
          autoTolMinus = '';
          setFlatnessNotice(calc.detailText);
        }
      }

      next[index] = {
        ...next[index],
        specParameterId: rawId,
        parameterName: paramName,
        unitSymbol: param?.unitSymbol || '',
        valueDecimal: autoVal,
        valueText: autoText,
        tolerancePlus: autoTolPlus,
        toleranceMinus: autoTolMinus,
      };
      return next;
    });
  };

  // Save all specs for variant
  const handleSaveSpecs = async (e) => {
    e?.preventDefault();
    if (!selectedVariantForSpecs) return;

    if (isSpecsReadOnly) {
      toast.error('Only Administrators can modify specifications on Approved products.');
      return;
    }

    // Backend rule: send both standardId and gradeId, or neither
    if (specsScope === 'STANDARD_GRADE') {
      if (!selectedStandardId || !selectedGradeId) {
        toast.error('Both Standard and Grade must be selected together, or switch to Common Figures.');
        return;
      }
    }

    // Backend rule: Each spec parameter can be listed only once
    const seenParamIds = new Set();
    for (const spec of variantSpecs) {
      const pid = Number(spec.specParameterId);
      if (pid) {
        if (seenParamIds.has(pid)) {
          toast.error(`Each spec parameter can be listed only once. "${spec.parameterName || 'Spec'}" is duplicated.`);
          return;
        }
        seenParamIds.add(pid);
      }
    }

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
      const options =
        specsScope === 'STANDARD_GRADE' && selectedStandardId && selectedGradeId
          ? { standardId: selectedStandardId, gradeId: selectedGradeId }
          : {};

      await productService.setVariantSpecs(selectedVariantForSpecs.id, variantSpecs, options);
      toast.success(
        options.standardId
          ? 'Accuracy specifications saved for Standard + Grade'
          : 'Common accuracy specifications saved'
      );

      // Refresh variant detail to get updated values array
      const fresh = await productService.getVariantById(selectedVariantForSpecs.id);
      setVariantDetailData(fresh);
      setSpecsCache((prev) => ({ ...prev, [selectedVariantForSpecs.id]: fresh?.specs || [] }));
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
                                    <th className="py-2 px-3 text-left font-medium">Standard & Grade Scope</th>
                                    <th className="py-2 px-3 text-right font-medium">Measured Figure</th>
                                    <th className="py-2 px-3 text-center font-medium">Tolerance (±)</th>
                                    <th className="py-2 px-3 text-left font-medium">Total Tolerance Display</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {specs.flatMap((spec, sIdx) => {
                                    const vals =
                                      Array.isArray(spec.values) && spec.values.length > 0
                                        ? spec.values
                                        : [spec];
                                    return vals.map((val, vIdx) => {
                                      const hasTol = val.tolerancePlus !== null || val.toleranceMinus !== null;
                                      const hasDecimal =
                                        val.valueDecimal !== null &&
                                        val.valueDecimal !== undefined &&
                                        val.valueDecimal !== '';
                                      const isCommon =
                                        val.isCommon || (!val.standardId && !val.gradeId && !val.standardCode);

                                      return (
                                        <tr
                                          key={`${spec.id || sIdx}-${val.id || vIdx}`}
                                          className="hover:bg-surface/30"
                                        >
                                          <td className="py-2 px-3 font-semibold text-heading">
                                            {vIdx === 0 ? (
                                              <span>
                                                {spec.parameterName}{' '}
                                                {spec.unitSymbol ? `(${spec.unitSymbol})` : ''}
                                              </span>
                                            ) : (
                                              <span className="text-text-muted pl-2 text-2xs italic">
                                                ↳ {spec.parameterName}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3">
                                            {isCommon ? (
                                              <Badge variant="neutral" size="sm">
                                                Common
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="primary"
                                                size="sm"
                                                className="font-mono font-medium text-3xs"
                                              >
                                                {val.standardCode || `Standard #${val.standardId}`} /{' '}
                                                {val.gradeCode || `Gr-${val.gradeId}`}
                                              </Badge>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-medium text-heading">
                                            {hasDecimal
                                              ? `${val.valueDecimal} ${spec.unitSymbol || val.unitSymbol || ''}`
                                              : val.valueText || '—'}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-xs">
                                            {hasTol ? (
                                              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                                +{val.tolerancePlus ?? 0} / -{val.toleranceMinus ?? 0}
                                              </span>
                                            ) : (
                                              <span className="text-text-muted">—</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-xs text-text-muted">
                                            {val.valueText ? (
                                              <span className="font-medium text-heading">{val.valueText}</span>
                                            ) : hasDecimal && hasTol ? (
                                              <span className="font-medium text-heading">
                                                {val.valueDecimal} ±{' '}
                                                {val.tolerancePlus || val.toleranceMinus}{' '}
                                                {spec.unitSymbol || ''}
                                              </span>
                                            ) : (
                                              '—'
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    });
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
        size="2xl"
      >
        <div className="space-y-4">
          {/* Approved product RBAC Notice */}
          {isSpecsReadOnly && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <IconStandards size={16} className="text-amber-600 shrink-0" />
              <span>
                This product is <strong>Approved</strong>. Accuracy specifications can only be modified by an Administrator.
              </span>
            </div>
          )}

          {/* Standard & Grade Scope Selector Bar (Task 53) */}
          <div className="p-3.5 bg-surface/60 border border-border rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Specification Scope
                </span>
                <p className="text-2xs text-text-muted mt-0.5">
                  Save figures for a specific Standard + Grade pair, or configure common figures across all grades.
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface shrink-0">
                <button
                  type="button"
                  onClick={() => handleScopeChange('STANDARD_GRADE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    specsScope === 'STANDARD_GRADE'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Standard + Grade
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange('COMMON')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    specsScope === 'COMMON'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Common Figures
                </button>
              </div>
            </div>

            {specsScope === 'STANDARD_GRADE' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/60">
                <div>
                  <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                    Manufacturing Standard
                  </label>
                  <SearchableSelect
                    value={selectedStandardId || ''}
                    onChange={(val) => {
                      const raw = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                      handleStandardChange(raw);
                    }}
                    options={availableStandards}
                    placeholder="Select Standard"
                    disabled={isSavingSpecs || isSpecsReadOnly}
                    size="sm"
                  />
                </div>

                <div>
                  <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                    Allowed Precision Grade
                  </label>
                  <SearchableSelect
                    value={selectedGradeId || ''}
                    onChange={(val) => {
                      const raw = val && typeof val === 'object' && 'target' in val ? val.target.value : val;
                      handleGradeChange(raw);
                    }}
                    options={availableGradesForStandard}
                    placeholder={selectedStandardId ? 'Select Allowed Grade' : 'Select standard first'}
                    disabled={!selectedStandardId || isSavingSpecs || isSpecsReadOnly}
                    size="sm"
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-border/60 text-2xs text-text-muted italic">
                Editing figures common to all standards and grades (standardId & gradeId will be stored as empty).
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Define measured values with ± tolerances. Fill Decimal OR Text.
            </p>
            {!isSpecsReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAddSpecRow}
                className="flex items-center gap-1"
                disabled={isSavingSpecs || (specParameters.length > 0 && variantSpecs.length >= specParameters.length)}
                title={
                  specParameters.length > 0 && variantSpecs.length >= specParameters.length
                    ? 'All available parameters have already been added'
                    : 'Add specification parameter'
                }
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
              No specifications recorded for this selection yet.{' '}
              {!isSpecsReadOnly && 'Click "Add Spec" to configure.'}
            </div>
          ) : (
            <TableContainer
              className="border border-border rounded-lg overflow-hidden"
              tableClassName="w-full text-xs table-auto"
            >
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <Th className="w-64 min-w-56">Parameter</Th>
                  <Th className="w-56 min-w-48">Decimal Value</Th>
                  <Th className="w-24">+ Tol</Th>
                  <Th className="w-24">− Tol</Th>
                  <Th className="w-44">Or Text Value</Th>
                  {!isSpecsReadOnly && <Th className="w-14 text-center">Action</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {variantSpecs.map((spec, sIdx) => {
                  const paramName =
                    spec.parameterName ||
                    specParameters.find((p) => Number(p.id) === Number(spec.specParameterId))
                      ?.parameterName ||
                    '';
                  const isExactFlatnessParam = isExactFlatnessParameter(paramName);

                  // Filter out parameters already selected in other rows (Backend rule: Each spec parameter can be listed only once)
                  const rowParamOptions = specParameters
                    .filter((p) => {
                      const isSelectedInOtherRow = variantSpecs.some(
                        (s, idx) => idx !== sIdx && Number(s.specParameterId) === Number(p.id)
                      );
                      return !isSelectedInOtherRow;
                    })
                    .map((p) => ({
                      value: Number(p.id),
                      label: `${p.parameterName}${p.unitSymbol ? ` (${p.unitSymbol})` : ''}`,
                    }));

                  return (
                    <tr key={sIdx}>
                      <td className="p-2">
                        {isSpecsReadOnly ? (
                          <span className="font-medium">
                            {paramName} {spec.unitSymbol ? `(${spec.unitSymbol})` : ''}
                          </span>
                        ) : (
                          <SearchableSelect
                            value={spec.specParameterId ? Number(spec.specParameterId) : ''}
                            onChange={(val) => {
                              const rawId =
                                val && typeof val === 'object' && 'target' in val
                                  ? val.target.value
                                  : val;
                              handleChangeSpecParam(sIdx, rawId);
                            }}
                            options={rowParamOptions}
                            placeholder="Select Parameter"
                            size="sm"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isSpecsReadOnly ? (
                          <span className="font-mono">{spec.valueDecimal ?? '—'}</span>
                        ) : isExactFlatnessParam && specsScope === 'STANDARD_GRADE' ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <Input
                              type="number"
                              size="sm"
                              value={spec.valueDecimal ?? ''}
                              readOnly
                              disabled
                              className="font-mono flex-1 bg-muted/40 cursor-not-allowed font-semibold text-foreground select-none"
                              title="Locked to standard formula tolerance (auto-calculated from dimensions & standard grade)"
                            />
                            <div
                              className="shrink-0 h-[var(--control-height-sm)] px-2 bg-muted/60 text-muted-foreground border border-border rounded-control flex items-center gap-1 text-2xs font-medium select-none cursor-default"
                              title="Locked to standard formula tolerance"
                            >
                              <IconLock size={11} className="text-muted-foreground shrink-0" />
                              <span>Locked</span>
                            </div>
                          </div>
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
                            placeholder="e.g. 6.1"
                            disabled={isSavingSpecs}
                            className="font-mono flex-1 min-w-0"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isSpecsReadOnly || isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title={isExactFlatnessParam ? 'Flatness is a single total allowable limit (no ± bilateral tolerance)' : ''}
                          >
                            —
                          </span>
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
                            disabled={isSavingSpecs}
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isSpecsReadOnly || isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title={isExactFlatnessParam ? 'Flatness is a single total allowable limit (no ± bilateral tolerance)' : ''}
                          >
                            —
                          </span>
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
                            disabled={isSavingSpecs}
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {isSpecsReadOnly || isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title={isExactFlatnessParam ? 'Flatness is a numeric metrology figure' : ''}
                          >
                            —
                          </span>
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
                            disabled={isSavingSpecs}
                          />
                        )}
                      </td>
                      {!isSpecsReadOnly && (
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              const pName =
                                spec.parameterName ||
                                specParameters.find(
                                  (p) => Number(p.id) === Number(spec.specParameterId)
                                )?.parameterName ||
                                `Parameter #${sIdx + 1}`;
                              setSpecToDelete({
                                index: sIdx,
                                name: pName,
                              });
                            }}
                            className="text-danger hover:bg-danger/10"
                            title="Remove parameter"
                            disabled={isSavingSpecs}
                          >
                            <IconDelete size={14} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </TableContainer>
          )}

          {/* Formula calculation notice banner */}
          {flatnessNotice && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary flex items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-primary/20 shrink-0">
                  FORMULA
                </span>
                <span className="font-mono text-xs">{flatnessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFlatnessNotice(null)}
                className="text-text-muted hover:text-primary text-xs shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton
              size="sm"
              label="Close"
              onClick={() => setSelectedVariantForSpecs(null)}
              disabled={isSavingSpecs}
            />
            {!isSpecsReadOnly && (
              <SaveButton
                type="button"
                size="sm"
                label={
                  specsScope === 'STANDARD_GRADE'
                    ? 'Save Standard + Grade Specs'
                    : 'Save Common Specs'
                }
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
