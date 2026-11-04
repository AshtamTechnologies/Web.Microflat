/**
 * quotations.js — Mock data, tax slabs, helper functions for Quotations module.
 */

export const TAX_SLABS = [
  { value: 0, label: '0% (Exempt / Nil Rated)' },
  { value: 5, label: '5% GST' },
  { value: 12, label: '12% GST' },
  { value: 18, label: '18% GST (Standard)' },
  { value: 28, label: '28% GST' },
];

export const TAX_TREATMENTS = [
  { value: 'INTRA_STATE', label: 'Intra-State GST (CGST + SGST)' },
  { value: 'INTER_STATE', label: 'Inter-State GST (IGST)' },
  { value: 'EXPORT_LUT', label: 'Export / SEZ with LUT (0%)' },
  { value: 'EXEMPT', label: 'Exempt / Zero Rated (0%)' },
];

export const QUOTATION_STATUSES = [
  { id: 'Draft', name: 'Draft', variant: 'neutral' },
  { id: 'Sent', name: 'Sent', variant: 'info' },
  { id: 'In Negotiation', name: 'In Negotiation', variant: 'warning' },
  { id: 'Confirmed', name: 'Confirmed', variant: 'success' },
  { id: 'Lost', name: 'Lost', variant: 'danger' },
];

