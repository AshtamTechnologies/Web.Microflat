/**
 * companyBankDetails.js — Mock Data and Constants for Company Bank Details Module.
 */

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Current', label: 'Current' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Cash Credit', label: 'Cash Credit' },
  { value: 'Overdraft', label: 'Overdraft' },
];

export const BANK_DOCUMENT_TYPE_OPTIONS = [
  { value: 'Bank Cancelled Cheque', label: 'Bank Cancelled Cheque' },
  { value: 'Bank Passbook Copy', label: 'Bank Passbook Copy' },
  { value: 'Bank Confirmation Letter', label: 'Bank Confirmation Letter' },
  { value: 'Bank Mandate Form', label: 'Bank Mandate Form' },
  { value: 'Other Banking Document', label: 'Other Banking Document' },
];

/**
 * Initial mock seed bank accounts linked to companies from src/mocks/companies.js:
 *   - COMP-001 (Micro-Flat Datums Pvt. Ltd.): 2 accounts (Current, Cash Credit)
 *   - COMP-002 (Precision Surface Plates India Ltd.): 1 account (Current)
 */
export const INITIAL_COMPANY_BANK_DETAILS = [
  {
    bankDetailId: 'cbd_1',
    companyId: 'COMP-001',
    accountHolderName: 'Micro-Flat Datums Pvt. Ltd.',
    bankName: 'State Bank of India',
    branchName: 'Industrial Estate, Vadodara',
    accountNumber: '30987654321',
    ifscCode: 'SBIN0001234',
    micrCode: '390002005',
    iban: '',
    swiftCode: 'SBININBB012',
    accountType: 'Current',
    branchAddress: 'GIDC Industrial Estate, Makarpura, Vadodara 390010, Gujarat',
    remarks: 'Primary operational and vendor disbursement account',
    isActive: true,
    attachments: [
      {
        id: 'att_cbd1_1',
        documentName: 'Bank Cancelled Cheque',
        fileName: 'microflat_sbi_cancelled_cheque.pdf',
        fileSize: '780 KB',
        fileType: 'application/pdf',
        uploadedAt: '2024-01-15',
      },
      {
        id: 'att_cbd1_2',
        documentName: 'Bank Confirmation Letter',
        fileName: 'sbi_account_confirmation.pdf',
        fileSize: '1.1 MB',
        fileType: 'application/pdf',
        uploadedAt: '2024-01-16',
      },
    ],
    createdAt: '2024-01-15',
    createdBy: 'Ian Chesnut',
    updatedAt: '2024-05-10T11:20:00',
    updatedBy: 'Admin',
  },
  {
    bankDetailId: 'cbd_2',
    companyId: 'COMP-001',
    accountHolderName: 'Micro-Flat Datums Pvt. Ltd.',
    bankName: 'HDFC Bank',
    branchName: 'Alkapuri Corporate Branch',
    accountNumber: '50200098765432',
    ifscCode: 'HDFC0000045',
    micrCode: '390240002',
    iban: '',
    swiftCode: 'HDFCINBB',
    accountType: 'Cash Credit',
    branchAddress: 'RC Dutt Road, Alkapuri, Vadodara 390007, Gujarat',
    remarks: 'Working capital and credit line facility',
    isActive: true,
    attachments: [
      {
        id: 'att_cbd2_1',
        documentName: 'Bank Mandate Form',
        fileName: 'hdfc_mandate_form.pdf',
        fileSize: '950 KB',
        fileType: 'application/pdf',
        uploadedAt: '2024-02-01',
      },
    ],
    createdAt: '2024-02-01',
    createdBy: 'Ian Chesnut',
    updatedAt: '2024-04-12T09:15:00',
    updatedBy: 'Ian Chesnut',
  },
  {
    bankDetailId: 'cbd_3',
    companyId: 'COMP-001',
    accountHolderName: 'Micro-Flat Datasoft Pvt. Ltd.',
    bankName: 'ICICI Bank Ltd',
    branchName: 'OP Road Branch, Vadodara',
    accountNumber: '003205001234',
    ifscCode: 'ICIC0000032',
    micrCode: '390229002',
    iban: '',
    swiftCode: 'ICICINBB',
    accountType: 'Current',
    branchAddress: 'Old Padra Road, Vadodara 390020, Gujarat',
    remarks: 'Secondary operational and tax remittance account',
    isActive: true,
    attachments: [
      {
        id: 'att_cbd3_1',
        documentName: 'Bank Cancelled Cheque',
        fileName: 'microflat_icici_cheque.pdf',
        fileSize: '620 KB',
        fileType: 'application/pdf',
        uploadedAt: '2024-02-15',
      },
    ],
    createdAt: '2024-02-15',
    createdBy: 'Ian Chesnut',
    updatedAt: '2024-06-01T14:30:00',
    updatedBy: 'Admin',
  },
];
