import { MicroTask } from './types';

export const MICRO_TASK_TEMPLATES: MicroTask[] = [
  // Dom & Porządek (home)
  {
    id: 't-home-1',
    title: 'Sprzątanie kuchni po gotowaniu',
    category: 'home',
    steps: [
      { id: 's-h1-1', title: 'Weź gąbkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h1-2', title: 'Zmyj blat', status: 'pending', estimatedMinutes: 2 },
      { id: 's-h1-3', title: 'Włóż naczynia do zmywarki', status: 'pending', estimatedMinutes: 3 },
      { id: 's-h1-4', title: 'Przetrzyj stół', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h1-5', title: 'Wyrzuć śmieci', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-home-2',
    title: 'Zrobienie prania od A do Z',
    category: 'home',
    steps: [
      { id: 's-h2-1', title: 'Zbierz ubrania', status: 'pending', estimatedMinutes: 2 },
      { id: 's-h2-2', title: 'Wrzuć do pralki i dodaj kapsułkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h2-3', title: 'Włącz program', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h2-4', title: 'Ustaw timer na wyjęcie', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h2-5', title: 'Rozwieś', status: 'pending', estimatedMinutes: 5 },
    ]
  },
  {
    id: 't-home-3',
    title: 'Opróżnienie zmywarki',
    category: 'home',
    steps: [
      { id: 's-h3-1', title: 'Otwórz zmywarkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h3-2', title: 'Wyjmij sztućce', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h3-3', title: 'Odłóż kubki', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h3-4', title: 'Odłóż talerze', status: 'pending', estimatedMinutes: 2 },
      { id: 's-h3-5', title: 'Zamknij zmywarkę', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-home-4',
    title: 'Porządkowanie biurka',
    category: 'home',
    steps: [
      { id: 's-h4-1', title: 'Wyrzuć 1 papierek', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h4-2', title: 'Odstaw kubek', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h4-3', title: 'Ułóż długopisy', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h4-4', title: 'Wytrzyj blat', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-home-5',
    title: 'Wyrzucenie śmieci i segregacja',
    category: 'home',
    steps: [
      { id: 's-h5-1', title: 'Zawiąż worek', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h5-2', title: 'Włóż nowy worek', status: 'pending', estimatedMinutes: 1 },
      { id: 's-h5-3', title: 'Wyniesienie do kontenera', status: 'pending', estimatedMinutes: 3 },
    ]
  },

  // Praca & Nauka (work)
  {
    id: 't-work-1',
    title: 'Rozpoczęcie trudnego maila',
    category: 'work',
    steps: [
      { id: 's-w1-1', title: 'Otwórz pocztę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w1-2', title: 'Wpisz adresata i temat', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w1-3', title: 'Napisz pierwsze zdanie powitania', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w1-4', title: 'Napisz 1 zdanie treści', status: 'pending', estimatedMinutes: 2 },
      { id: 's-w1-5', title: 'Wyślij', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-work-2',
    title: 'Opłacenie rachunku / sprawy urzędowe',
    category: 'work',
    steps: [
      { id: 's-w2-1', title: 'Otwórz aplikację banku', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w2-2', title: 'Zaloguj się', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w2-3', title: 'Wpisz kwotę i numer', status: 'pending', estimatedMinutes: 2 },
      { id: 's-w2-4', title: 'Zatwierdź', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-work-3',
    title: 'Przygotowanie prezentacji / dokumentu',
    category: 'work',
    steps: [
      { id: 's-w3-1', title: 'Otwórz pusty dokument', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w3-2', title: 'Wpisz tytuł', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w3-3', title: 'Wypunktuj 3 główne myśli', status: 'pending', estimatedMinutes: 3 },
      { id: 's-w3-4', title: 'Zapisz', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-work-4',
    title: 'Organizacja planu dnia',
    category: 'work',
    steps: [
      { id: 's-w4-1', title: 'Weź kartkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w4-2', title: 'Zapisz 1 najważniejszą rzecz', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w4-3', title: 'Zapisz 2 mniejsze', status: 'pending', estimatedMinutes: 1 },
      { id: 's-w4-4', title: 'Schowaj resztę', status: 'pending', estimatedMinutes: 1 },
    ]
  },

  // Ciało & Zdrowie (health)
  {
    id: 't-health-1',
    title: 'Zebranie się na trening / spacer',
    category: 'health',
    steps: [
      { id: 's-he1-1', title: 'Nalej wodę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he1-2', title: 'Załóż buty', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he1-3', title: 'Weź słuchawki', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he1-4', title: 'Wyjdź za drzwi', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-health-2',
    title: 'Poranny rozruch',
    category: 'health',
    steps: [
      { id: 's-he2-1', title: 'Usiądź na łóżku', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he2-2', title: 'Wypij szklankę wody', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he2-3', title: '5 głębokich oddechów', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he2-4', title: 'Wstań', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-health-3',
    title: 'Wieczorny rytuał wyciszenia',
    category: 'health',
    steps: [
      { id: 's-he3-1', title: 'Odłóż telefon na półkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he3-2', title: 'Umyj zęby', status: 'pending', estimatedMinutes: 2 },
      { id: 's-he3-3', title: 'Przewietrz sypialnię', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he3-4', title: 'Wejdź pod kołdrę', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-health-4',
    title: 'Wypicie wody i leki',
    category: 'health',
    steps: [
      { id: 's-he4-1', title: 'Weź szklankę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he4-2', title: 'Nalej wodę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he4-3', title: 'Przygotuj tabletkę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-he4-4', title: 'Połknij i popij', status: 'pending', estimatedMinutes: 1 },
    ]
  },

  // Dobrostan & Regulacja (selfcare)
  {
    id: 't-self-1',
    title: 'Przełamanie paraliżu decyzyjnego',
    category: 'selfcare',
    steps: [
      { id: 's-s1-1', title: 'Weź głęboki oddech', status: 'pending', estimatedMinutes: 1 },
      { id: 's-s1-2', title: 'Rzuć monetą lub wybierz pierwsze z brzegu', status: 'pending', estimatedMinutes: 1 },
      { id: 's-s1-3', title: 'Zrób 1 krok', status: 'pending', estimatedMinutes: 1 },
    ]
  },
  {
    id: 't-self-2',
    title: 'Reset sensoryczny (5 minut)',
    category: 'selfcare',
    steps: [
      { id: 's-s2-1', title: 'Załóż słuchawki z redukcją szumów', status: 'pending', estimatedMinutes: 1 },
      { id: 's-s2-2', title: 'Zamknij oczy', status: 'pending', estimatedMinutes: 1 },
      { id: 's-s2-3', title: 'Rozluźnij szczękę', status: 'pending', estimatedMinutes: 1 },
      { id: 's-s2-4', title: '10 spokojnych oddechów', status: 'pending', estimatedMinutes: 2 },
    ]
  }
];
