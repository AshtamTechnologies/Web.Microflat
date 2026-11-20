/**
 * src/utils/htmlUtils.js — Utilities for safe HTML entity decoding, tag detection, and text sanitization.
 */

/**
 * Recursively decodes HTML entities (e.g., &lt;, &gt;, &quot;, &#39;, &amp;)
 * and unwraps double-quotes or escaped JSON strings.
 * @param {any} str
 * @returns {string}
 */
export function decodeHtmlString(str) {
  if (str === null || str === undefined) return '';
  let res = typeof str === 'string' ? str.trim() : String(str).trim();
  if (!res) return '';

  // Unwrap outer quotes if JSON serialized (e.g. "\"<p>Text</p>\"")
  if (res.startsWith('"') && res.endsWith('"') && res.length >= 2) {
    try {
      res = JSON.parse(res);
    } catch {
      // ignore
    }
  }

  // Iteratively decode HTML entities if '&' is present
  if (typeof res === 'string' && res.includes('&')) {
    try {
      if (typeof document !== 'undefined') {
        const txt = document.createElement('textarea');
        let prev = '';
        let passes = 0;
        // Decode up to 3 passes to handle multi-encoded strings (e.g. &amp;lt;p&amp;gt;)
        while (prev !== res && res.includes('&') && passes < 3) {
          prev = res;
          txt.innerHTML = res;
          res = txt.value;
          passes++;
        }
      }
    } catch {
      // Fallback for non-DOM environments
      let prev = '';
      let passes = 0;
      while (prev !== res && res.includes('&') && passes < 3) {
        prev = res;
        res = res
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/&#x27;/gi, "'")
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&');
        passes++;
      }
    }
  }

  return typeof res === 'string' ? res.trim() : '';
}

/**
 * Checks whether a string or value contains HTML markup, tags, or entity-encoded tags.
 * @param {any} val
 * @returns {boolean}
 */
export function isHtmlMarkup(val) {
  if (!val) return false;
  const str = typeof val === 'string' ? val : String(val);

  // Quick check for direct html tags
  if (/<[a-z][\s\S]*>/i.test(str)) return true;

  // Quick check for entity-encoded tags (e.g. &lt;p&gt; or &lt;ul&gt;)
  if (/&lt;[a-z/!]/i.test(str)) return true;

  // Fully decoded check
  const decoded = decodeHtmlString(str);
  return /<[a-z][\s\S]*>/i.test(decoded);
}

/**
 * Checks whether an HTML string is visually empty (e.g. contains only whitespace, <p></p>, <br>, etc.)
 * @param {string} str
 * @returns {boolean}
 */
export function isVisuallyEmptyHtml(str) {
  if (!str) return true;
  const decoded = typeof str === 'string' ? decodeHtmlString(str) : String(str);
  const textOnly = decoded
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim();
  return textOnly.length === 0;
}

/**
 * Strips HTML tags and returns clean plain text.
 * @param {string} str
 * @returns {string}
 */
export function stripHtmlToPlainText(str) {
  if (!str) return '';
  const decoded = decodeHtmlString(str);
  return decoded
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
