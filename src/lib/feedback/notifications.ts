/**
 * Powiadomienia — kanał zapasowy, kiedy dźwięk nie dojdzie.
 *
 * Telefon bywa wyciszony, a aplikacja schowana w tle: wtedy gong nie ma jak
 * zadziałać, a wibracja z zablokowanego ekranu też nie zawsze przechodzi.
 * Powiadomienie systemowe jest ostatnią linią, po którą sięgamy.
 *
 * Zasada, od której nie ma odstępstwa: o ZGODĘ pytamy wyłącznie w reakcji na
 * świadomy gest użytkowniczki (włączenie przełącznika w ustawieniach). Nigdy
 * przy starcie aplikacji ani przy wejściu do modułu — okno zgody, którego nikt
 * nie prosił, kończy się odmową na zawsze, a odmowy nie da się cofnąć z kodu.
 *
 * Teksty przychodzą z zewnątrz, jako argumenty. Warstwa napisów mieszka
 * w src/copy/* i to ona, a nie ten plik, decyduje, co użytkowniczka przeczyta.
 */

/** Stan zgody rozszerzony o „przeglądarka tego nie umie". */
export type NotificationAvailability = 'unsupported' | 'default' | 'granted' | 'denied';

/** Ikona z manifestu PWA — ten sam znak, który użytkowniczka ma na ekranie głównym. */
export const NOTIFICATION_ICON_PATH = '/icons/icon-192.png';

export interface AppNotificationContent {
  /** Pierwsza linia. Wymagana — powiadomienie bez tytułu jest niewidoczne. */
  title: string;
  body?: string;
  /**
   * Etykieta zastępowania: powiadomienie z tym samym `tag` podmienia poprzednie,
   * zamiast układać stos. Dzięki temu odliczanie nie zasypuje paska stanu.
   */
  tag?: string;
  /** Bez dźwięku systemowego — gdy sygnał dźwiękowy dała już sama aplikacja. */
  silent?: boolean;
  /** Zostaje na ekranie do dotknięcia. Tylko dla rzeczy, które naprawdę czekają. */
  requireInteraction?: boolean;
}

/** Czy przeglądarka w ogóle zna Notification API. */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function resolveNotificationApi(): typeof Notification | null {
  if (!isNotificationSupported()) return null;
  const api = (window as unknown as { Notification?: typeof Notification }).Notification;
  return typeof api === 'function' ? api : null;
}

/** Stan zgody bez proszenia o nią. Wolno wywołać kiedykolwiek. */
export function getNotificationPermission(): NotificationAvailability {
  const api = resolveNotificationApi();
  if (!api) return 'unsupported';
  const permission = api.permission;
  return permission === 'granted' || permission === 'denied' ? permission : 'default';
}

/** Skrót dla warstwy widoku: czy powiadomienie ma teraz szansę dojść. */
export function canSendNotifications(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * Prosi o zgodę. WYWOŁUJ WYŁĄCZNIE Z OBSŁUGI GESTU (kliknięcie przełącznika).
 *
 * Gdy zgoda już jest albo już padła odmowa, nie pytamy drugi raz — przeglądarki
 * i tak wtedy milczą, a my nie chcemy udawać, że użytkowniczka ma wybór.
 */
export async function requestNotificationPermission(): Promise<NotificationAvailability> {
  const api = resolveNotificationApi();
  if (!api) return 'unsupported';

  const current = getNotificationPermission();
  if (current !== 'default') return current;

  try {
    // Starsze Safari zna wyłącznie wariant z wywołaniem zwrotnym i zwraca
    // undefined zamiast obietnicy — stąd rozgałęzienie zamiast samego await.
    const result = api.requestPermission((permission) => permission);
    const permission = result && typeof result.then === 'function' ? await result : undefined;
    if (permission === 'granted' || permission === 'denied' || permission === 'default') {
      return permission;
    }
    return getNotificationPermission();
  } catch {
    // Odmowa na poziomie przeglądarki albo wywołanie poza gestem.
    return getNotificationPermission();
  }
}

/**
 * Rejestracja service workera, jeśli jakaś jest.
 *
 * Android Chrome nie pozwala tworzyć powiadomień konstruktorem, kiedy strona ma
 * service workera — jedyną działającą drogą jest wtedy showNotification na jego
 * rejestracji. Nie czekamy na `ready`: w trybie deweloperskim workera nie ma
 * wcale, a `ready` nigdy by się nie rozwiązało.
 */
async function resolveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration && typeof registration.showNotification === 'function' ? registration : null;
  } catch {
    return null;
  }
}

/**
 * Wysyła powiadomienie. Zwraca informację, czy poszło — moduł może wtedy
 * zdecydować, czy pokazać komunikat na ekranie.
 *
 * Brak API, brak zgody, wyjątek w środku: wszystko kończy się cichym `false`.
 * Kanał zapasowy nigdy nie ma prawa wywrócić działania, które zgłasza.
 */
export async function sendNotification(content: AppNotificationContent): Promise<boolean> {
  if (!content.title) return false;
  if (!canSendNotifications()) return false;

  const options: NotificationOptions = {
    body: content.body,
    tag: content.tag,
    silent: content.silent,
    requireInteraction: content.requireInteraction,
    icon: NOTIFICATION_ICON_PATH,
    badge: NOTIFICATION_ICON_PATH,
    lang: 'pl',
  };

  const registration = await resolveServiceWorkerRegistration();
  if (registration) {
    try {
      await registration.showNotification(content.title, options);
      return true;
    } catch {
      // Rejestracja zawiodła — próbujemy jeszcze konstruktorem.
    }
  }

  const api = resolveNotificationApi();
  if (!api) return false;

  try {
    new api(content.title, options);
    return true;
  } catch {
    return false;
  }
}
