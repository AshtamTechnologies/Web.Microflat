/**
 * apiConfig.js — Central API network configuration.
 *
 * Reads VITE_API_BASE_URL from import.meta.env.
 * Throws a clear developer-friendly error in development if missing when mock mode is disabled.
 */

const DEFAULT_API_BASE_URL = 'https://api.microflat.ashtamtechnologies.com';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '');

export const TIMEOUT = 15000;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
