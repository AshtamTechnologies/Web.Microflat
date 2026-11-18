# Document Preview Architecture: Analysis, Risks & Solutions

**Document ID:** ARCH-DOC-001  
**Project:** MicroFlat ERP (React 18 + Vite + Tailwind CSS)  
**Target Modules:** Vendor Management, Quotations, Sales Orders, Purchase Requisitions  
**Author:** Frontend Engineering Team  
**Date:** November 18, 2026  
**Status:** Under Architectural Review  

---

## 1. Executive Summary

This document presents a technical analysis of the document preview implementation across MicroFlat ERP. Currently, document preview in certain modules (e.g., `VendorEffectiveDatesPage.jsx:2911`) embeds uploaded PDF documents inside an HTML `<iframe>`. 

While functionally simple during early development, using raw `<iframe>` tags for PDF rendering in modern production ERPs introduces critical cross-browser reliability bugs, security policy conflicts (`CSP` / `X-Frame-Options`), and broken mobile/tablet behavior. 

This document outlines the risks of the current approach and details three industry-standard alternative architectures for review with team leads and US stakeholders.

---

## 2. Current Implementation Audit

### Where `<iframe>` is Currently Used:
- **File:** `src/pages/vendors/VendorEffectiveDatesPage.jsx` (Lines 2901–2916)
- **Component:** Document Version History & Preview Popup Modal

```jsx
{/* Current implementation snippet in VendorEffectiveDatesPage.jsx */}
{previewItem.fileUrl ? (
  previewItem.fileType?.startsWith('image/') ? (
    <img
      src={previewItem.fileUrl}
      alt={previewItem.documentName}
      className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
    />
  ) : (
    <iframe
      src={previewItem.fileUrl}
      title={previewItem.documentName}
      className="w-full h-[55vh] rounded-xl border border-border shadow-xs"
    />
  )
) : (
  /* Fallback card */
)}
```

> **Note:** File upload itself (`VendorFormPage.jsx` and `RecordPOModal.jsx`) uses standard HTML5 file inputs with drag-and-drop. Only the **preview modal** uses `<iframe>`.

---

## 3. Key Risks & UI/UX Issues with `<iframe>` PDF Preview

| # | Risk / Issue | Description | User Impact |
|---|---|---|---|
| **1** | **Browser Auto-Download Hijack** | Chrome, Edge, and Firefox provide a native user setting: *"Download PDFs instead of opening in browser"*. When enabled, opening the modal does not display the PDF—it triggers an automatic download, leaving the modal with an empty, broken gray box. | **High:** Confuses users who assume the system crashed. |
| **2** | **CORS & CSP Header Blocks** | Production document storage (AWS S3, Azure Blob, or ASP.NET Core endpoints) typically enforce security headers such as `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'`. | **Critical:** Browsers refuse to display the file inside an `<iframe>`, throwing console security errors. |
| **3** | **Safari & Mobile Incompatibilities** | WebKit (Safari on macOS and iOS) handles iframes with PDF streams inconsistently, frequently failing to allow vertical scrolling past page 1 or pinching to zoom. | **Medium-High:** Broken experience on iPads and tablets used in warehouse/shopfloor environments. |
| **4** | **Theme & UI Inconsistency** | An `<iframe>` renders the browser vendor's internal PDF reader. It forces an external dark toolbar, proprietary zoom buttons, and vendor icons that clash with MicroFlat ERP's Tailwind theme. | **Medium:** Unpolished visual experience. |
| **5** | **Memory Leaks** | Chromium browsers retain iframe PDF plugins in process memory until unmounted and garbage collected. Opening multiple preview modals in a session causes noticeable RAM spikes. | **Medium:** Degrades performance on long ERP sessions. |

---

## 4. Architectural Solutions Comparison

| Feature / Criteria | Solution 1: Popout / New Tab | Solution 2: `<object>` with Fallback | Solution 3: `react-pdf` (PDF.js) |
|---|---|---|---|
| **Complexity** | Zero new dependencies | Zero new dependencies | Medium (`npm install react-pdf`) |
| **CSP / Header Immune** | Yes (100% immune) | Partial (same-origin / permissive headers) | Yes (renders via canvas) |
| **Custom Branding** | Uses native browser tab | Inside modal | 100% custom theme controls |
| **Mobile / Tablet Ready** | Full native support | Moderate | Full native support |
| **Implementation Effort** | < 1 hour | 1 - 2 hours | 3 - 4 hours |
| **Industry Precedent** | SAP, Salesforce, Jira | NetSuite, Odoo | Stripe, Canva, Notion |

---

## 5. Detailed Solutions & Code Blueprints

### Solution 1: Enterprise Popout / New Tab Stream (Recommended for Quick Win)

