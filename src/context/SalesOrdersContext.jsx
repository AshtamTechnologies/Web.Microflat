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
import { orderConfirmationService, isMockApi } from '../services';
import { getNextOrderStatuses, calculateSalesOrderTotals } from '../models/salesOrders/orderConfirmationModel';
import { triggerPdfDownload } from '../utils/fileHelpers';

const SalesOrdersContext = createContext(null);

export function SalesOrdersProvider({ children }) {
  const [salesOrders, setSalesOrders] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [lookups, setLookups] = useState({
    statuses: [],
    paymentTerms: [],
    deliveryTerms: [],
    documentTypes: [],
    taxes: [],
    currencies: [],
    orderSources: [],
  });
  const [nextNumberPreview, setNextNumberPreview] = useState('');

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
      const apiItems = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setSalesOrders(apiItems);
      return apiItems;
    } catch (err) {
      console.warn('Could not refresh sales orders from API:', err?.message || err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

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

        if (listRes.status === 'fulfilled' && listRes.value) {
          const rawItems = Array.isArray(listRes.value?.items)
            ? listRes.value.items
            : (Array.isArray(listRes.value) ? listRes.value : []);
          setSalesOrders(rawItems);
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
   * Resolves a numeric database ID whether given a number, numeric string, or document series number.
   */
  const resolveNumericId = useCallback(
    (input) => {
      if (!input) return null;
      if (typeof input === 'number' && Number.isFinite(input)) return input;
      if (typeof input === 'string' && /^\d+$/.test(input.trim())) return Number(input.trim());
      const matched = salesOrders.find(
        (o) =>
          String(o.id).toLowerCase() === String(input).toLowerCase() ||
          String(o.orderConfirmationNo).toLowerCase() === String(input).toLowerCase()
      );
      if (matched?.id && (typeof matched.id === 'number' || /^\d+$/.test(String(matched.id)))) {
        return Number(matched.id);
      }
      return null;
    },
    [salesOrders]
  );

  /**
   * Asynchronous fetch from API for full order detail (including lines, documents, and email logs).
   */
  const fetchSalesOrderById = useCallback(
    async (id) => {
      if (!id) return null;
      const local = getSalesOrderById(id);
      if (isMockApi) {
        return local;
      }

      try {
        let targetId = resolveNumericId(id);
        if (!targetId && typeof id === 'string') {
          // If id is a non-numeric document series string (e.g. OC-2026-000001) not found in state, resolve it
          const searchResult = await orderConfirmationService.listOrderConfirmations({ search: id.trim() });
          const foundItem = searchResult?.items?.find(
            (item) => String(item.orderConfirmationNo).toLowerCase() === id.trim().toLowerCase()
          ) || searchResult?.items?.[0];
          if (foundItem?.id) {
            targetId = foundItem.id;
          }
        }
        targetId = targetId || id;
        const detail = await orderConfirmationService.getOrderConfirmationById(targetId);
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
   * - When connected to backend API (!isMockApi):
   *     All orders (Quotation & Direct) call POST /api/order-confirmations.
   * - In mock mode (isMockApi):
   *     Stores locally in salesOrders state.
   */
  const createSalesOrder = useCallback(
    async (payload) => {
      const orderDate =
        payload.orderConfirmationDate || new Date().toISOString().split('T')[0];
      const status = payload.status === 'Confirmed' ? 'Confirmed' : 'Draft';
      const isDirect = Boolean(payload.orderSource === true || payload.isDirectOrder || !payload.quotationId);

      // ── Scenario A: Call Backend API (Quotation or Direct) ──
      if (!isMockApi) {
        try {
          setIsLoading(true);
          const createdApiOrder = await orderConfirmationService.createOrderConfirmation(payload);

          // Upload any attached documents with files
          let uploadedDocs = [];
          if (Array.isArray(payload.documents) && payload.documents.length > 0 && createdApiOrder?.id) {
            const uploadPromises = payload.documents
              .filter((doc) => doc?.file instanceof Blob || doc?.file instanceof File)
              .map(async (doc) => {
                try {
                  const uploaded = await orderConfirmationService.uploadOrderConfirmationDocument(
                    createdApiOrder.id,
                    doc.file,
                    doc.documentTypeId || 1,
                    doc.remarks || ''
                  );
                  return uploaded;
                } catch (docErr) {
                  console.warn(`Failed to upload attached document "${doc.fileName || doc.file?.name}":`, docErr);
                  return null;
                }
              });

            if (uploadPromises.length > 0) {
              const uploadResults = await Promise.allSettled(uploadPromises);
              uploadedDocs = uploadResults
                .filter((r) => r.status === 'fulfilled' && r.value)
                .map((r) => r.value);
            }
          }

          // If user requested initial status as 'Confirmed', move status
          let finalOrder = createdApiOrder;
          if (status === 'Confirmed' && createdApiOrder?.id) {
            try {
              finalOrder = await orderConfirmationService.updateOrderConfirmationStatus(
                createdApiOrder.id,
                'Confirmed'
              );
            } catch (statusErr) {
              console.warn('Order created as Draft, but confirming it failed:', statusErr);
            }
          }

          if (uploadedDocs.length > 0) {
            finalOrder = {
              ...finalOrder,
              documents: [...uploadedDocs, ...(finalOrder.documents || [])],
            };
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
          const errMsg = apiErr?.detail || apiErr?.message || 'Failed to create sales order on backend.';
          toast.error(errMsg);
          throw apiErr;
        } finally {
          setIsLoading(false);
        }
      }

      // ── Scenario B: Mock API Only ──
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
        orderSource: isDirect,
        orderSourceName: isDirect ? 'Direct' : 'Quotation',
        isDirectOrder: isDirect,
        quotationId: isDirect ? null : payload.quotationId || null,
        quotationNo: isDirect ? null : payload.quotationNo || null,
        quotationRevisionNo: isDirect ? null : payload.quotationRevisionNo ?? 0,
        inquiryId: payload.inquiryId || null,
        inquiryNo: payload.inquiryNo || null,
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
      const targetNumericId = resolveNumericId(id);

      if (!isMockApi && targetNumericId) {
        try {
          setIsLoading(true);
          let updatedApiOrder = await orderConfirmationService.updateOrderConfirmation(targetNumericId, payload);

          // Upload any newly attached documents with files in edit mode
          if (Array.isArray(payload.documents) && payload.documents.length > 0) {
            const newDocUploads = payload.documents
              .filter((doc) => doc?.file instanceof Blob || doc?.file instanceof File)
              .map(async (doc) => {
                try {
                  return await orderConfirmationService.uploadOrderConfirmationDocument(
                    targetNumericId,
                    doc.file,
                    doc.documentTypeId || 1,
                    doc.remarks || ''
                  );
                } catch (docErr) {
                  console.warn(`Failed to upload attached document "${doc.fileName || doc.file?.name}":`, docErr);
                  return null;
                }
              });

            if (newDocUploads.length > 0) {
              await Promise.allSettled(newDocUploads);
              try {
                const refreshedDocs = await orderConfirmationService.getOrderConfirmationDocuments(targetNumericId);
                if (Array.isArray(refreshedDocs)) {
                  updatedApiOrder = { ...updatedApiOrder, documents: refreshedDocs };
                }
              } catch (e) {}
            }
          }

          if (payload.status === 'Confirmed' && updatedApiOrder.status !== 'Confirmed') {
            updatedApiOrder = await orderConfirmationService.updateOrderConfirmationStatus(
              targetNumericId,
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
          const errMsg = apiErr?.detail || apiErr?.message || 'Failed to update sales order on backend.';
          toast.error(errMsg);
          throw apiErr;
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
      const targetNumericId = resolveNumericId(id);

      if (!isMockApi && targetNumericId) {
        try {
          setIsLoading(true);
          const updated = await orderConfirmationService.updateOrderConfirmationStatus(targetNumericId, newStatus);
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
          return null;
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
      const targetNumericId = resolveNumericId(id);

      if (!isMockApi && targetNumericId && docPayload?.file) {
        try {
          setIsLoading(true);
          const uploaded = await orderConfirmationService.uploadOrderConfirmationDocument(
            targetNumericId,
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
          return null;
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
          return;
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
      const targetNumericId = resolveNumericId(id);

      if (!isMockApi && targetNumericId) {
        try {
          setIsLoading(true);
          await orderConfirmationService.sendOrderConfirmationEmail(targetNumericId, {
            toAddress: mailPayload.to,
            toEmail: mailPayload.to,
            ccAddress: mailPayload.cc || '',
            ccEmail: mailPayload.cc || '',
            subject: mailPayload.subject,
            body: mailPayload.body,
          });
        } catch (apiErr) {
          console.error('Failed to send email via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to send email through server.');
          return false;
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
      return true;
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
