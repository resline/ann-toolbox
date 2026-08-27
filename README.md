# 🌸 Narzędziownik Ani (Ann Toolbox)

> **Zintegrowany pakiet narzędziowy PWA wspierający osoby z ADHD w codziennym funkcjonowaniu, pracy i przezwyciężaniu „ślepoty czasowej” (*time blindness*).**

---

## ⚓ Moduł 1: „Kotwica Czasu” (Time Anchor & Speaking Clock)

Głównym modułem narzędziownika jest **Kotwica Czasu** — multisensoryczny system wsparcia percepcji czasu łączący **dyskretny mówiący zegar w języku polskim**, **wizualny dysk Time Timer** oraz **asystenta wyjść i deadline'ów**.

Dla osób z ADHD pojęcie czasu bywa abstrakcyjne (*time blindness*). Zwykłe cyfry na zegarku wymagają ciągłego przeliczania w pamięci roboczej, co przy zmęczeniu lub hiperfokusie prowadzi do paraliżu decyzyjnego albo nagłego stresu (*„jak to minęły 2 godziny?!”*). **Kotwica Czasu** zakotwicza Cię w teraźniejszości poprzez łagodne bodźce słuchowe i wzrokowe.

---

### 🎛️ 3 Tryby Pracy

| Tryb | Nazwa | Zastosowanie | Działanie |
| :--- | :--- | :--- | :--- |
| 🕒 **1** | **Zegar Ciągły** | Praca codzienna, hobby, poranki | Ogłasza godzinę na głos co zadany interwał (np. co `1`, `2`, `5`, `10`, `15`, `30`, `60` min) bez limitu czasu. Opcja synchronizacji do pełnych minut zegara ściennego (`:00`, `:15`, `:30`). |
| 🎯 **2** | **Sesja Focus** | Praca głęboka, nauka, sprinty | Boczny blok czasu (np. 15, 25, 45, 60 min). Pomaga utrzymać skupienie na jednym zadaniu, informuje o upływie minut i łagodnie sygnalizuje koniec sesji. |
| 🚪 **3** | **Do Godziny (Wyjście / Cel)** | Przygotowania do wyjścia, pociąg, wizyta u lekarza, spotkanie | Odlicza czas do wyznaczonej godziny z **inteligentnym zagęszczaniem komunikatów** w miarę zbliżania się terminu. |

---

### 🚪 Tryb Wyjścia i Inteligentne Zagęszczanie Komunikatów (`Smart Density`)

Koniec z nerwowym zerkaniem na zegarek przed wyjściem! Wpisujesz godzinę (lub wybierasz szybki preset `+15m`, `+30m`, `+45m`, `+1h`) oraz etykietę (np. *„Wyjście z domu”*, *„Trening”*, *„Pociąg”*, *„Lekarz”*, *„Obiad”*, *„Praca”*).

Aplikacja przejmuje kontrolę nad upływem czasu i automatycznie dostosowuje częstotliwość przypomnień:
- **Powyżej 15 minut do celu:** Spokojne przypomnienia co 15 minut.
- **5 – 15 minut do celu:** Przypomnienia co 5 minut (*„Za 10 minut: Wyjście z domu”*, *„Za 5 minut: Wyjście z domu”*).
- **Ostatnie 5 minut:** Precyzyjne odliczanie co minutę (*„Za 4 minuty: Wyjście z domu”*, *„Za 3 minuty...”*, *„Za minutę: Wyjście z domu”*).
- **Godzina 0:00:** Podwójny miękki gong + finałowy komunikat: *„Czas na: Wyjście z domu! Jest godzina 08:30.”*.

---

### ⏱️ Wizualny Dysk Time Timer (`TimeTimerDisc`)

