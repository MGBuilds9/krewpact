'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, MapPin, DollarSign } from 'lucide-react';

export interface ProjectHistoryCardProps {
  project: {
    id: string;
    project_number: string | null;
    project_name: string;
    project_description: string | null;
    project_address: Record<string, string> | null;
    start_date: string | null;
    end_date: string | null;
    estimated_value: number | null;
    outcome: string;
  };
}

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

function formatCurrencyCAD(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value);
}

const OUTCOME_VARIANTS: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  lost: { label: 'Lost', className: 'bg-red-100 text-red-800 border-red-200' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

export function ProjectHistoryCard({ project }: ProjectHistoryCardProps) {
  const outcome = OUTCOME_VARIANTS[project.outcome] ?? { label: project.outcome, className: '' };

  const locationParts = [
    project.project_address?.city,
    project.project_address?.province,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  const startFormatted = formatMonthYear(project.start_date);
  const endFormatted = formatMonthYear(project.end_date);
  const dateRange =
    startFormatted && endFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted || endFormatted || null;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {project.project_number && (
                <span className="text-xs font-mono text-muted-foreground">{project.project_number}</span>
              )}
              <h4 className="text-sm font-semibold truncate">{project.project_name}</h4>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${outcome.className}`}>
            {outcome.label}
          </Badge>
        </div>

        {project.project_description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.project_description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {dateRange && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {dateRange}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {project.estimated_value != null && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <DollarSign className="h-3 w-3" />
              {formatCurrencyCAD(project.estimated_value)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
