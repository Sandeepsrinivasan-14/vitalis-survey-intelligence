import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/roles';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

/** Signed-in users have nothing to do on the login page; send them to their dashboard. */
export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);
  return children;
}
