/**
 * src/services/standards/standardsService.mock.js — Offline mock service for Standards.
 */

import { standardFromApi, standardsFromApi } from '../../models/standards/standardModel';

const STORAGE_KEY = 'microflat_standards_mock';

const INITIAL_STANDARDS = [
  {
    id: 1,
    standardCode: 'IS-7327-2003',
    description: 'Indian standard specification for granite surface plates.',
    isActive: true,
    grades: [
      { id: 101, standardId: 1, standardCode: 'IS-7327-2003', gradeId: 2, gradeCode: 'Gr-0', isGradeActive: true, displayOrder: 1 },
      { id: 102, standardId: 1, standardCode: 'IS-7327-2003', gradeId: 3, gradeCode: 'Gr-1', isGradeActive: true, displayOrder: 2 },
    ],
    createdOn: '2026-10-28T11:09:52Z',
    lastUpdatedOn: null,
  },
  {
    id: 24,
    standardCode: 'DIN-876',
    description: 'German standard for accuracy requirements of surface plates.',
    isActive: true,
    grades: [
      { id: 103, standardId: 24, standardCode: 'DIN-876', gradeId: 1, gradeCode: 'Gr-00', isGradeActive: true, displayOrder: 1 },
      { id: 104, standardId: 24, standardCode: 'DIN-876', gradeId: 2, gradeCode: 'Gr-0', isGradeActive: true, displayOrder: 2 },
      { id: 105, standardId: 24, standardCode: 'DIN-876', gradeId: 3, gradeCode: 'Gr-1', isGradeActive: true, displayOrder: 3 },
    ],
    createdOn: '2026-10-28T11:09:57Z',
    lastUpdatedOn: null,
  },
  {
    id: 25,
    standardCode: 'BS-817',
    description: 'British standard for surface plates and precision equipment.',
    isActive: true,
    grades: [
      { id: 106, standardId: 25, standardCode: 'BS-817', gradeId: 2, gradeCode: 'Gr-0', isGradeActive: true, displayOrder: 1 },
      { id: 107, standardId: 25, standardCode: 'BS-817', gradeId: 3, gradeCode: 'Gr-1', isGradeActive: true, displayOrder: 2 },
    ],
    createdOn: '2026-10-28T11:09:57Z',
    lastUpdatedOn: null,
  },
  {
    id: 30,
    standardCode: 'JIS B 7513',
    description: 'Japanese industrial standard for precision surface plates.',
    isActive: true,
    grades: [],
    createdOn: '2026-10-28T11:12:30Z',
    lastUpdatedOn: null,
  },
  {
    id: 35,
    standardCode: 'ASME B89.3.7',
    description: 'American standard specification for precision measurement surfaces.',
    isActive: false,
    grades: [],
    createdOn: '2026-10-28T11:16:00Z',
    lastUpdatedOn: null,
  },
];

function getStoredStandards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          ...s,
          grades: Array.isArray(s.grades)
            ? s.grades
            : (INITIAL_STANDARDS.find((init) => init.id === s.id)?.grades || []),
        }));
      }
    }
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
  gradeMapping: true,
};

