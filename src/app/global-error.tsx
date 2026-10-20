'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Rendered when the root layout itself fails; must provide its own <html> and <body>.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <main role="alert">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again.</p>
          {error.digest && <p style={{ fontSize: '0.75rem' }}>Error reference: {error.digest}</p>}
          <button type="button" onClick={reset} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
