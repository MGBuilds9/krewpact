import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { EstimatePdf } from './templates/EstimatePdf';
import { ProjectStatusPdf } from './templates/ProjectStatusPdf';
import type { PdfTemplate, EstimatePdfData, ProjectStatusPdfData } from './types';

export async function generatePdf(
  template: PdfTemplate,
  data: Record<string, unknown>,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let document: React.ReactElement<any>;

  switch (template) {
    case 'estimate':
      document = React.createElement(EstimatePdf, { data: data as unknown as EstimatePdfData });
      break;
    case 'project-status':
      document = React.createElement(ProjectStatusPdf, {
        data: data as unknown as ProjectStatusPdfData,
      });
      break;
    default:
      throw new Error(`Unknown PDF template: ${template}`);
  }

  const buffer = await renderToBuffer(document);
  return Buffer.from(buffer);
}
