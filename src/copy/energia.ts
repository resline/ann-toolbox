import { plCount, plWith } from './plural';

/**
 * Moduł Energia — menu aktywności, po które sięga się, kiedy bak jest pusty.
 *
 * Metafora karty dań zostaje: przystawka to coś na pięć minut, danie główne
 * wymaga godziny. Dzięki niej nazwa kategorii mówi o koszcie wejścia,
 * a nie o rodzaju czynności.
 */
export const energia = {
  title: 'Energia',

  /** Nazwy kategorii — karta dań, nie taksonomia. */
  category: {
    appetizer: { title: 'Przystawki', hint: 'od minuty do pięciu' },
    entree: { title: 'Dania główne', hint: 'od dwudziestu minut do godziny' },
    side: { title: 'Dodatki', hint: 'dzieją się w tle, nic nie kosztują' },
    dessert: { title: 'Desery', hint: 'nagroda wzięta świadomie' },
    special: { title: 'Dania specjalne', hint: 'na dzień, który ma być inny' },
  },

  /** Poziom energii — słowem, nie liczbą błyskawic. */
  energy: {
    low: { label: 'Niska', badge: 'Niska energia' },
    medium: { label: 'Średnia', badge: 'Średnia energia' },
    high: { label: 'Wysoka', badge: 'Wysoka energia' },
  },

  filter: {
    label: 'Filtr poziomu energii',
    all: 'Wszystkie',
    emptyTitle: 'Przy tym poziomie energii nic tu nie ma',
    emptyBody: 'Zdejmij filtr albo dopisz coś własnego do menu.',
  },

  bank: {
    label: 'Zebrane dziś',
    unit: (count: number) => `${plCount(count, ['iskierka', 'iskierki', 'iskierek'])} dopaminy`,
    summary: (count: number) =>
      count === 0
        ? 'Dzisiaj nie masz jeszcze ani jednej iskierki dopaminy'
        : `Dzisiaj zebrałaś ${plWith(count, ['iskierkę', 'iskierki', 'iskierek'])} dopaminy`,
    first: 'Pierwsza iskierka czeka',
    expand: 'Pokaż, co dzisiaj zebrałaś',
    collapse: 'Zwiń dzisiejszą listę',
    clear: 'Wyczyść dzisiejsze iskierki',
    clearTitle: 'Wyczyścić dzisiejsze iskierki?',
    clearBody: 'Licznik wróci do zera. Same aktywności zostają w menu.',
  },

  action: {
    sos: 'Utknęłam',
    roll: 'Zakręć kołem',
    addItem: 'Dodaj do menu',
    favorite: 'Dodaj do ulubionych',
    unfavorite: 'Wyjmij z ulubionych',
    more: 'Więcej opcji',
    done: 'Gotowe',
  },

  card: {
    open: (title: string) => `Otwórz szczegóły: ${title}`,
    duration: (minutes: number) => {
      if (minutes < 60) return `${minutes} min`;
      if (minutes >= 1440) return plWith(Math.round(minutes / 1440), ['dzień', 'dni', 'dni']);
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      const hoursText = plWith(hours, ['godzina', 'godziny', 'godzin']);
      return rest === 0 ? hoursText : `${hoursText} ${rest} min`;
    },
  },

  detail: {
    durationLabel: 'Ile to zajmie',
    durationUnknown: 'Tyle, ile zechcesz',
    energyLabel: 'Poziom energii',
    categoryLabel: 'W karcie dań',
    countLabel: 'Zrobione do tej pory',
    countValue: (count: number) => plWith(count, ['raz', 'razy', 'razy']),
    lastLabel: 'Ostatni raz',
    lastToday: (time: string) => `dzisiaj o ${time}`,
    lastNever: 'jeszcze ani razu',
    noDescription: 'Bez opisu — ta pozycja mówi sama za siebie.',
  },

  roulette: {
    title: 'Koło energii',
    hint: 'Osiem propozycji z menu. Wylosowana zostaje twoja.',
    spin: 'Zakręć',
    spinning: 'Kręci się…',
    again: 'Kręć jeszcze raz',
    accept: 'Biorę to',
    resultLabel: 'Wylosowane',
    wheelLabel: 'Koło z ośmioma propozycjami',
    emptyTitle: 'Nie ma czym zakręcić',
    emptyBody: 'Przy tym filtrze menu jest puste. Zdejmij filtr i spróbuj jeszcze raz.',
  },

  sos: {
    title: 'Utknęłam',
    lead: 'Jeden mały krok. Tyle wystarczy, żeby ruszyć.',
    next: 'Inna prosta rzecz',
    done: 'Zrobione',
    steps: [
      'Wypij trzy łyki chłodnej wody',
      'Popatrz przez okno w dal przez pół minuty',
      'Przeciągnij się powoli, jak kot',
      'Weź trzy głębokie wdechy i wydechy',
      'Umyj twarz zimną wodą',
      'Zrób pięć pajacyków',
      'Przejdź się po pokoju przez minutę',
    ],
  },

  form: {
    addTitle: 'Nowa pozycja w menu',
    addLead: 'Coś, co realnie podnosi ci energię.',
    editTitle: 'Zmień pozycję',
    nameLabel: 'Nazwa',
    namePlaceholder: 'Na przykład: szklanka zimnej wody',
    descriptionLabel: 'Opis',
    descriptionHint: 'Nieobowiązkowy — przyda się, gdy zapomnisz, o co chodziło',
    energyLabel: 'Ile energii to wymaga',
    categoryLabel: 'Gdzie w karcie dań',
    durationLabel: 'Ile minut',
    durationHint: 'Zostaw puste, jeśli to zależy',
    submitAdd: 'Dopisz do menu',
    submitEdit: 'Zapisz zmiany',
  },

  remove: {
    title: 'Usunąć z menu?',
    body: (title: string) => `„${title}” zniknie z karty dań. Nie da się tego cofnąć.`,
    confirm: 'Usuń z menu',
  },

  empty: {
    menuTitle: 'Menu jest puste',
    menuBody: 'Dopisz pierwszą pozycję — coś małego, co da się zrobić dzisiaj.',
  },
} as const;
