/**
 * src/components/ui/CommercialTermsSelect.jsx
 *
 * Enterprise reusable selector for Commercial Payment and Delivery Terms.
 *
 * Features:
 *   - 100% dynamic integration with PaymentTermsContext and DeliveryTermsContext.
 *   - Displays Term Code as primary with Term Name (e.g. "NET-1 — 15 days next").
 *   - Shows stripped description clause as a secondary subtitle in the dropdown.
 *   - Mobile-Friendly Info (i) Action: Tap or click (i) on any tag or option to view
 *     the full commercial term clause modal — zero reliance on mouse hover.
 *   - Auto-triggers ensureLoaded on mount for reliable route prefetching.
 *   - Available as <CommercialTermsSelect type="payment|delivery" />,
 *     <PaymentTermsSelect />, and <DeliveryTermsSelect />.
 */

import { useState, useMemo, useEffect } from 'react';
import SearchableMultiSelect from './SearchableMultiSelect';
import Modal from './Modal';
import Badge from './Badge';
import Button from './Button';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { useDeliveryTermsContext } from '../../context/DeliveryTermsContext';
import { IconFileText, IconCheck, IconInfo } from '../../constants/icons';

function stripHtml(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function CommercialTermsSelect({
  type = 'payment', // 'payment' | 'delivery'
  label,
  id,
  name,
  value = [],
  onChange,
  onBlur,
  placeholder,
  searchPlaceholder,
  emptyText,
  required = false,
  error = null,
  hint = null,
  disabled = false,
  maxDisplayTags = 2,
  className = '',
  showSummaryPreview = false,
}) {
  const isPayment = type === 'payment';

  // Context hooks
  const paymentCtx = usePaymentTermsContext();
  const deliveryCtx = useDeliveryTermsContext();

  const termsList = isPayment ? paymentCtx?.paymentTerms || [] : deliveryCtx?.deliveryTerms || [];
  const ensureLoaded = isPayment ? paymentCtx?.ensurePaymentTermsLoaded : deliveryCtx?.ensureDeliveryTermsLoaded;

  useEffect(() => {
    ensureLoaded?.();
  }, [ensureLoaded]);

  // Modal inspection state for mobile/desktop details
  const [viewingTerm, setViewingTerm] = useState(null);

  // Default labels and placeholders
  const resolvedLabel = label ?? (isPayment ? 'Payment Terms' : 'Delivery Terms');
  const resolvedPlaceholder = placeholder ?? (isPayment ? 'Select payment terms...' : 'Select delivery terms...');
  const resolvedSearchPlaceholder = searchPlaceholder ?? (isPayment ? 'Search payment terms...' : 'Search delivery terms...');
  const resolvedEmptyText = emptyText ?? (isPayment ? 'No payment terms configured' : 'No delivery terms configured');

  // Dynamic Options derived from master configuration
  const options = useMemo(() => {
    return (termsList || [])
      .filter((term) => term.isActive !== false)
      .map((term) => {
        const code = term.termCode?.trim();
        const name = term.termName?.trim();
        const optionLabel = code && name ? `${code} — ${name}` : (code || name || `Term #${term.id}`);
        const cleanDesc = stripHtml(term.description);

        return {
          value: optionLabel,
          label: optionLabel,
          chipLabel: optionLabel,
          subtitle: cleanDesc || undefined,
          termCode: code,
          termName: name,
          description: cleanDesc,
          raw: term,
        };
      });
  }, [termsList]);

  // Selected values array normalized
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  function handleTagInfo(optOrVal) {
    if (!optOrVal) return;
    if (typeof optOrVal === 'object' && (optOrVal.termCode || optOrVal.label)) {
      setViewingTerm(optOrVal);
      return;
    }
    const matched = options.find(
      (o) =>
        o.value === optOrVal ||
        o.termCode === optOrVal ||
        o.termName === optOrVal
    );
    if (matched) {
      setViewingTerm(matched);
    } else {
      setViewingTerm({ label: String(optOrVal), description: '' });
    }
  }

  function handleOptionInfo(option) {
    if (option) {
      setViewingTerm(option);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <SearchableMultiSelect
        label={resolvedLabel}
        id={id || name || (isPayment ? 'paymentTerms' : 'deliveryTerms')}
        name={name || (isPayment ? 'paymentTerms' : 'deliveryTerms')}
        value={selectedValues}
        options={options}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={resolvedPlaceholder}
        searchPlaceholder={resolvedSearchPlaceholder}
        emptyText={resolvedEmptyText}
        required={required}
        error={error}
        hint={hint}
        disabled={disabled}
        maxDisplayTags={maxDisplayTags}
        onTagInfo={handleTagInfo}
        onOptionInfo={handleOptionInfo}
      />

      {/* Optional inline summary preview if enabled */}
      {showSummaryPreview && selectedValues.length > 0 && (
        <div className="mt-2 p-2.5 rounded-lg bg-surface/50 border border-border/70 text-xs space-y-1.5">
          <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <IconInfo size={12} className="text-primary shrink-0" />
            <span>Configured {resolvedLabel} Clauses</span>
          </div>
          {selectedValues.map((val, idx) => {
            const opt = options.find((o) => o.value === val || o.termCode === val || o.termName === val);
            const title = opt ? `${opt.termCode || ''} ${opt.termName ? `— ${opt.termName}` : ''}`.trim() : String(val);
            const desc = opt?.description || 'No clause description recorded in configuration.';
            return (
              <div key={idx} className="text-text leading-relaxed">
                <span className="font-semibold text-heading">{title}:</span>{' '}
                <span className="text-text-secondary">{desc}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Touch & Mobile-Friendly Term Clause Details Modal */}
      {viewingTerm && (
        <Modal
          isOpen={Boolean(viewingTerm)}
          onClose={() => setViewingTerm(null)}
          title={`${isPayment ? 'Payment Term' : 'Delivery Term'} Clause`}
          size="sm"
          zIndex="z-[100000]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-heading">
                    {viewingTerm.termCode || viewingTerm.label}
                  </span>
                  <Badge variant="primary" size="sm">
                    {isPayment ? 'Payment Term' : 'Delivery Term'}
                  </Badge>
                </div>
                {viewingTerm.termName && (
                  <p className="text-xs text-text-muted">{viewingTerm.termName}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                Commercial Clause / Description
              </label>
              <div className="p-3 bg-surface/70 border border-border rounded-lg text-sm text-heading leading-relaxed">
                {viewingTerm.description || (
                  <span className="text-text-muted italic">
                    No description or specific terms clause has been configured for this term.
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewingTerm(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * Convenient semantic aliases for quick 1-line consumption:
 */
export function PaymentTermsSelect(props) {
  return <CommercialTermsSelect type="payment" {...props} />;
}

export function DeliveryTermsSelect(props) {
  return <CommercialTermsSelect type="delivery" {...props} />;
}
