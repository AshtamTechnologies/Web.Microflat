/**
 * src/services/uom/uomService.mock.js — Offline mock service for UOM.
 */

import { INITIAL_UOM_LIST } from '../../mocks/uom';
import { uomFromApi, uomsFromApi } from '../../models/uom/uomModel';

const STORAGE_KEY = 'microflat_uom_list_mock';

function getStoredUoms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const seeded = INITIAL_UOM_LIST.map((item, idx) => ({
    id: idx + 1,
    uomName: item.uomName,
    description: item.description,
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

function saveStoredUoms(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function listUoms(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredUoms();

  const act = params.isActive ?? params.IsActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((u) => Boolean(u.isActive) === expected);
  }

  return uomsFromApi(items);
}

export async function getUom(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredUoms();
  const found = items.find((u) => String(u.id) === String(id) || String(u.uomId) === String(id));
  if (!found) {
    const err = new Error('UOM not found');
    err.status = 404;
    throw err;
  }
  return uomFromApi(found);
}

export async function createUom(data) {
  await new Promise((r) => setTimeout(r, 250));
  const items = getStoredUoms();
  const maxId = items.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
  const created = {
    id: maxId + 1,
    uomName: data.uomName.trim(),
    description: data.description ? data.description.trim() : '',
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(created);
  saveStoredUoms(items);
  return uomFromApi(created);
}

export async function updateUom(id, data) {
  await new Promise((r) => setTimeout(r, 250));
  const items = getStoredUoms();
  const idx = items.findIndex((u) => String(u.id) === String(id) || String(u.uomId) === String(id));
  if (idx === -1) {
    const err = new Error('UOM not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    uomName: data.uomName.trim(),
    description: data.description !== undefined ? data.description.trim() : items[idx].description,
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredUoms(items);
  return uomFromApi(items[idx]);
}

export async function updateUomStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredUoms();
  const idx = items.findIndex((u) => String(u.id) === String(id) || String(u.uomId) === String(id));
  if (idx === -1) {
    const err = new Error('UOM not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredUoms(items);
  return { ok: true, isActive: Boolean(isActive) };
}
