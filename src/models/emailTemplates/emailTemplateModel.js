/**
 * emailTemplateModel.js — Data models, normalizers, and serializers for Email Templates.
 *
 * Conforms to Section 5.4i ("Email templates, meetings, My Queue & notifications") of Frontend-API-Guide 1.md:
 * - id: integer
 * - templateCode: string (e.g. "VENDOR_APPROVED", immutable after creation)
 * - templateName: string
 * - moduleName: string (e.g. "VENDOR", "INQUIRY", "QUOTATION", etc.)
 * - subject: string (can contain {{Marker}} tokens)
 * - body: string (HTML, can contain {{Marker}} tokens)
 * - availablePlaceholders: string[] (list of valid placeholder variable names)
 * - status: 'Active' | 'Inactive'
 * - createdOn, updatedOn
 */

/**
 * Normalizes placeholders whether received as an array, comma-separated string, or null.
 *
 * @param {string[]|string|null|undefined} raw
 * @returns {string[]}
 */
export function normalizePlaceholders(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Normalizes a single email template record from the API response.
 * Handles both camelCase and PascalCase backend responses.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function emailTemplateFromApi(raw = {}) {
  if (!raw) return null;

  const id = raw.id ?? raw.emailTemplateId ?? raw.Id ?? 0;
  const templateCode = raw.templateCode || raw.TemplateCode || '';
  const templateName = raw.templateName || raw.TemplateName || '';
  const moduleName = (raw.moduleName || raw.ModuleName || 'GENERAL').toUpperCase();
  const subject = raw.subject || raw.Subject || '';
  const body = raw.body || raw.Body || '';

  // API might return availablePlaceholders or placeholders
  const rawPlaceholders =
    raw.availablePlaceholders ??
    raw.AvailablePlaceholders ??
    raw.placeholders ??
    raw.Placeholders ??
    [];
  const availablePlaceholders = normalizePlaceholders(rawPlaceholders);

  // Status can be boolean isActive or string status
  let status = 'Active';
  if (raw.status !== undefined || raw.Status !== undefined) {
    const s = String(raw.status || raw.Status).trim();
    status = s.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
  } else if (raw.isActive !== undefined || raw.IsActive !== undefined) {
    status = raw.isActive || raw.IsActive ? 'Active' : 'Inactive';
  }

  const createdOn =
    raw.createdOn || raw.CreatedOn || raw.createdAt || raw.CreatedAt || null;
  const updatedOn =
    raw.updatedOn ||
    raw.UpdatedOn ||
    raw.lastUpdatedOn ||
    raw.LastUpdatedOn ||
    raw.updatedAt ||
    raw.UpdatedAt ||
    null;

  return {
    id,
    templateCode,
    templateName,
    moduleName,
    subject,
    body,
    availablePlaceholders,
    status,
    isActive: status === 'Active',
    createdOn,
    updatedOn,
  };
}

/**
 * Normalizes a list of email templates from the API.
 * Handles both plain arrays and wrapped paginated responses { items: [...] }.
 *
 * @param {unknown} data
 * @returns {{ items: object[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function emailTemplatesFromApi(data) {
  if (!data) {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
  }

  let items = [];
  let totalCount = 0;
  let pageNumber = 1;
  let pageSize = 10;
  let totalPages = 1;

  if (Array.isArray(data)) {
    items = data.map(emailTemplateFromApi).filter(Boolean);
    totalCount = items.length;
    totalPages = Math.ceil(totalCount / pageSize) || 1;
  } else if (typeof data === 'object') {
    const rawItems = data.items || data.Items || data.data || [];
    items = Array.isArray(rawItems) ? rawItems.map(emailTemplateFromApi).filter(Boolean) : [];
    totalCount = data.totalCount ?? data.TotalCount ?? items.length;
    pageNumber = data.pageNumber ?? data.PageNumber ?? 1;
    pageSize = data.pageSize ?? data.PageSize ?? 10;
    totalPages = data.totalPages ?? data.TotalPages ?? (Math.ceil(totalCount / pageSize) || 1);
  }

  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

/**
 * Serializes frontend form data to the backend POST payload (Create).
 *
 * @param {object} form
 * @returns {object}
 */
export function emailTemplateToCreateApi(form = {}) {
  const placeholders = Array.isArray(form.availablePlaceholders)
    ? form.availablePlaceholders.join(', ')
    : String(form.availablePlaceholders || '');

  return {
    templateCode: String(form.templateCode || '').trim().toUpperCase(),
    templateName: String(form.templateName || '').trim(),
    moduleName: String(form.moduleName || '').trim().toUpperCase(),
    subject: String(form.subject || '').trim(),
    body: form.body || '',
    availablePlaceholders: placeholders || undefined,
  };
}

/**
 * Serializes frontend form data to the backend PUT payload (Edit).
 * NOTE: As per Section 5.4i, templateCode MUST NOT be included on edit.
 *
 * @param {object} form
 * @returns {object}
 */
export function emailTemplateToUpdateApi(form = {}) {
  const placeholders = Array.isArray(form.availablePlaceholders)
    ? form.availablePlaceholders.join(', ')
    : String(form.availablePlaceholders || '');

  return {
    templateName: String(form.templateName || '').trim(),
    moduleName: String(form.moduleName || '').trim().toUpperCase(),
    subject: String(form.subject || '').trim(),
    body: form.body || '',
    availablePlaceholders: placeholders || undefined,
  };
}

