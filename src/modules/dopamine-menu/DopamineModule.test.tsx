import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { DopamineDashboard } from './components/DopamineDashboard';
import { useDopamineMenuStore } from './store';
import { energiaIds as ids } from './testIds';
import { DopamineItem } from './types';

/*
 * Dźwięk idzie przez wspólny syntezator w `src/lib/audio/chime`. Mockujemy ten
 * jeden plik, więc test nie wie nic o tym, gdzie mieszka syntezator, i nie
 * pęknie, gdy ten się przeprowadzi.
 */
vi.mock('../../lib/audio/chime', () => ({
  playChime: vi.fn(() => Promise.resolve()),
}));

/*
 * Trzy własne pozycje zamiast dwudziestu pięciu presetów.
 *
 * Testy widoku nie mogą wisieć na treści presetów: zmiana jednego napisu
 * w karcie dań wywalała wcześniej pół tego pliku. Wszystkie selektory idą
 * przez `testIds`, a treść fixture'u pojawia się wyłącznie w asercjach.
 */
const FIXTURES: DopamineItem[] = [
  {
    id: 'fix-woda',
    title: 'Zimna woda',
    description: 'Pelny opis pierwszej pozycji, dluzszy niz dwie linie na karcie.',
    category: 'appetizer',
    energyRequired: 'low',
    durationMinutes: 2,
  },
  {
    id: 'fix-spacer',
    title: 'Spacer wokol bloku',
    category: 'entree',
    energyRequired: 'medium',
    durationMinutes: 30,
  },
  {
    id: 'fix-serial',
    title: 'Odcinek serialu wieczorem',
    category: 'dessert',
    energyRequired: 'low',
    durationMinutes: 45,
  },
];

function seed(items: DopamineItem[] = FIXTURES) {
  useDopamineMenuStore.setState({
    items: items.map((item) => ({ ...item })),
    completedToday: [],
    energyFilter: 'all',
    selectedItemId: null,
  });
}

/** Radix otwiera menu z klawiatury — bez PointerEventu, którego jsdom nie ma. */
function openCardMenu(id: string) {
  fireEvent.keyDown(screen.getByTestId(ids.cardMenu(id)), { key: 'Enter' });
}

/** Otwiera koło, kręci nim do końca pod sztucznym zegarem i zostawia ekran wyniku. */
async function spinToResult() {
  fireEvent.click(screen.getByTestId(ids.actionRoulette));
  const spin = await screen.findByTestId(ids.rouletteSpin);

  // Zegar zatrzymujemy dopiero tutaj: `findBy*` czeka na prawdziwym
  // `setTimeout`, więc pod sztucznym zegarem nigdy by się nie doczekało.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  fireEvent.click(spin);
  act(() => {
    vi.advanceTimersByTime(4200);
  });
}

describe('Energia — menu', () => {
  beforeEach(() => seed());
  afterEach(() => vi.useRealTimers());

  it('pokazuje tylko te kategorie, w których coś jest', () => {
    render(<DopamineDashboard />);

    const root = screen.getByTestId(ids.root);
    expect(within(root).getByTestId(ids.section('appetizer'))).toBeInTheDocument();
    expect(within(root).getByTestId(ids.section('entree'))).toBeInTheDocument();
    expect(within(root).getByTestId(ids.section('dessert'))).toBeInTheDocument();
    expect(within(root).queryByTestId(ids.section('side'))).not.toBeInTheDocument();
    expect(within(root).getAllByRole('article')).toHaveLength(FIXTURES.length);
  });

  it('filtruje karty po poziomie energii', () => {
    render(<DopamineDashboard />);

    fireEvent.click(within(screen.getByTestId(ids.filters)).getByTestId(ids.filter('medium')));

    expect(screen.getByTestId(ids.card('fix-spacer'))).toBeInTheDocument();
    expect(screen.queryByTestId(ids.card('fix-woda'))).not.toBeInTheDocument();
    expect(screen.queryByTestId(ids.card('fix-serial'))).not.toBeInTheDocument();
  });

  it('tłumaczy pusty ekran, gdy filtr nic nie zostawia', () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.filter('high')));

    expect(screen.getByTestId(ids.filterEmpty)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    fireEvent.click(screen.getByTestId(ids.filterReset));

    expect(screen.getByTestId(ids.card('fix-woda'))).toBeInTheDocument();
  });

  it('mówi, że menu jest puste, gdy nie ma już żadnej pozycji', () => {
    seed([]);
    render(<DopamineDashboard />);

    expect(screen.getByTestId(ids.menuEmpty)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('gwiazdka przełącza ulubione', () => {
    render(<DopamineDashboard />);

    expect(screen.getByTestId(ids.cardFavorite('fix-woda'))).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId(ids.cardFavorite('fix-woda')));

    expect(screen.getByTestId(ids.cardFavorite('fix-woda'))).toHaveAttribute('aria-pressed', 'true');
  });

  it('nazwa karty jest nagłówkiem, a przycisk siedzi w nim, nie odwrotnie', () => {
    // <button> nie przyjmuje treści przepływowej, więc nagłówek NIE MOŻE być
    // w środku przycisku; odwrotne zagnieżdżenie jest poprawne
    render(<DopamineDashboard />);

    const card = screen.getByTestId(ids.card('fix-woda'));
    const heading = within(card).getByRole('heading', { level: 3 });

    expect(within(heading).getByTestId(ids.cardOpen('fix-woda'))).toBeInTheDocument();
  });
});

