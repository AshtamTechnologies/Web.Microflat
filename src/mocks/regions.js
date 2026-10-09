/**
 * regions.js — Seed mock data for sales and geographical business regions.
 */

export const INITIAL_REGIONS = [
  // ── Top Level Roots ──
  {
    regionId: 'reg_domestic',
    regionCode: 'DOM',
    regionName: 'Domestic Market',
    parentRegionId: null,
    isActive: true,
    createdOn: '2026-01-01',
  },
  {
    regionId: 'reg_export',
    regionCode: 'EXP',
    regionName: 'Export & International Market',
    parentRegionId: null,
    isActive: true,
    createdOn: '2026-01-01',
  },

  // ── Domestic Zones (Level 2) — Preserving mock inquiry IDs ──
  {
    regionId: 'reg_west',
    regionCode: 'REG-WEST',
    regionName: 'West Region (Gujarat, Maharashtra & Goa)',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    regionId: 'reg_north',
    regionCode: 'REG-NORTH',
    regionName: 'North Region (Delhi NCR, Haryana & Punjab)',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    regionId: 'reg_south',
    regionCode: 'REG-SOUTH',
    regionName: 'South Region (Karnataka, Tamil Nadu & Telangana)',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    regionId: 'reg_east',
    regionCode: 'REG-EAST',
    regionName: 'East Region (West Bengal, Odisha & Jharkhand)',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-01-05',
  },
  {
    regionId: 'reg_central',
    regionCode: 'REG-CENTRAL',
    regionName: 'Central Region (Madhya Pradesh & Chhattisgarh)',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-01-05',
  },

  // ── Domestic Sub-Zones (Level 2 under Domestic) ──
  {
    regionId: 'reg_west_guj',
    regionCode: 'REG-W-GUJ',
    regionName: 'Gujarat Industrial Belt',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-02-10',
  },
  {
    regionId: 'reg_west_mah',
    regionCode: 'REG-W-MAH',
    regionName: 'Maharashtra & Pune Cluster',
    parentRegionId: 'reg_domestic',
    isActive: true,
    createdOn: '2026-02-10',
  },
  {
    regionId: 'reg_west_goa',
    regionCode: 'REG-W-GOA',
    regionName: 'Goa Coastal Zone',
    parentRegionId: 'reg_domestic',
    isActive: false, // Inactive seed region
    createdOn: '2026-02-15',
  },

  // ── Export Territories (Level 2 under Export) ──
  {
    regionId: 'reg_exp_me',
    regionCode: 'EXP-ME',
    regionName: 'Middle East & GCC Countries',
    parentRegionId: 'reg_export',
    isActive: true,
    createdOn: '2026-01-15',
  },
  {
    regionId: 'reg_exp_eur',
    regionCode: 'EXP-EUR',
    regionName: 'Europe & United Kingdom',
    parentRegionId: 'reg_export',
    isActive: true,
    createdOn: '2026-01-15',
  },
  {
    regionId: 'reg_exp_sea',
    regionCode: 'EXP-SEA',
    regionName: 'Southeast Asia & APAC',
    parentRegionId: 'reg_export',
    isActive: true,
    createdOn: '2026-01-15',
  },
];
