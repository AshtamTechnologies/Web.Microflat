/**
 * delegationRecordService.js — Record lookup service for single-record delegation handover.
 *
 * NOTE: Mock-only implementation.
 * In production, each module's backend list endpoint will replace this file.
 * No React hooks are allowed in this service file.
 */

import { mockInquiries } from '../../mocks/inquiries';
import { mockPurchaseRequisitions } from '../../mocks/purchaseRequisitions';
import { mockVendors } from '../../mocks/vendors';
import { mockClients } from '../../mocks/clients';
import { mockUsers } from '../../mocks/users';

/**
 * Resolves user full name from user ID for matching text fields.
 * @param {string|number} userId
 * @returns {string}
 */
function resolveUserNameById(userId) {
  if (!userId) return '';
  const found = mockUsers.find(
    (u) => String(u.id) === String(userId) || String(u.id) === `u${userId}`
  );
  return found ? `${found.firstName} ${found.lastName}`.trim() : '';
}

/**
 * Lists selectable single records for a chosen module, scoped to the delegator when appropriate.
 *
 * @param {string} moduleKey - 'INQUIRY' | 'PURCHASE_REQUISITION' | 'VENDOR' | 'CLIENT'
 * @param {{ delegatorId?: string|number, search?: string }} [params={}]
 * @returns {Promise<Array<{ id: string|number, label: string }>>}
 */
export async function listRecords(moduleKey, { delegatorId, search = '' } = {}) {
  // Simulate lightweight network delay for realistic debounced UI feel
  await new Promise((r) => setTimeout(r, 80));

  const query = (search || '').trim().toLowerCase();
  const delegatorStr = delegatorId !== undefined && delegatorId !== null ? String(delegatorId) : '';
  const delegatorName = resolveUserNameById(delegatorStr).toLowerCase();

  let results;

  switch (moduleKey) {
    case 'INQUIRY': {
      // Inquiries: assigned to or created by delegator; fallback to all inquiries if delegator has none
      let scoped = mockInquiries.filter((inq) => {
        const matchesAssignee = inq.AssignedTo && String(inq.AssignedTo) === delegatorStr;
        const matchesCreatedBy =
          inq.CreatedBy &&
          (String(inq.CreatedBy).toLowerCase() === delegatorStr.toLowerCase() ||
            (delegatorName && String(inq.CreatedBy).toLowerCase() === delegatorName));
        return matchesAssignee || matchesCreatedBy;
      });

      if (scoped.length === 0) {
        scoped = mockInquiries;
      }

      results = scoped.map((inq) => ({
        id: inq.id || inq.InquiryId,
        label: `${inq.InquiryNo || inq.id} – ${inq.Subject || inq.CustomerName || 'Inquiry'}`,
      }));
      break;
    }

    case 'PURCHASE_REQUISITION': {
      // Purchase Requisitions: created by the delegator; fallback to all if delegator has none
      let scoped = mockPurchaseRequisitions.filter((pr) => {
        const matchesCreatedBy =
          pr.createdBy &&
          (String(pr.createdBy).toLowerCase() === delegatorStr.toLowerCase() ||
            (delegatorName && String(pr.createdBy).toLowerCase() === delegatorName));
        const matchesRequestedBy =
          pr.requestedBy &&
          (String(pr.requestedBy).toLowerCase() === delegatorStr.toLowerCase() ||
            (delegatorName && String(pr.requestedBy).toLowerCase() === delegatorName));
        return matchesCreatedBy || matchesRequestedBy;
      });

      if (scoped.length === 0) {
        scoped = mockPurchaseRequisitions;
      }

      results = scoped.map((pr) => ({
        id: pr.prId || pr.prNumber,
        label: `${pr.prNumber} – ${pr.remarks || 'Purchase Requisition'}`,
      }));
      break;
    }

    case 'VENDOR': {
      // Vendors: all vendors
      results = mockVendors.map((v) => ({
        id: v.id || v.vendorCode,
        label: `${v.vendorCode} – ${v.vendorName}`,
      }));
      break;
    }

    case 'CLIENT': {
      // Clients: all clients
      results = mockClients.map((c) => ({
        id: c.clientId,
        label: `${c.clientId} – ${c.companyName}`,
      }));
      break;
    }

    default:
      results = [];
  }

  // Filter by search query if provided
  if (query) {
    results = results.filter((item) => item.label.toLowerCase().includes(query));
  }

  return results;
}

