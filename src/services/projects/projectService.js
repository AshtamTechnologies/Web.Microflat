/**
 * src/services/projects/projectService.js
 * Production API service for Projects module.
 * Aligned with ProjectCreation.md and MicroFlat ERP architecture.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { PROJECT_ENDPOINTS } from './projectEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  projectListItemFromApi,
  projectDetailFromApi,
  phaseFromApi,
  milestoneFromApi,
  costingFromApi,
  documentFromApi,
} from '../../models/projects/projectModel';

export const projectService = {
  /**
   * 1. Get all lookup options for project screens.
   * GET /api/projects/lookups
   */
  async getLookups() {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.LOOKUPS);
      return res?.data || {};
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 2. Preview next project code series.
   * GET /api/projects/next-code
   */
  async getNextCode() {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.NEXT_CODE);
      return res?.data?.documentNumber || 'PRJ/--/----';
    } catch (err) {
      console.warn('Could not fetch next project code preview:', err);
      return 'PRJ/--/---- (auto)';
    }
  },

  /**
   * 3. Paged list of projects with filters.
   * GET /api/projects
   */
  async listProjects(params = {}) {
    try {
      const query = {};
      if (params.search?.trim()) query.search = params.search.trim();
      if (params.projectTypeId && params.projectTypeId !== 'ALL') {
        query.projectTypeId = Number(params.projectTypeId);
      }
      if (params.projectBillingTypeId && params.projectBillingTypeId !== 'ALL') {
        query.projectBillingTypeId = Number(params.projectBillingTypeId);
      }
      if (params.status && params.status !== 'ALL') {
        query.status = params.status;
      }
      if (params.orderConfirmationId) {
        query.orderConfirmationId = Number(params.orderConfirmationId);
      }
      query.pageNumber = Number(params.pageNumber) || 1;
      query.pageSize = Number(params.pageSize) || 20;

      const res = await axiosInstance.get(PROJECT_ENDPOINTS.PROJECTS, { params: query });
      const data = res?.data || {};
      const rawItems = Array.isArray(data.items) ? data.items : [];

      return {
        items: rawItems.map(projectListItemFromApi).filter(Boolean),
        totalCount: data.totalCount ?? rawItems.length,
        pageNumber: data.pageNumber || query.pageNumber,
        pageSize: data.pageSize || query.pageSize,
        totalPages: data.totalPages || 1,
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 4. Get full project detail by ID.
   * GET /api/projects/{id}
   */
  async getProjectById(id) {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.PROJECT_BY_ID(id));
      return projectDetailFromApi(res?.data);
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 5. Create new project (from Sales Order or In-House).
   * POST /api/projects
   */
  async createProject(payload) {
    try {
      const res = await axiosInstance.post(PROJECT_ENDPOINTS.PROJECTS, payload);
      return projectDetailFromApi(res?.data);
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 6. Update open project.
   * PUT /api/projects/{id}
   */
  async updateProject(id, payload) {
    try {
      const res = await axiosInstance.put(PROJECT_ENDPOINTS.PROJECT_BY_ID(id), payload);
      return projectDetailFromApi(res?.data);
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 7. Change project status (In Progress, On Hold, Completed, Cancelled).
   * PATCH /api/projects/{id}/status
   */
  async updateStatus(id, status) {
    try {
      const res = await axiosInstance.patch(PROJECT_ENDPOINTS.STATUS(id), { status });
      return projectDetailFromApi(res?.data);
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 8. Fetch Confirmed Sales Orders for picker.
   * GET /api/order-confirmations?status=Confirmed
   */
  async listConfirmedSalesOrders(search = '', pageNumber = 1, pageSize = 20) {
    try {
      const params = {
        status: 'Confirmed',
        pageNumber,
        pageSize,
      };
      if (search?.trim()) params.search = search.trim();

      const res = await axiosInstance.get(PROJECT_ENDPOINTS.CONFIRMED_SALES_ORDERS, { params });
      const data = res?.data || {};
      const items = Array.isArray(data.items) ? data.items : [];

      return {
        items: items.map((oc) => ({
          id: oc.id,
          orderConfirmationNo: oc.orderConfirmationNo || '',
          clientName: oc.clientName || '',
          clientPoNo: oc.clientPoNo || '',
          clientPoDate: oc.clientPoDate || null,
          orderDate: oc.orderConfirmationDate || null,
          expectedDeliveryDate: oc.expectedDeliveryDate || null,
          currencyCode: oc.currencyCode || 'INR',
          totalAmount: oc.totalAmount || 0,
        })),
        totalCount: data.totalCount ?? items.length,
        pageNumber: data.pageNumber || pageNumber,
      };
    } catch (err) {
      console.warn('Failed to fetch confirmed sales orders for project picker:', err);
      return { items: [], totalCount: 0 };
    }
  },

  /**
   * 9. Get full Order Confirmation details for preview.
   * GET /api/order-confirmations/{id}
   */
  async getOrderConfirmationById(id) {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.ORDER_CONFIRMATION_BY_ID(id));
      return res?.data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * 10. Check if projects already exist for a sales order.
   * GET /api/projects?orderConfirmationId={id}
   */
  async checkExistingProjectsForOrder(orderConfirmationId) {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.PROJECTS, {
        params: { orderConfirmationId, pageSize: 10 },
      });
      const items = res?.data?.items || [];
      return items.map(projectListItemFromApi);
    } catch {
      return [];
    }
  },

  // ── Child Collections ──

  // Phases
  async listPhases(projectId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.PHASES(projectId));
    const items = Array.isArray(res?.data) ? res.data : [];
    return items.map(phaseFromApi);
  },
  async getPhaseById(phaseId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.PHASE_BY_ID(phaseId));
    return phaseFromApi(res?.data);
  },
  async addPhase(projectId, payload) {
    const res = await axiosInstance.post(PROJECT_ENDPOINTS.PHASES(projectId), payload);
    return phaseFromApi(res?.data);
  },
  async updatePhase(phaseId, payload) {
    const res = await axiosInstance.put(PROJECT_ENDPOINTS.PHASE_BY_ID(phaseId), payload);
    return phaseFromApi(res?.data);
  },
  async deletePhase(phaseId) {
    const res = await axiosInstance.delete(PROJECT_ENDPOINTS.PHASE_BY_ID(phaseId));
    return res?.data;
  },

  // Milestones
  async listMilestones(projectId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.MILESTONES(projectId));
    const items = Array.isArray(res?.data) ? res.data : [];
    return items.map(milestoneFromApi);
  },
  async getMilestoneById(milestoneId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.MILESTONE_BY_ID(milestoneId));
    return milestoneFromApi(res?.data);
  },
  async addMilestone(projectId, payload) {
    const res = await axiosInstance.post(PROJECT_ENDPOINTS.MILESTONES(projectId), payload);
    return milestoneFromApi(res?.data);
  },
  async updateMilestone(milestoneId, payload) {
    const res = await axiosInstance.put(PROJECT_ENDPOINTS.MILESTONE_BY_ID(milestoneId), payload);
    return milestoneFromApi(res?.data);
  },
  async deleteMilestone(milestoneId) {
    const res = await axiosInstance.delete(PROJECT_ENDPOINTS.MILESTONE_BY_ID(milestoneId));
    return res?.data;
  },

  // Costings
  async listCostings(projectId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.COSTINGS(projectId));
    const items = Array.isArray(res?.data) ? res.data : [];
    return items.map(costingFromApi);
  },
  async getCostingById(costingId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.COSTING_BY_ID(costingId));
    return costingFromApi(res?.data);
  },
  async addCosting(projectId, payload) {
    const res = await axiosInstance.post(PROJECT_ENDPOINTS.COSTINGS(projectId), payload);
    return costingFromApi(res?.data);
  },
  async updateCosting(costingId, payload) {
    const res = await axiosInstance.put(PROJECT_ENDPOINTS.COSTING_BY_ID(costingId), payload);
    return costingFromApi(res?.data);
  },
  async deleteCosting(costingId) {
    const res = await axiosInstance.delete(PROJECT_ENDPOINTS.COSTING_BY_ID(costingId));
    return res?.data;
  },

  // Documents
  async listDocuments(projectId) {
    const res = await axiosInstance.get(PROJECT_ENDPOINTS.DOCUMENTS(projectId));
    const items = Array.isArray(res?.data) ? res.data : [];
    return items.map(documentFromApi);
  },
  async uploadDocument(projectId, formData) {
    const res = await axiosInstance.post(PROJECT_ENDPOINTS.DOCUMENTS(projectId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return documentFromApi(res?.data);
  },
  async deleteDocument(docId) {
    const res = await axiosInstance.delete(PROJECT_ENDPOINTS.DOCUMENT_BY_ID(docId));
    return res?.data;
  },
  async downloadDocument(docId, fileName = 'document') {
    try {
      const res = await axiosInstance.get(PROJECT_ENDPOINTS.DOCUMENT_DOWNLOAD(docId), {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },
};
