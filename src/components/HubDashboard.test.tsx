import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubDashboard } from './HubDashboard';

describe('HubDashboard Component', () => {
  it('renders dashboard heading and description', () => {
    render(<HubDashboard onSelectTool={vi.fn()} />);

    expect(screen.getByText(/Cześć Aniu/i)).toBeInTheDocument();
    expect(screen.getByText(/Kotwica Czasu|Głos Czasu/i)).toBeInTheDocument();
    expect(screen.getByText(/Wizualny Timer/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu Dopaminowe/i)).toBeInTheDocument();
    expect(screen.getByText(/Mikro-Zadania/i)).toBeInTheDocument();
  });

  it('allows clicking an available tool (e.g. Kotwica Czasu) to select it', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<HubDashboard onSelectTool={handleSelect} />);

    const speakingClockCard = screen.getByRole('button', { name: /Kotwica Czasu|Głos Czasu/i });
    await user.click(speakingClockCard);

    expect(handleSelect).toHaveBeenCalledWith('speaking-clock');
  });

  it('allows clicking visual timer since it is available now', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(<HubDashboard onSelectTool={handleSelect} />);

    const activeBadges = screen.getAllByText('Aktywny');
    expect(activeBadges.length).toBeGreaterThanOrEqual(4);

    const visualTimerCard = screen.getByRole('button', { name: /Wizualny Timer/i });
    await user.click(visualTimerCard);

    expect(handleSelect).toHaveBeenCalledWith('visual-timer');
  });
});
