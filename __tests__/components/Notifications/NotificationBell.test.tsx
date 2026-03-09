import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '@/components/Notifications/NotificationBell';

// Mock hooks
const mockNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockRealtimeSubscription = vi.fn();

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: (...args: unknown[]) => mockNotifications(...args),
  useMarkNotificationRead: () => ({
    mutate: mockMarkRead,
    isPending: false,
  }),
  useMarkAllNotificationsRead: () => ({
    mutate: mockMarkAllRead,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: (opts: unknown) => {
    mockRealtimeSubscription(opts);
    return { isSubscribed: true };
  },
}));

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: `notif-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test notification',
    message: 'Test message',
    channel: 'in_app',
    state: 'queued' as const,
    read_at: null,
    created_at: '2026-03-01T12:00:00Z',
    ...overrides,
  };
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders bell icon button with aria-label', () => {
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeDefined();
  });

  it('shows unread count badge when there are unread notifications', () => {
    const unread = [
      makeNotification({ id: 'n1', state: 'sent' }),
      makeNotification({ id: 'n2', state: 'delivered' }),
      makeNotification({ id: 'n3', state: 'queued' }),
    ];
    mockNotifications.mockReturnValue({
      data: unread,
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('hides badge when all notifications are read', () => {
    mockNotifications.mockReturnValue({
      data: [makeNotification({ state: 'read', read_at: '2026-03-01T13:00:00Z' })],
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    // Should not show a badge count
    expect(screen.queryByText('1')).toBeNull();
  });

  it('opens dropdown when bell is clicked', async () => {
    const notifications = [makeNotification({ id: 'n1', title: 'Task assigned' })];
    mockNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Task assigned')).toBeDefined();
    });
  });

  it('shows empty state when no notifications', async () => {
    mockNotifications.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeDefined();
    });
  });

  it('calls markRead when clicking an unread notification', async () => {
    const notifications = [makeNotification({ id: 'n1', title: 'New task', state: 'delivered' })];
    mockNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('New task')).toBeDefined();
    });

    fireEvent.click(screen.getByText('New task'));
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
  });

  it('does not call markRead for already read notifications', async () => {
    const notifications = [
      makeNotification({
        id: 'n1',
        title: 'Old task',
        state: 'read',
        read_at: '2026-03-01T13:00:00Z',
      }),
    ];
    mockNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Old task')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Old task'));
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('shows notification timestamps', async () => {
    const notifications = [
      makeNotification({ id: 'n1', title: 'Recent', created_at: new Date().toISOString() }),
    ];
    mockNotifications.mockReturnValue({
      data: notifications,
      isLoading: false,
      error: null,
    });

    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Recent')).toBeDefined();
      // Timestamp should be rendered (e.g., "less than a minute ago" or similar)
      const container = screen.getByText('Recent').closest('[data-notification]');
      expect(container?.querySelector('[data-timestamp]')).toBeDefined();
    });
  });

  it('subscribes to Realtime for notifications table', () => {
    render(<NotificationBell />);

    expect(mockRealtimeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'notifications',
        queryKeys: [['notifications', true]],
      }),
    );
  });
});
