import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

import * as speechService from './modules/speaking-clock/services/speechService';

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.spyOn(speechService, 'getPolishVoices').mockResolvedValue([]);
  });

  it('renders application with header and default view (Głos Czasu)', async () => {
    render(<App />);

    expect(screen.getByText('Narzędziownik Ani')).toBeInTheDocument();
    // Speaking clock elements should be present
    expect(await screen.findByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('allows navigating to Hub dashboard and back to Speaking Clock', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click Hub / back button in Header
    const hubButton = screen.getByRole('button', { name: /wszystkie narzędzia|hub|wróć/i });
    await user.click(hubButton);

    // Should now be on HubDashboard
    expect(screen.getByText(/Cześć Aniu/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu Dopaminowe/i)).toBeInTheDocument();

    // Click "Głos Czasu" card in Hub
    const speakingClockCard = screen.getByRole('button', { name: /Głos Czasu/i });
    await user.click(speakingClockCard);

    // Should return to SpeakingClock view
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('switches theme through header theme button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const themeButton = screen.getByRole('button', { name: /zmień motyw/i });
    expect(document.documentElement.classList.contains('theme-sage-calm')).toBe(true);

    await user.click(themeButton);
    expect(document.documentElement.classList.contains('theme-dark-warm')).toBe(true);
  });

  it('handles PWA beforeinstallprompt event and shows install banner', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initially no install banner
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();

    // Simulate beforeinstallprompt event
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt') as any;
    installEvent.prompt = promptMock;
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    fireEvent(window, installEvent);

    // Install banner should appear
    await waitFor(() => {
      expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    });

    const installButton = screen.getByRole('button', { name: /zainstaluj/i });
    await user.click(installButton);

    expect(promptMock).toHaveBeenCalledTimes(1);

    // Banner should disappear after prompt accepted
    await waitFor(() => {
      expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    });
  });

  it('allows dismissing PWA install banner', async () => {
    const user = userEvent.setup();
    render(<App />);

    const installEvent = new Event('beforeinstallprompt') as any;
    installEvent.prompt = vi.fn();
    installEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    fireEvent(window, installEvent);

    await waitFor(() => {
      expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole('button', { name: /pomiń|ukryj|zamknij/i });
    await user.click(dismissButton);

    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });
});
