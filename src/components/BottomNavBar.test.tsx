import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavBar } from './BottomNavBar';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('BottomNavBar', () => {
  const mockOnSelectTool = vi.fn();

  beforeEach(() => {
    mockOnSelectTool.mockClear();
  });

  it('renders all 5 navigation buttons', () => {
    render(<BottomNavBar activeToolId="hub" onSelectTool={mockOnSelectTool} />);
    
    expect(screen.getByLabelText('Hub')).toBeInTheDocument();
    expect(screen.getByLabelText('Kotwica')).toBeInTheDocument();
    expect(screen.getByLabelText('Timer')).toBeInTheDocument();
    expect(screen.getByLabelText('Dopamina')).toBeInTheDocument();
    expect(screen.getByLabelText('Zadania')).toBeInTheDocument();
  });

  it('calls onSelectTool when clicking items', () => {
    render(<BottomNavBar activeToolId="hub" onSelectTool={mockOnSelectTool} />);
    
    fireEvent.click(screen.getByLabelText('Timer'));
    expect(mockOnSelectTool).toHaveBeenCalledWith('visual-timer');
    expect(mockOnSelectTool).toHaveBeenCalledTimes(1);
  });

  it('highlights active item with aria-current styles', () => {
    render(<BottomNavBar activeToolId="speaking-clock" onSelectTool={mockOnSelectTool} />);
    
    const hubButton = screen.getByLabelText('Hub');
    const clockButton = screen.getByLabelText('Kotwica');
    
    expect(clockButton).toHaveAttribute('aria-current', 'page');
    expect(clockButton.className).toContain('bg-sage-100');
    
    expect(hubButton).not.toHaveAttribute('aria-current');
    expect(hubButton.className).not.toContain('bg-sage-100');
  });
});
