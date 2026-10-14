/**
 * src/constants/icons.js — Centralized Icon Registry for MicroFlat ERP.
 *
 * Single Source of Truth for:
 *   - Entity & Module Icons (Sidebar, PageHeaders, Cards, Badges)
 *   - Global Action Icons (Add, Edit, Delete, Search, Reset, Cancel, Back)
 *   - Contact & Detail Field Icons (Phone, Mail, MapPin, User)
 *   - Status & Indicator Icons (Active, Inactive, Calendar, Clock)
 *
 * To change any icon across the whole application, update it here.
 */

import { createElement } from 'react';
import {
  // ── Entity & Module Icons ──
  Truck,
  Handshake,
  Landmark,
  ClipboardList,
  Inbox,
  CheckSquare,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Users,
  Settings,
  Hash,
  FileCheck,
  FolderTree,
  Scale,
  MapPin,
  HandCoins,
  ListTree,

  // ── Action Icons ──
  Plus,
  Pencil,
  Trash2,
  Search,
  SearchX,
  RotateCcw,
  X,
  Check,
  Ban,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Eye,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  FileText,

  // ── Field & Contact Icons ──
  Phone,
  Mail,
  User,
  Building,
  Globe,
  Clock,
  AlertCircle,
  Lock,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

// Custom image assets from assets folder
import DashboardIconImg from '../assets/menuicon/Dashboardicon.png';
import UserIconImg from '../assets/menuicon/UserIcon.png';

/**
 * Helper to turn any PNG, SVG, or WEBP image into a standard React icon component.
 * This allows using custom images anywhere Lucide icons are used with uniform size & styling.
 *
 * Example to use a custom image for Vendor:
 *   import VendorImg from '../assets/menuicon/VendorIcon.png';
 *   export const IconVendor = createImageIcon(VendorImg, 'Vendor');
 */
export function createImageIcon(src, alt = '') {
  return function CustomImageIcon({ size = 20, className = '', ...props }) {
    return createElement('img', {
      src,
      alt,
      style: { width: size, height: size },
      className: `object-contain shrink-0 ${className}`,
      'aria-hidden': 'true',
      ...props,
    });
  };
}

/* ── 1. MODULE & ENTITY ICONS ── */
// Tip: To switch any icon below to a custom image, simply wrap the image in createImageIcon(MyImage, 'Label')
export const IconVendor = Truck;
export const IconClient = Handshake;
export const IconBankDetails = Landmark;
export const IconPurchaseRequisition = ClipboardList;
export const IconPR = ClipboardList; // Shorthand alias
export const IconInquiry = Inbox;
export const IconDashboard = LayoutDashboard;
export const IconDashboardImage = createImageIcon(DashboardIconImg, 'Dashboard');
export const IconUsers = Users;
export const IconUsersImage = createImageIcon(UserIconImg, 'Users');
export const IconConfig = Settings;

// Approvals
export const IconApproval = CheckSquare;
export const IconVendorApproval = Truck; // Consistent with Vendor module branding
export const IconPRApproval = ClipboardCheck;

// Configuration Sub-Modules
export const IconSeriesSetup = Hash;
export const IconDocumentTypes = FileCheck;
export const IconProductCategories = FolderTree;
export const IconUOM = Scale;
export const IconRegions = MapPin;
export const IconPaymentTerms = HandCoins;
export const IconList = ListTree;

/* ── 2. GLOBAL ACTION ICONS ── */
export const IconAdd = Plus;
export const IconEdit = Pencil;
export const IconDelete = Trash2;
export const IconSearch = Search;
export const IconSearchEmpty = SearchX;
export const IconReset = RotateCcw;
export const IconCancel = X;
export const IconClose = X;
export const IconSave = Check;
export const IconBack = ArrowLeft;
export const IconView = Eye;
export const IconCalendar = Calendar;
export const IconDownload = Download;
export const IconUpload = Upload;
export const IconAttachment = Paperclip;
export const IconDocument = FileText;

/* ── 3. PAGINATION & SORTING ICONS ── */
export const IconSortUp = ChevronUp;
export const IconSortDown = ChevronDown;
export const IconPrev = ChevronLeft;
export const IconNext = ChevronRight;

/* ── 4. FIELD & CONTACT ICONS ── */
export const IconPhone = Phone;
export const IconMail = Mail;
export const IconLocation = MapPin;
export const IconUser = User;
export const IconBuilding = Building;
export const IconWebsite = Globe;

/* ── 5. STATUS & INDICATOR ICONS ── */
export const IconActive = Check;
export const IconInactive = Ban;
export const IconClock = Clock;
export const IconAlert = AlertCircle;
export const IconLock = Lock;
export const IconSecurity = ShieldCheck;
export const IconLogout = LogOut;

/* ── 6. STANDARD ICON COLOR & SIZE CLASSES ── */
export const ICON_STYLES = {
  // PageHeader primary branding icon
  pageHeader: 'text-primary shrink-0',
  // Card meta details (Phone, Email, MapPin, Calendar)
  metaField: 'text-text-muted/70 shrink-0',
  // Table action buttons
  actionEdit: 'text-text-muted hover:text-primary transition-colors',
  actionDelete: 'text-text-muted hover:text-danger transition-colors',
  // Status dot indicators
  statusActive: 'text-success',
  statusInactive: 'text-danger',
  statusWarning: 'text-warning',
};

/* ── 7. ENTITY DICTIONARY (For navigation.js and programmatic lookup) ── */
export const MODULE_ICONS = {
  vendor: IconVendor,
  client: IconClient,
  bankDetails: IconBankDetails,
  purchaseRequisition: IconPurchaseRequisition,
  pr: IconPR,
  inquiry: IconInquiry,
  dashboard: IconDashboard,
  users: IconUsers,
  approval: IconApproval,
  vendorApproval: IconVendorApproval,
  prApproval: IconPRApproval,
  configuration: IconConfig,
  seriesSetup: IconSeriesSetup,
  documentTypes: IconDocumentTypes,
  productCategories: IconProductCategories,
  uom: IconUOM,
  regions: IconRegions,
  paymentTerms: IconPaymentTerms,
};

export default MODULE_ICONS;
