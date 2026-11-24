/**
 * ProductPriceViewModal.jsx — View modal for inspecting product price configurations.
 * Fetches fresh price details via GET /api/product-prices/{id}.
 * Aligned with MicroFlat ERP Design System (DetailField, system date utils, consistent layout).
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Badge,
  DetailField,
} from '../../../components/ui';
import {
  IconTag,
  IconEdit,
  IconClock,
} from '../../../constants/icons';
import { Loader2 } from 'lucide-react';
import { productService } from '../../../services';
import { formatDateTime } from '../../../utils/dateUtils';

export default function ProductPriceViewModal({
  isOpen,
  onClose,
  priceId,
  onEdit,
}) {
  const [priceData, setPriceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      if (!priceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await productService.getProductPriceById(priceId);
        if (isMounted) {
          setPriceData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load product price details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (isOpen && priceId) {
      fetchDetail();
    } else {
      setPriceData(null);
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, priceId]);

  if (!isOpen) return null;

  const numPrice = Number(priceData?.unitPrice) || 0;
  const sym = priceData?.currencySymbol || (priceData?.currencyCode === 'USD' ? '$' : '₹');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <IconTag className="text-primary" size={18} />
          <span>Product Price Configuration</span>
        </div>
      }
      subtitle={
        priceData?.productCode
          ? `${priceData.productCode} — ${priceData.productName || ''}`
          : 'Price & lead time configuration details'
      }
      size="md"
      footer={
        <div className="flex items-center justify-end w-full gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEdit && priceData && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit(priceData);
              }}
            >
              <IconEdit size={14} className="mr-1.5" />
              Edit Price
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="text-xs text-text-muted">Loading price configuration...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs text-center my-4">
          {error}
        </div>
      ) : priceData ? (
        <div className="space-y-4">
          {/* ── Top Target Product Header Card ── */}
          <div className="p-3.5 bg-surface-subtle border border-border rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-2xs uppercase tracking-wider font-semibold text-text-muted block">
                Product
              </span>
              <h4 className="font-bold text-heading text-base truncate">
                {priceData.productName}
              </h4>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 font-bold">
                {priceData.productCode}
              </span>
              <Badge variant={priceData.isActive ? 'active' : 'inactive'}>
                {priceData.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* ── Key-Value Grid using DetailField ── */}
          <div className="p-4 bg-surface border border-border rounded-xl space-y-4">
            {/* Commercial Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Unit List Price">
                <span className="text-sm font-medium text-heading tabular-nums font-mono">
                  {sym} {numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>{' '}
                <span className="text-xs text-text-muted">
                  ({priceData.currencyCode || 'INR'}, excl. tax)
                </span>
              </DetailField>

              <DetailField label="Delivery Lead Time">
                <span className="text-sm font-medium text-heading inline-flex items-center gap-1.5">
                  <IconClock size={14} className="text-text-muted" />
                  {priceData.deliveryWeeks !== null && priceData.deliveryWeeks !== undefined
                    ? `${priceData.deliveryWeeks} weeks`
                    : 'Standard dispatch timeline'}
                </span>
              </DetailField>
            </div>

            <div className="border-t border-border/60" />

            {/* Category & UOM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Category" value={priceData.categoryName || '—'} />
              <DetailField label="Unit of Measurement (UOM)" value={priceData.uomName || '—'} />
            </div>

            <div className="border-t border-border/60" />

            {/* Technical Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <DetailField label="Variant / Size">
                {priceData.variantCode ? (
                  <span className="font-mono text-xs font-semibold text-heading px-2 h-7 rounded bg-surface-subtle border border-border inline-flex items-center whitespace-nowrap">
                    {priceData.variantCode}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted italic h-7 inline-flex items-center">
                    Base Product (All sizes)
                  </span>
                )}
              </DetailField>

              <DetailField label="Standard">
                {priceData.standardCode ? (
                  <span className="font-mono text-xs font-medium text-heading px-2 h-7 rounded bg-surface-subtle border border-border inline-flex items-center whitespace-nowrap">
                    {priceData.standardCode}
                  </span>
                ) : (
                  <span className="text-text-muted text-xs h-7 inline-flex items-center">—</span>
                )}
              </DetailField>

              <DetailField label="Precision Grade">
                {priceData.gradeCode ? (
                  <span className="font-mono text-xs font-bold px-2 h-7 rounded bg-primary/10 text-primary border border-primary/20 inline-flex items-center whitespace-nowrap">
                    {priceData.gradeCode}
                  </span>
                ) : (
                  <span className="text-text-muted text-xs h-7 inline-flex items-center">—</span>
                )}
              </DetailField>
            </div>

            {priceData.remarks && (
              <>
                <div className="border-t border-border/60" />
                <DetailField label="Pricing Remarks" className="sm:col-span-2">
                  <p className="text-xs text-text whitespace-pre-wrap leading-relaxed">
                    {priceData.remarks}
                  </p>
                </DetailField>
              </>
            )}
          </div>

          {/* ── System Audit Dates (System-standard format DD-MM-YYYY, hh:mm A) ── */}
          <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-text-muted">
            <div>
              <span>Created On: </span>
              <span className="font-mono text-heading font-medium">
                {formatDateTime(priceData.createdOn)}
              </span>
            </div>
            <div className="sm:text-right">
              <span>Last Updated: </span>
              <span className="font-mono text-heading font-medium">
                {formatDateTime(priceData.lastUpdatedOn)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
