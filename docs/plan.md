# StudyBuddy Implementation Plan

**Last Updated:** Oct 31, 2025 - 4:00 PM  
**Scope:** Phase 2 (Multi-Stack Architecture) - Major Re-architecture  
**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, Neon Postgres, Clerk Auth, Vercel AI SDK, Tailwind CSS, ShadCN UI, Lucide Icons

**Progress:** Starting Phase 2 - Multi-Stack Card System
- ✅ Phase 0: Complete
- ✅ Phase 1: Complete (MVP)
- 🚧 Phase 2: In Progress - Multi-stack architecture with custom card creation

---

## Overview

Building a mobile-first PWA for SAT vocabulary learning with voice-based testing. The app will be built directly in `/Users/henry/Development/study-buddy` (root directory, not a subdirectory).

**Key Technologies:**
- **Frontend:** Next.js 15 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, ShadCN UI components, Lucide icons
- **Auth:** Clerk (Google OAuth)
- **Database:** Neon Postgres with Drizzle ORM
- **AI:** Vercel AI SDK with OpenAI (Whisper for STT, gpt-5-nano for grading)
- **Deployment:** Vercel
- **Dictionary:** dictionaryapi.dev

**Word List:** 384 SAT words from `docs/sample-words.json`

---

## Phase 0: Foundation & Prototype

### 0.1 Project Setup & Dependencies
**Status:** ✅ Complete

**Tasks:**
- [x] Initialize Next.js 15 project with TypeScript and App Router
- [x] Install core dependencies:
  - `@clerk/nextjs` - Authentication
  - `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless` - Database
  - `ai`, `@ai-sdk/openai` - Vercel AI SDK
  - `tailwindcss`, `@tailwindcss/typography` - Styling
  - `class-variance-authority`, `clsx`, `tailwind-merge` - Utils
  - `zod` - Schema validation
  - `react-quizlet-flashcard` - Flashcard component
  - `lucide-react` - Icons
  - `swr` - Data fetching
  - `dotenv` - Environment variable loading
- [x] Set up ShadCN UI: `button`, `card` (more components to be added as needed)
- [x] Configure `tailwind.config.ts` with custom theme
- [x] Create `.env.local.example` template

**Files Created:**
- ✅ `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- ✅ `.env.local.example`, `.gitignore`
- ✅ `components.json` (ShadCN config)
- ✅ `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- ✅ `lib/utils.ts`
- ✅ `components/ui/button.tsx`, `components/ui/card.tsx`
- ✅ `README.md`

**Notes:**
- Next.js 15.5.6 running with Turbopack
- 476 packages installed successfully
- Dev server running on http://localhost:3001

---

### 0.2 Database Schema & Setup
**Status:** ✅ Complete

**Tasks:**
- [x] Create Drizzle schema at `lib/db/schema.ts`:
  - `user_profile` (user_id, display_name, email, created_at)
  - `word` (id, term, part_of_speech, source)
  - `definition` (id, word_id, definition, example, provider, rank)
  - `user_word` (user_id, word_id, in_test_queue, ease, interval_days, due_on, last_result, streak)
  - `attempt` (id, user_id, word_id, mode, transcript, grade, score, feedback, latency_ms, created_at)
  - `user_daily_stats` (user_id, day, attempts, passes, fails)
- [x] Add indexes: `attempt(user_id, created_at)`, `user_word(user_id, due_on)`, `definition(word_id, rank)`
- [x] Create `drizzle.config.ts` with dotenv support
- [x] Set up Neon connection at `lib/db/index.ts`
- [x] Generate and run migrations

**Files Created:**
- ✅ `lib/db/schema.ts` - Complete schema with all 6 tables and type exports
- ✅ `lib/db/index.ts` - Neon database connection
- ✅ `drizzle.config.ts` - Drizzle Kit config with .env.local loading
- ✅ `drizzle/0000_bizarre_inhumans.sql` - Generated migration

