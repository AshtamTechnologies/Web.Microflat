/**
 * src/mocks/companies.js — Initial mock data for Company Registration module.
 */

export const INITIAL_COMPANIES = [
  {
    id: 'COMP-001',
    companyName: 'Micro-Flat Datasoft Pvt. Ltd.',
    contactPersonName: 'Krupal Bhoi',
    contactPersonEmail: 'krupal.bhoi@microflat.com',
    contactPersonMobile: '+91 98250 12345',
    email: 'contact@microflat.com',
    phone1: '0265 2345678',
    phone2: '0265 2345679',
    gstNo: '24AAACM1234F1Z5',
    address1: 'Plot No. 42, GIDC Industrial Estate',
    address2: 'Near Makarpura Railway Station',
    city: 'Vadodara',
    state: 'GJ',
    country: 'IN',
    pinCode: '390010',
    website: 'https://www.microflat.com',
    isActive: true,

    // Terms & Conditions and Disclaimer
    terms: `1. Payment is due within 30 days from the invoice date unless negotiated otherwise.
2. Interest @ 18% p.a. will be levied on payments delayed beyond the credit period.
3. Goods once sold will not be accepted back without prior written authorization.
4. All disputes are subject to Vadodara jurisdiction only.`,
    disclaimer: `The information contained in this document is confidential, privileged, and intended solely for the use of the intended recipient. Micro-Flat Datasoft Pvt. Ltd. accepts no liability for errors or omissions arising from transmission or third-party interference.`,
    createdAt: '2026-01-15T09:30:00.000Z',
    updatedAt: '2026-10-20T14:45:00.000Z',
  },
];

