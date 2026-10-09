/**
 * uom.js — Mock dataset for Unit of Measurement (UOM) Setup.
 * Simplified schema: UOM Name, Description, and Status (Active/Inactive).
 */

export const INITIAL_UOM_LIST = [
  {
    uomId: 'uom_1',
    uomName: 'Nos (Numbers)',
    description: 'Count of discrete items or individual units',
    isActive: true,
    createdOn: '2024-01-15',
  },
  {
    uomId: 'uom_2',
    uomName: 'Pcs (Pieces)',
    description: 'Individual piece count for components',
    isActive: true,
    createdOn: '2024-01-15',
  },
  {
    uomId: 'uom_3',
    uomName: 'Kg (Kilograms)',
    description: 'Weight measurement for raw materials and plates',
    isActive: true,
    createdOn: '2024-01-16',
  },
  {
    uomId: 'uom_4',
    uomName: 'Meter (M)',
    description: 'Linear length measurement for cables and pipes',
    isActive: true,
    createdOn: '2024-01-16',
  },
  {
    uomId: 'uom_5',
    uomName: 'Litre (L)',
    description: 'Liquid volume measurement for oils and lubricants',
    isActive: true,
    createdOn: '2024-01-20',
  },
  {
    uomId: 'uom_6',
    uomName: 'Box',
    description: 'Standard boxed packaging unit',
    isActive: true,
    createdOn: '2024-01-22',
  },
  
];
