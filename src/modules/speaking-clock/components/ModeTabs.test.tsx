import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeTabs } from './ModeTabs';
import { czasIds } from '../testIds';

describe('ModeTabs', () => {
  it('renderuje trzy tryby jako listę zakładek', () => {
    render(<ModeTabs activeMode="continuous" onModeChange={vi.fn()} />);

    expect(screen.getByRole('tablist')).toHaveAccessibleName();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    for (const mode of ['continuous', 'focus', 'departure']) {
      expect(screen.getByTestId(czasIds.modeTab(mode))).toBeInTheDocument();
    }
  });

  it('oznacza aktywny tryb', () => {
    render(<ModeTabs activeMode="focus" onModeChange={vi.fn()} />);

    expect(screen.getByTestId(czasIds.modeTab('focus'))).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId(czasIds.modeTab('continuous'))).toHaveAttribute('aria-selected', 'false');
  });

  it('zgłasza zmianę trybu po kliknięciu', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<ModeTabs activeMode="continuous" onModeChange={onModeChange} />);

    await user.click(screen.getByTestId(czasIds.modeTab('departure')));
    expect(onModeChange).toHaveBeenCalledWith('departure');
  });

  it('pozwala przechodzić między trybami klawiaturą', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<ModeTabs activeMode="continuous" onModeChange={onModeChange} />);

    screen.getByTestId(czasIds.modeTab('continuous')).focus();
    await user.keyboard('{ArrowRight}');

    expect(onModeChange).toHaveBeenCalledWith('focus');
  });

  it('blokuje przełączanie, gdy zegar pracuje', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<ModeTabs activeMode="continuous" onModeChange={onModeChange} disabled />);

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toBeDisabled();
    }

    await user.click(screen.getByTestId(czasIds.modeTab('focus')));
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('mieści wszystkie trzy tryby w jednym rzędzie na każdej szerokości', () => {
    render(<ModeTabs activeMode="continuous" onModeChange={vi.fn()} />);
    // trzy równe kolumny bez breakpointu — wcześniej do `sm` układały się pionowo,
    // przez co tarcza schodziła poniżej zgięcia ekranu
    const list = screen.getByRole('tablist');
    expect(list).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
  });
});
