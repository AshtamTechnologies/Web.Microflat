export const DELEGATION_ENDPOINTS = {
  LOOKUPS: '/api/delegations/lookups',
  DELEGATOR_CANDIDATES: '/api/delegations/delegator-candidates',
  DELEGATE_CANDIDATES: '/api/delegations/delegate-candidates',
  LIST: '/api/delegations',
  DELEGATED_TO_ME: '/api/delegations/delegated-to-me',
  MY_CURRENT: '/api/delegations/mine/current',
  DETAIL: (id) => `/api/delegations/${id}`,
  CREATE: '/api/delegations',
  UPDATE: (id) => `/api/delegations/${id}`,
  UPDATE_STATUS: (id) => `/api/delegations/${id}/status`,
  DELETE: (id) => `/api/delegations/${id}`,
};

