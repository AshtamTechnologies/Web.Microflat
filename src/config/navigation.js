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
    ],
  },
  {
    section: 'PROCUREMENT & VENDORS',
    items: [
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
    ],
  },
];

export default navigation;
