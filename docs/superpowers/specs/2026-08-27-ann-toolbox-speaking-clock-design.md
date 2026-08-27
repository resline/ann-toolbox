# Narzędziownik Ani (Ann Toolbox) — Specyfikacja Projektowa (Design Doc)
**Data:** 2026-08-27  
**Status:** Zatwierdzony projekt  
**Główny cel:** Stworzenie zintegrowanego pakietu narzędziowego PWA wspierającego osoby z ADHD (ze szczególnym uwzględnieniem Ani), z pierwszym kluczowym modułem: **„Głos Czasu” (Speaking Clock)**, ogłaszającym godzinę na głos w języku polskim w zadanych interwałach i działającym stabilnie w tle na telefonie.

---

## 1. Kontekst i Uzasadnienie (ADHD & Time Blindness)
Jednym z głównych wyzwań w ADHD jest tzw. **„ślepota czasowa” (time blindness)** — trudność w intuicyjnym wyczuwaniu upływu minut podczas skupienia (hiperfokus) lub rozproszenia.
Aplikacja rozwiązuje ten problem poprzez:
1. Regularne, bezstresowe **głosowe kotwiczenie w czasie** (wypowiadanie aktualnej godziny lub czasu trwania sesji po polsku).
2. **Łagodny sygnał ostrzegawczy (chime)** przed wypowiedzią, zapobiegający nagłemu przestraszeniu (*startle response*).
3. **Wizualną reprezentację upływu czasu** (pasek/pierścień postępu odliczający do kolejnego komunikatu).
4. **Niski próg wejścia** — jedno kliknięcie uruchamia odliczanie z gotowymi presetami (1m, 2m, 5m, 10m, 15m, 30m, 60m).
5. **Działanie w tle na Androidzie** (także przy zablokowanym ekranie i w kieszeni).

---

## 2. Architektura Systemu i Hub PWA

Aplikacja jest modularnym PWA (*Progressive Web App*) typu SPA (Single Page Application).

### 2.1 Stos Technologiczny
* **Język i Framework:** React 18/19, TypeScript, Vite.
* **Stylowanie i Ikony:** Tailwind CSS, Lucide Icons, Framer Motion (spokojne, organiczne przejścia).
* **Silnik Dźwiękowy:** Web Audio API (synteza chime), Web Speech API (`window.speechSynthesis` z wyborem głosów `pl-PL`), MediaSession API.
* **Silnik w Tle:** Dedykowany `Web Worker` odporny na throttling kart w tle + cicha pętla audio (Silent Audio Loop).
* **Przechowywanie Danych:** `localStorage` (zapisywanie ustawień, motywu, ulubionych interwałów, głosu).
* **PWA & Offline:** Service Worker z pełnym cacheowaniem zasobów statycznych, Web App Manifest (instalacja na ekranie głównym Androida bez konieczności korzystania ze sklepu Play).

### 2.2 Rejestr Modułów (Hub Architecture)
Struktura kodu w `/src/core/registry.ts` definiuje interfejs `ToolModule`, pozwalający na łatwe dołączanie kolejnych narzędzi pakietu w przyszłości:
```typescript
export interface ToolModule {
  id: string;                  // np. 'speaking-clock'
  title: string;               // np. 'Głos Czasu'
  description: string;         // np. 'Głosowe ogłaszanie godziny w tle'
  icon: LucideIcon;
  badge?: string;              // np. 'Aktywny'
  category: 'time' | 'focus' | 'wellbeing' | 'tasks';
  component: React.ComponentType;
}
```

---

## 3. Moduł „Głos Czasu” (Speaking Clock)

### 3.1 Tryby Działania
1. **Tryb Ciągły (Continuous Mode):**
   * Ogłasza czas w nieskończoność co zdefiniowany interwał aż do zatrzymania.
2. **Tryb Sesji Focus (Session / Pomodoro Mode):**
   * Odmierza zdefiniowany czas sesji (np. 25, 45, 60 min) z komunikatami co zadany okres (np. co 5 min), a po zakończeniu sesji odtwarza specjalny sygnał i komunikat końcowy.
3. **Synchronizacja do pełnych minut zegara (Clock-Sync):**
   * *Opcja A (Synchronizowana):* Interwał 5 min wyrównuje się do pełnych minut zegara systemowego (np. 14:00, 14:05, 14:10, 14:15).
   * *Opcja B (Stoper / Od teraz):* Interwał mierzony ściśle od momentu kliknięcia Start.

