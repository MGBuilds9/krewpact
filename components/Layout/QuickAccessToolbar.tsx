'use client';

import { Camera, FileText, DollarSign, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface QuickAccessToolbarProps {
  className?: string;
}

const quickActions = [
  {
    icon: FolderPlus,
    label: 'New Project',
    path: '/projects',
    query: '?openNew=true',
  },
  {
    icon: Camera,
    label: 'Upload Photo',
    path: '/documents',
    query: '?openUpload=true',
  },
  {
    icon: FileText,
    label: 'Create Report',
    path: '/reports',
    query: '?openNew=true',
  },
  {
    icon: DollarSign,
    label: 'Log Expense',
    path: '/expenses',
    query: '?openExpense=true',
  },
];

export function QuickAccessToolbar({ className }: QuickAccessToolbarProps) {
  const router = useRouter();

  const handleQuickAction = (path: string, query?: string) => {
    router.push(`${path}${query || ''}`);
  };

  return (
    <div className={cn('bg-background/95 backdrop-blur-sm border-b border-border', className)}>
      <div className="container mx-auto px-4 md:px-6 py-2">
        {/* Desktop: All buttons visible in a row */}
        <div className="hidden md:flex items-center gap-2 justify-center">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover:bg-accent hover:shadow-sm transition-all"
              onClick={() => handleQuickAction(action.path, action.query)}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Mobile: Horizontal scrollable bar */}
        <div className="md:hidden overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-1">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-accent touch-target whitespace-nowrap"
                onClick={() => handleQuickAction(action.path, action.query)}
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
