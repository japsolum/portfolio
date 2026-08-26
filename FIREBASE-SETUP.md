# Firebase setup — guest book

**Project: `guestbook-ba3db`. Config and owner uid are already filled in — steps 1, 2 and 7 are done.**
Remaining work is steps 3-6, all in the Firebase console.

One-time setup, about 5 minutes. The site keeps living on GitHub Pages; Firebase only stores accounts and messages.

Nothing here costs money. The free **Spark** plan needs no credit card and stops serving rather than billing you if you somehow exceed it — which a portfolio will not (the caps are 50,000 reads and 20,000 writes *per day*).

---

## 1. Create the project ✅ done

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. **Create a project** → name it something like `japsolum-portfolio`.
3. Google Analytics is optional — **turn it off** unless you want it. Fewer moving parts.

## 2. Register the web app ✅ done

1. On the project overview, click the **web icon** (`</>`).
2. Nickname it `portfolio`. **Do not** tick "Firebase Hosting" — you're on GitHub Pages.
3. It shows you a `firebaseConfig` object. Copy those values into **`js/firebase-config.js`**, replacing every `PASTE_...` placeholder.

Those values are not secret and are meant to ship in client code. The security rules are what protect your data.

## 3. Turn on the two sign-in methods ← todo

**Build → Authentication → Get started → Sign-in method**

- **Google** → Enable → pick a support email → Save.
- **Email/Password** → Enable, then *also* tick **Email link (passwordless sign-in)** → Save.
  (The email-link option lives inside the Email/Password provider. Leaving password sign-in itself enabled is harmless — the site never offers it.)

## 4. Authorise your domain ← todo

**Authentication → Settings → Authorized domains → Add domain**

Add `japsolum.github.io`.

`localhost` is already there, so local testing works out of the box. Sign-in fails with `auth/unauthorized-domain` until this is done.

## 5. Create the database ← todo

**Build → Firestore Database → Create database**

- Location: pick the region closest to you (`nam5` / us-central is fine).
- Start in **production mode** — locked down by default. The next step opens exactly what's needed.

## 6. Publish the security rules ← todo

1. Open **`firestore.rules`** in this repo, copy the whole file.
2. Firebase console → **Firestore Database → Rules** → paste over what's there → **Publish**.
3. The uid inside `ownerUid()` is already correct — no edit needed.

Until published, posting fails with a permission error — that means the rules are doing their job.

## 7. Make yourself the moderator ✅ done

Already done — uid `Mkoaglf88TQkVYnq9pDgQBwiyzl1` is set in both places:

- `js/firebase-config.js` → `OWNER_UID` (shows you the Delete button)
- `firestore.rules` → `ownerUid()` (actually authorises the delete)

They must stay in sync. If you ever sign in with a different Google account and want *that* one to moderate, update both and re-publish the rules.

---

## Testing locally

ES modules need a real server — opening the file directly won't work:

```
python3 -m http.server 8000
# http://localhost:8000/guestbook.html
```

## Reality check on what this does and doesn't stop

**Handled:** Only signed-in people can post. You can only post as yourself. Messages are capped at 500 characters, can't be edited after the fact, and can't be backdated to pin themselves to the top. Only the author or you can delete. Messages render as text, never HTML, so markup in a message can't execute.

**Not handled:** The 30-second posting cooldown is enforced in the browser, so a determined person can bypass it. Firestore rules can't express real rate limiting without Cloud Functions. In practice, requiring a Google account already deters casual spam, and you have a Delete button. If it ever became a problem, the next step is **App Check**, which blocks API calls that don't come from your actual site.

**Privacy:** Each message stores a display name, a photo URL, and a Firebase uid — no email addresses. Emails live in Firebase Auth, visible only to you in the console.

## Deleting a message

Sign in as yourself and a **Delete** button appears on every message. Or delete the document directly in the Firestore console.
