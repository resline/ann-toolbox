# Kotwica Czasu (Time Anchor) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the speaking clock into „Kotwica Czasu” (Time Anchor) with departure/deadline countdown mode, visual ADHD Time Timer disc, dynamic Polish speech phrasing, and live time adjusters.

**Architecture:** Extend the background keep-alive Web Audio / Web Worker engine with target timestamp scheduling, integrate SVG circular sector Time Timer visualization, expand Polish declension formatting for departure countdowns, and build tactile sensory UI controls.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Web Speech API, Web Audio API, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-27-ann-toolbox-time-anchor-design.md`

## Global Constraints

- 100% type-safe TypeScript (strict mode, zero any).
- Preserves full background audio execution on mobile Chrome / Android via Web Worker + Silent Audio Loop + MediaSession.
- Sensory-calming ADHD ergonomics: generous touch targets (>=48px), soft color schemes (Sage Calm, Warm Dark, OLED Night), no abrupt loud sounds.
- TDD workflow: failing tests first, verify RED, implement, verify GREEN, commit after every task.

---

### Task 1: Rozszerzenie Typów i Rebranding na „Kotwica Czasu”

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/registry.ts`
- Modify: `src/modules/speaking-clock/types.ts`
- Test: `src/core/registry.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type ClockMode = 'continuous' | 'focus' | 'departure';
  export type TimeTimerColor = 'sage' | 'amber' | 'lavender' | 'rose' | 'ocean';
  
  export interface DepartureSettings {
    targetTime: string; // HH:MM (e.g. "08:30")
    label: string;      // e.g. "Wyjście z domu"
    smartDensity: boolean;
    customMilestonesMinutes?: number[];
  }
  
  export interface TimeTimerSettings {
    enabled: boolean;
    color: TimeTimerColor;
    showNumbers: boolean;
    direction: 'clockwise' | 'counter-clockwise';
  }
  
  export interface SpeakingClockSettings {
    intervalMinutes: number;
    clockSync: boolean;
    formatStyle: TimeFormatStyle;
    voiceURI: string;
    rate: number;
    pitch: number;
    volume: number;
    chimeEnabled: boolean;
    chimeTone: ChimeTone;
    chimeVolume: number;
    mode: ClockMode;
    focusDurationMinutes: number;
    departure: DepartureSettings;
    timeTimer: TimeTimerSettings;
    keepAwake: boolean;
  }
  ```

- [ ] **Step 1: Write failing registry and types tests**

```typescript
// in src/core/registry.test.ts
it('should have Kotwica Czasu registered as primary time tool', () => {
  const tools = getTools();
  const timeTool = tools.find(t => t.id === 'speaking-clock' || t.id === 'time-anchor');
  expect(timeTool).toBeDefined();
  expect(timeTool?.title).toBe('Kotwica Czasu');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/core/registry.test.ts -- --run`
Expected: FAIL (title is currently 'Głos Czasu')

- [ ] **Step 3: Update types and registry definitions**

