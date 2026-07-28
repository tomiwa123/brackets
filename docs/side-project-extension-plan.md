# Brackets Repo — Findings & Side-Project Extension Plan

_Generated 2026-07-27. Repo: `/Users/AYOTOMIWA-PC/Projects/brackets`_

## 1. What this repo is

"Tournament Brackets" — a React 19 + TypeScript + Vite SPA. Users type a topic,
an LLM (Gemini or OpenAI, BYOK or backend fallback) generates 16 contenders,
and they get voted through a single-elimination bracket. Recently extended
with a Firebase-backed multiplayer lobby (real-time room sync, host controls,
countdown/reveal UX).

Stack: React 19, Vite 7, Tailwind 4, Zustand (state), Framer Motion
(animation), Firebase (multiplayer realtime + presumably auth/db), Upstash
Redis (rate limiting on the backend), one Vercel serverless function
(`api/generate.ts`) that proxies OpenAI/Gemini + Google Custom Search.

## 2. GitHub / push setup

- Remote: `origin` → `git@github.com:tomiwa123/brackets.git` (SSH).
- Default branch: `main`, currently in sync with `origin/main` (no local
  divergence, working tree clean except an untracked `scripts/` dir unrelated
  to this task).
- There's one other remote branch: `origin/update-readme-audit-progress`.
  **Confirmed stale — safe to delete, zero risk of losing work:**
  - Its tip commit is `54d76c6`, dated **2026-06-10 23:13:44 -0700** ("docs:
    update README to reflect implemented BYOK, safety layer, and mock
    fallback features").
  - It has **0 commits that aren't already on `main`** — `main` fully
    contains this branch's tip (`git branch --contains 54d76c6 -r` lists
    `origin/main`). In other words this branch isn't "ahead" of anything; it's
    just an old pointer to a commit that `main` has since moved 13 commits
    past. Nothing on it would be lost by deleting it.
  - It still has a live (47-day-old) Vercel preview deployment tied to it
    (`brackets-git-update-readme-...vercel.app`), which is the kind of thing
    that lingers until the branch is deleted or the preview expires on its
    own.
