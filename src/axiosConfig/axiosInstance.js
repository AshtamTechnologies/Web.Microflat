/**
 * axiosInstance.js — The single, configured Axios instance used throughout the app.
 *
 * Configured with API_BASE_URL, TIMEOUT, and DEFAULT_HEADERS from apiConfig.
 * Attached with request and response interceptors from interceptors.js.
 */

import axios from 'axios';
import { API_BASE_URL, TIMEOUT, DEFAULT_HEADERS } from './apiConfig';
import { setupInterceptors } from './interceptors';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: DEFAULT_HEADERS,
});

setupInterceptors(axiosInstance);

export default axiosInstance;
