/**
 * flowRouteConfig.js — Route mapping for contextual process flow steppers.
 *
 * Maps View, Create, Edit, and Approval URL patterns to their moduleCode
 * and default active step. If a route has no active process flow, it can
 * cleanly collapse or provide preserved blank space.
 */

export const ROUTE_FLOW_CONFIG = [
  // ── 1. VENDORS & VENDOR BANK DETAILS ──────────────────────────────
  {
    pattern: /^\/vendors\/new$/,
    moduleCode: 'VENDOR',
    pageType: 'create',
    defaultStep: 'Registration',
  },
  {
    pattern: /^\/vendors\/[^/]+\/edit$/,
    moduleCode: 'VENDOR',
    pageType: 'edit',
    defaultStep: 'Documentation',
  },
  {
    pattern: /^\/vendors\/[^/]+(\/effective-dates)?$/,
    moduleCode: 'VENDOR',
    pageType: 'view',
    defaultStep: 'Approved Partner',
  },
  {
    pattern: /^\/approvals\/vendors$/,
    moduleCode: 'VENDOR',
    pageType: 'approval',
    defaultStep: 'Commercial Review',
  },
  {
    pattern: /^\/vendor-bank-details\/new$/,
    moduleCode: 'VENDOR',
    pageType: 'create',
    defaultStep: 'Documentation',
  },
  {
    pattern: /^\/vendor-bank-details\/[^/]+\/edit$/,
    moduleCode: 'VENDOR',
    pageType: 'edit',
    defaultStep: 'Documentation',
  },
  {
    pattern: /^\/vendor-bank-details\/[^/]+(\/view)?$/,
    moduleCode: 'VENDOR',
    pageType: 'view',
    defaultStep: 'Approved Partner',
  },

  // ── 2. SALES / INQUIRIES ──────────────────────────────────────────
  {
    pattern: /^\/inquiries\/new$/,
    moduleCode: 'SALES',
    pageType: 'create',
    defaultStep: 'Inquiry',
  },
  {
    pattern: /^\/inquiries\/[^/]+\/edit$/,
    moduleCode: 'SALES',
    pageType: 'edit',
    defaultStep: 'Quotation',
  },
  {
    pattern: /^\/inquiries\/[^/]+(\/view)?$/,
    moduleCode: 'SALES',
    pageType: 'view',
    defaultStep: 'Accepted',
  },

  // ── 3. PURCHASE / PURCHASE REQUISITIONS ───────────────────────────
  {
    pattern: /^\/purchase-requisition\/create$/,
    moduleCode: 'PURCHASE',
    pageType: 'create',
    defaultStep: 'Draft',
  },
  {
    pattern: /^\/purchase-requisition\/[^/]+\/edit$/,
    moduleCode: 'PURCHASE',
    pageType: 'edit',
    defaultStep: 'Review',
  },
  {
    pattern: /^\/purchase-requisition\/[^/]+$/,
    moduleCode: 'PURCHASE',
    pageType: 'view',
    defaultStep: 'Approved',
  },
  {
    pattern: /^\/approvals\/purchase-requisitions$/,
    moduleCode: 'PURCHASE',
    pageType: 'approval',
    defaultStep: 'Pending Approval',
  },

  // ── 4. CLIENTS & COMPANY REGISTRATION (Fallback / Blank space) ────
  {
    pattern: /^\/clients\/new$/,
    moduleCode: 'CLIENT',
    pageType: 'create',
    defaultStep: 'Draft',
    showBlank: true,
  },
  {
    pattern: /^\/clients\/[^/]+\/edit$/,
    moduleCode: 'CLIENT',
    pageType: 'edit',
    defaultStep: 'Review',
    showBlank: true,
  },
  {
    pattern: /^\/clients\/[^/]+(\/effective-dates)?$/,
    moduleCode: 'CLIENT',
    pageType: 'view',
    defaultStep: 'Active',
    showBlank: true,
  },
  {
    pattern: /^\/company-registration\/new$/,
    moduleCode: 'COMPANY',
    pageType: 'create',
    defaultStep: 'Registration',
    showBlank: true,
  },
  {
    pattern: /^\/company-registration\/[^/]+\/edit$/,
    moduleCode: 'COMPANY',
    pageType: 'edit',
    defaultStep: 'Review',
    showBlank: true,
  },
  {
    pattern: /^\/company-registration\/[^/]+$/,
    moduleCode: 'COMPANY',
    pageType: 'view',
    defaultStep: 'Registered',
    showBlank: true,
  },
  {
    pattern: /^\/company-bank-details\/new$/,
    moduleCode: 'COMPANY',
    pageType: 'create',
    defaultStep: 'Registration',
    showBlank: true,
  },
  {
    pattern: /^\/company-bank-details\/[^/]+\/edit$/,
    moduleCode: 'COMPANY',
    pageType: 'edit',
    defaultStep: 'Review',
    showBlank: true,
  },
  {
    pattern: /^\/company-bank-details\/[^/]+(\/view)?$/,
    moduleCode: 'COMPANY',
    pageType: 'view',
    defaultStep: 'Registered',
    showBlank: true,
  },
];

/**
 * Resolves the process flow route configuration based on the URL pathname.
 * @param {string} pathname
 * @returns {{ moduleCode: string, pageType: string, defaultStep: string, showBlank?: boolean } | null}
 */
export function getFlowConfigForPath(pathname = '') {
  if (!pathname) return null;
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  for (const item of ROUTE_FLOW_CONFIG) {
    if (item.pattern.test(cleanPath)) {
      return item;
    }
  }
  return null;
}
