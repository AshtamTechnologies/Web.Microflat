/**
 * services/index.js — Unified service provider.
 *
 * Switches between real API services and offline mock services based on:
 *   import.meta.env.VITE_USE_MOCK_API === 'true' (default: false).
 *
 * Each service exports capabilities indicating supported features.
 */

import * as realAuth from './auth/authService';
import * as mockAuth from './auth/authService.mock';

import * as realUsers from './users/usersService';
import * as mockUsers from './users/usersService.mock';

import * as realRoles from './roles/rolesService';
import * as mockRoles from './roles/rolesService.mock';

import * as realProcessFlow from './processFlow/processFlowService';
import * as mockProcessFlow from './processFlow/processFlowService.mock';

import * as realDocumentTypes from './documentTypes/documentTypesService';
import * as mockDocumentTypes from './documentTypes/documentTypesService.mock';

import * as realVendors from './vendors/vendorService';
import * as mockVendors from './vendors/vendorService.mock';

import * as realClients from './clients/clientService';
import * as mockClients from './clients/clientService.mock';

import * as realApprovals from './approvals/approvalsService';
import * as mockApprovals from './approvals/approvalsService.mock';

import * as realUoms from './uom/uomService';
import * as mockUoms from './uom/uomService.mock';

import * as realRegions from './regions/regionService';
import * as mockRegions from './regions/regionService.mock';

import * as realPaymentTerms from './paymentTerms/paymentTermService';
import * as mockPaymentTerms from './paymentTerms/paymentTermService.mock';

import * as delegationService from './delegation/delegationService';

import * as geographyService from './geography/geographyService';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const authService = useMock ? mockAuth : realAuth;
export const userService = useMock ? mockUsers : realUsers;
export const roleService = useMock ? mockRoles : realRoles;
export const processFlowService = useMock ? mockProcessFlow : realProcessFlow;
export const documentTypesService = useMock ? mockDocumentTypes : realDocumentTypes;
export const vendorService = useMock ? mockVendors : realVendors;
export const clientService = useMock ? mockClients : realClients;
export const approvalsService = useMock ? mockApprovals : realApprovals;
export const uomService = useMock ? mockUoms : realUoms;
export const regionService = useMock ? mockRegions : realRegions;
export const paymentTermService = useMock ? mockPaymentTerms : realPaymentTerms;
export { delegationService };
export { geographyService };
export const isMockApi = useMock;
