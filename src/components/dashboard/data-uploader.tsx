"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import Papa from 'papaparse';
import { AlertCircle, Download, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { SheetData } from '@/types/sheet';
import type { ServiceCategory } from '@/data/mock-data';
import { cn } from '@/lib/utils';

type FileType = 'csv' | 'excel';

interface DataUploaderProps {
  onDataUploaded: (data: ServiceCategory[] | null, fileName?: string) => void;
  transformFileData: (fileData: SheetData, fileType: FileType, fileName: string) => ServiceCategory[] | null;
  /** Visible label of the file input. */
  label?: string;
  /** Optional link to a downloadable CSV template. */
  templateHref?: string;
  /** Reports when parsing starts and ends so the page can show skeletons. */
  onLoadingChange?: (loading: boolean) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function parseCsv(file: File): Promise<SheetData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as SheetData),
      error: (err: Error) => reject(new Error(err.message || `Failed to parse CSV file: ${file.name}.`)),
    });
  });
}

async function parseExcel(file: File): Promise<SheetData> {
  // Loaded on demand: only when an Excel file is actually chosen. Reads .xlsx only.
  const { readSheet } = await import('read-excel-file/browser');
  const rows = await readSheet(file).catch(() => {
    throw new Error(`Failed to read the Excel file: ${file.name}. Make sure it is a valid .xlsx workbook.`);
  });
  if (!rows.length) throw new Error(`Excel file ${file.name} contains no data in its first sheet.`);
  return rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : cell instanceof Date ? cell.toISOString().slice(0, 10) : cell))) as SheetData;
}

export function DataUploader({
  onDataUploaded,
  transformFileData,
  label = 'Upload metrics (CSV or Excel)',
  templateHref,
  onLoadingChange,
}: DataUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    const name = file.name.toLowerCase();
    let type: FileType;
    let rows: SheetData;
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name} is larger than 10 MB. Please upload a smaller file.`);
    }
    if (name.endsWith('.csv') || file.type === 'text/csv') {
      type = 'csv';
      rows = await parseCsv(file);
    } else if (name.endsWith('.xlsx')) {
      type = 'excel';
      rows = await parseExcel(file);
    } else {
      throw new Error(`Invalid file type for ${file.name}. Please upload a CSV or .xlsx file.`);
    }
    if (!rows || rows.length === 0) {
      throw new Error(`Uploaded ${type.toUpperCase()} file (${file.name}) is empty or could not be parsed correctly.`);
    }
    const transformed = transformFileData(rows, type, file.name);
    if (!transformed) {
      throw new Error(`Failed to transform ${type.toUpperCase()} data from ${file.name}. The file structure was not recognised.`);
    }
    onDataUploaded(transformed, file.name);
    toast({ title: 'Data loaded', description: `${file.name} processed successfully.` });
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setIsLoading(true);
    onLoadingChange?.(true);
    setError(null);

    for (const file of list) {
      setProcessingFileName(file.name);
      try {
        await processFile(file);
      } catch (e) {
        const message = e instanceof Error ? e.message : `An unknown error occurred processing ${file.name}.`;
        console.error(`Error with file ${file.name}:`, e);
        setError(message);
        onDataUploaded(null, file.name);
        toast({ variant: 'destructive', title: `Processing error: ${file.name}`, description: message });
      }
    }

    setIsLoading(false);
    onLoadingChange?.(false);
    setProcessingFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isLoading) void handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'glass rounded-2xl border-2 border-dashed p-5 transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background sm:p-6',
        isDragging ? 'scale-[1.01] border-primary bg-accent/60' : 'border-border',
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-base font-semibold text-foreground">
            {label}
          </label>
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {isLoading
              ? `Processing ${processingFileName ?? 'file'}...`
              : 'Drag and drop files here, or choose them from your device. Up to 10 MB each.'}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onChange}
          disabled={isLoading}
          className="sr-only"
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
            Select files
          </Button>
          {templateHref && (
            <Button asChild variant="outline">
              <a href={templateHref} download>
                <Download aria-hidden="true" />
                CSV template
              </a>
            </Button>
          )}
        </div>
      </div>
      {error && !isLoading && (
        <Alert variant="destructive" className="mt-4 text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Last encountered error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
