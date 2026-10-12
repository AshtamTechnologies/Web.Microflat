/**
 * paymentTerms.js — Mock seed data for customer and vendor payment terms.
 */

export const INITIAL_PAYMENT_TERMS = [
  {
    paymentTermId: 'pt_imm',
    termCode: 'IMM',
    termName: 'Immediate Payment',
    dueDays: 0,
    displayOrder: 1,
    description: '100% Payment due immediately with order / Advance receipt',
    isActive: true,
    createdOn: '2026-01-01',
  },
  {
    paymentTermId: 'pt_net15',
    termCode: 'NET-15',
    termName: 'Net 15 Days',
    dueDays: 15,
    displayOrder: 2,
    description: '50% Advance along with purchase order, 50% Balance within 15 calendar days from commercial invoice',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net30',
    termCode: 'NET-30',
    termName: 'Net 30 Days',
    dueDays: 30,
    displayOrder: 3,
    description: '40% Advance payment with purchase order, 50% Against dispatch documentation, 10% Balance within 30 days after site delivery',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net45',
    termCode: 'NET-45',
    termName: 'Net 45 Days',
    dueDays: 45,
    displayOrder: 4,
    description: '30% Mobilization advance, 60% Milestone billing against materials inspection, 10% Retention payable within 45 days after acceptance',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net60',
    termCode: 'NET-60',
    termName: 'Net 60 Days',
    dueDays: 60,
    displayOrder: 5,
    description: 'Full invoice settlement strictly within 60 calendar days from delivery',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net90',
    termCode: 'NET-90',
    termName: 'Net 90 Days',
    dueDays: 90,
    displayOrder: 6,
    description: 'Special institutional credit cycle within 90 days with approval',
    isActive: false, // Inactive seed term
    createdOn: '2026-02-01',
  },
];
