/**
 * RegisterClientRequiredModal.jsx
 *
 * Intercepts HTTP 409 Conflict during Inquiry-to-Quotation conversion when
 * an inquiry belongs to an unregistered prospect client.
 * Displays captured prospect details and provides one-click onboarding bridge.
 */

import React from 'react';
import {
  Modal,
  Button,
  CancelButton,
  Badge,
} from '../../../components/ui';
import {
  IconBuilding2,
  IconUser,
  IconPhone,
  IconMail,
  IconLocation,
  IconWarning,
  IconUserPlus,
} from '../../../constants/icons';

export default function RegisterClientRequiredModal({
  isOpen,
  onClose,
  inquiry,
  onProceed,
}) {
  if (!inquiry) return null;

  const companyName = inquiry.companyName || inquiry.CustomerName || inquiry.clientName || 'New Prospect';
  const contactPerson = inquiry.contactPerson || inquiry.ContactPerson || inquiry.contactPersonName || inquiry.contactName || '—';
  const phone = inquiry.contactNo || inquiry.ContactNo || inquiry.phoneNo || inquiry.Phone || inquiry.mobileNo || inquiry.phone || '—';
  const email = inquiry.email || inquiry.Email || inquiry.officialEmail || '—';
  const locationParts = [
    inquiry.AddressLine1 || inquiry.address1,
    inquiry.City || inquiry.city,
    inquiry.State || inquiry.state,
    inquiry.Country || inquiry.country,
  ].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '—';
  const inquiryNo = inquiry.InquiryNo || inquiry.inquiryNo || inquiry.id || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Registration Required"
      subtitle={inquiryNo ? `Source Inquiry: ${inquiryNo}` : undefined}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Warning / Informational Callout */}
        <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/20 text-warning flex items-center justify-center shrink-0 mt-0.5">
            <IconWarning size={18} />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-heading">Commercial Master Requirement</p>
            <p className="text-text-muted leading-relaxed">
              This inquiry was created for a new prospect customer (<span className="font-semibold text-heading">{companyName}</span>).
              To generate an official commercial quotation, the customer must first be registered in the Client Master.
            </p>
          </div>
        </div>

        {/* Data Preview Card */}
        <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <IconBuilding2 size={16} className="text-primary" />
              <span className="text-xs font-bold text-heading uppercase tracking-wider">
                Captured Prospect Details
              </span>
            </div>
            <Badge variant="warning" className="text-2xs">Prospect</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-2xs text-text-muted block">Company Name</span>
              <span className="font-semibold text-heading break-words">{companyName}</span>
            </div>
            <div>
              <span className="text-2xs text-text-muted block">Contact Person</span>
              <span className="font-medium text-heading flex items-center gap-1.5 mt-0.5">
                <IconUser size={13} className="text-text-muted shrink-0" />
                <span className="truncate">{contactPerson}</span>
              </span>
            </div>
            <div>
              <span className="text-2xs text-text-muted block">Official Phone</span>
              <span className="font-medium text-heading flex items-center gap-1.5 mt-0.5">
                <IconPhone size={13} className="text-text-muted shrink-0" />
                <span>{phone}</span>
              </span>
            </div>
            <div>
              <span className="text-2xs text-text-muted block">Official Email</span>
              <span className="font-medium text-heading flex items-center gap-1.5 mt-0.5">
                <IconMail size={13} className="text-text-muted shrink-0" />
                <span className="truncate">{email}</span>
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-2xs text-text-muted block">Address / Location</span>
              <span className="font-medium text-heading flex items-center gap-1.5 mt-0.5">
                <IconLocation size={13} className="text-text-muted shrink-0" />
                <span className="break-words">{locationStr}</span>
              </span>
            </div>
          </div>
        </div>

        <p className="text-2xs text-text-muted italic">
          Clicking <strong>Register & Onboard Client</strong> will open the client onboarding drawer with all captured details automatically filled in.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>
            Cancel
          </CancelButton>
          <Button
            variant="primary"
            onClick={onProceed}
            icon={<IconUserPlus size={16} />}
          >
            Register & Onboard Client
          </Button>
        </div>
      </div>
    </Modal>
  );
}
