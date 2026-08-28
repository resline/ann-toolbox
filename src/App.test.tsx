import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { shellIds, terazIds } from './app/testIds';
import { ROUTES } from './app/routes';
import * as speechService from './modules/speaking-clock/services/speechService';

/**
 * Testy powłoki. Selektory to role ARIA i identyfikatory ze stałych —
 * ani jednego polskiego literału, żeby zmiana brzmienia napisów nie wymagała
 * dotykania tego pliku. Za poprawność samych napisów odpowiada src/copy/copy.test.ts.
 */
describe('Powłoka aplikacji', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
    window.history.replaceState({}, '', '/');
    vi.spyOn(speechService, 'getPolishVoices').mockResolvedValue([]);
  });

  it('startuje na ekranie „Teraz", a nie w module', () => {
    render(<App />);
    expect(screen.getByTestId(terazIds.greeting)).toBeInTheDocument();
  });

  it('pokazuje wejście do każdego z czterech modułów', () => {
    render(<App />);
    for (const route of ROUTES.filter((r) => r.toolId)) {
      expect(screen.getByTestId(terazIds.entry(route.toolId!))).toBeInTheDocument();
    }
  });

  it('nawigacja dolna ma pozycję dla każdej trasy i oznacza aktywną', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByTestId(shellIds.tabBar);
    expect(nav).toHaveAttribute('aria-label');

    for (const route of ROUTES) {
      expect(screen.getByTestId(shellIds.tab(route.id))).toBeInTheDocument();
    }

    expect(screen.getByTestId(shellIds.tab('teraz'))).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByTestId(shellIds.tab('energia')));
    expect(screen.getByTestId(shellIds.tab('energia'))).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId(shellIds.tab('teraz'))).not.toHaveAttribute('aria-current');
  });

  it('wejście z ekranu „Teraz" otwiera moduł i zmienia adres', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId(terazIds.entry('dopamine-menu')));

    expect(window.location.pathname).toBe('/energia');
    expect(screen.queryByTestId(terazIds.greeting)).not.toBeInTheDocument();
  });

  it('przycisk Wstecz wraca z modułu na ekran „Teraz", nie zamyka aplikacji', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId(shellIds.tab('start')));
    expect(window.location.pathname).toBe('/start');

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    await waitFor(() => expect(screen.getByTestId(terazIds.greeting)).toBeInTheDocument());
  });

  it('wchodzi wprost w moduł po otwarciu adresu głębokiego', () => {
    window.history.replaceState({}, '', '/energia');
    render(<App />);

    expect(screen.queryByTestId(terazIds.greeting)).not.toBeInTheDocument();
    expect(screen.getByTestId(shellIds.tab('energia'))).toHaveAttribute('aria-current', 'page');
  });

  it('nagłówek pokazuje markę na ekranie startowym i nazwę modułu w module', async () => {
    const user = userEvent.setup();
    render(<App />);

    const title = screen.getByTestId(shellIds.headerTitle);
    const brand = title.textContent;

    await user.click(screen.getByTestId(shellIds.tab('czas')));
    expect(screen.getByTestId(shellIds.headerTitle).textContent).not.toBe(brand);
  });

  it('ustawienia otwierają się jako arkusz i pozwalają zmienić motyw', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('day');
    await user.click(screen.getByTestId(shellIds.settingsButton));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const options = screen.getAllByRole('radio');
    // trzy motywy + trzy ustawienia ruchu
    expect(options.length).toBeGreaterThanOrEqual(6);

    await user.click(options[1]);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dusk'));
  });

  it('ustawia atrybut modułu na powłoce, żeby akcent szedł za trasą', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId(shellIds.root)).not.toHaveAttribute('data-module');

    await user.click(screen.getByTestId(shellIds.tab('start')));
    expect(screen.getByTestId(shellIds.root)).toHaveAttribute('data-module', 'start');
  });
});

describe('Instalacja PWA', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.spyOn(speechService, 'getPolishVoices').mockResolvedValue([]);
  });

  function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = promptMock;
    event.userChoice = Promise.resolve({ outcome });
    fireEvent(window, event);
    return promptMock;
  }

  it('pokazuje pasek dopiero po zdarzeniu przeglądarki', async () => {
    render(<App />);
    expect(screen.queryByTestId(shellIds.installBanner)).not.toBeInTheDocument();

    fireInstallPrompt();
    await waitFor(() => expect(screen.getByTestId(shellIds.installBanner)).toBeInTheDocument());
  });

  it('uruchamia natywny monit i chowa pasek', async () => {
    const user = userEvent.setup();
    render(<App />);
    const promptMock = fireInstallPrompt();

    await waitFor(() => expect(screen.getByTestId(shellIds.installBanner)).toBeInTheDocument());
    await user.click(screen.getByTestId(shellIds.installAccept));

    expect(promptMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByTestId(shellIds.installBanner)).not.toBeInTheDocument()
    );
  });

  it('pozwala odrzucić pasek', async () => {
    const user = userEvent.setup();
    render(<App />);
    fireInstallPrompt('dismissed');

    await waitFor(() => expect(screen.getByTestId(shellIds.installBanner)).toBeInTheDocument());
    await user.click(screen.getByTestId(shellIds.installDismiss));

    expect(screen.queryByTestId(shellIds.installBanner)).not.toBeInTheDocument();
  });
});
