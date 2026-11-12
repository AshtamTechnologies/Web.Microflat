/**
 * SalesOrdersContext.jsx — Mock state management & CRUD actions for Sales Orders (Order Confirmations).
 *
 * Follows Frontend-API-Guide.md §5.4g rules:
 *   - Created from a Confirmed quotation's latest revision
 *   - Statuses: Draft -> Confirmed -> Cancelled
 *   - Only Draft orders are editable
 *   - Documents allowed in Draft & Confirmed (blocked when Cancelled)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  INITIAL_SALES_ORDERS,
  calculateSalesOrderTotals,
  getNextOrderStatuses,
} from '../mocks/salesOrders';

const SalesOrdersContext = createContext(null);
const STORAGE_KEY = 'microflat_sales_orders_data';

export function SalesOrdersProvider({ children }) {
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(salesOrders));
    } catch (e) {
      console.error('Failed to save sales orders to localStorage:', e);
    }
  }, [salesOrders]);

  const getSalesOrderById = useCallback(
    (id) => {
      if (!id) return null;
      return (
        salesOrders.find(
          (o) =>
            String(o.id).toLowerCase() === String(id).toLowerCase() ||
            String(o.orderConfirmationNo).toLowerCase() === String(id).toLowerCase()
        ) || null
      );
    },
    [salesOrders]
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

  const getNextOrderConfirmationNo = useCallback(
    (orderDate) => {
      const parsedYear = orderDate ? new Date(orderDate).getFullYear() : NaN;
      const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
      const seq = salesOrders.length + 1;
      return `OC-${year}-${String(seq).padStart(6, '0')}`;
    },
    [salesOrders]
  );

  const createSalesOrder = useCallback(
    (payload) => {
      const orderDate =
        payload.orderConfirmationDate || new Date().toISOString().split('T')[0];
      const orderConfirmationNo =
        payload.orderConfirmationNo || getNextOrderConfirmationNo(orderDate);
      const status = payload.status === 'Confirmed' ? 'Confirmed' : 'Draft';
      const totals = calculateSalesOrderTotals(
        payload.lineItems || [],
        payload.taxTreatment || 'INTRA_STATE',
        payload.otherCharges || 0
      );

      const newOrder = {
        id: orderConfirmationNo,
        orderConfirmationNo,
        orderConfirmationDate: orderDate,
        quotationId: payload.quotationId || '',
        quotationNo: payload.quotationNo || '',
        quotationRevisionNo: payload.quotationRevisionNo ?? 0,
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

      setSalesOrders((prev) => [newOrder, ...prev]);
      toast.success(
        status === 'Confirmed'
          ? `Sales Order ${orderConfirmationNo} created & confirmed`
          : `Sales Order ${orderConfirmationNo} saved as Draft`
      );
      return newOrder;
    },
    [getNextOrderConfirmationNo]
  );

  const updateSalesOrder = useCallback((id, payload) => {
    let updatedOrder = null;
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id && o.orderConfirmationNo !== id) return o;
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
  }, []);

  const changeSalesOrderStatus = useCallback((id, newStatus, remarks = '') => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id && o.orderConfirmationNo !== id) return o;
        return {
          ...o,
          status: newStatus,
          isEditable: newStatus === 'Draft',
          nextStatuses: getNextOrderStatuses(newStatus),
          confirmedOn:
            newStatus === 'Confirmed'
              ? o.confirmedOn || new Date().toISOString().split('T')[0]
              : o.confirmedOn,
          remarks: remarks ? `${o.remarks ? `${o.remarks}\n` : ''}[${newStatus}] ${remarks}` : o.remarks,
          lastUpdatedBy: 'Current User',
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success(`Sales Order status updated to ${newStatus}`);
  }, []);

  const uploadSalesOrderDocument = useCallback((id, docPayload) => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id && o.orderConfirmationNo !== id) return o;
        const newDoc = {
          id: `oc-doc-${Date.now()}`,
          fileName: docPayload.fileName || 'Document.pdf',
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
    toast.success(`Uploaded "${docPayload.fileName || 'document'}"`);
  }, []);

  const deleteSalesOrderDocument = useCallback((id, docId) => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id && o.orderConfirmationNo !== id) return o;
        return {
          ...o,
          documents: (o.documents || []).filter((d) => d.id !== docId),
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Document removed');
  }, []);

  const sendSalesOrderMail = useCallback((id, mailPayload) => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id && o.orderConfirmationNo !== id) return o;
        const now = new Date();
        const sentAt = `${now.toISOString().split('T')[0]} ${now
          .toTimeString()
          .slice(0, 5)}`;
        const newLog = {
          id: `oc-mail-${Date.now()}`,
          sentAt,
          to: mailPayload.to,
          cc: mailPayload.cc || '',
          subject: mailPayload.subject,
          result: 'Success',
          error: '',
        };
        return {
          ...o,
          emailLogs: [newLog, ...(o.emailLogs || [])],
          lastUpdatedAt: now.toISOString(),
        };
      })
    );
    toast.success(`Email sent to ${mailPayload.to}`);
  }, []);

  return (
    <SalesOrdersContext.Provider
      value={{
        salesOrders,
        getSalesOrderById,
        getOrderCountByQuotationId,
        getNextOrderConfirmationNo,
        createSalesOrder,
        updateSalesOrder,
        changeSalesOrderStatus,
        uploadSalesOrderDocument,
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
