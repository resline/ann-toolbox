import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, Sparkles, Star } from '../../../lib/icons';
import { dur, ease, useMotionPreference } from '../../../lib/motion';
import { Heading, Text } from '../../../components/ui';
import { start } from '../../../copy';
import { startIds } from '../testIds';

export interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  message?: string;
}

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/** Arpeggio C-E-G-C. Jedyne miejsce w aplikacji, któremu wolno się cieszyć. */
const playVictoryChime = () => {
  try {
    const scoped = window as WebkitWindow;
    const AudioContextClass = window.AudioContext || scoped.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playNote(523.25, 0, 0.4);
    playNote(659.25, 0.15, 0.4);
    playNote(783.99, 0.3, 0.4);
    playNote(1046.5, 0.5, 0.8);
  } catch {
    /* przeglądarka bez Web Audio albo zablokowany dźwięk — świętujemy w ciszy */
  }
};

interface Floater {
  left: number;
  top: number;
  delay: number;
  duration: number;
}

function scatter(count: number, seedOffset: number): Floater[] {
  return Array.from({ length: count }, (_, i) => ({
    left: ((i * 37 + seedOffset * 13) % 92) + 4,
    top: ((i * 53 + seedOffset * 29) % 84) + 8,
    delay: (i % 5) * 0.18,
    duration: 3 + (i % 4) * 0.7,
  }));
}

/**
 * Świętowanie po ostatnim kroku.
 *
 * Ruch idzie przez framer-motion, a nie przez wstrzykiwany <style> — tamta
 * wersja dokładała @keyframes do <head> przy każdym renderze. Przy ograniczonym
 * ruchu zostaje samo potwierdzenie: karta, dźwięk, zero latających rzeczy.
 *
 * Warstwa jest niemodalna (pointer-events-none), więc świadomie nie idzie przez
 * Sheet — pułapka fokusu odcięłaby ekran na cztery sekundy. Stąd jedyne w module
 * ręczne `fixed inset-0`. Bez szkła i bez rozmycia: tło zostaje widoczne, a całą
 * radość niesie karta i garść gwiazdek.
 */
export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isVisible,
  onComplete,
  message = start.celebration.message,
}) => {
  const { reduced } = useMotionPreference();

  // Rozrzut liczony raz — inaczej każdy render przestawiałby gwiazdki.
  const stars = useMemo(() => scatter(10, 1), []);
  const sparks = useMemo(() => scatter(5, 2), []);

  /**
   * Wywołanie zwrotne trzymane w ref, a nie w zależnościach efektu.
   *
   * Moduł podaje tu funkcję tworzoną przy każdym renderze. Gdyby siedziała
   * w zależnościach, dowolne kliknięcie w trakcie świętowania (warstwa jest
   * przepuszczalna, więc ekran startowy pod nią żyje) sprzątałoby odliczanie
   * i puszczało fanfarę drugi raz.
   */
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isVisible) return;
    playVictoryChime();
    const timer = setTimeout(() => completeRef.current(), reduced ? 2600 : 4500);
    return () => clearTimeout(timer);
  }, [isVisible, reduced]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          key="celebration"
          data-testid={startIds.celebration}
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-none px-gutter"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.base, ease: ease.out }}
        >
          {!reduced ? (
            <div className="absolute inset-0 overflow-hidden" aria-hidden>
              {stars.map((s, i) => (
                <motion.span
                  key={`star-${i}`}
                  className="absolute text-caution"
                  style={{ left: `${s.left}%`, top: `${s.top}%` }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.6, 1, 1, 0.8] }}
                  transition={{ duration: s.duration, delay: s.delay, ease: ease.inOut }}
                >
                  <Star className="w-5 h-5 fill-current" />
                </motion.span>
              ))}

              {sparks.map((b, i) => (
                <motion.span
                  key={`spark-${i}`}
                  className="absolute bottom-0 text-module-ink"
                  style={{ left: `${b.left}%` }}
                  initial={{ y: '10vh', x: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    y: ['10vh', '-55vh', '-120vh'],
                    x: [0, 24, -24],
                    rotate: [0, 14, -14],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{ duration: b.duration + 1.4, delay: b.delay, ease: ease.inOut }}
                >
                  <Sparkles className="w-6 h-6" strokeWidth={1.5} aria-hidden />
                </motion.span>
              ))}
            </div>
          ) : null}

          <motion.div
            className="relative flex flex-col items-center text-center gap-4 w-full max-w-sm rounded-sheet bg-surface shadow-sheet px-gutter py-10"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: dur.slow, ease: ease.out }}
          >
            <span className="w-16 h-16 rounded-full bg-module-soft text-module-ink flex items-center justify-center">
              <PartyPopper className="w-8 h-8" strokeWidth={1.5} aria-hidden />
            </span>
            <Heading level={2}>{start.celebration.title}</Heading>
            <Text size="lg" tone="muted">
              {message}
            </Text>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
