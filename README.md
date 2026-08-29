# ⚓ Przystań

> Spokojne miejsce na czas, skupienie, energię i pierwszy krok.
> Aplikacja PWA dla osoby z ADHD — działa bez internetu, wszystko zostaje na telefonie.

Nazwa ma dwa znaczenia naraz: **przystań** to bezpieczna zatoka, a jednocześnie tryb
rozkazujący od *przystanąć*. Dokładnie o to chodzi.

---

## Cztery moduły, nazwane stanem, a nie mechanizmem

Przy ADHD nawiguje się tym, **czego się właśnie potrzebuje**, a nie tym, jak coś działa
w środku. Dlatego moduły nie nazywają się „mówiący zegar" ani „menu dopaminowe".

| Moduł | Kiedy się po niego sięga |
| :--- | :--- |
| ⏱ **Czas** | Kiedy tracisz poczucie, ile minęło |
| ◉ **Skupienie** | Kiedy trzeba wejść w pracę |
| ✦ **Energia** | Kiedy bak jest pusty |
| 👣 **Start** | Kiedy nie możesz ruszyć z miejsca |

Ekran startowy **Teraz** pokazuje żywy stan każdego z nich — „mówi co 5 minut",
„3 iskierki dzisiaj", „krok 2 z 6" — zamiast opisów, których nikt nie czyta po drugim
uruchomieniu.

---

## ⏱ Czas

Multisensoryczne wsparcie percepcji czasu: mówiący zegar po polsku, wizualna tarcza
Time Timera i asystent wyjść.

**Trzy tryby**

| Tryb | Zastosowanie |
| :--- | :--- |
| **Ciągły** | Ogłasza godzinę co zadany odstęp (1–60 min), opcjonalnie równo z zegarem ściennym |
| **Sesja** | Zamknięty blok czasu na pracę głęboką (15 / 25 / 45 / 60 min) |
| **Do wyjścia** | Odlicza do wyznaczonej godziny z zagęszczaniem komunikatów przy końcu |

**Zagęszczanie przypomnień.** Powyżej 15 minut — co 15. Między 5 a 15 — co 5.
Ostatnie pięć minut — co minutę. Na koniec podwójny gong i komunikat.
Alternatywnie stały odstęp, jeśli tak jest spokojniej.

**Tarcza Time Timera.** Ubywający wycinek koła pozwala ocenić pozostały czas jednym
spojrzeniem, bez liczenia. Pięć palet do wyboru (Szałwia, Bursztyn, Lawenda, Koral, Ocean),
świadomych motywu — bursztyn na czarnym ekranie nie oślepia. Podziałka 0–55 do włączenia,
kierunek ubywania do wyboru.

**Korekta w locie.** W trakcie odliczania: −5, +1, +5, +10 minut jednym dotknięciem,
bez zatrzymywania i resetowania.

