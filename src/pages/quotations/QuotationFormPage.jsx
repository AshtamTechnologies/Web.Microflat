/**
 * QuotationFormPage.jsx — Create New Quotation (Rev 0) or New Revision (Rev N+1)
 *
 * Route:
 *   - /quotations/new (New Quotation - Select inquiry inside form)
 *   - /quotations/:id/new-revision (New Revision from existing Quotation)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconBack,
  IconSave,
  IconAdd,
  IconTrash,
  IconCheck,
  IconQuotation,
  IconPackage,
  IconInfo,
  IconFileText,
  IconEdit,
  IconClose,
} from '../../constants/icons';
import {
  PageHeader,
  Card,
  CollapsibleCard,
  Input,
  Select,
  DatePicker,
  SearchableSelect,
  SearchableMultiSelect,
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
import {
  TAX_SLABS,
  TAX_TREATMENTS,
  PAYMENT_TERMS_OPTIONS,
  DELIVERY_TERMS_OPTIONS,
  calculateQuotationTotals,
  formatCurrency,
} from '../../mocks/quotations';
import {
  INQUIRY_CATALOG_CATEGORIES,
  INQUIRY_CATALOG_PRODUCTS,
} from '../../mocks/inquiryCatalog';
import QuotationStepper from './components/QuotationStepper';
import useColumnResize from '../../hooks/useColumnResize';

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
  const { id } = useParams(); // For /quotations/:id/new-revision
  const [searchParams] = useSearchParams();
  const inquiryIdParam = searchParams.get('inquiryId');

  const {
    quotations,
    getQuotationById,
    getNextQuotationNo,
    createQuotation,
    createRevision,
  } = useQuotationsContext();

  const { inquiries = [] } = useInquiriesContext();
  const { clients = [], ensureClientsLoaded } = useClientsContext();

  const isRevisionMode = Boolean(id);
  const targetQuotation = useMemo(() => {
    return isRevisionMode ? getQuotationById(id) : null;
  }, [isRevisionMode, id, getQuotationById]);

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
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    currency: 'INR',
    validUntil: '',
    paymentTerms: ['Net 30 Days'],
    deliveryTerms: ['Ex-works Ahmedabad'],
    termsAndConditions: '',
    taxTreatment: 'INTRA_STATE',
    items: [],
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

  // Handle Inquiry Selection
  const handleSelectInquiry = (inquiryNoOrId) => {
    if (!inquiryNoOrId) {
      setFormData((prev) => ({
        ...prev,
        inquiryNo: '',
        inquiryId: '',
        clientName: '',
        clientId: '',
        clientAddress: '',
        contactPerson: '',
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

    if (!matchedInq) return;

    // Resolve client
    const inqClient = clients.find(
      (c) =>
        (c.companyName || '').toLowerCase() === (matchedInq.CustomerName || '').toLowerCase() ||
        (c.clientId || c.id) === matchedInq.clientId
    );

    const defaultAddr = inqClient?.addresses?.[0]?.addressLine1
      ? `${inqClient.addresses[0].addressLine1}, ${inqClient.addresses[0].city}`
      : matchedInq.AddressLine1
      ? `${matchedInq.AddressLine1}, ${matchedInq.City || ''}`
      : 'Plot 12, GIDC, Ahmedabad';

    const defaultContact = inqClient?.contacts?.[0]?.firstName
      ? `${inqClient.contacts[0].firstName} ${inqClient.contacts[0].lastName || ''}`.trim()
      : matchedInq.ContactPerson || '';

    // Map items from inquiry
    const mappedItems = (matchedInq.items || []).map((it, idx) => ({
      id: `it-${Date.now()}-${idx}`,
      categoryId: it.categoryId || 'cat-sp',
      productId: it.productId || 'prod-gsp',
      productName: it.productName || it.itemName || 'Precision Plate',
      variantId: it.variantId || '',
      variantName: it.variantName || 'Standard Size',
      itemCode: it.itemCode || 'ITM-01',
      technicalDetails: it.technicalDetails || it.specification || '',
      quantity: Number(it.quantity) || 1,
      rate: 35000,
      otherCharges: 0,
      taxPercent: 18,
      options: Array.isArray(it.options) ? it.options : ['Rexine Cover (Standard)'],
    }));

    setFormData((prev) => ({
      ...prev,
      inquiryNo: matchedInq.InquiryNo,
      inquiryId: matchedInq.id || matchedInq.InquiryId,
      clientName: matchedInq.CustomerName || '',
      clientId: inqClient?.clientId || inqClient?.id || '',
      clientAddress: defaultAddr,
      contactPerson: defaultContact,
      contactEmail: matchedInq.Email || inqClient?.email || '',
      contactPhone: matchedInq.Phone || inqClient?.phone || '',
      items: mappedItems.length > 0 ? mappedItems : prev.items,
    }));

    toast.success(`Inquiry ${matchedInq.InquiryNo} selected · Client & items loaded`);
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
          : [targetQuotation.paymentTerms || 'Net 30 Days'],
        deliveryTerms: Array.isArray(targetQuotation.deliveryTerms)
          ? targetQuotation.deliveryTerms
          : [targetQuotation.deliveryTerms || 'Ex-works Ahmedabad'],
        termsAndConditions: targetQuotation.termsAndConditions || '',
        taxTreatment: targetQuotation.taxTreatment || 'INTRA_STATE',
        items: latestRev?.items?.map((it, idx) => ({ ...it, id: it.id || `it-${Date.now()}-${idx}` })) || [],
      });
    } else if (!isRevisionMode) {
      const nextNo = getNextQuotationNo();
      setFormData((prev) => ({
        ...prev,
        quotationNo: nextNo,
        revisionNo: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

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

  // Tax Slab Options
  const taxSlabOptions = useMemo(() => {
    return TAX_SLABS.map((s) => ({
      value: String(s.value),
      label: s.label,
    }));
  }, []);

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
      return [{ value: formData.clientAddress || 'Head Office', label: formData.clientAddress || 'Head Office' }];
    }
    return matchedClient.addresses.map((addr) => ({
      value: `${addr.addressType || 'Office'} – ${addr.addressLine1}, ${addr.city} ${addr.pincode || ''}`,
      label: `${addr.addressType || 'Office'} – ${addr.addressLine1}, ${addr.city}`,
    }));
  }, [matchedClient, formData.clientAddress]);

  const clientContactOptions = useMemo(() => {
    if (!matchedClient || !matchedClient.contacts || matchedClient.contacts.length === 0) {
      return [{ value: formData.contactPerson || 'Contact Person', label: formData.contactPerson || 'Contact Person' }];
    }
    return matchedClient.contacts.map((c) => ({
      value: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      label: `${c.firstName || ''} ${c.lastName || ''} · ${c.email || c.mobile1 || ''}`.trim(),
    }));
  }, [matchedClient, formData.contactPerson]);

  // Real-time Totals Calculation
  const totals = useMemo(() => {
    return calculateQuotationTotals(formData.items, formData.taxTreatment);
  }, [formData.items, formData.taxTreatment]);

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
    setIsDrawerOpen(true);
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

    const payload = {
      categoryId: drawerCategory || activeProductObj?.categoryId || 'cat-sp',
      productId: activeProductObj?.id || 'prod-custom',
      productName: activeProductObj?.productName || 'Custom Product',
      variantId: activeVariantObj?.id || '',
      variantName: activeVariantObj?.variantName || 'Standard Variant',
      itemCode: activeVariantObj?.itemCode || activeProductObj?.itemCodePrefix || 'ITM-01',
      technicalDetails: activeVariantObj?.technicalDetails || activeProductObj?.standardInfo || '',
      quantity: Math.max(1, Number(drawerQty) || 1),
      rate: Number(drawerRate) || 0,
      otherCharges: Number(drawerOtherCharges) || 0,
      taxPercent: Number(drawerTax) || 18,
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
    navigate(isRevisionMode ? `/quotations/${id}` : '/quotations');
  };

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
  const handleSave = (statusToSet = 'Draft') => {
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

    const payload = {
      ...formData,
      status: statusToSet,
    };

    if (isRevisionMode) {
      createRevision(targetQuotation.id, payload);
      navigate(`/quotations/${targetQuotation.id}`);
    } else {
      const newQuote = createQuotation(payload);
      navigate(`/quotations/${newQuote.id}`);
    }
  };

  return (
    <div className="w-full space-y-6 pb-24">
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
            Back to {isRevisionMode ? 'Quotation' : 'Quotations'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton onClick={handleCancel} size="sm">
              Cancel
            </CancelButton>
            <Button variant="secondary" size="sm" onClick={() => handleSave('Draft')}>
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave('Sent')}
              icon={<IconCheck size={16} />}
            >
              Save & Mark as Sent
            </Button>
          </div>
        }
      />

      {/* Stepper */}
      <QuotationStepper status="Draft" poReceived={false} />

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
                options={[
                  { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                  { value: 'USD', label: 'USD ($ - US Dollar)' },
                  { value: 'EUR', label: 'EUR (€ - Euro)' },
                  { value: 'GBP', label: 'GBP (£ - British Pound)' },
                ]}
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))}
              />
            </div>
            <SearchableSelect
              label="Contact Person"
              options={clientContactOptions}
              value={formData.contactPerson}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
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
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAddDrawer}
              icon={IconAdd}
            >
              Add Product
            </Button>
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

                    return (
                      <tr key={item.id || idx} className="hover:bg-surface/50 transition-colors">
                        <Td className="text-center font-mono text-xs text-text-muted">
                          {idx + 1}
                        </Td>

                        <Td className="text-xs">
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

          {/* ── Totals Summary Widget ── */}
          <div className="p-4 sm:p-5 bg-surface/30 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-md space-y-1.5">
              <span className="text-xs font-bold text-heading uppercase tracking-wider block">
                Applicable Tax Regime & Commercial Treatment
              </span>
              <SearchableSelect
                options={taxTreatmentOptions}
                value={formData.taxTreatment}
                onChange={(e) => setFormData((prev) => ({ ...prev, taxTreatment: e.target.value }))}
              />
            </div>

            <div className="w-full md:w-80 bg-card dark:bg-card-dark rounded-xl border border-border p-4 shadow-xs space-y-2 text-xs">
              <div className="flex justify-between items-center text-text-muted">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-semibold text-heading">
                  {formatCurrency(totals.subtotal, formData.currency)}
                </span>
              </div>

              {formData.taxTreatment === 'INTRA_STATE' && (
                <>
                  <div className="flex justify-between items-center text-text-muted text-2xs">
                    <span>CGST (Output):</span>
                    <span className="font-mono">{formatCurrency(totals.cgst, formData.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-muted text-2xs">
                    <span>SGST (Output):</span>
                    <span className="font-mono">{formatCurrency(totals.sgst, formData.currency)}</span>
                  </div>
                </>
              )}

              {formData.taxTreatment === 'INTER_STATE' && (
                <div className="flex justify-between items-center text-text-muted text-2xs">
                  <span>IGST (Output):</span>
                  <span className="font-mono">{formatCurrency(totals.igst, formData.currency)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-text-muted">
                <span>Total Tax:</span>
                <span className="font-mono font-semibold text-heading">
                  {formatCurrency(totals.totalTax, formData.currency)}
                </span>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm text-heading">
                <span>Grand Total:</span>
                <span className="font-mono text-primary text-base">
                  {formatCurrency(totals.grandTotal, formData.currency)}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleCard>
      </div>

      {/* ── SECTION 3: COMMERCIAL TERMS & CONDITIONS ── */}
      <CollapsibleCard
        title="3. Commercial Terms & Conditions"
        subtitle="Select applicable payment and delivery terms, and specify custom quotation clauses"
        icon={<IconFileText size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Multi-Select Payment Terms */}
            <SearchableMultiSelect
              label="Payment Terms"
              placeholder="Select applicable payment terms..."
              searchPlaceholder="Search payment terms..."
              options={PAYMENT_TERMS_OPTIONS}
              value={formData.paymentTerms}
              name="paymentTerms"
              maxDisplayTags={10}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                setFormData((prev) => ({ ...prev, paymentTerms: val }));
              }}
            />

            {/* Multi-Select Delivery Terms */}
            <SearchableMultiSelect
              label="Delivery Terms"
              placeholder="Select applicable delivery terms..."
              searchPlaceholder="Search delivery terms..."
              options={DELIVERY_TERMS_OPTIONS}
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
        subtitle="Configure catalog item, commercial unit rate, and extra charges"
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
              }}
            />

            <SearchableSelect
              label="Product Name"
              required
              options={productOptions}
              value={drawerProduct}
              placeholder="-- Select Product --"
              onChange={(e) => {
                setDrawerProduct(e.target.value);
                setDrawerVariant('');
              }}
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
              onChange={(e) => setDrawerVariant(e.target.value)}
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
      <FormActionsBar>
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-text-muted hidden sm:block">
            {formData.items.length} line item{formData.items.length === 1 ? '' : 's'} · Total:{' '}
            <strong className="text-heading font-mono">
              {formatCurrency(totals.grandTotal, formData.currency)}
            </strong>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <CancelButton onClick={handleCancel}>
              Cancel
            </CancelButton>

            <Button variant="secondary" onClick={() => handleSave('Draft')}>
              Save as Draft
            </Button>

            <Button
              variant="primary"
              onClick={() => handleSave('Sent')}
              icon={<IconCheck size={16} />}
            >
              Save & Mark as Sent
            </Button>
          </div>
        </div>
      </FormActionsBar>
    </div>
  );
}
