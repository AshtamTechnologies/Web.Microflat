/**
 * deliveryTermService.mock.js — In-memory mock service for Delivery Terms.
 * Conforms to Section 5.3 of Frontend-API-Guide.md.
 */

let mockDeliveryTerms = [
  {
    id: 1,
    termCode: 'EXW',
    termName: 'Ex-Works',
    description: '<p><strong>Ex-Works Vallabh Vidyanagar</strong>, freight, packaging, and transit insurance on buyer account.</p>',
    displayOrder: 1,
    isDefault: true,
    isActive: true,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
  {
    id: 2,
    termCode: 'FOB',
    termName: 'Free on Board',
    description: '<p><strong>FOB Nhava Sheva (JNPT) Seaport</strong>, including export crating and port clearance charges.</p>',
    displayOrder: 2,
    isDefault: false,
    isActive: true,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
  {
    id: 3,
    termCode: 'CIF',
    termName: 'Cost, Insurance & Freight',
    description: '<p><strong>CIF Destination Port</strong>, including ocean freight and marine cargo insurance up to port of arrival.</p>',
    displayOrder: 3,
    isDefault: false,
    isActive: true,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
  {
    id: 4,
    termCode: 'DOOR_DELIVERY',
    termName: 'Door Delivery Included',
    description: '<p><strong>Door Delivery</strong> at customer works premises via road transport, transit insurance included.</p>',
    displayOrder: 4,
    isDefault: false,
    isActive: true,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
  {
    id: 5,
    termCode: 'DDP',
    termName: 'Delivered Duty Paid',
    description: '<p><strong>Delivered Duty Paid</strong>, all import tariffs, local logistics, and unloading arranged.</p>',
    displayOrder: 5,
    isDefault: false,
    isActive: true,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
  {
    id: 6,
    termCode: 'CFR',
    termName: 'Cost and Freight',
    description: '<p><strong>CFR Destination Port</strong>, insurance on buyer account.</p>',
    displayOrder: 6,
    isDefault: false,
    isActive: false,
    createdOn: '2026-10-22T06:07:40Z',
    updatedOn: '2026-10-22T06:07:40Z',
  },
];

export async function listDeliveryTerms(params = {}) {
  await new Promise((r) => setTimeout(r, 120));

  let items = [...mockDeliveryTerms];

  const search = (params.search || params.Search || '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (term) =>
        term.termCode?.toLowerCase().includes(search) ||
        term.termName?.toLowerCase().includes(search) ||
        term.description?.toLowerCase().includes(search)
    );
  }

  if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
    const isActiveBool = String(params.isActive).toLowerCase() === 'true';
    items = items.filter((term) => term.isActive === isActiveBool);
  }

  // Ordered by displayOrder ascending
  items.sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));

  return items;
}

export async function getDeliveryTerm(id) {
  await new Promise((r) => setTimeout(r, 80));
  const numericId = Number(id);
  const found = mockDeliveryTerms.find((term) => term.id === numericId);
  if (!found) {
    const err = new Error(`Delivery term #${id} not found.`);
    err.response = { status: 404, data: { detail: `Delivery term #${id} not found.` } };
    throw err;
  }
  return { ...found };
}

export async function createDeliveryTerm(data) {
  await new Promise((r) => setTimeout(r, 150));

  const code = String(data.termCode || '').trim().toUpperCase();
  const duplicate = mockDeliveryTerms.find((t) => t.termCode.toUpperCase() === code);
  if (duplicate) {
    const err = new Error(`A delivery term with code '${code}' already exists.`);
    err.response = { status: 409, data: { detail: `A delivery term with code '${code}' already exists.` } };
    throw err;
  }

  const isDefault = Boolean(data.isDefault);
  if (isDefault) {
    mockDeliveryTerms = mockDeliveryTerms.map((t) => ({ ...t, isDefault: false }));
  }

  const newId = mockDeliveryTerms.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const now = new Date().toISOString();

  const newTerm = {
    id: newId,
    termCode: code,
    termName: String(data.termName || '').trim(),
    description: data.description || '',
    displayOrder: Number(data.displayOrder) || mockDeliveryTerms.length + 1,
    isDefault,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdOn: now,
    updatedOn: now,
  };

  mockDeliveryTerms.push(newTerm);
  return { ...newTerm };
}

export async function updateDeliveryTerm(id, data) {
  await new Promise((r) => setTimeout(r, 150));
  const numericId = Number(id);
  const index = mockDeliveryTerms.findIndex((t) => t.id === numericId);

  if (index === -1) {
    const err = new Error(`Delivery term #${id} not found.`);
    err.response = { status: 404, data: { detail: `Delivery term #${id} not found.` } };
    throw err;
  }

  const code = String(data.termCode || '').trim().toUpperCase();
  const duplicate = mockDeliveryTerms.find((t) => t.id !== numericId && t.termCode.toUpperCase() === code);
  if (duplicate) {
    const err = new Error(`A delivery term with code '${code}' already exists.`);
    err.response = { status: 409, data: { detail: `A delivery term with code '${code}' already exists.` } };
    throw err;
  }

  const isDefault = Boolean(data.isDefault);
  if (isDefault) {
    mockDeliveryTerms = mockDeliveryTerms.map((t) => (t.id === numericId ? t : { ...t, isDefault: false }));
  }

  mockDeliveryTerms[index] = {
    ...mockDeliveryTerms[index],
    termCode: code,
    termName: String(data.termName || '').trim(),
    description: data.description !== undefined ? data.description : mockDeliveryTerms[index].description,
    displayOrder: Number(data.displayOrder) || mockDeliveryTerms[index].displayOrder,
    isDefault,
    updatedOn: new Date().toISOString(),
  };

  return { ...mockDeliveryTerms[index] };
}

export async function updateDeliveryTermStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 100));
  const numericId = Number(id);
  const index = mockDeliveryTerms.findIndex((t) => t.id === numericId);

  if (index === -1) {
    const err = new Error(`Delivery term #${id} not found.`);
    err.response = { status: 404, data: { detail: `Delivery term #${id} not found.` } };
    throw err;
  }

  const nextActive = Boolean(isActive);
  // If deactivating a default term, clear isDefault
  const isDefault = nextActive ? mockDeliveryTerms[index].isDefault : false;

  mockDeliveryTerms[index] = {
    ...mockDeliveryTerms[index],
    isActive: nextActive,
    isDefault,
    updatedOn: new Date().toISOString(),
  };

  return { ...mockDeliveryTerms[index] };
}

