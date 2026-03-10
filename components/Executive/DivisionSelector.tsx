'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const DIVISIONS = [
  { id: 'contracting', label: 'Contracting' },
  { id: 'homes', label: 'Homes' },
  { id: 'wood', label: 'Wood' },
  { id: 'telecom', label: 'Telecom' },
  { id: 'group-inc', label: 'Group Inc.' },
  { id: 'management', label: 'Management' },
] as const;

export type DivisionId = (typeof DIVISIONS)[number]['id'];

interface DivisionSelectorProps {
  selectedDivision: DivisionId | null;
  compareDivision: DivisionId | null;
  isComparing: boolean;
  onSelectDivision: (division: DivisionId | null) => void;
  onSelectCompareDivision: (division: DivisionId | null) => void;
  onToggleCompare: () => void;
}

export function DivisionSelector({
  selectedDivision,
  compareDivision,
  isComparing,
  onSelectDivision,
  onSelectCompareDivision,
  onToggleCompare,
}: DivisionSelectorProps) {
  function handleDivisionClick(id: DivisionId) {
    if (!isComparing) {
      onSelectDivision(selectedDivision === id ? null : id);
      return;
    }
    // Compare mode: first slot = selectedDivision, second slot = compareDivision
    if (selectedDivision === id) {
      onSelectDivision(null);
    } else if (compareDivision === id) {
      onSelectCompareDivision(null);
    } else if (selectedDivision === null) {
      onSelectDivision(id);
    } else if (compareDivision === null) {
      onSelectCompareDivision(id);
    } else {
      // Both slots taken — replace compare slot
      onSelectCompareDivision(id);
    }
  }

  function getDivisionSlot(id: DivisionId): 'primary' | 'compare' | null {
    if (selectedDivision === id) return 'primary';
    if (compareDivision === id) return 'compare';
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All button */}
      <Button
        variant={!isComparing && selectedDivision === null ? 'default' : 'outline'}
        size="sm"
        className="h-7 text-xs px-3"
        onClick={() => {
          onSelectDivision(null);
          onSelectCompareDivision(null);
        }}
      >
        All
      </Button>

      {/* Division chips */}
      {DIVISIONS.map(({ id, label }) => {
        const slot = getDivisionSlot(id);
        return (
          <button
            key={id}
            onClick={() => handleDivisionClick(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              slot === 'primary' &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              slot === 'compare' && 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
              slot === null && 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {label}
            {isComparing && slot && (
              <Badge
                variant="secondary"
                className={cn(
                  'h-4 px-1 text-[10px]',
                  slot === 'primary' && 'bg-primary-foreground text-primary',
                  slot === 'compare' && 'bg-white text-blue-600',
                )}
              >
                {slot === 'primary' ? 'A' : 'B'}
              </Badge>
            )}
          </button>
        );
      })}

      {/* Compare toggle */}
      <div className="ml-auto flex items-center gap-2">
        {isComparing && (
          <span className="text-xs text-muted-foreground">
            {selectedDivision && compareDivision ? 'Comparing A vs B' : 'Select up to 2 divisions'}
          </span>
        )}
        <Button
          variant={isComparing ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs px-3"
          onClick={onToggleCompare}
        >
          {isComparing ? 'Exit Compare' : 'Compare'}
        </Button>
      </div>
    </div>
  );
}
