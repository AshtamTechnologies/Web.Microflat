/**
 * QuotationViewPage.jsx — Full detailed view of Quotation record.
 *
 * Route: /quotations/:id
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { triggerPdfDownload } from '../../utils/fileHelpers';
import {
  IconBack,
  IconEdit,
  IconRefresh,
  IconCheck,
  IconSend,
  IconDownload,
  IconUpload,
  IconAdd,
  IconFileText,
  IconWarning,
  IconQuotation,
  IconChevronDown,
  IconChevronUp,
  IconPhone,
  IconMail,
  IconDelete,
} from '../../constants/icons';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  ScrollableTabs,
  DetailField,
  TableContainer,
  Th,
  Td,
  SearchableSelect,
  ConfirmModal,
  FormattedHtmlBlock,
} from '../../components/ui';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { clientService } from '../../services';
import { TAX_TREATMENTS, calculateQuotationTotals, formatCurrency } from '../../mocks/quotations';
import { formatAddressValue } from '../../models/quotations/quotationModel';
import { formatDate } from '../../utils/dateUtils';
import { isHtmlMarkup } from '../../utils/htmlUtils';
import ChangeStatusModal from './components/ChangeStatusModal';
import RecordPOModal from './components/RecordPOModal';
import AddNegotiationModal from './components/AddNegotiationModal';
import EditNegotiationModal from './components/EditNegotiationModal';
import UploadDocumentModal from './components/UploadDocumentModal';
import SendQuotationMailModal from './components/SendQuotationMailModal';
import useColumnResize from '../../hooks/useColumnResize';

export default function QuotationViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getQuotationById, fetchQuotationDetail, fetchLookups, submitForApproval, deleteNegotiationStage, lookups } = useQuotationsContext();
  const [quotationDetail, setQuotationDetail] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id && fetchQuotationDetail) {
      setIsLoadingDetail(true);
      fetchQuotationDetail(id)
        .then((res) => {
          if (isMounted && res) {
            setQuotationDetail(res);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingDetail(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id, fetchQuotationDetail]);

  const cachedQuotation = getQuotationById(id);
  const quotation = quotationDetail || cachedQuotation;

  const resolvedClientId =
    quotation?.clientId ||
    quotation?.client?.id ||
    quotation?.client?.clientId ||
    quotation?.inquiry?.clientId ||
    null;

  useEffect(() => {
    if (!resolvedClientId) return;
    let isMounted = true;
    clientService
      .getClientById(resolvedClientId)
      .then((detail) => {
        if (isMounted && detail) {
          setClientDetail(detail);
        }
      })
      .catch((err) => {
        console.warn('Could not load client detail for quotation view:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [resolvedClientId]);

  const clientContacts = useMemo(() => {
    if (!clientDetail) return quotation?.client?.contacts || [];
    return (
      clientDetail.currentDetail?.contacts ||
      clientDetail.contacts ||
      clientDetail.versions?.[0]?.contacts ||
      clientDetail.activeVersion?.contacts ||
      quotation?.client?.contacts ||
      []
    );
  }, [clientDetail, quotation?.client?.contacts]);

  const resolvedClientContact = useMemo(() => {
    if (!clientContacts || clientContacts.length === 0) return null;
    if (quotation?.clientContactId) {
      const byId = clientContacts.find(
        (c) => String(c.clientContactId || c.id) === String(quotation.clientContactId)
      );
      if (byId) return byId;
    }
    if (quotation?.contactPerson && quotation.contactPerson !== '—') {
      const byName = clientContacts.find(
        (c) =>
          (c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || '')
            .toLowerCase() === quotation.contactPerson.toLowerCase()
      );
      if (byName) return byName;
    }
    return clientContacts.find((c) => c.isPrimary) || clientContacts[0] || null;
  }, [clientContacts, quotation?.clientContactId, quotation?.contactPerson]);

  const resolvedContactPerson = useMemo(() => {
    if (quotation?.contactPerson && quotation.contactPerson !== '—') return quotation.contactPerson;
    if (resolvedClientContact) {
      return (
        resolvedClientContact.fullName ||
        `${resolvedClientContact.firstName || ''} ${resolvedClientContact.lastName || ''}`.trim() ||
        resolvedClientContact.name ||
        '—'
      );
    }
    return (
      clientDetail?.currentDetail?.contactPerson ||
      clientDetail?.contactPerson ||
      quotation?.client?.primaryContact ||
      quotation?.inquiry?.contactPerson ||
      '—'
    );
  }, [quotation?.contactPerson, quotation?.client, quotation?.inquiry, resolvedClientContact, clientDetail]);

  const resolvedContactPhone = useMemo(() => {
    if (quotation?.contactPhone) return quotation.contactPhone;
    if (resolvedClientContact) {
      return (
        resolvedClientContact.phoneNo ||
        resolvedClientContact.mobile1 ||
        resolvedClientContact.phone ||
        resolvedClientContact.contactPhone ||
        ''
      );
    }
    return (
      clientDetail?.currentDetail?.officialMobile ||
      clientDetail?.phone ||
      quotation?.client?.officialMobile ||
      quotation?.inquiry?.contactPhone ||
      ''
    );
  }, [quotation?.contactPhone, quotation?.client, quotation?.inquiry, resolvedClientContact, clientDetail]);

  const resolvedContactEmail = useMemo(() => {
    if (quotation?.contactEmail) return quotation.contactEmail;
    if (resolvedClientContact) {
      return (
        resolvedClientContact.email ||
        resolvedClientContact.officialEmail ||
        resolvedClientContact.contactEmail ||
        ''
      );
    }
    return (
      clientDetail?.currentDetail?.officialEmail ||
      clientDetail?.email ||
      quotation?.client?.officialEmail ||
      quotation?.inquiry?.contactEmail ||
      ''
    );
  }, [quotation?.contactEmail, quotation?.client, quotation?.inquiry, resolvedClientContact, clientDetail]);

  const resolvedClientAddress = useMemo(() => {
    const rawAddr = formatAddressValue(quotation?.clientAddress);
    if (rawAddr && rawAddr !== '—') return rawAddr;
    if (clientDetail) {
      const addrs =
        clientDetail.currentDetail?.addresses ||
        clientDetail.addresses ||
        clientDetail.versions?.[0]?.addresses ||
        [];
      if (quotation?.clientAddressId) {
        const matched = addrs.find((a) => String(a.clientAddressId || a.id) === String(quotation.clientAddressId));
        if (matched) return formatAddressValue(matched);
      }
      if (addrs[0]) return formatAddressValue(addrs[0]);
    }
    return formatAddressValue(quotation?.client?.addresses?.[0]) || '—';
  }, [quotation?.clientAddress, quotation?.clientAddressId, quotation?.client, clientDetail]);

  const enhancedQuotation = useMemo(() => {
    if (!quotation) return null;
    return {
      ...quotation,
      contactPerson: resolvedContactPerson && resolvedContactPerson !== '—' ? resolvedContactPerson : quotation.contactPerson,
      contactPhone: resolvedContactPhone || quotation.contactPhone,
      contactEmail: resolvedContactEmail || quotation.contactEmail,
      clientAddress: resolvedClientAddress && resolvedClientAddress !== '—' ? resolvedClientAddress : quotation.clientAddress,
      clientContactId: resolvedClientContact?.clientContactId || resolvedClientContact?.id || quotation.clientContactId,
    };
  }, [quotation, resolvedContactPerson, resolvedContactPhone, resolvedContactEmail, resolvedClientAddress, resolvedClientContact]);

  useEffect(() => {
    fetchLookups?.();
  }, [fetchLookups]);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isNegModalOpen, setIsNegModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [isEditNegModalOpen, setIsEditNegModalOpen] = useState(false);
  const [deletingStage, setDeletingStage] = useState(null);
  const [isDeleteNegModalOpen, setIsDeleteNegModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

  // Active Tab: 'overview' | 'revisions' | 'negotiation' | 'documents' | 'mail'
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedDescIds, setExpandedDescIds] = useState(() => new Set());

  // Active Revision to view (defaults to latest)
  const [selectedRevIndex, setSelectedRevIndex] = useState(() => {
    return quotation?.currentRevision !== undefined
      ? quotation.currentRevision
      : (quotation?.revisions?.length ? quotation.revisions.length - 1 : 0);
  });

  const latestRevIndex = (quotation?.revisions?.length || 1) - 1;
  const isViewingLatestRev = selectedRevIndex === latestRevIndex;

  const activeRevision = useMemo(() => {
    if (!quotation || !quotation.revisions || quotation.revisions.length === 0) return null;
    return quotation.revisions[selectedRevIndex] || quotation.revisions[latestRevIndex];
  }, [quotation, selectedRevIndex, latestRevIndex]);

  const displayedItems = useMemo(() => {
    if (activeRevision?.items && activeRevision.items.length > 0) {
      return activeRevision.items;
    }
    return quotation?.items || [];
  }, [activeRevision?.items, quotation?.items]);

  const activeTaxTreatment = activeRevision?.taxTreatment || quotation?.taxTreatment || 'INTRA_STATE';
  const activeTaxTreatmentLabel = useMemo(() => {
    return TAX_TREATMENTS.find((t) => t.value === activeTaxTreatment)?.label || activeTaxTreatment;
  }, [activeTaxTreatment]);

  const activeTaxes = useMemo(() => {
    const rawTaxes = activeRevision?.taxes || quotation?.taxes || [];
    if (Array.isArray(rawTaxes) && rawTaxes.length > 0) {
      return rawTaxes.map((t) => {
        const id = t.taxConfigDetailId || t.id || t;
        const matched = lookups?.taxes?.find((lt) => String(lt.taxConfigDetailId || lt.id) === String(id));
        return {
          id,
          taxConfigDetailId: id,
          taxName: matched?.taxName || t.taxName || t.name || 'GST',
          taxPercent: Number(matched?.taxPercent ?? t.taxPercent ?? t.rate ?? 0),
        };
      });
    }
    return [];
  }, [activeRevision?.taxes, quotation?.taxes, lookups?.taxes]);

  const activeTotalsBreakdown = useMemo(() => {
    return calculateQuotationTotals(
      displayedItems,
      activeTaxTreatment,
      activeTaxes,
      activeRevision?.otherCharges || quotation?.otherCharges || 0
    );
  }, [displayedItems, activeTaxTreatment, activeTaxes, activeRevision?.otherCharges, quotation?.otherCharges]);

  const itemsWithDescription = useMemo(() => {
    return displayedItems.filter((it) => Boolean(it.description?.trim()));
  }, [displayedItems]);

  const totalItemQuantity = useMemo(() => {
    return displayedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [displayedItems]);

  const allDescriptionsExpanded = useMemo(() => {
    if (itemsWithDescription.length === 0) return false;
    return displayedItems.every((it, idx) =>
      !it.description?.trim() || expandedDescIds.has(it.id || `row-${idx}`)
    );
  }, [displayedItems, itemsWithDescription.length, expandedDescIds]);

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
        (activeRevision?.items || [])
          .map((it, idx) => (it.description?.trim() ? (it.id || `row-${idx}`) : null))
          .filter(Boolean)
      );
      setExpandedDescIds(allKeys);
    }
  };

  // Options for Revision dropdown
  const revisionSelectOptions = useMemo(() => {
    return (quotation?.revisions || []).map((r, idx) => ({
      value: String(idx),
      label: `Revision ${r.revisionNo} ${idx === latestRevIndex ? '(Latest)' : ''}`,
    }));
  }, [quotation?.revisions, latestRevIndex]);

  // Column Resizing for Quoted Products Table
  const MIN_PRODUCT_COL_WIDTHS = useMemo(
    () => ({
      index: 44,
      product: 240,
      quantity: 70,
      rate: 110,
      otherCharges: 110,
      tax: 90,
      amount: 130,
    }),
    []
  );

  const INITIAL_PRODUCT_COL_WIDTHS = useMemo(
    () => ({
      index: 48,
      product: 360,
      quantity: 80,
      rate: 140,
      otherCharges: 130,
      tax: 100,
      amount: 150,
    }),
    []
  );

  const {
    colWidths: productColWidths,
    resizingCol: resizingProductCol,
    handleStartResize: handleStartProductResize,
  } = useColumnResize(INITIAL_PRODUCT_COL_WIDTHS, MIN_PRODUCT_COL_WIDTHS);

  if (!quotation && isLoadingDetail) {
    return (
      <div className="p-12 text-center text-text-muted text-sm animate-pulse">
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-heading">Quotation Not Found</h2>
        <p className="text-xs text-text-muted">The requested quotation ({id}) does not exist.</p>
        <Button variant="primary" onClick={() => navigate('/quotations')}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'revisions', label: `Revisions (${quotation.revisions?.length || 1})` },
    { id: 'negotiation', label: `Negotiation (${quotation.negotiations?.length || 0})` },
    { id: 'documents', label: `Documents (${quotation.documents?.length || 0})` },
    { id: 'mail', label: `Mail Log (${quotation.mailLogs?.length || 0})` },
  ];

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Top PageHeader with Standard Back Button & Action Toolbar ── */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-heading">{quotation.quotationNo}</span>
            <Badge
              variant={
                quotation.status === 'Confirmed'
                  ? 'success'
                  : quotation.status === 'In Negotiation'
                  ? 'warning'
                  : quotation.status === 'Sent'
                  ? 'info'
                  : quotation.status === 'Lost'
                  ? 'danger'
                  : 'neutral'
              }
              size="md"
            >
              {quotation.status}
            </Badge>

            {quotation.poReceived && (
              <Badge variant="role" size="md">
                PO Received
              </Badge>
            )}

            {quotation.approvalStatus === 2 || quotation.pendingApprovalRequestId ? (
              <Link
                to="/approvals?module=QUOTATION"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                title="Click to view in Approvals Queue"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Approval Pending
              </Link>
            ) : quotation.approvalStatus === 3 ? (
              <Badge variant="success" size="md">
                Approved
              </Badge>
            ) : quotation.approvalStatus === 4 ? (
              <Badge variant="danger" size="md">
                Approval Rejected
              </Badge>
            ) : null}
          </div>
        }
        subtitle={
          <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-heading">{quotation.clientName}</span>
            <span>·</span>
            <span>
              Inquiry: <span className="font-mono">{quotation.inquiryNo}</span>
            </span>
            <span>·</span>
            <span>
              Total:{' '}
              <strong className="text-primary font-mono">
                {formatCurrency(
                  activeRevision?.grandTotal || 0,
                  activeRevision?.currency || quotation.currency
                )}
              </strong>
            </span>
          </div>
        }
        icon={<IconQuotation className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/quotations')}
          >
            Back to Quotations
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quotation PDF download hidden until backend provides PDF generation endpoint */}
            {/* <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                triggerPdfDownload(`Quotation-${quotation.quotationNo}-Rev${activeRevision?.revisionNo ?? 0}.pdf`, {
                  title: `Commercial Quotation ${quotation.quotationNo}`,
                  documentType: 'Official Quotation',
                  fileName: `Quotation-${quotation.quotationNo}.pdf`,
                  clientName: quotation.clientName,
                  quotationNo: quotation.quotationNo,
                  revisionNo: `Rev ${activeRevision?.revisionNo ?? 0}`,
                  totalAmount: activeRevision?.grandTotal ? formatCurrency(activeRevision.grandTotal, quotation.currency) : undefined,
                  uploadedAt: activeRevision?.revisionDate || quotation.revisionDate || new Date().toISOString().split('T')[0],
                  remarks: `Client: ${quotation.clientName} | Inquiry: ${quotation.inquiryNo || 'Direct'}`,
                });
              }}
              icon={<IconDownload size={14} />}
            >
              Download PDF
            </Button> */}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              icon={<IconRefresh size={14} />}
            >
              Change Status
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/quotations/${quotation.id}/new-revision`)}
              icon={<IconEdit size={14} />}
            >
              New Revision
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsMailModalOpen(true)}
              icon={<IconSend size={14} />}
            >
              Send Mail
            </Button>

            {quotation.canSubmitForApproval && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => submitForApproval(quotation.id)}
                icon={<IconCheck size={14} />}
              >
                Submit for Approval
              </Button>
            )}

            {quotation.status !== 'Cancelled' && quotation.status !== 'Rejected' && (
              <Button
                variant={quotation.poReceived ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setIsPoModalOpen(true)}
                icon={<IconFileText size={14} />}
                className={!quotation.poReceived ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' : ''}
              >
                {quotation.poReceived ? 'Update Customer PO' : 'Record Customer PO'}
              </Button>
            )}
          </div>
        }
      />

      {/* Confirmation & Customer PO Alert Banner */}
      {(quotation.poReceived || quotation.status === 'Confirmed') && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <IconCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                <span>Customer PO Received:</span>
                <span className="font-mono font-bold text-sm bg-emerald-600/10 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded border border-emerald-500/30">
                  {quotation.poDetails?.poNumber || 'Client PO on File'}
                </span>
                <span className="inline-flex items-center gap-1 text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  <IconCheck size={10} />
                  Linked to Rev {quotation.currentRevision ?? latestRevIndex} (Latest Agreed)
                </span>
              </div>
              <p className="text-2xs text-emerald-700/80 dark:text-emerald-300/80">
                Received on <strong>{formatDate(quotation.poDetails?.receivedOn || quotation.confirmedOn || '2026-10-30')}</strong>
                {quotation.poDetails?.fileName && (
                  <span> · Attached Document: <strong>{quotation.poDetails.fileName}</strong></span>
                )}
                . A Sales Order can now be generated from this quotation.
              </p>
              {selectedRevIndex !== latestRevIndex && (
                <div className="mt-1 text-3xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                  <span>⚠️ You are viewing historical Rev {selectedRevIndex}. The Customer PO was awarded against Rev {latestRevIndex} (Latest).</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {quotation.poDetails?.fileName && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  triggerPdfDownload(quotation.poDetails.fileName || `Client-PO-${quotation.quotationNo}.pdf`, {
                    title: `Customer Purchase Order (${quotation.poDetails.poNumber})`,
                    documentType: quotation.poDetails.documentTypeName || 'Customer Purchase Order',
                    fileName: quotation.poDetails.fileName || `Client-PO-${quotation.quotationNo}.pdf`,
                    clientName: quotation.clientName,
                    quotationNo: quotation.quotationNo,
                    poNumber: quotation.poDetails.poNumber,
                    receivedOn: quotation.poDetails.receivedOn,
                    expectedDeliveryDate: quotation.poDetails.expectedDeliveryDate,
                    totalAmount: activeRevision?.grandTotal ? formatCurrency(activeRevision.grandTotal, quotation.currency) : undefined,
                    uploadedAt: quotation.poDetails.receivedOn,
                    remarks: quotation.poDetails.remarks || 'Customer PO Verified & Linked to Quotation',
                  });
                }}
                icon={<IconDownload size={13} />}
                className="text-xs bg-white/70 dark:bg-surface border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              >
                Download PO
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPoModalOpen(true)}
              className="text-xs bg-white/70 dark:bg-surface border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
            >
              Edit PO Details
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(`/sales-orders/new?quotationId=${quotation.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
            >
              Generate Sales Order
            </Button>
          </div>
        </div>
      )}

      {/* Awaiting Customer PO Callout (When Approved but PO not yet received) */}
      {quotation.status === 'Approved' && !quotation.poReceived && (
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <IconInfo size={16} className="text-blue-600 shrink-0" />
            <span>
              Quotation approved! Awaiting customer Purchase Order (PO) to confirm and create the Sales Order.
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsPoModalOpen(true)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
          >
            Record Customer PO
          </Button>
        </div>
      )}

      {/* Revision Switching Bar & Alert */}
      {!isViewingLatestRev && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <IconWarning size={16} className="shrink-0 text-amber-600" />
          <span>
            You are currently viewing historical <strong>Revision {selectedRevIndex}</strong> in read-only mode. Only the latest revision can be amended via a new revision.
          </span>
        </div>
      )}

      {/* Tabs and Revision Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-1">
        <ScrollableTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex items-center gap-2 self-end sm:self-auto pb-2">
          <span className="text-2xs text-text-muted font-medium whitespace-nowrap">Viewing:</span>
          <div className="w-56">
            <SearchableSelect
              size="sm"
              options={revisionSelectOptions}
              value={String(selectedRevIndex)}
              onChange={(e) => setSelectedRevIndex(Number(e.target.value))}
              placeholder="Select revision..."
              searchPlaceholder="Search revision..."
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW (Option A Balanced Grid + Terms After Quoted Products) ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Summary Grid: Client & Contact (6 cols) + Quotation Summary (6 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Client & Contact Details */}
            <Card title="Client & Contact Details" className="lg:col-span-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Client Company" value={quotation.clientName} />
                <DetailField
                  label="Contact Person"
                  value={resolvedContactPerson || '—'}
                />
                <DetailField
                  label="Phone"
                  value={resolvedContactPhone || ''}
                  icon={IconPhone}
                  isPhone={Boolean(resolvedContactPhone)}
                  mono
                />
                <DetailField
                  label="Email"
                  value={resolvedContactEmail || ''}
                  icon={IconMail}
                  isEmail={Boolean(resolvedContactEmail)}
                />
                <DetailField
                  label="Billing / Shipping Address"
                  value={resolvedClientAddress || '—'}
                  className="sm:col-span-2"
                />
              </div>
            </Card>

            {/* Quotation Summary */}
            <Card title="Quotation Summary" className="lg:col-span-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailField
                  label="Inquiry Ref"
                  value={quotation.inquiryNo || 'Direct / Manual'}
                  mono
                />
                <DetailField
                  label="Revision Date"
                  value={activeRevision?.revisionDate ? formatDate(activeRevision.revisionDate) : '—'}
                  mono
                />
                <DetailField
                  label="Valid Until"
                  value={quotation.validUntil ? formatDate(quotation.validUntil) : '—'}
                  mono
                />
                <DetailField
                  label="Currency"
                  value={activeRevision?.currency || quotation.currency || 'INR'}
                  mono
                />
                <DetailField
                  label="Tax Regime"
                  value={activeTaxTreatmentLabel}
                />
                <DetailField
                  label="Last Updated By"
                  value={quotation.lastUpdatedBy || '—'}
                />
                {activeRevision?.revisionReason && (
                  <DetailField
                    label="Revision Notes"
                    value={activeRevision.revisionReason}
                    className="col-span-2 sm:col-span-3 pt-2 border-t border-border/60"
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Quoted Products Grid (Resizable Columns + Click-to-Toggle Description) */}
          <Card
            title={
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span>Quoted Products (Revision {activeRevision?.revisionNo || 0})</span>
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
              </div>
            }
            subtitle="Engineered items, unit rates, other charges, and tax calculations"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <TableContainer>
                <colgroup>
                  <col style={{ width: `${productColWidths.index}px` }} />
                  <col style={{ width: `${productColWidths.product}px` }} />
                  <col style={{ width: `${productColWidths.quantity}px` }} />
                  <col style={{ width: `${productColWidths.rate}px` }} />
                  <col style={{ width: `${productColWidths.otherCharges}px` }} />
                  <col style={{ width: `${productColWidths.tax}px` }} />
                  <col style={{ width: `${productColWidths.amount}px` }} />
                </colgroup>
                <thead>
                  <tr>
                    <Th style={{ width: `${productColWidths.index}px` }} className="text-center">#</Th>
                    <Th
                      style={{ width: `${productColWidths.product}px` }}
                      isResizing={resizingProductCol === 'product'}
                      resizeHandler={(e) => handleStartProductResize(e, 'product')}
                    >
                      PRODUCT / VARIANT
                    </Th>
                    <Th
                      style={{ width: `${productColWidths.quantity}px` }}
                      isResizing={resizingProductCol === 'quantity'}
                      resizeHandler={(e) => handleStartProductResize(e, 'quantity')}
                      className="text-center"
                    >
                      QTY
                    </Th>
                    <Th
                      style={{ width: `${productColWidths.rate}px` }}
                      isResizing={resizingProductCol === 'rate'}
                      resizeHandler={(e) => handleStartProductResize(e, 'rate')}
                      className="text-right"
                    >
                      RATE ({quotation.currency})
                    </Th>
                    <Th
                      style={{ width: `${productColWidths.otherCharges}px` }}
                      isResizing={resizingProductCol === 'otherCharges'}
                      resizeHandler={(e) => handleStartProductResize(e, 'otherCharges')}
                      className="text-right"
                    >
                      OTHER CHARGES
                    </Th>
                    <Th
                      style={{ width: `${productColWidths.tax}px` }}
                      isResizing={resizingProductCol === 'tax'}
                      resizeHandler={(e) => handleStartProductResize(e, 'tax')}
                      className="text-center"
                    >
                      TAX %
                    </Th>
                    <Th
                      style={{ width: `${productColWidths.amount}px` }}
                      isResizing={resizingProductCol === 'amount'}
                      resizeHandler={(e) => handleStartProductResize(e, 'amount')}
                      className="text-right"
                    >
                      LINE AMOUNT
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedItems.map((item, idx) => {
                    const lineAmount =
                      (Number(item.quantity) || 0) * (Number(item.rate) || 0) +
                      (Number(item.otherCharges) || 0);
                    const lineTax = (lineAmount * (Number(item.taxPercent) || 0)) / 100;
                    const lineTotalWithTax = lineAmount + lineTax;
                    const itemKey = item.id || `row-${idx}`;
                    const hasDescription = Boolean(item.description?.trim());
                    const isDescExpanded = hasDescription && expandedDescIds.has(itemKey);

                    return (
                      <tr key={itemKey} className="hover:bg-surface/50 transition-colors">
                        <Td className="text-center font-mono text-xs text-text-muted align-top">
                          {idx + 1}
                        </Td>
                        <Td className="text-xs align-top">
                          <div className="font-bold text-heading">{item.productName}</div>
                          <div className="font-mono text-2xs text-primary font-medium">
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
                                <div className="mt-1.5 p-2.5 rounded-lg border border-border bg-surface/60 text-2xs text-heading whitespace-pre-line leading-relaxed max-w-xl">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          )}
                        </Td>
                        <Td className="text-center font-mono font-bold text-xs text-heading align-top">
                          {item.quantity}
                        </Td>
                        <Td className="text-right font-mono text-xs text-heading align-top">
                          {formatCurrency(item.rate, quotation.currency)}
                        </Td>
                        <Td className="text-right font-mono text-xs text-text-muted align-top">
                          {Number(item.otherCharges) > 0
                            ? formatCurrency(item.otherCharges, quotation.currency)
                            : '—'}
                        </Td>
                        <Td className="text-center font-mono text-xs text-text-muted align-top">
                          {item.taxPercent}%
                        </Td>
                        <Td className="text-right font-mono text-xs text-heading align-top">
                          <div className="font-bold text-heading">
                            {formatCurrency(lineTotalWithTax, quotation.currency)}
                          </div>
                          {lineTax > 0 && (
                            <div className="text-3xs text-text-muted font-normal font-sans">
                              Excl: {formatCurrency(lineAmount, quotation.currency)}
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>

            {/* Totals & Tax Breakdown Summary (Utilizes Full Footer Width) */}
            <div className="p-4 sm:p-5 bg-surface/30 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xs font-bold text-text-muted uppercase tracking-wider">
                    Applicable Taxes:
                  </span>
                  {activeTotalsBreakdown.taxesBreakdown && activeTotalsBreakdown.taxesBreakdown.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeTotalsBreakdown.taxesBreakdown.map((tx, idx) => (
                        <Badge key={tx.id || idx} variant="neutral" size="sm">
                          {tx.name} ({tx.percent}%)
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {activeTaxTreatmentLabel}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-2xs text-text-muted">
                  <span>
                    <strong className="font-mono text-heading">{(activeRevision?.items || []).length}</strong> {(activeRevision?.items || []).length === 1 ? 'Product' : 'Products'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="font-mono text-heading">{totalItemQuantity}</strong> {totalItemQuantity === 1 ? 'Unit total' : 'Units total'}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-80 space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(activeTotalsBreakdown.subtotal || activeRevision?.subtotal || 0, quotation.currency)}
                  </span>
                </div>

                {Number(activeTotalsBreakdown.otherCharges || activeRevision?.otherCharges) > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Other Charges:</span>
                    <span className="font-mono font-semibold text-heading">
                      {formatCurrency(activeTotalsBreakdown.otherCharges || activeRevision?.otherCharges, quotation.currency)}
                    </span>
                  </div>
                )}

                {Number(activeTotalsBreakdown.lineTaxAmount) > 0 && !activeTotalsBreakdown.isLineTaxesBreakdown && (
                  <div className="flex justify-between text-text-muted text-2xs py-1 px-2.5 bg-surface/50 rounded border border-border/50">
                    <span>Product Line Taxes:</span>
                    <span className="font-mono font-medium text-heading">
                      {formatCurrency(activeTotalsBreakdown.lineTaxAmount, quotation.currency)}
                    </span>
                  </div>
                )}

                {activeTotalsBreakdown.taxesBreakdown && activeTotalsBreakdown.taxesBreakdown.length > 0 && (
                  <div className="space-y-1.5 py-1.5 px-2.5 bg-surface/60 rounded-lg border border-border/60">
                    {activeTotalsBreakdown.taxesBreakdown.map((tx, idx) => (
                      <div key={tx.id || idx} className="flex justify-between items-center text-text-muted text-2xs">
                        <span>{tx.name} ({tx.percent}%):</span>
                        <span className="font-mono font-medium text-heading">
                          {formatCurrency(tx.amount, quotation.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-text-muted pt-1">
                  <span>Total Tax:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(activeTotalsBreakdown.taxAmount ?? activeRevision?.taxAmount ?? activeTotalsBreakdown.totalTax ?? 0, quotation.currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-heading">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-base sm:text-lg">
                    {formatCurrency(activeTotalsBreakdown.grandTotal ?? activeRevision?.grandTotal ?? 0, quotation.currency)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Commercial Terms & Condition (Shown AFTER Quoted Products) */}
          <Card
            title="Commercial Terms & Condition"
            subtitle="Agreed payment milestones, delivery schedule, and contractual clauses"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: 'Payment Terms',
                    raw: activeRevision?.paymentTerms || quotation.paymentTerms || quotation.paymentTermName,
                  },
                  {
                    label: 'Delivery Terms',
                    raw: activeRevision?.deliveryTerms || quotation.deliveryTerms,
                  },
                ].map((section) => {
                  const raw = section.raw;
                  const isHtml = isHtmlMarkup(raw);
                  let items = [];
                  if (!isHtml && raw) {
                    if (Array.isArray(raw)) {
                      items = raw.filter((i) => !isHtmlMarkup(i));
                    } else if (typeof raw === 'string' && raw.trim()) {
                      const trimmed = raw.trim();
                      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        try {
                          const p = JSON.parse(trimmed);
                          if (Array.isArray(p)) items = p.filter((i) => !isHtmlMarkup(i));
                        } catch {
                          // ignore
                        }
                      }
                      if (items.length === 0) {
                        items = trimmed.includes(',')
                          ? trimmed.split(',').map((s) => s.trim()).filter((s) => s && !isHtmlMarkup(s))
                          : [trimmed];
                      }
                    }
                  }

                  return (
                    <div
                      key={section.label}
                      className="bg-surface/40 border border-border/60 rounded-lg p-3.5"
                    >
                      <DetailField label={section.label}>
                        {isHtml ? (
                          <FormattedHtmlBlock content={raw} className="mt-1.5" />
                        ) : items.length === 0 ? (
                          <p className="text-xs text-text-muted italic mt-1.5">—</p>
                        ) : (
                          <ul className="space-y-1.5 mt-1.5">
                            {items.map((term, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-xs text-heading leading-relaxed"
                              >
                                <IconCheck
                                  size={13}
                                  className="text-primary shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <span>{typeof term === 'object' ? (term.name || term.termName || term.description || term.termCode || JSON.stringify(term)) : term}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </DetailField>
                    </div>
                  );
                })}
              </div>

              {quotation.termsAndConditions && (
                <div className="pt-3 border-t border-border">
                  <DetailField label="Terms & Conditions Clauses">
                    <div className="text-xs text-heading leading-relaxed whitespace-pre-line bg-surface/40 p-3.5 rounded-lg border border-border/60 mt-1">
                      {quotation.termsAndConditions}
                    </div>
                  </DetailField>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: REVISIONS ── */}
      {activeTab === 'revisions' && (
        <Card title="Revision History" subtitle="Audit trail of quotation modifications" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <TableContainer>
              <thead>
                <tr>
                  <Th className="w-32">REVISION</Th>
                  <Th className="w-36">DATE</Th>
                  <Th>CHANGE REASON</Th>
                  <Th className="w-28 text-center">STATUS</Th>
                  <Th className="w-36 text-right">TOTAL</Th>
                  <Th className="w-24 text-right">ACTION</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...(quotation.revisions || [])].reverse().map((rev) => (
                  <tr key={rev.revisionNo} className="hover:bg-surface/50 transition-colors">
                    <Td className="font-mono text-xs font-bold text-heading">
                      Rev {rev.revisionNo}{' '}
                      {rev.revisionNo === latestRevIndex && (
                        <Badge variant="role" size="sm" className="ml-1">
                          Latest
                        </Badge>
                      )}
                      {(quotation.poReceived || quotation.status === 'Confirmed') && rev.revisionNo === latestRevIndex && (
                        <Badge variant="success" size="sm" className="ml-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          PO Confirmed
                        </Badge>
                      )}
                      {(quotation.poReceived || quotation.status === 'Confirmed') && rev.revisionNo < latestRevIndex && (
                        <Badge variant="neutral" size="sm" className="ml-1 opacity-70">
                          Superseded
                        </Badge>
                      )}
                    </Td>
                    <Td className="font-mono text-xs text-text-muted">
                      {formatDate(rev.revisionDate)}
                    </Td>
                    <Td className="text-xs text-heading">
                      {rev.revisionReason || '—'}
                    </Td>
                    <Td className="text-center">
                      <Badge variant={rev.status === 'Sent' ? 'info' : 'neutral'} size="sm">
                        {rev.status}
                      </Badge>
                    </Td>
                    <Td className="text-right font-mono font-bold text-xs text-heading">
                      {formatCurrency(rev.grandTotal, quotation.currency)}
                    </Td>
                    <Td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRevIndex(rev.revisionNo);
                          setActiveTab('overview');
                        }}
                      >
                        View
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          </div>
        </Card>
      )}

      {/* ── TAB 3: NEGOTIATION ── */}
      {activeTab === 'negotiation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Log commercial meetings, client counter-offers, and agreed pricing adjustments.
            </p>
            {quotation.status !== 'Confirmed' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNegModalOpen(true)}
                icon={<IconAdd size={14} />}
              >
                Add Stage
              </Button>
            )}
          </div>

          {(quotation.negotiations || []).length === 0 ? (
            <div className="p-12 text-center bg-card dark:bg-card-dark rounded-xl border border-border">
              <p className="text-xs text-text-muted">No negotiation stages recorded yet.</p>
              {quotation.status !== 'Confirmed' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsNegModalOpen(true)}
                >
                  Record First Stage
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-border before:z-0 scrollbar-thin">
              {quotation.negotiations.map((stg, idx) => {
                const stageNum = stg.stageNo ?? stg.stageId ?? (idx + 1);
                const handledBy = stg.handledByName || stg.handledBy || 'Sales Exec';
                const clientContact = stg.contactName || stg.clientContact || 'Client Contact';
                const ourOffer = stg.ourOfferAmount ?? stg.ourOffer;
                const clientCounter = stg.clientCounterAmount ?? stg.clientCounter;
                const dateDisplay = (stg.negotiationOn || stg.createdOn || stg.dateTime || '').replace('T', ' ');

                return (
                  <div
                    key={stg.id || stg.stageId || stageNum}
                    className="relative z-10 pl-10 group"
                  >
                    <div className="absolute left-3.5 top-5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
                    <div className="bg-card dark:bg-card-dark p-4 rounded-xl border border-border shadow-2xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-heading">
                            Stage {stageNum} · {stg.mode || 'Call'}
                          </span>
                          <Badge variant="neutral" size="sm">
                            Rev {stg.revisionNo ?? 0}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs text-text-muted">
                            {dateDisplay}
                          </span>
                          {quotation.status !== 'Confirmed' && (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                type="button"
                                title="Edit Stage"
                                onClick={() => {
                                  setEditingStage(stg);
                                  setIsEditNegModalOpen(true);
                                }}
                                className="p-1 text-text-muted hover:text-primary hover:bg-surface rounded transition-colors cursor-pointer"
                              >
                                <IconEdit size={13} />
                              </button>
                              <button
                                type="button"
                                title="Delete Stage"
                                onClick={() => {
                                  setDeletingStage(stg);
                                  setIsDeleteNegModalOpen(true);
                                }}
                                className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors cursor-pointer"
                              >
                                <IconDelete size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-2xs text-text-muted">
                        {handledBy} with <strong>{clientContact}</strong>
                      </div>

                      <p className="text-xs text-heading mt-1">{stg.discussion || stg.notes || ''}</p>

                      {(ourOffer !== null && ourOffer !== undefined || clientCounter !== null && clientCounter !== undefined) && (
                        <div className="pt-2 border-t border-border flex items-center gap-4 text-xs">
                          {ourOffer !== null && ourOffer !== undefined && (
                            <span>
                              Our Offer:{' '}
                              <strong className="font-mono text-heading">
                                {formatCurrency(ourOffer, quotation.currency)}
                              </strong>
                            </span>
                          )}
                          {clientCounter !== null && clientCounter !== undefined && (
                            <span>
                              Client Counter:{' '}
                              <strong className="font-mono text-primary font-bold">
                                {formatCurrency(clientCounter, quotation.currency)}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Signed quotations, client Purchase Orders, and technical specifications.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDocModalOpen(true)}
              icon={<IconUpload size={14} />}
            >
              Upload Document
            </Button>
          </div>

          <Card bodyClassName="p-0">
            <div className="overflow-x-auto">
              <TableContainer>
                <thead>
                  <tr>
                    <Th>FILE NAME</Th>
                    <Th className="w-36">TYPE</Th>
                    <Th className="w-24 text-center">REVISION</Th>
                    <Th className="w-32">LINKED STAGE</Th>
                    <Th className="w-32">UPLOADED</Th>
                    <Th className="w-24 text-right">SIZE</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(quotation.documents || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted text-xs">
                        No documents uploaded for this quotation yet.
                      </td>
                    </tr>
                  ) : (
                    quotation.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface/50 transition-colors">
                        <Td className="text-xs font-semibold text-primary flex items-center gap-2">
                          <IconFileText size={16} className="text-text-muted" />
                          <span className="hover:underline cursor-pointer">{doc.fileName}</span>
                        </Td>
                        <Td className="text-xs text-heading">{doc.documentType}</Td>
                        <Td className="text-center font-mono text-xs">Rev {doc.revisionNo}</Td>
                        <Td className="text-xs text-text-muted">{doc.linkedStage || '—'}</Td>
                        <Td className="font-mono text-xs text-text-muted">
                          {formatDate(doc.uploadedAt)}
                        </Td>
                        <Td className="text-right font-mono text-2xs text-text-muted">
                          {doc.fileSize}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 5: MAIL LOG ── */}
      {activeTab === 'mail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Record of quotation emails sent directly to the client.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMailModalOpen(true)}
              icon={<IconSend size={14} />}
            >
              Send Mail
            </Button>
          </div>

          <Card bodyClassName="p-0">
            <div className="overflow-x-auto">
              <TableContainer>
                <thead>
                  <tr>
                    <Th className="w-36">SENT ON</Th>
                    <Th className="w-48">TO</Th>
                    <Th>SUBJECT</Th>
                    <Th className="w-24 text-center">REVISION</Th>
                    <Th className="w-28 text-center">RESULT</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(quotation.mailLogs || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-muted text-xs">
                        No email history recorded for this quotation.
                      </td>
                    </tr>
                  ) : (
                    quotation.mailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                        <Td className="font-mono text-xs text-text-muted">{log.sentAt}</Td>
                        <Td className="text-xs font-medium text-heading">{log.to}</Td>
                        <Td className="text-xs text-heading">{log.subject}</Td>
                        <Td className="text-center font-mono text-xs">Rev {log.revisionNo}</Td>
                        <Td className="text-center">
                          <Badge
                            variant={log.result === 'Success' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {log.result}
                          </Badge>
                          {log.error && (
                            <span className="block text-3xs text-danger mt-0.5">{log.error}</span>
                          )}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableContainer>
            </div>
          </Card>
        </div>
      )}

      {/* MODALS */}
      <ChangeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        quotation={quotation}
      />

      <RecordPOModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        quotation={quotation}
      />

      <AddNegotiationModal
        isOpen={isNegModalOpen}
        onClose={() => setIsNegModalOpen(false)}
        quotation={enhancedQuotation || quotation}
      />

      <EditNegotiationModal
        isOpen={isEditNegModalOpen}
        onClose={() => {
          setIsEditNegModalOpen(false);
          setEditingStage(null);
        }}
        stage={editingStage}
        quotation={enhancedQuotation || quotation}
      />

      <ConfirmModal
        isOpen={isDeleteNegModalOpen}
        onClose={() => {
          setIsDeleteNegModalOpen(false);
          setDeletingStage(null);
        }}
        onConfirm={async () => {
          if (deletingStage && quotation) {
            await deleteNegotiationStage(quotation.id, deletingStage.id || deletingStage.stageId);
          }
          setIsDeleteNegModalOpen(false);
          setDeletingStage(null);
        }}
        title="Delete Negotiation Stage"
        message={`Are you sure you want to delete Stage ${deletingStage?.stageNo ?? deletingStage?.stageId ?? ''}? This action cannot be undone.`}
        confirmText="Delete Stage"
        confirmVariant="danger"
      />

      <UploadDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        quotation={quotation}
      />

      <SendQuotationMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        quotation={enhancedQuotation || quotation}
      />
    </div>
  );
}
