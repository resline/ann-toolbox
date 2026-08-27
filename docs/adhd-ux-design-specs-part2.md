# ADHD UX & Product Design Specifications - Part 2
## Narzędziownik Ani (Ann Toolbox)

### 1. Menu Dopaminowe (`dopamine-menu`)
**Cel:** Dostarczenie strukturyzowanych, świadomych wyborów stymulacji dopaminowej w momentach paraliżu decyzyjnego lub wypalenia energii.

#### 1.1 Struktura Menu (Evidence-based ADHD framework)
- **Przystawki (Appetizers - 1-5m):** Szybkie strzały dopaminy na przeczekanie nudy (np. wypicie szklanki wody, rozciągnięcie się, ulubiona piosenka).
- **Dania Główne (Entrees - 20-60m):** Aktywności wymagające wyższego zaangażowania i dające głębszą satysfakcję (np. spacer, czytanie rozdziału książki, granie w grę).
- **Dodatki w tle (Sides):** Rzeczy robione symultanicznie z inną nudną czynnością dla stymulacji (fidget spinner, muzyka lofi, podcast w tle podczas sprzątania).
- **Desery z uważnością (Desserts):** Rzeczy bardzo stymulujące (jak social media), ale opakowane w mindfulness i limity czasu (np. "15 minut bezkarnego scrollowania").
- **Dania Specjalne (Specials):** Nowe hiper-fiksacje, okazjonalne nagrody i unikalne przeżycia (np. zakupy, nowe hobby).

#### 1.2 Mechanizmy Behawioralne
- **"Koło Dopaminy" / "Losuj mikronagrodę":** Gdy Ania ma tzw. "ADHD freeze" (paraliż decyzyjny) i nie wie co ze sobą zrobić, system wybierze losową aktywność z kategorii odpowiedniej do jej stanu energii.
- **Śledzenie Energii (Energy State):** 
  - Użytkowniczka podaje swój poziom baterii (np. 1-10 lub ikony wyczerpanej/pełnej baterii).
  - *Niski stan baterii:* Interfejs ukrywa Dania Główne, sugerując wyłącznie Przystawki i Dodatki (aby uniknąć poczucia przytłoczenia).
  - *Wysoki stan baterii:* Proponowane są Dania Główne i realizacja zaległych zadań.

#### 1.3 User Journey
1. Ania czuje, że "utknęła" w doom-scrollingu albo patrzy w ścianę.
2. Otwiera moduł `dopamine-menu`.
3. System wita ją delikatnie: "Jak się teraz czujesz, Aniu?" (Wybór stanu baterii).
4. Na podstawie baterii Ania klika "Wylosuj mi coś", by pominąć ciężar decyzyjny.
5. Losuje "Wypij szklankę zimnej wody". Opcja akceptacji ze zjawiskową mikro-animacją gratulacyjną (chime) po wykonaniu.

---

### 2. Mikro-Zadania (`micro-tasks`)
**Cel:** Przełamywanie dysfunkcji wykonawczej (Executive Dysfunction) poprzez ekstremalną redukcję przytłoczenia (zero overwhelm).

#### 2.1 Reguła "Tylko Jeden Krok na Ekranie"
- Widok listy to-do zostaje całkowicie schowany (długie listy paraliżują).
- Interfejs pokazuje absolutnie tylko JEDNO zadanie / mały krok naraz. Duży tekst, centralnie na ekranie.
- Swiping: Przesuń w prawo, by "zaliczyć", w lewo, by "odłożyć na później".

#### 2.2 Tryb "5-Sekundowy Start" & "Tylko 2 minuty"
- **5-Second Rule:** Wizualne, dynamiczne odliczanie 5... 4... 3... 2... 1... START, aby przerwać pętlę wahania i aktywować tzw. "start motor".
- **Złudzenie "Tylko 2 minuty":** Celowe obniżanie barier wejścia (np. "Sprzątaj tylko 2 minuty. Możesz przestać, jeśli chcesz").

#### 2.3 Dekompozycja Zadań (Task Breakdown)
- System pozwala na rozbicie dużych, niejasnych zadań ("Sprzątanie biurka") na mikro-kroki.
- Możliwość wspomagania AI / predefiniowanych list (1. Weź worek na śmieci. 2. Wyrzuć pierwszy śmieć. 3. Wynies kubek...).

#### 2.4 Nagrody i Celebracja
- Celebracja mikro-sukcesów: Odgłosy typu "Web Audio chime", łagodne animacje dopaminowe (konfetti, rosnąca roślinka, miękkie pulsacje kolorów).

#### 2.5 User Journey
1. Ania ma wpisane "Zrobić pranie", ale unika tego od 3 dni.
2. Otwiera `micro-tasks` na to zadanie i klika "Rozbij to na mikro-kroki".
3. Pojawia się JEDEN krok na ekranie: "Podnieś jedną skarpetkę z podłogi".
4. Ania wykonuje go, swipe'uje ekran. Odtwarza się przyjemny dźwięk nagrody.
5. Momentum narasta (tzw. "task initiation" zostało pokonane), kolejne kroki stają się łatwiejsze.

---

### 3. Wizualny Timer & Flow Companion (`visual-timer`)
**Cel:** Łagodne wejście w stan skupienia (flow) bez stresu i lęku przed "odliczającym czasem", który wywołuje dysregulację emocjonalną u osób z ADHD.

#### 3.1 Pacing Fazowy (Phased Pacing)
- **Rozgrzewka (Warmup):** 3-5 minut bezwzględnie bez presji. To czas na "poklikanie", otworzenie zakładek, znalezienie lo-fi hip-hop. Timer ma miękkie, zachęcające kolory (np. pastelowy żółty do pomarańczowego).
- **Głęboki Flow (Deep Flow):** Zamiast tykającego zegara (odliczającego w dół), timer używa np. powolnie rosnącego lub kurczącego się okręgu / paska ładowania. Wyeliminowanie presji tykania.
- **Łagodne lądowanie (Cooldown/Stretch):** Zamiast alarmującego dzwonka na koniec (co potrafi boleśnie wyrwać ze stanu hiper-fiksacji), płynne, rosnące brzmienie dźwięku natury, sugerujące przeciągnięcie się i oderwanie wzroku od ekranu.

#### 3.2 Animacje Sensoryczne i Oddechowe
- Zintegrowane, dyskretne ćwiczenia oddechowe na boku ekranu w trudnych momentach:
  - *Box Breathing 4-4-4-4:* Do szybkiego uspokojenia lęku.
  - *Relaxing 4-7-8:* Gdy występuje przestymulowanie.
- Dźwięki tła (Binaural beats, Pink noise, Dźwięki deszczu, Kawiarnia) połączone z delikatnym pulsem interfejsu (Visual Metronome).

#### 3.3 User Journey
1. Ania chce się uczyć, ale ma "brain fog" i lęk przed 2 godzinami nauki.
2. Odpala `visual-timer`. Ekran zalał miękki gradient.
3. System włącza fazę 3-minutowej rozgrzewki ("Ułóż swoje biurko, włącz playlistę").
4. Następnie płynnie wchodzi w Flow Companion. Brak agresywnych cyfr odliczających sekundy. Tylko spokojnie napełniający się kształt.
5. W tle szumi różowy szum (pink noise). Po 30 minutach łagodny dźwięk misy tybetańskiej informuje o czasie na przeciągnięcie się.
