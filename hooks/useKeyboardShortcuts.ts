'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutConfig {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  /** If true, shortcut is disabled when focus is in an input/textarea */
  ignoreInputs?: boolean;
}

/**
 * Chord shortcut: two-keystroke sequence (e.g., G then L).
 * No modifier keys on either keystroke — just plain keys in sequence.
 */
export interface ChordShortcutConfig {
  firstKey: string;
  secondKey: string;
  handler: () => void;
  /** If true, shortcut is disabled when focus is in an input/textarea. Default: true */
  ignoreInputs?: boolean;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

/** Timeout (ms) for the second key in a chord sequence */
const CHORD_TIMEOUT = 1000;

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  chords: ChordShortcutConfig[] = [],
) {
  const pendingChordRef = useRef<{ key: string; timestamp: number } | null>(null);
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const inInput = isInputElement(e.target);

      // --- Check for chord completion first ---
      if (pendingChordRef.current) {
        const pending = pendingChordRef.current;
        const elapsed = Date.now() - pending.timestamp;

        if (elapsed < CHORD_TIMEOUT) {
          for (const chord of chords) {
            if (
              pending.key === chord.firstKey.toLowerCase() &&
              e.key.toLowerCase() === chord.secondKey.toLowerCase() &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              if (chord.ignoreInputs !== false && inInput) {
                continue;
              }
              e.preventDefault();
              pendingChordRef.current = null;
              if (chordTimeoutRef.current) {
                clearTimeout(chordTimeoutRef.current);
                chordTimeoutRef.current = null;
              }
              chord.handler();
              return;
            }
          }
        }

        // Second key didn't match any chord — clear pending
        pendingChordRef.current = null;
        if (chordTimeoutRef.current) {
          clearTimeout(chordTimeoutRef.current);
          chordTimeoutRef.current = null;
        }
      }

      // --- Check if this key starts a chord ---
      if (chords.length > 0 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const startsChord = chords.some(
          (chord) => chord.firstKey.toLowerCase() === e.key.toLowerCase(),
        );
        if (startsChord) {
          // Check ignoreInputs for all chords starting with this key
          const allIgnoreInput = chords
            .filter((c) => c.firstKey.toLowerCase() === e.key.toLowerCase())
            .every((c) => c.ignoreInputs !== false);
          if (allIgnoreInput && inInput) {
            // All chords with this first key ignore inputs and we're in an input
            // Fall through to single-key shortcuts
          } else {
            pendingChordRef.current = { key: e.key.toLowerCase(), timestamp: Date.now() };
            chordTimeoutRef.current = setTimeout(() => {
              pendingChordRef.current = null;
              chordTimeoutRef.current = null;
            }, CHORD_TIMEOUT);
            // Don't preventDefault here — let the first key pass through
            // (it might be a regular 'g' keypress if the user doesn't follow up)
            return;
          }
        }
      }

      // --- Single-key shortcuts ---
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.metaKey ? e.metaKey || e.ctrlKey : true;
        const shiftMatch =
          shortcut.shiftKey !== undefined ? e.shiftKey === shortcut.shiftKey : true;

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && shiftMatch) {
          if (shortcut.ignoreInputs !== false && inInput) {
            continue;
          }
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, chords],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (chordTimeoutRef.current) {
        clearTimeout(chordTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);
}
