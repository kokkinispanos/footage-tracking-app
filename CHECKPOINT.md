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
  — DONE in checkpoint 2: `rules-tests/`, 60 tests, all passing.
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
- `rules-tests/` runs `firestore.rules` against the Firestore emulator: **60 tests, all passing**.
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

**Three bugs in my own checkpoint-2 code, found by re-reading it and by the Codex review**
- **A save race that could revert a player's newer edit.** If he kept typing while a save was in
  flight, the completed save cleared that section's dirty flag and deleted its timer handle. The
  snapshot for that write carries the OLDER value, and the dirty flag was the only thing stopping
  it landing on top of what he had typed since — so the newer edit was reverted on screen and
  then saved away. The deleted handle was the NEW timer's, so closing the tab in that window
  dropped the edit entirely. Each edit now stamps a per-section counter and a finished save only
  clears the flag if it is still the current edit.
- **The email sync counted as progress.** Copying his new email onto the record stamped
  `updatedAt`, which the admin list reads as "he added something". It is bookkeeping he did not
  do. That path now passes `touch: false`.
- **The email sync retried on every snapshot**, because it depends on `data.profile`, a fresh
  object each time. One mismatch now produces one attempt; a failed write clears the guard.

**The Codex review (`gpt-5.6-sol`, high effort) — nine real findings, all fixed**

Its opening line was "do not ship the legacy-record linking flow as written", and it was right.

1. **CRITICAL — a forged email could capture another player's footage.** "Bring across" matched
   an old record to a new account on `profile.email`, which the player writes himself. He could
   type a team-mate's address into his own profile, or just register an account using it (Firebase
   lets anyone create an account for any address without proving they can read that inbox), and
   the coach's click would have handed him that team-mate's clips.
   **Fixed:** the record now carries `authEmail`, which the rules accept only when it equals the
   address Firebase says you are signed in as AND Firebase says you have confirmed it. The match
   uses that field. "Bring across" also confirms, naming both records. Rules changed —
   **`firestore.rules` must be republished**, see `MIGRATION.md`.
2. **A save race could revert a newer edit** — the same one found independently while re-reading;
   see above.
3. **A malformed record could crash the whole player list.** The rules restricted which keys could
   be written but not what could be in them, so a player could store a map where a name goes and
   the coach's dashboard would throw on render, with no way back.
   **Fixed:** the rules now check types, `utils/safe.js` renders untrusted values without assuming
   their shape, and an `ErrorBoundary` catches anything still left.
4. **The offline banner promised more than it could keep.** If IndexedDB is unavailable (a private
   window, an old browser) Firestore silently falls back to a memory cache, and the app still said
   "saved on this device" — the one lie that costs a player his work.
   **Fixed:** `offlineStorageAvailable` probes IndexedDB and the message tells the truth, including
   "keep this tab open" when it cannot.
5. **An email change never converged in an open tab**, because clicking the link happens elsewhere
   and nothing told this tab. **Fixed:** the user is re-checked on focus and visibility change.
6. **The activity trail trusted the phone's clock.** A device set a year ahead read as "active just
   now" until that date arrived. **Fixed:** `lastSeenAt` is a server timestamp, and future values
   are clamped for records written before that.
7. **The cache survived sign-out**, including every record and note the coach had opened, on a
   shared browser. **Fixed:** signing out terminates Firestore, clears the cache and reloads.
8. **Admin notes were lost if you navigated within 800ms of typing** — the pending write was
   cancelled, not sent. **Fixed:** both note fields flush on the way out.
9. **The admin player page was a one-time read.** The coach opens a player while talking to him,
   the player adds the clips, the page keeps showing the old state. **Fixed:** it is live now.
10. **Invalid links counted toward 100%.** Progress was array length, so `not-a-url` moved the bar.
    **Fixed:** only entries with a real link count.
11. **The export mislabelled `lastSavedAt`**, reporting the last time the hub was OPENED under the
    name of the last time it was saved. **Fixed**, and both are now reported separately.

### Verified
- Build and lint clean (0 errors, 2 known fast-refresh warnings on the two context files).
- The pure logic — completion, next step, activity, link sheet, raw JSON — run against a
  realistic record and against an empty one: correct output, nothing throws.
