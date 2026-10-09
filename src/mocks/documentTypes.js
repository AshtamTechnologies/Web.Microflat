/**
 * documentTypes.js — Master Document Types configuration mock for MicroFlat ERP.
 *
 * Database Mapping Note:
 * In the SQL database schema, the 'AllowedExtensions' column is stored as a
 * comma-separated string (e.g. '.pdf,.docx,.dwg'), whereas the frontend context
 * models it as an array (['.pdf', '.docx', '.dwg']). When integrating with API endpoints,
 * serialize as array.join(',') and deserialize as string.split(',').
 */

export const INITIAL_DOCUMENT_TYPES = [
  {
    documentTypeId: 'dt_rfq',
    typeName: 'RFQ',
    allowedExtensions: ['.pdf', '.docx'],
    maxSizeMB: 25,
    isMandatory: true,
    isActive: true,
  },
  {
    documentTypeId: 'dt_drawing',
    typeName: 'Drawing',
    allowedExtensions: ['.pdf', '.dwg'],
    maxSizeMB: 25,
    isMandatory: true,
    isActive: true,
  },
  {
    documentTypeId: 'dt_spec',
    typeName: 'Spec',
    allowedExtensions: ['.pdf', '.docx'],
    maxSizeMB: 25,
    isMandatory: false,
    isActive: true,
  },
  {
    documentTypeId: 'dt_quotation',
    typeName: 'Quotation',
    allowedExtensions: ['.pdf'],
    maxSizeMB: 25,
    isMandatory: false,
    isActive: true,
  },
  {
    documentTypeId: 'dt_po',
    typeName: 'PO',
    allowedExtensions: ['.pdf'],
    maxSizeMB: 25,
    isMandatory: false,
    isActive: true,
  },
];

export default INITIAL_DOCUMENT_TYPES;
