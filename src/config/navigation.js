/**
 * navigation.js — single source of truth for the MicroFlat ERP sidebar menu.
 *
 * Supported item schema:
 *   - label: string (display title)
 *   - icon?: React Component (Lucide icon)
 *   - image?: string (custom icon image path)
 *   - path?: string (URL route)
 *   - roles?: string[] (RBAC permission list: 'ADMIN', 'MANAGER', 'USER', etc.)
 *   - badge?: string | number (live count or status indicator)
 *   - quickAction?: { icon: React Component, title: string, path: string } (1-click action button on hover)
 *   - children?: Array<item> (nested submenu links)
 */

import {
  IconVendor,
  IconClient,
  IconBankDetails,
  IconPR,
  IconInquiry,
  IconDashboard,
  IconCompany,
  IconUsers,
  IconApproval,
  IconVendorApproval,
  IconPRApproval,
  IconConfig,
  IconSeriesSetup,
  IconDocumentTypes,
  IconProductCategories,
  IconUOM,
  IconRegions,
  IconPaymentTerms,
  IconProcessFlow,
  IconList,
  IconAdd,
} from '../constants/icons';

export const navigation = [
  {
    section: 'MAIN',
    items: [
      {
        label: 'Dashboard',
        icon: IconDashboard,
        path: '/dashboard',
        roles: ['ADMIN', 'MANAGER', 'USER'],
      },
      {
        label: 'Inquiry',
        icon: IconInquiry,
        path: '/inquiries',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
    ],
  },
  {
    section: 'PROCUREMENT & VENDORS',
    items: [
      {
        label: 'Purchase Requisition',
        icon: IconPR,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Dashboard',
            icon: IconDashboard,
            path: '/purchase-requisition/dashboard',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'All Requisitions',
            icon: IconList,
            path: '/purchase-requisition',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
            quickAction: {
              icon: IconAdd,
              title: 'Create Requisition',
              path: '/purchase-requisition/create',
            },
          },
        ],
      },
      {
        label: 'Vendors',
        icon: IconVendor,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Dashboard',
            icon: IconDashboard,
            path: '/vendors/dashboard',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'All Vendors',
            icon: IconList,
            path: '/vendors',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
            quickAction: {
              icon: IconAdd,
              title: 'Add Vendor',
              path: '/vendors/new',
            },
          },
          {
            label: 'Bank Details',
            icon: IconBankDetails,
            path: '/vendor-bank-details',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
            quickAction: {
              icon: IconAdd,
              title: 'Add Bank Details',
              path: '/vendor-bank-details/new',
            },
          },
        ],
      },
      {
        label: 'Clients',
        icon: IconClient,
        path: '/clients',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Approval',
        icon: IconApproval,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Vendor Approval',
            icon: IconVendorApproval,
            path: '/approvals/vendors',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'PR Approval',
            icon: IconPRApproval,
            path: '/approvals/purchase-requisitions',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
        ],
      },
    ],
  },
  {
    section: 'ADMINISTRATION',
    items: [
      {
        label: 'Company',
        icon: IconCompany,
        roles: ['ADMIN', 'MANAGER'],
        children: [
          {
            label: 'Company Registration',
            icon: IconList,
            path: '/company-registration',
            roles: ['ADMIN', 'MANAGER'],
          },
          {
            label: 'Company Bank Details',
            icon: IconBankDetails,
            path: '/company-bank-details',
            roles: ['ADMIN', 'MANAGER'],
            quickAction: {
              icon: IconAdd,
              title: 'Add Bank Details',
              path: '/company-bank-details/new',
            },
          },
        ],
      },
      {
        label: 'Users & Roles',
        icon: IconUsers,
        path: '/users',
        roles: ['ADMIN'],
      },
      {
        label: 'Configuration',
        icon: IconConfig,
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        children: [
          {
            label: 'Series Setup',
            icon: IconSeriesSetup,
            path: '/configuration/series',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Document Types',
            icon: IconDocumentTypes,
            path: '/configuration/document-types',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Product Categories',
            icon: IconProductCategories,
            path: '/configuration/product-categories',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Unit of Measurement (UOM)',
            icon: IconUOM,
            path: '/configuration/uom',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Regions',
            icon: IconRegions,
            path: '/configuration/regions',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Payment Terms',
            icon: IconPaymentTerms,
            path: '/configuration/payment-terms',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Process Flows',
            icon: IconProcessFlow,
            path: '/configuration/process-flows',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
        ],
      },
    ],
  },
];

export default navigation;
