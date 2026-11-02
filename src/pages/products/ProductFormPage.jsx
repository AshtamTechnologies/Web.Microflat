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
  IconAdd,
  IconDelete,
} from '../../constants/icons';
import { productService } from '../../services';
import { useProductsContext } from '../../context/ProductsContext';
import ProductStandardsEditor from './components/ProductStandardsEditor';
import ProductOptionsEditor from './components/ProductOptionsEditor';
import ProductVariantsTab from './components/ProductVariantsTab';
import ProductAttachmentsTab from './components/ProductAttachmentsTab';
import { createEmptyProductForm } from '../../models/products/productModel';

function extractVal(e) {
  if (e && typeof e === 'object' && 'target' in e) {
    return e.target?.value !== undefined ? e.target.value : e.target?.checked;
  }
  return e;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { lookups, refreshProducts, loadSummary } = useProductsContext();

  const [form, setForm] = useState(createEmptyProductForm());
  const [errors, setErrors] = useState({});
  const [standards, setStandards] = useState([]);
  const [options, setOptions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [initialIsActive, setInitialIsActive] = useState(true);

  // Draft variants for create mode
  const [draftVariants, setDraftVariants] = useState([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({
    variantCode: '',
    gradeId: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    diameterMm: '',
  });

  // Draft attachments for create mode
  const [draftAttachments, setDraftAttachments] = useState([]);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [attachmentForm, setAttachmentForm] = useState({
    documentTypeId: '',
    documentName: '',
    documentTitle: '',
    remarks: '',
    file: null,
  });

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);

  // Deletion confirmation dialog state
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'variant') {
      setDraftVariants((prev) => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success(`Removed variant "${itemToDelete.name}"`);
    } else if (itemToDelete.type === 'attachment') {
      setDraftAttachments((prev) => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success(`Removed attachment "${itemToDelete.name}"`);
    }
    setItemToDelete(null);
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

  const reloadAttachments = async () => {
    if (!id) return;
    try {
      const data = await productService.getProductById(id);
      if (data?.attachments) {
        setAttachments(data.attachments);
      }
    } catch (err) {
      console.warn('Could not reload attachments:', err);
    }
  };

  // Load product if edit mode
  useEffect(() => {
    if (!isEditMode) return;
    let isMounted = true;

    async function fetchProduct() {
      setIsLoading(true);
      try {
        const data = await productService.getProductById(id);
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

        const stds = (data.standards || []).map((s) => ({
          standardId: Number(s.standardId || s.id),
          standardCode: s.standardCode || '',
          isPrimary: Boolean(s.isPrimary),
        }));
        setStandards(stds);

        const opts = (data.options || []).map((o) => ({
          optionName: o.optionName || '',
          isStandard: Boolean(o.isStandard),
        }));
        setOptions(opts);

        setAttachments(data.attachments || []);
        setIsActive(Boolean(data.isActive));
        setInitialIsActive(Boolean(data.isActive));
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

        // 4. Update options
        await productService.setOptions(
          productId,
          options.filter((o) => o.optionName?.trim())
        );

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

        // 4. Link initial variants if any defined
        if (productId && draftVariants.length > 0) {
          for (const v of draftVariants) {
            try {
              await productService.addVariant(productId, v);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
            <div className="md:col-span-2">
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
            </div>

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
            <div className="md:col-span-2">
              <Input
                id="finishType"
                label="Finish Type"
                value={form.finishType}
                onChange={(e) => handleFieldChange('finishType', e.target.value)}
                placeholder="e.g. Precision Lapped, Hand Lapped, Hard Anodized"
                hint="Surface treatment and mechanical finish specification"
              />
            </div>

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

        {/* ── Section 2: Quality & Manufacturing Flags ── */}
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

        {/* ── Section 5: Product Variants & Specifications ── */}
        <CollapsibleCard
          title="Product Variants & Dimensions"
          subtitle="Physical sizes, grades, and dimensional figures"
          icon={<IconLayers size={18} />}
          defaultOpen={true}
        >
          {isEditMode ? (
            <ProductVariantsTab
              productId={id}
              grades={lookups?.grades || []}
              specParameters={lookups?.specParameters || []}
              onVariantAdded={() => refreshProducts?.()}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-heading">Initial Variants & Sizes</h4>
                  <p className="text-2xs text-text-muted">You can define product sizes now or add them later after registration.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVariantForm({
                      variantCode: form.productCode ? `${form.productCode}-` : '',
                      gradeId: '',
                      lengthMm: '',
                      widthMm: '',
                      heightMm: '',
                      diameterMm: '',
                    });
                    setIsVariantModalOpen(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <IconAdd size={14} />
                  <span>Add Variant</span>
                </Button>
              </div>

              {draftVariants.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-border bg-surface/30 text-text-muted text-xs">
                  No variants added yet. Click &quot;Add Variant&quot; above to configure initial dimensions and grades.
                </div>
              ) : (
                <TableContainer
                  className="border border-border rounded-lg overflow-hidden"
                  tableClassName="w-full text-xs table-auto"
                >
                  <thead>
                    <tr className="bg-surface/50 border-b border-border">
                      <Th>Variant Code</Th>
                      <Th>Grade</Th>
                      <Th className="text-right">Length (mm)</Th>
                      <Th className="text-right">Width (mm)</Th>
                      <Th className="text-right">Height (mm)</Th>
                      <Th className="text-right">Diameter (mm)</Th>
                      <Th className="w-16 text-center">Action</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draftVariants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="p-2.5 font-mono font-medium text-heading">{v.variantCode}</td>
                        <td className="p-2.5">
                          {lookups?.grades?.find((g) => Number(g.id) === Number(v.gradeId))?.gradeCode || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono">{v.lengthMm || '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.widthMm || '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.heightMm || '—'}</td>
                        <td className="p-2.5 text-right font-mono">{v.diameterMm || '—'}</td>
                        <td className="p-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              setItemToDelete({
                                type: 'variant',
                                index: idx,
                                name: v.variantCode || `Variant #${idx + 1}`,
                              })
                            }
                            className="text-danger hover:bg-danger/10"
                            title="Remove variant"
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
          )}
        </CollapsibleCard>

        {/* ── Section 6: Technical Documents & Attachments ── */}
        <CollapsibleCard
          title="Technical Documents & Attachments"
          subtitle="CAD drawings, calibration certificates, and datasheets"
          icon={<IconFileText size={18} />}
          defaultOpen={true}
        >
          {isEditMode ? (
            <ProductAttachmentsTab
              productId={id}
              attachments={attachments}
              documentTypes={lookups?.documentTypes || []}
              onAttachmentUploaded={reloadAttachments}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-heading">Initial Documents & Files</h4>
                  <p className="text-2xs text-text-muted">Queue technical drawings, datasheets, or certificates to be uploaded upon creation.</p>
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

              {draftAttachments.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-border bg-surface/30 text-text-muted text-xs">
                  No documents queued yet. Click &quot;Add Document&quot; above to select files.
                </div>
              ) : (
                <TableContainer
                  className="border border-border rounded-lg overflow-hidden"
                  tableClassName="w-full text-xs table-auto"
                >
                  <thead>
                    <tr className="bg-surface/50 border-b border-border">
                      <Th>File Name</Th>
                      <Th>Document Type</Th>
                      <Th>Title</Th>
                      <Th className="text-right">Size</Th>
                      <Th className="w-16 text-center">Action</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draftAttachments.map((att, idx) => (
                      <tr key={idx} className="hover:bg-surface/30">
                        <td className="p-2.5 font-medium text-heading flex items-center gap-2">
                          <IconFileText size={16} className="text-primary shrink-0" />
                          <span className="truncate max-w-xs">{att.file?.name}</span>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="neutral" size="xs">
                            {lookups?.documentTypes?.find((d) => Number(d.id) === Number(att.documentTypeId))?.typeName || `Type #${att.documentTypeId}`}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-text-muted">{att.documentTitle || att.documentName || '—'}</td>
                        <td className="p-2.5 text-right font-mono text-text-muted">
                          {att.file?.size ? `${(att.file.size / 1024).toFixed(1)} KB` : '—'}
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
                            title="Remove attachment"
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
          )}
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

      {/* ── Modal: Add Initial Variant (Create Mode) ── */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title="Add Initial Product Variant"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!variantForm.variantCode?.trim()) {
              toast.error('Variant code is required');
              return;
            }
            setDraftVariants((prev) => [
              ...prev,
              {
                ...variantForm,
                variantCode: variantForm.variantCode.trim(),
                gradeId: variantForm.gradeId ? Number(variantForm.gradeId) : null,
              },
            ]);
            setIsVariantModalOpen(false);
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
                step="any"
                min="0.01"
                value={variantForm.lengthMm}
                onChange={(e) => setVariantForm({ ...variantForm, lengthMm: e.target.value })}
                placeholder="Optional"
              />
              <Input
                id="draftWidthMm"
                label="Width (mm)"
                type="number"
                step="any"
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
                step="any"
                min="0.01"
                value={variantForm.heightMm}
                onChange={(e) => setVariantForm({ ...variantForm, heightMm: e.target.value })}
                placeholder="Optional"
              />
              <Input
                id="draftDiameterMm"
                label="Diameter (mm)"
                type="number"
                step="any"
                min="0.01"
                value={variantForm.diameterMm}
                onChange={(e) => setVariantForm({ ...variantForm, diameterMm: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton size="sm" onClick={() => setIsVariantModalOpen(false)} />
            <SaveButton size="sm" label="Add Variant" />
          </div>
        </form>
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
        title={`Remove ${itemToDelete?.type === 'variant' ? 'Variant' : 'Attachment'}`}
        message={`Are you sure you want to remove "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
