'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, LogIn, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { login } from '@/app/auth-actions';
import { ROLE_LABELS, isRole } from '@/lib/auth/roles';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rolePath = searchParams.get('role'); // e.g. "facility/dashboard"
  const next = searchParams.get('next');
  const roleKey = rolePath?.split('/')[0];
  const roleName = isRole(roleKey) ? ROLE_LABELS[roleKey] : null;
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({ email, password, next });
      if (!result.ok) {
        setError(result.error);
        toast({ variant: 'destructive', title: 'Sign-in failed', description: result.error });
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="glass gradient-ring w-full max-w-md rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-6 text-center">
          <span className="bg-brand-gradient mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-xl shadow-primary/30">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold">{roleName ? `Sign in as ${roleName}` : 'Sign in'}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {roleName ? `Enter your credentials to open the ${roleName} dashboard.` : 'Enter your credentials to open your dashboard.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign-in error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="name@organisation.org"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                required
                className="pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-pressed={reveal}
                aria-label="Reveal entered characters"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {reveal ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/roles">
              <ArrowLeft aria-hidden="true" />
              Back to role selection
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-10 h-96 w-full max-w-md rounded-3xl" />}>
      <LoginPageContent />
    </Suspense>
  );
}
