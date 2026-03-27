'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  label: string;
  endpoint: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
}

export function ActionButton({ label, endpoint, icon, variant = 'outline' }: ActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  async function handleClick() {
    setStatus('running');
    try {
      const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const LABELS: Record<string, string> = { running: 'Running...', done: 'Done', error: 'Failed' };
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      disabled={status === 'running'}
      className="gap-2"
    >
      {status === 'running' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}
      {LABELS[status] ?? label}
    </Button>
  );
}
