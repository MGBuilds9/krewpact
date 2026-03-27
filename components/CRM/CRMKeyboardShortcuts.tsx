'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useOrgRouter } from '@/hooks/useOrgRouter';

interface CRMKeyboardShortcutsProps {
  onOpenFollowUp?: () => void;
}

export function CRMKeyboardShortcuts({ onOpenFollowUp }: CRMKeyboardShortcutsProps) {
  const { push: orgPush } = useOrgRouter();

  useKeyboardShortcuts([
    { key: 'n', handler: () => orgPush('/crm/leads/new') },
    { key: 'l', handler: () => orgPush('/crm/leads') },
    { key: 'a', handler: () => orgPush('/crm/accounts') },
    { key: 'p', handler: () => orgPush('/crm/opportunities') },
    { key: 't', handler: () => orgPush('/crm/tasks') },
    { key: 'd', handler: () => orgPush('/crm/dashboard') },
    { key: 'b', handler: () => orgPush('/crm/bidding') },
    { key: 's', handler: () => orgPush('/crm/sequences') },
    { key: 'e', handler: () => orgPush('/crm/enrichment') },
    ...(onOpenFollowUp ? [{ key: 'f', handler: onOpenFollowUp }] : []),
  ]);

  return null;
}
