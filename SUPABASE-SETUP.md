# Supabase setup — current checkpoint

> **18 September local update:** Account sign-in, server tutor access, offline pending saves and conflict handling are now implemented locally, but are not published or activated. See [ACCOUNT-RELEASE.md](ACCOUNT-RELEASE.md) for configuration, verification and limitations. Earlier live-release notes below describe the deployed version.

## Verified on 13 September 2026

- Project URL: https://ncppqobinbmpdcwjjoen.supabase.co
- Dashboard name: Norak tutor, in Matthew's projects (Free, EU Ireland).
- The owner installed `database/001_learning.sql`; all three displayed SQL checks returned true. Do not rerun this initial creation migration.
- The owner reported creating their personal authentication user.
- Public auth settings verified over HTTPS using the supplied publishable key: public signup disabled, anonymous sign-in disabled, email sign-in enabled, email confirmation required.
- An unauthenticated SELECT against learning_records returned HTTP 401 / permission denied. This is the expected result; do not grant anonymous access to resolve it.
- The owner was guided to set Site URL to https://norsktutor.netlify.app; verify the saved value when configuring the callback.
- Local `.env.local` contains the supplied URL and publishable key for the forthcoming backend. It is ignored by Git and excluded from the website build. No secret key or password was requested or stored.

The app does not consume this configuration yet. No sign-in, online sync, or migration of conversations is active.

## Next work

## What Codex will then configure

- Keep the installed migration in source control; use subsequent migrations for any changes.
- Configure managed sign-in with an exact app redirect, initially invite-only for your personal account.
- Add the Netlify backend for private session cookies and server-held tutor credentials.
- Implement cloud sync with a local outbox, revision conflicts, account isolation and clear save status.
- Offer an explicit upload of the current browser's learning, then verify it from another device.
- Test separate accounts, expired sessions, failed saves, two-device edits, backup/restore and deletion before publication.

## Cost and resilience choice

Free is sufficient to configure and test this personal app, but it does not include automatic database backups, and inactive projects may pause after one week. Pro starts at USD 25/month and includes seven days of daily backups. We'll select the ongoing backup arrangement before depending on online storage. Do not choose a paid plan unless you want that cost.

Current source: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/backups (checked September 2026).

## Email delivery

Supabase's built-in sender only delivers to project-team email addresses and is currently limited to two messages per hour. It is intended for testing. Configure a production SMTP provider before relying on email sign-in for wider use. Do not enable public signup to address delivery errors.

Source: https://supabase.com/docs/guides/auth/auth-smtp

## Activation progress — 18 September 2026

- Owner checked `claim_tutor_request`: absent before installation.
- Owner ran `database/002_tutor_limits.sql` and reported “Success. No rows returned.” Do not rerun this migration.
- Next: use **Send password recovery** for the existing user to set a Norsk Tutor password; then hosting configuration and live verification.
