# StudyBuddy — Product Requirements Document (PRD)

*Last updated: Oct 17, 2025 • Owner: Henry (CTO)*

---

## 1) One-liner & Goal

**StudyBuddy** is a mobile-first PWA that lets students *talk* to an AI buddy to master SAT vocabulary. Users review with flashcards and then enter **Test Mode** where they **speak definitions**; the app transcribes via **Whisper** and grades with **gpt-5-nano**. We track per-word pass/fail and simple spaced repetition to prioritize weak items.

**Primary goal (Phase 1):** Deliver a delightful, fast, voice-first study flow for SAT vocab with clear progress and personalized feedback.

---

## 2) Target Users & JTBD

* **HS Students prepping for SAT** (primary)

  * *JTBD:* “When I’m studying vocab on my phone, help me practice and be told quickly whether I’m right, with tips to remember what I miss.”
* **Parents/Tutors** (secondary)

  * *JTBD:* “Let me see that practice is happening and where the student struggles.”

---

## 3) Scope

### In-Scope (Phase 1)

* PWA (installable) with mobile portrait-first layout; responsive desktop layout.
* **Two modes**: Review (free flip/swipe) & Test (voice, SR, grading).
* Word list import (JSON → Neon Postgres) + **lazy-load definitions on-demand** via `dictionaryapi.dev` (cached 24h).
* Simple spaced repetition (SR) in **Test Mode** (see §10).
* Auth with **Clerk** (Google; email OTP fallback optional in Phase 2).
* Stats roll-ups per word and user (accuracy, attempts, last seen).
* Clear permission education & microphone gating.
* Profile page (name, email, sign out, stats).
* Basic SEO & Logged-out landing page with CTA.

### Out-of-Scope (Phase 1)

* Multiplayer / tutor dashboards.
* Custom decks & shared lists.
* Advanced SR algorithms (SM-2, FSRS).
* iOS/Android native shells.
* Gamification (streaks, XP) beyond very light badges.

---

## 4) User Stories

* **Auth & onboarding**

  * As a new user, I can sign in with Google (Clerk) and see a short explainer of Review vs Test.
  * As a user, I’m prompted *why* the mic is needed **before** the browser permission dialog, and the app clearly won’t proceed to Test without it.

* **Review Mode**

  * As a user, I can swipe/flip flashcards (word ↔ definition), mark a word with a **“Test me” checkbox** to add it to my Test queue, and move freely within the deck.
  * I can see **where I am** in the deck and overall counts (reviewed, added-to-test).

* **Test Mode**

  * As a user, I select a set of words (default: my “Test me” set + SR-due words) and **speak the definition** when prompted with a word.
  * I see near-real-time feedback: **Pass/Retry**, a short tip/mnemonic, and a confidence score.
  * I can long-press or tap to hear the **correct definition** (TTS optional Phase 2).
  * If Whisper fails/low-confidence, I get a clean retry with guidance.

* **My Cards & Profile**

  * As a user, I can view all cards I've reviewed or tested on in "My Cards" with search and filter options.
  * I can remove cards from my reviewed list (but not tested cards).
  * I can access my Profile by clicking my avatar to see stats and account settings.

---

## 5) Experience & UI Notes

### Overall vibe

* **Fun, whimsical, minimal.** Soft rounded cards, subtle micro-interactions, playful but clean empty states.

### Layout & Navigation

* **Portrait (primary):**

  * **Header:** App name/logo, nav (Review, Test, My Cards), user avatar (Clerk - links to Profile).
  * **Main:** Progress strip (position in deck / due words), mode toggle (Review/Test), card stack.
* **Desktop:** Two-column: left = card; right = tips, stats, queue list.

### Landing (logged-out)

* Hero: “Talk your way to SAT vocab mastery.”
* Feature tiles (Voice testing • Smart repetition • Track progress)
* CTA buttons: **Sign up** / **Log in** (Clerk).

### Review Mode Screen

* Card shows **Word** front → flip to **primary definition** (+ examples if available).
* Controls: **Add to Test** checkbox, swipe left/right; mini-map (n/N).
* Action row: “Shuffle”, “Select All for Test”, filter (All / Marked / New).

### Test Mode Screen

