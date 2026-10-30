/**
 * src/constants/icons.js — Centralized Icon Registry for MicroFlat ERP.
 *
 * Single Source of Truth for:
 *   - Entity & Module Icons (Sidebar, PageHeaders, Cards, Badges)
 *   - Global Action Icons (Add, Edit, Delete, Search, Reset, Cancel, Back, Save)
 *   - Contact & Detail Field Icons (Phone, Mail, MapPin, User)
 *   - Status & Indicator Icons (Active, Inactive, Calendar, Clock, Success, Warning, Error)
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
  Workflow,

  // ── Action Icons ──
  Plus,
  Pencil,
  Trash2,
  Search,
  SearchX,
  RotateCcw,
  X,
  Check,
  Save,
  Ban,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Eye,
  EyeOff,
  Download,
  UploadCloud,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Layers,
  Package,
  Tags,
  Send,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Flame,
  Copy,
  CreditCard,
  Maximize2,
  Ruler,
  Target,
  KeyRound,
  History,
  Image,
  HelpCircle,
  FolderLock,
  Tag,
  Folder,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ShoppingCart,
  Receipt,
  PackageCheck,

  // ── Field & Contact Icons ──
  Phone,
  Mail,
  User,
  UserPlus,
  UserCheck,
  Contact,
  Building,
  Globe,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  IndianRupee,
  Activity,
  Smartphone,
  Laptop,
  Tablet,
} from 'lucide-react';

// Custom image assets from assets folder
import DashboardIconImg from '../assets/menuicon/Dashboardicon.png';
import UserIconImg from '../assets/menuicon/UserIcon.png';

/**
 * Standard Icon Sizes (in pixels)
 * RULE: an icon follows the size of the control it sits in:
 * - small control: 14
 * - medium control: 16
 * - large control: 18
 * - badges/chips: 12
 * - sidebar nav: 18
 * - page-header and section-title icons: 20
 * - empty states: 32-40
 */
export const ICON_SIZE = {
  xs: 12, // keep in sync with tokens.css (--icon-xs: 0.75rem)
  sm: 14, // keep in sync with tokens.css (--icon-sm: 0.875rem)
  md: 16, // keep in sync with tokens.css (--icon-md: 1rem)
  lg: 18, // keep in sync with tokens.css (--icon-lg: 1.125rem)
  xl: 24, // keep in sync with tokens.css (--icon-xl: 1.5rem)
};

/**
 * Helper to turn any PNG, SVG, or WEBP image into a standard React icon component.
 * This allows using custom images anywhere Lucide icons are used with uniform size & styling.
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
export const IconVendor = Truck;
export const IconClient = Handshake;
export const IconCompany = Building2;
export const IconBankDetails = Landmark;
export const IconPurchaseRequisition = ClipboardList;
export const IconPR = ClipboardList; // Shorthand alias
export const IconInquiry = Inbox;
export const IconDashboard = LayoutDashboard;
export const IconDashboardImage = createImageIcon(DashboardIconImg, 'Dashboard');
export const IconUsers = Users;
export const IconUsersImage = createImageIcon(UserIconImg, 'Users');
export const IconDelegation = ArrowLeftRight;
export const IconConfig = Settings;

// Approvals
export const IconApproval = CheckSquare;
export const IconVendorApproval = Truck;
export const IconPRApproval = ClipboardCheck;

// Configuration Sub-Modules
export const IconSeriesSetup = Hash;
export const IconDocumentTypes = FileCheck;
export const IconProductCategories = FolderTree;
export const IconUOM = Scale;
export const IconRegions = MapPin;
export const IconPaymentTerms = HandCoins;
export const IconProcessFlow = Workflow;
export const IconWorkflow = Workflow;
export const IconList = ListTree;

/* ── 2. GLOBAL ACTION ICONS (Canonical semantic registry) ── */
export const IconAdd = Plus;
export const IconEdit = Pencil;
export const IconDelete = Trash2;
export const IconTrash = Trash2;
export const IconView = Eye;
export const IconEye = Eye;
export const IconClose = X;
export const IconCancel = X; // Alias for IconClose
export const IconBack = ArrowLeft;
export const IconSave = Save;
export const IconCheck = Check;
export const IconSuccess = CheckCircle2;
export const IconError = AlertCircle;
export const IconWarning = AlertTriangle;
export const IconInfo = Info;
export const IconSearch = Search;
export const IconSearchEmpty = SearchX;
export const IconReset = RotateCcw;
export const IconRotateCcw = RotateCcw;
export const IconUpload = UploadCloud; // Outliers merged to UploadCloud
export const IconUploadCloud = UploadCloud;
export const IconDownload = Download;
export const IconCalendar = Calendar;
export const IconRefresh = RefreshCw; // Change status / refresh

