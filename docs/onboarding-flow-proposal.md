# Onboarding Flow Proposal

## Overview

A comprehensive onboarding experience that introduces new users to StudyBuddy's core features while collecting essential user information (birthdate). The flow balances education with engagement, ensuring users understand the platform's value before creating their first stack.

---

## Flow Structure

### **Step 1: Welcome & User Information**

**Purpose**: Collect user birthdate and set expectations

**UI Components**:
- Welcome message: "Welcome to StudyBuddy, [First Name]!"
- Brief value proposition: "Master any subject with voice-based testing and AI-powered feedback"
- Birthdate input field with date picker
- Privacy notice: "We use your birthdate to provide age-appropriate content and comply with educational standards"
- "Get Started" CTA button

**Technical Requirements**:
- Validate birthdate (must be valid date, user must be 13+)
- Store birthdate in `user_profile` table
- Show age verification error if under 13 (COPPA compliance)

**Design Notes**:
- Clean, minimal design with StudyBuddy branding
- Optional: Show preview of the app interface in background (blurred/faded)
- Mobile-responsive form

---

### **Step 2: Interactive Tutorial - What Are Stacks?**

**Purpose**: Introduce the concept of card stacks as collections

**UI Components**:
- Animated illustration showing multiple stacks (e.g., "SAT Vocab", "Spanish Verbs", "History Dates")
- Title: "Organize Your Learning with Flashcard Stacks"
- Description: "A stack is a collection of flashcards on a specific topic. Create as many stacks as you need!"
- Example stack preview showing card count and progress
- "Next" button with progress indicator (Step 2/6)

**Interactive Element**:
- Highlight/pulse animation on a sample stack
- Optional: Let user click on stack to see it "open" (preview transition)

**Design Notes**:
- Use visual metaphor (actual stack of cards)
- Show 2-3 example stacks with different subjects
- Progress bar at top showing 2/6 steps complete

---

### **Step 3: Interactive Tutorial - Creating Cards**

**Purpose**: Show how to build a stack with flashcards

**UI Components**:
- Title: "Build Your Stack, One Card at a Time"
- Animated demo showing:
  1. "Add Card" button click
  2. Term field: "Ubiquitous"
  3. Definition field: "Present everywhere; found everywhere"
  4. Card being added to stack
- Description: "Each card has a term and definition. Add them manually or import from our SAT vocabulary library"
- Interactive element: "Try adding a card" with pre-filled example
- "Next" button

**Interactive Element**:
- User can actually interact with a mock "Add Card" form
- Real-time feedback when they fill in fields
- Celebratory animation when card is "added"

**Design Notes**:
- Split screen: tutorial text on left, interactive demo on right (desktop)
- Stacked layout for mobile
- Show card counter updating (0 → 1 card)

---

### **Step 4: Interactive Tutorial - Review Mode**

**Purpose**: Explain the review/flip card experience

**UI Components**:
- Title: "Review Cards to Build Familiarity"
- Animated demo of flashcard flip:
  1. Card showing term: "Ubiquitous"
  2. User clicks/taps → card flips
  3. Definition revealed
  4. "Next Card" button appears
- Description: "Review mode helps you familiarize yourself with cards before testing. Flip cards to see definitions and track which ones you've reviewed"
- Progress tracking visual: "3/10 cards reviewed"
- "Next" button

**Interactive Element**:
- User can actually flip a demo card
- Smooth 3D flip animation
- Shows review progress indicator

**Design Notes**:
- Large, clear card UI in center
- Show swipe gesture hint for mobile
- Emphasize low-pressure learning ("no grades, just practice")

---

### **Step 5: Interactive Tutorial - Test Mode**

**Purpose**: Introduce voice-based testing with AI grading

**UI Components**:
- Title: "Test Your Knowledge with Voice"
- Animated demo showing:
  1. Card displays term: "Ubiquitous"
  2. Microphone button activates
  3. Voice transcript appears: "It means something that's everywhere..."
  4. AI grading result: "Pass ✓" with feedback
- Description: "Speak your answer naturally. Our AI grades your response and provides helpful feedback"
- Visual examples of three grades:
  - **Pass**: Accurate definition
  - **Almost**: Close but missing key elements
  - **Fail**: Incorrect or incomplete
- "Next" button

