/**
 * src/services/inquiries/inquiryService.mock.js
 * In-memory Mock Inquiry service for offline development and testing.
 * Implements identical function signatures as inquiryService.js.
 */

import { mockInquiries } from '../../mocks/inquiries';
import { mockInquiryDocuments } from '../../mocks/inquiryDocuments';
import { INQUIRY_CATALOG_PRODUCTS, INQUIRY_CATALOG_CATEGORIES } from '../../mocks/inquiryCatalog';
import {
  inquiryListItemFromApi,
  inquiryDetailFromApi,
  inquiryProductFromApi,
  inquiryAttachmentFromApi,
  inquiryActivityFromApi,
} from '../../models/inquiries/inquiryModel';

let inMemoryInquiries = [...mockInquiries];
let inMemoryAttachments = [...mockInquiryDocuments];
let nextInquirySeq = inMemoryInquiries.length + 101 + 1;
let nextId = inMemoryInquiries.length + 100;

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
  assign: true,
  catalog: true,
  productLines: true,
  attachments: true,
  activities: true,
};

export async function listInquiries(params = {}) {
  await new Promise((r) => setTimeout(r, 120));
  let filtered = [...inMemoryInquiries];

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        (i.inquiryNo || i.InquiryNo)?.toLowerCase().includes(q) ||
        (i.companyName || i.CustomerName)?.toLowerCase().includes(q) ||
        (i.contactPersonName || i.ContactPerson)?.toLowerCase().includes(q) ||
        (i.email || i.Email)?.toLowerCase().includes(q) ||
        (i.mobileNo || i.Phone)?.includes(q)
    );
  }

  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter(
      (i) => (i.status || i.StatusId)?.toLowerCase() === params.status.toLowerCase()
    );
  }

  if (params.regionId) {
    filtered = filtered.filter((i) => String(i.regionId || i.RegionId) === String(params.regionId));
  }

  if (params.priorityLevelId && params.priorityLevelId !== 'ALL') {
    filtered = filtered.filter((i) => String(i.priorityLevelId) === String(params.priorityLevelId));
  }

  if (params.assignedToUserId) {
    filtered = filtered.filter((i) => String(i.assignedToUserId || i.AssignedTo) === String(params.assignedToUserId));
  }

  const totalCount = filtered.length;
  const pageNumber = Number(params.pageNumber) || 1;
  const pageSize = Number(params.pageSize) || 20;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const pagedItems = filtered.slice(start, start + pageSize).map(inquiryListItemFromApi);

  return {
    items: pagedItems,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getInquirySummary() {
  await new Promise((r) => setTimeout(r, 60));
  const total = inMemoryInquiries.length;
  const newCount = inMemoryInquiries.filter((i) => (i.status || i.StatusId) === 'New').length;
  const quoting = inMemoryInquiries.filter((i) => (i.status || i.StatusId) === 'Quoting' || (i.status || i.StatusId) === 'Quoted').length;
  const won = inMemoryInquiries.filter((i) => (i.status || i.StatusId) === 'Won' || (i.status || i.StatusId) === 'Order Confirm').length;
  const lost = inMemoryInquiries.filter((i) => (i.status || i.StatusId) === 'Lost' || (i.status || i.StatusId) === 'Rejected').length;

  return {
    total,
    new: newCount,
    quoting,
    won,
    lost,
    active: total,
    inactive: 0,
    assignedToMe: 4,
  };
}

export async function getInquiryLookups() {
  await new Promise((r) => setTimeout(r, 60));
  return {
    regions: [
      { id: 1, regionName: 'West', isActive: true },
      { id: 2, regionName: 'South', isActive: true },
      { id: 3, regionName: 'North', isActive: true },
      { id: 4, regionName: 'East', isActive: true },
      { id: 5, regionName: 'Central', isActive: true },
      { id: 6, regionName: 'Export', isActive: true },
    ],
    sources: [
      { id: 1, sourceName: 'Website', isActive: true },
      { id: 2, sourceName: 'Email', isActive: true },
      { id: 3, sourceName: 'Phone', isActive: true },
      { id: 4, sourceName: 'Distributor', isActive: true },
    ],
    priorities: [
      { id: 1, priorityName: 'Low', displayOrder: 1, isActive: true },
      { id: 2, priorityName: 'Medium', displayOrder: 2, isActive: true },
      { id: 3, priorityName: 'High', displayOrder: 3, isActive: true },
    ],
    defaultPriorityLevelId: 2,
    countries: [
      { id: 1, countryName: 'India', isActive: true, stateCount: 36 },
      { id: 2, countryName: 'Germany', isActive: true, stateCount: 16 },
      { id: 3, countryName: 'Qatar', isActive: true, stateCount: 8 },
    ],
    productCategories: INQUIRY_CATALOG_CATEGORIES.map((c, idx) => ({
      id: idx + 1,
      categoryCode: c.value,
      categoryName: c.label,
      parentCategoryId: null,
    })),
    users: [
      { id: 1, name: 'Ian Chesnut', email: 'ian@microflat.com' },
      { id: 4, name: 'Scott Walter', email: 'scott@microflat.com' },
      { id: 7, name: 'Natali Emanuel', email: 'natali@microflat.com' },
      { id: 11, name: 'Arjun Sharma', email: 'arjun@microflat.com' },
      { id: 12, name: 'Priya Mehta', email: 'priya@microflat.com' },
    ],
    documentTypes: [
      { id: 1, documentTypeName: 'RFQ', maxFileSizeMB: 25, allowedExtensionList: ['.pdf', '.docx'] },
      { id: 2, documentTypeName: 'Drawing', maxFileSizeMB: 25, allowedExtensionList: ['.pdf', '.dwg'] },
      { id: 3, documentTypeName: 'Spec', maxFileSizeMB: 25, allowedExtensionList: ['.pdf', '.docx'] },
      { id: 4, documentTypeName: 'Quotation', maxFileSizeMB: 25, allowedExtensionList: ['.pdf'] },
      { id: 5, documentTypeName: 'PO', maxFileSizeMB: 25, allowedExtensionList: ['.pdf'] },
    ],
    statuses: ['New', 'Deal', 'Quoting', 'Won', 'Lost'],
    activityTypes: ['Created', 'Comment', 'StatusChanged', 'Assigned'],
  };
}

export async function getSources() {
  const lookups = await getInquiryLookups();
  return lookups?.sources || [];
}

export async function getPriorityLevels() {
  const lookups = await getInquiryLookups();
  return lookups?.priorities || [];
}

export async function getNextInquiryNumber(inquiryDate) {
  await new Promise((r) => setTimeout(r, 40));
  const yr = inquiryDate ? new Date(inquiryDate).getFullYear() : new Date().getFullYear();
  return { documentNumber: `INQ-${yr}-${String(nextInquirySeq).padStart(6, '0')}` };
}

export async function getInquiryById(id) {
  await new Promise((r) => setTimeout(r, 80));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id) || String(i.inquiryNo) === String(id)
  );
  if (!found) {
    const err = new Error('Inquiry not found');
    err.status = 404;
    throw err;
  }
  return inquiryDetailFromApi({
    ...found,
    isEditable: found.status !== 'Won' && found.status !== 'Lost',
    nextStatuses: found.status === 'New' ? ['Quoting', 'Lost'] : found.status === 'Quoting' ? ['New', 'Won', 'Lost'] : ['New'],
  });
}