- The dashboard and account screens rendered and driven through a throwaway harness (desktop and
  375px): section anchors resolve, the jump scrolls, the goalkeeper warning fires, the export
  button runs without error, no console errors. The harness was removed again.
- The offline cache confirmed live in the browser, not just configured: after the first Firestore
  call the IndexedDB `firestore/[DEFAULT]/footage-tracker/main` exists, and the same call returns
  `permission-denied` while signed out — the published rules answering from inside the app.
- Not verified end-to-end signed in: that needs a real account, and creating one is Panos's to do.

### Deliberately not done
- Submit-for-review and approve / needs-redo — Panos dropped them; feedback goes through Skool.
- Deadlines. The app does not know a player's, and a made-up one is worse than none.

## Checkpoint 3 — the hub itself (2026-09-10) ✅ DONE

**What this stage was for:** the app held a player's footage. Everything else about him lived
in a Tally form, a spreadsheet cell, a folder, or somebody's head. This is the stage that makes
the sentence true: everything about you goes in one place.

### Done

**Two tabs, not one page.** "My footage" is the original five sections. "About me" is the five
new ones. Ten sections in a single scroll is a wall, and a wall is where a sixteen year old on
a phone gives up. The phone bar shows the five of whichever tab he is on.

**A. Who you are** (`SectionIdentity`)
- Birthday from a date picker, never free text: Stage 3's age gate fails on a typed date.
- Passport country and expiry, plus a photo of it. A second passport the same way.
- **The family question, in a box of its own with an explanation.** "Was your mum, dad, or a
  grandparent born in Europe?" Almost nobody volunteers this, because nobody tells them it
  matters. It is the answer that turned a Lane B player into a possible Lane A in the wave-3
  test, and it changes the entire list of clubs he can be sent to.
- Work status, and the three consents, each stored with the date he ticked it.
- A line at the top that reads his answers back: EU passport, family link, or "you may need a
  visa, that is normal and we work around it".

