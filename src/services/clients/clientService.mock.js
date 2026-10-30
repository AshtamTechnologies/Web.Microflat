/**
 * src/services/clients/clientService.mock.js — Offline mock implementation for Client APIs.
 */

import { mockClients } from '../../mocks/clients';
import { getActiveClientVersion } from '../../utils/clientVersions';

let inMemoryClients = [...mockClients];

export async function listClients(params = {}) {
  const search = (params.search || '').toLowerCase().trim();
  const contactType = params.contactType;
  const isActive = params.isActive;
  const pageNumber = params.pageNumber || 1;
  const pageSize = params.pageSize || 20;

  let filtered = inMemoryClients.map((c, idx) => {
    const activeVersion = getActiveClientVersion(c);
    return {
      clientId: typeof c.clientId === 'number' ? c.clientId : idx + 1,
      id: typeof c.clientId === 'number' ? c.clientId : idx + 1,
      clientCode: c.clientCode || `CLI-${String(idx + 1).padStart(3, '0')}`,
      clientDetailId: idx + 1,
      effectiveDate: c.effectiveDate || '2026-10-01',
      versionState: 'Current',
      clientName: c.companyName || c.clientName || 'Client Name',
      companyName: c.companyName || c.clientName || 'Client Name',
      billingName: c.billingName || c.companyName,
      contactType: c.contactTypeId || c.contactType || 'Customer',
      contactTypeId: c.contactTypeId || c.contactType || 'Customer',
      officialEmail: c.email || c.officialEmail || '',
      email: c.email || c.officialEmail || '',
      gstNo: c.gstNo || '',
      isActive: c.isActive !== false,
      primaryContactName: (c.contacts && c.contacts[0]) ? `${c.contacts[0].firstName || ''} ${c.contacts[0].lastName || ''}`.trim() : '',
      primaryContactPhoneNo: (c.contacts && c.contacts[0]) ? (c.contacts[0].phoneNo || c.contacts[0].mobile1 || '') : '',
      city: (c.addresses && c.addresses[0]) ? c.addresses[0].city : '',
      hasScheduledChange: false,
      versionCount: (c.effectiveVersions || []).length || 1,
      createdOn: c.createdAt || new Date().toISOString(),
      lastUpdatedOn: c.updatedAt || new Date().toISOString(),
    };
  });

  if (search) {
    filtered = filtered.filter((c) =>
      c.clientCode.toLowerCase().includes(search) ||
      c.clientName.toLowerCase().includes(search) ||
      c.billingName.toLowerCase().includes(search) ||
      c.officialEmail.toLowerCase().includes(search) ||
      c.gstNo.toLowerCase().includes(search)
    );
  }

  if (contactType && contactType !== 'ALL') {
    filtered = filtered.filter((c) => c.contactType.toLowerCase() === contactType.toLowerCase());
  }

  if (isActive !== undefined && isActive !== null && isActive !== 'ALL') {
    const boolActive = typeof isActive === 'boolean' ? isActive : isActive === 'true' || isActive === 'ACTIVE';
    filtered = filtered.filter((c) => c.isActive === boolActive);
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getClientSummary() {
  const total = inMemoryClients.length;
  const active = inMemoryClients.filter((c) => c.isActive !== false).length;
  const inactive = total - active;
  return {
    total,
    active,
    inactive,
    notYetEffective: 0,
    scheduledChanges: 0,
  };
}

export async function getClientLookups() {
  return {
    contactTypes: ['Customer', 'Distributor', 'Dealer', 'Agency'],
    addressTypes: ['Billing', 'Shipping', 'Registered Office', 'Works'],
    paymentTerms: [
      { id: 1, termCode: 'NET30', termName: 'Net 30', isActive: true },
      { id: 2, termCode: 'NET60', termName: 'Net 60', isActive: true },
    ],
    countries: [
      { id: 1, countryName: 'India', isActive: true },
      { id: 2, countryName: 'United States', isActive: true },
    ],
  };
}

export async function getActiveClients(search = '') {
  const list = await listClients({ search, isActive: true });
  return list.items.map((i) => ({
    clientId: i.clientId,
    clientCode: i.clientCode,
    clientName: i.clientName,
    contactType: i.contactType,
    gstNo: i.gstNo,
    officialEmail: i.officialEmail,
    primaryContactName: i.primaryContactName,
    primaryContactPhoneNo: i.primaryContactPhoneNo,
  }));
}

export async function getClientById(id) {
  const found = inMemoryClients.find((c, idx) => c.clientId === id || (idx + 1) === Number(id));
  if (!found) return null;
  const detail = {
    clientDetailId: 1,
    clientId: id,
    clientCode: found.clientCode || `CLI-${id}`,
    effectiveDate: found.effectiveDate || '2026-10-01',
    versionState: 'Current',
    clientName: found.companyName || found.clientName || '',
    companyName: found.companyName || found.clientName || '',
    billingName: found.billingName || found.companyName || '',
    billingNameSameAsClientName: false,
    contactType: found.contactTypeId || found.contactType || 'Customer',
    contactTypeId: found.contactTypeId || found.contactType || 'Customer',
    officialEmail: found.email || '',
    email: found.email || '',
    gstNo: found.gstNo || '',
    deliveryTerms: found.deliveryTerms || '',
    internalComments: found.comments || '',
    comments: found.comments || '',
    isActive: found.isActive !== false,
    paymentTerms: [],
    addresses: found.addresses || [],
    contacts: found.contacts || [],
    isEditable: true,
    canDelete: false,
    createdOn: found.createdAt || new Date().toISOString(),
    lastUpdatedBy: 1,
    lastUpdatedByName: 'Admin',
    lastUpdatedOn: found.updatedAt || new Date().toISOString(),
  };

  return {
    clientId: id,
    id,
    clientCode: found.clientCode || `CLI-${id}`,
    clientName: found.companyName || found.clientName || '',
    companyName: found.companyName || found.clientName || '',
    isActive: found.isActive !== false,
    currentDetail: detail,
    nextScheduledVersion: null,
    versions: [
      {
        clientDetailId: 1,
        effectiveDate: found.effectiveDate || '2026-10-01',
        versionState: 'Current',
        clientName: found.companyName || '',
        contactType: found.contactTypeId || 'Customer',
        isActive: found.isActive !== false,
        primaryContactName: '',
        paymentTermCount: 0,
        addressCount: (found.addresses || []).length,
        contactCount: (found.contacts || []).length,
        lastUpdatedBy: 1,
        lastUpdatedByName: 'Admin',
        lastUpdatedOn: new Date().toISOString(),
      },
    ],
    inquiryCount: 0,
    createdOn: found.createdAt || new Date().toISOString(),
    lastUpdatedOn: found.updatedAt || new Date().toISOString(),
  };
}

export async function createClient(formData) {
  const newId = inMemoryClients.length + 1;
  const newRecord = {
    ...formData,
    clientId: newId,
    clientCode: `CLI-${String(newId).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  };
  inMemoryClients.unshift(newRecord);
  return getClientById(newId);
}

export async function updateClientStatus(id, isActive) {
  inMemoryClients = inMemoryClients.map((c, idx) => {
    if (c.clientId === id || (idx + 1) === Number(id)) {
      return { ...c, isActive };
    }
    return c;
  });
  return getClientById(id);
}

export async function deleteClient(id) {
  inMemoryClients = inMemoryClients.filter((c, idx) => c.clientId !== id && (idx + 1) !== Number(id));
  return true;
}

export async function getClientVersions(id) {
  const client = await getClientById(id);
  return client ? client.versions : [];
}

export async function addClientVersion(id, formData) {
  const detail = {
    clientDetailId: Date.now(),
    clientId: id,
    ...formData,
    versionState: 'Scheduled',
    isEditable: true,
    canDelete: true,
  };
  return detail;
}

export async function getClientVersionById(versionId) {
  return {
    clientDetailId: versionId,
    clientId: 1,
    clientCode: 'CLI-001',
    effectiveDate: '2026-10-01',
    versionState: 'Current',
    clientName: 'Mock Client',
    companyName: 'Mock Client',
    billingName: 'Mock Client',
    billingNameSameAsClientName: true,
    contactType: 'Customer',
    contactTypeId: 'Customer',
    officialEmail: 'info@mock.example',
    email: 'info@mock.example',
    gstNo: '24AAACC1206D1ZM',
    deliveryTerms: '',
    internalComments: '',
    comments: '',
    isActive: true,
    paymentTerms: [],
    addresses: [],
    contacts: [],
    isEditable: true,
    canDelete: false,
    createdOn: new Date().toISOString(),
    lastUpdatedBy: 1,
    lastUpdatedByName: 'Admin',
    lastUpdatedOn: new Date().toISOString(),
  };
}

export async function updateClientVersion(versionId, formData) {
  return {
    clientDetailId: versionId,
    ...formData,
    isEditable: true,
    canDelete: false,
  };
}

export async function deleteClientVersion(versionId) {
  return true;
}

