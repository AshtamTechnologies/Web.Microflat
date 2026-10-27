/**
 * src/services/regions/regionService.mock.js — Offline mock service for Regions.
 */

import { INITIAL_REGIONS } from '../../mocks/regions';
import { regionFromApi, regionsFromApi } from '../../models/regions/regionModel';

const STORAGE_KEY = 'microflat_regions_mock';

function getStoredRegions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const seeded = INITIAL_REGIONS.map((item, idx) => ({
    id: idx + 1,
    regionName: item.regionName,
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

function saveStoredRegions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function listRegions(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredRegions();

  const act = params.isActive ?? params.IsActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((r) => Boolean(r.isActive) === expected);
  }

  return regionsFromApi(items);
}

export async function getRegion(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredRegions();
  const found = items.find((r) => String(r.id) === String(id) || String(r.regionId) === String(id));
  if (!found) {
    const err = new Error('Region not found');
    err.status = 404;
    throw err;
  }
  return regionFromApi(found);
}

export async function createRegion(data) {
  await new Promise((r) => setTimeout(r, 250));
  const items = getStoredRegions();
  const maxId = items.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
  const created = {
    id: maxId + 1,
    regionName: data.regionName.trim(),
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(created);
  saveStoredRegions(items);
  return regionFromApi(created);
}

export async function updateRegion(id, data) {
  await new Promise((r) => setTimeout(r, 250));
  const items = getStoredRegions();
  const idx = items.findIndex((r) => String(r.id) === String(id) || String(r.regionId) === String(id));
  if (idx === -1) {
    const err = new Error('Region not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    regionName: data.regionName.trim(),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredRegions(items);
  return regionFromApi(items[idx]);
}

export async function updateRegionStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredRegions();
  const idx = items.findIndex((r) => String(r.id) === String(id) || String(r.regionId) === String(id));
  if (idx === -1) {
    const err = new Error('Region not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredRegions(items);
  return { ok: true, isActive: Boolean(isActive) };
}
