/**
 * src/utils/flatnessFormula.js
 * Precision Metrology Flatness Tolerance Formula Calculation Engine.
 *
 * Implements international flatness tolerance formulas verified against:
 *   - IS 7327:2003 (Indian Standard for Granite Surface Plates)
 *   - BS 817:2008  (British Standard for Surface Plates)
 *   - DIN 876:1984 (German Standard for Surface Plates)
 *   - GGG-P-463C / ASME B89.3.7 (US Federal Specification)
 *
 * Source reference: "Flatness for various sizes.xlsx"
 */

/**
 * Normalizes standard code string to standard identifier.
 * e.g., "IS-7327-2003", "IS 7327", "IS7327" -> "IS-7327"
 * @param {string} rawStandard
 * @returns {'IS-7327' | 'IS-5268' | 'IS-2063' | 'IS-2285' | 'BS-817' | 'DIN-874' | 'DIN-876' | 'GGG-P-463C' | null}
 */
export function normalizeStandardCode(rawStandard) {
  if (!rawStandard) return null;
  const str = String(rawStandard).toUpperCase().replace(/[\s_]+/g, '-');

  if (str.includes('7327')) return 'IS-7327';
  if (str.includes('5268')) return 'IS-5268';
  if (str.includes('2063')) return 'IS-2063';
  if (str.includes('2285')) return 'IS-2285';
  if (str.includes('874')) return 'DIN-874';
  if (str.includes('876')) return 'DIN-876';
  if (str.includes('817')) return 'BS-817';
  if (str.includes('463') || str.includes('GGG') || str.includes('ASME')) return 'GGG-P-463C';

  return null;
}

/**
 * Normalizes grade code string to standardized grade key.
 * e.g., "Gr-0", "Gr 0", "Grade 0", "0" -> "0"
 * @param {string} rawGrade
 * @returns {'00' | '0' | '1' | '2' | '3' | 'AA' | 'A' | 'B' | 'C' | null}
 */
export function normalizeGradeCode(rawGrade) {
  if (!rawGrade && rawGrade !== 0) return null;
  const str = String(rawGrade).toUpperCase().trim();

  // Strip prefixes like "GR-", "GR ", "GRADE-", "GRADE "
  const cleaned = str.replace(/^(GRADE|GR)[-\s]*/, '').trim();

  switch (cleaned) {
    case '00':
    case '0':
    case '1':
    case '2':
    case '3':
    case 'AA':
    case 'A':
    case 'B':
    case 'C':
      return cleaned;
    default:
      return null;
  }
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} val
 * @param {number} decimals
 * @returns {number}
 */
