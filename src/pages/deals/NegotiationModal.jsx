/**
 * src/pages/deals/NegotiationModal.jsx — Modal for adding/editing client discussion notes.
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Textarea, DatePicker, CancelButton } from '../../components/ui';

export default function NegotiationModal({
  isOpen,
  onClose,
  initialData = null,
  currencySymbol = '₹',
  onSave,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    negotiationDate: new Date().toISOString().slice(0, 10),
    discussedValue: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          negotiationDate: initialData.negotiationDate || new Date().toISOString().slice(0, 10),
          discussedValue: initialData.discussedValue !== null && initialData.discussedValue !== undefined
            ? String(initialData.discussedValue)
            : '',
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          negotiationDate: new Date().toISOString().slice(0, 10),
          discussedValue: '',
          notes: '',
        });
      }
      setError('');
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasValue = formData.discussedValue.trim() !== '';
    const hasNotes = formData.notes.trim() !== '';

    if (!hasValue && !hasNotes) {
      setError('Please provide at least a discussed value or notes for this discussion.');
      return;
    }

    onSave({
      negotiationDate: formData.negotiationDate,
      discussedValue: hasValue ? Number(formData.discussedValue) : null,
      notes: formData.notes.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Negotiation Entry' : 'Log Client Discussion / Negotiation'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Discussion Date
            </label>
            <DatePicker
              size="sm"
              value={formData.negotiationDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, negotiationDate: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Discussed Value ({currencySymbol})
            </label>
            <Input
              type="number"
              size="sm"
              step="any"
              min="0"
              placeholder="e.g. 450000"
              value={formData.discussedValue}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, discussedValue: e.target.value }));
                if (error) setError('');
              }}
              className="w-full text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-heading mb-1.5">
            Discussion Summary & Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, notes: e.target.value }));
              if (error) setError('');
            }}
            placeholder="Record client feedback, pricing counter-offers, payment terms discussed, delivery requests..."
            rows={4}
            maxLength={1000}
            className="w-full text-xs"
          />
          <p className="text-3xs text-text-muted text-right mt-1">
            {formData.notes.length} / 1000
          </p>
        </div>

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton onClick={onClose} size="sm" disabled={isSubmitting} />
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