**Interactive Element**:
- Optional: Let user try speaking (with mock grading)
- Show sample feedback messages
- Animate the grading process (analyzing → result)

**Design Notes**:
- Prominent microphone UI with pulsing animation
- Clear visual distinction between review (casual) and test (graded)
- Show spaced repetition benefit: "Cards you struggle with appear more often"

---

### **Step 6: Interactive Tutorial - Tutor Mode**

**Purpose**: Showcase the AI tutor for real-time conversation

**UI Components**:
- Title: "Learn with Your AI Tutor"
- Animated demo showing:
  1. Tutor avatar/icon
  2. Sample conversation:
     - Tutor: "Let's practice 'ubiquitous'. Can you use it in a sentence?"
     - User (voice): "The internet is ubiquitous in modern life"
     - Tutor: "Excellent! You've got it. Let's try 'ephemeral' next..."
  3. Real-time voice interaction visualization
- Description: "Have natural conversations with your AI tutor. Get explanations, examples, and practice in a supportive environment"
- Feature callouts:
  - Real-time conversation
  - Contextual feedback
  - Natural language understanding
- "Next" button

**Interactive Element**:
- Optional: Play sample audio of tutor interaction
- Show conversation thread with message bubbles
- Animate the "thinking" and "speaking" states

**Design Notes**:
- Warm, friendly tutor personality
- Show conversation as chat-like interface
- Emphasize personalization: "Adapts to your learning style"

---

### **Step 7: Call to Action - Create Your First Stack**

**Purpose**: Convert tutorial completion into first action

**UI Components**:
- Title: "You're Ready! Create Your First Stack"
- Two options presented as large cards:
  
  **Option A: Review SAT Vocabulary**
  - Icon: Book/graduation cap
  - Description: "Start with our curated SAT vocabulary list (300+ words)"
  - Button: "Review SAT Vocab"
  
  **Option B: Create Custom Stack**
  - Icon: Plus/pencil
  - Description: "Build your own flashcard stack from scratch"
  - Button: "Create Custom Stack"

- Secondary option: "Skip for now" (takes to empty stacks page)

**Technical Requirements**:
- Mark onboarding as complete in `user_profile` table
- If "Review SAT Vocab": Redirect to the SAT vocab stack
- If "Create Custom": Open create stack page → guide to add first card
- If "Skip": Redirect to `/stacks` with empty state + "Create Stack" prompt

**Design Notes**:
- Celebratory tone: checkmark animation, success colors
- Clear visual hierarchy (two main options)
- Progress bar shows 6/6 complete

---

## User Experience Flow Diagram

```
[Sign In] 
    ↓
[Welcome + Birthdate] 
    ↓
[Tutorial: Stacks] → [Tutorial: Create Cards] → [Tutorial: Review] → [Tutorial: Test] → [Tutorial: Tutor]
    ↓
[CTA: Create First Stack]
    ↓
[Review SAT Vocab] OR [Create Custom Stack] OR [Skip]
    ↓
[Main App Experience]
```

---

## Technical Implementation Notes

### Database Changes

Add to `user_profile` table:
```sql
ALTER TABLE user_profile 
ADD COLUMN birthdate DATE,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN onboarding_completed_at TIMESTAMP;
```

### Routing Strategy

**Option A: Separate Onboarding Route**
- `/onboarding` - Multi-step wizard component
- Check `onboarding_completed` flag on protected routes
- Redirect to `/onboarding` if not completed

**Option B: Modal Overlay**
- Modal that overlays `/stacks` page
- Can't be dismissed until complete
- More seamless transition to main app

**Recommendation**: Option A (separate route) for cleaner UX and easier step tracking

### State Management

```typescript
interface OnboardingState {
  currentStep: number; // 1-7
  birthdate: Date | null;
  tutorialProgress: {
    stacks: boolean;
    createCards: boolean;
    review: boolean;
    test: boolean;
    tutor: boolean;
  };
}
```

### Analytics Tracking

Track key events:
- `onboarding_started`
- `onboarding_step_completed` (with step number)
- `onboarding_step_skipped`
- `onboarding_abandoned` (which step)
- `onboarding_completed`
- `first_stack_created` (import vs custom)

---

## Design Considerations

