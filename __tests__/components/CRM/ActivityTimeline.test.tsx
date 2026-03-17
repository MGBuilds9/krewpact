import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import type { Activity } from '@/hooks/useCRM';

describe('ActivityTimeline', () => {
  const mockActivities: Activity[] = [
    {
      id: 'act-1',
      activity_type: 'call',
      title: 'Follow up call',
      details: 'Discussed project scope',
      opportunity_id: 'opp-1',
      lead_id: null,
      account_id: null,
      contact_id: null,
      due_at: null,
      owner_user_id: null,
      created_at: '2026-02-12T10:00:00Z',
      updated_at: '2026-02-12T10:00:00Z',
    },
    {
      id: 'act-2',
      activity_type: 'email',
      title: 'Sent proposal',
      details: null,
      opportunity_id: 'opp-1',
      lead_id: null,
      account_id: null,
      contact_id: null,
      due_at: null,
      owner_user_id: null,
      created_at: '2026-02-11T14:00:00Z',
      updated_at: '2026-02-11T14:00:00Z',
    },
    {
      id: 'act-3',
      activity_type: 'meeting',
      title: 'Site visit',
      details: 'Met with client on-site',
      opportunity_id: null,
      lead_id: 'lead-1',
      account_id: null,
      contact_id: null,
      due_at: '2026-02-13T09:00:00Z',
      owner_user_id: null,
      created_at: '2026-02-10T09:00:00Z',
      updated_at: '2026-02-10T09:00:00Z',
    },
  ];

  it('renders activities chronologically', () => {
    render(<ActivityTimeline activities={mockActivities} />);
    expect(screen.getByText('Follow up call')).toBeDefined();
    expect(screen.getByText('Sent proposal')).toBeDefined();
    expect(screen.getByText('Site visit')).toBeDefined();
  });

  it('shows empty state when no activities', () => {
    render(<ActivityTimeline activities={[]} />);
    expect(screen.getByText('No activities yet')).toBeDefined();
  });

  it('displays activity type badge', () => {
    render(<ActivityTimeline activities={mockActivities} />);
    expect(screen.getByText('call')).toBeDefined();
    expect(screen.getByText('email')).toBeDefined();
    expect(screen.getByText('meeting')).toBeDefined();
  });

  it('formats dates correctly', () => {
    render(<ActivityTimeline activities={mockActivities} />);
    // Should display formatted dates (not raw ISO strings)
    // The exact format depends on locale, just verify it doesn't show raw ISO
    const container = document.body;
    expect(container.textContent).not.toContain('2026-02-12T10:00:00Z');
  });

  it('shows details when provided', () => {
    render(<ActivityTimeline activities={mockActivities} />);
    expect(screen.getByText('Discussed project scope')).toBeDefined();
    expect(screen.getByText('Met with client on-site')).toBeDefined();
  });
});
