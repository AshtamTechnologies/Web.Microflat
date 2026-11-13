/**
 * emailTemplates.js — Master Email Templates configuration mock for MicroFlat ERP.
 *
 * Implements Swagger-compliant schema:
 * GET /api/email-templates?Search=&ModuleName=&Status=&PageNumber=1&PageSize=10
 * Response: { items, pageNumber, pageSize, totalCount, totalPages }
 */

export const INITIAL_EMAIL_TEMPLATES = [
  {
    id: 1,
    templateCode: 'VENDOR_APPROVED',
    templateName: 'Vendor Approval Notification',
    moduleName: 'VENDOR',
    subject: 'Vendor Registration Approved - {{VendorCode}}',
    body: `<h2>Congratulations {{VendorName}},</h2>
<p>We are pleased to inform you that your vendor account registration with <strong>Micro-Flat Engineering</strong> has been formally approved.</p>
<p><strong>Vendor Code:</strong> {{VendorCode}}<br />
<strong>Approved On:</strong> {{ApprovedDate}}<br />
<strong>Contact Person:</strong> {{ContactPerson}}</p>
<p>You can now log in to the portal and start receiving purchase requisitions and quotation requests.</p>
<p>Best regards,<br />Procurement Team<br />Micro-Flat Engineering Pvt Ltd</p>`,
    availablePlaceholders: ['VendorName', 'VendorCode', 'ApprovedDate', 'ContactPerson'],
    status: 'Active',
    createdOn: '2026-10-15T09:30:00Z',
    updatedOn: '2026-10-20T11:15:00Z',
  },
  {
    id: 2,
    templateCode: 'VENDOR_REJECTED',
    templateName: 'Vendor Registration Rejected',
    moduleName: 'VENDOR',
    subject: 'Update on Your Vendor Application - {{VendorName}}',
    body: `<p>Dear {{ContactPerson}},</p>
<p>Thank you for submitting your vendor profile to Micro-Flat Engineering.</p>
<p>After careful review, we regret to inform you that we are unable to approve your application at this time due to the following reason:</p>
<blockquote style="border-left: 3px solid #ef4444; padding-left: 10px; color: #666;">{{RejectionReason}}</blockquote>
<p>You may re-submit updated documents after addressing the above remarks.</p>
<p>Regards,<br />Vendor Management</p>`,
    availablePlaceholders: ['VendorName', 'ContactPerson', 'RejectionReason', 'ReviewDate'],
    status: 'Active',
    createdOn: '2026-10-16T14:20:00Z',
    updatedOn: '2026-10-16T14:20:00Z',
  },
  {
    id: 3,
    templateCode: 'INQUIRY_RECEIVED',
    templateName: 'Inquiry Acknowledgement to Client',
    moduleName: 'INQUIRY',
    subject: 'Inquiry Acknowledgement - {{InquiryNumber}} [{{CompanyName}}]',
    body: `<p>Dear {{ClientContact}},</p>
<p>Thank you for your business inquiry with Micro-Flat. We have registered your inquiry under reference number <strong>{{InquiryNumber}}</strong>.</p>
<p><strong>Date Received:</strong> {{InquiryDate}}<br />
<strong>Assigned Representative:</strong> {{SalesEngineerName}}<br />
<strong>Contact Email:</strong> {{SalesEngineerEmail}}</p>
<p>Our engineering and estimation team is currently reviewing your technical specifications. We will share a formal proposal within 2 business days.</p>
<p>Warm regards,<br />Sales & Estimation Department</p>`,
    availablePlaceholders: ['ClientContact', 'InquiryNumber', 'CompanyName', 'InquiryDate', 'SalesEngineerName', 'SalesEngineerEmail'],
    status: 'Active',
    createdOn: '2026-10-18T10:00:00Z',
    updatedOn: '2026-10-22T16:40:00Z',
  },
  {
    id: 4,
    templateCode: 'INQUIRY_INTERNAL_ASSIGN',
    templateName: 'Inquiry Internal Assignment Notice',
    moduleName: 'INQUIRY',
    subject: 'Action Required: New Inquiry Assigned [{{InquiryNumber}}]',
    body: `<p>Hi {{AssigneeName}},</p>
<p>A new customer inquiry has been assigned to you for technical assessment and quotation preparation.</p>
<p><strong>Inquiry ID:</strong> {{InquiryNumber}}<br />
<strong>Client:</strong> {{CompanyName}}<br />
<strong>Priority:</strong> {{PriorityLevel}}<br />
<strong>Due Date:</strong> {{ExpectedCloseDate}}</p>
<p>Please open the inquiry in ERP to review attached specifications and CAD drawings.</p>`,
    availablePlaceholders: ['AssigneeName', 'InquiryNumber', 'CompanyName', 'PriorityLevel', 'ExpectedCloseDate'],
    status: 'Active',
    createdOn: '2026-10-19T08:15:00Z',
    updatedOn: '2026-10-19T08:15:00Z',
  },
  {
    id: 5,
    templateCode: 'QUOTATION_SUBMITTED',
    templateName: 'Quotation Submission to Customer',
    moduleName: 'QUOTATION',
    subject: 'Quotation {{QuotationNumber}} for {{CompanyName}}',
    body: `<p>Dear {{ClientContact}},</p>
<p>We are pleased to submit our formal commercial and technical quotation for your review.</p>
<p><strong>Quotation Number:</strong> {{QuotationNumber}}<br />
<strong>Date:</strong> {{QuotationDate}}<br />
<strong>Valid Until:</strong> {{ValidUntilDate}}<br />
<strong>Total Amount:</strong> {{CurrencySymbol}} {{TotalAmount}}</p>
<p>The detailed PDF quote with technical specifications and commercial terms is attached.</p>
<p>Please feel free to reach out if you have any questions or require adjustments.</p>
<p>Sincerely,<br />{{SenderName}}<br />Micro-Flat Engineering</p>`,
    availablePlaceholders: ['ClientContact', 'CompanyName', 'QuotationNumber', 'QuotationDate', 'ValidUntilDate', 'CurrencySymbol', 'TotalAmount', 'SenderName'],
    status: 'Active',
    createdOn: '2026-10-22T15:00:00Z',
    updatedOn: '2026-10-25T11:00:00Z',
  },
  {
    id: 6,
    templateCode: 'PR_PENDING_APPROVAL',
    templateName: 'Purchase Requisition Approval Request',
    moduleName: 'PR',
    subject: 'Approval Needed: Purchase Requisition {{PRNumber}}',
    body: `<p>Hello {{ApproverName}},</p>
<p>Purchase Requisition <strong>{{PRNumber}}</strong> submitted by {{RequesterName}} requires your review and approval.</p>
<p><strong>Department:</strong> {{Department}}<br />
<strong>Estimated Value:</strong> {{EstimatedAmount}}<br />
<strong>Required By:</strong> {{RequiredDate}}</p>
<p>Please review and approve or reject the requisition in the ERP Approvals dashboard.</p>`,
    availablePlaceholders: ['ApproverName', 'PRNumber', 'RequesterName', 'Department', 'EstimatedAmount', 'RequiredDate'],
    status: 'Active',
    createdOn: '2026-10-23T11:20:00Z',
    updatedOn: '2026-10-23T11:20:00Z',
  },
  {
    id: 7,
    templateCode: 'PR_APPROVED',
    templateName: 'Purchase Requisition Approved Notice',
    moduleName: 'PR',
    subject: 'PR {{PRNumber}} has been Approved',
    body: `<p>Dear {{RequesterName}},</p>
<p>Your Purchase Requisition <strong>{{PRNumber}}</strong> has been approved by {{ApproverName}}.</p>
<p>It is now queued for Purchase Order creation by the Procurement Team.</p>`,
    availablePlaceholders: ['RequesterName', 'PRNumber', 'ApproverName', 'ApprovedDate'],
    status: 'Active',
    createdOn: '2026-10-24T12:00:00Z',
    updatedOn: '2026-10-24T12:00:00Z',
  },
  {
    id: 8,
    templateCode: 'ORDER_CONFIRMATION',
    templateName: 'Sales Order Confirmation',
    moduleName: 'SALES_ORDER',
    subject: 'Order Confirmation - {{OrderNumber}} [PO Ref: {{CustomerPONumber}}]',
    body: `<p>Dear {{ClientContact}},</p>
<p>We are delighted to confirm receipt and acceptance of your purchase order.</p>
<p><strong>Sales Order:</strong> {{OrderNumber}}<br />
<strong>Customer PO:</strong> {{CustomerPONumber}}<br />
<strong>Target Delivery Date:</strong> {{DeliveryDate}}<br />
<strong>Net Value:</strong> {{CurrencySymbol}} {{OrderAmount}}</p>
<p>Our production team has scheduled the manufacturing process according to your delivery timeline.</p>`,
    availablePlaceholders: ['ClientContact', 'OrderNumber', 'CustomerPONumber', 'DeliveryDate', 'CurrencySymbol', 'OrderAmount'],
    status: 'Active',
    createdOn: '2026-10-26T09:00:00Z',
    updatedOn: '2026-10-26T09:00:00Z',
  },
  {
    id: 9,
    templateCode: 'USER_WELCOME_TEMP_PWD',
    templateName: 'New User Temporary Password',
    moduleName: 'AUTH',
    subject: 'Welcome to Micro-Flat ERP - Account Activation',
    body: `<p>Hi {{FirstName}},</p>
<p>Welcome to Micro-Flat ERP! Your staff account has been set up with the role of <strong>{{PrimaryRole}}</strong>.</p>
<p><strong>Login Email:</strong> {{UserEmail}}<br />
<strong>Temporary Password:</strong> <code>{{TemporaryPassword}}</code></p>
<p>Please log in within 72 hours and you will be prompted to choose a permanent secure password.</p>
<p><a href="{{LoginUrl}}" style="background-color: #2563eb; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Log in to Micro-Flat ERP</a></p>`,
    availablePlaceholders: ['FirstName', 'PrimaryRole', 'UserEmail', 'TemporaryPassword', 'LoginUrl'],
    status: 'Active',
    createdOn: '2026-10-27T10:10:00Z',
    updatedOn: '2026-10-27T10:10:00Z',
  },
  {
    id: 10,
    templateCode: 'PASSWORD_RESET',
    templateName: 'Password Reset Verification Link',
    moduleName: 'AUTH',
    subject: 'Reset Your Micro-Flat ERP Password',
    body: `<p>Hello {{FirstName}},</p>
<p>We received a request to reset the password for your Micro-Flat ERP account.</p>
<p>Click the link below to set a new password. This link is valid for <strong>30 minutes</strong>:</p>
<p><a href="{{ResetUrl}}" style="color: #2563eb; font-weight: bold;">{{ResetUrl}}</a></p>
<p>If you did not request a password change, please contact system administration immediately.</p>`,
    availablePlaceholders: ['FirstName', 'ResetUrl'],
    status: 'Active',
    createdOn: '2026-10-28T14:00:00Z',
    updatedOn: '2026-10-28T14:00:00Z',
  },
  {
    id: 11,
    templateCode: 'MEETING_INVITATION',
    templateName: 'Meeting Invitation & Agenda',
    moduleName: 'MEETINGS',
    subject: 'Meeting Invitation: {{MeetingTitle}} [{{MeetingDate}}]',
    body: `<p>Dear Attendee,</p>
<p>You have been invited to attend the following meeting:</p>
<p><strong>Title:</strong> {{MeetingTitle}}<br />
<strong>Date & Time:</strong> {{MeetingDate}} at {{StartTime}}<br />
<strong>Location:</strong> {{Location}}<br />
<strong>Organizer:</strong> {{OrganizerName}}</p>
<p><strong>Agenda:</strong><br />{{Agenda}}</p>`,
    availablePlaceholders: ['MeetingTitle', 'MeetingDate', 'StartTime', 'Location', 'OrganizerName', 'Agenda'],
    status: 'Active',
    createdOn: '2026-10-29T11:45:00Z',
    updatedOn: '2026-10-29T11:45:00Z',
  },
  {
    id: 12,
    templateCode: 'DELEGATION_NOTICE',
    templateName: 'Approval Authority Delegation Notice',
    moduleName: 'DELEGATION',
    subject: 'Delegation Notice: Approval Authority Assigned to You',
    body: `<p>Hi {{DelegateName}},</p>
<p>{{DelegatorName}} has delegated approval responsibilities to you during their absence.</p>
<p><strong>Period:</strong> {{StartDate}} to {{EndDate}}<br />
<strong>Reason:</strong> {{Reason}}<br />
<strong>Assigned Modules:</strong> {{ModuleList}}</p>
<p>Please check your Approvals queue to process incoming items during this period.</p>`,
    availablePlaceholders: ['DelegateName', 'DelegatorName', 'StartDate', 'EndDate', 'Reason', 'ModuleList'],
    status: 'Inactive',
    createdOn: '2026-10-30T16:00:00Z',
    updatedOn: '2026-10-30T16:00:00Z',
  },
];

export const EMAIL_MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'PR', label: 'Purchase Requisition (PR)' },
  { value: 'SALES_ORDER', label: 'Sales Order' },
  { value: 'AUTH', label: 'Authentication & Users' },
  { value: 'MEETINGS', label: 'Meetings' },
  { value: 'DELEGATION', label: 'Delegation' },
];

export const DEFAULT_PRESET_PLACEHOLDERS = [
  'VendorName',
  'VendorCode',
  'ClientContact',
  'CompanyName',
  'InquiryNumber',
  'QuotationNumber',
  'PRNumber',
  'OrderNumber',
  'FirstName',
  'ApproverName',
  'CurrencySymbol',
  'TotalAmount',
  'Date',
];

export default INITIAL_EMAIL_TEMPLATES;

