'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'framer-motion';

/** Theme (light / dark / system) and motion preferences for the whole app. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* reducedMotion="user" makes every framer-motion animation honour prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