* Pre-test modal: “You’ll speak definitions. We transcribe and grade. Allow mic?”

  * Inline explainer: “We only record locally to transcribe this session.” (see Privacy)
  * Button → mic permission flow.
* Card shows **Word** big & bold; below, **Record** button (hold-to-talk & tap-to-toggle both supported).
* After stop: show “Transcribing… → Grading…” loader.
* Result state:

  * **Pass:** green check, short praise line, “Next”
  * **Almost:** neutral highlight, show key missing elements, “Retry”
  * **Fail:** gentle nudge, show concise definition & **mnemonic** tip
* Footer: Next due count, accuracy %, session streak, **End Session**.

### Permission UX

* Before calling `getUserMedia`, show inline sheet: why mic is needed, privacy statement, a preview of what happens, then “Continue”. If denied, show retry instructions with browser-specific help.

### My Cards Screen

* Search bar to filter through reviewed and tested cards.
* Card list with status indicators: Reviewed (flipped), Tested (right/wrong), and test count.
* Filter options: All | Reviewed Only | Tested Only | Correct Only | Incorrect Only.
* Remove button for reviewed cards (tested cards cannot be removed).
* Sort options: Recently reviewed | Recently tested | Alphabetical | Accuracy.

### Profile

* Avatar, Name (editable), Email (read-only), Sign out, quick stats tiles:

  * Words studied, Accuracy last 7 days, Due today.

---

## 6) Architecture

**Frontend:** Next.js (App Router, TypeScript) + Tailwind + ShadCN UI + Heroicons + react-quizlet-flashcard
**Auth:** Clerk
**AI:** Vercel AI SDK → Whisper (STT) & gpt-5-nano (grading + hints)
**Data:** Neon (Postgres) via Prisma or Drizzle
**Hosting:** Vercel
**Dictionary:** `dictionaryapi.dev` (server-side fetch + cache)

**Key flows**

1. **Word Import**: Load word list (terms only) from JSON → Neon. No definitions stored initially.
2. **Review**: Client fetches words → lazy-load definitions on-demand from API route → **multi-tier cache** (in-memory → database → API). User toggles "Test me".
3. **Test**: Client records audio → sends audio blob to API route → Whisper transcription → clean text → send to **grader** prompt (with definition fetched on-demand) → return result + mnemonic; post attempt to DB; SR scheduler updates due.
4. **Stats**: Server renders aggregates for speed; client hydrates deltas.

**PWA**

* `manifest.webmanifest` (name, icons, theme)
* Service worker for asset caching; defer offline test mode to Phase 2.

---

## 7) Data Model (Neon/Postgres)

> Prefer **Drizzle** schema; below shows conceptual tables (SQL-ish).

```sql
-- Users are in Clerk; we store profile + denorm stats.
CREATE TABLE user_profile (
  user_id TEXT PRIMARY KEY,            -- Clerk user id
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE word (
  id SERIAL PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  part_of_speech TEXT,
  source TEXT DEFAULT 'sat_base'
);

-- Word definitions - cached from dictionary API with full metadata
CREATE TABLE definition (
  id SERIAL PRIMARY KEY,
  word_id INT REFERENCES word(id) ON DELETE CASCADE,
  definition TEXT NOT NULL,
  example TEXT,
  part_of_speech TEXT NOT NULL,
  phonetic TEXT,
  synonyms TEXT,                       -- JSON array stored as text
  antonyms TEXT,                       -- JSON array stored as text
  rank SMALLINT DEFAULT 1,             -- 1 = primary, 2+ = alternates
  source TEXT DEFAULT 'free-dictionary-api',
  cached_at TIMESTAMPTZ DEFAULT now()
);

-- User ↔ Word mastery record (SR + accuracy)
CREATE TABLE user_word (
  user_id TEXT REFERENCES user_profile(user_id) ON DELETE CASCADE,
  word_id INT REFERENCES word(id) ON DELETE CASCADE,
  in_test_queue BOOLEAN DEFAULT FALSE,
  ease REAL DEFAULT 2.5,               -- for future SR algorithms
  interval_days INT DEFAULT 0,
  due_on DATE,
  stability REAL,                      -- reserved for FSRS
  last_result TEXT,                    -- 'pass'|'fail'|'almost'
  streak INT DEFAULT 0,
  has_reviewed BOOLEAN DEFAULT FALSE,  -- user has flipped the card
  first_reviewed_at TIMESTAMPTZ,       -- when card was first flipped
  last_reviewed_at TIMESTAMPTZ,        -- when card was last flipped
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE attempt (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES user_profile(user_id),
  word_id INT REFERENCES word(id),
  mode TEXT CHECK (mode IN ('test','review')),
  transcript TEXT,
  grade TEXT,                          -- 'pass'|'almost'|'fail'
  score REAL,                          -- 0..1
  feedback TEXT,                       -- tip/mnemonic
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Denorm daily aggregates (for fast stats)
CREATE TABLE user_daily_stats (
  user_id TEXT,
  day DATE,
  attempts INT,
  passes INT,
  fails INT,
  UNIQUE (user_id, day)
);
```

