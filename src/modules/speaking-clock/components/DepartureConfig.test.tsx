import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DepartureConfig } from './DepartureConfig';
import { DepartureSettings } from '../types';

describe('DepartureConfig Component', () => {
  const initialSettings: DepartureSettings = {
    targetTime: '08:30',
    label: 'Wyjście z domu',
    smartDensity: true,
  };

  const defaultProps = {
    settings: initialSettings,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0)); // 10:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Time Picker & Target Time', () => {
    it('renders time input with current targetTime value', () => {
      render(<DepartureConfig {...defaultProps} />);
      const timeInput = screen.getByLabelText(/Godzina docelowa/i);
      expect(timeInput).toHaveValue('08:30');
    });

    it('calls onChange with updated targetTime when time input changes', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const timeInput = screen.getByLabelText(/Godzina docelowa/i);
      fireEvent.change(timeInput, { target: { value: '14:45' } });

      expect(onChange).toHaveBeenCalledWith({ targetTime: '14:45' });
    });
  });

  describe('Quick Relative Time Buttons', () => {
    it('computes now + 15 min on clicking "+15 min"', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const plus15Btn = screen.getByRole('button', { name: /\+15 min/i });
      fireEvent.click(plus15Btn);

      expect(onChange).toHaveBeenCalledWith({ targetTime: '10:15' });
    });

    it('computes now + 30 min on clicking "+30 min"', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const plus30Btn = screen.getByRole('button', { name: /\+30 min/i });
      fireEvent.click(plus30Btn);

      expect(onChange).toHaveBeenCalledWith({ targetTime: '10:30' });
    });

    it('computes now + 45 min on clicking "+45 min"', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const plus45Btn = screen.getByRole('button', { name: /\+45 min/i });
      fireEvent.click(plus45Btn);

      expect(onChange).toHaveBeenCalledWith({ targetTime: '10:45' });
    });

    it('computes now + 1 hour on clicking "+1 godz."', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const plus1hBtn = screen.getByRole('button', { name: /\+1 godz/i });
      fireEvent.click(plus1hBtn);

      expect(onChange).toHaveBeenCalledWith({ targetTime: '11:00' });
    });

    it('correctly handles midnight rollover for relative buttons', () => {
      vi.setSystemTime(new Date(2026, 7, 27, 23, 45, 0)); // 23:45
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const plus30Btn = screen.getByRole('button', { name: /\+30 min/i });
      fireEvent.click(plus30Btn);

      expect(onChange).toHaveBeenCalledWith({ targetTime: '00:15' });
    });
  });

  describe('Tag Presets & Custom Label', () => {
    it('renders all tag presets and marks active preset', () => {
      render(<DepartureConfig {...defaultProps} />);

      const presets = [
        'Wyjście z domu',
        'Spotkanie',
        'Pociąg / Autobus',
        'Leki',
        'Gotowanie',
        'Przerwa',
      ];

      presets.forEach((preset) => {
        expect(screen.getByRole('button', { name: new RegExp(preset, 'i') })).toBeInTheDocument();
      });

      const activePreset = screen.getByRole('button', { name: /Wyjście z domu/i });
      expect(activePreset).toHaveAttribute('aria-pressed', 'true');

      const inactivePreset = screen.getByRole('button', { name: /Spotkanie/i });
      expect(inactivePreset).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onChange with preset label when preset button is clicked', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const meetingBtn = screen.getByRole('button', { name: /Spotkanie/i });
      fireEvent.click(meetingBtn);

      expect(onChange).toHaveBeenCalledWith({ label: 'Spotkanie' });
    });

    it('updates custom label via text input', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} />);

      const labelInput = screen.getByPlaceholderText(/Wpisz własny cel|Nazwa celu/i);
      fireEvent.change(labelInput, { target: { value: 'Wizyta u dentysty' } });

      expect(onChange).toHaveBeenCalledWith({ label: 'Wizyta u dentysty' });
    });

    it('focuses the custom label input when "Własna..." button is clicked', () => {
      render(<DepartureConfig {...defaultProps} />);

      const customBtn = screen.getByRole('button', { name: /Własna\.\.\./i });
      const labelInput = screen.getByPlaceholderText(/Wpisz własny cel|Nazwa celu/i);

      fireEvent.click(customBtn);
      expect(document.activeElement).toBe(labelInput);
    });
  });

  describe('Smart Density Toggle', () => {
    it('renders smart density toggle with explanation text', () => {
      render(<DepartureConfig {...defaultProps} />);

      expect(
        screen.getByText(/Inteligentne zagęszczanie/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/częściej przed wyjściem/i)
      ).toBeInTheDocument();
    });

    it('calls onChange with inverted smartDensity when toggle is clicked', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <DepartureConfig
          {...defaultProps}
          settings={{ ...initialSettings, smartDensity: true }}
          onChange={onChange}
        />
      );

      const toggle = screen.getByRole('switch', { name: /Inteligentne zagęszczanie/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith({ smartDensity: false });

      rerender(
        <DepartureConfig
          {...defaultProps}
          settings={{ ...initialSettings, smartDensity: false }}
          onChange={onChange}
        />
      );
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith({ smartDensity: true });
    });
  });

  describe('Disabled state', () => {
    it('disables all inputs, buttons, and switches when disabled is true', () => {
      const onChange = vi.fn();
      render(<DepartureConfig {...defaultProps} onChange={onChange} disabled={true} />);

      const timeInput = screen.getByLabelText(/Godzina docelowa/i);
      expect(timeInput).toBeDisabled();

      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
      });

      const toggle = screen.getByRole('switch', { name: /Inteligentne zagęszczanie/i });
      expect(toggle).toBeDisabled();
      fireEvent.click(toggle);

      const labelInput = screen.getByPlaceholderText(/Wpisz własny cel|Nazwa celu/i);
      expect(labelInput).toBeDisabled();

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
