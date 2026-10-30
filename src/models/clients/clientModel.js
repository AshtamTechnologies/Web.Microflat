/**
 * src/models/clients/clientModel.js — Data models and transformation adapters for Clients.
 * Implements schemas defined in Client API Integration Guide (Oct 30, 2026).
 */

/**
 * Maps a single contact UI row to ClientContactRequest payload.
 */
export function clientContactToApi(contact) {
  const rawId = contact.clientContactId ?? contact.id;
  const numId = typeof rawId === 'number' ? rawId : (typeof rawId === 'string' && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null);

  return {
    id: numId,
    firstName: (contact.firstName || '').trim(),
    lastName: (contact.lastName || '').trim() || null,
    email: (contact.email || '').trim().toLowerCase() || null,
    phoneNo: String(contact.phoneNo || contact.mobile1 || '').trim(),
    alternatePhoneNo: String(contact.alternatePhoneNo || contact.mobile2 || '').trim() || null,
    isPrimary: Boolean(contact.isPrimary),
    isActive: contact.isActive !== false,
  };
}

/**
 * Maps a single address UI row to ClientAddressRequest payload.
 */
export function clientAddressToApi(address) {
  const rawId = address.clientAddressId ?? address.id;
  const numId = typeof rawId === 'number' ? rawId : (typeof rawId === 'string' && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null);

  const rawCountryId = address.countryId;
  const countryId = typeof rawCountryId === 'number' ? rawCountryId : parseInt(rawCountryId, 10) || 0;

  const rawStateId = address.stateId;
  const stateId = rawStateId !== null && rawStateId !== undefined && rawStateId !== ''
    ? (typeof rawStateId === 'number' ? rawStateId : parseInt(rawStateId, 10) || null)
    : null;

  return {
    id: numId,
    addressType: address.addressType || 'Billing',
    addressLabel: (address.addressLabel || '').trim() || null,
    address1: (address.address1 || '').trim(),
    address2: (address.address2 || '').trim() || null,
    countryId,
    stateId,
    city: (address.city || '').trim(),
    zipCode: (address.zipCode || '').trim() || null,
    isActive: address.isActive !== false,
  };
}

/**
 * Maps full form state to ClientDetailRequest body.
 * Used for POST /api/clients, POST /api/clients/{id}/versions, and PUT /api/client-versions/{versionId}.
 */
export function clientDetailToApi(formData) {
  const clientName = (formData.clientName || formData.companyName || '').trim();
  const isSameAsClient = Boolean(formData.billingNameSameAsClientName);
  const billingName = isSameAsClient ? null : ((formData.billingName || '').trim() || null);

  // Normalize payment term IDs to array of integers
  let paymentTermIds = [];
  if (Array.isArray(formData.paymentTermIds)) {
    paymentTermIds = formData.paymentTermIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
  } else if (Array.isArray(formData.paymentTerms)) {
    paymentTermIds = formData.paymentTerms
      .map((t) => (typeof t === 'object' && t !== null ? t.paymentTermId ?? t.id : t))
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);
  }

  return {
    effectiveDate: formData.effectiveDate ? String(formData.effectiveDate).slice(0, 10) : null,
    clientName,
    billingNameSameAsClientName: isSameAsClient,
    billingName,
    contactType: formData.contactType || formData.contactTypeId || 'Customer',
    officialEmail: (formData.officialEmail || formData.email || '').trim().toLowerCase() || null,
    gstNo: (formData.gstNo || '').trim().toUpperCase() || null,
    deliveryTerms: formData.deliveryTerms?.trim() || null,
    internalComments: (formData.internalComments || formData.comments || '').trim() || null,
    isActive: formData.isActive !== false,
    paymentTermIds,
    addresses: Array.isArray(formData.addresses) ? formData.addresses.map(clientAddressToApi) : [],
    contacts: Array.isArray(formData.contacts) ? formData.contacts.map(clientContactToApi) : [],
  };
}

/**
 * Transforms an address object from API to UI representation.
 */
export function clientAddressFromApi(apiAddress) {
  return {
    clientAddressId: apiAddress.clientAddressId,
    id: apiAddress.clientAddressId,
    clientDetailId: apiAddress.clientDetailId,
    addressType: apiAddress.addressType,
    addressLabel: apiAddress.addressLabel || '',
    address1: apiAddress.address1 || '',
    address2: apiAddress.address2 || '',
    countryId: apiAddress.countryId,
    countryName: apiAddress.countryName || '',
    stateId: apiAddress.stateId ?? '',
    stateName: apiAddress.stateName || '',
    city: apiAddress.city || '',
    zipCode: apiAddress.zipCode || '',
    isActive: apiAddress.isActive !== false,
    lastUpdatedOn: apiAddress.lastUpdatedOn || null,
  };
}

/**
 * Transforms a contact object from API to UI representation.
 */
export function clientContactFromApi(apiContact) {
  return {
    clientContactId: apiContact.clientContactId,
    id: apiContact.clientContactId,
    clientDetailId: apiContact.clientDetailId,
    firstName: apiContact.firstName || '',
    lastName: apiContact.lastName || '',
    fullName: apiContact.fullName || `${apiContact.firstName || ''} ${apiContact.lastName || ''}`.trim(),
    email: apiContact.email || '',
    phoneNo: apiContact.phoneNo || '',
    mobile1: apiContact.phoneNo || '',
    alternatePhoneNo: apiContact.alternatePhoneNo || '',
    mobile2: apiContact.alternatePhoneNo || '',
    isPrimary: Boolean(apiContact.isPrimary),
    isActive: apiContact.isActive !== false,
    lastUpdatedOn: apiContact.lastUpdatedOn || null,
  };
}

