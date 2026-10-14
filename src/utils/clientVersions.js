/**
 * clientVersions.js — Utilities for effective-dated client version history.
 *
 * Implements temporal version resolution matching the Vendor module pattern.
 */

import { computeRevisionStatuses } from './effectiveDateUtils';

/**
 * Returns the version with the latest EffectiveDate <= asOfDate;
 * if none qualify (all versions are future-dated), fall back to the earliest future version.
 *
 * @param {Object} client - The client object containing effectiveVersions array
 * @param {Date|string} asOfDate - Date reference (default: today)
 * @returns {Object|null} The active version object
 */
export function getActiveClientVersion(client, asOfDate = new Date()) {
  if (!client) return null;

  const versions = Array.isArray(client.effectiveVersions)
    ? client.effectiveVersions
    : [];

  if (versions.length === 0) {
    // If effectiveVersions is not yet present, construct fallback from client top-level properties
    return {
      id: client.clientId ? `ver_${client.clientId}_0` : 'ver_0',
      effectiveDate: client.effectiveDate || (client.createdAt ? client.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      companyName: client.companyName || '',
      billingName: client.billingName || '',
      contactTypeId: client.contactTypeId || 'Customer',
      email: client.email || '',
      gstNo: client.gstNo || '',
      isActive: client.isActive !== false,
      paymentTerms: client.paymentTerms || [],
      deliveryTerms: client.deliveryTerms || '',
      comments: client.comments || '',
      addresses: Array.isArray(client.addresses) ? client.addresses : [],
      contacts: Array.isArray(client.contacts) ? client.contacts : [],
      createdAt: client.createdAt || new Date().toISOString(),
      updatedAt: client.updatedAt || null,
    };
  }

  const asOfStr =
    asOfDate instanceof Date
      ? asOfDate.toISOString().slice(0, 10)
      : String(asOfDate).slice(0, 10);

  // Versions with effectiveDate <= asOfDate
  const pastOrPresent = versions.filter(
    (v) => v.effectiveDate && v.effectiveDate <= asOfStr
  );

  if (pastOrPresent.length > 0) {
    // Sort descending by effectiveDate to get the latest active
    const sorted = [...pastOrPresent].sort((a, b) =>
      b.effectiveDate.localeCompare(a.effectiveDate)
    );
    return sorted[0];
  }

  // All versions are future-dated -> return the earliest future version
  const sortedFuture = [...versions].sort((a, b) =>
    (a.effectiveDate || '').localeCompare(b.effectiveDate || '')
  );
  return sortedFuture[0] || null;
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
  } else {
    // Synthesize initial revision from master record
    list = [
      {
        id: client.clientId ? `ver_${client.clientId}_1` : 'ver_1',
        effectiveDate: client.effectiveDate || (client.createdAt ? client.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
        companyName: client.companyName || '',
        billingName: client.billingName || '',
        contactTypeId: client.contactTypeId || 'Customer',
        email: client.email || '',
        gstNo: client.gstNo || '',
        isActive: client.isActive !== false,
        paymentTerms: client.paymentTerms || [],
        deliveryTerms: client.deliveryTerms || '',
        comments: client.comments || '',
        addresses: Array.isArray(client.addresses) ? [...client.addresses] : [],
        contacts: Array.isArray(client.contacts) ? [...client.contacts] : [],
        createdAt: client.createdAt || new Date().toISOString(),
        updatedAt: client.updatedAt || null,
      },
    ];
  }

  // Sort descending by effectiveDate
  const sorted = list.sort((a, b) =>
    (b.effectiveDate || '').localeCompare(a.effectiveDate || '')
  );

  return computeRevisionStatuses(sorted);
}