export const NEGOTIATION_MODES = [
  'Call',
  'Email',
  'Meeting',
  'WhatsApp',
  'Other',
];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(amount, currency = 'INR') {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  const val = Number(amount) || 0;
  return `${sym}${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const PAYMENT_TERMS_OPTIONS = [
  { value: '100% Advance against PI', label: '100% Advance against PI' },
  { value: '50% Advance & 50% Against Dispatch', label: '50% Advance & 50% Against Dispatch' },
  { value: 'Net 30 Days', label: 'Net 30 Days' },
  { value: 'Net 45 Days', label: 'Net 45 Days' },
  { value: 'Net 60 Days', label: 'Net 60 Days' },
  { value: '100% Against Irrevocable LC at Sight', label: '100% Against Irrevocable LC at Sight' },
];

export const DELIVERY_TERMS_OPTIONS = [
  { value: 'Ex-works Ahmedabad', label: 'Ex-works Ahmedabad' },
  { value: 'Freight Extra at Actual', label: 'Freight Extra at Actual' },
  { value: 'Door Delivery Included', label: 'Door Delivery Included' },
  { value: 'Delivery within 2–3 weeks from PO', label: 'Delivery within 2–3 weeks from PO' },
  { value: 'Delivery within 4–6 weeks from PO', label: 'Delivery within 4–6 weeks from PO' },
  { value: 'Transit Insurance at Buyer Cost', label: 'Transit Insurance at Buyer Cost' },
];

export function calculateQuotationTotals(items = [], taxTreatment = 'INTRA_STATE') {
  let subtotal = 0;
  let totalTax = 0;

  const calculatedItems = (items || []).map((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const otherCharges = Number(item.otherCharges) || 0;
    const lineAmount = (qty * rate) + otherCharges;
    const taxRate = Number(item.taxPercent !== undefined ? item.taxPercent : 18);
    const lineTax = (lineAmount * taxRate) / 100;

    subtotal += lineAmount;
    totalTax += lineTax;

    return {
      ...item,
      quantity: qty,
      rate,
      otherCharges,
      taxPercent: taxRate,
      lineAmount,
      lineTax,
    };
  });

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (taxTreatment === 'INTRA_STATE') {
    cgst = totalTax / 2;
    sgst = totalTax / 2;
  } else if (taxTreatment === 'INTER_STATE') {
    igst = totalTax;
  } else if (taxTreatment === 'EXPORT_LUT' || taxTreatment === 'EXEMPT') {
    totalTax = 0;
  }

  const grandTotal = subtotal + totalTax;

  return {
    calculatedItems,
    subtotal,
    totalTax,
    cgst,
    sgst,
    igst,
    grandTotal,
  };
}

export const INITIAL_QUOTATIONS = [
  {
    id: 'QT-2026-0004',
    quotationNo: 'QT-2026-0004',
    inquiryNo: 'INQ-2026-000412',
    inquiryId: 'inq-412',
    clientName: 'Acme Fabricators Pvt Ltd',
    clientId: 'client-1',
    clientAddress: 'Plot 12, GIDC, Ahmedabad 380001',
    contactPerson: 'Ravi Shah',
    contactEmail: 'ravi@acme.example',
    contactPhone: '9876543210',
    status: 'In Negotiation',
    poReceived: false,
    poDetails: null,
    confirmedOn: null,
    currentRevision: 2,
    currency: 'INR',
    validUntil: '2026-11-30',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Ex-works Ahmedabad, 4–6 weeks',
    taxTreatment: 'INTRA_STATE',
    termsAndConditions: '1. Prices are ex-works and exclusive of freight.\n2. Delivery within 4–6 weeks from receipt of PO.\n3. Payment as per the agreed payment terms.',
    lastUpdatedBy: 'Janvi Motwani',
    lastUpdatedAt: '2026-10-24T16:30:00',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-10-05',
        revisionReason: 'Initial commercial quotation created from Inquiry',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-1',
            categoryId: 'cat-sp',
            productId: 'prod-gsp',
            productName: 'Granite Surface Plate',
            variantId: 'var-gsp-4',
            variantName: '1000 × 630 mm · Gr-0',
            itemCode: 'SP-GR-1000x630-GR0',
            technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 5.0 µm',
            quantity: 2,
            rate: 48500,
            taxPercent: 18,
            remarks: 'Includes protective wooden packaging',
          },
          {
            id: 'it-2',
            categoryId: 'cat-sp',
            productId: 'prod-cisp',
            productName: 'Cast Iron Surface Plate',
            variantId: 'var-cisp-1',
            variantName: '600 × 600 mm · Gr-1',
            itemCode: 'SP-CI-600x600-GR1',
            technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285',
            quantity: 3,
            rate: 24000,
            taxPercent: 18,
            remarks: 'Ribbed, with stand',
          },
        ],
        subtotal: 169000,
        totalTax: 30420,
        grandTotal: 199420,
      },
      {
        revisionNo: 1,
        revisionDate: '2026-10-14',
        revisionReason: 'Client requested lower rate on cast iron plates and earlier delivery schedule',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-1',
            categoryId: 'cat-sp',
            productId: 'prod-gsp',
            productName: 'Granite Surface Plate',
            variantId: 'var-gsp-4',
            variantName: '1000 × 630 mm · Gr-0',
            itemCode: 'SP-GR-1000x630-GR0',
            technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 5.0 µm',
            quantity: 2,
            rate: 47000,
            taxPercent: 18,
            remarks: 'Standard packaging',
          },
          {
            id: 'it-2',
            categoryId: 'cat-sp',
            productId: 'prod-cisp',
            productName: 'Cast Iron Surface Plate',
            variantId: 'var-cisp-1',
            variantName: '600 × 600 mm · Gr-1',
            itemCode: 'SP-CI-600x600-GR1',
            technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285',
            quantity: 3,
            rate: 22500,
            taxPercent: 18,
            remarks: 'Ribbed, with stand',
          },
        ],
        subtotal: 161500,
        totalTax: 29070,
        grandTotal: 190570,
      },
      {
        revisionNo: 2,
        revisionDate: '2026-10-24',
        revisionReason: 'Quantity revised after site visit; added height gauge line',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-1',
            categoryId: 'cat-sp',
            productId: 'prod-gsp',
            productName: 'Granite Surface Plate',
            variantId: 'var-gsp-4',
            variantName: '1000 × 630 mm · Gr-0',
            itemCode: 'SP-GR-1000x630-GR0',
            technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 5.0 µm',
            quantity: 2,
            rate: 48500,
            taxPercent: 18,
            remarks: 'Standard packaging',
          },
          {
            id: 'it-2',
            categoryId: 'cat-sp',
            productId: 'prod-cisp',
            productName: 'Cast Iron Surface Plate',
            variantId: 'var-cisp-1',
            variantName: '600 × 600 mm · Gr-1',
            itemCode: 'SP-CI-600x600-GR1',
            technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285',
            quantity: 3,
            rate: 24000,
            taxPercent: 18,
            remarks: 'Ribbed, with stand',
          },
          {
            id: 'it-3',
            categoryId: 'cat-mi',
            productId: 'prod-hg',
            productName: 'Height Gauge 0–600 mm',
            variantId: 'var-hg-1',
            variantName: '0–600 mm · LC 0.01 mm',
            itemCode: 'HG-0-600-01',
            technicalDetails: 'Digital / Dial dual reading · Carbide scriber',
            quantity: 4,
            rate: 18000,
            taxPercent: 18,
            remarks: 'With calibration certificate',
          },
        ],
        subtotal: 241000,
        totalTax: 43380,
        grandTotal: 284380,
      },
    ],
    negotiations: [
      {
        stageNo: 1,
        dateTime: '2026-10-14T11:30',
        mode: 'Call',
        handledBy: 'Janvi Motwani',
        clientContact: 'Ravi Shah',
        ourOffer: 268000,
        clientCounter: 245000,
        revisionNo: 0,
        discussion: 'Client requested lower rate on cast iron plates and a shorter delivery time of 3 weeks.',
      },
      {
        stageNo: 2,
        dateTime: '2026-10-20T16:00',
        mode: 'Meeting',
        handledBy: 'Janvi Motwani',
        clientContact: 'Ravi Shah',
        ourOffer: 275500,
        clientCounter: 260000,
        revisionNo: 1,
        discussion: 'Site meeting at Ahmedabad works. Quantity increased on height gauges; client will confirm final purchase order after board approval.',
      },
    ],
    documents: [
      {
        id: 'doc-1',
        fileName: 'QT-2026-0004_Rev2.pdf',
        documentType: 'Quotation',
        revisionNo: 2,
        linkedStage: '—',
        uploadedAt: '2026-10-24',
        fileSize: '412 KB',
      },
      {
        id: 'doc-2',
        fileName: 'Counter-offer-mail.pdf',
        documentType: 'Negotiation attachment',
        revisionNo: 1,
        linkedStage: 'Stage 1',
        uploadedAt: '2026-10-14',
        fileSize: '185 KB',
      },
    ],
    mailLogs: [
      {
        id: 'mail-1',
        sentAt: '2026-10-24 10:12',
        to: 'ravi@acme.example',
        cc: 'procurement@acme.example',
        subject: 'Quotation QT-2026-0004 (Revision 2)',
        revisionNo: 2,
        result: 'Success',
        error: '',
      },
      {
        id: 'mail-2',
        sentAt: '2026-10-14 09:40',
        to: 'ravi@acme.example',
        cc: '',
        subject: 'Quotation QT-2026-0004 (Revision 1)',
        revisionNo: 1,
        result: 'Failed',
        error: 'Mailbox full',
      },
    ],
  },
  {
    id: 'QT-2026-0005',
    quotationNo: 'QT-2026-0005',
    inquiryNo: 'INQ-2026-000420',
    inquiryId: 'inq-420',
    clientName: 'Gujarat Gauges Ltd',
    clientId: 'client-2',
    clientAddress: 'Works – Survey 44, Sanand, Gujarat',
    contactPerson: 'Meera Patel',
    contactEmail: 'meera@gujaratgauges.example',
    contactPhone: '9898011223',
    status: 'Sent',
    poReceived: false,
    poDetails: null,
    confirmedOn: null,
    currentRevision: 0,
    currency: 'INR',
    validUntil: '2026-12-10',
    paymentTerms: 'Net 45',
    deliveryTerms: 'Ex-works Sanand, 2–3 weeks',
    taxTreatment: 'INTRA_STATE',
    termsAndConditions: '1. Inspection at MicroFlat premises.\n2. Taxes as applicable.\n3. Warranty: 12 months.',
    lastUpdatedBy: 'Faizan Vahora',
    lastUpdatedAt: '2026-10-25T11:00:00',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-10-25',
        revisionReason: 'Initial quotation',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-21',
            categoryId: 'cat-sp',
            productId: 'prod-gsp',
            productName: 'Granite Surface Plate',
            variantId: 'var-gsp-5',
            variantName: '1600 × 1000 mm · Gr-1',
            itemCode: 'SP-GR-1600x1000-GR1',
            technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003',
            quantity: 1,
            rate: 178220,
            taxPercent: 18,
            remarks: 'Heavy duty',
          },
        ],
        subtotal: 178220,
        totalTax: 32080,
        grandTotal: 210300,
      },
    ],
    negotiations: [],
    documents: [],
    mailLogs: [],
  },
  {
    id: 'QT-2026-0003',
    quotationNo: 'QT-2026-0003',
    inquiryNo: 'INQ-2026-000398',
    inquiryId: 'inq-398',
    clientName: 'Sundaram Alloys',
    clientId: 'client-3',
    clientAddress: 'Industrial Zone, Coimbatore',
    contactPerson: 'Suresh Kumar',
    contactEmail: 'suresh@sundaram.example',
    contactPhone: '9443210987',
    status: 'Draft',
    poReceived: false,
    poDetails: null,
    confirmedOn: null,
    currentRevision: 0,
    currency: 'INR',
    validUntil: '2026-11-15',
    paymentTerms: 'Immediate',
    deliveryTerms: 'Door delivery, 1–2 weeks',
    taxTreatment: 'INTRA_STATE',
    termsAndConditions: '1. Standard commercial terms apply.',
    lastUpdatedBy: 'Janvi Motwani',
    lastUpdatedAt: '2026-10-22T14:15:00',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-10-22',
        revisionReason: 'Draft preparation',
        status: 'Draft',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-31',
            categoryId: 'cat-se',
            productId: 'prod-gse',
            productName: 'Granite Straight Edge',
            variantId: 'var-gse-1',
            variantName: '1000 mm · Gr-0',
            itemCode: 'SE-GR-1000-GR0',
            technicalDetails: 'Granite straight edge · Dual face lapped',
            quantity: 2,
            rate: 40890,
            taxPercent: 18,
            remarks: '',
          },
        ],
        subtotal: 81780,
        totalTax: 14720,
        grandTotal: 96500,
      },
    ],
    negotiations: [],
    documents: [],
    mailLogs: [],
  },
  {
    id: 'QT-2026-0002',
    quotationNo: 'QT-2026-0002',
    inquiryNo: 'INQ-2026-000377',
    inquiryId: 'inq-377',
    clientName: 'Bluepoint Metrology',
    clientId: 'client-4',
    clientAddress: 'Whitefield Tech Park, Bangalore',
    contactPerson: 'Karthik Rao',
    contactEmail: 'karthik@bluepoint.example',
    contactPhone: '9900112233',
    status: 'Confirmed',
    poReceived: true,
    poDetails: {
      poNumber: 'PO-BP-4471',
      receivedOn: '2026-10-28',
      fileName: 'Client-PO-4471.pdf',
    },
    confirmedOn: '2026-10-28',
    currentRevision: 1,
    currency: 'INR',
    validUntil: '2026-11-15',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Ex-works Bangalore, 3 weeks',
    taxTreatment: 'INTER_STATE',
    termsAndConditions: '1. PO confirmed and validated.\n2. Delivery as per schedule.',
    lastUpdatedBy: 'Faizan Vahora',
    lastUpdatedAt: '2026-10-28T10:00:00',
    revisions: [
      {
        revisionNo: 1,
        revisionDate: '2026-10-20',
        revisionReason: 'Final agreed revision',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTER_STATE',
        items: [
          {
            id: 'it-41',
            categoryId: 'cat-ap',
            productId: 'prod-gap',
            productName: 'Granite Angle Plate',
            variantId: 'var-gap-1',
            variantName: '300 × 300 × 300 mm · Gr-0',
            itemCode: 'AP-GR-300x300-GR0',
            technicalDetails: 'Trihedral square',
            quantity: 2,
            rate: 64407,
            taxPercent: 18,
            remarks: '',
          },
        ],
        subtotal: 128814,
        totalTax: 23186,
        grandTotal: 152000,
      },
    ],
    negotiations: [],
    documents: [
      {
        id: 'doc-po-1',
        fileName: 'Client-PO-4471.pdf',
        documentType: 'Client PO',
        revisionNo: 1,
        linkedStage: '—',
        uploadedAt: '2026-10-28',
        fileSize: '620 KB',
      },
    ],
    mailLogs: [],
  },
  {
    id: 'QT-2026-0001',
    quotationNo: 'QT-2026-0001',
    inquiryNo: 'INQ-2026-000351',
    inquiryId: 'inq-351',
    clientName: 'Precitech Tools',
    clientId: 'client-5',
    clientAddress: 'MIDC Bhosari, Pune',
    contactPerson: 'Anand Shinde',
    contactEmail: 'anand@precitech.example',
    contactPhone: '9822001122',
    status: 'Lost',
    poReceived: false,
    poDetails: null,
    confirmedOn: null,
    currentRevision: 0,
    currency: 'INR',
    validUntil: '2026-10-20',
    paymentTerms: 'Immediate',
    deliveryTerms: 'Ex-works Pune',
    taxTreatment: 'INTRA_STATE',
    termsAndConditions: '1. Standard terms.',
    lastUpdatedBy: 'Janvi Motwani',
    lastUpdatedAt: '2026-10-20T17:00:00',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-10-01',
        revisionReason: 'Initial offer',
        status: 'Sent',
        currency: 'INR',
        taxTreatment: 'INTRA_STATE',
        items: [
          {
            id: 'it-51',
            categoryId: 'cat-mi',
            productId: 'prod-di',
            productName: 'Dial Indicator 0.01 mm',
            variantId: 'var-di-1',
            variantName: '0–10 mm · LC 0.01 mm',
            itemCode: 'DI-0-10-01',
            technicalDetails: 'Plunger type dial indicator',
            quantity: 10,
            rate: 4131.35,
            taxPercent: 18,
            remarks: '',
          },
        ],
        subtotal: 41313.5,
        totalTax: 7436.5,
        grandTotal: 48750,
      },
    ],
    negotiations: [
      {
        stageNo: 1,
        dateTime: '2026-10-18T15:00',
        mode: 'Call',
        handledBy: 'Janvi Motwani',
        clientContact: 'Anand Shinde',
        ourOffer: 48750,
        clientCounter: 38000,
        revisionNo: 0,
        discussion: 'Competitor offered 20% discount. Could not match pricing due to high precision grade. Deal closed as lost.',
      },
    ],
    documents: [],
    mailLogs: [],
  },
];

