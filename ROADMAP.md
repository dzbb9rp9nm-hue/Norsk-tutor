# Product roadmap

## Up next (agreed 5 October 2026)

Done 18 October 2026: tutor moved to Claude Sonnet 5.5; Easier / Just right / Stretch me setting ("difficulty adjustment" below).

1. ~~**Sync audio-lesson progress.**~~ Built 10 October 2026, together with changed-since sync downloads. Live 18 October 2026 (migration 003 run in Supabase).
2. **Daily "Today" practice.** About 10 minutes: spaced review of saved phrases and recap corrections, then a short conversation that must use them. Builds on "learning that carries over" below. First step done 18 October: the tutor now brings recent recap corrections and saved phrases back into conversation.
3. **Phone-in-pocket call mode.** Fully hands-free conversation on iPhone; depends on real-device tests of browser mic/speech behaviour.

Housekeeping: production SMTP for recovery email; confirm Supabase inactivity pausing.


> **Status (5 October 2026):** Accounts, server tutor and online sync are live (activated 19 September). Listen & repeat lessons and guided conversations shipped 27 September. The "finish the account connection" steps further down are complete and kept for history.

The user approved a broader set of recommendations. This implementation delivers the proposed first release, plus the phrase notebook and backups. Remaining work is recorded here so it is not mistaken for completed functionality.

## Implemented first release

- Dependable session cancellation, timeout, retry, and validated replies.
- Guided café, introductions, shopping, and free conversation.
- Typed input and optional review of speech before sending.
- Replay, slower playback, visible microphone language, adjustable pause time.
- Hint, sentence starter, full answer progression.
- Persistent correction and speed preferences.
- Beginner phrase cards, saved sessions/drafts, structured recaps.
- Phrase notebook with audio, export/import backup.
- Responsive layout, accessible controls, page zoom.

## Next: learning that carries over

- Short spaced reviews of saved phrases, including active recall and speaking.
- Immediate practice of recap corrections in a fresh example.
- User-editable tutor memory: interests, preferences, and learning needs.
- Difficulty adjustment with explicit Too easy / Too hard controls.
- Suggested daily practice selected from learning history (the current café suggestion is fixed).
- Practical progress goals supported by session history, without claiming official language levels.
- Additional scenarios: implemented — 24 guided situations, including hotel, transport, directions and everyday activities.

## Later: account and service improvements

- Cross-device syncing with sign-in and user-controlled deletion.
- Protected server-side API access with authentication and usage limits, instead of browser-stored keys.
- Improved voice service if real-device tests show browser speech is insufficient.
- Session summaries for longer context, preserving relevant learning history.

## September security/scenario release

24 guided scenarios, search/topic filters, an allowlisted publish directory, security headers, stricter backup/reply validation, local save status, corruption recovery export and concurrent-tab write protection are implemented. See SECURITY.md for exact scope.

The owner authorized publication on 13 September 2026. Automated behavior/build tests pass; desktop/mobile UI was inspected locally. Automated tests simulate tutor responses and speech; a new real microphone/Claude check on the owner's device is not included in this release's verification.

## Next session: finish the account connection

Supabase exists and the initial schema is installed. Public signup and anonymous sign-in are disabled; email sign-in is enabled. A live request without a signed-in user was denied access to learning_records. No conversations have been migrated.

1. Implement and test the Netlify authentication backend, private session cookies, and server-held Claude credential.
2. Configure exact email callbacks and dependable email delivery; current built-in Supabase email is testing-only.
3. Implement account-isolated cloud sync with offline pending saves and explicit conflict handling.
4. Test two real accounts, two devices, expired sessions, offline saves, deletion and backup restoration.
5. Export the owner's existing browser learning, offer explicit migration, and verify the online copy before relying on it.

Keep browser backup export/import available throughout. No paid service has been purchased.