### Visual Style
- **Illustrations**: Use simple, friendly illustrations (not stock photos)
- **Animations**: Smooth, purposeful (not distracting)
- **Color scheme**: Match StudyBuddy branding (blue/purple gradient)
- **Typography**: Clear hierarchy, readable fonts

### Accessibility
- Keyboard navigation support (Tab, Enter, Arrow keys)
- Screen reader friendly (ARIA labels)
- Skip tutorial option for returning/experienced users
- Captions/transcripts for any audio/video elements

### Mobile Responsiveness
- Touch-friendly targets (minimum 44x44px)
- Vertical stack layout on mobile
- Swipe gestures where appropriate
- Reduced animations on low-end devices

### Progressive Disclosure
- Don't overwhelm with all features at once
- Focus on core workflow: Stack → Cards → Review → Test
- Tutor mode as "bonus" advanced feature
- Advanced features (stats, spaced repetition details) revealed through use

---

## Success Metrics

### Completion Metrics
- **Onboarding completion rate**: % of users who complete all steps
- **Time to complete**: Average time from start to finish
- **Drop-off points**: Which step has highest abandonment

### Engagement Metrics
- **First stack creation rate**: % who create/import first stack
- **First test completion**: % who complete first test session
- **Day 1 retention**: % who return next day
- **Week 1 retention**: % still active after 7 days

### Quality Metrics
- **Tutorial interaction rate**: % who interact with demos vs just click "Next"
- **Feature discovery**: % who use each feature (review, test, tutor) in first week
- **User feedback**: Satisfaction ratings for onboarding experience

---

## Open Questions & Future Enhancements

### Questions to Resolve
1. Should birthdate be optional or required? (Privacy vs functionality)
2. Age restrictions: What if user is under 13? (COPPA compliance)
3. Skip option: Allow on each step or only at end?
4. Tutorial replay: How can users access tutorial later?

### Future Enhancements
1. **Gamification**: Award "First Stack" badge upon completion
2. **Personalization**: Tailor examples to user's grade level (based on age)
3. **Video tutorials**: Short video clips instead of/in addition to text
4. **Interactive quiz**: End with a quick quiz about features
5. **Goal setting**: Ask user to set study goals (words per day, test date)
6. **Onboarding variations**: A/B test different flows
7. **Progressive onboarding**: Introduce tutor mode after user completes first test (reduce initial complexity)

---

## Implementation Priority

### Phase 1 (MVP)
- ✅ Welcome screen with birthdate collection
- ✅ Static tutorial screens (text + images)
- ✅ Basic navigation (Next/Back)
- ✅ Create first stack CTA
- ✅ Database schema updates

### Phase 2 (Enhanced)
- ✅ Interactive elements (flip card demo, add card demo)
- ✅ Progress tracking
- ✅ Analytics integration
- ✅ Mobile optimization

### Phase 3 (Polish)
- ✅ Animations and transitions
- ✅ Voice interaction demo in tutor step
- ✅ A/B testing framework
- ✅ Tutorial replay functionality

---

## Appendix: Sample Copy

### Welcome Screen
```
Welcome to StudyBuddy, [Name]! 🎓

Master any subject with voice-based testing and AI-powered feedback.

Before we begin, we need your birthdate to provide age-appropriate content and comply with educational standards.

[Birthdate input field]

We take your privacy seriously. Your birthdate is never shared with third parties.

[Get Started Button]
```

### Tutorial - Stacks
```
Organize Your Learning with Stacks 📚

A stack is a collection of flashcards on a specific topic. 

Create separate stacks for:
• SAT Vocabulary
• Spanish Verbs  
• History Dates
• Math Formulas
...or anything you want to learn!

[Example stack illustrations]

[Next]
```

### Tutorial - Test Mode
```
Test Your Knowledge with Your Voice 🎤

Speak your answer naturally, and our AI will grade your response:

✓ Pass: You got it!
≈ Almost: Close, but try to be more specific
✗ Fail: Let's review this one again

Don't worry—cards you struggle with will appear more often until you master them.

[Next]
```

---

## Notes

This onboarding flow balances user education with engagement, ensuring users understand StudyBuddy's unique value proposition (voice-based testing, AI tutor) while collecting necessary information (birthdate). The progressive disclosure approach prevents overwhelming new users while setting them up for long-term success.
