import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickTimeAdjusters } from './QuickTimeAdjusters';

describe('QuickTimeAdjusters Component', () => {
  const defaultProps = {
    onAdjustMinutes: vi.fn(),
  };

  it('renders all 4 adjustment buttons: -5 min, +1 min, +5 min, +10 min', () => {
    render(<QuickTimeAdjusters {...defaultProps} />);

    expect(screen.getByRole('button', { name: /-5 min|Odejmij 5 minut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+1 min|Dodaj 1 minut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+5 min|Dodaj 5 minut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+10 min|Dodaj 10 minut/i })).toBeInTheDocument();
  });

  it('calls onAdjustMinutes with correct negative and positive minute values', () => {
    const onAdjustMinutes = vi.fn();
    render(<QuickTimeAdjusters onAdjustMinutes={onAdjustMinutes} />);

    fireEvent.click(screen.getByRole('button', { name: /-5 min|Odejmij 5 minut/i }));
    expect(onAdjustMinutes).toHaveBeenCalledWith(-5);

    fireEvent.click(screen.getByRole('button', { name: /\+1 min|Dodaj 1 minut/i }));
    expect(onAdjustMinutes).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /\+5 min|Dodaj 5 minut/i }));
    expect(onAdjustMinutes).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByRole('button', { name: /\+10 min|Dodaj 10 minut/i }));
    expect(onAdjustMinutes).toHaveBeenCalledWith(10);
  });

  it('disables all buttons when disabled is true', () => {
    const onAdjustMinutes = vi.fn();
    render(<QuickTimeAdjusters onAdjustMinutes={onAdjustMinutes} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(4);

    buttons.forEach((button) => {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    });

    expect(onAdjustMinutes).not.toHaveBeenCalled();
  });

  it('has role="group" with accessible label', () => {
    render(<QuickTimeAdjusters {...defaultProps} />);

    const group = screen.getByRole('group', { name: /Szybka zmiana czasu|Korekta czasu/i });
    expect(group).toBeInTheDocument();
  });
});
