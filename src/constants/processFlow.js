/**
 * processFlow.js — Constants for Process Flow Admin module.
 *
 * Single Source of Truth for outcome types, badges, validation limits, and regexes.
 */

export const MODULE_CODE_REGEX = /^[A-Z0-9_]+$/;

export const FLOW_LIMITS = {
  MIN_COL_NO: 1,
  MAX_COL_NO: 1000,
  MIN_ROW_NO: 1,
  MAX_ROW_NO: 1000,
  MAX_MODULE_CODE_LENGTH: 50,
  MAX_FLOW_NAME_LENGTH: 150,
  MAX_STEP_TITLE_LENGTH: 100,
  MAX_STEP_DESCRIPTION_LENGTH: 250,
  MAX_TRANSITION_LABEL_LENGTH: 50,
  MAX_OUTCOME_TYPE_LENGTH: 20,
};

export const OUTCOME_TYPES = {
  NORMAL: 'Normal',
  SUCCESS: 'Success',
  REJECTED: 'Rejected',
  WARNING: 'Warning',
};

export const OUTCOME_TYPE_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Success', label: 'Success' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Warning', label: 'Warning' },
];

/**
 * Returns the badge variant and semantic colors for an outcome type.
 * Unknown outcome types fall back to neutral badge and default styling.
 *
 * @param {string} [outcomeType]
 * @returns {{ badgeVariant: string, nodeBgClass: string, nodeBorderClass: string, textClass: string, strokeClass: string }}
 */
export function getOutcomeStyle(outcomeType = 'Normal') {
  const norm = String(outcomeType || 'Normal').trim().toLowerCase();

  if (norm === 'rejected' || norm === 'danger') {
    return {
      badgeVariant: 'danger',
      nodeBgClass: 'bg-danger/10',
      nodeBorderClass: 'border-danger/40',
      textClass: 'text-danger',
      strokeClass: 'text-danger',
    };
  }

  if (norm === 'warning') {
    return {
      badgeVariant: 'warning',
      nodeBgClass: 'bg-warning/10',
      nodeBorderClass: 'border-warning/40',
      textClass: 'text-warning',
      strokeClass: 'text-warning',
    };
  }

  if (norm === 'success') {
    return {
      badgeVariant: 'success',
      nodeBgClass: 'bg-success/10',
      nodeBorderClass: 'border-success/40',
      textClass: 'text-success',
      strokeClass: 'text-success',
    };
  }

  if (norm === 'normal') {
    return {
      badgeVariant: 'neutral',
      nodeBgClass: 'bg-surface',
      nodeBorderClass: 'border-border',
      textClass: 'text-text',
      strokeClass: 'text-border',
    };
  }

  // Graceful fallback for any unknown value from API
  return {
    badgeVariant: 'neutral',
    nodeBgClass: 'bg-surface',
    nodeBorderClass: 'border-border',
    textClass: 'text-text-muted',
    strokeClass: 'text-border',
  };
}
