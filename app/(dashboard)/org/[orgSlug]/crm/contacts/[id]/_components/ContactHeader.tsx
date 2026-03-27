'use client';

import { ArrowLeft, MessageSquarePlus, Pencil, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContact } from '@/hooks/useCRM';

type ContactData = NonNullable<ReturnType<typeof useContact>['data']>;

interface ContactHeaderProps {
  contact: ContactData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onEmailClick: () => void;
  onLogActivity: () => void;
  onBack: () => void;
}

export function ContactHeader({
  contact,
  isEditing,
  setIsEditing,
  onEmailClick,
  onLogActivity,
  onBack,
}: ContactHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="mt-1"
        aria-label="Back to contacts"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">
          {contact.first_name} {contact.last_name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {contact.role_title && (
            <span className="text-muted-foreground text-sm">{contact.role_title}</span>
          )}
          {contact.is_primary && (
            <Badge variant="outline" className="text-xs border-primary text-primary">
              Primary
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {contact.email && (
          <Button variant="outline" size="sm" onClick={onEmailClick}>
            <Send className="h-4 w-4 mr-1" />
            Email
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onLogActivity}>
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
