import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

import { toast } from 'sonner';
import { showToast } from '@/lib/toast';

const mockToast = vi.mocked(toast);

describe('showToast', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('success', () => {
    it('calls toast.success with message', () => {
      showToast.success('Record saved');
      expect(mockToast.success).toHaveBeenCalledWith('Record saved', { description: undefined });
    });

    it('calls toast.success with message and description', () => {
      showToast.success('Record saved', 'Changes applied to project');
      expect(mockToast.success).toHaveBeenCalledWith('Record saved', {
        description: 'Changes applied to project',
      });
    });
  });

  describe('error', () => {
    it('calls toast.error with message', () => {
      showToast.error('Something went wrong');
      expect(mockToast.error).toHaveBeenCalledWith('Something went wrong', {
        description: undefined,
      });
    });

    it('calls toast.error with message and description', () => {
      showToast.error('Save failed', 'Network error');
      expect(mockToast.error).toHaveBeenCalledWith('Save failed', {
        description: 'Network error',
      });
    });
  });

  describe('info', () => {
    it('calls toast.info with message', () => {
      showToast.info('Processing...');
      expect(mockToast.info).toHaveBeenCalledWith('Processing...', { description: undefined });
    });

    it('calls toast.info with message and description', () => {
      showToast.info('Syncing', 'This may take a moment');
      expect(mockToast.info).toHaveBeenCalledWith('Syncing', {
        description: 'This may take a moment',
      });
    });
  });

  describe('undo', () => {
    it('calls toast with message, 5s duration, and Undo action', () => {
      const onUndo = vi.fn();
      showToast.undo('Item deleted', onUndo);
      expect(mockToast).toHaveBeenCalledWith('Item deleted', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: onUndo,
        },
      });
    });

    it('passes through different undo callbacks', () => {
      const restore = vi.fn();
      showToast.undo('Lead archived', restore);
      const call = mockToast.mock.calls[0];
      const opts = call[1] as unknown as { action: { onClick: () => void } };
      opts.action.onClick();
      expect(restore).toHaveBeenCalledOnce();
    });
  });
});
