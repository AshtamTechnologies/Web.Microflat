/**
 * documentSeriesService.mock.js — In-memory offline mock for Document Series (Module-based).
 */

import { mockSeries } from '../../mocks/series';
import { seriesFromApi } from '../../models/documentSeries/documentSeriesModel';

const mockModules = [
  { id: 1, moduleId: 1, moduleCode: 'PO', moduleName: 'Purchase Order', isActive: true },
  { id: 2, moduleId: 2, moduleCode: 'PR', moduleName: 'Purchase Requisition', isActive: true },
  { id: 3, moduleId: 3, moduleCode: 'INQUIRY', moduleName: 'Inquiry', isActive: true },
  { id: 4, moduleId: 4, moduleCode: 'QUOTATION', moduleName: 'Quotation', isActive: true },
  { id: 5, moduleId: 5, moduleCode: 'ORDER_CONFIRMATION', moduleName: 'Order Confirmation', isActive: true },
  { id: 6, moduleId: 6, moduleCode: 'PROJECT', moduleName: 'Project', isActive: true },
];

let memorySeries = mockSeries.map((s, idx) => ({
  id: idx + 1,
  moduleId: s.docType === 'po' ? 1 : s.docType === 'pr' ? 2 : s.docType === 'inquiry' ? 3 : s.docType === 'quotation' ? 4 : s.docType === 'order' ? 5 : 6,
  moduleCode: (s.prefix || s.docType).toUpperCase(),
  moduleName: s.docType.toUpperCase(),
  prefix: s.prefix,
  separator: s.separator,
  yearFormat: s.yearFormat,
  numberLength: s.numberLength,
  startNumber: s.startingNumber,
  resetCounter: s.resetCounter.toUpperCase(),
  effectiveDate: s.effectiveDate,
  isCurrent: true,
  isUsed: false,
  sampleNumber: `${s.prefix}${s.separator}${s.yearFormat === 'YY' ? '26' : '2026'}${s.separator}000001`,
  createdOn: s.createdOn,
  lastUpdatedOn: null,
}));

export async function listModules() {
  await new Promise((r) => setTimeout(r, 100));
  return mockModules;
}

export async function listSeries(moduleId) {
  await new Promise((r) => setTimeout(r, 100));
  return memorySeries
    .filter((s) => !moduleId || String(s.moduleId) === String(moduleId))
    .map(seriesFromApi);
}

export async function getCurrentSeries(moduleId) {
  await new Promise((r) => setTimeout(r, 100));
  const list = memorySeries.filter((s) => !moduleId || String(s.moduleId) === String(moduleId));
  return list.length > 0 ? seriesFromApi(list[0]) : null;
}

export async function getSeriesById(seriesId) {
  await new Promise((r) => setTimeout(r, 100));
  const found = memorySeries.find((s) => String(s.id) === String(seriesId));
  return found ? seriesFromApi(found) : null;
}

export async function createSeries(data) {
  await new Promise((r) => setTimeout(r, 150));
  const newId = memorySeries.length + 1;
  const mod = mockModules.find((m) => String(m.id) === String(data.moduleId)) || {};
  const created = {
    ...data,
    id: newId,
    moduleCode: mod.moduleCode || data.prefix,
    moduleName: mod.moduleName || data.prefix,
    isCurrent: true,
    isUsed: false,
    sampleNumber: `${data.prefix}${data.separator || ''}2026${data.separator || ''}000001`,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  memorySeries.unshift(created);
  return seriesFromApi(created);
}

export async function updateSeries(seriesId, data) {
  await new Promise((r) => setTimeout(r, 150));
  const index = memorySeries.findIndex((s) => String(s.id) === String(seriesId));
  if (index !== -1) {
    memorySeries[index] = { ...memorySeries[index], ...data, lastUpdatedOn: new Date().toISOString() };
    return seriesFromApi(memorySeries[index]);
  }
  return seriesFromApi(data);
}

export async function deleteSeries(seriesId) {
  await new Promise((r) => setTimeout(r, 100));
  memorySeries = memorySeries.filter((s) => String(s.id) !== String(seriesId));
}

export async function previewNextNumber() {
  await new Promise((r) => setTimeout(r, 50));
  return {
    documentNumber: 'DOC-2026-000001',
    seriesId: 1,
    periodKey: '2026',
    runningNumber: 1,
  };
}
