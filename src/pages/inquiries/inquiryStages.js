/**
 * inquiryStages.js — Centralized configuration for Inquiry Kanban stages.
 *
 * Easily add, remove, rename, or reorder stages by editing this array.
 * The Kanban board, column styles, and status badges derive dynamically from here.
 */

export const API_INQUIRY_STATUSES = [
  { id: 'New', name: 'New' },
  { id: 'Deal', name: 'Deal' },
  { id: 'Quoting', name: 'Quoting' },
  { id: 'Won', name: 'Won' },
  { id: 'Lost', name: 'Lost' },
];

export const INQUIRY_STAGES = [
  {
    id: 'New',
    name: 'New',
    color: 'blue',
    badgeVariant: 'info',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    accentBorder: 'border-t-blue-500',
  },
  {
    id: 'Deal',
    name: 'Deal',
    color: 'violet',
    badgeVariant: 'role',
    badgeClass: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300',
    dotClass: 'bg-violet-500',
    accentBorder: 'border-t-violet-500',
  },
  {
    id: 'Quoting',
    name: 'Quoting',
    color: 'amber',
    badgeVariant: 'warning',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    accentBorder: 'border-t-amber-500',
  },
  {
    id: 'Won',
    name: 'Won',
    color: 'emerald',
    badgeVariant: 'success',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    accentBorder: 'border-t-emerald-500',
  },
  {
    id: 'Lost',
    name: 'Lost',
    color: 'rose',
    badgeVariant: 'danger',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    accentBorder: 'border-t-rose-500',
  },
  // Visual pipeline stages mapped to linked Quotation / PO progress
  {
    id: 'Inquiry',
    name: 'Inquiry',
    color: 'blue',
    badgeVariant: 'info',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    accentBorder: 'border-t-blue-500',
  },
  {
    id: 'Qualified',
    name: 'Qualified',
    color: 'indigo',
    badgeVariant: 'role',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    accentBorder: 'border-t-indigo-500',
  },
  {
    id: 'Quotation',
    name: 'Quotation',
    color: 'amber',
    badgeVariant: 'warning',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    accentBorder: 'border-t-amber-500',
  },
  {
    id: 'Negotiation',
    name: 'Negotiation',
    color: 'orange',
    badgeVariant: 'warning',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-300',
    dotClass: 'bg-orange-500',
    accentBorder: 'border-t-orange-500',
  },
  {
    id: 'Accepted',
    name: 'Accepted',
    color: 'emerald',
    badgeVariant: 'success',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    accentBorder: 'border-t-emerald-500',
  },
  {
    id: 'Rejected',
    name: 'Rejected',
    color: 'rose',
    badgeVariant: 'danger',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    accentBorder: 'border-t-rose-500',
  },
  {
    id: 'PO created',
    name: 'PO created',
    color: 'cyan',
    badgeVariant: 'info',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-300',
    dotClass: 'bg-cyan-500',
    accentBorder: 'border-t-cyan-500',
  },
  {
    id: 'Order Confirm',
    name: 'Order Confirm',
    color: 'teal',
    badgeVariant: 'success',
    badgeClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:bg-teal-500/20 dark:text-teal-300',
    dotClass: 'bg-teal-500',
    accentBorder: 'border-t-teal-500',
  },
];

/**
 * Normalizes status IDs to one of the canonical stages.
 */
export function normalizeInquiryStage(statusId) {
  if (!statusId) return '';
  
  // Exact match
  const directMatch = INQUIRY_STAGES.find(
    (s) => s.id.toLowerCase() === String(statusId).toLowerCase()
  );
  if (directMatch) return directMatch.id;

  return String(statusId);
}

/**
 * Maps a Kanban visual stage back to a valid API status for PATCH /api/inquiries/{id}/status.
 */
export function mapStageToApiStatus(stageId) {
  if (!stageId) return null;
  const lower = String(stageId).toLowerCase();
  if (lower === 'new' || lower === 'inquiry' || lower === 'qualified') return 'New';
  if (lower === 'deal') return 'Deal';
  if (lower === 'quoting' || lower === 'quotation' || lower === 'negotiation') return 'Quoting';
  if (lower === 'won' || lower === 'accepted' || lower === 'order confirm' || lower === 'po created') return 'Won';
  if (lower === 'lost' || lower === 'rejected') return 'Lost';
  return String(stageId);
}

/**
 * Get stage meta object by ID (with fallback to default)
 */
export function getInquiryStage(stageId) {
  const normalized = normalizeInquiryStage(stageId);
  return INQUIRY_STAGES.find((s) => s.id === normalized) || null;
}

