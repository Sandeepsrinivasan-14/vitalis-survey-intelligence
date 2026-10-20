'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { SURVEY_STATES } from '@/lib/survey/geography';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  href?: string;
  run?: () => void;
}

export const PALETTE_EVENT = 'vitalis:open-palette';

/** Global ⌘K / Ctrl+K launcher for navigation, state filters and theme. */
export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: 'home', label: 'Home', group: 'Go to', href: '/' },
      { id: 'overview', label: 'Survey overview', group: 'Go to', href: '/explore?tab=overview' },
      { id: 'fieldwork', label: 'Fieldwork progress and forecast', group: 'Go to', keywords: 'enrolment collectors burn-up', href: '/explore?tab=fieldwork' },
      { id: 'quality', label: 'Data quality', group: 'Go to', keywords: 'duplicates missing errors', href: '/explore?tab=quality' },
      { id: 'clinical', label: 'Salt and blood pressure', group: 'Go to', keywords: 'hypertension sodium clinical', href: '/explore?tab=clinical' },
      { id: 'records', label: 'Respondent records', group: 'Go to', keywords: 'table search', href: '/explore?tab=records' },
      { id: 'validate', label: 'Check a CSV file', group: 'Go to', keywords: 'upload validate', href: '/explore?tab=validate' },
      { id: 'brief', label: 'Executive brief (print)', group: 'Go to', keywords: 'report pdf summary', href: '/explore/report' },
      { id: 'roles', label: 'Role dashboards and sign in', group: 'Go to', keywords: 'login facility district state admin', href: '/roles' },
      ...SURVEY_STATES.map((s) => ({ id: `state-${s}`, label: `Filter survey to ${s}`, group: 'Filter', keywords: 'state', href: `/explore?state=${encodeURIComponent(s)}` })),
      {
        id: 'theme',
        label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`,
        group: 'Preferences',
        keywords: 'appearance dark light',
        run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
    ],
    [resolvedTheme, setTheme],
  );

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    returnFocus.current?.focus();
  }, []);

  const openPalette = useCallback(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) close();
        else openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, openPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, openPalette);
    };
  }, [open, close, openPalette]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    close();
    if (command.run) command.run();
    else if (command.href) router.push(command.href);
  };

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the dialog
    }
  };

  return (
    <div className="no-print fixed inset-0 z-[90] flex items-start justify-center bg-background/60 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="glass-strong w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-border/60 px-4">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            aria-label="Search commands"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, filters, settings…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" aria-label="Commands" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matching commands</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                id={`palette-${c.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm', i === active ? 'bg-accent text-accent-foreground' : 'text-foreground')}
              >
                <span>{c.label}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.group}
                  {i === active ? <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
