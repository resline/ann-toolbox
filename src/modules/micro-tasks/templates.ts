import { MicroTask } from './types';

export const MICRO_TASK_TEMPLATES: MicroTask[] = [
  {
    id: 't-1',
    title: 'Sprzątanie pokoju',
    description: 'Krok po kroku bez przytłoczenia.',
    steps: [
      { id: 's-1-1', title: 'Weź worek na śmieci', status: 'pending', estimatedMinutes: 1 },
      { id: 's-1-2', title: 'Wyrzuć widoczne śmieci', status: 'pending', estimatedMinutes: 2 },
      { id: 's-1-3', title: 'Odnieś naczynia do kuchni', status: 'pending', estimatedMinutes: 2 },
      { id: 's-1-4', title: 'Wrzuć ubrania z podłogi do kosza', status: 'pending', estimatedMinutes: 3 },
      { id: 's-1-5', title: 'Odłóż 3 rzeczy na swoje miejsce', status: 'pending', estimatedMinutes: 2 },
    ]
  },
  {
    id: 't-2',
    title: 'Rozpoczęcie trudnego maila',
    description: 'Najtrudniej zacząć. Zróbmy to razem.',
    steps: [
      { id: 's-2-1', title: 'Otwórz program pocztowy', status: 'pending', estimatedMinutes: 1 },
      { id: 's-2-2', title: 'Kliknij "Nowa wiadomość"', status: 'pending', estimatedMinutes: 1 },
      { id: 's-2-3', title: 'Wpisz adresata', status: 'pending', estimatedMinutes: 1 },
      { id: 's-2-4', title: 'Wpisz prosty temat', status: 'pending', estimatedMinutes: 1 },
      { id: 's-2-5', title: 'Napisz samo powitanie ("Cześć", "Dzień dobry")', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-3',
    title: 'Zebranie się na trening',
    description: 'Omijanie paraliżu wyjścia.',
    steps: [
      { id: 's-3-1', title: 'Nalej wodę do bidonu', status: 'pending', estimatedMinutes: 1 },
      { id: 's-3-2', title: 'Przygotuj ubrania sportowe', status: 'pending', estimatedMinutes: 2 },
      { id: 's-3-3', title: 'Przebierz się', status: 'pending', estimatedMinutes: 2 },
      { id: 's-3-4', title: 'Załóż buty', status: 'pending', estimatedMinutes: 1 },
      { id: 's-3-5', title: 'Wyjdź z domu', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-4',
    title: 'Praca nad projektem',
    description: 'Przełamywanie bariery startu w pracy.',
    steps: [
      { id: 's-4-1', title: 'Zamknij zbędne karty w przeglądarce', status: 'pending', estimatedMinutes: 1 },
      { id: 's-4-2', title: 'Otwórz plik/narzędzie projektu', status: 'pending', estimatedMinutes: 1 },
      { id: 's-4-3', title: 'Przejrzyj notatki z wczoraj przez 1 minutę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-4-4', title: 'Napisz pierwsze zdanie / zrób pierwszy mały krok', status: 'pending', estimatedMinutes: 2 },
    ]
  }
];
