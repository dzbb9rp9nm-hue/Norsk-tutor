# Product roadmap

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
- Additional scenarios: hotel, transport, directions.

## Later: account and service improvements

- Cross-device syncing with sign-in and user-controlled deletion.
- Protected server-side API access with authentication and usage limits, instead of browser-stored keys.
- Improved voice service if real-device tests show browser speech is insufficient.
- Session summaries for longer context, preserving relevant learning history.

## Before publishing this release

Automated simulated behavior checks and desktop/mobile UI inspection are complete. A real Claude conversation and microphone/playback check on the user's intended device are still needed. No production publish is part of the current local build.
