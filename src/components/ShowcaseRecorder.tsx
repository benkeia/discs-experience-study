import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DiscEngine } from '../three';
import { recordCanvasToVideo, downloadVideoBlob, getPreferredMimeType } from '../three/videoRecorder';

export type AspectRatioMode = '16:9' | '9:16' | 'fullscreen';

interface ShowcaseRecorderProps {
  engine: DiscEngine | null;
  isReady: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onStartShowcase?: () => void;
}

export const ShowcaseRecorder: React.FC<ShowcaseRecorderProps> = ({
  engine,
  isReady,
  containerRef,
  onStartShowcase
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [currentMode, setCurrentMode] = useState<AspectRatioMode>('fullscreen');
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(16);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const autoStartedRef = useRef(false);

  // Set container dimensions and scale factor to fit within browser window
  const applyContainerDimensions = useCallback((mode: AspectRatioMode) => {
    const el = containerRef.current;
    if (!el) return;

    if (mode === 'fullscreen') {
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.transform = 'none';
      el.style.margin = '0';
      engine?.handleResize();
      return;
    }

    const targetW = mode === '16:9' ? 1920 : 1080;
    const targetH = mode === '16:9' ? 1080 : 1920;

    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scale = Math.min((winW * 0.92) / targetW, (winH * 0.92) / targetH, 1);

    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.width = `${targetW}px`;
    el.style.height = `${targetH}px`;
    el.style.marginLeft = `-${targetW / 2}px`;
    el.style.marginTop = `-${targetH / 2}px`;
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = 'center center';
    el.style.boxShadow = '0 25px 60px -15px rgba(0, 0, 0, 0.15)';
    el.style.borderRadius = mode === '9:16' ? '32px' : '16px';
    el.style.overflow = 'hidden';

    engine?.handleResize();
  }, [containerRef, engine]);

  const handleStartRecording = useCallback(async (mode: '16:9' | '9:16') => {
    if (!engine || !isReady || isRecording) return;

    onStartShowcase?.();
    await engine.unlockAudio();

    setIsRecording(true);
    setCurrentMode(mode);
    setProgressPercent(0);
    setElapsedSeconds(0);
    setTotalSeconds(16);

    applyContainerDimensions(mode);

    // Short pause to let layout settle and GPU buffer warm up
    await new Promise((r) => setTimeout(r, 250));

    const canvas = engine.getCanvas();
    const audioTrack = engine.sound?.getMediaStreamTrack();
    const durationMs = 16500;

    // Launch video recording and 3D showcase sequence concurrently
    const recordPromise = recordCanvasToVideo({
      canvas,
      audioTrack,
      durationMs,
      onProgress: (pct, elapsed, total) => {
        setProgressPercent(pct);
        setElapsedSeconds(elapsed);
        setTotalSeconds(total);
      }
    });

    const sequencePromise = engine.runShowcaseSequence();

    try {
      const [recordResult] = await Promise.all([recordPromise, sequencePromise]);
      const filename = mode === '9:16' ? `discs-story-9-16.${recordResult.extension}` : `discs-showcase-16-9.${recordResult.extension}`;
      downloadVideoBlob(recordResult.blob, filename);

      setToastMessage(`✓ Vidéo ${mode} exportée (${recordResult.extension.toUpperCase()}) !`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Recording error:', err);
      setToastMessage('Erreur lors de l’export');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsRecording(false);
      setCurrentMode('fullscreen');
      applyContainerDimensions('fullscreen');
    }
  }, [engine, isReady, isRecording, applyContainerDimensions, onStartShowcase]);

  const handleStartDemoOnly = useCallback(async () => {
    if (!engine || !isReady || isRecording || isPlayingDemo) return;
    onStartShowcase?.();
    await engine.unlockAudio();

    setIsPlayingDemo(true);
    try {
      await engine.runShowcaseSequence();
    } finally {
      setIsPlayingDemo(false);
    }
  }, [engine, isReady, isRecording, isPlayingDemo, onStartShowcase]);

  // URL Auto-Trigger (?record=16-9 or ?record=story or ?demo=1)
  useEffect(() => {
    if (!isReady || autoStartedRef.current) return;
    autoStartedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const recordParam = params.get('record');
    const demoParam = params.get('demo');

    if (recordParam === '16-9' || recordParam === '16/9') {
      void handleStartRecording('16:9');
    } else if (recordParam === 'story' || recordParam === '9-16' || recordParam === '9/16') {
      void handleStartRecording('9:16');
    } else if (demoParam === '1' || demoParam === 'true') {
      void handleStartDemoOnly();
    }
  }, [isReady, handleStartRecording, handleStartDemoOnly]);

  const preferred = getPreferredMimeType();

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] px-5 py-2.5 bg-neutral-900/90 text-white backdrop-blur-md rounded-full shadow-lg font-mono text-xs tracking-wider animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Floating Export Controller Bar (Top-Right) */}
      <aside
        className="fixed top-5 right-5 z-[9990] flex items-center gap-2 select-none"
        aria-label="Enregistrement Vidéo Showcase"
      >
        {!isRecording ? (
          <div className="flex items-center gap-1.5 p-1 bg-white/75 hover:bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-full shadow-sm transition-all duration-200">
            {/* Play Demo Button */}
            <button
              type="button"
              onClick={handleStartDemoOnly}
              disabled={!isReady || isPlayingDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-neutral-700 hover:text-black hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              title="Jouer la chorégraphie automatique sans enregistrer"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{isPlayingDemo ? 'Démo...' : 'DÉMO'}</span>
            </button>

            <span className="w-px h-3.5 bg-neutral-200" />

            {/* 16:9 Video Export Button */}
            <button
              type="button"
              onClick={() => handleStartRecording('16:9')}
              disabled={!isReady || isPlayingDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-neutral-800 hover:text-black hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              title="Exporter une vidéo 16:9 Full HD 60 FPS (YouTube / Portfolio)"
            >
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
              <span>16:9</span>
            </button>

            {/* Story 9:16 Video Export Button */}
            <button
              type="button"
              onClick={() => handleStartRecording('9:16')}
              disabled={!isReady || isPlayingDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-neutral-900 font-semibold hover:bg-neutral-100 disabled:opacity-40 transition-colors"
              title="Exporter une vidéo 9:16 Story / Reels / TikTok (Full HD vertical)"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>STORY 9:16</span>
            </button>
          </div>
        ) : (
          /* Active Recording Status Pill */
          <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900 text-white rounded-full shadow-xl font-mono text-xs tracking-wider animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>
              REC {currentMode} ({elapsedSeconds}s / {totalSeconds}s)
            </span>
            <span className="text-neutral-400">[{progressPercent}%]</span>
            <span className="text-[10px] text-neutral-400 uppercase">
              {preferred.extension}
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
