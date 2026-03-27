'use client';

import { useUser } from '@clerk/nextjs';
import { Bell, ClipboardList } from 'lucide-react';

import { DailyDigestWidget } from '@/components/AI/DailyDigestWidget';
import { NLQueryBar } from '@/components/AI/NLQueryBar';
import CalendarWidget from '@/components/Dashboard/CalendarWidget';
import InboxPreview from '@/components/Dashboard/InboxPreview';
import { useDashboard } from '@/hooks/useDashboard';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';

import {
  getTimeGreeting,
  getUserName,
  ProjectsAndExpensesCards,
  QuickLinksGrid,
  RecentProjectsCard,
  StatCard,
  WelcomeCard,
} from './DashboardViewParts';

export default function DashboardView() {
  const { user } = useUser();
  const { push: orgPush } = useOrgRouter();
  const { data: dashboard } = useDashboard();
  const { roles } = useUserRBAC();
  const greeting = getTimeGreeting();
  const userName = getUserName(user);

  const atAGlance = dashboard?.atAGlance;
  const recentProjects = dashboard?.recentProjects ?? [];
  const unread = atAGlance?.unreadNotifications ?? 0;
  const activeProjects = atAGlance?.activeProjects ?? 0;
  const pendingExpenses = atAGlance?.pendingExpenses ?? 0;
  const openLeads = atAGlance?.openLeads ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-min">
        <WelcomeCard userName={userName} greeting={greeting} roles={roles} />
        <div className="col-span-1 md:col-span-4 lg:col-span-6">
          <NLQueryBar />
        </div>
        <ProjectsAndExpensesCards
          activeProjects={activeProjects}
          pendingExpenses={pendingExpenses}
          orgPush={orgPush}
        />
        <StatCard
          value={openLeads}
          label="Open Leads"
          Icon={ClipboardList}
          colorClass="text-purple-600 dark:text-purple-400"
          bgClass="bg-purple-50 dark:bg-purple-900/20"
          gridClass="col-span-1 md:col-span-2 lg:col-span-2"
          onClick={() => orgPush('/crm/leads')}
        />
        <StatCard
          value={unread}
          label="Unread Alerts"
          Icon={Bell}
          colorClass="text-orange-600 dark:text-orange-400"
          bgClass="bg-orange-50 dark:bg-orange-900/20"
          gridClass="col-span-1 md:col-span-2 lg:col-span-2"
          onClick={() => orgPush('/notifications')}
          showPulse={unread > 0}
        />
        <QuickLinksGrid orgPush={orgPush} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentProjectsCard projects={recentProjects} orgPush={orgPush} />
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl overflow-hidden border-0 shadow-sm bg-white dark:bg-card">
            <CalendarWidget />
          </div>
          <div className="rounded-3xl overflow-hidden border-0 shadow-sm bg-white dark:bg-card">
            <DailyDigestWidget />
          </div>
          <div className="rounded-3xl overflow-hidden border-0 shadow-sm bg-white dark:bg-card">
            <InboxPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
