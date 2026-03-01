import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Trade Partner Dashboard — Epic 13 landing page
 * Shows: compliance status, assigned projects, bid history, quick actions
 */
export default async function TradeDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-900 to-amber-700 p-6 text-white">
        <p className="text-orange-200 text-sm font-medium uppercase tracking-wide">Trade Partner Portal</p>
        <h1 className="text-2xl font-bold mt-1">Welcome Back</h1>
        <p className="text-orange-100 text-sm mt-2">Manage your compliance, bids, tasks, and submittals below.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Compliance', icon: '🛡️', href: '/portals/trade/compliance', desc: 'View & upload docs' },
          { label: 'Bid Opportunities', icon: '📋', href: '/portals/trade/bids', desc: 'Submit proposals' },
          { label: 'My Tasks', icon: '✅', href: '/portals/trade/tasks', desc: 'Field work items' },
          { label: 'Submittals', icon: '📁', href: '/portals/trade/submittals', desc: 'Shop drawings & RFIs' },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all text-center"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <p className="font-semibold text-gray-900 text-sm group-hover:text-orange-700 transition-colors">{item.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
          </a>
        ))}
      </div>

      {/* Compliance alerts placeholder */}
      <div id="compliance-status" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-800 flex items-center gap-2">
          <span>⚠️</span> Compliance Status
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          Visit <a href="/portals/trade/compliance" className="underline font-medium">Compliance</a> to review your documentation status and upload any expiring certificates.
        </p>
      </div>

      {/* Projects summary */}
      <div id="trade-projects" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Assigned Projects</h3>
        <p className="text-sm text-gray-400">
          Projects are loaded from your portal permissions. Visit
          <a href="/portals/projects" className="text-orange-600 underline ml-1">Projects</a> to view them.
        </p>
      </div>

      {/* Recent messages */}
      <div id="trade-messages" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Messages</h3>
        <p className="text-sm text-gray-400">
          Visit <a href="/portals/messages" className="text-orange-600 underline">Messages</a> to communicate with the project team.
        </p>
      </div>
    </div>
  );
}
