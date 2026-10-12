/**
 * paymentTerms.js — Mock seed data for customer and vendor payment terms.
 */

export const INITIAL_PAYMENT_TERMS = [
  {
    paymentTermId: 'pt_imm',
    termCode: 'IMM',
    termName: 'Immediate Payment',
    dueDays: 0,
    description: '<ol><li>100% Payment due immediately with order / Advance receipt</li></ol>',
    isActive: true,
    createdOn: '2026-01-01',
  },
  {
    paymentTermId: 'pt_net15',
    termCode: 'NET-15',
    termName: 'Net 15 Days',
    dueDays: 15,
    description: '<ol><li>50% Advance along with purchase order</li><li>50% Balance within 15 calendar days from commercial invoice</li></ol>',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net30',
    termCode: 'NET-30',
    termName: 'Net 30 Days',
    dueDays: 30,
    description: '<ol><li>40% Advance payment with purchase order</li><li>50% Against dispatch documentation / Proforma Invoice</li><li>10% Balance within 30 days after site delivery</li></ol>',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    paymentTermId: 'pt_net45',
    termCode: 'NET-45',
    termName: 'Net 45 Days',
    dueDays: 45,
    description: '<ol><li>30% Mobilization advance</li><li>60% Milestone billing against materials inspection</li><li>10% Retention payable within 45 days after acceptance</li></ol>',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net60',
    termCode: 'NET-60',
    termName: 'Net 60 Days',
    dueDays: 60,
    description: '<ol><li>Full invoice settlement strictly within 60 calendar days from delivery</li></ol>',
    isActive: true,
    createdOn: '2026-01-10',
  },
  {
    paymentTermId: 'pt_net90',
    termCode: 'NET-90',
    termName: 'Net 90 Days',
    dueDays: 90,
    description: '<ol><li>Special institutional credit cycle within 90 days with approval</li></ol>',
    isActive: false, // Inactive seed term
    createdOn: '2026-02-01',
  },
];
