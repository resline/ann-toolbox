import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubDashboard } from './HubDashboard';

describe('HubDashboard Component', () => {
  it('renders dashboard heading and description', () => {
    render(<HubDashboard onSelectTool={vi.fn()} />);

    expect(screen.getByText(/Witaj w swojej spokojnej przestrzeni, Aniu ✨/i)).toBeInTheDocument();
    expect(screen.getByText(/Wybierz narzędzie dopasowane do tego, czego teraz potrzebujesz./i)).toBeInTheDocument();
  });

  it('renders quick help cards and triggers onSelectTool with correct IDs', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<HubDashboard onSelectTool={handleSelect} />);

    const microTasksBtn = screen.getByRole('button', { name: /Mam paraliż zadaniowy/i });
    await user.click(microTasksBtn);
    expect(handleSelect).toHaveBeenCalledWith('micro-tasks');

    const clockBtn = screen.getByRole('button', { name: /Gubię poczucie czasu/i });
    await user.click(clockBtn);
    expect(handleSelect).toHaveBeenCalledWith('speaking-clock');

    const dopamineBtn = screen.getByRole('button', { name: /Brak mi energii i chęci/i });
    await user.click(dopamineBtn);
    expect(handleSelect).toHaveBeenCalledWith('dopamine-menu');
  });

  it('renders all tool cards and allows clicking their "Otwórz moduł" buttons', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<HubDashboard onSelectTool={handleSelect} />);

    expect(screen.getByText(/Kotwica Czasu/i)).toBeInTheDocument();
    expect(screen.getByText(/Wizualny Timer/i)).toBeInTheDocument();
    expect(screen.getByText(/Menu Dopaminowe/i)).toBeInTheDocument();
    expect(screen.getByText(/Mikro-Zadania/i)).toBeInTheDocument();

    const openButtons = screen.getAllByRole('button', { name: /Otwórz moduł/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(4);

    await user.click(openButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith('speaking-clock');
    
    await user.click(openButtons[1]);
    expect(handleSelect).toHaveBeenCalledWith('visual-timer');
  });
});