describe('Energia — bank iskierek', () => {
  beforeEach(() => seed());

  it('liczy iskierki zebrane dzisiaj', () => {
    render(<DopamineDashboard />);

    const bank = screen.getByTestId(ids.bank);
    expect(within(bank).getByTestId(ids.bankCount)).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-woda')));
    expect(within(bank).getByTestId(ids.bankCount)).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-spacer')));
    expect(within(bank).getByTestId(ids.bankCount)).toHaveTextContent('2');
  });

  it('rozwija listę dopiero, gdy jest co pokazać', () => {
    render(<DopamineDashboard />);

    expect(screen.getByTestId(ids.bankToggle)).toBeDisabled();

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-serial')));
    fireEvent.click(screen.getByTestId(ids.bankToggle));

    const list = screen.getByTestId(ids.bankList);
    expect(within(list).getByText(FIXTURES[2].title)).toBeInTheDocument();
  });

  it('czyszczenie banku pyta, zanim wyzeruje licznik', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-woda')));
    expect(screen.queryByTestId(ids.bankClear)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(ids.bankClear));

    // samo pytanie niczego nie kasuje — skutek potwierdzenia sprawdza store.test.ts,
    // bo przycisk w ConfirmDialogu nie ma własnego identyfikatora testowego
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByTestId(ids.bankCount)).toHaveTextContent('1');
    expect(useDopamineMenuStore.getState().completedToday).toHaveLength(1);
  });

  it('licznik znika razem z wyczyszczonym bankiem', () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-woda')));
    act(() => {
      useDopamineMenuStore.getState().resetCompletedToday();
    });

    expect(screen.getByTestId(ids.bankCount)).toHaveTextContent('0');
    expect(screen.queryByTestId(ids.bankClear)).not.toBeInTheDocument();
  });
});

describe('Energia — szczegóły pozycji', () => {
  beforeEach(() => seed());

  it('klik w kartę otwiera arkusz z pełnym opisem', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.cardOpen('fix-woda')));

    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByTestId(ids.detailDescription)).toHaveTextContent(
      FIXTURES[0].description as string
    );
    expect(within(sheet).getByTestId(ids.detailDuration)).toBeInTheDocument();
    expect(within(sheet).getByTestId(ids.detailEnergy)).toBeInTheDocument();
  });

  it('pokazuje to, czego na karcie nie ma: kategorię i historię wykonań', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.cardDone('fix-woda')));
    fireEvent.click(screen.getByTestId(ids.cardOpen('fix-woda')));

    const detail = await screen.findByTestId(ids.detail);
    expect(within(detail).getByTestId(ids.detailCategory)).toBeInTheDocument();
    expect(within(detail).getByTestId(ids.detailHistory)).toHaveTextContent('1');

    const card = screen.getByTestId(ids.card('fix-woda'));
    expect(within(card).queryByTestId(ids.detailDescription)).not.toBeInTheDocument();
  });

  it('„Gotowe" w arkuszu zamyka go i dopisuje iskierkę', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.cardOpen('fix-woda')));
    const sheet = await screen.findByRole('dialog');
    fireEvent.click(within(sheet).getByTestId(ids.detailDone));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId(ids.bankCount)).toHaveTextContent('1');
  });
});

