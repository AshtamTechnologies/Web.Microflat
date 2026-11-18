/**
 * SalesOrdersContext.jsx — State management & CRUD actions for Sales Orders (Order Confirmations).
 *
 * Aligned with Frontend-API-Guide.md §5.4g and Swagger OpenAPI specifications:
 *   - Created from a Confirmed quotation's latest revision (backend auto-copies lines & taxes)
 *   - Direct Orders (without Quotation - Task 60) gracefully handled with local fallback
 *   - Statuses: Draft -> Confirmed -> Cancelled
 *   - Only Draft orders are editable
 *   - Documents allowed in Draft & Confirmed (blocked when Cancelled)
 *   - Connects to orderConfirmationService when VITE_USE_MOCK_API !== 'true'
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  INITIAL_SALES_ORDERS,
  calculateSalesOrderTotals,
  getNextOrderStatuses,
} from '../mocks/salesOrders';
import { orderConfirmationService, isMockApi } from '../services';
import { triggerPdfDownload } from '../utils/fileHelpers';

const SalesOrdersContext = createContext(null);
const STORAGE_KEY = 'microflat_sales_orders_data';
const DIRECT_ORDERS_KEY = 'microflat_sales_orders_direct_data';

export function SalesOrdersProvider({ children }) {
  // Local direct orders store (preserved across backend refreshes)
  const [directOrders, setDirectOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(DIRECT_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load direct sales orders from localStorage:', e);
      return [];
    }
  });

  const [salesOrders, setSalesOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load sales orders from localStorage:', e);
    }
    return INITIAL_SALES_ORDERS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lookups, setLookups] = useState({
    statuses: [],
    paymentTerms: [],
    deliveryTerms: [],
    documentTypes: [],
    taxes: [],
  });
  const [nextNumberPreview, setNextNumberPreview] = useState('');

  // Keep direct orders saved in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DIRECT_ORDERS_KEY, JSON.stringify(directOrders));
    } catch (e) {
      console.error('Failed to save direct sales orders:', e);
    }
  }, [directOrders]);

  // Keep all sales orders persisted in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(salesOrders));
    } catch (e) {
      console.error('Failed to save sales orders to localStorage:', e);
    }
  }, [salesOrders]);

  /**
   * Refreshes sales orders list from backend API (or mock).
   */
  const refreshSalesOrders = useCallback(async (params = {}) => {
    if (isMockApi) {
      return salesOrders;
    }

    try {
      setIsLoading(true);
      const res = await orderConfirmationService.listOrderConfirmations(params);
      const apiItems = Array.isArray(res?.items) ? res.items : [];

      // Merge backend items with local direct orders
      setSalesOrders((prev) => {
        const localDirect = directOrders.length > 0 ? directOrders : prev.filter((o) => o.isDirectOrder);
        const apiIds = new Set(apiItems.map((i) => String(i.id)));
        const nonDuplicateDirect = localDirect.filter((d) => !apiIds.has(String(d.id)));
        return [...nonDuplicateDirect, ...apiItems];
      });
      return apiItems;
    } catch (err) {
      console.warn('Could not refresh sales orders from API:', err?.message || err);
      return salesOrders;
    } finally {
      setIsLoading(false);
    }
  }, [directOrders, salesOrders]);

  /**
   * Load lookups and initial order list on mount when connected to backend API
   */
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current || isMockApi) return;
    hasLoadedRef.current = true;

    async function initializeApiData() {
      try {
        const [lookupData, listRes] = await Promise.allSettled([
          orderConfirmationService.getOrderConfirmationLookups(),
          orderConfirmationService.listOrderConfirmations(),
        ]);

        if (lookupData.status === 'fulfilled' && lookupData.value) {
          setLookups(lookupData.value);
        }

        if (listRes.status === 'fulfilled' && listRes.value?.items) {
          const apiItems = listRes.value.items;
          setSalesOrders((prev) => {
            const localDirect = prev.filter((o) => o.isDirectOrder);
            const apiIds = new Set(apiItems.map((i) => String(i.id)));
            const nonDuplicateDirect = localDirect.filter((d) => !apiIds.has(String(d.id)));
            return [...nonDuplicateDirect, ...apiItems];
          });
        }
      } catch (err) {
        console.warn('API initialization for sales orders encountered an error:', err);
      }
    }

    initializeApiData();
  }, []);

  /**
   * Synchronous lookup in current state by ID or OrderConfirmationNo.
   */
  const getSalesOrderById = useCallback(
    (id) => {
      if (!id) return null;
      const target = String(id).toLowerCase();
      return (
        salesOrders.find(
          (o) =>
            String(o.id).toLowerCase() === target ||
            String(o.orderConfirmationNo).toLowerCase() === target
        ) || null
      );
    },
    [salesOrders]
  );

  /**
   * Asynchronous fetch from API for full order detail (including lines, documents, and email logs).
   */
  const fetchSalesOrderById = useCallback(
    async (id) => {
      if (!id) return null;
      // If mock or direct order, return local order
      const local = getSalesOrderById(id);
      if (isMockApi || (local && local.isDirectOrder)) {
        return local;
      }

      try {
        const detail = await orderConfirmationService.getOrderConfirmationById(id);
        if (detail) {
          setSalesOrders((prev) => {
            const idx = prev.findIndex(
              (o) =>
                String(o.id).toLowerCase() === String(detail.id).toLowerCase() ||
                String(o.orderConfirmationNo).toLowerCase() === String(detail.orderConfirmationNo).toLowerCase()
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...detail };
              return updated;
            }
            return [detail, ...prev];
          });
          return detail;
        }
      } catch (err) {
        console.warn('Failed to fetch sales order detail from API:', err?.message || err);
      }
      return local;
    },
    [getSalesOrderById]
  );

  const getOrderCountByQuotationId = useCallback(
    (quotationId) => {
      if (!quotationId) return 0;
      const target = String(quotationId).toLowerCase();
      return salesOrders.filter(
        (o) =>
          String(o.quotationId).toLowerCase() === target ||
          String(o.quotationNo).toLowerCase() === target
      ).length;
    },
    [salesOrders]
  );

  /**
   * Asynchronously queries next order confirmation number from API and caches it.
   */
  const fetchNextOrderConfirmationNo = useCallback(
    async (orderDate) => {
      const todayDate = orderDate || new Date().toISOString().split('T')[0];
      if (!isMockApi) {
        try {
          const num = await orderConfirmationService.getNextOrderConfirmationNumber(todayDate);
          if (num) {
            setNextNumberPreview(num);
            return num;
          }
        } catch (err) {
          console.warn('Could not retrieve next order confirmation number from API:', err);
        }
      }
      const parsedYear = todayDate ? new Date(todayDate).getFullYear() : NaN;
      const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
      const seq = salesOrders.length + 1;
      const fallback = `OC-${year}-${String(seq).padStart(6, '0')}`;
      setNextNumberPreview(fallback);
      return fallback;
    },
    [salesOrders]
  );

  /**
   * Synchronously returns current next order confirmation number (or fallback formula).
   */
  const getNextOrderConfirmationNo = useCallback(
    (orderDate) => {
      if (nextNumberPreview) return nextNumberPreview;
      const todayDate = orderDate || new Date().toISOString().split('T')[0];
      const parsedYear = todayDate ? new Date(todayDate).getFullYear() : NaN;
      const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
      const seq = salesOrders.length + 1;
      return `OC-${year}-${String(seq).padStart(6, '0')}`;
    },
    [nextNumberPreview, salesOrders]
  );

  /**
   * Creates a new sales order.
   * - If quotationId is present and not mock, calls backend POST /api/order-confirmations.
   * - If direct order (Task 60) or mock, stores locally.
   */
  const createSalesOrder = useCallback(
    async (payload) => {
      const orderDate =
        payload.orderConfirmationDate || new Date().toISOString().split('T')[0];
      const status = payload.status === 'Confirmed' ? 'Confirmed' : 'Draft';
      const isDirect = Boolean(payload.isDirectOrder || !payload.quotationId);

      // ── Scenario A: Against Confirmed Quotation via Backend API ──
      if (!isMockApi && !isDirect && payload.quotationId) {
        try {
          setIsLoading(true);
          const createdApiOrder = await orderConfirmationService.createOrderConfirmation(payload);

          // If user requested initial status as 'Confirmed', move status
          let finalOrder = createdApiOrder;
          if (status === 'Confirmed') {
            try {
              finalOrder = await orderConfirmationService.updateOrderConfirmationStatus(
                createdApiOrder.id,
                'Confirmed'
              );
            } catch (statusErr) {
              console.warn('Order created as Draft, but confirming it failed:', statusErr);
            }
          }

          // Prepend to state
          setSalesOrders((prev) => [finalOrder, ...prev]);
          toast.success(
            finalOrder.status === 'Confirmed'
              ? `Sales Order ${finalOrder.orderConfirmationNo} created & confirmed`
              : `Sales Order ${finalOrder.orderConfirmationNo} saved as Draft`
          );
          return finalOrder;
        } catch (apiErr) {
          console.error('Failed to create sales order via backend API:', apiErr);
          toast.error(apiErr?.message || 'Failed to create sales order on backend. Falling back to local state.');
          // Fall through to local fallback creation
        } finally {
          setIsLoading(false);
        }
      }

      // ── Scenario B: Direct Order or Mock API ──
      const orderConfirmationNo =
        payload.orderConfirmationNo ||
        `OC-${new Date(orderDate).getFullYear() || new Date().getFullYear()}-${String(
          salesOrders.length + 1
        ).padStart(6, '0')}`;

      const totals = calculateSalesOrderTotals(
        payload.lineItems || [],
        payload.taxTreatment || 'INTRA_STATE',
        payload.otherCharges || 0
      );

      const newOrder = {
        id: orderConfirmationNo,
        orderConfirmationNo,
        orderConfirmationDate: orderDate,
        isDirectOrder: isDirect,
        quotationId: isDirect ? '' : payload.quotationId || '',
        quotationNo: isDirect ? '' : payload.quotationNo || '',
        quotationRevisionNo: isDirect ? 0 : payload.quotationRevisionNo ?? 0,
        inquiryId: payload.inquiryId || '',
        inquiryNo: payload.inquiryNo || '',
        clientId: payload.clientId || '',
        clientName: payload.clientName || '',
        clientAddress: payload.clientAddress || '',
        contactPerson: payload.contactPerson || '',
        contactEmail: payload.contactEmail || '',
        contactPhone: payload.contactPhone || '',
        clientPoNo: payload.clientPoNo || '',
        clientPoDate: payload.clientPoDate || '',
        expectedDeliveryDate: payload.expectedDeliveryDate || '',
        paymentTerms: payload.paymentTerms || 'Net 30 Days',
        deliveryTerms: payload.deliveryTerms || '',
        currency: payload.currency || 'INR',
        taxTreatment: payload.taxTreatment || 'INTRA_STATE',
        otherCharges: Number(payload.otherCharges) || 0,
        otherChargesDescription: payload.otherChargesDescription || '',
        termsAndConditions: payload.termsAndConditions || '',
        remarks: payload.remarks || '',
        status,
        isEditable: status === 'Draft',
        nextStatuses: getNextOrderStatuses(status),
        confirmedOn: status === 'Confirmed' ? orderDate : null,
        lastUpdatedBy: payload.lastUpdatedBy || 'Current User',
        lastUpdatedAt: new Date().toISOString(),
        lineItems: totals.calculatedItems,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        grandTotal: totals.grandTotal,
        documents: payload.documents || [],
        emailLogs: [],
      };

      if (isDirect) {
        setDirectOrders((prev) => [newOrder, ...prev]);
      }
      setSalesOrders((prev) => [newOrder, ...prev]);

      toast.success(
        status === 'Confirmed'
          ? `Sales Order ${orderConfirmationNo} created & confirmed`
          : `Sales Order ${orderConfirmationNo} saved as Draft`
      );
      return newOrder;
    },
    [salesOrders]
  );

  /**
   * Updates an existing Draft sales order.
   */
  const updateSalesOrder = useCallback(
    async (id, payload) => {
      const isNumericBackendId = typeof id === 'number' || /^\d+$/.test(String(id));

      if (!isMockApi && isNumericBackendId) {
        try {
          setIsLoading(true);
          let updatedApiOrder = await orderConfirmationService.updateOrderConfirmation(id, payload);

          if (payload.status === 'Confirmed' && updatedApiOrder.status !== 'Confirmed') {
            updatedApiOrder = await orderConfirmationService.updateOrderConfirmationStatus(
              id,
              'Confirmed'
            );
          }

          setSalesOrders((prev) =>
            prev.map((o) =>
              String(o.id).toLowerCase() === String(id).toLowerCase() ||
              String(o.orderConfirmationNo).toLowerCase() === String(id).toLowerCase()
                ? { ...o, ...updatedApiOrder }
                : o
            )
          );

          toast.success(
            updatedApiOrder.status === 'Confirmed'
              ? `Sales Order ${updatedApiOrder.orderConfirmationNo} confirmed`
              : `Sales Order ${updatedApiOrder.orderConfirmationNo} updated`
          );
          return updatedApiOrder;
        } catch (apiErr) {
          console.error('Failed to update sales order via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to update sales order on backend.');
        } finally {
          setIsLoading(false);
        }
      }

      // Local / Mock update
      let updatedOrder = null;
      setSalesOrders((prev) =>
        prev.map((o) => {
          if (String(o.id).toLowerCase() !== String(id).toLowerCase() &&
              String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()) {
            return o;
          }
          if (o.status !== 'Draft') {
            toast.error('Only Draft sales orders can be edited.');
            return o;
          }

          const nextStatus = payload.status === 'Confirmed' ? 'Confirmed' : 'Draft';
          const totals = calculateSalesOrderTotals(
            payload.lineItems || o.lineItems || [],
            payload.taxTreatment || o.taxTreatment || 'INTRA_STATE',
            payload.otherCharges !== undefined ? payload.otherCharges : o.otherCharges
          );

          updatedOrder = {
            ...o,
            orderConfirmationDate: payload.orderConfirmationDate || o.orderConfirmationDate,
            clientAddress:
              payload.clientAddress !== undefined ? payload.clientAddress : o.clientAddress,
            contactPerson:
              payload.contactPerson !== undefined ? payload.contactPerson : o.contactPerson,
            contactEmail:
              payload.contactEmail !== undefined ? payload.contactEmail : o.contactEmail,
            contactPhone:
              payload.contactPhone !== undefined ? payload.contactPhone : o.contactPhone,
            clientPoNo: payload.clientPoNo !== undefined ? payload.clientPoNo : o.clientPoNo,
            clientPoDate: payload.clientPoDate !== undefined ? payload.clientPoDate : o.clientPoDate,
            expectedDeliveryDate:
              payload.expectedDeliveryDate !== undefined
                ? payload.expectedDeliveryDate
                : o.expectedDeliveryDate,
            paymentTerms: payload.paymentTerms || o.paymentTerms,
            deliveryTerms:
              payload.deliveryTerms !== undefined ? payload.deliveryTerms : o.deliveryTerms,
            taxTreatment: payload.taxTreatment || o.taxTreatment,
            otherCharges:
              payload.otherCharges !== undefined ? Number(payload.otherCharges) || 0 : o.otherCharges,
            otherChargesDescription:
              payload.otherChargesDescription !== undefined
                ? payload.otherChargesDescription
                : o.otherChargesDescription,
            termsAndConditions:
              payload.termsAndConditions !== undefined
                ? payload.termsAndConditions
                : o.termsAndConditions,
            remarks: payload.remarks !== undefined ? payload.remarks : o.remarks,
            status: nextStatus,
            isEditable: nextStatus === 'Draft',
            nextStatuses: getNextOrderStatuses(nextStatus),
            confirmedOn:
              nextStatus === 'Confirmed'
                ? o.confirmedOn || new Date().toISOString().split('T')[0]
                : o.confirmedOn,
            lastUpdatedBy: 'Current User',
            lastUpdatedAt: new Date().toISOString(),
            lineItems: totals.calculatedItems,
            subtotal: totals.subtotal,
            totalTax: totals.totalTax,
            cgst: totals.cgst,
            sgst: totals.sgst,
            igst: totals.igst,
            grandTotal: totals.grandTotal,
            documents: payload.documents !== undefined ? payload.documents : o.documents,
          };
          return updatedOrder;
        })
      );

      if (updatedOrder) {
        if (updatedOrder.isDirectOrder) {
          setDirectOrders((prev) =>
            prev.map((d) => (String(d.id) === String(updatedOrder.id) ? updatedOrder : d))
          );
        }
        toast.success(
          updatedOrder.status === 'Confirmed'
            ? `Sales Order ${updatedOrder.orderConfirmationNo} confirmed`
            : `Sales Order ${updatedOrder.orderConfirmationNo} updated`
        );
      }
      return updatedOrder;
    },
    []
  );

  /**
   * Status change: Draft -> Confirmed or Cancelled.
   */
  const changeSalesOrderStatus = useCallback(
    async (id, newStatus, remarks = '') => {
      const isNumericBackendId = typeof id === 'number' || /^\d+$/.test(String(id));

      if (!isMockApi && isNumericBackendId) {
        try {
          setIsLoading(true);
          const updated = await orderConfirmationService.updateOrderConfirmationStatus(id, newStatus);
          setSalesOrders((prev) =>
            prev.map((o) =>
              String(o.id).toLowerCase() === String(id).toLowerCase() ||
              String(o.orderConfirmationNo).toLowerCase() === String(id).toLowerCase()
                ? { ...o, ...updated }
                : o
            )
          );
          toast.success(`Sales Order status updated to ${newStatus}`);
          return updated;
        } catch (apiErr) {
          console.error('Failed to change status via API:', apiErr);
          toast.error(apiErr?.message || `Failed to update status to ${newStatus}`);
        } finally {
          setIsLoading(false);
        }
      }

      setSalesOrders((prev) =>
        prev.map((o) => {
          if (
            String(o.id).toLowerCase() !== String(id).toLowerCase() &&
            String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()
          ) {
            return o;
          }
          return {
            ...o,
            status: newStatus,
            isEditable: newStatus === 'Draft',
            nextStatuses: getNextOrderStatuses(newStatus),
            confirmedOn:
              newStatus === 'Confirmed'
                ? o.confirmedOn || new Date().toISOString().split('T')[0]
                : o.confirmedOn,
            remarks: remarks
              ? `${o.remarks ? `${o.remarks}\n` : ''}[${newStatus}] ${remarks}`
              : o.remarks,
            lastUpdatedBy: 'Current User',
            lastUpdatedAt: new Date().toISOString(),
          };
        })
      );
      toast.success(`Sales Order status updated to ${newStatus}`);
    },
    []
  );

  /**
   * Upload an order confirmation document.
   */
  const uploadSalesOrderDocument = useCallback(
    async (id, docPayload) => {
      const isNumericBackendId = typeof id === 'number' || /^\d+$/.test(String(id));

      if (!isMockApi && isNumericBackendId && docPayload?.file) {
        try {
          setIsLoading(true);
          const uploaded = await orderConfirmationService.uploadOrderConfirmationDocument(
            id,
            docPayload.file,
            docPayload.documentTypeId || 1,
            docPayload.remarks || ''
          );

          // Refresh documents on the order in state
          setSalesOrders((prev) =>
            prev.map((o) => {
              if (
                String(o.id).toLowerCase() !== String(id).toLowerCase() &&
                String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()
              ) {
                return o;
              }
              const newDoc = {
                id: uploaded?.id || `oc-doc-${Date.now()}`,
                fileName: uploaded?.fileName || docPayload.file.name,
                documentTypeId: uploaded?.documentTypeId || docPayload.documentTypeId,
                documentTypeName: uploaded?.documentTypeName || docPayload.documentType || 'Client PO',
                documentType: uploaded?.documentTypeName || docPayload.documentType || 'Client PO',
                downloadUrl: uploaded?.downloadUrl || '',
                uploadedAt: new Date().toISOString().split('T')[0],
                fileSize: docPayload.fileSize || '300 KB',
                remarks: docPayload.remarks || '',
              };
              return {
                ...o,
                documents: [newDoc, ...(o.documents || [])],
                lastUpdatedAt: new Date().toISOString(),
              };
            })
          );
          toast.success(`Uploaded "${docPayload.file.name}"`);
          return uploaded;
        } catch (apiErr) {
          console.error('Failed to upload document via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to upload document to backend.');
        } finally {
          setIsLoading(false);
        }
      }

      // Local / Mock document append
      setSalesOrders((prev) =>
        prev.map((o) => {
          if (
            String(o.id).toLowerCase() !== String(id).toLowerCase() &&
            String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()
          ) {
            return o;
          }
          const newDoc = {
            id: `oc-doc-${Date.now()}`,
            fileName: docPayload.fileName || docPayload.file?.name || 'Document.pdf',
            documentType: docPayload.documentType || 'Client PO',
            uploadedAt: new Date().toISOString().split('T')[0],
            fileSize: docPayload.fileSize || '280 KB',
            remarks: docPayload.remarks || '',
          };
          return {
            ...o,
            documents: [newDoc, ...(o.documents || [])],
            lastUpdatedAt: new Date().toISOString(),
          };
        })
      );
      toast.success(`Uploaded "${docPayload.fileName || docPayload.file?.name || 'document'}"`);
    },
    []
  );

  /**
   * Download a document by ID.
   */
  const downloadSalesOrderDocument = useCallback(
    async (docId, fileName = 'Customer_PO.pdf') => {
      const isNumericDocId = typeof docId === 'number' || /^\d+$/.test(String(docId));
      if (!isMockApi && isNumericDocId) {
        try {
          return await orderConfirmationService.downloadOrderConfirmationDocument(docId, fileName);
        } catch (err) {
          console.error('Failed to download document from API:', err);
          toast.error('Failed to download document from server.');
        }
      }
      toast(`Downloading document "${fileName}"`, { icon: '📄' });
      triggerPdfDownload(fileName, {
        title: 'Customer Purchase Order',
        documentType: 'Client PO',
        fileName,
      });
    },
    []
  );

  /**
   * Delete an order confirmation document.
   */
  const deleteSalesOrderDocument = useCallback(
    async (id, docId) => {
      const isNumericDocId = typeof docId === 'number' || /^\d+$/.test(String(docId));

      if (!isMockApi && isNumericDocId) {
        try {
          await orderConfirmationService.deleteOrderConfirmationDocument(docId);
        } catch (apiErr) {
          console.warn('Backend document delete error:', apiErr?.message || apiErr);
        }
      }

      setSalesOrders((prev) =>
        prev.map((o) => {
          if (
            String(o.id).toLowerCase() !== String(id).toLowerCase() &&
            String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()
          ) {
            return o;
          }
          return {
            ...o,
            documents: (o.documents || []).filter((d) => String(d.id) !== String(docId)),
            lastUpdatedAt: new Date().toISOString(),
          };
        })
      );
      toast.success('Document removed');
    },
    []
  );

  /**
   * Send order confirmation email and record log.
   */
  const sendSalesOrderMail = useCallback(
    async (id, mailPayload) => {
      const isNumericBackendId = typeof id === 'number' || /^\d+$/.test(String(id));

      if (!isMockApi && isNumericBackendId) {
        try {
          setIsLoading(true);
          await orderConfirmationService.sendOrderConfirmationEmail(id, {
            toEmail: mailPayload.to,
            ccEmail: mailPayload.cc || '',
            subject: mailPayload.subject,
            body: mailPayload.body,
          });
        } catch (apiErr) {
          console.error('Failed to send email via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to send email through server.');
        } finally {
          setIsLoading(false);
        }
      }

      const now = new Date();
      const sentAt = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
      const newLog = {
        id: `oc-mail-${Date.now()}`,
        sentAt,
        to: mailPayload.to,
        cc: mailPayload.cc || '',
        subject: mailPayload.subject,
        result: 'Success',
        error: '',
      };

      setSalesOrders((prev) =>
        prev.map((o) => {
          if (
            String(o.id).toLowerCase() !== String(id).toLowerCase() &&
            String(o.orderConfirmationNo).toLowerCase() !== String(id).toLowerCase()
          ) {
            return o;
          }
          return {
            ...o,
            emailLogs: [newLog, ...(o.emailLogs || [])],
            lastUpdatedAt: now.toISOString(),
          };
        })
      );
      toast.success(`Email sent to ${mailPayload.to}`);
    },
    []
  );

  return (
    <SalesOrdersContext.Provider
      value={{
        salesOrders,
        isLoading,
        lookups,
        refreshSalesOrders,
        getSalesOrderById,
        fetchSalesOrderById,
        getOrderCountByQuotationId,
        getNextOrderConfirmationNo,
        fetchNextOrderConfirmationNo,
        createSalesOrder,
        updateSalesOrder,
        changeSalesOrderStatus,
        uploadSalesOrderDocument,
        downloadSalesOrderDocument,
        deleteSalesOrderDocument,
        sendSalesOrderMail,
      }}
    >
      {children}
    </SalesOrdersContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSalesOrdersContext() {
  const ctx = useContext(SalesOrdersContext);
  if (!ctx) {
    throw new Error('useSalesOrdersContext must be used inside SalesOrdersProvider');
  }
  return ctx;
}
