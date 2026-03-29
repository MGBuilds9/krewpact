import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MoreScreen from '@/app/(tabs)/more';

describe('MoreScreen', () => {
  it('renders profile info', () => {
    render(<MoreScreen />);
    expect(screen.getByText('Test User')).toBeTruthy();
    // Email appears in both profile card and Profile menu item subtitle
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('renders field operations section', () => {
    render(<MoreScreen />);
    expect(screen.getByText('Field Operations')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('CRM')).toBeTruthy();
  });

  it('renders sync section', () => {
    render(<MoreScreen />);
    expect(screen.getByText('Sync & Data')).toBeTruthy();
    expect(screen.getByText('Sync Conflicts')).toBeTruthy();
  });

  it('renders sign out option', () => {
    render(<MoreScreen />);
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('shows version string', () => {
    render(<MoreScreen />);
    expect(screen.getByText('KrewPact Mobile v0.1.0')).toBeTruthy();
  });
});
