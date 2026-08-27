# Narzędziownik Ani — Moduł „Głos Czasu” (Speaking Clock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stworzenie zintegrowanego pakietu PWA „Narzędziownik Ani” z pierwszym kluczowym modułem: „Głos Czasu” (mówiący zegar w języku polskim z miękkim sygnałem chime, działający w tle na telefonie z Androidem dla osób z ADHD).

**Architecture:** Modułowy React 18/19 SPA w architekturze Hubu, oparty o Vite, TypeScript, Tailwind CSS. Silnik czasu w tle wykorzystuje `Web Worker`, `MediaSession API` oraz cichy nośnik audio w `Web Audio API` dla zapobiegania usypianiu procesu. Synteza mowy w języku polskim z 4 trybami gramatycznymi oraz generator miękkiego dźwięku harmonicznego (528 Hz).

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Lucide React, Vitest, Web Audio API, Web Speech API, Service Worker / PWA.

**Spec:** `docs/superpowers/specs/2026-08-27-ann-toolbox-speaking-clock-design.md`

## Global Constraints
- Czas startu: < 1s, pełne działanie offline (PWA Service Worker cache).
- Poprawna polska fleksja i formy językowe dla wszystkich 1440 minut doby.
- Miękka obwiednia dźwięku dzwonka (chime) zapobiegająca sensorycznemu przestraszeniu (*startle response*).
- Zgodność z Android Chrome / Safari / Desktop.

---

### Task 1: Inicjalizacja Projektu (Vite + React + TS + Tailwind CSS + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css`
- Test: `src/setupTests.ts`

- [ ] **Krok 1: Inicjalizacja konfiguracji package.json i instalacja zależności**
Zainstaluj React, ReactDOM, Lucide React, Tailwind CSS, Vite, Vitest, `@testing-library/react`, `jsdom`.

- [ ] **Krok 2: Konfiguracja Vite, Vitest i Tailwind CSS**
Skonfiguruj `vite.config.ts` z obsługą Vitest i Web Workerów oraz `tailwind.config.js` z paletą Sage Calm i ciepłym grafitem.

- [ ] **Krok 3: Weryfikacja uruchomienia testów i budowania projektu**
Uruchom `npm test` oraz `npm run build` w celu upewnienia się, że środowisko kompiluje się bez błędów.

- [ ] **Krok 4: Commit**
```bash
git add package.json vite.config.ts tsconfig.json tailwind.config.js src/
git commit -m "chore: scaffold react vite tailwind project with vitest"
```

---

### Task 2: Silnik Gramatyki i Formatowania Czasu po Polsku (`polishTimeFormatter.ts`)

**Files:**
- Create: `src/modules/speaking-clock/services/polishTimeFormatter.ts`
- Test: `src/modules/speaking-clock/services/polishTimeFormatter.test.ts`

**Interfaces:**
- Produces: `formatPolishTime(date: Date, style: TimeFormatStyle, options?: FormatOptions): string`
- Typy: `TimeFormatStyle = 'precise' | 'natural' | 'short' | 'elapsed'`

- [ ] **Krok 1: Napisanie testów jednostkowych dla polskich formatów czasu**
Testy dla godzin:
- `12:00` -> Precyzyjny: „Jest godzina dwunasta zero zero”, Naturalny: „Dwunasta w południe” / „Dwunasta”
- `14:15` -> Precyzyjny: „Jest godzina czternasta piętnaście”, Naturalny: „Piętnaście po drugiej” (lub czternastej)
- `08:45` -> Precyzyjny: „Jest godzina ósma czterdzieści pięć”, Naturalny: „Za piętnaście dziewiąta”
- `17:30` -> Precyzyjny: „Jest godzina siedemnasta trzydzieści”, Naturalny: „Wpół do szóstej”
- Upływ czasu: `formatElapsedAnnouncement(elapsedMinutes: number, currentTime: Date)` -> „Minęło 10 minut. Jest 14:10”.

- [ ] **Krok 2: Uruchomienie testu w celu weryfikacji niepowodzenia (FAIL)**
`npm test polishTimeFormatter.test.ts`

- [ ] **Krok 3: Implementacja słowników liczebników głównych i porządkowych oraz reguł gramatycznych języka polskiego**
Obsługa wszystkich 24 godzin i 60 minut z właściwymi odmianami męskorzeczowymi i żeńskimi (np. *pierwsza*, *druga*, *trzecia*, *jedna minuta*, *dwie minuty*, *pięć minut*).

- [ ] **Krok 4: Uruchomienie testów i weryfikacja zaliczenia (PASS)**
`npm test polishTimeFormatter.test.ts`

