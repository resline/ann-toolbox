import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { MicroTasksModule } from './components/MicroTasksModule';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { useMicroTasksStore } from './store';
import { startIds } from './testIds';
import type { MicroTask } from './types';

/**
 * Testy widoku modułu Start.
 *
 * Selektory to identyfikatory ze stałych i role ARIA — ani jednego napisu
 * z interfejsu, żeby zmiana brzmienia nie wymagała dotykania tego pliku.
 * Za same napisy odpowiada src/copy/copy.test.ts.
 *
 * Dane w asercjach pochodzą z fikstury poniżej, nie z gotowych szablonów —
 * inaczej test opisywałby treść katalogu zamiast zachowania widoku.
 */

const FIXTURE: MicroTask = {
  id: 'fix-1',
  title: 'Zadanie testowe',
  category: 'home',
  steps: [
    { id: 'fix-1-a', title: 'Pierwszy ruch', status: 'pending', estimatedMinutes: 1 },
    { id: 'fix-1-b', title: 'Drugi ruch', status: 'pending', estimatedMinutes: 2 },
  ],
};

function resetStore() {
  useMicroTasksStore.setState({
    tasks: [JSON.parse(JSON.stringify(FIXTURE)) as MicroTask],
    userTemplates: [],
    taskHistory: [],
    activeTaskId: null,
    currentStepId: null,
    timerState: 'idle',
    timeRemainingSeconds: 0,
  });
}

describe('Moduł Start — ekran startowy', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('pokazuje wszystkie wejścia w moduł', () => {
    render(<MicroTasksModule />);

    expect(screen.getByTestId(startIds.home)).toBeInTheDocument();
    expect(screen.getByTestId(startIds.ownTaskButton)).toBeInTheDocument();
    expect(screen.getByTestId(startIds.catalogButton)).toBeInTheDocument();
    expect(screen.getByTestId(startIds.historyButton)).toBeInTheDocument();
    expect(screen.getByTestId(startIds.templateCard(FIXTURE.id))).toBeInTheDocument();
  });

  it('katalog filtruje po kategorii i po wpisanym słowie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.catalogButton));
    expect(await screen.findByTestId(startIds.catalogItem(FIXTURE.id))).toBeInTheDocument();

    await user.click(screen.getByTestId(startIds.catalogFilter('work')));
    expect(screen.queryByTestId(startIds.catalogItem(FIXTURE.id))).not.toBeInTheDocument();
    expect(screen.getByTestId(startIds.catalogEmpty)).toBeInTheDocument();

    await user.click(screen.getByTestId(startIds.catalogFilter('all')));
    await user.type(screen.getByTestId(startIds.catalogSearch), 'testowe');
    expect(screen.getByTestId(startIds.catalogItem(FIXTURE.id))).toBeInTheDocument();
  });

  it('uruchomienie z katalogu faktycznie wchodzi w zadanie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.catalogButton));
    await user.click(await screen.findByTestId(startIds.catalogRun(FIXTURE.id)));

    const focus = await screen.findByTestId(startIds.focus);
    expect(focus).toBeInTheDocument();
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[0].title);
    expect(screen.queryByTestId(startIds.catalog)).not.toBeInTheDocument();
  });

  it('zapisany zestaw ma na ekranie startowym drogę do usunięcia', async () => {
    const user = userEvent.setup();
    const mine: MicroTask = {
      id: 'fix-mine',
      title: 'Moj zapisany zestaw',
      isCustomTemplate: true,
      steps: [{ id: 'fix-mine-a', title: 'Jedyny ruch', status: 'pending', estimatedMinutes: 2 }],
    };
    useMicroTasksStore.setState({ userTemplates: [mine] });

    render(<MicroTasksModule />);
    await user.click(screen.getByTestId(startIds.templateDelete(mine.id)));

    // pyta, zanim cokolwiek zniknie
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(useMicroTasksStore.getState().userTemplates).toHaveLength(1);

    act(() => useMicroTasksStore.getState().deleteCustomTemplate(mine.id));

    expect(screen.queryByTestId(startIds.templateDelete(mine.id))).not.toBeInTheDocument();
    expect(screen.queryByTestId(startIds.templateCard(mine.id))).not.toBeInTheDocument();
  });

  it('historia pokazuje zamknięte zadania i ich liczbę', async () => {
    const user = userEvent.setup();
    useMicroTasksStore.getState().recordTaskCompletion(FIXTURE);
    const entry = useMicroTasksStore.getState().taskHistory[0];

    render(<MicroTasksModule />);
    await user.click(screen.getByTestId(startIds.historyButton));

    expect(await screen.findByTestId(startIds.historyEntry(entry.id))).toHaveTextContent(FIXTURE.title);
    expect(screen.getByTestId(startIds.historyCount)).toHaveTextContent('1');
  });
});

