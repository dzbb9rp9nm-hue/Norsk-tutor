# Norsk Tutor

> Account access is enabled. The owner confirmed sign-in, online saving, and access from a phone on 19 September. See [ACCOUNT-RELEASE.md](ACCOUNT-RELEASE.md) for configuration and remaining validation details.

A personal Norwegian Bokmål practice app for a beginner. Hosted as static files on Netlify, connected to the `main` branch of the GitHub repository.

## This release

- Each listening lesson also has a four-turn guided conversation: partner speech, an English response cue, an untimed answer pause, optional hint, model answer, and self-assessment. “Practise again” replies form a targeted review within that lesson. Ratings and positions are device-local, not account synced; speech is not recorded or automatically assessed.
- Four original **Listen & repeat** lessons: making plans, your day, travel changes, and opinions. English prompts, Bokmål examples, timed speaking pauses, recall rounds, replay, speed and pause controls, and transcripts. Playback uses device voices; a Norwegian voice is required. The app pauses playback when hidden. Lesson positions stay on the current device and are not part of account sync or learning backups. No recording or pronunciation scoring.
- 24 guided situations across food, travel, daily life, and social conversation, plus free conversation. Search and filter by topic.
- Norwegian-first tutoring, English help, and three stages of hints.
- Typed messages or microphone input, with editable transcripts by default.
- Optional hands-free conversation, with 3, 5, or 8 seconds of thinking time.
- Reply replay, slower playback, and an explicit stop button.
- Saved correction and speech-speed preferences.
- Structured recaps based on the text actually received, with no pronunciation claims.
- Saved sessions and drafts, a personal phrase notebook, and learning backup export/import.
- Request timeout/retry and cancellation when changing sessions.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765` in a browser. No dependency installation is needed. For a publication-ready preview with the security headers enabled, run `node scripts/build.cjs` and then `python3 scripts/preview.py`, and open `http://127.0.0.1:8766`.

For conversation, use Settings & connection to enter your own Claude API key. Starting a scenario and browsing phrase cards require no key. The key saved on the live website is separate from the key saved on localhost because browsers separate storage by website address.

## Files

- `index.html`: page structure and accessible controls.
- `styles.css`: desktop and mobile layout.
- `app.js`: lessons, microphone/playback, requests, and saved learning.
- `tutor-prompt.js`: teaching instructions.
- `scenarios.js`: the guided practice library.
- `_headers`: browser security and caching rules.
- `netlify.toml` and `scripts/build.cjs`: publish only the allowlisted app files.
- `SECURITY.md`: implemented protections and the pending cloud architecture.
- `tests/app.test.cjs`: automated behavior checks using simulated browser APIs and replies.

## Tests

With Node.js installed:

```sh
node --test tests/*.test.cjs
node --check app.js
```

The behavior checks cover draft restoration, failed/malformed replies, timeouts, retries without duplicate turns, stale requests and microphone callbacks, provisional speech endings, recaps, hints, playback cancellation, backup validation, and excluding credentials from exports. They do not call Anthropic or use a real microphone.

Before publishing, test a Norwegian and an English conversation on the intended Mac/iPhone browser, including microphone permission, playback, hands-free stopping, and a recap. Speech support and available Norwegian voices depend on the browser/device.

## Saved data and privacy

Learning is saved only in this browser, under `nt_learning_v1`. Preferences use `nt_preferences_v1`. The existing `nt_key` credential remains compatible with the previous app.

The API key and recent conversation text are sent directly to Anthropic. Browser speech recognition may use the browser vendor's service. When signed in, tutor requests go through the server and sessions/phrases sync to the account; the browser-key mode remains for signed-out use.

A learning export includes sessions, drafts, transcripts, recaps, and phrases; it excludes the API key and preferences. Import merges new sessions and phrases, retaining existing records with matching IDs. Keep backups if clearing browser data or moving devices. The app reports saving failures rather than claiming the data was saved.

Requests include the most recent 40 conversation messages, plus the active scenario and teaching instructions. Recaps are limited to that available context. The app does not measure language proficiency or pronunciation.

## Publishing

Netlify currently publishes `main`. This app remains static. `netlify.toml` runs `node scripts/build.cjs` and publishes only `dist/`, so tests, notes, database scripts and private configuration are excluded. Do not push a new version to `main` until it is ready to go live.

See `ROADMAP.md` for the remaining approved improvements.

## Current state (5 October 2026)

- **Live:** Netlify publishes automatically from `main` on the public GitHub repository. Pushing to `main` publishes, so push only what is ready to go live.
- **Accounts are active.** Email-and-password sign-in, online learning sync and the server-held tutor key have been in use since 19 September (confirmed by the owner on Mac and phone). Public signup stays disabled. See `ACCOUNT-RELEASE.md`.
- **What syncs:** sessions and phrase notebook. **What does not sync yet:** Listen & repeat lesson positions and guided-conversation ratings (`nt_audio_progress_v1`, `nt_audio_ratings_v1`), and preferences. These stay on the device where they were made.
- **Known gaps:** password-recovery email uses Supabase's limited default sender (no production SMTP yet); check whether the free Supabase project pauses after a period of inactivity.
- **Staying signed in:** a sign-in lasts 30 days; the server renews the short-lived Supabase token in the background.
- **Damaged or unrecognised records:** a saved session or phrase that can't be read is set aside (never deleted) instead of blocking the app or sync. Set-aside items can be downloaded from the notebook's recovery copy. Sessions from a scenario that was later renamed or removed reopen as free conversation.
- **Next planned work:** see `ROADMAP.md`.
