/**
 * inquiryCatalog.js — Mock product catalog for Inquiries module.
 * Provides categories, products, size variants, and auto-filled technical specifications.
 */

export const INQUIRY_CATALOG_CATEGORIES = [
  { value: 'cat-sp', label: 'Surface Plates' },
  { value: 'cat-se', label: 'Straight Edges' },
  { value: 'cat-ap', label: 'Angle Plates & Box Squares' },
  { value: 'cat-mi', label: 'Measuring & Inspection' },
];

export const INQUIRY_CATALOG_PRODUCTS = [
  {
    id: 'prod-gsp',
    categoryId: 'cat-sp',
    productName: 'Granite Surface Plate',
    itemCodePrefix: 'SP-GR',
    defaultUom: 'Nos',
    standardInfo: 'Indian Black Granite · Hand Lapped · IS-7327-2003',
    description:
      'Precision Granite Surface Plate manufactured from high-density Indian Black Granite, stress-relieved naturally over geological age and precision hand-lapped to meet IS-7327-2003 flatness accuracy. Non-magnetic, rust-proof, and thermally stable for metrology & inspection rooms.',
    variants: [
      {
        id: 'var-gsp-1',
        variantName: '250 × 250 mm · Gr-0',
        size: '250 × 250 mm',
        grade: 'Gr-0',
        flatness: '3.5 µm',
        itemCode: 'SP-GR-250x250-GR0',
        technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 3.5 µm',
      },
      {
        id: 'var-gsp-2',
        variantName: '400 × 400 mm · Gr-0',
        size: '400 × 400 mm',
        grade: 'Gr-0',
        flatness: '4.0 µm',
        itemCode: 'SP-GR-400x400-GR0',
        technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 4.0 µm',
      },
      {
        id: 'var-gsp-3',
        variantName: '630 × 400 mm · Gr-0',
        size: '630 × 400 mm',
        grade: 'Gr-0',
        flatness: '4.5 µm',
        itemCode: 'SP-GR-630x400-GR0',
        technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 4.5 µm',
      },
      {
        id: 'var-gsp-4',
        variantName: '1000 × 630 mm · Gr-0',
        size: '1000 × 630 mm',
        grade: 'Gr-0',
        flatness: '5.0 µm',
        itemCode: 'SP-GR-1000x630-GR0',
        technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 5.0 µm',
      },
      {
        id: 'var-gsp-5',
        variantName: '1600 × 1000 mm · Gr-1',
        size: '1600 × 1000 mm',
        grade: 'Gr-1',
        flatness: '12.0 µm',
        itemCode: 'SP-GR-1600x1000-GR1',
        technicalDetails: 'Indian Black Granite · Hand Lapped · IS-7327-2003 · Flatness 12.0 µm',
      },
    ],
  },
  {
    id: 'prod-cisp',
    categoryId: 'cat-sp',
    productName: 'Cast Iron Surface Plate',
    itemCodePrefix: 'SP-CI',
    defaultUom: 'Nos',
    standardInfo: 'Close-grained Plain Cast Iron · Hand Scraped · IS-2285',
    description:
      'Close-grained FG-220 Cast Iron Surface Plate, heavily ribbed for maximum rigidity and stress-relieved to prevent distortion. Precision hand-scraped top working surface conforming to IS-2285 for layout, marking, and blue-matching inspection.',
    variants: [
      {
        id: 'var-cisp-1',
        variantName: '300 × 300 mm · Gr-1',
        size: '300 × 300 mm',
        grade: 'Gr-1',
        flatness: '6.0 µm',
        itemCode: 'SP-CI-300x300-GR1',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285 · Grade 1',
      },
      {
        id: 'var-cisp-2',
        variantName: '600 × 600 mm · Gr-1',
        size: '600 × 600 mm',
        grade: 'Gr-1',
        flatness: '8.0 µm',
        itemCode: 'SP-CI-600x600-GR1',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285 · Grade 1',
      },
      {
        id: 'var-cisp-3',
        variantName: '1000 × 1000 mm · Gr-1',
        size: '1000 × 1000 mm',
        grade: 'Gr-1',
        flatness: '12.0 µm',
        itemCode: 'SP-CI-1000x1000-GR1',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · IS-2285 · Grade 1',
      },
    ],
  },
  {
    id: 'prod-gse',
    categoryId: 'cat-se',
    productName: 'Granite Straight Edge',
    itemCodePrefix: 'SE-GR',
    defaultUom: 'Nos',
    standardInfo: 'Indian Black Granite · Lapped Faces · IS-5268',
    description:
      'Precision Granite Triangular / I-Beam Straight Edge crafted from Indian Black Granite with two precision hand-lapped working faces conforming to IS-5268. Ideal for checking straightness and flatness of machine tool slideways and surface tables.',
    variants: [
      {
        id: 'var-gse-1',
        variantName: '500 × 50 × 100 mm · Gr-0',
        size: '500 × 50 × 100 mm',
        grade: 'Gr-0',
        flatness: '2.5 µm',
        itemCode: 'SE-GR-500-GR0',
        technicalDetails: 'Granite Triangular Straight Edge · Lapped · IS-5268 · Straightness 2.5 µm',
      },
      {
        id: 'var-gse-2',
        variantName: '1000 × 60 × 140 mm · Gr-0',
        size: '1000 × 60 × 140 mm',
        grade: 'Gr-0',
        flatness: '3.5 µm',
        itemCode: 'SE-GR-1000-GR0',
        technicalDetails: 'Granite Triangular Straight Edge · Lapped · IS-5268 · Straightness 3.5 µm',
      },
    ],
  },
  {
    id: 'prod-gap',
    categoryId: 'cat-ap',
    productName: 'Granite Master Square & Angle Plate',
    itemCodePrefix: 'AP-GR',
    defaultUom: 'Nos',
    standardInfo: 'Indian Black Granite · 6 Faces Finished · IS-6985',
    description:
      'Six-face finished Granite Master Square & Angle Plate made from select Indian Black Granite, hand-lapped for high squareness and parallelism accuracy per IS-6985. Used for checking perpendicularity on CMMs and coordinate axes.',
    variants: [
      {
        id: 'var-gap-1',
        variantName: '200 × 200 × 50 mm · Gr-0',
        size: '200 × 200 × 50 mm',
        grade: 'Gr-0',
        flatness: '2.0 µm',
        itemCode: 'AP-GR-200x200-GR0',
        technicalDetails: 'Indian Black Granite · Squareness 2.0 µm · 6 Faces Finished · IS-6985',
      },
      {
        id: 'var-gap-2',
        variantName: '400 × 400 × 75 mm · Gr-0',
        size: '400 × 400 × 75 mm',
        grade: 'Gr-0',
        flatness: '3.0 µm',
        itemCode: 'AP-GR-400x400-GR0',
        technicalDetails: 'Indian Black Granite · Squareness 3.0 µm · 6 Faces Finished · IS-6985',
      },
    ],
  },
  {
    id: 'prod-mi-comparator',
    categoryId: 'cat-mi',
    productName: 'Granite Comparator Stand',
    itemCodePrefix: 'CS-GR',
    defaultUom: 'Nos',
    standardInfo: 'Black Granite Base with Hard Chrome Column',
    description:
      'Precision Granite Comparator Stand featuring a hand-lapped Indian Black Granite base and rigid hard-chrome plated steel column with fine micro-adjustment bracket for dial/electronic gauge comparative measurements.',
    variants: [
      {
        id: 'var-cs-1',
        variantName: 'Base 150 × 150 mm · Column 30 mm',
        size: '150 × 150 mm',
        grade: 'Gr-0',
        flatness: '1.5 µm',
        itemCode: 'CS-GR-150-STD',
        technicalDetails: 'Granite Base 150 × 150 mm · Column Ø30 × 250 mm · Fine Adjustment',
      },
      {
        id: 'var-cs-2',
        variantName: 'Base 250 × 200 mm · Column 35 mm',
        size: '250 × 200 mm',
        grade: 'Gr-0',
        flatness: '2.0 µm',
        itemCode: 'CS-GR-250-HVY',
        technicalDetails: 'Granite Base 250 × 200 mm · Column Ø35 × 300 mm · Heavy Duty',
      },
    ],
  },
];

export const CUSTOM_SIZE_VARIANT_VALUE = '__custom_size__';

/**
 * Resolves a clean default product description for a selected catalog product (and optional variant).
 */
export function buildCatalogProductDescription(product, variant = null) {
  if (!product) return '';
  const baseDesc = product.description || product.standardInfo || product.productName || '';
  if (!variant) return baseDesc;
  const variantSpecs = [
    variant.size ? `Size: ${variant.size}` : null,
    variant.grade ? `Grade: ${variant.grade}` : null,
    variant.flatness ? `Flatness/Accuracy: ${variant.flatness}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return variantSpecs ? `${baseDesc}\nVariant Specs: ${variantSpecs}.` : baseDesc;
}

