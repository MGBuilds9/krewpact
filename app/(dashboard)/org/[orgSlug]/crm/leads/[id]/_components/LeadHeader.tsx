'use client';

import { ArrowLeft, MessageSquarePlus, Pencil, Send, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { useLead } from '@/hooks/useCRM';

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;

interface LeadHeaderProps {
  lead: LeadData;
  leadLocation: string;
  isEditing: boolean;
  onEmail: () => void;
  onActivity: () => void;
  onEdit: () => void;
  onDelete: () => void;
  orgPush: (path: string) => void;
}

export function LeadHeader({
  lead,
  leadLocation,
  isEditing,
  onEmail,
  onActivity,
  onEdit,
  onDelete,
  orgPush,
}: LeadHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => orgPush('/crm/leads')}
        className="mt-1"
        aria-label="Back to leads"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{lead.company_name}</h1>
        <div className="flex items-center gap-2 mt-1">
          {lead.industry && <span className="text-muted-foreground text-sm">{lead.industry}</span>}
          {leadLocation && <span className="text-muted-foreground text-sm">{leadLocation}</span>}
          {lead.is_qualified && (
            <Badge className="text-xs bg-green-500 text-white">Qualified</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onEmail}>
          <Send className="h-4 w-4 mr-1" />
          Email
        </Button>
        <Button variant="outline" size="sm" onClick={onActivity}>
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
