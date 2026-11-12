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
  DatePicker,
  Badge,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { useSalesOrdersContext } from '../../context/SalesOrdersContext';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useClientsContext } from '../../context/ClientsContext';
import {
  calculateSalesOrderTotals,
  formatCurrency,
  ORDER_DOCUMENT_TYPES,
  TAX_SLABS,
  TAX_TREATMENTS,
  PAYMENT_TERMS_OPTIONS,
  DELIVERY_TERMS_OPTIONS,
} from '../../mocks/salesOrders';
import { formatDate } from '../../utils/dateUtils';
import useColumnResize from '../../hooks/useColumnResize';

function formatReadableFileSize(bytes = 0) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function buildPrefillFromQuotation(quotation) {
  if (!quotation) return null;
  const revIdx =
    quotation.currentRevision !== undefined
      ? quotation.currentRevision
      : Math.max(0, (quotation.revisions?.length || 1) - 1);
  const latestRev =
    quotation.revisions?.[revIdx] || quotation.revisions?.[quotation.revisions.length - 1];

  return {
    quotationId: quotation.id,
    quotationNo: quotation.quotationNo,
    quotationRevisionNo: latestRev?.revisionNo ?? 0,
    inquiryId: quotation.inquiryId || '',
    inquiryNo: quotation.inquiryNo || '',
    clientId: quotation.clientId || '',
    clientName: quotation.clientName || '',
    clientAddress: quotation.clientAddress || '',
    contactPerson: quotation.contactPerson || '',
    contactEmail: quotation.contactEmail || '',
    contactPhone: quotation.contactPhone || '',
    clientPoNo: quotation.poDetails?.poNumber || '',
    clientPoDate: quotation.poDetails?.receivedOn || '',
    paymentTerms: quotation.paymentTerms || 'Net 30 Days',
    deliveryTerms: quotation.deliveryTerms || '',
    currency: latestRev?.currency || quotation.currency || 'INR',
    taxTreatment: latestRev?.taxTreatment || quotation.taxTreatment || 'INTRA_STATE',
    termsAndConditions: quotation.termsAndConditions || '',
    lineItems: (latestRev?.items || []).map((item, idx) => ({
      ...item,
      id: `oc-it-${Date.now()}-${idx}`,
      quotationLineItemId: item.id,
      otherCharges: Number(item.otherCharges) || 0,
      taxPercent: item.taxPercent !== undefined ? item.taxPercent : 18,
    })),
  };
}

