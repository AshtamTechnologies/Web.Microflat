/**
 * emailTemplatesService.mock.js — In-memory mock service for Master Email Templates.
 * Allows offline development and testing matching the backend schema.
 */

import {
  INITIAL_EMAIL_TEMPLATES,
  EMAIL_MODULE_OPTIONS,
} from '../../mocks/emailTemplates';
import {
  emailTemplateFromApi,
  emailTemplatesFromApi,
} from '../../models/emailTemplates/emailTemplateModel';

const STORAGE_KEY = 'microflat_email_templates';

function getStoredTemplates() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  return [...INITIAL_EMAIL_TEMPLATES];
}

function saveTemplates(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let inMemoryTemplates = getStoredTemplates();

export async function listEmailTemplates(params = {}) {
  await new Promise((r) => setTimeout(r, 60));
  inMemoryTemplates = getStoredTemplates();

  let results = [...inMemoryTemplates];

  const mod = params.moduleName || params.ModuleName;
  if (mod && mod !== 'ALL') {
    results = results.filter((t) => (t.moduleName || '').toUpperCase() === mod.toUpperCase());
  }

  const stat = params.status || params.Status;
  if (stat && stat !== 'ALL') {
    results = results.filter((t) => (t.status || '').toLowerCase() === stat.toLowerCase());
  }

  const search = params.search || params.Search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    results = results.filter(
      (t) =>
        (t.templateCode || '').toLowerCase().includes(q) ||
        (t.templateName || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
    );
  }

  const pageNumber = Number(params.pageNumber || 1);
  const pageSize = Number(params.pageSize || 10);
  const totalCount = results.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const paginatedItems = results.slice(start, start + pageSize);

  return {
    items: paginatedItems.map(emailTemplateFromApi),
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getEmailTemplate(id) {
  await new Promise((r) => setTimeout(r, 40));
  inMemoryTemplates = getStoredTemplates();
  const template = inMemoryTemplates.find((t) => String(t.id) === String(id));
  if (!template) {
    throw new Error(`Email template with ID ${id} not found.`);
  }
  return emailTemplateFromApi(template);
}

export async function getEmailTemplateByCode(code) {
  await new Promise((r) => setTimeout(r, 40));
  inMemoryTemplates = getStoredTemplates();
  const template = inMemoryTemplates.find(
    (t) => (t.templateCode || '').toUpperCase() === String(code).toUpperCase()
  );
  if (!template) {
    throw new Error(`Email template with code ${code} not found.`);
  }
  return emailTemplateFromApi(template);
}

export async function createEmailTemplate(data) {
  await new Promise((r) => setTimeout(r, 80));
  inMemoryTemplates = getStoredTemplates();

  const code = String(data.templateCode || '').trim().toUpperCase();
  const exists = inMemoryTemplates.some((t) => t.templateCode.toUpperCase() === code);
  if (exists) {
    const error = new Error(`Template code '${code}' already exists.`);
    error.status = 409;
    throw error;
  }

  const newId = inMemoryTemplates.length > 0 ? Math.max(...inMemoryTemplates.map((t) => t.id)) + 1 : 1;
  const placeholders = Array.isArray(data.availablePlaceholders)
    ? data.availablePlaceholders
    : typeof data.availablePlaceholders === 'string'
    ? data.availablePlaceholders.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  const newTemplate = {
    id: newId,
    templateCode: code,
    templateName: data.templateName || '',
    moduleName: (data.moduleName || 'GENERAL').toUpperCase(),
    subject: data.subject || '',
    body: data.body || '',
    availablePlaceholders: placeholders,
    status: data.status || 'Active',
    createdOn: new Date().toISOString(),
    updatedOn: new Date().toISOString(),
  };

  inMemoryTemplates.unshift(newTemplate);
  saveTemplates(inMemoryTemplates);
  return emailTemplateFromApi(newTemplate);
}

export async function updateEmailTemplate(id, data) {
  await new Promise((r) => setTimeout(r, 80));
  inMemoryTemplates = getStoredTemplates();

  const idx = inMemoryTemplates.findIndex((t) => String(t.id) === String(id));
  if (idx === -1) {
    throw new Error(`Template with ID ${id} not found.`);
  }

  const existing = inMemoryTemplates[idx];
  const placeholders = Array.isArray(data.availablePlaceholders)
    ? data.availablePlaceholders
    : typeof data.availablePlaceholders === 'string'
    ? data.availablePlaceholders.split(',').map((p) => p.trim()).filter(Boolean)
    : existing.availablePlaceholders;

  const updated = {
    ...existing,
    templateName: data.templateName ?? existing.templateName,
    moduleName: data.moduleName ? data.moduleName.toUpperCase() : existing.moduleName,
    subject: data.subject ?? existing.subject,
    body: data.body ?? existing.body,
    availablePlaceholders: placeholders,
    updatedOn: new Date().toISOString(),
  };

  inMemoryTemplates[idx] = updated;
  saveTemplates(inMemoryTemplates);
  return emailTemplateFromApi(updated);
}

export async function changeEmailTemplateStatus(id, status) {
  await new Promise((r) => setTimeout(r, 60));
  inMemoryTemplates = getStoredTemplates();

  const idx = inMemoryTemplates.findIndex((t) => String(t.id) === String(id));
  if (idx === -1) {
    throw new Error(`Template with ID ${id} not found.`);
  }

  const updatedStatus = String(status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
  inMemoryTemplates[idx].status = updatedStatus;
  inMemoryTemplates[idx].updatedOn = new Date().toISOString();
  saveTemplates(inMemoryTemplates);
  return { success: true, status: updatedStatus };
}

export async function deleteEmailTemplate(id) {
  await new Promise((r) => setTimeout(r, 60));
  inMemoryTemplates = getStoredTemplates();

  const idx = inMemoryTemplates.findIndex((t) => String(t.id) === String(id));
  if (idx === -1) {
    throw new Error(`Template with ID ${id} not found.`);
  }

  inMemoryTemplates.splice(idx, 1);
  saveTemplates(inMemoryTemplates);
  return true;
}

export async function previewEmailTemplate(id, values = {}) {
  await new Promise((r) => setTimeout(r, 50));
  const template = await getEmailTemplate(id);

  let renderedSubject = template.subject || '';
  let renderedBody = template.body || '';
  const missingPlaceholders = [];

  template.availablePlaceholders.forEach((token) => {
    const val = values[token];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const reg = new RegExp(`\\{\\{${token}\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(reg, String(val));
      renderedBody = renderedBody.replace(reg, String(val));
    } else {
      missingPlaceholders.push(token);
    }
  });

  return {
    subject: renderedSubject,
    body: renderedBody,
    missingPlaceholders,
  };
}

export async function listModules() {
  await new Promise((r) => setTimeout(r, 30));
  return EMAIL_MODULE_OPTIONS.map((opt) => ({
    id: opt.value,
    moduleCode: opt.value,
    moduleName: opt.label,
    isActive: true,
  }));
}

export async function listEmailLogs() {
  return { items: [], totalCount: 0 };
}

