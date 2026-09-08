# Go-live steps for the rebuilt sign-in — read this once, do it once

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
2. When one of them registers, open the admin view. A yellow panel at the top lists the old
   records. When the emails match, the record shows a **Bring across** button. Press it. His old
   clips are copied onto his new account (the old record is kept, untouched, as a backup).
3. Any record still showing **Clear password** — press it now, whether or not he has registered.
   That deletes the password the old app saved.

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

Records made before this change keep their old document id and are found through their `authUid`
field, so nothing had to be moved or rewritten.