describe('Energia — menu pozycji', () => {
  beforeEach(() => seed());

  it('zamyka się klawiszem Escape', async () => {
    render(<DopamineDashboard />);

    openCardMenu('fix-woda');
    expect(await screen.findByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('prowadzi do zmiany pozycji', async () => {
    render(<DopamineDashboard />);

    openCardMenu('fix-woda');
    fireEvent.click(await screen.findByTestId(ids.cardEdit('fix-woda')));

    const sheet = await screen.findByRole('dialog');
    const name = within(sheet).getByTestId(ids.formName);
    expect(name).toHaveValue(FIXTURES[0].title);

    fireEvent.change(name, { target: { value: 'Woda z cytryna' } });
    fireEvent.click(within(sheet).getByTestId(ids.formSubmit));

    await waitFor(() =>
      expect(within(screen.getByTestId(ids.card('fix-woda'))).getByText('Woda z cytryna'))
        .toBeInTheDocument()
    );
  });

  it('zapisuje opis i czas, a szczegóły je pokazują', async () => {
    render(<DopamineDashboard />);

    openCardMenu('fix-spacer');
    fireEvent.click(await screen.findByTestId(ids.cardEdit('fix-spacer')));

    const sheet = await screen.findByRole('dialog');
    const form = within(sheet).getByTestId(ids.form);
    fireEvent.change(within(form).getByTestId(ids.formDescription), {
      target: { value: 'Dwie petle wokol bloku, bez posplechu' },
    });
    fireEvent.change(within(form).getByTestId(ids.formDuration), { target: { value: '12' } });
    fireEvent.click(within(sheet).getByTestId(ids.formSubmit));

    await waitFor(() => expect(screen.queryByTestId(ids.form)).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId(ids.cardOpen('fix-spacer')));
    const detail = await screen.findByTestId(ids.detail);

    expect(within(detail).getByTestId(ids.detailDescription)).toHaveTextContent(
      'Dwie petle wokol bloku, bez posplechu'
    );
    expect(within(detail).getByTestId(ids.detailDuration)).toHaveTextContent('12');
  });

  it('pyta przed usunięciem i do tego czasu niczego nie rusza', async () => {
    render(<DopamineDashboard />);

    openCardMenu('fix-serial');
    fireEvent.click(await screen.findByTestId(ids.cardRemove('fix-serial')));

    // skutek potwierdzenia sprawdza store.test.ts — przycisk potwierdzenia
    // należy do wspólnego ConfirmDialogu i nie ma identyfikatora testowego
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByTestId(ids.card('fix-serial'))).toBeInTheDocument();
    expect(useDopamineMenuStore.getState().items).toHaveLength(FIXTURES.length);
  });

  it('usunięta pozycja znika z menu', () => {
    render(<DopamineDashboard />);

    act(() => {
      useDopamineMenuStore.getState().deleteItem('fix-serial');
    });

    expect(screen.queryByTestId(ids.card('fix-serial'))).not.toBeInTheDocument();
    expect(screen.getByTestId(ids.card('fix-woda'))).toBeInTheDocument();
  });
});

describe('Energia — dopisywanie pozycji', () => {
  beforeEach(() => seed());

  it('dopisuje własną aktywność do menu', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.actionAdd));
    const sheet = await screen.findByRole('dialog');

    fireEvent.change(within(sheet).getByTestId(ids.formName), {
      target: { value: 'Wlasna pozycja testowa' },
    });
    fireEvent.click(within(sheet).getByTestId(ids.formSubmit));

    await waitFor(() =>
      expect(screen.getByText('Wlasna pozycja testowa')).toBeInTheDocument()
    );
  });

  it('nie pozwala zapisać pozycji bez nazwy', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.actionAdd));
    const sheet = await screen.findByRole('dialog');

    expect(within(sheet).getByTestId(ids.formSubmit)).toBeDisabled();
  });
});

