/**
 * PurchaseRequisitionView.jsx — Full-page read-only view of a Purchase Requisition.
 * Route: /purchase-requisition/:id
 * Fully read-only, professional ERP layout with audit trail and print support.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  FileSpreadsheet,
  Package,
  Clock,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';

import {
  Button,
  Card,
  Badge,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  formatPRDateTime,
  getPRStatusBadgeVariant,
  getPRPriorityBadgeVariant,
} from '../../mocks/purchaseRequisitions';

export default function PurchaseRequisitionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPRById } = usePurchaseRequisitionContext();

  const pr = useMemo(() => {
    return getPRById(id);
  }, [id, getPRById]);

  if (!pr) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">
            Purchase Requisition Not Found
          </h2>
          <p className="text-sm text-text-muted">
            The requested requisition with identifier "{id}" could not be found.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/purchase-requisition')}
          >
            Back to Requisition List
          </Button>
        </Card>
      </div>
    );
  }

  const statusVariant = getPRStatusBadgeVariant(pr.status);
  const priorityVariant = getPRPriorityBadgeVariant(pr.priority);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Top Navigation & Back Button ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/purchase-requisition')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg hover:bg-surface text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
        >
          <ArrowLeft
            size={14}
            className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to Purchase Requisition</span>
        </button>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-heading">
              Purchase Requisition
            </h1>
            <span className="text-xl font-bold text-primary">
              {pr.prNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant} className="px-2.5 py-0.5 text-xs font-medium">
              {pr.status}
            </Badge>
            <Badge variant={priorityVariant} className="px-2.5 py-0.5 text-xs font-medium">
              Priority: {pr.priority}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              navigate(`/purchase-requisition/${pr.prNumber || pr.prId}/edit`)
            }
            className="font-semibold shadow-sm"
          >
            <Pencil size={15} className="mr-1.5" />
            Edit Requisition
          </Button>
        </div>
      </div>

      {/* ── Section 1: PR Information Card ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="text-base font-bold text-heading">
            Purchase Requisition Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
          {/* PR Number */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              PR Number
            </span>
            <span className="font-semibold text-primary text-base">
              {pr.prNumber}
            </span>
          </div>

          {/* PR Date */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              PR Date
            </span>
            <span className="font-medium text-text">
              {formatPRDate(pr.prDate)}
            </span>
          </div>

          {/* Requested By */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              Requested By
            </span>
            <span className="font-medium text-text">
              {pr.requestedBy || '--'}
            </span>
          </div>

          {/* Department */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              Department
            </span>
            <span className="font-medium text-text">
              {pr.department || '--'}
            </span>
          </div>

          {/* Required Date */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              Required Date
            </span>
            <span className="font-medium text-text">
              {formatPRDate(pr.requiredDate)}
            </span>
          </div>

          {/* Priority */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-1">
              Priority
            </span>
            <Badge variant={priorityVariant}>
              {pr.priority || 'Normal'}
            </Badge>
          </div>

          {/* Status */}
          <div>
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block mb-1">
              Status
            </span>
            <Badge variant={statusVariant}>
              {pr.status || 'Draft'}
            </Badge>
          </div>

          {/* Remarks */}
          <div className="sm:col-span-2 md:col-span-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider block">
              Remarks
            </span>
            <p className="font-medium text-text mt-0.5 whitespace-pre-wrap">
              {pr.remarks || '--'}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Section 2: PR Items Card ── */}
      <Card padding="none" className="overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="text-base font-bold text-heading">
              Purchase Requisition Items
            </h2>
            <Badge variant="role" className="ml-1 text-xs">
              {pr.items?.length || 0} {pr.items?.length === 1 ? 'Item' : 'Items'}
            </Badge>
          </div>
        </div>

        <TableContainer>
          <thead>
            <tr className="bg-surface border-b border-border">
              <Th className="w-[50px] text-center">#</Th>
              <Th className="w-[150px]">Item Code</Th>
              <Th className="w-[180px]">Item Name</Th>
              <Th className="w-[220px]">Specification</Th>
              <Th className="w-[100px] text-right">Quantity</Th>
              <Th className="w-[80px]">UOM</Th>
              <Th className="w-[120px]">Required Date</Th>
              <Th className="w-[180px]">Remarks</Th>
              <Th className="w-[110px] text-center">Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {!pr.items || pr.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-text-muted">
                  No items listed for this purchase requisition.
                </td>
              </tr>
            ) : (
              pr.items.map((item, index) => {
                const itemStatusVariant =
                  item.status?.toLowerCase() === 'approved'
                    ? 'success'
                    : item.status?.toLowerCase() === 'rejected'
                    ? 'danger'
                    : 'warning';

                return (
                  <tr
                    key={item.prItemId || index}
                    className="hover:bg-bg/50 transition-colors"
                  >
                    {/* Index */}
                    <Td className="text-center font-semibold text-text-muted">
                      {index + 1}
                    </Td>

                    {/* Item Code */}
                    <Td className="font-medium text-text">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg border border-border">
                        {item.itemCode || '--'}
                      </span>
                    </Td>

                    {/* Item Name */}
                    <Td className="font-semibold text-heading">
                      {item.itemName || '--'}
                    </Td>

                    {/* Specification */}
                    <Td className="text-text-muted text-xs">
                      {item.specification || '--'}
                    </Td>

                    {/* Quantity */}
                    <Td className="text-right font-bold text-heading">
                      {item.quantity}
                    </Td>

                    {/* UOM */}
                    <Td className="text-text-muted text-xs">
                      {item.uom || 'Nos'}
                    </Td>

                    {/* Required Date */}
                    <Td className="text-text-muted text-xs">
                      {formatPRDate(item.requiredDate || pr.requiredDate)}
                    </Td>

                    {/* Remarks */}
                    <Td className="text-text-muted text-xs">
                      {item.remarks || '--'}
                    </Td>

                    {/* Status */}
                    <Td className="text-center">
                      <Badge variant={itemStatusVariant} className="text-[11px]">
                        {item.status || 'Pending'}
                      </Badge>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableContainer>
      </Card>

      {/* ── Section 3: Audit Information Card ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border bg-surface">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Clock size={18} className="text-text-muted" />
          <h2 className="text-base font-bold text-heading">
            Audit Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-muted block">Created By</span>
            <div className="font-semibold text-text mt-0.5">
              {pr.createdBy || '--'}
            </div>
          </div>

          <div>
            <span className="text-text-muted block">Created Date</span>
            <div className="font-semibold text-text mt-0.5">
              {formatPRDateTime(pr.createdDate)}
            </div>
          </div>

          <div>
            <span className="text-text-muted block">Modified By</span>
            <div className="font-semibold text-text mt-0.5">
              {pr.modifiedBy || '--'}
            </div>
          </div>

          <div>
            <span className="text-text-muted block">Modified Date</span>
            <div className="font-semibold text-text mt-0.5">
              {formatPRDateTime(pr.modifiedDate)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
