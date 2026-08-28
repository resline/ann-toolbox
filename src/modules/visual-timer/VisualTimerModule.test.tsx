import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VisualTimerModule } from './components/VisualTimerModule';

describe('VisualTimerModule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render multi-phase circular timer disc', () => {
    render(<VisualTimerModule />);
    // Initial state check
    expect(screen.getByText('focus')).toBeInTheDocument();
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('of 25m')).toBeInTheDocument();
  });

  it('should switch mode between Timer and Breathing Circle', () => {
    render(<VisualTimerModule />);
    
    // Timer is active by default
    expect(screen.getByText('focus')).toBeInTheDocument();
    
    const toggleBtn = screen.getByRole('button', { name: /Breathe/i });
    
    // Switch to Breathing
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Wybierz technikę i naciśnij Start')).toBeInTheDocument();
    expect(screen.queryByText('focus')).not.toBeInTheDocument();
    
    // Button changed to Timer
    const backBtn = screen.getByRole('button', { name: /Timer/i });
    
    // Switch back to Timer
    fireEvent.click(backBtn);
    expect(screen.getByText('focus')).toBeInTheDocument();
  });

  it('should test ambience controls toggle and sliders', () => {
    render(<VisualTimerModule />);
    
    expect(screen.getByText('Tło Dźwiękowe')).toBeInTheDocument();
    
    const rainBtn = screen.getByRole('button', { name: /Deszcz/i });
    expect(rainBtn.getAttribute('aria-pressed')).toBe('false');
    
    fireEvent.click(rainBtn);
    expect(rainBtn.getAttribute('aria-pressed')).toBe('true');
    
    // Untoggle
    fireEvent.click(rainBtn);
    expect(rainBtn.getAttribute('aria-pressed')).toBe('false');
    
    const volumeSlider = screen.getByRole('slider', { name: /Volume/i });
    expect(volumeSlider).toHaveValue('50');
    
    fireEvent.change(volumeSlider, { target: { value: '80' } });
    expect(volumeSlider).toHaveValue('80');
  });

  it('should test timer controls (Start, Pause, Reset)', async () => {
    render(<VisualTimerModule />);
    
    const toggleTimerBtn = screen.getByLabelText('Start timer');
    
    // Start the timer
    fireEvent.click(toggleTimerBtn);
    
    // Now it should show 'Pause timer' as aria-label
    expect(screen.getByLabelText('Pause timer')).toBeInTheDocument();
    
    // The button has a span with 'Pause'
    // There might be multiple 'Pause' elements or it might be within the same button
    
    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Verify time has ticked down
    expect(screen.getByText('24:59')).toBeInTheDocument();
    
    // Pause the timer
    const pauseBtn = screen.getByLabelText('Pause timer');
    fireEvent.click(pauseBtn);
    
    // Verify it changed back to Start
    expect(screen.getByLabelText('Start timer')).toBeInTheDocument();
    
    // Reset timer
    const resetBtn = screen.getByRole('button', { name: /Reset timer/i });
    fireEvent.click(resetBtn);
    
    // Time is back to 25:00
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
