# Player Hub — build checkpoints

One entry per stage. A new session can pick the work up from here without reading the chat.
Read `AUDIT_2026-09-08.md` first for why any of this is being done, then `README.md` for how the
app is put together, then `MIGRATION.md` for what is waiting on Panos in the Firebase console.

---

## Checkpoint 1 — Security rebuilt (2026-09-09) ✅ CODE DONE, CONSOLE STEPS PENDING

**What this stage was for:** the database was open to the internet. Anyone could read all six
player records, passwords in plain text included. Nothing else could be built until that was gone.

### Done

**Sign-in, rebuilt on Firebase Auth**
- `src/services/auth.js` (new): register, sign in, sign out, password reset, email verification,
  and `isAdmin()`. Firebase error codes are turned into plain sentences.
- No password is stored in Firestore any more. `emptyPlayerRecord` has no `password` and no `role`.
- `AuthContext` gets the signed-in user from `onAuthStateChanged` on every load. The old
  localStorage session — which a player could edit to make himself an admin — is gone.
- Admin = a document at `admins/{uid}`. The rules make that collection writable by nobody, so
  only the Firebase console can grant it. The `admin@admin.com` / `adminpw123` backdoor and the
  auto-fill button that typed it into the login form are deleted.
- A player is found by `authUid`, never by email. The email lookup is what made every record
  readable in the first place.
- New: **Forgot password** page, and an email verification banner with a resend.
- Every Firebase error code is turned into a plain sentence. A player never sees a code; the raw
  error still goes to the console in development.

**The rules (the actual security)**
- `firestore.rules` (new): a player reads and writes only his own record, and only the sections
  he owns — not `adminNotes`, not `authUid`, not `password`. An admin may read all, write notes,
  and carry an old record across. Nobody may delete. Everything not named is closed.
- `storage.rules` (new): `players/{uid}/…`, owner or admin only, images and PDFs, 15 MB cap.
  Ready for the passport and CV uploads in stage 3.
- `firebase.json` so the rules can be deployed by CLI later.

**Old records**
- Kept exactly where they are; nothing was moved, rewritten or deleted.
- A yellow panel on the admin overview lists them. When the player registers again with the same
  email, **Bring across** copies his footage onto his new account, deletes the leftover password,
  and marks the old document `mergedInto` so it drops off the list. **Clear password** does the
  password part alone, for a player who has not registered yet.

**Bugs fixed along the way** (they were in files the rebuild had to touch anyway)
- Two devices no longer overwrite each other: `onSnapshot` keeps the record live, and only the
  section that changed is written. Sections being edited are held back from incoming updates.
- Reordering works **downwards** as well as up. The old control was a drag handle that could not
  be dragged and only ever moved an item up.
- An admin note can be deleted (clearing the box used to do nothing).
- Two admin notes saved together no longer lose one — each is written at its own field path.
- ONE completion formula in `utils/completion.js`, used by the player and the admin. The same
  record used to show 100% to the admin and 77% to the player.
- "Newest first" sorts (it was subtracting two date strings and getting `NaN`).
- Basic link validation, and a warning for the `drive.google.com/drive/u/0/…` link that only
  works for the person who copied it.
- The JSON export never contains a password.

**Visual rebuild**
- Brand-grounded: navy `#191B4D` ground, `#A020CC` accent, Poppins — from the CK brand spec, so
  the app matches the guides and the PDFs rather than inventing a palette.
- Phone-first: full-screen sheets, 16px inputs (no iOS zoom), safe-area padding, reorder buttons
  that are reachable with a thumb, no horizontal scroll.
- New shared pieces: `AuthLayout`, `AppHeader`, `Brand` (logo + status pills), `Splash`,
  `ConfirmDialog` (replacing `window.confirm`), `SectionShell`, `ItemRow`, `ProgressPanel`.
- Tab title is "Pro Placement — Player Hub" (it said "frontend"), page is `noindex`.

**Housekeeping**
- `frontend/dev.mjs`: starts Vite with the right working directory. Without it Tailwind looks for
  its config in the wrong place and every custom colour silently vanishes (the path has spaces).
- ESLint config fixed: it was reporting components used only in JSX as unused. `npm run lint`
  is now 0 errors, 3 harmless fast-refresh warnings. `npm run build` clean.

### Verified
- Build and lint clean. Login, signup and forgot-password render and behave, desktop and phone.
- Firebase Auth is confirmed **not yet enabled** on the project: the Identity Toolkit API answers
  `CONFIGURATION_NOT_FOUND`. That is step 1 of `MIGRATION.md`.
- No account was created and no player data was moved during this work.

### Waiting on Panos — `MIGRATION.md`
1. Enable Email/Password sign-in.
2. Register, then add his own `admins/{uid}` document.
3. **Publish `firestore.rules` and `storage.rules`.** Until this is done the database is still open.
4. Ask the six players to register again, then Bring across; tell them to change that password
   anywhere they reused it.

### Not done on purpose
- The hub sections (identity, player card, contact, deliverables, platforms) — checkpoint 3.
- File uploads — the Storage rules are ready, the UI is checkpoint 3.
- "Send to Stage 3" — Panos parked it until the app is running.
- Submit-for-review and approve / needs-redo — Panos dropped them; feedback goes through Skool.

---

## Checkpoint 2 — the rest of the fixes and what the app is missing (next)

Planned: change email / position / name, an activity trail so it is visible who has gone quiet,
offline tolerance, a player-facing export, and the remaining items from `AUDIT_2026-09-08.md` §4.
Then a Codex review for what else would make it more effective.

## Checkpoint 3 — the hub

Sections A–E from `AUDIT_2026-09-08.md` §5c, the passport / CV / headshot uploads, and the
readiness panel. Videos stay links; documents become uploads.

## Checkpoint 4 — the CV generator

Panos's idea: hand a Claude session one player's hub data plus his standard CV template, and get
the finished CV back as a PDF.
