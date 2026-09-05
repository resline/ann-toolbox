# Przystań na Androidzie — mówiący zegarek

Wersja APK zawiera cały interfejs Przystani i nagrania Kore. Zegar działa w natywnej
usłudze Androida, także gdy ekran „Czas” jest zamknięty, WebView zostanie zniszczone
lub ekran telefonu zgaśnie. Dane APK i PWA są oddzielne; pierwsza instalacja APK
zaczyna od ustawień domyślnych. Ta wersja nie przenosi danych z PWA.

## Instalacja i pierwszy start

Na stronie głównej Przystani oraz w webowym module **Czas** przycisk
**Pobierz aplikację na Androida (APK)** udostępnia `/downloads/przystan.apk`.
Plik i suma SHA-256 znajdują się w `public/downloads/` i są częścią wdrożenia
strony. Service Worker nie buforuje instalatora. Kolejny `npm run android:release`
aktualizuje oba pliki po weryfikacji podpisu; następnie zbuduj stronę przez
`npm run build` i wdrażaj ją razem z nowym instalatorem. Pobieranie wymaga internetu.
Build natywny usuwa katalog pobierania z zasobów kopiowanych do APK.

1. Zainstaluj pobrany `przystan.apk` (lokalny build: `przystan-1.0-release.apk`). Android może poprosić o zezwolenie na
   instalację z aplikacji, w której otwierasz plik.
2. Otwórz **Czas** i wybierz **Ustaw działanie w tle**.
3. W systemowych ustawieniach optymalizacji baterii znajdź **Przystań** i wybierz
   **Nie optymalizuj** / **Bez ograniczeń**. Nazwy zależą od producenta telefonu;
   czasem trzeba najpierw wybrać listę wszystkich aplikacji.
4. Wróć do Przystani. Poczekaj na przygotowanie głosu i komunikat o gotowości do
   pracy z wygaszonym ekranem. W ustawieniach czasu użyj **Posłuchaj głosu**.
5. Ustaw odstęp, naciśnij **Start** i zgaś ekran. Powiadomienie zegarka pozwala
   wstrzymać, wznowić lub zakończyć sesję.

Zegar korzysta z głośności **multimediów**. Podczas komunikatu prosi system o
chwilowe ściszenie pozostałego odtwarzania, a potem oddaje dostęp do dźwięku.
Aplikacja podcastowa może zamiast ściszenia wybrać pauzę. Rozmowa telefoniczna,
wyciszone multimedia lub odmowa audio powodują pominięcie komunikatu z zapisem
przyczyny; kolejne terminy nadal są odmierzane. Odłączenie słuchawek wstrzymuje
sesję, żeby głos nie zaskakiwał z głośnika.

W czasie aktywnej sesji aplikacja utrzymuje CPU. To koszt niezawodności przy
częstych komunikatach; pauza i Stop zwalniają blokadę. Wycofanie wyjątku baterii
wstrzymuje zegarek. Opcja **Nie wygaszaj ekranu** jest oddzielna i w APK domyślnie
wyłączona.

Aktualizuj przez instalację kolejnego APK z tym samym podpisem. Nie odinstalowuj
aplikacji przed aktualizacją — odinstalowanie usuwa jej lokalne dane. Android 7.0
(API 24) jest minimalną obsługiwaną wersją.

## Zachowanie sesji

- Zmiana zakładki, wygaszenie ekranu i zamknięcie widoku nie kończą sesji.
- Pauza zamraża czas sesji skupienia. Termin **Do wyjścia** pozostaje ustaloną
  godziną, więc podczas pauzy nadal się zbliża.
- Zmiana interwału w trakcie pracy działa od razu: względny odstęp jest liczony od
  zmiany, synchronizowany od najbliższej przyszłej granicy zegara.
- Usługa zapisuje stan przed rozpoczęciem komunikatu. Po odtworzeniu przez system
  nie powtarza całej zaległej kolejki; utracony finał nie jest odtwarzany drugi raz.
- Restart telefonu i ręczne wymuszenie zatrzymania wymagają otwarcia aplikacji
  oraz wznowienia. Systemowe odtworzenie procesu nie gwarantuje braku przerwy
  podczas samej awarii procesu.

## Kompilacja i podpis

Wymagania: Node 22+, npm, `ffmpeg`, pełny JDK 21, Android SDK 36 i zaakceptowane
lokalnie licencje SDK. Ustaw `ANN_ANDROID_JAVA_HOME`, jeśli JDK jest poza lokalnym
katalogiem narzędzi, oraz `ANDROID_HOME`, jeśli SDK nie leży w `~/Android/Sdk`.

```bash
npm ci
npm test
npm run android:test
npm run android:debug
npm run android:release
```

`android:release` waliduje pakiet głosu, buduje web, synchronizuje Capacitor,
kompiluje APK, uruchamia lint Androida i weryfikuje podpis. Wyniki trafiają do
`artifacts/android/`: APK, suma SHA-256 i informacje o certyfikacie. Artefakty
lokalne nie są commitowane. Wariant debug ma oddzielny identyfikator
`net.resline.przystan.debug`, żeby testy nie zastępowały zainstalowanej wersji.

