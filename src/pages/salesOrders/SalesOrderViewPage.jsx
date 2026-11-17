/**
 * SalesOrderViewPage.jsx — Full detailed view of an Order Confirmation (Sales Order).
 *
 * Route: /sales-orders/:id
 * Aligned with Frontend-API-Guide.md §5.4g.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  IconBack,
  IconCheck,
  IconDelete,
  IconDownload,
  IconEdit,
  IconFileText,
  IconMail,
  IconRefresh,
  IconSalesOrder,
  IconSend,
  IconUpload,
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
  EmptyState,
} from '../../components/ui';
import { useSalesOrdersContext } from '../../context/SalesOrdersContext';
import {
  formatCurrency,
  getOrderStatusBadgeVariant,
  TAX_TREATMENTS,
} from '../../mocks/salesOrders';
import { formatDate } from '../../utils/dateUtils';
import useColumnResize from '../../hooks/useColumnResize';
import ChangeOrderStatusModal from './components/ChangeOrderStatusModal';
import UploadOrderDocumentModal from './components/UploadOrderDocumentModal';
import SendOrderMailModal from './components/SendOrderMailModal';

export default function SalesOrderViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getSalesOrderById,
    fetchSalesOrderById,
    downloadSalesOrderDocument,
    deleteSalesOrderDocument,
  } = useSalesOrdersContext();

  const [orderDetail, setOrderDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id && fetchSalesOrderById) {
      setIsLoadingDetail(true);
      fetchSalesOrderById(id)
        .then((res) => {
          if (isMounted && res) {
            setOrderDetail(res);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingDetail(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id, fetchSalesOrderById]);

  const cachedOrder = getSalesOrderById(id);
  const order = orderDetail || cachedOrder;

  const [activeTab, setActiveTab] = useState('overview');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

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
    downloadSalesOrderDocument?.(doc?.id, doc?.fileName);
  }

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

  if (!order) {
    if (isLoadingDetail) {
      return (
        <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
          <p className="text-xs text-text-muted">Loading sales order details...</p>
        </div>
      );
    }
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: `Documents (${order.documents?.length || 0})` },
    { id: 'mail', label: `Mail Log (${order.emailLogs?.length || 0})` },
  ];

  const canUploadDocs = order.status !== 'Cancelled';
  const canChangeStatus = Array.isArray(order.nextStatuses)
    ? order.nextStatuses.length > 0
    : Boolean(order.nextStatuses?.length);

  return (
    <div className="w-full space-y-6 pb-20">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-heading">{order.orderConfirmationNo}</span>
            <Badge variant={getOrderStatusBadgeVariant(order.status)} size="md">
              {order.status}
            </Badge>
            {order.clientPoNo && (
              <Badge variant="role" size="md">
                PO: {order.clientPoNo}
              </Badge>
            )}
          </div>
        }
        subtitle={
          <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-heading">{order.clientName}</span>
            <span>·</span>
            {order.quotationId ? (
              <span>
                Quotation:{' '}
                <Link
                  to={`/quotations/${order.quotationId}`}
                  className="font-mono text-primary hover:underline"
                >
                  {order.quotationNo}
                </Link>
              </span>
            ) : (
              <Badge variant="neutral" size="xs">
                Direct Order (Without Quotation)
              </Badge>
            )}
            {order.inquiryNo && (
              <>
                <span>·</span>
                <span>
                  Inquiry: <span className="font-mono">{order.inquiryNo}</span>
                </span>
              </>
            )}
            <span>·</span>
            <span>
              Total:{' '}
              <strong className="text-primary font-mono">
                {formatCurrency(order.grandTotal, order.currency)}
              </strong>
            </span>
          </div>
        }
        icon={<IconSalesOrder className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/sales-orders')}
          >
            Back to Sales Orders
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {}}
              icon={<IconDownload size={14} />}
            >
              Download PDF
            </Button>

            {order.isEditable && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                icon={<IconEdit size={14} />}
              >
                Edit Draft
              </Button>
            )}

            {canChangeStatus && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStatusModalOpen(true)}
                icon={<IconRefresh size={14} />}
              >
                Change Status
              </Button>
            )}

            {canUploadDocs && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDocModalOpen(true)}
                icon={<IconUpload size={14} />}
              >
                Upload Document
              </Button>
            )}

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

      {order.status === 'Confirmed' && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <IconCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              Confirmed on{' '}
              <strong>
                {formatDate(order.confirmedOn || order.orderConfirmationDate)}
              </strong>
              . Ready for Customer Order project execution &amp; dispatch scheduling.
            </span>
          </div>
        </div>
      )}

      <div className="border-b border-border pb-1">
        <ScrollableTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Order & PO Reference">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DetailField
                  label="Order Confirmation Date"
                  mono
                  value={
                    order.orderConfirmationDate
                      ? formatDate(order.orderConfirmationDate)
                      : '—'
                  }
                />
                <DetailField
                  label="Expected Delivery"
                  mono
                  value={
                    order.expectedDeliveryDate
                      ? formatDate(order.expectedDeliveryDate)
                      : '—'
                  }
                />
                <DetailField label="Source Quotation">
                  {order.quotationId ? (
                    <Link
                      to={`/quotations/${order.quotationId}`}
                      className="view-field-value mf-detail-value font-mono text-primary hover:underline"
                    >
                      {order.quotationNo} (Rev {order.quotationRevisionNo ?? 0})
                    </Link>
                  ) : (
                    <span className="view-field-value mf-detail-value font-mono text-text-muted">
                      Direct Order (None)
                    </span>
                  )}
                </DetailField>
                <DetailField
                  label="Source Inquiry"
                  mono
                  value={order.inquiryNo || '—'}
                />
                <DetailField
                  label="Client PO No"
                  mono
                  value={order.clientPoNo || '—'}
                />
                <DetailField
                  label="Client PO Date"
                  mono
                  value={order.clientPoDate ? formatDate(order.clientPoDate) : '—'}
                />
              </div>
            </Card>

            <Card title="Client Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <DetailField label="Client Company" value={order.clientName} />
                <DetailField
                  label="Contact Person"
                  value={order.contactPerson || '—'}
                />
                <DetailField
                  label="Phone"
                  mono
                  isPhone={Boolean(order.contactPhone)}
                  value={order.contactPhone || '—'}
                />
                <DetailField
                  label="Email"
                  isEmail={Boolean(order.contactEmail)}
                  value={order.contactEmail || '—'}
                />
                <DetailField
                  label="Billing / Shipping Address"
                  className="sm:col-span-2"
                  value={order.clientAddress || '—'}
                />
              </div>
            </Card>
          </div>

          <Card
            title="Ordered Line Items"
            subtitle="Items linked to quotation revision lines with applied taxes"
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
                    <Th className="text-center">#</Th>
                    <Th
                      isResizing={resizingProductCol === 'product'}
                      resizeHandler={(e) => handleStartProductResize(e, 'product')}
                    >
                      PRODUCT / VARIANT
                    </Th>
                    <Th
                      isResizing={resizingProductCol === 'quantity'}
                      resizeHandler={(e) => handleStartProductResize(e, 'quantity')}
                      className="text-center"
                    >
                      QTY
                    </Th>
                    <Th
                      isResizing={resizingProductCol === 'rate'}
                      resizeHandler={(e) => handleStartProductResize(e, 'rate')}
                      className="text-right"
                    >
                      RATE ({order.currency})
                    </Th>
                    <Th
                      isResizing={resizingProductCol === 'otherCharges'}
                      resizeHandler={(e) => handleStartProductResize(e, 'otherCharges')}
                      className="text-right"
                    >
                      OTHER CHARGES
                    </Th>
                    <Th
                      isResizing={resizingProductCol === 'tax'}
                      resizeHandler={(e) => handleStartProductResize(e, 'tax')}
                      className="text-center"
                    >
                      TAX %
                    </Th>
                    <Th
                      isResizing={resizingProductCol === 'amount'}
                      resizeHandler={(e) => handleStartProductResize(e, 'amount')}
                      className="text-right"
                    >
                      LINE AMOUNT
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(order.lineItems || []).map((item, idx) => {
                    const lineAmount =
                      (Number(item.quantity) || 0) * (Number(item.rate) || 0) +
                      (Number(item.otherCharges) || 0);
                    return (
                      <tr key={item.id || idx} className="hover:bg-surface/40 transition-colors">
                        <Td className="text-center font-mono text-xs text-text-muted">
                          {idx + 1}
                        </Td>
                        <Td className="text-xs">
                          <div className="font-bold text-heading">{item.productName}</div>
                          <div className="font-mono text-2xs text-primary font-medium">
                            {item.itemCode || 'ITM'} · {item.variantName}
                          </div>
                          {item.technicalDetails && (
                            <div className="text-3xs text-text-muted truncate max-w-sm">
                              {item.technicalDetails}
                            </div>
                          )}
                        </Td>
                        <Td className="text-center font-mono font-semibold text-xs text-heading">
                          {item.quantity}
                        </Td>
                        <Td className="text-right font-mono text-xs text-heading">
                          {formatCurrency(item.rate, order.currency)}
                        </Td>
                        <Td className="text-right font-mono text-xs text-text-muted">
                          {Number(item.otherCharges) > 0
                            ? formatCurrency(item.otherCharges, order.currency)
                            : '—'}
                        </Td>
                        <Td className="text-center">
                          <Badge variant="neutral" size="sm">
                            {item.taxPercent ?? 18}%
                          </Badge>
                        </Td>
                        <Td className="text-right font-mono font-bold text-xs text-heading">
                          {formatCurrency(lineAmount, order.currency)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>

            <div className="p-4 sm:p-5 bg-surface/40 border-t border-border flex justify-end">
              <div className="w-full sm:w-80 space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(order.subtotal, order.currency)}
                  </span>
                </div>
                {Number(order.otherCharges) > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>
                      Other Charges
                      {order.otherChargesDescription
                        ? ` (${order.otherChargesDescription})`
                        : ''}
                    </span>
                    <span className="font-mono font-semibold text-heading">
                      {formatCurrency(order.otherCharges, order.currency)}
                    </span>
                  </div>
                )}
                {order.taxTreatment === 'INTRA_STATE' ? (
                  <>
                    <div className="flex justify-between text-text-muted">
                      <span>CGST</span>
                      <span className="font-mono">
                        {formatCurrency(order.cgst, order.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>SGST</span>
                      <span className="font-mono">
                        {formatCurrency(order.sgst, order.currency)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-text-muted">
                    <span>
                      {order.taxTreatment === 'INTER_STATE' ? 'IGST' : 'Tax (0%)'}
                    </span>
                    <span className="font-mono">
                      {formatCurrency(order.totalTax, order.currency)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-heading">
                  <span>Grand Total</span>
                  <span className="font-mono text-primary">
                    {formatCurrency(order.grandTotal, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Commercial & Delivery Terms">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DetailField label="Payment Terms">
                {Array.isArray(order.paymentTerms) && order.paymentTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.paymentTerms.map((t, idx) => (
                      <Badge key={idx} variant="neutral" size="xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : typeof order.paymentTerms === 'string' && order.paymentTerms.includes(',') ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.paymentTerms.split(',').map((t, idx) => (
                      <Badge key={idx} variant="neutral" size="xs">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span>{order.paymentTerms || '—'}</span>
                )}
              </DetailField>

              <DetailField label="Delivery Terms">
                {Array.isArray(order.deliveryTerms) && order.deliveryTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.deliveryTerms.map((t, idx) => (
                      <Badge key={idx} variant="neutral" size="xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : typeof order.deliveryTerms === 'string' && order.deliveryTerms.includes(',') ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {order.deliveryTerms.split(',').map((t, idx) => (
                      <Badge key={idx} variant="neutral" size="xs">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span>{order.deliveryTerms || '—'}</span>
                )}
              </DetailField>

              <DetailField label="Currency" value={order.currency || 'INR'} />
              <DetailField
                label="Tax Treatment"
                value={
                  TAX_TREATMENTS.find((t) => t.value === order.taxTreatment)?.label ||
                  order.taxTreatment ||
                  '—'
                }
              />
            </div>
          </Card>

          {(order.termsAndConditions || order.remarks) && (
            <Card title="Terms & Remarks">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Terms & Conditions">
                  {order.termsAndConditions ? (
                    <p className="text-xs text-heading whitespace-pre-line bg-surface/40 p-3 rounded-lg border border-border/60 font-mono mt-1">
                      {order.termsAndConditions}
                    </p>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </DetailField>

                <DetailField label="Remarks">
                  {order.remarks ? (
                    <p className="text-xs text-heading whitespace-pre-line bg-surface/40 p-3 rounded-lg border border-border/60 mt-1">
                      {order.remarks}
                    </p>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </DetailField>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <Card
          title="Order Confirmation Documents"
          subtitle="Client PO PDFs, signed order confirmations, and technical attachments"
          actions={
            canUploadDocs && (
              <Button
                variant="primary"
                size="sm"
                icon={<IconUpload size={14} />}
                onClick={() => setIsDocModalOpen(true)}
              >
                Upload Document
              </Button>
            )
          }
          bodyClassName="p-0"
        >
          {(order.documents || []).length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={IconFileText}
                title="No documents uploaded"
                description="Upload the client PO PDF or signed order confirmation copy."
                action={
                  canUploadDocs && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<IconUpload size={14} />}
                      onClick={() => setIsDocModalOpen(true)}
                    >
                      Upload Document
                    </Button>
                  )
                }
              />
            </div>
          ) : (
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
                {order.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface/40 transition-colors text-xs">
                    <Td className="font-semibold text-heading">{doc.fileName}</Td>
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
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                          title="Download document"
                        >
                          <IconDownload size={14} />
                        </button>
                        {canUploadDocs && (
                          <button
                            type="button"
                            onClick={() => deleteSalesOrderDocument(order.id, doc.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                            title="Delete document"
                          >
                            <IconDelete size={14} />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </Card>
      )}

      {/* ── TAB 3: MAIL LOG ── */}
      {activeTab === 'mail' && (
        <Card
          title="Email Dispatch Log"
          subtitle="History of order confirmation emails sent to client contacts"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<IconSend size={14} />}
              onClick={() => setIsMailModalOpen(true)}
            >
              Send Mail
            </Button>
          }
          bodyClassName="p-0"
        >
          {(order.emailLogs || []).length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={IconMail}
                title="No emails sent yet"
                description="Send the formal order confirmation PDF directly to the client contact."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<IconSend size={14} />}
                    onClick={() => setIsMailModalOpen(true)}
                  >
                    Send Order Confirmation Email
                  </Button>
                }
              />
            </div>
          ) : (
            <TableContainer>
              <thead>
                <tr>
                  <Th>SENT AT</Th>
                  <Th>TO</Th>
                  <Th>CC</Th>
                  <Th>SUBJECT</Th>
                  <Th>STATUS</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/40 transition-colors text-xs">
                    <Td className="font-mono text-text-muted whitespace-nowrap">
                      {log.sentAt}
                    </Td>
                    <Td className="font-medium text-heading">{log.to}</Td>
                    <Td className="text-text-muted">{log.cc || '—'}</Td>
                    <Td className="text-heading">{log.subject}</Td>
                    <Td>
                      <Badge
                        variant={log.result === 'Success' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {log.result}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableContainer>
          )}
        </Card>
      )}

      <ChangeOrderStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        order={order}
      />

      <UploadOrderDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        order={order}
      />

      <SendOrderMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        order={order}
      />
    </div>
  );
}

