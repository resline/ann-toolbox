import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeTimerDisc } from './TimeTimerDisc';
import { type TimeTimerColor } from '../types';

describe('TimeTimerDisc Component', () => {
  describe('Rendering and SVG Structure', () => {
    it('renders SVG disc container with progressbar role and accessibility attributes', () => {
      render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          centerLabel="Pozostało"
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '1800');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '3600');
      expect(progressbar).toHaveAttribute('aria-label', 'Pozostało');
    });

    it('renders SVG element with customized size', () => {
      const { container } = render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          size={320}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
    });
  });

  describe('Sector Arc Generation', () => {
    it('renders full circle when secondsRemaining === totalSeconds (100%)', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={3600} />
      );

      const fullCircle = container.querySelector('.time-timer-full-disc');
      expect(fullCircle).toBeInTheDocument();
      expect(container.querySelector('.time-timer-sector')).toBeNull();
    });

    it('renders sector path when 0 < secondsRemaining < totalSeconds (50%)', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} />
      );

      const sector = container.querySelector('.time-timer-sector');
      expect(sector).toBeInTheDocument();
      const pathData = sector?.getAttribute('d');
      expect(pathData).toBeDefined();
      expect(pathData).toContain('M 150 150');
      // Starts at 12 o'clock (150, 150 - r)
      expect(pathData).toContain('L 150');
    });

    it('renders sector path with largeArcFlag = 0 for <= 50% fraction', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={900} /> // 25%
      );

      const sector = container.querySelector('.time-timer-sector');
      expect(sector).toBeInTheDocument();
      const pathData = sector?.getAttribute('d');
      // largeArcFlag should be 0 for <= 50%
      expect(pathData).toMatch(/A\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s+0\s+0\s+0/);
    });

    it('renders sector path with largeArcFlag = 1 for > 50% fraction', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={2700} /> // 75%
      );

      const sector = container.querySelector('.time-timer-sector');
      expect(sector).toBeInTheDocument();
      const pathData = sector?.getAttribute('d');
      // largeArcFlag should be 1 for > 50%
      expect(pathData).toMatch(/A\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s+0\s+1\s+0/);
    });

    it('renders empty state when secondsRemaining === 0', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={0} />
      );

      expect(container.querySelector('.time-timer-full-disc')).toBeNull();
      expect(container.querySelector('.time-timer-sector')).toBeNull();
    });

    it('clamps negative secondsRemaining to 0 and does not render sector', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={-50} />
      );

      expect(container.querySelector('.time-timer-full-disc')).toBeNull();
      expect(container.querySelector('.time-timer-sector')).toBeNull();
    });

    it('clamps secondsRemaining > totalSeconds to 100% and renders full disc', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={4000} />
      );

      expect(container.querySelector('.time-timer-full-disc')).toBeInTheDocument();
    });

    it('supports clockwise direction', () => {
      const { container } = render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={900}
          direction="clockwise"
        />
      );

      const sector = container.querySelector('.time-timer-sector');
      expect(sector).toBeInTheDocument();
      const pathData = sector?.getAttribute('d');
      // Sweep flag for clockwise is 1
      expect(pathData).toMatch(/A\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s+0\s+0\s+1/);
    });
  });

  describe('Color Palettes', () => {
    const colors: TimeTimerColor[] = ['sage', 'amber', 'lavender', 'rose', 'ocean'];

    colors.forEach((color) => {
      it(`renders color palette "${color}" with gradient definition`, () => {
        const { container } = render(
          <TimeTimerDisc
            totalSeconds={3600}
            secondsRemaining={1800}
            color={color}
          />
        );

        const gradient = container.querySelector(`linearGradient[id*="${color}"]`);
        expect(gradient).toBeInTheDocument();
        const sector = container.querySelector('.time-timer-sector');
        expect(sector?.getAttribute('fill')).toContain(color);
      });
    });

    it('defaults to sage color when color prop is omitted', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} />
      );

      const sector = container.querySelector('.time-timer-sector');
      expect(sector?.getAttribute('fill')).toContain('sage');
    });
  });

  describe('Dial Ticks and Rim Numbers', () => {
    it('renders 60 dial tick marks', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} />
      );

      const majorTicks = container.querySelectorAll('.time-timer-major-tick');
      const minorTicks = container.querySelectorAll('.time-timer-minor-tick');

      expect(majorTicks.length).toBe(12); // Every 5 minutes
      expect(minorTicks.length).toBe(48); // Remaining 48 minutes
      expect(majorTicks.length + minorTicks.length).toBe(60);
    });

    it('renders rim numbers (0, 5, 10 ... 55) by default (showNumbers=true)', () => {
      render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} showNumbers={true} />
      );

      const numbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      numbers.forEach((num) => {
        expect(screen.getByText(String(num))).toBeInTheDocument();
      });
    });

    it('hides rim numbers when showNumbers=false', () => {
      const { container } = render(
        <TimeTimerDisc totalSeconds={3600} secondsRemaining={1800} showNumbers={false} />
      );

      const rimTextGroup = container.querySelector('.time-timer-rim-numbers');
      expect(rimTextGroup).toBeNull();
    });
  });

  describe('Center Readout Overlay & Content', () => {
    it('renders center digital time text, label, and sublabel', () => {
      render(
        <TimeTimerDisc
          totalSeconds={1800}
          secondsRemaining={1200}
          centerTimeText="20:00"
          centerLabel="Do wyjścia"
          centerSublabel="Wyjście z domu"
        />
      );

      expect(screen.getByText('20:00')).toBeInTheDocument();
      expect(screen.getByText('Do wyjścia')).toBeInTheDocument();
      expect(screen.getByText('Wyjście z domu')).toBeInTheDocument();
    });

    it('renders subtle active pulse indicator when isActive=true', () => {
      const { container } = render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          isActive={true}
        />
      );

      const activeRing = container.querySelector('.time-timer-active-pulse');
      expect(activeRing).toBeInTheDocument();
    });

    it('does not render active pulse when isActive=false', () => {
      const { container } = render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          isActive={false}
        />
      );

      const activeRing = container.querySelector('.time-timer-active-pulse');
      expect(activeRing).toBeNull();
    });
  });

  describe('Interactions and Accessibility', () => {
    it('triggers onDiscClick when clicked', () => {
      const onDiscClick = vi.fn();
      render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          onDiscClick={onDiscClick}
        />
      );

      const disc = screen.getByRole('progressbar');
      fireEvent.click(disc);
      expect(onDiscClick).toHaveBeenCalledTimes(1);
    });

    it('triggers onDiscClick on Enter or Space keyboard keypress', () => {
      const onDiscClick = vi.fn();
      render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          onDiscClick={onDiscClick}
        />
      );

      const disc = screen.getByRole('progressbar');
      fireEvent.keyDown(disc, { key: 'Enter', code: 'Enter' });
      expect(onDiscClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(disc, { key: ' ', code: 'Space' });
      expect(onDiscClick).toHaveBeenCalledTimes(2);
    });

    it('has tabindex 0 when onDiscClick is provided, and undefined / not focusable when not interactive', () => {
      const { rerender } = render(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
          onDiscClick={() => {}}
        />
      );

      expect(screen.getByRole('progressbar')).toHaveAttribute('tabindex', '0');

      rerender(
        <TimeTimerDisc
          totalSeconds={3600}
          secondsRemaining={1800}
        />
      );

      expect(screen.getByRole('progressbar')).not.toHaveAttribute('tabindex');
    });
  });
});
