import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import DashboardScreen from '@/app/(tabs)/index';

const mockUseQuery = useQuery as jest.Mock;

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      isFetching: true,
    });
    const { toJSON } = render(<DashboardScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders error message on failure', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<DashboardScreen />);
    expect(screen.getByText(/Failed to load dashboard/i)).toBeTruthy();
  });

  it('renders dashboard header', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<DashboardScreen />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders KPI cards when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        atAGlance: {
          activeProjects: 5,
          openLeads: 12,
          pendingExpenses: 3,
          unreadNotifications: 7,
        },
        recentProjects: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<DashboardScreen />);
    expect(screen.getByText('Active Projects')).toBeTruthy();
    expect(screen.getByText('Open Leads')).toBeTruthy();
    expect(screen.getByText('Pending Expenses')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('renders recent projects list', () => {
    mockUseQuery.mockReturnValue({
      data: {
        atAGlance: {
          activeProjects: 1,
          openLeads: 0,
          pendingExpenses: 0,
          unreadNotifications: 0,
        },
        recentProjects: [
          { id: '1', project_name: 'Test Project', project_number: 'P-001', status: 'active' },
          { id: '2', project_name: 'Hold Project', project_number: 'P-002', status: 'on_hold' },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<DashboardScreen />);
    expect(screen.getByText('Test Project')).toBeTruthy();
    expect(screen.getByText('Hold Project')).toBeTruthy();
    // formatStatus should turn 'on_hold' into 'on hold'
    expect(screen.getByText('on hold')).toBeTruthy();
  });

  it('shows empty state when no recent projects', () => {
    mockUseQuery.mockReturnValue({
      data: {
        atAGlance: { activeProjects: 0, openLeads: 0, pendingExpenses: 0, unreadNotifications: 0 },
        recentProjects: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<DashboardScreen />);
    expect(screen.getByText('No projects to display.')).toBeTruthy();
  });
});
