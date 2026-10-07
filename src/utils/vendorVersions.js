/**
 * vendorVersions.js — Utilities for effective-dated vendor version history.
 */

/**
 * Returns the version with the latest EffectiveDate <= asOfDate;
 * if none qualify (all versions are future-dated), fall back to the earliest future version.
 *
 * @param {Object} vendor - The vendor object containing effectiveVersions array
 * @param {Date|string} asOfDate - Date reference (default: now)
 * @returns {Object|null} The active version object
 */
export function getActiveVendorVersion(vendor, asOfDate = new Date()) {
  if (!vendor) return null;

  const versions = Array.isArray(vendor.effectiveVersions)
    ? vendor.effectiveVersions
    : [];

  if (versions.length === 0) {
    // If effectiveVersions is not yet present, construct fallback from vendor top-level properties
    return {
      id: vendor.id ? `ver_${vendor.id}_0` : 'ver_0',
      effectiveDate: vendor.effectiveDate || new Date().toISOString().slice(0, 10),
      contactPersonName: vendor.contactPersonName || '',
      phoneNo: vendor.phoneNo || '',
      alternatePhoneNo: vendor.alternatePhoneNo || '',
      gstNo: vendor.gstNo || '',
      website: vendor.website || '',
      email: vendor.email || '',
      countryId: vendor.countryId || 'IN',
      stateId: vendor.stateId || '',
      city: vendor.city || '',
      zipCode: vendor.zipCode || '',
      address1: vendor.address1 || '',
      address2: vendor.address2 || '',
      notes: vendor.notes || '',
      createdOn: vendor.createdOn || new Date().toISOString(),
      createdBy: vendor.createdBy || 'System',
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
    // Sort descending by effectiveDate to get the latest
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
