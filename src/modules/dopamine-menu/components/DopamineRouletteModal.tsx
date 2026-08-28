import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DopamineRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string; title: string; icon?: React.ReactNode }[];
}

export const DopamineRouletteModal: React.FC<DopamineRouletteModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string; icon?: React.ReactNode } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Pastel colors for slices
  const colors = [
    '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fef08a', '#e9d5ff', '#fed7aa', '#99f6e4', '#fecaca'
  ];

  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setSelectedItem(null);
      setShowCelebration(false);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const playTickSound = () => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioContextRef.current.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.05);
    
    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.05);
  };

  const spin = () => {
    if (items.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setSelectedItem(null);
    setShowCelebration(false);
    
    const sliceAngle = 360 / items.length;
    // Add multiple full rotations + random landing spot
    const randomSpins = 5 + Math.random() * 3; 
    const randomLandingItem = Math.floor(Math.random() * items.length);
    
    // We want the chosen item to be at the top (0 degrees).
    // Let's assume slice 0 starts at -sliceAngle/2 to +sliceAngle/2.
    // To put item N at top, we need to rotate backwards by N * sliceAngle.
    const targetRotation = (randomSpins * 360) - (randomLandingItem * sliceAngle);
    
    setRotation(targetRotation);

    // Simulate tick sounds based on transition time (approximate)
    let ticks = 0;
    const totalTicks = Math.floor(randomSpins * items.length);
    const tickInterval = setInterval(() => {
      playTickSound();
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(tickInterval);
      }
    }, 4000 / totalTicks); // duration is 4s

    setTimeout(() => {
      clearInterval(tickInterval);
      setSelectedItem(items[randomLandingItem]);
      setIsSpinning(false);
      setShowCelebration(true);
      playTickSound(); // final tick
    }, 4000);
  };

  const renderWheel = () => {
    if (items.length === 0) return null;
    
    const radius = 120;
    const center = 128;
    const sliceAngle = 360 / items.length;

    return (
      <div className="relative w-64 h-64 mx-auto my-6">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 text-sage-600 drop-shadow-md">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
        </div>
        
        {/* Wheel */}
        <div 
          className="w-full h-full rounded-full shadow-inner overflow-hidden border-4 border-white dark:border-warmgray-700 relative"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.15, 1)' : 'none'
          }}
        >
          <svg viewBox="0 0 256 256" className="w-full h-full transform -rotate-90">
            {items.map((item, index) => {
              const startAngle = (index * sliceAngle - sliceAngle / 2) * (Math.PI / 180);
              const endAngle = ((index + 1) * sliceAngle - sliceAngle / 2) * (Math.PI / 180);
              
              const x1 = center + radius * Math.cos(startAngle);
              const y1 = center + radius * Math.sin(startAngle);
              const x2 = center + radius * Math.cos(endAngle);
              const y2 = center + radius * Math.sin(endAngle);
              
              const largeArcFlag = sliceAngle > 180 ? 1 : 0;
              const pathData = items.length === 1 
                ? `M ${center},${center - radius} A ${radius},${radius} 0 1,1 ${center},${center - radius + 0.1}`
                : `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

              const textAngle = index * sliceAngle;
              const textRadius = radius * 0.65;
              const tx = center + textRadius * Math.cos(textAngle * (Math.PI / 180));
              const ty = center + textRadius * Math.sin(textAngle * (Math.PI / 180));

              return (
                <g key={item.id}>
                  <path
                    d={pathData}
                    fill={colors[index % colors.length]}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                  />
                  <text
                    x={tx}
                    y={ty}
                    transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="#333"
                    className="text-xs font-bold font-sans"
                    style={{ fontSize: items.length > 8 ? '8px' : '12px' }}
                  >
                    {item.title.length > 10 ? item.title.substring(0, 8) + '...' : item.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Center Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-warmgray-800 rounded-full shadow-md border-4 border-sage-100 flex items-center justify-center z-10">
          <Sparkles className="w-5 h-5 text-sage-500" />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-warmgray-900/60 backdrop-blur-sm transition-opacity">
      <div 
        className={twMerge(
          clsx(
            'bg-white dark:bg-warmgray-800 rounded-3xl w-full max-w-sm shadow-2xl border border-warmgray-200 dark:border-warmgray-700 relative overflow-hidden',
            'transform transition-all duration-300'
          )
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roulette-title"
      >
        <div className="flex items-center justify-between p-4 pb-0 z-20 relative">
          <h2 id="roulette-title" className="text-lg font-semibold text-warmgray-900 dark:text-warmgray-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sage-500" />
            Dopamine Roulette
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-warmgray-500 hover:bg-warmgray-100 dark:hover:bg-warmgray-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center justify-center relative">
          
          {showCelebration && selectedItem ? (
            <div className="absolute inset-0 z-30 bg-white/95 dark:bg-warmgray-800/95 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {/* CSS Sparkles Effect */}
                <div className="absolute top-10 left-10 text-yellow-400 animate-pulse"><Sparkles size={32}/></div>
                <div className="absolute bottom-20 right-10 text-pink-400 animate-pulse delay-100"><Sparkles size={24}/></div>
                <div className="absolute top-20 right-20 text-blue-400 animate-pulse delay-200"><Sparkles size={28}/></div>
              </div>
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-sage-200 to-sage-100 dark:from-sage-900/50 dark:to-sage-800/50 flex items-center justify-center text-sage-600 dark:text-sage-300 mb-6 shadow-lg transform hover:scale-105 transition-transform">
                {selectedItem.icon || <Sparkles className="w-12 h-12" />}
              </div>
              <h3 className="text-3xl font-bold text-warmgray-900 dark:text-white mb-3 text-center">
                {selectedItem.title}
              </h3>
              <p className="text-warmgray-500 dark:text-warmgray-400 text-center mb-8">
                Wybrana aktywność! Baw się dobrze.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 bg-sage-600 hover:bg-sage-700 text-white py-4 px-6 rounded-2xl font-bold min-h-[48px] flex items-center justify-center gap-2 shadow-md"
                >
                  <Check className="w-5 h-5" /> Akceptuję
                </button>
                <button
                  onClick={() => setShowCelebration(false)}
                  className="flex-1 bg-warmgray-100 dark:bg-warmgray-700 text-warmgray-700 dark:text-warmgray-200 py-4 px-6 rounded-2xl font-bold min-h-[48px] flex items-center justify-center"
                >
                  Kręć znowu
                </button>
              </div>
            </div>
          ) : (
            renderWheel()
          )}
          
          {!showCelebration && (
            <div className="w-full mt-4">
              <button
                onClick={spin}
                disabled={isSpinning || items.length === 0}
                className={twMerge(
                  clsx(
                    'w-full py-4 px-6 rounded-2xl text-lg font-bold transition-all min-h-[48px] shadow-sm',
                    isSpinning || items.length === 0
                      ? 'bg-warmgray-200 text-warmgray-400 dark:bg-warmgray-700 dark:text-warmgray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white hover:shadow-md active:scale-[0.98]'
                  )
                )}
              >
                {isSpinning ? 'Losowanie...' : 'Zakręć kołem!'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
