'use client';

import { Check, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useDivision } from '@/contexts/DivisionContext';
import { cn } from '@/lib/utils';

interface DivisionSelectorProps {
  className?: string;
}

export function DivisionSelector({ className }: DivisionSelectorProps) {
  const {
    activeDivision,
    userDivisions,
    isLoading,
    hasMultipleDivisions,
    setActiveDivision,
    getDivisionRole,
  } = useDivision();

  if (isLoading || !hasMultipleDivisions || !activeDivision) {
    return null;
  }

  const handleDivisionChange = (divisionId: string) => {
    if (divisionId !== activeDivision.id) {
      setActiveDivision(divisionId);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'manager':
        return 'default' as const;
      case 'supervisor':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 px-3 text-sm font-medium',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            className,
          )}
        >
          <Building2 className="h-4 w-4 mr-2" />
          <span className="truncate max-w-[200px]">{activeDivision.name}</span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          Switch Division
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {userDivisions.map((division) => {
          const isActive = division.id === activeDivision.id;
          const role = getDivisionRole(division.id);

          return (
            <DropdownMenuItem
              key={division.id}
              onClick={() => handleDivisionChange(division.id)}
              className={cn(
                'flex items-center justify-between p-3 cursor-pointer',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {isActive ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{division.name}</p>
                    {division.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {division.code && (
                    <p className="text-xs text-muted-foreground truncate">{division.code}</p>
                  )}
                </div>
              </div>

              {role && (
                <Badge variant={getRoleBadgeVariant(role)} className="ml-2 text-xs">
                  {role}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <div className="p-2">
          <p className="text-xs text-muted-foreground">
            You have access to {userDivisions.length} division
            {userDivisions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
