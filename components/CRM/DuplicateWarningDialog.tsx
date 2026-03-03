'use client';

import { useState } from 'react';
import type { DuplicateMatch } from '@/lib/crm/duplicate-detector';

interface DuplicateWarningDialogProps {
  matches: DuplicateMatch[];
  entityType: 'lead' | 'contact' | 'account';
  onMerge: (matchId: string) => void;
  onForceCreate: () => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  matches,
  entityType,
  onMerge,
  onForceCreate,
  onCancel,
}: DuplicateWarningDialogProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const matchTypeLabels: Record<string, string> = {
    exact_email: 'Exact email match',
    exact_phone: 'Exact phone match',
    exact_domain: 'Exact domain match',
    fuzzy_name: 'Similar name',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Potential duplicates found"
    >
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Potential Duplicates Found</h2>
        <p className="mb-4 text-sm text-gray-600">
          We found {matches.length} potential duplicate {entityType}(s). You can merge with an
          existing record or create a new one anyway.
        </p>

        <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => setSelectedMatch(match.id)}
              className={`w-full rounded border p-3 text-left transition ${
                selectedMatch === match.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{match.matchedValue}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {Math.round(match.similarity * 100)}% match
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {matchTypeLabels[match.matchType] ?? match.matchType} on {match.matchedField}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onForceCreate}
            className="flex-1 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100"
          >
            Create Anyway
          </button>
          <button
            type="button"
            onClick={() => selectedMatch && onMerge(selectedMatch)}
            disabled={!selectedMatch}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
