/**
 * src/services/taxConfigs/taxConfigsService.mock.js — Offline mock service for Tax Configurations.
 */

import {
  taxConfigFromApi,
  taxConfigsFromApi,
  taxRateFromApi,
  taxRatesFromApi,
  applicableTaxFromApi,
} from '../../models/taxConfigs/taxConfigModel';

const STORAGE_KEY = 'microflat_tax_configs_mock';

const INITIAL_TAX_CONFIGS = [
  {
    id: 1,
    taxName: 'GST 18%',
    isActive: true,
    currentTaxConfigDetailId: 101,
    currentTaxPercent: 18,
    currentEffectiveDate: '2024-01-01',
    rateCount: 2,
    createdBy: 1,
    createdOn: '2024-01-01T00:00:00.000Z',
    lastUpdatedBy: 1,
    lastUpdatedOn: '2024-06-01T00:00:00.000Z',
    rates: [
      {
        id: 102,
        taxConfigId: 1,
        taxName: 'GST 18%',
        taxPercent: 18,
        effectiveDate: '2024-06-01',
        state: 'Current',
        isInUse: true,
        createdBy: 1,
        createdOn: '2024-06-01T00:00:00.000Z',
        lastUpdatedBy: 1,
        lastUpdatedOn: null,
      },
      {
        id: 101,
        taxConfigId: 1,
        taxName: 'GST 18%',
        taxPercent: 12,
        effectiveDate: '2024-01-01',
        state: 'Past',
        isInUse: true,
        createdBy: 1,
        createdOn: '2024-01-01T00:00:00.000Z',
        lastUpdatedBy: 1,
        lastUpdatedOn: null,
      },
    ],
  },
  {
    id: 2,
    taxName: 'GST 12%',
    isActive: true,
    currentTaxConfigDetailId: 201,
    currentTaxPercent: 12,
    currentEffectiveDate: '2024-01-01',
    rateCount: 1,
    createdBy: 1,
    createdOn: '2024-01-01T00:00:00.000Z',
    lastUpdatedBy: 1,
    lastUpdatedOn: null,
    rates: [
      {
        id: 201,
        taxConfigId: 2,
        taxName: 'GST 12%',
        taxPercent: 12,
        effectiveDate: '2024-01-01',
        state: 'Current',
        isInUse: false,
        createdBy: 1,
        createdOn: '2024-01-01T00:00:00.000Z',
        lastUpdatedBy: 1,
        lastUpdatedOn: null,
      },
    ],
  },
  {
    id: 3,
    taxName: 'GST 5%',
    isActive: true,
    currentTaxConfigDetailId: 301,
    currentTaxPercent: 5,
    currentEffectiveDate: '2024-01-01',
    rateCount: 1,
    createdBy: 1,
    createdOn: '2024-01-01T00:00:00.000Z',
    lastUpdatedBy: 1,
    lastUpdatedOn: null,
    rates: [
      {
        id: 301,
        taxConfigId: 3,
        taxName: 'GST 5%',
        taxPercent: 5,
        effectiveDate: '2024-01-01',
        state: 'Current',
        isInUse: false,
        createdBy: 1,
        createdOn: '2024-01-01T00:00:00.000Z',
        lastUpdatedBy: 1,
        lastUpdatedOn: null,
      },
    ],
  },
];

function getStoredConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TAX_CONFIGS));
  } catch {
    // ignore
  }
  return INITIAL_TAX_CONFIGS;
}

function saveStoredConfigs(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function listTaxConfigs(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredConfigs();

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((t) => Boolean(t.isActive) === expected);
  }

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase();
    items = items.filter((t) => t.taxName && t.taxName.toLowerCase().includes(s));
  }

  const page = Number(params.PageNumber ?? params.pageNumber ?? 1);
  const pageSize = Number(params.PageSize ?? params.pageSize ?? 10);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: taxConfigsFromApi(pagedItems),
    pageNumber: page,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getApplicableTaxes(date) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredConfigs().filter((t) => t.isActive);
  return items.map((t) => ({
    taxConfigId: t.id,
    taxName: t.taxName,
    taxConfigDetailId: t.currentTaxConfigDetailId,
    taxPercent: t.currentTaxPercent,
    effectiveDate: t.currentEffectiveDate,
  }));
}

export async function getTaxConfig(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredConfigs();
  const found = items.find((t) => String(t.id) === String(id));
  if (!found) throw new Error('Tax configuration not found');
  return taxConfigFromApi(found);
}

