'use client';

import { useParams } from 'next/navigation';

import { type MeetingNote, usePortalMeetings } from '@/hooks/usePortalProject';

function MeetingCard({ note }: { note: MeetingNote }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">{note.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(note.meeting_date).toLocaleDateString('en-CA', {
              dateStyle: 'long',
            })}
          </p>
        </div>
        {note.attendees && note.attendees.length > 0 && (
          <p className="text-xs text-gray-500">
            {note.attendees.length} attendee{note.attendees.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      {note.summary && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.summary}</p>
        </div>
      )}
      {note.action_items && note.action_items.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Action Items
          </p>
          <ul className="space-y-1">
            {note.action_items.map((item, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MeetingsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="h-32 rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export default function MeetingsPageContent() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, loading, error } = usePortalMeetings(projectId);

  const notes = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Meeting Notes</h2>
        {data && (
          <span className="text-sm text-gray-500">
            {data.total} meeting{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {loading && <MeetingsSkeleton />}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && notes.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          No meeting notes have been shared for this project yet.
        </div>
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="space-y-4">
          {notes.map((note) => (
            <MeetingCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
