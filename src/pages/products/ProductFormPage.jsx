/**
 * ProductFormPage.jsx — Full-page Product Registration and Edit form.
 *
 * Routes:
 *   /products/new      — Add new product
 *   /products/:id/edit — Edit existing product
 *
 * Adheres strictly to MicroFlat ERP UI guidelines:
 *   - Uses built-in label, required, hint, and error props on Input, SearchableSelect, and Textarea
 *   - Local validation state with inline field-level errors on blur and submit
 *   - Unified CollapsibleCard/Card styling with entity icons and subtitle hints
 *   - FormActionsBar with SaveButton and CancelButton
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  SearchableSelect,
  Toggle,
  Textarea,
  Card,
  CollapsibleCard,
  PageHeader,
  FormActionsBar,
  StatusSwitch,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Badge,
} from '../../components/ui';
import {
  IconBack,
  IconProduct,
  IconSave,
  IconShieldCheck,
  IconStandards,
  IconLayers,
  IconFileText,
  IconAttachment,
  IconUpload,
  IconDownload,
  IconAdd,
  IconEdit,
  IconDelete,
  IconSpecParameters,
  IconLock,
} from '../../constants/icons';
import { productService } from '../../services';
import { useProductsContext } from '../../context/ProductsContext';
import { useStandardsContext } from '../../context/StandardsContext';
import { calculateFlatnessTolerance } from '../../utils/flatnessFormula';
import ProductStandardsEditor from './components/ProductStandardsEditor';
import ProductOptionsEditor from './components/ProductOptionsEditor';
import { createEmptyProductForm } from '../../models/products/productModel';

function extractVal(e) {
  if (e && typeof e === 'object' && 'target' in e) {
    return e.target?.value !== undefined ? e.target.value : e.target?.checked;
  }
  return e;
}

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

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { lookups, refreshProducts, loadSummary } = useProductsContext();
  const { gradeMapping = [] } = useStandardsContext?.() || {};

  const specParameters = useMemo(() => lookups?.specParameters || [], [lookups?.specParameters]);

  const [form, setForm] = useState(createEmptyProductForm());
  const [errors, setErrors] = useState({});
  const [standards, setStandards] = useState([]);
  const [options, setOptions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [initialIsActive, setInitialIsActive] = useState(true);

  // Staged variants for both create and edit modes (Option 2: 100% deferred staging)
  const [variants, setVariants] = useState([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [variantForm, setVariantForm] = useState({
    variantCode: '',
    gradeId: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    diameterMm: '',
    isActive: true,
  });

  // Staged attachments for both create and edit modes
  const [draftAttachments, setDraftAttachments] = useState([]);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentForm, setAttachmentForm] = useState({
    documentTypeId: '',
    documentName: '',
    documentTitle: '',
    remarks: '',
    file: null,
  });

  // Accuracy Specs modal state (aligned with ProductVariantsTab Task 53/58)
  const [selectedVariantIndexForSpecs, setSelectedVariantIndexForSpecs] = useState(null);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [variantDetailData, setVariantDetailData] = useState(null);
  const [variantSpecs, setVariantSpecs] = useState([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);

  // Standard + Grade Scope State
  const [specsScope, setSpecsScope] = useState('STANDARD_GRADE'); // 'STANDARD_GRADE' | 'COMMON'
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [flatnessNotice, setFlatnessNotice] = useState(null);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  const selectedVariantForSpecs = useMemo(() => {
    if (selectedVariantIndexForSpecs === null || selectedVariantIndexForSpecs === undefined) return null;
    return variants[selectedVariantIndexForSpecs] || null;
  }, [selectedVariantIndexForSpecs, variants]);

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

  // Dynamically filtered grades for the selected standard (strictly adhering to backend rule and product grade scope)
  const availableGradesForStandard = useMemo(() => {
    if (!selectedStandardId) return [];
    const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(selectedStandardId));
    const productStd = (standards || []).find(
      (s) => Number(s.standardId || s.id) === Number(selectedStandardId)
    );
    let allowedGrades =
      mapping && Array.isArray(mapping.grades) && mapping.grades.length > 0
        ? mapping.grades.filter((g) => g.isGradeActive !== false)
        : [];

    // If product specifies custom applicable grades for this standard, filter by them
    if (
      productStd?.applicableGradeIds &&
      Array.isArray(productStd.applicableGradeIds) &&
      productStd.applicableGradeIds.length > 0
    ) {
      const allowedSet = new Set(productStd.applicableGradeIds.map(Number));
      allowedGrades = allowedGrades.filter((g) => allowedSet.has(Number(g.gradeId)));
    }

    if (allowedGrades.length > 0) {
      return allowedGrades.map((g) => ({
        value: Number(g.gradeId),
        label: g.gradeCode || `Grade #${g.gradeId}`,
      }));
    }
    // Fallback if mapping not loaded
    return (lookups?.grades || []).map((g) => ({ value: Number(g.id), label: g.gradeCode }));
  }, [selectedStandardId, gradeMapping, standards, lookups?.grades]);

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
        const grdItem = (lookups?.grades || []).find((g) => Number(g.id) === Number(grdId));
        grdLabel = grdItem?.gradeCode || '';
      }

      return calculateFlatnessTolerance({
        standardCode: stdItem?.label || '',
        gradeCode: grdLabel,
        lengthMm,
        widthMm,
      });
    },
    [selectedVariantForSpecs, availableStandards, gradeMapping, lookups?.grades]
  );

  const handleOpenAddVariant = () => {
    setEditingVariantIndex(null);
    setVariantForm({
      variantCode: form.productCode ? `${form.productCode}-` : '',
      gradeId: '',
      lengthMm: '',
      widthMm: '',
      heightMm: '',
      diameterMm: '',
      isActive: true,
    });
    setIsVariantModalOpen(true);
  };

  const handleOpenEditVariant = (idx) => {
    setEditingVariantIndex(idx);
    const v = variants[idx];
    setVariantForm({
      variantCode: v.variantCode || '',
      gradeId: v.gradeId ? Number(v.gradeId) : '',
      lengthMm: v.lengthMm ?? '',
      widthMm: v.widthMm ?? '',
      heightMm: v.heightMm ?? '',
      diameterMm: v.diameterMm ?? '',
      isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
    });
    setIsVariantModalOpen(true);
  };

  // Deletion confirmation dialog state
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'variant') {
      if (itemToDelete.id) {
        setDeletedVariantIds((prev) => [...prev, itemToDelete.id]);
      }
      setVariants((prev) => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success(`Removed variant "${itemToDelete.name}"`);
    } else if (itemToDelete.type === 'attachment') {
      setDraftAttachments((prev) => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success(`Removed attachment "${itemToDelete.name}"`);
    } else if (itemToDelete.type === 'spec') {
      setVariantSpecs((prev) => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success(`Removed parameter "${itemToDelete.name}"`);
    }
    setItemToDelete(null);
  };

  // Open Specs Modal for a specific variant (aligned with ProductVariantsTab)
  const handleOpenSpecsModal = async (idx) => {
    setSelectedVariantIndexForSpecs(idx);
    setFlatnessNotice(null);
    setIsLoadingSpecs(true);
    setIsSpecsModalOpen(true);

    const variant = variants[idx];
    if (!variant) {
      setIsLoadingSpecs(false);
      return;
    }

    // Default scope determination
    let initScope = 'STANDARD_GRADE';
    let initStd = availableStandards[0]?.value || '';
    let initGrd = '';

    if (initStd) {
      const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(initStd));
      const productStd = (standards || []).find(
        (s) => Number(s.standardId || s.id) === Number(initStd)
      );
      let allowed = (mapping?.grades || []).filter((g) => g.isGradeActive !== false);
      if (productStd?.applicableGradeIds?.length > 0) {
        const allowedSet = new Set(productStd.applicableGradeIds.map(Number));
        allowed = allowed.filter((g) => allowedSet.has(Number(g.gradeId)));
      }
      if (allowed.length > 0) {
        initGrd = Number(allowed[0].gradeId);
      } else if (mapping?.grades?.length > 0) {
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

    try {
      let data = null;
      if (variant.id) {
        data = await productService.getVariantById(variant.id);
      } else {
        data = { specs: variant.specs || [] };
      }
      setVariantDetailData(data);

      const initialSpecs = syncSpecsForScope(data?.specs, initScope, initStd, initGrd);

      // Auto-populate flatness from standard formula if in STANDARD_GRADE mode
      if (initScope === 'STANDARD_GRADE' && initStd && initGrd && variant.lengthMm && variant.widthMm) {
        const stdItem = availableStandards.find((s) => Number(s.value) === Number(initStd));
        const mapping = (gradeMapping || []).find((m) => Number(m.standardId) === Number(initStd));
        let grdLabel = mapping?.grades?.find((g) => Number(g.gradeId) === Number(initGrd))?.gradeCode || '';
        if (!grdLabel) {
          grdLabel = (lookups?.grades || []).find((g) => Number(g.id) === Number(initGrd))?.gradeCode || '';
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
        const productStd = (standards || []).find(
          (s) => Number(s.standardId || s.id) === Number(firstStd)
        );
        let allowed = (mapping?.grades || []).filter((g) => g.isGradeActive !== false);
        if (productStd?.applicableGradeIds?.length > 0) {
          const allowedSet = new Set(productStd.applicableGradeIds.map(Number));
          allowed = allowed.filter((g) => allowedSet.has(Number(g.gradeId)));
        }
        if (allowed.length > 0) {
          firstGrd = Number(allowed[0].gradeId);
        } else if (mapping?.grades?.length > 0) {
          firstGrd = Number(mapping.grades[0].gradeId);
        }
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
    const productStd = (standards || []).find(
      (s) => Number(s.standardId || s.id) === sId
    );
    let allowed = (mapping?.grades || []).filter((g) => g.isGradeActive !== false);
    if (productStd?.applicableGradeIds?.length > 0) {
      const allowedSet = new Set(productStd.applicableGradeIds.map(Number));
      allowed = allowed.filter((g) => allowedSet.has(Number(g.gradeId)));
    }
    if (allowed.length > 0) {
      nextGrade = Number(allowed[0].gradeId);
    } else if (mapping?.grades?.length > 0) {
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

    const param = specParameters.find((p) => Number(p.id) === rawId);
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

  const handleSaveSpecs = async (e) => {
    e?.preventDefault();
    if (selectedVariantIndexForSpecs === null) return;
    const currentVariant = variants[selectedVariantIndexForSpecs];
    if (!currentVariant) return;

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
      if (!spec.specParameterId) {
        toast.error('Please select a specification parameter for each row');
        return;
      }
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

    const options =
      specsScope === 'STANDARD_GRADE' && selectedStandardId && selectedGradeId
        ? { standardId: selectedStandardId, gradeId: selectedGradeId }
        : {};

    if (currentVariant.id) {
      setIsSavingSpecs(true);
      try {
        await productService.setVariantSpecs(currentVariant.id, variantSpecs, options);
        toast.success(
          options.standardId
            ? 'Accuracy specifications saved for Standard + Grade'
            : 'Common accuracy specifications saved'
        );

        // Refresh variant detail to get updated values array
        const fresh = await productService.getVariantById(currentVariant.id);
        setVariantDetailData(fresh);

        setVariants((prev) => {
          const next = [...prev];
          next[selectedVariantIndexForSpecs] = {
            ...next[selectedVariantIndexForSpecs],
            specs: fresh?.specs || variantSpecs,
            specCount: (fresh?.specs || variantSpecs).length,
            _isSpecsModified: false,
          };
          return next;
        });
        setIsSpecsModalOpen(false);
        setSelectedVariantIndexForSpecs(null);
      } catch (err) {
        toast.error(err?.message || 'Failed to save accuracy specifications');
      } finally {
        setIsSavingSpecs(false);
      }
    } else {
      // Staged locally for new variant without id (e.g. newly added in create or edit mode)
      setVariants((prev) => {
        const next = [...prev];
        next[selectedVariantIndexForSpecs] = {
          ...next[selectedVariantIndexForSpecs],
          specs: variantSpecs,
          specsOptions: options,
          specCount: variantSpecs.length,
          _isSpecsModified: true,
        };
        return next;
      });
      toast.success(
        options.standardId
          ? 'Accuracy specifications updated for Standard + Grade'
          : 'Common accuracy specifications updated'
      );
      setIsSpecsModalOpen(false);
      setSelectedVariantIndexForSpecs(null);
    }
  };

  // Lookups options
  const categoryOptions = useMemo(() => {
    return (lookups?.categories || []).map((c) => ({
      value: Number(c.id),
      label: `${c.categoryCode ? c.categoryCode + ' - ' : ''}${c.categoryName}`,
    }));
  }, [lookups?.categories]);

  const materialOptions = useMemo(() => {
    return (lookups?.materials || []).map((m) => ({
      value: Number(m.id),
      label: m.materialName,
    }));
  }, [lookups?.materials]);

  const uomOptions = useMemo(() => {
    return (lookups?.uoms || []).map((u) => ({
      value: Number(u.id),
      label: `${u.uomName}${u.description ? ` (${u.description})` : ''}`,
    }));
  }, [lookups?.uoms]);

  const gradeOptions = useMemo(() => {
    return (lookups?.grades || []).map((g) => ({
      value: Number(g.id),
      label: g.gradeCode,
    }));
  }, [lookups?.grades]);

  const docTypeOptions = useMemo(() => {
    return (lookups?.documentTypes || []).map((d) => ({
      value: Number(d.id),
      label: d.typeName || d.name || `Type #${d.id}`,
    }));
  }, [lookups?.documentTypes]);

  const specParamOptions = useMemo(() => {
    return (lookups?.specParameters || []).map((p) => ({
      value: Number(p.id),
      label: `${p.parameterName}${p.unitSymbol ? ` (${p.unitSymbol})` : ''}`,
    }));
  }, [lookups?.specParameters]);

  // Load product if edit mode
  useEffect(() => {
    if (!isEditMode) return;
    let isMounted = true;

    async function fetchProduct() {
      setIsLoading(true);
      try {
        const [data, variantsRes] = await Promise.all([
          productService.getProductById(id),
          productService.listProductVariants(id, { pageSize: 100 }).catch(() => ({ items: [] })),
        ]);
        if (!isMounted || !data) return;

        setForm({
          productCode: data.productCode || '',
          productName: data.productName || '',
          categoryId: data.categoryId ? Number(data.categoryId) : '',
          materialId: data.materialId ? Number(data.materialId) : '',
          finishType: data.finishType || '',
          uomId: data.uomId ? Number(data.uomId) : '',
          description: data.description || '',
          isStandardProduct: Boolean(data.isStandardProduct),
          isCustomSizeAllowed: Boolean(data.isCustomSizeAllowed),
          requiresCalibration: Boolean(data.requiresCalibration),
        });

        let stds = (data.standards || []).map((s) => ({
          standardId: Number(s.standardId || s.id),
          standardCode: s.standardCode || '',
          isPrimary: Boolean(s.isPrimary),
          applicableGradeIds: s.applicableGradeIds || null,
        }));
        try {
          const cached = localStorage.getItem(`product_standards_grades_${id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            stds = stds.map((s) => {
              const sid = Number(s.standardId);
              const found = parsed.find((p) => Number(p.standardId || p.id) === sid);
              return found && found.applicableGradeIds !== undefined
                ? { ...s, applicableGradeIds: found.applicableGradeIds }
                : s;
            });
          }
        } catch (e) {
          console.warn('Could not read cached product grade preferences:', e);
        }
        setStandards(stds);

        const opts = (data.options || []).map((o) => ({
          optionName: o.optionName || '',
          isStandard: Boolean(o.isStandard),
        }));
        setOptions(opts);

        setAttachments(data.attachments || []);
        setIsActive(Boolean(data.isActive));
        setInitialIsActive(Boolean(data.isActive));

        const loadedVariants = Array.isArray(variantsRes?.items)
          ? variantsRes.items
          : Array.isArray(variantsRes)
          ? variantsRes
          : [];
        setVariants(loadedVariants);
        setDeletedVariantIds([]);
      } catch (err) {
        toast.error(err?.message || 'Failed to load product details');
        navigate('/products');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  // Field validation
  const validateField = useCallback((name, rawValue) => {
    const value = extractVal(rawValue);
    switch (name) {
      case 'productCode':
        if (!value || !String(value).trim()) return 'Product code is required.';
        return '';
      case 'productName':
        if (!value || !String(value).trim()) return 'Product name is required.';
        return '';
      case 'categoryId':
        if (!value || value === 'ALL' || isNaN(Number(value)) || Number(value) <= 0) {
          return 'Category is required.';
        }
        return '';
      case 'uomId':
        if (!value || value === 'ALL' || isNaN(Number(value)) || Number(value) <= 0) {
          return 'Unit of Measurement is required.';
        }
        return '';
      default:
        return '';
    }
  }, []);

  const handleFieldChange = (field, e) => {
    let value = extractVal(e);
    if (field === 'categoryId' || field === 'materialId' || field === 'uomId') {
      value = value && !isNaN(Number(value)) ? Number(value) : '';
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field) => {
    const err = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateAll = () => {
    const newErrors = {};
    const codeErr = validateField('productCode', form.productCode);
    if (codeErr) newErrors.productCode = codeErr;

    const nameErr = validateField('productName', form.productName);
    if (nameErr) newErrors.productName = nameErr;

    const catErr = validateField('categoryId', form.categoryId);
    if (catErr) newErrors.categoryId = catErr;

    const uomErr = validateField('uomId', form.uomId);
    if (uomErr) newErrors.uomId = uomErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateAll()) {
      toast.error('Please resolve the required fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      let productId = id;

      if (isEditMode) {
        // 1. Update product basic details
        await productService.updateProduct(productId, form);

        // 2. Update status if changed
        if (isActive !== initialIsActive) {
          await productService.updateProductStatus(productId, isActive);
        }

        // 3. Update standards
        await productService.setStandards(
          productId,
          standards.filter((s) => s.standardId)
        );
        try {
          localStorage.setItem(`product_standards_grades_${productId}`, JSON.stringify(standards));
        } catch (e) {
          console.warn('Could not cache product grade preferences:', e);
        }

        // 4. Update options
        await productService.setOptions(
          productId,
          options.filter((o) => o.optionName?.trim())
        );

        // 5. Delete removed variants
        for (const vId of deletedVariantIds) {
          try {
            await productService.deleteVariant(vId);
          } catch (delErr) {
            console.warn(`Could not delete variant #${vId}:`, delErr);
          }
        }

        // 6. Update modified variants (including status change via patch)
        const modifiedVariants = variants.filter((v) => v.id && v._isModified && !v._isNew);
        for (const v of modifiedVariants) {
          try {
            await productService.updateVariant(v.id, v);
            if (v._isStatusChanged) {
              await productService.updateVariantStatus(v.id, v.isActive);
            }
          } catch (updErr) {
            console.warn(`Could not update variant #${v.id}:`, updErr);
          }
        }

        // 7. Save specs for modified existing variants
        const existingVariantsWithSpecs = variants.filter(
          (v) => v.id && v._isSpecsModified && !v._isNew && Array.isArray(v.specs)
        );
        for (const v of existingVariantsWithSpecs) {
          try {
            await productService.setVariantSpecs(v.id, v.specs, v.specsOptions || {});
          } catch (spErr) {
            console.warn(`Could not save specs for variant #${v.id}:`, spErr);
          }
        }

        // 8. Add newly added variants (and their specs/status) in edit mode
        const newVariants = variants.filter((v) => v._isNew);
        for (const v of newVariants) {
          try {
            const createdVar = await productService.addVariant(productId, v);
            const newVarId = createdVar?.id || createdVar?.data?.id;
            if (newVarId) {
              if (v.isActive === false) {
                await productService.updateVariantStatus(newVarId, false);
              }
              if (Array.isArray(v.specs) && v.specs.length > 0) {
                await productService.setVariantSpecs(newVarId, v.specs, v.specsOptions || {});
              }
            }
          } catch (addErr) {
            console.warn('Could not add new variant in edit mode:', addErr);
          }
        }

        // 9. Upload newly queued attachments
        if (draftAttachments.length > 0) {
          for (const att of draftAttachments) {
            try {
              const formData = new FormData();
              formData.append('DocumentTypeId', Number(att.documentTypeId));
              if (att.documentName) formData.append('DocumentName', att.documentName);
              if (att.documentTitle) formData.append('DocumentTitle', att.documentTitle);
              if (att.remarks) formData.append('Remarks', att.remarks);
              formData.append('File', att.file);
              await productService.uploadAttachment(productId, formData);
            } catch (attErr) {
              console.warn('Could not upload attachment in edit mode:', attErr);
            }
          }
        }

        toast.success('Product updated successfully');
      } else {
        // 1. Create product
        const created = await productService.createProduct(form);
        productId = created?.id || created?.data?.id || created;

        // 2. Link standards if any selected
        if (productId && standards.length > 0) {
          try {
            await productService.setStandards(
              productId,
              standards.filter((s) => s.standardId)
            );
            try {
              localStorage.setItem(`product_standards_grades_${productId}`, JSON.stringify(standards));
            } catch (e) {
              console.warn('Could not cache product grade preferences:', e);
            }
          } catch (stdErr) {
            console.warn('Could not save standards on create:', stdErr);
          }
        }

        // 3. Link options if any defined
        if (productId && options.length > 0) {
          try {
            await productService.setOptions(
              productId,
              options.filter((o) => o.optionName?.trim())
            );
          } catch (optErr) {
            console.warn('Could not save options on create:', optErr);
          }
        }

        // 4. Link initial variants and their specs if any defined
        if (productId && variants.length > 0) {
          for (const v of variants) {
            try {
              const createdVar = await productService.addVariant(productId, v);
              const newVarId = createdVar?.id || createdVar?.data?.id;
              if (newVarId) {
                if (v.isActive === false) {
                  await productService.updateVariantStatus(newVarId, false);
                }
                if (Array.isArray(v.specs) && v.specs.length > 0) {
                  await productService.setVariantSpecs(newVarId, v.specs, v.specsOptions || {});
                }
              }
            } catch (vErr) {
              console.warn('Could not add draft variant on create:', vErr);
            }
          }
        }

        // 5. Upload initial attachments if any queued
        if (productId && draftAttachments.length > 0) {
          for (const att of draftAttachments) {
            try {
              const formData = new FormData();
              formData.append('DocumentTypeId', Number(att.documentTypeId));
              if (att.documentName) formData.append('DocumentName', att.documentName);
              if (att.documentTitle) formData.append('DocumentTitle', att.documentTitle);
              if (att.remarks) formData.append('Remarks', att.remarks);
              formData.append('File', att.file);
              await productService.uploadAttachment(productId, formData);
            } catch (attErr) {
              console.warn('Could not upload attachment on create:', attErr);
            }
          }
        }

        toast.success('Product registered successfully (Pending Approval)');
      }

      refreshProducts?.();
      loadSummary?.();
      navigate(productId ? `/products/${productId}` : '/products');
    } catch (err) {
      toast.error(err?.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-10 bg-muted/30 animate-pulse rounded-lg" />
        <div className="h-64 bg-muted/20 animate-pulse rounded-lg border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEditMode ? `Edit Product: ${form.productCode || ''}` : 'Product Registration'}
        backButton={{
          onClick: () => navigate(isEditMode ? `/products/${id}` : '/products'),
          label: isEditMode ? 'Back to Product' : 'Back to Products',
        }}
        subtitle={
          isEditMode
            ? 'Update product master specifications, manufacturing standards, and optional accessories.'
            : 'Register a new precision metrology product or standard measuring equipment.'
        }
        icon={<IconProduct size={24} className="text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={() => navigate(isEditMode ? `/products/${id}` : '/products')}
              disabled={isSaving}
            />
            <SaveButton
              onClick={handleSubmit}
              loading={isSaving}
              label={isEditMode ? 'Update Product' : 'Register Product'}
            />
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section 1: Core Master Details ── */}
        <CollapsibleCard
          title="Product Master Details"
          subtitle="Primary identification, naming, categorization, and finish type"
          icon={<IconProduct size={18} />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Product Code */}
            <Input
              id="productCode"
              label="Product Code"
              required
              value={form.productCode}
              onChange={(e) => handleFieldChange('productCode', e.target.value.toUpperCase())}
              onBlur={() => handleBlur('productCode')}
              placeholder="e.g. SP-GR, SE-AL"
              error={errors.productCode}
              hint="Unique identifier, stored in uppercase"
              className="font-mono uppercase"
            />

            {/* Product Name */}
            <Input
              id="productName"
              label="Product Name"
              required
              value={form.productName}
              onChange={(e) => handleFieldChange('productName', e.target.value)}
              onBlur={() => handleBlur('productName')}
              placeholder="e.g. Granite Surface Plate, Aluminium Straight Edge"
              error={errors.productName}
              hint="Full commercial and technical product name"
            />

            {/* Category */}
            <SearchableSelect
              id="categoryId"
              name="categoryId"
              label="Category"
              required
              value={form.categoryId || ''}
              onChange={(val) => handleFieldChange('categoryId', val)}
              onBlur={() => handleBlur('categoryId')}
              options={categoryOptions}
              placeholder="Select Category"
              error={errors.categoryId}
              hint="Product grouping category"
            />

            {/* Material */}
            <SearchableSelect
              id="materialId"
              name="materialId"
              label="Material"
              value={form.materialId || ''}
              onChange={(val) => handleFieldChange('materialId', val)}
              options={materialOptions}
              placeholder="Select Material (Optional)"
              hint="Primary base construction material"
            />

            {/* UOM */}
            <SearchableSelect
              id="uomId"
              name="uomId"
              label="Unit of Measurement (UOM)"
              required
              value={form.uomId || ''}
              onChange={(val) => handleFieldChange('uomId', val)}
              onBlur={() => handleBlur('uomId')}
              options={uomOptions}
              placeholder="Select UOM"
              error={errors.uomId}
              hint="Billing and inventory unit"
            />

            {/* Finish Type */}
            <Input
              id="finishType"
              label="Finish Type"
              value={form.finishType}
              onChange={(e) => handleFieldChange('finishType', e.target.value)}
              placeholder="e.g. Precision Lapped, Hand Lapped, Hard Anodized"
              hint="Surface treatment and mechanical finish specification"
            />

            {/* Account Status in Edit Mode */}
            {isEditMode && (
              <div className="flex flex-col justify-between pt-1">
                <span className="mf-label block mb-1">Product Status</span>
                <div className="flex items-center gap-3 h-[42px]">
                  <StatusSwitch
                    checked={isActive}
                    onChange={(checked) => setIsActive(checked)}
                  />
                  <span className="text-xs text-text-muted">
                    {isActive
                      ? 'Product is active and eligible for quotation and orders.'
                      : 'Product is inactive and hidden from new customer inquiries.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleCard>

        {/* ── Sections 2 & 3: Standards & Options (2-Column Desktop Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── Section 3: Applicable Standards ── */}
          <CollapsibleCard
            title="Manufacturing & Calibration Standards"
            subtitle="IS, DIN, BS, and GGG metrology specifications"
            icon={<IconStandards size={18} />}
            defaultOpen={true}
          >
            <ProductStandardsEditor
              standards={standards}
              onChange={setStandards}
              availableStandards={lookups?.standards || []}
            />
          </CollapsibleCard>

          {/* ── Section 4: Product Options & Accessories ── */}
          <CollapsibleCard
            title="Product Options & Accessories"
            subtitle="Optional fixtures, covers, and attachment configurations"
            icon={<IconLayers size={18} />}
            defaultOpen={true}
          >
            <ProductOptionsEditor
              options={options}
              onChange={setOptions}
            />
          </CollapsibleCard>
        </div>

        {/* ── Sections 5 & 6: Variants & Attachments (2-Column Desktop Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── Section 5: Product Variants & Specifications ── */}
          <CollapsibleCard
            title="Product Variants & Dimensions"
            subtitle="Physical sizes, grades, and dimensional figures"
            icon={<IconLayers size={18} />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-heading">
                    Product Variants & Sizes
                  </h4>
                  <p className="text-2xs text-text-muted">
                    {isEditMode
                      ? 'Configure dimensions, grades, and active statuses. Changes are saved upon updating product.'
                      : 'You can define product sizes now or add them later after registration.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddVariant}
                  className="flex items-center gap-1.5"
                >
                  <IconAdd size={14} />
                  <span>Add Variant</span>
                </Button>
              </div>

              {variants.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-border bg-surface/30 text-text-muted text-xs">
                  No variants added yet. Click &quot;Add Variant&quot; above to configure dimensions and grades.
                </div>
              ) : (
                <TableContainer
                  className="border border-border rounded-lg max-h-80 overflow-y-auto"
                  tableClassName="w-full text-xs table-auto"
                >
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="bg-surface border-b border-border">
                      <Th>Variant Code</Th>
                      <Th>Grade</Th>
                      <Th className="text-right">Length (mm)</Th>
                      <Th className="text-right">Width (mm)</Th>
                      <Th className="text-right">Height (mm)</Th>
                      <Th className="text-right">Diameter (mm)</Th>
                      <Th className="text-center">Status</Th>
                      <Th className="w-32 text-center">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variants.map((v, idx) => (
                      <tr key={v.id || v._tempId || idx} className="hover:bg-surface/30">
                        <td className="p-2.5 font-mono font-medium text-heading">
                          <div className="flex items-center gap-1.5">
                            <span>{v.variantCode}</span>
                            {v._isNew && (
                              <Badge variant="info" size="xs">New</Badge>
                            )}
                            {v._isModified && !v._isNew && (
                              <Badge variant="warning" size="xs">Modified</Badge>
                            )}
                            {v._isSpecsModified && !v._isNew && (
                              <Badge variant="neutral" size="xs">Specs Updated</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          {lookups?.grades?.find((g) => Number(g.id) === Number(v.gradeId))?.gradeCode || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono">{v.lengthMm ?? '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.widthMm ?? '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.heightMm ?? '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.diameterMm ?? '—'}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant={v.isActive ? 'success' : 'neutral'} size="xs">
                            {v.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleOpenSpecsModal(idx)}
                              className="text-text-muted hover:text-primary flex items-center gap-1 px-1.5 py-1 border border-border/70 rounded hover:bg-surface/70"
                              title="Configure accuracy specifications"
                            >
                              <IconSpecParameters size={13} className="text-primary shrink-0" />
                              <span className="text-2xs font-mono">
                                {(v.specs !== undefined ? v.specs.length : (v.specCount || 0)) > 0
                                  ? `${v.specs !== undefined ? v.specs.length : v.specCount} Specs`
                                  : 'Add Specs'}
                              </span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleOpenEditVariant(idx)}
                              className="text-text-muted hover:text-primary"
                              title="Edit variant"
                            >
                              <IconEdit size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                setItemToDelete({
                                  type: 'variant',
                                  index: idx,
                                  id: v.id,
                                  name: v.variantCode || `Variant #${idx + 1}`,
                                })
                              }
                              className="text-danger hover:bg-danger/10"
                              title="Remove variant"
                            >
                              <IconDelete size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableContainer>
              )}
            </div>
          </CollapsibleCard>

          {/* ── Section 6: Technical Documents & Attachments ── */}
          <CollapsibleCard
            title="Technical Documents & Attachments"
            subtitle="CAD drawings, calibration certificates, and datasheets"
            icon={<IconFileText size={18} />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-heading">
                    Product Documents & Files
                  </h4>
                  <p className="text-2xs text-text-muted">
                    {isEditMode
                      ? 'Existing attachments and queued files. Uploads commit when updating product.'
                      : 'Queue technical drawings, datasheets, or certificates to be uploaded upon creation.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttachmentForm({
                      documentTypeId: '',
                      documentName: '',
                      documentTitle: '',
                      remarks: '',
                      file: null,
                    });
                    setIsAttachmentModalOpen(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <IconUpload size={14} />
                  <span>Add Document</span>
                </Button>
              </div>

              {attachments.length === 0 && draftAttachments.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-border bg-surface/30 text-text-muted text-xs">
                  No documents queued yet. Click &quot;Add Document&quot; above to select files.
                </div>
              ) : (
                <TableContainer
                  className="border border-border rounded-lg max-h-80 overflow-y-auto"
                  tableClassName="w-full text-xs table-auto"
                >
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="bg-surface border-b border-border">
                      <Th>File Name</Th>
                      <Th>Document Type</Th>
                      <Th>Title / Remarks</Th>
                      <Th className="text-center">Status</Th>
                      <Th className="w-16 text-center">Action</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Existing uploaded attachments */}
                    {attachments.map((att, idx) => (
                      <tr key={`existing-${att.id || idx}`} className="hover:bg-surface/30">
                        <td className="p-2.5 font-medium text-heading flex items-center gap-2">
                          <IconFileText size={16} className="text-primary shrink-0" />
                          <span className="truncate max-w-xs">{att.documentName || att.fileName || 'Attachment'}</span>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="neutral" size="xs">
                            {att.documentTypeName || att.documentType || lookups?.documentTypes?.find((d) => Number(d.id) === Number(att.documentTypeId))?.typeName || `Type #${att.documentTypeId}`}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-text-muted truncate max-w-xs">{att.documentTitle || att.remarks || '—'}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant="success" size="xs">Uploaded</Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          {att.fileUrl || att.downloadUrl ? (
                            <a
                              href={att.fileUrl || att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline p-1"
                              title="Download document"
                            >
                              <IconDownload size={14} />
                            </a>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Staged new draft attachments */}
                    {draftAttachments.map((att, idx) => (
                      <tr key={`draft-${idx}`} className="hover:bg-surface/30">
                        <td className="p-2.5 font-medium text-heading flex items-center gap-2">
                          <IconFileText size={16} className="text-primary shrink-0" />
                          <span className="truncate max-w-xs">{att.file?.name}</span>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="neutral" size="xs">
                            {lookups?.documentTypes?.find((d) => Number(d.id) === Number(att.documentTypeId))?.typeName || `Type #${att.documentTypeId}`}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-text-muted truncate max-w-xs">{att.documentTitle || att.documentName || '—'}</td>
                        <td className="p-2.5 text-center">
                          <Badge variant="warning" size="xs">Queued</Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              setItemToDelete({
                                type: 'attachment',
                                index: idx,
                                name: att.file?.name || att.documentTitle || `Attachment #${idx + 1}`,
                              })
                            }
                            className="text-danger hover:bg-danger/10"
                            title="Remove attachment from queue"
                          >
                            <IconDelete size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableContainer>
              )}
            </div>
          </CollapsibleCard>
        </div>

        {/* ── Section 6: Manufacturing & Quality Specifications (Bottom) ── */}
        <CollapsibleCard
          title="Manufacturing & Quality Specifications"
          subtitle="Engineering standards, calibration requirements, and description"
          icon={<IconShieldCheck size={18} />}
          defaultOpen={true}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* isStandardProduct */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-surface/40 hover:bg-surface/70 transition-colors">
                <Toggle
                  checked={form.isStandardProduct}
                  onChange={(val) => handleFieldChange('isStandardProduct', val)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-heading block">
                    Standard Catalog Item
                  </span>
                  <p className="text-2xs text-text-muted mt-0.5">
                    Catalog standard item versus custom engineered build.
                  </p>
                </div>
              </div>

              {/* isCustomSizeAllowed */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-surface/40 hover:bg-surface/70 transition-colors">
                <Toggle
                  checked={form.isCustomSizeAllowed}
                  onChange={(val) => handleFieldChange('isCustomSizeAllowed', val)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-heading block">
                    Custom Sizes Allowed
                  </span>
                  <p className="text-2xs text-text-muted mt-0.5">
                    Allows customers to request bespoke dimensions.
                  </p>
                </div>
              </div>

              {/* requiresCalibration */}
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-border/80 bg-surface/40 hover:bg-surface/70 transition-colors">
                <Toggle
                  checked={form.requiresCalibration}
                  onChange={(val) => handleFieldChange('requiresCalibration', val)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-heading block">
                    Requires Calibration
                  </span>
                  <p className="text-2xs text-text-muted mt-0.5">
                    Requires calibration certificate before delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <Textarea
              id="description"
              label="Detailed Scope & Features"
              rows={3}
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Accurate reference plane for inspection and marking; base for mounting gauging systems..."
              hint="Technical summary, applications, and operating notes"
            />
          </div>
        </CollapsibleCard>

        {/* ── Sticky Bottom Action Bar ── */}
        <FormActionsBar>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-text-muted">
              {isEditMode
                ? 'Changes will be saved to this product version.'
                : 'New products are created in Pending approval status.'}
            </span>
            <div className="flex items-center gap-2">
              <CancelButton
                onClick={() => navigate(isEditMode ? `/products/${id}` : '/products')}
                disabled={isSaving}
              />
              <SaveButton
                onClick={handleSubmit}
                loading={isSaving}
                label={isEditMode ? 'Update Product' : 'Register Product'}
              />
            </div>
          </div>
        </FormActionsBar>
      </form>

      {/* ── Modal: Add / Edit Variant (Deferred Staging) ── */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setEditingVariantIndex(null);
        }}
        title={editingVariantIndex !== null ? 'Edit Variant' : 'Add Product Variant'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!variantForm.variantCode?.trim()) {
              toast.error('Variant code is required');
              return;
            }
            if (editingVariantIndex !== null) {
              setVariants((prev) => {
                const next = [...prev];
                const existing = next[editingVariantIndex];
                const statusChanged =
                  existing.isActive !== undefined &&
                  Boolean(existing.isActive) !== Boolean(variantForm.isActive);
                next[editingVariantIndex] = {
                  ...existing,
                  variantCode: variantForm.variantCode.trim(),
                  gradeId: variantForm.gradeId ? Number(variantForm.gradeId) : null,
                  lengthMm: variantForm.lengthMm !== '' && variantForm.lengthMm !== null ? variantForm.lengthMm : null,
                  widthMm: variantForm.widthMm !== '' && variantForm.widthMm !== null ? variantForm.widthMm : null,
                  heightMm: variantForm.heightMm !== '' && variantForm.heightMm !== null ? variantForm.heightMm : null,
                  diameterMm: variantForm.diameterMm !== '' && variantForm.diameterMm !== null ? variantForm.diameterMm : null,
                  isActive: Boolean(variantForm.isActive),
                  _isModified: existing.id ? true : existing._isModified,
                  _isStatusChanged: existing.id ? (existing._isStatusChanged || statusChanged) : false,
                };
                return next;
              });
              toast.success('Variant updated');
            } else {
              setVariants((prev) => [
                ...prev,
                {
                  _tempId: Date.now() + Math.random(),
                  _isNew: true,
                  variantCode: variantForm.variantCode.trim(),
                  gradeId: variantForm.gradeId ? Number(variantForm.gradeId) : null,
                  lengthMm: variantForm.lengthMm !== '' && variantForm.lengthMm !== null ? variantForm.lengthMm : null,
                  widthMm: variantForm.widthMm !== '' && variantForm.widthMm !== null ? variantForm.widthMm : null,
                  heightMm: variantForm.heightMm !== '' && variantForm.heightMm !== null ? variantForm.heightMm : null,
                  diameterMm: variantForm.diameterMm !== '' && variantForm.diameterMm !== null ? variantForm.diameterMm : null,
                  isActive: Boolean(variantForm.isActive),
                },
              ]);
              toast.success('Variant added');
            }
            setIsVariantModalOpen(false);
            setEditingVariantIndex(null);
          }}
          className="space-y-4"
        >
          <div className="space-y-3">
            <Input
              id="draftVariantCode"
              label="Variant Code"
              required
              value={variantForm.variantCode}
              onChange={(e) =>
                setVariantForm({ ...variantForm, variantCode: e.target.value.toUpperCase() })
              }
              placeholder="e.g. SP-GR-250x250-GR0"
              hint="Unique identifier, e.g. ProductCode + size + grade"
              autoFocus
            />

            <SearchableSelect
              id="draftGradeId"
              name="gradeId"
              label="Accuracy Grade"
              value={variantForm.gradeId || ''}
              onChange={(e) => {
                const val = extractVal(e);
                setVariantForm({ ...variantForm, gradeId: val ? Number(val) : '' });
              }}
              options={gradeOptions}
              placeholder="Select Grade"
              hint="Accuracy grade rating (optional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="draftLengthMm"
                label="Length (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.lengthMm}
                onChange={(e) => setVariantForm({ ...variantForm, lengthMm: e.target.value })}
                placeholder="Optional"
              />
              <Input
                id="draftWidthMm"
                label="Width (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.widthMm}
                onChange={(e) => setVariantForm({ ...variantForm, widthMm: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="draftHeightMm"
                label="Height (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.heightMm}
                onChange={(e) => setVariantForm({ ...variantForm, heightMm: e.target.value })}
                placeholder="Optional"
              />
              <Input
                id="draftDiameterMm"
                label="Diameter (mm)"
                type="number"
                step="0.01"
                min="0.01"
                value={variantForm.diameterMm}
                onChange={(e) => setVariantForm({ ...variantForm, diameterMm: e.target.value })}
                placeholder="Optional"
              />
            </div>

            {/* Variant Active / Inactive Status Switch inside modal */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-surface/40">
              <div>
                <span className="text-xs font-semibold text-heading block">Variant Status</span>
                <p className="text-2xs text-text-muted">
                  {variantForm.isActive
                    ? 'Active variant available for quotation and orders.'
                    : 'Inactive variant hidden from inquiries.'}
                </p>
              </div>
              <StatusSwitch
                checked={Boolean(variantForm.isActive)}
                onChange={(checked) => setVariantForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton
              size="sm"
              onClick={() => {
                setIsVariantModalOpen(false);
                setEditingVariantIndex(null);
              }}
            />
            <SaveButton
              size="sm"
              label={editingVariantIndex !== null ? 'Update Variant' : 'Add Variant'}
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal: Accuracy Specifications (Aligned with ProductVariantsTab Task 53/58) ── */}
      <Modal
        isOpen={isSpecsModalOpen}
        onClose={() => {
          if (!isSavingSpecs) {
            setIsSpecsModalOpen(false);
            setSelectedVariantIndexForSpecs(null);
          }
        }}
        title={`Accuracy Specifications: ${selectedVariantForSpecs?.variantCode || ''}`}
        size="2xl"
      >
        <div className="space-y-4">
          {/* Standard & Grade Scope Selector Bar */}
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
                    disabled={isSavingSpecs}
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
                    disabled={!selectedStandardId || isSavingSpecs}
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
          </div>

          {isLoadingSpecs ? (
            <div className="h-32 bg-muted/20 animate-pulse rounded-lg" />
          ) : variantSpecs.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-border bg-muted/10 text-muted-foreground text-xs">
              No specifications recorded for this selection yet.{' '}
              Click &quot;Add Spec&quot; to configure.
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
                  <Th className="w-14 text-center">Action</Th>
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
                          disabled={isSavingSpecs}
                        />
                      </td>
                      <td className="p-2">
                        {isExactFlatnessParam && specsScope === 'STANDARD_GRADE' ? (
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
                        {isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title="Flatness is a single total allowable limit (no ± bilateral tolerance)"
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
                        {isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title="Flatness is a single total allowable limit (no ± bilateral tolerance)"
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
                        {isExactFlatnessParam ? (
                          <span
                            className="font-mono text-text-muted text-center block text-xs select-none"
                            title="Flatness is a numeric metrology figure"
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
                            setItemToDelete({
                              type: 'spec',
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
              onClick={() => {
                setIsSpecsModalOpen(false);
                setSelectedVariantIndexForSpecs(null);
              }}
              disabled={isSavingSpecs}
            />
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
          </div>
        </div>
      </Modal>

      {/* ── Modal: Queue Initial Attachment (Create Mode) ── */}
      <Modal
        isOpen={isAttachmentModalOpen}
        onClose={() => setIsAttachmentModalOpen(false)}
        title="Queue Initial Attachment"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!attachmentForm.file) {
              toast.error('Please choose a file');
              return;
            }
            if (!attachmentForm.documentTypeId) {
              toast.error('Document Type is required');
              return;
            }
            setDraftAttachments((prev) => [
              ...prev,
              {
                ...attachmentForm,
                documentTypeId: Number(attachmentForm.documentTypeId),
              },
            ]);
            setIsAttachmentModalOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-3">
            <SearchableSelect
              id="draftDocTypeId"
              name="documentTypeId"
              label="Document Type"
              required
              value={attachmentForm.documentTypeId || ''}
              onChange={(e) => {
                const val = extractVal(e);
                setAttachmentForm({
                  ...attachmentForm,
                  documentTypeId: val ? Number(val) : '',
                });
              }}
              options={docTypeOptions}
              placeholder="Select Document Type"
            />

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Attachment File <span className="text-danger">*</span>
              </label>
              <input
                type="file"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setAttachmentForm((prev) => ({
                      ...prev,
                      file: f,
                      documentName: prev.documentName || f.name.replace(/\.[^/.]+$/, ''),
                    }));
                  }
                }}
                className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>

            <Input
              id="draftDocTitle"
              label="Document Title"
              value={attachmentForm.documentTitle}
              onChange={(e) =>
                setAttachmentForm({ ...attachmentForm, documentTitle: e.target.value })
              }
              placeholder="e.g. Precision Calibration Sheet"
            />

            <Textarea
              id="draftRemarks"
              label="Remarks"
              rows={2}
              value={attachmentForm.remarks}
              onChange={(e) =>
                setAttachmentForm({ ...attachmentForm, remarks: e.target.value })
              }
              placeholder="Optional notes or revision number..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton size="sm" onClick={() => setIsAttachmentModalOpen(false)} />
            <SaveButton size="sm" label="Queue Document" />
          </div>
        </form>
      </Modal>

      {/* ── Deletion Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Remove ${
          itemToDelete?.type === 'variant'
            ? 'Variant'
            : itemToDelete?.type === 'attachment'
            ? 'Attachment'
            : 'Specification Parameter'
        }`}
        message={`Are you sure you want to remove "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
