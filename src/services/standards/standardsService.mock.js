/**
 * src/services/standards/standardsService.mock.js — Offline mock service for Standards.
 */

import { standardFromApi, standardsFromApi } from '../../models/standards/standardModel';

const STORAGE_KEY = 'microflat_standards_mock';

const INITIAL_STANDARDS = [
  {
    id: 1,
    standardCode: 'IS-7327-2003',
    isActive: true,
    createdOn: '2026-10-28T11:09:52Z',
    lastUpdatedOn: null,
  },
  {
    id: 24,
    standardCode: 'DIN-876',
    isActive: true,
    createdOn: '2026-10-28T11:09:57Z',
    lastUpdatedOn: null,
  },
  {
    id: 25,
    standardCode: 'BS-817',
    isActive: true,
    createdOn: '2026-10-28T11:09:57Z',
    lastUpdatedOn: null,
  },
  {
    id: 30,
    standardCode: 'JIS B 7513',
    isActive: true,
    createdOn: '2026-10-28T11:12:30Z',
    lastUpdatedOn: null,
  },
  {
    id: 35,
    standardCode: 'ASME B89.3.7',
    isActive: false,
    createdOn: '2026-10-28T11:16:00Z',
    lastUpdatedOn: null,
  },
];

function getStoredStandards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STANDARDS));
  } catch {
    // ignore
  }
  return INITIAL_STANDARDS;
}

function saveStoredStandards(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
};

export async function listStandards(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredStandards();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((s) => s.standardCode?.toLowerCase().includes(q));
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((s) => Boolean(s.isActive) === expected);
  }

  const page = Number(params.PageNumber ?? params.pageNumber ?? 1);
  const size = Number(params.PageSize ?? params.pageSize ?? 10);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const start = (page - 1) * size;
  const pagedItems = items.slice(start, start + size);

  return standardsFromApi({
    items: pagedItems,
    totalCount,
    pageNumber: page,
    pageSize: size,
    totalPages,
  });
}

export async function getStandard(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredStandards();
  const found = items.find((s) => String(s.id) === String(id));
  if (!found) {
    const err = new Error('Standard not found');
    err.status = 404;
    throw err;
  }
  return standardFromApi(found);
}

export async function createStandard(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredStandards();
  const newId = items.length > 0 ? Math.max(...items.map((s) => Number(s.id) || 0)) + 1 : 1;
  const newItem = {
    id: newId,
    standardCode: String(data.standardCode || '').trim(),
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(newItem);
  saveStoredStandards(items);
  return standardFromApi(newItem);
}

export async function updateStandard(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredStandards();
  const idx = items.findIndex((s) => String(s.id) === String(id));
  if (idx === -1) {
    const err = new Error('Standard not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    standardCode: String(data.standardCode || '').trim(),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredStandards(items);
  return standardFromApi(items[idx]);
}

export async function updateStandardStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredStandards();
  const idx = items.findIndex((s) => String(s.id) === String(id));
  if (idx === -1) {
    const err = new Error('Standard not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredStandards(items);
}

