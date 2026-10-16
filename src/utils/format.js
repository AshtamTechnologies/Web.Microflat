/**
 * src/utils/format.js — Formatting utilities for MicroFlat ERP.
 */

/**
 * Formats a number or numeric string using the fixed 'en-IN' locale.
 * @param {number|string} value
 * @param {Intl.NumberFormatOptions & { maxFractionDigits?: number }} [options]
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return '0';

  const { maxFractionDigits, ...restOptions } = options;

  const intlOptions = {
    maximumFractionDigits: maxFractionDigits !== undefined ? maxFractionDigits : 2,
    ...restOptions,
  };

  return new Intl.NumberFormat('en-IN', intlOptions).format(num);
}
