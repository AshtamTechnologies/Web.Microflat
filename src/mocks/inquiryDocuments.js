/**
 * inquiryDocuments.js — Mock Document Types, seed documents & version history for Inquiry module.
 */

export const DOCUMENT_TYPE_OPTIONS = [
  {
    id: 'dt_rfq',
    typeName: 'RFQ',
    allowedExtensions: ['.pdf', '.docx'],
    maxSizeMB: 25,
    isMandatory: true,
    badgeVariant: 'role',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    id: 'dt_drawing',
    typeName: 'Drawing',
    allowedExtensions: ['.pdf', '.dwg'],
    maxSizeMB: 25,
    isMandatory: true,
    badgeVariant: 'info',
    badgeClass: 'bg-info-bg text-info border-info-border',
  },
  {
    id: 'dt_spec',
    typeName: 'Spec',
    allowedExtensions: ['.pdf', '.docx'],
    maxSizeMB: 25,
    isMandatory: false,
    badgeVariant: 'warning',
    badgeClass: 'bg-warning-bg text-warning border-warning-border',
  },
  {
    id: 'dt_quotation',
    typeName: 'Quotation',
    allowedExtensions: ['.pdf'],
    maxSizeMB: 25,
    isMandatory: false,
    badgeVariant: 'role',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    id: 'dt_po',
    typeName: 'PO',
    allowedExtensions: ['.pdf'],
    maxSizeMB: 25,
    isMandatory: false,
    badgeVariant: 'success',
    badgeClass: 'bg-success/10 text-success border-success/20',
  },
];

export function getDocumentType(typeId) {
  return (
    DOCUMENT_TYPE_OPTIONS.find((dt) => dt.id === typeId) || {
      id: typeId,
      typeName: typeId || 'Document',
      allowedExtensions: ['.pdf'],
      maxSizeMB: 25,
      isMandatory: false,
      badgeVariant: 'neutral',
      badgeClass: 'bg-surface text-text-muted border-border',
    }
  );
}