**Indexes**

* `attempt(user_id, created_at desc)`, `user_word(user_id, due_on)`, `definition(word_id, rank)`

---

## 8) API Surface (Next.js App Router /api/*)

*All API routes secured by Clerk middleware; responses JSON.*

* `POST /api/import/words` (admin/dev only)

  * Body: `{ words: Array<string> }` (just terms)
  * Loads JSON seed of word terms only. Fast import, no API dependency.

* `GET /api/words?cursor=…&q=…`

  * Returns paginated words (terms only). For Review.

* `GET /api/words/[id]/definition`

  * Lazy-loads definition for a specific word with **multi-tier caching**:
    * **L1**: In-memory cache (fastest, runtime only)
    * **L2**: Database cache (persistent, 7 days)
    * **L3**: API scrapers (Free Dictionary API → Exa.ai fallback)
  * Returns: `{ word, wordId, definitions: [{ word, phonetic, meanings: [{ partOfSpeech, definitions: [{ definition, example, synonyms, antonyms }] }] }] }`
  * Automatically saves fetched definitions to database for future requests

* `POST /api/review/queue`

  * Body: `{ wordId: number, add: boolean }` → toggles `in_test_queue`.

* `GET /api/test/next?limit=20`

  * Returns a selection: SR-due + queued words.

* `POST /api/test/attempt`

  * **Multipart**: audio blob (webm/ogg) + `{ wordId }`
  * Server flow: Whisper STT → grade (gpt-5-nano) → compute tip → persist Attempt → update `user_word` SR fields → return `{ grade, score, feedback, latencyMs }`.

* `GET /api/my-cards?search=…&filter=…&sort=…`

  * Returns user's reviewed and tested cards with search and pagination.

* `DELETE /api/my-cards/[wordId]`

  * Removes a card from reviewed list (only if not tested).

---

## 9) Grading & SR Logic

### 9.1 Whisper → Grader Prompt (gpt-5-nano)

**Input:** `{ word, canonical_def, transcript }`
**Output (JSON):**

```json
{
  "grade": "pass|almost|fail",
  "score": 0.0,
  "missing_key_ideas": ["..."],
  "feedback": "One-sentence mnemonic or hint."
}
```

**System Prompt (concise):**

> You are an SAT vocabulary grader. Compare the user’s spoken definition to the canonical one. Accept paraphrases. Require the **core meaning**; ignore minor grammar.
> **Pass** if the transcript captures the essential meaning and 1–2 key facets.
> **Almost** if partially correct but missing a critical facet.
> **Fail** if incorrect or off-topic.
> Return strict JSON as specified.

**Canonical definition selection:** use `definition.rank = 1` (primary). If absent, choose shortest precise meaning.

### 9.2 Simple SR (Phase 1)

* On **pass**:

  * `streak += 1`
  * if `interval_days == 0` → set `interval_days = 1` else `interval_days = ceil(interval_days * 2)` (cap at 21 for Phase 1)
  * `due_on = today + interval_days`
* On **almost**:

  * `interval_days = max(1, floor(interval_days * 0.5))`
  * `due_on = today + interval_days`
* On **fail**:

  * `streak = 0`
  * `interval_days = 1`
  * `due_on = today + 1`

Selection for `/api/test/next`:

1. All `due_on <= today` (sorted by oldest due); then
2. any `in_test_queue = true` not already due;
3. fill to `limit` with recent fails.

---

## 10) Component Map (React)

