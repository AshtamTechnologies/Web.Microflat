/**
 * src/services/documentTypes/documentTypesService.mock.js — Offline mock service for Document Types.
 */

import {
  documentTypeFromApi,
  documentTypesFromApi,
  modulesFromApi,
} from '../../models/documentTypes/documentTypeModel';

export const MOCK_MODULES = [
  {
    id: 1,
    moduleCode: 'VENDOR',
    moduleName: 'Vendor Management',
    isActive: true,
    documentTypeCount: 9,
    approvalTypeCount: 2,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 2,
    moduleCode: 'CLIENT',
    moduleName: 'Client Master',
    isActive: true,
    documentTypeCount: 4,
    approvalTypeCount: 1,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 3,
    moduleCode: 'INQUIRY',
    moduleName: 'Inquiry & RFQ',
    isActive: true,
    documentTypeCount: 6,
    approvalTypeCount: 2,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
];

let mockDocumentTypes = [
  {
    id: 1,
    moduleId: 1,
    moduleCode: 'VENDOR',
    documentTypeName: 'GST Certificate',
    description: 'GST registration certificate (GSTIN).',
    maxFileSizeMB: 5,
    allowedExtensions: '.pdf,.jpg,.jpeg,.png',
    allowedExtensionList: ['.pdf', '.jpg', '.jpeg', '.png'],
    isActive: true,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 5,
    moduleId: 1,
    moduleCode: 'VENDOR',
    documentTypeName: 'Bank Cancelled Cheque',
    description: 'Cancelled cheque of the vendor bank account.',
    maxFileSizeMB: 5,
    allowedExtensions: '.pdf,.jpg,.jpeg,.png',
    allowedExtensionList: ['.pdf', '.jpg', '.jpeg', '.png'],
    isActive: true,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 7,
    moduleId: 1,
    moduleCode: 'VENDOR',
    documentTypeName: 'Bank Confirmation Letter',
    description: 'Bank letter confirming the account details.',
    maxFileSizeMB: 5,
    allowedExtensions: '.pdf,.jpg,.jpeg,.png',
    allowedExtensionList: ['.pdf', '.jpg', '.jpeg', '.png'],
    isActive: true,
    createdOn: '2026-01-01T00:00:00Z',
    lastUpdatedOn: null,
  },
  {
    id: 8,
    moduleId: 3,
    moduleCode: 'INQUIRY',
    documentTypeName: 'Technical Specification Sheet',
    description: 'Engineering drawing and technical spec sheet for quotation.',
    maxFileSizeMB: 25,
    allowedExtensions: '.pdf,.dwg,.dxf,.zip',
    allowedExtensionList: ['.pdf', '.dwg', '.dxf', '.zip'],
    isActive: true,
    createdOn: '2026-01-10T00:00:00Z',
    lastUpdatedOn: null,
  },
];

export async function listDocumentTypes(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let list = [...mockDocumentTypes];

  const modId = params.moduleId ?? params.ModuleId;
  if (modId !== undefined && modId !== null && modId !== '' && modId !== 'ALL') {
    list = list.filter((item) => String(item.moduleId) === String(modId));
  }

  const modCode = params.moduleCode ?? params.ModuleCode;
  if (modCode && modCode !== 'ALL') {
    list = list.filter((item) => (item.moduleCode || '').toLowerCase() === String(modCode).toLowerCase());
  }

  const act = params.isActive ?? params.IsActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const boolAct = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    list = list.filter((item) => Boolean(item.isActive) === boolAct);
  }

  return documentTypesFromApi(list);
}

export async function getDocumentType(id) {
  await new Promise((r) => setTimeout(r, 150));
  const found = mockDocumentTypes.find((d) => String(d.id) === String(id));
  if (!found) throw new Error('Document type not found');
  return documentTypeFromApi(found);
}

export async function createDocumentType(data) {
  await new Promise((r) => setTimeout(r, 250));
  const nextId = mockDocumentTypes.length > 0 ? Math.max(...mockDocumentTypes.map((d) => Number(d.id) || 0)) + 1 : 1;
  const mod = MOCK_MODULES.find((m) => m.id === Number(data.moduleId));

  const allowedExtensions = Array.isArray(data.allowedExtensions)
    ? data.allowedExtensions.join(',')
    : String(data.allowedExtensions || '.pdf');
  const allowedExtensionList = allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

  const newDoc = {
    id: nextId,
    moduleId: Number(data.moduleId),
    moduleCode: mod ? mod.moduleCode : 'GENERAL',
    documentTypeName: data.documentTypeName.trim(),
    description: (data.description || '').trim(),
    maxFileSizeMB: Number(data.maxFileSizeMB) || 5,
    allowedExtensions,
    allowedExtensionList,
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };

  mockDocumentTypes.unshift(newDoc);
  return documentTypeFromApi(newDoc);
}

export async function updateDocumentType(id, data) {
  await new Promise((r) => setTimeout(r, 250));
  const index = mockDocumentTypes.findIndex((d) => String(d.id) === String(id));
  if (index === -1) throw new Error('Document type not found');

  const mod = MOCK_MODULES.find((m) => m.id === Number(data.moduleId));
  const allowedExtensions = Array.isArray(data.allowedExtensions)
    ? data.allowedExtensions.join(',')
    : String(data.allowedExtensions || '.pdf');
  const allowedExtensionList = allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

  mockDocumentTypes[index] = {
    ...mockDocumentTypes[index],
    moduleId: Number(data.moduleId),
    moduleCode: mod ? mod.moduleCode : mockDocumentTypes[index].moduleCode,
    documentTypeName: data.documentTypeName.trim(),
    description: (data.description || '').trim(),
    maxFileSizeMB: Number(data.maxFileSizeMB) || 5,
    allowedExtensions,
    allowedExtensionList,
    lastUpdatedOn: new Date().toISOString(),
  };

  return documentTypeFromApi(mockDocumentTypes[index]);
}

export async function updateDocumentTypeStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const index = mockDocumentTypes.findIndex((d) => String(d.id) === String(id));
  if (index === -1) throw new Error('Document type not found');

  mockDocumentTypes[index] = {
    ...mockDocumentTypes[index],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };

  return { success: true, id, isActive: Boolean(isActive) };
}

export async function listModules() {
  await new Promise((r) => setTimeout(r, 150));
  return modulesFromApi(MOCK_MODULES);
}
