/**
 * Moduł Start — rozbijanie zadania na kroki poniżej dwóch minut.
 *
 * Cały tekst tego modułu siedzi tutaj, także drabinki podpowiadanych kroków:
 * to są napisy widoczne na ekranie, więc podlegają tym samym regułom co reszta
 * (rodzaj żeński, polskie diakrytyki, zero angielszczyzny).
 */
import { plWith, type PluralForms } from './plural';

const KROK: PluralForms = ['krok', 'kroki', 'kroków'];

export const start = {
  title: 'Start',
  lead: 'Rozbij to, co stoi w miejscu, na kroki krótsze niż dwie minuty. Potem zrób tylko pierwszy.',

  /** Liczebniki — jedno miejsce na całą odmianę modułu. */
  count: {
    steps: (n: number) => plWith(n, KROK),
  },

  home: {
    catalog: 'Katalog zadań',
    quickHint: 'Kilka zestawów pod ręką. Reszta czeka w katalogu.',
    mine: 'Moje zestawy',
    quick: 'Na dobry początek',
    own: 'Rozbij własne zadanie',
    history: 'Ukończone zadania',

    /** Zadania odłożone w połowie — czekają w całości, razem z krokami. */
    parked: 'Odłożone zadania',
    parkedHint: 'Wracają w całości, z krokami, które wpisałaś. Zacznij, kiedy będziesz gotowa.',
    parkedDiscard: (title: string) => `Wyrzuć odłożone zadanie: ${title}`,
    parkedDiscardTitle: 'Wyrzucić to zadanie?',
    parkedDiscardBody: 'Zniknie razem z krokami, które wpisałaś. Tego nie da się cofnąć.',

    templateDelete: (title: string) => `Usuń zestaw: ${title}`,
    templateDeleteTitle: 'Usunąć ten zestaw?',
    templateDeleteBody: 'Zestaw zniknie z listy „Moje zestawy”. Zadania w toku to nie dotyczy.',
  },

  focus: {
    heading: 'Teraz robisz',
    stepOf: (n: number, total: number) => `Krok ${n} z ${total}`,
    progress: 'Postęp zadania',
    done: 'Zrobione, dalej',
    last: 'Zrobione, to był ostatni krok',
    skip: 'Pomiń ten krok',
    showList: 'Cała lista',
    addStep: 'Dopisz krok na koniec',
    addStepLabel: 'Treść nowego kroku',
    addStepHint: 'Nowy krok stanie na końcu listy.',
    saveTemplate: 'Zapisz jako mój zestaw',
    saveTemplateDone: 'Ten zestaw masz już zapisany',
    saved: 'Zapisane w moich zestawach',
    savedDescription: 'Zapisane z zadania w toku',
  },

  timer: {
    label: 'Odliczanie oporu',
    hint: 'Włącz i po prostu zacznij. Tyle wystarczy.',
    over: 'Opór pokonany. Idź dalej albo odlicz jeszcze raz.',
    play: 'Włącz odliczanie',
    pause: 'Wstrzymaj odliczanie',
    again: 'Odlicz jeszcze raz',
  },

  list: {
    progress: (done: number, total: number) => `${done} z ${total} zrobione`,
    focusView: 'Widok skupienia',
    markDone: 'Odhacz ten krok',
    statusSkipped: 'Pominięte',
    statusNow: 'Teraz',
    abandon: 'Odłóż zadanie',
    abandonTitle: 'Odłożyć to zadanie?',
    abandonBody: 'Kroki wrócą do stanu wyjściowego. Zaczniesz je od nowa, kiedy będziesz gotowa.',
    abandonConfirm: 'Odłóż',
  },

  decomposer: {
    title: 'Nowe zadanie',
    stepOf: (n: number, total: number) => `Ekran ${n} z ${total}`,

    what: {
      hint: 'Jedno pytanie na raz.',
      label: 'Co masz do zrobienia?',
      placeholder: 'np. Posprzątać kuchnię',
    },

    resistance: {
      hint: 'Im większy opór, tym drobniejsze kroki.',
      label: 'Jak duży opór czujesz przed tym zadaniem?',
      levels: {
        1: { name: 'Lekki opór', hint: 'Wystarczą bloki po 5–10 minut.' },
        2: { name: 'Niewielka niechęć', hint: 'Kroki po 3–5 minut, żeby nie tracić rozpędu.' },
        3: { name: 'Umiarkowany opór', hint: 'Konkretne akcje po 1–3 minuty.' },
        4: { name: 'Duża blokada', hint: 'Każdy krok to najwyżej minuta bez wysiłku.' },
        5: { name: 'Totalny paraliż', hint: 'Mikroskopijne ruchy po kilkanaście sekund. Cel: ruszyć.' },
      },
    },

    steps: {
      hint: 'Dopisuj po jednym. Enter dodaje kolejny.',
      label: 'Kolejny krok',
      placeholder: 'Najprostsza rzecz, jaką możesz teraz zrobić',
      add: 'Dodaj krok',
      edit: (n: number) => `Krok ${n}`,
      editHint: 'Każdy krok możesz przepisać na swoje słowa.',
      remove: (n: number) => `Usuń krok ${n}`,
      empty: 'Jeszcze żadnego kroku',
      emptyHint: 'Wpisz pierwszy krok albo poproś o podpowiedź.',
      suggest: 'Podpowiedz kroki',
      suggestHint: 'Podpowiedzi dopisują się na końcu. Nic z wpisanego nie znika.',
      begin: 'Zacznij',
    },

    /** Drabinki podpowiedzi — dobierane poziomem oporu. */
    ladder: {
      1: ['Zaplanuj, co po kolei', 'Zrób pierwszy etap', 'Zrób drugi etap', 'Sprawdź i zamknij temat'],
      2: ['Przygotuj miejsce', 'Zrób najprostszy fragment', 'Zrób następny fragment', 'Odłóż rzeczy na miejsce'],
      3: [
        'Przygotuj miejsce pracy',
        'Włącz odliczanie na dwie minuty',
        'Zrób pierwszą, najprostszą rzecz',
        'Oceń, ile już ubyło',
        'Dokończ mały fragment',
      ],
      4: [
        'Wstań z miejsca',
        'Podejdź tam, gdzie leży zadanie',
        'Weź do ręki pierwszą rzecz',
        'Zrób jeden ruch i odetchnij',
        'Zrób drugi ruch',
      ],
      5: [
        'Stań przed zadaniem',
        'Dotknij pierwszej rzeczy',
        'Popracuj piętnaście sekund',
        'Odetchnij i popracuj kolejne piętnaście',
        'Zdecyduj, czy idziesz dalej',
      ],
    },
  },

  catalog: {
    title: 'Katalog zadań',
    search: 'Szukaj w katalogu',
    searchPlaceholder: 'np. kuchnia, mail, spacer',
    filters: {
      all: 'Wszystkie',
      home: 'Dom',
      work: 'Praca',
      health: 'Zdrowie',
      selfcare: 'Dobrostan',
      mine: 'Moje zestawy',
    },
    run: 'Zacznij',
    mineBadge: 'Mój zestaw',
    emptyTitle: 'Nic tu nie pasuje',
    emptyHint: 'Zmień wpisane słowo albo wróć do wszystkich kategorii.',
  },

  history: {
    title: 'Ukończone zadania',
    countLabel: 'Zamknięte zadania',
    praise: 'Tyle zadań doprowadziłaś do końca, krok po kroku.',
    entrySteps: (n: number) => `${plWith(n, KROK)} do końca`,
    emptyTitle: 'Jeszcze pusto',
    emptyHint: 'Pierwsze ukończone zadanie pojawi się tutaj.',
  },

  celebration: {
    title: 'Gratulacje!',
    message: 'Zrobiłaś to krok po kroku. Opór przegrał.',
  },
} as const;
