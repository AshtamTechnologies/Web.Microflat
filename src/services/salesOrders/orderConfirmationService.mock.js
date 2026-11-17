/**
 * src/services/salesOrders/orderConfirmationService.mock.js
 * Offline mock service for Order Confirmations.
 * Follows identical contract as orderConfirmationService.js.
 */

import { INITIAL_SALES_ORDERS, calculateSalesOrderTotals } from '../../mocks/salesOrders';

const STORAGE_KEY = 'microflat_sales_orders_data';

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse mock sales orders from localStorage:', e);
  }
  return INITIAL_SALES_ORDERS;
}

function saveStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Failed to save mock sales orders to localStorage:', e);
  }
}

export async function listOrderConfirmations(params = {}) {
  const all = getStoredOrders();
  let filtered = [...all];

  if (params.search?.trim()) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (o) =>
        o.orderConfirmationNo?.toLowerCase().includes(s) ||
        o.clientName?.toLowerCase().includes(s) ||
        o.clientPoNo?.toLowerCase().includes(s)
    );
  }

  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter((o) => (o.status || o.orderStatus) === params.status);
  }

  return {
    items: filtered,
    totalCount: filtered.length,
    pageNumber: params.pageNumber || 1,
    pageSize: params.pageSize || 20,
    totalPages: Math.ceil(filtered.length / (params.pageSize || 20)) || 1,
  };
}

export async function getOrderConfirmationById(id) {
  const all = getStoredOrders();
  const found = all.find(
    (o) =>
      String(o.id).toLowerCase() === String(id).toLowerCase() ||
      String(o.orderConfirmationNo).toLowerCase() === String(id).toLowerCase()
  );
  if (!found) throw new Error(`Order confirmation with id ${id} not found.`);
  return found;
}

export async function getOrderConfirmationLookups() {
  return {
    statuses: ['Draft', 'Confirmed', 'Cancelled'],
    paymentTerms: [],
    deliveryTerms: [],
    taxes: [],
    documentTypes: [{ id: 1, name: 'Client PO' }, { id: 2, name: 'Signed Copy' }],
  };
}

export async function getNextOrderConfirmationNumber(orderConfirmationDate) {
  const all = getStoredOrders();
  const year = orderConfirmationDate ? new Date(orderConfirmationDate).getFullYear() : new Date().getFullYear();
  const seq = all.length + 1;
  return `OC-${year}-${String(seq).padStart(6, '0')}`;
}

export async function createOrderConfirmation(form) {
  const all = getStoredOrders();
  const nextNo = await getNextOrderConfirmationNumber(form.orderConfirmationDate);
  const newOrder = {
    ...form,
    id: nextNo,
    orderConfirmationNo: nextNo,
    orderStatus: form.status || 'Draft',
    status: form.status || 'Draft',
    isEditable: true,
    nextStatuses: ['Confirmed', 'Cancelled'],
    documents: [],
  };
  saveStoredOrders([newOrder, ...all]);
  return newOrder;
}

export async function updateOrderConfirmation(id, form) {
  const all = getStoredOrders();
  const updated = all.map((o) => (String(o.id) === String(id) ? { ...o, ...form } : o));
  saveStoredOrders(updated);
  return getOrderConfirmationById(id);
}

export async function updateOrderConfirmationStatus(id, status) {
  const all = getStoredOrders();
  const updated = all.map((o) =>
    String(o.id) === String(id)
      ? {
          ...o,
          status,
          orderStatus: status,
          isEditable: status === 'Draft',
          nextStatuses: status === 'Draft' ? ['Confirmed', 'Cancelled'] : [],
        }
      : o
  );
  saveStoredOrders(updated);
  return getOrderConfirmationById(id);
}

export async function getOrderConfirmationDocuments(id) {
  const order = await getOrderConfirmationById(id);
  return order.documents || [];
}

export async function uploadOrderConfirmationDocument(id, file, documentTypeId, remarks = '') {
  const order = await getOrderConfirmationById(id);
  const newDoc = {
    id: `doc-${Date.now()}`,
    fileName: file.name,
    documentTypeId,
    documentTypeName: 'Client PO',
    remarks,
    uploadedOn: new Date().toISOString(),
    downloadUrl: '',
  };
  const updated = {
    ...order,
    documents: [...(order.documents || []), newDoc],
  };
  await updateOrderConfirmation(id, updated);
  return newDoc;
}

export async function downloadOrderConfirmationDocument(docId, fileName) {
  return true;
}

export async function deleteOrderConfirmationDocument(docId) {
  return true;
}

export async function getOrderConfirmationEmailLogs(id) {
  const order = await getOrderConfirmationById(id);
  return order.emailLogs || [];
}

export async function sendOrderConfirmationEmail(id, payload) {
  return { isSuccess: true };
}
