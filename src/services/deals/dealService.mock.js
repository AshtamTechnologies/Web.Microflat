/**
 * src/services/deals/dealService.mock.js — In-memory Mock implementation of Deals service.
 */

import { INITIAL_MOCK_DEALS, MOCK_DEAL_LOOKUPS } from '../../mocks/deals';
import {
  dealItemFromApi,
  dealDetailFromApi,
  negotiationFromApi,
} from '../../models/deals/dealModel';

let inMemoryDeals = JSON.parse(JSON.stringify(INITIAL_MOCK_DEALS));
let nextDealSeq = inMemoryDeals.length + 1;
let nextNegotiationSeq = 100;

export async function listDeals(params = {}) {
  await new Promise((r) => setTimeout(r, 150));
  let filtered = [...inMemoryDeals];

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.dealNo?.toLowerCase().includes(q) ||
        d.inquiryNo?.toLowerCase().includes(q) ||
        d.clientName?.toLowerCase().includes(q) ||
        d.clientCode?.toLowerCase().includes(q)
    );
  }

  if (params.dealStatusId !== undefined && params.dealStatusId !== null && params.dealStatusId !== 'ALL') {
    const statusId = Number(params.dealStatusId);
    filtered = filtered.filter((d) => d.dealStatusId === statusId);
  }

  if (params.clientId) {
    filtered = filtered.filter((d) => d.clientId === Number(params.clientId));
  }

  if (params.inquiryId) {
    filtered = filtered.filter((d) => d.inquiryId === Number(params.inquiryId));
  }

  if (params.fromDate) {
    filtered = filtered.filter((d) => d.dealDate >= params.fromDate);
  }

  if (params.toDate) {
    filtered = filtered.filter((d) => d.dealDate <= params.toDate);
  }

  const totalCount = filtered.length;
  const pageNumber = Number(params.pageNumber) || 1;
  const pageSize = Number(params.pageSize) || 20;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const pagedItems = filtered.slice(start, start + pageSize).map(dealItemFromApi);

  return {
    items: pagedItems,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getDealLookups() {
  await new Promise((r) => setTimeout(r, 80));
  return JSON.parse(JSON.stringify(MOCK_DEAL_LOOKUPS));
}

export async function getNextDealNumber(dealDate) {
  await new Promise((r) => setTimeout(r, 80));
  const dateStr = dealDate || new Date().toISOString().slice(0, 10);
  const pad = String(nextDealSeq).padStart(4, '0');
  return {
    documentNumber: `DEAL/26-27/${pad}`,
    seriesId: 3,
    periodKey: '2026-27',
    runningNumber: nextDealSeq,
  };
}

export async function getDealPrefill(inquiryId) {
  await new Promise((r) => setTimeout(r, 120));
  const numId = Number(inquiryId);
  // Check if inquiry already converted
  const existing = inMemoryDeals.find((d) => d.inquiryId === numId);
  if (existing) {
    const err = new Error('The inquiry already has a deal.');
    err.status = 409;
    throw err;
  }

  return {
    inquiryId: numId,
    inquiryNo: `INQ/26-27/${String(numId).padStart(4, '0')}`,
    client: {
      clientDetailId: 19,
      clientId: 7,
      clientCode: 'CL0007',
      clientName: 'Acme Heavy Engineering Ltd',
      contactType: 'Customer',
      gstNo: '24AAACC1206D1ZM',
      contacts: [
        { clientContactId: 31, fullName: 'Ravi Shah', email: 'ravi@acme.com', phoneNo: '9876543210', isPrimary: true, isActive: true },
        { clientContactId: 32, fullName: 'Pooja Dave', email: 'pooja@acme.com', phoneNo: '9825122974', isPrimary: false, isActive: true },
      ],
    },
    clientContactId: 31,
    currencyId: 1,
  };
}

export async function getDealById(id) {
  await new Promise((r) => setTimeout(r, 100));
  const match = inMemoryDeals.find((d) => d.id === Number(id));
  if (!match) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
  return dealDetailFromApi(match);
}

export async function createDeal(formData) {
  await new Promise((r) => setTimeout(r, 150));
  const id = nextDealSeq++;
  const dealNo = `DEAL/26-27/${String(id).padStart(4, '0')}`;

  const newDeal = {
    id,
    dealNo,
    inquiryId: Number(formData.inquiryId),
    inquiryNo: `INQ/26-27/${String(formData.inquiryId).padStart(4, '0')}`,
    dealDate: formData.dealDate || new Date().toISOString().slice(0, 10),
    clientId: 7,
    clientDetailId: 19,
    clientCode: 'CL0007',
    clientName: 'Acme Heavy Engineering Ltd',
    clientContactId: formData.clientContactId ? Number(formData.clientContactId) : 31,
    clientContactName: 'Ravi Shah',
    clientContactEmail: 'ravi@acme.com',
    currencyId: formData.currencyId ? Number(formData.currencyId) : 1,
    currencyCode: 'INR',
    currencySymbol: '₹',
    expectedValue: Number(formData.expectedValue || 0),
    negotiatedValue: formData.negotiatedValue ? Number(formData.negotiatedValue) : null,
    dealStatusId: 1,
    dealStatus: 'Open',
    statusChangedOn: null,
    statusRemarks: null,
    remarks: formData.remarks || '',
    createdBy: 1,
    createdByName: 'Admin',
    createdOn: new Date().toISOString().slice(0, 19),
    lastUpdatedBy: null,
    lastUpdatedByName: null,
    lastUpdatedOn: null,
    isEditable: true,
    canQuote: true,
    nextStatuses: [
      { id: 2, statusName: 'On Hold', isActive: true },
      { id: 3, statusName: 'Won', isActive: true },
      { id: 4, statusName: 'Lost', isActive: true },
    ],
    negotiations: [],
  };

  inMemoryDeals.unshift(newDeal);
  return dealDetailFromApi(newDeal);
}

export async function updateDeal(id, formData) {
  await new Promise((r) => setTimeout(r, 120));
  const deal = inMemoryDeals.find((d) => d.id === Number(id));
  if (!deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
  if (!deal.isEditable) {
    const err = new Error(`The deal is ${deal.dealStatus}; it can be changed only while Open or On Hold.`);
    err.status = 409;
    throw err;
  }

  deal.expectedValue = Number(formData.expectedValue ?? deal.expectedValue);
  deal.negotiatedValue = formData.negotiatedValue !== '' && formData.negotiatedValue !== null && formData.negotiatedValue !== undefined
    ? Number(formData.negotiatedValue)
    : null;
  deal.currencyId = formData.currencyId ? Number(formData.currencyId) : deal.currencyId;
  deal.clientContactId = formData.clientContactId ? Number(formData.clientContactId) : null;
  deal.remarks = formData.remarks ? String(formData.remarks).trim() : null;
  deal.lastUpdatedOn = new Date().toISOString().slice(0, 19);

  return dealDetailFromApi(deal);
}

export async function changeDealStatus(id, dealStatusId, statusRemarks = '') {
  await new Promise((r) => setTimeout(r, 150));
  const deal = inMemoryDeals.find((d) => d.id === Number(id));
  if (!deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }

  const targetId = Number(dealStatusId);
  const statusObj = MOCK_DEAL_LOOKUPS.statuses.find((s) => s.id === targetId);
  const newStatusName = statusObj ? statusObj.statusName : 'Open';

  if (newStatusName === 'Won' && (deal.negotiatedValue === null || deal.negotiatedValue === undefined)) {
    const err = new Error('Enter the negotiated value before marking the deal Won.');
    err.status = 409;
    throw err;
  }

  deal.dealStatusId = targetId;
  deal.dealStatus = newStatusName;
  deal.statusRemarks = statusRemarks || null;
  deal.statusChangedOn = new Date().toISOString().slice(0, 19);
  deal.lastUpdatedOn = new Date().toISOString().slice(0, 19);

  if (newStatusName === 'Won') {
    deal.isEditable = false;
    deal.canQuote = true;
    deal.nextStatuses = [];
  } else if (newStatusName === 'Lost') {
    deal.isEditable = false;
    deal.canQuote = false;
    deal.nextStatuses = [{ id: 1, statusName: 'Open', isActive: true }];
  } else if (newStatusName === 'On Hold') {
    deal.isEditable = true;
    deal.canQuote = false;
    deal.nextStatuses = [
      { id: 1, statusName: 'Open', isActive: true },
      { id: 4, statusName: 'Lost', isActive: true },
    ];
  } else {
    // Open
    deal.isEditable = true;
    deal.canQuote = true;
    deal.nextStatuses = [
      { id: 2, statusName: 'On Hold', isActive: true },
      { id: 3, statusName: 'Won', isActive: true },
      { id: 4, statusName: 'Lost', isActive: true },
    ];
  }

  return dealDetailFromApi(deal);
}

export async function listDealNegotiations(dealId) {
  await new Promise((r) => setTimeout(r, 80));
  const deal = inMemoryDeals.find((d) => d.id === Number(dealId));
  return (deal?.negotiations || []).map(negotiationFromApi);
}

export async function addDealNegotiation(dealId, formData) {
  await new Promise((r) => setTimeout(r, 120));
  const deal = inMemoryDeals.find((d) => d.id === Number(dealId));
  if (!deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
  if (!deal.isEditable) {
    const err = new Error('Cannot add negotiation to a non-editable deal.');
    err.status = 409;
    throw err;
  }

  const newNegotiation = {
    id: nextNegotiationSeq++,
    dealId: deal.id,
    negotiationDate: formData.negotiationDate || new Date().toISOString().slice(0, 10),
    discussedValue: formData.discussedValue !== '' && formData.discussedValue !== null ? Number(formData.discussedValue) : null,
    notes: formData.notes || '',
    createdBy: 1,
    createdByName: 'Admin',
    createdOn: new Date().toISOString().slice(0, 19),
    lastUpdatedOn: null,
  };

  deal.negotiations = [newNegotiation, ...(deal.negotiations || [])];
  return negotiationFromApi(newNegotiation);
}

export async function getDealNegotiationById(id) {
  await new Promise((r) => setTimeout(r, 80));
  for (const deal of inMemoryDeals) {
    const found = (deal.negotiations || []).find((n) => n.id === Number(id));
    if (found) return negotiationFromApi(found);
  }
  const err = new Error('Negotiation entry not found');
  err.status = 404;
  throw err;
}

export async function updateDealNegotiation(id, formData) {
  await new Promise((r) => setTimeout(r, 120));
  for (const deal of inMemoryDeals) {
    const found = (deal.negotiations || []).find((n) => n.id === Number(id));
    if (found) {
      if (!deal.isEditable) {
        const err = new Error('Cannot edit negotiation on a non-editable deal.');
        err.status = 409;
        throw err;
      }
      if (formData.negotiationDate) found.negotiationDate = formData.negotiationDate;
      found.discussedValue = formData.discussedValue !== '' && formData.discussedValue !== null
        ? Number(formData.discussedValue)
        : null;
      found.notes = formData.notes || '';
      found.lastUpdatedOn = new Date().toISOString().slice(0, 19);
      return negotiationFromApi(found);
    }
  }
  const err = new Error('Negotiation entry not found');
  err.status = 404;
  throw err;
}

export async function deleteDealNegotiation(id) {
  await new Promise((r) => setTimeout(r, 120));
  for (const deal of inMemoryDeals) {
    const idx = (deal.negotiations || []).findIndex((n) => n.id === Number(id));
    if (idx !== -1) {
      if (!deal.isEditable) {
        const err = new Error('Cannot delete negotiation on a non-editable deal.');
        err.status = 409;
        throw err;
      }
      deal.negotiations.splice(idx, 1);
      return true;
    }
  }
  const err = new Error('Negotiation entry not found');
  err.status = 404;
  throw err;
}
