/**
 * QuotationFormPage.jsx — Create New Quotation (Rev 0) or New Revision (Rev N+1)
 *
 * Route:
 *   - /quotations/new (New Quotation - Select inquiry inside form)
 *   - /quotations/:id/new-revision (New Revision from existing Quotation)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
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
  IconWarning,
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
  Modal,
} from '../../components/ui';
import { productService, clientService, inquiryService } from '../../services';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useClientsContext } from '../../context/ClientsContext';
import { useUsersContext } from '../../context/UsersContext';
import { useAuthContext } from '../../context/AuthContext';
import { useStandardsContext } from '../../context/StandardsContext';
import { calculateFlatnessTolerance, normalizeGradeCode } from '../../utils/flatnessFormula';
import { getTodayISO } from '../../utils/dateUtils';
import {
  TAX_SLABS,
  calculateQuotationTotals,
  formatCurrency,
} from '../../mocks/quotations';
import {
  buildCatalogProductDescription,
} from '../../mocks/inquiryCatalog';
import useColumnResize from '../../hooks/useColumnResize';
import NegotiationStageFields from './components/NegotiationStageFields';
import QuotationDocumentsSection from './components/QuotationDocumentsSection';
import RegisterClientRequiredModal from './components/RegisterClientRequiredModal';
import QuickClientOnboardDrawer from './components/QuickClientOnboardDrawer';
import { isHtmlMarkup } from '../../utils/htmlUtils';

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
    fetchQuotationDetail,
    getNextQuotationNo,
    createQuotation,
    createRevision,
    updateQuotation,
    updateQuotationStatus,
    fetchQuotationPrefill,
    fetchLookups,
    lookups,
  } = useQuotationsContext();

  const { inquiries = [], fetchInquiries, updateInquiry } = useInquiriesContext();
  const { clients = [], ensureClientsLoaded, loadClients } = useClientsContext();
  const { allUsers = [], users = [], ensureAllActiveUsersLoaded } = useUsersContext();
  const { user } = useAuthContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  const isRevisionMode = Boolean(id);
  const [isLoadingRevisionDetail, setIsLoadingRevisionDetail] = useState(isRevisionMode);
  const [fetchedQuotation, setFetchedQuotation] = useState(null);
  const [revisionCreatedInSession, setRevisionCreatedInSession] = useState(false);
  const targetQuotation = useMemo(() => isRevisionMode ? (fetchedQuotation || getQuotationById(id)) : null, [isRevisionMode, id, fetchedQuotation, getQuotationById]);
  const isEditingExistingDraft =
    isRevisionMode &&
    !revisionCreatedInSession &&
    String(targetQuotation?.status || '').trim().toLowerCase() === 'draft';

  const isTargetPoReceived = useMemo(() => {
    if (!isRevisionMode || !targetQuotation) return false;
    return Boolean(
      targetQuotation.poReceived ||
      targetQuotation.status === 'PO Received' ||
      targetQuotation.poDetails?.poNumber ||
      targetQuotation.poNumber
    );
  }, [isRevisionMode, targetQuotation]);

  useEffect(() => {
    let isMounted = true;
    if (isRevisionMode && id && fetchQuotationDetail) {
      setIsLoadingRevisionDetail(true);
      fetchQuotationDetail(id)
        .then((res) => {
          if (isMounted && res) {
            setFetchedQuotation(res);
          }
          if (isMounted) setIsLoadingRevisionDetail(false);
        })
        .catch(() => {
          if (isMounted) setIsLoadingRevisionDetail(false);
        });
    } else {
      setIsLoadingRevisionDetail(false);
    }
    return () => { isMounted = false; };
  }, [isRevisionMode, id, fetchQuotationDetail]);

  const userOptions = useMemo(() => {
    return userList.filter((u) => u.isActive !== false).map((u) => {
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
    revisionDate: getTodayISO(),
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
    currencyId: 2,
    validUntil: '',
    paymentTerms: [],
    paymentTermId: null,
    deliveryTerms: [],
    deliveryTermId: null,
    termsAndConditions: '',
    otherCharges: 0,
    otherChargesDescription: '',
    taxTreatment: 'INTRA_STATE',
    selectedTaxIds: [],
    pricingNotes: '',
    items: [],
  });

  // Staged Document Attachments & Expandable Product Descriptions
  const [stagedDocuments, setStagedDocuments] = useState([]);
  const [expandedDescIds, setExpandedDescIds] = useState(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revision-Mode Negotiation State
  const [logNegotiationStage, setLogNegotiationStage] = useState(false);
  const [isLoadingNegotiationUsers, setIsLoadingNegotiationUsers] = useState(false);
  const [negotiationStageData, setNegotiationStageData] = useState(() => {
    const now = new Date();
    const defaultDateTime = `${now.toISOString().split('T')[0]}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const loggedUserName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
    return {
      dateTime: defaultDateTime,
      mode: 'Call',
      handledBy: loggedUserName || '',
      clientContact: '',
      ourOffer: '',
      clientCounter: '',
      discussion: '',
    };
  });

  useEffect(() => {
    if (!isRevisionMode || !logNegotiationStage) return undefined;

    let isMounted = true;
    setIsLoadingNegotiationUsers(true);
    ensureAllActiveUsersLoaded()
      .catch((err) => {
        toast.error(err?.message || 'Failed to load users for negotiation.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingNegotiationUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isRevisionMode, logNegotiationStage, ensureAllActiveUsersLoaded]);

  // Drawer & Line Item Builder State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const standardsContext = useStandardsContext?.() || {};
  const { standardsList = [], gradeMapping = [], ensureStandardsLoaded } = standardsContext;

  useEffect(() => {
    ensureStandardsLoaded?.();
  }, [ensureStandardsLoaded]);

  const [drawerCategory, setDrawerCategory] = useState('');
  const [drawerProduct, setDrawerProduct] = useState('');
  const [drawerStandard, setDrawerStandard] = useState('');
  const [drawerGrade, setDrawerGrade] = useState('');
  const [drawerVariant, setDrawerVariant] = useState('');
  const [drawerQty, setDrawerQty] = useState('1');
  const [drawerRate, setDrawerRate] = useState('');
  const [drawerRateSource, setDrawerRateSource] = useState('Manual');
  const [drawerTax, setDrawerTax] = useState(10);
  const [drawerTaxConfigDetailId, setDrawerTaxConfigDetailId] = useState('');
  const [drawerOtherCharges, setDrawerOtherCharges] = useState('0');
  const [drawerOptions, setDrawerOptions] = useState(['Rexine Cover (Standard)']);
  const [drawerDescription, setDrawerDescription] = useState('');
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(false);
  const [inquiryPrefillError, setInquiryPrefillError] = useState(null);

  // 409 Conflict Interception State: Prospect-to-Client Onboarding Bridge
  const [conflictInquiry, setConflictInquiry] = useState(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isQuickClientDrawerOpen, setIsQuickClientDrawerOpen] = useState(false);

  // Dynamic Client Addresses & Contacts State
  const [dynamicClientAddresses, setDynamicClientAddresses] = useState([]);
  const [dynamicClientContacts, setDynamicClientContacts] = useState([]);

  // Dynamic Product Master & Price Lookup State
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productVariantsMap, setProductVariantsMap] = useState({});
  const [productOptionsMap, setProductOptionsMap] = useState({});
  const [productDetailsMap, setProductDetailsMap] = useState({});
  const [isLoadingPriceLookup, setIsLoadingPriceLookup] = useState(false);
  const [priceCandidatesModal, setPriceCandidatesModal] = useState(null);

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
      label: `${inq.InquiryNo} · ${inq.CustomerName || inq.clientName || 'Client'} (${(inq.products || inq.items || inq.lines || inq.inquiryLines || []).length} items)`,
      isQuoted: quotedInquiryNos.has(String(inq.InquiryNo || '').toLowerCase()),
    }));
  }, [inquiries, quotations, id]);

  const inquirySelectOptions = useMemo(() => {
    const opts = [
      { value: '', label: '-- Select an Inquiry --' },
      ...availableInquiries.map((inq) => ({
        value: inq.value,
        label: inq.label,
      })),
    ];
    if (formData.inquiryNo && !opts.some((o) => o.value === formData.inquiryNo)) {
      opts.push({
        value: formData.inquiryNo,
        label: `${formData.inquiryNo} · ${formData.clientName || 'Client'}`,
      });
    }
    return opts;
  }, [availableInquiries, formData.inquiryNo, formData.clientName]);

  // Handle Inquiry Selection (with dynamic API prefill & 409 Interception)
  async function handleSelectInquiry(inquiryNoOrId, newClientOverride = null) {
    setInquiryPrefillError(null);
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

    let inqDetail = matchedInq;
    if (inqId) {
      try {
        const fetched = await inquiryService.getInquiryById(inqId);
        if (fetched) {
          inqDetail = fetched;
        }
      } catch (err) {
        console.warn('Could not fetch inquiry detail fallback:', err);
      }
    }

    // Fetch dynamic prefill from API
    let prefill = null;
    let prefillFailed = false;
    if (inqId && fetchQuotationPrefill) {
      try {
        prefill = await fetchQuotationPrefill(inqId);
        setInquiryPrefillError(null);
      } catch (e) {
        prefillFailed = true;
        console.warn('API fetchQuotationPrefill failed:', e);
        const isNewClient409 =
          e?.status === 409 ||
          e?.response?.status === 409 ||
          e?.message?.toLowerCase().includes('new client');

        if (isNewClient409 && !newClientOverride) {
          // Intercept 409 Conflict with Action Modal instead of a dead-end static error toast
          let conflictObj = inqDetail || matchedInq;
          if ((!conflictObj?.AddressLine1 && !conflictObj?.address1) && inqId) {
            try {
              const fullInq = await inquiryService.getInquiryById(inqId);
              if (fullInq) conflictObj = fullInq;
            } catch (_) {}
          }
          setConflictInquiry(conflictObj || { id: inqId, InquiryNo: inquiryNoOrId });
          setIsConflictModalOpen(true);
          setInquiryPrefillError(null);
          return;
        }

        const errMsg =
          isNewClient409
            ? 'This inquiry was received from a new prospect client. Please register the client in the Clients module before generating a quotation.'
            : e?.message || 'Failed to fetch quotation prefill';
        setInquiryPrefillError(errMsg);
        toast.error(errMsg, { duration: 6000 });
      }
    }

    // Resolve client
    const inqClient =
      newClientOverride ||
      clients.find(
        (c) =>
          (c.companyName || '').toLowerCase() === (prefill?.client?.clientName || inqDetail?.CustomerName || matchedInq?.CustomerName || inqDetail?.companyName || '').toLowerCase() ||
          (c.clientId || c.id) === (prefill?.clientId || prefill?.client?.id || inqDetail?.clientId || matchedInq?.clientId)
      );

    const resolvedClientId =
      newClientOverride?.clientId ||
      newClientOverride?.id ||
      prefill?.clientId ||
      prefill?.client?.id ||
      inqClient?.clientId ||
      inqClient?.id ||
      inqDetail?.clientId ||
      matchedInq?.clientId;

    // Load full client details from GET /api/clients/{id} to get dynamic addresses and contacts
    let clientDetailRes = null;
    if (resolvedClientId) {
      try {
        clientDetailRes = await clientService.getClientById(resolvedClientId);
      } catch (err) {
        console.warn('Failed to load full client detail for inquiry client:', err);
      }
    }

    const availableAddrs =
      clientDetailRes?.currentDetail?.addresses ||
      newClientOverride?.addresses ||
      prefill?.client?.addresses ||
      inqClient?.addresses ||
      [];
    const availableContacts =
      clientDetailRes?.currentDetail?.contacts ||
      newClientOverride?.contacts ||
      prefill?.client?.contacts ||
      inqClient?.contacts ||
      [];

    setDynamicClientAddresses(availableAddrs);
    setDynamicClientContacts(availableContacts);

    const activePrefillAddrs = availableAddrs.filter((a) => a.isActive !== false);
    const prefillAddrObj =
      activePrefillAddrs.find((a) => (a.clientAddressId || a.id) === prefill?.clientAddressId) ||
      activePrefillAddrs[0] ||
      availableAddrs[0];
    const defaultAddrId =
      prefillAddrObj?.clientAddressId ||
      prefillAddrObj?.id ||
      prefill?.clientAddressId ||
      null;
    const defaultAddr = prefillAddrObj
      ? `${prefillAddrObj.addressType ? `${prefillAddrObj.addressType} – ` : ''}${prefillAddrObj.addressLine1 || prefillAddrObj.address1 || prefillAddrObj.address || ''}${prefillAddrObj.city ? `, ${prefillAddrObj.city}` : ''}${prefillAddrObj.pincode || prefillAddrObj.zipCode ? ` ${prefillAddrObj.pincode || prefillAddrObj.zipCode}` : ''}`.trim()
      : inqClient?.addresses?.[0]?.addressLine1 || inqClient?.addresses?.[0]?.address1
      ? `${inqClient.addresses[0].addressLine1 || inqClient.addresses[0].address1}, ${inqClient.addresses[0].city || ''}`
      : inqDetail?.AddressLine1 || matchedInq?.AddressLine1
      ? `${inqDetail?.AddressLine1 || matchedInq?.AddressLine1}, ${inqDetail?.City || matchedInq?.City || ''}`
      : '';

    // Prefer prefill active contact, then inqClient active contact, then matchedInq/inqDetail contact
    const activePrefillContacts = availableContacts.filter((c) => c.isActive !== false);
    const prefillContactObj =
      activePrefillContacts.find((c) => (c.clientContactId || c.id) === prefill?.clientContactId) ||
      activePrefillContacts.find((c) => c.isPrimary) ||
      activePrefillContacts[0] ||
      availableContacts[0];
    const defaultContactId =
      prefillContactObj?.clientContactId ||
      prefillContactObj?.id ||
      prefill?.clientContactId ||
      null;
    const defaultContact = prefillContactObj
      ? `${prefillContactObj.firstName || ''} ${prefillContactObj.lastName || ''}`.trim() || prefillContactObj.name || ''
      : inqClient?.contacts?.[0]?.firstName
      ? `${inqClient.contacts[0].firstName} ${inqClient.contacts[0].lastName || ''}`.trim()
      : inqDetail?.ContactPerson || matchedInq?.ContactPerson || '';

    const defaultContactEmail =
      prefillContactObj?.email ||
      inqDetail?.Email ||
      matchedInq?.Email ||
      inqClient?.officialEmail ||
      inqClient?.email ||
      '';
    const defaultContactPhone =
      prefillContactObj?.phoneNo ||
      prefillContactObj?.mobile1 ||
      prefillContactObj?.phone ||
      inqDetail?.Phone ||
      matchedInq?.Phone ||
      inqClient?.phone ||
      '';

    // Currency from prefill or lookups
    const prefillCurrencyId = prefill?.currencyId || lookups?.defaultCurrencyId || (lookups?.currencies?.find((c) => (c.code || c.currencyCode) === 'INR')?.id || 2);
    const matchedCurrency = lookups?.currencies?.find((c) => c.id === prefillCurrencyId);
    const resolvedCurrency = matchedCurrency?.code || matchedCurrency?.currencyCode || 'INR';

    // Commercial Terms from prefill
    const prefillPaymentTerms = prefill?.paymentTerms
      ? (Array.isArray(prefill.paymentTerms) ? prefill.paymentTerms : [prefill.paymentTerms])
      : (prefill?.paymentTermName ? [prefill.paymentTermName] : null);

    // Map items from prefill or fallback to inquiry items
    let mappedItems = [];
    const rawItems =
      prefill?.lines ||
      prefill?.lineItems ||
      prefill?.items ||
      prefill?.inquiryLines ||
      inqDetail?.products ||
      inqDetail?.items ||
      matchedInq?.products ||
      matchedInq?.items ||
      [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      mappedItems = rawItems.map((it, idx) => {
        const catProd =
          mergedCatalogProducts.find((p) => String(p.id) === String(it.productId) || String(p.productId) === String(it.productId)) || null;
        const inquiryVariantId = it.variantId || it.productVariantId;
        const catVar = catProd?.variants?.find(
          (v) => String(v.id || v.productVariantId) === String(inquiryVariantId)
        );
        const fallbackDesc = catProd ? buildCatalogProductDescription(catProd, catVar) : '';
        return {
          id: it.id || `it-${Date.now()}-${idx}`,
          quotationLineItemId: it.id || null,
          categoryId: it.categoryId || catProd?.categoryId || '',
          productId: it.productId || catProd?.productId || catProd?.id || null,
          productName: it.productName || catProd?.productName || it.itemName || 'Product',
          variantId: it.variantId || it.productVariantId || '',
          variantName: it.variantName || catVar?.variantName || 'Standard Size',
          standards: it.standards || it.standardCode || catVar?.standardCode || catVar?.standardName || '',
          standardCode: it.standardCode || it.standards || catVar?.standardCode || catVar?.standardName || '',
          grade: it.grade || it.gradeCode || catVar?.gradeCode || catVar?.gradeName || '',
          gradeCode: it.gradeCode || it.grade || catVar?.gradeCode || catVar?.gradeName || '',
          itemCode: it.itemCode || it.productCode || catVar?.variantCode || '—',
          flatness: it.flatness ?? it.Flatness ?? '',
          technicalDetails: it.technicalDetails || it.specification || '',
          description: (it.description || it.specification || fallbackDesc || '')
            .replace(/,?\s*undefined\s*,?/g, ', ')
            .replace(/^,\s*|,\s*$/g, '')
            .trim(),
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          rateSource: it.rateSource || 'None',
          priceCandidates: Array.isArray(it.priceCandidates) ? it.priceCandidates : null,
          optionExtras: Number(it.optionExtras) || 0,
          otherCharges: Number(it.otherCharges || it.lineCharges) || 0,
          taxConfigDetailId: it.taxConfigDetailId || null,
          taxPercent: Number(it.taxPercent) || 18,
          options: Array.isArray(it.options) ? it.options : [],
        };
      });
    }

    setFormData((prev) => ({
      ...prev,
      inquiryNo:
        matchedInq?.InquiryNo ||
        inqDetail?.InquiryNo ||
        inqDetail?.inquiryNo ||
        prefill?.inquiryNo ||
        (typeof inquiryNoOrId === 'string' && inquiryNoOrId.startsWith('INQ') ? inquiryNoOrId : prev.inquiryNo),
      inquiryId: inqId,
      clientName:
        newClientOverride?.companyName ||
        prefill?.client?.clientName ||
        inqDetail?.CustomerName ||
        inqDetail?.companyName ||
        inqClient?.companyName ||
        matchedInq?.CustomerName ||
        '',
      clientId: resolvedClientId || '',
      clientAddressId: defaultAddrId,
      clientAddress: defaultAddr,
      clientContactId: defaultContactId,
      contactPerson: defaultContact,
      contactEmail: defaultContactEmail,
      contactPhone: defaultContactPhone,
      currency: resolvedCurrency,
      currencyId: prefillCurrencyId,
      paymentTerms: (prefillPaymentTerms || prev.paymentTerms || []).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
      paymentTermId: prefill?.paymentTermId || prev.paymentTermId,
      deliveryTerms: (prefill?.deliveryTerms
        ? (Array.isArray(prefill.deliveryTerms) ? prefill.deliveryTerms : [prefill.deliveryTerms])
        : prev.deliveryTerms || []).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
      deliveryTermId: prefill?.deliveryTermId || prev.deliveryTermId || null,
      items: mappedItems.length > 0 ? mappedItems : prev.items,
    }));

    if (prefill?.skippedCustomItems?.length > 0) {
      toast(`${prefill.skippedCustomItems.length} custom line item(s) skipped from auto-pricing.`);
    }

    if (!prefillFailed && !newClientOverride) {
      toast.success(`Inquiry ${matchedInq?.InquiryNo || inqDetail?.InquiryNo || inquiryNoOrId} selected · Client & items loaded`);
    }
  }

  // Handlers for Prospect-to-Client Onboarding Bridge
  const handleCancelConflictModal = () => {
    setIsConflictModalOpen(false);
    setConflictInquiry(null);
    setInquiryPrefillError(null);
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
    // Clear URL query parameter cleanly if loaded via ?inquiryId=...
    if (inquiryIdParam) {
      navigate('/quotations/new', { replace: true });
    }
  };

  const handleProceedToOnboard = () => {
    setIsConflictModalOpen(false);
    setIsQuickClientDrawerOpen(true);
  };

  const handleQuickClientSuccess = async (createdClient) => {
    setIsQuickClientDrawerOpen(false);
    const targetInquiry = conflictInquiry;
    const newClientId = createdClient?.clientId || createdClient?.id;
    const newClientName =
      createdClient?.companyName ||
      createdClient?.clientName ||
      targetInquiry?.CustomerName ||
      'Client';

    // Link the newly created client to the inquiry
    if (targetInquiry && targetInquiry.id && updateInquiry) {
      try {
        await updateInquiry(targetInquiry.id, {
          ...targetInquiry,
          isNewClient: false,
          clientId: newClientId,
        });
      } catch (err) {
        console.warn('Could not update inquiry with new clientId:', err);
      }
    }

    // Refresh clients in context
    if (loadClients) {
      await loadClients();
    } else if (ensureClientsLoaded) {
      ensureClientsLoaded();
    }

    // Re-trigger prefill with newly registered client override
    const inqKey = targetInquiry?.InquiryNo || targetInquiry?.id;
    if (inqKey) {
      await handleSelectInquiry(inqKey, createdClient);
    }

    toast.success(
      `Client ${newClientName} registered successfully. Quotation form loaded.`,
      { duration: 5000 }
    );
    setConflictInquiry(null);
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
    fetchInquiries?.();

    // Dynamically load products catalog & categories from backend
    async function loadDynamicCatalog() {
      try {
        const lookupsRes = await productService.getProductLookups().catch(() => null);
        if (Array.isArray(lookupsRes?.categories) && lookupsRes.categories.length > 0) {
          setCatalogCategories(lookupsRes.categories);
        }
        const prodRes = await productService.listProducts({
          approvalStatus: 'Approved',
          isActive: true,
          pageSize: 100,
        }).catch(() => null);
        if (Array.isArray(prodRes?.items) && prodRes.items.length > 0) {
          setCatalogProducts(prodRes.items);
        }
      } catch (err) {
        console.warn('Could not load dynamic products catalog:', err);
      }
    }
    loadDynamicCatalog();
    if (isRevisionMode && targetQuotation) {
      const latestRev =
        targetQuotation.revisions?.[targetQuotation.currentRevision] ||
        targetQuotation.revisions?.[targetQuotation.revisions.length - 1];

      const revItems =
        (latestRev?.items && latestRev.items.length > 0)
          ? latestRev.items
          : (targetQuotation.items || []);

      const resolvedClientId = targetQuotation.clientId || targetQuotation.client?.id || targetQuotation.inquiry?.clientId || null;

      if (resolvedClientId) {
        clientService.getClientById(resolvedClientId).then((res) => {
          const addrs = res?.currentDetail?.addresses || res?.addresses || res?.versions?.[0]?.addresses || [];
          const contacts = res?.currentDetail?.contacts || res?.contacts || res?.versions?.[0]?.contacts || [];
          if (addrs.length > 0) setDynamicClientAddresses(addrs);
          if (contacts.length > 0) setDynamicClientContacts(contacts);
        }).catch((e) => console.warn('Could not load client details for revision:', e));
      }

      setFormData({
        quotationNo: targetQuotation.quotationNo,
        inquiryNo: targetQuotation.inquiryNo,
        inquiryId: targetQuotation.inquiryId,
        revisionNo: isEditingExistingDraft
          ? Number(targetQuotation.currentRevision) || 0
          : (targetQuotation.revisions?.length || (Number(targetQuotation.currentRevision) + 1) || 1),
        revisionDate: isEditingExistingDraft
          ? String(latestRev?.revisionDate || targetQuotation.revisionDate || getTodayISO()).slice(0, 10)
          : getTodayISO(),
        revisionReason: '',
        clientName: targetQuotation.clientName || targetQuotation.client?.companyName || '',
        clientId: resolvedClientId,
        clientAddress: targetQuotation.clientAddress || '',
        clientAddressId: targetQuotation.clientAddressId || null,
        contactPerson: targetQuotation.contactPerson || '',
        clientContactId: targetQuotation.clientContactId || null,
        contactEmail: targetQuotation.contactEmail || '',
        contactPhone: targetQuotation.contactPhone || '',
        currency: targetQuotation.currency || 'INR',
        currencyId: targetQuotation.currencyId || 2,
        validUntil: targetQuotation.validUntil || '',
        paymentTermId: targetQuotation.paymentTermId || latestRev?.paymentTermId || null,
        deliveryTermId: targetQuotation.deliveryTermId || latestRev?.deliveryTermId || null,
        paymentTerms: (Array.isArray(targetQuotation.paymentTerms)
          ? targetQuotation.paymentTerms
          : (targetQuotation.paymentTerms ? [targetQuotation.paymentTerms] : [])).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
        deliveryTerms: (Array.isArray(targetQuotation.deliveryTerms)
          ? targetQuotation.deliveryTerms
          : (targetQuotation.deliveryTerms ? [targetQuotation.deliveryTerms] : [])).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
        termsAndConditions: targetQuotation.termsAndConditions || '',
        taxTreatment: targetQuotation.taxTreatment || 'INTRA_STATE',
        selectedTaxIds: (targetQuotation.taxes || latestRev?.taxes || [])
          .map((t) => Number(t.taxConfigDetailId || t.id || t))
          .filter(Boolean),
        pricingNotes: targetQuotation.pricingNotes || targetQuotation.remarks || '',
        items: revItems.map((it, idx) => ({ ...it, id: it.id || `it-${Date.now()}-${idx}` })),
      });

      const loggedUserName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || '';
      setNegotiationStageData((prev) => ({
        ...prev,
        handledBy: userOptions[0]?.value || prev.handledBy || loggedUserName || '',
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

      // If inquiryId was passed in query parameter or route state, preselect it
      const targetInquiryId = inquiryIdParam || location.state?.inquiryId;
      if (targetInquiryId) {
        handleSelectInquiry(targetInquiryId);
      }
    }
  }, [isRevisionMode, targetQuotation, getNextQuotationNo, inquiryIdParam, location.state]);

  // Merged dynamic & fallback catalog products
  const mergedCatalogProducts = useMemo(() => {
    if (Array.isArray(catalogProducts) && catalogProducts.length > 0) {
      return catalogProducts.map((p) => ({
        ...p,
        id: String(p.id || p.productId),
        productId: p.id || p.productId,
        categoryId: String(p.categoryId || ''),
        categoryName: p.categoryName || '',
        productName: p.productName || p.name || 'Product',
        productCode: p.productCode || p.code || 'PRD',
        description: p.description || '',
        standardInfo: p.standardInfo || p.standardCode || '',
        materialName: p.materialName || '',
        finishType: p.finishType || '',
        variants: Array.isArray(p.variants) ? p.variants : [],
        options: Array.isArray(p.options) ? p.options : [],
      }));
    }
    return [];
  }, [catalogProducts]);

  // Catalog Options (Dynamic categories from Product Master API)
  const categoryOptions = useMemo(() => {
    if (Array.isArray(catalogCategories) && catalogCategories.length > 0) {
      return catalogCategories.map((cat) => ({
        value: String(cat.id || cat.categoryId || cat.value),
        label: cat.categoryName || cat.name || cat.label,
      }));
    }
    return [];
  }, [catalogCategories]);

  // Dynamic Product Options (filtered by Category)
  const productOptions = useMemo(() => {
    let list = mergedCatalogProducts;
    if (drawerCategory) {
      const selectedCat = categoryOptions.find((c) => String(c.value) === String(drawerCategory));
      const selectedLabel = (selectedCat ? selectedCat.label : '').toLowerCase();
      const filterVal = String(drawerCategory).toLowerCase();

      list = list.filter((p) => {
        const pCatId = String(p.categoryId || '').toLowerCase();
        const pCatName = String(p.categoryName || '').toLowerCase();
        return (
          pCatId === filterVal ||
          (selectedLabel && pCatName === selectedLabel) ||
          pCatName === filterVal ||
          String(p.id) === String(drawerProduct)
        );
      });
    }

    return list.map((p) => ({
      value: String(p.id),
      label: `${p.productCode} · ${p.productName}`,
    }));
  }, [drawerCategory, mergedCatalogProducts, categoryOptions, drawerProduct]);

  const activeProductObj = useMemo(() => {
    const base = mergedCatalogProducts.find((p) => String(p.id) === String(drawerProduct)) || null;
    const details = productDetailsMap[drawerProduct];
    if (!base && !details) return null;
    return {
      ...(base || {}),
      ...(details || {}),
    };
  }, [drawerProduct, mergedCatalogProducts, productDetailsMap]);

  // Dynamically load product variants, options, and full details from Product APIs when product changes
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
          // Prioritize dynamic options from GET /api/product-options, fallback to detailRes.options
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

  // Dynamic Variant Options
  const variantOptions = useMemo(() => {
    const dynamicVars = productVariantsMap[drawerProduct];
    if (Array.isArray(dynamicVars) && dynamicVars.length > 0) {
      return dynamicVars.map((v) => ({
        value: String(v.id || v.productVariantId),
        label: `${v.variantName || v.name || v.variantCode || 'Variant'} (${v.variantCode || v.itemCode || 'ITM'})`,
        variantObj: v,
      }));
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

  const effectiveDrawerStandard =
    drawerStandard ||
    activeVariantObj?.standardCode ||
    activeVariantObj?.standardName ||
    activeProductObj?.primaryStandard ||
    activeProductObj?.primaryStandardCode ||
    activeProductObj?.standards?.[0]?.standardCode ||
    '';
  const effectiveDrawerGrade =
    drawerGrade || activeVariantObj?.gradeCode || activeVariantObj?.gradeName || activeVariantObj?.grade || '';

  // Standard Options for Quotation Drawer
  const drawerStandardOptions = useMemo(() => {
    let options = [];
    if (activeProductObj?.supportedStandards && Array.isArray(activeProductObj.supportedStandards) && activeProductObj.supportedStandards.length > 0) {
      options = activeProductObj.supportedStandards.map((s) => ({ value: s, label: s }));
    } else if (activeProductObj?.standards && Array.isArray(activeProductObj.standards) && activeProductObj.standards.length > 0) {
      options = activeProductObj.standards.map((s) => ({
        value: s.standardCode || String(s.standardId || s.id),
        label: s.standardCode || `Standard #${s.standardId || s.id}`,
      }));
    } else if (Array.isArray(standardsList) && standardsList.length > 0) {
      options = standardsList.filter((s) => s.isActive !== false).map((s) => ({
        value: s.standardCode || String(s.id),
        label: s.description ? `${s.standardCode} (${s.description})` : s.standardCode,
      }));
    }
    if (effectiveDrawerStandard && !options.some((option) => String(option.value) === String(effectiveDrawerStandard))) {
      options.push({ value: effectiveDrawerStandard, label: effectiveDrawerStandard });
    }
    return options;
  }, [activeProductObj, standardsList, effectiveDrawerStandard]);

  // Grade Options filtered strictly by drawerStandard
  const drawerGradeOptions = useMemo(() => {
    const curStd = String(effectiveDrawerStandard || '').trim();
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

    const stdUpper = curStd.toUpperCase();
    if (stdUpper.includes('GGG') || stdUpper.includes('ASME') || stdUpper.includes('463')) {
      return [
        { value: 'Grade AA', label: 'Grade AA · Precision Laboratory' },
        { value: 'Grade A', label: 'Grade A · Standard Inspection' },
        { value: 'Grade B', label: 'Grade B · Tool Room / Shop' },
      ];
    }
    if (stdUpper.includes('DIN')) {
      return [
        { value: 'Grade 00', label: 'Grade 00 · High Precision Laboratory' },
        { value: 'Grade 0', label: 'Grade 0 · Metrology & Inspection' },
        { value: 'Grade 1', label: 'Grade 1 · Workshop / Production' },
        { value: 'Grade 2', label: 'Grade 2 · Toolroom General' },
        { value: 'Grade 3', label: 'Grade 3 · Heavy Workshop' },
      ];
    }
    return [];
  }, [effectiveDrawerStandard, gradeMapping]);

  const selectedDrawerGrade = useMemo(() => {
    const normalizedGrade = normalizeGradeCode(effectiveDrawerGrade);
    const matchedOption = drawerGradeOptions.find(
      (option) => normalizeGradeCode(option.value) === normalizedGrade
    );
    return matchedOption?.value || effectiveDrawerGrade;
  }, [drawerGradeOptions, effectiveDrawerGrade]);

  const drawerGradeOptionsWithCurrent = useMemo(() => {
    if (!effectiveDrawerGrade || drawerGradeOptions.some(
      (option) => normalizeGradeCode(option.value) === normalizeGradeCode(effectiveDrawerGrade)
    )) {
      return drawerGradeOptions;
    }
    return [...drawerGradeOptions, { value: effectiveDrawerGrade, label: effectiveDrawerGrade }];
  }, [drawerGradeOptions, effectiveDrawerGrade]);

  // Parse dimensions from variant
  const parseDimsFromQuotationVariant = useCallback((v) => {
    if (!v) return { length: 0, width: 0 };
    if (v.lengthMm) return { length: Number(v.lengthMm), width: Number(v.widthMm || 0) };
    const str = v.size || v.variantName || v.itemCode || v.variantCode || '';
    const m = String(str).match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (m) return { length: Number(m[1]), width: Number(m[2]) };
    const single = String(str).match(/(\d{3,4})/);
    return single ? { length: Number(single[1]), width: 0 } : { length: 0, width: 0 };
  }, []);

  // Dynamically calculate flatness for drawer
  const drawerCalculatedFlatness = useMemo(() => {
    if (!activeVariantObj || !effectiveDrawerStandard || !effectiveDrawerGrade) return '—';
    const dims = parseDimsFromQuotationVariant(activeVariantObj);
    if (!dims.length) return '—';
    try {
      const res = calculateFlatnessTolerance(dims.length, dims.width, effectiveDrawerStandard, effectiveDrawerGrade);
      if (res && res.isSupported && res.valueMicrons !== undefined) {
        return `${res.valueMicrons} µm`;
      }
    } catch {
      // ignore
    }
    return '—';
  }, [activeVariantObj, effectiveDrawerStandard, effectiveDrawerGrade, parseDimsFromQuotationVariant]);

  // Dynamically calculate item code
  const drawerCalculatedItemCode = useMemo(() => {
    if (!activeVariantObj && !activeProductObj) return 'Auto-generated';
    const baseCode = activeVariantObj?.variantCode || activeVariantObj?.itemCode || activeProductObj?.productCode || activeProductObj?.itemCodePrefix || 'ITM';
    if (effectiveDrawerGrade) {
      const normGrd = normalizeGradeCode(effectiveDrawerGrade) || '0';
      return `${baseCode}-GR${normGrd}`;
    }
    return baseCode;
  }, [activeVariantObj, activeProductObj, effectiveDrawerGrade]);

  // Dynamic Product Options & Accessories with pricing from backend
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
    return CATALOG_OPTIONS.map((name) => ({
      id: null,
      name,
      isStandard: name.includes('Standard'),
      unitPrice: 0,
    }));
  }, [drawerProduct, productOptionsMap]);

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
      { value: 'INR', label: 'INR (₹ - Indian Rupee)', id: 2 },
      { value: 'USD', label: 'USD ($ - US Dollar)', id: 1 },
      { value: 'EUR', label: 'EUR (€ - Euro)', id: 3 },
      { value: 'GBP', label: 'GBP (£ - British Pound)', id: 4 },
    ];
  }, [lookups?.currencies]);

  // Dynamic Tax Lookup normalized list
  const taxLookupList = useMemo(() => {
    if (Array.isArray(lookups?.taxes) && lookups.taxes.length > 0) {
      return lookups.taxes.map((t) => ({
        id: t.taxConfigDetailId || t.id,
        taxConfigDetailId: t.taxConfigDetailId || t.id,
        taxName: t.taxName || t.name || 'GST',
        taxPercent: Number(t.taxPercent ?? t.rate ?? 0),
        effectiveDate: t.effectiveDate,
      }));
    }
    return [
      { id: 38, taxConfigDetailId: 38, taxName: 'CGST', taxPercent: 10 },
      { id: 37, taxConfigDetailId: 37, taxName: 'SGST', taxPercent: 10 },
      { id: 39, taxConfigDetailId: 39, taxName: 'IGST', taxPercent: 20 },
    ];
  }, [lookups?.taxes]);

  // Multi-Select options for Applicable Taxes in Commercial Treatment card (Option 2)
  const applicableTaxSelectOptions = useMemo(() => {
    return taxLookupList.map((t) => ({
      value: t.taxConfigDetailId,
      label: `${t.taxName} (${t.taxPercent}%)`,
      chipLabel: `${t.taxName} ${t.taxPercent}%`,
    }));
  }, [taxLookupList]);

  // Single-Select options for product line item in Drawer (user only selects 1 tax per product)
  const singleProductTaxOptions = useMemo(() => {
    return [
      { value: '0', label: 'None / 0% Tax (Exempt)', taxPercent: 0, taxConfigDetailId: null, taxName: 'Exempt' },
      ...taxLookupList.map((t) => ({
        value: String(t.taxConfigDetailId),
        label: `${t.taxName} (${t.taxPercent}%)`,
        taxPercent: t.taxPercent,
        taxConfigDetailId: t.taxConfigDetailId,
        taxName: t.taxName,
      })),
    ];
  }, [taxLookupList]);

  // Selected tax objects for Quotation level calculations
  const selectedTaxObjects = useMemo(() => {
    const ids = new Set((formData.selectedTaxIds || []).map(Number));
    return taxLookupList.filter((t) => ids.has(Number(t.taxConfigDetailId)));
  }, [formData.selectedTaxIds, taxLookupList]);

  // Backward-compatible taxSlabOptions for any legacy references
  const taxSlabOptions = useMemo(() => {
    return singleProductTaxOptions.map((t) => ({
      value: String(t.taxPercent),
      label: t.label,
      rate: t.taxPercent,
      id: t.taxConfigDetailId,
    }));
  }, [singleProductTaxOptions]);

  // Tax Treatment Options
  const taxTreatmentOptions = useMemo(() => {
    return [];
  }, []);

  // Client Selection Options (filtered for active clients only)
  const clientSelectOptions = useMemo(() => {
    const activeClients = clients.filter(
      (c) =>
        (c.isActive !== false && c.accountStatus !== 'Inactive') ||
        (formData.clientId && (c.clientId === formData.clientId || c.id === formData.clientId))
    );
    return [
      { value: '', label: '-- Select Client Company --' },
      ...activeClients.map((c) => ({
        value: c.clientId || c.id,
        label: `${c.companyName || 'Unnamed Client'}${c.clientCode ? ` (${c.clientCode})` : ''}`,
      })),
    ];
  }, [clients, formData.clientId]);

  const handleSelectClient = async (selectedClientId) => {
    if (!selectedClientId) {
      setFormData((prev) => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientAddress: '',
        clientAddressId: null,
        contactPerson: '',
        clientContactId: null,
        contactEmail: '',
        contactPhone: '',
      }));
      setDynamicClientAddresses([]);
      setDynamicClientContacts([]);
      return;
    }

    const client = clients.find(
      (c) =>
        (c.clientId && String(c.clientId) === String(selectedClientId)) ||
        (c.id && String(c.id) === String(selectedClientId)) ||
        c.companyName === selectedClientId
    );

    const clientIdNum = client?.clientId || client?.id || selectedClientId;

    // Fetch full client details from GET /api/clients/{id} to get dynamic addresses and contacts
    let detail = null;
    try {
      detail = await clientService.getClientById(clientIdNum);
    } catch (err) {
      console.warn('Failed to fetch client detail:', err);
    }

    const rawAddresses = detail?.currentDetail?.addresses || client?.addresses || [];
    const rawContacts = detail?.currentDetail?.contacts || client?.contacts || [];

    setDynamicClientAddresses(rawAddresses);
    setDynamicClientContacts(rawContacts);

    const activeAddresses = rawAddresses.filter((a) => a.isActive !== false);
    const activeContacts = rawContacts.filter((c) => c.isActive !== false);

    const firstAddr = activeAddresses[0] || rawAddresses[0];
    const defaultAddr = firstAddr
      ? `${firstAddr.addressType ? `${firstAddr.addressType} – ` : ''}${firstAddr.addressLine1 || firstAddr.address || ''}${firstAddr.city ? `, ${firstAddr.city}` : ''}${firstAddr.pincode ? ` ${firstAddr.pincode}` : ''}`.trim()
      : client?.address || '';

    const firstContact = activeContacts.find((c) => c.isPrimary) || activeContacts[0] || rawContacts[0];
    const defaultContact = firstContact
      ? `${firstContact.firstName || ''} ${firstContact.lastName || ''}`.trim()
      : client?.primaryContactName || client?.contactPerson || '';

    setFormData((prev) => ({
      ...prev,
      clientId: clientIdNum,
      clientName: client?.companyName || client?.clientName || detail?.companyName || '',
      clientAddressId: firstAddr?.clientAddressId || firstAddr?.id || firstAddr?.addressId || null,
      clientAddress: defaultAddr,
      clientContactId: firstContact?.clientContactId || firstContact?.id || null,
      contactPerson: defaultContact,
      contactEmail: firstContact?.email || client?.email || '',
      contactPhone: firstContact?.mobile1 || firstContact?.phoneNo || client?.phone || '',
    }));

    toast.success(`Client ${client?.companyName || client?.clientName || 'selected'} selected`);
  };

  // Load dynamic client addresses and contacts whenever clientId is present
  useEffect(() => {
    if (!formData.clientId) return;
    let isMounted = true;
    async function loadClientData() {
      try {
        const detail = await clientService.getClientById(formData.clientId);
        if (isMounted && detail) {
          const addrs = detail.currentDetail?.addresses || detail.addresses || detail.versions?.[0]?.addresses || [];
          const cnts = detail.currentDetail?.contacts || detail.contacts || detail.versions?.[0]?.contacts || [];
          if (addrs.length > 0) setDynamicClientAddresses(addrs);
          if (cnts.length > 0) setDynamicClientContacts(cnts);
        }
      } catch (err) {
        console.warn('Failed to load client details for quotation form:', err);
      }
    }
    loadClientData();
    return () => { isMounted = false; };
  }, [formData.clientId]);

  // Client Address & Contact Dropdown Options (dynamic from client details API)
  const matchedClient = useMemo(() => {
    return clients.find(
      (c) =>
        (formData.clientId && (c.clientId === formData.clientId || c.id === formData.clientId)) ||
        (formData.clientName && (c.companyName || '').toLowerCase() === formData.clientName.toLowerCase())
    );
  }, [clients, formData.clientId, formData.clientName]);

  const clientAddressOptions = useMemo(() => {
    const rawAddrs = dynamicClientAddresses.length > 0
      ? dynamicClientAddresses
      : (matchedClient?.addresses || []);

    const addresses = rawAddrs.filter(
      (addr) =>
        addr.isActive !== false ||
        (formData.clientAddressId && (addr.id === formData.clientAddressId || addr.clientAddressId === formData.clientAddressId || addr.addressId === formData.clientAddressId))
    );

    if (addresses.length === 0) {
      if (!formData.clientAddress) return [];
      return [{
        value: formData.clientAddress,
        label: formData.clientAddress,
        id: formData.clientAddressId || null,
      }];
    }
    return addresses.map((addr) => {
      const typeLabel = addr.addressType || addr.addressLabel || 'Address';
      const parts = [
        addr.addressLine1 || addr.address1 || addr.address,
        addr.addressLine2 || addr.address2,
        addr.city,
        addr.pincode || addr.zipCode,
      ].filter(Boolean);
      const text = `${typeLabel} – ${parts.join(', ')}`;
      return {
        value: text,
        label: text,
        id: addr.clientAddressId || addr.id || addr.addressId || null,
        addressObj: addr,
      };
    });
  }, [dynamicClientAddresses, matchedClient, formData.clientAddress, formData.clientAddressId]);

  const clientContactOptions = useMemo(() => {
    const rawContacts = dynamicClientContacts.length > 0
      ? dynamicClientContacts
      : (matchedClient?.contacts || []);

    const contacts = rawContacts.filter(
      (c) =>
        c.isActive !== false ||
        (formData.clientContactId && (c.id === formData.clientContactId || c.clientContactId === formData.clientContactId))
    );

    if (contacts.length === 0) {
      if (!formData.contactPerson) return [];
      return [{
        value: formData.contactPerson,
        label: formData.contactPerson,
        id: formData.clientContactId || null,
        email: formData.contactEmail || '',
        phone: formData.contactPhone || '',
      }];
    }
    return contacts.map((c) => {
      const nameParts = [c.firstName, c.lastName].filter(Boolean).join(' ');
      const fullName = (c.salutation ? `${c.salutation} ` : '') + (nameParts || c.name || 'Contact');
      const desig = c.designation || c.department ? ` (${[c.designation, c.department].filter(Boolean).join(' - ')})` : '';
      return {
        value: fullName,
        label: `${fullName}${desig}${c.isPrimary ? ' (Primary)' : ''}`,
        id: c.clientContactId || c.id || null,
        email: c.email || '',
        phone: c.mobile1 || c.phoneNo || c.phone || '',
        contactObj: c,
      };
    });
  }, [dynamicClientContacts, matchedClient, formData.contactPerson, formData.clientContactId, formData.contactEmail, formData.contactPhone]);

  const selectedAddrValue = useMemo(() => {
    if (clientAddressOptions.some((opt) => opt.value === formData.clientAddress)) {
      return formData.clientAddress;
    }
    const matchedById = clientAddressOptions.find(
      (opt) => opt.id && formData.clientAddressId && String(opt.id) === String(formData.clientAddressId)
    );
    return matchedById ? matchedById.value : (formData.clientAddress || '');
  }, [clientAddressOptions, formData.clientAddress, formData.clientAddressId]);

  const selectedContactValue = useMemo(() => {
    if (clientContactOptions.some((opt) => opt.value === formData.contactPerson)) {
      return formData.contactPerson;
    }
    const matchedById = clientContactOptions.find(
      (opt) => opt.id && formData.clientContactId && String(opt.id) === String(formData.clientContactId)
    );
    return matchedById ? matchedById.value : (formData.contactPerson || '');
  }, [clientContactOptions, formData.contactPerson, formData.clientContactId]);

  // Real-time Totals Calculation with dynamic multiple taxes & header otherCharges
  const totals = useMemo(() => {
    return calculateQuotationTotals(
      formData.items,
      formData.taxTreatment,
      selectedTaxObjects,
      formData.otherCharges
    );
  }, [formData.items, formData.taxTreatment, selectedTaxObjects, formData.otherCharges]);

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

  // Open Drawer for Add Product (User only selects one tax per product)
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
    const defaultTax = singleProductTaxOptions[1] || singleProductTaxOptions[0];
    setDrawerTax(defaultTax?.taxPercent ?? 10);
    setDrawerTaxConfigDetailId(defaultTax?.taxConfigDetailId ? String(defaultTax.taxConfigDetailId) : (defaultTax?.value || ''));
    setDrawerOtherCharges('0');
    setDrawerOptions([]);
    setDrawerDescription('');
    setIsDescriptionEdited(false);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit Product
  const handleStartEditItem = (item, index) => {
    setEditingIndex(index);

    // 1. Locate product in merged catalog products
    const prod =
      mergedCatalogProducts.find(
        (p) =>
          String(p.id) === String(item.productId || item.ProductId) ||
          (p.productName && item.productName && p.productName.toLowerCase() === item.productName.toLowerCase()) ||
          (p.productCode && item.productCode && p.productCode.toLowerCase() === item.productCode.toLowerCase())
      ) || null;

    const resolvedCategoryId = String(item.categoryId || item.CategoryId || prod?.categoryId || '');
    const resolvedProductId = String(item.productId || item.ProductId || prod?.id || '');

    // 2. Resolve Standard: from item, from description (e.g. "IS-2063-2002"), or from product's primary standard
    let resolvedStandard = item.standards || item.standardCode || item.StandardCode || '';
    if (!resolvedStandard) {
      const desc = item.description || item.technicalDetails || '';
      const stdMatch = desc.match(/\b(IS-[0-9]+(?:-[0-9]+)?|DIN-[0-9]+|BS-[0-9]+|US-Fed[^\s,\)]+)/i);
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

    // 3. Resolve Grade: from item, from description (e.g. "Grade 0"), or product default
    let resolvedGrade = item.grade || item.gradeCode || item.GradeCode || '';
    if (!resolvedGrade) {
      const desc = item.description || item.technicalDetails || '';
      const gradeMatch = desc.match(/\b(Grade\s+[0-9A-Za-z]+|Gr-[0-9A-Za-z]+)/i);
      if (gradeMatch) {
        resolvedGrade = gradeMatch[1];
      } else if (resolvedStandard) {
        resolvedGrade = resolvedStandard.toUpperCase().includes('GGG') ? 'Grade AA' : 'Grade 0';
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
    let resolvedTaxPercent = item.taxPercent !== undefined ? Number(item.taxPercent) : 18;
    if ((!resolvedTaxDetailId || resolvedTaxDetailId === '0') && resolvedTaxPercent > 0 && Array.isArray(singleProductTaxOptions)) {
      const matchedTax = singleProductTaxOptions.find((t) => Number(t.taxPercent) === resolvedTaxPercent);
      if (matchedTax) {
        resolvedTaxDetailId = String(matchedTax.taxConfigDetailId || matchedTax.value);
        resolvedTaxPercent = matchedTax.taxPercent;
      }
    }

    setDrawerCategory(resolvedCategoryId);
    setDrawerProduct(resolvedProductId);
    setDrawerStandard(resolvedStandard);
    setDrawerGrade(resolvedGrade);
    setDrawerVariant(resolvedVariant);
    setDrawerQty(String(item.quantity || 1));
    setDrawerRate(String(item.rate || 0));
    setDrawerRateSource(item.rateSource || 'Manual');
    setDrawerTax(resolvedTaxPercent);
    setDrawerTaxConfigDetailId(resolvedTaxDetailId || (resolvedTaxPercent === 0 ? '0' : ''));
    setDrawerOtherCharges(String(item.otherCharges || 0));
    setDrawerOptions(Array.isArray(item.options) ? item.options : ['Rexine Cover (Standard)']);
    const existingDesc = item.description ?? item.technicalDetails ?? '';
    setDrawerDescription(existingDesc);
    setIsDescriptionEdited(Boolean(item.description));
    setIsDrawerOpen(true);
  };

  // Handle Drawer Product / Standard / Grade / Variant Selection
  const handleDrawerProductChange = (prodId) => {
    setDrawerProduct(prodId);
    setDrawerVariant('');
    const prod =
      mergedCatalogProducts.find((p) => String(p.id) === String(prodId)) || null;
    if (prod && !drawerCategory && prod.categoryId) {
      setDrawerCategory(String(prod.categoryId));
    }
    const std = prod?.primaryStandard || (prod?.standards && prod.standards[0]?.standardCode) || prod?.primaryStandardCode || (prod?.supportedStandards && prod.supportedStandards[0]) || 'IS-7327-2003';
    const grd = String(std).toUpperCase().includes('GGG') ? 'Grade AA' : 'Grade 0';
    setDrawerStandard(std);
    setDrawerGrade(grd);
    const details = productDetailsMap[prodId];
    const fullDesc = details?.description || prod?.description || (prod ? buildCatalogProductDescription(prod, null) : '');
    if (!isDescriptionEdited) {
      setDrawerDescription(fullDesc);
    }
  };

  const handleDrawerStandardChange = (std) => {
    setDrawerStandard(std);
    let nextGrade = drawerGrade || 'Grade 0';
    const stdUpper = String(std).toUpperCase();
    if (stdUpper.includes('GGG') || stdUpper.includes('ASME')) {
      if (!nextGrade.includes('AA') && !nextGrade.includes('A') && !nextGrade.includes('B')) {
        nextGrade = 'Grade AA';
      }
    } else {
      if (nextGrade.includes('AA') || nextGrade.includes('A') || nextGrade.includes('B')) {
        nextGrade = 'Grade 0';
      }
    }
    setDrawerGrade(nextGrade);
    if (!isDescriptionEdited && activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        activeVariantObj?.variantName || activeVariantObj?.size ? `Size: ${activeVariantObj?.variantName || activeVariantObj?.size}` : null,
        `${nextGrade} (${std})`,
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
        `${grd} (${drawerStandard || 'Standard'})`,
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
        drawerGrade ? `${drawerGrade} (${drawerStandard || 'Standard'})` : null,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
  };

  const handleResetDrawerDescription = () => {
    if (activeProductObj) {
      const baseDesc = activeProductObj.description || activeProductObj.productName || '';
      const variantSpecs = [
        activeVariantObj?.variantName || activeVariantObj?.size ? `Size: ${activeVariantObj?.variantName || activeVariantObj?.size}` : null,
        drawerGrade ? `${drawerGrade} (${drawerStandard || 'Standard'})` : null,
      ].filter(Boolean).join(' · ');
      setDrawerDescription(variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc);
    }
    setIsDescriptionEdited(false);
  };

  // Toggle Catalog Option
  const handleToggleOption = (opt) => {
    setDrawerOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  // "Use list price" Action calling GET /api/product-prices/lookup (ProductPriceList.md § 2.8 & § 3.5)
  const handleLookupListPrice = async () => {
    if (!drawerProduct) {
      toast.error('Please select a product first.');
      return;
    }

    setIsLoadingPriceLookup(true);
    try {
      const resolvedCurrencyId = formData.currencyId 
        || currencyOptions.find((c) => c.value === formData.currency)?.id 
        || 2;
      const selectedOptIds = availableDrawerOptions
        .filter((opt) => drawerOptions.includes(opt.name))
        .map((opt) => opt.id)
        .filter(Boolean);

      const res = await productService.lookupProductPrice({
        productId: activeProductObj?.productId || drawerProduct,
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
        setPriceCandidatesModal({
          candidates: res.candidates,
          optionExtras: res.optionExtras || 0,
          targetItemIndex: null, // Drawer
        });
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

  const handleSelectCandidatePrice = (cand, optionExtras = 0, targetIndex = null) => {
    const finalRate = (Number(cand.unitPrice) || 0) + (Number(optionExtras) || 0);
    const configTag = [
      cand.standardCode ? `Standard: ${cand.standardCode}` : null,
      cand.gradeCode ? `Grade: ${cand.gradeCode}` : null,
    ].filter(Boolean).join(' · ');

    if (targetIndex === null) {
      setDrawerRate(String(finalRate));
      setDrawerRateSource('ListPrice');
      if (configTag) {
        setDrawerDescription((prev) => {
          if (!prev) return configTag;
          if (cand.standardCode && prev.includes(cand.standardCode) && cand.gradeCode && prev.includes(cand.gradeCode)) {
            return prev;
          }
          return `${prev.trim()}\n${configTag}`;
        });
      }
      toast.success(`Applied ${cand.standardCode || ''} ${cand.gradeCode || ''}: ${formatCurrency(finalRate, formData.currency)}`);
    } else {
      setFormData((prev) => {
        const next = [...prev.items];
        if (next[targetIndex]) {
          const currentDesc = next[targetIndex].description || '';
          const updatedDesc = configTag && (!currentDesc.includes(cand.standardCode) || (cand.gradeCode && !currentDesc.includes(cand.gradeCode)))
            ? (currentDesc ? `${currentDesc.trim()}\n${configTag}` : configTag)
            : currentDesc;

          next[targetIndex] = {
            ...next[targetIndex],
            rate: finalRate,
            rateSource: 'ListPrice',
            priceCandidates: null,
            standardCode: cand.standardCode || next[targetIndex].standardCode,
            gradeCode: cand.gradeCode || next[targetIndex].gradeCode,
            standardId: cand.standardId || next[targetIndex].standardId,
            gradeId: cand.gradeId || next[targetIndex].gradeId,
            description: updatedDesc,
          };
        }
        return { ...prev, items: next };
      });
      toast.success(`List price applied to line #${targetIndex + 1}: ${formatCurrency(finalRate, formData.currency)}`);
    }
    setPriceCandidatesModal(null);
  };

  // Save Product from Drawer (Ensuring single tax per product)
  const handleSaveProductFromDrawer = () => {
    if (!drawerProduct) {
      toast.error('Please select a product first.');
      return;
    }

    const parsedRate = Number(drawerRate);
    if (!drawerRate || isNaN(parsedRate) || parsedRate <= 0) {
      toast.error('Unit Rate is compulsory and must be greater than 0.');
      return;
    }

    const defaultDesc = buildCatalogProductDescription(activeProductObj, activeVariantObj);
    const matchedTaxObj = singleProductTaxOptions.find(
      (o) => String(o.value) === String(drawerTaxConfigDetailId) || (o.taxConfigDetailId && String(o.taxConfigDetailId) === String(drawerTaxConfigDetailId))
    );
    const taxConfigDetailId = matchedTaxObj?.taxConfigDetailId || (drawerTaxConfigDetailId && drawerTaxConfigDetailId !== '0' ? Number(drawerTaxConfigDetailId) : null);
    const taxPercent = matchedTaxObj ? matchedTaxObj.taxPercent : (Number(drawerTax) || 0);

    const payload = {
      categoryId: drawerCategory || activeProductObj?.categoryId || 'cat-sp',
      productId: activeProductObj?.productId || activeProductObj?.id || 'prod-custom',
      productName: activeProductObj?.productName || 'Custom Product',
      variantId: activeVariantObj?.id || activeVariantObj?.productVariantId || '',
      variantName: activeVariantObj?.variantName || activeVariantObj?.name || 'Standard Variant',
      standards: effectiveDrawerStandard,
      standardCode: effectiveDrawerStandard,
      grade: effectiveDrawerGrade,
      gradeCode: effectiveDrawerGrade,
      flatness: drawerCalculatedFlatness !== '—'
        ? drawerCalculatedFlatness
        : (editingIndex !== null ? formData.items[editingIndex]?.flatness || '' : ''),
      itemCode: drawerCalculatedItemCode !== 'Auto-generated' ? drawerCalculatedItemCode : (activeVariantObj?.variantCode || activeVariantObj?.itemCode || activeProductObj?.productCode || activeProductObj?.itemCodePrefix || 'ITM-01'),
      technicalDetails: activeVariantObj?.technicalDetails || activeProductObj?.standardInfo || '',
      description: drawerDescription.trim() || defaultDesc,
      quantity: Math.max(1, Number(drawerQty) || 1),
      rate: Number(drawerRate) || 0,
      rateSource: drawerRateSource,
      otherCharges: Number(drawerOtherCharges) || 0,
      taxPercent,
      taxConfigDetailId,
      taxName: matchedTaxObj?.taxName || (taxPercent > 0 ? 'GST' : 'Exempt'),
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
    if (isRevisionMode && isTargetPoReceived) {
      toast.error('A Customer PO has already been received for this quotation. It cannot be revised.');
      return;
    }

    // 1. Revision Mode Validations
    if (isRevisionMode) {
      if (!formData.revisionDate) {
        scrollToField('field-revision-date', 'Revision Date is required.');
        return;
      }
      if (!isEditingExistingDraft && !formData.revisionReason?.trim()) {
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

    let revisionCreated = revisionCreatedInSession;
    try {
      setIsSubmitting(true);

      const resolvedAddressId = formData.clientAddressId || clientAddressOptions[0]?.id || null;
      const resolvedContactId = formData.clientContactId || clientContactOptions[0]?.id || null;
      const resolvedCurrencyId = formData.currencyId || currencyOptions.find((c) => c.value === formData.currency)?.id || 1;

      // Send only quotation tax grid taxes per QuotationTaxGrid.md (line items send their own taxConfigDetailId)
      const taxesPayload = (formData.selectedTaxIds || [])
        .map(Number)
        .filter((tid) => Boolean(tid) && tid > 0)
        .map((tid) => ({ taxConfigDetailId: tid }));

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
        if (!isEditingExistingDraft && !revisionCreated) {
          await createRevision(targetQuotation.id, payload);
          revisionCreated = true;
          setRevisionCreatedInSession(true);
        }
        await updateQuotation(targetQuotation.id, {
          ...payload,
          items: formData.items.map((item) => ({
            ...item,
            ...(isEditingExistingDraft ? {} : { id: null, quotationLineItemId: null }),
          })),
        });

        if (statusToSet === 'Sent') {
          try {
            await updateQuotationStatus(targetQuotation.id, 'Sent');
          } catch (statusErr) {
            console.warn('Could not mark quotation as Sent:', statusErr);
            toast.error(statusErr?.message || 'Quotation saved as Draft, but could not be marked as Sent.');
          }
        }

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

        // Auto-advance linked inquiry stage to Quotation
        if (formData.inquiryId) {
          try {
            await inquiryService.changeInquiryStatus(formData.inquiryId, {
              status: 'Quotation',
              comment: `Quotation ${payload.quotationNo || ''} created`,
            });
          } catch (inqErr) {
            console.warn('Could not auto-advance inquiry status to Quotation:', inqErr);
          }
        }

        if (statusToSet === 'Sent' && targetId) {
          try {
            await updateQuotationStatus(targetId, 'Sent');
          } catch (statusErr) {
            console.warn('Could not mark quotation as Sent:', statusErr);
            toast.error(statusErr?.message || 'Quotation created as Draft, but could not be marked as Sent.');
          }
        }

        navigate(`/quotations/${targetId}`);
      }
    } catch (err) {
      console.error('Failed to save quotation:', err);
      toast.error(
        revisionCreated
          ? `Revision created, but its product and pricing changes were not saved: ${err?.message || 'Please retry Save as Draft.'}`
          : err?.message || 'Failed to save quotation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRevisionMode && isLoadingRevisionDetail) {
    return (
      <div className="p-16 max-w-xl mx-auto text-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-base font-bold text-heading">Loading Previous Revision Data...</h3>
        <p className="text-xs text-text-muted">
          Copying all products, line items, pricing, client address, and terms from previous revision.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-24">
      {/* ── Top PageHeader (Quotation No shown only once in the input) ── */}
      <PageHeader
        title={
          isRevisionMode
            ? `${isEditingExistingDraft ? 'Edit Draft' : 'New Revision'} · ${formData.quotationNo} (Rev ${formData.revisionNo})`
            : 'New Quotation'
        }
        subtitle={
          isRevisionMode
            ? isEditingExistingDraft
              ? 'Update the latest draft quotation without creating a new revision.'
              : `Revision ${formData.revisionNo} copies from previous revision. Older revisions become read-only.`
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
              disabled={isSubmitting || isTargetPoReceived}
              title={isTargetPoReceived ? 'PO received: Quotation revisions cannot be saved' : 'Save as Draft'}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave('Sent')}
              disabled={isSubmitting || isTargetPoReceived}
              title={isTargetPoReceived ? 'PO received: Quotation revisions cannot be saved' : 'Save & Mark as Sent'}
              icon={<IconCheck size={16} />}
            >
              {isSubmitting ? 'Saving...' : 'Save & Mark as Sent'}
            </Button>
          </div>
        }
      />

      {/* ── PO Received Warning Banner (Safety Guard) ── */}
      {isRevisionMode && isTargetPoReceived && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start gap-3">
            <IconWarning size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Cannot Revise: Customer Purchase Order Already Received</h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                A Customer Purchase Order (PO) has already been received and recorded for Quotation{' '}
                <strong className="font-mono">{targetQuotation?.quotationNo || formData.quotationNo}</strong>.
                Commercial terms are now finalized for Sales Order creation. Further quotation revisions are locked.
              </p>
              <p className="text-2xs text-amber-700/80 dark:text-amber-400/80">
                Solution: If commercial or product terms need to change, please record a PO amendment or start a new quotation from the inquiry.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate(`/quotations/${targetQuotation?.id || id}`)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
          >
            Back to Quotation
          </Button>
        </div>
      )}

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
                    currencyId: matched?.id || prev.currencyId || 2,
                  }));
                }}
              />
            </div>
          </div>

          {/* Revision Reason (ONLY in Revision Mode) */}
          {isRevisionMode && !isEditingExistingDraft && (
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
                value={selectedAddrValue}
                placeholder="-- Select Address --"
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
              value={selectedContactValue}
              placeholder="-- Select Contact Person --"
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
                    const lineTax = (lineAmount * (Number(item.taxPercent) || 0)) / 100;
                    const lineTotalWithTax = lineAmount + lineTax;
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

                        <Td className="text-center font-mono font-semibold text-xs text-heading align-top">
                          {item.quantity}
                        </Td>

                        <Td className="text-right font-mono text-xs text-heading align-top">
                          <div>{formatCurrency(item.rate, formData.currency)}</div>
                          {item.rateSource === 'Ambiguous' && Array.isArray(item.priceCandidates) && item.priceCandidates.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setPriceCandidatesModal({
                                candidates: item.priceCandidates,
                                optionExtras: item.optionExtras || 0,
                                targetItemIndex: idx,
                              })}
                              className="inline-block mt-0.5 text-3xs font-semibold text-primary hover:underline cursor-pointer"
                            >
                              Pick list price ({item.priceCandidates.length})
                            </button>
                          )}
                          {item.rateSource === 'ListPrice' && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-3xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              List price
                            </span>
                          )}
                        </Td>

                        <Td className="text-right font-mono text-xs text-text-muted align-top">
                          {Number(item.otherCharges) > 0
                            ? formatCurrency(item.otherCharges, formData.currency)
                            : '—'}
                        </Td>

                        <Td className="text-center align-top">
                          <Badge variant="neutral" size="sm">
                            {item.taxName ? `${item.taxName} (${item.taxPercent}%)` : `${item.taxPercent}%`}
                          </Badge>
                        </Td>

                        <Td className="text-right font-mono text-xs text-heading align-top">
                          <div className="font-bold text-heading">
                            {formatCurrency(lineTotalWithTax, formData.currency)}
                          </div>
                          {lineTax > 0 && (
                            <div className="text-3xs text-text-muted font-normal font-sans">
                              Excl: {formatCurrency(lineAmount, formData.currency)}
                            </div>
                          )}
                        </Td>

                        <Td className="text-right whitespace-nowrap align-top">
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

                <div>
                  <SearchableMultiSelect
                    label="Applicable Taxes"
                    options={applicableTaxSelectOptions}
                    value={formData.selectedTaxIds || []}
                    placeholder="Select applicable taxes (e.g. CGST, SGST)..."
                    maxDisplayTags={4}
                    onChange={(e) => {
                      const val = Array.isArray(e) ? e : e?.target?.value || [];
                      setFormData((prev) => ({
                        ...prev,
                        selectedTaxIds: val.map((v) => Number(v?.taxConfigDetailId ?? v?.value ?? v)),
                      }));
                    }}
                  />
                </div>

                <div>
                  <Textarea
                    label="Quotation Pricing Notes & Commercial Remarks"
                    rows={2}
                    placeholder="e.g. Unit rates include standard export packing; prices valid for 30 days from document date; freight extra at actuals..."
                    value={formData.pricingNotes || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pricingNotes: e.target.value }))}
                  />
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

                {Number(totals.otherCharges) > 0 && (
                  <div className="flex justify-between items-center text-text-muted">
                    <span>Other Charges:</span>
                    <span className="font-mono font-semibold text-heading">
                      {formatCurrency(totals.otherCharges, formData.currency)}
                    </span>
                  </div>
                )}

                {Number(totals.lineTaxAmount) > 0 && !totals.isLineTaxesBreakdown && (
                  <div className="flex justify-between items-center text-text-muted text-2xs py-1 px-2.5 bg-surface/50 rounded border border-border/50">
                    <span>Product Line Taxes:</span>
                    <span className="font-mono font-medium text-heading">
                      {formatCurrency(totals.lineTaxAmount, formData.currency)}
                    </span>
                  </div>
                )}

                {totals.taxesBreakdown && totals.taxesBreakdown.length > 0 ? (
                  <div className="space-y-1.5 py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60">
                    {totals.taxesBreakdown.map((tx, idx) => (
                      <div key={tx.id || idx} className="flex justify-between items-center text-text-muted text-2xs">
                        <span>{tx.name} ({tx.percent}%):</span>
                        <span className="font-mono font-medium text-heading">
                          {formatCurrency(tx.amount, formData.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  !totals.lineTaxAmount && (
                    <div className="py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60 text-2xs text-text-muted flex justify-between items-center">
                      <span>Tax:</span>
                      <span className="font-mono text-heading">
                        {formatCurrency(0, formData.currency)}
                      </span>
                    </div>
                  )
                )}

                <div className="flex justify-between items-center text-text-muted pt-1">
                  <span>Total Tax:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(totals.taxAmount ?? totals.totalTax, formData.currency)}
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
                    userOptionsLoading={isLoadingNegotiationUsers}
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

          {/* Row 2: Manufacturing Standard & Grade / Accuracy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <SearchableSelect
              label="Manufacturing Standard"
              options={drawerStandardOptions}
              value={effectiveDrawerStandard}
              placeholder={activeProductObj ? '-- Choose Standard --' : 'Select product first'}
              disabled={!activeProductObj}
              onChange={(e) => handleDrawerStandardChange(e.target.value)}
            />

            <SearchableSelect
              label="Grade / Accuracy"
              options={drawerGradeOptionsWithCurrent}
              value={selectedDrawerGrade}
              placeholder={!activeProductObj ? 'Select product first' : !effectiveDrawerStandard ? 'Select standard first' : '-- Choose Grade --'}
              disabled={!activeProductObj || !effectiveDrawerStandard}
              onChange={(e) => handleDrawerGradeChange(e.target.value)}
            />
          </div>

          {/* Row 3: Size / Variant & Item Code */}
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
              value={drawerCalculatedItemCode}
              hint="Automatically assigned from catalog variant & grade"
            />
          </div>

          {/* Row 4: Quantity, Unit Rate, Other Charges, Tax % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                <label htmlFor="drawer-unit-rate" className="mf-label text-xs font-semibold text-heading">
                  Unit Rate ({formData.currency}) <span className="mf-required" aria-hidden="true">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleLookupListPrice}
                  disabled={!drawerProduct || isLoadingPriceLookup}
                  className="text-3xs font-semibold text-primary hover:text-primary-hover disabled:text-text-muted hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Query list price from backend product price list (ProductPriceList.md § 3.5)"
                >
                  {isLoadingPriceLookup ? 'Looking up...' : 'Use list price'}
                </button>
              </div>
              <Input
                id="drawer-unit-rate"
                aria-label="Unit Rate"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={drawerRate}
                onChange={(e) => {
                  setDrawerRate(e.target.value);
                  setDrawerRateSource('Manual');
                }}
              />
            </div>

            <Input
              label={`Other Charges (${formData.currency})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={drawerOtherCharges}
              onChange={(e) => setDrawerOtherCharges(e.target.value)}
            />

            <SearchableSelect
              label="Product Tax"
              options={singleProductTaxOptions}
              value={String(drawerTaxConfigDetailId || (drawerTax === 0 ? '0' : ''))}
              placeholder="-- Select Tax --"
              onChange={(e) => {
                const val = e.target.value;
                const matched = singleProductTaxOptions.find((o) => String(o.value) === String(val));
                setDrawerTaxConfigDetailId(matched?.taxConfigDetailId ? String(matched.taxConfigDetailId) : (val === '0' ? '0' : ''));
                setDrawerTax(matched ? matched.taxPercent : 0);
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
                  <div className="font-semibold text-heading truncate">{effectiveDrawerStandard || activeProductObj?.primaryStandardCode || (activeProductObj?.standards?.[0]?.standardCode || activeProductObj?.standards?.[0]?.name) || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Grade</div>
                  <div className="font-semibold text-heading truncate">{effectiveDrawerGrade || activeVariantObj?.grade || lookups?.grades?.find((g) => g.id === activeVariantObj?.gradeId)?.gradeCode || '—'}</div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Flatness</div>
                  <div className="font-semibold text-heading truncate">
                    {drawerCalculatedFlatness !== '—'
                      ? drawerCalculatedFlatness
                      : (activeVariantObj?.flatness || (editingIndex !== null ? formData.items[editingIndex]?.flatness : '') || '—')}
                  </div>
                </div>
                <div>
                  <div className="text-3xs text-text-muted">Dimensions</div>
                  <div className="font-semibold text-heading truncate">{activeVariantObj?.variantName || activeVariantObj?.size || activeVariantObj?.variantCode || 'Standard'}</div>
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
                    {/* Option price badge */}
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

      {/* ── PRICE CANDIDATES MODAL (ProductPriceList.md § 3.4 & § 3.5) ── */}
      {priceCandidatesModal && (
        <Modal
          isOpen={Boolean(priceCandidatesModal)}
          onClose={() => setPriceCandidatesModal(null)}
          title="Pick List Price"
          size="md"
        >
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Multiple configuration prices match this specification. Select the desired standard and grade:
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {priceCandidatesModal.candidates.map((cand, cIdx) => {
                const unitPrice = Number(cand.unitPrice) || 0;
                const extras = Number(priceCandidatesModal.optionExtras) || 0;
                const total = unitPrice + extras;
                return (
                  <div
                    key={cand.id || cIdx}
                    onClick={() =>
                      handleSelectCandidatePrice(
                        cand,
                        priceCandidatesModal.optionExtras,
                        priceCandidatesModal.targetItemIndex
                      )
                    }
                    className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-heading">
                        {cand.standardCode || 'Standard'} · {cand.gradeCode || 'Grade'}
                      </div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        Base: {formatCurrency(unitPrice, formData.currency)}
                        {extras > 0 && ` + Extras: ${formatCurrency(extras, formData.currency)}`}
                        {cand.deliveryWeeks ? ` · ${cand.deliveryWeeks} wks delivery` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-primary">
                        {formatCurrency(total, formData.currency)}
                      </div>
                      <span className="text-3xs text-primary font-medium hover:underline">Select</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ── PROSPECT-TO-CLIENT ONBOARDING BRIDGE (HTTP 409 Interception) ── */}
      <RegisterClientRequiredModal
        isOpen={isConflictModalOpen}
        onClose={handleCancelConflictModal}
        inquiry={conflictInquiry}
        onProceed={handleProceedToOnboard}
      />

      <QuickClientOnboardDrawer
        isOpen={isQuickClientDrawerOpen}
        onClose={() => {
          setIsQuickClientDrawerOpen(false);
          handleCancelConflictModal();
        }}
        inquiry={conflictInquiry}
        onSuccess={handleQuickClientSuccess}
      />

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
            disabled={isSubmitting || isTargetPoReceived}
            title={isTargetPoReceived ? 'PO received: Quotation revisions cannot be saved' : 'Save as Draft'}
            className="w-full sm:w-auto justify-center"
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave('Sent')}
            disabled={isSubmitting || isTargetPoReceived}
            title={isTargetPoReceived ? 'PO received: Quotation revisions cannot be saved' : 'Save & Mark as Sent'}
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
