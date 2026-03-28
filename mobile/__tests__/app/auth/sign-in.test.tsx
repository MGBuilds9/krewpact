import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SignInScreen from '@/app/(auth)/sign-in';

describe('SignInScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SignInScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the KrewPact brand name', () => {
    render(<SignInScreen />);
    expect(screen.getByText('KrewPact')).toBeTruthy();
  });

  it('renders the tagline', () => {
    render(<SignInScreen />);
    expect(screen.getByText('Field Operations Platform')).toBeTruthy();
  });

  it('renders Sign In title and button', () => {
    render(<SignInScreen />);
    // Both the title and button have "Sign In" text — getAllByText handles multiples
    const elements = screen.getAllByText('Sign In');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders email and password labels', () => {
    render(<SignInScreen />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
  });

  it('renders email input with correct placeholder', () => {
    render(<SignInScreen />);
    expect(screen.getByPlaceholderText('you@yourcompany.com')).toBeTruthy();
  });
});