export function formatFileSizeKB(kb = 0) {
  if (!kb || kb === 0) return '0 KB';
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kb)} KB`;
}

/** @type {Array<object>} */
export const mockInquiryDocuments = [
  /* ── inq-1 documents (Has both RFQ + Drawing -> compliant) ── */
  {
    documentId: 'doc_101_1',
    inquiryId: 'inq-1',
    documentTypeId: 'dt_rfq',
    documentTitle: 'Customer RFQ Technical Specifications',
    currentVersionNo: 2,
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-01T09:35:00',
    versions: [
      {
        versionId: 'ver_101_1_2',
        versionNo: 2,
        fileName: 'RFQ_PrecisionAuto_SurfacePlate_Rev2.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 3420,
        changeRemarks: 'Updated dimensional tolerance requirements for bore concentricity & surface flatness',
        isCurrent: true,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-02T11:10:00',
      },
      {
        versionId: 'ver_101_1_1',
        versionNo: 1,
        fileName: 'RFQ_PrecisionAuto_SurfacePlate_Rev1.docx',
        fileExtension: '.docx',
        fileSizeKB: 2850,
        changeRemarks: 'Initial customer request document submitted via portal',
        isCurrent: false,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-01T09:35:00',
      },
    ],
  },
  {
    documentId: 'doc_101_2',
    inquiryId: 'inq-1',
    documentTypeId: 'dt_drawing',
    documentTitle: 'Granite Surface Plate GA Drawing & Stand Layout',
    currentVersionNo: 1,
    createdBy: 'Arjun Sharma',
    createdOn: '2026-10-02T14:40:00',
    versions: [
      {
        versionId: 'ver_101_2_1',
        versionNo: 1,
        fileName: 'DWG_Plate_2000x1000_VibrationDampening.dwg',
        fileExtension: '.dwg',
        fileSizeKB: 8940,
        changeRemarks: 'General arrangement AutoCAD drawing of 2000x1000 granite plate with screw levelling foundation',
        isCurrent: true,
        uploadedBy: 'Arjun Sharma',
        uploadedOn: '2026-10-02T14:40:00',
      },
    ],
  },

  /* ── inq-2 documents (Has RFQ, Drawing, Quotation) ── */
  {
    documentId: 'doc_102_1',
    inquiryId: 'inq-2',
    documentTypeId: 'dt_rfq',
    documentTitle: 'BHD Precision Valve Spindle RFQ Dossier',
    currentVersionNo: 1,
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-01T10:50:00',
    versions: [
      {
        versionId: 'ver_102_1_1',
        versionNo: 1,
        fileName: 'BHD_RFQ_SS316L_Valves.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 1820,
        changeRemarks: 'RFQ tender document with raw material chemical composition certificate requirements',
        isCurrent: true,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-01T10:50:00',
      },
    ],
  },
  {
    documentId: 'doc_102_2',
    inquiryId: 'inq-2',
    documentTypeId: 'dt_drawing',
    documentTitle: 'SS316L Valve Spindle Blueprint Rev C',
    currentVersionNo: 2,
    createdBy: 'Scott Walter',
    createdOn: '2026-10-02T16:15:00',
    versions: [
      {
        versionId: 'ver_102_2_2',
        versionNo: 2,
        fileName: 'DWG_BHD_Spindle_Machining_RevC.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 4120,
        changeRemarks: 'Included surface roughness callout Ra 0.4 on seat diameter',
        isCurrent: true,
        uploadedBy: 'Scott Walter',
        uploadedOn: '2026-10-03T13:20:00',
      },
      {
        versionId: 'ver_102_2_1',
        versionNo: 1,
        fileName: 'DWG_BHD_Spindle_Machining_RevB.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 3950,
        changeRemarks: 'Preliminary machining layout',
        isCurrent: false,
        uploadedBy: 'Scott Walter',
        uploadedOn: '2026-10-02T16:15:00',
      },
    ],
  },
  {
    documentId: 'doc_102_3',
    inquiryId: 'inq-2',
    documentTypeId: 'dt_quotation',
    documentTitle: 'Official Commercial Offer QT-2026-883',
    currentVersionNo: 1,
    createdBy: 'Scott Walter',
    createdOn: '2026-10-04T15:20:00',
    versions: [
      {
        versionId: 'ver_102_3_1',
        versionNo: 1,
        fileName: 'MicroFlat_QT_2026_883_ValveSpindles.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 1450,
        changeRemarks: 'Quotation sent to client with 4-week delivery commitment',
        isCurrent: true,
        uploadedBy: 'Scott Walter',
        uploadedOn: '2026-10-04T15:20:00',
      },
    ],
  },

  /* ── inq-3 documents (Has RFQ, Drawing, PO) ── */
  {
    documentId: 'doc_103_1',
    inquiryId: 'inq-3',
    documentTypeId: 'dt_rfq',
    documentTitle: 'HMC Hydraulic Clamping Fixture Scope of Work',
    currentVersionNo: 1,
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-02T11:15:00',
    versions: [
      {
        versionId: 'ver_103_1_1',
        versionNo: 1,
        fileName: 'Kalyani_Fixture_Specification.docx',
        fileExtension: '.docx',
        fileSizeKB: 2150,
        changeRemarks: 'Customer technical requirement brief',
        isCurrent: true,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-02T11:15:00',
      },
    ],
  },
  {
    documentId: 'doc_103_2',
    inquiryId: 'inq-3',
    documentTypeId: 'dt_drawing',
    documentTitle: 'Pallet 630mm Clamping Station Concept 3D & Schematics',
    currentVersionNo: 2,
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-03T15:30:00',
    versions: [
      {
        versionId: 'ver_103_2_2',
        versionNo: 2,
        fileName: 'Hydraulic_Fixture_Pallet630_Rev2.dwg',
        fileExtension: '.dwg',
        fileSizeKB: 12400,
        changeRemarks: 'Final approved tooling layout with integrated manifold blocks',
        isCurrent: true,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-05T09:00:00',
      },
      {
        versionId: 'ver_103_2_1',
        versionNo: 1,
        fileName: 'Hydraulic_Fixture_Pallet630_Rev1.dwg',
        fileExtension: '.dwg',
        fileSizeKB: 11800,
        changeRemarks: 'Concept proposal layout',
        isCurrent: false,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-03T15:30:00',
      },
    ],
  },
  {
    documentId: 'doc_103_3',
    inquiryId: 'inq-3',
    documentTypeId: 'dt_po',
    documentTitle: 'Customer Purchase Order PO-KT-2026-9024',
    currentVersionNo: 1,
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-06T17:10:00',
    versions: [
      {
        versionId: 'ver_103_3_1',
        versionNo: 1,
        fileName: 'PO_KT_2026_9024_Signed.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 980,
        changeRemarks: 'Official signed PO copy and payment receipt',
        isCurrent: true,
        uploadedBy: 'Ian Chesnut',
        uploadedOn: '2026-10-06T17:10:00',
      },
    ],
  },

  /* ── inq-5 documents (Only Spec -> missing mandatory RFQ & Drawing) ── */
  {
    documentId: 'doc_105_1',
    inquiryId: 'inq-5',
    documentTypeId: 'dt_spec',
    documentTitle: 'NABL Surface Plate Calibration Procedure Sheet',
    currentVersionNo: 1,
    createdBy: 'Priya Mehta',
    createdOn: '2026-10-03T10:30:00',
    versions: [
      {
        versionId: 'ver_105_1_1',
        versionNo: 1,
        fileName: 'NABL_Calibration_Procedure_ISO17025.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 1650,
        changeRemarks: 'Laboratory standard operating procedure for laser interferometer verification',
        isCurrent: true,
        uploadedBy: 'Priya Mehta',
        uploadedOn: '2026-10-03T10:30:00',
      },
    ],
  },

  /* ── inq-6 documents (Only RFQ -> missing mandatory Drawing) ── */
  {
    documentId: 'doc_106_1',
    inquiryId: 'inq-6',
    documentTypeId: 'dt_rfq',
    documentTitle: 'DIN 876-1 Export RFQ Documentation',
    currentVersionNo: 1,
    createdBy: 'Natali Emanuel',
    createdOn: '2026-10-03T15:15:00',
    versions: [
      {
        versionId: 'ver_106_1_1',
        versionNo: 1,
        fileName: 'EuroTech_FloorPlates_RFQ_Enquiry.pdf',
        fileExtension: '.pdf',
        fileSizeKB: 2750,
        changeRemarks: 'German DIN standard technical requirements sheet',
        isCurrent: true,
        uploadedBy: 'Natali Emanuel',
        uploadedOn: '2026-10-03T15:15:00',
      },
    ],
  },
];