### 3.2 Formater Języka Polskiego (`polishTimeFormatter.ts`)
Obsługa poprawnych polskich form gramatycznych i odmian liczebników:
* **Precyzyjny (domyślny):** np. *„Jest godzina dwunasta piętnaście”*, *„Ósma zero pięć”*, *„Dwudziesta pierwsza trzydzieści”*.
* **Naturalny / Potoczny:** np. *„Za piętnaście druga”*, *„Wpół do czwartej”*, *„Pięć po dwunastej”*, *„Punkt dwunasta”*.
* **Krótki:** np. *„14:15”* / *„Czternasta piętnaście”*.
* **Upływ Czasu:** np. *„Minęło kolejne 5 minut, jest 14:15”* lub *„Minęło 20 minut sesji focusu”*.

### 3.3 Generator Dźwięku Chime (`chimeSynthesizer.ts`)
* Dźwięk syntezowany proceduralnie przez `AudioContext` z użyciem fal sinusoidalnych/trójkątnych (częstotliwość bazowa ~528 Hz / ciepły akord C5-G5).
* Łagodna obwiednia ADSR (Attack: 40ms, Decay: 120ms, Sustain: 0.3, Release: 600ms), eliminująca efekt zaskoczenia.
* Konfiguracja: włączony/wyłączony, głośność (0-100%), ton (łagodny/standard/jasny).

### 3.4 Silnik w Tle i Odporność na Wygaszanie (`backgroundTimerEngine.ts`)
* **Web Worker Timer:** Przeniesienie pętli odmierzania czasu do osobnego wątku roboczego, ignorującego throttling kart w mobilnym Chrome.
* **MediaSession API:** Rejestracja w Android Media Control (wyświetlanie powiadomienia z tytułem „Głos Czasu”, przyciskami Play/Pause w centrum powiadomień i na ekranie blokady).
* **Silent Audio Loop:** Odtwarzanie cichego nośnika audio przy aktywnym zegarze zapobiegające zawieszeniu procesu Web Audio przez system operacyjny.
* **Screen Wake Lock API:** Opcjonalny przełącznik w UI zapobiegający wygaszeniu ekranu podczas pracy na biurku.

---

## 4. UI / UX Specyfikacja dla ADHD

### 4.1 Kolorystyka i Wizualna Spokojność
* **Sage Calm Theme (Domyślny):** Odcienie szałwii (`#4A6B5D`, `#EAF0EC`), ciepły grafit (`#2D3748`), kremowe tła (`#F8FAF8`).
* **Dark Warm Theme:** Ciepły grafit (`#1A202C`), przytłumiona mięta (`#81E6D9`), miękka lawenda (`#BEE3F8`).
* **OLED Black Theme:** Czysta czerń (`#000000`) z łagodnym zielonym akcentem dla maksymalnej oszczędności baterii i czytelności nocnej.

### 4.2 Kluczowe Komponenty Ekranu
1. **Pasek Górny (Header):**
   * Logo/Nazwa „Narzędziownik Ani”.
   * Wskaźnik stanu działania w tle (pulsująca zielona kropka gdy aktywny).
   * Przełącznik motywu (Jasny / Ciemny / OLED).
2. **Karta Zegara:**
   * Cyfrowy zegar z sekundnikiem.
   * Wizualny pierścień/pasek postępu z czasem pozostałym do kolejnego komunikatu.
   * Etykieta kolejnego ogłoszenia (np. *„Następne ogłoszenie o 14:20 (za 03:12)”*).
3. **Sterowanie Główne:**
   * Duży, czytelny przycisk Start / Stop / Pauza.
   * Rząd pigułek szybkiego wyboru: `1 min`, `2 min`, `5 min`, `10 min`, `15 min`, `30 min`, `60 min` + własny czas.
4. **Rozwijany Panel Ustawień:**
   * Wybór głosu lektora (z podglądem głosów `pl-PL`).
   * Styl mówienia godziny (Precyzyjny / Naturalny / Krótki / Upływ czasu).
   * Dźwięk ostrzegawczy (Chime) - głośność i test.
   * Tryb sesji (Ciągły / Limitowana sesja focus).
   * Przycisk „Przetestuj głos teraz”.

---

## 5. Plan Weryfikacji i Testów

### 5.1 Testy Automatyczne
* **Unit Testy Formatera PL (`polishTimeFormatter.test.ts`):** Weryfikacja odmiany godzin i minut dla wszystkich 1440 minut doby (np. 00:00, 01:05, 12:15, 13:45, 23:59, odmiana „za piętnaście”, „wpół do”, „minut/minuty/minuta”).
* **Unit Testy Logiki Interwałów (`backgroundTimerEngine.test.ts`):** Obliczanie czasu do kolejnego ticku, obsługa wyrównania do pełnych minut zegara i limitów sesji.

### 5.2 Testy Manualne
* Uruchomienie na telefonie z Androidem (Chrome).
* Weryfikacja działania mowy po wygaszeniu ekranu telefonu na 5 minut (sprawdzenie czy komunikaty padają regularnie).
* Weryfikacja działania przycisków na ekranie blokady przez MediaSession API.
* Test instalacji PWA („Dodaj do ekranu głównego”).
