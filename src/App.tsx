import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DiscEngine } from './three';
import { AVATAR_DISCS } from './data/movies';
import { PlayOverlay } from './components/PlayOverlay';

/**
 * Root React application view.
 * Mounts the 3D CD/DVD viewport engine into a full-screen canvas container
 * with a minimalist Play Gate that unlocks Web Audio and triggers the intro.
 */
export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiscEngine | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = new DiscEngine(container, AVATAR_DISCS);
    engineRef.current = engine;

    engine.onProgress = (ratio: number) => {
      setLoadProgress(ratio);
    };

    engine.onReady = () => {
      setIsLoaded(true);
    };

    if (engine.isLoaded) {
      setIsLoaded(true);
      setLoadProgress(1);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleUnlockAudio = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.unlockAudio();
    }
  }, []);

  const handleStartIntro = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
    }
  }, []);

  return (
    <main
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-white select-none"
      aria-label="3D Interactive Disc Gallery"
    >
      {/* Dedicated Three.js canvas container */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* Minimalist Play Gate with Loader */}
      <PlayOverlay
        progress={loadProgress}
        isReady={isLoaded}
        onUnlockAudio={handleUnlockAudio}
        onStartIntro={handleStartIntro}
      />

      {/* Author Credit */}
      <a
        href="https://baptiste-saegaert.fr"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-5 z-40 font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-900 transition-colors duration-200 pointer-events-auto"
        aria-label="Portfolio de baptiste."
      >
        by baptiste. ↗
      </a>
    </main>
  );
};
