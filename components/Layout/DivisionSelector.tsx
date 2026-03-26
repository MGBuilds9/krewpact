'use client';

import { Building2, Check, ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDivision } from '@/contexts/DivisionContext';
import { cn } from '@/lib/utils';

interface DivisionSelectorProps {
  className?: string;
}

type BadgeVariant = 'destructive' | 'default' | 'secondary' | 'outline';

function getRoleBadgeVariant(role: string): BadgeVariant {
  if (role === 'admin') return 'destructive';
  if (role === 'manager') return 'default';
  if (role === 'supervisor') return 'secondary';
  return 'outline';
}

export function DivisionSelector({ className }: DivisionSelectorProps) {
  const { activeDivision, userDivisions, isLoading, hasMultipleDivisions, setActiveDivision, getDivisionRole } = useDivision();

  if (isLoading || !hasMultipleDivisions || !activeDivision) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('h-8 px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2', className)}>
          <Building2 className="h-4 w-4 mr-2" />
          <span className="truncate max-w-[200px]">{activeDivision.name}</span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">Switch Division</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userDivisions.map((division) => {
          const isActive = division.id === activeDivision.id;
          const role = getDivisionRole(division.id);
          return (
            <DropdownMenuItem
              key={division.id}
              onClick={() => { if (division.id !== activeDivision.id) setActiveDivision(division.id); }}
              className={cn('flex items-center justify-between p-3 cursor-pointer hover:bg-accent hover:text-accent-foreground', isActive && 'bg-accent text-accent-foreground')}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {isActive ? <Check className="h-4 w-4 text-primary" /> : <div className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{division.name}</p>
                    {division.is_primary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                  </div>
                  {division.code && <p className="text-xs text-muted-foreground truncate">{division.code}</p>}
                </div>
              </div>
              {role && <Badge variant={getRoleBadgeVariant(role)} className="ml-2 text-xs">{role}</Badge>}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="p-2">
          <p className="text-xs text-muted-foreground">You have access to {userDivisions.length} division{userDivisions.length !== 1 ? 's' : ''}</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