Pierwszy build release tworzy stały klucz w
`~/.local/share/ann-toolbox/android-signing/`. Katalog zawiera keystore i prywatny
plik konfiguracyjny; należy zabezpieczyć kopię **całego katalogu**. Utrata klucza
uniemożliwi aktualizowanie tej instalacji. Skrypt nigdy nie wypisuje haseł i nie
umieszcza ich w repozytorium. Istniejący klucz można wskazać przez
`ANN_ANDROID_KEYSTORE`, `ANN_ANDROID_STORE_PASSWORD`, `ANN_ANDROID_KEY_PASSWORD`;
alias klucza to `przystan`.

Pakiet PCM jest deterministycznie dekodowany z obecnego sprite'a OGG. Build nie
uruchamia generatora AI, nie używa kluczy API i nie ponosi kosztu syntezy głosu.

## Testy na urządzeniu

Testy JVM obejmują planowanie, pauzę, zmianę interwału, odtworzenie stanu,
jednokrotne finały oraz 6112 porównań polskiego plannera z implementacją webową.
Nie dowodzą działania głośnika ani odporności telefonu na uśpienie.

Instrumentacja korzysta z **wariantu debug**. Wskaż konkretny numer urządzenia,
wyłącz optymalizację baterii dla **Przystań — test** i uruchom:

```bash
JAVA_HOME="$ANN_ANDROID_JAVA_HOME" android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest
adb -s NUMER_URZADZENIA install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s NUMER_URZADZENIA install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s NUMER_URZADZENIA shell am instrument -w -e class net.resline.przystan.clock.ClockServiceTest net.resline.przystan.debug.test/androidx.test.runner.AndroidJUnitRunner
```

Test zamyka Activity, wygasza ekran, wymusza Doze, czeka na prawdziwy termin
komunikatu i sprawdza postęp odtwarzania `AudioTrack`, jego zakończenie oraz
zwolnienie zasobów po Stop. Na końcu wycofuje wymuszone Doze i symulację odłączenia
baterii. Nie zmienia preferencji optymalizacji baterii. Test bez wymaganego wyjątku
baterii jest **pomijany**, a nie zaliczony. Doze musi być włączone w konfiguracji
urządzenia; test sprawdza faktyczny stan IDLE. Dla sześciu kolejnych komunikatów
dodaj do `am instrument` argument `-e announcements 6`. W emulatorze postęp AudioTrack nie
stanowi dowodu słyszalnego dźwięku na fizycznym telefonie.

Odbiór na docelowym telefonie, odłączonym od ładowarki:

| Próba | Oczekiwany wynik |
| --- | --- |
| 2 godziny, odstęp 1 minuta, ekran wyłączony | Pełny gong i głos w każdym terminie |
| 8 godzin, odstęp 5 minut, ekran wyłączony | Brak pominięć i duplikatów; zapis zużycia baterii |
| Odstępy 15 i 60 minut, po 3 komunikaty | Przetrwanie długich przerw bez interakcji |
| Zmiana interwału, pauza, wznowienie, korekta czasu | Ta sama sesja, poprawne nowe terminy |
| Sesja skupienia i Do wyjścia | Jeden kompletny finał, następnie zatrzymanie |
| Muzyka, rozmowa, Bluetooth, Stop w trakcie głosu | Poprawne oddawanie audio, brak dźwięku po Stop |
| Nawigacja, odtworzenie widoku, ponowne otwarcie | Stan zgodny z usługą, bez drugiego silnika |

Próg opóźnienia początku dźwięku: najwyżej 2 sekundy, gdy system udostępnia audio.
Podczas testu ustaw głośność umożliwiającą odsłuch; log nie wykryje odłączonego lub
uszkodzonego głośnika. Test fizycznego telefonu pozostaje konieczny przed uznaniem
naprawy za w pełni potwierdzoną.

## Diagnostyka i architektura

Przycisk **Zapisz diagnostykę zegarka** zapisuje wybrany przez użytkowniczkę plik
JSONL. Lokalny dziennik ma limit około 2 MiB i zawiera planowany termin,
zaobserwowany początek postępu audio, zakończenie, pominięcia i polecenia. Nie
zawiera treści zadań ani nagrań mikrofonu i nie jest automatycznie wysyłany.

`ClockBackend` oddziela interfejs od silników. Na Androidzie jedynym właścicielem
stanu jest `ClockRuntime` i `SpeakingClockService`. Polecenia są wykonywane na
jednym looperze; Stop unieważnia także oczekujące uruchomienia. WebView odbiera
wersjonowane snapshoty z liczbowymi datami, a jego zniszczenie odłącza tylko
obserwatorów. `ClockModel` nie używa klas Androida; `VoiceAudio` przygotowuje pełną
wypowiedź i odtwarza ją na osobnym executorze.

Usługa `mediaPlayback` jest utrzymywana przez czas aktywnej sesji, także podczas
godzinnych przerw; nie zależy od automatycznego timeoutu nieaktywnego playera.
Blokada CPU ma timeout 10 minut, odnawiany co 5 minut przez działający zegarek.
Wyjątek baterii jest potrzebny, ponieważ sam foreground service nie wyłącza
ograniczeń Doze. [Android: Doze](https://developer.android.com/training/monitoring-device-state/doze-standby)

PWA nadal korzysta z Web Audio i Web Workera. Wykryte zawieszenie audio wstrzymuje
zegar i wymaga wznowienia; to zabezpieczenie przed pozornym działaniem, nie
gwarancja pracy po wygaszeniu ekranu. [Chrome: ograniczenia timerów](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/)
