'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
  // Placeholder — will be replaced with real notification logic in Phase 2
  return (
    <Button variant="ghost" size="icon" className="relative hover:bg-muted rounded-lg" aria-label="Notifications">
      <Bell className="h-5 w-5" />
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
      >
        0
      </Badge>
    </Button>
  );
}
