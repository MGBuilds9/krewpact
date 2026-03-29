import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LogsScreen from '@/app/(tabs)/logs';

describe('LogsScreen', () => {
  it('renders the Daily Logs header', () => {
    render(<LogsScreen />);
    expect(screen.getByText('Daily Logs')).toBeTruthy();
  });

  it('shows empty state when no project selected', () => {
    render(<LogsScreen />);
    expect(screen.getByText('Select a project to view daily logs.')).toBeTruthy();
  });
});
