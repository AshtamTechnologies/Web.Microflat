/**
 * productCategories.js — Master Product Categories configuration mock for MicroFlat ERP.
 *
 * Schema:
 *   - categoryId: string (Primary Key)
 *   - categoryCode: string (Unique code, e.g. 'CAT-SURF')
 *   - categoryName: string (Category title)
 *   - parentCategoryId: string | null (Null for root categories)
 *   - isActive: boolean (Active/Inactive status)
 *   - createdOn: string (YYYY-MM-DD timestamp)
 */

export const INITIAL_PRODUCT_CATEGORIES = [
  /* ── 1. Root: Surface Plates & Metrology Bases ── */
  {
    categoryId: 'cat_surface',
    categoryCode: 'CAT-SURF',
    categoryName: 'Cast Iron & Granite Surface Plates',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-10',
  },
  {
    categoryId: 'cat_granite_surf',
    categoryCode: 'CAT-GRAN',
    categoryName: 'Granite Surface Plates & Comparator Stands',
    parentCategoryId: 'cat_surface',
    isActive: true,
    createdOn: '2025-01-15',
  },
  {
    categoryId: 'cat_granite_custom',
    categoryCode: 'CAT-GRAN-CUST',
    categoryName: 'Custom High-Precision Granite Metrology Tables',
    parentCategoryId: 'cat_surface', // 2nd Level Child under Surface Plates
    isActive: true,
    createdOn: '2025-02-01',
  },
  {
    categoryId: 'cat_castiron_surf',
    categoryCode: 'CAT-CI-BED',
    categoryName: 'Cast Iron Surface & Floor T-Slotted Bed Plates',
    parentCategoryId: 'cat_surface',
    isActive: true,
    createdOn: '2025-01-15',
  },

  /* ── 2. Root: Precision Measuring Gauges & Instruments ── */
  {
    categoryId: 'cat_gauges',
    categoryCode: 'CAT-GAUGE',
    categoryName: 'Precision Measuring Gauges & Angle Plates',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-10',
  },
  {
    categoryId: 'cat_angle_plates',
    categoryCode: 'CAT-ANGLE',
    categoryName: 'Precision Angle Plates & Box Tables',
    parentCategoryId: 'cat_gauges',
    isActive: true,
    createdOn: '2025-01-20',
  },
  {
    categoryId: 'cat_straight_edges',
    categoryCode: 'CAT-STR-EDGE',
    categoryName: 'Granite & Cast Iron Straight Edges',
    parentCategoryId: 'cat_gauges',
    isActive: true,
    createdOn: '2025-01-20',
  },
  {
    categoryId: 'cat_dial_indicators',
    categoryCode: 'CAT-DIAL',
    categoryName: 'Dial Gauges & Height Master Instruments',
    parentCategoryId: 'cat_gauges',
    isActive: false, // Inactive category for testing
    createdOn: '2025-03-01',
  },

  /* ── 3. Root: CNC Precision Machined Components ── */
  {
    categoryId: 'cat_cnc',
    categoryCode: 'CAT-CNC',
    categoryName: 'CNC Precision Machined Components',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-12',
  },
  {
    categoryId: 'cat_cnc_spindles',
    categoryCode: 'CAT-SPINDLE',
    categoryName: 'Heavy Machining Spindles & Housings',
    parentCategoryId: 'cat_cnc',
    isActive: true,
    createdOn: '2025-01-22',
  },
  {
    categoryId: 'cat_cnc_chambers',
    categoryCode: 'CAT-CHAMBER',
    categoryName: 'Vacuum & High-Pressure Test Chambers',
    parentCategoryId: 'cat_cnc',
    isActive: true,
    createdOn: '2025-01-22',
  },

  /* ── 4. Root: Custom Modular Fixtures & Tooling ── */
  {
    categoryId: 'cat_fixtures',
    categoryCode: 'CAT-FIXT',
    categoryName: 'Custom Modular Fixtures & Tooling',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-15',
  },

  /* ── 5. Root: Calibration & NABL Testing Services ── */
  {
    categoryId: 'cat_calibration',
    categoryCode: 'CAT-CALIB',
    categoryName: 'Calibration & NABL Testing Services',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-18',
  },

  /* ── 6. Root: Machine Tool Spares & Accessories ── */
  {
    categoryId: 'cat_spares',
    categoryCode: 'CAT-SPARE',
    categoryName: 'Machine Tool Spares & Accessories',
    parentCategoryId: null,
    isActive: true,
    createdOn: '2025-01-20',
  },
];

export default INITIAL_PRODUCT_CATEGORIES;
