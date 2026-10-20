# Security policy

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting
(Security tab, "Report a vulnerability") and include steps to reproduce. You
will get an acknowledgement within a few days.

## What the application does

- Sessions are signed (HS256) httpOnly, SameSite cookies; passwords are stored as scrypt hashes.
- Role dashboards are enforced in middleware and again in each server action.
- Login, AI analysis and CSV export are rate limited (in memory, per instance).
- The survey model holds no names or direct identifiers.
- Security headers include a Content-Security-Policy, HSTS, frame denial and nosniff.

## Known limitations

- Rate limiting is per process. Behind several instances, use a shared store.
- The CSP still allows inline scripts and styles because Next.js injects inline bootstrap code; a nonce-based CSP is the next step.
- Accounts come from the `AUTH_USERS` environment variable. For many users, move them to a database with an identity provider.
- `npm audit --omit=dev` reports two advisories in PostCSS vendored inside Next.js (build-time CSS handling); they clear when Next.js updates it.
- The Explore area is public and serves synthetic data only. Put authentication in front of it before loading real data.