* `app/(marketing)/page.tsx` — landing (logged-out)
* `app/(app)/layout.tsx` — authenticated shell, header/nav
* `app/(app)/review/page.tsx`

  * `<ProgressStrip />`, `<ModeToggle />`
  * `<FlashcardStack />` (react-quizlet-flashcard)
  * `<AddToTestCheckbox />`
  * `<DeckMiniMap />`
* `app/(app)/test/page.tsx`

  * `<MicPermissionExplainer />` → `<Recorder />`
  * `<TestCard />` (word, controls)
  * `<ResultPanel />` (pass/almost/fail UI, tips)
  * `<SessionFooter />`
* `app/(app)/my-cards/page.tsx`

  * `<SearchBar />`, `<FilterSort />`, `<CardList />`
  * `<CardItem />` with remove button (reviewed only)
* `app/(app)/profile/page.tsx`

  * `<StatsTiles />`, `<AccuracyChart />`, `<DueList />`
* Shared: `<ClerkUserButton />`, `<Toast />`, `<Spinner />`

---

## 11) State & Data Fetching

* **Words/Review:** `GET /api/words` (SWR) with cursor; local selection state for “Add to Test”.
* **Test queue:** `GET /api/test/next` prefetch; hydrate into a queue atom.
* **Attempts:** Optimistic UI on grade result (pending spinner).
* **Stats:** Server components for initial render + SWR refresh.

---

## 12) Permissions & Privacy

* **Mic:** Inline rationale → browser prompt. Persist a `micAllowed` flag in local storage; if denied, show OS-specific tips to re-enable.
* **Privacy copy (Phase 1):** “Audio is used to create a text transcript for grading and is **not stored** after grading. Transcripts may be logged for quality in anonymized form.” (toggleable in settings Phase 2).
* **PII:** Clerk holds auth; we store Clerk `user_id`, display name, email.
* **Compliance:** COPPA not targeted; show 13+ age notice on sign-up page.

---

## 13) Error States & Edge Cases

* **STT low confidence / silence:** Show “We didn’t catch that—try again closer to the mic.”
* **Network fail:** Retry CTA; queue attempt locally (Phase 2 offline).
* **Dictionary missing:** Show internal definition; flag for admin audit.
* **Grade parse error:** Fall back to rules-based keyword check (Phase 1 simple nouns list), log error.

---

## 14) Analytics & Telemetry

* Events (to Vercel Analytics or PostHog):

  * `auth_signin`, `mic_prompt_shown`, `mic_granted`, `mic_denied`
  * `review_mark_for_test`, `review_flip`, `review_complete`
  * `test_started`, `attempt_submitted`, `attempt_result:{pass|almost|fail}`
  * `latency_stt_ms`, `latency_grade_ms`, `latency_total_ms`
  * `session_end`, `install_pwa_click`, `install_pwa_success`
* Dimensions: user_id (hashed), word_id, network type (if available), device.

---

## 15) Non-Functional Requirements

* **Performance:** First interaction < 1.5s; audio upload ≤ 600KB typical; total grade P50 < 2.5s.
* **Accessibility:** Keyboard operable; focus ring; ARIA labels for record.
* **Localization:** English only (Phase 1).
* **Security:** All API routes behind Clerk; server-only AI keys; rate limit `/api/test/attempt` per user (e.g., 60/min).
* **PWA:** Installable; works without mic (Review Mode still usable).

---

## 16) Content & Copy (draft)

* Landing hero: “**Talk your way to SAT vocab mastery.** Review with cards, then *speak* definitions to your StudyBuddy—and get instant, friendly feedback.”
* Mic explainer: “We’ll use your microphone only to transcribe what you say so we can grade it. It won’t work without it.”
* Pass toast: “Nice! You nailed the essence.”
* Almost: “Close! Add this key idea: **$MISSING_KEY**.”
* Fail: “No worries—remember: **$MNEMONIC**.”

---

## 17) Dictionary Integration

* **Multi-tier caching strategy** for optimal performance:
  * **L1 (In-memory)**: Fast runtime cache, cleared on server restart
  * **L2 (Database)**: Persistent cache with 7-day TTL, includes full metadata (examples, synonyms, antonyms, phonetics)
  * **L3 (API)**: Free Dictionary API (primary) → Exa.ai (fallback)
