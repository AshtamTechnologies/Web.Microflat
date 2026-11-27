/**
 * SalesOrdersContext.jsx — State management & CRUD actions for Sales Orders (Order Confirmations).
 *
 * Aligned with Frontend-API-Guide.md §5.4g and Swagger OpenAPI specifications:
 *   - Created from a Confirmed quotation's latest revision (backend auto-copies lines & taxes)
 *   - Direct Orders (without Quotation) are created through the order confirmation API
 *   - Statuses: Draft -> Confirmed -> Cancelled
 *   - Only Draft orders are editable
 *   - Documents allowed in Draft & Confirmed (blocked when Cancelled)
 *   - Connects to orderConfirmationService when VITE_USE_MOCK_API !== 'true'
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { orderConfirmationService } from '../services';

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
    if (hasLoadedRef.current) return;
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
      try {
        let targetId =
          typeof id === 'number' && Number.isFinite(id)
            ? id
            : typeof id === 'string' && /^\d+$/.test(id.trim())
              ? Number(id.trim())
              : null;
        if (targetId == null && typeof id === 'string') {
          const searchResult = await orderConfirmationService.listOrderConfirmations({ search: id.trim() });
          const searchItems = Array.isArray(searchResult?.items)
            ? searchResult.items
            : (Array.isArray(searchResult) ? searchResult : []);
          const foundItem = searchItems.find(
            (item) => String(item.orderConfirmationNo).toLowerCase() === id.trim().toLowerCase()
          );
          if (!foundItem?.id) {
            throw new Error(`Sales order "${id}" was not found.`);
          }
          targetId = foundItem.id;
        }
        targetId = targetId || id;
        const detail = await orderConfirmationService.getOrderConfirmationById(targetId);
        if (!detail) throw new Error('The sales order API returned no detail record.');
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
      } catch (err) {
        console.warn('Failed to fetch sales order detail from API:', err?.message || err);
        throw err;
      }
    },
    []
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
      try {
        const num = await orderConfirmationService.getNextOrderConfirmationNumber(todayDate);
        if (num) {
          setNextNumberPreview(num);
          return num;
        }
      } catch (err) {
        toast.error(err?.detail || err?.message || 'Could not preview the sales order number.');
      }
      setNextNumberPreview('');
      return '';
    },
    []
  );

  /**
   * Synchronously returns the latest order confirmation number preview from the API.
   */
  const getNextOrderConfirmationNo = useCallback(() => nextNumberPreview, [nextNumberPreview]);

  /**
   * Creates a new sales order.
   * - When connected to backend API (!isMockApi):
   *     All orders (Quotation & Direct) call POST /api/order-confirmations.
   * - In mock mode (isMockApi):
   *     Stores locally in salesOrders state.
   */
  const createSalesOrder = useCallback(
    async (payload) => {
      try {
          setIsLoading(true);
          const createdApiOrder = await orderConfirmationService.createOrderConfirmation(payload);
          if (!createdApiOrder) throw new Error('The sales order API returned no created record.');

          // Upload any attached documents with files
          let uploadedDocs = [];
          if (Array.isArray(payload.documents) && payload.documents.length > 0 && createdApiOrder?.id) {
            const uploadPromises = payload.documents
              .filter((doc) => doc?.file instanceof Blob || doc?.file instanceof File)
              .map(async (doc) => {
                if (doc.documentTypeId == null) {
                  throw new Error(`A document type is required for "${doc.fileName || doc.file.name}".`);
                }
                return orderConfirmationService.uploadOrderConfirmationDocument(
                  createdApiOrder.id,
                  doc.file,
                  doc.documentTypeId,
                  doc.remarks || ''
                );
              });

            if (uploadPromises.length > 0) {
              uploadedDocs = await Promise.all(uploadPromises);
            }
          }

          // If user requested initial status as 'Confirmed', move status
          let finalOrder = createdApiOrder;
          if (payload.status === 'Confirmed' && createdApiOrder?.id) {
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
    },
    []
  );

  /**
   * Updates an existing Draft sales order.
   */
  const updateSalesOrder = useCallback(
    async (id, payload) => {
      const targetNumericId = resolveNumericId(id);

      if (targetNumericId) {
        try {
          setIsLoading(true);
          let updatedApiOrder = await orderConfirmationService.updateOrderConfirmation(targetNumericId, payload);
          if (!updatedApiOrder) throw new Error('The sales order API returned no updated record.');

          // Upload any newly attached documents with files in edit mode
          if (Array.isArray(payload.documents) && payload.documents.length > 0) {
            const newDocUploads = payload.documents
              .filter((doc) => doc?.file instanceof Blob || doc?.file instanceof File)
              .map(async (doc) => {
                if (doc.documentTypeId == null) {
                  throw new Error(`A document type is required for "${doc.fileName || doc.file.name}".`);
                }
                return orderConfirmationService.uploadOrderConfirmationDocument(
                  targetNumericId,
                  doc.file,
                  doc.documentTypeId,
                  doc.remarks || ''
                );
              });

            if (newDocUploads.length > 0) {
              await Promise.all(newDocUploads);
              const refreshedDocs = await orderConfirmationService.getOrderConfirmationDocuments(targetNumericId);
              updatedApiOrder = { ...updatedApiOrder, documents: refreshedDocs };
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

      throw new Error('A valid integer sales order ID is required.');
    },
    [resolveNumericId]
  );

  /**
   * Status change: Draft -> Confirmed or Cancelled.
   */
  const changeSalesOrderStatus = useCallback(
    async (id, newStatus) => {
      const targetNumericId = resolveNumericId(id);

      if (targetNumericId) {
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

      throw new Error('A valid integer sales order ID is required.');
    },
    [resolveNumericId]
  );

  /**
   * Upload an order confirmation document.
   */
  const uploadSalesOrderDocument = useCallback(
    async (id, docPayload) => {
      const targetNumericId = resolveNumericId(id);

      if (targetNumericId && docPayload?.file && docPayload.documentTypeId != null) {
        try {
          setIsLoading(true);
          await orderConfirmationService.uploadOrderConfirmationDocument(
            targetNumericId,
            docPayload.file,
            docPayload.documentTypeId,
            docPayload.remarks || ''
          );
          toast.success(`Uploaded "${docPayload.file.name}"`);
          return true;
        } catch (apiErr) {
          console.error('Failed to upload document via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to upload document to backend.');
          throw apiErr;
        } finally {
          setIsLoading(false);
        }
      }

      throw new Error('A valid order ID, file, and document type are required.');
    },
    [resolveNumericId]
  );

  /**
   * Download a document by ID.
   */
  const downloadSalesOrderDocument = useCallback(
    async (docId, fileName) => {
      const isNumericDocId = (typeof docId === 'number' && Number.isFinite(docId)) || /^\d+$/.test(String(docId));
      if (!isNumericDocId) {
        toast.error('Document is not available for download from the server.');
        return;
      }
      try {
        return await orderConfirmationService.downloadOrderConfirmationDocument(docId, fileName);
      } catch (err) {
        console.error('Failed to download document from API:', err);
        toast.error('Document is not available for download from the server.');
        return false;
      }
    },
    []
  );

  /**
   * Delete an order confirmation document.
   */
  const deleteSalesOrderDocument = useCallback(
    async (id, docId) => {
      const isNumericDocId = (typeof docId === 'number' && Number.isFinite(docId)) || /^\d+$/.test(String(docId));

      if (!isNumericDocId) {
        toast.error('Failed to delete document from server.');
        return;
      }
      try {
        await orderConfirmationService.deleteOrderConfirmationDocument(docId);
      } catch (apiErr) {
        console.error('Backend document delete error:', apiErr);
        toast.error('Failed to delete document from server.');
        return false;
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

      if (targetNumericId) {
        try {
          setIsLoading(true);
          const result = await orderConfirmationService.sendOrderConfirmationEmail(targetNumericId, {
            toAddress: mailPayload.to,
            toEmail: mailPayload.to,
            ccAddress: mailPayload.cc || '',
            ccEmail: mailPayload.cc || '',
            subject: mailPayload.subject,
            body: mailPayload.body,
          });
          if (result?.isSuccess === false) {
            throw new Error(result.errorMessage || 'The mail provider rejected the email.');
          }
          await fetchSalesOrderById(targetNumericId);
          toast.success('Email sent');
          return true;
        } catch (apiErr) {
          console.error('Failed to send email via API:', apiErr);
          toast.error(apiErr?.message || 'Failed to send email through server.');
          return false;
        } finally {
          setIsLoading(false);
        }
      }

      throw new Error('A valid integer sales order ID is required.');
    },
    [resolveNumericId, fetchSalesOrderById]
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