Update `src/modules/speaking-clock/types.ts`, `src/core/types.ts`, and `src/core/registry.ts` with the new types, default settings, and updated title 'Kotwica Czasu' (subtitle: 'Mówiący zegar, odliczanie i Time Timer').

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/core/registry.test.ts -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/registry.ts src/modules/speaking-clock/types.ts src/core/registry.test.ts
git commit -m "feat(types): expand settings with departure mode, time timer and rebrand to Kotwica Czasu"
```

---

### Task 2: Silnik Gramatyki Komunikatów Odliczania i Wyjścia (`polishTimeFormatter.ts`)

**Files:**
- Modify: `src/modules/speaking-clock/services/polishTimeFormatter.ts`
- Modify: `src/modules/speaking-clock/services/polishTimeFormatter.test.ts`

**Interfaces:**
- Produces:
  - `formatDepartureAnnouncement(remainingSeconds: number, label: string, targetTime?: Date, isDone?: boolean): string`
  - Polish minutes declension for countdowns (1 minuta -> „Za minutę”, 2/3/4 minuty -> „Za 2 minuty”, 5-21 minut -> „Za 5 minut”, itd.).

- [ ] **Step 1: Write failing unit tests in `polishTimeFormatter.test.ts`**

```typescript
describe('formatDepartureAnnouncement', () => {
  it('formats done state', () => {
    const res = formatDepartureAnnouncement(0, 'Wyjście z domu', new Date(2026, 7, 27, 8, 30), true);
    expect(res).toContain('Czas minął: Wyjście z domu');
  });

  it('formats 1 minute remaining', () => {
    const res = formatDepartureAnnouncement(60, 'Wyjście z domu');
    expect(res).toBe('Za minutę: Wyjście z domu.');
  });

  it('formats 2, 3, 4 minutes remaining', () => {
    expect(formatDepartureAnnouncement(120, 'Spotkanie')).toBe('Za 2 minuty: Spotkanie.');
    expect(formatDepartureAnnouncement(240, 'Pociąg')).toBe('Za 4 minuty: Pociąg.');
  });

  it('formats 5+ minutes remaining', () => {
    expect(formatDepartureAnnouncement(300, 'Wyjście z domu')).toBe('Za 5 minut: Wyjście z domu.');
    expect(formatDepartureAnnouncement(900, 'Wyjście z domu')).toBe('Za 15 minut: Wyjście z domu.');
  });

  it('formats sub-minute remaining', () => {
    expect(formatDepartureAnnouncement(30, 'Wyjście z domu')).toBe('Mniej niż minuta do: Wyjście z domu.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/modules/speaking-clock/services/polishTimeFormatter.test.ts -- --run`
Expected: FAIL (`formatDepartureAnnouncement` is not exported)

- [ ] **Step 3: Implement `formatDepartureAnnouncement` in `polishTimeFormatter.ts`**

Implement complete grammatical rules and handle edge cases (sub-minute, singular/plural, appending current time when appropriate).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/modules/speaking-clock/services/polishTimeFormatter.test.ts -- --run`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add src/modules/speaking-clock/services/polishTimeFormatter.ts src/modules/speaking-clock/services/polishTimeFormatter.test.ts
git commit -m "feat(clock): implement polish departure and countdown phrasing engine"
```

---

### Task 3: Silnik Działania w Tle dla Trybu Wyjścia i Szybkich Korekt Czasu (`backgroundTimerEngine.ts`)

**Files:**
- Modify: `src/modules/speaking-clock/services/backgroundTimerEngine.ts`
- Modify: `src/modules/speaking-clock/services/backgroundTimerEngine.test.ts`

**Interfaces:**
- Produces:
  - `addMinutes(deltaMinutes: number): void`
  - `setTargetTime(targetTime: string): void`
  - Departure mode calculations: `secondsRemaining`, milestone triggers (`smartDensity`), completion handling.
  - MediaSession metadata updates with remaining countdown time.

- [ ] **Step 1: Write failing tests in `backgroundTimerEngine.test.ts`**

```typescript
it('handles departure mode milestones and countdown', async () => {
  const engine = new BackgroundTimerEngine();
  const now = new Date(2026, 7, 27, 8, 0, 0);
  engine.updateSettings({
    mode: 'departure',
    departure: {
      targetTime: '08:15',
      label: 'Wyjście z domu',
      smartDensity: true
    }
  });
  engine.start();
  // Verify seconds remaining calculation and addMinutes(+5) shifts target to 08:20
  engine.addMinutes(5);
  expect(engine.getDepartureTargetTime()).toBe('08:20');
  engine.stop();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/modules/speaking-clock/services/backgroundTimerEngine.test.ts -- --run`
Expected: FAIL

- [ ] **Step 3: Implement departure mode and `addMinutes` in `BackgroundTimerEngine`**

Implement target time parser, relative next day offset if target is in the past, milestone detection, MediaSession synchronization, and `addMinutes`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/modules/speaking-clock/services/backgroundTimerEngine.test.ts -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/speaking-clock/services/backgroundTimerEngine.ts src/modules/speaking-clock/services/backgroundTimerEngine.test.ts
git commit -m "feat(engine): add departure mode scheduling, smart density milestones, and addMinutes API"
```

---

### Task 4: Komponent Wizualnego Dysku Time Timer (`TimeTimerDisc.tsx`)

**Files:**
- Create: `src/modules/speaking-clock/components/TimeTimerDisc.tsx`
- Create: `src/modules/speaking-clock/components/TimeTimerDisc.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface TimeTimerDiscProps {
    totalSeconds: number;
    secondsRemaining: number;
    color?: TimeTimerColor;
    showNumbers?: boolean;
    direction?: 'clockwise' | 'counter-clockwise';
    centerLabel?: string;
    centerSublabel?: string;
    isActive?: boolean;
    onDiscClick?: () => void;
  }
  ```

- [ ] **Step 1: Write failing component tests in `TimeTimerDisc.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react';
import { TimeTimerDisc } from './TimeTimerDisc';

describe('TimeTimerDisc', () => {
  it('renders SVG disc with sector path matching remaining percentage', () => {
    const { container } = render(
      <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} color="sage" />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path.time-timer-sector')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/modules/speaking-clock/components/TimeTimerDisc.test.tsx -- --run`
Expected: FAIL (file does not exist)

- [ ] **Step 3: Implement `TimeTimerDisc.tsx`**

Implement SVG arc geometry generator with smooth stroke and filled sector, 5-minute tick marks, subtle glow, center digital readout overlay, and responsive scaling.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/modules/speaking-clock/components/TimeTimerDisc.test.tsx -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/speaking-clock/components/TimeTimerDisc.tsx src/modules/speaking-clock/components/TimeTimerDisc.test.tsx
git commit -m "feat(ui): implement TimeTimerDisc SVG visual sector component"
```

---

### Task 5: Komponenty UI: Przełącznik Trybów, Konfigurator Wyjścia i Szybkie Przyciski

**Files:**
- Create: `src/modules/speaking-clock/components/ModeTabs.tsx`
- Create: `src/modules/speaking-clock/components/DepartureConfig.tsx`
- Create: `src/modules/speaking-clock/components/QuickTimeAdjusters.tsx`
- Create: `src/modules/speaking-clock/components/ModeTabs.test.tsx`
- Create: `src/modules/speaking-clock/components/DepartureConfig.test.tsx`

**Interfaces:**
- Produces:
  - `ModeTabs`: 3-way toggle (Zegar Ciągły, Sesja Focus, Do Godziny) with icons and active highlights.
  - `DepartureConfig`: Time input, quick relative hour buttons (+15m, +30m, +45m, +1h), and preset tag pills (Wyjście z domu, Spotkanie, Pociąg, Leki, Gotowanie).
  - `QuickTimeAdjusters`: Live +/- minute pills during active session (`-5 min`, `+1 min`, `+5 min`, `+10 min`).

- [ ] **Step 1: Write failing component tests**

Write tests for `ModeTabs` (mode selection) and `DepartureConfig` (time changing, quick tags).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/modules/speaking-clock/components/ModeTabs.test.tsx -- --run`
Expected: FAIL

- [ ] **Step 3: Implement components**

Implement `ModeTabs.tsx`, `DepartureConfig.tsx`, and `QuickTimeAdjusters.tsx` adhering to ADHD touch ergonomics (large tap targets, soothing transitions, clear visual states).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/modules/speaking-clock/components/ModeTabs.test.tsx src/modules/speaking-clock/components/DepartureConfig.test.tsx -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/speaking-clock/components/ModeTabs.tsx src/modules/speaking-clock/components/DepartureConfig.tsx src/modules/speaking-clock/components/QuickTimeAdjusters.tsx src/modules/speaking-clock/components/ModeTabs.test.tsx src/modules/speaking-clock/components/DepartureConfig.test.tsx
git commit -m "feat(ui): add ModeTabs, DepartureConfig and QuickTimeAdjusters components"
```

---

### Task 6: Integracja Głównego Widoku Modułu i Ustawień Time Timer

**Files:**
- Modify: `src/modules/speaking-clock/hooks/useSpeakingClock.ts`
- Modify: `src/modules/speaking-clock/components/ClockSettingsModal.tsx`
- Modify: `src/modules/speaking-clock/SpeakingClockModule.tsx`
- Modify: `src/modules/speaking-clock/SpeakingClockModule.test.tsx`
- Modify: `src/App.tsx` & `src/core/layout/Header.tsx`

**Interfaces:**
- Exposes `addMinutes`, `setDepartureTarget`, `setDepartureLabel`, `setTimeTimerColor` through `useSpeakingClock`.
- Integrates `TimeTimerDisc`, `ModeTabs`, `DepartureConfig`, and `QuickTimeAdjusters` into `SpeakingClockModule`.

- [ ] **Step 1: Write failing integration tests in `SpeakingClockModule.test.tsx`**

Test switching to departure mode, setting departure time, starting countdown, and adjusting time.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/modules/speaking-clock/SpeakingClockModule.test.tsx -- --run`
Expected: FAIL

- [ ] **Step 3: Update hook, settings modal, and main module UI**

Wire all new components, connect actions to `BackgroundTimerEngine`, persist settings to localStorage, and add Time Timer color/display options to the Settings modal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/modules/speaking-clock/SpeakingClockModule.test.tsx -- --run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/speaking-clock/hooks/useSpeakingClock.ts src/modules/speaking-clock/components/ClockSettingsModal.tsx src/modules/speaking-clock/SpeakingClockModule.tsx src/modules/speaking-clock/SpeakingClockModule.test.tsx src/App.tsx src/core/layout/Header.tsx
git commit -m "feat(ui): integrate Kotwica Czasu main module with Time Timer disc and departure workflow"
```

---

### Task 7: Weryfikacja Całościowa, Testy Integracyjne, Build Produkcyjny i Aktualizacja Wdrożenia

**Files:**
- Modify: `README.md`
- Test: All suites (`npm test -- --run`)
- Build: `npm run build`

- [ ] **Step 1: Run all test suites across the repository**

Run: `npm test -- --run`
Expected: 100% tests passing across all suites.

- [ ] **Step 2: Verify production build**

Run: `npm run build`
Expected: Clean build without errors or warnings.

- [ ] **Step 3: Update README.md with Kotwica Czasu guide**

Document the 3 modes (Ciągły, Focus, Wyjście), Time Timer features, and mobile usage tips for Ania.

- [ ] **Step 4: Push to GitHub & Deploy to Coolify**

Push commits to `origin main` and trigger redeploy in Coolify, verifying live on `https://ania.resline.net`.

- [ ] **Step 5: Commit and update walkthrough**

```bash
git add README.md
git commit -m "docs: update README with Kotwica Czasu (Time Anchor) guide and departure workflow"
```