/**
 * Transforms a ClientDetail object (full version) from API to UI representation.
 */
export function clientDetailFromApi(apiDetail) {
  if (!apiDetail) return null;

  const paymentTerms = Array.isArray(apiDetail.paymentTerms) ? apiDetail.paymentTerms : [];
  const paymentTermIds = paymentTerms.map((pt) => pt.paymentTermId);

  return {
    clientDetailId: apiDetail.clientDetailId,
    id: apiDetail.clientDetailId,
    clientId: apiDetail.clientId,
    clientCode: apiDetail.clientCode || '',
    effectiveDate: apiDetail.effectiveDate ? String(apiDetail.effectiveDate).slice(0, 10) : '',
    versionState: apiDetail.versionState || 'Current',
    clientName: apiDetail.clientName || '',
    companyName: apiDetail.clientName || '',
    billingName: apiDetail.billingName || '',
    billingNameSameAsClientName: Boolean(apiDetail.billingNameSameAsClientName),
    contactType: apiDetail.contactType || 'Customer',
    contactTypeId: apiDetail.contactType || 'Customer',
    officialEmail: apiDetail.officialEmail || '',
    email: apiDetail.officialEmail || '',
    gstNo: apiDetail.gstNo || '',
    deliveryTerms: apiDetail.deliveryTerms || '',
    internalComments: apiDetail.internalComments || '',
    comments: apiDetail.internalComments || '',
    isActive: apiDetail.isActive !== false,
    paymentTerms,
    paymentTermIds,
    addresses: Array.isArray(apiDetail.addresses) ? apiDetail.addresses.map(clientAddressFromApi) : [],
    contacts: Array.isArray(apiDetail.contacts) ? apiDetail.contacts.map(clientContactFromApi) : [],
    isEditable: apiDetail.isEditable !== false,
    canDelete: Boolean(apiDetail.canDelete),
    createdOn: apiDetail.createdOn || null,
    createdAt: apiDetail.createdOn || null,
    lastUpdatedBy: apiDetail.lastUpdatedBy ?? null,
    lastUpdatedByName: apiDetail.lastUpdatedByName || '',
    lastUpdatedOn: apiDetail.lastUpdatedOn || null,
    updatedAt: apiDetail.lastUpdatedOn || null,
  };
}

/**
 * Transforms a ClientListItem from GET /api/clients to UI representation.
 */
export function clientItemFromApi(apiItem) {
  return {
    clientId: apiItem.clientId,
    id: apiItem.clientId,
    clientCode: apiItem.clientCode || '',
    clientDetailId: apiItem.clientDetailId,
    effectiveDate: apiItem.effectiveDate ? String(apiItem.effectiveDate).slice(0, 10) : '',
    versionState: apiItem.versionState || 'Current',
    clientName: apiItem.clientName || '',
    companyName: apiItem.clientName || '',
    billingName: apiItem.billingName || '',
    contactType: apiItem.contactType || 'Customer',
    contactTypeId: apiItem.contactType || 'Customer',
    officialEmail: apiItem.officialEmail || '',
    email: apiItem.officialEmail || '',
    gstNo: apiItem.gstNo || '',
    isActive: Boolean(apiItem.isActive),
    primaryContactName: apiItem.primaryContactName || '',
    primaryContactPhoneNo: apiItem.primaryContactPhoneNo || '',
    city: apiItem.city || '',
    hasScheduledChange: Boolean(apiItem.hasScheduledChange),
    versionCount: apiItem.versionCount || 1,
    createdOn: apiItem.createdOn || null,
    createdAt: apiItem.createdOn || null,
    lastUpdatedOn: apiItem.lastUpdatedOn || null,
    updatedAt: apiItem.lastUpdatedOn || null,
  };
}

/**
 * Transforms Client object from GET /api/clients/{id} to UI representation.
 */
export function clientHeaderFromApi(apiClient) {
  if (!apiClient) return null;

  const currentDetail = apiClient.currentDetail ? clientDetailFromApi(apiClient.currentDetail) : null;
  let versions = Array.isArray(apiClient.versions) && apiClient.versions.length > 0
    ? apiClient.versions.map((v) => ({
        ...v,
        id: v.clientDetailId,
        clientDetailId: v.clientDetailId,
        companyName: v.clientName,
        contactTypeId: v.contactType,
      }))
    : [];

  if (versions.length === 0 && currentDetail) {
    versions = [{
      ...currentDetail,
      id: currentDetail.clientDetailId,
      clientDetailId: currentDetail.clientDetailId,
    }];
  }

  return {
    clientId: apiClient.clientId,
    id: apiClient.clientId,
    clientCode: apiClient.clientCode || '',
    clientName: apiClient.clientName || '',
    companyName: apiClient.clientName || '',
    isActive: apiClient.isActive,
    currentDetail,
    nextScheduledVersion: apiClient.nextScheduledVersion || null,
    versions,
    effectiveVersions: versions,
    inquiryCount: apiClient.inquiryCount || 0,
    createdOn: apiClient.createdOn || null,
    createdAt: apiClient.createdOn || null,
    lastUpdatedOn: apiClient.lastUpdatedOn || null,
    updatedAt: apiClient.lastUpdatedOn || null,
  };
}

