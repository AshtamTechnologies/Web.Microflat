# MicroFlat ERP — Frontend Project Rules & Work Log

## 1. Purpose of This File

This is the shared, persistent reference for frontend work on the **MicroFlat ERP** (Web.Microflat) project (Precision Metrology: Granite Surface Plates, Metrology Equipment, Inquiries, Quotations, Orders, Production & Inventory).

Use it to:
- Keep important project rules, architecture patterns, and constraints available across Antigravity chats.
- Record completed work as it happens, so context is never lost when a chat becomes long or a new chat is started.
- Help any developer or new agent session immediately understand what changed, why it changed, and what remains pending.
- Track completed tasks, mock vs live API statuses, and prevent duplicate work or merge conflicts with teammates.

**This file is a project log, not a replacement for source code, API documentation (`Frontend-API-Guide.md`), or the official Excel task tracker.** When details conflict, do not silently guess. Flag the conflict and ask for clarification.

---

## 2. Mandatory Rules for Antigravity

### Rule 1 — Frontend Only: Backend and Database Are Strictly Read-Only
**Never modify the backend (.NET/C#) or database (SQL Server). Treat them as read-only.**
- Do not edit backend source code, controllers, services, repositories, models, C# DTOs, or server configurations.
- Do not change database schemas, tables, columns, constraints, stored procedures, seed data, or migrations.
- Do not create or run database migration scripts.
- Treat Swagger / OpenAPI (`https://api.microflat.ashtamtechnologies.com/swagger/v1/swagger.json`) and `Frontend-API-Guide.md` as fixed API contracts.
- If a backend gap or missing endpoint is identified, document it clearly in the work log and provide the exact DTO / contract requirement for the backend developer; do not implement it yourself.

### Rule 2 — Team Coordination & File Protection (Do Not Touch Teammates' Work)
- **Krupal's Active Files:** Never modify or refactor Krupal's active files to prevent merge conflicts:
  - Task 47: WorkQueue (`src/pages/queue/MyQueuePage.jsx`)
  - Task 59: Configure Notifications
  - Task 62: Delivery Terms changes across other pages
  - Task 46: Notifications — Upcoming Meeting
- Always check the latest tracker before starting a new task to ensure no overlap.

### Rule 3 — Mock-First Architecture for Pending Backend Endpoints
- In MicroFlat ERP, several frontend tasks proceed ahead of backend completion:
  - When backend APIs exist (e.g., `/api/order-confirmations`, `/api/approval-requests`), integrate via `src/services/` using the project's standard `isMockApi` toggle.
  - When backend APIs are pending (e.g., Task 61 PO Recording on Quotation, Task 60 Direct Sales Order without Quotation), implement using the project's centralized Context and Mock state (`QuotationsContext.jsx`, `SalesOrdersContext.jsx`).
  - Ensure every mock-first feature is structured so that swapping to a live API service endpoint requires zero UI re-architecture.

### Rule 4 — Log Every Completed Task Immediately
After **each task is completed**, append a row to the `Work Log` table and add a detailed entry in this file. Do not wait until the end of the chat.
- Log meaningful completed tasks with files modified, key decisions, and reasons.
- Record exact remarks (`Completed`, `In Progress`, `Pending Backend API`, `Needs User Review`).
- Use the next sequential work-log ID (`WL-001`, `WL-002`, `WL-003`, etc.).

### Rule 5 — Design System & UI Consistency
- Always reuse the established design system components located in `src/components/ui`:
  - `PageHeader`, `Card`, `CollapsibleCard`, `Modal`, `Button`, `SaveButton`, `CancelButton`
  - `Input`, `Textarea`, `SearchableSelect`, `DatePicker`, `Badge`, `DataTable`, `TableContainer`, `Th`, `Td`
- Maintain high information density, responsive layouts, clean Tailwind CSS tokens, and keyboard accessibility.
- Never hardcode duplicate styling when a shared UI component already exists.

### Rule 6 — Build & Verification Integrity
- Every code change must be verified with `npm run build` to confirm zero lint or TypeScript/Vite compilation errors.
- Clearly distinguish between implementation, mock state, and live testing.

---

## 3. Starting a New Antigravity Chat

At the start of a new MicroFlat ERP task, read this file before making changes.
Then:
1. Identify relevant previous work-log entries and the active Git branch (`Vadik_Dev2`).
2. Inspect the current code state instead of assuming the log reflects files without verification.
3. Follow all mandatory rules above.
4. Continue the task without repeating completed work unnecessarily.
5. After each completed task, append a work-log row immediately.

**Suggested instruction to give Antigravity:**
> Read `MICROFLAT_PROJECT_RULES_AND_WORK_LOG.md` before starting. Follow its rules, especially the strict frontend-only rule: backend and database are read-only and must never be modified. Protect teammates' files (Krupal: queue, notifications, delivery terms). After every completed task, immediately append an accurate row to the Work Log with the next sequential ID. Record what changed, the module, key decisions and reasons, and pending work.

---

## 4. Work Log Summary Table

| ID | Date (YYYY-MM-DD) | Chat Topic | Module | Task Done | Key Decision / Reason | Remarks / Pending Work |
|---|---|---|---|---|---|---|
| **WL-001** | 2026-11-16 | Approvals Refactor | Approvals | Refactored `ApprovalsPage.jsx` tabs from 3 tabs to 2 unified tabs (`Pending Approvals` and `Approval History`); dynamic category badge counters. | Awaiting-me vs all pending confused users; unified into a single pending queue filtered by user role permissions. | Completed & verified; real API connected. |
| **WL-002** | 2026-11-17 | Task 54 API Guide | Standards & Specs | Researched Swagger schema and documented Standard to Grade Mapping endpoints in `Frontend-API-Guide 1.md`. | Master standards dictate allowed precision grades (IS-7327, DIN-876, BS-817); documented schema before building UI. | Completed documentation; UI mapping page pending review. |
| **WL-003** | 2026-11-17 | Task 61 Customer PO | Quotations | Upgraded `RecordPOModal.jsx`, wired header action & alert banners in `QuotationViewPage.jsx`, updated `QuotationsContext.jsx` to mark `Confirmed`. | PO recording is proof of winning the quotation; placing PO on quotation automatically archives PDF and enables Sales Order generation. | Completed (Mock-first Context state); Backend API pending. |
| **WL-004** | 2026-11-17 | Task 60 Direct Order | Sales Orders | Added Order Source Mode toggle (Against Quotation vs Direct Order), client picker, `+ Add Product Line`, row delete in `SalesOrderFormPage.jsx`. | Supports repeat clients ordering standard plates directly without quotation; preserves zero-friction quotation prefill. | Completed (Mock-first Context state); Backend scheduled Dec 31. |
| **WL-005** | 2026-11-17 | Task 37 Sales Order Core | Sales Orders | Handled direct orders in `SalesOrdersPage.jsx` and `SalesOrderViewPage.jsx` with `Direct Order` badge and linked PO card/documents. | Prevents broken quotation links when `quotationId` is empty; displays Customer PO PDF preview in Documents tab. | Completed & verified via `npm run build` (0 errors). |
| **WL-006** | 2026-11-17 | Project Master Rules | Documentation | Created `MICROFLAT_PROJECT_RULES_AND_WORK_LOG.md` based on company standard. | Persistent cross-chat continuity reference for rules, teammates' file boundaries, and work history. | Completed & active. |
| **WL-007** | 2026-11-17 | Notification Routing Fix | Routing / Approvals | Added `<Route path="/approvals/:id" element={<VendorApprovalViewPage />} />` in `src/App.jsx`. | Notification `actionUrl: "/approvals/56000027"` hit catch-all 404 wildcard redirecting to `/login`; adding route resolves the direct link without touching existing pages. | Completed & verified via `npm run build` (0 errors). |
| **WL-008** | 2026-11-17 | Task 37 API Service & Model | Sales Orders / Services | Created `orderConfirmationEndpoints.js`, `orderConfirmationModel.js`, and `orderConfirmationService.js` (with mock fallback); exported in `src/services/index.js`. | Built API layer per Swagger schema: maps `orderStatus` to `status`, `totalAmount` to `grandTotal`, `subTotal` to `subtotal`, sets `quotationId` integer, `lineItems: null` on create, direct `downloadUrl`. | Completed Step 1 & 2; context and pages untouched. |
| **WL-009** | 2026-11-17 | Task 37 Context Wiring (Step 3) | Sales Orders Context | Connected `SalesOrdersContext.jsx` to `orderConfirmationService` and `isMockApi`. Implemented hybrid live API + direct order offline persistence. | Integrates live backend list, detail, lookups, create, update, status patch, doc upload/download/delete, and email sending, while preserving local storage fallback for Task 60 Direct Orders without breaking backend contracts. | Completed Step 3; verified build (0 errors). |
| **WL-010** | 2026-11-17 | Task 37 Consumer Pages Wiring (Step 4) | Sales Orders UI | Aligned `SalesOrderFormPage.jsx`, `SalesOrderViewPage.jsx`, and `ChangeOrderStatusModal.jsx` with backend rules. | Enforced `quotationId` as Number, awaited async `createSalesOrder`/`updateSalesOrder` before navigating with submitting state, used direct `downloadUrl` for document downloads, governed status options strictly by `nextStatuses`, and edit by `isEditable`. | Completed Step 4; verified build (0 errors). |
| **WL-011** | 2026-11-17 | Multi-Select Terms Alignment | Sales Orders UI | Upgraded Payment Terms and Delivery Terms in `SalesOrderFormPage.jsx` and `SalesOrderViewPage.jsx` to `SearchableMultiSelect` chips. | Aligned Sales Orders with Quotation module pattern (`QuotationFormPage.jsx`). Allows selecting multiple commercial terms while normalizing payloads safely for both array and comma-separated backend string compatibility. | Completed & verified build (0 errors). |
| **WL-012** | 2026-11-18 | Uploader Isolation | Documents UI | Fixed duplicate "Client PO" dropdown options with strict module ID filtering (`moduleFilter="PO"`). | Prevents duplicate document category options in document uploaders. | Completed & verified build (0 errors). |
| **WL-013** | 2026-11-18 | Commercial Terms Select | UI Components | Created unified `CommercialTermsSelect.jsx` with mobile-friendly info dialog and code-primary labels. | Reusable across Sales Orders, Quotations, and Clients. | Completed & verified build (0 errors). |
| **WL-014** | 2026-11-18 | Quotations Core & Task 61 | Quotations | Implemented quotation service, model, endpoints, context, and wired Task 61 PO Recording modal. | Built multipart form-data upload for PO recording and hybrid live/mock state. | Completed & verified build (0 errors). |
| **WL-015** | 2026-11-19 | Task 54 Standard to Grade Mapping | Standards & Specs | Implemented Phase 1 (Endpoints, Models, Service, Mock), Phase 2 (Context gradeMapping cache & methods), and Phase 3 (StandardsPage table column, modal checklist with drag/arrow sequence ordering, and view card). | Allows Admin to associate precision grades to standards and specify displayOrder sequence for downstream dropdowns (Task 53). Strictly preserved Task 54 boundaries (no flatness formula, no backend/DB changes, no touch to GradesPage/GradesContext). | Completed & verified build (0 errors). |
| **WL-016** | 2026-11-20 | Task 53 Product Master Specs & Flatness | Products / Accuracy Specs | Implemented Phase 1 (flatnessFormula engine tested with 15/15 Excel benchmarks), Phase 2 (service query params StandardId/GradeId & resolve endpoint), Phase 3 (ProductVariantsTab Scope selector, Standard+Grade dropdowns, "⚡ Calculate Flatness" auto-fill, RBAC 403 protection, and inline table grouped badges). | Aligns accuracy specifications with Standard + Grade backend architecture (`ProductVariantsController.cs:103`), eliminates manual math errors with automated engineering formula calculation. | Completed & verified build (0 errors). |
| **WL-017** | 2026-11-20 | Task 58 Product Master Standard to Grade Map | Products / Standards | Integrated Standard → Grade mapping into Product Master (`ProductStandardsEditor.jsx`, `ProductFormPage.jsx`, `ProductViewPage.jsx`, and `ProductVariantsTab.jsx`). Displayed mapped precision grades, supported product-level grade scope (Inherit All vs Custom toggle chips), prevented duplicate standards, single primary promotion, Overview grade badges, and Standards tab summary cards. | Connects Task 54's global standard-grade mapping directly into Product Master workflow. Enforces that products and downstream variants/accuracy specs are strictly governed by their allowed precision grades. | Completed & verified build (0 errors). |

---

## 5. Detailed Work Log Entries

### Work Log Entry: WL-001
- **Date**: 2026-11-16
- **Module**: Approvals (`src/pages/approvals/ApprovalsPage.jsx`)
- **Summary of Implemented Changes**:
  1. Streamlined queue tabs from 3 (`Awaiting Me`, `Pending All`, `History`) into 2 clear tabs: `Pending Approvals` and `Approval History`.
  2. Updated summary counter cards to dynamically reflect the selected module filter (*e.g., Vendor, Purchase Requisition, Quotation*).
  3. Aligned with backend `GET /api/approval-requests/awaiting-me` and `GET /api/approval-requests/history`.
- **Verification**: Verified with `npm run build`.

---

### Work Log Entry: WL-002
- **Date**: 2026-11-17
- **Module**: Standards & Specs (`Frontend-API-Guide 1.md`)
- **Summary of Implemented Changes**:
  1. Researched Swagger OpenAPI contracts for Standards and Grade mapping (`GET /api/standards/grade-mapping`, `GET /api/standards/{id}/grades`, `PUT /api/standards/{id}/grades`).
  2. Documented complete request/response schemas, allowed grade payloads, and validation constraints in `Frontend-API-Guide 1.md`.
- **Verification**: Markdown updated without touching code.

---

### Work Log Entry: WL-003
- **Date**: 2026-11-17
- **Module**: Quotations (`src/pages/quotations/QuotationViewPage.jsx`, `RecordPOModal.jsx`, `QuotationsContext.jsx`)
- **Summary of Implemented Changes**:
  1. **QuotationViewPage.jsx**: Added active `[📄 Record Customer PO]` header button (switches to `[Update Customer PO]` once recorded). Added confirmation alert banner with direct `[Generate Sales Order]` CTA, and callout banner when approved awaiting PO.
  2. **RecordPOModal.jsx**: Rewritten using design system components. Added Customer PO number validation, PO received date, requested delivery date, drag-and-drop file upload with size calculation (KB/MB), file remove action, and remarks.
  3. **QuotationsContext.jsx**: Enhanced `recordClientPO` to mark quotation as `Confirmed`, record `confirmedOn`, persist `expectedDeliveryDate`, `remarks`, and archive the PO document under the quotation's `Documents` tab.
- **Verification**: Verified clean syntax and build.

---

### Work Log Entry: WL-004
- **Date**: 2026-11-17
- **Module**: Sales Orders (`src/pages/salesOrders/SalesOrderFormPage.jsx`)
- **Summary of Implemented Changes**:
  1. **Prefill PO Inheritance**: Updated `buildPrefillFromQuotation` to inherit `clientPoNo`, `clientPoDate`, `expectedDeliveryDate`, and auto-populate the Customer PO document into the order's `documents` array.
  2. **Order Source Mode Switch**: Added dual-mode toggle in Section 1:
     - `Against Confirmed Quotation (Standard)`: Limits picker to confirmed quotations with PO info banner.
     - `Direct Order (Without Quotation)`: Enables direct client selection via `ClientsContext`.
  3. **Direct Order Line Item Management**: Added `+ Add Product Line` button, row deletion button (`IconTrash`), and custom product name/variant code inline editing.
  4. **Validation**: Enforced `quotationId` required only in Quotation mode, `clientId` required in Direct mode, positive quantities, and required PO number for confirmation.
- **Verification**: Tested build via `npm run build`.

---

### Work Log Entry: WL-005
- **Date**: 2026-11-17
- **Module**: Sales Orders (`src/pages/salesOrders/SalesOrdersPage.jsx`, `SalesOrderViewPage.jsx`)
- **Summary of Implemented Changes**:
  1. **SalesOrdersPage.jsx**: Updated line 134 to render `<Badge variant="neutral" size="xs">Direct Order</Badge>` when `!row.quotationId`, eliminating broken links.
  2. **SalesOrderViewPage.jsx**: In header subtitle and Source Quotation DetailField, rendered `Direct Order (Without Quotation)` badge when quotation ID is missing.
  3. **Documents Tab**: Inherited Customer PO documents display with full preview and download capabilities.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-006
- **Date**: 2026-11-17
- **Module**: Project Rules & Workflow Tracking (`MICROFLAT_PROJECT_RULES_AND_WORK_LOG.md`)
- **Summary of Implemented Changes**:
  1. Created project rules and work log file modeled after company standard.
  2. Documented mandatory rules (read-only backend, Krupal's protected files, mock-first approach, design system consistency, verification requirements).
  3. Logged complete chronological history for `WL-001` through `WL-006`.
- **Verification**: Markdown file created in project root.

---

### Work Log Entry: WL-007
- **Date**: 2026-11-17
- **Module**: App Routing (`src/App.jsx`)
- **Summary of Implemented Changes**:
  1. Fixed the bug reported by Krupal where clicking approval notifications (*e.g., "Rejected: VEN-300006 - Steel"*) with `actionUrl: "/approvals/56000027"` redirected users to `/login`.
  2. Added `<Route path="/approvals/:id" element={<VendorApprovalViewPage />} />` in `src/App.jsx`.
  3. Preserved all existing static routes (`/approvals`, `/approvals/settings`, `/approvals/vendors`, `/approvals/purchase-requisitions`) with zero side effects.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-008
- **Date**: 2026-11-17
- **Module**: Sales Orders Service & Model (`src/services/salesOrders/`, `src/models/salesOrders/`)
- **Summary of Implemented Changes**:
  1. **Endpoints (`orderConfirmationEndpoints.js`)**: Implemented all 10 endpoints for lookups, next number series preview, CRUD, status patch, multipart documents, file download, email logs, and email sending.
  2. **Model & Normalizer (`orderConfirmationModel.js`)**:
     - Status: Maps `orderStatus` to `status` for UI components while preserving raw `orderStatus`.
     - Financials: Maps `totalAmount` to `grandTotal` and `subTotal` to `subtotal`.
     - Series Number: Display field mapped to `orderConfirmationNo`.
     - Documents: Directly exposes Swagger `downloadUrl`.
     - Actions: Uses `isEditable` and `nextStatuses` directly from the backend to govern edit/status buttons without hardcoding.
     - Payload Builder: Enforces `quotationId` as an integer and sets `lineItems: null` & `taxes: null` on `POST /api/order-confirmations` so the backend auto-copies them from the quotation.
  3. **Service Layer (`orderConfirmationService.js` & `orderConfirmationService.mock.js`)**:
     - Real API calls via `axiosInstance` with normalized error handling.
     - Full offline mock service with identical interface.
     - Registered in `src/services/index.js` using unified `isMockApi` toggle.
  4. **Strict Scope**: Zero changes made to `SalesOrdersContext.jsx`, `SalesOrdersPage.jsx`, `SalesOrderViewPage.jsx`, or `SalesOrderFormPage.jsx`.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-009
- **Date**: 2026-11-17
- **Module**: Sales Orders Context (`src/context/SalesOrdersContext.jsx`)
- **Summary of Implemented Changes**:
  1. Connected `SalesOrdersContext.jsx` to `orderConfirmationService` and `isMockApi`.
  2. Implemented initial API bootstrapper fetching `getOrderConfirmationLookups()` and `listOrderConfirmations()` on mount when `!isMockApi`.
  3. Added `refreshSalesOrders(params)`: queries backend list and merges with local Direct Orders so Task 60 orders are preserved.
  4. Added `fetchSalesOrderById(id)`: asynchronously fetches full order confirmation details (with lines, taxes, documents, email logs) and updates cache.
  5. Implemented `getNextOrderConfirmationNo(date)`: calls backend `GET /api/order-confirmations/next-number` with fallback to sequence formula.
  6. Implemented `createSalesOrder(payload)`:
     - For standard orders with `quotationId`: calls backend `POST /api/order-confirmations` and handles optional immediate confirmation via `PATCH /status`.
     - For direct orders (Task 60): preserves local state & `localStorage` persistence to prevent backend 400 errors (as backend direct order support is scheduled for Dec 31).
  7. Implemented `updateSalesOrder(id, payload)`: calls `PUT /api/order-confirmations/{id}` with backend error handling.
  8. Implemented `changeSalesOrderStatus(id, newStatus, remarks)`: calls `PATCH /api/order-confirmations/{id}/status`.
  9. Implemented document actions (`uploadSalesOrderDocument`, `downloadSalesOrderDocument`, `deleteSalesOrderDocument`) wired to multipart POST, blob download stream, and DELETE.
  10. Implemented `sendSalesOrderMail(id, mailPayload)`: calls `POST /api/order-confirmations/{id}/send-email`.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-010
- **Date**: 2026-11-17
- **Module**: Sales Orders UI Pages (`SalesOrderFormPage.jsx`, `SalesOrderViewPage.jsx`, `ChangeOrderStatusModal.jsx`)
- **Summary of Implemented Changes**:
  1. **Async Navigation & State (`SalesOrderFormPage.jsx`)**: Converted `handleSave` to `async/await`, awaiting `createSalesOrder(payload)` and `updateSalesOrder(...)` before calling `navigate(...)`. Added `isSubmitting` loading state to prevent double submissions.
  2. **Quotation ID Sanitization (`SalesOrderFormPage.jsx`)**: Enforced `quotationId` as a valid numeric integer before sending payload to backend API.
  3. **Real Series Number Sync (`SalesOrderFormPage.jsx`)**: Added `fetchNextOrderConfirmationNo` hook to automatically preview real backend document series numbers on date change.
  4. **Direct Document Download (`SalesOrderViewPage.jsx`)**: Wired document download button to `doc.downloadUrl` directly from the documents array (without manual URL concatenation), with fallback to blob download.
  5. **Deep-Link Detail Loading (`SalesOrderViewPage.jsx`)**: Integrated `fetchSalesOrderById` in `SalesOrderViewPage` so direct page loads/refreshes pull the full rich API entity (lines, taxes, documents, logs).
  6. **Dynamic Governance (`SalesOrderViewPage.jsx` & `ChangeOrderStatusModal.jsx`)**: Governed Edit Draft button strictly via `order.isEditable`, and populated status transitions directly from the `order.nextStatuses` array.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-011
- **Date**: 2026-11-17
- **Module**: Sales Orders Commercial Terms (`SalesOrderFormPage.jsx`, `SalesOrderViewPage.jsx`)
- **Summary of Implemented Changes**:
  1. **Multi-Select Dropdowns (`SalesOrderFormPage.jsx`)**: Upgraded both `Payment Terms` and `Delivery Terms` from single select to `SearchableMultiSelect` comboboxes, matching the UX established in `QuotationFormPage.jsx`.
  2. **Data Normalization (`toTermsArray`)**: Handled prefilling from quotation, edit mode loading, and comma-separated string joins for API payload compatibility.
  3. **Multi-Term Display (`SalesOrderViewPage.jsx`)**: In Section 2 (Commercial & Delivery Terms), mapped multiple payment and delivery terms into clean badge tags.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-012
- **Date**: 2026-11-18
- **Module**: Document Uploader Module Isolation & Bug Fix
- **Summary of Implemented Changes**:
  1. Fixed duplicate "Client PO" dropdown options by replacing loose string search with strict module ID filtering (`moduleFilter="PO"`).
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-013
- **Date**: 2026-11-18
- **Module**: Reusable Commercial Terms Dropdown (`src/components/ui/CommercialTermsSelect.jsx`)
- **Summary of Implemented Changes**:
  1. Created unified `CommercialTermsSelect.jsx` (with `PaymentTermsSelect` & `DeliveryTermsSelect` aliases).
  2. Implemented Code-primary formatting (`CODE — Term Name`).
  3. Integrated touch/mobile-friendly `(i)` info modal allowing users to inspect full commercial clauses on mobile devices without relying on hover tooltips.
  4. Integrated into `SalesOrderFormPage.jsx`, `QuotationFormPage.jsx`, and `ClientFormPage.jsx`.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-014
- **Date**: 2026-11-18
- **Module**: Quotations Core API & Task 61 (Customer PO Recording) Integration
- **Summary of Implemented Changes**:
  1. **Task 61 Full Integration**:
     - Confirmed Task 61 Customer Purchase Order recording belongs to the Quotations Controller (`POST /api/quotations/{id}/po-received`) per Guide §5.4g line 892.
     - Built multipart form-data payload handler supporting `poNumber`, `poReceivedDate`, `poReceivedBy`, `poRemarks`, and file binary upload.
     - Wired `RecordPOModal.jsx` to `recordClientPO` with progress indicators and error handling.
     - Updated `QuotationViewPage.jsx` PO alert banner with details and one-click "Download PO" button.
  2. **Quotation Core Endpoints (§5.4f & §5.4g)**:
     - Implemented `quotationEndpoints.js`, `quotationModel.js`, `quotationService.js`, and `quotationService.mock.js`.
     - Exported `quotationService` in `src/services/index.js`.
     - Connected `QuotationsContext.jsx` with hybrid live API + offline state resilience.
     - Updated `QuotationFormPage.jsx` and `QuotationsPage.jsx` for async series numbering and dynamic API list refreshing.
  3. **Strict Compliance**:
     - 100% frontend implementation. No backend C# files, controllers, or database migrations touched.
     - Krupal's protected files (`MyQueuePage.jsx`, notifications, delivery terms config) untouched.
- **Verification**: `npm run build` passed cleanly with **0 errors** in 3.82s.

---

### Work Log Entry: WL-015
- **Date**: 2026-11-19
- **Module**: Standards Configuration (`StandardsPage.jsx`, `StandardsContext.jsx`, `standardsService.js`, `standardModel.js`, `standardsEndpoints.js`)
- **Task**: Task 54 — Standard to Grade Mapping UI
- **Summary of Implemented Changes**:
  1. **Phase 1 — Service & Model Layer**:
     - `standardsEndpoints.js`: Added `STANDARD_GRADES: (id) => '/api/standards/' + id + '/grades'` and `GRADE_MAPPING: '/api/standards/grade-mapping'`.
     - `standardModel.js`: Added `StandardGradeModel` JSDoc typedef, initialized `grades: []` in `createEmptyStandard()`, updated `standardFromApi()` to map `grades` array (`mappingId`, `gradeId`, `gradeCode`, `displayOrder`, `isGradeActive`), and added `standardGradesToApi()` payload serializer with duplicate ID detection.
     - `standardsService.js`: Added `getGradeMapping(activeOnly)`, `getStandardGrades(standardId)`, and `updateStandardGrades(standardId, gradesArray)` with client-side duplicate validation. Enabled `capabilities.gradeMapping = true`.
     - `standardsService.mock.js`: Added mock data mapping for standard precision grades and implemented mock handlers for all three methods.
  2. **Phase 2 — Context Layer**:
     - `StandardsContext.jsx`: Added `gradeMapping` state (cached `getGradeMapping()` result), `fetchGradeMapping(activeOnly)` with mount effect, `fetchStandardGrades(standardId)`, and `saveStandardGrades(standardId, gradesArray)` (calls service, toasts success, refreshes standard details, and refreshes global grade mapping cache).
  3. **Phase 3 — UI Layer (`StandardsPage.jsx`)**:
     - **3A — Table Column**: Added "ALLOWED GRADES" column rendering grade codes as compact badge chips (`Gr-0`, `Gr-1`, etc.) or `—` when unmapped. Also rendered chips in mobile card view.
     - **3B — Create/Edit Modal Section**: Added "Allowed Precision Grades" checklist under standard fields. Pre-checks existing mapped grades, greys out inactive grades, allows Admin to check/uncheck grades, and includes an up/down arrow display order sequence reordering list. Non-admins see a read-only list with guidance.
     - **View Modal**: Added "Allowed Precision Grades" summary card showing mapped grades in `#` sequence order.
  4. **Strict Boundary Compliance**:
     - 0 backend or database changes.
     - Flatness formulas strictly excluded from Task 54 (reserved for Task 53 product master variant specs).
     - `GradesPage.jsx` and `GradesContext.jsx` were not modified.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-016
- **Date**: 2026-11-20
- **Module**: Products & Precision Metrology Accuracy Specs (`ProductVariantsTab.jsx`, `productService.js`, `productEndpoints.js`, `flatnessFormula.js`, `ProductViewPage.jsx`)
- **Task**: Task 53 — Changes to Product master - Standard, Grade & Flatness Formulas
- **Summary of Implemented Changes**:
  1. **Phase 1 — Formula Calculation Engine (`src/utils/flatnessFormula.js`)**:
     - Built `calculateFlatnessTolerance({ standardCode, gradeCode, lengthMm, widthMm })` and `calculateNominalDiagonal(lengthMm, widthMm)` ($\lceil\sqrt{L^2 + W^2} / 100\rceil \times 100$ mm).
     - Verified with 15 automated test cases against `Flatness for various sizes.xlsx` across IS 7327 (Gr 0..3), BS 817 (Gr 0..2), DIN 876 (Gr 00..3), and GGG-P-463C / ASME B89.3.7 (Gr AA..B).
     - Standardized storage unit as micrometers ($\mu\text{m}$) across all standards with formula breakdown text.
  2. **Phase 2 — Service Layer**:
     - `productEndpoints.js`: Added `VARIANT_SPECS_RESOLVE: (id) => '/api/product-variants/' + id + '/specs/resolve'`.
     - `productService.js`: Updated `setVariantSpecs(variantId, specsList, options)` to enforce the backend rule: "Send both standardId and gradeId, or neither" and pass `{ StandardId, GradeId }` query parameters (`PUT /api/product-variants/{id}/specs?StandardId=&GradeId=`). Added `getResolvedVariantSpecs(variantId, options)`.
  3. **Phase 3 — UI Layer (`ProductVariantsTab.jsx` & `ProductViewPage.jsx`)**:
     - **Accuracy Specs Modal**:
       - Added **Specification Scope Selector**: allows toggling between "Standard + Grade" figures and "Common Figures".
       - In Standard + Grade mode: provides Manufacturing Standard dropdown and dynamically populates Allowed Precision Grade dropdown strictly from Task 54's `gradeMapping`.
        - **Formula Auto-Populate & Locking**: Selecting `Flatness (µm)` under Standard + Grade automatically computes the exact tolerance from dimensions (L x W) and standard formula (e.g., 4.6 µm for 500x500 Gr-0 under IS 7327). The input is locked (`readOnly` / `disabled`) with a `Locked` badge to prevent invalid arbitrary inputs, and dynamically updates when changing Standard or Grade.
        - **Clean Tolerance UI**: For Flatness parameters, +/- tolerances and text values show non-editable "—" dashes, reflecting that Flatness is a single total allowable indicator limit.
        - **Modal Layout**: Widened modal to `size="2xl"` (1024px) with expanded Parameter column to eliminate horizontal scrollbars and cramping. Clean formula derivation step banner rendered below the table.
       - **RBAC & 403 Protection**: If product is Approved and user is non-Admin, modal is read-only with an informative warning banner.
     - **Inline Variant Table**:
       - Enhanced expanded specs table to display each configured figure grouped with its Standard & Grade badge (e.g. `[IS-7327 / Gr-0]` vs `[Common]`).
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

### Work Log Entry: WL-017
- **Date**: 2026-11-20
- **Module**: Products (`ProductStandardsEditor.jsx`, `ProductFormPage.jsx`, `ProductViewPage.jsx`, `ProductVariantsTab.jsx`, `StandardsContext.jsx`)
- **Task**: Task 58 — Product Master Changes (Standard to Grade Mapping)
- **Summary of Implemented Changes**:
  1. **StandardsContext Route Expansion (`StandardsContext.jsx`)**:
     - Included `/products` within `isRelevantRoute` to guarantee `standardsList` and global `gradeMapping` are fetched and cached in memory across all product routes.
  2. **ProductStandardsEditor Redesign (`ProductStandardsEditor.jsx`)**:
     - **Standard → Grade Mapping Integration**: Consumes `gradeMapping` from `StandardsContext`. Dynamically resolves all precision grades mapped to each standard (e.g. `Gr-00`, `Gr-0`, `Gr-1`, `Gr-2`, `Gr-3`).
     - **Product-Level Grade Applicability**:
       - By default, products inherit all mapped precision grades from the standard (`Inherit All`).
       - In Edit Mode, engineers can interactively click individual grade pills to restrict applicable grades for specific products (`Custom Scope`), or click "Reset to All".
       - In Read-Only Mode, renders clean font-mono grade badges with scope indicators (`Inherit All (N)` vs `Custom (M of N)`).
       - Shows guidance banner if a standard has no precision grades mapped in master.
     - **Duplicate Standard Prevention**: Filters the available standards dropdown in each row to exclude standards already selected in other rows.
     - **Primary Standard Management**: Single primary standard enforced with radio button in edit mode, auto-selection on first standard, and auto-promotion to the first remaining standard upon removal.
     - **Metrology Engineering Policy Banner**: Clean card communicating that tolerance calculations and variants are strictly derived from linked standards.
  3. **Product Detail View Enhancements (`ProductViewPage.jsx`)**:
     - **Overview Card**: Enhanced the "Primary Standard" metric to render the primary standard code alongside its mapped precision grade badges (`[Gr-00] [Gr-0] [Gr-1] ...`).
     - **Standards Tab Summary Cards**: Added 3 high-density metric cards at the top of the Standards tab:
       1. *Linked Standards* count.
       2. *Primary Standard* code with metrology icon.
       3. *Applicable Precision Grades* count with visual grade badge pills.
     - **Quick Edit & Persistence**: Enabled quick edit of standards & grades in Standards tab, preserving custom product grade scopes via localStorage cache.
  4. **Product Form & Variant Downstream Wiring (`ProductFormPage.jsx` & `ProductVariantsTab.jsx`)**:
     - `ProductFormPage.jsx`: Hydrates and persists product standard grade configurations on create and edit.
     - `ProductVariantsTab.jsx`: Updated `availableGradesForStandard` and `gradeOptions` to strictly respect product-level grade applicability when creating variants and configuring accuracy specifications.
- **Verification**: `npm run build` passed cleanly with **0 errors**.

---

## 6. Important Reminder

The work log is a continuity aid. Before relying on a historical entry, verify the current code and actual project state. **When in doubt, do not modify backend/database resources; stop, document the issue, and ask the user.**
