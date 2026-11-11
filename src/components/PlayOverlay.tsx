import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PlayOverlayProps {
  progress: number; // 0 to 1
  isReady: boolean;
  onUnlockAudio: () => Promise<void> | void;
  onStartIntro: () => void;
}

/**
 * Minimalist fullscreen Gate on pure white (#ffffff).
 * 1. Shows a sleek minimal loader (0% -> 100%) while textures and 3D engine prepare.
 * 2. Reveals the iconic ▶ PLAY button once 100% ready.
 * 3. On click, unlocks the Web Audio API immediately on user gesture,
 *    fades out completely, and ONLY AFTER fading out triggers the 3D intro animation.
 */
export const PlayOverlay: React.FC<PlayOverlayProps> = ({
  progress,
  isReady,
  onUnlockAudio,
  onStartIntro
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'pressing' | 'fading' | 'gone'>('loading');
  const isMountedRef = useRef(true);
  const launchTimersRef = useRef<number[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      launchTimersRef.current.forEach((id) => window.clearTimeout(id));
      launchTimersRef.current = [];
    };
  }, []);

  // Smoothly increment the displayed loading percentage up to 100%
  useEffect(() => {
    const target = isReady ? 100 : Math.round(progress * 100);
    if (displayProgress >= target) return;

    const timer = window.setTimeout(() => {
      setDisplayProgress((prev) => Math.min(target, prev + 1));
    }, 16);

    return () => window.clearTimeout(timer);
  }, [progress, isReady, displayProgress]);

  // Transition from loading to ready when 100% is reached and engine is ready
  useEffect(() => {
    if (phase === 'loading' && isReady && displayProgress >= 100) {
      const timer = window.setTimeout(() => {
        setPhase('ready');
      }, 200);
      return () => window.clearTimeout(timer);
    }
  }, [phase, isReady, displayProgress]);

  const handleLaunch = useCallback(async () => {
    if (phase !== 'ready') return;

    // 1. Tactile press depth
    setPhase('pressing');

    // 2. Immediate audio unlock (within user gesture callstack)
    try {
      await onUnlockAudio();
    } catch (err) {
      console.warn('Audio unlock warning:', err);
    }

    if (!isMountedRef.current) return;

    // 3. Button evaporates and white overlay fades out
    launchTimersRef.current.push(
      window.setTimeout(() => {
        setPhase('fading');
      }, 75),
      // 4. Trigger 3D intro animation right as the overlay dissolves (at 180ms)
      window.setTimeout(() => {
        onStartIntro();
      }, 180),
      // 5. Complete unmount once fadeout is finished
      window.setTimeout(() => {
        setPhase('gone');
      }, 520)
    );
  }, [phase, onUnlockAudio, onStartIntro]);

  if (phase === 'gone') return null;

  const isFading = phase === 'fading';
  const isPressing = phase === 'pressing';
  const isLoading = phase === 'loading';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none transition-opacity duration-500 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Chargement et Lancement de l'expérience"
    >
      {/* 1. Loader Phase */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 transition-opacity duration-300">
          <span className="font-mono text-xs md:text-sm tracking-[0.32em] uppercase text-neutral-400">
            {displayProgress}%
          </span>
          <div className="w-24 h-[1px] bg-neutral-200 overflow-hidden">
            <div
              className="h-full bg-neutral-800 transition-all duration-150 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Ready Phase : Minimalist ▶ PLAY (without subtitle) */}
      {!isLoading && (
        <button
          type="button"
          onClick={handleLaunch}
          className={`group relative flex items-center justify-center gap-3.5 px-8 py-4 cursor-pointer outline-none border-none bg-transparent transition-all duration-300 ${
            isPressing
              ? 'scale-[0.96]'
              : isFading
              ? 'scale-[1.05] opacity-0'
              : 'scale-100 opacity-100 hover:scale-[1.02]'
          }`}
          aria-label="Lancer l'expérience 3D avec le son"
        >
          <span className="flex items-center gap-3 font-mono text-xs md:text-sm tracking-[0.32em] uppercase text-neutral-900 group-hover:text-black transition-all duration-200">
            <svg
              className="w-3.5 h-3.5 fill-current transform transition-transform duration-200 group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
            <span className="font-semibold">PLAY</span>
          </span>
        </button>
      )}
    </div>
  );
};
