import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShortcutsHelpOverlay } from '@/components/Layout/ShortcutsHelpOverlay';

// Mock Radix Dialog to render children directly for testability
vi.mock('@radix-ui/react-dialog', () => {
  const DialogRoot = ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog-root">{children}</div> : null;
  const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    (props, ref) => <div ref={ref} {...props} />,
  );
  DialogOverlay.displayName = 'DialogOverlay';
  const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} role="dialog" {...props}>
        {children}
      </div>
    ),
  );
  DialogContent.displayName = 'DialogContent';
  const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
  >((props, ref) => <h2 ref={ref} {...props} />);
  DialogTitle.displayName = 'DialogTitle';
  const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
  >((props, ref) => <p ref={ref} {...props} />);
  DialogDescription.displayName = 'DialogDescription';
  const DialogClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >((props, ref) => <button ref={ref} {...props} />);
  DialogClose.displayName = 'DialogClose';
  const DialogTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >((props, ref) => <button ref={ref} {...props} />);
  DialogTrigger.displayName = 'DialogTrigger';

  return {
    Root: DialogRoot,
    Portal: DialogPortal,
    Overlay: DialogOverlay,
    Content: DialogContent,
    Title: DialogTitle,
    Description: DialogDescription,
    Close: DialogClose,
    Trigger: DialogTrigger,
  };
});

// Mock lucide-react to avoid SVG rendering issues
vi.mock('lucide-react', () => ({
  Keyboard: () => <span data-testid="keyboard-icon">Keyboard</span>,
  X: () => <span>X</span>,
}));

describe('ShortcutsHelpOverlay', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ShortcutsHelpOverlay isOpen={false} onClose={onClose} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('renders the overlay when open', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays the keyboard icon in the header', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('keyboard-icon')).toBeInTheDocument();
  });

  it('displays all three shortcut categories', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('displays navigation chord shortcuts', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Go to Leads')).toBeInTheDocument();
    expect(screen.getByText('Go to Projects')).toBeInTheDocument();
    expect(screen.getByText('Go to Estimates')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('displays action shortcuts', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('New entity')).toBeInTheDocument();
    expect(screen.getByText('Command palette')).toBeInTheDocument();
  });

  it('displays search/help shortcut', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Toggle this help')).toBeInTheDocument();
  });

  it('shows "then" between chord keys (non-modifier sequences)', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    const thenElements = screen.getAllByText('then');
    // 4 navigation chords: G→L, G→P, G→E, G→D
    expect(thenElements.length).toBe(4);
  });

  it('shows "+" between modifier key combos', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    const plusElements = screen.getAllByText('+');
    // Cmd+K and Cmd+/ = 2 occurrences
    expect(plusElements.length).toBe(2);
  });

  it('renders kbd elements for shortcut keys', () => {
    const { container } = render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    const kbds = container.querySelectorAll('kbd');
    // G, L, G, P, G, E, G, D (navigation) + N (action) + Cmd, K (cmd palette) + Cmd, / (help) + Esc, Cmd+/ (footer) = 16
    expect(kbds.length).toBeGreaterThanOrEqual(12);
  });

  it('calls onClose when Cmd+/ is pressed while open', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: '/', metaKey: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Ctrl+/ is pressed while open', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: '/', ctrlKey: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not listen for close key when not open', () => {
    render(<ShortcutsHelpOverlay isOpen={false} onClose={onClose} />);
    fireEvent.keyDown(window, { key: '/', metaKey: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows close instructions in the footer', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/to close/)).toBeInTheDocument();
  });

  it('shows the description text', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Use these shortcuts to navigate quickly.')).toBeInTheDocument();
  });

  it('has data-testid on the overlay content', () => {
    render(<ShortcutsHelpOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByTestId('shortcuts-overlay')).toBeInTheDocument();
  });
});