describe('Energia — koło', () => {
  beforeEach(() => seed());
  afterEach(() => vi.useRealTimers());

  it('pokazuje najwyżej osiem wycinków', async () => {
    seed(
      Array.from({ length: 20 }, (_, i) => ({
        id: `many-${i}`,
        title: `Pozycja numer ${i}`,
        category: 'appetizer' as const,
        energyRequired: 'low' as const,
      }))
    );
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.actionRoulette));
    await screen.findByTestId(ids.rouletteWheel);

    expect(screen.getByTestId(ids.rouletteSlice(7))).toBeInTheDocument();
    expect(screen.queryByTestId(ids.rouletteSlice(8))).not.toBeInTheDocument();
  });

  it('tłumaczy puste koło i pozwala zdjąć filtr', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.filter('high')));
    fireEvent.click(screen.getByTestId(ids.actionRoulette));

    const roulette = await screen.findByTestId(ids.roulette);
    expect(within(roulette).getByTestId(ids.rouletteEmpty)).toBeInTheDocument();
    expect(screen.queryByTestId(ids.rouletteSpin)).not.toBeInTheDocument();

    fireEvent.click(within(roulette).getByTestId(ids.rouletteReset));

    expect(await screen.findByTestId(ids.rouletteSpin)).toBeInTheDocument();
  });

  it('kręci przez cztery sekundy i zostawia koło z wynikiem na ekranie', async () => {
    render(<DopamineDashboard />);

    await spinToResult();

    // koło MUSI zostać: wskaźnik pokazuje wylosowany wycinek, a nazwa stoi pod nim
    expect(screen.getByTestId(ids.rouletteWheel)).toBeInTheDocument();
    expect(screen.getByTestId(ids.rouletteResult)).toBeInTheDocument();
    expect(screen.getByTestId(ids.rouletteAccept)).toBeInTheDocument();
  });

  it('„Kręć jeszcze raz" wraca do kręcenia', async () => {
    render(<DopamineDashboard />);

    await spinToResult();
    fireEvent.click(screen.getByTestId(ids.rouletteAgain));

    expect(screen.queryByTestId(ids.rouletteResult)).not.toBeInTheDocument();
    expect(screen.getByTestId(ids.rouletteSpin)).toBeEnabled();
    expect(screen.getByTestId(ids.rouletteWheel)).toBeInTheDocument();
  });

  it('„Biorę to" pokazuje szczegóły i nie zamyka arkusza', async () => {
    render(<DopamineDashboard />);

    await spinToResult();
    fireEvent.click(screen.getByTestId(ids.rouletteAccept));

    // czas na ewentualne cofnięcie historii — arkusz ma tego NIE zrobić
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId(ids.detail)).toBeInTheDocument();
  });

  it('„Gotowe" z koła dopisuje iskierkę i zamyka arkusz', async () => {
    render(<DopamineDashboard />);

    await spinToResult();
    fireEvent.click(screen.getByTestId(ids.rouletteAccept));
    fireEvent.click(screen.getByTestId(ids.detailDone));
    vi.useRealTimers();

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId(ids.bankCount)).toHaveTextContent('1');
  });
});

describe('Energia — ratunek na paraliż', () => {
  beforeEach(() => seed());

  it('odhacza jeden mały krok i dopisuje iskierkę', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.actionSos));
    const sheet = await screen.findByRole('dialog');

    expect(within(sheet).getByTestId(ids.sosStep)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByTestId(ids.sosDone));

    await waitFor(() => expect(screen.getByTestId(ids.bankCount)).toHaveTextContent('1'));
  });

  it('podaje inną propozycję na życzenie', async () => {
    render(<DopamineDashboard />);

    fireEvent.click(screen.getByTestId(ids.actionSos));
    const sos = await screen.findByTestId(ids.sos);

    const first = within(sos).getByTestId(ids.sosStep).textContent;
    fireEvent.click(within(sos).getByTestId(ids.sosNext));

    expect(within(sos).getByTestId(ids.sosStep).textContent).not.toBe(first);
  });
});
