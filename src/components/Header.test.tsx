import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';
import { ThemeProvider } from '../core/theme/ThemeContext';

describe('Header Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders brand title "Narzędziownik Ani"', () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    );

    expect(screen.getByText('Narzędziownik Ani')).toBeInTheDocument();
  });

  it('shows active tool indicator when inside a tool', () => {
    render(
      <ThemeProvider>
        <Header activeToolId="speaking-clock" />
      </ThemeProvider>
    );

    expect(screen.getByText(/Kotwica Czasu|Głos Czasu/i)).toBeInTheDocument();
  });

  it('triggers onNavigateToHub when Hub/back button or logo is clicked', async () => {
    const user = userEvent.setup();
    const handleNavigate = vi.fn();

    render(
      <ThemeProvider>
        <Header activeToolId="speaking-clock" onNavigateToHub={handleNavigate} />
      </ThemeProvider>
    );

    const backButton = screen.getByRole('button', { name: /wszystkie narzędzia|hub|wróć/i });
    await user.click(backButton);
    expect(handleNavigate).toHaveBeenCalledTimes(1);

    const logoButton = screen.getByRole('button', { name: /narzędziownik ani/i });
    await user.click(logoButton);
    expect(handleNavigate).toHaveBeenCalledTimes(2);
  });

  it('cycles theme when theme switch button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider initialTheme="sage-calm">
        <Header />
      </ThemeProvider>
    );

    const themeButton = screen.getByRole('button', { name: /zmień motyw/i });
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);

    await user.click(themeButton);
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(true);

    await user.click(themeButton);
    expect(document.documentElement.classList.contains('theme-oled-night')).toBe(true);
  });

  it('displays audio active badge when isAudioActive is true', () => {
    const { rerender } = render(
      <ThemeProvider>
        <Header isAudioActive={false} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('audio-active-badge')).not.toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <Header isAudioActive={true} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('audio-active-badge')).toBeInTheDocument();
  });
});