Standard enterprise ERPs (SAP, Jira, Salesforce) do not squeeze complex multi-page PDF documents into small modal dialogs. Instead, they provide a clean preview card displaying metadata and an **"Open Document in New Tab"** action:

```jsx
function handleOpenDocument(url) {
  if (!url) return;
  // Immune to X-Frame-Options and CSP iframe blocks
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

#### UI Representation inside Modal:
```jsx
<div className="p-6 bg-surface border border-border rounded-2xl text-center space-y-4">
  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
    <IconFileText size={32} className="text-primary" />
  </div>
  <div>
    <h4 className="text-base font-bold text-heading">{doc.fileName}</h4>
    <p className="text-xs text-text-muted mt-1">{doc.documentType} · {doc.fileSize}</p>
  </div>
  <div className="flex items-center justify-center gap-3 pt-2">
    <Button
      variant="primary"
      size="sm"
      onClick={() => window.open(doc.downloadUrl || doc.fileUrl, '_blank')}
      icon={<IconExternalLink size={14} />}
    >
      Open Full Document
    </Button>
    <Button
      variant="secondary"
      size="sm"
      onClick={() => handleDownload(doc)}
      icon={<IconDownload size={14} />}
    >
      Download File
    </Button>
  </div>
</div>
```

---

### Solution 2: `<object>` Element with Graceful Fallback (In-Modal, Zero Dependencies)

If in-modal preview is strictly required without adding third-party npm packages, replace `<iframe />` with HTML5 `<object>`. Unlike `<iframe>`, `<object>` natively supports inline fallback content if the browser fails to render the stream:

```jsx
{previewItem.fileType?.startsWith('image/') ? (
  <img
    src={previewItem.fileUrl}
    alt={previewItem.documentName}
    className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
  />
) : (
  <object
    data={previewItem.fileUrl}
    type="application/pdf"
    className="w-full h-[55vh] rounded-xl border border-border shadow-xs"
  >
    {/* Graceful Fallback when browser plugin fails or auto-downloads */}
    <div className="p-6 text-center space-y-3 bg-surface/50 rounded-xl">
      <IconFileText size={32} className="mx-auto text-primary" />
      <p className="text-xs text-text-muted">
        Inline preview is not available in your current browser configuration.
      </p>
      <a
        href={previewItem.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
      >
        <IconExternalLink size={14} /> Open in New Tab
      </a>
    </div>
  </object>
)}
```

---

### Solution 3: Canvas Rendering via `react-pdf` / Mozilla PDF.js (Gold Standard)

For a fully branded, 100% browser-consistent in-app PDF reader (similar to Google Drive or Stripe):

1. **Install Package:**
   ```bash
   npm install react-pdf
   ```

2. **Component Architecture:**
   ```jsx
   import { Document, Page, pdfjs } from 'react-pdf';
   import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
   import 'react-pdf/dist/esm/Page/TextLayer.css';

   // Point to local worker
   pdfjs.GlobalWorkerOptions.workerSrc = new URL(
     'pdfjs-dist/build/pdf.worker.min.mjs',
     import.meta.url
   ).toString();

   export function PdfViewerModal({ fileUrl, onClose }) {
     const [numPages, setNumPages] = useState(null);
     const [pageNumber, setPageNumber] = useState(1);

     return (
       <div className="flex flex-col items-center">
         <Document
           file={fileUrl}
           onLoadSuccess={({ numPages }) => setNumPages(numPages)}
           loading={<p className="text-xs text-text-muted">Rendering document...</p>}
           error={<p className="text-xs text-danger">Failed to load PDF.</p>}
         >
           <Page pageNumber={pageNumber} width={500} />
         </Document>

         {numPages > 1 && (
           <div className="flex items-center gap-2 mt-3 text-xs">
             <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>Prev</button>
             <span>Page {pageNumber} of {numPages}</span>
             <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}>Next</button>
           </div>
         )}
       </div>
     );
   }
   ```
- **Advantages:** Eliminates all iframe vulnerabilities, bypasses browser plugin quirks, renders identically across Chrome, Edge, Firefox, and Safari on iOS/Android.

---

## 6. Recommendation & Action Plan

1. **Immediate Step (No Risk / No External Dependency):**
   - For existing modules (`VendorEffectiveDatesPage.jsx`), replace raw `<iframe>` with **Solution 2 (`<object>` with fallback card)** so users on browsers with auto-download or security policies never encounter a blank modal.
2. **Unified Document Helper:**
   - Standardize all document viewing across Vendors, Quotations, and Sales Orders through a shared `DocumentPreviewModal.jsx` in `src/components/common/`.
3. **Future Step (If In-App Page-by-Page Reading is Needed):**
   - Evaluate `react-pdf` with the US lead during the next sprint planning for a dedicated document viewer experience.
