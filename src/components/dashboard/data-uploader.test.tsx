import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataUploader } from './data-uploader';
import type { ServiceCategory } from '@/data/mock-data';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const result: ServiceCategory[] = [{ id: 'c', name: 'Category', indicators: [] }];

describe('DataUploader', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders an accessible file input', () => {
    render(<DataUploader onDataUploaded={vi.fn()} transformFileData={vi.fn()} />);
    expect(screen.getByLabelText(/upload metrics/i)).toHaveAttribute('type', 'file');
    expect(screen.getByRole('button', { name: /select files/i })).toBeEnabled();
  });

  it('parses a CSV file and hands the transformed data to the callback', async () => {
    const onDataUploaded = vi.fn();
    const transformFileData = vi.fn().mockReturnValue(result);
    const user = userEvent.setup({ applyAccept: false });
    render(<DataUploader onDataUploaded={onDataUploaded} transformFileData={transformFileData} />);

    const file = new File(['name,value\nA,1\nB,2\n'], 'metrics.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/upload metrics/i), file);

    await waitFor(() => expect(onDataUploaded).toHaveBeenCalledWith(result, 'metrics.csv'));
    const [rows, type, name] = transformFileData.mock.calls[0];
    expect(type).toBe('csv');
    expect(name).toBe('metrics.csv');
    expect(rows[0]).toEqual(['name', 'value']);
  });

  it('reports an error for unsupported file types', async () => {
    const onDataUploaded = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<DataUploader onDataUploaded={onDataUploaded} transformFileData={vi.fn()} />);

    await user.upload(screen.getByLabelText(/upload metrics/i), new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(await screen.findByText(/invalid file type for notes\.txt/i)).toBeInTheDocument();
    expect(onDataUploaded).toHaveBeenCalledWith(null, 'notes.txt');
  });

  it('reports an error when the transform returns nothing', async () => {
    const onDataUploaded = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(<DataUploader onDataUploaded={onDataUploaded} transformFileData={vi.fn().mockReturnValue(null)} />);

    await user.upload(screen.getByLabelText(/upload metrics/i), new File(['a,b\n1,2'], 'bad.csv', { type: 'text/csv' }));

    expect(await screen.findByText(/failed to transform csv data from bad\.csv/i)).toBeInTheDocument();
    expect(onDataUploaded).toHaveBeenCalledWith(null, 'bad.csv');
  });
});
