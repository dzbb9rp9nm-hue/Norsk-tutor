# Account release — implemented locally, not activated

## Implemented

- Email-and-password sign-in for existing Supabase users; public signup remains disabled.
- Encrypted Secure, HttpOnly, SameSite=Strict host-only cookies. Access tokens never enter JavaScript storage; no refresh token is retained. Sessions last at most one hour, then require another email code.
- Same-origin POST requests with a custom request header, live identity verification, and workspace-owner binding.
- Server-held Claude credential, fixed tutor model/token budgets, IP limits and an atomic per-user allowance (150 requests per database day, at least three seconds apart). Failed tutor attempts also consume allowance.
- Account-specific caches containing learning and acknowledged revisions in one atomic browser write. Pending saves are derived from differences against those revisions and survive reload.
- Pull on sign-in, return to the window, explicit Sync now, and before queued writes. Reconnect triggers syncing. Concurrent changes require explicit version selection; local clocks never choose winners.
- Optional browser-to-account copy with a backup download, preserving the original browser workspace. Per-record deletion uses version-checked tombstones. Export/import remains available.

The static/browser-key workflow remains available while accounts are disabled. In an account workspace, tutor requests always use the server and never fall back to a browser key.

## Activation steps

1. Apply `database/002_tutor_limits.sql` to the existing Supabase project once. Do not rerun `001_learning.sql`.
2. In Supabase Authentication → Users, use **Send password recovery** for the existing account and set a Norsk Tutor password. Keep public signup and anonymous sign-in disabled. The app signs in with the email and password; recovery email delivery uses Supabase's configured sender. Configure production SMTP before depending on email recovery outside the project-team testing address. Keep the Site URL set to the intended website.
3. Set Netlify **Functions** environment variables from `.env.example`: the existing Supabase URL/publishable key, exact HTTPS `APP_ORIGIN`, a randomly generated 32-byte `SESSION_SECRET` encoded as 64 hex characters, and the Claude `ANTHROPIC_API_KEY`. Do not paste credentials into chat or source control. No Supabase service-role key is needed.
4. Deploy to an HTTPS preview with its exact `APP_ORIGIN` and `CLOUD_ENABLED=true`. Changing a secret requires a new deployment. Keep production cloud disabled until live checks pass.
5. Check email delivery and sign-in, real Claude replies, two real accounts with guessed record IDs, two devices editing concurrently, expired sign-in, offline pending saves, deletion, export/import restoration and sign-out. Check Netlify's deploy summary confirms the rate-limit rules. Confirm the second account cannot retrieve the first account's records through direct authenticated requests.
6. On the owner's browser, export learning, explicitly copy it to the account, wait for **Saved online and on this device**, and verify sessions/phrases from the other device before relying on cloud storage. Keep separate exports as backups. After verifying the account tutor works, remove the old browser key with **Settings → Forget key**.

## Verification and limits

The local Node tests cover browser behavior, simulated authentication/API responses, sync interleavings and an isolated PostgreSQL database with two simulated identities. They do not establish real email delivery, hosted account isolation, deployment routing, actual Claude access or real-device microphone behavior.

For the database test, install `@electric-sql/pglite` in a test directory and set `PGLITE_MODULE` to its module path when running `node --test tests/*.test.cjs`. Without it, that test explicitly skips.

Account caches remain on the device after sign-out. On a fresh page load, the app requires an online identity check before opening a cached account; fully offline reopening of an account is not implemented. An already-open account can keep edits offline. Preferences remain device-local. No automatic cloud backup service or account-deletion workflow has been activated; individual learning records can be deleted. The existing browser storage size limit includes both learning and sync receipts, so large accounts may need exports before migration.

Sources checked for implementation:
- [Supabase email codes](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Netlify function configuration](https://docs.netlify.com/build/functions/configuration/)
- [Netlify function rate limits](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)
