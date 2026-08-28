import { DopamineItem } from './types';

export const DEFAULT_DOPAMINE_MENU: DopamineItem[] = [
  // Appetizers (1-5 min)
  { id: 'app-1', title: 'Szklanka chłodnej wody z cytryną', category: 'appetizer', energyRequired: 'low', durationMinutes: 1, icon: 'Droplets' },
  { id: 'app-2', title: '5 głębokich oddechów przy oknie', category: 'appetizer', energyRequired: 'low', durationMinutes: 2, icon: 'Wind' },
  { id: 'app-3', title: 'Przytulenie / pogłaskanie zwierzaka', category: 'appetizer', energyRequired: 'low', durationMinutes: 5, icon: 'Heart' },
  { id: 'app-4', title: 'Rozciąganie szyi i ramion', category: 'appetizer', energyRequired: 'low', durationMinutes: 3, icon: 'Activity' },
  { id: 'app-5', title: 'Umycie twarzy chłodną wodą', category: 'appetizer', energyRequired: 'low', durationMinutes: 2, icon: 'Sparkles' },
  { id: 'app-6', title: 'Zmiana pozycji i 10 pajacyków', category: 'appetizer', energyRequired: 'medium', durationMinutes: 1, icon: 'Zap' },

  // Entrees (20-60 min)
  { id: 'ent-1', title: 'Spacer po parku bez telefonu', category: 'entree', energyRequired: 'medium', durationMinutes: 45, icon: 'TreePine' },
  { id: 'ent-2', title: 'Kąpiel z olejkami / relaksujący prysznic', category: 'entree', energyRequired: 'low', durationMinutes: 30, icon: 'Bath' },
  { id: 'ent-3', title: 'Twórcze rysowanie / kolorowanka', category: 'entree', energyRequired: 'low', durationMinutes: 40, icon: 'Palette' },
  { id: 'ent-4', title: 'Joga lub lekki stretching', category: 'entree', energyRequired: 'medium', durationMinutes: 25, icon: 'Activity' },
  { id: 'ent-5', title: 'Gotowanie ulubionego dania z muzyką', category: 'entree', energyRequired: 'high', durationMinutes: 60, icon: 'ChefHat' },
  { id: 'ent-6', title: 'Czytanie wciągającej książki pod kocem', category: 'entree', energyRequired: 'low', durationMinutes: 45, icon: 'BookOpen' },

  // Sides (w tle)
  { id: 'sd-1', title: 'Ulubiona energetyczna playlista', category: 'side', energyRequired: 'low', icon: 'Music' },
  { id: 'sd-2', title: 'Włączenie świecy zapachowej / dyfuzora', category: 'side', energyRequired: 'low', icon: 'Flame' },
  { id: 'sd-3', title: 'Podcast / audiobook podczas sprzątania', category: 'side', energyRequired: 'low', icon: 'Headphones' },
  { id: 'sd-4', title: 'Czyste miękkie skarpetki i wygodne ubranie', category: 'side', energyRequired: 'low', icon: 'Shirt' },
  { id: 'sd-5', title: 'Praca z lampką o ciepłym świetle', category: 'side', energyRequired: 'low', icon: 'Sun' },

  // Desserts (uważne nagrody)
  { id: 'des-1', title: '15 minut przeglądania rolek / social media z budzikiem', category: 'dessert', energyRequired: 'low', durationMinutes: 15, icon: 'Smartphone' },
  { id: 'des-2', title: 'Odcinek ulubionego serialu', category: 'dessert', energyRequired: 'low', durationMinutes: 45, icon: 'Tv' },
  { id: 'des-3', title: 'Kawałeczek ulubionej czekolady jedzony w skupieniu', category: 'dessert', energyRequired: 'low', durationMinutes: 5, icon: 'Cookie' },
  { id: 'des-4', title: 'Gra na telefonie z limitem czasowym', category: 'dessert', energyRequired: 'low', durationMinutes: 20, icon: 'Gamepad2' },

  // Specials (dania specjalne)
  { id: 'sp-1', title: 'Wyjście do teatru lub kina', category: 'special', energyRequired: 'high', durationMinutes: 150, icon: 'Ticket' },
  { id: 'sp-2', title: 'Wizyta w ulubionej kawiarni z ciastkiem', category: 'special', energyRequired: 'medium', durationMinutes: 60, icon: 'Coffee' },
  { id: 'sp-3', title: 'Weekendowy wypad za miasto', category: 'special', energyRequired: 'high', durationMinutes: 2880, icon: 'Map' },
  { id: 'sp-4', title: 'Spotkanie z bliską przyjaciółką', category: 'special', energyRequired: 'medium', durationMinutes: 120, icon: 'Users' }
];
