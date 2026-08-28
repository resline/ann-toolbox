import React, { useEffect } from 'react';
import { PartyPopper, Star } from '../../../lib/icons';
import { cn } from '../../../lib/cn';

interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  message?: string;
}

const playVictoryChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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

    // Simple victory arpeggio: C5, E5, G5, C6
    playNote(523.25, 0, 0.4);
    playNote(659.25, 0.15, 0.4);
    playNote(783.99, 0.3, 0.4);
    playNote(1046.50, 0.5, 0.8);
  } catch (e) {
    console.error('Audio playback failed', e);
  }
};

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isVisible,
  onComplete,
  message = "Wspaniale, Aniu! Pokonałaś opór i zrobiłaś to krok po kroku ✨",
}) => {
  useEffect(() => {
    if (isVisible) {
      playVictoryChime();
      const timer = setTimeout(() => {
        onComplete();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-sage-500/20 dark:bg-sage-400/20 backdrop-blur-[4px] duration-500" />
      
      {/* Floating Stars and Butterflies Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 1}s`,
            }}
          >
            <Star className={cn("w-6 h-6 text-yellow-400 fill-yellow-400", i % 2 === 0 ? "scale-75" : "scale-100")} />
          </div>
        ))}
        {/* Simple CSS butterflies using unicode or SVG */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`bf-${i}`}
            className="absolute opacity-80 text-3xl"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-10%`,
              animation: `flyUp ${4 + Math.random() * 3}s ease-in-out forwards`,
              animationDelay: `${Math.random() * 1}s`,
            }}
          >
            🦋
          </div>
        ))}
      </div>

      <style>{`
        @keyframes flyUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-50vh) rotate(15deg) translateX(20px); }
          100% { transform: translateY(-120vh) rotate(-15deg) translateX(-20px); opacity: 0; }
        }
      `}</style>

      <div 
        className={cn(
          "bg-white/90 dark:bg-warmgray-800/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl border border-sage-200 dark:border-sage-700 flex flex-col items-center text-center max-w-md w-full mx-4",
          "duration-700 ease-out"
        )}
      >
        <div className="w-24 h-24 bg-gradient-to-tr from-sage-200 to-sage-100 dark:from-sage-800 dark:to-sage-900 rounded-full flex items-center justify-center text-sage-600 dark:text-sage-300 mb-6 shadow-inner animate-bounce">
          <PartyPopper className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sage-600 to-sage-400 dark:from-sage-400 dark:to-sage-200 mb-4">
          Gratulacje!
        </h2>
        <p className="text-xl font-medium text-warmgray-700 dark:text-warmgray-200 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};
