# FiggleSnoot — deploy & setup guide

## Status checklist

| Step | What | Status |
|------|------|--------|
| 1 | Netlify env vars (5× `VITE_FIREBASE_*`) | Done if you added them in Netlify UI |
| 2 | Netlify redeploy after env vars | Trigger once after adding vars |
| 3 | Firebase Auth + Firestore + authorized domain | Confirm in Firebase Console |
| 4 | `firebase deploy --only functions,firestore:rules` | Run once from your machine |
| 5 | Test live site | After steps 2–4 |

---

## 1. Netlify environment variables

Add these in **Netlify → Site configuration → Environment variables** (same values as your local `.env`):

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Connects the web app to your Firebase project |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth server (e.g. `figglesnootdb.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (e.g. `figglesnootdb`) |
| `VITE_FIREBASE_APP_ID` | Web app ID from Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Required by the Firebase SDK |

Optional later:

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | reCAPTCHA v3 — reduces bot abuse |
| `VITE_FIREBASE_USE_EMULATORS` | Set to `true` only for local emulator testing |

**Important:** Never commit `.env` to GitHub. Netlify reads vars from its dashboard, not from your repo.

After adding or changing vars: **Deploys → Trigger deploy → Deploy site**.

---

## 2. Firebase Console (one-time)

In [Firebase Console](https://console.firebase.google.com/) → project **figglesnootdb**:

1. **Authentication → Sign-in method** → enable **Email/Password**
2. **Authentication → Settings → Authorized domains** → add `figglesnoot.netlify.app`
3. **Firestore Database** → create database (if not already created)

`localhost` is allowed by default for local dev with `npm run dev`.

---

## 3. Deploy Cloud Functions + Firestore rules

Global score submit/compare runs on Firebase, not Netlify. Deploy once (and again when you change `functions/` or `firestore.rules`):

```bash
firebase login
cd "path/to/FiggleSnoot"
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules
```

Project is already set in `.firebaserc` (`figglesnootdb`).

---

## 4. Test on the live site

After Netlify redeploy **and** Firebase deploy:

1. Open **https://figglesnoot.netlify.app** (hard refresh: Ctrl+Shift+R)
2. **PLAY AHHHH** → Menu → **Account** → **Sign Up**
3. Play → die → check global rank / confetti
4. **Leaderboard → Global** → switch mode tabs

---

## 5. GitHub + Netlify auto-deploy

**If your Netlify site is linked to a GitHub repo** (Site configuration → Build & deploy → Continuous deployment shows your repo):

- **Yes — pushing to the connected branch (usually `main`) auto-deploys the game.**
- Netlify runs `npm run build` (see `netlify.toml`) and publishes the `dist/` folder.
- Your **environment variables stay in Netlify** — they are not in the repo and do not need to be pushed again.
- Each push = new build with current code + existing Netlify env vars.

**What does NOT auto-deploy on git push:**

- **Firebase Cloud Functions** and **Firestore rules** — still run `firebase deploy --only functions,firestore:rules` manually (or set up GitHub Actions later).
- **Firebase Console settings** (Auth, domains, etc.) — configure once in the console.

**Recommended Git workflow:**

```bash
git add .
git commit -m "your message"
git push origin main
```

Watch **Netlify → Deploys** for the build. Do not commit `.env`, `node_modules/`, or `dist/`.

---

## 6. Local development

```bash
npm install
npm run dev          # Firebase + Vite — use this instead of Live Server on project root
npm run build        # Production build → dist/
npm run preview      # Preview dist/ locally
```

Copy `.env.example` to `.env` for local Firebase config.

---

## 7. App Check (optional)

1. Firebase Console → App Check → register web app (reCAPTCHA v3)
2. Add `VITE_FIREBASE_APP_CHECK_SITE_KEY` to Netlify
3. Enforce App Check for Firestore and Cloud Functions in console

For local App Check debug, register a debug token in Firebase Console → App Check → Manage debug tokens.
