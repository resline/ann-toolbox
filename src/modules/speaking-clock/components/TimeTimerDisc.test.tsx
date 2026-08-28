import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeTimerDisc } from './TimeTimerDisc';
import { NUMBERS_SERIES } from './discGeometry';
import { czasIds } from '../testIds';

/**
 * Zostaje tu wyłącznie to, czego nie da się sprawdzić bez renderu: semantyka
 * dostępności, obecność elementów i obsługa wejścia. Cała matematyka tarczy
 * jest testowana w discGeometry.test.ts, na liczbach.
 */
describe('TimeTimerDisc', () => {
  it('jest paskiem postępu z pełną semantyką wartości', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} centerLabel="Do wyjścia" />);

    const disc = screen.getByRole('progressbar');
    expect(disc).toHaveAttribute('aria-valuenow', '300');
    expect(disc).toHaveAttribute('aria-valuemin', '0');
    expect(disc).toHaveAttribute('aria-valuemax', '600');
    expect(disc).toHaveAccessibleName('Do wyjścia');
  });

  it('podaje czytnikowi ekranu odczyt środkowy przez aria-valuetext', () => {
    // Dzieci elementu o roli progressbar są w ARIA prezentacyjne, więc sam
    // napis w środku tarczy byłby dla czytnika niewidoczny.
    render(
      <TimeTimerDisc
        totalSeconds={600}
        secondsRemaining={300}
        centerLabel="Do wyjścia"
        centerTimeText="05:00"
        centerSublabel="Trening"
      />
    );

    const disc = screen.getByRole('progressbar');
    expect(disc).toHaveAttribute('aria-valuetext', '05:00, Trening');
    // warstwa wizualna jest schowana, żeby nie dublować odczytu
    expect(screen.getByTestId(czasIds.discValue).closest('[aria-hidden]')).not.toBeNull();
  });

  it('przycina wartość zgłaszaną czytnikowi do zakresu', () => {
    const { rerender } = render(<TimeTimerDisc totalSeconds={600} secondsRemaining={900} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '600');

    rerender(<TimeTimerDisc totalSeconds={600} secondsRemaining={-50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('rysuje pełny okrąg, gdy nic jeszcze nie upłynęło', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={600} />);
    expect(screen.getByTestId(czasIds.discFull)).toBeInTheDocument();
    expect(screen.queryByTestId(czasIds.discSector)).not.toBeInTheDocument();
  });

  it('rysuje wycinek dla czasu częściowego', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={150} />);
    expect(screen.getByTestId(czasIds.discSector)).toBeInTheDocument();
    expect(screen.queryByTestId(czasIds.discFull)).not.toBeInTheDocument();
  });

  it('nie rysuje nic, gdy czas się skończył', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={0} />);
    expect(screen.queryByTestId(czasIds.discSector)).not.toBeInTheDocument();
    expect(screen.queryByTestId(czasIds.discFull)).not.toBeInTheDocument();
    expect(screen.queryByTestId(czasIds.discPointer)).not.toBeInTheDocument();
  });

  it('ma sześćdziesiąt kresek podziałki, w tym dwanaście głównych', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} />);
    const ticks = screen.getAllByTestId(czasIds.discTick);
    expect(ticks).toHaveLength(60);
    expect(ticks.filter((t) => t.getAttribute('data-major') === 'true')).toHaveLength(12);
  });

  it('pokazuje cyfry serii Time Timera i pozwala je wyłączyć', () => {
    const { rerender } = render(
      <TimeTimerDisc totalSeconds={600} secondsRemaining={300} showNumbers />
    );
    for (const value of NUMBERS_SERIES) {
      expect(screen.getByText(String(value))).toBeInTheDocument();
    }

    rerender(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} showNumbers={false} />);
    expect(screen.queryByTestId(czasIds.discNumbers)).not.toBeInTheDocument();
  });

  it('pokazuje odczyt środkowy', () => {
    render(
      <TimeTimerDisc
        totalSeconds={600}
        secondsRemaining={300}
        centerLabel="Do wyjścia"
        centerTimeText="05:00"
        centerSublabel="Trening"
      />
    );
    expect(screen.getByTestId(czasIds.discValue)).toHaveTextContent('05:00');
    expect(screen.getByTestId(czasIds.discLabel)).toHaveTextContent('Do wyjścia');
    expect(screen.getByText('Trening')).toBeInTheDocument();
  });

  it('niesie wybraną paletę jako atrybut danych, a nie jako klasę', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} color="amber" />);
    expect(screen.getByTestId(czasIds.disc)).toHaveAttribute('data-accent', 'amber');
  });

  it('bez procedury obsługi nie jest elementem interaktywnym', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('tabindex');
  });

  it('reaguje na kliknięcie oraz na Enter i spację', async () => {
    const user = userEvent.setup();
    const onDiscClick = vi.fn();
    render(
      <TimeTimerDisc totalSeconds={600} secondsRemaining={300} onDiscClick={onDiscClick} />
    );

    const disc = screen.getByRole('progressbar');
    expect(disc).toHaveAttribute('tabindex', '0');

    await user.click(disc);
    expect(onDiscClick).toHaveBeenCalledTimes(1);

    disc.focus();
    await user.keyboard('{Enter}');
    expect(onDiscClick).toHaveBeenCalledTimes(2);

    await user.keyboard(' ');
    expect(onDiscClick).toHaveBeenCalledTimes(3);
  });

  it('pokazuje pierścień aktywności tylko podczas pracy', () => {
    const { container, rerender } = render(
      <TimeTimerDisc totalSeconds={600} secondsRemaining={300} isActive={false} />
    );
    const circlesIdle = container.querySelectorAll('circle').length;

    rerender(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} isActive />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(circlesIdle);
  });

  it('skaluje się do kontenera zamiast mieć sztywny rozmiar w pikselach', () => {
    render(<TimeTimerDisc totalSeconds={600} secondsRemaining={300} />);
    // wcześniej komponent dostawał size={280} i wypisywał je jako style w px,
    // przez co nie mieścił się na wąskim telefonie
    expect(screen.getByTestId(czasIds.disc).getAttribute('style')).toBeNull();
    // geometria jest w viewBox, więc SVG skaluje się bez zmiany proporcji
    const svg = screen.getByTestId(czasIds.disc).querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
  });
});
