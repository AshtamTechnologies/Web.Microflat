/**
 * src/pages/companyRegistration/components/BankDetailsTab.jsx — Tab 2 of Company Registration.
 */

import React from 'react';
import { CollapsibleCard, Input } from '../../../components/ui';
import { IconBankDetails } from '../../../constants/icons';

export default function BankDetailsTab({ form, onChange, errors }) {
  const hasBankErrors = Boolean(
    errors.bankName ||
      errors.bankBranch ||
      errors.bankAccountNo ||
      errors.bankIfscCode ||
      errors.bankSwiftCode
  );

  return (
    <CollapsibleCard
      title="Commercial Bank Accounts"
      subtitle="Direct banking information for customer invoices and vendor settlements"
      icon={<IconBankDetails size={16} />}
      hasError={hasBankErrors}
      defaultOpen={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Bank Name (1 col) + Bank Branch (1 col) + Bank Account No. (1 col) */}
        <div>
          <label className="mf-label" htmlFor="bankName">
            Bank Name <span className="mf-required">*</span>
          </label>
          <Input
            id="bankName"
            placeholder="e.g. HDFC Bank, State Bank of India"
            value={form.bankName || ''}
            onChange={(e) => onChange('bankName', e.target.value)}
            error={errors.bankName}
            required
          />
        </div>

        <div>
          <label className="mf-label" htmlFor="bankBranch">
            Bank Branch <span className="mf-required">*</span>
          </label>
          <Input
            id="bankBranch"
            placeholder="e.g. Alkapuri Branch, Vadodara"
            value={form.bankBranch || ''}
            onChange={(e) => onChange('bankBranch', e.target.value)}
            error={errors.bankBranch}
            required
          />
        </div>

        {/* Row 2: Bank Account No. (1 col) + Bank IFSC Code (1 col) + Bank Swift Code (1 col) */}
        <div>
          <label className="mf-label" htmlFor="bankAccountNo">
            Bank Account No. <span className="mf-required">*</span>
          </label>
          <Input
            id="bankAccountNo"
            placeholder="e.g. 50200012345678"
            value={form.bankAccountNo || ''}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/\D/g, '').slice(0, 20);
              onChange('bankAccountNo', sanitized);
            }}
            error={errors.bankAccountNo}
            hint="8 to 20 digits numeric account number"
            className="font-mono tabular-nums"
            maxLength={20}
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="mf-label" htmlFor="bankIfscCode">
            Bank IFSC Code <span className="mf-required">*</span>
          </label>
          <Input
            id="bankIfscCode"
            placeholder="e.g. HDFC0000042"
            value={form.bankIfscCode || ''}
            onChange={(e) => {
              const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
              onChange('bankIfscCode', sanitized);
            }}
            error={errors.bankIfscCode}
            hint="11 characters (e.g. HDFC0000042)"
            className="uppercase font-mono tracking-wider tabular-nums"
            maxLength={11}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="mf-label" htmlFor="bankSwiftCode">
            Bank Swift Code
          </label>
          <Input
            id="bankSwiftCode"
            placeholder="e.g. HDFCINBB or HDFCINBBBAR"
            value={form.bankSwiftCode || ''}
            onChange={(e) => {
              const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
              onChange('bankSwiftCode', sanitized);
            }}
            error={errors.bankSwiftCode}
            hint="Optional: 8 or 11 alphanumeric characters"
            className="uppercase font-mono tracking-wider tabular-nums"
            maxLength={11}
            autoComplete="off"
          />
        </div>
      </div>
    </CollapsibleCard>
  );
}
