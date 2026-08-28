import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BreathingCircle } from './BreathingCircle';
import { skupienieIds as ids } from '../testIds';

/** Widok oddechu. Bez importu warstwy tekstów — rytm to dane, nie napisy. */

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Oddech', () => {
  it('daje trzy techniki, pierwsza jest wybrana', () => {
    render(<BreathingCircle />);

    expect(screen.getByTestId(ids.breathingTechnique('box'))).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId(ids.breathingTechnique('relax'))).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId(ids.breathingTechnique('flow'))).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByTestId(ids.breathingCount)).not.toBeInTheDocument();
  });

  it('odlicza sekundy fazy i przechodzi do następnej', () => {
    render(<BreathingCircle />);

    fireEvent.click(screen.getByTestId(ids.breathingToggle));
    expect(screen.getByTestId(ids.breathingCount)).toHaveTextContent('4');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId(ids.breathingCount)).toHaveTextContent('3');

    // kwadrat: cztery sekundy na fazę, po nich wchodzi kolejna z pełną czwórką
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId(ids.breathingCount)).toHaveTextContent('4');
  });

  it('zmiana techniki zatrzymuje ćwiczenie i wraca na początek', () => {
    render(<BreathingCircle />);
    fireEvent.click(screen.getByTestId(ids.breathingToggle));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByTestId(ids.breathingTechnique('relax')));

    expect(screen.getByTestId(ids.breathingTechnique('relax'))).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId(ids.breathingToggle)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId(ids.breathingCount)).not.toBeInTheDocument();
  });

  it('nazwa fazy jest widoczna razem z licznikiem', () => {
    render(<BreathingCircle />);

    const phaseBefore = screen.getByTestId(ids.breathingPhase).textContent;
    fireEvent.click(screen.getByTestId(ids.breathingToggle));

    expect(screen.getByTestId(ids.breathingPhase).textContent).not.toBe(phaseBefore);
    expect(screen.getByTestId(ids.breathingCount)).toBeInTheDocument();
  });
});
