/**
 * documentTypeModel.js — Document Type typedefs, mappers, and serializers.
 *
 * Handles field normalization between the backend API and frontend:
 *   - id / documentTypeId
 *   - documentTypeName / typeName
 *   - maxFileSizeMB / maxSizeMB
 *   - allowedExtensions string & allowedExtensionList array
 *   - createdOn -> createdAt
 *   - lastUpdatedOn -> updatedAt
 *
 * @typedef {Object} ApiDocumentTypeDto
 * @property {number} id
 * @property {number} moduleId
 * @property {string} moduleCode
 * @property {string} documentTypeName
 * @property {string} description
 * @property {number} maxFileSizeMB
 * @property {string} allowedExtensions
 * @property {string[]} [allowedExtensionList]
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} DocumentTypeModel
 * @property {number} id
 * @property {number} documentTypeId
 * @property {number|null} moduleId
 * @property {string} moduleCode
 * @property {string} documentTypeName
 * @property {string} typeName
 * @property {string} description
 * @property {number} maxFileSizeMB
 * @property {number} maxSizeMB
 * @property {string} allowedExtensions
 * @property {string[]} allowedExtensionList
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} createdOn
 * @property {string|null} updatedAt
 * @property {string|null} lastUpdatedOn
 *
 * @typedef {Object} ApiModuleDto
 * @property {number} id
 * @property {string} moduleCode
 * @property {string} moduleName
 * @property {boolean} isActive
 * @property {number} [documentTypeCount]
 * @property {number} [approvalTypeCount]
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} ModuleModel
 * @property {number} id
 * @property {string} moduleCode
 * @property {string} moduleName
 * @property {boolean} isActive
 * @property {number} documentTypeCount
 * @property {number} approvalTypeCount
 * @property {string} createdAt
 * @property {string} createdOn
 * @property {string|null} updatedAt
 * @property {string|null} lastUpdatedOn
 */

/**
 * Creates an empty DocumentType model.
 * @returns {DocumentTypeModel}
 */
export function createEmptyDocumentType() {
  return {
    id: 0,
    documentTypeId: 0,
    moduleId: null,
    moduleCode: '',
    documentTypeName: '',
    typeName: '',
    description: '',
    maxFileSizeMB: 5,
    maxSizeMB: 5,
    allowedExtensions: '.pdf',
    allowedExtensionList: ['.pdf'],
    isActive: true,
    createdAt: '',
    createdOn: '',
    updatedAt: null,
    lastUpdatedOn: null,
  };
}

/**
 * Normalizes an API DocumentType DTO to a frontend DocumentTypeModel.
 * Preserves backward compatibility with legacy consumers (typeName, maxSizeMB, documentTypeId).
 *
 * @param {ApiDocumentTypeDto|object} dto
 * @returns {DocumentTypeModel}
 */
export function documentTypeFromApi(dto) {
  if (!dto) return createEmptyDocumentType();

  const id = dto.id !== undefined ? dto.id : dto.documentTypeId ?? 0;
  const rawExtensions = dto.allowedExtensions || '';
  const extensionList = Array.isArray(dto.allowedExtensionList) && dto.allowedExtensionList.length > 0
    ? dto.allowedExtensionList
    : typeof rawExtensions === 'string' && rawExtensions.trim()
      ? rawExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : Array.isArray(rawExtensions)
        ? rawExtensions
        : ['.pdf'];

  const extensionString = Array.isArray(extensionList) ? extensionList.join(',') : String(rawExtensions);

  const name = dto.documentTypeName || dto.typeName || '';
  const maxMb = Number(dto.maxFileSizeMB !== undefined ? dto.maxFileSizeMB : dto.maxSizeMB) || 5;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    documentTypeId: id,
    moduleId: dto.moduleId ?? null,
    moduleCode: dto.moduleCode || '',
    documentTypeName: name,
    typeName: name,
    description: dto.description || '',
    maxFileSizeMB: maxMb,
    maxSizeMB: maxMb,
    allowedExtensions: extensionString,
    allowedExtensionList: extensionList,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdAt: created,
    createdOn: created,
    updatedAt: updated,
    lastUpdatedOn: updated,
  };
}

/**
 * Maps an array of API DocumentType DTOs to DocumentTypeModels.
 * @param {ApiDocumentTypeDto[]} [list]
 * @returns {DocumentTypeModel[]}
 */
export function documentTypesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(documentTypeFromApi);
}

/**
 * Serializes frontend form data or DocumentTypeModel to the exact API payload format.
 *
 * @param {{ moduleId: number|string, documentTypeName: string, description?: string, maxFileSizeMB?: number|string, allowedExtensions: string|string[] }} data
 * @returns {{ moduleId: number, documentTypeName: string, description: string, maxFileSizeMB: number, allowedExtensions: string }}
 */
export function documentTypeToApi(data = {}) {
  const allowedExtensions = Array.isArray(data.allowedExtensions)
    ? data.allowedExtensions.join(',')
    : typeof data.allowedExtensions === 'string'
      ? data.allowedExtensions.trim()
      : '.pdf';

  return {
    moduleId: Number(data.moduleId),
    documentTypeName: String(data.documentTypeName || data.typeName || '').trim(),
    description: String(data.description || '').trim(),
    maxFileSizeMB: Number(data.maxFileSizeMB ?? data.maxSizeMB) || 5,
    allowedExtensions,
  };
}

/**
 * Normalizes an API Module DTO to a ModuleModel.
 * @param {ApiModuleDto|object} dto
 * @returns {ModuleModel}
 */
export function moduleFromApi(dto) {
  if (!dto) {
    return {
      id: 0,
      moduleCode: '',
      moduleName: '',
      isActive: true,
      documentTypeCount: 0,
      approvalTypeCount: 0,
      createdAt: '',
      createdOn: '',
      updatedAt: null,
      lastUpdatedOn: null,
    };
  }

  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id: dto.id,
    moduleCode: dto.moduleCode || '',
    moduleName: dto.moduleName || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    documentTypeCount: dto.documentTypeCount ?? 0,
    approvalTypeCount: dto.approvalTypeCount ?? 0,
    createdAt: created,
    createdOn: created,
    updatedAt: updated,
    lastUpdatedOn: updated,
  };
}

/**
 * Maps an array of API Module DTOs to ModuleModels.
 * @param {ApiModuleDto[]} [list]
 * @returns {ModuleModel[]}
 */
export function modulesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(moduleFromApi);
}
