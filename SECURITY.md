# Security and resilience

## Implemented in the security/scenario release

- Strict Netlify Content Security Policy: only local scripts/styles; only the app and Anthropic may receive fetch requests. No inline scripts, eval, plugins, external frames, or form submissions. Frame embedding is blocked, with anti-sniffing, no-referrer, HTTPS and restricted browser-permission headers.
- An allowlisted build copies only six app assets into `dist/`. Tests, documentation, database scripts, environment files and repository internals are not published.
- Model replies and backups are data, rendered with textContent, never innerHTML. Invalid shapes, oversized inputs, duplicate IDs and invalid conversation roles are rejected. Imports validate the combined data before altering memory.
- A browser write lock (where supported) prevents multiple tabs writing simultaneously. Other browsers still compare stored copies and respond to storage changes; that fallback is change detection, not a transactional multi-tab guarantee.
- Corrupt or unexpectedly changed stored data blocks writes rather than replacing it. The current in-memory learning can be exported; the old raw copy has a separate recovery download. Storage-limit errors show Not saved.
- Late replies, failed requests, timeouts and cancelled recognition cannot silently append into a different session. No automatic retries of paid tutor calls.
- No analytics, ad scripts, external fonts, file upload service, payments or third-party client libraries have been added.

These controls reduce risk; they do not make a browser application immune to attack. HTTP headers take effect on Netlify or a preview server that applies them, not when opening a file directly.

## Existing limitation

The app still stores the user's Claude key in browser storage and calls Anthropic directly. That key is not in source code or learning backups, but same-origin script execution could access it. This iteration does NOT claim to have moved the key to a server. Database sign-in and cloud syncing are NOT active yet.

## Cloud design to implement after project setup

1. Supabase Auth for managed passwordless sign-in. Start invite-only for this personal app; disable public sign-ups. Use exact redirect URLs. Configure rate limits, short-lived one-time links/codes and production email delivery. Enable MFA for the Supabase/GitHub/Netlify administration accounts.
2. A small same-origin Netlify backend validates sessions and owns the Claude credential. Use Secure, HttpOnly, SameSite cookies, checked request origins and CSRF protection for mutations. No long-lived auth tokens in browser localStorage. Never send service-role credentials to the browser.
3. Database row-level security associates records with verified user IDs, not user-supplied ownership fields. Prepared `database/001_learning.sql` allows owner reads and a restricted version-checked write function. It passed an isolated PGlite/PostgreSQL test with simulated Supabase auth roles and two user identities. The owner installed it on hosted Supabase and all three SQL verification flags were true. A live unauthenticated read returned HTTP 401 with permission denied. Hosted two-account isolation and authenticated writes still require testing.
4. Use revision checks and separate conflict copies when devices edit the same record. A server revision is authoritative; device clocks must not decide which draft is lost. Keep a local outbox for offline edits and acknowledge Saved online only after a confirmed server write. Cache/outbox must be isolated by user and handled explicitly on sign-out/account switch.
5. Validate all incoming records again on the server. Bound sizes, record counts, request durations and per-user/IP request rates. Keep the model and token limits server-controlled. Do not trust a language-model answer for permissions or database operations.
6. Backups are separate from syncing. Before migration, export the current browser data; copy to the account only with explicit user action, and verify counts/checksums before offering to remove the original. Exercise a restore into an isolated test project.
7. Verify two separate test accounts cannot read, write, delete or infer each other's learning, including direct API calls. Test expired sessions, concurrent revisions, duplicate retries, offline edits, partial failures, sign-out and restores before deployment.

## Backup service choice

Supabase Free does not include managed automatic database backups and may pause after a week of inactivity. Pro starts at USD 25/month and includes seven days of daily database backups. Free is suitable for setup/testing with manual exports; choose the operational backup policy before relying on the database as the only copy. No paid service has been purchased.

Verified September 2026:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/pricing
- https://docs.netlify.com/manage/routing/headers/