describe('Moduł Start — widok skupienia', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('prowadzi krok po kroku i pokazuje postęp rolą progressbar', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', String(FIXTURE.steps.length));
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[0].title);

    await user.click(screen.getByTestId(startIds.focusDone));

    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[1].title);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('POSTĘP PRZEŻYWA ODMONTOWANIE WIDOKU', async () => {
    const user = userEvent.setup();
    const first = render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusDone));
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[1].title);

    // zamknięcie karty w połowie zadania
    first.unmount();
    render(<MicroTasksModule />);

    // nadal krok drugi, a nie ekran startowy
    expect(screen.queryByTestId(startIds.home)).not.toBeInTheDocument();
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[1].title);

    // dowód, że stan poszedł do zapisu, a nie tylko do pamięci widoku
    const stored = JSON.parse(localStorage.getItem('ann_micro_tasks') ?? '{}');
    expect(stored.state.activeTaskId).toBe(FIXTURE.id);
    expect(stored.state.currentStepId).toBe(FIXTURE.steps[1].id);
  });

  it('pomija krok i idzie dalej', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusSkip));

    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent(FIXTURE.steps[1].title);
    const task = useMicroTasksStore.getState().tasks.find((t) => t.id === FIXTURE.id);
    expect(task?.steps[0].status).toBe('skipped');
  });

  it('ZADANIE PRZEKLIKANE POMIJANIEM NIE WCHODZI DO UKOŃCZONYCH', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusSkip));
    await user.click(screen.getByTestId(startIds.focusSkip));

    // zadanie się zamknęło…
    expect(await screen.findByTestId(startIds.home)).toBeInTheDocument();
    // …ale historia jest dowodem na zrobione kroki, więc zostaje pusta
    expect(useMicroTasksStore.getState().taskHistory).toHaveLength(0);

    await user.click(screen.getByTestId(startIds.historyButton));
    expect(await screen.findByTestId(startIds.historyEmpty)).toBeInTheDocument();
  });

  it('dopisuje krok w locie i pokazuje go na liście', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusAddStep));
    await user.type(screen.getByTestId(startIds.focusAddInput), 'Trzeci ruch');
    await user.click(screen.getByTestId(startIds.focusAddSubmit));

    await user.click(screen.getByTestId(startIds.focusShowList));

    const list = screen.getByTestId(startIds.list);
    expect(list).toHaveTextContent('Trzeci ruch');
    expect(useMicroTasksStore.getState().tasks[0].steps).toHaveLength(3);
  });

  it('zapisuje zestaw kroków bez okna przeglądarki', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusSaveTemplate));

    expect(screen.getByTestId(startIds.focusSavedNotice)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(useMicroTasksStore.getState().userTemplates).toHaveLength(1);

    alertSpy.mockRestore();
  });

  it('region z potwierdzeniem zapisu istnieje, zanim pojawi się w nim treść', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));

    // region ogłaszający jest w drzewie od początku, tylko pusty — inaczej
    // czytnik ekranu milczy, bo ogłasza zmiany w regionach, które już istniały
    const live = screen.getByRole('status');
    expect(live).toBeEmptyDOMElement();
    expect(screen.queryByTestId(startIds.focusSavedNotice)).not.toBeInTheDocument();

    await user.click(screen.getByTestId(startIds.focusSaveTemplate));

    expect(live).not.toBeEmptyDOMElement();
    expect(screen.getByTestId(startIds.focusSavedNotice)).toBeInTheDocument();
  });

  it('nie mnoży tego samego zestawu przy powtórnym zapisie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));

    const saveButton = screen.getByTestId(startIds.focusSaveTemplate);
    await user.click(saveButton);
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    await user.click(saveButton);

    expect(useMicroTasksStore.getState().userTemplates).toHaveLength(1);
  });


  it('licznik oporu startuje i zatrzymuje się na żądanie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    expect(screen.getByTestId(startIds.timerValue)).toHaveTextContent('1:00');

    await user.click(screen.getByTestId(startIds.timerToggle));
    expect(useMicroTasksStore.getState().timerState).toBe('running');

    await user.click(screen.getByTestId(startIds.timerToggle));
    expect(useMicroTasksStore.getState().timerState).toBe('paused');
  });

  it('ostatni krok kończy zadanie, świętuje i wraca na ekran startowy', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusDone));
    await user.click(screen.getByTestId(startIds.focusDone));

    expect(await screen.findByTestId(startIds.celebration)).toBeInTheDocument();
    expect(screen.getByTestId(startIds.home)).toBeInTheDocument();
    expect(useMicroTasksStore.getState().taskHistory).toHaveLength(1);
  });
});

