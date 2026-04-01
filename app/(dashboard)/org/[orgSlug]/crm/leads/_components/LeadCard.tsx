'use client';

import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Lead } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  proposal: 'bg-purple-100 text-purple-700 border-purple-200',
  negotiation: 'bg-orange-100 text-orange-700 border-orange-200',
  nurture: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

export function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface LeadCardProps {
  lead: Lead;
  selected: boolean;
  onSelect: (id: string) => void;
  onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function LeadCard({ lead, selected, onSelect, onNavigate, onDelete }: LeadCardProps) {
  const score = lead.lead_score || 0;
  const scoreColorClass =
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
  return (
    <Card
      className={cn(
        'group cursor-pointer bg-white dark:bg-card border-0 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden relative flex flex-col h-full',
        selected && 'ring-2 ring-primary',
      )}
    >
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1" onClick={() => onNavigate(lead.id)}>
            <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
              {lead.company_name || 'Unnamed Lead'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs flex-shrink-0 border',
                  STATUS_BADGE_COLORS[lead.status] || '',
                )}
              >
                {formatStage(lead.status)}
              </Badge>
              {lead.is_qualified && (
                <Badge className="text-[10px] font-bold tracking-wider uppercase bg-green-500 text-white flex-shrink-0">
                  Qualified
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {onDelete && (
              <RowActionMenu
                entityName={lead.company_name || 'this lead'}
                onEdit={() => onNavigate(lead.id)}
                onDelete={() => onDelete(lead.id)}
              />
            )}
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(lead.id)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-border/40" onClick={() => onNavigate(lead.id)}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground">
            {lead.industry && <span className="text-foreground">{lead.industry}</span>}
            {lead.city && (
              <span className="text-foreground">
                {lead.city}, {lead.province}
              </span>
            )}
            {score > 0 && <span className={cn('font-bold', scoreColorClass)}>Score: {score}</span>}
            <span className="text-muted-foreground/80 flex w-full justify-between items-center text-xs pt-1">
              Added:{' '}
              <span className="font-semibold text-foreground">
                {new Date(lead.created_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
