/**
 * ProductPriceModal.jsx — Modal dialog for adding or editing a Product Price configuration.
 * Aligned with ProductPrice-Taxation-API.md § 2.4 and ProductPriceList.md § 2.3 - 2.4.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  SaveButton,
  CancelButton,
  Input,
  SearchableSelect,
  Textarea,
  StatusSwitch,
  Badge,
} from '../../../components/ui';
import {
  IconTag,
  IconProduct,
  IconCheck,
  IconCreditCard,
} from '../../../constants/icons';
import { productService } from '../../../services';
import ProductSelect from './ProductSelect';

export default function ProductPriceModal({
  isOpen,
  onClose,
  onSuccess,
  priceData = null, // null for Add, ProductPrice object for Edit
  lookups = {},
}) {
  const isEdit = Boolean(priceData?.id);

  // Form State
  const [productId, setProductId] = useState('');
  const [productVariantId, setProductVariantId] = useState('');
  const [standardId, setStandardId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [deliveryWeeks, setDeliveryWeeks] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dynamic lookup states based on selected product
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [productStandards, setProductStandards] = useState([]);
  const [isLoadingProductMeta, setIsLoadingProductMeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all products for the picker (when adding)
  useEffect(() => {
    let isMounted = true;
    async function fetchProducts() {
      try {
        const res = await productService.listProducts({ pageSize: 100 });
        if (isMounted && res?.items) {
          setAllProducts(res.items);
        }
      } catch (e) {
        console.warn('Failed to load products list for price modal:', e);
      }
    }
    if (isOpen) {
      fetchProducts();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Default currency to INR
  const defaultCurrencyId = useMemo(() => {
    const inr = (lookups?.currencies || []).find(
      (c) => c.currencyCode?.toUpperCase() === 'INR' || c.currencyName?.toUpperCase() === 'INDIAN RUPEE'
    );
    return inr ? String(inr.id) : (lookups?.currencies?.[0]?.id ? String(lookups.currencies[0].id) : '');
  }, [lookups?.currencies]);

  // Load details of selected product (variants, linked standards)
  const loadProductMeta = useCallback(async (pId) => {
    if (!pId) {
      setSelectedProduct(null);
      setProductVariants([]);
      setProductStandards([]);
      return;
    }
    setIsLoadingProductMeta(true);
    try {
      const [fullProd, variantsRes] = await Promise.all([
        productService.getProductById(pId).catch(() => null),
        productService.listProductVariants(pId, { pageSize: 100 }).catch(() => ({ items: [] })),
      ]);

      if (fullProd) {
        setSelectedProduct(fullProd);
        setProductStandards(fullProd.standards || []);
      }
      if (variantsRes?.items) {
        setProductVariants(variantsRes.items);
      }
    } catch (err) {
      console.warn('Error loading product meta for price modal:', err);
    } finally {
      setIsLoadingProductMeta(false);
    }
  }, []);

  // Initialize form when opening / changing priceData
  useEffect(() => {
    if (isOpen) {
      if (priceData) {
        setProductId(String(priceData.productId || ''));
        setProductVariantId(priceData.productVariantId ? String(priceData.productVariantId) : '');
        setStandardId(priceData.standardId ? String(priceData.standardId) : '');
        setGradeId(priceData.gradeId ? String(priceData.gradeId) : '');
        setUnitPrice(priceData.unitPrice !== undefined && priceData.unitPrice !== null ? String(priceData.unitPrice) : '');
        setCurrencyId(priceData.currencyId ? String(priceData.currencyId) : defaultCurrencyId);
        setDeliveryWeeks(
          priceData.deliveryWeeks !== undefined && priceData.deliveryWeeks !== null
            ? String(priceData.deliveryWeeks)
            : ''
        );
        setRemarks(priceData.remarks || '');
        setIsActive(priceData.isActive !== false);

        if (priceData.productId) {
          loadProductMeta(priceData.productId);
        }
      } else {
        // Reset for Add
        setProductId('');
        setProductVariantId('');
        setStandardId('');
        setGradeId('');
        setUnitPrice('');
        setCurrencyId(defaultCurrencyId);
        setDeliveryWeeks('');
        setRemarks('');
        setIsActive(true);
        setSelectedProduct(null);
        setProductVariants([]);
        setProductStandards([]);
      }
    }
  }, [isOpen, priceData, defaultCurrencyId, loadProductMeta]);

  // When product changes in Add mode
  const handleProductChange = (val) => {
    const newId = val?.target?.value !== undefined ? val.target.value : val;
    setProductId(newId);
    setProductVariantId('');
    setStandardId('');
    setGradeId('');
    if (newId) {
      loadProductMeta(newId);
    }
  };

  // When standard changes, validate/reset grade
  const handleStandardChange = (val) => {
    const newId = val?.target?.value !== undefined ? val.target.value : val;
    setStandardId(newId);
    setGradeId('');
  };

  // Mapped grades for the selected standard
  const availableGrades = useMemo(() => {
    if (!standardId) {
      // If no standard is selected, show all grades from lookups
      return lookups?.grades || [];
    }
    const stdNum = Number(standardId);
    // Find linked standard on product or standard lookups
    const match = (lookups?.standards || []).find((s) => Number(s.id) === stdNum);
    if (match?.grades && Array.isArray(match.grades)) {
      return match.grades;
    }
    return lookups?.grades || [];
  }, [standardId, lookups]);

  // Options for Dropdowns
  const productOptions = useMemo(() => {
    return allProducts.map((p) => ({
      value: String(p.id),
      label: `${p.productCode} — ${p.productName}`,
    }));
  }, [allProducts]);

  const variantOptions = useMemo(() => {
    const list = productVariants.map((v) => ({
      value: String(v.id || v.productVariantId),
      label: `${v.variantCode || v.sizeLabel || 'Variant #' + (v.id || v.productVariantId)}`,
    }));

    if (priceData?.productVariantId && priceData?.variantCode) {
      const exists = list.some((item) => String(item.value) === String(priceData.productVariantId));
      if (!exists) {
        list.unshift({
          value: String(priceData.productVariantId),
          label: priceData.variantCode,
        });
      }
    }

    return [{ value: '', label: '-- None (Base Product) --' }, ...list];
  }, [productVariants, priceData]);

  const standardOptions = useMemo(() => {
    // Only standards linked to this product (if loaded), else all lookups standards
    const source = productStandards.length > 0 ? productStandards : lookups?.standards || [];
    const list = source.map((s) => ({
      value: String(s.standardId || s.id),
      label: s.standardCode || s.name || `Standard #${s.standardId || s.id}`,
    }));

    if (priceData?.standardId && priceData?.standardCode) {
      const exists = list.some((item) => String(item.value) === String(priceData.standardId));
      if (!exists) {
        list.unshift({
          value: String(priceData.standardId),
          label: priceData.standardCode,
        });
      }
    }

    return [{ value: '', label: '-- No Standard --' }, ...list];
  }, [productStandards, lookups?.standards, priceData]);

  const gradeOptions = useMemo(() => {
    const list = availableGrades.map((g) => ({
      value: String(g.gradeId || g.id),
      label: g.gradeCode || g.name || `Grade #${g.gradeId || g.id}`,
    }));
    return [{ value: '', label: '-- No Grade --' }, ...list];
  }, [availableGrades]);

  const currencyOptions = useMemo(() => {
    return (lookups?.currencies || []).map((c) => ({
      value: String(c.id),
      label: `${c.currencyCode} (${c.currencySymbol || c.currencyCode})`,
    }));
  }, [lookups?.currencies]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!productId) {
      toast.error('Please select a Product');
      return;
    }

    if (productVariants.length > 0 && !productVariantId) {
      toast.error('This product has active variants. Please select a Variant.');
      return;
    }

    const priceNum = parseFloat(unitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid unit price (>= 0)');
      return;
    }

    const payload = {
      productVariantId: productVariantId ? Number(productVariantId) : null,
      standardId: standardId ? Number(standardId) : null,
      gradeId: gradeId ? Number(gradeId) : null,
      unitPrice: Math.round(priceNum * 100) / 100,
      currencyId: currencyId ? Number(currencyId) : null,
      deliveryWeeks: deliveryWeeks !== '' ? Number(deliveryWeeks) : null,
      remarks: remarks?.trim() || null,
      isActive: Boolean(isActive),
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await productService.updateProductPrice(priceData.id, payload);
        toast.success('Product price updated successfully');
      } else {
        await productService.createProductPrice(productId, payload);
        toast.success('Product price created successfully');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to save product price');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Price Configuration' : 'Add Price Configuration'}
      subtitle={
        isEdit
          ? `Update list price for ${priceData?.productCode || 'Product'}`
          : 'Define list price and lead time for a product configuration'
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        {isEdit ? (
          <div className="mf-field">
            <label className="mf-label">
              Product <span className="mf-required" aria-hidden="true">*</span>
            </label>
            <div className="p-3 bg-surface/80 rounded-xl border border-border flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary mr-2">
                  {priceData?.productCode}
                </span>
                <span className="text-xs font-semibold text-heading">
                  {priceData?.productName}
                </span>
                {priceData?.categoryName && (
                  <span className="text-2xs text-text-muted block mt-0.5">
                    Category: {priceData.categoryName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ProductSelect
            id="modal-product"
            name="productId"
            label="Product"
            required
            value={productId}
            onChange={handleProductChange}
            placeholder="Select a product..."
            disabled={isLoadingProductMeta}
            isActive={true}
          />
        )}

        {/* Configuration Row: Variant & Standard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <SearchableSelect
              label="Product Variant / Size"
              required={productVariants.length > 0}
              options={variantOptions}
              value={productVariantId}
              onChange={(val) => setProductVariantId(val?.target?.value ?? val)}
              disabled={isEdit || !productId || isLoadingProductMeta}
              placeholder="Select variant / size..."
            />
            {productVariants.length === 0 && productId && !isLoadingProductMeta && (
              <span className="text-3xs text-text-muted mt-1 block">
                This product has no fixed variants. Base pricing applies.
              </span>
            )}
          </div>

          <div>
            <SearchableSelect
              label="Standard"
              options={standardOptions}
              value={standardId}
              onChange={(val) => handleStandardChange(val?.target?.value ?? val)}
              disabled={!productId || isLoadingProductMeta}
              placeholder="Select standard..."
            />
          </div>
        </div>

        {/* Configuration Row: Grade & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <SearchableSelect
            label="Precision Grade"
            options={gradeOptions}
            value={gradeId}
            onChange={(val) => setGradeId(val?.target?.value ?? val)}
            disabled={!productId || isLoadingProductMeta}
            placeholder="Select grade..."
          />

          <SearchableSelect
            label="Currency"
            options={currencyOptions}
            value={currencyId}
            onChange={(val) => setCurrencyId(val?.target?.value ?? val)}
            placeholder="Select currency..."
          />
        </div>

        {/* Price & Delivery Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border/60">
          <div>
            <Input
              label="Unit List Price"
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="font-mono font-bold"
              hint="Unit price excluding taxes and shipping charges."
            />
          </div>

          <div>
            <Input
              label="Delivery Lead Time (Weeks)"
              type="number"
              min="0"
              max="520"
              placeholder="e.g. 3"
              value={deliveryWeeks}
              onChange={(e) => setDeliveryWeeks(e.target.value)}
            />
          </div>
        </div>

        {/* Remarks */}
        <Textarea
          label="Pricing Remarks"
          rows={2}
          maxLength={500}
          placeholder="e.g. Includes calibration certificate and standard wooden casing"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        {/* Status Switch */}
        <div className="pt-2 flex items-center justify-between border-t border-border/60">
          <div>
            <span className="text-xs font-semibold text-heading block">Active Pricing</span>
            <span className="text-2xs text-text-muted">
              Only active prices are suggested for quotations and order confirmations.
            </span>
          </div>
          <StatusSwitch
            checked={isActive}
            onChange={(checked) => setIsActive(checked)}
            label={isActive ? 'Active' : 'Inactive'}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <CancelButton type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </CancelButton>
          <SaveButton type="submit" loading={isSubmitting}>
            {isEdit ? 'Update Price' : 'Save Price'}
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}
