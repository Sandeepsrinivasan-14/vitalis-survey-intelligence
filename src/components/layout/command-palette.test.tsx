import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './command-palette';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

describe('CommandPalette', () => {
  beforeEach(() => pushMock.mockClear());

  it('is hidden until Ctrl+K is pressed, then closes on Escape', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /search commands/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters commands as you type and navigates on Enter', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'quality');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Data quality');
    await user.keyboard('{Enter}');
    expect(pushMock).toHaveBeenCalledWith('/explore?tab=quality');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the active option with the arrow keys and exposes it to assistive tech', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Control>}k{/Control}');
    const box = screen.getByRole('combobox');
    const first = screen.getAllByRole('option')[0];
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', first.id);
    await user.keyboard('{ArrowDown}');
    const second = screen.getAllByRole('option')[1];
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', second.id);
  });

  it('offers a filter shortcut for each fictional state and says when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'sunreach');
    await user.keyboard('{Enter}');
    expect(pushMock).toHaveBeenCalledWith('/explore?state=Sunreach');

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(screen.getByText(/no matching commands/i)).toBeInTheDocument();
  });
});
