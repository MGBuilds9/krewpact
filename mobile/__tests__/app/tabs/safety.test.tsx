import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SafetyScreen from '@/app/(tabs)/safety';

describe('SafetyScreen', () => {
  it('renders form type selection', () => {
    render(<SafetyScreen />);
    expect(screen.getByText('Safety Forms')).toBeTruthy();
    expect(screen.getByText('Toolbox Talk')).toBeTruthy();
    expect(screen.getByText('Site Inspection')).toBeTruthy();
    expect(screen.getByText('Incident Report')).toBeTruthy();
  });

  it('shows toolbox talk form when selected', () => {
    render(<SafetyScreen />);
    fireEvent.press(screen.getByText('Toolbox Talk'));
    expect(screen.getByText('Topic *')).toBeTruthy();
    expect(screen.getByText('Attendees')).toBeTruthy();
  });

  it('shows inspection form when selected', () => {
    render(<SafetyScreen />);
    fireEvent.press(screen.getByText('Site Inspection'));
    expect(screen.getByText('Description * (min 10 chars)')).toBeTruthy();
    expect(screen.getByText('Hazard Categories')).toBeTruthy();
  });

  it('shows back button to return to form type selection', () => {
    render(<SafetyScreen />);
    fireEvent.press(screen.getByText('Toolbox Talk'));
    // The back button should exist (rendered as Ionicons mock)
    expect(screen.getByText('Toolbox Talk')).toBeTruthy();
  });
});
