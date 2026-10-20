'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface the error to the console / any attached error-reporting tool.
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="glass mx-auto my-10 flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred while loading this page. You can try again, and if the problem
        persists please contact the site administrator.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
