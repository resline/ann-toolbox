import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { THEME_STORAGE_KEY, THEMES, resolveStoredTheme } from './theme';

const TestThemeConsumer: React.FC = () => {
  const { theme, setTheme, cycleTheme, themeConfig, availableThemes } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="theme-name">{themeConfig.name}</span>
      <span data-testid="is-dark">{themeConfig.isDark ? 'dark' : 'light'}</span>
      <span data-testid="available-count">{availableThemes.length}</span>
      <button onClick={() => setTheme('dusk')} data-testid="btn-set-dusk">
        dusk
      </button>
      <button onClick={() => setTheme('oled')} data-testid="btn-set-oled">
        oled
      </button>
      <button onClick={() => setTheme('day')} data-testid="btn-set-day">
        day
      </button>
      <button onClick={cycleTheme} data-testid="btn-cycle">
        cycle
      </button>
    </div>
  );
};

const themeOf = () => document.documentElement.dataset.theme;
const hasLegacyDarkClass = () => document.documentElement.classList.contains('dark');

describe('ThemeContext & useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
  });

  it('domyślnie ustawia motyw dzienny, gdy nic nie jest zapisane', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('day');
    expect(screen.getByTestId('theme-name')).toHaveTextContent(THEMES.day.name);
    expect(screen.getByTestId('is-dark')).toHaveTextContent('light');
    expect(themeOf()).toBe('day');
    expect(hasLegacyDarkClass()).toBe(false);
  });

  it('przywraca zapisany motyw', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dusk');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dusk');
    expect(themeOf()).toBe('dusk');
    expect(hasLegacyDarkClass()).toBe(false);
  });

  it('wraca do motywu dziennego przy nieznanej wartości', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'nie-taki-motyw');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('day');
  });

  it('honoruje initialTheme przekazany propsem', () => {
    render(
      <ThemeProvider initialTheme="oled">
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled');
    expect(themeOf()).toBe('oled');
    expect(hasLegacyDarkClass()).toBe(false);
  });

  it('setTheme aktualizuje atrybut na <html> i zapis', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('btn-set-dusk'));
    expect(themeOf()).toBe('dusk');
    expect(hasLegacyDarkClass()).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dusk');

    await user.click(screen.getByTestId('btn-set-day'));
    expect(themeOf()).toBe('day');
    expect(hasLegacyDarkClass()).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('day');
  });

  it('cykl przechodzi day -> dusk -> oled -> day', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('day');

    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dusk');
    expect(themeOf()).toBe('dusk');

    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled');
    expect(themeOf()).toBe('oled');

    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('day');
    expect(themeOf()).toBe('day');
  });

  it('udostępnia listę wszystkich trzech motywów', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('available-count')).toHaveTextContent('3');
  });

  it('useTheme poza providerem rzuca błąd', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestThemeConsumer />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});

describe('migracja motywów sprzed rebrandingu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
  });

  it.each([
    ['sage-calm', 'day'],
    ['dark-warm', 'dusk'],
    ['oled-night', 'oled'],
  ])('resolveStoredTheme tłumaczy %s na %s', (legacy, expected) => {
    expect(resolveStoredTheme(legacy)).toBe(expected);
  });

  it('resolveStoredTheme zwraca null dla wartości nieznanej', () => {
    expect(resolveStoredTheme('cokolwiek')).toBeNull();
    expect(resolveStoredTheme(null)).toBeNull();
    expect(resolveStoredTheme(42)).toBeNull();
  });

  it('zapisany stary motyw jest odtworzony, a nie zresetowany do domyślnego', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'oled-night');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled');
    expect(themeOf()).toBe('oled');
  });

  it('po migracji zapis jest przepisany na nowy identyfikator', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark-warm');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dusk');
  });
});
