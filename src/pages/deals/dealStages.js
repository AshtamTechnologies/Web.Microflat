/**
 * src/pages/deals/dealStages.js — Centralized configuration for Deal Kanban stages.
 * Modeled after inquiryStages.js for 100% design consistency.
 */

export const DEAL_STAGES = [
  {
    id: 'Open',
    name: 'Open',
    statusId: 1,
    color: 'blue',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 font-mono',
    accentBorder: 'border-t-blue-500',
  },
  {
    id: 'On Hold',
    name: 'On Hold',
    statusId: 2,
    color: 'amber',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 font-mono',
    accentBorder: 'border-t-amber-500',
  },
  {
    id: 'Won',
    name: 'Won',
    statusId: 3,
    color: 'emerald',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono',
    accentBorder: 'border-t-emerald-500',
  },
  {
    id: 'Lost',
    name: 'Lost',
    statusId: 4,
    color: 'rose',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300 font-mono',
    accentBorder: 'border-t-rose-500',
  },
];
