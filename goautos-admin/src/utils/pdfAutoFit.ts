import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { PDFLayoutConfig } from '@/types/document-template';

// Progressively more compact configurations to try
const AUTO_FIT_STEPS: Array<Partial<PDFLayoutConfig>> = [
  { sectionSpacing: 8,  signaturesMarginTop: 14, pageMarginH: 28, pageMarginV: 17 },
  { sectionSpacing: 6,  signaturesMarginTop: 11, pageMarginH: 26, pageMarginV: 15 },
  { sectionSpacing: 4,  signaturesMarginTop: 8,  pageMarginH: 24, pageMarginV: 13 },
  { sectionSpacing: 3,  signaturesMarginTop: 6,  pageMarginH: 22, pageMarginV: 11 },
  { sectionSpacing: 2,  signaturesMarginTop: 5,  pageMarginH: 20, pageMarginV: 10, termsFontSize: 6.5 },
  { sectionSpacing: 2,  signaturesMarginTop: 5,  pageMarginH: 18, pageMarginV: 8,  termsFontSize: 6, notesFontSize: 7 },
  { sectionSpacing: 1,  signaturesMarginTop: 4,  pageMarginH: 16, pageMarginV: 7,  termsFontSize: 5.5, notesFontSize: 7, showNotes: false },
];

/**
 * Tries progressively more compact layout configs until the PDF fits in 1 page.
 * @param renderFn Factory that produces a React element for the PDF given a config.
 * @param currentConfig Starting layout config.
 * @returns The first config that results in a 1-page PDF, or the most compact one.
 */
export async function autoFitToOnePage(
  renderFn: (config: PDFLayoutConfig) => React.ReactElement,
  currentConfig: PDFLayoutConfig
): Promise<PDFLayoutConfig> {
  // First check if it already fits
  try {
    const blob = await pdf(renderFn(currentConfig)).toBlob();
    const pdfDoc = await PDFDocument.load(await blob.arrayBuffer());
    if (pdfDoc.getPageCount() === 1) return currentConfig;
  } catch {
    // continue to attempts
  }

  for (const step of AUTO_FIT_STEPS) {
    const testConfig: PDFLayoutConfig = { ...currentConfig, ...step };
    try {
      const blob = await pdf(renderFn(testConfig)).toBlob();
      const pdfDoc = await PDFDocument.load(await blob.arrayBuffer());
      if (pdfDoc.getPageCount() === 1) return testConfig;
    } catch {
      continue;
    }
  }

  // Return most compact even if still > 1 page
  return { ...currentConfig, ...AUTO_FIT_STEPS[AUTO_FIT_STEPS.length - 1] };
}
