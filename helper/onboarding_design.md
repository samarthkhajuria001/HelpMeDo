# HelpMeDo Onboarding Experience Design

## Philosophy

The onboarding should answer one question: **"Why is this better than my current todo app?"**

Answer: **You don't manage tasks. Lufy does. You just talk.**

---

## Core Principles

1. **Show, Don't Tell** - Animate the feature, don't just describe it
2. **3 Slides Max** - Respect user's time, they want to use the app
3. **Personality First** - Lufy is a character, not a feature
4. **Progressive Disclosure** - Don't overwhelm, hint at depth
5. **Skip Always Visible** - Never trap the user

---

## The 3 Slides

### Slide 1: Meet Lufy (Emotional Connection)

**Goal:** Create personality, not just introduce a feature

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│           ┌─────────────┐               │
│           │   (◠‿◠)    │  ← Lufy avatar │
│           │   🤖✨      │    with gentle │
│           └─────────────┘    float anim │
│                                         │
│     ════════════════════════            │
│                                         │
│          "Hi, I'm Lufy!"                │
│                                         │
│   Your AI assistant who actually        │
│   understands what you need to do.      │
│                                         │
│         ● ○ ○     [Next →]              │
│                              [Skip]     │
└─────────────────────────────────────────┘
```

**Animations:**
- Lufy avatar fades in with scale (0.8 → 1.0) + subtle bounce
- Soft glow pulse around avatar (like breathing)
- Text fades in 200ms after avatar lands
- Background: Soft radial gradient (rose tint from Lufy's colors)

**Micro-copy:**
- Title: "Hi, I'm Lufy!"
- Subtitle: "Your AI assistant who actually understands what you need to do."

---

### Slide 2: Magic Capture (Core Feature Demo)

**Goal:** Show the "aha moment" - natural language → structured tasks

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ Buy milk, call mom tomorrow,    │   │
│   │ finish report by Friday ▌       │   │ ← Typing animation
│   └─────────────────────────────────┘   │
│                    ↓                    │
│              ✨ (sparkle)               │
│                    ↓                    │
│   ┌─────────────┐ ┌─────────────┐       │
│   │ ☐ Buy milk  │ │ ☐ Call mom  │       │ ← Cards slide in
│   │   Today     │ │   Tomorrow  │       │
│   └─────────────┘ └─────────────┘       │
│          ┌─────────────┐                │
│          │ ☐ Finish    │                │
│          │   Fri, Jan 17│                │
│          └─────────────┘                │
│                                         │
│     ════════════════════════            │
│        "Just Type. I'll Handle It."    │
│                                         │
│         ○ ● ○     [Next →]              │
└─────────────────────────────────────────┘
```

**Animations:**
1. Input field appears with cursor blinking
2. Text types out character by character (40ms per char)
3. Sparkle burst animation in center
4. Task cards slide in from bottom with stagger (100ms delay each)
5. Each card has subtle shadow + scale on appear

**Micro-copy:**
- Title: "Just Type. I'll Handle It."
- Subtitle: "Dates, priorities, goals - I figure it out automatically."

---

### Slide 3: Deep Plan (Advanced Feature Teaser)

**Goal:** Show depth without complexity - "there's more when you need it"

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│        💬 "I want to learn Japanese"    │ ← User bubble
│                                         │
│   🤖💬 "I'll create a plan for you!"   │ ← Lufy responds
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  🎯 Learn Japanese              │   │
│   │  ┌──────────────────────────┐   │   │
│   │  │ Week 1: Hiragana basics  │   │   │ ← Plan cards
│   │  ├──────────────────────────┤   │   │    cascade in
│   │  │ Week 2: Katakana         │   │   │
│   │  ├──────────────────────────┤   │   │
│   │  │ Week 3: Basic phrases    │   │   │
│   │  └──────────────────────────┘   │   │
│   └─────────────────────────────────┘   │
│                                         │
│     ════════════════════════            │
│        "Dream Big. I'll Plan It."       │
│                                         │
│         ○ ○ ●   [Get Started →]         │
└─────────────────────────────────────────┘
```

**Animations:**
1. User chat bubble slides in from right
2. Lufy bubble slides in from left (300ms delay)
3. Goal card fades in with scale
4. Week items cascade down with stagger (150ms each)
5. Subtle connecting line draws between weeks

**Micro-copy:**
- Title: "Dream Big. I'll Plan It."
- Subtitle: "Tell me your goals. I'll break them into weekly tasks."

---

## Visual Design System

### Colors (from existing app)

```css
/* Lufy (AI) */
--lufy-gradient: linear-gradient(135deg, #DC2626 0%, #F87171 100%);
--lufy-bubble-bg: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
--lufy-text: #7F1D1D;

/* User */
--user-gradient: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
--user-bubble-bg: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);

/* Neutral */
--bg-overlay: rgba(0, 0, 0, 0.6);
--card-bg: #FFFFFF;
--card-bg-dark: #1F2937;
--text-primary: #111827;
--text-secondary: #6B7280;
```

### Typography

```css
/* Title */
font-size: 28px;
font-weight: 700;
line-height: 1.2;
color: var(--text-primary);

/* Subtitle */
font-size: 16px;
font-weight: 400;
line-height: 1.5;
color: var(--text-secondary);
```

### Card Dimensions

```css
/* Desktop */
width: 480px;
max-height: 520px;
border-radius: 24px;
padding: 40px;

/* Mobile (< 640px) */
width: 100%;
max-width: 100%;
height: 100vh; /* Full screen bottom sheet */
border-radius: 24px 24px 0 0;
padding: 32px 24px;
```

### Shadows

```css
/* Card shadow */
box-shadow:
  0 25px 50px -12px rgba(0, 0, 0, 0.25),
  0 0 0 1px rgba(255, 255, 255, 0.1);