- [ ] **Krok 5: Commit**
```bash
git add src/modules/speaking-clock/services/polishTimeFormatter*
git commit -m "feat(clock): implement polish time formatting engine with unit tests"
```

---

### Task 3: Generator Łagodnego Dźwięku Chime (`chimeSynthesizer.ts`)

**Files:**
- Create: `src/modules/speaking-clock/services/chimeSynthesizer.ts`
- Test: `src/modules/speaking-clock/services/chimeSynthesizer.test.ts`

**Interfaces:**
- Produces: `playChime(options?: ChimeOptions): Promise<void>`
- Typy: `ChimeOptions = { volume?: number; tone?: 'gentle' | 'warm' | 'bright' }`

- [ ] **Krok 1: Napisanie testów mockujących Web Audio API**
Sprawdzenie tworzenia węzłów `OscillatorNode`, `GainNode`, parametrów częstotliwości (528 Hz, 660 Hz) oraz obwiedni głośności `linearRampToValueAtTime` / `exponentialRampToValueAtTime`.

- [ ] **Krok 2: Implementacja syntezatora dźwięków łagodnego chime**
Czysty kod AudioContext z bezpieczną inicjalizacją (po resume) i automatycznym sprzątaniem węzłów audio.

- [ ] **Krok 3: Uruchomienie testów i weryfikacja**
`npm test chimeSynthesizer.test.ts`

- [ ] **Krok 4: Commit**
```bash
git add src/modules/speaking-clock/services/chimeSynthesizer*
git commit -m "feat(clock): implement web audio harmonic chime synthesizer"
```

---

### Task 4: Serwis Syntezy Mowy PL (`speechService.ts`)

**Files:**
- Create: `src/modules/speaking-clock/services/speechService.ts`
- Test: `src/modules/speaking-clock/services/speechService.test.ts`

**Interfaces:**
- Produces:
  - `getPolishVoices(): Promise<SpeechSynthesisVoice[]>`
  - `speakText(text: string, options?: SpeechOptions): Promise<void>`
  - `stopSpeaking(): void`

- [ ] **Krok 1: Napisanie testów jednostkowych dla serwisu mowy**
Weryfikacja obsługi kolejki syntezy, timeoutów, wyszukiwania głosów z prefiksem `pl` i przekazywania parametrów `rate`, `pitch`, `volume`.

- [ ] **Krok 2: Implementacja SpeechService**
Obsługa zdarzenia `onvoiceschanged`, fallback do domyślnego głosu jeśli brak dedykowanego `pl-PL`, anulowanie poprzedniej mowy przy nowym żądaniu.

- [ ] **Krok 3: Weryfikacja testów**
`npm test speechService.test.ts`

- [ ] **Krok 4: Commit**
```bash
git add src/modules/speaking-clock/services/speechService*
git commit -m "feat(clock): implement polish speech synthesis service"
```

---

### Task 5: Silnik Działania w Tle i Web Worker (`timerWorker.ts` & `backgroundTimerEngine.ts`)

**Files:**
- Create:
  - `src/modules/speaking-clock/services/timerWorker.ts`
  - `src/modules/speaking-clock/services/backgroundTimerEngine.ts`
  - `src/modules/speaking-clock/services/silentAudioLoop.ts`
  - `src/modules/speaking-clock/services/wakeLockService.ts`
- Test: `src/modules/speaking-clock/services/backgroundTimerEngine.test.ts`

**Interfaces:**
- Produces:
  - `class BackgroundTimerEngine` z metodami `start()`, `pause()`, `stop()`, `setSettings()`, `onTick()`, `onAnnounce()`
  - Integracja `navigator.mediaSession` z metadanymi i akcjami odtwarzacza.

- [ ] **Krok 1: Napisanie testów jednostkowych dla mechaniki interwałów i synchronizacji zegarowej**
Weryfikacja:
- Obliczania sekund pozostałych do kolejnego ogłoszenia (przy wyrównaniu do zegara i w trybie stoper).
- Wyzwalania zdarzenia ogłoszenia (chime + mowa).
- Kończenia sesji po upływie zadanego czasu.

- [ ] **Krok 2: Implementacja Web Workera i Silnika w Tle**
Stworzenie dedykowanego workera wysyłającego ticki, połączenie z cichym generatorem audio dla utrzymania karty w Androidzie oraz obsługa MediaSession API.

- [ ] **Krok 3: Uruchomienie testów i weryfikacja**
`npm test backgroundTimerEngine.test.ts`

