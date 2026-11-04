/**
 * QuotationViewPage.jsx — Full detailed view of Quotation record.
 *
 * Route: /quotations/:id
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Select,
  SearchableSelect,
} from '../../components/ui';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { formatCurrency } from '../../mocks/quotations';
import { formatDate } from '../../utils/dateUtils';
import QuotationStepper from './components/QuotationStepper';
import ChangeStatusModal from './components/ChangeStatusModal';
import RecordPOModal from './components/RecordPOModal';
import AddNegotiationModal from './components/AddNegotiationModal';
import UploadDocumentModal from './components/UploadDocumentModal';
import SendQuotationMailModal from './components/SendQuotationMailModal';
import useColumnResize from '../../hooks/useColumnResize';

export default function QuotationViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getQuotationById } = useQuotationsContext();

  const quotation = getQuotationById(id);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isNegModalOpen, setIsNegModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

  // Active Tab: 'overview' | 'revisions' | 'negotiation' | 'documents' | 'mail'
  const [activeTab, setActiveTab] = useState('overview');

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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // static: does nothing right now
              }}
              icon={<IconDownload size={14} />}
            >
              Download PDF
            </Button>

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
              variant="primary"
              size="sm"
              onClick={() => setIsMailModalOpen(true)}
              icon={<IconSend size={14} />}
            >
              Send Mail
            </Button>
          </div>
        }
      />

      {/* Stepper */}
      <QuotationStepper status={quotation.status} poReceived={quotation.poReceived} />

      {/* Confirmation Sales Order Alert */}
      {quotation.status === 'Confirmed' && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <IconCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              Confirmed on <strong>{formatDate(quotation.confirmedOn || '2026-10-30')}</strong>. A Sales Order can now be generated from this quotation.
            </span>
          </div>
          <button
            type="button"
            disabled
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium text-2xs opacity-80 cursor-not-allowed shrink-0"
          >
            Create Sales Order (Coming Soon)
          </button>
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

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <Card title="Client Details">
              <div className="space-y-3">
                <DetailField label="Client Company" value={quotation.clientName} />
                <DetailField label="Address" value={quotation.clientAddress || '—'} />
                <DetailField
                  label="Contact"
                  value={
                    quotation.contactPerson
                      ? `${quotation.contactPerson} · ${quotation.contactPhone || quotation.contactEmail || ''}`
                      : '—'
                  }
                />
              </div>
            </Card>

            {/* Commercial Terms */}
            <Card title="Commercial & Delivery Terms">
              <div className="space-y-3">
                <DetailField
                  label="Payment Terms"
                  value={
                    Array.isArray(quotation.paymentTerms)
                      ? quotation.paymentTerms.join(', ')
                      : (quotation.paymentTerms || 'Net 30 Days')
                  }
                />
                <DetailField
                  label="Currency & Validity"
                  value={`${quotation.currency} · Valid until ${
                    quotation.validUntil ? formatDate(quotation.validUntil) : '—'
                  }`}
                />
                <DetailField
                  label="Delivery Terms"
                  value={
                    Array.isArray(quotation.deliveryTerms)
                      ? quotation.deliveryTerms.join(', ')
                      : (quotation.deliveryTerms || 'Ex-works Ahmedabad, 4–6 weeks')
                  }
                />
                {quotation.termsAndConditions && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-3xs font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Terms & Conditions Clauses
                    </span>
                    <p className="text-xs text-heading whitespace-pre-line bg-surface/40 p-2.5 rounded-lg border border-border/60 font-mono">
                      {quotation.termsAndConditions}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Product Lines Grid (Resizable Columns) */}
          <Card
            title={`Quoted Products (Revision ${activeRevision?.revisionNo || 0})`}
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
                  {(activeRevision?.items || []).map((item, idx) => {
                    const lineAmount =
                      (Number(item.quantity) || 0) * (Number(item.rate) || 0) +
                      (Number(item.otherCharges) || 0);

                    return (
                      <tr key={item.id || idx} className="hover:bg-surface/50 transition-colors">
                        <Td className="text-center font-mono text-xs text-text-muted">
                          {idx + 1}
                        </Td>
                        <Td className="text-xs">
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
                        </Td>
                        <Td className="text-center font-mono font-bold text-xs text-heading">
                          {item.quantity}
                        </Td>
                        <Td className="text-right font-mono text-xs text-heading">
                          {formatCurrency(item.rate, quotation.currency)}
                        </Td>
                        <Td className="text-right font-mono text-xs text-text-muted">
                          {Number(item.otherCharges) > 0
                            ? formatCurrency(item.otherCharges, quotation.currency)
                            : '—'}
                        </Td>
                        <Td className="text-center font-mono text-xs text-text-muted">
                          {item.taxPercent}%
                        </Td>
                        <Td className="text-right font-mono font-bold text-xs text-heading">
                          {formatCurrency(lineAmount, quotation.currency)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>

            {/* Totals Summary */}
            <div className="p-4 bg-surface/30 border-t border-border flex justify-end">
              <div className="w-80 space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(activeRevision?.subtotal || 0, quotation.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Tax Amount:</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(activeRevision?.totalTax || 0, quotation.currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-sm text-heading">
                  <span>Total Amount:</span>
                  <span className="font-mono text-primary text-base">
                    {formatCurrency(activeRevision?.grandTotal || 0, quotation.currency)}
                  </span>
                </div>
              </div>
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNegModalOpen(true)}
              icon={<IconAdd size={14} />}
            >
              Add Stage
            </Button>
          </div>

          {(quotation.negotiations || []).length === 0 ? (
            <div className="p-12 text-center bg-card dark:bg-card-dark rounded-xl border border-border">
              <p className="text-xs text-text-muted">No negotiation stages recorded yet.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setIsNegModalOpen(true)}
              >
                Record First Stage
              </Button>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-border before:z-0 scrollbar-thin">
              {quotation.negotiations.map((stg) => (
                <div
                  key={stg.stageNo}
                  className="relative z-10 pl-10 group"
                >
                  <div className="absolute left-3.5 top-5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
                  <div className="bg-card dark:bg-card-dark p-4 rounded-xl border border-border shadow-2xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-heading">
                          Stage {stg.stageNo} · {stg.mode}
                        </span>
                        <Badge variant="neutral" size="sm">
                          Rev {stg.revisionNo}
                        </Badge>
                      </div>
                      <span className="font-mono text-2xs text-text-muted">
                        {stg.dateTime?.replace('T', ' ')}
                      </span>
                    </div>

                    <div className="text-2xs text-text-muted">
                      {stg.handledBy} with <strong>{stg.clientContact}</strong>
                    </div>

                    <p className="text-xs text-heading mt-1">{stg.discussion}</p>

                    {(stg.ourOffer || stg.clientCounter) && (
                      <div className="pt-2 border-t border-border flex items-center gap-4 text-xs">
                        <span>
                          Our Offer:{' '}
                          <strong className="font-mono text-heading">
                            {formatCurrency(stg.ourOffer, quotation.currency)}
                          </strong>
                        </span>
                        <span>
                          Client Counter:{' '}
                          <strong className="font-mono text-primary font-bold">
                            {formatCurrency(stg.clientCounter, quotation.currency)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
        quotation={quotation}
      />

      <UploadDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        quotation={quotation}
      />

      <SendQuotationMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        quotation={quotation}
      />
    </div>
  );
}
