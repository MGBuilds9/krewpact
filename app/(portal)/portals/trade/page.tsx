import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trade Partner Portal',
  description: 'Access tasks, submittals, bids, and compliance documents.',
};

import { auth } from '@clerk/nextjs/server';
import { CheckSquare, ClipboardList, FolderOpen, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

/**
 * Trade Partner Dashboard — Epic 13 landing page
 * Shows: compliance status, assigned projects, bid history, quick actions
 */

const QUICK_ACTIONS = [
  {
    label: 'Compliance',
    icon: ShieldCheck,
    href: '/portals/trade/compliance',
    desc: 'View & upload docs',
  },
  {
    label: 'Bid Opportunities',
    icon: ClipboardList,
    href: '/portals/trade/bids',
    desc: 'Submit proposals',
  },
  { label: 'My Tasks', icon: CheckSquare, href: '/portals/trade/tasks', desc: 'Field work items' },
  {
    label: 'Submittals',
    icon: FolderOpen,
    href: '/portals/trade/submittals',
    desc: 'Shop drawings & RFIs',
  },
];

function QuickActionCard({
  label,
  icon: Icon,
  href,
  desc,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all text-center"
    >
      <div className="flex justify-center mb-2">
        <Icon
          className="h-8 w-8 text-orange-500 group-hover:text-orange-700 transition-colors"
          aria-hidden="true"
        />
      </div>
      <p className="font-semibold text-gray-900 text-sm group-hover:text-orange-700 transition-colors">
        {label}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
    </Link>
  );
}

export default async function TradeDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth');

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-orange-900 to-amber-700 p-6 text-white">
        <p className="text-orange-200 text-sm font-medium uppercase tracking-wide">
          Trade Partner Portal
        </p>
        <h1 className="text-2xl font-bold mt-1">Welcome Back</h1>
        <p className="text-orange-100 text-sm mt-2">
          Manage your compliance, bids, tasks, and submittals below.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((item) => (
          <QuickActionCard key={item.label} {...item} />
        ))}
      </div>
      <div id="compliance-status" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-800 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Compliance Status
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          Visit{' '}
          <Link href="/portals/trade/compliance" className="underline font-medium">
            Compliance
          </Link>{' '}
          to review your documentation status and upload any expiring certificates.
        </p>
      </div>
      <div id="trade-projects" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Assigned Projects</h3>
        <p className="text-sm text-gray-400">
          Projects are loaded from your portal permissions. Visit{' '}
          <Link href="/portals/trade/submittals" className="text-orange-600 underline ml-1">
            Submittals
          </Link>{' '}
          to view your project work.
        </p>
      </div>
      <div id="trade-messages" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Messages</h3>
        <p className="text-sm text-gray-400">
          Contact your project manager or visit{' '}
          <Link href="/portals/trade/tasks" className="text-orange-600 underline">
            Tasks
          </Link>{' '}
          to communicate with the project team.
        </p>
      </div>
    </div>
  );
}