Wizualny kolorowy dysk pozwala natychmiast, bez liczenia i angażowania kory przedczołowej, ocenić ile czasu zostało:
- **Znikający sektor kołowy:** Płynna reprezentacja upływającego czasu (kąt zmniejszający się lub narastający).
- **5 kojących palet sensorycznych:**
  - 🌿 **Szałwia** (`#5B8272`) — wyciszenie i równowaga (domyślny)
  - 🍯 **Bursztyn** (`#F59E0B`) — ciepło i delikatne skupienie uwagi
  - 🪻 **Lawenda** (`#8B5CF6`) — głęboki relaks
  - 🪸 **Koral** (`#F43F5E`) — żywy, wyraźny akcent
  - 🌊 **Ocean** (`#0EA5E9`) — przejrzystość i przestrzeń
- **Dostosowanie tarczy:** Opcja włączenia/wyłączenia cyfr minutowych (`0, 5, 10... 55`) oraz wybór kierunku (klasyczny Time Timer przeciwnie do wskazówek zegara lub standardowy).
- **Tryb alternatywny:** Możliwość wyłączenia dysku i powrotu do klasycznego zegara cyfrowego z minimalistycznym pierścieniem postępu.

---

### ⚡ Szybkie Korekty Czasu w Locie (`QuickTimeAdjusters`)

Coś Cię zatrzymało lub potrzebujesz kilku dodatkowych minut na ubranie butów czy znalezienie kluczy?
Podczas aktywnego odliczania w trybie **Do Godziny** lub **Focus** pod tarczą pojawiają się przyciski szybkiej korekty:
- `+1 min`
- `+5 min`
- `+10 min`
- `-5 min`

Jedno dotknięcie natychmiast przesuwa godzinę docelową i dostosowuje harmonogram powiadomień bez zatrzymywania i resetowania odliczania.

---

### 🔔 Łagodny Dźwięk Gongu (*Harmonic Chime*) i Naturalna Polszczyzna

- **Anty-przestraszeniowy gong (Harmonic Chime):** Przed każdą wypowiedzią lektora rozbrzmiewa ciepły, kojący akord marimby / 528 Hz. Dzięki temu mowa nie zaskakuje w ciszy i nie wywołuje reakcji lękowej (*startle response*). Dostępne 3 barwy: *Łagodny*, *Ciepły*, *Jasny*.
- **Gramatyczna polszczyzna:** Silnik fleksyjny poprawnie odmienia liczebniki (*„za minutę”*, *„za 2 minuty”*, *„za 5 minut”*).
- **4 style wypowiedzi:**
  - **Naturalny:** *„Za piętnaście druga”*, *„Wpół do czwartej”*, *„Pięć po dwunastej”*.
  - **Precyzyjny:** *„Trzynasta czterdzieści pięć”*, *„Ósma zero pięć”*.
  - **Krótki:** *„Pierwsza czterdzieści pięć”*.
  - **Upływ Czasu:** *„Minęło 15 minut sesji”*.
- **Dostosowanie lektora:** Regulacja tempa mowy (0.8x – 1.4x), tonu głosu oraz głośności.

---

### 🔋 Niezawodne Działanie w Tle na Telefonie (PWA)

Aplikacja została zaprojektowana tak, aby działać stabilnie nawet po zablokowaniu ekranu czy przełączeniu do innych aplikacji:
- **Dedykowany Web Worker:** Czas jest odmierzany w osobnym wątku, odpornym na usypianie kart przez przeglądarkę.
- **MediaSession API:** Pełna integracja z ekranem blokady i paskiem powiadomień telefonu (możliwość pauzowania i wznawiania).
- **Cichy nośnik audio Web Audio API:** Utrzymuje aktywny proces audio w systemie operacyjnym (Android / iOS).
- **Screen WakeLock:** Opcja blokady wygaszania ekranu (idealna do postawienia telefonu na biurku lub w kuchni).
- **100% Offline (Service Worker):** Działa bez dostępu do Internetu.

---

## 📱 Instrukcja dla Ani — Jak zainstalować na telefonie

Aplikacja jest pełnoprawną **PWA (Progressive Web App)** — nie wymaga pobierania ze sklepu Google Play ani App Store.

