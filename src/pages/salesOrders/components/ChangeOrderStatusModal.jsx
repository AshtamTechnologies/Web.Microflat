import { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  Button,
  CancelButton,
  SearchableSelect,
  Textarea,
  Badge,
} from '../../../components/ui';
import { useSalesOrdersContext } from '../../../context/SalesOrdersContext';
import {
  getNextOrderStatuses,
  getOrderStatusBadgeVariant,
} from '../../../models/salesOrders/orderConfirmationModel';
import { IconRefresh } from '../../../constants/icons';

export default function ChangeOrderStatusModal({ isOpen, onClose, order, onSuccess }) {
  const { changeSalesOrderStatus } = useSalesOrdersContext();

  const allowedNextStatuses = useMemo(() => {
    if (Array.isArray(order?.nextStatuses) && order.nextStatuses.length > 0) {
      return order.nextStatuses;
    }
    return getNextOrderStatuses(order?.status);
  }, [order]);

  const statusOptions = useMemo(
    () => allowedNextStatuses.map((st) => ({ value: st, label: st })),
    [allowedNextStatuses]
  );

  const [newStatus, setNewStatus] = useState(allowedNextStatuses[0] || '');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setNewStatus(allowedNextStatuses[0] || '');
      setRemarks('');
      setIsSubmitting(false);
    }
  }, [isOpen, order, allowedNextStatuses]);

  const effectiveStatus = allowedNextStatuses.includes(newStatus)
    ? newStatus
    : allowedNextStatuses[0] || '';

  async function handleSave() {
    if (!order || !effectiveStatus || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await changeSalesOrderStatus(order.id, effectiveStatus, remarks);
      if (res) {
        setRemarks('');
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Sales Order Status"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between text-xs">
          <span className="text-text-muted">Current Status</span>
          <Badge variant={getOrderStatusBadgeVariant(order?.status)} size="sm">
            {order?.status || 'Draft'}
          </Badge>
        </div>

        {statusOptions.length === 0 ? (
          <p className="text-xs text-text-muted">
            No further status transitions are available for a <strong>{order?.status}</strong> sales order.
          </p>
        ) : (
          <>
            <SearchableSelect
              label="Next Status"
              required
              options={statusOptions}
              value={effectiveStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            />

            <Textarea
              label="Remarks / Reason (Optional)"
              placeholder={
                effectiveStatus === 'Cancelled'
                  ? 'Reason for cancelling this sales order...'
                  : 'Confirmation notes or PO verification comments...'
              }
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose} disabled={isSubmitting}>Cancel</CancelButton>
          {statusOptions.length > 0 && (
            <Button
              variant={effectiveStatus === 'Cancelled' ? 'danger' : 'primary'}
              onClick={handleSave}
              disabled={isSubmitting}
              icon={<IconRefresh size={15} />}
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

