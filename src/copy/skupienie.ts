/**
 * Moduł Skupienie — fazowana sesja pracy, oddech i dźwięk tła.
 *
 * Cały tekst modułu jest tutaj. W JSX nie ma ani jednego polskiego napisu,
 * dzięki czemu testy widoku nie mogą przypadkiem przejść dla interfejsu po
 * angielsku — a tak właśnie wyglądał ten moduł do tej pory.
 */
export const skupienie = {
  title: 'Skupienie',
  lead: 'Najpierw wybierz, jak długo. Resztę poprowadzi licznik.',

  mode: {
    label: 'Tryb',
    session: 'Sesja',
    breathing: 'Oddech',
  },

  preset: {
    title: 'Jak długo dzisiaj',
    /** Mikroetykieta nad dużą liczbą na karcie presetu. */
    flowLabel: 'min skupienia',
    breakdown: (warmup: number, flow: number, cooldown: number) =>
      `${warmup} min rozgrzewki · ${flow} min skupienia · ${cooldown} min wyciszenia`,
    total: (minutes: number) => `${minutes} min razem`,
    /** Nazwa dostępna przycisku startu — presetów są dwa, więc sama „Zacznij" nie wystarcza. */
    startNamed: (title: string) => `Zacznij: ${title}`,
  },

  phase: {
    warmup: 'Rozgrzewka',
    flow: 'Skupienie',
    cooldown: 'Wyciszenie',
  },

  /** Jedno zdanie na fazę — mówi, czego się teraz od siebie oczekuje. */
  phaseHint: {
    warmup: 'Rozłóż rzeczy i usiądź. Nic jeszcze nie musi wyjść.',
    flow: 'Jedna rzecz naraz. Reszta poczeka do końca bloku.',
    cooldown: 'Zwolnij i zapisz, w którym miejscu skończyłaś.',
  },

  action: {
    start: 'Zacznij',
    pause: 'Pauza',
    resume: 'Wróć',
    stop: 'Zatrzymaj',
    skip: 'Dalej',
    openSettings: 'Ustawienia skupienia',
  },

  state: {
    running: 'Sesja trwa',
    paused: 'Wstrzymane',
  },

  disc: {
    progressLabel: (phase: string) => `Postęp fazy: ${phase}`,
    ofTotal: (minutes: number) => `z ${minutes} min`,
  },

  timeline: {
    label: 'Plan sesji',
    minutes: (minutes: number) => `${minutes} min`,
  },

  empty: {
    title: 'Nic nie jest ustawione',
    description: 'Wybierz jeden z dwóch bloków. Zawsze można przerwać.',
  },

  breathing: {
    techniqueLabel: 'Technika oddechu',
    technique: {
      box: { name: 'Kwadrat', rhythm: '4 · 4 · 4 · 4' },
      relax: { name: 'Uspokajający', rhythm: '4 · 7 · 8' },
      flow: { name: 'Fala', rhythm: '4 · 6' },
    },
    phase: {
      inhale: 'Wdech',
      hold: 'Zatrzymaj',
      exhale: 'Wydech',
      rest: 'Spokój',
    },
    idle: 'Wybierz technikę i zacznij, kiedy będziesz gotowa.',
    start: 'Zacznij oddech',
    pause: 'Wstrzymaj oddech',
    seconds: 'sek',
    /** Przy ograniczonym ruchu okręgi się nie skalują — zostaje nazwa fazy i licznik. */
    countLabel: (phase: string) => `Faza oddechu: ${phase}`,
  },

  ambience: {
    title: 'Tło dźwiękowe',
    sound: {
      rain: 'Deszcz',
      brown: 'Szum brązowy',
      pink: 'Szum różowy',
    },
    silence: 'Cisza',
    volume: 'Głośność tła',
    volumeValue: (percent: number) => `${percent} procent`,
    unsupported: 'Ta przeglądarka nie odtworzy dźwięku tła. Reszta modułu działa normalnie.',
    hint: 'Dźwięk milknie, kiedy odłożysz telefon albo przejdziesz do innej karty.',
  },

  sheet: {
    title: 'Ustawienia skupienia',
    description: 'Preset można zmienić także w trakcie — sesja zacznie się wtedy od nowa.',
    presetSection: 'Blok pracy',
    soundSection: 'Dźwięk',
    autoSound: 'Dźwięk tła razem ze startem',
    autoSoundHint: 'Każdy blok ma przypisany własny szum. Domyślnie jest cicho.',
  },
} as const;
