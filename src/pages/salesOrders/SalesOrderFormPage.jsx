/**
 * SalesOrderFormPage.jsx — Create or Edit (Draft only) Order Confirmation (Sales Order).
 *
 * Routes:
 *   - /sales-orders/new (?quotationId=...)
 *   - /sales-orders/:id/edit
 *
 * Aligned with Frontend-API-Guide.md §5.4g.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconAdd,
  IconAttachment,
  IconBack,
  IconCheck,
  IconDownload,
  IconEdit,
  IconFileText,
  IconInfo,
  IconPackage,
  IconRotateCcw,
  IconSalesOrder,
  IconTrash,
} from '../../constants/icons';
import {
  PageHeader,
  CollapsibleCard,
  FormGrid,
  FormSection,
  FormActionsBar,
  Button,
  SaveButton,
  CancelButton,
  Input,
  Textarea,
  SearchableSelect,
  SearchableMultiSelect,
  DatePicker,
  Badge,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
  DocumentUploader,
  PaymentTermsSelect,
  DeliveryTermsSelect,
  Drawer,
  Checkbox,
} from '../../components/ui';
import { useSalesOrdersContext } from '../../context/SalesOrdersContext';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useClientsContext } from '../../context/ClientsContext';
import { useStandardsContext } from '../../context/StandardsContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { useDeliveryTermsContext } from '../../context/DeliveryTermsContext';
import { clientService, productService, quotationService } from '../../services';
import { calculateFlatnessTolerance, normalizeGradeCode } from '../../utils/flatnessFormula';
import {
  calculateSalesOrderTotals,
  formatCurrency,
} from '../../models/salesOrders/orderConfirmationModel';
import { formatDate } from '../../utils/dateUtils';
import useColumnResize from '../../hooks/useColumnResize';
import { isHtmlMarkup } from '../../utils/htmlUtils';

function buildCatalogProductDescription(product, variant) {
  if (!product) return '';
  const parts = [
    product.productName || product.name,
    variant?.variantName || variant?.name,
    variant?.specification || product.specification,
  ].filter(Boolean);
  return parts.join(' — ');
}

function toTermsArray(val, fallback = []) {
  if (Array.isArray(val)) {
    return val.filter((item) => typeof item !== 'string' || !isHtmlMarkup(item));
  }
  if (typeof val === 'string' && val.trim()) {
    if (isHtmlMarkup(val)) return fallback;
    return val.split(',').map((s) => s.trim()).filter((s) => s && !isHtmlMarkup(s));
  }
  return fallback;
}

function buildPrefillFromQuotation(quotation) {
  if (!quotation) return null;
  const revIdx =
    quotation.currentRevision !== undefined
      ? quotation.currentRevision
      : Math.max(0, (quotation.revisions?.length || 1) - 1);
  const latestRev =
    quotation.latestRevision ||
    quotation.revisions?.[revIdx] ||
    quotation.revisions?.[quotation.revisions.length - 1] ||
    {};

  const availableItems =
    (Array.isArray(latestRev?.lineItems) && latestRev.lineItems.length > 0 ? latestRev.lineItems : null) ||
    (Array.isArray(latestRev?.lines) && latestRev.lines.length > 0 ? latestRev.lines : null) ||
    (Array.isArray(latestRev?.items) && latestRev.items.length > 0 ? latestRev.items : null) ||
    (Array.isArray(quotation.lineItems) && quotation.lineItems.length > 0 ? quotation.lineItems : null) ||
    (Array.isArray(quotation.items) && quotation.items.length > 0 ? quotation.items : null) ||
    [];

  const resolvedAddressId = quotation.clientAddressId || latestRev?.clientAddressId || null;
  const resolvedContactId = quotation.clientContactId || latestRev?.clientContactId || null;

  return {
    quotationId: quotation.id ?? quotation.quotationId ?? '',
    quotationNo: quotation.quotationNo,
    quotationRevisionNo: latestRev?.revisionNo ?? quotation.currentRevision ?? null,
    inquiryId: quotation.inquiryId || '',
    inquiryNo: quotation.inquiryNo || '',
    clientId: quotation.clientId || '',
    clientName: quotation.clientName || '',
    clientAddressId: resolvedAddressId,
    clientAddress: quotation.clientAddress || latestRev?.clientAddress || '',
    clientContactId: resolvedContactId,
    contactPerson: quotation.contactPerson || latestRev?.contactPerson || '',
    contactEmail: quotation.contactEmail || latestRev?.contactEmail || '',
    contactPhone: quotation.contactPhone || latestRev?.contactPhone || '',
    clientPoNo: quotation.poDetails?.poNumber || quotation.poNumber || quotation.clientPoNo || '',
    clientPoDate: (quotation.poDetails?.receivedOn || quotation.poReceivedDate || quotation.poDate)
      ? String(quotation.poDetails?.receivedOn || quotation.poReceivedDate || quotation.poDate).slice(0, 10)
      : '',
    expectedDeliveryDate: (quotation.poDetails?.expectedDeliveryDate || quotation.expectedDeliveryDate)
      ? String(quotation.poDetails?.expectedDeliveryDate || quotation.expectedDeliveryDate).slice(0, 10)
      : '',
    paymentTermId: quotation.paymentTermId || latestRev?.paymentTermId || null,
    paymentTerms: toTermsArray(quotation.paymentTerms || quotation.paymentTermName, []),
    deliveryTermId: quotation.deliveryTermId || latestRev?.deliveryTermId || null,
    deliveryTerms: toTermsArray(quotation.deliveryTerms || quotation.deliveryTermName, []),
    currency: latestRev?.currency || quotation.currency || '',
    taxTreatment: latestRev?.taxTreatment || quotation.taxTreatment || '',
    selectedTaxIds: Array.isArray(latestRev?.taxes || quotation.taxes)
      ? (latestRev?.taxes || quotation.taxes).map((t) => Number(t.taxConfigDetailId || t.id)).filter(Boolean)
      : Array.isArray(quotation.selectedTaxIds)
      ? quotation.selectedTaxIds
      : [],
    taxes: latestRev?.taxes || quotation.taxes || [],
    termsAndConditions: quotation.termsAndConditions || '',
    lineItems: availableItems.map((item) => ({
      ...item,
      id: item.id ?? null,
      quotationLineItemId: item.id ?? null,
      otherCharges: item.otherCharges ?? '',
      taxPercent: item.taxPercent == null ? null : Number(item.taxPercent),
    })),
  };
}

function formatAddressForDisplay(a) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  const parts = [
    a.address1 || a.addressLine1 || a.address,
    a.address2 || a.addressLine2,
    a.city,
    a.stateName || a.state,
    a.zipCode || a.pincode,
  ].filter(Boolean);
  const typeTag = a.addressType ? `${a.addressType}: ` : '';
  const labelTag = a.addressLabel && a.addressLabel !== a.addressType ? `(${a.addressLabel}) ` : '';
  return `${typeTag}${labelTag}${parts.join(', ')}`.trim() || parts.join(', ');
}

export default function SalesOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialQuotationId = searchParams.get('quotationId') || '';

  const isEditMode = Boolean(id);
  const {
    lookups,
    fetchSalesOrderById,
    getNextOrderConfirmationNo,
    fetchNextOrderConfirmationNo,
    createSalesOrder,
    updateSalesOrder,
  } = useSalesOrdersContext();
  const { quotations = [], refreshQuotations } = useQuotationsContext();
  const { clients = [], ensureLoaded: ensureClientsLoaded } = useClientsContext();
  const standardsContext = useStandardsContext?.() || {};
  const { standardsList = [], gradeMapping = [], ensureStandardsLoaded } = standardsContext;
  const { categories: productCategories = [], ensureProductCategoriesLoaded } = useProductCategoriesContext?.() || {};
  const { paymentTerms: masterPaymentTerms = [] } = usePaymentTermsContext?.() || {};
  const { deliveryTerms: masterDeliveryTerms = [] } = useDeliveryTermsContext?.() || {};

  useEffect(() => {
    ensureStandardsLoaded?.();
  }, [ensureStandardsLoaded]);

  useEffect(() => {
    ensureProductCategoriesLoaded?.();
  }, [ensureProductCategoriesLoaded]);

  const [activeClients, setActiveClients] = useState([]);
  const [clientDetailData, setClientDetailData] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [poPendingQuotes, setPoPendingQuotes] = useState([]);
  const [directFetchedQuotes, setDirectFetchedQuotes] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const hasPrefilledInitialQuoteRef = useRef(false);

  // Drawer & Line Item Builder State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [drawerCategory, setDrawerCategory] = useState('');
  const [drawerProduct, setDrawerProduct] = useState('');
  const [drawerStandard, setDrawerStandard] = useState('');
  const [drawerGrade, setDrawerGrade] = useState('');
  const [drawerVariant, setDrawerVariant] = useState('');
  const [drawerQty, setDrawerQty] = useState('1');
  const [drawerRate, setDrawerRate] = useState('');
  const [drawerRateSource, setDrawerRateSource] = useState('Manual');
  const [drawerTaxConfigDetailId, setDrawerTaxConfigDetailId] = useState('');
  const [drawerOtherCharges, setDrawerOtherCharges] = useState('0');
  const [drawerOptions, setDrawerOptions] = useState([]);
  const [drawerDescription, setDrawerDescription] = useState('');
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(false);
  const [isLoadingPriceLookup, setIsLoadingPriceLookup] = useState(false);
  const [productVariantsMap, setProductVariantsMap] = useState({});
  const [productDetailsMap, setProductDetailsMap] = useState({});
  const [productOptionsMap, setProductOptionsMap] = useState({});

  useEffect(() => {
    ensureClientsLoaded?.();
  }, [ensureClientsLoaded]);

  // Load active clients from backend API for direct orders
  useEffect(() => {
    let isMounted = true;
    async function loadActiveClients() {
      try {
        setIsLoadingClients(true);
        const data = await clientService.getActiveClients();
        if (isMounted && Array.isArray(data)) {
          setActiveClients(data);
        }
      } catch (err) {
        console.warn('Failed to load active clients:', err);
      } finally {
        if (isMounted) setIsLoadingClients(false);
      }
    }
    loadActiveClients();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load products list from backend API for line items picker
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        setIsLoadingProducts(true);
        const res = await productService.listProducts({ IsActive: true, PageSize: 100 });
        const items = Array.isArray(res?.items) ? res.items : [];
        if (isMounted) {
          setProductsList(items);
        }
      } catch (err) {
        console.warn('Failed to load products list:', err);
      } finally {
        if (isMounted) setIsLoadingProducts(false);
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isLoadingOrder, setIsLoadingOrder] = useState(isEditMode);
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [orderLoadError, setOrderLoadError] = useState('');
  const existingOrder = fetchedOrder;

  useEffect(() => {
    if (!isEditMode || !id) return;
    let isMounted = true;
    async function loadFullOrder() {
      try {
        setIsLoadingOrder(true);
        setFetchedOrder(null);
        setOrderLoadError('');
        const full = await fetchSalesOrderById(id);
        if (!full) {
          throw new Error('The sales order API returned no detail record.');
        }
        if (isMounted) {
          const directOrder = full.orderSource ?? full.isDirectOrder ?? (full.quotationId != null ? false : null);
          if (directOrder == null) {
            throw new Error('The sales order API did not identify its order source.');
          }
          setFetchedOrder(full);
          setOrderMode(directOrder ? 'DIRECT' : 'QUOTATION');
          setFormData({
            orderConfirmationNo: full.orderConfirmationNo || '',
            orderConfirmationDate: full.orderConfirmationDate || '',
            quotationId: full.quotationId || '',
            quotationNo: full.quotationNo || '',
            quotationRevisionNo: full.quotationRevisionNo ?? null,
            inquiryId: full.inquiryId || '',
            inquiryNo: full.inquiryNo || '',
            clientId: full.clientId || '',
            clientName: full.clientName || '',
            clientAddressId: full.clientAddressId || null,
            clientAddress: full.clientAddress || '',
            clientContactId: full.clientContactId || null,
            contactPerson: full.contactPerson || '',
            contactEmail: full.contactEmail || '',
            contactPhone: full.contactPhone || '',
            clientPoNo: full.clientPoNo || '',
            clientPoDate: full.clientPoDate || '',
            expectedDeliveryDate: full.expectedDeliveryDate || '',
            paymentTermId: full.paymentTermId || null,
            paymentTerms: toTermsArray(full.paymentTerms || full.paymentTermName, []),
            deliveryTermId: full.deliveryTermId || null,
            deliveryTerms: toTermsArray(full.deliveryTerms || full.deliveryTermName, []),
            currencyId: full.currencyId || null,
            currency: full.currencyCode || full.currency || '',
            taxTreatment: full.taxTreatment || '',
            selectedTaxIds: Array.isArray(full.taxes)
              ? full.taxes.map((t) => Number(t.taxConfigDetailId || t.id)).filter(Boolean)
              : [],
            taxes: full.taxes || [],
            otherCharges: full.otherCharges ?? '',
            otherChargesDescription: full.otherChargesDescription || '',
            termsAndConditions: full.termsAndConditions || '',
            remarks: full.remarks || '',
            lineItems: (full.lineItems || []).map((item) => ({
              ...item,
              id: item.id ?? null,
              otherCharges: item.otherCharges ?? '',
              taxPercent: item.taxPercent == null ? null : Number(item.taxPercent),
            })),
            documents: full.documents || [],
          });
        }
      } catch (err) {
        console.error('Failed to load full sales order detail for edit:', err);
        if (isMounted) {
          setOrderLoadError(err?.message || 'Failed to load sales order details.');
          toast.error(err?.message || 'Failed to load sales order details.');
        }
      } finally {
        if (isMounted) setIsLoadingOrder(false);
      }
    }
    loadFullOrder();
    return () => {
      isMounted = false;
    };
  }, [isEditMode, id, fetchSalesOrderById]);

  useEffect(() => {
    let isMounted = true;
    async function fetchQuotationsData() {
      setIsLoadingQuotations(true);
      try {
        // 1. Fetch dedicated PO-pending quotations
        try {
          const rawPo = await quotationService.getPoPendingSalesOrderQuotations();
          const poItems = Array.isArray(rawPo)
            ? rawPo
            : Array.isArray(rawPo?.items)
            ? rawPo.items
            : Array.isArray(rawPo?.data)
            ? rawPo.data
            : [];
          if (isMounted && poItems.length > 0) {
            setPoPendingQuotes(poItems);
          }
        } catch (err) {
          console.warn('PO-pending endpoint not available or returned error:', err);
        }

        // 2. Fetch full quotations list with pageSize=100 via context
        try {
          if (refreshQuotations) {
            await refreshQuotations({ pageSize: 100 });
          }
        } catch (err) {
          console.warn('Could not refresh quotations context with pageSize 100:', err);
        }

        // 3. Fallback direct list query in case context is bypassed
        try {
          const res = await quotationService.listQuotations({ pageSize: 100 });
          const items = Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          if (isMounted && items.length > 0) {
            setDirectFetchedQuotes(items);
          }
        } catch (err) {
          console.warn('Direct listQuotations fallback error:', err);
        }
      } finally {
        if (isMounted) setIsLoadingQuotations(false);
      }
    }

    fetchQuotationsData();
    return () => {
      isMounted = false;
    };
  }, [refreshQuotations]);

  // §5.4g: Order confirmations are created from Confirmed or PO Received quotations
  const confirmedQuotations = useMemo(() => {
    const isEligible = (q) => {
      if (!q) return false;
      const s = String(q.status || '').toLowerCase().replace(/[\s_-]/g, '');
      return (
        s === 'confirmed' ||
        s === 'poreceived' ||
        s === 'won' ||
        s === 'approved' ||
        s === 'ordercreated' ||
        Boolean(q.poReceived) ||
        Boolean(q.poDetails?.poNumber) ||
        Boolean(q.poNumber) ||
        Boolean(q.clientPoNo)
      );
    };

    const allCandidates = [
      ...poPendingQuotes,
      ...directFetchedQuotes,
      ...quotations,
    ];

    const map = new Map();
    allCandidates.forEach((q) => {
      if (!q) return;
      const key = String(q.id ?? q.quotationId ?? q.quotationNo ?? '');
      if (!key) return;
      if (isEligible(q) && !map.has(key)) {
        map.set(key, q);
      }
    });

    // If no quotations matched the strict criteria, surface active non-lost/non-cancelled quotations
    if (map.size === 0) {
      allCandidates.forEach((q) => {
        if (!q) return;
        const key = String(q.id ?? q.quotationId ?? q.quotationNo ?? '');
        if (!key) return;
        const s = String(q.status || '').toLowerCase().replace(/[\s_-]/g, '');
        if (s !== 'lost' && s !== 'cancelled' && !map.has(key)) {
          map.set(key, q);
        }
      });
    }

    return Array.from(map.values());
  }, [quotations, poPendingQuotes, directFetchedQuotes]);

  const quotationOptions = useMemo(
    () => confirmedQuotations.map((q) => {
      const clientName = q.clientName || q.client?.clientName || q.client?.companyName || q.customerName;
      const poNumber = q.poDetails?.poNumber || q.poNumber || q.clientPoNo;
      const optVal =
        (typeof q.id === 'number' && Number.isInteger(q.id) && q.id > 0)
          ? q.id
          : (/^\d+$/.test(String(q.id || '').trim()) && Number(String(q.id).trim()) > 0
              ? Number(String(q.id).trim())
              : null)
          ?? (typeof q.quotationId === 'number' && Number.isInteger(q.quotationId) && q.quotationId > 0
              ? q.quotationId
              : null)
          ?? q.quotationNo
          ?? q.id;
      return {
        value: optVal,
        label: [q.quotationNo, clientName, poNumber ? `(PO: ${poNumber})` : ''].filter(Boolean).join(' — '),
      };
    }),
    [confirmedQuotations]
  );

  const [orderMode, setOrderMode] = useState(() => {
    if (isEditMode && existingOrder) {
      const directOrder = existingOrder.orderSource ?? existingOrder.isDirectOrder;
      if (directOrder != null) return directOrder ? 'DIRECT' : 'QUOTATION';
      return existingOrder.quotationId != null ? 'QUOTATION' : '';
    }
    return initialQuotationId ? 'QUOTATION' : 'DIRECT';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(() => {
    if (isEditMode && existingOrder) {
      return {
        orderConfirmationNo: existingOrder.orderConfirmationNo,
        orderConfirmationDate: existingOrder.orderConfirmationDate || '',
        quotationId: existingOrder.quotationId || '',
        quotationNo: existingOrder.quotationNo || '',
        quotationRevisionNo: existingOrder.quotationRevisionNo ?? null,
        inquiryId: existingOrder.inquiryId || '',
        inquiryNo: existingOrder.inquiryNo || '',
        clientId: existingOrder.clientId || '',
        clientName: existingOrder.clientName || '',
        clientAddressId: existingOrder.clientAddressId || null,
        clientAddress: existingOrder.clientAddress || '',
        clientContactId: existingOrder.clientContactId || null,
        contactPerson: existingOrder.contactPerson || '',
        contactEmail: existingOrder.contactEmail || '',
        contactPhone: existingOrder.contactPhone || '',
        clientPoNo: existingOrder.clientPoNo || '',
        clientPoDate: existingOrder.clientPoDate || '',
        expectedDeliveryDate: existingOrder.expectedDeliveryDate || '',
        paymentTermId: existingOrder.paymentTermId || null,
        paymentTerms: toTermsArray(existingOrder.paymentTerms || existingOrder.paymentTermName, []),
        deliveryTermId: existingOrder.deliveryTermId || null,
        deliveryTerms: toTermsArray(existingOrder.deliveryTerms || existingOrder.deliveryTermName, []),
        currencyId: existingOrder.currencyId || null,
        currency: existingOrder.currencyCode || existingOrder.currency || '',
        taxTreatment: existingOrder.taxTreatment || '',
        selectedTaxIds: Array.isArray(existingOrder.taxes)
          ? existingOrder.taxes.map((t) => Number(t.taxConfigDetailId || t.id)).filter(Boolean)
          : [],
        taxes: existingOrder.taxes || [],
        otherCharges: existingOrder.otherCharges ?? '',
        otherChargesDescription: existingOrder.otherChargesDescription || '',
        termsAndConditions: existingOrder.termsAndConditions || '',
        remarks: existingOrder.remarks || '',
        lineItems: existingOrder.lineItems || [],
        documents: existingOrder.documents || [],
      };
    }

    const todayIso = new Date().toISOString().split('T')[0];
    const matchedQuote = initialQuotationId
      ? confirmedQuotations.find(
          (q) =>
            String(q.id).toLowerCase() === initialQuotationId.toLowerCase() ||
            String(q.quotationNo).toLowerCase() === initialQuotationId.toLowerCase()
        )
      : null;

    const prefill = buildPrefillFromQuotation(matchedQuote);

    return {
      orderConfirmationNo: getNextOrderConfirmationNo(todayIso),
      orderConfirmationDate: todayIso,
      quotationId: prefill?.quotationId || '',
      quotationNo: prefill?.quotationNo || '',
      quotationRevisionNo: prefill?.quotationRevisionNo ?? null,
      inquiryId: prefill?.inquiryId || '',
      inquiryNo: prefill?.inquiryNo || '',
      clientId: prefill?.clientId || '',
      clientName: prefill?.clientName || '',
      clientAddressId: prefill?.clientAddressId || null,
      clientAddress: prefill?.clientAddress || '',
      clientContactId: prefill?.clientContactId || null,
      contactPerson: prefill?.contactPerson || '',
      contactEmail: prefill?.contactEmail || '',
      contactPhone: prefill?.contactPhone || '',
      clientPoNo: prefill?.clientPoNo || '',
      clientPoDate: prefill?.clientPoDate || '',
      expectedDeliveryDate: prefill?.expectedDeliveryDate || '',
      paymentTermId: prefill?.paymentTermId || null,
      paymentTerms: prefill?.paymentTerms ? toTermsArray(prefill.paymentTerms) : [],
      deliveryTermId: prefill?.deliveryTermId || null,
      deliveryTerms: prefill?.deliveryTerms ? toTermsArray(prefill.deliveryTerms) : [],
      currencyId: lookups?.defaultCurrencyId ?? null,
      currency: prefill?.currency || '',
      taxTreatment: prefill?.taxTreatment || '',
      selectedTaxIds: prefill?.selectedTaxIds || [],
      taxes: prefill?.taxes || [],
      otherCharges: 0,
      otherChargesDescription: '',
      termsAndConditions: prefill?.termsAndConditions || '',
      remarks: '',
      lineItems: prefill?.lineItems || [],
      documents: [],
    };
  });

  // Preselect default currency from lookups if creating a direct order
  useEffect(() => {
    if (orderMode === 'DIRECT') {
      const currenciesList = Array.isArray(lookups?.currencies) && lookups.currencies.length > 0 ? lookups.currencies : null;
      const defId = lookups?.defaultCurrencyId;
      const found = currenciesList?.find((c) => String(c.currencyId ?? c.id) === String(defId))
        || (defId == null ? currenciesList?.[0] : null);

      if (!formData.currencyId && found) {
        setFormData((prev) => ({
          ...prev,
          currencyId: found.currencyId ?? found.id,
          currency: found.currencyCode || found.code || '',
        }));
      }
    }
  }, [orderMode, formData.currencyId, lookups]);

  // Load client detail (addresses/contacts) whenever clientId is set
  useEffect(() => {
    if (!formData.clientId) {
      setClientDetailData(null);
      return;
    }
    let isMounted = true;
    async function loadClientDetail() {
      try {
        const detail = await clientService.getClientById(formData.clientId);
        if (isMounted && detail) {
          setClientDetailData(detail);
          const addrs = (detail.currentDetail?.addresses || []).filter((a) => a.isActive !== false);
          const contacts = (detail.currentDetail?.contacts || detail.contacts || detail.versions?.[0]?.contacts || []).filter((c) => c.isActive !== false);
          setFormData((prev) => {
            const hasValidAddr = prev.clientAddressId && addrs.some((a) => String(a.clientAddressId || a.id) === String(prev.clientAddressId));
            const preferredAddr =
              addrs.find((a) => (a.addressType || '').toLowerCase() === 'billing') ||
              addrs.find((a) => (a.addressLabel || '').toLowerCase().includes('billing')) ||
              addrs.find((a) => a.isPrimary) ||
              addrs[0];

            const matchById = prev.clientContactId
              ? contacts.find((c) => String(c.clientContactId || c.id) === String(prev.clientContactId))
              : null;

            const matchByName = !matchById && prev.contactPerson
              ? contacts.find((c) =>
                  (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim())
                    .toLowerCase() === prev.contactPerson.toLowerCase()
                )
              : null;

            const resolvedContact = matchById || matchByName
              || contacts.find((c) => c.isPrimary)
              || contacts[0]
              || null;

            return {
              ...prev,
              clientAddressId: hasValidAddr ? prev.clientAddressId : (preferredAddr?.clientAddressId || preferredAddr?.id || prev.clientAddressId || null),
              clientAddress: hasValidAddr ? prev.clientAddress : formatAddressForDisplay(preferredAddr),
              clientContactId: resolvedContact?.clientContactId || resolvedContact?.id || null,
              contactPerson: resolvedContact
                ? (resolvedContact.fullName || `${resolvedContact.firstName || ''} ${resolvedContact.lastName || ''}`.trim() || resolvedContact.name || '')
                : prev.contactPerson,
              contactEmail: resolvedContact?.email || resolvedContact?.contactEmail || prev.contactEmail || '',
              contactPhone: resolvedContact?.phoneNo || resolvedContact?.alternatePhoneNo || resolvedContact?.mobile1 || resolvedContact?.phone || resolvedContact?.mobile || resolvedContact?.contactPhone || prev.contactPhone || '',
            };
          });
        }
      } catch (err) {
        console.warn('Failed to fetch client detail for clientId:', formData.clientId, err);
      }
    }
    loadClientDetail();
    return () => {
      isMounted = false;
    };
  }, [formData.clientId]);

  // Sync prefill if confirmedQuotations loaded after initial render or initialQuotationId provided
  useEffect(() => {
    if (!isEditMode && initialQuotationId && !hasPrefilledInitialQuoteRef.current) {
      let isMounted = true;
      async function loadInitialQuote() {
        hasPrefilledInitialQuoteRef.current = true;
        try {
          let fullQuote = null;
          let numericId = null;
          if (/^\d+$/.test(String(initialQuotationId).trim()) && Number(String(initialQuotationId).trim()) > 0) {
            numericId = Number(String(initialQuotationId).trim());
            fullQuote = await quotationService.getQuotationById(numericId).catch(() => null);
          }

          if (!fullQuote) {
            const quote = confirmedQuotations.find(
              (q) => String(q.id) === String(initialQuotationId) ||
                     String(q.quotationId) === String(initialQuotationId) ||
                     String(q.quotationNo) === String(initialQuotationId)
            );
            if (quote) {
              const candId = [quote.id, quote.quotationId].find(
                (v) => (typeof v === 'number' && Number.isInteger(v) && v > 0) ||
                       (typeof v === 'string' && /^\d+$/.test(v.trim()) && Number(v.trim()) > 0)
              );
              if (candId) {
                numericId = Number(candId);
                fullQuote = await quotationService.getQuotationById(numericId).catch(() => null);
              }
              fullQuote = fullQuote || quote;
            }
          }

          if (isMounted && fullQuote) {
            const prefill = buildPrefillFromQuotation(fullQuote);
            if (prefill) {
              if (numericId) prefill.quotationId = numericId;
              setFormData((prev) => ({
                ...prev,
                ...prefill,
              }));
            }
          }
        } catch (e) {
          console.error('Could not load full initial quotation details:', e);
          if (isMounted) toast.error(e?.message || 'Could not load quotation details.');
        }
      }
      loadInitialQuote();
      return () => {
        isMounted = false;
      };
    }
  }, [isEditMode, initialQuotationId, confirmedQuotations]);

  // Sync next order confirmation series number from API preview
  useEffect(() => {
    if (!isEditMode && fetchNextOrderConfirmationNo) {
      fetchNextOrderConfirmationNo(formData.orderConfirmationDate).then((no) => {
        if (no) {
          setFormData((prev) => ({ ...prev, orderConfirmationNo: no }));
        }
      });
    }
  }, [formData.orderConfirmationDate, isEditMode, fetchNextOrderConfirmationNo]);

  const [errors, setErrors] = useState({});
  const [docRemarks, setDocRemarks] = useState('');

  const clientOptions = useMemo(() => {
    return activeClients.map((c) => {
      const cid = c.id ?? c.clientId;
      const name = c.companyName || c.clientName || c.name || '';
      const code = c.clientCode || '';
      return {
        value: cid == null ? '' : String(cid),
        label: `${name}${code ? ` (${code})` : ''}`,
      };
    }).filter((client) => client.value && client.label);
  }, [activeClients]);

  const selectedClient = useMemo(
    () =>
      [...activeClients, ...clients].find(
        (c) =>
          String(c.id || c.clientId) === String(formData.clientId) ||
          String(c.companyName || c.name || '').toLowerCase() === String(formData.clientName || '').toLowerCase()
      ) || null,
    [activeClients, clients, formData.clientId, formData.clientName]
  );

  async function handleSelectClient(selectedId) {
    if (!selectedId) return;
    const pickedClient =
      activeClients.find((c) => String(c.id || c.clientId) === String(selectedId)) ||
      clients.find((c) => String(c.id || c.clientId) === String(selectedId));
    const clientName = pickedClient?.companyName || pickedClient?.clientName || pickedClient?.name || '';

    setFormData((prev) => ({
      ...prev,
      clientId: String(selectedId),
      clientName,
      clientAddressId: null,
      clientAddress: '',
      clientContactId: null,
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
    }));
    setErrors((prev) => ({ ...prev, clientId: undefined, clientAddressId: undefined }));

    try {
      const fullClient = await clientService.getClientById(selectedId);
      if (fullClient) {
        setClientDetailData(fullClient);
        const addrs = (fullClient.currentDetail?.addresses || []).filter((a) => a.isActive !== false);
        const contacts = (fullClient.currentDetail?.contacts || []).filter((c) => c.isActive !== false);
        const preferredAddr =
          addrs.find((a) => (a.addressType || '').toLowerCase() === 'billing') ||
          addrs.find((a) => (a.addressLabel || '').toLowerCase().includes('billing')) ||
          addrs.find((a) => a.isPrimary) ||
          addrs[0];
        const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

        const defaultAddressStr = formatAddressForDisplay(preferredAddr);

        setFormData((prev) => ({
          ...prev,
          clientAddressId: preferredAddr?.clientAddressId || preferredAddr?.id || null,
          clientAddress: defaultAddressStr,
          clientContactId: primaryContact?.clientContactId || primaryContact?.id || null,
          contactPerson: primaryContact?.fullName || `${primaryContact?.firstName || ''} ${primaryContact?.lastName || ''}`.trim() || '',
          contactEmail: primaryContact?.email || '',
          contactPhone: primaryContact?.phoneNo || primaryContact?.alternatePhoneNo || primaryContact?.mobile1 || primaryContact?.phone || primaryContact?.mobile || '',
        }));
      }
    } catch (err) {
      console.warn('Could not fetch client addresses/contacts:', err);
    }

    toast.success(`Selected client "${clientName}"`);
  }

  const clientAddressOptions = useMemo(() => {
    const rawAddrs =
      clientDetailData?.currentDetail?.addresses ||
      selectedClient?.currentDetail?.addresses ||
      selectedClient?.addresses ||
      [];
    const activeAddrs = rawAddrs.filter((a) => a.isActive !== false);
    const opts = activeAddrs.map((a) => {
      const aid = a.clientAddressId || a.id;
      const display = formatAddressForDisplay(a);
      return {
        value: String(aid),
        label: display,
        rawAddress: display,
        addressObj: a,
      };
    });
    if (formData.clientAddress && !opts.some((o) => o.rawAddress === formData.clientAddress || o.value === String(formData.clientAddressId))) {
      const addrDisplay = formatAddressForDisplay(formData.clientAddress);
      opts.unshift({
        value: formData.clientAddressId ? String(formData.clientAddressId) : 'current',
        label: addrDisplay,
        rawAddress: addrDisplay,
      });
    }
    return opts;
  }, [clientDetailData, selectedClient, formData.clientAddress, formData.clientAddressId]);

  function handleSelectAddress(addrId) {
    const found = clientAddressOptions.find((o) => String(o.value) === String(addrId));
    setFormData((prev) => ({
      ...prev,
      clientAddressId: addrId && addrId !== 'current' ? Number(addrId) : prev.clientAddressId,
      clientAddress: found?.rawAddress || found?.label || prev.clientAddress,
    }));
    setErrors((prev) => ({ ...prev, clientAddressId: undefined }));
  }

  const clientContactOptions = useMemo(() => {
    const rawContacts =
      clientDetailData?.currentDetail?.contacts ||
      selectedClient?.currentDetail?.contacts ||
      selectedClient?.contacts ||
      [];
    const activeContacts = rawContacts.filter((c) => c.isActive !== false);
    const opts = activeContacts.map((c) => {
      const cid = c.clientContactId ?? c.id;
      const phone = c.phoneNo || c.alternatePhoneNo || c.mobile1 || c.phone || c.mobile || '';
      const name = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || c.email || phone;
      return {
        value: cid == null ? '' : String(cid),
        label: `${name}${phone && name !== phone ? ` (${phone})` : ''}`,
        name,
        email: c.email || '',
        phone,
      };
    }).filter((contact) => contact.value && contact.label);
    if (formData.contactPerson && !opts.some((o) => o.name === formData.contactPerson || o.value === String(formData.clientContactId))) {
      opts.unshift({
        value: formData.clientContactId ? String(formData.clientContactId) : 'current',
        label: formData.contactPerson,
        name: formData.contactPerson,
        email: formData.contactEmail,
        phone: formData.contactPhone,
      });
    }
    return opts;
  }, [clientDetailData, selectedClient, formData.contactPerson, formData.contactEmail, formData.contactPhone, formData.clientContactId]);

  function handleSelectContact(contactId) {
    const found = clientContactOptions.find((o) => String(o.value) === String(contactId));
    setFormData((prev) => ({
      ...prev,
      clientContactId: contactId && contactId !== 'current' ? Number(contactId) : prev.clientContactId,
      contactPerson: found?.name || prev.contactPerson,
      contactEmail: found?.email || prev.contactEmail,
      contactPhone: found?.phone || prev.contactPhone,
    }));
  }

  const currencyOptions = useMemo(() => {
    if (Array.isArray(lookups?.currencies) && lookups.currencies.length > 0) {
      return lookups.currencies
        .filter((c) => c.isActive !== false)
        .map((c) => {
          const val = c.id ?? c.currencyId ?? c.value;
          const code = c.currencyCode || c.code || '';
          const name = c.currencyName ? ` — ${c.currencyName}` : '';
          const sym = c.currencySymbol || c.symbol ? ` (${c.currencySymbol || c.symbol})` : '';
          return {
            value: String(val),
            label: `${code}${name}${sym}`,
            code,
          };
        });
    }
    return [];
  }, [lookups?.currencies]);

  // Dynamic tax slabs from lookups.taxes
  const applicableTaxSelectOptions = useMemo(() => {
    if (Array.isArray(lookups?.taxes) && lookups.taxes.length > 0) {
      return lookups.taxes.map((t) => {
        const detailId = t.taxConfigDetailId ?? t.id;
        const rawPercent = t.taxPercent ?? t.taxRate ?? t.percent;
        const pct = Number(rawPercent);
        if (detailId == null || rawPercent == null || rawPercent === '' || !Number.isFinite(pct)) return null;
        const name = t.taxName || '';
        return {
          value: detailId,
          label: `${name} (${pct}%)`,
          chipLabel: `${name} ${pct}%`,
          taxPercent: pct,
          taxName: name,
          taxConfigDetailId: detailId,
        };
      }).filter(Boolean);
    }
    return [];
  }, [lookups?.taxes]);

  const selectedTaxObjects = useMemo(() => {
    const ids = new Set((formData.selectedTaxIds || []).map(Number));
    return applicableTaxSelectOptions.filter((t) => ids.has(Number(t.taxConfigDetailId || t.value)));
  }, [formData.selectedTaxIds, applicableTaxSelectOptions]);

  function handleCurrencyChange(currencyId) {
    const opt = currencyOptions.find((c) => String(c.value) === String(currencyId));
    setFormData((prev) => ({
      ...prev,
      currencyId: Number(currencyId) || (currencyId ? String(currencyId) : null),
      currency: opt?.code || prev.currency,
    }));
  }

  const singleProductTaxOptions = useMemo(() => {
    if (!Array.isArray(lookups?.taxes)) return [];
    return lookups.taxes.map((tax) => {
      const detailId = tax.taxConfigDetailId ?? tax.id;
      const rawPercent = tax.taxPercent ?? tax.taxRate ?? tax.percent;
      const percent = Number(rawPercent);
      const name = tax.taxName || '';
      if (detailId == null || rawPercent == null || rawPercent === '' || !Number.isFinite(percent)) return null;
      return {
        value: String(detailId ?? ''),
        detailId: detailId == null ? null : Number(detailId),
        percent,
        label: `${percent}%${name && !name.includes(`${percent}%`) ? ` — ${name}` : ''}`,
      };
    }).filter((tax) => tax?.value);
  }, [lookups?.taxes]);

  const mergedCatalogProducts = useMemo(() => {
    return Array.isArray(productsList) ? productsList : [];
  }, [productsList]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();

    // 1. Real product categories from Product Categories Context / Master
    if (Array.isArray(productCategories)) {
      productCategories.forEach((c) => {
        const id = String(c.categoryId || c.id || c.value || '');
        const name = c.categoryName || c.name || c.label;
        if (id && name) catMap.set(id, name);
      });
    }

    // 3. Categories from products in productsList or mergedCatalogProducts
    mergedCatalogProducts.forEach((p) => {
      if (p.categoryId && p.categoryName && !catMap.has(String(p.categoryId))) {
        catMap.set(String(p.categoryId), p.categoryName);
      }
    });

    return [
      { value: '', label: 'All Categories' },
      ...Array.from(catMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [productCategories, mergedCatalogProducts]);

  const drawerProductOptions = useMemo(() => {
    let filtered = mergedCatalogProducts;
    if (drawerCategory) {
      const selectedCat = categoryOptions.find((c) => String(c.value) === String(drawerCategory));
      const selectedLabel = (selectedCat ? selectedCat.label : '').toLowerCase();
      const filterVal = String(drawerCategory).toLowerCase();

      filtered = filtered.filter((p) => {
        const pCatId = String(p.categoryId || '').toLowerCase();
        const pCatName = String(p.categoryName || '').toLowerCase();
        return (
          pCatId === filterVal ||
          (selectedLabel && pCatName === selectedLabel) ||
          pCatName === filterVal
        );
      });
    }
    return filtered.map((p) => ({
      value: String(p.id || p.productId),
      label: p.productCode ? `${p.productCode} · ${p.productName || p.name}` : (p.productName || p.name),
      productObj: p,
    }));
  }, [drawerCategory, mergedCatalogProducts, categoryOptions]);

  const activeProductObj = useMemo(() => {
    const base = mergedCatalogProducts.find((p) => String(p.id || p.productId) === String(drawerProduct)) || null;
    const details = productDetailsMap[drawerProduct];
    if (!base && !details) return null;
    return {
      ...(base || {}),
      ...(details || {}),
    };
  }, [drawerProduct, mergedCatalogProducts, productDetailsMap]);

  useEffect(() => {
    if (!drawerProduct) return;
    const prodIdNum = Number(drawerProduct);
    if (isNaN(prodIdNum)) return;

    let isMounted = true;
    async function fetchDynamicDetails() {
      try {
        const [varRes, detailRes, optRes] = await Promise.all([
          productService.listProductVariants(prodIdNum, { pageSize: 100 }).catch(() => null),
          productService.getProductById(prodIdNum).catch(() => null),
          productService.listProductOptions({ productId: prodIdNum, pageSize: 100 }).catch(() => null),
        ]);

        if (isMounted) {
          if (Array.isArray(varRes?.items)) {
            setProductVariantsMap((prev) => ({ ...prev, [drawerProduct]: varRes.items }));
          }
          if (detailRes) {
            setProductDetailsMap((prev) => ({ ...prev, [drawerProduct]: detailRes }));
            if (!isDescriptionEdited && detailRes.description) {
              setDrawerDescription(detailRes.description);
            }
          }
          const optionsList = (Array.isArray(optRes?.items) && optRes.items.length > 0)
            ? optRes.items
            : (Array.isArray(detailRes?.options) && detailRes.options.length > 0)
            ? detailRes.options
            : [];
          if (optionsList.length > 0) {
            setProductOptionsMap((prev) => ({ ...prev, [drawerProduct]: optionsList }));
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic variants/options for product:', drawerProduct, err);
      }
    }

    if (!productVariantsMap[drawerProduct] || !productDetailsMap[drawerProduct]) {
      fetchDynamicDetails();
    }

    return () => { isMounted = false; };
  }, [drawerProduct, productVariantsMap, productDetailsMap, isDescriptionEdited]);

  const variantOptions = useMemo(() => {
    const dynamicVars = productVariantsMap[drawerProduct];
    if (Array.isArray(dynamicVars) && dynamicVars.length > 0) {
      return dynamicVars.map((v) => {
        const name = v.variantName || v.name || '';
        const code = v.variantCode || v.itemCode || '';
        return {
          value: String(v.id ?? v.productVariantId ?? ''),
          label: name && code ? `${name} (${code})` : name || code,
          variantObj: v,
        };
      }).filter((variant) => variant.value && variant.label);
    }
    if (!activeProductObj) return [];
    return (activeProductObj.variants || []).map((v) => ({
      value: String(v.id),
      label: `${v.variantName} (${v.itemCode})`,
      variantObj: v,
    }));
  }, [drawerProduct, productVariantsMap, activeProductObj]);

  const activeVariantObj = useMemo(() => {
    const dynamicVars = productVariantsMap[drawerProduct];
    if (Array.isArray(dynamicVars) && dynamicVars.length > 0) {
      return dynamicVars.find((v) => String(v.id || v.productVariantId) === String(drawerVariant)) || null;
    }
    if (!activeProductObj) return null;
    return (activeProductObj.variants || []).find((v) => String(v.id) === String(drawerVariant)) || null;
  }, [drawerProduct, productVariantsMap, activeProductObj, drawerVariant]);

  const drawerStandardOptions = useMemo(() => {
    if (activeProductObj?.supportedStandards && Array.isArray(activeProductObj.supportedStandards) && activeProductObj.supportedStandards.length > 0) {
      return activeProductObj.supportedStandards.map((s) => ({ value: s, label: s }));
    }
    if (activeProductObj?.standards && Array.isArray(activeProductObj.standards) && activeProductObj.standards.length > 0) {
      return activeProductObj.standards.map((s) => ({
        value: s.standardCode || String(s.standardId || s.id),
        label: s.standardCode || s.name || '',
      }));
    }
    if (Array.isArray(standardsList) && standardsList.length > 0) {
      return standardsList.filter((s) => s.isActive !== false).map((s) => ({
        value: s.standardCode || String(s.id),
        label: s.description ? `${s.standardCode} (${s.description})` : s.standardCode,
      }));
    }
    return [];
  }, [activeProductObj, standardsList]);

  const drawerGradeOptions = useMemo(() => {
    const curStd = String(drawerStandard || '').trim();
    if (!curStd) return [];

    const matchedMapping = (gradeMapping || []).find((m) =>
      String(m.standardCode || '').toLowerCase() === curStd.toLowerCase() ||
      String(m.standardId || '') === curStd
    );
    if (matchedMapping && Array.isArray(matchedMapping.grades) && matchedMapping.grades.length > 0) {
      return matchedMapping.grades
        .filter((g) => g.isGradeActive !== false)
        .map((g) => ({
          value: g.gradeCode,
          label: `${g.gradeCode}${g.description ? ` · ${g.description}` : ''}`,
        }));
    }
    return [];
  }, [drawerStandard, gradeMapping]);

  const parseDimsFromOrderVariant = useCallback((v) => {
    if (!v) return { length: 0, width: 0 };
    if (v.lengthMm) return { length: Number(v.lengthMm), width: Number(v.widthMm || 0) };
    const str = v.size || v.variantName || v.itemCode || v.variantCode || '';
    const m = String(str).match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (m) return { length: Number(m[1]), width: Number(m[2]) };
    const single = String(str).match(/(\d{3,4})/);
    return single ? { length: Number(single[1]), width: 0 } : { length: 0, width: 0 };
  }, []);

  const drawerCalculatedFlatness = useMemo(() => {
    if (!activeVariantObj || !drawerStandard || !drawerGrade) return '—';
    const dims = parseDimsFromOrderVariant(activeVariantObj);
    if (!dims.length) return '—';
    try {
      const res = calculateFlatnessTolerance(dims.length, dims.width, drawerStandard, drawerGrade);
      if (res && res.isSupported && res.valueMicrons !== undefined) {
        return `${res.valueMicrons} µm`;
      }
    } catch {
      // ignore
    }
    return '—';
  }, [activeVariantObj, drawerStandard, drawerGrade, parseDimsFromOrderVariant]);

  const drawerCalculatedItemCode = useMemo(() => {
    if (!activeVariantObj && !activeProductObj) return '';
    const baseCode = activeVariantObj?.variantCode || activeVariantObj?.itemCode || activeProductObj?.productCode || activeProductObj?.itemCodePrefix || '';
    if (drawerGrade) {
      const normGrd = normalizeGradeCode(drawerGrade);
      return normGrd && baseCode ? `${baseCode}-GR${normGrd}` : baseCode;
    }
    return baseCode;
  }, [activeVariantObj, activeProductObj, drawerGrade]);

  const availableDrawerOptions = useMemo(() => {
    const dynamicOpts = productOptionsMap[drawerProduct];
    if (Array.isArray(dynamicOpts) && dynamicOpts.length > 0) {
      return dynamicOpts.map((opt) => ({
        id: opt.id || opt.productOptionId,
        name: opt.optionName || opt.name,
        isStandard: Boolean(opt.isStandard),
        unitPrice: Number(opt.unitPrice || 0),
      }));
    }
    return [];
  }, [drawerProduct, productOptionsMap]);

  const totals = useMemo(
    () =>
      calculateSalesOrderTotals(
        formData.lineItems,
        formData.taxTreatment,
        formData.otherCharges,
        selectedTaxObjects
      ),
    [formData.lineItems, formData.taxTreatment, formData.otherCharges, selectedTaxObjects]
  );

  const MIN_LINE_COL_WIDTHS = useMemo(
    () => ({
      index: 44,
      product: 220,
      quantity: 85,
      rate: 120,
      otherCharges: 120,
      tax: 120,
      amount: 120,
      action: 50,
    }),
    []
  );

  const INITIAL_LINE_COL_WIDTHS = useMemo(
    () => ({
      index: 48,
      product: 300,
      quantity: 95,
      rate: 135,
      otherCharges: 135,
      tax: 145,
      amount: 135,
      action: 60,
    }),
    []
  );

  const { colWidths, resizingCol, handleStartResize } = useColumnResize(
    INITIAL_LINE_COL_WIDTHS,
    MIN_LINE_COL_WIDTHS
  );

  if (isEditMode && isLoadingOrder) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <p className="text-xs text-text-muted">Loading sales order details...</p>
      </div>
    );
  }

  if (isEditMode && !existingOrder) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-heading">
          {orderLoadError ? 'Unable to Load Sales Order' : 'Sales Order Not Found'}
        </h2>
        <p className="text-xs text-text-muted">
          {orderLoadError || `The requested sales order (${id}) does not exist.`}
        </p>
        <Button variant="primary" onClick={() => navigate('/sales-orders')}>
          Back to Sales Orders
        </Button>
      </div>
    );
  }

  if (isEditMode && existingOrder && (existingOrder.isEditable === false || (existingOrder.status && existingOrder.status !== 'Draft'))) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <ErrorBanner
          message={`Sales Order ${existingOrder.orderConfirmationNo} is ${existingOrder.status} and cannot be edited. Only Draft sales orders are editable.`}
        />
        <Button
          variant="primary"
          onClick={() => navigate(`/sales-orders/${existingOrder.id}`)}
        >
          Back to Sales Order View
        </Button>
      </div>
    );
  }

  async function handleSelectQuotation(quotationId) {
    const quote = confirmedQuotations.find(
      (q) => String(q.id) === String(quotationId) ||
             String(q.quotationId) === String(quotationId) ||
             String(q.quotationNo) === String(quotationId)
    );
    if (!quote) return;

    // Resolve a strictly positive integer ID for backend GET /api/quotations/{id}
    let numericId = null;
    const candidates = [quote.id, quote.quotationId, quote.quotationHeaderId, quotationId];
    for (const val of candidates) {
      if (typeof val === 'number' && Number.isInteger(val) && val > 0) {
        numericId = val;
        break;
      }
      if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
        const num = Number(val.trim());
        if (num > 0) {
          numericId = num;
          break;
        }
      }
    }

    let fullQuote = null;

    // 1. If numericId is found, attempt getQuotationById
    if (numericId) {
      try {
        fullQuote = await quotationService.getQuotationById(numericId);
      } catch (err) {
        console.warn(`GET /api/quotations/${numericId} failed:`, err);
      }
    }

    // 2. If no fullQuote yet, attempt looking up by quotation document number
    if (!fullQuote && quote.quotationNo) {
      try {
        const res = await quotationService.listQuotations({ search: quote.quotationNo });
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        const matched = items.find((item) => item.quotationNo === quote.quotationNo || String(item.id) === String(quote.id));
        if (matched?.id && Number.isInteger(Number(matched.id)) && Number(matched.id) > 0) {
          numericId = Number(matched.id);
          fullQuote = await quotationService.getQuotationById(numericId).catch(() => null);
        }
      } catch (err) {
        console.warn('Fallback search by quotationNo failed:', err);
      }
    }

    // 3. Fallback gracefully to the in-memory quote if server detail endpoint returned 404
    const sourceQuote = fullQuote || quote;
    const prefill = buildPrefillFromQuotation(sourceQuote);

    if (prefill) {
      // Ensure the resolved integer quotationId is persisted
      if (numericId && (!prefill.quotationId || typeof prefill.quotationId !== 'number')) {
        prefill.quotationId = numericId;
      }
      setFormData((prev) => ({
        ...prev,
        ...prefill,
      }));
      setErrors((prev) => ({ ...prev, quotationId: undefined, lineItems: undefined }));
      toast.success(`Loaded details from Confirmed Quotation ${quote.quotationNo || quotationId}`);
    } else {
      toast.error('Could not load quotation details. Please try again.');
    }
  }

  // Open Drawer for Add Product Line
  const handleOpenAddDrawer = () => {
    setEditingIndex(null);
    setDrawerCategory('');
    setDrawerProduct('');
    setDrawerStandard('');
    setDrawerGrade('');
    setDrawerVariant('');
    setDrawerQty('1');
    setDrawerRate('');
    setDrawerRateSource('Manual');
    setDrawerTaxConfigDetailId('');
    setDrawerOtherCharges('0');
    setDrawerOptions([]);
    setDrawerDescription('');
    setIsDescriptionEdited(false);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit Product Line
  const handleStartEditItem = (item, index) => {
    setEditingIndex(index);

    // 1. Locate product in merged catalog products
    const prod =
      mergedCatalogProducts.find(
        (p) =>
          String(p.id || p.productId) === String(item.productId || item.ProductId) ||
          (p.productName && item.productName && p.productName.toLowerCase() === item.productName.toLowerCase()) ||
          (p.productCode && item.productCode && p.productCode.toLowerCase() === item.productCode.toLowerCase())
      ) || null;

    const resolvedCategoryId = String(item.categoryId || item.CategoryId || prod?.categoryId || '');
    const resolvedProductId = String(item.productId || item.ProductId || prod?.id || prod?.productId || '');

    // 2. Resolve Standard
    let resolvedStandard = item.standards || item.standardCode || item.StandardCode || '';
    if (!resolvedStandard) {
      const desc = item.description || item.technicalDetails || '';
      const stdMatch = desc.match(/\b(IS-[0-9]+(?:-[0-9]+)?|DIN-[0-9]+|BS-[0-9]+|US-Fed[^\s,)]+)/i);
      if (stdMatch) {
        resolvedStandard = stdMatch[1];
      } else {
        resolvedStandard =
          prod?.primaryStandard ||
          (prod?.standards && prod.standards[0]?.standardCode) ||
          prod?.primaryStandardCode ||
          (prod?.supportedStandards && prod.supportedStandards[0]) ||
          '';
      }
    }

    // 3. Resolve Grade
    let resolvedGrade = item.grade || item.gradeCode || item.GradeCode || '';
    if (!resolvedGrade) {
      const desc = item.description || item.technicalDetails || '';
      const gradeMatch = desc.match(/\b(Grade\s+[0-9A-Za-z]+|Gr-[0-9A-Za-z]+)/i);
      if (gradeMatch) {
        resolvedGrade = gradeMatch[1];
      }
    }

    // 4. Resolve Variant
    let resolvedVariant = String(item.variantId || item.productVariantId || item.VariantId || '');
    if (!resolvedVariant && prod?.variants && prod.variants.length > 0) {
      const matchedVar =
        prod.variants.find(
          (v) =>
            (v.variantName && item.variantName && v.variantName.toLowerCase() === item.variantName.toLowerCase()) ||
            (v.itemCode && item.itemCode && v.itemCode.toLowerCase() === item.itemCode.toLowerCase())
        ) || prod.variants[0];
      if (matchedVar) resolvedVariant = String(matchedVar.id || matchedVar.productVariantId || '');
    }

    // 5. Resolve Tax
    let resolvedTaxDetailId = item.taxConfigDetailId ? String(item.taxConfigDetailId) : '';
    let resolvedTaxPercent = item.taxPercent == null ? null : Number(item.taxPercent);
    if ((!resolvedTaxDetailId || resolvedTaxDetailId === '0') && resolvedTaxPercent > 0 && Array.isArray(singleProductTaxOptions)) {
      const matchedTax = singleProductTaxOptions.find((t) => Number(t.percent) === resolvedTaxPercent || Number(t.taxPercent) === resolvedTaxPercent);
      if (matchedTax) {
        resolvedTaxDetailId = String(matchedTax.detailId || matchedTax.value);
        resolvedTaxPercent = matchedTax.percent || matchedTax.taxPercent;
      }
    }

    setDrawerCategory(resolvedCategoryId);
    setDrawerProduct(resolvedProductId);
    setDrawerStandard(resolvedStandard);
    setDrawerGrade(resolvedGrade);
    setDrawerVariant(resolvedVariant);
    setDrawerQty(item.quantity == null ? '' : String(item.quantity));
    setDrawerRate(item.rate == null ? '' : String(item.rate));
    setDrawerRateSource(item.rateSource || '');
    setDrawerTaxConfigDetailId(resolvedTaxDetailId);
    setDrawerOtherCharges(item.otherCharges == null ? '' : String(item.otherCharges));
    setDrawerOptions(Array.isArray(item.options) ? item.options : []);
    const existingDesc = item.description ?? item.technicalDetails ?? '';
    setDrawerDescription(existingDesc);
    setIsDescriptionEdited(Boolean(item.description));
    setIsDrawerOpen(true);
  };

  const handleDrawerProductChange = (prodId) => {
    setDrawerProduct(prodId);
    setDrawerVariant('');
    const prod =
      mergedCatalogProducts.find((p) => String(p.id || p.productId) === String(prodId)) || null;
    if (prod && !drawerCategory && prod.categoryId) {
      setDrawerCategory(String(prod.categoryId));
    }
    const std = prod?.primaryStandard || (prod?.standards && prod.standards[0]?.standardCode) || prod?.primaryStandardCode || (prod?.supportedStandards && prod.supportedStandards[0]) || '';
    setDrawerStandard(std);
    setDrawerGrade('');
    const details = productDetailsMap[prodId];
    const fullDesc = details?.description || prod?.description || (prod ? buildCatalogProductDescription(prod, null) : '');
    if (!isDescriptionEdited) {
      setDrawerDescription(fullDesc);
    }
  };

  const handleDrawerStandardChange = (std) => {
    setDrawerStandard(std);
    setDrawerGrade('');
    if (!isDescriptionEdited && activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        activeVariantObj?.variantName || activeVariantObj?.size ? `Size: ${activeVariantObj?.variantName || activeVariantObj?.size}` : null,
        std ? `${std}` : null,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
  };

  const handleDrawerGradeChange = (grd) => {
    setDrawerGrade(grd);
    if (!isDescriptionEdited && activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        activeVariantObj?.variantName || activeVariantObj?.size ? `Size: ${activeVariantObj?.variantName || activeVariantObj?.size}` : null,
        drawerStandard ? `${grd} (${drawerStandard})` : grd,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
  };

  const handleDrawerVariantChange = (varId) => {
    setDrawerVariant(varId);
    const variant = variantOptions.find((v) => String(v.value) === String(varId))?.variantObj || null;
    if (!isDescriptionEdited && activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        variant?.variantName || variant?.size ? `Size: ${variant?.variantName || variant?.size}` : null,
        drawerGrade ? (drawerStandard ? `${drawerGrade} (${drawerStandard})` : drawerGrade) : null,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
  };

  const handleResetDrawerDescription = () => {
    if (activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        activeVariantObj?.variantName || activeVariantObj?.size ? `Size: ${activeVariantObj?.variantName || activeVariantObj?.size}` : null,
        drawerGrade ? (drawerStandard ? `${drawerGrade} (${drawerStandard})` : drawerGrade) : null,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
    setIsDescriptionEdited(false);
  };

  const handleToggleOption = (opt) => {
    setDrawerOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleLookupListPrice = async () => {
    if (!drawerProduct) {
      toast.error('Please select a product first.');
      return;
    }

    setIsLoadingPriceLookup(true);
    try {
      if (!formData.currencyId) {
        toast.error('Select a currency from the API-provided options before looking up a price.');
        return;
      }
      const resolvedCurrencyId = formData.currencyId;
      const selectedOptIds = availableDrawerOptions
        .filter((opt) => drawerOptions.includes(opt.name))
        .map((opt) => opt.id)
        .filter(Boolean);

      const res = await productService.lookupProductPrice({
        productId: activeProductObj?.productId || activeProductObj?.id || drawerProduct,
        productVariantId: activeVariantObj?.productVariantId || activeVariantObj?.id || drawerVariant || undefined,
        standardId: activeVariantObj?.standardId || activeProductObj?.primaryStandardId || undefined,
        gradeId: activeVariantObj?.gradeId || undefined,
        currencyId: resolvedCurrencyId,
        productOptionIds: selectedOptIds.length > 0 ? selectedOptIds : undefined,
      });

      if (res?.suggestedRate !== undefined && res.suggestedRate !== null) {
        setDrawerRate(String(res.suggestedRate));
        setDrawerRateSource('ListPrice');
        const extraNote = res.optionExtras ? ` (Includes ${formatCurrency(res.optionExtras, formData.currency)} option extras)` : '';
        toast.success(`List price applied: ${formatCurrency(res.suggestedRate, formData.currency)}${extraNote}`);
      } else if (Array.isArray(res?.candidates) && res.candidates.length > 0) {
        const topCandidate = res.candidates[0];
        const finalRate = (Number(topCandidate.unitPrice) || 0) + (Number(res.optionExtras) || 0);
        setDrawerRate(String(finalRate));
        setDrawerRateSource('ListPrice');
        toast.success(`List price applied: ${formatCurrency(finalRate, formData.currency)}`);
      } else {
        toast.error('No active list price found for this configuration in the selected currency.');
      }
    } catch (err) {
      console.warn('Price lookup failed:', err);
      toast.error(err?.message || 'Price lookup failed.');
    } finally {
      setIsLoadingPriceLookup(false);
    }
  };

  const handleSaveProductFromDrawer = () => {
    if (!drawerProduct) {
      toast.error('Please select a product first.');
      return;
    }

    if (!activeProductObj?.productId && !activeProductObj?.id) {
      toast.error('Please select a valid catalog product.');
      return;
    }
    const activeProductId = Number(activeProductObj.productId || activeProductObj.id);
    if (!Number.isFinite(activeProductId) || activeProductId <= 0) {
      toast.error('Please select a valid catalog product.');
      return;
    }

    const parsedRate = Number(drawerRate);
    if (!drawerRate || !Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error('Unit Rate is compulsory and must be greater than 0.');
      return;
    }
    const parsedQuantity = Number(drawerQty);
    if (!drawerQty || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Quantity is compulsory and must be greater than 0.');
      return;
    }

    const defaultDesc = buildCatalogProductDescription(activeProductObj, activeVariantObj);
    const matchedTaxObj = singleProductTaxOptions.find(
      (o) => String(o.value) === String(drawerTaxConfigDetailId) || (o.detailId && String(o.detailId) === String(drawerTaxConfigDetailId))
    );
    const taxConfigDetailId = matchedTaxObj?.detailId || (drawerTaxConfigDetailId && drawerTaxConfigDetailId !== '0' ? Number(drawerTaxConfigDetailId) : null);
    const taxPercent = matchedTaxObj?.percent ?? null;

    const payload = {
      categoryId: drawerCategory || activeProductObj?.categoryId || null,
      productId: activeProductId,
      productName: activeProductObj?.productName || '',
      variantId: activeVariantObj?.id || activeVariantObj?.productVariantId || '',
      variantName: activeVariantObj?.variantName || activeVariantObj?.name || '',
      standards: drawerStandard,
      standardCode: drawerStandard,
      grade: drawerGrade,
      gradeCode: drawerGrade,
      flatness: drawerCalculatedFlatness,
      itemCode: drawerCalculatedItemCode || activeVariantObj?.variantCode || activeVariantObj?.itemCode || activeProductObj?.productCode || activeProductObj?.itemCodePrefix || '',
      technicalDetails: activeVariantObj?.technicalDetails || activeProductObj?.standardInfo || '',
      description: drawerDescription.trim() || defaultDesc,
      quantity: parsedQuantity,
      rate: parsedRate,
      rateSource: drawerRateSource,
      otherCharges: Number(drawerOtherCharges) || 0,
      taxPercent,
      taxConfigDetailId,
      options: drawerOptions,
    };

    if (editingIndex !== null) {
      setFormData((prev) => {
        const nextItems = [...prev.lineItems];
        nextItems[editingIndex] = {
          ...nextItems[editingIndex],
          ...payload,
        };
        return { ...prev, lineItems: nextItems };
      });
      toast.success('Product line updated');
    } else {
      const newItem = { ...payload };
      setFormData((prev) => ({
        ...prev,
        lineItems: [...prev.lineItems, newItem],
      }));
      toast.success('Product line added to sales order');
    }

    setErrors((prev) => ({ ...prev, lineItems: undefined }));
    setIsDrawerOpen(false);
  };

  function handleRemoveLineItem(idx) {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
    toast.success('Removed line item');
  }

  function handleDownloadDocument(doc) {
    if (doc?.downloadUrl) {
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      if (doc.fileName) link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    if (doc?.file instanceof Blob) {
      const blobUrl = URL.createObjectURL(doc.file);
      const link = document.createElement('a');
      link.href = blobUrl;
      if (doc.fileName) link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }
    toast.error('Document is not available for download from the server.');
  }

  function handleRemoveDocument(docId) {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((d) => d.id !== docId),
    }));
    toast.success('Document removed');
  }

  function validate(targetStatus) {
    const nextErrors = {};
    if (orderMode === 'QUOTATION' && !formData.quotationId) {
      nextErrors.quotationId = 'Please select a Confirmed quotation.';
    }
    if (orderMode === 'DIRECT') {
      if (!formData.clientId) {
        nextErrors.clientId = 'Please select a Client for this direct sales order.';
      }
    }
    if (!formData.clientAddressId) {
      nextErrors.clientAddressId = 'Client address is required.';
    }
    if (!formData.orderConfirmationDate) {
      nextErrors.orderConfirmationDate = 'Order confirmation date is required.';
    }
    if (targetStatus === 'Confirmed' && !String(formData.clientPoNo || '').trim()) {
      nextErrors.clientPoNo = 'Client PO No is required to confirm a sales order.';
    }
    if (formData.lineItems.length === 0) {
      nextErrors.lineItems = 'At least one product line item is required.';
    }
    if (formData.lineItems.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      nextErrors.lineItems = 'All line item quantities must be greater than 0.';
    }
    if (orderMode === 'DIRECT' && formData.lineItems.some((item) => !Number.isFinite(Number(item.rate)) || Number(item.rate) <= 0)) {
      nextErrors.lineItems = 'All direct order line items must have a unit rate greater than 0.';
    }
    if (orderMode === 'DIRECT' && formData.lineItems.some((item) => !item.productId)) {
      nextErrors.lineItems = 'Please select a product for all line items.';
    }
    setErrors(nextErrors);
    const errList = Object.values(nextErrors);
    return {
      isValid: errList.length === 0,
      firstError: errList[0] || null,
    };
  }

  async function handleSave(targetStatus) {
    const { isValid, firstError } = validate(targetStatus);
    if (!isValid) {
      toast.error(firstError || 'Please fix the highlighted validation errors.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const rawQuoteId = formData.quotationId;
    const selectedQuote = confirmedQuotations.find(
      (q) =>
        String(q.id).toLowerCase() === String(rawQuoteId).toLowerCase() ||
        String(q.quotationNo).toLowerCase() === String(rawQuoteId).toLowerCase() ||
        String(q.quotationNo).toLowerCase() === String(formData.quotationNo).toLowerCase()
    );

    const resolvedId = selectedQuote ? selectedQuote.id : rawQuoteId;
    let finalQuotationId = null;
    if (typeof resolvedId === 'number' && Number.isFinite(resolvedId)) {
      finalQuotationId = resolvedId;
    } else if (typeof resolvedId === 'string' && /^\d+$/.test(resolvedId.trim())) {
      finalQuotationId = Number(resolvedId.trim());
    }

    const isDirect = orderMode === 'DIRECT' || (!formData.quotationId && !finalQuotationId);

    const payload = {
      ...formData,
      orderSource: isDirect,
      isDirectOrder: isDirect,
      quotationId: isDirect ? null : finalQuotationId,
      clientId: formData.clientId ? Number(formData.clientId) : null,
      clientAddressId: formData.clientAddressId ? Number(formData.clientAddressId) : null,
      clientContactId: formData.clientContactId ? Number(formData.clientContactId) : null,
      currencyId: formData.currencyId ? Number(formData.currencyId) : null,
      taxes: Array.isArray(formData.selectedTaxIds) && formData.selectedTaxIds.length > 0
        ? formData.selectedTaxIds.map((id) => ({ taxConfigDetailId: Number(id) }))
        : (formData.taxes || []),
      paymentTermId: formData.paymentTermId ? Number(formData.paymentTermId) : null,
      deliveryTermId: formData.deliveryTermId ? Number(formData.deliveryTermId) : null,
      paymentTerms: Array.isArray(formData.paymentTerms)
        ? formData.paymentTerms.join(', ')
        : (formData.paymentTerms || ''),
      deliveryTerms: Array.isArray(formData.deliveryTerms)
        ? formData.deliveryTerms.join(', ')
        : (formData.deliveryTerms || ''),
      status: targetStatus,
      lineItems: isDirect
        ? formData.lineItems.map((item) => ({
            productId: item.productId ? Number(item.productId) : null,
            productName: item.productName,
            productCode: item.productCode || item.itemCode,
            quantity: Number(item.quantity),
            rate: Number(item.rate),
            taxConfigDetailId: item.taxConfigDetailId ? Number(item.taxConfigDetailId) : null,
            otherCharges: item.otherCharges !== undefined && item.otherCharges !== null ? Number(item.otherCharges) : null,
            remarks: item.remarks || null,
          }))
        : formData.lineItems,
    };

    try {
      setIsSubmitting(true);
      if (isEditMode) {
        const updated = await updateSalesOrder(existingOrder.id, payload);
        if (updated?.id || existingOrder?.id) {
          navigate(`/sales-orders/${updated?.id || existingOrder.id}`);
        }
      } else {
        const created = await createSalesOrder(payload);
        if (created?.id) {
          navigate(`/sales-orders/${created.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to save sales order:', err);
      toast.error(err?.message || 'Failed to save sales order. Please check the fields and try again.');
      if (err?.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-6 pb-24">
      <PageHeader
        title={
          isEditMode
            ? `Edit Sales Order · ${existingOrder.orderConfirmationNo}`
            : 'New Sales Order'
        }
        subtitle={
          isEditMode
            ? 'Modify draft order confirmation details, client PO reference, or line items.'
            : 'Create an Order Confirmation from a Confirmed quotation after receiving the client PO.'
        }
        icon={<IconSalesOrder className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() =>
              navigate(isEditMode ? `/sales-orders/${existingOrder.id}` : '/sales-orders')
            }
          >
            Back to {isEditMode ? 'Sales Order' : 'Sales Orders'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <CancelButton
              size="sm"
              disabled={isSubmitting}
              onClick={() =>
                navigate(isEditMode ? `/sales-orders/${existingOrder.id}` : '/sales-orders')
              }
            >
              Cancel
            </CancelButton>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSave('Draft')}
            >
              Save as Draft
            </Button>
            <SaveButton
              type="button"
              size="sm"
              icon={IconCheck}
              loading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => handleSave('Confirmed')}
            >
              Save &amp; Confirm
            </SaveButton>
          </div>
        }
      />

      {Object.values(errors).length > 0 && (
        <ErrorBanner message={Object.values(errors)[0]} />
      )}

      {/* ── SECTION 1: ORDER SOURCE & CLIENT PO DETAILS ── */}
      <CollapsibleCard
        title={
          orderMode === 'DIRECT'
            ? '1. Direct Order & Client PO Details'
            : '1. Confirmed Quotation & Client PO Details'
        }
        subtitle={
          orderMode === 'DIRECT'
            ? 'Create an order directly for a registered client without an existing quotation'
            : 'Link a Confirmed quotation, preview order confirmation number, and record client PO details'
        }
        icon={<IconInfo size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Mode Switcher */}
          {!isEditMode && (
            <div className="flex items-center gap-2 p-1.5 bg-surface/70 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setOrderMode('QUOTATION');
                  setErrors({});
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                  orderMode === 'QUOTATION'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-heading hover:bg-surface'
                }`}
              >
                Against Confirmed Quotation (Standard)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderMode('DIRECT');
                  setErrors({});
                }}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                  orderMode === 'DIRECT'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-heading hover:bg-surface'
                }`}
              >
                Direct Order (Without Quotation)
              </button>
            </div>
          )}

          {/* Linked Customer PO Banner when quotation has PO details */}
          {orderMode === 'QUOTATION' && formData.clientPoNo && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-primary">
              <div className="flex items-center gap-2">
                <IconCheck size={16} className="shrink-0" />
                <span>
                  Linked Customer PO: <strong>{formData.clientPoNo}</strong>
                  {formData.clientPoDate ? ` (${formatDate(formData.clientPoDate)})` : ''}
                </span>
              </div>
              {formData.documents.some((d) => d.documentType === 'Client PO') && (
                <Badge variant="role" size="xs">
                  PO Document Attached
                </Badge>
              )}
            </div>
          )}

          <FormGrid columns={3}>
            {orderMode === 'QUOTATION' ? (
              isEditMode ? (
                <Input
                  label="Confirmed Quotation"
                  disabled
                  value={`${formData.quotationNo || '—'} (Rev ${formData.quotationRevisionNo ?? '—'})`}
                />
              ) : (
                <SearchableSelect
                  label="Confirmed Quotation"
                  required
                  placeholder={isLoadingQuotations ? '-- Loading quotations... --' : '-- Select Confirmed Quotation --'}
                  emptyText={isLoadingQuotations ? 'Loading confirmed quotations...' : 'No confirmed quotations found'}
                  searchPlaceholder="Search confirmed quotations..."
                  options={quotationOptions}
                  value={formData.quotationId}
                  error={errors.quotationId}
                  onChange={(e) => handleSelectQuotation(e.target.value)}
                />
              )
            ) : (
              <SearchableSelect
                label="Direct Client"
                required
                disabled={isEditMode}
                hint={isEditMode ? 'Client cannot be changed after creation' : undefined}
                placeholder={isLoadingClients ? 'Loading active clients...' : '-- Select Client --'}
                searchPlaceholder="Search active clients..."
                options={clientOptions}
                value={String(formData.clientId || '')}
                error={errors.clientId}
                onChange={(e) => handleSelectClient(e.target.value)}
              />
            )}

            <Input
              label="Order Confirmation No"
              disabled
              value={formData.orderConfirmationNo}
              hint="Auto-generated from ORDER_CONFIRMATION series"
            />

            <DatePicker
              label="Order Confirmation Date"
              required
              value={formData.orderConfirmationDate}
              error={errors.orderConfirmationDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  orderConfirmationDate: e.target.value,
                  orderConfirmationNo: isEditMode
                    ? prev.orderConfirmationNo
                    : getNextOrderConfirmationNo(e.target.value),
                }))
              }
            />
          </FormGrid>

          <FormGrid columns={3}>
            <Input
              label="Client PO No"
              placeholder="e.g. PO-BP-4471"
              value={formData.clientPoNo}
              error={errors.clientPoNo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientPoNo: e.target.value }))
              }
            />

            <DatePicker
              label="Client PO Date"
              value={formData.clientPoDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientPoDate: e.target.value }))
              }
            />

            <DatePicker
              label="Expected Delivery Date"
              value={formData.expectedDeliveryDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))
              }
            />
          </FormGrid>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 2: CLIENT & COMMERCIAL TERMS ── */}
      <CollapsibleCard
        title="2. Client & Commercial Terms"
        subtitle="Billing address, contact person, payment terms, delivery terms, and tax treatment"
        icon={<IconInfo size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <FormGrid columns={3}>
            <Input
              label="Client Name"
              disabled
              value={
                formData.clientName ||
                (orderMode === 'DIRECT'
                  ? 'Select direct client above'
                  : 'Select a confirmed quotation first')
              }
            />

            <SearchableSelect
              label="Client Address"
              required
              placeholder="Select address..."
              options={clientAddressOptions}
              value={formData.clientAddressId ? String(formData.clientAddressId) : ''}
              error={errors.clientAddressId}
              onChange={(e) => {
                const val = e?.target ? e.target.value : e;
                handleSelectAddress(val);
              }}
            />

            <SearchableSelect
              label="Contact Person"
              placeholder="Select contact..."
              options={clientContactOptions}
              value={formData.clientContactId ? String(formData.clientContactId) : ''}
              onChange={(e) => handleSelectContact(e.target.value)}
            />
          </FormGrid>

          <FormGrid columns={4}>
            <SearchableSelect
              label="Currency"
              options={currencyOptions}
              value={String(formData.currencyId || '')}
              disabled={orderMode === 'QUOTATION'}
              hint={orderMode === 'QUOTATION' ? 'Locked from quotation' : 'Order billing currency'}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            />

            <PaymentTermsSelect
              value={formData.paymentTerms}
              name="paymentTerms"
              maxDisplayTags={2}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                const matched = masterPaymentTerms.find((t) =>
                  val.some((v) => typeof v === 'string' && (v.includes(t.termCode) || v.includes(t.termName)))
                );
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: val,
                  paymentTermId: matched ? Number(matched.id) : prev.paymentTermId,
                }));
              }}
            />

            <DeliveryTermsSelect
              value={formData.deliveryTerms}
              name="deliveryTerms"
              maxDisplayTags={2}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                const matched = masterDeliveryTerms.find((t) =>
                  val.some((v) => typeof v === 'string' && (v.includes(t.termCode) || v.includes(t.termName)))
                );
                setFormData((prev) => ({
                  ...prev,
                  deliveryTerms: val,
                  deliveryTermId: matched ? Number(matched.id) : prev.deliveryTermId,
                }));
              }}
            />

            <SearchableMultiSelect
              label="Tax"
              options={applicableTaxSelectOptions}
              value={formData.selectedTaxIds || []}
              placeholder="Select applicable taxes (e.g. CGST, SGST)..."
              maxDisplayTags={2}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                const ids = val.map((v) => Number(v?.taxConfigDetailId ?? v?.value ?? v)).filter(Boolean);
                const hasIgst = applicableTaxSelectOptions.some(
                  (opt) => ids.includes(Number(opt.value)) && opt.taxName?.toUpperCase().includes('IGST')
                );
                setFormData((prev) => ({
                  ...prev,
                  selectedTaxIds: ids,
                  taxes: ids.map((id) => ({ taxConfigDetailId: id })),
                  taxTreatment: hasIgst ? 'INTER_STATE' : 'INTRA_STATE',
                }));
              }}
            />
          </FormGrid>

          <FormSection title="Terms & Remarks">
            <FormGrid columns={2}>
              <Textarea
                label="Terms & Conditions"
                rows={3}
                value={formData.termsAndConditions}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))
                }
              />
              <Textarea
                label="Order Remarks / Dispatch Notes"
                placeholder="Internal or customer-facing dispatch notes..."
                rows={3}
                value={formData.remarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                }
              />
            </FormGrid>
          </FormSection>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 3: PRODUCTS & ORDER LINE ITEMS ── */}
      <CollapsibleCard
        title="3. Products & Pricing"
        subtitle={
          orderMode === 'DIRECT'
            ? 'Add and configure product line items, quantities, rates, and tax slabs'
            : 'Copied from the quotation\'s latest revision; quantities, rates, and taxes can be adjusted while Draft'
        }
        icon={<IconPackage size={18} className="text-primary" />}
        defaultOpen={true}
        padding="none"
        bodyClassName="p-0 space-y-0"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={IconAdd}
              onClick={handleOpenAddDrawer}
            >
              Add Product
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <TableContainer>
            <colgroup>
              <col style={{ width: `${colWidths.index}px` }} />
              <col style={{ width: `${colWidths.product}px` }} />
              <col style={{ width: `${colWidths.quantity}px` }} />
              <col style={{ width: `${colWidths.rate}px` }} />
              <col style={{ width: `${colWidths.otherCharges}px` }} />
              <col style={{ width: `${colWidths.tax}px` }} />
              <col style={{ width: `${colWidths.amount}px` }} />
              <col style={{ width: `${colWidths.action}px` }} />
            </colgroup>
            <thead>
              <tr>
                <Th className="text-center">#</Th>
                <Th
                  isResizing={resizingCol === 'product'}
                  resizeHandler={(e) => handleStartResize(e, 'product')}
                >
                  PRODUCT / VARIANT
                </Th>
                <Th
                  isResizing={resizingCol === 'quantity'}
                  resizeHandler={(e) => handleStartResize(e, 'quantity')}
                  className="text-center"
                >
                  QTY
                </Th>
                <Th
                  isResizing={resizingCol === 'rate'}
                  resizeHandler={(e) => handleStartResize(e, 'rate')}
                  className="text-right"
                >
                  RATE ({formData.currency})
                </Th>
                <Th
                  isResizing={resizingCol === 'otherCharges'}
                  resizeHandler={(e) => handleStartResize(e, 'otherCharges')}
                  className="text-right"
                >
                  LINE CHARGES
                </Th>
                <Th
                  isResizing={resizingCol === 'tax'}
                  resizeHandler={(e) => handleStartResize(e, 'tax')}
                  className="text-center"
                >
                  TAX %
                </Th>
                <Th
                  isResizing={resizingCol === 'amount'}
                  resizeHandler={(e) => handleStartResize(e, 'amount')}
                  className="text-right"
                >
                  LINE AMOUNT
                </Th>
                <Th className="text-center">ACT</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {formData.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-text-muted">
                    No products added to this order yet. Click &quot;Add Product&quot; above to select items.
                  </td>
                </tr>
              ) : (
                formData.lineItems.map((item, idx) => {
                  const lineAmount = item.quantity != null && item.rate != null
                    ? Number(item.quantity) * Number(item.rate) + (Number(item.otherCharges) || 0)
                    : item.lineAmount ?? null;
                  const stdGradeText = [
                    item.standardCode || item.standards,
                    item.gradeCode || item.grade,
                    item.flatness,
                  ].filter(Boolean).join(' · ');

                  return (
                    <tr key={item.id || idx} className="hover:bg-surface/40 transition-colors">
                      <Td className="text-center font-mono text-xs text-text-muted">
                        {idx + 1}
                      </Td>
                      <Td className="text-xs">
                        <div className="font-bold text-heading truncate">
                          {item.productName || '—'}
                        </div>
                        <div className="font-mono text-2xs text-primary truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>{item.itemCode || '—'} · {item.variantName || '—'}</span>
                          {stdGradeText && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-surface/80 border border-border/80 text-text-muted">
                              {stdGradeText}
                            </span>
                          )}
                        </div>
                        {(item.description || item.technicalDetails) && (
                          <div className="text-3xs text-text-muted truncate max-w-sm mt-0.5">
                            {item.description || item.technicalDetails}
                          </div>
                        )}
                      </Td>
                      <Td className="text-center font-mono text-xs font-semibold">
                        {item.quantity ?? '—'}
                      </Td>
                      <Td className="text-right font-mono text-xs">
                        {formatCurrency(item.rate, formData.currency)}
                      </Td>
                      <Td className="text-right font-mono text-xs text-text-muted">
                        {Number(item.otherCharges) > 0 ? formatCurrency(Number(item.otherCharges), formData.currency) : '—'}
                      </Td>
                      <Td className="text-center font-mono text-xs">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-surface border border-border">
                          {item.taxPercent == null ? '—' : `${item.taxPercent}%`}
                        </span>
                      </Td>
                      <Td className="text-right font-mono font-semibold text-xs text-heading">
                        {formatCurrency(lineAmount, formData.currency)}
                      </Td>
                      <Td className="text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditItem(item, idx)}
                            className="p-1.5 text-text-muted hover:text-primary rounded hover:bg-surface transition-colors cursor-pointer"
                            title="Edit line item"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1.5 text-text-muted hover:text-red-500 rounded hover:bg-surface transition-colors cursor-pointer"
                            title="Remove line item"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableContainer>
        </div>

        {/* Document-level Other Charges & Totals Footer */}
        <div className="p-4 sm:p-5 bg-surface/40 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <FormGrid columns={2}>
            <Input
              label="Document Other Charges"
              type="number"
              min="0"
              step="any"
              value={formData.otherCharges}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, otherCharges: e.target.value }))
              }
            />
            <Input
              label="Charges Description"
              placeholder="e.g. Freight / Packing"
              value={formData.otherChargesDescription}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  otherChargesDescription: e.target.value,
                }))
              }
            />
          </FormGrid>

          <div className="bg-bg rounded-xl border border-border p-4 space-y-2 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Line Subtotal</span>
              <span className="font-mono font-semibold text-heading">
                {formatCurrency(totals.subtotal, formData.currency)}
              </span>
            </div>
            {totals.headerOtherCharges > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>
                  Other Charges
                  {formData.otherChargesDescription
                    ? ` (${formData.otherChargesDescription})`
                    : ''}
                </span>
                <span className="font-mono font-semibold text-heading">
                  {formatCurrency(totals.headerOtherCharges, formData.currency)}
                </span>
              </div>
            )}
            {totals.taxesBreakdown && totals.taxesBreakdown.length > 0 ? (
              totals.taxesBreakdown.map((tx, idx) => (
                <div key={tx.id || idx} className="flex justify-between text-text-muted">
                  <span>{tx.name} ({tx.percent}%):</span>
                  <span className="font-mono text-heading">
                    {formatCurrency(tx.amount, formData.currency)}
                  </span>
                </div>
              ))
            ) : formData.taxTreatment === 'INTRA_STATE' ? (
              <>
                <div className="flex justify-between text-text-muted">
                  <span>CGST</span>
                  <span className="font-mono">
                    {formatCurrency(totals.cgst, formData.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>SGST</span>
                  <span className="font-mono">
                    {formatCurrency(totals.sgst, formData.currency)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-text-muted">
                <span>
                  {formData.taxTreatment === 'INTER_STATE' ? 'IGST' : 'Tax (0%)'}
                </span>
                <span className="font-mono">
                  {formatCurrency(totals.totalTax, formData.currency)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-heading">
              <span>Grand Total</span>
              <Badge variant="primary" size="md" className="font-mono">
                {formatCurrency(totals.grandTotal, formData.currency)}
              </Badge>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 4: DOCUMENTS & ATTACHMENTS ── */}
      <CollapsibleCard
        title="4. Documents & Attachments"
        subtitle="Attach client Purchase Order PDFs, signed confirmations, or delivery schedules"
        icon={<IconAttachment size={18} className="text-primary" />}
        defaultOpen={true}
        badge={
          (formData.documents?.length || 0) > 0 ? (
            <Badge variant="neutral" size="sm" className="font-mono">
              {formData.documents.length}{' '}
              {formData.documents.length === 1 ? 'File' : 'Files'}
            </Badge>
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-surface/40 border border-border rounded-xl space-y-4">
            <DocumentUploader
              label="Select or Drop Document Files"
              moduleFilter="ORDER_CONFIRMATION"
              showDocTypeSelect={true}
              docTypeLabel="Document Type"
              defaultDocTypeKeyword="Order"
              multiple={true}
              onFilesAdded={(newFiles) => {
                const enriched = newFiles.map((f) => ({
                  ...f,
                  remarks: docRemarks.trim(),
                }));
                setFormData((prev) => ({
                  ...prev,
                  documents: [...enriched, ...(prev.documents || [])],
                }));
                setDocRemarks('');
                toast.success(
                  enriched.length === 1
                    ? `Attached "${enriched[0].fileName}"`
                    : `Attached ${enriched.length} documents`
                );
              }}
            />

            <Input
              label="Remarks / Description for Attached Files (Optional)"
              placeholder="e.g. Client signed PO PDF or delivery schedule notes"
              value={docRemarks}
              onChange={(e) => setDocRemarks(e.target.value)}
            />
          </div>

          {(formData.documents || []).length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <TableContainer>
                <thead>
                  <tr>
                    <Th>FILE NAME</Th>
                    <Th>DOCUMENT TYPE</Th>
                    <Th>UPLOADED ON</Th>
                    <Th>SIZE</Th>
                    <Th>REMARKS</Th>
                    <Th className="text-right">ACTIONS</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {formData.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface/40 transition-colors text-xs">
                      <Td className="font-semibold text-heading">
                        <div className="flex items-center gap-2">
                          <IconFileText size={14} className="text-primary shrink-0" />
                          <span className="truncate">{doc.fileName}</span>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="info" size="sm">
                          {doc.documentType}
                        </Badge>
                      </Td>
                      <Td className="font-mono text-text-muted">
                        {doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}
                      </Td>
                      <Td className="font-mono text-text-muted">{doc.fileSize || '—'}</Td>
                      <Td className="text-text-muted">{doc.remarks || '—'}</Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                            title="Download document"
                          >
                            <IconDownload size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                            title="Remove document"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableContainer>
            </div>
          )}
        </div>
      </CollapsibleCard>

      <FormActionsBar>
        <CancelButton
          disabled={isSubmitting}
          onClick={() =>
            navigate(isEditMode ? `/sales-orders/${existingOrder.id}` : '/sales-orders')
          }
        >
          Cancel
        </CancelButton>
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => handleSave('Draft')}
        >
          Save as Draft
        </Button>
        <SaveButton
          type="button"
          icon={IconCheck}
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={() => handleSave('Confirmed')}
        >
          Save &amp; Confirm
        </SaveButton>
      </FormActionsBar>

      {/* ── DRAWER: ADD / EDIT PRODUCT LINE ITEM ── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingIndex !== null ? 'Edit Product Line' : 'Add Product to Sales Order'}
        subtitle="Configure product, standard, grade, variant dimensions, and pricing."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={IconCheck}
              onClick={handleSaveProductFromDrawer}
            >
              {editingIndex !== null ? 'Update Product Line' : 'Add Product Line'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Row 1: Category & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableSelect
              label="Category"
              placeholder="Select category..."
              searchPlaceholder="Search categories..."
              options={categoryOptions}
              value={drawerCategory}
              onChange={(e) => {
                setDrawerCategory(e.target.value);
                setDrawerProduct('');
                setDrawerVariant('');
                setDrawerDescription('');
              }}
            />
            <SearchableSelect
              label="Product Name"
              required
              placeholder={isLoadingProducts ? 'Loading products...' : 'Select product...'}
              options={drawerProductOptions}
              value={drawerProduct}
              onChange={(e) => handleDrawerProductChange(e.target.value)}
            />
          </div>

          {/* Row 2: Standard & Grade / Accuracy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableSelect
              label="Manufacturing Standard"
              required
              placeholder={drawerProduct ? 'Select standard...' : 'Select product first'}
              disabled={!drawerProduct}
              options={drawerStandardOptions}
              value={drawerStandard}
              onChange={(e) => handleDrawerStandardChange(e.target.value)}
            />
            <SearchableSelect
              label="Grade / Accuracy"
              required
              placeholder={drawerStandard ? 'Select grade...' : 'Select standard first'}
              disabled={!drawerStandard}
              options={drawerGradeOptions}
              value={drawerGrade}
              onChange={(e) => handleDrawerGradeChange(e.target.value)}
            />
          </div>

          {/* Row 3: Size / Variant & Item Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableSelect
              label="Size / Variant"
              required
              placeholder={drawerProduct ? 'Select variant...' : 'Select product first'}
              disabled={!drawerProduct}
              options={variantOptions}
              value={drawerVariant}
              onChange={(e) => handleDrawerVariantChange(e.target.value)}
            />
            <div>
              <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                Item Code
              </label>
              <div className="h-9 px-3 rounded-lg border border-border bg-surface/50 flex items-center font-mono text-xs text-text-muted">
                {drawerCalculatedItemCode}
              </div>
              <span className="text-3xs text-text-muted mt-0.5 block">
                Auto-assigned from standard, grade &amp; variant
              </span>
            </div>
          </div>

          {/* Row 4: Quantity, Rate, Line Charges, Tax */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Quantity"
              type="number"
              min="1"
              required
              value={drawerQty}
              onChange={(e) => setDrawerQty(e.target.value)}
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Unit Rate ({formData.currency}) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleLookupListPrice}
                  disabled={!drawerProduct || isLoadingPriceLookup}
                  className="text-3xs font-medium text-primary hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingPriceLookup ? 'Looking up...' : 'Use list price'}
                </button>
              </div>
              <Input
                type="number"
                min="0"
                step="any"
                required
                value={drawerRate}
                onChange={(e) => {
                  setDrawerRate(e.target.value);
                  setDrawerRateSource('Manual');
                }}
              />
            </div>
            <Input
              label="Line Charges"
              type="number"
              min="0"
              step="any"
              value={drawerOtherCharges}
              onChange={(e) => setDrawerOtherCharges(e.target.value)}
            />
            <SearchableSelect
              label="Product Tax"
              options={singleProductTaxOptions}
              value={String(drawerTaxConfigDetailId || '')}
              onChange={(e) => {
                const val = e.target.value;
                const matched = singleProductTaxOptions.find(
                  (o) => String(o.value) === String(val) || String(o.detailId) === String(val)
                );
                setDrawerTaxConfigDetailId(matched?.detailId == null ? '' : String(matched.detailId));
              }}
            />
          </div>

          {/* Read-Only Technical Details Card */}
          {activeVariantObj && (
            <div className="rounded-xl border border-border bg-surface/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/70 pb-1.5">
                <span className="text-2xs font-bold text-heading uppercase tracking-wider">
                  Technical Details
                </span>
                <span className="text-3xs text-text-muted italic">(Auto-populated)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <div className="text-3xs text-text-muted">Material</div>
                  <div className="font-semibold text-heading truncate">{activeProductObj?.materialName || activeProductObj?.material || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Finish</div>
                  <div className="font-semibold text-heading truncate">{activeProductObj?.finishType || activeProductObj?.finish || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Standard</div>
                  <div className="font-semibold text-heading truncate">{drawerStandard || activeProductObj?.primaryStandardCode || (activeProductObj?.standards?.[0]?.standardCode || activeProductObj?.standards?.[0]?.name) || activeVariantObj?.standardCode || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Grade</div>
                  <div className="font-semibold text-heading truncate">{drawerGrade || activeVariantObj?.gradeCode || activeVariantObj?.grade || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Flatness</div>
                  <div className="font-semibold text-heading truncate">{drawerCalculatedFlatness !== '—' ? drawerCalculatedFlatness : (activeVariantObj?.flatness || '—')}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Dimensions</div>
                  <div className="font-semibold text-heading truncate">{activeVariantObj?.variantName || activeVariantObj?.size || activeVariantObj?.variantCode || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Product Description Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-heading uppercase tracking-wider">
                Product Description
              </label>
              {isDescriptionEdited && activeProductObj && (
                <button
                  type="button"
                  onClick={handleResetDrawerDescription}
                  className="inline-flex items-center gap-1 text-3xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  <IconRotateCcw size={11} />
                  Reset to Default
                </button>
              )}
            </div>
            <Textarea
              rows={3}
              placeholder="Select a product to auto-fetch its description, or enter a custom order description..."
              value={drawerDescription}
              onChange={(e) => {
                setDrawerDescription(e.target.value);
                setIsDescriptionEdited(true);
              }}
              hint="Auto-populated from the selected product & variant; you can customize it for this sales order."
            />
          </div>

          {/* Catalog Options Checkboxes */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-heading uppercase tracking-wider">
                Catalog Options
              </label>
              <span className="text-3xs text-text-muted">Select all applicable accessories / machining</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-border bg-surface/30">
              {availableDrawerOptions.map((opt) => {
                const optName = opt.name || opt;
                const isChecked = drawerOptions.includes(optName);
                const hasPrice = Number(opt.unitPrice) > 0;
                return (
                  <label
                    key={optName}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all cursor-pointer text-xs select-none ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5 text-heading font-medium'
                        : 'border-border/60 hover:bg-surface/80 text-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => handleToggleOption(optName)}
                        aria-label={optName}
                      />
                      <span className="truncate">{optName}</span>
                    </div>
                    {hasPrice && (
                      <span className="text-3xs font-mono font-semibold text-primary shrink-0">
                        +{formatCurrency(opt.unitPrice, formData.currency)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

