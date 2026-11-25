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
  IconDeal,
  IconQuotation,
  IconSalesOrder,
  IconProject,
  IconProduct,
  IconDelegation,
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
  IconDeliveryTerms,
  IconNotificationSetup,
  IconTax,
  IconProcessFlow,
  IconGrades,
  IconMaterials,
  IconSpecParameters,
  IconStandards,
  IconCurrency,
  IconList,
  IconAdd,
  IconMeeting,
  IconCreditCard,
  IconEmailTemplates, IconMyQueue,
} from '../constants/icons';

/**
 * Approvals Navigation Mode:
 *   - 'dropdown': Shows the 'Approval' accordion in the sidebar with per-module links (Vendor, PR) & Settings.
 *   - 'unified':  Shows a single clean 'Global Approvals' link, letting the in-page Module filter handle selection.
 * Default: 'dropdown'. Change this constant to 'unified' to switch modes anytime.
 */
export const APPROVALS_NAV_MODE = 'dropdown'; // 'dropdown' | 'unified'

const approvalNavItem =
  APPROVALS_NAV_MODE === 'dropdown'
    ? {
        label: 'Approvals',
        icon: IconApproval,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Global Approvals',
            icon: IconApproval,
            path: '/approvals',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'Vendor Approvals',
            icon: IconVendorApproval,
            path: '/approvals?module=VENDOR',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'PR Approvals',
            icon: IconPRApproval,
            path: '/approvals?module=PURCHASE_REQUISITION',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'Quotation Approvals',
            icon: IconQuotation,
            path: '/approvals?module=QUOTATION',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'Product Approvals',
            icon: IconProduct,
            path: '/approvals?module=PRODUCT',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
        ],
      }
    : {
        label: 'Global Approvals',
        icon: IconApproval,
        path: '/approvals',
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
      };

const navigation = [
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
        label: 'My Queue',
        icon: IconMyQueue,
        path: '/my-queue',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Delegation',
        icon: IconDelegation,
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        children: [
          {
            label: 'All Delegation',
            icon: IconList,
            path: '/delegation/all',
            roles: ['ADMIN'],
          },
          {
            label: 'My Delegation',
            icon: IconDelegation,
            path: '/delegation',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
            quickAction: {
              icon: IconAdd,
              title: 'New Delegation',
              path: '/delegation/new',
            },
          },
        ],
      },
      {
        label: 'Meetings',
        icon: IconMeeting,
        path: '/meetings',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        quickAction: {
          icon: IconAdd,
          title: 'Schedule Meeting',
          path: '/meetings/new',
        },
      },
      {
        label: 'Inquiry',
        icon: IconInquiry,
        path: '/inquiries',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Deals',
        icon: IconDeal,
        path: '/deals',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Quotation',
        icon: IconQuotation,
        path: '/quotations',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Sales Orders',
        icon: IconSalesOrder,
        path: '/sales-orders',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      {
        label: 'Projects',
        icon: IconProject,
        path: '/projects',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        quickAction: {
          icon: IconAdd,
          title: 'New Project',
          path: '/projects/new',
        },
      },
      {
        label: 'Products & Price',
        icon: IconProduct,
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        children: [
          {
            label: 'Products',
            icon: IconProduct,
            path: '/products',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
            quickAction: {
              icon: IconAdd,
              title: 'New Product',
              path: '/products/new',
            },
          },
          {
            label: 'Product Price',
            icon: IconCreditCard,
            path: '/product-prices',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
        ],
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
        ],
      },
      {
        label: 'Clients',
        icon: IconClient,
        path: '/clients',
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
      },
      approvalNavItem,
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
            label: 'Financial Year Setup',
            icon: IconMeeting,
            path: '/configuration/financial-years',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Email Templates',
            icon: IconEmailTemplates,
            path: '/configuration/email-templates',
            roles: ['ADMIN', 'MANAGER'],
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
            label: 'Grades',
            icon: IconGrades,
            path: '/configuration/grades',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Materials',
            icon: IconMaterials,
            path: '/configuration/materials',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Spec Parameters',
            icon: IconSpecParameters,
            path: '/configuration/spec-parameters',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Standards',
            icon: IconStandards,
            path: '/configuration/standards',
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
            label: 'Currencies',
            icon: IconCurrency,
            path: '/configuration/currencies',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Payment Terms',
            icon: IconPaymentTerms,
            path: '/configuration/payment-terms',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Delivery Terms',
            icon: IconDeliveryTerms,
            path: '/configuration/delivery-terms',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Notification Setup',
            icon: IconNotificationSetup,
            path: '/configuration/notification-setup',
            roles: ['ADMIN'],
          },
          {
            label: 'Tax Configurations',
            icon: IconTax,
            path: '/configuration/tax-configs',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Process Flows',
            icon: IconProcessFlow,
            path: '/configuration/process-flows',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Approval Settings',
            icon: IconApproval,
            path: '/approvals/settings',
            roles: ['ADMIN'],
          },
        ],
      },
    ],
  },
];

export default navigation;
