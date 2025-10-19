# Architecture Decisions

## Decision 1: Lazy-Load Definitions Instead of Upfront Import

**Date:** Oct 17, 2025  
**Status:** ✅ Implemented

### Context
Initially planned to import all 384 SAT words with their definitions from `dictionaryapi.dev` during a batch import process. This approach encountered significant issues:
- API rate limiting (522 errors)
- Slow import process (30-40 minutes estimated)
- Complex retry logic needed
- Fragile dependency on external API during setup

### Decision
**Pivot to lazy-loading approach:**
- Import only word terms (no definitions) - instant, no API dependency
- Fetch definitions on-demand when user views a word
- Cache definitions for 24 hours in-memory
- No database storage of definitions

### Implementation
1. **Database Schema:** Removed `definition` table entirely
2. **Import Process:** Simplified to insert terms only (381 words in <1 second)
3. **API Endpoint:** Created `GET /api/words/[id]/definition` for on-demand fetching
4. **Caching:** Dictionary client handles 24h in-memory cache with retry logic

### Benefits
- ✅ **Fast setup:** Import completes instantly
- ✅ **Resilient:** No upfront API dependency
- ✅ **Simpler:** Removed complex batch processing and retry logic
- ✅ **Scalable:** Only fetches definitions that users actually view
- ✅ **Flexible:** Easy to switch dictionary providers or add fallbacks

### Trade-offs
- ⚠️ First view of each word requires API call (mitigated by caching)
- ⚠️ Requires internet connection for definitions (acceptable for MVP)
- ⚠️ In-memory cache lost on server restart (can upgrade to Redis later)

### Future Enhancements
- Add Redis for persistent caching across server restarts
- Implement fallback dictionary providers
- Pre-fetch definitions for most common words
- Add offline mode with pre-loaded definitions (Phase 2)

---

## Summary

This architectural pivot significantly improved the developer experience and system reliability. The lazy-loading approach aligns better with modern web practices and provides a more maintainable solution.
