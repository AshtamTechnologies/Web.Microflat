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
    shortHint: '→ Quoting, Lost, Deal',
    transitionHint: 'Can move to Quoting or Lost (or drop on Deal to convert)',
  },
  {
    id: 'Deal',
    name: 'Deal',
    color: 'indigo',
    badgeVariant: 'role',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    accentBorder: 'border-t-indigo-500',
    shortHint: '→ Quoting, Lost',
    transitionHint: 'Can move to Quoting or Lost',
  },
  {
    id: 'Quoting',
    name: 'Quoting',
    color: 'amber',
    badgeVariant: 'warning',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    accentBorder: 'border-t-amber-500',
    shortHint: '→ New, Won, Lost',
    transitionHint: 'Can move to New, Won, or Lost',
  },
  {
    id: 'Won',
    name: 'Won',
    color: 'emerald',
    badgeVariant: 'success',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    accentBorder: 'border-t-emerald-500',
    shortHint: 'Final stage',
    transitionHint: 'Final stage (no transitions allowed)',
  },
  {
    id: 'Lost',
    name: 'Lost',
    color: 'rose',
    badgeVariant: 'danger',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    accentBorder: 'border-t-rose-500',
    shortHint: '→ New (Reopen)',
    transitionHint: 'Can only reopen to New',
  },
];

/**
 * Allowed status transitions per Inquiry.md Section 7 and business flow.
 * Note: 'Deal' is supported via the Deal conversion modal workflow.
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  New: ['Quoting', 'Lost', 'Deal'],
  Deal: ['Quoting', 'Lost'],
  Quoting: ['New', 'Won', 'Lost'],
  Won: [],
  Lost: ['New'],
};

export const TRANSITION_DESCRIPTIONS = {
  New: 'Can only move to Quoting or Lost (or drop on Deal to convert).',
  Deal: 'Can only move to Quoting or Lost.',
  Quoting: 'Can move to New, Won, or Lost.',
  Won: 'Final stage (no transitions allowed).',
  Lost: 'Can only reopen to New.',
};

/**
 * Checks whether moving an inquiry from fromStage to toStage is allowed.
 */
export function canTransitionStage(fromStage, toStage) {
  const from = normalizeInquiryStage(fromStage);
  const to = normalizeInquiryStage(toStage);
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Normalizes status IDs to one of the canonical stages.
 */
export function normalizeInquiryStage(statusId) {
  if (!statusId) return '';
  const str = String(statusId).trim();
  
  // Exact or case-insensitive match
  const directMatch = INQUIRY_STAGES.find(
    (s) => s.id.toLowerCase() === str.toLowerCase()
  );
  if (directMatch) return directMatch.id;

  // Legacy & alias mappings to canonical statuses
  const lower = str.toLowerCase();
  if (lower === 'inquiry' || lower === 'qualified') return 'New';
  if (lower === 'quotation' || lower === 'quoted' || lower === 'negotiation' || lower === 'in progress') return 'Quoting';
  if (lower === 'accepted' || lower === 'order confirm' || lower === 'po created' || lower === 'closed') return 'Won';
  if (lower === 'rejected') return 'Lost';

  return str;
}

/**
 * Maps a Kanban visual stage back to a valid API status for PATCH /api/inquiries/{id}/status.
 */
export function mapStageToApiStatus(stageId) {
  if (!stageId) return null;
  const normalized = normalizeInquiryStage(stageId);
  if (['New', 'Deal', 'Quoting', 'Won', 'Lost'].includes(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Get stage meta object by ID (with fallback to default)
 */
export function getInquiryStage(stageId) {
  const normalized = normalizeInquiryStage(stageId);
  return INQUIRY_STAGES.find((s) => s.id === normalized) || null;
}