export async function createTaxConfig(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  const newId = items.length ? Math.max(...items.map((t) => t.id)) + 1 : 1;
  const newDetailId = 1000 + newId;

  const newConfig = {
    id: newId,
    taxName: data.taxName,
    isActive: true,
    currentTaxConfigDetailId: newDetailId,
    currentTaxPercent: Number(data.taxPercent) || 0,
    currentEffectiveDate: data.effectiveDate,
    rateCount: 1,
    createdBy: 1,
    createdOn: new Date().toISOString(),
    lastUpdatedBy: 1,
    lastUpdatedOn: null,
    rates: [
      {
        id: newDetailId,
        taxConfigId: newId,
        taxName: data.taxName,
        taxPercent: Number(data.taxPercent) || 0,
        effectiveDate: data.effectiveDate,
        state: 'Current',
        isInUse: false,
        createdBy: 1,
        createdOn: new Date().toISOString(),
        lastUpdatedBy: 1,
        lastUpdatedOn: null,
      },
    ],
  };

  items.unshift(newConfig);
  saveStoredConfigs(items);
  return taxConfigFromApi(newConfig);
}

export async function updateTaxConfig(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  const index = items.findIndex((t) => String(t.id) === String(id));
  if (index === -1) throw new Error('Tax configuration not found');

  items[index] = {
    ...items[index],
    taxName: data.taxName,
    lastUpdatedOn: new Date().toISOString(),
  };

  saveStoredConfigs(items);
  return taxConfigFromApi(items[index]);
}

export async function updateTaxConfigStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  const index = items.findIndex((t) => String(t.id) === String(id));
  if (index === -1) throw new Error('Tax configuration not found');

  items[index] = {
    ...items[index],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };

  saveStoredConfigs(items);
  return items[index];
}

export async function deleteTaxConfig(id) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  const filtered = items.filter((t) => String(t.id) !== String(id));
  saveStoredConfigs(filtered);
  return { success: true };
}

export async function getTaxConfigRates(id) {
  await new Promise((r) => setTimeout(r, 150));
  const config = await getTaxConfig(id);
  return config.rates || [];
}

export async function createTaxConfigRate(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  const index = items.findIndex((t) => String(t.id) === String(id));
  if (index === -1) throw new Error('Tax configuration not found');

  const config = items[index];
  const newRateId = Date.now();
  const newRate = {
    id: newRateId,
    taxConfigId: Number(id),
    taxName: config.taxName,
    taxPercent: Number(data.taxPercent) || 0,
    effectiveDate: data.effectiveDate,
    state: 'Current',
    isInUse: false,
    createdBy: 1,
    createdOn: new Date().toISOString(),
    lastUpdatedBy: 1,
    lastUpdatedOn: null,
  };

  const updatedRates = [newRate, ...(config.rates || [])];
  items[index] = {
    ...config,
    currentTaxPercent: newRate.taxPercent,
    currentEffectiveDate: newRate.effectiveDate,
    currentTaxConfigDetailId: newRateId,
    rateCount: updatedRates.length,
    rates: updatedRates,
    lastUpdatedOn: new Date().toISOString(),
  };

  saveStoredConfigs(items);
  return taxRateFromApi(newRate);
}

export async function getTaxConfigRate(rateId) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredConfigs();
  for (const config of items) {
    const foundRate = (config.rates || []).find((r) => String(r.id) === String(rateId));
    if (foundRate) return taxRateFromApi(foundRate);
  }
  throw new Error('Tax rate not found');
}

export async function updateTaxConfigRate(rateId, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();
  let updatedRate = null;

  for (const config of items) {
    const rateIdx = (config.rates || []).findIndex((r) => String(r.id) === String(rateId));
    if (rateIdx !== -1) {
      config.rates[rateIdx] = {
        ...config.rates[rateIdx],
        taxPercent: Number(data.taxPercent) || 0,
        effectiveDate: data.effectiveDate,
        lastUpdatedOn: new Date().toISOString(),
      };
      updatedRate = config.rates[rateIdx];
      break;
    }
  }

  if (!updatedRate) throw new Error('Tax rate not found');
  saveStoredConfigs(items);
  return taxRateFromApi(updatedRate);
}

export async function deleteTaxConfigRate(rateId) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredConfigs();

  for (const config of items) {
    const rateIdx = (config.rates || []).findIndex((r) => String(r.id) === String(rateId));
    if (rateIdx !== -1) {
      if (config.rates.length <= 1) {
        throw new Error('The last rate of a tax cannot be deleted.');
      }
      config.rates.splice(rateIdx, 1);
      config.rateCount = config.rates.length;
      break;
    }
  }

  saveStoredConfigs(items);
  return { success: true };
}

