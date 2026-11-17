/**
 * High-performance WebGL Canvas Video Recorder using the native MediaRecorder API.
 * Captures 60 FPS WebGL frames directly from GPU memory with optional synchronized audio.
 */

export interface RecordingOptions {
  durationMs: number;
  canvas: HTMLCanvasElement;
  audioTrack?: MediaStreamTrack | null;
  onProgress?: (percent: number, elapsedSec: number, totalSec: number) => void;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

export function getPreferredMimeType(): { mimeType: string; extension: 'mp4' | 'webm' } {
  const candidateMimeTypes = [
    { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' as const },
    { mimeType: 'video/mp4', extension: 'mp4' as const },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' as const },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' as const },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' as const },
    { mimeType: 'video/webm', extension: 'webm' as const }
  ];

  for (const candidate of candidateMimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

export async function recordCanvasToVideo(options: RecordingOptions): Promise<RecordingResult> {
  const { canvas, audioTrack, durationMs, onProgress } = options;

  // Capture canvas stream at 60 FPS
  const stream = canvas.captureStream(60);

  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  const { mimeType, extension } = getPreferredMimeType();

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 16_000_000 // 16 Mbps for high-fidelity 1080p 60fps WebGL
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  return new Promise((resolve, reject) => {
    let progressTimer: number | null = null;
    const startTime = performance.now();
    const totalSec = Math.round(durationMs / 1000);

    const cleanup = () => {
      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    recorder.onstop = () => {
      cleanup();
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve({
        blob: finalBlob,
        mimeType,
        extension
      });
    };

    recorder.onerror = (err) => {
      cleanup();
      reject(err);
    };

    recorder.start(100);

    progressTimer = window.setInterval(() => {
      const elapsedMs = performance.now() - startTime;
      const progressPercent = Math.min(100, Math.round((elapsedMs / durationMs) * 100));
      const elapsedSec = Math.min(totalSec, Math.floor(elapsedMs / 1000));
      onProgress?.(progressPercent, elapsedSec, totalSec);

      if (elapsedMs >= durationMs) {
        cleanup();
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }
    }, 100);
  });
}

export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
