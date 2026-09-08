# Go-live steps for the rebuilt sign-in — read this once, do it once

> ## ⚠ UPDATE, 2026-09-09 (checkpoint 2): republish `firestore.rules`
>
> The rules changed and the new ones must be published before you carry any old record
> across. Firestore Database → Rules → select all → paste the whole of `firestore.rules`
> → Publish. Same as step 3 below. **Two minutes.**
>
> **Why.** "Bring across" matched an old record to a new account by email — and the email it
> compared was the one the player types into his own profile. He could put a team-mate's
> address there, or simply register an account using it (Firebase lets anyone create an
> account for any address without proving they can read that inbox), and the button would
> have offered him that team-mate's footage. One click from you and he would have had it.
>
> The record now carries `authEmail`, which the rules only accept if it is the address
> Firebase says you are signed in as AND that Firebase says you have confirmed by clicking
> the link sent to it. The match is made on that field. An attacker can hold an account on
> someone else's address; he cannot confirm it.
>
> **What you will see.** A player who has registered but not yet clicked his confirmation
> link now reads "Registered — waiting for him to confirm his email" instead of offering the
> button. That is correct: ask him to check his inbox. "Bring across" also asks you to
> confirm, naming both records, before it copies anything.
>
> The rules also now check the SHAPE of what is written, so one player cannot store a
> malformed record that crashes your whole player list.


Written 2026-09-09, checkpoint 1. Everything in the code is done. What is left needs the
Firebase console, which only you can open. It is about **15 minutes**.

Until you finish step 3, **the database is still open to the internet.** That is the state it
has been in since the app was built, so nothing is newly at risk by waiting a day — but do not
put a passport in it before step 3 is done.

---

## Step 0. Take a backup (2 minutes, optional but sensible)

Firebase console → **Firestore Database** → the `players` collection → the three dots on the
collection → **Export**. Or skip it: nothing in these steps deletes a record. The old records
stay exactly where they are.

---

## Step 1. Switch on Authentication (3 minutes)

Right now the project has no Authentication at all. I checked: the API answers
`CONFIGURATION_NOT_FOUND`, which means it has never been set up.

1. Go to https://console.firebase.google.com/project/footage-tracker/authentication
2. Press **Get started**.
3. In **Sign-in method**, choose **Email/Password**.
4. Turn on the first toggle (**Email/Password**). Leave "Email link" off.
5. **Save**.
6. Then **Authentication → Settings → User actions** and check that **Email enumeration
   protection** is ON. It stops a stranger using the login screen to find out which email
   addresses belong to your clients. It is on by default; just confirm it.

---

## Step 2. Make yourself an account, then make it the admin (5 minutes)

The admin password that used to be printed on the login screen is gone. You now sign in like
everyone else, and your account is marked as an admin in the database.

1. Open the app and press **Create your account**. Use your own email and a real password.
   (Use a password you do not use anywhere else.)
2. Copy your user id: console → **Authentication → Users** → your row → the **User UID**
   column. It looks like `k3Jd8fMz...`, 28 characters.
3. Go to **Firestore Database → Start collection**.
   - Collection ID: `admins`
   - Document ID: **paste your User UID**
   - Add one field: name `email`, type string, value your email. (The field is only so the
     document is not empty — the rules only check that the document exists.)
   - **Save**.
4. Reload the app. You should land on the admin view with the list of players.

Anyone you want to make an admin later: they register, you add one document under `admins`
with their uid. To remove an admin, delete the document. There is no other way in or out.

---

## Step 3. Close the database (5 minutes) — THE IMPORTANT ONE

1. Go to **Firestore Database → Rules**.
2. Delete everything in the box.
3. Open `firestore.rules` from this repo, copy the whole file, paste it in.
4. **Publish**.
5. Go to **Storage → Rules** (if Storage has never been used, press Get started first and
   accept the default location).
6. Same again with `storage.rules`. **Publish**.

**Check it worked.** Open this in a browser tab where you are not signed into anything:

```
https://firestore.googleapis.com/v1/projects/footage-tracker/databases/(default)/documents/players?key=AIzaSyBULVCEmUckqt3928ja52YZAo8ecDgYkhM
```

- Before: it returns every player, passwords included.
- After: it must return **`PERMISSION_DENIED`**. If it still returns players, the rules did not
  publish — do step 3 again.

---

## Step 4. Bring the 6 existing players across (10 minutes, spread over a few days)

Their records are untouched and still hold their clips. They cannot sign in yet because the old
app never gave them a real account.

1. Message each player: *"We rebuilt the app to keep your information private. Please go to
   [link] and create your account again with the same email address. Your footage is already
   there waiting."*
2. When one of them registers **and confirms his email**, open the admin view. A yellow panel
   at the top lists the old records. When the confirmed address matches, the record shows a
   **Bring across** button. Press it, check the two names in the confirmation, and his old clips
   are copied onto his new account (the old record is kept, untouched, as a backup).

   Until he clicks the link in his inbox the row says "Registered — waiting for him to confirm
   his email". That wait is deliberate: the confirmed address is the only proof we have that the
   person who registered is the person the old record belongs to.
3. Any record still showing **Clear password** — press it now, whether or not he has registered.
   That deletes the password the old app saved, and moves any notes you wrote about him into the
   admin-only collection at the same time.

**Why the notes had to move.** Firestore hands back whole documents; it cannot hide one field from
whoever is reading. Your notes lived on the player's own record, so anything you typed there was
readable by that player in his browser, whatever the screen said. They now live in their own
collection that only an admin can open. Nothing you wrote is lost — the first Bring across or
Clear password on each old record carries it over.

### The message you owe them

Their password was stored in a form anyone could read. Send this, or your own version of it:

> Quick and important one. The first version of the app stored your password in a way that was
> not properly protected. We have rebuilt it and that is fixed. Nothing of yours was lost and we
> have no sign anyone took anything, but if you use that same password anywhere else — your email
> especially — please change it there. Sorry for the hassle. Your new account is completely
> separate and your password is no longer something we can see.

Not a nice message to send. Much better than the alternative, and it is the honest thing.

---

## What changed in the code (for whoever picks this up next)

| Before | Now |
|---|---|
| Password saved in the player's record, in plain text | Never stored. Firebase Auth holds it, hashed |
| Login compared the password in the browser | Firebase checks it on the server |
| `{uid, email, role}` in localStorage, trusted | The signed-in user comes from Firebase every load |
| A player could set `role: admin` in his browser | Admin = a document only the console can create |
| `admin@admin.com` / `adminpw123` in the login page and the bundle | Gone |
| A player found by his email address | Found by his Firebase Auth id |
| Anyone could read and write everything | `firestore.rules` + `storage.rules` |
| No password reset | "Forgot your password" on the login screen |
| No email verification | Sent on signup, with a reminder banner |
| Your private notes sat on the player's own record, where he could read them | A separate `adminNotes` collection only admins can open |
| Old records matched on an email the player could type himself | Matched on `authEmail`, which the rules only accept from a confirmed address |
| Any shape of data could be written to a record | The rules check types, so one player cannot crash your player list |
| Signing out left every record cached in the browser | Signing out empties the on-device cache |

No player data was moved or deleted to make any of this work. Old records stay exactly where they
are; the admin button copies their contents onto the account the player creates.
