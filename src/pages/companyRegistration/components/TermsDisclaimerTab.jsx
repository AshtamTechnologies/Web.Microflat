/**
 * src/pages/companyRegistration/components/TermsDisclaimerTab.jsx — Tab 3 of Company Registration.
 */

import React from 'react';
import { CollapsibleCard, Textarea } from '../../../components/ui';
import { IconFileText } from '../../../constants/icons';

export default function TermsDisclaimerTab({ form, onChange, errors }) {
  return (
    <div className="space-y-6">
      {/* ── 1. Terms & Conditions ── */}
      <CollapsibleCard
        title="Commercial Terms & Conditions"
        subtitle="Standard terms printed on Purchase Orders, Invoices, and Quotations"
        icon={<IconFileText size={16} />}
        defaultOpen={true}
      >
        <div>
          <label className="mf-label" htmlFor="terms">
            Terms & Conditions Text
          </label>
          <Textarea
            id="terms"
            rows={7}
            placeholder="Enter standard payment terms, delivery timelines, warranty periods, and jurisdictional rules..."
            value={form.terms || ''}
            onChange={(e) => onChange('terms', e.target.value)}
            error={errors?.terms}
            className="font-sans text-xs leading-relaxed"
          />
        </div>
      </CollapsibleCard>

      {/* ── 2. Legal Disclaimer ── */}
      <CollapsibleCard
        title="Statutory & Legal Disclaimer"
        subtitle="Confidentiality clauses and company liability limitation statements"
        icon={<IconFileText size={16} />}
        defaultOpen={true}
      >
        <div>
          <label className="mf-label" htmlFor="disclaimer">
            Disclaimer Statement
          </label>
          <Textarea
            id="disclaimer"
            rows={5}
            placeholder="Enter statutory disclaimer, confidentiality clause, and email/document limitation of liability notice..."
            value={form.disclaimer || ''}
            onChange={(e) => onChange('disclaimer', e.target.value)}
            error={errors?.disclaimer}
            className="font-sans text-xs leading-relaxed"
          />
        </div>
      </CollapsibleCard>
    </div>
  );
}
