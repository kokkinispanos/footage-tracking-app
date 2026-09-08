# Player Hub — build checkpoints

One entry per stage. A new session can pick the work up from here without reading the chat.
Read `AUDIT_2026-09-08.md` first for why any of this is being done, then `README.md` for how the
app is put together, then `MIGRATION.md` for what is waiting on Panos in the Firebase console.

---

## Checkpoint 1 — Security rebuilt (2026-09-09) ✅ DONE, DEPLOYED, VERIFIED

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
  he owns — not `authUid`, not `password`. An admin may read every record and carry an old one
  across. Nobody may delete. Everything not named is closed.
- `storage.rules` (new): `players/{uid}/…`, owner or admin only, images and PDFs, 15 MB cap.
  Ready for the passport and CV uploads in stage 3.
- **Admin notes moved to their own `adminNotes` collection.** They used to sit on the player's
  record, and Firestore cannot hide a field from whoever reads the document — so the screen said
  "the player never sees this" while the player could read every word in his browser. Found by
  the Codex review; the old notes are carried over by the same admin button that cleans the record.
- Creation is key-whitelisted (a player could otherwise store arbitrary extra fields on his own
  record), `password` / `role` / `adminNotes` are now impossible to write on ANY operation rather
  than merely absent by convention, and an admin can no longer reassign `authUid` — ownership is
  not his to move.
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

### Reviewed independently
Codex (`gpt-5.6-sol`) audited the rules and the auth code. It confirmed: a stranger can read and
write nothing; a player cannot read another record, escalate to admin, or write a field he does
not own; the `authUid` query and the not-found path behave as intended; `affectedKeys()` and the
Storage syntax are used correctly. Its four real findings are all fixed above. Its remaining
advice is scheduled, not ignored:
- **Before uploads land (checkpoint 3):** do not hand out Firebase tokenised download URLs for a
  passport — possession of one bypasses the rules; restrict filenames and object counts; treat
  the browser-reported MIME type as untrusted.
- **Checkpoint 2:** rule tests on the Firebase emulator, which needs `firebase-tools` installed.
- **Operational:** MFA on the admin account, and a retention/deletion policy once identity
  documents exist.

### Verified
- Build and lint clean. Login, signup and forgot-password render and behave, desktop and phone.
- Firebase Auth is confirmed **not yet enabled** on the project: the Identity Toolkit API answers
  `CONFIGURATION_NOT_FOUND`. That is step 1 of `MIGRATION.md`.
- No account was created and no player data was moved during this work.

### Deployed
Merged to `main` and live at **https://footage-tracking-app.vercel.app** (2026-09-09). Verified on
the live site: new sign-in renders, the `admin@admin.com` auto-fill button is gone, deep links
route, no console errors. Firebase Auth is now ON (step 1 done). Email/password sign-in is NOT
gated by the Firebase authorized-domains list, so the Vercel domain needs no entry there.

**Rules published and verified closed (2026-09-09, 02:04).** An anonymous read of `players`,
`admins` and `adminNotes` all answer `PERMISSION_DENIED`. Before publishing, `players` returned
`200` with documents. The admin document is detected and the admin view loads.

Note for whoever reads this later: a first attempt published a *different* set of rules (written by
another assistant working in the Firebase console), which locked `/admins` but left `/players` open
to the internet — the worst of both. The fix was to paste this repo's `firestore.rules` whole.
Rules changes belong in this file and reach the console only as a paste of it.

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