**Notes:**
- Connected to Neon project: "study-buddy" (aged-lab-54538554)
- All tables successfully created in Neon database
- Indexes and foreign keys properly configured
- Type-safe schema exports for all tables

---

### 0.3 Word Import & Dictionary Integration
**Status:** ✅ Complete (Multi-tier Caching)

**Tasks:**
- [x] Create dictionary client at `lib/dictionary.ts`:
  - Multi-tier caching: In-memory → Database → API
  - Fetch from Free Dictionary API (primary) and Exa.ai (fallback)
  - Cache duration: 7 days (definitions are stable)
- [x] Simplify import utility at `lib/import-words.ts`:
  - Read `docs/sample-words.json`
  - Import ONLY word terms (no definitions)
  - Fast, no API dependency
- [x] Create admin API: `app/api/import/words/route.ts`
  - POST endpoint (admin only)
  - Imports terms only
- [x] Create definition API: `app/api/words/[id]/definition/route.ts`
  - GET endpoint for lazy-loading definitions
  - Fetches on-demand with multi-tier caching
  - Automatically saves to database for persistence
- [x] Add `definition` table to database schema:
  - Stores full metadata: definition, example, phonetic, synonyms, antonyms, part of speech, rank
  - Indexed by word_id and rank for fast lookups
  - Cached_at timestamp for TTL management

**Files Created:**
- ✅ `lib/dictionary.ts` - Dictionary client with multi-tier caching (L1: memory, L2: DB, L3: API)
- ✅ `lib/import-words.ts` - Simple word term import (no definitions)
- ✅ `app/api/import/words/route.ts` - Admin API endpoint for term imports
- ✅ `app/api/words/[id]/definition/route.ts` - Lazy-load definition endpoint with DB caching
- ✅ `lib/db/schema.ts` - Updated with `definition` table and relations
- ✅ `drizzle/0001_sticky_brood.sql` - Migration for definition table

**Architecture:**
- **L1 Cache (In-memory)**: Fastest, runtime only, cleared on restart
- **L2 Cache (Database)**: Persistent, 7-day TTL, includes all metadata
- **L3 (API)**: Free Dictionary API → Exa.ai fallback
- Definitions fetched on-demand, automatically saved to DB for future requests
- Full metadata stored: examples, synonyms, antonyms, phonetics, part of speech

---

### 0.4 Authentication Setup (Clerk)
**Status:** ✅ Complete

**Tasks:**
- [x] Configure Clerk middleware at `middleware.ts`
- [x] Create auth layout: `app/(auth)/layout.tsx`
- [x] Create sign-in page: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- [x] Create sign-up page: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- [x] Create user sync utility: `lib/sync-user.ts`
- [x] Add webhook handler: `app/api/webhooks/clerk/route.ts`

