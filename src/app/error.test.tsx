import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';

describe('ErrorPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('announces the error and lets the user retry', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage error={Object.assign(new Error('boom'), { digest: 'abc123' })} reset={reset} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('logs the error', () => {
    const error = new Error('boom');
    render(<ErrorPage error={error} reset={() => {}} />);
    expect(console.error).toHaveBeenCalledWith(error);
  });
});
