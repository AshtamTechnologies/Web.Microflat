/**
 * apiError.js — Normalizes backend error responses into a consistent ApiError.
 *
 * Handles:
 *   - ASP.NET Core ProblemDetails ({ title, status, detail, errors: { FieldName: [ ... ] } })
 *   - Validation dictionaries (keys converted to lowerCamelCase)
 *   - Axios network / timeout errors
 *   - Generic HTTP status codes
 */

export class ApiError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [status=0] - HTTP status code (0 for network/client error).
   * @param {Record<string, string>} [fieldErrors={}] - Map of lowerCamelCase field names to error messages.
   * @param {object} [raw=null] - Raw response payload for debugging (never contains secrets).
   */
  constructor(message, status = 0, fieldErrors = {}, raw = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.raw = raw;
  }
}

/**
 * Lowercases the first letter of a string (e.g. "FirstName" -> "firstName").
 * @param {string} str
 * @returns {string}
 */
function lowerFirstLetter(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Normalizes any error (Axios error, Error, or object) into an ApiError.
 * @param {unknown} err
 * @returns {ApiError}
 */
export function normalizeApiError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  // Handle Axios response error
  if (err && typeof err === 'object' && 'response' in err && err.response) {
    const status = err.response.status || 0;
    const data = err.response.data || {};
    const fieldErrors = {};

    // 1. Check for ASP.NET validation dictionary in data.errors ({ FirstName: ["Required", ...] })
    if (data.errors && typeof data.errors === 'object') {
      Object.entries(data.errors).forEach(([field, messages]) => {
        const camelKey = lowerFirstLetter(field);
        if (Array.isArray(messages) && messages.length > 0) {
          fieldErrors[camelKey] = messages[0];
        } else if (typeof messages === 'string') {
          fieldErrors[camelKey] = messages;
        }
      });
    }

    // 2. Determine best user-facing message
    let message = '';
    if (typeof data === 'string' && data.trim()) {
      message = data;
    } else if (data.detail && typeof data.detail === 'string') {
      message = data.detail;
    } else if (data.message && typeof data.message === 'string') {
      message = data.message;
    } else if (data.title && typeof data.title === 'string') {
      message = data.title;
    }

    if (!message) {
      if (status === 400) message = 'Invalid request. Please check the entered information.';
      else if (status === 401) message = 'Unauthorized. Please sign in again.';
      else if (status === 403) message = 'You do not have permission to perform this action.';
      else if (status === 404) message = 'The requested resource was not found.';
      else if (status === 409) message = 'A conflict occurred. The resource might already exist.';
      else if (status === 429) message = 'Too many requests. Please slow down and try again.';
      else if (status >= 500) message = 'Server error. Please try again later.';
      else message = 'An unexpected error occurred. Please try again.';
    }

    return new ApiError(message, status, fieldErrors);
  }

  // Handle Network / Timeout errors
  if (err && typeof err === 'object') {
    if (err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'))) {
      return new ApiError('Request timed out. Please check your network and try again.', 0);
    }
    if (err.message === 'Network Error' || !window.navigator.onLine) {
      return new ApiError('Unable to connect to the server. Please check your internet connection.', 0);
    }
  }

  const fallbackMsg = (err && typeof err === 'object' && err.message)
    ? err.message
    : 'An unexpected error occurred.';
  return new ApiError(fallbackMsg, 0);
}
