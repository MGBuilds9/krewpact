'use client';

import {
  Briefcase,
  Camera,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: typeof FolderPlus;
  label: string;
  path: string;
  query?: string;
  /**
   * Substring matched against the current pathname to mark this action as
   * the primary (directly-relevant) CTA. When a match wins, the other
   * actions in the same context group are demoted into the dropdown so the
   * user sees exactly one prominent CTA per page.
   */
  primaryOn?: string;
}

const crmActions: QuickAction[] = [
  { icon: UserPlus, label: 'New Lead', path: '/crm/leads/new', primaryOn: '/crm/leads' },
  {
    icon: TrendingUp,
    label: 'New Opportunity',
    path: '/crm/opportunities/new',
    primaryOn: '/crm/opportunities',
  },
  {
    icon: Briefcase,
    label: 'New Account',
    path: '/crm/accounts/new',
    primaryOn: '/crm/accounts',
  },
];

const projectActions: QuickAction[] = [
  {
    icon: FolderPlus,
    label: 'New Project',
    path: '/projects',
    query: '?openNew=true',
    primaryOn: '/projects',
  },
  {
    icon: Camera,
    label: 'Upload Photo',
    path: '/documents',
    query: '?openUpload=true',
    primaryOn: '/documents',
  },
  {
    icon: FileText,
    label: 'Create Report',
    path: '/reports',
    query: '?openNew=true',
    primaryOn: '/reports',
  },
];

const estimateActions: QuickAction[] = [
  { icon: Plus, label: 'New Estimate', path: '/estimates/new' },
];

const defaultActions: QuickAction[] = [
  { icon: FolderPlus, label: 'New Project', path: '/projects', query: '?openNew=true' },
  { icon: FileText, label: 'Create Report', path: '/reports', query: '?openNew=true' },
  { icon: DollarSign, label: 'Log Expense', path: '/expenses', query: '?openExpense=true' },
];

function splitActionsByContext(
  actions: QuickAction[],
  pathname: string,
): { primary: QuickAction | null; rest: QuickAction[] } {
  // The primary action is the one whose `primaryOn` hint substring matches
  // the current pathname. Only one primary per group — first match wins.
  const primary = actions.find((a) => a.primaryOn && pathname.includes(a.primaryOn)) ?? null;
  if (!primary) return { primary: null, rest: actions };
  return { primary, rest: actions.filter((a) => a !== primary) };
}

function buildHref(action: QuickAction): string {
  return `${action.path}${action.query ?? ''}`;
}

interface QuickAccessToolbarProps {
  className?: string;
}

export function QuickAccessToolbar({ className }: QuickAccessToolbarProps) {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();

  const { primary, rest } = useMemo(() => {
    if (pathname.includes('/crm')) return splitActionsByContext(crmActions, pathname);
    if (pathname.includes('/projects')) return splitActionsByContext(projectActions, pathname);
    if (pathname.includes('/estimates')) return splitActionsByContext(estimateActions, pathname);
    return splitActionsByContext(defaultActions, pathname);
  }, [pathname]);

  const handleClick = (action: QuickAction) => orgPush(buildHref(action));

  return (
    <div className={cn('bg-background/95 backdrop-blur-sm border-b border-border', className)}>
      <div className="container mx-auto px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 justify-center overflow-x-auto scrollbar-hide">
          {primary ? (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={() => handleClick(primary)}
              >
                <primary.icon className="h-4 w-4" />
                {primary.label}
              </Button>
              {rest.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 hover:bg-accent"
                      aria-label="More actions"
                    >
                      More
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {rest.map((action) => {
                      const Icon = action.icon;
                      return (
                        <DropdownMenuItem key={action.label} onClick={() => handleClick(action)}>
                          <Icon className="h-4 w-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            rest.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-accent whitespace-nowrap"
                  onClick={() => handleClick(action)}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
