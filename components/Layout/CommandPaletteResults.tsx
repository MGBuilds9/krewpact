'use client';

import { Lightbulb, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { EntityType, entityTypeConfig, GlobalSearchResults } from './CommandPaletteTypes';

interface CommandPaletteResultsProps {
  searchQuery: string;
  searchResults: GlobalSearchResults | null;
  isSearching: boolean;
  isNlQuery: boolean;
  nlAnswer: string | null;
  hasSearchResults: boolean;
  groupedEntityTypes: EntityType[];
  selectedIndex: number;
  onEntityNavigate: (entityType: EntityType, id: string) => void;
}

interface EntityGroupProps {
  entityType: EntityType;
  searchResults: GlobalSearchResults;
  startIndex: number;
  selectedIndex: number;
  onEntityNavigate: (entityType: EntityType, id: string) => void;
}

function EntityGroup({
  entityType,
  searchResults,
  startIndex,
  selectedIndex,
  onEntityNavigate,
}: EntityGroupProps) {
  const config = entityTypeConfig[entityType];
  const Icon = config.icon;
  const results = searchResults[entityType];
  const badgeLabel = entityType === 'opportunities' ? 'opportunity' : entityType.replace(/s$/, '');
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
        <Icon className="h-4 w-4" />
        {config.label}
      </div>
      {results.map((result, idx) => {
        const globalIdx = startIndex + idx;
        return (
          <button
            key={`${entityType}-${result.id}`}
            data-index={globalIdx}
            onClick={() => onEntityNavigate(entityType, result.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
              globalIdx === selectedIndex ? 'bg-accent' : 'hover:bg-accent',
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="text-sm">{result.name}</span>
              {result.subtitle && (
                <span className="text-xs text-muted-foreground ml-2">{result.subtitle}</span>
              )}
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {badgeLabel}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

export function CommandPaletteResults({
  searchQuery,
  searchResults,
  isSearching,
  isNlQuery,
  nlAnswer,
  hasSearchResults,
  groupedEntityTypes,
  selectedIndex,
  onEntityNavigate,
}: CommandPaletteResultsProps) {
  let runningIndex = 0;
  return (
    <>
      {hasSearchResults &&
        groupedEntityTypes.map((entityType) => {
          const startIndex = runningIndex;
          runningIndex += searchResults![entityType].length;
          return (
            <EntityGroup
              key={entityType}
              entityType={entityType}
              searchResults={searchResults!}
              startIndex={startIndex}
              selectedIndex={selectedIndex}
              onEntityNavigate={onEntityNavigate}
            />
          );
        })}
      {isNlQuery && nlAnswer && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <Lightbulb className="h-4 w-4" />
            AI Answer
          </div>
          <p className="text-sm text-blue-900">{nlAnswer}</p>
        </div>
      )}
      {isNlQuery && isSearching && !nlAnswer && (
        <div className="text-center py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Thinking...
        </div>
      )}
      {!isNlQuery && searchQuery.length >= 2 && !isSearching && !hasSearchResults && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No results found for &quot;{searchQuery}&quot;
        </div>
      )}
    </>
  );
}
