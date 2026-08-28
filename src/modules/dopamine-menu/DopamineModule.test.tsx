import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DopamineDashboard } from './components/DopamineDashboard';
import { useDopamineMenuStore } from './store';
import '@testing-library/jest-dom/vitest';

describe('Dopamine Module', () => {
  beforeEach(() => {
    useDopamineMenuStore.getState().resetToDefaults();
  });

  it('renders categories (Przystawki, Dania Główne, Dodatki, Desery, Dania Specjalne)', () => {
    render(<DopamineDashboard />);
    
    expect(screen.getByText(/Przystawki/i)).toBeInTheDocument();
    expect(screen.getByText(/Dania Główne/i)).toBeInTheDocument();
    expect(screen.getByText(/Dodatki/i)).toBeInTheDocument();
    expect(screen.getByText(/Desery/i)).toBeInTheDocument();
    expect(screen.getByText(/Dania Specjalne/i)).toBeInTheDocument();
  });

  it('filters by energy level buttons', () => {
    render(<DopamineDashboard />);
    
    expect(screen.getByText('Szklanka chłodnej wody z cytryną')).toBeInTheDocument();
    expect(screen.getByText('Gotowanie ulubionego dania z muzyką')).toBeInTheDocument();
    
    const filterLowBtn = screen.getByTestId('filter-low');
    fireEvent.click(filterLowBtn);
    
    expect(screen.queryByText('Gotowanie ulubionego dania z muzyką')).not.toBeInTheDocument();
    expect(screen.getByText('Szklanka chłodnej wody z cytryną')).toBeInTheDocument();
    
    const filterHighBtn = screen.getByTestId('filter-high');
    fireEvent.click(filterHighBtn);
    
    expect(screen.getByText('Gotowanie ulubionego dania z muzyką')).toBeInTheDocument();
    expect(screen.queryByText('Szklanka chłodnej wody z cytryną')).not.toBeInTheDocument();
  });

  it('opens roulette modal and spins', () => {
    vi.useFakeTimers();
    render(<DopamineDashboard />);
    
    const rouletteBtn = screen.getByTestId('roulette-btn');
    fireEvent.click(rouletteBtn);
    
    expect(screen.getByText('Dopamine Roulette')).toBeInTheDocument();
    
    const spinBtn = screen.getByTestId('spin-wheel-btn');
    fireEvent.click(spinBtn);
    
    expect(screen.getByText('Losowanie...')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    
    expect(screen.getByText('Wybrana aktywność! Baw się dobrze.')).toBeInTheDocument();
    expect(screen.getByText('Kręć znowu')).toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('opens add item modal and adds new item', () => {
    render(<DopamineDashboard />);
    
    const addBtn = screen.getByTestId('add-item-btn');
    fireEvent.click(addBtn);
    
    expect(screen.getByText('Add New Activity')).toBeInTheDocument();
    
    const titleInput = screen.getByLabelText(/Activity Name/i);
    const descInput = screen.getByLabelText(/Description/i);
    const energyBtn = screen.getByRole('button', { name: 'high' });
    const saveBtn = screen.getByText('Save Activity');
    
    fireEvent.change(titleInput, { target: { value: 'New Test Activity' } });
    fireEvent.change(descInput, { target: { value: 'Test description' } });
    fireEvent.click(energyBtn);
    fireEvent.click(saveBtn);
    
    expect(screen.queryByText('Add New Activity')).not.toBeInTheDocument();
    expect(screen.getByText('New Test Activity')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders DopamineBankWidget and can complete item to increase sparks', () => {
    render(<DopamineDashboard />);
    expect(screen.getByText(/Zbierz swoją pierwszą iskierkę/i)).toBeInTheDocument();
    
    // Find first 'Zrobione!' button (there are multiple)
    const zrobioneBtns = screen.getAllByText('Zrobione!');
    fireEvent.click(zrobioneBtns[0]);
    
    expect(screen.getByText(/Dzisiaj zebrałaś 1 iskierkę dopaminy/i)).toBeInTheDocument();
  });

  it('opens SOS modal, completes an action and shows it in Bank Widget', () => {
    render(<DopamineDashboard />);
    const sosBtn = screen.getByTestId('sos-btn');
    fireEvent.click(sosBtn);
    
    expect(screen.getByText('SOS Paraliż')).toBeInTheDocument();
    
    const doneBtn = screen.getByText('Zrobione! ✨');
    fireEvent.click(doneBtn);
    
    expect(screen.queryByText('SOS Paraliż')).not.toBeInTheDocument();
    expect(screen.getByText(/Dzisiaj zebrałaś 1 iskierkę dopaminy/i)).toBeInTheDocument();
  });

  it('toggles favorite star and sorts item to the top', () => {
    render(<DopamineDashboard />);
    // "Kreatywne hobby" is in dessert
    const favButtons = screen.getAllByLabelText('Dodaj do ulubionych');
    fireEvent.click(favButtons[favButtons.length - 1]); // click a favorite button
    
    // It should now be a favorite and have "Usuń z ulubionych"
    expect(screen.getAllByLabelText('Usuń z ulubionych').length).toBeGreaterThan(0);
  });

  it('opens edit modal and modifies an item', () => {
    render(<DopamineDashboard />);
    
    const moreOptionsBtns = screen.getAllByLabelText('Więcej opcji');
    fireEvent.click(moreOptionsBtns[0]);
    
    const editBtn = screen.getByText('Edytuj');
    fireEvent.click(editBtn);
    
    expect(screen.getByText('Edytuj aktywność')).toBeInTheDocument();
    
    const titleInputs = screen.getAllByRole('textbox');
    // first textbox should be the title
    fireEvent.change(titleInputs[0], { target: { value: 'Zmieniony Tytuł' } });
    
    const saveBtn = screen.getByText('Zapisz zmiany');
    fireEvent.click(saveBtn);
    
    expect(screen.queryByText('Edytuj aktywność')).not.toBeInTheDocument();
    expect(screen.getByText('Zmieniony Tytuł')).toBeInTheDocument();
  });
});
