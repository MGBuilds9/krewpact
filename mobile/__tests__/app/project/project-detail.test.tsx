import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import ProjectDetailScreen from '@/app/project/[id]';

const mockUseQuery = useQuery as jest.Mock;

const mockProject = {
  id: 'test-project-id',
  project_name: 'Telecom Infrastructure Phase 1',
  project_number: 'MDM-2026-001',
  status: 'active',
  start_date: '2026-01-15',
  target_completion_date: '2026-09-30',
};

const mockTask = {
  id: 'task-1',
  title: 'Install conduit',
  status: 'in_progress',
  due_at: null,
};

describe('ProjectDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      isFetching: true,
    });
    const { toJSON } = render(<ProjectDetailScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders project not found state when no project', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      });
    render(<ProjectDetailScreen />);
    expect(screen.getByText('Project not found.')).toBeTruthy();
  });

  it('renders project name and number', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: mockProject,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      });
    render(<ProjectDetailScreen />);
    expect(screen.getByText('Telecom Infrastructure Phase 1')).toBeTruthy();
    expect(screen.getByText('MDM-2026-001')).toBeTruthy();
  });

  it('renders project status with formatStatus applied', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: { ...mockProject, status: 'on_hold' },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      });
    render(<ProjectDetailScreen />);
    expect(screen.getByText('on hold')).toBeTruthy();
  });

  it('renders tasks section', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: mockProject,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: [mockTask],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      });
    render(<ProjectDetailScreen />);
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Install conduit')).toBeTruthy();
    expect(screen.getByText('in progress')).toBeTruthy();
  });

  it('renders empty tasks state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: mockProject,
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
        isFetching: false,
      });
    render(<ProjectDetailScreen />);
    expect(screen.getByText('No tasks for this project.')).toBeTruthy();
  });
});
