/**
 * paymentTerms.js — Mock seed data for customer and vendor payment terms.
 */

export const INITIAL_PAYMENT_TERMS = [
  {
    paymentTermId: 'pt_imm',
    termCode: 'IMM',
    termName: 'Immediate Payment',
    dueDays: 0,
    description: 'Payment is due immediately upon delivery / invoice receipt (Cash on Delivery or Advance).',
    isActive: true,
    createdOn: '2026-01-01',
  },
  {
    paymentTermId: 'pt_net15',
    termCode: 'NET-15',
    termName: 'Net 15 Days',
    dueDays: 15,
    description: 'Payment due within 15 calendar days from commercial invoice issuance date.',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net30',
    termCode: 'NET-30',
    termName: 'Net 30 Days',
    dueDays: 30,
    description: 'Standard credit period — payment due within 30 calendar days from invoice date.',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net45',
    termCode: 'NET-45',
    termName: 'Net 45 Days',
    dueDays: 45,
    description: 'Extended credit term — full invoice settlement within 45 days after delivery acceptance.',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net60',
    termCode: 'NET-60',
    termName: 'Net 60 Days',
    dueDays: 60,
    description: 'Enterprise / OEM supply term — payment due within 60 calendar days.',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net90',
    termCode: 'NET-90',
    termName: 'Net 90 Days',
    dueDays: 90,
    description: 'Legacy long credit cycle — payment due within 90 days (Restricted/Special approval only).',
    isActive: false, // Inactive seed term
    createdOn: '2026-02-01',
  },
];
