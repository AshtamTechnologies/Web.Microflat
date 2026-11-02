/**
 * src/services/materials/materialsService.mock.js — Offline mock service for Materials.
 */

import { materialFromApi, materialsFromApi } from '../../models/materials/materialModel';

const STORAGE_KEY = 'microflat_materials_mock';

const INITIAL_MATERIALS = [
  {
    id: 1,
    materialName: 'Indian Black Granite',
    isActive: true,
    createdOn: '2026-10-28T11:09:51Z',
    lastUpdatedOn: null,
  },
  {
    id: 7,
    materialName: 'Aluminium (Hard Anodized)',
    isActive: true,
    createdOn: '2026-10-28T11:09:52Z',
    lastUpdatedOn: null,
  },
  {
    id: 8,
    materialName: 'BK-7 Optical Glass (Grade A)',
    isActive: true,
    createdOn: '2026-10-28T11:09:52Z',
    lastUpdatedOn: null,
  },
  {
    id: 9,
    materialName: 'Cast Iron (Grade 20)',
    isActive: false,
    createdOn: '2026-10-28T11:15:30Z',
    lastUpdatedOn: null,
  },
];

function getStoredMaterials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MATERIALS));
  } catch {
    // ignore
  }
  return INITIAL_MATERIALS;
}

function saveStoredMaterials(list) {
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

export async function listMaterials(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredMaterials();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((m) => m.materialName?.toLowerCase().includes(q));
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((m) => Boolean(m.isActive) === expected);
  }

  const page = Number(params.PageNumber ?? params.pageNumber ?? 1);
  const size = Number(params.PageSize ?? params.pageSize ?? 10);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const start = (page - 1) * size;
  const pagedItems = items.slice(start, start + size);

  return materialsFromApi({
    items: pagedItems,
    totalCount,
    pageNumber: page,
    pageSize: size,
    totalPages,
  });
}

export async function getMaterial(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredMaterials();
  const found = items.find((m) => String(m.id) === String(id));
  if (!found) {
    const err = new Error('Material not found');
    err.status = 404;
    throw err;
  }
  return materialFromApi(found);
}

export async function createMaterial(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredMaterials();
  const newId = items.length > 0 ? Math.max(...items.map((m) => Number(m.id) || 0)) + 1 : 1;
  const newItem = {
    id: newId,
    materialName: String(data.materialName || '').trim(),
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(newItem);
  saveStoredMaterials(items);
  return materialFromApi(newItem);
}

export async function updateMaterial(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredMaterials();
  const idx = items.findIndex((m) => String(m.id) === String(id));
  if (idx === -1) {
    const err = new Error('Material not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    materialName: String(data.materialName || '').trim(),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredMaterials(items);
  return materialFromApi(items[idx]);
}

export async function updateMaterialStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredMaterials();
  const idx = items.findIndex((m) => String(m.id) === String(id));
  if (idx === -1) {
    const err = new Error('Material not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredMaterials(items);
}

