/**
 * src/pages/deals/DealFormModal.jsx — Modal for creating (Convert to Deal) or editing a deal.
 */

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  CancelButton,
  Input,
  Textarea,
  SearchableSelect,
} from '../../components/ui';
import { dealService, inquiryService } from '../../services';

export default function DealFormModal({
  isOpen,
  onClose,
  mode = 'CREATE', // 'CREATE' | 'EDIT'
  initialDeal = null,
  prefill = null,
  nextDocNumber = '',
  currencies = [],
  inquiries = null,
  onSave,
  isSubmitting = false,
}) {
  const isCreate = mode === 'CREATE';

  const [formData, setFormData] = useState({
    inquiryId: '',
    inquiryNo: '',
    clientName: '',
    clientCode: '',
    dealDate: new Date().toISOString().slice(0, 10),
    currencyId: 1,
    expectedValue: '',
    negotiatedValue: '',
    clientContactId: '',
    remarks: '',
  });

  const [contacts, setContacts] = useState([]);
  const [errors, setErrors] = useState({});
  const [docNumber, setDocNumber] = useState(nextDocNumber);
  const [candidateInquiries, setCandidateInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);

  useEffect(() => {
    setDocNumber(nextDocNumber);
  }, [nextDocNumber]);

  useEffect(() => {
    if (!isOpen) return;

    if (isCreate) {
      if (prefill?.inquiryId) {
        const client = prefill?.client || {};
        const rawContacts = Array.isArray(client.contacts)
          ? client.contacts
          : Array.isArray(prefill?.contacts)
            ? prefill.contacts
            : [];

        const activeContacts = rawContacts
          .filter((c) => c && c.isActive !== false)
          .map((c) => ({
            clientContactId: c.clientContactId ?? c.id,
            fullName: c.fullName ?? c.contactPersonName ?? 'Contact',
            email: c.email ?? c.contactEmail ?? '',
          }));

        setContacts(activeContacts);

        setFormData({
          inquiryId: prefill.inquiryId,
          inquiryNo: prefill.inquiryNo || '',
          clientName: client.clientName || prefill.clientName || '',
          clientCode: client.clientCode || prefill.clientCode || '',
          dealDate: new Date().toISOString().slice(0, 10),
          currencyId: prefill.currencyId || 1,
          expectedValue: '',
          negotiatedValue: '',
          clientContactId: prefill.clientContactId || (activeContacts[0]?.clientContactId ? String(activeContacts[0].clientContactId) : ''),
          remarks: '',
        });
      } else {
        // Reset form for fresh conversion selection
        setFormData({
          inquiryId: '',
          inquiryNo: '',
          clientName: '',
          clientCode: '',
          dealDate: new Date().toISOString().slice(0, 10),
          currencyId: 1,
          expectedValue: '',
          negotiatedValue: '',
          clientContactId: '',
          remarks: '',
        });
        setContacts([]);
      }
    } else if (initialDeal) {
      setFormData({
        inquiryId: initialDeal.inquiryId || '',
        inquiryNo: initialDeal.inquiryNo || '',
        clientName: initialDeal.clientName || '',
        clientCode: initialDeal.clientCode || '',
        dealDate: initialDeal.dealDate || '',
        currencyId: initialDeal.currencyId || 1,
        expectedValue: initialDeal.expectedValue !== undefined && initialDeal.expectedValue !== null
          ? String(initialDeal.expectedValue)
          : '',
        negotiatedValue: initialDeal.negotiatedValue !== undefined && initialDeal.negotiatedValue !== null
          ? String(initialDeal.negotiatedValue)
          : '',
        clientContactId: initialDeal.clientContactId || '',
        remarks: initialDeal.remarks || '',
      });

      // Provide current contact immediately as primary option
      const initialContactList = initialDeal.clientContactId
        ? [
            {
              clientContactId: initialDeal.clientContactId,
              fullName: initialDeal.clientContactName || 'Selected Contact',
              email: initialDeal.clientContactEmail || '',
            },
          ]
        : [];
      setContacts(initialContactList);

      // In edit mode, load complete client contacts via prefill or client service if inquiryId is present
      if (initialDeal.inquiryId) {
        dealService
          .getDealPrefill(initialDeal.inquiryId)
          .then((pre) => {
            const client = pre?.client || {};
            const raw = Array.isArray(client.contacts)
              ? client.contacts
              : Array.isArray(pre?.contacts)
                ? pre.contacts
                : [];
            if (raw.length > 0) {
              const active = raw
                .filter((c) => c && c.isActive !== false)
                .map((c) => ({
                  clientContactId: c.clientContactId ?? c.id,
                  fullName: c.fullName ?? c.contactPersonName ?? 'Contact',
                  email: c.email ?? c.contactEmail ?? '',
                }));
              setContacts(active);
            }
          })
          .catch(() => {
            // Keep initialContactList fallback silently
          });
      }
    }
    setErrors({});
  }, [isOpen, isCreate, prefill, initialDeal]);

  // Load candidate inquiries for Convert from Deals Page when prefill is not provided
  useEffect(() => {
    if (!isOpen || !isCreate || prefill?.inquiryId) return;
    if (Array.isArray(inquiries)) {
      setCandidateInquiries(inquiries);
      return;
    }

    let isMounted = true;
    async function loadInquiries() {
      try {
        setLoadingInquiries(true);
        const [res, nextNum] = await Promise.all([
          inquiryService.listInquiries({ pageSize: 100, isActive: true }),
          !docNumber ? dealService.getNextDealNumber() : Promise.resolve(null),
        ]);
        if (!isMounted) return;
        if (nextNum?.documentNumber) {
          setDocNumber(nextNum.documentNumber);
        }
        const items = res?.items || [];
        const eligible = items.filter((inq) => {
          const st = (inq.status || '').toLowerCase();
          return st !== 'deal' && st !== 'lost';
        });
        setCandidateInquiries(eligible);
      } catch (err) {
        console.error('Failed to load candidate inquiries for deal modal:', err);
      } finally {
        if (isMounted) setLoadingInquiries(false);
      }
    }

    loadInquiries();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isCreate, prefill?.inquiryId, inquiries, docNumber]);

  const availableInquiries = Array.isArray(inquiries) ? inquiries : candidateInquiries;
  const inquiryOptions = useMemo(() => [
    { value: '', label: loadingInquiries ? 'Loading eligible inquiries...' : '-- Select an Inquiry to Convert --' },
    ...availableInquiries.map((inq) => {
      const inqNo = inq.inquiryNo || inq.InquiryNo || `INQ-${inq.id}`;
      const client = inq.clientName || inq.CustomerName || inq.companyName || 'Client';
      return {
        value: String(inq.id || inq.inquiryId || inq.InquiryId),
        label: `${inqNo} · ${client}`,
      };
    }),
  ], [availableInquiries, loadingInquiries]);

  const handleInquiryChange = async (selectedInquiryId) => {
    if (!selectedInquiryId) {
      setFormData((prev) => ({
        ...prev,
        inquiryId: '',
        inquiryNo: '',
        clientName: '',
        clientCode: '',
        clientContactId: '',
      }));
      setContacts([]);
      return;
    }

    try {
      setLoadingPrefill(true);
      setErrors((prev) => ({ ...prev, inquiryId: null }));
      const [pre, nextNum] = await Promise.all([
        dealService.getDealPrefill(selectedInquiryId),
        !docNumber ? dealService.getNextDealNumber() : Promise.resolve(null),
      ]);

      if (nextNum?.documentNumber) {
        setDocNumber(nextNum.documentNumber);
      }

      const client = pre?.client || {};
      const rawContacts = Array.isArray(client.contacts)
        ? client.contacts
        : Array.isArray(pre?.contacts)
          ? pre.contacts
          : [];

      const activeContacts = rawContacts
        .filter((c) => c && c.isActive !== false)
        .map((c) => ({
          clientContactId: c.clientContactId ?? c.id,
          fullName: c.fullName ?? c.contactPersonName ?? 'Contact',
          email: c.email ?? c.contactEmail ?? '',
        }));

      setContacts(activeContacts);
      setFormData((prev) => ({
        ...prev,
        inquiryId: selectedInquiryId,
        inquiryNo: pre?.inquiryNo || '',
        clientName: client.clientName || pre?.clientName || '',
        clientCode: client.clientCode || pre?.clientCode || '',
        currencyId: pre?.currencyId || prev.currencyId || 1,
        clientContactId: pre?.clientContactId || (activeContacts[0]?.clientContactId ? String(activeContacts[0].clientContactId) : ''),
      }));
    } catch (err) {
      toast.error(err?.message || 'Failed to load details for selected inquiry.');
    } finally {
      setLoadingPrefill(false);
    }
  };

  const currencyOptions = (currencies || []).map((c) => ({
    value: String(c.id),
    label: `${c.currencyCode} (${c.currencySymbol || c.currencyName})`,
  }));

  const contactOptions = [
    { value: '', label: 'Select client contact (Optional)' },
    ...contacts.map((c) => ({
      value: String(c.clientContactId),
      label: `${c.fullName}${c.email ? ` (${c.email})` : ''}`,
    })),
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (isCreate && !formData.inquiryId) {
      newErrors.inquiryId = 'Please select an inquiry to convert.';
    }

    if (
      formData.expectedValue === '' ||
      formData.expectedValue === null ||
      formData.expectedValue === undefined ||
      isNaN(Number(formData.expectedValue)) ||
      Number(formData.expectedValue) < 0
    ) {
      newErrors.expectedValue = 'Expected value is required and must be 0 or more.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      inquiryId: formData.inquiryId,
      dealDate: formData.dealDate,
      currencyId: Number(formData.currencyId),
      expectedValue: Number(formData.expectedValue),
      negotiatedValue: formData.negotiatedValue !== '' ? Number(formData.negotiatedValue) : null,
      clientContactId: formData.clientContactId ? Number(formData.clientContactId) : null,
      remarks: formData.remarks.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? 'Convert Inquiry to Deal' : `Edit Deal — ${initialDeal?.dealNo || ''}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deal preview banner for Create */}
        {isCreate && (docNumber || nextDocNumber) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-xs">
            <span className="text-text-muted">Generated Deal Number:</span>
            <span className="font-mono font-semibold text-primary">{docNumber || nextDocNumber}</span>
          </div>
        )}

        {/* Inquiry Selector when converting from Deals page (without fixed prefill) */}
        {isCreate && !prefill?.inquiryId && (
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Select Inquiry to Convert <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              id="select-inquiry-to-convert"
              options={inquiryOptions}
              value={String(formData.inquiryId || '')}
              onChange={(e) => handleInquiryChange(e.target.value)}
              placeholder={
                loadingInquiries
                  ? 'Loading eligible inquiries...'
                  : candidateInquiries.length === 0
                    ? 'No pending inquiries available'
                    : '-- Choose an inquiry to convert --'
              }
              searchPlaceholder="Search by inquiry no, client..."
              disabled={loadingInquiries || loadingPrefill}
            />
            {errors.inquiryId && (
              <p className="mt-1 text-2xs text-danger">{errors.inquiryId}</p>
            )}
            {loadingPrefill && (
              <p className="mt-1 text-2xs text-primary animate-pulse">
                Fetching inquiry commercial details...
              </p>
            )}
          </div>
        )}

        {/* Read-Only Client & Inquiry Information */}
        {(formData.inquiryId || formData.inquiryNo || formData.clientName) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface/50 border border-border/70 text-xs">
            <div>
              <span className="text-text-muted block text-2xs uppercase tracking-wide font-medium">Inquiry Number</span>
              <span className="font-mono font-semibold text-heading">{formData.inquiryNo || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted block text-2xs uppercase tracking-wide font-medium">Client / Customer</span>
              <span className="font-medium text-heading">
                {formData.clientName || '—'} {formData.clientCode ? `(${formData.clientCode})` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Commercial Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Expected Deal Value <span className="text-danger">*</span>
            </label>
            <Input
              type="number"
              size="sm"
              step="any"
              min="0"
              placeholder="e.g. 500000"
              value={formData.expectedValue}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, expectedValue: e.target.value }));
                if (errors.expectedValue) setErrors((prev) => ({ ...prev, expectedValue: null }));
              }}
              error={errors.expectedValue}
              className="w-full text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Negotiated / Agreed Value
            </label>
            <Input
              type="number"
              size="sm"
              step="any"
              min="0"
              placeholder="Leave blank if still negotiating"
              value={formData.negotiatedValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, negotiatedValue: e.target.value }))}
              className="w-full text-xs font-mono"
            />
          </div>
        </div>

        {/* Currency & Client Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">Currency</label>
            <SearchableSelect
              id="deal-currency"
              options={currencyOptions}
              value={String(formData.currencyId)}
              onChange={(e) => setFormData((prev) => ({ ...prev, currencyId: e.target.value }))}
              searchPlaceholder="Search currency..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">Client Contact Person</label>
            <SearchableSelect
              id="deal-contact"
              options={contactOptions}
              value={String(formData.clientContactId || '')}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientContactId: e.target.value }))}
              searchPlaceholder="Search contact..."
            />
          </div>
        </div>

        {/* Deal Remarks */}
        <div>
          <label className="block text-xs font-medium text-heading mb-1.5">Remarks / Internal Notes</label>
          <Textarea
            value={formData.remarks}
            onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
            placeholder="Commercial terms discussed, expected timeline, special customer preferences..."
            rows={3}
            maxLength={500}
            className="w-full text-xs"
          />
          <p className="text-3xs text-text-muted text-right mt-1">
            {formData.remarks.length} / 500
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton onClick={onClose} size="sm" disabled={isSubmitting} />
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isCreate ? 'Convert to Deal' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