/* ── 3. PAGINATION, CAROUSEL & SORTING ICONS ── */
export const IconSortUp = ChevronUp;
export const IconSortDown = ChevronDown;
export const IconPrev = ChevronLeft;
export const IconNext = ChevronRight;
export const IconChevronDown = ChevronDown;
export const IconChevronUp = ChevronUp;
export const IconChevronLeft = ChevronLeft;
export const IconChevronRight = ChevronRight;
export const IconArrowLeft = ArrowLeft;
export const IconArrowRight = ArrowRight;
export const IconArrowUpDown = ArrowUpDown;
export const IconArrowUp = ArrowUp;
export const IconArrowDown = ArrowDown;

/* ── 4. FIELD & CONTACT ICONS ── */
export const IconPhone = Phone;
export const IconMail = Mail;
export const IconLocation = MapPin;
export const IconMapPin = MapPin;
export const IconUser = User;
export const IconUserPlus = UserPlus;
export const IconUserCheck = UserCheck;
export const IconContact = Contact;
export const IconBuilding = Building;
export const IconBuilding2 = Building2;
export const IconWebsite = Globe;
export const IconGlobe = Globe;

/* ── 5. STATUS & INDICATOR ICONS ── */
export const IconActive = Check;
export const IconInactive = Ban;
export const IconClock = Clock;
export const IconAlert = AlertCircle;
export const IconLock = Lock;
export const IconSecurity = ShieldCheck;
export const IconShield = Shield;
export const IconShieldCheck = ShieldCheck;
export const IconShieldAlert = ShieldAlert;
export const IconLogout = LogOut;
export const IconXCircle = XCircle;
export const IconSparkles = Sparkles;
export const IconFlame = Flame;
export const IconActivity = Activity;

/* ── 6. DOCUMENT & FILE ATTACHMENTS ── */
export const IconAttachment = Paperclip;
export const IconPaperclip = Paperclip;
export const IconDocument = FileText;
export const IconFileText = FileText;
export const IconFile = File;
export const IconFileSpreadsheet = FileSpreadsheet;
export const IconFileCode = FileCode;
export const IconFileCheck = FileCheck;
export const IconLayers = Layers;
export const IconPackage = Package;
export const IconTags = Tags;
export const IconImage = Image;

/* ── 7. OTHER COMMON GLYPHS ── */
export const IconSend = Send;
export const IconExternalLink = ExternalLink;
export const IconMessageSquare = MessageSquare;
export const IconCopy = Copy;
export const IconCreditCard = CreditCard;
export const IconMaximize = Maximize2;
export const IconMaximize2 = Maximize2;
export const IconIndianRupee = IndianRupee;
export const IconEyeOff = EyeOff;
export const IconRuler = Ruler;
export const IconTarget = Target;
export const IconKeyRound = KeyRound;
export const IconSmartphone = Smartphone;
export const IconLaptop = Laptop;
export const IconTablet = Tablet;
export const IconHistory = History;
export const IconHash = Hash;
export const IconHelp = HelpCircle;
export const IconFolderLock = FolderLock;
export const IconTag = Tag;
export const IconFolder = Folder;
export const IconCompass = Compass;
export const IconPanelLeftClose = PanelLeftClose;
export const IconPanelLeftOpen = PanelLeftOpen;
export const IconMenu = Menu;
export const IconShoppingCart = ShoppingCart;
export const IconReceipt = Receipt;
export const IconPackageCheck = PackageCheck;

/* ── 8. STANDARD ICON COLOR & SIZE CLASSES ── */
export const ICON_STYLES = {
  pageHeader: 'text-primary shrink-0',
  metaField: 'text-text-muted/70 shrink-0',
  actionEdit: 'text-text-muted hover:text-primary transition-colors',
  actionDelete: 'text-text-muted hover:text-danger transition-colors',
  statusActive: 'text-success',
  statusInactive: 'text-danger',
  statusWarning: 'text-warning',
};

/* ── 9. ENTITY DICTIONARY (For navigation.js and programmatic lookup) ── */
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
  processFlow: IconProcessFlow,
};

export default MODULE_ICONS;