describe('Moduł Start — lista kroków', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('odhacza wyłącznie krok bieżący', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusShowList));

    expect(screen.getByTestId(startIds.stepDone(FIXTURE.steps[0].id))).toBeInTheDocument();
    expect(screen.queryByTestId(startIds.stepDone(FIXTURE.steps[1].id))).not.toBeInTheDocument();

    await user.click(screen.getByTestId(startIds.stepDone(FIXTURE.steps[0].id)));

    expect(screen.getByTestId(startIds.stepDone(FIXTURE.steps[1].id))).toBeInTheDocument();
    expect(screen.getByTestId(startIds.listProgress)).toHaveTextContent('1');
  });

  it('odłożenie zadania pyta o potwierdzenie, zanim cokolwiek zniknie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.templateCard(FIXTURE.id)));
    await user.click(screen.getByTestId(startIds.focusShowList));
    await user.click(screen.getByTestId(startIds.listAbandon));

    // samo otwarcie pytania niczego nie kasuje — potwierdzenie sprawdza store.test.ts
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName();
    expect(useMicroTasksStore.getState().activeTaskId).toBe(FIXTURE.id);
  });
});

describe('Moduł Start — rozbijanie własnego zadania', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('prowadzi przez trzy ekrany i uruchamia złożone zadanie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);

    // ekran 1 — jedno pytanie
    expect(screen.queryByTestId(startIds.decomposerResistance)).not.toBeInTheDocument();
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Wlasne zadanie');
    await user.click(screen.getByTestId(startIds.decomposerNext));

    // ekran 2 — opór
    expect(screen.getByTestId(startIds.decomposerResistance)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
    await user.click(screen.getByTestId(startIds.decomposerNext));

    // ekran 3 — kroki, pole na dole, akcja w stopce
    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Krok jeden{Enter}');
    expect(screen.getByTestId(startIds.decomposerStep(0))).toHaveValue('Krok jeden');

    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Krok dwa');
    await user.click(screen.getByTestId(startIds.decomposerStepAdd));
    expect(screen.getByTestId(startIds.decomposerStep(1))).toHaveValue('Krok dwa');

    await user.click(screen.getByTestId(startIds.decomposerBegin));

    const focus = await screen.findByTestId(startIds.focus);
    expect(focus).toBeInTheDocument();
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent('Krok jeden');
    expect(screen.getByTestId(startIds.focusTask)).toHaveTextContent('Wlasne zadanie');
  });

  it('podpowiada drabinkę kroków dobraną do oporu', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Zadanie z oporem');
    await user.click(screen.getByTestId(startIds.decomposerNext));

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '5');

    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerSuggest));

    expect(screen.getByTestId(startIds.decomposerStep(0))).toBeInTheDocument();
    // podpowiedź zostaje pod ręką także wtedy, gdy kroki już są
    expect(screen.getByTestId(startIds.decomposerSuggest)).toBeInTheDocument();
  });

  it('PODPOWIEDZIANY KROK DA SIĘ PRZEPISAĆ NA SWOJE SŁOWA', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Wielkie porzadki');
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerNext));

    await user.click(screen.getByTestId(startIds.decomposerSuggest));

    const first = screen.getByTestId(startIds.decomposerStep(0));
    await user.clear(first);
    await user.type(first, 'Wyniesc karton do piwnicy');
    expect(first).toHaveValue('Wyniesc karton do piwnicy');

    await user.click(screen.getByTestId(startIds.decomposerBegin));

    await screen.findByTestId(startIds.focus);
    expect(screen.getByTestId(startIds.focusStep)).toHaveTextContent('Wyniesc karton do piwnicy');
  });

  it('podpowiedź dopisuje kroki, zamiast kasować wpisane ręcznie', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Zadanie mieszane');
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerNext));

    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Moj wlasny krok{Enter}');
    await user.click(screen.getByTestId(startIds.decomposerSuggest));

    expect(screen.getByTestId(startIds.decomposerStep(0))).toHaveValue('Moj wlasny krok');
    expect(screen.getByTestId(startIds.decomposerStep(1))).toBeInTheDocument();
  });

  it('ODŁOŻENIE ZADANIA DORAŹNEGO NIE KASUJE WPISANYCH KROKÓW', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Wielkie porzadki');
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Zebrac kartony{Enter}');
    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Wyniesc do piwnicy{Enter}');
    await user.click(screen.getByTestId(startIds.decomposerBegin));

    await screen.findByTestId(startIds.focus);
    const adHocId = useMicroTasksStore.getState().activeTaskId!;

    await user.click(screen.getByTestId(startIds.focusShowList));
    await user.click(screen.getByTestId(startIds.listAbandon));

    // pyta, zanim cokolwiek zniknie
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(useMicroTasksStore.getState().activeTaskId).toBe(adHocId);

    // samo potwierdzenie ma swój test w „lista kroków"; tutaj interesuje nas to,
    // co zostaje po odłożeniu, więc pytanie zamykamy i wołamy akcję wprost
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    act(() => useMicroTasksStore.getState().abandonTask());

    // zadanie czeka na ekranie startowym razem z krokami…
    const parked = await screen.findByTestId(startIds.parked);
    expect(parked).toHaveTextContent('Wielkie porzadki');
    expect(
      useMicroTasksStore.getState().tasks.find((t) => t.id === adHocId)?.steps
    ).toHaveLength(2);

    // …i da się do niego wrócić
    await user.click(screen.getByTestId(startIds.templateCard(adHocId)));
    expect(await screen.findByTestId(startIds.focusStep)).toHaveTextContent('Zebrac kartony');
  });

  it('odłożone zadanie da się wyrzucić, ale dopiero po potwierdzeniu', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Do wyrzucenia');
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Jedyny krok{Enter}');
    await user.click(screen.getByTestId(startIds.decomposerBegin));

    await screen.findByTestId(startIds.focus);
    const adHocId = useMicroTasksStore.getState().activeTaskId!;
    act(() => useMicroTasksStore.getState().abandonTask());

    await user.click(await screen.findByTestId(startIds.parkedDiscard(adHocId)));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(useMicroTasksStore.getState().tasks.find((t) => t.id === adHocId)).toBeDefined();

    act(() => useMicroTasksStore.getState().discardTask(adHocId));

    expect(screen.queryByTestId(startIds.parked)).not.toBeInTheDocument();
  });

  it('nowe zadanie doraźne trafia do zapisu, a nie do pamięci widoku', async () => {
    const user = userEvent.setup();
    render(<MicroTasksModule />);

    await user.click(screen.getByTestId(startIds.ownTaskButton));
    await screen.findByTestId(startIds.decomposer);
    await user.type(screen.getByTestId(startIds.decomposerTitleInput), 'Zadanie zapisane');
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.click(screen.getByTestId(startIds.decomposerNext));
    await user.type(screen.getByTestId(startIds.decomposerStepInput), 'Jedyny krok{Enter}');
    await user.click(screen.getByTestId(startIds.decomposerBegin));

    await screen.findByTestId(startIds.focus);

    const stored = JSON.parse(localStorage.getItem('ann_micro_tasks') ?? '{}');
    const active = stored.state.tasks.find((t: { id: string }) => t.id === stored.state.activeTaskId);
    expect(active.title).toBe('Zadanie zapisane');
    expect(active.steps).toHaveLength(1);
  });
});


/**
 * Świętowanie ma zabrzmieć raz. Warstwa jest przepuszczalna, więc ekran pod nią
 * żyje i przerenderowuje moduł — a każdy render podaje tu nowe wywołanie zwrotne.
 */
describe('Moduł Start — świętowanie', () => {
  class FakeAudioContext {
    static created = 0;
    currentTime = 0;
    destination = {};
    constructor() {
      FakeAudioContext.created += 1;
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
  }

  beforeEach(() => {
    FakeAudioContext.created = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('FANFARA GRA RAZ, CHOĆBY MODUŁ PRZERENDEROWAŁ SIĘ W TRAKCIE', () => {
    const view = render(<CelebrationOverlay isVisible onComplete={() => {}} />);
    expect(FakeAudioContext.created).toBe(1);

    // każdy render modułu podaje nową funkcję — to nie jest nowe świętowanie
    view.rerender(<CelebrationOverlay isVisible onComplete={() => {}} />);
    view.rerender(<CelebrationOverlay isVisible onComplete={() => {}} />);

    expect(FakeAudioContext.created).toBe(1);
    expect(screen.getByTestId(startIds.celebration)).toBeInTheDocument();
  });
});
