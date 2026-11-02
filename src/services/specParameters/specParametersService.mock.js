/**
 * src/services/specParameters/specParametersService.mock.js — Offline mock service for Spec Parameters.
 */

import { specParameterFromApi, specParametersFromApi } from '../../models/specParameters/specParameterModel';

const STORAGE_KEY = 'microflat_spec_parameters_mock';

const INITIAL_SPEC_PARAMETERS = [
  {
    id: 1,
    parameterName: 'Flatness',
    unitSymbol: 'µm',
    toleranceUnitSymbol: null,
    isActive: true,
    createdOn: '2026-10-28T11:09:59Z',
    lastUpdatedOn: null,
  },
  {
    id: 16,
    parameterName: 'Admit Between Centers',
    unitSymbol: 'mm',
    toleranceUnitSymbol: null,
    isActive: true,
    createdOn: '2026-10-28T11:10:02Z',
    lastUpdatedOn: null,
  },
  {
    id: 35,
    parameterName: 'Base Size (L x B)',
    unitSymbol: 'mm',
    toleranceUnitSymbol: null,
    isActive: true,
    createdOn: '2026-10-28T11:10:05Z',
    lastUpdatedOn: null,
  },
  {
    id: 42,
    parameterName: 'Perpendicularity',
    unitSymbol: 'µm',
    toleranceUnitSymbol: 'µm',
    isActive: true,
    createdOn: '2026-10-28T11:12:18Z',
    lastUpdatedOn: null,
  },
  {
    id: 50,
    parameterName: 'Surface Roughness (Ra)',
    unitSymbol: 'µm',
    toleranceUnitSymbol: null,
    isActive: false,
    createdOn: '2026-10-28T11:15:40Z',
    lastUpdatedOn: null,
  },
];

function getStoredSpecParameters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SPEC_PARAMETERS));
  } catch {
    // ignore
  }
  return INITIAL_SPEC_PARAMETERS;
}

function saveStoredSpecParameters(list) {
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

export async function listSpecParameters(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredSpecParameters();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((p) => p.parameterName?.toLowerCase().includes(q));
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((p) => Boolean(p.isActive) === expected);
  }

  const page = Number(params.PageNumber ?? params.pageNumber ?? 1);
  const size = Number(params.PageSize ?? params.pageSize ?? 10);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const start = (page - 1) * size;
  const pagedItems = items.slice(start, start + size);

  return specParametersFromApi({
    items: pagedItems,
    totalCount,
    pageNumber: page,
    pageSize: size,
    totalPages,
  });
}

export async function getSpecParameter(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredSpecParameters();
  const found = items.find((p) => String(p.id) === String(id));
  if (!found) {
    const err = new Error('Spec Parameter not found');
    err.status = 404;
    throw err;
  }
  return specParameterFromApi(found);
}

export async function createSpecParameter(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredSpecParameters();
  const newId = items.length > 0 ? Math.max(...items.map((p) => Number(p.id) || 0)) + 1 : 1;
  const newItem = {
    id: newId,
    parameterName: String(data.parameterName || '').trim(),
    unitSymbol: data.unitSymbol?.trim() || null,
    toleranceUnitSymbol: data.toleranceUnitSymbol?.trim() || null,
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(newItem);
  saveStoredSpecParameters(items);
  return specParameterFromApi(newItem);
}

export async function updateSpecParameter(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredSpecParameters();
  const idx = items.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) {
    const err = new Error('Spec Parameter not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    parameterName: String(data.parameterName || '').trim(),
    unitSymbol: data.unitSymbol !== undefined ? (data.unitSymbol?.trim() || null) : items[idx].unitSymbol,
    toleranceUnitSymbol: data.toleranceUnitSymbol !== undefined ? (data.toleranceUnitSymbol?.trim() || null) : items[idx].toleranceUnitSymbol,
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredSpecParameters(items);
  return specParameterFromApi(items[idx]);
}

export async function updateSpecParameterStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredSpecParameters();
  const idx = items.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) {
    const err = new Error('Spec Parameter not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredSpecParameters(items);
}

