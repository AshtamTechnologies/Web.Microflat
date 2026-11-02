/**
 * productModel.js — Product typedefs, normalizers, and payload serializers.
 */

import { ApprovalStatus } from '../../constants/approvalStatus';

/**
 * Creates an empty Product form model for new product registration.
 */
export function createEmptyProductForm() {
  return {
    productCode: '',
    productName: '',
    categoryId: '',
    materialId: '',
    finishType: '',
    uomId: '',
    description: '',
    isStandardProduct: true,
    isCustomSizeAllowed: false,
    requiresCalibration: false,
    // Child collections for initial creation (optional)
    standards: [],
    options: [],
  };
}

/**
 * Normalizes an API Product DTO into frontend model.
 */
export function productFromApi(dto) {
  if (!dto) return null;

  return {
    id: dto.id ?? 0,
    productCode: dto.productCode || '',
    productName: dto.productName || '',
    categoryId: dto.categoryId ?? null,
    categoryCode: dto.categoryCode || '',
    categoryName: dto.categoryName || '',
    materialId: dto.materialId ?? null,
    materialName: dto.materialName || '',
    finishType: dto.finishType || '',
    uomId: dto.uomId ?? null,
    uomName: dto.uomName || '',
    description: dto.description || '',
    isStandardProduct: Boolean(dto.isStandardProduct),
    isCustomSizeAllowed: Boolean(dto.isCustomSizeAllowed),
    requiresCalibration: Boolean(dto.requiresCalibration),
    approvalStatus: dto.approvalStatus ?? ApprovalStatus.Draft,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    primaryStandardCode: dto.primaryStandardCode || null,
    variantCount: dto.variantCount ?? 0,
    createdOn: dto.createdOn || dto.createdAt || '',
    lastUpdatedOn: dto.lastUpdatedOn || dto.updatedAt || null,
    standards: Array.isArray(dto.standards) ? dto.standards : [],
    options: Array.isArray(dto.options) ? dto.options : [],
    attachments: Array.isArray(dto.attachments) ? dto.attachments : [],
  };
}

/**
 * Transforms form state to POST/PUT /api/products payload.
 */
export function productToApiPayload(form) {
  const parseNumOr = (val, fallback = null) => {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };

  return {
    productCode: (form.productCode || '').trim().toUpperCase(),
    productName: (form.productName || '').trim(),
    categoryId: parseNumOr(form.categoryId, 0),
    materialId: parseNumOr(form.materialId, null),
    finishType: (form.finishType || '').trim() || null,
    uomId: parseNumOr(form.uomId, 0),
    description: (form.description || '').trim(),
    isStandardProduct: Boolean(form.isStandardProduct),
    isCustomSizeAllowed: Boolean(form.isCustomSizeAllowed),
    requiresCalibration: Boolean(form.requiresCalibration),
  };
}