- [ ] **Krok 4: Commit**
```bash
git add src/modules/speaking-clock/services/backgroundTimerEngine* src/modules/speaking-clock/services/timerWorker*
git commit -m "feat(clock): implement background timer worker and media session keeper"
```

---

### Task 6: Architektura Hubu, Rejestr Narzędzi i Motywy (`src/core/`)

**Files:**
- Create:
  - `src/core/types.ts`
  - `src/core/registry.ts`
  - `src/core/theme/ThemeContext.tsx`
  - `src/core/theme/theme.ts`
- Test: `src/core/registry.test.ts`

- [ ] **Krok 1: Implementacja definicji modułów i rejestru narzędzi**
Stworzenie rejestru z modułem `speaking-clock` oraz zaplanowanymi miejscami na kolejne narzędzia Ani (Wizualny Timer, Dopamine Menu).

- [ ] **Krok 2: Implementacja ThemeContext (Szałwia / Ciepły Ciemny / OLED Nocny)**
Obsługa zapisu w `localStorage` i automatycznego przełączania klas Tailwind CSS.

- [ ] **Krok 3: Weryfikacja testów rejestru**
`npm test registry.test.ts`

- [ ] **Krok 4: Commit**
```bash
git add src/core/
git commit -m "feat(core): implement toolbox registry and theme management"
```

---

### Task 7: Komponenty UI Modułu „Głos Czasu”

**Files:**
- Create:
  - `src/modules/speaking-clock/hooks/useSpeakingClock.ts`
  - `src/modules/speaking-clock/components/ClockDisplay.tsx`
  - `src/modules/speaking-clock/components/TimeProgressRing.tsx`
  - `src/modules/speaking-clock/components/PresetPills.tsx`
  - `src/modules/speaking-clock/components/ClockControls.tsx`
  - `src/modules/speaking-clock/components/ClockSettingsModal.tsx`
  - `src/modules/speaking-clock/SpeakingClockModule.tsx`
- Test: `src/modules/speaking-clock/SpeakingClockModule.test.tsx`

- [ ] **Krok 1: Implementacja hooka `useSpeakingClock`**
Łączenie stanu silnika w tle z interfejsem React, zapis preferencji w `localStorage`.

- [ ] **Krok 2: Budowa komponentów UI o spokojnej, sensorycznie łagodnej estetyce**
Duży czytelny zegar, pierścień upływu czasu, kafelki 1m/2m/5m/10m/15m/30m/60m, przycisk Start/Pauza/Stop, modal konfiguracji głosu i chimes oraz przycisk testowy.

- [ ] **Krok 3: Weryfikacja renderowania i interakcji w testach RTL**
`npm test SpeakingClockModule.test.tsx`

- [ ] **Krok 4: Commit**
```bash
git add src/modules/speaking-clock/
git commit -m "feat(ui): implement speaking clock module UI components"
```

---

### Task 8: Główny Hub Aplikacji, PWA Service Worker i Instalowalność

**Files:**
- Create:
  - `src/components/Header.tsx`
  - `src/components/HubDashboard.tsx`
  - `src/App.tsx`
  - `public/manifest.json`
  - `public/sw.js`
  - `public/icons/icon-192.svg`
  - `public/icons/icon-512.svg`

- [ ] **Krok 1: Budowa widoku głównego Hubu i nawigacji**
Karty narzędzi, szybkie przełączanie, wskaźnik aktywnego zegara w nagłówku.

- [ ] **Krok 2: Konfiguracja manifestu PWA i Service Workera**
Obsługa instalacji na ekranie głównym telefonu z Androidem, ikony SVG/PNG, obsługa trybu `standalone` i pełnego offline cache.

- [ ] **Krok 3: Weryfikacja kompilacji produkcyjnej PWA**
`npm run build`

- [ ] **Krok 4: Commit**
```bash
git add src/App.tsx src/components/ public/
git commit -m "feat(pwa): add toolbox hub navigation, pwa manifest and service worker"
```

---

### Task 9: Kompleksowa Weryfikacja, Testy End-to-End i Finalne Szlify

- [ ] **Krok 1: Uruchomienie pełnego zestawu testów jednostkowych**
`npm test -- --run`

- [ ] **Krok 2: Testy dźwięku, syntezy mowy i działania w tle**
Weryfikacja wyzwalania audio i zachowania przy zmianie kart.

- [ ] **Krok 3: Przygotowanie dokumentacji użytkownika i instrukcji instalacji na telefonie**
Stworzenie `README.md` z opisem uruchomienia i instalacji PWA na Androidzie dla Ani.

- [ ] **Krok 4: Finalny Commit**
```bash
git add .
git commit -m "chore: complete ann-toolbox speaking clock implementation"
```
