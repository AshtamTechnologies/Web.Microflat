/**
 * src/services/products/productService.js — Real Products service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { PRODUCT_ENDPOINTS } from './productEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import { productFromApi, productToApiPayload } from '../../models/products/productModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  delete: true,
  status: true,
  approval: true,
  variants: true,
  options: true,
  standards: true,
  attachments: true,
};

/**
 * Paged list of products, filtered by query params.
 * GET /api/products
 *
 * Query params (matching Swagger):
 *  - Search: string
 *  - CategoryId: number
 *  - MaterialId: number
 *  - UomId: number
 *  - ApprovalStatus: number
 *  - IsActive: boolean
 *  - PageNumber: number
 *  - PageSize: number
 */
export async function listProducts(params = {}) {
  try {
    const query = {};

    const search = params.Search ?? params.search;
    if (search !== undefined && search !== null && String(search).trim() !== '') {
      query.Search = String(search).trim();
    }

    const categoryId = params.CategoryId ?? params.categoryId;
    if (
      categoryId !== undefined &&
      categoryId !== null &&
      categoryId !== '' &&
      String(categoryId).toUpperCase() !== 'ALL' &&
      !isNaN(Number(categoryId))
    ) {
      query.CategoryId = Number(categoryId);
    }

    const materialId = params.MaterialId ?? params.materialId;
    if (
      materialId !== undefined &&
      materialId !== null &&
      materialId !== '' &&
      String(materialId).toUpperCase() !== 'ALL' &&
      !isNaN(Number(materialId))
    ) {
      query.MaterialId = Number(materialId);
    }

    const uomId = params.UomId ?? params.uomId;
    if (
      uomId !== undefined &&
      uomId !== null &&
      uomId !== '' &&
      String(uomId).toUpperCase() !== 'ALL' &&
      !isNaN(Number(uomId))
    ) {
      query.UomId = Number(uomId);
    }

    const approvalStatus = params.ApprovalStatus ?? params.approvalStatus;
    if (
      approvalStatus !== undefined &&
      approvalStatus !== null &&
      approvalStatus !== '' &&
      String(approvalStatus).toUpperCase() !== 'ALL' &&
      !isNaN(Number(approvalStatus))
    ) {
      query.ApprovalStatus = Number(approvalStatus);
    }

    const act = params.IsActive ?? params.isActive;
    if (act !== undefined && act !== null && act !== 'ALL') {
      if (typeof act === 'boolean') {
        query.IsActive = act;
      } else {
        const s = String(act).trim().toUpperCase();
        if (s === 'ACTIVE' || s === 'TRUE') query.IsActive = true;
        else if (s === 'INACTIVE' || s === 'FALSE') query.IsActive = false;
      }
    }

    const pageNumber = params.PageNumber ?? params.pageNumber ?? 1;
    query.PageNumber =
      !isNaN(Number(pageNumber)) && Number(pageNumber) > 0 ? Number(pageNumber) : 1;

    const pageSize = params.PageSize ?? params.pageSize ?? 10;
    query.PageSize = !isNaN(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 10;

    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.PRODUCTS, { params: query });
    const data = res?.data || {};
    const rawItems = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

    return {
      items: rawItems.map(productFromApi),
      totalCount: data.totalCount ?? rawItems.length,
      pageNumber: data.pageNumber ?? query.PageNumber,
      pageSize: data.pageSize ?? query.PageSize,
      totalPages: data.totalPages ?? Math.ceil((data.totalCount ?? rawItems.length) / (query.PageSize || 10)),
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns dashboard counts: total, by approval status, active/inactive, variants.
 * GET /api/products/summary
 */
export async function getProductSummary() {
  try {
    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.SUMMARY);
    return res?.data || {};
  } catch (err) {
    console.warn('Could not fetch products summary:', err);
    return null;
  }
}

/**
 * Returns dropdown lookup values: categories, materials, uoms, standards, grades, specParameters, documentTypes, approvalStatuses.
 * GET /api/products/lookups
 */
export async function getProductLookups() {
  try {
    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.LOOKUPS);
    return res?.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single product with standards, options, and attachments.
 * GET /api/products/{id}
 */
export async function getProductById(id) {
  try {
    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.PRODUCT_BY_ID(id));
    return productFromApi(res?.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Product (Pending).
 * POST /api/products
 */
export async function createProduct(formData) {
  try {
    const payload = productToApiPayload(formData);
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.PRODUCTS, payload);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing product.
 * PUT /api/products/{id}
 */
export async function updateProduct(id, formData) {
  try {
    const payload = productToApiPayload(formData);
    const res = await axiosInstance.put(PRODUCT_ENDPOINTS.PRODUCT_BY_ID(id), payload);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a Pending or Rejected product with its sub-entities. Admin only.
 * DELETE /api/products/{id}
 */
export async function deleteProduct(id) {
  try {
    const res = await axiosInstance.delete(PRODUCT_ENDPOINTS.PRODUCT_BY_ID(id));
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Toggles product active status.
 * PATCH /api/products/{id}/status
 */
export async function updateProductStatus(id, isActive) {
  try {
    const res = await axiosInstance.patch(PRODUCT_ENDPOINTS.PRODUCT_STATUS(id), {
      isActive: Boolean(isActive),
    });
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Approves a Pending product.
 * POST /api/products/{id}/approve
 */
export async function approveProduct(id, data = {}) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.APPROVE(id), data);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Rejects a Pending product.
 * POST /api/products/{id}/reject
 */
export async function rejectProduct(id, data = {}) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.REJECT(id), data);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Resubmits a Rejected product back for approval (Pending).
 * POST /api/products/{id}/resubmit
 */
export async function resubmitProduct(id, data = {}) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.RESUBMIT(id), data);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds a variant to a product.
 * POST /api/products/{id}/variants
 * Dimensions in mm must be positive; empty fields sent as null.
 */
export async function addVariant(productId, variantData) {
  try {
    const parseDim = (val) =>
      val !== '' && val !== null && val !== undefined && !isNaN(Number(val)) && Number(val) > 0
        ? Number(val)
        : null;

    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.VARIANTS(productId), {
      variantCode: (variantData.variantCode || '').trim(),
      gradeId: variantData.gradeId ? Number(variantData.gradeId) : null,
      lengthMm: parseDim(variantData.lengthMm),
      widthMm: parseDim(variantData.widthMm),
      heightMm: parseDim(variantData.heightMm),
      diameterMm: parseDim(variantData.diameterMm),
    });
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns paged list of variants for a product.
 * GET /api/product-variants?productId={productId}
 */
export async function listProductVariants(productId, params = {}) {
  try {
    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.PRODUCT_VARIANTS, {
      params: {
        productId: Number(productId),
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 50,
      },
    });
    const data = res?.data || {};
    return {
      items: Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [],
      totalCount: data.totalCount ?? 0,
      pageNumber: data.pageNumber ?? 1,
      pageSize: data.pageSize ?? 50,
      totalPages: data.totalPages ?? 1,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns one variant with its specs.
 * GET /api/product-variants/{id}
 */
export async function getVariantById(id) {
  try {
    const res = await axiosInstance.get(PRODUCT_ENDPOINTS.VARIANT_BY_ID(id));
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Replaces accuracy specs of a variant.
 * PUT /api/product-variants/{id}/specs
 * List of { specParameterId, valueDecimal, valueText, tolerancePlus, toleranceMinus }
 */
export async function setVariantSpecs(variantId, specsList) {
  try {
    const payload = (specsList || []).map((s) => ({
      specParameterId: Number(s.specParameterId),
      valueDecimal:
        s.valueDecimal !== '' && s.valueDecimal !== null && s.valueDecimal !== undefined
          ? Number(s.valueDecimal)
          : null,
      valueText: s.valueText?.trim() || null,
      tolerancePlus:
        s.tolerancePlus !== '' && s.tolerancePlus !== null && s.tolerancePlus !== undefined
          ? Number(s.tolerancePlus)
          : null,
      toleranceMinus:
        s.toleranceMinus !== '' && s.toleranceMinus !== null && s.toleranceMinus !== undefined
          ? Number(s.toleranceMinus)
          : null,
    }));
    const res = await axiosInstance.put(PRODUCT_ENDPOINTS.VARIANT_SPECS(variantId), payload);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds an option to a product.
 * POST /api/products/{id}/options
 */
export async function addOption(productId, optionData) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.OPTIONS(productId), {
      optionName: (optionData.optionName || '').trim(),
      isStandard: Boolean(optionData.isStandard),
    });
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Replaces options list of a product.
 * PUT /api/products/{id}/options
 */
export async function setOptions(productId, optionsList) {
  try {
    const payload = (optionsList || []).map((o) => ({
      optionName: (o.optionName || '').trim(),
      isStandard: Boolean(o.isStandard),
    }));
    const res = await axiosInstance.put(PRODUCT_ENDPOINTS.OPTIONS(productId), payload);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Links a standard to a product.
 * POST /api/products/{id}/standards
 */
export async function addStandard(productId, standardData) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.STANDARDS(productId), {
      standardId: Number(standardData.standardId),
      isPrimary: Boolean(standardData.isPrimary),
    });
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Replaces standards list of a product.
 * PUT /api/products/{id}/standards
 */
export async function setStandards(productId, standardsList) {
  try {
    const payload = (standardsList || []).map((s) => ({
      standardId: Number(s.standardId),
      isPrimary: Boolean(s.isPrimary),
    }));
    const res = await axiosInstance.put(PRODUCT_ENDPOINTS.STANDARDS(productId), payload);
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Uploads an attachment file for a product.
 * POST /api/products/{id}/attachments
 * Multipart form data: DocumentTypeId, DocumentName, DocumentTitle, Remarks, File
 */
export async function uploadAttachment(productId, formData) {
  try {
    const res = await axiosInstance.post(PRODUCT_ENDPOINTS.ATTACHMENTS(productId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res?.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