/* Task card shadow */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
```

---

## Animation Specifications

### Timing Functions

```css
/* Smooth enter */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Bouncy */
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Natural */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
```

### Standard Durations

```css
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--stagger-delay: 100ms;
```

### Keyframe Animations

```css
/* Lufy float/breathe */
@keyframes lufy-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* Lufy glow pulse */
@keyframes lufy-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.3); }
  50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.5); }
}

/* Card slide up */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Typing cursor blink */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Sparkle burst */
@keyframes sparkle {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  100% { transform: scale(1.5) rotate(180deg); opacity: 0; }
}
```

---

## Slide Transitions

### Between Slides

```css
/* Outgoing slide */
.slide-exit {
  animation: slide-out-left 400ms var(--ease-out-expo) forwards;
}

@keyframes slide-out-left {
  to {
    opacity: 0;
    transform: translateX(-50px);
  }
}

/* Incoming slide */
.slide-enter {
  animation: slide-in-right 400ms var(--ease-out-expo) forwards;
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
}
```

### Progress Dots

```css
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  opacity: 0.3;
  transition: all 300ms var(--ease-out-expo);
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: var(--user-gradient);
  opacity: 1;
}
```

---

## Mobile Adaptations

### Bottom Sheet Style (< 640px)

```
┌─────────────────────────────────┐
│  ════ (drag handle) ════        │
│                                 │
│         [Visual Area]           │
│                                 │
│     ─────────────────────       │
│                                 │
│          Title Text             │
│        Subtitle Text            │
│                                 │
│  ● ○ ○                          │
│                                 │
│  ┌─────────────────────────┐    │
│  │     [Get Started]       │    │ ← Full width button
│  └─────────────────────────┘    │
│                                 │
│         Skip for now            │
└─────────────────────────────────┘
```

### Gestures

- **Swipe Left/Right**: Navigate between slides
- **Swipe Down**: Dismiss (with confirmation if not last slide)
- **Tap outside**: No action (prevent accidental dismiss)

---

## Component Structure

```
OnboardingModal/
├── onboarding-modal.ts
├── onboarding-modal.html
├── onboarding-modal.css
└── slides/
    ├── slide-welcome/
    │   ├── slide-welcome.ts
    │   └── slide-welcome.html
    ├── slide-magic-capture/
    │   ├── slide-magic-capture.ts
    │   └── slide-magic-capture.html
    └── slide-deep-plan/
        ├── slide-deep-plan.ts
        └── slide-deep-plan.html
```

---

## State Management

```typescript
interface OnboardingState {
  currentSlide: number;      // 0, 1, 2
  totalSlides: number;       // 3
  isAnimating: boolean;      // Prevent double-clicks during transition
  hasCompleted: boolean;     // Stored in localStorage
  direction: 'next' | 'prev'; // For animation direction
}

// LocalStorage key
const ONBOARDING_COMPLETE_KEY = 'helpme_onboarding_complete';
```

---

## Trigger Logic

```typescript
// Show onboarding if:
// 1. User is authenticated
// 2. User has NOT completed onboarding before
// 3. User has 0 tasks (brand new)

function shouldShowOnboarding(user: User, taskCount: number): boolean {
  const completed = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return user && !completed && taskCount === 0;
}
```

---

## Accessibility

1. **Focus Management**: Trap focus inside modal, return focus on close
2. **Keyboard Navigation**:
   - `Tab` / `Shift+Tab`: Navigate buttons
   - `Enter` / `Space`: Activate button
   - `Escape`: Skip onboarding
   - `Arrow Left/Right`: Navigate slides
3. **Screen Reader**:
   - `role="dialog"` with `aria-modal="true"`
   - `aria-label` on each slide
   - Live region for slide changes
4. **Reduced Motion**:
   - Check `prefers-reduced-motion`
   - Replace animations with instant transitions

---

## Success Metrics

Track these events:
1. `onboarding_started` - Modal opened
2. `onboarding_slide_viewed` - Each slide viewed (with slide number)
3. `onboarding_completed` - Reached "Get Started"
4. `onboarding_skipped` - Clicked skip (with current slide)

---

## Implementation Priority

### Phase 1: Core Flow
- [ ] Modal container with backdrop
- [ ] 3 static slides with content
- [ ] Next/Skip buttons
- [ ] Progress dots
- [ ] LocalStorage persistence

### Phase 2: Animations
- [ ] Slide transitions
- [ ] Lufy avatar animation (Slide 1)
- [ ] Typing effect (Slide 2)
- [ ] Task cards cascade (Slide 2)
- [ ] Plan cascade (Slide 3)

### Phase 3: Polish
- [ ] Mobile bottom sheet
- [ ] Swipe gestures
- [ ] Keyboard navigation
- [ ] Reduced motion support
- [ ] Analytics events

---

## Alternative Ideas (Future)

### Interactive Onboarding
Instead of passive slides, let user TRY the feature:
- Slide 2: Actual input field, user types, see real task creation
- More engaging but more complex to build

### Contextual Tooltips
After onboarding, show tooltips on first use of each feature:
- First time opening chat → "Try typing 'buy groceries tomorrow'"
- First time creating goal → "Lufy can plan this for you"

### Video Option
For users who prefer video:
- 30-second animated explainer
- Plays in Slide 1, with "Read instead" option

---

## Final Checklist Before Launch

- [ ] Works on all screen sizes (320px to 2560px)
- [ ] Works in dark mode
- [ ] Works with slow network (no loading spinners needed)
- [ ] Works with keyboard only
- [ ] Works with screen reader
- [ ] Skip works at every step
- [ ] Completing stores in localStorage
- [ ] Reopening app after completion doesn't show again
- [ ] All text is i18n-ready (no hardcoded strings)
