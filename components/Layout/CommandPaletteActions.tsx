'use client';

import { ChevronRight, Clock } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { FlatSearchResult, NavItem, NavSection } from './CommandPaletteTypes';

interface CommandPaletteActionsProps {
  searchQuery: string;
  recentItems: NavItem[];
  filteredSections: NavSection[];
  flatResults: FlatSearchResult[];
  selectedIndex: number;
  openSections: Record<string, boolean>;
  pathname: string;
  onNavigate: (path: string) => void;
  onToggleSection: (title: string) => void;
}

function getSectionOffset(filteredSections: NavSection[], title: string): number {
  return filteredSections
    .slice(
      0,
      filteredSections.findIndex((s) => s.title === title),
    )
    .reduce((sum, s) => sum + s.items.length, 0);
}

export function CommandPaletteActions({
  searchQuery,
  recentItems,
  filteredSections,
  flatResults,
  selectedIndex,
  openSections,
  pathname,
  onNavigate,
  onToggleSection,
}: CommandPaletteActionsProps) {
  return (
    <>
      {!searchQuery && recentItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
            <Clock className="h-4 w-4" />
            Recent
          </div>
          <div className="space-y-1">
            {recentItems.map((item) => (
              <button
                key={item.href}
                onClick={() => onNavigate(item.href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'hover:bg-accent text-left',
                  pathname === item.href && 'bg-muted',
                )}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {filteredSections.map((section) =>
        section.items.length > 0 ? (
          <Collapsible
            key={section.title}
            open={openSections[section.title]}
            onOpenChange={() => onToggleSection(section.title)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span>{section.title}</span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  openSections[section.title] && 'rotate-90',
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-2">
              {section.items.map((item, idx) => {
                const globalIndex =
                  flatResults.length + getSectionOffset(filteredSections, section.title) + idx;
                return (
                  <button
                    key={item.href}
                    data-index={globalIndex}
                    onClick={() => onNavigate(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                      globalIndex === selectedIndex ? 'bg-accent' : 'hover:bg-accent',
                      pathname === item.href && 'bg-muted',
                    )}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        ) : null,
      )}
    </>
  );
}