* Definitions are fetched on-demand (lazy-loaded) when users view flashcards
* All metadata stored: definition, example, part of speech, phonetic, synonyms, antonyms, rank
* Cache duration: 7 days (definitions are stable and rarely change)

---

## 18) Admin/Dev Tooling (Phase 1 minimal)

* `POST /api/import/words` behind `ADMIN_USER_IDS`.
* `/api/admin/recompute-due` for backfills.
* Feature flag: `NEXT_PUBLIC_GRADER_VERBOSE` to display grader debug panel in dev.

---

## 19) Testing Checklist

* Mic permission flows across Chrome iOS/Android, Safari iOS, Desktop.
* Whisper transcription accents & background noise.
* Grader robustness to synonyms and partial answers.
* SR schedule transitions: new → 1d → 2d → 4d → 8d → 16d → cap.
* PWA installability & icon set.
* Auth route protection (SSR + RSC).
* DB migrations reproducible (Drizzle) on Neon branches.

---

## 20) Rollout Phases

### Phase 0 — Prototype

* Review Mode with flashcards and “Add to Test”.
* Test Mode with mic permission, Whisper transcription, mock grading.
* Neon schema + seed SAT words; dictionary fetch + cache.

### Phase 1 — MVP

* Real grading via gpt-5-nano + feedback tips.
* Simple SR scheduling & `/test/next` mixing due + queued.
* Stats tiles, profile page; basic analytics; PWA manifest.

### Phase 2 — Polish & Scale

* Desktop enhancements; accessibility sweep; faster loaders.
* TTS for correct definitions; richer examples.
* Offline Review; queued Attempts for flaky networks.
* Tutor/parent read-only dashboard (basic).

---

## 21) Open Questions

* Do we want **voice activity detection** (VAD) client-side to auto-stop recording?
* Keep short audio snippets client-side only, or allow opt-in cloud retention for QA?
* Add **keyword hints** on “Almost” (colored chips) without giving away answer?
* Badge/streaks light gamification in Phase 2?

---

## 22) Environment & Config

* **Env vars**

  * `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  * `OPENAI_API_KEY` (Whisper + gpt-5-nano via Vercel AI SDK)
  * `DATABASE_URL` (Neon)
  * Optional: `ADMIN_USER_IDS`, `ANALYTICS_WRITE_KEY`
* **Rate limiting:** Upstash Redis or Vercel Edge Config (Phase 1 light).

---

## 23) Example Grader Contract

**Request (server → model)**

```json
{
  "word": "aberration",
  "canonical_def": "a departure from what is normal, usual, or expected, typically one that is unwelcome",
  "transcript": "something that deviates from the normal or expected"
}
```

**Response**

```json
{
  "grade": "pass",
  "score": 0.92,
  "missing_key_ideas": [],
  "feedback": "Think 'a-variation'—away from the norm."
}
```

---

## 24) Minimal Wire Copy (for dev)

* **Header:** “StudyBuddy” • Review • Test • Profile • Avatar
* **Review empty:** “No words yet. Import or pick a deck.”
* **Test pre-modal:** “You’ll speak definitions. Allow mic to continue.”
* **Result buttons:** “Retry” • “Next” • “Show definition”

---

## 25) Acceptance Criteria (MVP)

* I can install the PWA on iOS/Android/Chrome desktop.
* I can review at least **300** seeded SAT words with flip/swipe.
* I can add words to the test queue and run a 10-word test session.
* Speaking definitions returns graded results with tips in <5s P95.
* The profile shows my attempts and per-word accuracy.
* Denying mic shows clear remediation and blocks only Test Mode (Review works).

---

## 26) Risks & Mitigations

* **STT noise & accents:** Use Whisper large-v3 or high-accuracy tier; allow quick retry; show “hold phone closer”.
* **Over-strict grading:** Tune prompt; add acceptance examples; cap “fail” on borderline to “almost”.
* **Latency:** Stream upload; compress audio; run grading on edge route where possible.
* **User trust:** Transparent privacy copy; no persistent audio by default.

---

## 27) Future Extensions

* Advanced SR (SM-2/FSRS), adaptive difficulty.
* Custom decks, import from CSV, Quizlet import.
* Games (lightning rounds), streaks, badges.
* Explanatory etymology & roots module.
* Multi-language learning (EN↔ES) & pronunciation scoring.

---
