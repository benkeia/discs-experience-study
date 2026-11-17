import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DiscEngine } from './three';
import { AVATAR_DISCS } from './data/movies';
import { PlayOverlay } from './components/PlayOverlay';
import { ShowcaseRecorder } from './components/ShowcaseRecorder';

/**
 * Root React application view.
 * Mounts the 3D CD/DVD viewport engine into a full-screen canvas container
 * with a minimalist Play Gate that unlocks Web Audio and triggers the intro.
 */
export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DiscEngine | null>(null);
  const [engineInstance, setEngineInstance] = useState<DiscEngine | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [forceDismissGate, setForceDismissGate] = useState(false);

  // Studio & Recording UI: Hidden by default for public visitors.
  // Accessible via URL param (?studio=1, ?record=1, ?demo=1, #studio) or by pressing 'R'
  const [showStudio, setShowStudio] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.has('record') ||
      params.has('demo') ||
      params.has('studio') ||
      window.location.hash === '#studio' ||
      window.location.hash === '#record'
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r' || e.key === 'R') {
        setShowStudio((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const engine = new DiscEngine(container, AVATAR_DISCS);
    engineRef.current = engine;
    setEngineInstance(engine);

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
      setEngineInstance(null);
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
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-white select-none flex items-center justify-center"
      aria-label="3D Interactive Disc Gallery"
    >
      {/* Dedicated Three.js canvas container */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* Studio Showcase & Video Export Controller (hidden by default, accessible via ?studio=1 or 'R') */}
      {showStudio && (
        <ShowcaseRecorder
          engine={engineInstance}
          isReady={isLoaded}
          containerRef={canvasContainerRef}
          onStartShowcase={() => setForceDismissGate(true)}
          onClose={() => setShowStudio(false)}
        />
      )}

      {/* Minimalist Play Gate with Loader */}
      <PlayOverlay
        progress={loadProgress}
        isReady={isLoaded}
        onUnlockAudio={handleUnlockAudio}
        onStartIntro={handleStartIntro}
        forceDismiss={forceDismissGate}
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
