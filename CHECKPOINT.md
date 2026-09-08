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
  — DONE in checkpoint 2: `rules-tests/`, 47 tests, all passing.
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

## Checkpoint 2 — the rest of the fixes, and what the app was missing (2026-09-09) ✅ DONE

**What this stage was for:** checkpoint 1 made the app safe. This one makes it usable. Everything
here is from `AUDIT_2026-09-08.md` §4 — the things a player or an admin would simply expect and
that were not there.

### Done

**Offline tolerance** (§4: "a player on stadium wifi loses what he typed")
- Firestore now keeps an IndexedDB cache (`persistentLocalCache` + `persistentMultipleTabManager`
  in `services/firebase.js`). A write goes to the device first and is sent when the connection
  returns, even if he closes the tab and comes back tomorrow.
- `hooks/useOnlineStatus.js` drives an honest header pill: offline reads
  "Offline — saved on this device", not a "Saving…" that never finishes, and the dashboard
  explains what is happening in a sentence.
- Multi-tab is deliberate: he has the hub open on his phone and his laptop.

**Account settings** — new page at `/account`, reached from the header menu
- Change full name and main position. Changing between goalkeeper and outfield says plainly that
  the skill categories differ and that nothing already added is deleted.
- Change the sign-in email through `verifyBeforeUpdateEmail`: the link goes to the NEW address and
  the change happens only when he clicks it. A typo therefore cannot lock him out, nobody can move
  an account to an address they do not control, and it is the only variant that still works with
  email-enumeration protection on. `profile.email` catches up on his next sign-in.
- Change password, with re-authentication first.

**Activity trail** (§4: "you cannot see when he last touched it, so 'is he working?' is a guess")
- Two different facts, kept apart on purpose: `updatedAt` (he ADDED something) and
  `profile.lastSeenAt` (he OPENED it), the second throttled to once an hour per device.
- The admin list shows the later of the two per row, counts how many have been quiet for a
  fortnight, and sorts by quietest first. A player who signs in daily and adds nothing reads
  "Opened yesterday, added nothing in 20 days" — a different problem from one who has vanished.
- `profile.lastSeenAt` lives INSIDE `profile` so no rules change was needed; a new top-level
  field would have been refused by `ownedKeysOnly()`.

**Export** (§4: "no export for the player")
- `utils/export.js`: a readable **link sheet** (every link grouped by section, with what is still
  missing at the bottom) and the **raw JSON**. Both on the player's account page.
- The same link sheet is on the admin's player page, plus copy-to-clipboard. This is the file that
  gets forwarded to the editor, and it replaces copying links out one at a time.

**Nudges** (§4: "nothing tells a player he is in week 5 with 4 clips")
- A "Do this next" card: ONE instruction, in the order the footage guide actually needs things
  (an editor cannot cut a reel from photos), and a button that scrolls to it. It states the week
  he is in and invents no deadline, because the app does not know his.

**Phone** (§4: "no sticky bottom navigation")
- `SectionNav`: a sticky bottom bar on phones only, jumping to each of the five sections and
  showing which are complete. The rest of the mobile work was done in checkpoint 1.

**Admin can fix a record**
- Name and position, from the player's page. NOT the email: that is his Firebase Auth identity,
  and editing the copy on the record would only make the two disagree.

**Housekeeping that came with it**
- `utils/catalog.js`: positions, skill categories and photo types were written out separately in
  three components and the export would have been a fourth. One source of truth now.
- Dropped the unused Firebase Storage SDK (nothing uploads until checkpoint 3) and split the admin
  and account routes out of the first download.
- Fixed "8 of 23 pieces in" — a sentence that stopped mid-air, introduced in checkpoint 1.

**Rule tests — the security is now proved, not asserted** (carried over from checkpoint 1's list)
- `rules-tests/` runs `firestore.rules` against the Firestore emulator: **47 tests, all passing**.
  `npm test` in that folder starts the emulator itself. It needs Java, which is installed.
- What they prove: a stranger reads and writes nothing; a player cannot read another record,
  list the collection, query for someone else, store a `password` or `role`, write coach notes,
  add an unknown field, reassign `authUid`, delete his record, or make himself an admin; a fresh
  account can create only its own record and only with the expected fields; the coach can read
  everything and clean an old record but cannot put a password back, move ownership, delete a
  record, or appoint an admin; every other collection is closed to everyone.
- One test exists specifically to catch a silent failure: the activity trail writes the dotted
  path `profile.lastSeenAt`, and if `affectedKeys()` reported that as `profile.lastSeenAt` rather
  than `profile`, the rules would refuse it and the trail would quietly stop working in
  production while looking fine in the code. It passes.

### Verified
- Build and lint clean (0 errors, 2 known fast-refresh warnings on the two context files).
- The pure logic — completion, next step, activity, link sheet, raw JSON — run against a
  realistic record and against an empty one: correct output, nothing throws.
- The dashboard and account screens rendered and driven through a throwaway harness (desktop and
  375px): section anchors resolve, the jump scrolls, the goalkeeper warning fires, the export
  button runs without error, no console errors. The harness was removed again.
- Not verified end-to-end signed in: that needs a real account, and creating one is Panos's to do.

### Deliberately not done
- Submit-for-review and approve / needs-redo — Panos dropped them; feedback goes through Skool.
- Deadlines. The app does not know a player's, and a made-up one is worse than none.

## Checkpoint 3 — the hub

Sections A–E from `AUDIT_2026-09-08.md` §5c, the passport / CV / headshot uploads, and the
readiness panel. Videos stay links; documents become uploads.

## Checkpoint 4 — the CV generator

Panos's idea: hand a Claude session one player's hub data plus his standard CV template, and get
the finished CV back as a PDF.
