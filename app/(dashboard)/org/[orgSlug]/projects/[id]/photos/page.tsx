import type { Metadata } from 'next';

import PhotosPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Photos',
  description: 'Capture, annotate, and organize site photos.',
};

export default function Page() {
  return <PhotosPageContent />;
}
