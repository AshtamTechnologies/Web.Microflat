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

import DashboardIconImg from '../assets/menuicon/Dashboardicon.png';
import UserIconImg from '../assets/menuicon/UserIcon.png';
import {
  Truck,
  LayoutDashboard,
  ListTree,
  Plus,
  CheckSquare,
  Building2,
  FileText,
  ClipboardList,
  ClipboardCheck,
  Inbox,
  Settings,
  Hash,
  FileCheck,
  FolderTree,
} from 'lucide-react';

export const navigation = [
  {
    section: 'MAIN',
    items: [
      {
        label: 'Dashboard',
        image: DashboardIconImg,
        path: '/dashboard',
        roles: ['ADMIN', 'MANAGER', 'USER'],
      },
      {
        label: 'Inquiry',
        icon: Inbox,
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
        icon: ClipboardList,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'All Requisitions',
            icon: ListTree,
            path: '/purchase-requisition',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
            quickAction: {
              icon: Plus,
              title: 'Create PR',
              path: '/purchase-requisition/create',
            },
          },
          // {
          //   label: 'Create Requisition',
          //   icon: Plus,
          //   path: '/purchase-requisition/create',
          //   roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          // },
        ],
      },
      {
        label: 'Vendors',
        icon: Truck,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Dashboard',
            icon: LayoutDashboard,
            path: '/vendors/dashboard',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'All Vendors',
            icon: ListTree,
            path: '/vendors',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
            quickAction: {
              icon: Plus,
              title: 'Add Vendor',
              path: '/vendors/new',
            },
          },
        ],
      },
      {
        label: 'Approval',
        icon: CheckSquare,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Vendor Approval',
            icon: Building2,
            path: '/approvals/vendors',
            roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
          },
          {
            label: 'PR Approval',
            icon: ClipboardCheck,
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
        label: 'Users & Roles',
        image: UserIconImg,
        path: '/users',
        roles: ['ADMIN'],
      },
      {
        label: 'Configuration',
        icon: Settings,
        roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
        children: [
          {
            label: 'Series Setup',
            icon: Hash,
            path: '/configuration/series',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Inquiry Document Types',
            icon: FileCheck,
            path: '/configuration/document-types',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
          {
            label: 'Product Categories',
            icon: FolderTree,
            path: '/configuration/product-categories',
            roles: ['ADMIN', 'MANAGER', 'USER', 'PROCUREMENT'],
          },
        ],
      },
    ],
  },
];

export default navigation;
