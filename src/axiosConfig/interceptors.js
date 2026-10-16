/**
 * interceptors.js — Request and response interceptors for Axios.
 *
 * Rules:
 *   - Request: Attaches `${tokenType} ${accessToken}` only for API requests (when access token is present).
 *   - Response:
 *       * 401: Runs refresh flow ONCE and retries the original request.
 *       * 403: Displays a "no permission" toast message and does NOT log out.
 *       * Network / timeout: Displays friendly error message.
 *       * Normalizes errors using normalizeApiError.
 */

import toast from 'react-hot-toast';
import { getAccessToken, getTokenType } from './tokenStorage';
import { refreshAuthSession } from './sessionManager';
import { normalizeApiError } from '../utils/apiError';

/**
 * Attaches request and response interceptors to an axios instance.
 * @param {import('axios').AxiosInstance} instance
 */
export function setupInterceptors(instance) {
  // ── 1. Request Interceptor ────────────────────────────────────────────────
  instance.interceptors.request.use(
    (config) => {
      const accessToken = getAccessToken();
      const tokenType = getTokenType() || 'Bearer';

      // Attach Authorization header if access token is available in memory
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `${tokenType} ${accessToken}`;
      }

      return config;
    },
    (error) => Promise.reject(normalizeApiError(error))
  );

  // ── 2. Response Interceptor ───────────────────────────────────────────────
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized with single-retry refresh
      if (
        error.response &&
        error.response.status === 401 &&
        originalRequest &&
        !originalRequest._retry
      ) {
        // Do not attempt refresh if the request itself was login or refresh-token
        const url = originalRequest.url || '';
        if (url.includes('/api/auth/login') || url.includes('/api/auth/refresh-token')) {
          return Promise.reject(normalizeApiError(error));
        }

        originalRequest._retry = true;

        try {
          const { accessToken } = await refreshAuthSession();
          const tokenType = getTokenType() || 'Bearer';

          // Update Authorization header on original request and retry
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `${tokenType} ${accessToken}`;

          return instance(originalRequest);
        } catch (refreshErr) {
          return Promise.reject(normalizeApiError(refreshErr));
        }
      }

      // Handle 403 Forbidden without logging out
      if (error.response && error.response.status === 403) {
        toast.error('You do not have permission to perform this action.');
      }

      // Normalize all other errors
      const normalizedError = normalizeApiError(error);
      return Promise.reject(normalizedError);
    }
  );
}