- Pushing is plain `git push origin main` — no branch protection rules or CI
  gate observed in-repo (no `.github/workflows`), so **push = deploy**
  (Vercel's GitHub integration builds on push, see below).

## 3. Vercel connection

- Linked via `.vercel/project.json` (committed... actually gitignored — see
  below) to project **`brackets`**, org/team **`tldrdotbetgmailcoms-projects`**,
  account **tldrdotbet-9924**.
- `.vercel/` and `.env*.local` are gitignored — the Vercel *link* is local
  metadata; the actual link-of-record lives on Vercel's side via the GitHub
  App integration (push to `main` → auto production deploy; other branches/PRs
  → preview deploys).
- Live production URL: **`https://brackets-jet.vercel.app`** — **confirmed
  live**, not just registered: `curl -I` returns `HTTP/2 200` from Vercel's
  edge, `x-vercel-cache: HIT`, `last-modified` from the most recent deploy
  (2026-07-21). This is a genuinely deployed, serving production app, as you
  said.
  - To be precise about domains (since this matters less now — see below —
    but for the record): I checked both `vercel domains ls` (Vercel-purchased
    domains — only `africaday.xyz`, used by a different project) **and**
    `vercel alias ls` (every alias/custom-domain attached to any project,
    including ones registered elsewhere and just pointed via DNS). Confirmed:
    `brackets` has no custom domain, only the auto-assigned
    `brackets-jet.vercel.app` and its `*-git-main-...vercel.app` /
    `*-tldrdotbetgmailcoms-projects.vercel.app` sibling aliases. Other
    projects on the account (`ayotomiwa.com`, `tldr.bet`) do have custom
    domains, so the account supports it — `brackets` just doesn't have one.
  - **This turns out not to matter for what you want.** Since you want a new
    *path* on the same site rather than a new domain, everything below just
    needs `brackets-jet.vercel.app/<new-path>` to work, which it will
    regardless of whether a custom domain ever gets attached.
- There's also a **`brackets-16`** project in the same account (`
  brackets-16.vercel.app`, last updated 70d ago) — looks like an earlier/
  duplicate deployment of the same app, now presumably dormant. Worth
  confirming whether it's safe to delete, but out of scope here.
- `vercel.json` is a pure SPA rewrite config:
  ```json
  { "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
  ]}
  ```
  Everything that isn't `/api/*` falls through to `index.html`, and routing
  inside the app is done **manually** in `src/App.tsx` via
  `window.location.pathname` checks (e.g. `/join/:code` for multiplayer
  invites) — there is no `react-router` or similar in `package.json`.
- Production env vars are stored on Vercel (Encrypted), not just locally:
  Firebase config (6 `VITE_FIREBASE_*` vars, client-exposed), plus
  server-only secrets `SECRET_GOOGLE_SEARCH_KEY/CX`, `SECRET_OPENAI_KEY`,
  `UPSTASH_REDIS_REST_URL/TOKEN`, and a `VIP_PASSWORD`. `.env.local` /
  `.env.production.local` on disk mirror a subset of these for local dev.

## 4. Decision: new path on the same site, same Firebase project

You confirmed the direction: **a new path on the existing live site**
(`brackets-jet.vercel.app/<new-path>`), not a new domain/project, and **reuse
the same Firebase project** with data kept isolated in its own
collection(s). Here's exactly how that maps onto what's in the repo today:

### Routing: same deployment, new path
`vercel.json`'s catch-all rewrite (`/(.*)` → `/index.html`) already sends
every unknown path to the SPA, and `App.tsx` already branches on
`window.location.pathname` for the one existing special case (`/join/:code`
for multiplayer invites — see `src/App.tsx` around the `isJoinUrl` check).
Adding a second path (e.g. `/lab`, or whatever name you pick) means:
1. Add a `pathname.startsWith('/lab')` (or equivalent) branch in `App.tsx`.
2. Render a wholly separate component tree for it (new top-level component,
   doesn't touch `useGameStore` or `useMultiplayerStore`).
3. Ship it in the same `git push origin main` as everything else — one
   build, one deploy, one URL, new path live immediately.

No Vercel config changes needed at all beyond what's already there.

### Data: same Firebase project, isolated collection
`src/services/firebase.ts` initializes one Firestore instance
(`export const db = getFirestore(app)`) and today only touches **one
collection**: `rooms` (every multiplayer read/write in that file is
`doc(db, 'rooms', roomCode)`). Firestore is schemaless/collection-based
rather than table-based, but the concept maps directly:
- Add a **new top-level collection** — e.g. `db, 'lab_items'` or whatever
  name fits the new thing — with its own document shape.
- It lives in the exact same Firebase project (same `VITE_FIREBASE_*` env
  vars, same billing, same console), but is structurally 100% separate from
  `rooms`: different collection name, no shared schema, no risk of the two
  features colliding or one's security rules affecting the other (Firestore
  security rules are matched per collection path, so `rooms/**` rules won't
  apply to `lab_items/**` unless you write them that way).
- Only shared surface area: the Firebase project quota/plan (Spark free tier
  limits, if that's what's in use) and whatever Firestore security rules file
  governs the project — worth a quick look at those rules once we know the
  new feature's read/write pattern, to make sure the new collection isn't
  accidentally left wide open or accidentally blocked by a catch-all rule.

### Net effect
No new Vercel project, no new domain, no new Firebase project. One new
branch in `App.tsx`'s routing, one new Firestore collection, same deploy
pipeline you already trust. This is essentially "Option A" from the earlier
draft of this doc, now confirmed as the actual direction rather than one of
several choices.

## 5. Open questions before implementing

1. What should the new path be called, and what should the "personal thing"
   actually do (so I can figure out what UI/state/collection shape it
   needs)?
2. Any auth requirement for it (should it be open to anyone who hits the
   URL, or gated somehow — the app already has a `VIP_PASSWORD` secret in
   Vercel env, unclear if that's relevant here)?
3. ~~Want me to go delete `origin/update-readme-audit-progress`...~~ Done —
   deleted 2026-07-28 (confirmed fully merged, zero unique commits).
4. The apparently-dormant `brackets-16` Vercel project — separate question
   from the branch above (it's a whole separate Vercel project, not a git
   branch) — still open on whether that's safe to remove; not yet
   investigated in depth.
