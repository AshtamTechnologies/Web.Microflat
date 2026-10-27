/**
 * src/services/paymentTerms/paymentTermService.mock.js — Offline mock service for Payment Terms.
 */

import { INITIAL_PAYMENT_TERMS } from '../../mocks/paymentTerms';
import { paymentTermFromApi, paymentTermsFromApi } from '../../models/paymentTerms/paymentTermModel';

const STORAGE_KEY = 'microflat_payment_terms_mock';

function getStoredTerms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const seeded = INITIAL_PAYMENT_TERMS.map((item, idx) => ({
    id: idx + 1,
    termCode: item.termCode,
    termName: item.termName || item.termCode,
    displayOrder: item.displayOrder || idx + 1,
    description: item.description || '',
    isActive: item.isActive !== undefined ? item.isActive : true,
    createdOn: item.createdOn || new Date().toISOString(),
    lastUpdatedOn: null,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // ignore
  }
  return seeded;
}

function saveStoredTerms(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function listPaymentTerms(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredTerms();

  const act = params.isActive ?? params.IsActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((t) => Boolean(t.isActive) === expected);
  }

  const search = params.search ?? params.Search;
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase();
    items = items.filter(
      (t) =>
        t.termCode.toLowerCase().includes(s) ||
        (t.termName && t.termName.toLowerCase().includes(s)) ||
        (t.description && t.description.toLowerCase().includes(s))
    );
  }

  // Sort by display order
  items.sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));

  return paymentTermsFromApi(items);
}

export async function getPaymentTerm(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredTerms();
  const found = items.find((t) => String(t.id) === String(id) || String(t.paymentTermId) === String(id));
  if (!found) {
    const err = new Error('Payment term not found');
    err.status = 404;
    throw err;
  }
  return paymentTermFromApi(found);
}

export async function createPaymentTerm(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredTerms();

  const maxId = items.reduce((max, it) => Math.max(max, Number(it.id) || 0), 0);
  const newTerm = {
    id: maxId + 1,
    termCode: String(data.termCode).trim().toUpperCase(),
    termName: String(data.termName || data.termCode).trim(),
    displayOrder: Number(data.displayOrder) || items.length + 1,
    description: String(data.description || '').trim(),
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };

  items.push(newTerm);
  saveStoredTerms(items);
  return paymentTermFromApi(newTerm);
}

export async function updatePaymentTerm(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredTerms();
  const index = items.findIndex((t) => String(t.id) === String(id) || String(t.paymentTermId) === String(id));

  if (index === -1) {
    const err = new Error('Payment term not found');
    err.status = 404;
    throw err;
  }

  const existing = items[index];
  const updated = {
    ...existing,
    termCode: String(data.termCode).trim().toUpperCase(),
    termName: String(data.termName || data.termCode).trim(),
    displayOrder: Number(data.displayOrder) || existing.displayOrder,
    description: String(data.description || '').trim(),
    lastUpdatedOn: new Date().toISOString(),
  };

  items[index] = updated;
  saveStoredTerms(items);
  return paymentTermFromApi(updated);
}

export async function updatePaymentTermStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredTerms();
  const index = items.findIndex((t) => String(t.id) === String(id) || String(t.paymentTermId) === String(id));

  if (index === -1) {
    const err = new Error('Payment term not found');
    err.status = 404;
    throw err;
  }

  items[index].isActive = Boolean(isActive);
  items[index].lastUpdatedOn = new Date().toISOString();
  saveStoredTerms(items);
  return { ok: true, isActive: items[index].isActive };
}
