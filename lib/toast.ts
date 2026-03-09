import { toast } from 'sonner';

/**
 * Centralized toast utility for consistent feedback across the app.
 *
 * Usage:
 *   import { showToast } from '@/lib/toast';
 *   showToast.success('Record saved');
 *   showToast.error('Something went wrong');
 *   showToast.info('Processing...');
 *   showToast.undo('Item deleted', () => restoreItem(id));
 */
export const showToast = {
  /**
   * Show a success toast (green checkmark).
   */
  success(message: string, description?: string) {
    return toast.success(message, { description });
  },

  /**
   * Show an error toast (red X).
   */
  error(message: string, description?: string) {
    return toast.error(message, { description });
  },

  /**
   * Show an informational toast (blue icon).
   */
  info(message: string, description?: string) {
    return toast.info(message, { description });
  },

  /**
   * Show a toast with an "Undo" action button and 5-second auto-dismiss.
   *
   * @param message - Text to display
   * @param onUndo  - Callback invoked when user clicks "Undo"
   */
  undo(message: string, onUndo: () => void) {
    return toast(message, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    });
  },
};
