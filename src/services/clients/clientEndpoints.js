/**
 * src/services/clients/clientEndpoints.js — Centralized API endpoints for Clients & Client Versions.
 * Based on Client API Integration Guide (Oct 30, 2026).
 */

function cleanNumericId(val, fallback = 1) {
  if (typeof val === 'number' && !isNaN(val) && val > 0) return Math.floor(val);
  if (typeof val === 'string') {
    if (/^\d+$/.test(val.trim())) {
      const parsed = parseInt(val.trim(), 10);
      if (parsed > 0) return parsed;
    }
    if (val.startsWith('ver_')) {
      const digits = val.match(/\d+/g);
      if (digits && digits.length > 0) {
        for (const d of digits) {
          const num = parseInt(d, 10);
          if (num > 0) return num;
        }
      }
    }
  }
  return fallback;
}

export const CLIENT_ENDPOINTS = {
  // Client Master & Header
  CLIENTS: '/api/clients',
  SUMMARY: '/api/clients/summary',
  LOOKUPS: '/api/clients/lookups',
  ACTIVE: '/api/clients/active',
  CLIENT_BY_ID: (id) => `/api/clients/${cleanNumericId(id, id)}`,
  STATUS: (id) => `/api/clients/${cleanNumericId(id, id)}/status`,
  VERSIONS: (id) => `/api/clients/${cleanNumericId(id, id)}/versions`,

  // Client Version Lifecycle
  VERSION_BY_ID: (versionId) => `/api/client-versions/${cleanNumericId(versionId, 1)}`,
};

