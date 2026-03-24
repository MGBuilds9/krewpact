'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDivision } from '@/contexts/DivisionContext';
import { cn } from '@/lib/utils';

export type DivisionId = string | null;

interface DivisionSelectorProps {
  selectedDivision: DivisionId;
  compareDivision: DivisionId;
  isComparing: boolean;
  onSelectDivision: (division: DivisionId) => void;
  onSelectCompareDivision: (division: DivisionId) => void;
  onToggleCompare: () => void;
}

function getDivisionSlot(
  id: string,
  selectedDivision: DivisionId,
  compareDivision: DivisionId,
): 'primary' | 'compare' | null {
  if (selectedDivision === id) return 'primary';
  if (compareDivision === id) return 'compare';
  return null;
}

interface ClickHandlerOpts {
  id: string;
  isComparing: boolean;
  selectedDivision: DivisionId;
  compareDivision: DivisionId;
  onSelectDivision: (d: DivisionId) => void;
  onSelectCompareDivision: (d: DivisionId) => void;
}

function handleDivisionClick({
  id,
  isComparing,
  selectedDivision,
  compareDivision,
  onSelectDivision,
  onSelectCompareDivision,
}: ClickHandlerOpts) {
  if (!isComparing) {
    onSelectDivision(selectedDivision === id ? null : id);
    return;
  }
  if (selectedDivision === id) {
    onSelectDivision(null);
  } else if (compareDivision === id) {
    onSelectCompareDivision(null);
  } else if (selectedDivision === null) {
    onSelectDivision(id);
  } else if (compareDivision === null) {
    onSelectCompareDivision(id);
  } else {
    onSelectCompareDivision(id);
  }
}

export function DivisionSelector({
  selectedDivision,
  compareDivision,
  isComparing,
  onSelectDivision,
  onSelectCompareDivision,
  onToggleCompare,
}: DivisionSelectorProps) {
  const { userDivisions } = useDivision();

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {userDivisions.map(({ id, name }) => {
        const slot = getDivisionSlot(id, selectedDivision, compareDivision);
        return (
          <button
            key={id}
            onClick={() =>
              handleDivisionClick({
                id,
                isComparing,
                selectedDivision,
                compareDivision,
                onSelectDivision,
                onSelectCompareDivision,
              })
            }
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              slot === 'primary' &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              slot === 'compare' && 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600',
              slot === null && 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {name}
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