function roundToDecimals(val, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates nominal diagonal rounded UP to the nearest 100 mm (CEILING(d, 100))
 * as mandated by IS 7327:2003 and BS 817:2008.
 * @param {number} lengthMm
 * @param {number} widthMm
 * @returns {{ actualDiagonal: number, nominalDiagonal: number }}
 */
export function calculateNominalDiagonal(lengthMm, widthMm) {
  const L = Math.max(0, Number(lengthMm) || 0);
  const W = Math.max(0, Number(widthMm) || 0);
  const actualDiagonal = Math.sqrt(L * L + W * W);
  // CEILING to nearest 100 mm
  const nominalDiagonal = Math.ceil(actualDiagonal / 100) * 100;
  return { actualDiagonal, nominalDiagonal };
}

/**
 * Calculates Flatness Tolerance for a granite surface plate.
 *
 * @param {object} params
 * @param {string|number} params.standardCode - e.g. "IS-7327-2003", "DIN-876", "BS-817"
 * @param {string|number} params.gradeCode    - e.g. "Gr-0", "Gr-1", "0", "AA"
 * @param {number|string} params.lengthMm     - Length in mm (L)
 * @param {number|string} params.widthMm      - Width in mm (W)
 * @returns {{
 *   isSupported: boolean,
 *   valueMicrons: number | null,
 *   unit: 'µm',
 *   formulaText: string,
 *   detailText: string,
 *   standardNormalized: string | null,
 *   gradeNormalized: string | null,
 *   error?: string
 * }}
 */
export function calculateFlatnessTolerance(arg1, arg2, arg3, arg4) {
  let standardCode;
  let gradeCode;
  let lengthMm;
  let widthMm;

  if (typeof arg1 === 'object' && arg1 !== null) {
    standardCode = arg1.standardCode || arg1.standard;
    gradeCode = arg1.gradeCode || arg1.grade;
    lengthMm = arg1.lengthMm !== undefined ? arg1.lengthMm : arg1.length;
    widthMm = arg1.widthMm !== undefined ? arg1.widthMm : arg1.width;
  } else {
    // Positional signature: (lengthMm, widthMm, standardCode, gradeCode)
    lengthMm = arg1;
    widthMm = arg2;
    standardCode = arg3;
    gradeCode = arg4;
  }

  const standardKey = normalizeStandardCode(standardCode);
  const gradeKey = normalizeGradeCode(gradeCode);

  const L = Number(lengthMm);
  const W = Number(widthMm) || 0;

  if (!L || L <= 0) {
    return {
      isSupported: false,
      valueMicrons: null,
      unit: 'µm',
      formulaText: '',
      detailText: 'Valid Length dimension (mm) is required for flatness calculation.',
      standardNormalized: standardKey,
      gradeNormalized: gradeKey,
      error: 'Invalid dimensions',
    };
  }

  if (!standardKey) {
    return {
      isSupported: false,
      valueMicrons: null,
      unit: 'µm',
      formulaText: '',
      detailText: `Standard "${standardCode || ''}" is not recognized or does not have an automated formula.`,
      standardNormalized: null,
      gradeNormalized: gradeKey,
      error: 'Unsupported standard',
    };
  }

  if (!gradeKey) {
    return {
      isSupported: false,
      valueMicrons: null,
      unit: 'µm',
      formulaText: '',
      detailText: `Grade "${gradeCode || ''}" is not recognized.`,
      standardNormalized: standardKey,
      gradeNormalized: null,
      error: 'Unsupported grade',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 0. Straight Edges: IS 5268:1991 / IS 2063:2002 / DIN 874
  // Working face straightness & flatness based strictly on length L (mm)
  // ─────────────────────────────────────────────────────────────────────────────
  if (standardKey === 'IS-5268' || standardKey === 'IS-2063' || standardKey === 'DIN-874') {
    switch (gradeKey) {
      case '00': {
        const val = 1 + L / 500;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `1 + L / 500 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (${standardKey}, Grade Gr-00)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '0': {
        const val = 2 + L / 250;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `2 + L / 250 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (${standardKey}, Grade Gr-0)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '1': {
        const val = 5 + L / 100;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `5 + L / 100 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (${standardKey}, Grade Gr-1)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '2': {
        const val = 10 + L / 50;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `10 + L / 50 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (${standardKey}, Grade Gr-2)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cast Iron Surface Plates: IS 2285:2003
  // ─────────────────────────────────────────────────────────────────────────────
  const longerSide = Math.max(L, W);
  if (standardKey === 'IS-2285') {
    switch (gradeKey) {
      case '0': {
        const val = 4 + longerSide / 250;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `4 + L / 250 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 2285, Grade Gr-0)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '1': {
        const val = 10 + longerSide / 100;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `10 + L / 100 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 2285, Grade Gr-1)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '2': {
        const val = 20 + longerSide / 50;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `20 + L / 50 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 2285, Grade Gr-2)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '3': {
        const val = 40 + longerSide / 25;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `40 + L / 25 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 2285, Grade Gr-3)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  // Effective width for diagonal calculations (defaults to L if 1D item)
  const effW = W > 0 ? W : L;
  const { nominalDiagonal } = calculateNominalDiagonal(L, effW);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. IS 7327:2003 (Indian Standard)
  // Diagonal Ld = CEILING(sqrt(L^2 + W^2), 100) mm
  // ─────────────────────────────────────────────────────────────────────────────
  if (standardKey === 'IS-7327') {
    switch (gradeKey) {
      case '00': {
        const val = 0.0015 * nominalDiagonal + 1.25;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.0015 × Ld + 1.25 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 7327, Grade Gr-00)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '0': {
        const val = 0.003 * nominalDiagonal + 2.5;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.003 × Ld + 2.5 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 7327, Grade Gr-0)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '1': {
        const val = 0.006 * nominalDiagonal + 5.0;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.006 × Ld + 5.0 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 7327, Grade Gr-1)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '2': {
        const val = 0.012 * nominalDiagonal + 10.0;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.012 × Ld + 10.0 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 7327, Grade Gr-2)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '3': {
        const val = 0.024 * nominalDiagonal + 20.0;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.024 × Ld + 20.0 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (IS 7327, Grade Gr-3)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BS 817:2008 (British Standard)
  // Diagonal Ld = CEILING(sqrt(L^2 + W^2), 100) mm
  // ─────────────────────────────────────────────────────────────────────────────
  if (standardKey === 'BS-817') {
    switch (gradeKey) {
      case '0': {
        const val = 0.0025 * nominalDiagonal + 2.5;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `0.0025 × Ld + 2.5 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (BS 817, Grade Gr-0)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '1': {
        const base = 0.0025 * nominalDiagonal + 2.5;
        const val = 2 * base;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `2 × (0.0025 × Ld + 2.5) µm`,
          detailText: `Calculated Flatness: ${rounded} µm (BS 817, Grade Gr-1)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '2': {
        const base = 0.0025 * nominalDiagonal + 2.5;
        const val = 4 * base;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `4 × (0.0025 × Ld + 2.5) µm`,
          detailText: `Calculated Flatness: ${rounded} µm (BS 817, Grade Gr-2)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DIN 876:1984 (German Standard)
  // Based on L (length / longer side in mm)
  // ─────────────────────────────────────────────────────────────────────────────
  if (standardKey === 'DIN-876') {
    switch (gradeKey) {
      case '00': {
        const val = 2 + longerSide / 500;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `2 + L / 500 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (DIN 876, Grade Gr-00)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '0': {
        const val = 4 + longerSide / 250;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `4 + L / 250 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (DIN 876, Grade Gr-0)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '1': {
        const val = 10 + longerSide / 100;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `10 + L / 100 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (DIN 876, Grade Gr-1)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '2': {
        const val = 20 + longerSide / 50;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `20 + L / 50 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (DIN 876, Grade Gr-2)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case '3': {
        const val = 40 + longerSide / 25;
        const rounded = roundToDecimals(val, 1);
        return {
          isSupported: true,
          valueMicrons: rounded,
          unit: 'µm',
          formulaText: `40 + L / 25 µm`,
          detailText: `Calculated Flatness: ${rounded} µm (DIN 876, Grade Gr-3)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. GGG-P-463C / ASME B89.3.7 (US Federal Standard)
  // Diagonal in inches Din = round(sqrt(L^2 + W^2) / 25.4)
  // Grade AA: 40 + Din^2 / 25 (µin) -> converted to µm via 0.0254
  // ─────────────────────────────────────────────────────────────────────────────
  if (standardKey === 'GGG-P-463C') {
    const rawDiagIn = Math.sqrt(L * L + W * W) / 25.4;
    const diagIn = Math.round(rawDiagIn);
    const aaMicroInches = 40 + Math.pow(diagIn, 2) / 25;

    switch (gradeKey) {
      case 'AA': {
        const uin = roundToDecimals(aaMicroInches, 1);
        const um = Math.round(aaMicroInches * 0.0254);
        return {
          isSupported: true,
          valueMicrons: um,
          unit: 'µm',
          formulaText: `40 + D² / 25 µin (converted to µm)`,
          detailText: `Calculated Flatness: ${um} µm (GGG-P-463C, Grade Gr-AA)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case 'A': {
        const uin = roundToDecimals(2 * aaMicroInches, 1);
        const um = Math.round(2 * aaMicroInches * 0.0254);
        return {
          isSupported: true,
          valueMicrons: um,
          unit: 'µm',
          formulaText: `2 × (40 + D² / 25) µin (converted to µm)`,
          detailText: `Calculated Flatness: ${um} µm (GGG-P-463C, Grade Gr-A)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      case 'B': {
        const uin = roundToDecimals(4 * aaMicroInches, 1);
        const um = Math.round(4 * aaMicroInches * 0.0254);
        return {
          isSupported: true,
          valueMicrons: um,
          unit: 'µm',
          formulaText: `4 × (40 + D² / 25) µin (converted to µm)`,
          detailText: `Calculated Flatness: ${um} µm (GGG-P-463C, Grade Gr-B)`,
          standardNormalized: standardKey,
          gradeNormalized: gradeKey,
        };
      }
      default:
        break;
    }
  }

  return {
    isSupported: false,
    valueMicrons: null,
    unit: 'µm',
    formulaText: '',
    detailText: `Grade "${gradeCode}" under standard "${standardCode}" does not have a defined formula rule.`,
    standardNormalized: standardKey,
    gradeNormalized: gradeKey,
    error: 'Unmapped grade for standard',
  };
}
