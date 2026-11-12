# Putting Norsk Tutor on your iPhone

The `native/` folder is an iPhone app shell. It opens the live website (norsktutor.netlify.app)
inside a real app and swaps the browser's speech engines for the iPhone's own ones, which keep
working with the screen locked and the phone in your pocket. Because the shell loads the live
site, every website update reaches the app automatically — you only rebuild in Xcode when
something inside `native/` changes, which is rare.

Honest note: this shell was prepared without a Mac or iPhone to test on. The first build may
hit a small bump or two — bring any error message back to Claude and we'll sort it.

## What you need

- Your Mac, with about 15 GB free for Xcode.
- Your iPhone and its charging cable.
- Your normal Apple ID (free). A paid Apple Developer account (£79/year) is only needed
  later, for the App Store.

## One-time setup on the Mac

Do these one at a time. Paste one line into Terminal, press Return, wait for it to finish.

1. Install **Xcode** from the Mac App Store (search "Xcode"; it's Apple's own app and the
   download is large — let it finish). Open it once, accept the licence, and let it install
   its iOS components when it offers.

2. Open **Terminal** and bring your project folder up to date:

       cd "$HOME/Claude/Projects/Norsk tutor"

   then:

       git pull

3. Move into the iPhone shell folder:

       cd native

4. Install the shell's parts (if this says `npm: command not found`, install Node first from
   nodejs.org — the "LTS" installer — then try again):

       npm install

5. Connect the parts to the iPhone project:

       npx cap sync ios

6. Open the project in Xcode:

       npx cap open ios

## In Xcode

1. Wait for the status bar (top centre) to finish "Resolving packages" — Xcode fetches what
   it needs by itself the first time.
2. Plug your iPhone into the Mac with the cable. On the phone, tap **Trust** if asked.
3. In Xcode's top bar, click the device name (it may say "Any iOS Device") and choose your
   iPhone from the list.
4. Click **App** in the left-hand file list (the blue icon at the very top), then the
   **Signing & Capabilities** tab. Tick **Automatically manage signing**, click **Team →
   Add an Account…**, and sign in with your Apple ID.
5. Press the **▶ play button** (top left). Xcode builds the app and puts it on your phone.
6. First time only, the phone will refuse to open it: on the iPhone go to **Settings →
   General → VPN & Device Management**, tap your Apple ID, tap **Trust**.

With a free Apple ID the app stops opening after 7 days — plug in and press ▶ again to
refresh it. A paid developer account removes that limit.

## What to test on the phone

This is the real-device test the roadmap has been waiting for:

- Start a hands-free conversation. You should hear the earcons and be able to say
  "repeat", "English", "hint" and so on.
- Lock the screen mid-conversation. The tutor's voice should keep playing; check whether
  listening resumes for your turn too — that result decides the next round of work.
- Compare the Norwegian voice with the browser one.

## Facts for later (App Store)

- The shell currently loads the live website. For an App Store submission we'll switch it
  to carry the app's files inside it and adjust sign-in — planned work, not started.
- App identity is `com.matthewmears.norsktutor` (change in `native/capacitor.config.json`
  before the first App Store upload if you prefer another).
- Microphone and speech-recognition permission texts live in `native/ios/App/App/Info.plist`,
  along with background audio ("UIBackgroundModes: audio") so sound continues when locked.
