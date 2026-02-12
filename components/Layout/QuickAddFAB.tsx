'use client';

import { Plus, FileText, Briefcase, DollarSign, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function QuickAddFAB() {
  const router = useRouter();
  const pathname = usePathname();

  const getContextAwareActions = () => {
    if (pathname.startsWith('/projects')) {
      return [
        { label: 'New Project', icon: Briefcase, href: '/projects?new=true' },
        { label: 'Field Report', icon: ClipboardList, href: '/reports/new' },
      ];
    }
    if (pathname.startsWith('/documents')) {
      return [{ label: 'Upload File', icon: FileText, href: '/documents?upload=true' }];
    }
    return [
      { label: 'New Project', icon: Briefcase, href: '/projects' },
      { label: 'Log Expense', icon: DollarSign, href: '/expenses/new' },
      { label: 'Upload File', icon: FileText, href: '/documents' },
    ];
  };

  const actions = getContextAwareActions();

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-8 md:right-8">
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Quick Add</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent align="end" className="w-56 mb-2">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={() => router.push(action.href)}
              className="cursor-pointer py-3 text-base"
            >
              <action.icon className="mr-3 h-5 w-5 text-muted-foreground" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
