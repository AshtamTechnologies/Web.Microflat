/**
 * src/services/currencies/currencyService.mock.js — Offline mock service for Currencies.
 */

import {
  currencyFromApi,
  currenciesFromApi,
  currencyToApiCreate,
  currencyToApiUpdate,
} from '../../models/currencies/currencyModel';

const STORAGE_KEY = 'microflat_currencies_mock';

const INITIAL_CURRENCIES = [
  {
    id: 1,
    currencyCode: 'INR',
    currencyName: 'Indian Rupee',
    currencySymbol: '₹',
    isActive: true,
    createdOn: '2026-10-28T11:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 2,
    currencyCode: 'USD',
    currencyName: 'US Dollar',
    currencySymbol: '$',
    isActive: true,
    createdOn: '2026-10-28T11:05:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 3,
    currencyCode: 'EUR',
    currencyName: 'Euro',
    currencySymbol: '€',
    isActive: true,
    createdOn: '2026-10-28T11:10:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 4,
    currencyCode: 'GBP',
    currencyName: 'British Pound',
    currencySymbol: '£',
    isActive: true,
    createdOn: '2026-10-28T11:15:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 5,
    currencyCode: 'JPY',
    currencyName: 'Japanese Yen',
    currencySymbol: '¥',
    isActive: false,
    createdOn: '2026-10-28T11:20:00Z',
    lastUpdatedOn: null,
  },
];

function getStoredCurrencies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CURRENCIES));
  } catch {
    // ignore
  }
  return INITIAL_CURRENCIES;
}

function saveStoredCurrencies(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const capabilities = {
  search: true,
  filter: true,
  pagination: false,
  create: true,
  update: true,
  status: true,
};

export async function listCurrencies(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredCurrencies();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter(
      (c) =>
        c.currencyCode?.toLowerCase().includes(q) ||
        c.currencyName?.toLowerCase().includes(q) ||
        c.currencySymbol?.toLowerCase().includes(q)
    );
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((c) => Boolean(c.isActive) === expected);
  }

  return currenciesFromApi(items);
}

export async function getCurrency(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredCurrencies();
  const found = items.find((c) => String(c.id) === String(id));
  if (!found) {
    const err = new Error('Currency not found');
    err.status = 404;
    throw err;
  }
  return currencyFromApi(found);
}

export async function createCurrency(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredCurrencies();
  const payload = currencyToApiCreate(data);

  const newId = items.length > 0 ? Math.max(...items.map((c) => Number(c.id) || 0)) + 1 : 1;
  const newItem = {
    id: newId,
    ...payload,
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(newItem);
  saveStoredCurrencies(items);
  return currencyFromApi(newItem);
}

export async function updateCurrency(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredCurrencies();
  const idx = items.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) {
    const err = new Error('Currency not found');
    err.status = 404;
    throw err;
  }
  const payload = currencyToApiUpdate(data);
  items[idx] = {
    ...items[idx],
    ...payload,
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredCurrencies(items);
  return currencyFromApi(items[idx]);
}

export async function updateCurrencyStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredCurrencies();
  const idx = items.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) {
    const err = new Error('Currency not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredCurrencies(items);
}

