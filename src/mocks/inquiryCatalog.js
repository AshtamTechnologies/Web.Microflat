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
    primaryStandard: 'IS-7327-2003',
    supportedStandards: ['IS-7327-2003', 'DIN-876', 'BS-817', 'US-Fed GGG-P-463c'],
    materialName: 'Indian Black Granite',
    finishType: 'Hand Lapped',
    description:
      'Precision Granite Surface Plate manufactured from high-density Indian Black Granite, stress-relieved naturally over geological age and precision hand-lapped to meet IS-7327-2003 / DIN-876 flatness accuracy. Non-magnetic, rust-proof, and thermally stable for metrology & inspection rooms.',
    variants: [
      {
        id: 'var-gsp-1',
        variantName: '250 × 250 mm',
        size: '250 × 250 mm',
        lengthMm: 250,
        widthMm: 250,
        heightMm: 50,
        itemCode: 'SP-GR-250x250',
        technicalDetails: 'Indian Black Granite · Hand Lapped · 250 × 250 mm',
      },
      {
        id: 'var-gsp-2',
        variantName: '400 × 400 mm',
        size: '400 × 400 mm',
        lengthMm: 400,
        widthMm: 400,
        heightMm: 70,
        itemCode: 'SP-GR-400x400',
        technicalDetails: 'Indian Black Granite · Hand Lapped · 400 × 400 mm',
      },
      {
        id: 'var-gsp-3',
        variantName: '630 × 400 mm',
        size: '630 × 400 mm',
        lengthMm: 630,
        widthMm: 400,
        heightMm: 100,
        itemCode: 'SP-GR-630x400',
        technicalDetails: 'Indian Black Granite · Hand Lapped · 630 × 400 mm',
      },
      {
        id: 'var-gsp-4',
        variantName: '1000 × 630 mm',
        size: '1000 × 630 mm',
        lengthMm: 1000,
        widthMm: 630,
        heightMm: 150,
        itemCode: 'SP-GR-1000x630',
        technicalDetails: 'Indian Black Granite · Hand Lapped · 1000 × 630 mm',
      },
      {
        id: 'var-gsp-5',
        variantName: '1600 × 1000 mm',
        size: '1600 × 1000 mm',
        lengthMm: 1600,
        widthMm: 1000,
        heightMm: 200,
        itemCode: 'SP-GR-1600x1000',
        technicalDetails: 'Indian Black Granite · Hand Lapped · 1600 × 1000 mm',
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
    primaryStandard: 'IS-2285',
    supportedStandards: ['IS-2285', 'DIN-876'],
    materialName: 'Close-grained FG-220 Cast Iron',
    finishType: 'Hand Scraped',
    description:
      'Close-grained FG-220 Cast Iron Surface Plate, heavily ribbed for maximum rigidity and stress-relieved to prevent distortion. Precision hand-scraped top working surface conforming to IS-2285 for layout, marking, and blue-matching inspection.',
    variants: [
      {
        id: 'var-cisp-1',
        variantName: '300 × 300 mm',
        size: '300 × 300 mm',
        lengthMm: 300,
        widthMm: 300,
        heightMm: 100,
        itemCode: 'SP-CI-300x300',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · 300 × 300 mm',
      },
      {
        id: 'var-cisp-2',
        variantName: '600 × 600 mm',
        size: '600 × 600 mm',
        lengthMm: 600,
        widthMm: 600,
        heightMm: 120,
        itemCode: 'SP-CI-600x600',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · 600 × 600 mm',
      },
      {
        id: 'var-cisp-3',
        variantName: '1000 × 1000 mm',
        size: '1000 × 1000 mm',
        lengthMm: 1000,
        widthMm: 1000,
        heightMm: 150,
        itemCode: 'SP-CI-1000x1000',
        technicalDetails: 'Close-grained Cast Iron · Hand Scraped · 1000 × 1000 mm',
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
    primaryStandard: 'IS-5268',
    supportedStandards: ['IS-5268', 'DIN-876'],
    materialName: 'Indian Black Granite',
    finishType: 'Lapped Faces',
    description:
      'Precision Granite Triangular / I-Beam Straight Edge crafted from Indian Black Granite with two precision hand-lapped working faces conforming to IS-5268. Ideal for checking straightness and flatness of machine tool slideways and surface tables.',
    variants: [
      {
        id: 'var-gse-1',
        variantName: '500 × 50 × 100 mm',
        size: '500 × 50 × 100 mm',
        lengthMm: 500,
        widthMm: 50,
        heightMm: 100,
        itemCode: 'SE-GR-500',
        technicalDetails: 'Granite Triangular Straight Edge · Lapped · 500 × 50 × 100 mm',
      },
      {
        id: 'var-gse-2',
        variantName: '1000 × 60 × 140 mm',
        size: '1000 × 60 × 140 mm',
        lengthMm: 1000,
        widthMm: 60,
        heightMm: 140,
        itemCode: 'SE-GR-1000',
        technicalDetails: 'Granite Triangular Straight Edge · Lapped · 1000 × 60 × 140 mm',
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
    primaryStandard: 'IS-6985',
    supportedStandards: ['IS-6985', 'DIN-876'],
    materialName: 'Indian Black Granite',
    finishType: '6 Faces Finished',
    description:
      'Six-face finished Granite Master Square & Angle Plate made from select Indian Black Granite, hand-lapped for high squareness and parallelism accuracy per IS-6985. Used for checking perpendicularity on CMMs and coordinate axes.',
    variants: [
      {
        id: 'var-gap-1',
        variantName: '200 × 200 × 50 mm',
        size: '200 × 200 × 50 mm',
        lengthMm: 200,
        widthMm: 200,
        heightMm: 50,
        itemCode: 'AP-GR-200x200',
        technicalDetails: 'Indian Black Granite · 6 Faces Finished · 200 × 200 × 50 mm',
      },
      {
        id: 'var-gap-2',
        variantName: '400 × 400 × 75 mm',
        size: '400 × 400 × 75 mm',
        lengthMm: 400,
        widthMm: 400,
        heightMm: 75,
        itemCode: 'AP-GR-400x400',
        technicalDetails: 'Indian Black Granite · 6 Faces Finished · 400 × 400 × 75 mm',
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
    primaryStandard: 'IS-7327-2003',
    supportedStandards: ['IS-7327-2003', 'DIN-876'],
    materialName: 'Indian Black Granite',
    finishType: 'Fine Lapped Base',
    description:
      'Precision Granite Comparator Stand featuring a hand-lapped Indian Black Granite base and rigid hard-chrome plated steel column with fine micro-adjustment bracket for dial/electronic gauge comparative measurements.',
    variants: [
      {
        id: 'var-cs-1',
        variantName: 'Base 150 × 150 mm · Column 30 mm',
        size: '150 × 150 mm',
        lengthMm: 150,
        widthMm: 150,
        heightMm: 50,
        itemCode: 'CS-GR-150-STD',
        technicalDetails: 'Granite Base 150 × 150 mm · Column Ø30 × 250 mm · Fine Adjustment',
      },
      {
        id: 'var-cs-2',
        variantName: 'Base 250 × 200 mm · Column 35 mm',
        size: '250 × 200 mm',
        lengthMm: 250,
        widthMm: 200,
        heightMm: 60,
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

