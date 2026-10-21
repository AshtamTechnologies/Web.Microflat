/**
 * processFlowIcons.js — Curated business icons for process flows.
 *
 * Specific Lucide imports only (no dynamic imports of entire icon set).
 * Exports:
 *   - FLOW_ICONS: Map of iconKey (kebab-case) -> React Icon component
 *   - FLOW_ICON_OPTIONS: Array of { key, label, icon } for pickers
 *   - getFlowIcon(iconKey): Safe resolver with fallback icon
 */

import {
  MessageSquare,
  UserCheck,
  FileText,
  PhoneCall,
  Handshake,
  ThumbsUp,
  ShoppingCart,
  CheckCircle,
  Truck,
  Package,
  ClipboardCheck,
  Factory,
  Wallet,
  Send,
  Mail,
  Calendar,
  ShieldCheck,
  Wrench,
  XCircle,
  Flag,
  Clock,
  Users,
  Building2,
  Receipt,
  Boxes,
  FileSpreadsheet,
  Layers,
  Tag,
  Bell,
  CreditCard,
  FileCheck,
  BadgeCheck,
  Landmark,
  CheckSquare,
  Sparkles,
  Sliders,
  Search,
  Database,
  Inbox,
  HelpCircle,
  Activity,
  CircleDot,
  // Extended Workflow & ERP Icons
  Play,
  Pause,
  RefreshCw,
  RotateCcw,
  CheckCheck,
  User,
  UserPlus,
  UserX,
  Shield,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  Eye,
  Warehouse,
  Settings,
  Scale,
  Gauge,
  BarChart3,
  TrendingUp,
  File,
  FilePlus,
  FileSearch,
  Folder,
  FolderCheck,
  Paperclip,
  Printer,
  Archive,
  Phone,
  AlertCircle,
  AlertTriangle,
  Info,
  MapPin,
  Globe,
  DollarSign,
  Target,
  Award,
  Zap,
  // Cross & Reject Icons
  X,
  Ban,
  XOctagon,
  XSquare,
  FileX,
  ShieldX,
  ThumbsDown,
} from 'lucide-react';

export const FLOW_ICONS = {
  // Cross & Reject (Status / Stop / Deny)
  'cross': X,
  'reject': Ban,
  'x-circle': XCircle,
  'x-octagon': XOctagon,
  'x-square': XSquare,
  'file-x': FileX,
  'shield-x': ShieldX,
  'thumbs-down': ThumbsDown,
  'ban': Ban,

  // Communication & Messaging
  'message-square': MessageSquare,
  'phone-call': PhoneCall,
  'phone': Phone,
  'mail': Mail,
  'send': Send,
  'inbox': Inbox,
  'bell': Bell,

  // Documents & Records
  'file-text': FileText,
  'file': File,
  'file-check': FileCheck,
  'file-plus': FilePlus,
  'file-search': FileSearch,
  'file-spreadsheet': FileSpreadsheet,
  'clipboard-check': ClipboardCheck,
  'folder': Folder,
  'folder-check': FolderCheck,
  'paperclip': Paperclip,
  'printer': Printer,
  'receipt': Receipt,
  'archive': Archive,

  // Workflow, Status & Milestones
  'play': Play,
  'pause': Pause,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  'check-circle': CheckCircle,
  'check-square': CheckSquare,
  'check-check': CheckCheck,
  'badge-check': BadgeCheck,
  'circle-x': XCircle,
  'flag': Flag,
  'clock': Clock,
  'target': Target,
  'award': Award,
  'zap': Zap,
  'sparkles': Sparkles,
  'circle-dot': CircleDot,
  'activity': Activity,

  // Procurement, Inventory & Logistics
  'shopping-cart': ShoppingCart,
  'package': Package,
  'boxes': Boxes,
  'truck': Truck,
  'warehouse': Warehouse,
  'factory': Factory,
  'building-2': Building2,
  'tag': Tag,
  'layers': Layers,
  'scale': Scale,
  'gauge': Gauge,
  'map-pin': MapPin,
  'globe': Globe,

  // Finance & Banking
  'wallet': Wallet,
  'credit-card': CreditCard,
  'landmark': Landmark,
  'dollar-sign': DollarSign,
  'bar-chart-3': BarChart3,
  'trending-up': TrendingUp,

  // Users, Roles & Security
  'user': User,
  'users': Users,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'user-x': UserX,
  'handshake': Handshake,
  'thumbs-up': ThumbsUp,
  'shield': Shield,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  'key': Key,
  'lock': Lock,
  'unlock': Unlock,
  'eye': Eye,

  // System, Tools & Diagnostics
  'wrench': Wrench,
  'settings': Settings,
  'sliders': Sliders,
  'database': Database,
  'search': Search,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'info': Info,
  'help-circle': HelpCircle,
};

/**
 * Array of icon items for select / picker UIs.
 */
export const FLOW_ICON_OPTIONS = Object.entries(FLOW_ICONS).map(([key, IconComponent]) => ({
  key,
  label: key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
  icon: IconComponent,
}));

/**
 * Returns the Lucide icon component corresponding to an iconKey.
 * If the key is null/unknown, returns a clean generic fallback (CircleDot).
 *
 * @param {string} [iconKey]
 * @returns {import('react').ComponentType<{ size?: number, className?: string }>}
 */
export function getFlowIcon(iconKey) {
  if (!iconKey) return CircleDot;
  const key = String(iconKey).trim().toLowerCase();
  return FLOW_ICONS[key] || CircleDot;
}
