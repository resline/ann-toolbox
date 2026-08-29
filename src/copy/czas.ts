/** Moduł Czas — mówiący zegar, sesja skupienia, odliczanie do wyjścia. */
export const czas = {
  title: 'Czas',

  mode: {
    continuous: { title: 'Ciągły', hint: 'mówi co kilka minut' },
    focus: { title: 'Sesja', hint: 'zamknięty blok czasu' },
    departure: { title: 'Do wyjścia', hint: 'odliczanie do godziny' },
  },
  modeLabel: 'Tryb pracy zegara',

  /** Jeden napis na jeden stan. Wcześniej ten sam stan miał cztery brzmienia. */
  state: {
    idle: 'W spoczynku',
    running: 'Mówi w tle',
    paused: 'Wstrzymany',
  },

  action: {
    testVoice: 'Posłuchaj głosu',
    retryVoice: 'Przetestuj głos',
    openSettings: 'Ustawienia czasu',
    adjustPlus: (minutes: number) => `Dodaj ${minutes} min`,
    adjustMinus: (minutes: number) => `Odejmij ${minutes} min`,
  },

  disc: {
    clock: 'Godzina',
    next: 'Następne za',
    departure: 'Do wyjścia',
    focus: 'Sesja',
    everyMinutes: (minutes: number) => `co ${minutes} min`,
    focusLength: (minutes: number) => `blok ${minutes} min`,
  },

  notice: {
    noPolishVoice:
      'Ten telefon nie ma polskiego głosu. Zegar zadzwoni gongiem, ale nie powie godziny.',
    speechFailed: 'Nie udało się uruchomić głosu. Zegar nadal działa.',
  },

  interval: {
    label: 'Odstęp między ogłoszeniami',
  },

  adjust: {
    label: 'Szybka korekta',
    minus5: { label: '−5 min', aria: 'Odejmij pięć minut' },
    plus1: { label: '+1 min', aria: 'Dodaj minutę' },
    plus5: { label: '+5 min', aria: 'Dodaj pięć minut' },
    plus10: { label: '+10 min', aria: 'Dodaj dziesięć minut' },
  },

  departure: {
    time: 'Godzina docelowa',
    quickAdd: 'Szybko ustaw',
    label: 'Po co wychodzisz',
    labelPlaceholder: 'Wpisz własne',
    custom: 'Własne',
    cadence: 'Jak często przypominać',
    smart: 'Gęściej przy końcu',
    smartHint: 'Co 15 minut, potem co 5, a na ostatniej prostej co minutę',
    every: (minutes: number) => `Co ${minutes} min`,
    presets: ['Wyjście z domu', 'Spotkanie', 'Pociąg lub autobus', 'Leki', 'Gotowanie', 'Przerwa'],
    offsets: [
      { label: 'za 15 min', minutes: 15 },
      { label: 'za 30 min', minutes: 30 },
      { label: 'za 45 min', minutes: 45 },
      { label: 'za godzinę', minutes: 60 },
    ],
  },

  focus: {
    length: 'Długość sesji',
  },

  sheet: {
    title: 'Ustawienia czasu',
    tabMode: 'Ten tryb',
    tabVoice: 'Głos',
    tabDial: 'Tarcza',

    voice: 'Głos lektora',
    voiceMissing: 'Brak polskiego głosu w tym telefonie',
    speed: 'Tempo mowy',
    pitch: 'Wysokość głosu',
    volume: 'Głośność',
    style: 'Sposób mówienia',
    styleOptions: {
      natural: { label: 'Naturalnie', hint: '„za piętnaście druga"' },
      precise: { label: 'Dokładnie', hint: '„trzynasta czterdzieści pięć"' },
      short: { label: 'Krótko', hint: '„pierwsza czterdzieści pięć"' },
      elapsed: { label: 'Ile minęło', hint: '„minęło piętnaście minut"' },
    },

    chime: 'Gong przed wypowiedzią',
    chimeHint: 'Ciepły dźwięk, żeby głos nie zaskakiwał w ciszy',
    chimeTone: 'Barwa gongu',
    chimeTones: { gentle: 'Łagodna', warm: 'Ciepła', bright: 'Jasna' },
    chimeVolume: 'Głośność gongu',

    dialColor: 'Kolor tarczy',
    dialColors: {
      sage: 'Szałwia',
      amber: 'Bursztyn',
      lavender: 'Lawenda',
      rose: 'Koral',
      ocean: 'Ocean',
    },
    dialNumbers: 'Cyfry na tarczy',
    dialNumbersHint: 'Podziałka 0–55 jak w papierowym Time Timerze',
    dialDirection: 'Kierunek ubywania',
    dialDirections: {
      'counter-clockwise': 'W lewo',
      clockwise: 'W prawo',
    },

    clockSync: 'Równo z zegarem ściennym',
    clockSyncHint: 'Ogłasza o pełnych minutach, nie od momentu startu',
    keepAwake: 'Nie wygaszaj ekranu',
    keepAwakeHint: 'Przydatne, gdy telefon stoi na biurku',
  },
} as const;
