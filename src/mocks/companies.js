/**
 * src/mocks/companies.js — Initial mock data for Company Registration module.
 */

export const INITIAL_COMPANIES = [
  {
    id: 'COMP-001',
    companyName: 'Micro-Flat Datasoft Pvt. Ltd.',
    firstName: 'Krupal',
    lastName: 'Bhoi',
    email: 'contact@microflat.com',
    phone1: '+91 98250 12345',
    phone2: '+91 265 2345678',
    gstNo: '24AAACM1234F1Z5',
    address1: 'Plot No. 42, GIDC Industrial Estate',
    address2: 'Near Makarpura Railway Station',
    city: 'Vadodara',
    state: 'Gujarat',
    country: 'India',
    pinCode: '390010',
    isActive: true,

    // Bank Details
    bankName: 'HDFC Bank',
    bankBranch: 'Alkapuri Branch, Vadodara',
    bankAccountNo: '50200012345678',
    bankIfscCode: 'HDFC0000042',
    bankSwiftCode: 'HDFCINBBBAR',

    // Terms & Conditions and Disclaimer
    terms: `1. Payment is due within 30 days from the invoice date unless negotiated otherwise.
2. Interest @ 18% p.a. will be levied on payments delayed beyond the credit period.
3. Goods once sold will not be accepted back without prior written authorization.
4. All disputes are subject to Vadodara jurisdiction only.`,
    disclaimer: `The information contained in this document is confidential, privileged, and intended solely for the use of the intended recipient. Micro-Flat Datasoft Pvt. Ltd. accepts no liability for errors or omissions arising from transmission or third-party interference.`,
    createdAt: '2026-01-15T09:30:00.000Z',
    updatedAt: '2026-10-20T14:45:00.000Z',
  },
  {
    id: 'COMP-002',
    companyName: 'Apex Precision Engineering Works',
    firstName: 'Rajesh',
    lastName: 'Patel',
    email: 'info@apexprecision.in',
    phone1: '+91 94260 98765',
    phone2: '+91 260 2233445',
    gstNo: '24BBAPA9876K1Z2',
    address1: 'Survey No. 118, Ring Road Industrial Park',
    address2: 'Opposite Torrent Substation',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    pinCode: '382445',
    isActive: true,

    // Bank Details
    bankName: 'State Bank of India',
    bankBranch: 'Industrial Finance Branch, Ahmedabad',
    bankAccountNo: '30987654321',
    bankIfscCode: 'SBIN0001423',
    bankSwiftCode: 'SBININBB450',

    // Terms & Conditions and Disclaimer
    terms: `1. Standard manufacturer warranty applies for 12 months from delivery date.
2. Prices are ex-factory, freight and insurance extra as applicable.
3. Delivery schedules are subject to force majeure conditions.`,
    disclaimer: `Quotations and commercial commitments are valid for 30 calendar days from the date of issue. Technical specifications are subject to continuous improvement without prior notification.`,
    createdAt: '2026-03-10T11:15:00.000Z',
    updatedAt: '2026-09-18T16:20:00.000Z',
  },
];
