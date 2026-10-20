import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ROLE_DASHBOARDS } from '@/components/dashboard/role-config';
import { Stagger, StaggerItem } from '@/components/motion/reveal';
import { ROLES, ROLE_HOME, ROLE_LABELS } from '@/lib/auth/roles';

const SUMMARY: Record<(typeof ROLES)[number], string> = {
  facility: 'Upload facility data and track service performance.',
  district: 'Validate facility submissions and compare performance across the district.',
  state: 'Monitor every district, analyse state-wide trends and targets.',
  admin: 'Oversee system health, backups and user access.',
};

export default function RolesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <div className="space-y-3 text-center">
        <span className="bg-brand-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground shadow-xl shadow-primary/30">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-semibold sm:text-4xl">Choose your role</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          This area is for authorised personnel. Access is verified on the server, and each role can only open the
          dashboards it is permitted to see.
        </p>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((role) => {
          const Icon = ROLE_DASHBOARDS[role].icon;
          return (
            <StaggerItem key={role}>
              <Link
                href={`/login?role=${ROLE_HOME[role].slice(1)}`}
                className="glass group flex h-full flex-col gap-4 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{ROLE_LABELS[role]}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{SUMMARY[role]}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
