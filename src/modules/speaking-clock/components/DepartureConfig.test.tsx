import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartureConfig } from './DepartureConfig';
import { czas } from '../../../copy';
import { czasIds } from '../testIds';
import type { DepartureSettings } from '../types';

const base: DepartureSettings = {
  targetTime: '08:30',
  label: 'Wyjście z domu',
  smartDensity: true,
  intervalMinutes: 2,
};

function setup(settings: Partial<DepartureSettings> = {}, disabled = false) {
  const onChange = vi.fn();
  render(
    <DepartureConfig settings={{ ...base, ...settings }} onChange={onChange} disabled={disabled} />
  );
  return { onChange };
}

/* Obliczenia godziny wymagają zamrożonego zegara. userEvent nie współpracuje
   dobrze z fake timerami, więc tutaj klikamy przez fireEvent. */
describe('DepartureConfig — przeliczanie godziny', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(czas.departure.offsets.map((o) => o.minutes))(
    'skok o %i minut ustawia właściwą godzinę',
    (minutes) => {
      const { onChange } = setup();
      fireEvent.click(screen.getByTestId(czasIds.departureOffset(minutes)));

      const expected = new Date(2026, 7, 28, 10, 0, 0);
      expected.setMinutes(expected.getMinutes() + minutes);
      const hh = String(expected.getHours()).padStart(2, '0');
      const mm = String(expected.getMinutes()).padStart(2, '0');

      expect(onChange).toHaveBeenCalledWith({ targetTime: `${hh}:${mm}` });
    }
  );

  it('poprawnie przechodzi przez północ', () => {
    vi.setSystemTime(new Date(2026, 7, 28, 23, 50, 0));
    const { onChange } = setup();
    fireEvent.click(screen.getByTestId(czasIds.departureOffset(15)));
    expect(onChange).toHaveBeenCalledWith({ targetTime: '00:05' });
  });
});

describe('DepartureConfig', () => {
  it('pokazuje ustawioną godzinę docelową', () => {
    setup();
    expect(screen.getByTestId(czasIds.departureTime)).toHaveValue('08:30');
  });

  it('zgłasza godzinę wpisaną ręcznie', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByTestId(czasIds.departureTime), { target: { value: '09:45' } });
    expect(onChange).toHaveBeenCalledWith({ targetTime: '09:45' });
  });

  it('pokazuje wszystkie gotowe etykiety i oznacza wybraną', () => {
    setup({ label: czas.departure.presets[1] });
    czas.departure.presets.forEach((_, index) => {
      expect(screen.getByTestId(czasIds.departurePreset(index))).toBeInTheDocument();
    });
    expect(screen.getByTestId(czasIds.departurePreset(1))).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId(czasIds.departurePreset(0))).toHaveAttribute('aria-pressed', 'false');
  });

  it('zgłasza wybór gotowej etykiety', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByTestId(czasIds.departurePreset(2)));
    expect(onChange).toHaveBeenCalledWith({ label: czas.departure.presets[2] });
  });

  it('pozwala wpisać własną etykietę', () => {
    const { onChange } = setup({ label: '' });
    fireEvent.change(screen.getByTestId(czasIds.departureCustom), {
      target: { value: 'Odbiór paczki' },
    });
    expect(onChange).toHaveBeenCalledWith({ label: 'Odbiór paczki' });
  });

  it('przycisk własnej etykiety przenosi fokus do pola', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId(czasIds.departureCustomButton));
    expect(screen.getByTestId(czasIds.departureCustom)).toHaveFocus();
  });

  it('oznacza etykietę spoza listy jako własną', () => {
    setup({ label: 'Odbiór paczki' });
    expect(screen.getByTestId(czasIds.departureCustomButton)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('oznacza zagęszczanie jako aktywne i je objaśnia', () => {
    setup({ smartDensity: true });
    expect(screen.getByTestId(czasIds.cadenceSmart)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(czas.departure.smartHint)).toBeInTheDocument();
  });

  it('wybór stałego odstępu wyłącza zagęszczanie', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ smartDensity: true });
    await user.click(screen.getByTestId(czasIds.cadenceFixed(5)));
    expect(onChange).toHaveBeenCalledWith({ smartDensity: false, intervalMinutes: 5 });
  });

  it('powrót do zagęszczania zgłasza tylko tę zmianę', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ smartDensity: false, intervalMinutes: 5 });
    await user.click(screen.getByTestId(czasIds.cadenceSmart));
    expect(onChange).toHaveBeenCalledWith({ smartDensity: true });
  });

  it('nie objaśnia zagęszczania, gdy wybrany jest stały odstęp', () => {
    setup({ smartDensity: false, intervalMinutes: 5 });
    expect(screen.queryByText(czas.departure.smartHint)).not.toBeInTheDocument();
  });

  it('wyłącza wszystkie kontrolki, gdy zegar pracuje', () => {
    setup({}, true);
    expect(screen.getByTestId(czasIds.departureTime)).toBeDisabled();
    expect(screen.getByTestId(czasIds.departureCustom)).toBeDisabled();
    expect(screen.getByTestId(czasIds.departurePreset(0))).toBeDisabled();
    expect(screen.getByTestId(czasIds.cadenceSmart)).toBeDisabled();
    expect(screen.getByTestId(czasIds.departureOffset(15))).toBeDisabled();
  });
});
