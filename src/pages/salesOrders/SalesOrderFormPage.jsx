/**
 * SalesOrderFormPage.jsx — Create or Edit (Draft only) Order Confirmation (Sales Order).
 *
 * Routes:
 *   - /sales-orders/new (?quotationId=...)
 *   - /sales-orders/:id/edit
 *
 * Aligned with Frontend-API-Guide.md §5.4g.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconAttachment,
  IconBack,
  IconCheck,
  IconDownload,
  IconFileText,
  IconInfo,
  IconPackage,
  IconSalesOrder,
  IconTrash,
  IconUploadCloud,
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
} from '../../components/ui';
import { useSalesOrdersContext } from '../../context/SalesOrdersContext';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useClientsContext } from '../../context/ClientsContext';
import { clientService, productService, quotationService } from '../../services';
import {
  calculateSalesOrderTotals,
  formatCurrency,
  ORDER_DOCUMENT_TYPES,
  TAX_SLABS,
  TAX_TREATMENTS,
} from '../../mocks/salesOrders';
import { formatDate } from '../../utils/dateUtils';
import { triggerPdfDownload } from '../../utils/fileHelpers';
import useColumnResize from '../../hooks/useColumnResize';
import { isHtmlMarkup } from '../../utils/htmlUtils';

function formatReadableFileSize(bytes = 0) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
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
    quotation.revisions?.[revIdx] || quotation.revisions?.[quotation.revisions.length - 1];

  const inheritedDoc = quotation.poDetails?.fileName
    ? [
        {
          id: `oc-doc-inherited-${Date.now()}`,
          documentTypeId: quotation.poDetails.documentTypeId || null,
          fileName: quotation.poDetails.fileName,
          documentType: quotation.poDetails.documentTypeName || 'Client PO',
          uploadedAt:
            quotation.poDetails.receivedOn ||
            new Date().toISOString().split('T')[0],
          fileSize: quotation.poDetails.fileSize || '350 KB',
          file: quotation.poDetails.file || null,
          remarks: 'Inherited from Customer PO recording on Quotation',
        },
      ]
    : [];

  const availableItems =
    latestRev?.items && latestRev.items.length > 0
      ? latestRev.items
      : Array.isArray(quotation.items)
      ? quotation.items
      : [];

  const resolvedAddressId =
    quotation.clientAddressId ||
    latestRev?.clientAddressId ||
    quotation.addressId ||
    null;
  const resolvedContactId =
    quotation.clientContactId ||
    latestRev?.clientContactId ||
    quotation.contactId ||
    null;

  return {
    quotationId: quotation.id,
    quotationNo: quotation.quotationNo,
    quotationRevisionNo: latestRev?.revisionNo ?? 0,
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
    clientPoNo: quotation.poDetails?.poNumber || '',
    clientPoDate: quotation.poDetails?.receivedOn || '',
    expectedDeliveryDate: quotation.poDetails?.expectedDeliveryDate || '',
    paymentTerms: toTermsArray(quotation.paymentTerms, []),
    deliveryTerms: toTermsArray(quotation.deliveryTerms, []),
    currency: latestRev?.currency || quotation.currency || 'INR',
    taxTreatment: latestRev?.taxTreatment || quotation.taxTreatment || 'INTRA_STATE',
    selectedTaxIds: Array.isArray(latestRev?.taxes || quotation.taxes)
      ? (latestRev?.taxes || quotation.taxes).map((t) => Number(t.taxConfigDetailId || t.id)).filter(Boolean)
      : Array.isArray(quotation.selectedTaxIds)
      ? quotation.selectedTaxIds
      : [],
    taxes: latestRev?.taxes || quotation.taxes || [],
    termsAndConditions: quotation.termsAndConditions || '',
    lineItems: availableItems.map((item, idx) => ({
      ...item,
      id: `oc-it-${Date.now()}-${idx}`,
      quotationLineItemId: item.id,
      otherCharges: Number(item.otherCharges) || 0,
      taxPercent: item.taxPercent !== undefined ? item.taxPercent : 18,
    })),
    documents: inheritedDoc,
  };
}

export default function SalesOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialQuotationId = searchParams.get('quotationId') || '';

  const isEditMode = Boolean(id);
  const {
    lookups,
    getSalesOrderById,
    getNextOrderConfirmationNo,
    fetchNextOrderConfirmationNo,
    createSalesOrder,
    updateSalesOrder,
  } = useSalesOrdersContext();
  const { quotations = [] } = useQuotationsContext();
  const { clients = [], ensureLoaded: ensureClientsLoaded } = useClientsContext();

  const [activeClients, setActiveClients] = useState([]);
  const [clientDetailData, setClientDetailData] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

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

  const existingOrder = useMemo(
    () => (isEditMode ? getSalesOrderById(id) : null),
    [isEditMode, id, getSalesOrderById]
  );

  // §5.4g: Order confirmations are created from Confirmed quotations
  const confirmedQuotations = useMemo(
    () => quotations.filter((q) => q.status === 'Confirmed'),
    [quotations]
  );

  const quotationOptions = useMemo(
    () =>
      confirmedQuotations.map((q) => ({
        value: q.id,
        label: `${q.quotationNo} — ${q.clientName}${
          q.poDetails?.poNumber ? ` (PO: ${q.poDetails.poNumber})` : ''
        }`,
      })),
    [confirmedQuotations]
  );

  const [orderMode, setOrderMode] = useState(() => {
    if (isEditMode && existingOrder) {
      return existingOrder.orderSource === true || existingOrder.isDirectOrder || !existingOrder.quotationId
        ? 'DIRECT'
        : 'QUOTATION';
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
        quotationRevisionNo: existingOrder.quotationRevisionNo ?? 0,
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
        paymentTerms: toTermsArray(existingOrder.paymentTerms, []),
        deliveryTerms: toTermsArray(existingOrder.deliveryTerms, []),
        currencyId: existingOrder.currencyId || null,
        currency: existingOrder.currencyCode || existingOrder.currency || 'INR',
        taxTreatment: existingOrder.taxTreatment || 'INTRA_STATE',
        selectedTaxIds: Array.isArray(existingOrder.taxes)
          ? existingOrder.taxes.map((t) => Number(t.taxConfigDetailId || t.id)).filter(Boolean)
          : [],
        taxes: existingOrder.taxes || [],
        otherCharges: existingOrder.otherCharges || 0,
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
      quotationRevisionNo: prefill?.quotationRevisionNo ?? 0,
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
      paymentTerms: prefill?.paymentTerms ? toTermsArray(prefill.paymentTerms) : [],
      deliveryTerms: prefill?.deliveryTerms ? toTermsArray(prefill.deliveryTerms) : [],
      currencyId: lookups?.defaultCurrencyId || 1,
      currency: prefill?.currency || 'INR',
      taxTreatment: prefill?.taxTreatment || 'INTRA_STATE',
      selectedTaxIds: prefill?.selectedTaxIds || [38, 37],
      taxes: prefill?.taxes || [{ taxConfigDetailId: 38 }, { taxConfigDetailId: 37 }],
      otherCharges: 0,
      otherChargesDescription: '',
      termsAndConditions: prefill?.termsAndConditions || '',
      remarks: '',
      lineItems: prefill?.lineItems || [],
      documents: prefill?.documents || [],
    };
  });

  // Preselect default currency from lookups if creating a direct order
  useEffect(() => {
    if (orderMode === 'DIRECT') {
      const currenciesList = Array.isArray(lookups?.currencies) && lookups.currencies.length > 0 ? lookups.currencies : null;
      const defId = lookups?.defaultCurrencyId || 1;
      const found = currenciesList?.find((c) => (c.currencyId ?? c.id) === defId) || currenciesList?.[0];
      const resolvedId = found ? (found.currencyId ?? found.id) : 1;
      const resolvedCode = found ? (found.currencyCode ?? found.code) : 'INR';

      if (!formData.currencyId) {
        setFormData((prev) => ({
          ...prev,
          currencyId: resolvedId,
          currency: resolvedCode,
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
          const contacts = (detail.currentDetail?.contacts || []).filter((c) => c.isActive !== false);
          setFormData((prev) => {
            const hasValidAddr = prev.clientAddressId && addrs.some((a) => String(a.clientAddressId || a.id) === String(prev.clientAddressId));
            const hasValidContact = prev.clientContactId && contacts.some((c) => String(c.clientContactId || c.id) === String(prev.clientContactId));
            const firstAddr = addrs[0];
            const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
            return {
              ...prev,
              clientAddressId: hasValidAddr ? prev.clientAddressId : (firstAddr?.clientAddressId || firstAddr?.id || prev.clientAddressId || null),
              clientAddress: hasValidAddr ? prev.clientAddress : (firstAddr ? [firstAddr.addressLabel, firstAddr.address1, firstAddr.city].filter(Boolean).join(', ') : prev.clientAddress),
              clientContactId: hasValidContact ? prev.clientContactId : (primaryContact?.clientContactId || primaryContact?.id || prev.clientContactId || null),
              contactPerson: hasValidContact ? prev.contactPerson : (primaryContact ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim() : prev.contactPerson),
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
    if (!isEditMode && initialQuotationId && (!formData.quotationId || formData.lineItems.length === 0)) {
      let isMounted = true;
      async function loadInitialQuote() {
        try {
          const fullQuote = await quotationService.getQuotationById(initialQuotationId);
          if (isMounted && fullQuote) {
            const prefill = buildPrefillFromQuotation(fullQuote);
            if (prefill) {
              setFormData((prev) => ({
                ...prev,
                ...prefill,
                documents: prefill.documents?.length ? prefill.documents : prev.documents,
              }));
            }
            return;
          }
        } catch (e) {
          console.warn('Could not fetch full initial quotation, falling back to list:', e);
        }

        if (confirmedQuotations.length > 0) {
          const quote = confirmedQuotations.find(
            (q) =>
              String(q.id).toLowerCase() === initialQuotationId.toLowerCase() ||
              String(q.quotationNo).toLowerCase() === initialQuotationId.toLowerCase()
          );
          if (isMounted && quote) {
            const prefill = buildPrefillFromQuotation(quote);
            if (prefill) {
              setFormData((prev) => ({
                ...prev,
                ...prefill,
                documents: prefill.documents?.length ? prefill.documents : prev.documents,
              }));
            }
          }
        }
      }
      loadInitialQuote();
      return () => {
        isMounted = false;
      };
    }
  }, [isEditMode, initialQuotationId, formData.quotationId, formData.lineItems.length, confirmedQuotations]);

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
    const sourceList = activeClients.length > 0 ? activeClients : clients;
    return sourceList.map((c) => {
      const cid = c.id || c.clientId;
      const name = c.companyName || c.clientName || c.name || 'Unknown Client';
      const code = c.clientCode || '';
      return {
        value: String(cid),
        label: `${name}${code ? ` (${code})` : ''}`,
      };
    });
  }, [activeClients, clients]);

  const selectedClient = useMemo(
    () =>
      clients.find(
        (c) =>
          String(c.id || c.clientId) === String(formData.clientId) ||
          String(c.companyName || c.name || '').toLowerCase() === String(formData.clientName || '').toLowerCase()
      ) || null,
    [clients, formData.clientId, formData.clientName]
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
        const firstAddr = addrs[0];
        const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

        const defaultAddressStr = firstAddr
          ? [firstAddr.addressLabel, firstAddr.address1, firstAddr.address2, firstAddr.city, firstAddr.stateName, firstAddr.zipCode]
              .filter(Boolean)
              .join(', ')
          : '';

        setFormData((prev) => ({
          ...prev,
          clientAddressId: firstAddr?.clientAddressId || firstAddr?.id || null,
          clientAddress: defaultAddressStr,
          clientContactId: primaryContact?.clientContactId || primaryContact?.id || null,
          contactPerson: primaryContact?.fullName || `${primaryContact?.firstName || ''} ${primaryContact?.lastName || ''}`.trim() || '',
          contactEmail: primaryContact?.email || '',
          contactPhone: primaryContact?.phoneNo || '',
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
      const labelParts = [a.addressLabel, a.address1, a.address2, a.city, a.stateName || a.state, a.zipCode].filter(Boolean);
      const display = labelParts.join(', ') || `Address #${aid}`;
      return {
        value: String(aid),
        label: display,
        rawAddress: display,
      };
    });
    if (formData.clientAddress && !opts.some((o) => o.rawAddress === formData.clientAddress || o.value === String(formData.clientAddressId))) {
      opts.unshift({
        value: formData.clientAddressId ? String(formData.clientAddressId) : 'current',
        label: formData.clientAddress,
        rawAddress: formData.clientAddress,
      });
    }
    return opts;
  }, [clientDetailData, selectedClient, formData.clientAddress, formData.clientAddressId]);

  function handleSelectAddress(addrId) {
    const found = clientAddressOptions.find((o) => String(o.value) === String(addrId));
    setFormData((prev) => ({
      ...prev,
      clientAddressId: addrId && addrId !== 'current' ? Number(addrId) : prev.clientAddressId,
      clientAddress: found?.rawAddress || prev.clientAddress,
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
      const cid = c.clientContactId || c.id;
      const name = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || `Contact #${cid}`;
      return {
        value: String(cid),
        label: `${name}${c.phoneNo ? ` (${c.phoneNo})` : c.phone ? ` (${c.phone})` : ''}`,
        name,
        email: c.email || '',
        phone: c.phoneNo || c.phone || '',
      };
    });
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
          const code = c.currencyCode || c.code || 'INR';
          const name = c.currencyName ? ` — ${c.currencyName}` : '';
          const sym = c.currencySymbol || c.symbol ? ` (${c.currencySymbol || c.symbol})` : '';
          return {
            value: String(val),
            label: `${code}${name}${sym}`,
            code,
          };
        });
    }
    return [
      { value: '1', label: 'INR (₹)', code: 'INR' },
      { value: '2', label: 'USD ($)', code: 'USD' },
      { value: '3', label: 'EUR (€)', code: 'EUR' },
    ];
  }, [lookups?.currencies]);

  // Dynamic tax slabs from lookups.taxes (with fallback to TAX_SLABS)
  const taxOptions = useMemo(() => {
    if (Array.isArray(lookups?.taxes) && lookups.taxes.length > 0) {
      return lookups.taxes.map((t) => {
        const detailId = t.taxConfigDetailId ?? t.id;
        const pct = Number(t.taxPercent ?? t.taxRate ?? t.percent ?? 0);
        const name = t.taxName || '';
        return {
          value: String(detailId ?? pct),
          detailId: detailId ? Number(detailId) : null,
          percent: pct,
          label: `${pct}%${name && !name.includes(`${pct}%`) ? ` — ${name}` : ''}`,
        };
      });
    }
    return TAX_SLABS.map((t) => ({
      value: String(t.value),
      detailId: null,
      percent: t.value,
      label: `${t.value}%`,
    }));
  }, [lookups?.taxes]);

  // Multi-Select options for Taxes in Section 2 (Commercial Terms) matching Quotation
  const applicableTaxSelectOptions = useMemo(() => {
    if (Array.isArray(lookups?.taxes) && lookups.taxes.length > 0) {
      return lookups.taxes.map((t) => {
        const detailId = t.taxConfigDetailId ?? t.id;
        const pct = Number(t.taxPercent ?? t.taxRate ?? t.percent ?? 0);
        const name = t.taxName || 'GST';
        return {
          value: detailId,
          label: `${name} (${pct}%)`,
          chipLabel: `${name} ${pct}%`,
          taxPercent: pct,
          taxName: name,
          taxConfigDetailId: detailId,
        };
      });
    }
    return [
      { value: 38, label: 'CGST (9%)', chipLabel: 'CGST 9%', taxPercent: 9, taxName: 'CGST', taxConfigDetailId: 38 },
      { value: 37, label: 'SGST (9%)', chipLabel: 'SGST 9%', taxPercent: 9, taxName: 'SGST', taxConfigDetailId: 37 },
      { value: 39, label: 'IGST (18%)', chipLabel: 'IGST 18%', taxPercent: 18, taxName: 'IGST', taxConfigDetailId: 39 },
    ];
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

  function handleLineItemTaxChange(idx, rawValue) {
    const valStr = typeof rawValue === 'object' && rawValue !== null ? rawValue.target?.value : rawValue;
    const found = taxOptions.find(
      (o) =>
        String(o.value) === String(valStr) ||
        (o.detailId !== null && String(o.detailId) === String(valStr)) ||
        String(o.percent) === String(valStr)
    );
    const percent = found ? found.percent : Number(valStr) || 18;
    const detailId = found?.detailId || null;

    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === idx
          ? {
              ...item,
              taxPercent: percent,
              taxConfigDetailId: detailId,
            }
          : item
      ),
    }));
  }

  const productOptions = useMemo(() => {
    return productsList.map((p) => ({
      value: String(p.id),
      label: `${p.productCode ? `[${p.productCode}] ` : ''}${p.productName}`,
      product: p,
    }));
  }, [productsList]);

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

  if (isEditMode && !existingOrder) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-heading">Sales Order Not Found</h2>
        <p className="text-xs text-text-muted">
          The requested sales order ({id}) does not exist.
        </p>
        <Button variant="primary" onClick={() => navigate('/sales-orders')}>
          Back to Sales Orders
        </Button>
      </div>
    );
  }

  if (isEditMode && existingOrder && !existingOrder.isEditable) {
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
      (q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId)
    );
    if (!quote) return;

    let fullQuote = quote;
    try {
      const fetched = await quotationService.getQuotationById(quote.id || quotationId);
      if (fetched) {
        fullQuote = fetched;
      }
    } catch (e) {
      console.warn('Could not fetch full quotation details, using list summary:', e);
    }

    const prefill = buildPrefillFromQuotation(fullQuote);
    setFormData((prev) => ({
      ...prev,
      ...prefill,
      documents: prefill.documents?.length
        ? [
            ...prefill.documents,
            ...(prev.documents || []).filter(
              (d) => !d.id.startsWith('oc-doc-inherited-')
            ),
          ]
        : prev.documents,
    }));
    setErrors((prev) => ({ ...prev, quotationId: undefined, lineItems: undefined }));
    toast.success(`Loaded details from Confirmed Quotation ${quote.quotationNo}`);
  }

  function handleAddLineItem() {
    const defTax = taxOptions.find((t) => t.percent === 18) || taxOptions[0];
    const newItem = {
      id: `oc-it-${Date.now()}-${formData.lineItems.length}`,
      productId: null,
      productName: '',
      itemCode: '',
      variantName: '',
      technicalDetails: '',
      quantity: 1,
      rate: 0,
      otherCharges: 0,
      taxPercent: defTax ? defTax.percent : 18,
      taxConfigDetailId: defTax?.detailId || null,
    };
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
    setErrors((prev) => ({ ...prev, lineItems: undefined }));
    toast.success('Added product line item');
  }

  function handleRemoveLineItem(idx) {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
    toast.success('Removed line item');
  }

  function handleLineItemChange(idx, field, value) {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  }

  async function handleProductPickerChange(idx, rawValue) {
    const selectedProductId =
      typeof rawValue === 'object' && rawValue !== null ? rawValue.target?.value : rawValue;
    if (!selectedProductId) return;

    const matched = productsList.find((p) => String(p.id) === String(selectedProductId));
    const prodIdNum = Number(selectedProductId);

    // Initial immediate update from summary list to keep UI responsive
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          productId: prodIdNum || selectedProductId,
          productName: matched?.productName || item.productName,
          itemCode: matched?.productCode || matched?.code || item.itemCode,
          variantName: matched?.categoryName || item.variantName || '',
        };
      }),
    }));
    setErrors((prev) => ({ ...prev, lineItems: undefined }));

    // Async deep fetch for full specifications and list price lookup
    try {
      const [fullProd, priceRes] = await Promise.all([
        productService.getProductById(prodIdNum || selectedProductId).catch(() => null),
        productService
          .lookupProductPrice({
            productId: prodIdNum || selectedProductId,
            currencyId: formData.currencyId || 1,
          })
          .catch(() => null),
      ]);

      const resolvedRate =
        priceRes?.suggestedRate !== undefined && priceRes?.suggestedRate !== null
          ? Number(priceRes.suggestedRate)
          : Number(fullProd?.basePrice ?? fullProd?.standardRate ?? fullProd?.rate) || 0;

      const resolvedSpecs =
        fullProd?.description ||
        fullProd?.variants?.[0]?.variantName ||
        matched?.categoryName ||
        '';

      const resolvedCode =
        fullProd?.productCode ||
        fullProd?.variants?.[0]?.variantCode ||
        matched?.productCode ||
        '';

      setFormData((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i !== idx) return item;
          return {
            ...item,
            productId: prodIdNum || selectedProductId,
            productName: fullProd?.productName || matched?.productName || item.productName,
            itemCode: resolvedCode || item.itemCode,
            variantName: resolvedSpecs || item.variantName,
            rate: resolvedRate > 0 ? resolvedRate : item.rate,
          };
        }),
      }));

      if (resolvedRate > 0) {
        toast.success(
          `Loaded ${fullProd?.productName || matched?.productName || 'product'} with list price: ${formatCurrency(resolvedRate, formData.currency)}`
        );
      } else {
        toast.success(`Loaded details for ${fullProd?.productName || matched?.productName || 'product'}`);
      }
    } catch (err) {
      console.warn('Could not fetch product detail or price lookup:', err);
    }
  }

  function handleDownloadDocument(doc) {
    if (doc?.downloadUrl) {
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('download', doc.fileName || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    if (doc?.file instanceof Blob) {
      const blobUrl = URL.createObjectURL(doc.file);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }
    toast(`Downloading document "${doc?.fileName || 'Customer PO'}"`, { icon: '📄' });
    triggerPdfDownload(doc?.fileName || 'Customer_PO.pdf', {
      title: 'Customer Purchase Order',
      documentType: doc?.documentType || 'Client PO',
      fileName: doc?.fileName || 'Customer_PO.pdf',
      uploadedAt: doc?.uploadedAt || new Date().toISOString().split('T')[0],
      remarks: doc?.remarks || '',
    });
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
    if (targetStatus === 'Confirmed' && !formData.clientPoNo.trim()) {
      nextErrors.clientPoNo = 'Client PO No is required to confirm a sales order.';
    }
    if (formData.lineItems.length === 0) {
      nextErrors.lineItems = 'At least one product line item is required.';
    }
    if (formData.lineItems.some((item) => Number(item.quantity) <= 0)) {
      nextErrors.lineItems = 'All line item quantities must be greater than 0.';
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
    const finalQuotationId = /^\d+$/.test(String(resolvedId || '').trim())
      ? Number(String(resolvedId).trim())
      : (typeof resolvedId === 'number' && Number.isFinite(resolvedId) ? resolvedId : null);

    const isDirect = orderMode === 'DIRECT' || !formData.quotationId;

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
      paymentTerms: Array.isArray(formData.paymentTerms)
        ? formData.paymentTerms.join(', ')
        : (formData.paymentTerms || ''),
      deliveryTerms: Array.isArray(formData.deliveryTerms)
        ? formData.deliveryTerms.join(', ')
        : (formData.deliveryTerms || ''),
      status: targetStatus,
      lineItems: isDirect
        ? formData.lineItems.map((item) => ({
            productId: Number(item.productId || 1),
            productName: item.productName,
            productCode: item.productCode || item.itemCode,
            quantity: Number(item.quantity) || 1,
            rate: Number(item.rate) || 0,
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
                  value={`${formData.quotationNo || '—'} (Rev ${formData.quotationRevisionNo ?? 0})`}
                />
              ) : (
                <SearchableSelect
                  label="Confirmed Quotation"
                  required
                  placeholder="-- Select Confirmed Quotation --"
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
              onChange={(e) => handleSelectAddress(e.target.value)}
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
                setFormData((prev) => ({ ...prev, paymentTerms: val }));
              }}
            />

            <DeliveryTermsSelect
              value={formData.deliveryTerms}
              name="deliveryTerms"
              maxDisplayTags={2}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                setFormData((prev) => ({ ...prev, deliveryTerms: val }));
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

      {/* ── SECTION 3: ORDER LINE ITEMS & TOTALS ── */}
      <CollapsibleCard
        title="3. Order Line Items & Tax Summary"
        subtitle={
          orderMode === 'DIRECT'
            ? 'Add and configure product line items, quantities, rates, and tax slabs'
            : 'Copied from the quotation\'s latest revision; quantities, rates, and taxes can be adjusted while Draft'
        }
        icon={<IconPackage size={18} className="text-primary" />}
        defaultOpen={true}
        padding="none"
        bodyClassName="p-0 space-y-0"
      >
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-surface/30">
          <span className="text-xs text-text-muted">
            {formData.lineItems.length} line item(s) configured
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddLineItem}
          >
            + Add Product Line
          </Button>
        </div>

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
                    No line items added yet. Click &quot;+ Add Product Line&quot; above to add products.
                  </td>
                </tr>
              ) : (
                formData.lineItems.map((item, idx) => {
                  const lineAmount =
                    (Number(item.quantity) || 0) * (Number(item.rate) || 0) +
                    (Number(item.otherCharges) || 0);
                  return (
                    <tr key={item.id || idx} className="hover:bg-surface/40 transition-colors">
                      <Td className="text-center font-mono text-xs text-text-muted">
                        {idx + 1}
                      </Td>
                      <Td className="text-xs">
                        {orderMode === 'DIRECT' || !item.productName ? (
                          <div className="space-y-1.5 py-1">
                            {productOptions.length > 0 ? (
                              <SearchableSelect
                                size="sm"
                                placeholder={isLoadingProducts ? 'Loading products...' : '-- Select Product --'}
                                options={productOptions}
                                value={String(item.productId || '')}
                                onChange={(e) => handleProductPickerChange(idx, e.target.value)}
                              />
                            ) : (
                              <Input
                                size="sm"
                                placeholder="Product Name"
                                aria-label={`Line ${idx + 1} Product Name`}
                                value={item.productName}
                                onChange={(e) =>
                                  handleLineItemChange(idx, 'productName', e.target.value)
                                }
                              />
                            )}
                            <div className="flex gap-2">
                              <Input
                                size="sm"
                                placeholder="Variant / Specs"
                                aria-label={`Line ${idx + 1} Variant or Specification`}
                                value={item.variantName}
                                onChange={(e) =>
                                  handleLineItemChange(idx, 'variantName', e.target.value)
                                }
                              />
                              <Input
                                size="sm"
                                placeholder="Code"
                                aria-label={`Line ${idx + 1} Item Code`}
                                value={item.itemCode}
                                onChange={(e) =>
                                  handleLineItemChange(idx, 'itemCode', e.target.value)
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-heading truncate">
                              {item.productName}
                            </div>
                            <div className="font-mono text-2xs text-primary truncate">
                              {item.itemCode || 'ITM'} · {item.variantName}
                            </div>
                            {item.technicalDetails && (
                              <div className="text-3xs text-text-muted truncate max-w-xs">
                                {item.technicalDetails}
                              </div>
                            )}
                          </>
                        )}
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min="0.001"
                          step="any"
                          size="sm"
                          aria-label={`Line ${idx + 1} Quantity`}
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'quantity', e.target.value)
                          }
                        />
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          size="sm"
                          aria-label={`Line ${idx + 1} Unit Rate`}
                          value={item.rate}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'rate', e.target.value)
                          }
                        />
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          size="sm"
                          aria-label={`Line ${idx + 1} Other Charges`}
                          value={item.otherCharges ?? 0}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'otherCharges', e.target.value)
                          }
                        />
                      </Td>
                      <Td>
                        {(() => {
                          const matched = taxOptions.find(
                            (o) =>
                              (item.taxConfigDetailId && String(o.detailId) === String(item.taxConfigDetailId)) ||
                              String(o.value) === String(item.taxConfigDetailId) ||
                              String(o.percent) === String(item.taxPercent)
                          );
                          const taxVal = matched ? String(matched.value) : String(item.taxPercent ?? 18);
                          return (
                            <SearchableSelect
                              size="sm"
                              options={taxOptions}
                              value={taxVal}
                              onChange={(e) => handleLineItemTaxChange(idx, e.target.value)}
                            />
                          );
                        })()}
                      </Td>
                      <Td className="text-right font-mono font-semibold text-xs text-heading">
                        {formatCurrency(lineAmount, formData.currency)}
                      </Td>
                      <Td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 text-text-muted hover:text-red-500 rounded hover:bg-surface transition-colors"
                          title="Remove line item"
                        >
                          <IconTrash size={14} />
                        </button>
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
    </div>
  );
}

