/**
 * clientVersions.js — Utilities for effective-dated client version history.
 *
 * Implements temporal version resolution matching the Client API Integration Guide.
 * Version IDs are strictly integers (e.g. 1, 2, 3...) matching clientDetailId.
 */

import { computeRevisionStatuses } from './effectiveDateUtils';
import { getTodayISO, toISODate } from './dateUtils';

export function toIntegerVersionId(idVal, fallback = 1) {
  if (typeof idVal === 'number' && !isNaN(idVal) && idVal > 0) {
    return Math.floor(idVal);
  }
  if (typeof idVal === 'string') {
    if (/^\d+$/.test(idVal.trim())) {
      const parsed = parseInt(idVal.trim(), 10);
      if (parsed > 0) return parsed;
    }
    // Handle legacy formats like 'ver_1_0', 'ver_2', 'ver_cli_001_3'
    if (idVal.startsWith('ver_')) {
      const digits = idVal.match(/\d+/g);
      if (digits && digits.length > 0) {
        for (const d of digits) {
          const num = parseInt(d, 10);
          if (num > 0) return num;
        }
      }
    }
  }
  return typeof fallback === 'number' && fallback > 0 ? fallback : 1;
}

/**
 * Returns the version with the latest EffectiveDate <= asOfDate;
 * if none qualify (all versions are future-dated), fall back to the earliest future version.
 *
 * @param {Object} client - The client object containing effectiveVersions or versions array
 * @param {Date|string} asOfDate - Date reference (default: today)
 * @returns {Object|null} The active version object
 */
export function getActiveClientVersion(client, asOfDate = new Date()) {
  if (!client) return null;

  const versions = (Array.isArray(client.effectiveVersions) && client.effectiveVersions.length > 0)
    ? client.effectiveVersions
    : ((Array.isArray(client.versions) && client.versions.length > 0)
        ? client.versions
        : (client.currentDetail ? [client.currentDetail] : []));

  if (versions.length === 0) {
    const rawId = client.clientDetailId || client.currentDetail?.clientDetailId || client.clientId || client.id || 1;
    const numId = toIntegerVersionId(rawId, 1);

    return {
      id: numId,
      clientDetailId: numId,
      effectiveDate: client.effectiveDate || (client.createdAt ? String(client.createdAt).slice(0, 10) : getTodayISO()),
      companyName: client.companyName || client.clientName || '',
      clientName: client.clientName || client.companyName || '',
      billingName: client.billingName || '',
      contactTypeId: client.contactTypeId || client.contactType || 'Customer',
      contactType: client.contactType || client.contactTypeId || 'Customer',
      email: client.email || client.officialEmail || '',
      officialEmail: client.officialEmail || client.email || '',
      gstNo: client.gstNo || '',
      isActive: client.isActive !== false,
      paymentTerms: client.paymentTerms || [],
      deliveryTerms: client.deliveryTerms || '',
      comments: client.comments || client.internalComments || '',
      addresses: Array.isArray(client.addresses) ? client.addresses : [],
      contacts: Array.isArray(client.contacts) ? client.contacts : [],
      createdAt: client.createdAt || client.createdOn || new Date().toISOString(),
      updatedAt: client.updatedAt || client.lastUpdatedOn || null,
    };
  }

  const asOfStr =
    asOfDate instanceof Date
      ? toISODate(asOfDate)
      : String(asOfDate).slice(0, 10);

  // Versions with effectiveDate <= asOfDate
  const pastOrPresent = versions.filter(
    (v) => v.effectiveDate && String(v.effectiveDate).slice(0, 10) <= asOfStr
  );

  if (pastOrPresent.length > 0) {
    // Sort descending by effectiveDate to get the latest active
    const sorted = [...pastOrPresent].sort((a, b) =>
      String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || ''))
    );
    const chosen = sorted[0];
    const rawId = chosen.clientDetailId ?? chosen.id;
    const numId = toIntegerVersionId(rawId, 1);
    return {
      ...chosen,
      id: numId,
      clientDetailId: numId,
    };
  }

  // All versions are future-dated -> return the earliest future version
  const sortedFuture = [...versions].sort((a, b) =>
    String(a.effectiveDate || '').localeCompare(String(b.effectiveDate || ''))
  );
  const chosen = sortedFuture[0] || null;
  if (!chosen) return null;
  const rawId = chosen.clientDetailId ?? chosen.id;
  const numId = toIntegerVersionId(rawId, 1);
  return {
    ...chosen,
    id: numId,
    clientDetailId: numId,
  };
}

/**
 * Returns all revisions for a client sorted descending by effectiveDate,
 * annotated with temporal statuses (ACTIVE, GONE, SCHEDULED).
 *
 * @param {Object} client - Client object
 * @returns {Array} Sorted revisions array with live status info
 */
export function getClientRevisions(client) {
  if (!client) return [];

  let list = [];
  if (Array.isArray(client.effectiveVersions) && client.effectiveVersions.length > 0) {
    list = [...client.effectiveVersions];
  } else if (Array.isArray(client.versions) && client.versions.length > 0) {
    list = [...client.versions];
  } else if (client.currentDetail) {
    list = [client.currentDetail];
  } else {
    const rawId = client.clientDetailId || client.currentDetail?.clientDetailId || client.clientId || client.id || 1;
    const numId = toIntegerVersionId(rawId, 1);

    list = [
      {
        id: numId,
        clientDetailId: numId,
        effectiveDate: client.effectiveDate || (client.createdAt ? String(client.createdAt).slice(0, 10) : getTodayISO()),
        companyName: client.companyName || client.clientName || '',
        clientName: client.clientName || client.companyName || '',
        billingName: client.billingName || '',
        contactTypeId: client.contactTypeId || client.contactType || 'Customer',
        contactType: client.contactType || client.contactTypeId || 'Customer',
        email: client.email || client.officialEmail || '',
        officialEmail: client.officialEmail || client.email || '',
        gstNo: client.gstNo || '',
        isActive: client.isActive !== false,
        paymentTerms: client.paymentTerms || [],
        deliveryTerms: client.deliveryTerms || '',
        comments: client.comments || client.internalComments || '',
        addresses: Array.isArray(client.addresses) ? [...client.addresses] : [],
        contacts: Array.isArray(client.contacts) ? [...client.contacts] : [],
        createdAt: client.createdAt || client.createdOn || new Date().toISOString(),
        updatedAt: client.updatedAt || client.lastUpdatedOn || null,
      },
    ];
  }

  // Ensure each item has numeric integer id matching clientDetailId
  list = list.map((v, idx) => {
    const rawId = v.clientDetailId ?? v.id;
    const numId = toIntegerVersionId(rawId, idx + 1);
    return {
      ...v,
      id: numId,
      clientDetailId: numId,
    };
  });

  // Sort descending by effectiveDate
  const sorted = list.sort((a, b) =>
    String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || ''))
  );

  return computeRevisionStatuses(sorted);
}
