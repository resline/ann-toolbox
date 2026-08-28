/** Marka i powłoka. */
export const app = {
  name: 'Przystań',
  tagline: 'Zatrzymaj się na chwilę',
  description:
    'Spokojne miejsce na czas, skupienie, energię i pierwszy krok. Działa bez internetu, wszystko zostaje na tym telefonie.',

  install: {
    title: 'Miej Przystań pod ręką',
    body: 'Otworzy się na pełnym ekranie i zadziała bez internetu.',
    confirm: 'Dodaj do ekranu',
    dismiss: 'Nie teraz',
  },

  settings: {
    title: 'Ustawienia',
    appearance: 'Wygląd',
    appearanceHint: 'Motyw dobierz do pory dnia i do tego, jak reagują Twoje oczy.',
    motion: 'Ruch',
    motionHint: 'Jeśli animacje rozpraszają, wyłącz je tutaj — niezależnie od ustawień telefonu.',
    motionAuto: 'Jak w telefonie',
    motionAutoHint: 'Podąża za systemowym ograniczeniem animacji',
    motionReduced: 'Bez animacji',
    motionReducedHint: 'Wszystko pojawia się od razu',
    motionFull: 'Pełny ruch',
    motionFullHint: 'Przejścia i gesty tak jak zaprojektowano',
    about: 'O aplikacji',
    offline: 'Działa bez internetu',
    privacy: 'Nic nie wychodzi z tego telefonu',
    version: 'Wersja',
  },

  nav: {
    label: 'Główna nawigacja',
    openSettings: 'Otwórz ustawienia',
    backHome: 'Wróć na ekran główny',
  },
} as const;
