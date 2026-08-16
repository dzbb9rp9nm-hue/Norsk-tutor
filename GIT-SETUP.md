# Git + auto-deploy setup for Norsk Tutor

One-time setup, then deploying becomes "save and push" instead of dragging folders.

---

## What git actually does

Git takes a snapshot of your folder whenever you tell it to. Each snapshot is a **commit** — a labelled point you can return to. GitHub stores those snapshots online. Netlify watches GitHub and rebuilds your site whenever a new snapshot arrives.

Three jobs, three tools:

| Tool | Job |
|---|---|
| Git | Remembers every version, lets you go back |
| GitHub | Keeps that history online, off your laptop |
| Netlify | Publishes the site automatically when GitHub changes |

---

## Step 1 — Make the folder a repository

Open the Norsk tutor folder in VS Code (File → Open Folder), then open the terminal (Terminal → New Terminal) and run:

```bash
git init
git add .
git commit -m "Norsk Tutor: bilingual tutor, patient listening"
```

`git init` starts tracking. `git add .` stages everything. `git commit` saves the snapshot with a note describing it.

There's already a `.gitignore` file here listing `.DS_Store` — a junk file macOS scatters everywhere. Anything listed there is ignored by git.

## Step 2 — Put it on GitHub

In VS Code, open the Source Control panel (the branching icon in the left sidebar, or `Ctrl/Cmd + Shift + G`) and click **Publish to GitHub**. Choose **private** unless you want the code public.

That's it — VS Code creates the GitHub repository and uploads it.

## Step 3 — Connect Netlify

At app.netlify.com:

1. **Add new site → Import an existing project → GitHub**
2. Authorise Netlify, pick your Norsk Tutor repository
3. Leave build command and publish directory **empty** — there's nothing to build, it's one HTML file
4. Deploy

You'll get a new URL. In **Site configuration → Change site name** you can rename it, and if you'd rather keep your existing site's address, connect the repo to that site instead (its **Site configuration → Build & deploy → Link repository**).

---

## Your routine from then on

After any change to the file:

```bash
git add .
git commit -m "short note about what changed"
git push
```

Netlify picks it up within a minute or so and the live site updates. Or use the Source Control panel: type the message, click ✓ Commit, then Sync.

Commit whenever you finish something that works — small and often beats one giant snapshot. The message is for future-you: "added vocabulary notebook" is useful, "changes" isn't.

---

## The bit that makes it worth doing

**See what changed:** click a file in Source Control and VS Code shows old and new side by side, changed lines highlighted. Useful for reviewing edits before they go live.

**Go back:** if a change breaks the app —

```bash
git restore index.html          # undo edits you haven't committed yet
git log --oneline               # list past commits, each with a short ID
git revert <commit-id>          # undo one specific past commit
```

`git log` gives you lines like `a3f1c2e added vocabulary notebook`. That short code is the commit's ID.

**Netlify keeps its own history too:** the Deploys tab lists every published version with a "Publish deploy" button to roll the live site back instantly — handy if something breaks while you're out.

---

## Two habits worth keeping

**Never commit your API key.** It isn't in the code (it lives in your browser), so you're fine today. But if you ever add a file containing a key, add its name to `.gitignore` *before* committing — git remembers everything, so a key that's committed once stays in the history even after you delete it.

**Pull before you start** if you've edited from somewhere else: `git pull` fetches the latest version first, avoiding clashes.

---

## If you get stuck

Paste the error into Claude Code in VS Code — it can see the repository and run the commands itself. Git's error messages are famously unfriendly but the situations are nearly always recoverable; committed work is very hard to lose permanently.
