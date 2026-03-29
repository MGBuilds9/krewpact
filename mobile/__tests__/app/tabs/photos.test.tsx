import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PhotosScreen from '@/app/(tabs)/photos';

describe('PhotosScreen', () => {
  it('renders the Site Photos header', () => {
    render(<PhotosScreen />);
    expect(screen.getByText('Site Photos')).toBeTruthy();
  });

  it('shows photo count', () => {
    render(<PhotosScreen />);
    expect(screen.getByText('0 photos')).toBeTruthy();
  });

  it('shows empty state message', () => {
    render(<PhotosScreen />);
    expect(screen.getByText(/No photos yet/)).toBeTruthy();
  });

  it('shows Take Photo button', () => {
    render(<PhotosScreen />);
    expect(screen.getByText('Take Photo')).toBeTruthy();
  });

  it('shows Library button', () => {
    render(<PhotosScreen />);
    expect(screen.getByText('Library')).toBeTruthy();
  });
});
