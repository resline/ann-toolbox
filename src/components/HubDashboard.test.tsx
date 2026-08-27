import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubDashboard } from './HubDashboard';

describe('HubDashboard Component', () => {
  it('renders dashboard heading and description', () => {
    render(<HubDashboard onSelectTool={vi.fn()} />);

    expect(screen.getByText(/Cześć Aniu/i)).toBeInTheDocument();
    expect(screen.getByText(/Głos Czasu/i)).toBeInTheDocument();
    expect(screen.getByText(/Wizualny Timer/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu Dopaminowe/i)).toBeInTheDocument();
    expect(screen.getByText(/Mikro-Zadania/i)).toBeInTheDocument();
  });

  it('allows clicking an available tool (e.g. Głos Czasu) to select it', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<HubDashboard onSelectTool={handleSelect} />);

    const speakingClockCard = screen.getByRole('button', { name: /Głos Czasu/i });
    await user.click(speakingClockCard);

    expect(handleSelect).toHaveBeenCalledWith('speaking-clock');
  });

  it('renders "Wkrótce" badges for coming soon modules and prevents selection', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<HubDashboard onSelectTool={handleSelect} />);

    const comingSoonBadges = screen.getAllByText('Wkrótce');
    expect(comingSoonBadges.length).toBeGreaterThanOrEqual(3);

    // Finding card for visual timer
    const visualTimerCard = screen.getByTestId('tool-card-visual-timer');
    await user.click(visualTimerCard);

    expect(handleSelect).not.toHaveBeenCalledWith('visual-timer');
  });
});
