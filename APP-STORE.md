# App Store checklist

What stands between the current iPhone shell (see NATIVE-SETUP.md) and Norsk Tutor on the
App Store. In rough order. Items marked **to-do** are real work; the rest is paperwork.

## Before submitting — real work

1. **Prove it on your own phone first.** Run the shell from Xcode and live with it for a
   while. The App Store step is only worth it once the call experience feels right.
2. **To-do: carry the app inside the shell.** The shell currently loads the live website.
   App Review is wary of apps that are only a wrapped site, and offline startup is poor.
   Switch `native/` to bundle the web files (`webDir` instead of `server.url`) and have the
   app talk to the server by address. This also needs sign-in to move from cookies to
   tokens — a proper work item for a later session.
3. **To-do: account deletion in the app.** Apple requires that any app with account
   creation also lets you delete the account from inside the app. The app has sign-out and
   data deletion, but not yet full account deletion.
4. **App icon and launch screen.** Needed in `native/ios/App/App/Assets.xcassets` — a
   1024×1024 icon, from which Xcode makes the rest.

## Paperwork

5. **Apple Developer Programme**, £79/year, at developer.apple.com — needed for TestFlight
   and the App Store. Enrol as an individual.
6. **App identity.** Bundle ID is `com.matthewmears.norsktutor` (set in
   `native/capacitor.config.json`); register the same ID in your developer account.
7. **Privacy policy URL**: https://norsktutor.netlify.app/privacy.html (already live).
8. **App Privacy questionnaire** (in App Store Connect), answered truthfully from
   privacy.html: collects email address and user content (learning data) linked to the
   user, for app functionality only; no tracking, no third-party advertising.
9. **Export compliance**: the app only uses standard HTTPS encryption — answer "exempt".
10. **Age rating**: 4+ (nothing objectionable).
11. **Screenshots**: taken on an iPhone once it runs well; Apple needs 6.7" and 6.1" sets.
12. **Review notes**: give App Review a demo account (email + password) so they can try the
    tutor, and one sentence on what the app does.

## Sensible route

TestFlight first: upload a build, install it on your own phone through the TestFlight app,
and use it for a week or two. It has the same paperwork but no public listing, surfaces
review-blocking issues early, and the free-Apple-ID 7-day reinstall chore goes away.
