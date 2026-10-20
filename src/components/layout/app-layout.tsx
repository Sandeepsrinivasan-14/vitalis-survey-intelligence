'use client';

import type { ReactNode } from 'react';
import { Activity, LayoutDashboard, LogIn, LogOut, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommandPalette, PALETTE_EVENT } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { logout } from '@/app/auth-actions';
import { ROLE_HOME, ROLE_LABELS, type Role } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  session?: { email: string; role: Role } | null;
}

// Pages where the "Sign in" button would be redundant.
const authPaths = ['/login', '/roles'];

export function AppLayout({ children, session }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const showLoginButton = !session && !authPaths.includes(pathname);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-50 rounded-none border-x-0 border-t-0">
        <nav aria-label="Main" className="container flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/" className="group flex items-center gap-2.5 font-semibold" aria-label="Vitalis home">
              <span className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-hover:rotate-6">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg tracking-tight">
                Vital<span className="text-gradient">is</span>
              </span>
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              {navLink('/', 'Home', pathname === '/')}
              {navLink('/explore', 'Explore', pathname.startsWith('/explore'))}
              {navLink(session ? ROLE_HOME[session.role] : '/roles', 'Dashboards', pathname === '/roles' || pathname.endsWith('/dashboard'))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              aria-haspopup="dialog"
              onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
            >
              <Search aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              <span className="sr-only sm:hidden">Open command palette</span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">Ctrl K</kbd>
            </Button>
            <ThemeToggle />
            {session ? (
              <>
                <Link href={ROLE_HOME[session.role]} className="hidden items-center gap-2 md:flex" title={session.email}>
                  <Badge variant="info">{ROLE_LABELS[session.role]}</Badge>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                  <span className="sr-only sm:hidden">Sign out</span>
                </Button>
              </>
            ) : (
              showLoginButton && (
                <Button asChild size="sm">
                  <Link href="/roles">
                    <LogIn aria-hidden="true" />
                    Admin/Role Login
                  </Link>
                </Button>
              )
            )}
          </div>
        </nav>
      </header>

      <CommandPalette />

      <main id="main-content" tabIndex={-1} className="container flex-grow py-8 focus:outline-none sm:py-10">
        {children}
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            &copy; {new Date().getFullYear()} Vitalis. All rights reserved.
          </p>
          <p>Demonstration data only. Every place and respondent is fictional.</p>
        </div>
      </footer>
    </div>
  );
}
