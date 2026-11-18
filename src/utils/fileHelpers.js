/**
 * src/utils/fileHelpers.js — Utilities for file handling and simulated PDF downloads.
 */

/**
 * Triggers a browser download for a valid PDF document.
 * In offline/mock mode or fallback scenarios, creates a minimal valid PDF-1.4 file
 * containing the document metadata and details so it opens properly in any PDF viewer.
 *
 * @param {string} fileName - Destination file name (e.g. 'Client-PO-QT-2026-0003.pdf')
 * @param {Object} [docMetadata] - Metadata including title, documentType, uploadedAt, remarks
 */
export function triggerPdfDownload(fileName = 'document.pdf', docMetadata = {}) {
  const safeFileName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const cleanText = (val) => String(val || '').replace(/[()\\]/g, '').trim();
  const title = cleanText(docMetadata.title || docMetadata.documentType || 'Customer Purchase Order Record');
  const refNo = cleanText(docMetadata.fileName || safeFileName);
  const docType = cleanText(docMetadata.documentType || 'Client PO Attachment');
  const dateStr = cleanText(docMetadata.uploadedAt || docMetadata.receivedOn || new Date().toISOString().split('T')[0]);
  const clientName = cleanText(docMetadata.clientName);
  const quotationNo = cleanText(docMetadata.quotationNo);
  const poNumber = cleanText(docMetadata.poNumber);
  const deliveryDate = cleanText(docMetadata.expectedDeliveryDate);
  const totalAmount = cleanText(docMetadata.totalAmount);
  const revisionNo = cleanText(docMetadata.revisionNo);
  const remarks = cleanText(docMetadata.remarks || 'Confirmed Quotation Document');

  const textLines = [
    { text: title, size: 16, dy: 0 },
    { text: '================================================================================', size: 9, dy: -20 },
  ];

  if (quotationNo) textLines.push({ text: `Quotation No:           ${quotationNo} ${revisionNo ? `(${revisionNo})` : ''}`, size: 11, dy: -22 });
  if (clientName) textLines.push({ text: `Client Company:         ${clientName}`, size: 11, dy: -18 });
  if (poNumber) textLines.push({ text: `Customer PO Number:     ${poNumber}`, size: 11, dy: -18 });
  if (totalAmount) textLines.push({ text: `Total Order Value:      ${totalAmount}`, size: 11, dy: -18 });
  if (dateStr) textLines.push({ text: `Document / PO Date:     ${dateStr}`, size: 11, dy: -18 });
  if (deliveryDate) textLines.push({ text: `Expected Delivery Date: ${deliveryDate}`, size: 11, dy: -18 });
  textLines.push({ text: `Document Type:          ${docType}`, size: 11, dy: -18 });
  textLines.push({ text: `File Attachment:        ${refNo}`, size: 11, dy: -18 });
  if (remarks) textLines.push({ text: `Remarks / Notes:        ${remarks}`, size: 11, dy: -18 });

  textLines.push({ text: '--------------------------------------------------------------------------------', size: 9, dy: -24 });
  textLines.push({ text: 'MicroFlat ERP System - Official Document Record & Audit Trail', size: 10, dy: -18 });
  textLines.push({ text: `Generated On: ${new Date().toLocaleString('en-IN')}`, size: 9, dy: -15 });

  const lines = ['BT', '50 720 Td'];
  textLines.forEach((item, index) => {
    lines.push(`/F1 ${item.size} Tf`);
    if (index > 0) {
      lines.push(`0 ${item.dy} Td`);
    }
    lines.push(`(${item.text}) Tj`);
  });
  lines.push('ET');

  const stream = lines.join('\n');
  const streamLen = stream.length;

  const pdfString = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj',
    '5 0 obj',
    `<< /Length ${streamLen} >>`,
    'stream',
    stream,
    'endstream',
    'endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000224 00000 n ',
    '0000000295 00000 n ',
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    '500',
    '%%EOF',
  ].join('\n');

  const blob = new Blob([pdfString], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
