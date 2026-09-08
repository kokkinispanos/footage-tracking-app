# Pro Placement — Player Hub

The private app where a signed player keeps everything about himself: his match footage, and
(from stage 3) his passport, CV, finished highlight reel, measured numbers and documents.

**It is not the public page and it is not the portal.** Three surfaces, one job each:

| Surface | What it is | Who sees it |
|---|---|---|
| **This app** — the Player Hub | what the player **gives** us | the player and admins, nobody else |
| `proplacement.cloud/p/<slug>` — the proof page | what **clubs see** | anyone with the link |
| `proplacement.cloud/portal` — the campaign portal | what is **happening now**: DMs to send, club replies, trials | the player |

Give / show / do.

---

## Layout

```
firestore.rules          THE SECURITY OF THE APP. Read this before changing anything.
storage.rules            Passport / CV / headshot uploads: owner and admin only.
firebase.json            So `firebase deploy --only firestore:rules` works if the CLI is installed.
MIGRATION.md             The console steps to switch sign-in on and close the database.
rules-tests/             60 tests that PROVE firestore.rules does what it says. `npm test`.
AUDIT_2026-09-08.md      Where this all came from: what was broken and what is planned.
frontend/
  dev.mjs                Starts Vite with the right working directory (the path has spaces).
  src/
    services/firebase.js   The Firebase handles + the on-device cache that makes it work offline.
    services/auth.js       WHO the user is. Passwords never come near our database.
    services/db.js         The player's RECORD. Found by authUid, never by email.
    context/AuthContext     The signed-in user, from Firebase on every load.
    context/PlayerContext   The record, kept live with onSnapshot, saved one section at a time.
    hooks/useOnlineStatus   Whether to tell him he is offline. Never used to decide what to save.
    utils/catalog.js        Positions, skill categories, photo types. ONE source of truth.
    utils/completion.js     ONE completion formula + the single "do this next" instruction.
    utils/activity.js       When he last added something, and when he last just looked.
    utils/export.js         The link sheet for the editor, and his raw data.
    utils/links.js          Link tidying and the mistakes we can actually catch.
    pages/                  Login, SignUp, ForgotPassword, Dashboard, Account, Admin*
    components/dashboard/   The five footage sections + next-step card, phone nav, shell, row
    components/ui/          Buttons, inputs, cards, modal, brand marks
```

## Running it

```bash
cd frontend
npm install
npm run dev
```

Then http://localhost:5173. (`npm run dev` and `node dev.mjs` do the same thing; the second one
works from any directory.)

Build: `npm run build`. Lint: `npm run lint`. Deploying the frontend is a push to `main` —
Vercel builds `frontend/`.

**Rules are not deployed by a push.** They live in the Firebase console. See `MIGRATION.md`.

## Testing the rules

```bash
cd rules-tests
npm install
npm test
```

Starts the Firestore emulator (needs Java), runs `firestore.rules` against 60 cases and exits
non-zero if any of them lets something through. **Run this before changing the rules and after.**
The rules are the only thing standing between a signed-in player and everyone else's data; a
comment saying they work is not evidence.

## The two rules that matter when you change anything

1. **The security is `firestore.rules`, not the React code.** Any check written only in the
   browser is a suggestion. If a player must not be able to do something, the rules must be what
   stops him. Before this was true, the whole database was readable by anyone on the internet.
2. **Videos are links, documents are uploads.** Full games, clips and photos stay as Google Drive
   or YouTube links — they are gigabytes, and the editor needs to open them in Drive anyway.
   Passports, CVs and headshots are real uploads into Firebase Storage, because an identity
   document must never be a public URL.

## Three things that look odd until you know why

- **`updatedAt` and `profile.lastSeenAt` are separate.** The first means he added something, the
  second that he opened the app. "He looks every day and adds nothing" and "he has vanished" are
  different problems and the admin list distinguishes them. Opening the app must never count as
  progress.
- **`profile.lastSeenAt` lives inside `profile`.** It would read better as a top-level field, but
  the rules only let a player write the named sections — a new top-level key would be refused.
  Nested keeps it legal without redeploying rules.
- **`authEmail` is not the same field as `profile.email`, and the difference matters.** The
  player writes `profile.email`; `authEmail` can only be written to the address Firebase says he
  is signed in as and has confirmed. Anything that decides who gets access to what — carrying an
  old record across, above all — must use `authEmail`. Matching on the one he can type is how one
  player ends up with another player's footage.
- **Changing an email uses `verifyBeforeUpdateEmail`, not `updateEmail`.** The confirmation goes
  to the new address, so a typo cannot lock a player out of his own account. It is also the only
  variant that still works with email-enumeration protection switched on.

## Who is an admin

Whoever has a document at `admins/{their Firebase Auth uid}`. That collection is writable by
nobody — only the Firebase console can create one. There is no admin password and no admin
login screen: an admin signs in like everyone else and the app notices.
