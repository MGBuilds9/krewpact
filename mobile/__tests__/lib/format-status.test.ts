import { formatStatus } from '@/lib/format-status';

describe('formatStatus', () => {
  it('replaces single underscore with space', () => {
    expect(formatStatus('on_hold')).toBe('on hold');
  });

  it('replaces multiple underscores with spaces', () => {
    expect(formatStatus('in_progress_now')).toBe('in progress now');
  });

  it('returns plain strings unchanged', () => {
    expect(formatStatus('active')).toBe('active');
  });

  it('handles empty string', () => {
    expect(formatStatus('')).toBe('');
  });

  it('handles common project statuses', () => {
    expect(formatStatus('on_hold')).toBe('on hold');
    expect(formatStatus('in_progress')).toBe('in progress');
    expect(formatStatus('completed')).toBe('completed');
    expect(formatStatus('cancelled')).toBe('cancelled');
  });

  it('handles common lead statuses', () => {
    expect(formatStatus('new')).toBe('new');
    expect(formatStatus('qualified')).toBe('qualified');
    expect(formatStatus('negotiation')).toBe('negotiation');
  });

  it('handles task statuses', () => {
    expect(formatStatus('todo')).toBe('todo');
    expect(formatStatus('in_progress')).toBe('in progress');
    expect(formatStatus('done')).toBe('done');
    expect(formatStatus('blocked')).toBe('blocked');
  });
});
