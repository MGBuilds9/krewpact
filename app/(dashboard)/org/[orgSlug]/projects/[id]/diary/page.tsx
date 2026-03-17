import type { Metadata } from 'next';

import DiaryPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Diary',
  description: 'Daily field diary entries and site observations.',
};

export default function Page() {
  return <DiaryPageContent />;
}