export default function SalesOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialQuotationId = searchParams.get('quotationId') || '';

  const isEditMode = Boolean(id);
  const {
    getSalesOrderById,
    getNextOrderConfirmationNo,
    createSalesOrder,
    updateSalesOrder,
  } = useSalesOrdersContext();
  const { quotations = [] } = useQuotationsContext();
  const { clients = [], ensureLoaded: ensureClientsLoaded } = useClientsContext();

  useEffect(() => {
    ensureClientsLoaded?.();
  }, [ensureClientsLoaded]);

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
        clientAddress: existingOrder.clientAddress || '',
        contactPerson: existingOrder.contactPerson || '',
        contactEmail: existingOrder.contactEmail || '',
        contactPhone: existingOrder.contactPhone || '',
        clientPoNo: existingOrder.clientPoNo || '',
        clientPoDate: existingOrder.clientPoDate || '',
        expectedDeliveryDate: existingOrder.expectedDeliveryDate || '',
        paymentTerms: existingOrder.paymentTerms || 'Net 30 Days',
        deliveryTerms: existingOrder.deliveryTerms || '',
        currency: existingOrder.currency || 'INR',
        taxTreatment: existingOrder.taxTreatment || 'INTRA_STATE',
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
      clientAddress: prefill?.clientAddress || '',
      contactPerson: prefill?.contactPerson || '',
      contactEmail: prefill?.contactEmail || '',
      contactPhone: prefill?.contactPhone || '',
      clientPoNo: prefill?.clientPoNo || '',
      clientPoDate: prefill?.clientPoDate || '',
      expectedDeliveryDate: '',
      paymentTerms: prefill?.paymentTerms || 'Net 30 Days',
      deliveryTerms: prefill?.deliveryTerms || '',
      currency: prefill?.currency || 'INR',
      taxTreatment: prefill?.taxTreatment || 'INTRA_STATE',
      otherCharges: 0,
      otherChargesDescription: '',
      termsAndConditions: prefill?.termsAndConditions || '',
      remarks: '',
      lineItems: prefill?.lineItems || [],
      documents: [],
    };
  });

  const [errors, setErrors] = useState({});
  const [docType, setDocType] = useState('Client PO');
  const [docRemarks, setDocRemarks] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const selectedClient = useMemo(
    () =>
      clients.find(
        (c) =>
          String(c.id) === String(formData.clientId) ||
          String(c.name || '').toLowerCase() === String(formData.clientName || '').toLowerCase()
      ) || null,
    [clients, formData.clientId, formData.clientName]
  );

  const clientAddressOptions = useMemo(() => {
    const opts = (selectedClient?.addresses || []).map((a) => {
      const label = [a.label, a.line1, a.city, a.state].filter(Boolean).join(' · ');
      return { value: label, label };
    });
    if (formData.clientAddress && !opts.some((o) => o.value === formData.clientAddress)) {
      opts.unshift({ value: formData.clientAddress, label: formData.clientAddress });
    }
    return opts;
  }, [selectedClient, formData.clientAddress]);

  const clientContactOptions = useMemo(() => {
    const opts = (selectedClient?.contacts || []).map((c) => ({
      value: c.name,
      label: `${c.name}${c.designation ? ` (${c.designation})` : ''}`,
      email: c.email,
      phone: c.phone,
    }));
    if (formData.contactPerson && !opts.some((o) => o.value === formData.contactPerson)) {
      opts.unshift({
        value: formData.contactPerson,
        label: formData.contactPerson,
        email: formData.contactEmail,
        phone: formData.contactPhone,
      });
    }
    return opts;
  }, [selectedClient, formData.contactPerson, formData.contactEmail, formData.contactPhone]);

  const totals = useMemo(
    () =>
      calculateSalesOrderTotals(
        formData.lineItems,
        formData.taxTreatment,
        formData.otherCharges
      ),
    [formData.lineItems, formData.taxTreatment, formData.otherCharges]
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

  function handleSelectQuotation(quotationId) {
    const quote = confirmedQuotations.find((q) => q.id === quotationId);
    if (!quote) return;
    const prefill = buildPrefillFromQuotation(quote);
    setFormData((prev) => ({
      ...prev,
      ...prefill,
    }));
    setErrors((prev) => ({ ...prev, quotationId: undefined, lineItems: undefined }));
    toast.success(`Loaded details from Confirmed Quotation ${quote.quotationNo}`);
  }

  function handleLineItemChange(idx, field, value) {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  }

  function handleAttachFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const todayIso = new Date().toISOString().split('T')[0];
    const newDocs = files.map((file, idx) => ({
      id: `oc-doc-${Date.now()}-${idx}`,
      fileName: file.name,
      documentType: docType || 'Client PO',
      uploadedAt: todayIso,
      fileSize: formatReadableFileSize(file.size),
      remarks: docRemarks.trim(),
    }));

    setFormData((prev) => ({
      ...prev,
      documents: [...newDocs, ...(prev.documents || [])],
    }));
    setDocRemarks('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success(
      files.length === 1
        ? `Attached "${files[0].name}"`
        : `Attached ${files.length} documents`
    );
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
    if (!formData.quotationId) {
      nextErrors.quotationId = 'Please select a Confirmed quotation.';
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
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave(targetStatus) {
    if (!validate(targetStatus)) {
      toast.error('Please fix the highlighted validation errors.');
      return;
    }

    const payload = {
      ...formData,
      status: targetStatus,
    };

    if (isEditMode) {
      updateSalesOrder(existingOrder.id, payload);
      navigate(`/sales-orders/${existingOrder.id}`);
    } else {
      const created = createSalesOrder(payload);
      navigate(`/sales-orders/${created.id}`);
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
              onClick={() => handleSave('Draft')}
            >
              Save as Draft
            </Button>
            <SaveButton
              type="button"
              size="sm"
              icon={IconCheck}
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

      {/* ── SECTION 1: QUOTATION, ORDER & CLIENT PO DETAILS ── */}
      <CollapsibleCard
        title="1. Confirmed Quotation & Client PO Details"
        subtitle="Link a Confirmed quotation, preview order confirmation number, and record client PO details"
        icon={<IconInfo size={18} className="text-primary" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <FormGrid columns={3}>
            {isEditMode ? (
              <Input
                label="Confirmed Quotation"
                disabled
                value={`${formData.quotationNo} (Rev ${formData.quotationRevisionNo})`}
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
              value={formData.clientName || 'Select a confirmed quotation first'}
            />

            <SearchableSelect
              label="Client Address"
              placeholder="Select address..."
              options={clientAddressOptions}
              value={formData.clientAddress}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))
              }
            />

            <SearchableSelect
              label="Contact Person"
              placeholder="Select contact..."
              options={clientContactOptions}
              value={formData.contactPerson}
              onChange={(e) => {
                const picked = clientContactOptions.find((c) => c.value === e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  contactPerson: e.target.value,
                  contactEmail: picked?.email || prev.contactEmail,
                  contactPhone: picked?.phone || prev.contactPhone,
                }));
              }}
            />
          </FormGrid>

          <FormGrid columns={3}>
            <SearchableSelect
              label="Payment Terms"
              options={PAYMENT_TERMS_OPTIONS}
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))
              }
            />

            <SearchableSelect
              label="Delivery Terms"
              options={DELIVERY_TERMS_OPTIONS}
              value={formData.deliveryTerms}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deliveryTerms: e.target.value }))
              }
            />

            <SearchableSelect
              label="Tax Treatment"
              options={TAX_TREATMENTS}
              value={formData.taxTreatment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, taxTreatment: e.target.value }))
              }
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
        subtitle="Copied from the quotation's latest revision; quantities, rates, and taxes can be adjusted while Draft"
        icon={<IconPackage size={18} className="text-primary" />}
        defaultOpen={true}
        padding="none"
        bodyClassName="p-0 space-y-0"
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {formData.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-text-muted">
                    Select a Confirmed quotation above to populate order line items.
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
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min="0.001"
                          step="any"
                          size="sm"
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
                          value={item.otherCharges ?? 0}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'otherCharges', e.target.value)
                          }
                        />
                      </Td>
                      <Td>
                        <SearchableSelect
                          size="sm"
                          options={TAX_SLABS.map((t) => ({
                            value: String(t.value),
                            label: `${t.value}%`,
                          }))}
                          value={String(item.taxPercent ?? 18)}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'taxPercent', Number(e.target.value))
                          }
                        />
                      </Td>
                      <Td className="text-right font-mono font-semibold text-xs text-heading">
                        {formatCurrency(lineAmount, formData.currency)}
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
            {formData.taxTreatment === 'INTRA_STATE' ? (
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
            <FormGrid columns={2}>
              <SearchableSelect
                label="Document Type"
                options={ORDER_DOCUMENT_TYPES}
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              />
              <Input
                label="Remarks / Description (Optional)"
                placeholder="e.g. Client signed PO PDF"
                value={docRemarks}
                onChange={(e) => setDocRemarks(e.target.value)}
              />
            </FormGrid>

            <div>
              <label className="mf-label block mb-1.5">Upload Document</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleAttachFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-bg hover:bg-surface/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleAttachFiles(e.target.files)}
                  className="hidden"
                />
                <IconUploadCloud className="mx-auto text-primary mb-1.5" size={24} />
                <div className="text-xs font-medium text-heading">
                  Click to browse or drag &amp; drop files here
                </div>
                <div className="text-3xs text-text-muted mt-0.5">
                  PDF, DOC, XLS, PNG, JPG up to 15MB — attached files appear below
                </div>
              </div>
            </div>
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
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Remove document"
                        >
                          <IconTrash size={14} />
                        </button>
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
          onClick={() =>
            navigate(isEditMode ? `/sales-orders/${existingOrder.id}` : '/sales-orders')
          }
        >
          Cancel
        </CancelButton>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSave('Draft')}
        >
          Save as Draft
        </Button>
        <SaveButton
          type="button"
          icon={IconCheck}
          onClick={() => handleSave('Confirmed')}
        >
          Save &amp; Confirm
        </SaveButton>
      </FormActionsBar>
    </div>
  );
}

