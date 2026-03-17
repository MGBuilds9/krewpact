'use client';

import {
  Briefcase,
  Camera,
  DollarSign,
  FileText,
  FolderPlus,
  Plus,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: typeof FolderPlus;
  label: string;
  path: string;
  query?: string;
}

const crmActions: QuickAction[] = [
  { icon: UserPlus, label: 'New Lead', path: '/crm/leads/new' },
  { icon: TrendingUp, label: 'New Opportunity', path: '/crm/opportunities/new' },
  { icon: Briefcase, label: 'New Account', path: '/crm/accounts/new' },
];

const projectActions: QuickAction[] = [
  { icon: FolderPlus, label: 'New Project', path: '/projects', query: '?openNew=true' },
  { icon: Camera, label: 'Upload Photo', path: '/documents', query: '?openUpload=true' },
  { icon: FileText, label: 'Create Report', path: '/reports', query: '?openNew=true' },
];

const estimateActions: QuickAction[] = [
  { icon: Plus, label: 'New Estimate', path: '/estimates/new' },
];

const defaultActions: QuickAction[] = [
  { icon: FolderPlus, label: 'New Project', path: '/projects', query: '?openNew=true' },
  { icon: FileText, label: 'Create Report', path: '/reports', query: '?openNew=true' },
  { icon: DollarSign, label: 'Log Expense', path: '/expenses', query: '?openExpense=true' },
];

interface QuickAccessToolbarProps {
  className?: string;
}

export function QuickAccessToolbar({ className }: QuickAccessToolbarProps) {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();

  const actions = useMemo(() => {
    if (pathname.includes('/crm')) return crmActions;
    if (pathname.includes('/projects')) return projectActions;
    if (pathname.includes('/estimates')) return estimateActions;
    return defaultActions;
  }, [pathname]);

  return (
    <div className={cn('bg-background/95 backdrop-blur-sm border-b border-border', className)}>
      <div className="container mx-auto px-4 md:px-6 py-2">
        <div className="hidden md:flex items-center gap-2 justify-center">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover:bg-accent hover:shadow-sm transition-all"
              onClick={() => orgPush(`${action.path}${action.query || ''}`)}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
        <div className="md:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-1">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-accent touch-target whitespace-nowrap"
                onClick={() => orgPush(`${action.path}${action.query || ''}`)}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
