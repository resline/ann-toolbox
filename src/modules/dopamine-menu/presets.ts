import { DopamineItem } from './types';

/**
 * Startowa karta dań.
 *
 * Dwie zasady, które trzymają ten plik w ryzach:
 *
 * 1. `title` jest krótki, bo trafia na wycinek koła i na kartę — długość mierzy
 *    `wrapRadial` z wheel.ts, nie oko. Wszystko, co nie mieści się w nazwie,
 *    idzie do `description`.
 * 2. `description` mówi rzecz, której nie widać na karcie — po co to robić.
 *    Bez niej arkusz szczegółów powtarzałby tylko tytuł i dwie plakietki.
 *
 * Identyfikatory zostają na zawsze: po nich chodzi historia w banku iskierek
 * i zapis w localStorage.
 */
export const DEFAULT_DOPAMINE_MENU: DopamineItem[] = [
  // Przystawki (1–5 min)
  {
    id: 'app-1',
    title: 'Szklanka chłodnej wody z cytryną',
    description: 'Zimno na języku budzi ciało szybciej niż kawa i nic nie kosztuje.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 1,
    icon: 'Droplets',
  },
  {
    id: 'app-2',
    title: '5 głębokich oddechów przy oknie',
    description: 'Wydech dłuższy od wdechu. Pięć razy — i układ nerwowy schodzi o pół tonu niżej.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 2,
    icon: 'Wind',
  },
  {
    id: 'app-3',
    title: 'Przytulenie zwierzaka',
    description: 'Albo drugiego człowieka. Dotyk futra robi z napięciem to, czego nie zrobi żadna lista zadań.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 5,
    icon: 'Heart',
  },
  {
    id: 'app-4',
    title: 'Rozciąganie szyi i ramion',
    description: 'Tam siada napięcie z siedzenia przy biurku. Powoli, bez szarpania.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 3,
    icon: 'Activity',
  },
  {
    id: 'app-5',
    title: 'Umycie twarzy chłodną wodą',
    description: 'Reset dla zmęczonych oczu — działa nawet w środku najgorszego popołudnia.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 2,
    icon: 'Sparkles',
  },
  {
    id: 'app-6',
    title: 'Zmiana pozycji i 10 pajacyków',
    description: 'Najpierw ruch, potem motywacja. W tej kolejności to działa.',
    category: 'appetizer',
    energyRequired: 'medium',
    durationMinutes: 1,
    icon: 'Zap',
  },

  // Dania główne (20–60 min)
  {
    id: 'ent-1',
    title: 'Spacer po parku bez telefonu',
    description: 'Bez podcastu, bez rozmowy. Głowa układa sobie rzeczy sama, kiedy oczy patrzą w zieleń.',
    category: 'entree',
    energyRequired: 'medium',
    durationMinutes: 45,
    icon: 'TreePine',
  },
  {
    id: 'ent-2',
    title: 'Kąpiel z olejkami',
    description: 'Albo długi ciepły prysznic — cokolwiek, co daje ciału sygnał, że można odpuścić.',
    category: 'entree',
    energyRequired: 'low',
    durationMinutes: 30,
    icon: 'Bath',
  },
  {
    id: 'ent-3',
    title: 'Rysowanie albo kolorowanka',
    description: 'Nie musi być ładne. Chodzi o ręce zajęte czymś, co nie ma terminu.',
    category: 'entree',
    energyRequired: 'low',
    durationMinutes: 40,
    icon: 'Palette',
  },
  {
    id: 'ent-4',
    title: 'Joga lub lekki stretching',
    description: 'Dwadzieścia pięć minut, mata i nic więcej. Ciało pamięta, jak to się robi.',
    category: 'entree',
    energyRequired: 'medium',
    durationMinutes: 25,
    icon: 'Activity',
  },
  {
    id: 'ent-5',
    title: 'Gotowanie z muzyką',
    description: 'Ulubione danie, krojenie, zapach i głośna muzyka — kuchnia jest tu ważniejsza niż wynik.',
    category: 'entree',
    energyRequired: 'high',
    durationMinutes: 60,
    icon: 'ChefHat',
  },
  {
    id: 'ent-6',
    title: 'Książka pod kocem',
    description: 'Ta wciągająca, nie ta, którą trzeba przeczytać. Koc obowiązkowy.',
    category: 'entree',
    energyRequired: 'low',
    durationMinutes: 45,
    icon: 'BookOpen',
  },

  // Dodatki (dzieją się w tle)
  {
    id: 'sd-1',
    title: 'Energetyczna playlista',
    description: 'Ta jedna, przy której nogi same chodzą. Włącz ją, zanim zaczniesz cokolwiek innego.',
    category: 'side',
    energyRequired: 'low',
    icon: 'Music',
  },
  {
    id: 'sd-2',
    title: 'Świeca zapachowa',
    description: 'Zapach zmienia pokój szybciej niż sprzątanie. Dyfuzor działa tak samo.',
    category: 'side',
    energyRequired: 'low',
    icon: 'Flame',
  },
  {
    id: 'sd-3',
    title: 'Podcast do sprzątania',
    description: 'Sprzątanie przestaje być sprzątaniem, kiedy ktoś opowiada ci przy tym historię.',
    category: 'side',
    energyRequired: 'low',
    icon: 'Headphones',
  },
  {
    id: 'sd-4',
    title: 'Miękkie skarpetki',
    description: 'Czyste, suche, wygodne ubranie. Ciało przestaje wysyłać drobne sygnały dyskomfortu.',
    category: 'side',
    energyRequired: 'low',
    icon: 'Shirt',
  },
  {
    id: 'sd-5',
    title: 'Lampka o ciepłym świetle',
    description: 'Ciepłe światło zamiast górnego jarzeniowego — oczy męczą się o połowę wolniej.',
    category: 'side',
    energyRequired: 'low',
    icon: 'Sun',
  },

  // Desery (nagrody brane świadomie)
  {
    id: 'des-1',
    title: 'Rolki z budzikiem',
    description: 'Piętnaście minut przewijania z nastawionym budzikiem, żeby wiedzieć, kiedy koniec.',
    category: 'dessert',
    energyRequired: 'low',
    durationMinutes: 15,
    icon: 'Smartphone',
  },
  {
    id: 'des-2',
    title: 'Odcinek serialu',
    description: 'Jeden odcinek ulubionego serialu, wybrany świadomie. To nagroda, nie ucieczka.',
    category: 'dessert',
    energyRequired: 'low',
    durationMinutes: 45,
    icon: 'Tv',
  },
  {
    id: 'des-3',
    title: 'Kawałek czekolady',
    description: 'Zjedzony powoli, w skupieniu — smakuje kilka razy bardziej niż zjedzony w biegu.',
    category: 'dessert',
    energyRequired: 'low',
    durationMinutes: 5,
    icon: 'Cookie',
  },
  {
    id: 'des-4',
    title: 'Gra na telefonie',
    description: 'Z ustawionym limitem czasu. Dwadzieścia minut i wychodzisz z gry.',
    category: 'dessert',
    energyRequired: 'low',
    durationMinutes: 20,
    icon: 'Gamepad2',
  },

  // Dania specjalne
  {
    id: 'sp-1',
    title: 'Wyjście do kina',
    description: 'Albo do teatru. Dwie i pół godziny w cudzej historii, a bilet kupiony wcześniej działa jak zobowiązanie.',
    category: 'special',
    energyRequired: 'high',
    durationMinutes: 150,
    icon: 'Ticket',
  },
  {
    id: 'sp-2',
    title: 'Kawiarnia z ciastkiem',
    description: 'Ta ulubiona. Stolik przy oknie, ciastko i godzina bez żadnego zadania.',
    category: 'special',
    energyRequired: 'medium',
    durationMinutes: 60,
    icon: 'Coffee',
  },
  {
    id: 'sp-3',
    title: 'Wypad za miasto',
    description: 'Dwa dni gdzie indziej. Zmiana tła robi z głową to, czego nie zrobi weekend w domu.',
    category: 'special',
    energyRequired: 'high',
    durationMinutes: 2880,
    icon: 'Map',
  },
  {
    id: 'sp-4',
    title: 'Spotkanie z przyjaciółką',
    description: 'Ta bliska osoba, przy której nie trzeba udawać, że wszystko jest ogarnięte.',
    category: 'special',
    energyRequired: 'medium',
    durationMinutes: 120,
    icon: 'Users',
  },
];
