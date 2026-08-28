import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickTimeAdjusters } from './QuickTimeAdjusters';
import { czasIds } from '../testIds';

describe('QuickTimeAdjusters', () => {
  it('daje cztery korekty w grupie o nazwie dostępnej', () => {
    render(<QuickTimeAdjusters onAdjustMinutes={vi.fn()} />);
    expect(screen.getByRole('group')).toHaveAccessibleName();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it.each([[-5], [1], [5], [10]])('zgłasza korektę o %i minut', async (minutes) => {
    const user = userEvent.setup();
    const onAdjustMinutes = vi.fn();
    render(<QuickTimeAdjusters onAdjustMinutes={onAdjustMinutes} />);

    await user.click(screen.getByTestId(czasIds.quickAdjust(minutes)));
    expect(onAdjustMinutes).toHaveBeenCalledWith(minutes);
  });

  it('każdy przycisk ma nazwę dostępną opisującą kierunek zmiany', () => {
    render(<QuickTimeAdjusters onAdjustMinutes={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName();
      expect(button.getAttribute('aria-label')).not.toBe('');
    }
  });

  it('daje się wyłączyć', async () => {
    const user = userEvent.setup();
    const onAdjustMinutes = vi.fn();
    render(<QuickTimeAdjusters onAdjustMinutes={onAdjustMinutes} disabled />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    await user.click(screen.getByTestId(czasIds.quickAdjust(5)));
    expect(onAdjustMinutes).not.toHaveBeenCalled();
  });
});