export async function listStandards(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let items = getStoredStandards();

  const search = params.Search ?? params.search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    items = items.filter(
      (s) =>
        s.standardCode?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
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
    description:
      data.description !== undefined && data.description !== null && String(data.description).trim() !== ''
        ? String(data.description).trim()
        : null,
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
    description:
      data.description !== undefined && data.description !== null && String(data.description).trim() !== ''
        ? String(data.description).trim()
        : null,
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

/**
 * Mock: Returns every standard with its allowed grades.
 * GET /api/standards/grade-mapping?activeOnly=true
 *
 * @param {boolean} [activeOnly=true]
 * @returns {Promise<Array<{ standardId: number, standardCode: string, isActive: boolean, grades: Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }> }>>}
 */
export async function getGradeMapping(activeOnly = true) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredStandards();
  const filtered = activeOnly ? items.filter((s) => s.isActive !== false) : items;

  return filtered.map((s) => ({
    standardId: Number(s.id),
    standardCode: s.standardCode,
    isActive: Boolean(s.isActive),
    grades: (s.grades || [])
      .filter((g) => !activeOnly || g.isGradeActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((g, idx) => ({
        id: g.id || 1000 + idx,
        standardId: Number(s.id),
        standardCode: s.standardCode,
        gradeId: Number(g.gradeId),
        gradeCode: g.gradeCode || `Gr-${g.gradeId}`,
        isGradeActive: g.isGradeActive !== undefined ? Boolean(g.isGradeActive) : true,
        displayOrder: g.displayOrder !== undefined ? Number(g.displayOrder) : idx + 1,
      })),
  }));
}

/**
 * Mock: Returns allowed grades for a single standard in display order.
 * GET /api/standards/{id}/grades
 *
 * @param {number|string} standardId
 * @returns {Promise<Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }>>}
 */
export async function getStandardGrades(standardId) {
  await new Promise((r) => setTimeout(r, 150));
  const items = getStoredStandards();
  const standard = items.find((s) => String(s.id) === String(standardId));
  if (!standard) {
    const err = new Error('Standard not found');
    err.status = 404;
    throw err;
  }

  return (standard.grades || [])
    .slice()
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((g, idx) => ({
      id: g.id || 1000 + idx,
      standardId: Number(standard.id),
      standardCode: standard.standardCode,
      gradeId: Number(g.gradeId),
      gradeCode: g.gradeCode || `Gr-${g.gradeId}`,
      isGradeActive: g.isGradeActive !== undefined ? Boolean(g.isGradeActive) : true,
      displayOrder: g.displayOrder !== undefined ? Number(g.displayOrder) : idx + 1,
    }));
}

/**
 * Mock: Replaces a standard's allowed grades.
 * PUT /api/standards/{id}/grades
 *
 * @param {number|string} standardId
 * @param {Array<{ gradeId: number, displayOrder?: number }>} gradesArray
 * @returns {Promise<Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }>>}
 */
export async function updateStandardGrades(standardId, gradesArray = []) {
  await new Promise((r) => setTimeout(r, 200));
  const items = getStoredStandards();
  const idx = items.findIndex((s) => String(s.id) === String(standardId));
  if (idx === -1) {
    const err = new Error('Standard not found');
    err.status = 404;
    throw err;
  }

  // Deduplicate and validate
  const seen = new Set();
  for (let i = 0; i < gradesArray.length; i++) {
    const gId = Number(gradesArray[i]?.gradeId);
    if (seen.has(gId)) {
      const err = new Error(`Grade ID ${gId} is listed more than once.`);
      err.status = 400;
      throw err;
    }
    if (gId) seen.add(gId);
  }

  // Lookup existing gradeCodes or format fallback
  const existingGradesMap = new Map();
  (items[idx].grades || []).forEach((g) => {
    existingGradesMap.set(Number(g.gradeId), g.gradeCode);
  });

  const nextGrades = gradesArray.map((item, index) => {
    const gId = Number(item.gradeId);
    const existingCode = existingGradesMap.get(gId);
    const gradeCode = existingCode || (gId === 1 ? 'Gr-00' : gId === 2 ? 'Gr-0' : gId === 3 ? 'Gr-1' : gId === 4 ? 'Gr-2' : `Gr-${gId}`);
    return {
      id: 2000 + index,
      standardId: Number(standardId),
      standardCode: items[idx].standardCode,
      gradeId: gId,
      gradeCode,
      isGradeActive: true,
      displayOrder: item.displayOrder !== undefined && item.displayOrder !== null ? Number(item.displayOrder) : index + 1,
    };
  });

  items[idx] = {
    ...items[idx],
    grades: nextGrades,
    lastUpdatedOn: new Date().toISOString(),
  };

  saveStoredStandards(items);
  return nextGrades;
}
