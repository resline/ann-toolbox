import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';
import { THEME_STORAGE_KEY, THEMES } from './theme';

// Test consumer component
const TestThemeConsumer: React.FC = () => {
  const { theme, setTheme, cycleTheme, themeConfig, availableThemes } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="theme-name">{themeConfig.name}</span>
      <span data-testid="is-dark">{themeConfig.isDark ? 'dark' : 'light'}</span>
      <span data-testid="available-count">{availableThemes.length}</span>
      <button onClick={() => setTheme('dark-warm')} data-testid="btn-set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme('oled-night')} data-testid="btn-set-oled">
        Set OLED
      </button>
      <button onClick={() => setTheme('sage-calm')} data-testid="btn-set-sage">
        Set Sage
      </button>
      <button onClick={cycleTheme} data-testid="btn-cycle">
        Cycle Theme
      </button>
    </div>
  );
};

describe('ThemeContext & useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('provides default theme "sage-calm" when localStorage is empty', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');
    expect(screen.getByTestId('theme-name')).toHaveTextContent(THEMES['sage-calm'].name);
    expect(screen.getByTestId('is-dark')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('restores theme from localStorage if valid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark-warm');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark-warm');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to "sage-calm" when localStorage has invalid value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-unknown-theme');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);
  });

  it('allows overriding with initialTheme prop', () => {
    render(
      <ThemeProvider initialTheme="oled-night">
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled-night');
    expect(document.documentElement.classList.contains('theme-oled-night')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('updates document classes and localStorage when setTheme is called', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);

    // Switch to dark-warm
    await user.click(screen.getByTestId('btn-set-dark'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark-warm');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark-warm');
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(true);
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Switch to oled-night
    await user.click(screen.getByTestId('btn-set-oled'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled-night');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('oled-night');
    expect(document.documentElement.classList.contains('theme-oled-night')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Switch back to sage-calm
    await user.click(screen.getByTestId('btn-set-sage'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('sage-calm');
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);
    expect(document.documentElement.classList.contains('theme-oled-night')).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('cycles through sage-calm -> dark-warm -> oled-night -> sage-calm', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider initialTheme="sage-calm">
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');

    // 1st cycle: sage-calm -> dark-warm
    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark-warm');
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(true);

    // 2nd cycle: dark-warm -> oled-night
    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('oled-night');
    expect(document.documentElement.classList.contains('theme-oled-night')).toBe(true);

    // 3rd cycle: oled-night -> sage-calm
    await user.click(screen.getByTestId('btn-cycle'));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('sage-calm');
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);
  });

  it('provides availableThemes list with all 3 configured themes', () => {
    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('available-count')).toHaveTextContent('3');
  });

  it('throws an error when useTheme is called outside of ThemeProvider', () => {
    // Suppress console.error in react error boundary for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestThemeConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    consoleSpy.mockRestore();
  });
});