export async function createInquiry(formData) {
  await new Promise((r) => setTimeout(r, 150));
  const newId = ++nextId;
  const yr = new Date().getFullYear();
  const inquiryNo = `INQ-${yr}-${String(nextInquirySeq++).padStart(6, '0')}`;

  const created = {
    id: newId,
    InquiryId: newId,
    inquiryNo,
    InquiryNo: inquiryNo,
    inquiryDate: formData.inquiryDate || new Date().toISOString().slice(0, 10),
    estimateDate: formData.estimateDate || null,
    regionId: Number(formData.regionId) || 1,
    inquirySourceId: formData.inquirySourceId || 1,
    priorityLevelId: formData.priorityLevelId || 2,
    status: 'New',
    StatusId: 'New',
    isNewClient: Boolean(formData.isNewClient),
    clientId: formData.clientId || null,
    companyName: formData.companyName || 'New Client Ltd',
    contactPersonName: formData.contactPersonName || '',
    email: formData.email || '',
    mobileNo: formData.mobileNo || '',
    city: formData.city || '',
    address1: formData.address1 || '',
    assignedToUserId: formData.assignedToUserId || 1,
    detailedSpecification: formData.detailedSpecification || '',
    products: Array.isArray(formData.products) ? formData.products : [],
    attachments: [],
    activities: [
      {
        id: Date.now(),
        inquiryId: newId,
        activityType: 'Created',
        status: 'New',
        comment: formData.comment || 'Inquiry registered into ERP system.',
        userId: 1,
        userName: 'Ian Chesnut',
        on: new Date().toISOString(),
      },
    ],
    isActive: true,
  };

  inMemoryInquiries.unshift(created);
  return inquiryDetailFromApi(created);
}

