'use client';

import React, { useEffect, useCallback } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface ShortcutEntry {
  keys: string[];
  description: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutEntry[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['G', 'L'], description: 'Go to Leads' },
      { keys: ['G', 'P'], description: 'Go to Projects' },
      { keys: ['G', 'E'], description: 'Go to Estimates' },
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { keys: ['N'], description: 'New entity' },
      { keys: ['Cmd', 'K'], description: 'Command palette' },
    ],
  },
  {
    name: 'Search',
    shortcuts: [{ keys: ['Cmd', '/'], description: 'Toggle this help' }],
  },
];

interface ShortcutsHelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpOverlay({ isOpen, onClose }: ShortcutsHelpOverlayProps) {
  const handleToggle = useCallback(
    (e: KeyboardEvent) => {
      // Cmd+/ or Ctrl+/ to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, [isOpen, handleToggle]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md" data-testid="shortcuts-overlay">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>Use these shortcuts to navigate quickly.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {shortcutCategories.map((category) => (
            <div key={category.name}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category.name}</h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.description} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 &&
                            shortcut.keys.length === 2 &&
                            !['Cmd', 'Ctrl', 'Shift', 'Alt'].includes(shortcut.keys[0]) && (
                              <span className="text-xs text-muted-foreground mx-0.5">then</span>
                            )}
                          {idx > 0 &&
                            ['Cmd', 'Ctrl', 'Shift', 'Alt'].includes(shortcut.keys[0]) && (
                              <span className="text-xs text-muted-foreground mx-0.5">+</span>
                            )}
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Esc</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 text-xs bg-muted border rounded">Cmd+/</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { shortcutCategories };
