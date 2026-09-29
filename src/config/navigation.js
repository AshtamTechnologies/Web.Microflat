/**
 * navigation.js — single source of truth for the app sidebar menu.
 *
 * Shape: { label, icon, path?, children?: [{ label, icon, path }] }
 *
 * Adding or removing a menu item = edit this array only.
 * Sidebar.jsx reads this config and never needs to be touched.
 */

import {
  LayoutDashboard,
  Users,
  Truck,
  Building2,
} from 'lucide-react';

/** @type {Array<{ label: string, icon: React.ComponentType, path?: string, children?: Array<{label:string,icon:React.ComponentType,path:string}> }>} */
const navigation = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Users',
    icon: Users,
    path: '/users',
  },
  {
    label: 'Vendor Management',
    icon: Truck,
    children: [
      {
        label: 'Vendors',
        icon: Building2,
        path: '/vendors',
      },
    ],
  },
];

export default navigation;
