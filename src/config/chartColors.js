/**
 * MicroFlat ERP – Chart Colors Configuration
 *
 * Reads color values dynamically from tokens.css custom properties at runtime
 * via getComputedStyle so Recharts gets resolved color strings while
 * respecting light/dark theme switches and eliminating hardcoded hex values.
 */

const tokenMap = {
  // Brand palette
  brand50:  '--brand-50',
  brand100: '--brand-100',
  brand200: '--brand-200',
  brand300: '--brand-300',
  brand400: '--brand-400',
  brand500: '--brand-500',
  brand600: '--brand-600',
  brand700: '--brand-700',
  brand800: '--brand-800',
  brand900: '--brand-900',

  // Neutral palette
  gray50:  '--gray-50',
  gray100: '--gray-100',
  gray200: '--gray-200',
  gray300: '--gray-300',
  gray400: '--gray-400',
  gray500: '--gray-500',
  gray600: '--gray-600',
  gray700: '--gray-700',
  gray800: '--gray-800',
  gray900: '--gray-900',
  gray950: '--gray-950',

  // Semantic status
  success:   '--success',
  warning:   '--warning',
  danger:    '--danger',
  accent500: '--accent-500',

  // Semantic surface shortcuts
  primary:   '--primary',
  border:    '--border',
  surface:   '--surface',
  text:      '--text',
  textMuted: '--text-muted',
  heading:   '--heading',
};

function readCssVariable(varName) {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (value) {
      if (value.startsWith('var(')) {
        const innerVar = value.slice(4, -1).trim();
        return readCssVariable(innerVar);
      }
      return value;
    }
  }
  return `var(${varName})`;
}

export const chartColors = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === 'string' && tokenMap[prop]) {
        return readCssVariable(tokenMap[prop]);
      }
      if (prop === 'toJSON') {
        return () => {
          const res = {};
          for (const key of Object.keys(tokenMap)) {
            res[key] = readCssVariable(tokenMap[key]);
          }
          return res;
        };
      }
      return undefined;
    },
    ownKeys() {
      return Object.keys(tokenMap);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && tokenMap[prop]) {
        return {
          enumerable: true,
          configurable: true,
          value: readCssVariable(tokenMap[prop]),
        };
      }
      return undefined;
    },
    has(_target, prop) {
      return prop in tokenMap;
    },
  }
);

export default chartColors;
