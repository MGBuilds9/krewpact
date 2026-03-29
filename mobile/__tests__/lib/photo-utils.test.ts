jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}));

import { formatFileSize } from '@/lib/photo-utils';

describe('photo-utils', () => {
  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });

    it('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });
});
