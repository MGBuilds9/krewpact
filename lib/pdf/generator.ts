import { type DocumentProps, renderToBuffer } from '@react-pdf/renderer';
import React from 'react';

import { EstimatePdf } from './templates/EstimatePdf';
import { ProjectStatusPdf } from './templates/ProjectStatusPdf';
import type { EstimatePdfData, PdfTemplate, ProjectStatusPdfData } from './types';

export async function generatePdf(
  template: PdfTemplate,
  data: Record<string, unknown>,
): Promise<Buffer> {
  let document: React.ReactElement<DocumentProps>;

  switch (template) {
    case 'estimate':
      document = React.createElement(EstimatePdf, {
        data: data as unknown as EstimatePdfData,
      }) as React.ReactElement<DocumentProps>;
      break;
    case 'project-status':
      document = React.createElement(ProjectStatusPdf, {
        data: data as unknown as ProjectStatusPdfData,
      }) as React.ReactElement<DocumentProps>;
      break;
    default:
      throw new Error(`Unknown PDF template: ${template}`);
  }

  const buffer = await renderToBuffer(document);
  return Buffer.from(buffer);
}