export async function updateInquiry(id, formData) {
  await new Promise((r) => setTimeout(r, 120));
  const idx = inMemoryInquiries.findIndex(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  if (idx === -1) {
    const err = new Error('Inquiry not found');
    err.status = 404;
    throw err;
  }

  const existing = inMemoryInquiries[idx];
  const updated = {
    ...existing,
    ...formData,
    lastUpdatedOn: new Date().toISOString(),
  };

  if (formData.products !== null && Array.isArray(formData.products)) {
    updated.products = formData.products;
  }

  inMemoryInquiries[idx] = updated;
  return inquiryDetailFromApi(updated);
}

export async function changeInquiryStatus(id, { status, comment }) {
  await new Promise((r) => setTimeout(r, 100));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  if (!found) throw new Error('Inquiry not found');

  found.status = status;
  found.StatusId = status;
  found.activities = found.activities || [];
  found.activities.unshift({
    id: Date.now(),
    inquiryId: found.id,
    activityType: 'StatusChanged',
    status,
    comment: comment || `Status updated to ${status}`,
    userId: 1,
    userName: 'Ian Chesnut',
    on: new Date().toISOString(),
  });

  return { success: true, status };
}

export async function assignInquiry(id, { assignedToUserId, comment }) {
  await new Promise((r) => setTimeout(r, 100));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  if (!found) throw new Error('Inquiry not found');

  found.assignedToUserId = Number(assignedToUserId);
  found.activities = found.activities || [];
  found.activities.unshift({
    id: Date.now(),
    inquiryId: found.id,
    activityType: 'Assigned',
    comment: comment || 'Inquiry reassigned',
    userId: 1,
    userName: 'Ian Chesnut',
    on: new Date().toISOString(),
  });

  return inquiryDetailFromApi(found);
}

export async function toggleInquiryActive(id, isActive) {
  await new Promise((r) => setTimeout(r, 80));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  if (!found) throw new Error('Inquiry not found');
  found.isActive = Boolean(isActive);
  return { success: true };
}

export async function getInquiryActivities(id) {
  await new Promise((r) => setTimeout(r, 60));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  return (found?.activities || []).map(inquiryActivityFromApi);
}

export async function addInquiryComment(id, comment) {
  await new Promise((r) => setTimeout(r, 80));
  const found = inMemoryInquiries.find(
    (i) => String(i.id) === String(id) || String(i.InquiryId) === String(id)
  );
  if (!found) throw new Error('Inquiry not found');

  found.activities = found.activities || [];
  found.activities.unshift({
    id: Date.now(),
    inquiryId: found.id,
    activityType: 'Comment',
    comment: String(comment).trim(),
    userId: 1,
    userName: 'Ian Chesnut',
    on: new Date().toISOString(),
  });

  return found.activities.map(inquiryActivityFromApi);
}

export async function getCatalog(params = {}) {
  await new Promise((r) => setTimeout(r, 80));
  return INQUIRY_CATALOG_PRODUCTS.map((p, idx) => ({
    productId: idx + 101,
    productCode: p.itemCodePrefix,
    productName: p.productName,
    categoryId: 1,
    categoryName: 'Surface Plates',
    materialName: 'Black Granite',
    finishType: 'Hand Lapped',
    uomName: p.defaultUom,
    isCustomSizeAllowed: true,
    variantCount: (p.variants || []).length,
    hasVariants: (p.variants || []).length > 0,
    optionCount: 2,
  }));
}

export async function getCatalogProduct(productId) {
  await new Promise((r) => setTimeout(r, 80));
  const prod = INQUIRY_CATALOG_PRODUCTS[0];
  return {
    productId: Number(productId) || 101,
    productCode: prod.itemCodePrefix,
    productName: prod.productName,
    description: prod.description,
    suggestedSpecification: prod.standardInfo,
    isCustomSizeAllowed: true,
    hasVariants: true,
    variants: prod.variants.map((v, idx) => ({
      productVariantId: idx + 501,
      variantCode: v.itemCode,
      gradeCode: v.grade,
      variantDetails: `${v.size}, Grade ${v.grade}`,
      suggestedSpecification: `${prod.productName} ${v.size}, Grade ${v.grade}`,
    })),
    options: [
      { productOptionId: 31, optionName: 'Rexine Cover', isStandard: true },
      { productOptionId: 32, optionName: 'Anti-Vibration Stand', isStandard: false },
    ],
  };
}

export async function getInquiryProducts(inquiryId) {
  await new Promise((r) => setTimeout(r, 60));
  const inq = inMemoryInquiries.find((i) => String(i.id) === String(inquiryId));
  return (inq?.products || []).map(inquiryProductFromApi);
}

export async function addInquiryProduct(inquiryId, item) {
  await new Promise((r) => setTimeout(r, 100));
  const inq = inMemoryInquiries.find((i) => String(i.id) === String(inquiryId));
  if (!inq) throw new Error('Inquiry not found');
  const newLine = {
    ...item,
    id: Date.now(),
    inquiryId: inq.id,
  };
  inq.products = inq.products || [];
  inq.products.push(newLine);
  return inquiryProductFromApi(newLine);
}

export async function getInquiryProduct(lineId) {
  await new Promise((r) => setTimeout(r, 50));
  for (const inq of inMemoryInquiries) {
    const line = (inq.products || []).find((l) => String(l.id) === String(lineId));
    if (line) return inquiryProductFromApi(line);
  }
  throw new Error('Line item not found');
}

export async function updateInquiryProduct(lineId, item) {
  await new Promise((r) => setTimeout(r, 80));
  for (const inq of inMemoryInquiries) {
    const idx = (inq.products || []).findIndex((l) => String(l.id) === String(lineId));
    if (idx !== -1) {
      inq.products[idx] = { ...inq.products[idx], ...item };
      return inquiryProductFromApi(inq.products[idx]);
    }
  }
  throw new Error('Line item not found');
}

export async function deleteInquiryProduct(lineId) {
  await new Promise((r) => setTimeout(r, 60));
  for (const inq of inMemoryInquiries) {
    const idx = (inq.products || []).findIndex((l) => String(l.id) === String(lineId));
    if (idx !== -1) {
      inq.products.splice(idx, 1);
      return { success: true };
    }
  }
  return { success: true };
}

export async function getInquiryAttachments(inquiryId) {
  await new Promise((r) => setTimeout(r, 60));
  return inMemoryAttachments
    .filter((a) => String(a.inquiryId) === String(inquiryId))
    .map(inquiryAttachmentFromApi);
}

export async function uploadInquiryAttachment(inquiryId, { documentTypeId, file, documentTitle, remarks }) {
  await new Promise((r) => setTimeout(r, 120));
  const newAtt = {
    id: Date.now(),
    inquiryId,
    documentTypeId: Number(documentTypeId) || 1,
    documentTypeName: 'Drawing',
    documentTitle: documentTitle || file?.name || 'Customer Drawing',
    fileName: file?.name || 'drawing.pdf',
    displayName: documentTitle || file?.name || 'Customer Drawing',
    remarks: remarks || '',
    downloadUrl: `/api/inquiry-attachments/${Date.now()}/download`,
    uploadedBy: 1,
    uploadedByName: 'Ian Chesnut',
    uploadedOn: new Date().toISOString(),
  };
  inMemoryAttachments.unshift(newAtt);
  return inquiryAttachmentFromApi(newAtt);
}

export async function downloadInquiryAttachment(attachmentId, fileName = 'attachment.pdf') {
  await new Promise((r) => setTimeout(r, 100));
  // In mock, generate a dummy text blob and trigger download
  const blob = new Blob([`MicroFlat ERP Mock Attachment Content for ID ${attachmentId}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true };
}

export async function deleteInquiryAttachment(attachmentId) {
  await new Promise((r) => setTimeout(r, 80));
  inMemoryAttachments = inMemoryAttachments.filter((a) => String(a.id) !== String(attachmentId));
  return { success: true };
}
