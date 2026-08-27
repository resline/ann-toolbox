import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeTabs } from './ModeTabs';
import { ClockMode } from '../types';

describe('ModeTabs Component', () => {
  const defaultProps = {
    activeMode: 'continuous' as ClockMode,
    onModeChange: vi.fn(),
  };

  it('renders all 3 clock modes with titles and subtitles', () => {
    render(<ModeTabs {...defaultProps} />);

    expect(screen.getByText('Zegar Ciągły')).toBeInTheDocument();
    expect(screen.getByText('Co N minut')).toBeInTheDocument();

    expect(screen.getByText('Sesja Focus')).toBeInTheDocument();
    expect(screen.getByText('Blok czasu')).toBeInTheDocument();

    expect(screen.getByText('Do Godziny')).toBeInTheDocument();
    expect(screen.getByText('Wyjście / Cel')).toBeInTheDocument();
  });

  it('indicates active mode with aria-selected or aria-pressed', () => {
    const { rerender } = render(<ModeTabs {...defaultProps} activeMode="continuous" />);

    const continuousTab = screen.getByRole('tab', { name: /Zegar Ciągły/i });
    const focusTab = screen.getByRole('tab', { name: /Sesja Focus/i });
    const departureTab = screen.getByRole('tab', { name: /Do Godziny/i });

    expect(continuousTab).toHaveAttribute('aria-selected', 'true');
    expect(focusTab).toHaveAttribute('aria-selected', 'false');
    expect(departureTab).toHaveAttribute('aria-selected', 'false');

    rerender(<ModeTabs {...defaultProps} activeMode="focus" />);
    expect(continuousTab).toHaveAttribute('aria-selected', 'false');
    expect(focusTab).toHaveAttribute('aria-selected', 'true');
    expect(departureTab).toHaveAttribute('aria-selected', 'false');

    rerender(<ModeTabs {...defaultProps} activeMode="departure" />);
    expect(continuousTab).toHaveAttribute('aria-selected', 'false');
    expect(focusTab).toHaveAttribute('aria-selected', 'false');
    expect(departureTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onModeChange when a mode tab is clicked', () => {
    const onModeChange = vi.fn();
    render(<ModeTabs {...defaultProps} onModeChange={onModeChange} activeMode="continuous" />);

    const focusTab = screen.getByRole('tab', { name: /Sesja Focus/i });
    fireEvent.click(focusTab);
    expect(onModeChange).toHaveBeenCalledWith('focus');

    const departureTab = screen.getByRole('tab', { name: /Do Godziny/i });
    fireEvent.click(departureTab);
    expect(onModeChange).toHaveBeenCalledWith('departure');

    const continuousTab = screen.getByRole('tab', { name: /Zegar Ciągły/i });
    fireEvent.click(continuousTab);
    expect(onModeChange).toHaveBeenCalledWith('continuous');
  });

  it('disables all tabs when disabled prop is true', () => {
    const onModeChange = vi.fn();
    render(<ModeTabs {...defaultProps} onModeChange={onModeChange} disabled={true} />);

    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab).toBeDisabled();
      fireEvent.click(tab);
    });

    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('has role="tablist" with accessible label', () => {
    render(<ModeTabs {...defaultProps} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-label');
  });
});
