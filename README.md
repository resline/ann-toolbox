# 🌸 Narzędziownik Ani (Ann Toolbox)

> **Zintegrowany pakiet narzędziowy PWA wspierający osoby z ADHD w codziennym funkcjonowaniu i przezwyciężaniu „ślepoty czasowej” (*time blindness*).**

---

## 🕒 Moduł 1: „Głos Czasu” (Speaking Clock)

Pierwszym aktywnym modułem narzędziownika jest **Głos Czasu** — mówiący zegar ogłaszający godzinę na głos w języku polskim w regularnych odstępach czasu.

### ✨ Kluczowe funkcje
1. **Kotwica czasowa dla ADHD (*Time Blindness Anchor*):**
   - Ogłaszanie czasu co zadany interwał: `1 min`, `2 min`, `5 min`, `10 min`, `15 min`, `30 min`, `60 min` lub dowolny czas.
   - Wizualny pierścień odliczania do kolejnego głosu bez wywoływania presji i stresu.
2. **Łagodny dźwięk dzwonka (*Harmonic Chime*):**
   - Zanim odezwie się głos, aplikacja emituje ciepły, miękki sygnał dźwiękowy (528 Hz / ciepła marimba), chroniąc przed nagłym przestraszeniem (*startle response*).
3. **Naturalna polszczyzna:**
   - 4 style wypowiedzi do wyboru:
     - **Precyzyjny:** *„Jest godzina czternasta piętnaście”*, *„Ósma zero pięć”*.
     - **Naturalny / Potoczny:** *„Za piętnaście druga”*, *„Wpół do czwartej”*, *„Pięć po dwunastej”*.
     - **Krótki:** *„Czternasta piętnaście”*.
     - **Upływ Czasu:** *„Minęło 10 minut, jest 14:10”*.
4. **Niezawodne działanie w tle na telefonie:**
   - Dedykowany `Web Worker` odporny na usypianie kart.
   - Integracja z `MediaSession API` (sterowanie z ekranu blokady i paska powiadomień telefonu).
   - Cichy nośnik audio `Web Audio API` chroniący proces przed ubiciem przez system operacyjny.
   - Obsługa Screen WakeLock (tryb biurkowy / kuchenny).
5. **Dwa tryby pracy:**
   - **Tryb Ciągły:** Odmierza czas bez limitu aż do wyłączenia.
   - **Tryb Sesji Focus (Pomodoro):** Informuje o upływie czasu podczas zaplanowanego zadania (np. sesja 25 min) i ogłasza zakończenie.
6. **Ergonomia sensoryczna:**
   - 3 kojące motywy: **Szałwiowy Jasny**, **Ciepły Ciemny** oraz **OLED Czerń**.
   - Duże, przyjazne przyciski dotykowe (min. 48px).

---

## 🚀 Uruchomienie lokalne

```bash
# 1. Wejdź do katalogu aplikacji
cd ann-toolbox

# 2. Zainstaluj zależności (jeśli jeszcze nie zainstalowane)
npm install

# 3. Uruchom serwer developerski
npm run dev -- --host
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173` (lub IP Twojego komputera w sieci lokalnej WiFi).

---

## 📱 Jak zainstalować na telefonie z Androidem (PWA)

1. Połącz telefon z tą samą siecią WiFi co komputer i otwórz w przeglądarce **Google Chrome** adres aplikacji (np. `http://192.168.x.x:5173` lub domenę produkcyjną).
2. Na dole ekranu pojawi się dyskretny baner: **„Zainstaluj aplikację na telefonie”** — kliknij **Zainstaluj**.
   *(Możesz też kliknąć menu z 3 kropkami w prawym górnym rogu Chrome i wybrać **„Dodaj do ekranu głównego”** / **„Zainstaluj aplikację”**)*.
3. Aplikacja pojawi się jako samodzielna ikonka na pulpicie telefonu, działa na pełnym ekranie i zachowuje pełną funkcjonalność również **offline**.

---

## 🧪 Testy i budowanie produkcyjne

```bash
# Uruchomienie wszystkich 184 testów jednostkowych i integracyjnych
npm test -- --run

# Budowanie paczki produkcyjnej
npm run build
```

---

## 🧭 Przyszłe moduły pakietu „Narzędziownik Ani”

Architektura pakietu oparta jest o modularny rejestr (`src/core/registry.ts`), przygotowany pod rozbudowę o kolejne narzędzia:
* 🎨 **Wizualny Timer** — reprezentacja upływającego czasu w kolorach i gradientach.
* ⚡ **Menu Dopaminowe** — podręczna lista szybkich mikronagród i zasobów energii przy spadkach nastroju.
* 🧩 **Mikro-Zadania** — dekompozycja przytłaczających obowiązków na mikrokroki bez oporu prokrastynacyjnego.
