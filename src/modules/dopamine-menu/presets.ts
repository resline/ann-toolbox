import { DopamineItem } from './types';

export const DEFAULT_DOPAMINE_MENU: DopamineItem[] = [
  // Przystawki (szybkie, mało energii)
  { id: 'd-1', title: 'Wypij szklankę wody', category: 'appetizer', energyRequired: 'low', durationMinutes: 1, icon: 'Droplets' },
  { id: 'd-2', title: 'Rozciągnij się', category: 'appetizer', energyRequired: 'low', durationMinutes: 2, icon: 'Activity' },
  { id: 'd-3', title: 'Pogłaskaj zwierzaka', category: 'appetizer', energyRequired: 'low', durationMinutes: 5, icon: 'Heart' },
  { id: 'd-4', title: 'Umyj twarz zimną wodą', category: 'appetizer', energyRequired: 'low', durationMinutes: 2, icon: 'Sparkles' },
  
  // Dania Główne (wymagają więcej czasu/energii, dają dużo satysfakcji)
  { id: 'd-5', title: 'Spacer z podcastem', category: 'entree', energyRequired: 'medium', durationMinutes: 30, icon: 'Headphones' },
  { id: 'd-6', title: 'Kreatywne hobby', description: 'Rysowanie, pisanie, szydełkowanie', category: 'entree', energyRequired: 'high', durationMinutes: 45, icon: 'Palette' },
  { id: 'd-7', title: 'Czytanie wciągającej książki', category: 'entree', energyRequired: 'medium', durationMinutes: 30, icon: 'BookOpen' },

  // Dodatki (można łączyć z czymś innym)
  { id: 'd-8', title: 'Słuchanie ulubionej playlisty', category: 'side', energyRequired: 'low', icon: 'Music' },
  { id: 'd-9', title: 'Zapalenie ładnej świeczki', category: 'side', energyRequired: 'low', icon: 'Flame' },
  { id: 'd-10', title: 'Otwarcie okna dla świeżego powietrza', category: 'side', energyRequired: 'low', icon: 'Wind' },

  // Desery (guilty pleasures w małych dawkach)
  { id: 'd-11', title: 'Odcinek ulubionego serialu', category: 'dessert', energyRequired: 'low', durationMinutes: 25, icon: 'Tv' },
  { id: 'd-12', title: 'Scrollowanie social mediów', category: 'dessert', energyRequired: 'low', durationMinutes: 15, icon: 'Smartphone' },
  { id: 'd-13', title: 'Ulubiona słodka przekąska', category: 'dessert', energyRequired: 'low', icon: 'Cookie' },

  // Specjalne (gdy nic innego nie działa)
  { id: 'd-14', title: 'Krótka drzemka', category: 'special', energyRequired: 'low', durationMinutes: 20, icon: 'Moon' },
  { id: 'd-15', title: 'Reset sensoryczny', description: 'Leżenie w ciemnym, cichym pokoju', category: 'special', energyRequired: 'low', durationMinutes: 15, icon: 'EyeOff' }
];