**Files Created:**
- ✅ `middleware.ts` - Clerk middleware with route protection
- ✅ `app/(auth)/layout.tsx` - Simple auth layout wrapper
- ✅ `app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Sign-in page with Clerk component
- ✅ `app/(auth)/sign-up/[[...sign-up]]/page.tsx` - Sign-up page with Clerk component
- ✅ `lib/sync-user.ts` - User sync utility for database
- ✅ `app/api/webhooks/clerk/route.ts` - Webhook handler for user events

**Notes:**
- Middleware already configured with public/protected routes
- Auth pages use Clerk's pre-built components with custom styling
- Webhook handler syncs user data to database on create/update
- User must configure CLERK_* environment variables

---

### 0.5 Landing Page (Logged-Out)
**Status:** ✅ Complete

**Tasks:**
- [x] Create marketing layout: `app/(marketing)/layout.tsx`
- [x] Create landing page: `app/(marketing)/page.tsx`
  - Hero: "Talk your way to SAT vocab mastery"
  - Feature tiles (Voice testing, Smart repetition, Track progress)
  - CTA buttons
- [x] Add SEO metadata

**Files Created:**
- ✅ `app/(marketing)/layout.tsx` - Marketing shell with header, footer, auth buttons
- ✅ `app/(marketing)/page.tsx` - Landing page with hero, features, how-it-works, CTA sections
- ✅ `app/layout.tsx` - Enhanced with comprehensive SEO metadata, Open Graph, Twitter cards

**Notes:**
- Mobile-first responsive design with Tailwind CSS
- Gradient branding (blue-600 to purple-600)
- Clerk SignInButton and SignUpButton integrated
- Lucide icons for features (Mic, Brain, TrendingUp)
- SEO optimized with title templates, robots directives, PWA manifest link

---

### 0.6 App Shell & Navigation
**Status:** ✅ Complete

**Tasks:**
- [x] Create app layout: `app/(app)/layout.tsx`
  - Header with logo, nav tabs, user avatar
  - Mobile-first responsive
- [x] Create header component: `components/layout/header.tsx`
- [x] Create nav component: `components/layout/nav.tsx`

**Files Created:**
- ✅ `app/(app)/layout.tsx` - Protected layout with auth check and Header
- ✅ `components/layout/header.tsx` - Sticky header with logo, nav, and UserButton
- ✅ `components/layout/nav.tsx` - Responsive navigation with Review/Test/Profile tabs
- ✅ `app/(app)/review/page.tsx` - Placeholder Review page
- ✅ `app/(app)/test/page.tsx` - Placeholder Test page
- ✅ `app/(app)/profile/page.tsx` - Placeholder Profile page with user info

**Notes:**
- Mobile-first design: bottom nav on mobile, horizontal nav on desktop
- Active route highlighting with pathname detection
- Lucide icons: BookOpen (Review), Mic (Test), User (Profile)
- Clerk UserButton integrated with custom styling
- Auth protection at layout level - redirects to sign-in if not authenticated

---

### 0.7 Review Mode - Basic Flashcards
**Status:** ✅ Complete

**Tasks:**
- [x] Create Review page: `app/(app)/review/page.tsx`
- [x] Create API: `app/api/words/route.ts` (GET with pagination)
- [x] Create flashcard components:
  - `components/review/flashcard-stack.tsx`
  - `components/review/flashcard.tsx`
  - Front: Word | Back: Definition + example
- [x] Add flip interactions (3D CSS transforms)
- [x] Create progress strip: `components/review/progress-strip.tsx`
- [x] Create "Add to Test" checkbox: `components/review/add-to-test-checkbox.tsx`
- [x] Create API: `app/api/review/queue/route.ts` (POST to toggle queue)

**Files Created:**
- ✅ `app/(app)/review/page.tsx` - Full Review page with state management
- ✅ `app/api/words/route.ts` - Paginated words API with user-specific data
- ✅ `app/api/review/queue/route.ts` - Toggle test queue API
- ✅ `components/review/flashcard.tsx` - 3D flip card with lazy-loaded definitions
- ✅ `components/review/flashcard-stack.tsx` - Card navigation and controls
- ✅ `components/review/progress-strip.tsx` - Progress bar and stats
- ✅ `components/review/add-to-test-checkbox.tsx` - Queue toggle with optimistic UI
- ✅ `components/ui/checkbox.tsx`, `components/ui/label.tsx` - ShadCN components
- ✅ `app/globals.css` - Added 3D flip card CSS utilities

**Notes:**
- 3D flip animation with CSS transforms (perspective, backface-visibility)
- Definitions lazy-loaded on flip via `/api/words/[id]/definition`
- Left/right navigation through word deck
- Real-time queue count updates
- Loading states and error handling
- Mobile-optimized touch interactions

---

### 0.8 Test Mode - Mic Permission & Recording
**Status:** ✅ Complete

**Tasks:**
- [x] Create Test page: `app/(app)/test/page.tsx`
- [x] Create mic permission components:
  - `components/test/mic-permission-explainer.tsx`
  - `components/test/mic-permission-denied.tsx`
- [x] Create recorder: `components/test/recorder.tsx`
  - Web Audio API (`getUserMedia`)
  - Record button (tap-to-toggle)
  - Visual feedback with timer
  - Store as blob (webm/ogg)
- [x] Add permission state management
- [x] Create test card: `components/test/test-card.tsx`

**Files Created:**
- ✅ `app/(app)/test/page.tsx` - Full Test Mode with state management
- ✅ `components/test/mic-permission-explainer.tsx` - Permission education UI
- ✅ `components/test/mic-permission-denied.tsx` - Browser-specific retry instructions
- ✅ `components/test/recorder.tsx` - Audio recorder with visual feedback
- ✅ `components/test/test-card.tsx` - Word display with recorder
- ✅ `lib/audio-recorder.ts` - Audio recording utility class

**Notes:**
- Permission flow: explainer → browser prompt → granted/denied states
- Browser-specific instructions for re-enabling mic access
- Real-time recording duration display
- Automatic cleanup of media streams

---

### 0.9 Test Mode - Whisper Transcription (Mock Grading)
**Status:** ✅ Complete

**Tasks:**
- [x] Create API: `app/api/test/attempt/route.ts`
  - POST (multipart: audio + wordId)
  - Whisper transcription via OpenAI API
  - Mock grading for Phase 0 (keyword matching)
  - Log to `attempt` table
  - Update `user_word` streak tracking
- [x] Create Whisper utility: `lib/whisper.ts`
- [x] Create result panel: `components/test/result-panel.tsx`
  - Show transcript, grade, feedback
  - Buttons: Next/Retry
- [x] Add loading states (spinners)
- [x] Update test page for attempt flow

**Files Created:**
- ✅ `app/api/test/attempt/route.ts` - Complete attempt processing pipeline
- ✅ `lib/whisper.ts` - Whisper transcription + mock grading utility
- ✅ `components/test/result-panel.tsx` - Result display with grade-specific UI
- ✅ `components/ui/spinner.tsx` - Loading spinner component

**Notes:**
- Whisper transcription via OpenAI API (direct fetch)
- Mock grading uses keyword matching (60% match = pass, 30-60% = almost, <30% = fail)
- Latency tracking for performance monitoring
- Automatic streak updates in user_word table
- Phase 1 will replace mock grading with gpt-5-nano

---

### 0.10 Test Mode - Word Selection & Queue
**Status:** ✅ Complete

**Tasks:**
- [x] Create API: `app/api/test/next/route.ts`
  - GET with `?limit=20`
  - Phase 0: Return words where `in_test_queue = true`
  - Shuffle and limit
- [x] Update test page:
  - Fetch queue on load
  - Display count
  - Iterate through words
  - Empty state with CTA
- [x] Create session footer: `components/test/session-footer.tsx`

**Files Created:**
- ✅ `app/api/test/next/route.ts` - Queue selection API with shuffling
- ✅ `components/test/session-footer.tsx` - Session progress and stats footer

**Notes:**
- Test page already updated with queue fetching and iteration
- Fallback to `/api/words` if queue is empty
- Session completion screen with accuracy stats
- Real-time accuracy calculation during session
- Phase 1 will add SR-due words to queue selection

---

## Phase 1: MVP Features

### 1.1 Real Grading with gpt-4o-mini
**Status:** ✅ Complete

**Tasks:**
- [x] Create grading utility: `lib/grader.ts`
  - Use Vercel AI SDK with gpt-4o-mini
  - System prompt from PRD §9.1
  - Return: `{ grade, score, missing_key_ideas, feedback }`
  - Zod schema validation
- [x] Update `/api/test/attempt` to use real grading
- [x] Add verbose debug mode (if `NEXT_PUBLIC_GRADER_VERBOSE=true`)

**Files Created:**
- ✅ `lib/grader.ts` - AI grading with fallback
- ✅ `lib/prompts.ts` - System prompts
- ✅ Updated `app/api/test/attempt/route.ts`

**Notes:**
- Using gpt-4o-mini (cost-effective, fast)
- Fallback to keyword matching if AI fails
- Temperature 0.3 for consistent grading

---

### 1.2 Spaced Repetition (SR) Scheduling
**Status:** ✅ Complete

**Tasks:**
- [x] Create SR utility: `lib/spaced-repetition.ts`
  - Implement algorithm from PRD §9.2:
    - Pass: `streak += 1`, double interval (cap 21 days)
    - Almost: halve interval, keep streak
    - Fail: reset to 1 day, streak = 0
  - Function: `updateUserWord(userId, wordId, grade)`
- [x] Update `/api/test/attempt` to call SR utility
- [x] Update `/api/test/next` to include SR-due words:
  - Priority: due words → queued words

**Files Created:**
- ✅ `lib/spaced-repetition.ts` - SR algorithm and utilities
- ✅ Updated `app/api/test/attempt/route.ts` - Calls SR after grading
- ✅ Updated `app/api/test/next/route.ts` - Prioritizes due words

**Notes:**
- Automatic due date calculation
- Streak tracking with fire emoji
- getDueWords() helper for queries

---

### 1.3 Stats & Profile Page
**Status:** ✅ Complete

**Tasks:**
- [x] Create API: `app/api/stats/overview/route.ts`
  - Total words studied
  - Accuracy last 7 days
  - Words due today
  - Per-word stats
- [x] Create Profile page: `app/(app)/profile/page.tsx`
- [x] Create stats components:
  - `components/profile/stats-tiles.tsx`
  - `components/profile/accuracy-chart.tsx`
  - `components/profile/due-list.tsx`
  - `components/profile/word-stats-table.tsx`

**Files Created:**
- ✅ `app/api/stats/overview/route.ts` - Comprehensive stats API
- ✅ `app/(app)/profile/page.tsx` - Full profile with stats
- ✅ `components/profile/stats-tiles.tsx` - Overview tiles
- ✅ `components/profile/accuracy-chart.tsx` - 7-day trend
- ✅ `components/profile/due-list.tsx` - Due words with CTA
- ✅ `components/profile/word-stats-table.tsx` - Per-word progress

**Notes:**
- User info with avatar
- 4 stat tiles (words, due, accuracy, interval)
- Visual accuracy chart
- Top 20 words by streak
- Sign out via Clerk UserButton

---

### 1.4 Daily Stats Aggregation
**Status:** ✅ Complete

**Tasks:**
- [x] Create utility: `lib/aggregate-stats.ts`
  - Function: `aggregateDailyStats(userId, date)`
  - Upsert to `user_daily_stats`
- [x] Create API: `app/api/admin/recompute-due/route.ts` (admin only)

**Files Created:**
- ✅ `lib/aggregate-stats.ts` - Daily stats aggregation
- ✅ `app/api/admin/recompute-due/route.ts` - Admin utility

**Notes:**
- Stats aggregated per day
- Admin-only recompute endpoint
- Uses ADMIN_USER_IDS env var

---

### 1.5 PWA Configuration
**Status:** ✅ Complete

**Tasks:**
- [x] Create manifest: `public/manifest.webmanifest`
  - Name, icons, theme, display mode
- [x] Add manifest link to `app/layout.tsx`
- [x] Add Apple meta tags
- [ ] Create app icons (192x192, 512x512) - TODO

**Files Created:**
- ✅ `public/manifest.webmanifest` - PWA manifest with shortcuts
- ✅ Updated `app/layout.tsx` - PWA meta tags

**Notes:**
- Standalone display mode
- Portrait orientation
- Theme color: #2563eb
- App shortcuts for Review and Test
- iOS-specific meta tags
- **TODO:** Create actual icon files (192x192, 512x512)

---

### 1.6 Error Handling & Edge Cases
**Status:** Pending

**Tasks:**
- [ ] Create error components:
  - `src/components/ui/error-boundary.tsx`
  - `src/components/ui/error-message.tsx`
- [ ] Add error handling to API routes:
  - Whisper failures → retry message
  - Network failures → retry CTA
  - Dictionary failures → fallback definition
  - Grader errors → fallback keyword check
- [ ] Create fallback grader: `src/lib/fallback-grader.ts`
- [ ] Add toast notifications
- [ ] Create empty states

**Files Created:**
- `src/components/ui/error-boundary.tsx`, `src/components/ui/error-message.tsx`
- `src/lib/fallback-grader.ts`, `src/components/ui/empty-state.tsx`

---

### 1.7 Analytics & Telemetry
**Status:** Pending

**Tasks:**
- [ ] Set up Vercel Analytics (`@vercel/analytics`)
- [ ] Create analytics utility: `src/lib/analytics.ts`
  - Track events: auth, mic, review, test, attempts, latency, PWA
- [ ] Add event tracking to components

**Files Created:**
- `src/lib/analytics.ts`

---

### 1.8 Rate Limiting & Security
**Status:** Pending

**Tasks:**
- [ ] Add rate limiting to `/api/test/attempt` (60/min per user)
- [ ] Secure API routes with Clerk auth
- [ ] Admin routes check `ADMIN_USER_IDS`
- [ ] Validate request bodies with Zod
- [ ] Sanitize user inputs

**Files Created:**
- `src/lib/rate-limit.ts` (optional), `src/lib/validation.ts`

---

### 1.9 Accessibility & Responsive Design
**Status:** Pending

**Tasks:**
- [ ] Accessibility audit:
  - Keyboard navigation
  - Focus rings
  - ARIA labels
  - Screen reader announcements
- [ ] Responsive design check (mobile, tablet, desktop)
- [ ] Touch targets 44x44px minimum
- [ ] Dark mode support (optional)

---

### 1.10 Testing & QA
**Status:** Pending

**Tasks:**
- [ ] Manual testing (PRD §19):
  - Mic permissions across browsers
  - Whisper transcription quality
  - Grader robustness
  - SR schedule transitions
  - PWA installability
  - Auth protection
- [ ] Seed database with 384 SAT words
- [ ] Performance testing (First interaction < 1.5s, grade < 2.5s)
- [ ] Lighthouse score > 90

**Files Created:**
- `docs/testing-checklist.md`

---

### 1.11 Deployment & Launch
**Status:** Pending

**Tasks:**
- [ ] Set up Vercel project
- [ ] Set up Neon production database
- [ ] Set up Clerk production app
- [ ] Configure environment variables
- [ ] Run migrations
- [ ] Final pre-launch checks
- [ ] Launch! 🚀

**Files Created:**
- `README.md`, `docs/deployment.md`

---

## Summary

**Total Phases:** 2 (Phase 0 + Phase 1)  
**Total Sections:** 21 (10 in Phase 0, 11 in Phase 1)  
**Estimated Timeline:** 3-4 weeks for full MVP

### Key Milestones
1. **Week 1:** Complete Phase 0 (sections 0.1-0.10) - Working prototype with basic features
2. **Week 2-3:** Complete Phase 1 (sections 1.1-1.9) - Full MVP with all features
3. **Week 4:** Testing, QA, and deployment (sections 1.10-1.11)

### Next Steps
Start with section 0.1 (Project Setup & Dependencies) and work sequentially through the plan. Update status to "In Progress" when starting a section and "Complete" when finished.

---

## Phase 2: Multi-Stack Architecture

### 2.1 Database Schema Re-architecture
**Status:** In Progress

**Tasks:**
- [ ] Create new schema with `card_stack`, `card`, `user_card` tables
- [ ] Update `definition` table to reference `card` instead of `word`
- [ ] Update `attempt` table to include `stack_id` and reference `card`
- [ ] Update `user_daily_stats` to be per-stack
- [ ] Add proper indexes for stack-based queries
- [ ] Generate migration SQL

**Files to Create/Update:**
- `lib/db/schema.ts` - Complete schema rewrite
- `drizzle/migrations/` - New migration files

**Key Changes:**
- `word` table → `card` table (belongs to stack)
- `user_word` → `user_card` (includes stack_id)
- New `card_stack` table with `is_protected` flag
- All queries now scoped by stack

---

### 2.2 Data Migration & SAT Vocab Stack Creation
**Status:** Pending

**Tasks:**
- [ ] Create migration script to:
  - Create default "SAT Vocabulary" stack for all users
  - Migrate existing words to cards in SAT stack
  - Preserve user progress (or wipe if too complex)
  - Set `is_protected = true` for SAT stack
- [ ] Test migration on development database
- [ ] Run migration on production

**Files to Create:**
- `scripts/migrate-to-stacks.ts` - Migration script
- Use Neon MCP to execute migration

---

### 2.3 Stack Management API Routes
**Status:** Pending

**Tasks:**
- [ ] `GET /api/stacks` - List user's card stacks
- [ ] `POST /api/stacks` - Create new stack
- [ ] `GET /api/stacks/[id]` - Get stack details
- [ ] `PATCH /api/stacks/[id]` - Update stack name
- [ ] `DELETE /api/stacks/[id]` - Delete stack (check not protected)
- [ ] `GET /api/stacks/[id]/cards` - Get cards in stack
- [ ] `POST /api/stacks/[id]/cards` - Create card in stack
- [ ] `PATCH /api/stacks/[id]/cards/[cardId]` - Update card
- [ ] `DELETE /api/stacks/[id]/cards/[cardId]` - Delete card

**Files to Create:**
- `app/api/stacks/route.ts`
- `app/api/stacks/[id]/route.ts`
- `app/api/stacks/[id]/cards/route.ts`
- `app/api/stacks/[id]/cards/[cardId]/route.ts`

---

### 2.4 Update Existing API Routes
**Status:** Pending

**Tasks:**
- [ ] Update `/api/words` → `/api/stacks/[id]/cards` (deprecated)
- [ ] Update `/api/review/queue` to be stack-scoped
- [ ] Update `/api/test/next` to be stack-scoped
- [ ] Update `/api/test/attempt` to include stack_id
- [ ] Update `/api/stats/overview` to support per-stack and global stats
- [ ] Update `/api/my-cards` to be stack-scoped

**Files to Update:**
- All existing API route files

---

### 2.5 My Stacks Page (Home)
**Status:** Pending

**Tasks:**
- [ ] Create "My Stacks" page as new home
- [ ] Grid/list view of all stacks
- [ ] Show stack stats (card count, due count, last studied)
- [ ] Special badge for SAT Vocabulary stack
- [ ] Empty state with "Create Stack" CTA
- [ ] Click stack to enter stack view

**Files to Create:**
- `app/(app)/stacks/page.tsx` - My Stacks home
- `components/stacks/stack-card.tsx` - Stack display card
- `components/stacks/stack-list.tsx` - Stack list component

---

### 2.6 Create/Edit Stack UI
**Status:** Pending

**Tasks:**
- [ ] Create stack modal/page
- [ ] Stack name input with validation
- [ ] Card creation form (term + definition)
- [ ] Add multiple cards in one session
- [ ] Edit stack page (for custom stacks only)
- [ ] Edit/delete individual cards
- [ ] Prevent editing SAT vocab stack

**Files to Create:**
- `app/(app)/stacks/new/page.tsx` - Create stack
- `app/(app)/stacks/[id]/edit/page.tsx` - Edit stack
- `components/stacks/create-stack-modal.tsx`
- `components/stacks/card-form.tsx`
- `components/ui/dialog.tsx` - ShadCN dialog component

---

### 2.7 Stack View with 4 Tabs
**Status:** Pending

**Tasks:**
- [ ] Create stack layout with 4 tabs: Review, Test, Tutor, Stats
- [ ] Tab navigation component
- [ ] Stack context provider (pass stack ID to all tabs)
- [ ] Header shows stack name and back button
- [ ] Responsive tab layout (bottom on mobile, top on desktop)

**Files to Create:**
- `app/(app)/stacks/[id]/layout.tsx` - Stack layout with tabs
- `app/(app)/stacks/[id]/review/page.tsx` - Review tab
- `app/(app)/stacks/[id]/test/page.tsx` - Test tab
- `app/(app)/stacks/[id]/tutor/page.tsx` - Tutor tab (placeholder)
- `app/(app)/stacks/[id]/stats/page.tsx` - Stats tab
- `components/stacks/stack-tabs.tsx` - Tab navigation

---

### 2.8 Update Review Mode for Stacks
**Status:** Pending

**Tasks:**
- [ ] Update Review page to work with stack context
- [ ] Fetch cards from `/api/stacks/[id]/cards`
- [ ] Update "Add to Test" to be stack-scoped
- [ ] Show stack name in header
- [ ] Update progress tracking per stack

**Files to Update:**
- `app/(app)/stacks/[id]/review/page.tsx`
- `components/review/*` - Update to use card instead of word

---

### 2.9 Update Test Mode for Stacks
**Status:** Pending

**Tasks:**
- [ ] Update Test page to work with stack context
- [ ] Fetch test queue from stack-scoped API
- [ ] Update attempt submission to include stack_id
- [ ] Show stack name in header
- [ ] Update SR logic to be per-stack

**Files to Update:**
- `app/(app)/stacks/[id]/test/page.tsx`
- `components/test/*` - Update to use card instead of word
- `lib/spaced-repetition.ts` - Update for stack context

---

### 2.10 Stack Stats Page
**Status:** Pending

**Tasks:**
- [ ] Create stats page per stack
- [ ] Overview tiles (total cards, reviewed, tested, due, accuracy)
- [ ] Card list with search/filter/sort
- [ ] Show individual card progress
- [ ] Edit/delete buttons for custom stacks only

**Files to Create:**
- `app/(app)/stacks/[id]/stats/page.tsx`
- `components/stacks/stack-stats-tiles.tsx`
- `components/stacks/stack-card-list.tsx`

---

### 2.11 Update Navigation & Header
**Status:** Pending

**Tasks:**
- [ ] Remove old nav tabs (Review, Test, My Cards)
- [ ] Add "Create Stack" button to header
- [ ] Update app layout to redirect to /stacks (My Stacks)
- [ ] Update landing page to reflect multi-stack feature

**Files to Update:**
- `components/layout/header.tsx`
- `components/layout/nav.tsx` (or remove)
- `app/(app)/layout.tsx`
- `app/(marketing)/page.tsx`

---

### 2.12 Update Profile for Global Stats
**Status:** Pending

**Tasks:**
- [ ] Update profile to show global stats across all stacks
- [ ] List all stacks with quick stats
- [ ] Update stats API to aggregate across stacks

**Files to Update:**
- `app/(app)/profile/page.tsx`
- `app/api/stats/overview/route.ts`

---

### 2.13 Testing & Cleanup
**Status:** Pending

**Tasks:**
- [ ] Test complete flow: create stack → add cards → review → test
- [ ] Test SAT vocab stack protection (can't edit/delete)
- [ ] Test stack deletion (cascades properly)
- [ ] Remove old unused code (word-based routes)
- [ ] Update README with new architecture

**Files to Update:**
- `README.md`
- Remove deprecated files

---

