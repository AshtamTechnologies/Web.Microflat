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
  Plus,
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
        label: 'Vendor Management',
        icon: Truck,
        roles: ['ADMIN', 'MANAGER', 'PROCUREMENT'],
        children: [
          {
            label: 'Vendors',
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