### 🤖 Android (Google Chrome / Brave / Edge)
1. Otwórz adres aplikacji w przeglądarce na telefonie.
2. Na dole ekranu pojawi się przycisk **„Zainstaluj aplikację na telefonie”** — kliknij go.
3. *(Alternatywnie: kliknij menu z 3 kropkami w prawym górnym rogu przeglądarki i wybierz **„Zainstaluj aplikację”** lub **„Dodaj do ekranu głównego”**)*.
4. Na pulpicie telefonu pojawi się ikonka **Kotwica Czasu** — kliknij ją, aby uruchomić aplikację w trybie pełnoekranowym bez pasków przeglądarki.

### 🍏 iPhone / iPad (Safari)
1. Otwórz adres aplikacji w przeglądarce **Safari**.
2. Kliknij ikonę **Udostępnij** (kwadrat ze strzałką w górę na dolnym pasku).
3. Przewiń w dół i wybierz **„Do ekranu początkowego”** (*Add to Home Screen*).
4. Kliknij **Dodaj** w prawym górnym rogu.

---

## 🎨 Motywy Wizualne i Sensoryka

Aplikacja posiada 3 starannie dopasowane motywy kolorystyczne, przełączane jednym kliknięciem w nagłówku:
- 🌿 **Szałwiowy Jasny (Sage Warm):** Ciepłe odcienie szarości i kojąca szałwiowa zieleń redukująca przebodźcowanie wzrokowe.
- 🌙 **Ciepły Ciemny (Warm Dark):** Głęboki, miękki grafit ze zredukowanym kontrastem do pracy wieczornej.
- 🖤 **OLED Czerń (OLED Black):** Maksymalna czerń dla ekranów AMOLED oszczędzająca baterię telefonu.

Wszystkie elementy interfejsu mają powiększone pole dotykowe (min. **48px**), zapobiegając przypadkowym kliknięciom.

---

## 🚀 Uruchomienie lokalne i Development

Wymagania: **Node.js 22+**, **npm**.

```bash
# 1. Wejdź do katalogu aplikacji
cd ann-toolbox

# 2. Zainstaluj zależności
npm install

# 3. Uruchom serwer developerski (z dostępem w sieci lokalnej WiFi)
npm run dev -- --host
```

Aplikacja uruchomi się pod adresem: `http://localhost:5173`.

---

## 🧪 Testy i Jakość Kodu

Projekt zachowuje najwyższy rygor jakościowy: 100% pokrycia kluczowych modułów i pełna zgodność z TypeScript strict mode (0 błędów, 0 typów `any`).

```bash
# Uruchomienie pełnego zestawu 256 testów jednostkowych i integracyjnych
npm test -- --run

# Weryfikacja typów i budowanie produkcyjne
npm run build
```

---

## 🚢 Wdrożenie Produkcyjne (Docker / Coolify)

Repozytorium zawiera zoptymalizowany, wieloetapowy `Dockerfile` z serwerem Nginx do wdrożeń w środowisku **Coolify** / Docker Swarm / Kubernetes:

```bash
# Zbudowanie obrazu Docker
docker build -t ann-toolbox:latest .

# Uruchomienie kontenera na porcie 80
docker run -d -p 8080:80 --name ann-toolbox ann-toolbox:latest
```

---

## 🧭 Roadmapa i Kolejne Moduły Pakietu

Architektura aplikacji oparta jest o scentralizowany rejestr modułów (`src/core/registry.ts`), przygotowany pod kolejne narzędzia:
- ⚡ **Menu Dopaminowe** — podręczna lista szybkich mikronagród i zasobów energii przy spadkach nastroju.
- 🧩 **Mikro-Zadania** — dekompozycja przytłaczających zadań na bezwysiłkowe mikrokroki.
- 📅 **Wizualny Planer Dnia** — intuicyjny harmonogram blokowy chroniący przed przeciążeniem.

