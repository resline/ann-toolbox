import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DopamineDashboard } from './components/DopamineDashboard';
import { useDopamineMenuStore } from './store';
import '@testing-library/jest-dom/vitest';

describe('Dopamine Module', () => {
  beforeEach(() => {
    useDopamineMenuStore.getState().resetToDefaults();
  });

  it('renders categories (Appetizers, Entrees, Sides, Desserts, Specials)', () => {
    render(<DopamineDashboard />);
    
    expect(screen.getByText('Appetizers')).toBeInTheDocument();
    expect(screen.getByText('Entrees')).toBeInTheDocument();
    expect(screen.getByText('Sides')).toBeInTheDocument();
    expect(screen.getByText('Desserts')).toBeInTheDocument();
    expect(screen.getByText('Specials')).toBeInTheDocument();
  });

  it('filters by energy level buttons', () => {
    render(<DopamineDashboard />);
    
    expect(screen.getByText('Wypij szklankę wody')).toBeInTheDocument();
    expect(screen.getByText('Kreatywne hobby')).toBeInTheDocument();
    
    const filterLowBtn = screen.getByTestId('filter-low');
    fireEvent.click(filterLowBtn);
    
    expect(screen.queryByText('Kreatywne hobby')).not.toBeInTheDocument();
    expect(screen.getByText('Wypij szklankę wody')).toBeInTheDocument();
    
    const filterHighBtn = screen.getByTestId('filter-high');
    fireEvent.click(filterHighBtn);
    
    expect(screen.getByText('Kreatywne hobby')).toBeInTheDocument();
    expect(screen.queryByText('Wypij szklankę wody')).not.toBeInTheDocument();
  });

  it('opens roulette modal and spins', () => {
    vi.useFakeTimers();
    render(<DopamineDashboard />);
    
    const rouletteBtn = screen.getByTestId('roulette-btn');
    fireEvent.click(rouletteBtn);
    
    expect(screen.getByText('Dopamine Roulette')).toBeInTheDocument();
    
    const spinBtn = screen.getByText('Zakręć kołem!');
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
});
