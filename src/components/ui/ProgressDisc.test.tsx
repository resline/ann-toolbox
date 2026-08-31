import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDisc } from './ProgressDisc';

/**
 * Ten prymityw istnieje po to, żeby dostępność pierścienia była napisana raz.
 * Stąd testy chodzą po ARIA, nie po wyglądzie: to `aria-valuetext` decyduje,
 * czy czytnik ekranu w ogóle usłyszy licznik ze środka tarczy.
 */

const NAZWA = 'Postęp fazy';
const FAZA = 'Rozgrzewka';
const LICZNIK = '02:00';
const CALOSC = 'z 25 min';
const TARCZA = 'tarcza';
const SRODEK = 'srodek';

describe('ProgressDisc — dostępność', () => {
  it('jest paskiem postępu o podanej nazwie', () => {
    render(<ProgressDisc value={40} label={NAZWA} />);

    expect(screen.getByRole('progressbar', { name: NAZWA })).toBeInTheDocument();
  });

  it('podaje wartość w skali 0–100', () => {
    render(<ProgressDisc value={40} label={NAZWA} />);
    const tarcza = screen.getByRole('progressbar');

    expect(tarcza).toHaveAttribute('aria-valuenow', '40');
    expect(tarcza).toHaveAttribute('aria-valuemin', '0');
    expect(tarcza).toHaveAttribute('aria-valuemax', '100');
  });

  it('przycina wartości spoza zakresu zamiast je pokazywać', () => {
    const { rerender } = render(<ProgressDisc value={-30} label={NAZWA} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressDisc value={140} label={NAZWA} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('skleja aria-valuetext z podanych członów', () => {
    render(<ProgressDisc value={10} label={NAZWA} valueText={[FAZA, LICZNIK, CALOSC]} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      `${FAZA}, ${LICZNIK}, ${CALOSC}`
    );
  });

  it('pomija puste człony, więc wywołujący nie musi ich filtrować', () => {
    render(<ProgressDisc value={10} label={NAZWA} valueText={[FAZA, undefined, '', CALOSC]} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      `${FAZA}, ${CALOSC}`
    );
  });

  it('bez opisu nie ustawia aria-valuetext', () => {
    render(<ProgressDisc value={10} label={NAZWA} />);

    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuetext');
  });

  it('ukrywa warstwę wizualną przed czytnikiem ekranu', () => {
    // dzieci roli progressbar są w ARIA prezentacyjne — jedyne, co czytnik
    // ekranu usłyszy, to nazwa i aria-valuetext
    render(
      <ProgressDisc value={10} label={NAZWA} data-testid={TARCZA}>
        <span data-testid={SRODEK}>{LICZNIK}</span>
      </ProgressDisc>
    );

    expect(screen.getByTestId(SRODEK)).toBeInTheDocument();
    expect(screen.getByTestId(SRODEK).closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('przepuszcza identyfikator testowy na element z rolą', () => {
    render(<ProgressDisc value={10} label={NAZWA} data-testid={TARCZA} />);

    expect(screen.getByTestId(TARCZA)).toBe(screen.getByRole('progressbar'));
  });
});

describe('ProgressDisc — rysunek', () => {
  it('rysuje wypełnienie proporcjonalne do wartości', () => {
    const { rerender } = render(<ProgressDisc value={0} label={NAZWA} data-testid={TARCZA} />);
    // pierścień postępu poznaje się po przerywanej kresce — tylko on ją ma,
    // więc test nie zależy od kolejności elementów w SVG
    const obwod = () =>
      screen
        .getByTestId(TARCZA)
        .querySelector('circle[stroke-dasharray]')
        ?.getAttribute('stroke-dashoffset');

    const pusty = Number(obwod());
    rerender(<ProgressDisc value={50} label={NAZWA} data-testid={TARCZA} />);
    const polowa = Number(obwod());
    rerender(<ProgressDisc value={100} label={NAZWA} data-testid={TARCZA} />);
    const pelny = Number(obwod());

    // pełne odsłonięcie pierścienia to zerowe przesunięcie kreski
    expect(pelny).toBe(0);
    expect(polowa).toBeCloseTo(pusty / 2, 5);
  });

  it('nie renderuje pustej warstwy środka, gdy nie ma czego pokazać', () => {
    render(<ProgressDisc value={10} label={NAZWA} data-testid={TARCZA} />);

    expect(screen.getByTestId(TARCZA).querySelector('[aria-hidden="true"]:not(svg)')).toBeNull();
  });
});
