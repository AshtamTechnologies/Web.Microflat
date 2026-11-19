/**
 * QuotationFormPage.jsx — Create New Quotation (Rev 0) or New Revision (Rev N+1)
 *
 * Route:
 *   - /quotations/new (New Quotation - Select inquiry inside form)
 *   - /quotations/:id/new-revision (New Revision from existing Quotation)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconBack,
  IconAdd,
  IconCheck,
  IconQuotation,
  IconPackage,
  IconInfo,
  IconFileText,
  IconChevronDown,
  IconChevronUp,
  IconMessageSquare,
  IconRotateCcw,
} from '../../constants/icons';
import {
  PageHeader,
  CollapsibleCard,
  Input,
  DatePicker,
  SearchableSelect,
  SearchableMultiSelect,
  PaymentTermsSelect,
  DeliveryTermsSelect,
  Textarea,
  TableContainer,
  Th,
  Td,
  Button,
  CancelButton,
  FormActionsBar,
  Badge,
  TableActions,
  Drawer,
  Checkbox,
} from '../../components/ui';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useClientsContext } from '../../context/ClientsContext';
import { useUsersContext } from '../../context/UsersContext';
import {
  TAX_SLABS,
  TAX_TREATMENTS,
  calculateQuotationTotals,
  formatCurrency,
} from '../../mocks/quotations';
import {
  INQUIRY_CATALOG_CATEGORIES,
  INQUIRY_CATALOG_PRODUCTS,
  buildCatalogProductDescription,
} from '../../mocks/inquiryCatalog';
import useColumnResize from '../../hooks/useColumnResize';
import NegotiationStageFields from './components/NegotiationStageFields';
import QuotationDocumentsSection from './components/QuotationDocumentsSection';

const CATALOG_OPTIONS = [
  'Rexine Cover (Standard)',
  'Holes',
  'Counter Bored Holes',
  'Metallic Threaded Inserts',
  'Metallic T-Slots',
  'Notch',
];

export default function QuotationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from;
  const { id } = useParams(); // For /quotations/:id/new-revision
  const [searchParams] = useSearchParams();
  const inquiryIdParam = searchParams.get('inquiryId');

  const {
    quotations,
    getQuotationById,
    getNextQuotationNo,
    createQuotation,
    createRevision,
    fetchQuotationPrefill,
    fetchLookups,
    lookups,
  } = useQuotationsContext();

  const { inquiries = [] } = useInquiriesContext();
  const { clients = [], ensureClientsLoaded } = useClientsContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  const isRevisionMode = Boolean(id);
  const targetQuotation = useMemo(() => {
    return isRevisionMode ? getQuotationById(id) : null;
  }, [isRevisionMode, id, getQuotationById]);

  const userOptions = useMemo(() => {
    return userList.map((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.email;
      return { value: name, label: name };
    });
  }, [userList]);

  // Form State
  const [formData, setFormData] = useState({
    quotationNo: '',
    inquiryNo: '',
    inquiryId: '',
    revisionNo: 0,
    revisionDate: new Date().toISOString().split('T')[0],
    revisionReason: '',
    clientName: '',
    clientId: '',
    clientAddress: '',
    clientAddressId: null,
    contactPerson: '',
    clientContactId: null,
    contactEmail: '',
    contactPhone: '',
    currency: 'INR',
    currencyId: 1,
    validUntil: '',
    paymentTerms: [],
    paymentTermId: null,
    deliveryTerms: [],
    termsAndConditions: '',
    taxTreatment: 'INTRA_STATE',
    pricingNotes: '',
    items: [],
  });

  // Staged Document Attachments & Expandable Product Descriptions
  const [stagedDocuments, setStagedDocuments] = useState([]);
  const [expandedDescIds, setExpandedDescIds] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revision-Mode Negotiation State
  const [logNegotiationStage, setLogNegotiationStage] = useState(false);
  const [negotiationStageData, setNegotiationStageData] = useState(() => {
    const now = new Date();
    const defaultDateTime = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return {
      dateTime: defaultDateTime,
      mode: 'Call',
      handledBy: 'Janvi Motwani',
      clientContact: '',
      ourOffer: '',
      clientCounter: '',
      discussion: '',
    };
  });

  // Drawer & Line Item Builder State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [drawerCategory, setDrawerCategory] = useState('');
  const [drawerProduct, setDrawerProduct] = useState('');
  const [drawerVariant, setDrawerVariant] = useState('');
  const [drawerQty, setDrawerQty] = useState('1');
  const [drawerRate, setDrawerRate] = useState('');
  const [drawerTax, setDrawerTax] = useState(18);
  const [drawerOtherCharges, setDrawerOtherCharges] = useState('0');
  const [drawerOptions, setDrawerOptions] = useState(['Rexine Cover (Standard)']);
  const [drawerDescription, setDrawerDescription] = useState('');
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(false);

  // Available unquoted inquiries list for the Inquiry dropdown
  const availableInquiries = useMemo(() => {
    const quotedInquiryNos = new Set(
      quotations
        .filter((q) => q.id !== id && q.quotationNo !== id)
        .map((q) => String(q.inquiryNo || '').toLowerCase())
    );

    return inquiries.map((inq) => ({
      value: inq.InquiryNo || inq.id,
      inquiryObj: inq,
      label: `${inq.InquiryNo} · ${inq.CustomerName || inq.clientName || 'Client'} (${(inq.items || []).length} items)`,
      isQuoted: quotedInquiryNos.has(String(inq.InquiryNo || '').toLowerCase()),
    }));
  }, [inquiries, quotations, id]);

  const inquirySelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select an Inquiry --' },
      ...availableInquiries.map((inq) => ({
        value: inq.value,
        label: inq.label,
      })),
    ];
  }, [availableInquiries]);

  // Handle Inquiry Selection (with dynamic API prefill)
  const handleSelectInquiry = async (inquiryNoOrId) => {
    if (!inquiryNoOrId) {
      setFormData((prev) => ({
        ...prev,
        inquiryNo: '',
        inquiryId: '',
        clientName: '',
        clientId: '',
        clientAddress: '',
        clientAddressId: null,
        contactPerson: '',
        clientContactId: null,
        contactEmail: '',
        contactPhone: '',
      }));
      return;
    }

    const matchedInq = inquiries.find(
      (inq) =>
        String(inq.InquiryNo).toLowerCase() === String(inquiryNoOrId).toLowerCase() ||
        String(inq.id).toLowerCase() === String(inquiryNoOrId).toLowerCase()
    );

    const inqId = matchedInq?.id || matchedInq?.InquiryId || inquiryNoOrId;

    // Fetch dynamic prefill from API
    let prefill = null;
    if (inqId && fetchQuotationPrefill) {
      try {
        prefill = await fetchQuotationPrefill(inqId);
      } catch (e) {
        console.warn('API fetchQuotationPrefill failed, using local inq fallback:', e);
      }
    }

    // Resolve client
    const inqClient = clients.find(
      (c) =>
        (c.companyName || '').toLowerCase() === (prefill?.client?.clientName || matchedInq?.CustomerName || '').toLowerCase() ||
        (c.clientId || c.id) === (prefill?.clientId || prefill?.client?.id || matchedInq?.clientId)
    );

    // Prefer prefill address, then inqClient address, then matchedInq address
    const prefillAddrObj =
      prefill?.client?.addresses?.find((a) => a.id === prefill.clientAddressId) ||
      prefill?.client?.addresses?.[0];
    const defaultAddrId =
      prefill?.clientAddressId ||
      prefillAddrObj?.id ||
      inqClient?.addresses?.[0]?.id ||
      inqClient?.addresses?.[0]?.addressId ||
      null;
    const defaultAddr = prefillAddrObj
      ? `${prefillAddrObj.addressLine1 || prefillAddrObj.address || ''}${prefillAddrObj.city ? `, ${prefillAddrObj.city}` : ''}`
      : inqClient?.addresses?.[0]?.addressLine1
      ? `${inqClient.addresses[0].addressLine1}, ${inqClient.addresses[0].city || ''}`
      : matchedInq?.AddressLine1
      ? `${matchedInq.AddressLine1}, ${matchedInq.City || ''}`
      : 'Plot 12, GIDC, Ahmedabad';

    // Prefer prefill contact, then inqClient contact, then matchedInq contact
    const prefillContactObj =
      prefill?.client?.contacts?.find((c) => c.id === prefill.clientContactId) ||
      prefill?.client?.contacts?.[0];
    const defaultContactId =
      prefill?.clientContactId ||
      prefillContactObj?.id ||
      inqClient?.contacts?.[0]?.id ||
      inqClient?.contacts?.[0]?.clientContactId ||
      null;
    const defaultContact = prefillContactObj
      ? `${prefillContactObj.firstName || ''} ${prefillContactObj.lastName || ''}`.trim() || prefillContactObj.name || ''
      : inqClient?.contacts?.[0]?.firstName
      ? `${inqClient.contacts[0].firstName} ${inqClient.contacts[0].lastName || ''}`.trim()
      : matchedInq?.ContactPerson || '';

    const defaultContactEmail = prefillContactObj?.email || matchedInq?.Email || inqClient?.email || '';
    const defaultContactPhone = prefillContactObj?.phone || matchedInq?.Phone || inqClient?.phone || '';

    // Currency from prefill or lookups
    const prefillCurrencyId = prefill?.currencyId || lookups?.defaultCurrencyId || 1;
    const matchedCurrency = lookups?.currencies?.find((c) => c.id === prefillCurrencyId);
    const resolvedCurrency = matchedCurrency?.code || matchedCurrency?.currencyCode || 'INR';

    // Commercial Terms from prefill
    const prefillPaymentTerms = prefill?.paymentTerms
      ? (Array.isArray(prefill.paymentTerms) ? prefill.paymentTerms : [prefill.paymentTerms])
      : (prefill?.paymentTermName ? [prefill.paymentTermName] : null);

    // Map items from prefill or fallback to inquiry items
    let mappedItems = [];
    const rawItems = prefill?.lineItems || prefill?.items || matchedInq?.items || [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      mappedItems = rawItems.map((it, idx) => {
        const catProd = INQUIRY_CATALOG_PRODUCTS.find((p) => p.id === it.productId);
        const catVar = catProd?.variants?.find((v) => v.id === it.variantId);
        const fallbackDesc = catProd ? buildCatalogProductDescription(catProd, catVar) : '';
        return {
          id: it.id || `it-${Date.now()}-${idx}`,
          quotationLineItemId: it.id || null,
          categoryId: it.categoryId || 'cat-sp',
          productId: it.productId || 'prod-gsp',
          productName: it.productName || it.itemName || it.description || 'Precision Plate',
          variantId: it.variantId || '',
          variantName: it.variantName || 'Standard Size',
          itemCode: it.itemCode || it.productCode || 'ITM-01',
          technicalDetails: it.technicalDetails || it.specification || '',
          description: it.description || it.specification || fallbackDesc || '',
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || (matchedInq?.items ? 35000 : 0),
          otherCharges: Number(it.otherCharges || it.lineCharges) || 0,
          taxConfigDetailId: it.taxConfigDetailId || null,
          taxPercent: Number(it.taxPercent) || 18,
          options: Array.isArray(it.options) ? it.options : ['Rexine Cover (Standard)'],
        };
      });
    }

    setFormData((prev) => ({
      ...prev,
      inquiryNo: matchedInq?.InquiryNo || prefill?.inquiryNo || inquiryNoOrId,
      inquiryId: inqId,
      clientName: prefill?.client?.clientName || matchedInq?.CustomerName || inqClient?.companyName || '',
      clientId: prefill?.clientId || prefill?.client?.id || inqClient?.clientId || inqClient?.id || '',
      clientAddressId: defaultAddrId,
      clientAddress: defaultAddr,
      clientContactId: defaultContactId,
      contactPerson: defaultContact,
      contactEmail: defaultContactEmail,
      contactPhone: defaultContactPhone,
      currency: resolvedCurrency,
      currencyId: prefillCurrencyId,
      paymentTerms: prefillPaymentTerms || prev.paymentTerms,
      paymentTermId: prefill?.paymentTermId || prev.paymentTermId,
      deliveryTerms: prefill?.deliveryTerms
        ? (Array.isArray(prefill.deliveryTerms) ? prefill.deliveryTerms : [prefill.deliveryTerms])
        : prev.deliveryTerms,
      items: mappedItems.length > 0 ? mappedItems : prev.items,
    }));

    if (prefill?.skippedCustomItems?.length > 0) {
      toast(`${prefill.skippedCustomItems.length} custom line item(s) skipped from auto-pricing.`);
    }

    toast.success(`Inquiry ${matchedInq?.InquiryNo || inquiryNoOrId} selected · Client & items loaded`);
  };

  // ── Column Resizing State for Product Grid (via shared hook) ──
  const MIN_COL_WIDTHS = useMemo(
    () => ({
      index: 44,
      product: 220,
      quantity: 70,
      rate: 110,
      otherCharges: 110,
      tax: 100,
      amount: 130,
      actions: 90,
    }),
    []
  );

  const INITIAL_COL_WIDTHS = useMemo(
    () => ({
      index: 48,
      product: 340,
      quantity: 80,
      rate: 140,
      otherCharges: 130,
      tax: 110,
      amount: 150,
      actions: 96,
    }),
    []
  );

  const { colWidths, resizingCol, handleStartResize } = useColumnResize(
    INITIAL_COL_WIDTHS,
    MIN_COL_WIDTHS
  );

  // Initialize form on mount
  useEffect(() => {
    ensureClientsLoaded?.();
    fetchLookups?.();
    if (isRevisionMode && targetQuotation) {
      const latestRev =
        targetQuotation.revisions?.[targetQuotation.currentRevision] ||
        targetQuotation.revisions?.[targetQuotation.revisions.length - 1];

      setFormData({
        quotationNo: targetQuotation.quotationNo,
        inquiryNo: targetQuotation.inquiryNo,
        inquiryId: targetQuotation.inquiryId,
        revisionNo: (targetQuotation.revisions?.length || 1),
        revisionDate: new Date().toISOString().split('T')[0],
        revisionReason: '',
        clientName: targetQuotation.clientName,
        clientId: targetQuotation.clientId,
        clientAddress: targetQuotation.clientAddress,
        contactPerson: targetQuotation.contactPerson,
        contactEmail: targetQuotation.contactEmail,
        contactPhone: targetQuotation.contactPhone,
        currency: targetQuotation.currency || 'INR',
        validUntil: targetQuotation.validUntil || '',
        paymentTerms: Array.isArray(targetQuotation.paymentTerms)
          ? targetQuotation.paymentTerms
          : (targetQuotation.paymentTerms ? [targetQuotation.paymentTerms] : []),
        deliveryTerms: Array.isArray(targetQuotation.deliveryTerms)
          ? targetQuotation.deliveryTerms
          : (targetQuotation.deliveryTerms ? [targetQuotation.deliveryTerms] : []),
        termsAndConditions: targetQuotation.termsAndConditions || '',
        taxTreatment: targetQuotation.taxTreatment || 'INTRA_STATE',
        pricingNotes: targetQuotation.pricingNotes || targetQuotation.remarks || '',
        items: latestRev?.items?.map((it, idx) => ({ ...it, id: it.id || `it-${Date.now()}-${idx}` })) || [],
      });

      setNegotiationStageData((prev) => ({
        ...prev,
        handledBy: userOptions[0]?.value || prev.handledBy || 'Janvi Motwani',
        clientContact: targetQuotation.contactPerson || prev.clientContact || '',
      }));
    } else if (!isRevisionMode) {
      Promise.resolve(getNextQuotationNo()).then((nextNo) => {
        let cleanNo = '';
        if (typeof nextNo === 'string') {
          cleanNo = nextNo.trim();
        } else if (nextNo && typeof nextNo === 'object') {
          cleanNo = nextNo.documentNumber || nextNo.nextNumber || '';
        }
        if (cleanNo) {
          setFormData((prev) => ({
            ...prev,
            quotationNo: cleanNo,
            revisionNo: 0,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }));
        }
      });

      // If inquiryId was passed in query parameter, preselect it
      if (inquiryIdParam) {
        handleSelectInquiry(inquiryIdParam);
      }
    }
  }, [isRevisionMode, targetQuotation, getNextQuotationNo, inquiryIdParam]);

  // Catalog Options
  const categoryOptions = useMemo(() => {
    return INQUIRY_CATALOG_CATEGORIES.map((cat) => ({
      value: cat.value,
      label: cat.label,
    }));
  }, []);

  const productOptions = useMemo(() => {
    if (!drawerCategory) {
      return INQUIRY_CATALOG_PRODUCTS.map((p) => ({
        value: p.id,
        label: p.productName,
      }));
    }
    return INQUIRY_CATALOG_PRODUCTS.filter((p) => p.categoryId === drawerCategory).map((p) => ({
      value: p.id,
      label: p.productName,
    }));
  }, [drawerCategory]);

  const activeProductObj = useMemo(() => {
    return INQUIRY_CATALOG_PRODUCTS.find((p) => p.id === drawerProduct) || null;
  }, [drawerProduct]);

  const variantOptions = useMemo(() => {
    if (!activeProductObj) return [];
    return (activeProductObj.variants || []).map((v) => ({
      value: v.id,
      label: `${v.variantName} (${v.itemCode})`,
    }));
  }, [activeProductObj]);

  const activeVariantObj = useMemo(() => {
    if (!activeProductObj) return null;
    return (activeProductObj.variants || []).find((v) => v.id === drawerVariant) || null;
  }, [activeProductObj, drawerVariant]);

  // Dynamic Currencies from lookups
  const currencyOptions = useMemo(() => {
    if (Array.isArray(lookups?.currencies) && lookups.currencies.length > 0) {
      return lookups.currencies.map((c) => {
        const code = c.code || c.currencyCode || c.name || 'INR';
        const symbol = c.symbol ? ` (${c.symbol})` : '';
        const name = c.name || c.currencyName || '';
        return {
          value: code,
          label: `${code}${symbol}${name ? ` — ${name}` : ''}`,
          id: c.id,
        };
      });
    }
    return [
      { value: 'INR', label: 'INR (₹ - Indian Rupee)', id: 1 },
      { value: 'USD', label: 'USD ($ - US Dollar)', id: 2 },
      { value: 'EUR', label: 'EUR (€ - Euro)', id: 3 },
      { value: 'GBP', label: 'GBP (£ - British Pound)', id: 4 },
    ];
  }, [lookups?.currencies]);

  // Tax Slab Options (Dynamic from lookups.taxes, with fallback to TAX_SLABS)
  const taxSlabOptions = useMemo(() => {
    if (Array.isArray(lookups?.taxes) && lookups.taxes.length > 0) {
      return lookups.taxes.map((t) => {
        const rate = Number(t.rate ?? t.taxRate ?? 0);
        const name = t.taxName || t.name || 'GST';
        return {
          value: String(rate),
          label: `${rate}% (${name})`,
          rate,
          id: t.id || t.taxConfigDetailId || null,
        };
      });
    }
    return TAX_SLABS.map((s) => ({
      value: String(s.value),
      label: s.label,
      rate: s.value,
      id: null,
    }));
  }, [lookups?.taxes]);

  // Tax Treatment Options
  const taxTreatmentOptions = useMemo(() => {
    return TAX_TREATMENTS.map((t) => ({
      value: t.value,
      label: t.label,
    }));
  }, []);

  // Client Selection Options (for Direct Quotations without Inquiry)
  const clientSelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Client Company --' },
      ...clients.map((c) => ({
        value: c.clientId || c.id,
        label: `${c.companyName || 'Unnamed Client'}${c.clientCode ? ` (${c.clientCode})` : ''}`,
      })),
    ];
  }, [clients]);

  const handleSelectClient = (selectedClientId) => {
    if (!selectedClientId) {
      setFormData((prev) => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientAddress: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
      }));
      return;
    }

    const client = clients.find(
      (c) =>
        (c.clientId && String(c.clientId) === String(selectedClientId)) ||
        (c.id && String(c.id) === String(selectedClientId)) ||
        c.companyName === selectedClientId
    );

    if (!client) return;

    const defaultAddr = client.addresses?.[0]?.addressLine1
      ? `${client.addresses[0].addressLine1}, ${client.addresses[0].city || ''} ${client.addresses[0].pincode || ''}`.trim()
      : client.address || 'Plot 12, GIDC, Ahmedabad';

    const defaultContact = client.contacts?.[0]?.firstName
      ? `${client.contacts[0].firstName} ${client.contacts[0].lastName || ''}`.trim()
      : client.contactPerson || '';

    setFormData((prev) => ({
      ...prev,
      clientId: client.clientId || client.id,
      clientName: client.companyName || '',
      clientAddress: defaultAddr,
      contactPerson: defaultContact,
      contactEmail: client.contacts?.[0]?.email || client.email || '',
      contactPhone: client.contacts?.[0]?.mobile1 || client.phone || '',
    }));

    toast.success(`Client ${client.companyName} selected`);
  };

  // Client Address & Contact Dropdown Options
  const matchedClient = useMemo(() => {
    return clients.find(
      (c) =>
        (formData.clientId && (c.clientId === formData.clientId || c.id === formData.clientId)) ||
        (formData.clientName && (c.companyName || '').toLowerCase() === formData.clientName.toLowerCase())
    );
  }, [clients, formData.clientId, formData.clientName]);

  const clientAddressOptions = useMemo(() => {
    if (!matchedClient || !matchedClient.addresses || matchedClient.addresses.length === 0) {
      return [{
        value: formData.clientAddress || 'Head Office',
        label: formData.clientAddress || 'Head Office',
        id: formData.clientAddressId || null,
      }];
    }
    return matchedClient.addresses.map((addr) => ({
      value: `${addr.addressType || 'Office'} – ${addr.addressLine1}, ${addr.city} ${addr.pincode || ''}`,
      label: `${addr.addressType || 'Office'} – ${addr.addressLine1}, ${addr.city}`,
      id: addr.id || addr.addressId || null,
    }));
  }, [matchedClient, formData.clientAddress, formData.clientAddressId]);

  const clientContactOptions = useMemo(() => {
    if (!matchedClient || !matchedClient.contacts || matchedClient.contacts.length === 0) {
      return [{
        value: formData.contactPerson || 'Contact Person',
        label: formData.contactPerson || 'Contact Person',
        id: formData.clientContactId || null,
        email: formData.contactEmail || '',
        phone: formData.contactPhone || '',
      }];
    }
    return matchedClient.contacts.map((c) => ({
      value: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      label: `${c.firstName || ''} ${c.lastName || ''} · ${c.email || c.mobile1 || ''}`.trim(),
      id: c.id || c.clientContactId || null,
      email: c.email || '',
      phone: c.mobile1 || c.phone || '',
    }));
  }, [matchedClient, formData.contactPerson, formData.clientContactId, formData.contactEmail, formData.contactPhone]);

  // Real-time Totals Calculation
  const totals = useMemo(() => {
    return calculateQuotationTotals(formData.items, formData.taxTreatment);
  }, [formData.items, formData.taxTreatment]);

  // Expand / Collapse Product Description Helpers
  const getItemDescKey = useCallback((item, idx) => item.id || `row-${idx}`, []);

  const itemsWithDescription = useMemo(() => {
    return formData.items.filter((it) => Boolean(it.description?.trim()));
  }, [formData.items]);

  const allDescriptionsExpanded = useMemo(() => {
    if (itemsWithDescription.length === 0) return false;
    return formData.items.every((it, idx) =>
      !it.description?.trim() || expandedDescIds.has(getItemDescKey(it, idx))
    );
  }, [formData.items, itemsWithDescription.length, expandedDescIds, getItemDescKey]);

  const handleToggleDescription = (key) => {
    setExpandedDescIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAllDescriptions = () => {
    if (allDescriptionsExpanded) {
      setExpandedDescIds(new Set());
    } else {
      const allKeys = new Set(
        formData.items
          .map((it, idx) => (it.description?.trim() ? getItemDescKey(it, idx) : null))
          .filter(Boolean)
      );
      setExpandedDescIds(allKeys);
    }
  };

  // Open Drawer for Add Product
  const handleOpenAddDrawer = () => {
    setEditingIndex(null);
    setDrawerCategory('');
    setDrawerProduct('');
    setDrawerVariant('');
    setDrawerQty('1');
    setDrawerRate('');
    setDrawerTax(18);
    setDrawerOtherCharges('0');
    setDrawerOptions(['Rexine Cover (Standard)']);
    setDrawerDescription('');
    setIsDescriptionEdited(false);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit Product
  const handleStartEditItem = (item, index) => {
    setEditingIndex(index);
    setDrawerCategory(item.categoryId || '');
    setDrawerProduct(item.productId || '');
    setDrawerVariant(item.variantId || '');
    setDrawerQty(String(item.quantity || 1));
    setDrawerRate(String(item.rate || 0));
    setDrawerTax(item.taxPercent !== undefined ? Number(item.taxPercent) : 18);
    setDrawerOtherCharges(String(item.otherCharges || 0));
    setDrawerOptions(Array.isArray(item.options) ? item.options : ['Rexine Cover (Standard)']);
    const existingDesc = item.description ?? item.technicalDetails ?? '';
    setDrawerDescription(existingDesc);
    setIsDescriptionEdited(Boolean(item.description));
    setIsDrawerOpen(true);
  };

  // Handle Drawer Product / Variant Selection (auto-fetches product description)
  const handleDrawerProductChange = (prodId) => {
    setDrawerProduct(prodId);
    setDrawerVariant('');
    const prod = INQUIRY_CATALOG_PRODUCTS.find((p) => p.id === prodId) || null;
    if (prod && !drawerCategory) {
      setDrawerCategory(prod.categoryId || '');
    }
    if (!isDescriptionEdited) {
      setDrawerDescription(buildCatalogProductDescription(prod, null));
    }
  };

  const handleDrawerVariantChange = (varId) => {
    setDrawerVariant(varId);
    const variant = activeProductObj?.variants?.find((v) => v.id === varId) || null;
    if (!isDescriptionEdited && activeProductObj) {
      setDrawerDescription(buildCatalogProductDescription(activeProductObj, variant));
    }
  };

  const handleResetDrawerDescription = () => {
    setDrawerDescription(buildCatalogProductDescription(activeProductObj, activeVariantObj));
    setIsDescriptionEdited(false);
  };

  // Toggle Catalog Option
  const handleToggleOption = (opt) => {
    setDrawerOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  // Save Product from Drawer
  const handleSaveProductFromDrawer = () => {
    if (!drawerProduct) {
      toast.error('Please select a product first.');
      return;
    }

    const defaultDesc = buildCatalogProductDescription(activeProductObj, activeVariantObj);
    const matchedTaxObj = taxSlabOptions.find((o) => String(o.rate) === String(drawerTax) || o.value === String(drawerTax));
    const taxConfigDetailId = matchedTaxObj?.id || null;

    const payload = {
      categoryId: drawerCategory || activeProductObj?.categoryId || 'cat-sp',
      productId: activeProductObj?.id || 'prod-custom',
      productName: activeProductObj?.productName || 'Custom Product',
      variantId: activeVariantObj?.id || '',
      variantName: activeVariantObj?.variantName || 'Standard Variant',
      itemCode: activeVariantObj?.itemCode || activeProductObj?.itemCodePrefix || 'ITM-01',
      technicalDetails: activeVariantObj?.technicalDetails || activeProductObj?.standardInfo || '',
      description: drawerDescription.trim() || defaultDesc,
      quantity: Math.max(1, Number(drawerQty) || 1),
      rate: Number(drawerRate) || 0,
      otherCharges: Number(drawerOtherCharges) || 0,
      taxPercent: Number(drawerTax) || 18,
      taxConfigDetailId,
      options: drawerOptions,
    };

    if (editingIndex !== null) {
      setFormData((prev) => {
        const nextItems = [...prev.items];
        nextItems[editingIndex] = {
          ...nextItems[editingIndex],
          ...payload,
        };
        return { ...prev, items: nextItems };
      });
      toast.success('Product line updated');
    } else {
      const newItem = {
        id: `it-${Date.now()}`,
        ...payload,
      };
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
      toast.success('Product line added to quotation');
    }

    setIsDrawerOpen(false);
  };

  // Remove Item
  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
    toast.success('Product line removed');
  };

  // Cancel Handler
  const handleCancel = () => {
    navigate(returnPath || (isRevisionMode ? `/quotations/${id}` : '/quotations'));
  };

  const backLabel = returnPath?.startsWith('/inquiries/')
    ? 'Back to Inquiry'
    : returnPath === '/inquiries'
      ? 'Back to Inquiries'
      : `Back to ${isRevisionMode ? 'Quotation' : 'Quotations'}`;

  // Scroll to first invalid compulsory field helper
  const scrollToField = (fieldId, errorMessage) => {
    toast.error(errorMessage);
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector('input, textarea, select, button') || el;
        focusable?.focus?.();
      }
    }, 50);
  };

  // Save handler with validation & auto-scroll
  const handleSave = async (statusToSet = 'Draft') => {
    // 1. Revision Mode Validations
    if (isRevisionMode) {
      if (!formData.revisionDate) {
        scrollToField('field-revision-date', 'Revision Date is required.');
        return;
      }
      if (!formData.revisionReason?.trim()) {
        scrollToField('field-revision-reason', 'Revision reason is required when creating a new revision.');
        return;
      }
      if (logNegotiationStage) {
        if (!negotiationStageData.dateTime) {
          scrollToField('field-neg-datetime', 'Negotiation Date & Time is required.');
          return;
        }
        if (!negotiationStageData.discussion?.trim()) {
          scrollToField('field-neg-discussion', 'Please enter discussion summary for the negotiation stage.');
          return;
        }
      }
    }

    // 2. Validity Date
    if (!formData.validUntil) {
      scrollToField('field-valid-until', 'Please specify the quotation validity date (Valid Until).');
      return;
    }

    // 3. Currency
    if (!formData.currency) {
      scrollToField('field-currency', 'Please select a currency.');
      return;
    }

    // 4. Client Company (if not inquiry-linked and not selected)
    if (!formData.inquiryNo && !formData.clientId && !formData.clientName?.trim()) {
      scrollToField('field-client-company', 'Please select a Client Company.');
      return;
    }

    // 5. Billing / Shipping Address
    if (!formData.clientAddress?.trim()) {
      scrollToField('field-client-address', 'Billing / Shipping address is required.');
      return;
    }

    // 6. Product lines
    if (formData.items.length === 0) {
      scrollToField('field-products-section', 'Please add at least one product line to the quotation.');
      return;
    }

    try {
      setIsSubmitting(true);

      const resolvedAddressId = formData.clientAddressId || clientAddressOptions[0]?.id || null;
      const resolvedContactId = formData.clientContactId || clientContactOptions[0]?.id || null;
      const resolvedCurrencyId = formData.currencyId || currencyOptions.find((c) => c.value === formData.currency)?.id || 1;

      // Extract unique taxConfigDetailIds
      const activeTaxConfigIds = [
        ...new Set(
          formData.items
            .map((it) => it.taxConfigDetailId)
            .filter(Boolean)
        ),
      ];
      const taxesPayload = activeTaxConfigIds.map((tid) => ({ taxConfigDetailId: tid }));

      if (isRevisionMode) {
        const payload = {
          ...formData,
          clientAddressId: resolvedAddressId,
          clientContactId: resolvedContactId,
          currencyId: resolvedCurrencyId,
          taxes: taxesPayload.length > 0 ? taxesPayload : (formData.taxes || []),
          status: statusToSet,
          newNegotiation: logNegotiationStage ? negotiationStageData : null,
          newDocuments: stagedDocuments,
        };
        await createRevision(targetQuotation.id, payload);
        navigate(`/quotations/${targetQuotation.id}`);
      } else {
        const payload = {
          ...formData,
          clientAddressId: resolvedAddressId,
          clientContactId: resolvedContactId,
          currencyId: resolvedCurrencyId,
          taxes: taxesPayload.length > 0 ? taxesPayload : (formData.taxes || []),
          status: statusToSet,
          documents: stagedDocuments,
        };
        const newQuote = await createQuotation(payload);
        const targetId = newQuote?.id || targetQuotation?.id || formData.quotationNo;
        navigate(`/quotations/${targetId}`);
      }
    } catch (err) {
      console.error('Failed to save quotation:', err);
      toast.error(err?.message || 'Failed to save quotation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-24">
      {/* ── Top PageHeader (Quotation No shown only once in the input) ── */}
      <PageHeader
        title={
          isRevisionMode
            ? `New Revision · ${formData.quotationNo} (Rev ${formData.revisionNo})`
            : 'New Quotation'
        }
        subtitle={
          isRevisionMode
            ? `Revision ${formData.revisionNo} copies from previous revision. Older revisions become read-only.`
            : 'Create formal commercial quotation from inquiry product specifications.'
        }
        icon={<IconQuotation className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            {backLabel}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <CancelButton onClick={handleCancel} size="sm" disabled={isSubmitting}>
              Cancel
            </CancelButton>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSave('Draft')}
              disabled={isSubmitting}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave('Sent')}
              disabled={isSubmitting}
              icon={<IconCheck size={16} />}
            >
              {isSubmitting ? 'Saving...' : 'Save & Mark as Sent'}
            </Button>
          </div>
        }
      />

      {/* ── SECTION 1: QUOTATION & CLIENT DETAILS ── */}
      <CollapsibleCard
        title="1. Quotation & Client Details"
        subtitle="Inquiry linkage, customer addresses, contact person, currency, and quotation validity"
        icon={<IconInfo size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Inquiry Selector */}
            {!isRevisionMode ? (
              <SearchableSelect
                label="Select Inquiry"
                options={inquirySelectOptions}
                value={formData.inquiryNo}
                placeholder="-- Choose Inquiry --"
                onChange={(e) => handleSelectInquiry(e.target.value)}
              />
            ) : (
              <Input
                label="Inquiry No"
                disabled
                value={formData.inquiryNo || 'Manual / Direct'}
              />
            )}

            {/* Quotation No (Auto-generated, shown once here) */}
            <Input
              label="Quotation No"
              disabled
              value={formData.quotationNo ? `${formData.quotationNo} (Auto-generated)` : 'Auto-generated on save'}
            />

            {/* Revision Fields ONLY shown in Revision Mode */}
            {isRevisionMode && (
              <>
                <Input
                  label="Revision No"
                  disabled
                  value={`Rev ${formData.revisionNo}`}
                />
                <div id="field-revision-date">
                  <DatePicker
                    label="Revision Date"
                    required
                    value={formData.revisionDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, revisionDate: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Valid Until */}
            <div id="field-valid-until">
              <DatePicker
                label="Valid Until"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>

            {/* Currency */}
            <div id="field-currency">
              <SearchableSelect
                label="Currency"
                required
                options={currencyOptions}
                value={formData.currency}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = currencyOptions.find((opt) => opt.value === val);
                  setFormData((prev) => ({
                    ...prev,
                    currency: val,
                    currencyId: matched?.id || prev.currencyId || 1,
                  }));
                }}
              />
            </div>
          </div>

          {/* Revision Reason (ONLY in Revision Mode) */}
          {isRevisionMode && (
            <div id="field-revision-reason" className="pt-2">
              <Textarea
                label="Revision Reason"
                required
                rows={2}
                placeholder="Explain why this quotation is being revised (e.g. Rate revision, scope change, quantity update)..."
                value={formData.revisionReason}
                onChange={(e) => setFormData((prev) => ({ ...prev, revisionReason: e.target.value }))}
              />
            </div>
          )}

          {/* Client Information Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
            <div id="field-client-company">
              {formData.inquiryNo ? (
                <Input
                  label="Client Company"
                  disabled
                  value={formData.clientName}
                  hint="Auto-linked from selected Inquiry"
                />
              ) : (
                <SearchableSelect
                  label="Client Company"
                  required
                  options={clientSelectOptions}
                  value={formData.clientId || ''}
                  placeholder="-- Select Client Company --"
                  onChange={(e) => handleSelectClient(e.target.value)}
                />
              )}
            </div>
            <div id="field-client-address">
              <SearchableSelect
                label="Billing / Shipping Address"
                required
                options={clientAddressOptions}
                value={formData.clientAddress}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = clientAddressOptions.find((opt) => opt.value === val);
                  setFormData((prev) => ({
                    ...prev,
                    clientAddress: val,
                    clientAddressId: matched?.id || prev.clientAddressId,
                  }));
                }}
              />
            </div>
            <SearchableSelect
              label="Contact Person"
              options={clientContactOptions}
              value={formData.contactPerson}
              onChange={(e) => {
                const val = e.target.value;
                const matched = clientContactOptions.find((opt) => opt.value === val);
                setFormData((prev) => ({
                  ...prev,
                  contactPerson: val,
                  clientContactId: matched?.id || prev.clientContactId,
                  contactEmail: matched?.email || prev.contactEmail,
                  contactPhone: matched?.phone || prev.contactPhone,
                }));
              }}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 2: PRODUCTS & PRICING ── */}
      <div id="field-products-section">
        <CollapsibleCard
          title="2. Products & Pricing"
          subtitle="Precision products, unit rates, other charges, and tax breakdown"
          icon={<IconPackage size={18} className="text-primary" />}
          defaultOpen={true}
          padding="none"
          bodyClassName="p-0 space-y-0"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {itemsWithDescription.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleAllDescriptions}
                  icon={allDescriptionsExpanded ? IconChevronUp : IconChevronDown}
                >
                  {allDescriptionsExpanded ? 'Hide All Descriptions' : 'Show All Descriptions'}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddDrawer}
                icon={IconAdd}
              >
                Add Product
              </Button>
            </div>
          }
        >
          {/* Resizable Product Lines Grid Table */}
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
                <col style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead>
                <tr>
                  <Th
                    style={{ width: `${colWidths.index}px` }}
                    className="text-center"
                  >
                    #
                  </Th>
                  <Th
                    style={{ width: `${colWidths.product}px` }}
                    isResizing={resizingCol === 'product'}
                    resizeHandler={(e) => handleStartResize(e, 'product')}
                  >
                    PRODUCT / VARIANT & SPECIFICATIONS
                  </Th>
                  <Th
                    style={{ width: `${colWidths.quantity}px` }}
                    isResizing={resizingCol === 'quantity'}
                    resizeHandler={(e) => handleStartResize(e, 'quantity')}
                    className="text-center"
                  >
                    QTY
                  </Th>
                  <Th
                    style={{ width: `${colWidths.rate}px` }}
                    isResizing={resizingCol === 'rate'}
                    resizeHandler={(e) => handleStartResize(e, 'rate')}
                    className="text-right"
                  >
                    RATE ({formData.currency})
                  </Th>
                  <Th
                    style={{ width: `${colWidths.otherCharges}px` }}
                    isResizing={resizingCol === 'otherCharges'}
                    resizeHandler={(e) => handleStartResize(e, 'otherCharges')}
                    className="text-right"
                  >
                    OTHER CHARGES
                  </Th>
                  <Th
                    style={{ width: `${colWidths.tax}px` }}
                    isResizing={resizingCol === 'tax'}
                    resizeHandler={(e) => handleStartResize(e, 'tax')}
                    className="text-center"
                  >
                    TAX %
                  </Th>
                  <Th
                    style={{ width: `${colWidths.amount}px` }}
                    isResizing={resizingCol === 'amount'}
                    resizeHandler={(e) => handleStartResize(e, 'amount')}
                    className="text-right"
                  >
                    LINE AMOUNT
                  </Th>
                  <Th
                    style={{ width: `${colWidths.actions}px` }}
                    className="text-right"
                  >
                    ACTIONS
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-muted text-xs">
                      No products added to this quotation yet. Click &quot;Add Product&quot; above to select items.
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, idx) => {
                    const lineAmount =
                      (Number(item.quantity) || 0) * (Number(item.rate) || 0) +
                      (Number(item.otherCharges) || 0);
                    const itemKey = getItemDescKey(item, idx);
                    const hasDescription = Boolean(item.description?.trim());
                    const isDescExpanded = hasDescription && expandedDescIds.has(itemKey);

                    return (
                      <tr key={itemKey} className="hover:bg-surface/50 transition-colors">
                        <Td className="text-center font-mono text-xs text-text-muted align-top">
                          {idx + 1}
                        </Td>

                        <Td className="text-xs align-top">
                          <div className="font-bold text-heading truncate">
                            {item.productName}
                          </div>
                          <div className="font-mono text-2xs text-primary font-medium truncate">
                            {item.itemCode || 'ITM'} · {item.variantName}
                          </div>
                          {item.technicalDetails && (
                            <div className="text-3xs text-text-muted truncate max-w-sm" title={item.technicalDetails}>
                              {item.technicalDetails}
                            </div>
                          )}
                          {Array.isArray(item.options) && item.options.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.options.map((opt, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-3xs font-medium bg-surface text-text-muted border border-border"
                                >
                                  {opt.replace(' (Standard)', '')}
                                </span>
                              ))}
                            </div>
                          )}

                          {hasDescription && (
                            <div className="mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleDescription(itemKey)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 transition-colors cursor-pointer"
                              >
                                <IconFileText size={11} />
                                <span>{isDescExpanded ? 'Hide Description' : 'Description'}</span>
                                {isDescExpanded ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
                              </button>

                              {isDescExpanded && (
                                <div className="mt-1.5 p-2.5 rounded-lg border border-border bg-surface/60 text-2xs text-heading whitespace-pre-line leading-relaxed max-w-lg">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          )}
                        </Td>

                        <Td className="text-center font-mono font-semibold text-xs text-heading">
                          {item.quantity}
                        </Td>

                        <Td className="text-right font-mono text-xs text-heading">
                          {formatCurrency(item.rate, formData.currency)}
                        </Td>

                        <Td className="text-right font-mono text-xs text-text-muted">
                          {Number(item.otherCharges) > 0
                            ? formatCurrency(item.otherCharges, formData.currency)
                            : '—'}
                        </Td>

                        <Td className="text-center">
                          <Badge variant="neutral" size="sm">
                            {item.taxPercent}% GST
                          </Badge>
                        </Td>

                        <Td className="text-right font-mono font-bold text-xs text-heading">
                          {formatCurrency(lineAmount, formData.currency)}
                        </Td>

                        <Td className="text-right whitespace-nowrap">
                          <TableActions
                            onEdit={() => handleStartEditItem(item, idx)}
                            onDelete={() => handleRemoveItem(idx)}
                            editTooltip="Edit Product"
                            deleteTooltip="Remove Product"
                            className="justify-end shrink-0"
                          />
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </TableContainer>
          </div>

          {/* ── Balanced 2-Column Pricing Footer (Layout 3: Left = Notes/Details, Right = Totals) ── */}
          <div className="p-4 sm:p-5 bg-surface/30 border-t border-border">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (lg: 7 cols): Commercial Treatment & Pricing Notes */}
              <div className="lg:col-span-7 bg-card dark:bg-card-dark rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-heading pb-2 border-b border-border">
                  <IconFileText size={15} className="text-primary" />
                  <span>Commercial Treatment & Pricing Notes</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Applicable Tax Regime
                  </label>
                  <SearchableSelect
                    options={taxTreatmentOptions}
                    value={formData.taxTreatment}
                    onChange={(e) => setFormData((prev) => ({ ...prev, taxTreatment: e.target.value }))}
                  />
                  <p className="text-3xs text-text-muted">
                    Determines Output Tax split: Intra-State (CGST + SGST), Inter-State (IGST), or Export / Exempt (0%).
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Quotation Pricing Notes & Commercial Remarks
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Unit rates include standard export packing; prices valid for 30 days from document date; freight extra at actuals..."
                    value={formData.pricingNotes || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pricingNotes: e.target.value }))}
                  />
                  <p className="text-3xs text-text-muted">
                    Commercial notes to be communicated with line items on official client quotations.
                  </p>
                </div>
              </div>

              {/* Right Column (lg: 5 cols): Calculation Summary Card */}
              <div className="lg:col-span-5 bg-card dark:bg-card-dark rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-heading">
                    Calculation Summary
                  </span>
                  <Badge variant="neutral" size="sm" className="font-mono font-semibold">
                    {formData.currency}
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-text-muted">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-semibold text-heading text-sm">
                    {formatCurrency(totals.subtotal, formData.currency)}
                  </span>
                </div>

                {formData.taxTreatment === 'INTRA_STATE' && (
                  <div className="space-y-1.5 py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60">
                    <div className="flex justify-between items-center text-text-muted text-2xs">
                      <span>CGST (Output - 50%):</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.cgst, formData.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-text-muted text-2xs">
                      <span>SGST (Output - 50%):</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.sgst, formData.currency)}</span>
                    </div>
                  </div>
                )}

                {formData.taxTreatment === 'INTER_STATE' && (
                  <div className="py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60">
                    <div className="flex justify-between items-center text-text-muted text-2xs">
                      <span>IGST (Output):</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.igst, formData.currency)}</span>
                    </div>
                  </div>
                )}

                {(formData.taxTreatment === 'EXPORT_LUT' || formData.taxTreatment === 'EXEMPT') && (
                  <div className="py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60">
                    <div className="flex justify-between items-center text-text-muted text-2xs">
                      <span>Exempt Tax (0%):</span>
                      <span className="font-mono font-medium">₹0.00</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-text-muted pt-1">
                  <span>Total Tax:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(totals.totalTax, formData.currency)}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-border flex justify-between items-center font-bold text-sm text-heading">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-base sm:text-lg">
                    {formatCurrency(totals.grandTotal, formData.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleCard>
      </div>

      {/* ── SECTION 3 (REVISION MODE ONLY): NEGOTIATION HISTORY & STAGE ── */}
      {isRevisionMode && targetQuotation && (
        <CollapsibleCard
          title="3. Negotiation & Client Counter-Offer"
          subtitle="Review previous commercial discussions and optionally log a new negotiation stage with this revision"
          icon={<IconMessageSquare size={18} className="text-primary" />}
          defaultOpen={true}
          badge={
            (targetQuotation.negotiations || []).length > 0 ? (
              <Badge variant="neutral" size="sm">
                {targetQuotation.negotiations.length} Previous Stage{targetQuotation.negotiations.length === 1 ? '' : 's'}
              </Badge>
            ) : null
          }
        >
          <div className="space-y-5">
            {/* Previous Negotiation History (Read-Only Reference) */}
            {(targetQuotation.negotiations || []).length > 0 ? (
              <div className="space-y-2">
                <span className="text-2xs font-bold text-text-muted uppercase tracking-wider block">
                  Previous Negotiation History
                </span>
                <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                  {targetQuotation.negotiations.map((stg) => (
                    <div
                      key={stg.stageNo}
                      className="p-3 rounded-xl border border-border bg-surface/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-heading">
                            Stage {stg.stageNo} · {stg.mode}
                          </span>
                          <Badge variant="neutral" size="sm">
                            Rev {stg.revisionNo}
                          </Badge>
                          <span className="text-2xs text-text-muted">
                            {stg.handledBy} with <strong>{stg.clientContact}</strong>
                          </span>
                        </div>
                        <span className="font-mono text-2xs text-text-muted">
                          {stg.dateTime?.replace('T', ' ')}
                        </span>
                      </div>
                      <p className="text-heading text-xs">{stg.discussion}</p>
                      {(stg.ourOffer || stg.clientCounter) && (
                        <div className="flex items-center gap-4 pt-1 border-t border-border/60 text-2xs">
                          <span>
                            Our Offer:{' '}
                            <strong className="font-mono text-heading">
                              {formatCurrency(stg.ourOffer, formData.currency)}
                            </strong>
                          </span>
                          <span>
                            Client Counter:{' '}
                            <strong className="font-mono text-primary">
                              {formatCurrency(stg.clientCounter, formData.currency)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-border bg-surface/20 text-xs text-text-muted">
                No negotiation stages recorded for this quotation yet.
              </div>
            )}

            {/* Optional Toggle to Log New Stage with this Revision */}
            <div className="pt-3 border-t border-border space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={logNegotiationStage}
                  onChange={(e) => setLogNegotiationStage(e.target.checked)}
                />
                <span className="text-xs font-bold text-heading">
                  Log a new negotiation stage with Revision {formData.revisionNo}
                </span>
                <span className="text-2xs text-text-muted">(Optional)</span>
              </label>

              {logNegotiationStage && (
                <div className="p-4 rounded-xl border border-border bg-surface/40">
                  <NegotiationStageFields
                    stageNo={(targetQuotation.negotiations?.length || 0) + 1}
                    stageData={negotiationStageData}
                    onChange={setNegotiationStageData}
                    lockedRevisionLabel={`Revision ${formData.revisionNo}`}
                    userOptions={userOptions}
                    currency={formData.currency}
                    suggestedOffer={totals.grandTotal}
                  />
                </div>
              )}
            </div>
          </div>
        </CollapsibleCard>
      )}

      {/* ── SECTION 3 / 4: DOCUMENTS & ATTACHMENTS ── */}
      <QuotationDocumentsSection
        sectionNumber={isRevisionMode ? 4 : 3}
        stagedDocuments={stagedDocuments}
        onAddDocument={(doc) => setStagedDocuments((prev) => [...prev, doc])}
        onRemoveDocument={(docId) =>
          setStagedDocuments((prev) => prev.filter((d) => d.id !== docId))
        }
        revisionNo={formData.revisionNo}
        isRevisionMode={isRevisionMode}
        existingDocuments={targetQuotation?.documents || []}
      />

      {/* ── SECTION 4 / 5: COMMERCIAL TERMS & CONDITIONS ── */}
      <CollapsibleCard
        title={`${isRevisionMode ? 5 : 4}. Commercial Terms & Conditions`}
        subtitle="Select applicable payment and delivery terms, and specify custom quotation clauses"
        icon={<IconFileText size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dynamic Multi-Select Payment Terms */}
            <PaymentTermsSelect
              value={formData.paymentTerms}
              name="paymentTerms"
              maxDisplayTags={10}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                setFormData((prev) => ({ ...prev, paymentTerms: val }));
              }}
            />

            {/* Dynamic Multi-Select Delivery Terms */}
            <DeliveryTermsSelect
              value={formData.deliveryTerms}
              name="deliveryTerms"
              maxDisplayTags={10}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                setFormData((prev) => ({ ...prev, deliveryTerms: val }));
              }}
            />
          </div>

          {/* Terms & Conditions Textarea */}
          <div className="pt-2">
            <Textarea
              label="Terms & Conditions Clauses"
              rows={4}
              placeholder="Enter standard commercial conditions, inspection terms, freight notes, warranty period..."
              value={formData.termsAndConditions}
              onChange={(e) => setFormData((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── PRODUCT SELECTION SIDE DRAWER (Matching InquiryFormPage) ── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingIndex !== null ? 'Edit Product Line' : 'Add Product to Quotation'}
        subtitle="Configure catalog item, description, commercial unit rate, and extra charges"
        width="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <CancelButton onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </CancelButton>
            <Button
              variant="primary"
              disabled={!drawerProduct}
              onClick={handleSaveProductFromDrawer}
              icon={<IconCheck size={16} />}
            >
              {editingIndex !== null ? 'Update Product Line' : 'Add Product Line'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          {/* Row 1: Category & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <SearchableSelect
              label="Category"
              options={categoryOptions}
              value={drawerCategory}
              placeholder="-- Select Category --"
              onChange={(e) => {
                setDrawerCategory(e.target.value);
                setDrawerProduct('');
                setDrawerVariant('');
                if (!isDescriptionEdited) setDrawerDescription('');
              }}
            />

            <SearchableSelect
              label="Product Name"
              required
              options={productOptions}
              value={drawerProduct}
              placeholder="-- Select Product --"
              onChange={(e) => handleDrawerProductChange(e.target.value)}
            />
          </div>

          {/* Row 2: Variant & Item Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <SearchableSelect
              label="Size / Variant"
              required
              options={variantOptions}
              value={drawerVariant}
              placeholder={activeProductObj ? '-- Choose Size / Variant --' : 'Select product first'}
              disabled={!activeProductObj}
              onChange={(e) => handleDrawerVariantChange(e.target.value)}
            />

            <Input
              label="Item Code"
              disabled
              value={activeVariantObj?.itemCode || activeProductObj?.itemCodePrefix || 'Auto-generated'}
              hint="Automatically assigned from catalog variant"
            />
          </div>

          {/* Row 3: Quantity, Unit Rate, Other Charges, Tax % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Quantity"
              type="number"
              min="1"
              required
              value={drawerQty}
              onChange={(e) => setDrawerQty(e.target.value)}
            />

            <Input
              label={`Unit Rate (${formData.currency})`}
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={drawerRate}
              onChange={(e) => setDrawerRate(e.target.value)}
            />

            <Input
              label={`Other Charges (${formData.currency})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={drawerOtherCharges}
              onChange={(e) => setDrawerOtherCharges(e.target.value)}
            />

            <SearchableSelect
              label="Tax % Slabs"
              options={taxSlabOptions}
              value={String(drawerTax)}
              onChange={(e) => setDrawerTax(Number(e.target.value))}
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
                  <div className="font-semibold text-heading truncate">Indian Black Granite</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Finish</div>
                  <div className="font-semibold text-heading truncate">Hand Lapped</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Standard</div>
                  <div className="font-semibold text-heading truncate">IS-7327-2003</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Grade</div>
                  <div className="font-semibold text-heading truncate">{activeVariantObj.grade || 'Gr-0'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Flatness</div>
                  <div className="font-semibold text-heading truncate">{activeVariantObj.flatness || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Dimensions</div>
                  <div className="font-semibold text-heading truncate">{activeVariantObj.size || 'Standard'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Product Description Section (Auto-fetched & Editable) */}
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
              placeholder="Select a product to auto-fetch its description, or enter a custom quotation description..."
              value={drawerDescription}
              onChange={(e) => {
                setDrawerDescription(e.target.value);
                setIsDescriptionEdited(true);
              }}
              hint="Auto-populated from the selected product & variant; you can customize it for this quotation."
            />
          </div>

          {/* Catalog Options Checkboxes (from 3rd image) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-heading uppercase tracking-wider">
                Catalog Options
              </label>
              <span className="text-3xs text-text-muted">Select all applicable accessories / machining</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-border bg-surface/30">
              {CATALOG_OPTIONS.map((opt) => {
                const isChecked = drawerOptions.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer text-xs select-none ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5 text-heading font-medium'
                        : 'border-border/60 hover:bg-surface/80 text-text-muted'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={() => handleToggleOption(opt)}
                      aria-label={opt}
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      {/* ── STICKY BOTTOM ACTIONS BAR ── */}
      <FormActionsBar
        leftContent={
          <div className="text-xs text-text-muted">
            {formData.items.length} line item{formData.items.length === 1 ? '' : 's'} · Total:{' '}
            <strong className="text-heading font-mono">
              {formatCurrency(totals.grandTotal, formData.currency)}
            </strong>
          </div>
        }
      >
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <CancelButton
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto justify-center"
          >
            Cancel
          </CancelButton>

          <Button
            variant="secondary"
            onClick={() => handleSave('Draft')}
            disabled={isSubmitting}
            className="w-full sm:w-auto justify-center"
          >
            Save as Draft
          </Button>

          <Button
            variant="primary"
            onClick={() => handleSave('Sent')}
            disabled={isSubmitting}
            icon={<IconCheck size={16} />}
            className="w-full sm:w-auto justify-center"
          >
            {isSubmitting ? 'Saving...' : 'Save & Mark as Sent'}
          </Button>
        </div>
      </FormActionsBar>
    </div>
  );
}