**B. Your numbers** (`SectionPlayerCard`)
- Height, weight, foot, club, level, signed or free, contract end, when he can join.
- Languages as tappable tags with room to add his own.
- **Measured numbers as one box each with the unit printed on it**, and different boxes for a
  keeper. They used to be one free text field, and a real player's cell read `Top Speed/ 32
  km/hour, Distance sprint: 120m 13seconds, 7 saves avr per game, 6 foot 7 tall`. That went in
  front of clubs. The box also says: only put in numbers somebody actually measured.
- Season by season rows, achievements, his own history, and his own draft of the one-line
  headline and the short summary.

**C. How we reach you** (`SectionContact`)
- Phone with country code, WhatsApp, Instagram, Transfermarkt.
- **The Gmail Stage 3 sends club emails from**, in its own box with the reason next to it.
- Whoever is paying, name and email, tied to the consent above.

**D. Your finished stuff** (`SectionDeliverables`)
- The reel as a link, with the coach's sign-off. The CV as an upload, with the player's.
  Those two ticks are Phase 1 exit criteria (`phase1_foundation.md` §8) and there was nowhere
  in the world they were recorded. Each records who ticked it and when, and neither side can
  move the other's.
- The headshot, and the proof page link once it exists (the coach sets that one).

**E. Where people can find you** (`SectionPlatforms`)
- Fourteen rows: Transfermarkt, Wyscout, Soccerway, aiScout, Tonsser, Skouted, Veo, Hudl,
  Instagram, YouTube, TikTok, X, LinkedIn, Facebook. Each is Done / Not yet / Not for me, and
  Done reveals a box for the link.
- Closes the gap `phase2_visibility.md` line 211 names in Panos's own words: "No internal
  tracker for which platforms each client is live on, currently tribal knowledge per client
  folder." "Not for me" is stored, so a blank row means nobody has looked yet.

**Uploads** (`services/files.js`, `components/hub/FileSlot.jsx`)
- Four fixed slots: `passportOne`, `passportTwo`, `cv`, `headshot`. No free filenames and one
  object per slot, so re-uploading replaces and nobody can fill the bucket. `storage.rules`
  enforces the same list.
- Firestore stores the name, size, type and date. **Never a URL.** A Firebase download link
  carries its own access token and keeps working for anyone who ever sees it, whatever the
  rules say afterwards, which is the wrong trade for a passport. Viewing fetches the bytes with
  the signed-in user's own credentials into a blob that is revoked when the window closes.
- The first bytes of the file are checked against what it claims to be, so a renamed video is
  caught before it costs somebody twelve minutes on a ground's wifi.
- `firebase/storage` is imported the first time he picks a file, not on every page load.

**The coach's side**
- A **readiness panel** on the player page: eleven lines, every one a column the outreach
  engine reads or a permission it needs. "Is he ready for the attack?" is now a glance.
- It reads his eligibility answers back and says plainly: this is what he told us, check the
  passport photo yourself before it decides a lane.
- The player list gains a "ready for Stage 3" count, a per-row pill, and a "closest to Stage 3
  first" sort.
- All five new sections are readable on the admin page, read-only, with a notes box each.

**Rules**
- The five hub sections are type checked like the footage ones, so one malformed record cannot
  take the whole player list down. **`firestore.rules` needs republishing.**
- `storage.rules` rewritten from `{allPaths=**}` to the four named slots. **Needs publishing,
  and Storage needs switching on at all.**
- Rule tests: **93, all passing**, including that a hub section cannot be a string or a list,
  that the coach can tick a sign-off and set the proof page, and that a player still cannot
  touch another player's hub sections.

**Copy**
- Every word a player reads is rewritten short and plain, for someone tired, on a phone, who
  does not enjoy reading. No em dash survives in any rendered string.

**The Codex review (`gpt-5.6-sol`, high effort) — its verdict was "I would not ship this round
yet", and it was right about three things**

Its file tools were broken this session, so the whole of the reviewed code was pasted into the
prompt instead. Worth knowing for next time.

1. **A player could tick his own coach approval, and change the link clubs are sent.** Both
   lived inside `deliverables`, and a player owns that whole section. Nothing automatic keyed
   off either, which is what the comment in `db.js` said, but a screen that reads "your coach
   has checked this video" has to be telling the truth, and the proof page link is the address
   a club is handed. Both now live under `coachSignOff`, a top-level key the rules do not let a
   player write. That also stops his save wiping a sign-off made while he was typing.
2. **A leftover save could write one player's answers into another player's record.** The
   debounced write captured the document id at schedule time but read the VALUE out of a shared
   ref at fire time, and that ref is repopulated when a different record loads. `latestRef` now
   carries the id it belongs to and a save whose id no longer matches simply does not happen.
3. **`updatedAt` could be hand-written.** It is what the coach's list reads as "he added
   something", so a player could look productive without doing anything. The rules now require
   it to equal `request.time`, which `serverTimestamp()` satisfies and a made-up date does not.
4. **Readiness said ready while the reel was unsigned, the CV unchecked and no headshot
   existed.** Those are Phase 1 exit criteria. The panel is 14 items now, not 11.
5. **"Everything is in" could show with no passport.** `nextThing` counted identity and then
   never used it.
6. **Uploads and the record could drift apart.** The metadata went through the 700ms debounce,
   so an upload followed by a closed tab left an object nobody pointed at; delete went the other
   way and left the record claiming a file that was gone. File writes now bypass the debounce
   and are awaited, and delete updates the record first and the object second. An orphan object
   is tidy-up; a record claiming a passport that does not exist is a lie the coach acts on.
7. **An object URL leaked if he navigated away mid-download.** Guarded.

Found while testing its findings: **with Storage switched off an upload did not fail, it hung.**
Firebase retries for ten minutes by default, so a player would have watched "0% done" with no
error and no idea. Capped to a minute, verified: it now fails in 61 seconds. A warning appears
after twelve seconds of no movement.

Left as-is, with reasons: a player can still claim a file exists by writing the metadata without
uploading (self-defeating, and the coach finds out the moment he opens it); `profile.lastSeenAt`
is still client-written (it is a server timestamp now, so the honest-clock problem is gone);
and Storage rules have no emulator tests, which needs the Storage emulator and is worth doing
once uploads have run for real.

### Verified
- Build and lint clean (0 errors, 2 known fast-refresh warnings).
- 76 rule tests, all passing.
- Upload guards checked in the browser against real files: a video renamed `.pdf` is caught by
  its first bytes before any network call, 16 MB is refused with the real size, a photo in the
  CV slot is refused, and a missing owner id fails with a sentence rather than a Firebase code.
- The completion maths run against an empty record, a half-filled one, a fully filled one and a
  deliberately malformed one: correct counts, nothing throws. "Not for me" correctly does not
  count as progress; an EU passport changes the eligibility line.
- Driven in the browser through a throwaway harness: ticking the three consents moved the
  section from 5/6 to 6/6 and the tab total with it; marking platforms Done revealed their link
  boxes and moved the count; adding a season added a row; the readiness panel read 6 of 11 and
  listed exactly what was missing. No console errors. The harness was removed again.
- **Not verified: uploading a file.** Storage has never been switched on for this project, so
  no upload path can be exercised until Panos does that. The code, the rules and the error
  messages are written; the round trip is untested.

### Not done on purpose
- The CV generator. That is checkpoint 4 and it is a tool for Panos, not something a player
  needs.
- "Send to Stage 3". Parked until the app has been used in anger.

## Checkpoint 3b — no Firebase Storage, and the final review (2026-09-10) ✅ DONE

**Firebase Storage needs the paid Blaze plan.** Panos declined, so the uploads were rebuilt to
store each file inside Firestore: shrunk on the player's own phone, one document per file at
`playerFiles/<uid>__<slot>`. `storage.rules` is deleted and `firebase.json` trimmed.

This is the better design, not a workaround. A Storage download link carries its own access
token and keeps working for anyone who ever sees it, whatever the rules say afterwards, which is
exactly the wrong property for a teenager's passport. A Firestore document has no link, so the
rules are consulted on every read.

Measured, not assumed: a passport page stores at **185 KB** and stays readable at 1600x1200, and
an 11 MB photo of pure random noise, the worst case JPEG can face, still lands at 634 KB. A PDF
cannot be shrunk, so a CV over 640 KB asks for a link instead.

**The final Codex review said NO-GO, and two of its findings were serious:**
- **A failed delete could leave a passport stored with nothing pointing at it** and therefore no
  button anywhere to remove it. The record was cleared first and the file second.
- **A failed upload could leave the same orphan** the other way round.
  Both are now **one Firestore batch**: either the file and the claim both land, or neither does.
- **`updatedAt` could be written on its own**, so a player could look busy on the coach's list
  without adding anything. It may now only move when a section he owns, or one of the coach's
  own fields, moved with it.
- **A missing file did not make readiness false.** The panel warned underneath while still
  saying "you can start his campaign" in green, and the green is the part people act on.
- **A failed existence check was reported as a missing file.** `exists()` answers true, false or
  null now, and only a definite no counts against a player.
- **The pagehide flush never cleared its dirty marks**, so a player who switched apps and came
  back would silently ignore updates from his other device until he typed again.
- Corrected an overclaim of my own: the viewer returns the file as a `data:` URL, which IS the
  file. Anyone already allowed to see it could copy it, exactly as they could screenshot it. The
  property actually being defended is narrower and is the one that matters: no durable URL
  exists that keeps working for someone who was never allowed to look.

**Left, with reasons:** the rules check that `identity`, `deliverables` and the rest are maps but
not what is inside them, so a player can still write a fake date of birth or claim a file he has
not uploaded. The first is self-defeating and the coach checks the passport himself; the second
is now caught by the readiness panel. Full nested schema validation in rules is a lot of surface
for a small gain, and is the obvious next hardening if this ever holds more than a few players.

`npm test` in `rules-tests/` now frees the emulator port before running, because an interrupted
run used to leave Java holding 8080 and the next run failed in a way that looked like a broken
suite. **93 rule tests, all passing.**

---

## Checkpoint 3c — two bugs found by actually using it (2026-09-10) ✅ DONE

Panos signed up as a player and hit both within minutes. Worth recording because neither would
ever have shown up in a build, a lint or a rule test.

**The Save button was off the bottom of the screen.** The clip modals render inside `GlassCard`,
which uses `backdrop-blur`, and **an ancestor with a backdrop-filter becomes the containing block
for any `position: fixed` descendant**. So the dialog was sized and placed against the CARD, not
the window. Measured on a 560px window: the panel ran 141 to 617, hanging 57px off the bottom,
with Save at 538 to 580. He filled the form in and had nothing to press.

`Modal` and the file preview now render through a **portal onto `document.body`**. Measured after:
the dialog spans 0 to 560, and Save is visible with the body scrolled to the top and to the
bottom, at 900x560 and at 375x812. The modals also got a pinned action bar, because even placed
correctly the buttons were the last thing in a scrolling body.

> If you add another overlay anywhere in this app, portal it. Half the surfaces here are cards
> with `backdrop-blur` on them, and a fixed overlay inside one is silently not fixed at all.

**"Send it again" did nothing.** It caught the error and dropped it, so the real reason was
invisible. The real reason is almost always that Firebase rate-limits verification emails hard,
and pressing the button repeatedly is exactly what keeps it failing. The banner now says what
happened, holds a 60 second cooldown, points at Promotions and spam (where these land far more
often than the inbox), names the sender, and offers an "I clicked it" re-check. The signup send
no longer vanishes either.

Ruled out first, so nobody re-checks it: the Vercel domain is missing from Firebase's authorized
domains, but that list does not gate email/password flows. Tested directly against the Identity
Toolkit from the deployed origin: it rejects on the token, not the origin.

---

## Checkpoint 3d — the link box, and three more of the same bug (2026-09-10) ✅ DONE

Panos reported it took "10 to 12 clicks" to get his cursor into the link box.

**The modal was stealing focus on every keystroke.** `onClose` is written inline as
`() => setIsOpen(false)`, so it is a new function on every render, and it was in the effect's
dependency list. The effect re-ran constantly, and the line inside it that focuses the first
field dragged the cursor back there each time. The callback is held in a ref now and the effect
depends on `isOpen` alone. Measured after: typing twenty characters steals focus **zero** times.

**Pasting a link is now one tap.** New `LinkInput`, used everywhere a player pastes a link. It
has a Paste button, it opens with the cursor already in it, it says what it recognised
("YouTube link", "Google Drive link"), and it says the one thing that will silently ruin the
link later. **YouTube and Google Drive are both first class on purpose:** three full games in 4K
will not fit in a free Drive, and a player told "Drive only" simply sends nothing. Vimeo, Veo,
Hudl and Dropbox are recognised too.

> The most valuable line in that box: **a YouTube video set to Private cannot be opened by the
> editor.** Unlisted is what he wants. The app cannot detect it, so it has to say it.

**Two more instances of the containing-block bug from 3c**, found by sweeping rather than by
waiting: the header menu's click-catcher was `fixed` inside a sticky header that has
`backdrop-blur`, so it only covered the header strip and clicking the page below did not close
the menu. And confirm dialogs had stopped focusing their button, so Enter did nothing. Both
fixed. A competing second `autoFocus` in two modals was removed so the link box wins.

The link field is `required` again. It lost that in the swap, and a saved row with no link
counts for nothing and confuses whoever reads it later.

93 rule tests, all passing.

---

## Checkpoint 4 — the CV generator

Panos's idea: hand a Claude session one player's hub data plus his standard CV template, and get
the finished CV back as a PDF.

---

## Checkpoint 5 — the CV fields, and one file with everything in it (2026-09-10) DONE

**Why this stage exists.** The CV stopped being a template the player fills in. From now on it is
written for him from what is in this app, by a session that reads his record. That only works if
the app actually holds everything a CV needs, and it did not. Five fields had nowhere to live and
the files could be looked at but not kept.

Panos's instruction, in his words: everything that might possibly be needed for the CV, and do not
be afraid to add a bit more if unsure, because worst case the player does five or ten minutes of
extra work and that is not a deal breaker.

### What a player is now asked

**Who you are** — the town and country he was born in, and, when he answers yes to the family
question, **a photo of the paper that proves it**. That answer is the most valuable line in the
app and nobody can act on it until somebody has seen a birth certificate, so it is asked for in
the same breath rather than chased weeks later.

**Your numbers** — a second position, his shirt number, and how good his other foot really is.
How well he speaks each language he already listed, not just which ones. Whether he would move
abroad, how much notice he needs for a trial, and anything that would stop him travelling. What
he is actually good at, as tappable strengths rather than an empty box, with a keeper's own list.
What system he plays best in. Who he plays a bit like. What he is working on.

**His seasons** are no longer four numbers. Each one now carries the country, **which team it was
for** (first team, U19, academy), minutes, yellows, reds, clean sheets for a keeper, and a line
for anything about that season. "20 games" means a different thing in an U19 side, and a CV that
does not say which is a CV a scout stops trusting.

**How we reach you** — does he have an agent, and if so his name, agency, phone, email and FIFA
licence number, under a plain warning that writing it here does not mean anybody contacts him
(S12: no agent is ever contacted without the player saying so first). And someone who would speak
for him: a coach, what he is to him, which club, how a club reaches him. **"No" is a complete
answer to both**, and for most players it is the true one, so the counters accept it. Counting
only "yes" would leave every honest player permanently short.

**Your finished stuff** — the tall cut and the one-minute cut of his reel, beside the main one.

### The counters moved, deliberately and only twice

`playerCard` 8 to 10 and `contact` 4 to 6. The four that count are the ones a CV cannot be written
without: his strengths, his system, whether he has an agent, whether anyone would speak for him.
**Everything else added here is optional and moves nothing**, because a progress bar that only ever
goes down teaches a player to ignore it. Hub total 25 to 29.

### One click, one file

`Everything, in one file` on the admin page. A single zip holding `hub-data.json` (every answer
exactly as stored), `footage-links.txt` (the flat list for the editor), `README.txt` (what is in
the box and what he has not uploaded yet) and `files/` with every document he has uploaded. That
is the file that gets handed to a session to write a CV, instead of clicking through the app
copying fields out one at a time. The player has the same button on his account page, because it
is his own work.

`utils/zip.js` is a hand-written store-method zip writer, about sixty lines, **no dependency**.
Everything going in is already compressed so DEFLATE would buy nothing, and a dependency in the
bundle of an app that holds passports is a bigger thing to own than sixty lines. Verified by
building an archive and handing it to python's `zipfile`: CRCs all pass, a JPEG comes back
byte-identical, UTF-8 filenames and content survive with the flag set.

**Save buttons on every uploaded file**, in the row and inside the viewer, for the player and the
coach. They could be looked at and not kept, which meant right-clicking a preview and hoping. The
save goes through the same Firestore read as the viewer, so the rules are still checked on the way
and no durable link is created.

### Rules

`familyProof` added to the slot allowlist in `firestore.rules`. It is an identity document like
the passports, so it is tested like them: **97 rule tests, all passing** (was 93). The four new
ones prove a player can save and delete his own, that another player cannot read it, and that the
coach can.

> **PANOS HAS TO REPUBLISH `firestore.rules`.** Until he does, everything else on this checkpoint
> works and only the family-proof upload is refused. Firestore, Rules, paste the file, Publish.

### Verified

- `npm run build` clean. `npm run lint` 0 errors, the 2 known fast-refresh warnings.
- 97 rule tests passing.
- The zip round-tripped through python's `zipfile`, above.
- The completion maths driven live in the browser: an empty record scores 0 across all five
  sections, a full one scores 29 of 29, removing his strengths drops `playerCard` from 10 to 9 and
  clearing the agent answer drops `contact` from 6 to 5. So the new fields really do gate.
- All four sections mounted in a throwaway browser harness with a filled record: every new block
  renders, zero React errors, and four Save buttons appear against the four stored files. The
  harness was removed again.
- **Not verified: a real upload of a family proof**, because that needs the republished rules and
  a signed-in player. The code, the rules and the tests are in place; the round trip is untested.

---

## Checkpoint 6 - the Codex review, and a real leak it found (2026-09-10) DONE

Reviewed by Codex (`gpt-5.6-sol`, high, role codereviewer) against checkpoint 5. **Its file host
is broken** (`codex-code-mode-host.exe` missing), so the code was pasted into the prompt with line
numbers, the same workaround checkpoint 3 needed. Worth knowing before anyone tries again.

**Eleven findings. Two were serious, and the first one was a live leak.**

### 1. The export could hand out a legacy plaintext password. HIGH. Fixed.

`buildRawJson` was a **blacklist**: strip `id`, `authUid`, `authEmail`, `updatedAt`, keep
everything else. It therefore kept every field it had not been told about. **The six records that
pre-date the Auth rebuild still carry `password` in plain text**, plus `role` and `adminNotes`,
because clearing them is the admin button Panos has deferred. So an admin exporting a legacy
player wrote that password into `hub-data.json`, and checkpoint 5's new "Everything, in one file"
button then wrapped it in a zip built specifically to be handed to somebody else.

Checkpoint 1 of this file claims "The JSON export never contains a password." **That was wrong**,
and it stayed wrong for two days. It is an allowlist now: `PLAYER_OWNED_KEYS` plus `coachSignOff`
and nothing else, so a new internal field is invisible to the export until somebody deliberately
adds it.

Proved with a legacy-shaped record carrying a password, a role and a private coach note: none of
the three appear anywhere in the output under any key, and the real data still does.

### 2. A stored `javascript:` link would run when clicked. HIGH. Fixed.

`CV_Template_v2.html` escapes values into HTML, which stops an attribute breakout but does nothing
about the SCHEME. A reel link stored as `javascript:...` would execute on click, in a local
document holding a real player's details. `safeHref()` now allows http and https only. Anything
else is still **printed as plain text** rather than dropped, because a CV that silently loses a
line is how a wrong CV reaches a club. The headshot is restricted to `data:image/...` the same way,
so opening a CV cannot quietly call a remote server.

Verified live: a `javascript:` reel and a `data:text/html` match link both render as inert text,
https and http still render as links, and a remote photo URL falls back to the placeholder.

### 3. A file we could not read was reported as a file he never sent. MEDIUM. Fixed.

The bundle caught every Firestore error and pushed the slot into "skipped", so a permission error,
an expired session or a dropped connection all came out as **"NOT UPLOADED YET"** next to a
passport that is in fact uploaded. That sends a coach chasing a player who already did the work.

Three outcomes now, not two: `included`, `missing`, `failed`. A failure names the slot and the
reason, the README carries a `*** THIS ARCHIVE IS INCOMPLETE ***` block, and the admin page says
so on screen even though the download still succeeded.

### 4. `authUid || id` addressed the wrong files. MEDIUM. Fixed.

The fallback only works when the document id happens to be the Auth uid, which is untrue for every
legacy record. It looked up a file id that cannot exist, found nothing, and finding 3 then turned
that into "not uploaded". It requires `authUid` now and fails fast with a sentence telling the
coach to use "Bring across" first.

### 5. `dataUrlToBytes` returned empty bytes, or threw outside the try. MEDIUM. Fixed.

A comma-less value produced a **zero byte file listed as successfully included**. Bad base64 or bad
percent-encoding threw from outside the per-slot try and killed the whole export without saying
which file was damaged. It throws named errors now, the decode is inside the per-slot try, and
nothing enters `included` until the bytes exist. Tested against seven malformed inputs.

### 6 to 11. The rest.

- **Zip boundary checks added** (65,535 entries, 65,535-byte names, 4 GB). Past those a classic zip
  does not fail, it wraps the field and writes a corrupt archive that looks fine. Codex confirmed
  the structure is otherwise **byte-correct**: CRC, local and central offsets, EOCD, the UTF-8
  flag, empty archive, empty file, non-ASCII names. Re-verified through python's `zipfile`.
- **Date-only values were parsed as UTC midnight** and read back local, so west of UTC a birthday
  and an age were a day early. `calendarDate()` parses `YYYY-MM-DD` as a calendar date now.
  Athens is east of UTC so Panos would never have seen it; a club or an editor abroad would.
- **`totals()` hardened**: `Array.isArray`, finite non-negative integers only. A truthy non-array
  `seasons` used to throw and render nothing at all. Verified it now degrades to an empty table.
- **The career row's last two cells were blank.** They are the yellow and red totals, filled now.
- `Account.jsx` had an unhandled promise rejection on the player's own export. Caught.

### NOT changed, and why

Codex flagged `fileId.split('__')[0] == request.auth.uid` in `firestore.rules` as a
delimiter-ambiguous authorization primitive: a uid containing `__` could in theory collide.
**Firebase Auth uids are 28 characters of alphanumerics and never contain an underscore**, and no
player can create a colliding document through these rules anyway. Changing it would cost Panos
another manual republish for no real gain. **Accepted risk, recorded here.** If this project ever
takes imported or custom uids, authorize on `resource.data.ownerUid` instead.

### Verified after the fixes
- Build and lint clean. **97 rule tests passing.**
- Zip edge cases through python `zipfile`: empty archive, empty file, unicode filename, nested
  path. All CRC-valid, names round-trip, UTF-8 flag set.
- The leak test above.
- `buildEverythingBundle` with no `authUid` throws; with unreadable files it reports 5 `failed`,
  0 `missing`, and stamps the README incomplete.
- The CV template's hostile-input test above.