**Naturalna polszczyzna offline.** Silnik fleksyjny odmienia liczebniki poprawnie
(„za minutę", „za 2 minuty", „za 5 minut"). Cztery sposoby mówienia: naturalnie
(„za piętnaście druga"), dokładnie („trzynasta czterdzieści pięć"), krótko, oraz
„ile minęło". Głos Kore jest zapisany w aplikacji jako 337 nagranych fragmentów —
telefon nie korzysta z Android Speech ani z chmury. Przed każdą wypowiedzią ciepły
gong, żeby głos nie zaskakiwał w ciszy.

**Działanie w tle.** Dedykowany Web Worker odporny na usypianie kart, MediaSession
(sterowanie z ekranu blokady), cichy nośnik audio utrzymujący proces w systemie,
opcjonalna blokada wygaszania ekranu. Gong i wszystkie fragmenty wypowiedzi są
planowane jednocześnie na jednej osi Web Audio, więc zablokowanie ekranu między nimi
nie urywa głosu. Android może jednak zakończyć proces PWA pod presją pamięci lub po
wymuszeniu zatrzymania — tego aplikacja webowa nie może obejść.

---

## ◉ Skupienie

Fazowany timer bez presji tykającego zegara: rozgrzewka → praca → łagodne wyjście.
Do tego ćwiczenia oddechowe (Box Breathing 4-4-4-4, Relaxing 4-7-8, Calm Flow)
i dźwięki tła.

## ✦ Energia

Menu aktywności podnoszących poziom energii, w metaforze karty dań: przystawki (1–5 min),
dania główne (20–60 min), dodatki w tle, desery i dania specjalne. Filtr według poziomu
energii, koło losujące na wypadek paraliżu decyzyjnego oraz tryb SOS.

## 👣 Start

Rozbijanie przytłaczających zadań na kroki poniżej dwóch minut. Jeden krok na ekranie,
wielkim fontem — długa lista paraliżuje. Ponad piętnaście gotowych szablonów, suwak
oporu, dwuminutowy pierścień „zacznij tylko na chwilę" i celebracja po skończeniu.
Postęp jest zapisywany, więc zamknięcie karty w połowie zadania niczego nie kasuje.

---

## 🎨 Wygląd

**Trzy motywy** przełączane w ustawieniach, z podglądem:

- **Dzień** — ciepła biel papieru i przygaszona szałwia
- **Zmierzch** — ciepły grafit bez niebieskiego chłodu
- **Noc** — czysta czerń dla ekranów AMOLED

Kierunek wizualny to *ciche rzemiosło*: powierzchnie jak papier, jeden akcent używany
znaczeniowo, typografia jako główny nośnik hierarchii, cienka linia zamiast ciężkich cieni.
Nic nie krzyczy — to celowe przy wrażliwości sensorycznej.

**Dostępność.** Kontrast każdej pary tekst × tło jest wyliczany i pilnowany testem
(próg AA 4.5:1, 3:1 dla obrysów). Jedno pole dotykowe ma minimum 48 px. Ruch da się
ograniczyć niezależnie od ustawień telefonu. Pinch-zoom działa.

---

## 📱 Instalacja na telefonie

Przystań jest pełnoprawną aplikacją PWA — nie wymaga sklepu.

**Android (Chrome / Brave / Edge)**
1. Otwórz adres aplikacji w przeglądarce.
2. Pojawi się pasek **„Miej Przystań pod ręką"** — dotknij **Dodaj do ekranu**.
3. Alternatywnie: menu z trzema kropkami → **Zainstaluj aplikację**.

**iPhone / iPad (Safari)**
1. Otwórz adres w Safari.
2. Dotknij ikonę **Udostępnij**.
3. Wybierz **Do ekranu początkowego** → **Dodaj**.

---

## 🛠 Uruchomienie lokalne

Wymagania: **Node.js 22+**, **npm**.

```bash
npm install
npm run dev -- --host      # dostępne też w sieci lokalnej, do testów na telefonie
```

## 🧪 Testy

```bash
npm test            # pełny zestaw
npx tsc --noEmit    # weryfikacja typów
npm run build       # build produkcyjny
npm run voice:validate # integralność, kompletność i pamięć pakietu głosowego
```

Pakiet głosowy jest niezmiennym artefaktem buildu i zwykły build go nie regeneruje.
Build wymaga `ffmpeg`, ponieważ przed kompilacją zawsze dekoduje i sprawdza cały
pakiet; obraz Docker instaluje to narzędzie wyłącznie w etapie budowania.
Kontrolowana regeneracja wymaga zalogowanego `gcloud`, najpierw pokazuje kosztorys i
nie wysyła żądań bez jawnego potwierdzenia:

```bash
npm run voice:generate
npm run voice:generate -- --confirm-generate
```

Poza testami jednostkowymi zestaw zawiera bramki jakości, które trudno utrzymać ręcznie:

| Plik | Czego pilnuje |
| :--- | :--- |
| `src/design/tokens.test.ts` | Zgodność `tokens.css` z `tokens.ts` oraz kontrast WCAG każdej pary kolorów we wszystkich trzech motywach |
| `src/copy/copy.test.ts` | Brak angielszczyzny w interfejsie, jeden stan = jedna etykieta, rodzaj żeński |
| `src/copy/plural.test.ts` | Poprawna odmiana liczebników |
| `src/testing/conventions.test.ts` | Testy nie przywiązują się do wyglądu (brak asercji na klasach CSS, selektorów po klasach, kolejności w DOM, literałów interfejsu) |
| `src/lib/icons.test.ts` | Ikony importowane pojedynczo — barrel `lucide-react` wciąga komplet ~1500 ikon |

## 🚢 Wdrożenie

Wieloetapowy `Dockerfile` z Nginx, gotowy pod Coolify / Docker / Kubernetes:

```bash
docker build -t przystan:latest .
docker run -d -p 8080:80 --name przystan przystan:latest
```

---

## 🏗 Architektura

```
src/
├── app/          powłoka: router, nagłówek, dolna nawigacja, ekran „Teraz", ustawienia
├── components/ui prymitywy interfejsu (Button, Card, Sheet, Field, Slider…)
├── copy/         wszystkie teksty interfejsu — zero napisów w JSX
├── core/         rejestr modułów i motywy
├── design/       tokeny wizualne i typografia
├── lib/          cn(), ikony, warstwa ruchu, media query, historia arkuszy
└── modules/      cztery moduły, każdy z własną logiką domenową
```

Nawigacja korzysta z History API, więc każdy moduł ma własny adres (`/czas`,
`/skupienie`, `/energia`, `/start`), a przycisk Wstecz wraca na ekran startowy
zamiast zamykać aplikację. Otwarty arkusz też jest wpisem w historii.

Dane trzymane są wyłącznie w `localStorage` tego telefonu. Nic nie wychodzi na zewnątrz.
