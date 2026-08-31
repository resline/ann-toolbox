import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NOTIFICATION_ICON_PATH,
  canSendNotifications,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendNotification,
} from './notifications';

/** Atrapa Notification API — jsdom nie ma go wcale. */
function stubNotificationApi(permission: NotificationPermission = 'default') {
  const created: Array<{ title: string; options?: NotificationOptions }> = [];

  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = vi.fn(async (): Promise<NotificationPermission> => {
      FakeNotification.permission = 'granted';
      return 'granted';
    });

    constructor(title: string, options?: NotificationOptions) {
      created.push({ title, options });
    }
  }

  vi.stubGlobal('Notification', FakeNotification);
  return { FakeNotification, created };
}

/** Rejestracja service workera taka, jaką zwraca getRegistration() w PWA. */
function stubServiceWorker(
  showNotification = vi.fn(async (_title: string, _options?: NotificationOptions) => {})
) {
  const registration = { showNotification };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration: vi.fn(async () => registration) },
    configurable: true,
    writable: true,
  });
  return { registration, showNotification };
}

function removeServiceWorker() {
  Reflect.deleteProperty(navigator, 'serviceWorker');
}

beforeEach(() => {
  removeServiceWorker();
});

afterEach(() => {
  vi.unstubAllGlobals();
  removeServiceWorker();
  vi.restoreAllMocks();
});

describe('powiadomienia — brak API', () => {
  it('milczy w przeglądarce bez Notification API', async () => {
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe('unsupported');
    expect(canSendNotifications()).toBe(false);
    await expect(requestNotificationPermission()).resolves.toBe('unsupported');
    await expect(sendNotification({ title: 'Cokolwiek' })).resolves.toBe(false);
  });
});

describe('powiadomienia — zgoda', () => {
  it('odczytuje stan zgody bez proszenia o nią', () => {
    const { FakeNotification } = stubNotificationApi('default');

    expect(isNotificationSupported()).toBe(true);
    expect(getNotificationPermission()).toBe('default');
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('O ZGODĘ PYTA DOPIERO WYWOŁANIE Z GESTU, NIGDY SAM ODCZYT STANU', async () => {
    const { FakeNotification } = stubNotificationApi('default');

    getNotificationPermission();
    canSendNotifications();
    await sendNotification({ title: 'Cicha próba' });

    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('prosi o zgodę i oddaje odpowiedź użytkowniczki', async () => {
    const { FakeNotification } = stubNotificationApi('default');

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(canSendNotifications()).toBe(true);
  });

  it('nie pyta drugi raz, gdy zgoda już jest', async () => {
    const { FakeNotification } = stubNotificationApi('granted');

    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('nie naciska po odmowie', async () => {
    const { FakeNotification } = stubNotificationApi('denied');

    await expect(requestNotificationPermission()).resolves.toBe('denied');
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled();
    expect(canSendNotifications()).toBe(false);
  });

  it('radzi sobie ze starym wariantem z wywołaniem zwrotnym', async () => {
    const { FakeNotification } = stubNotificationApi('default');
    FakeNotification.requestPermission = vi.fn((callback?: (p: NotificationPermission) => void) => {
      FakeNotification.permission = 'granted';
      callback?.('granted');
      return undefined as unknown as Promise<NotificationPermission>;
    }) as unknown as typeof FakeNotification.requestPermission;

    await expect(requestNotificationPermission()).resolves.toBe('granted');
  });

  it('nie wypuszcza wyjątku, gdy przeglądarka odmówi samego pytania', async () => {
    const { FakeNotification } = stubNotificationApi('default');
    FakeNotification.requestPermission = vi.fn(() => {
      throw new Error('poza gestem użytkownika');
    }) as unknown as typeof FakeNotification.requestPermission;

    await expect(requestNotificationPermission()).resolves.toBe('default');
  });
});

describe('powiadomienia — wysyłka', () => {
  it('bez zgody nie tworzy niczego', async () => {
    const { created } = stubNotificationApi('default');

    await expect(sendNotification({ title: 'Czas minął' })).resolves.toBe(false);
    expect(created).toHaveLength(0);
  });

  it('po odmowie milczy', async () => {
    const { created } = stubNotificationApi('denied');

    await expect(sendNotification({ title: 'Czas minął' })).resolves.toBe(false);
    expect(created).toHaveLength(0);
  });

  it('bez tytułu nie wysyła pustego powiadomienia', async () => {
    const { created } = stubNotificationApi('granted');

    await expect(sendNotification({ title: '' })).resolves.toBe(false);
    expect(created).toHaveLength(0);
  });

  it('PRZEPUSZCZA TEKSTY Z ZEWNĄTRZ, ZAMIAST TRZYMAĆ WŁASNE', async () => {
    stubNotificationApi('granted');
    const { showNotification } = stubServiceWorker();

    const title = 'Tytuł podany przez moduł';
    const body = 'Treść podana przez moduł';
    await expect(sendNotification({ title, body, tag: 'czas' })).resolves.toBe(true);

    expect(showNotification).toHaveBeenCalledTimes(1);
    const [sentTitle, sentOptions] = showNotification.mock.calls[0];
    expect(sentTitle).toBe(title);
    expect(sentOptions?.body).toBe(body);
    expect(sentOptions?.tag).toBe('czas');
    expect(sentOptions?.icon).toBe(NOTIFICATION_ICON_PATH);
  });

  it('bez service workera wysyła konstruktorem', async () => {
    const { created } = stubNotificationApi('granted');

    await expect(sendNotification({ title: 'Bez workera', silent: true })).resolves.toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('Bez workera');
    expect(created[0].options?.silent).toBe(true);
  });

  it('wraca do konstruktora, gdy service worker odmówi pokazania', async () => {
    const { created } = stubNotificationApi('granted');
    stubServiceWorker(
      vi.fn(async () => {
        throw new Error('worker odmówił');
      })
    );

    await expect(sendNotification({ title: 'Plan zapasowy' })).resolves.toBe(true);
    expect(created).toHaveLength(1);
  });

  it('milczy, gdy zawiodą oba kanały', async () => {
    const FakeNotification = vi.fn(() => {
      throw new Error('Illegal constructor');
    }) as unknown as typeof Notification;
    (FakeNotification as unknown as { permission: NotificationPermission }).permission = 'granted';
    vi.stubGlobal('Notification', FakeNotification);
    stubServiceWorker(
      vi.fn(async () => {
        throw new Error('worker odmówił');
      })
    );

    await expect(sendNotification({ title: 'Nic z tego' })).resolves.toBe(false);
  });

  it('nie przewraca się, gdy odczyt rejestracji workera zawiedzie', async () => {
    const { created } = stubNotificationApi('granted');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn(async () => {
          throw new Error('rejestracja niedostępna');
        }),
      },
      configurable: true,
      writable: true,
    });

    await expect(sendNotification({ title: 'Mimo wszystko' })).resolves.toBe(true);
    expect(created).toHaveLength(1);
  });
});
