/**
 * src/services/grades/gradesService.mock.js — Offline mock service for Grades.
 */

import { gradeFromApi, gradesFromApi } from '../../models/grades/gradeModel';

const STORAGE_KEY = 'microflat_grades_mock';

const INITIAL_GRADES = [
  {
    id: 1,
    gradeCode: 'Gr-00',
    isActive: true,
    createdOn: '2026-10-28T11:09:58Z',
    lastUpdatedOn: null,
  },
  {
    id: 2,
    gradeCode: 'Gr-0',
    isActive: true,
    createdOn: '2026-10-28T11:09:58Z',
    lastUpdatedOn: null,
  },
  {
    id: 3,
    gradeCode: 'Gr-1',
    isActive: true,
    createdOn: '2026-10-28T11:15:20Z',
    lastUpdatedOn: null,
  },
  {
    id: 4,
    gradeCode: 'Gr-2',
    isActive: false,
    createdOn: '2026-10-28T11:16:05Z',
    lastUpdatedOn: null,
  },
];

function getStoredGrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GRADES));
  } catch {
    // ignore
  }
  return INITIAL_GRADES;
}

function saveStoredGrades(list) {
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

export async function listGrades(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredGrades();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((g) => g.gradeCode?.toLowerCase().includes(q));
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const expected = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    items = items.filter((g) => Boolean(g.isActive) === expected);
  }

  const page = Number(params.PageNumber ?? params.pageNumber ?? 1);
  const size = Number(params.PageSize ?? params.pageSize ?? 10);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const start = (page - 1) * size;
  const pagedItems = items.slice(start, start + size);

  return gradesFromApi({
    items: pagedItems,
    totalCount,
    pageNumber: page,
    pageSize: size,
    totalPages,
  });
}

export async function getGrade(id) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredGrades();
  const found = items.find((g) => String(g.id) === String(id));
  if (!found) {
    const err = new Error('Grade not found');
    err.status = 404;
    throw err;
  }
  return gradeFromApi(found);
}

export async function createGrade(data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredGrades();
  const newId = items.length > 0 ? Math.max(...items.map((g) => Number(g.id) || 0)) + 1 : 1;
  const newItem = {
    id: newId,
    gradeCode: String(data.gradeCode || '').trim(),
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  items.unshift(newItem);
  saveStoredGrades(items);
  return gradeFromApi(newItem);
}

export async function updateGrade(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredGrades();
  const idx = items.findIndex((g) => String(g.id) === String(id));
  if (idx === -1) {
    const err = new Error('Grade not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    gradeCode: String(data.gradeCode || '').trim(),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredGrades(items);
  return gradeFromApi(items[idx]);
}

export async function updateGradeStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredGrades();
  const idx = items.findIndex((g) => String(g.id) === String(id));
  if (idx === -1) {
    const err = new Error('Grade not found');
    err.status = 404;
    throw err;
  }
  items[idx] = {
    ...items[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
  saveStoredGrades(items);
}

