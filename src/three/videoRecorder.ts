/**
 * High-performance WebGL Canvas Video Recorder using the native MediaRecorder API.
 * Captures 60 FPS 1080p WebGL frames directly from GPU memory with synchronized audio.
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

/**
 * Selects the most compatible hardware-accelerated H.264 Level 4.2 MP4 codec
 * (required for 1080p @ 60fps in VLC, QuickTime, and Instagram), with WebM VP9 fallback.
 */
export function getPreferredMimeType(): { mimeType: string; extension: 'mp4' | 'webm' } {
  const candidateMimeTypes = [
    // H.264 High / Main / Baseline Profile Level 4.2 (supports 1920x1080 & 1080x1920 @ 60fps) + AAC-LC
    { mimeType: 'video/mp4;codecs="avc1.64002A,mp4a.40.2"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.4D402A,mp4a.40.2"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.42E02A,mp4a.40.2"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.640028,mp4a.40.2"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.64002A"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs="avc1.42E01E"', extension: 'mp4' as const },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' as const },
    // WebM VP9 / VP8 fallback
    { mimeType: 'video/webm;codecs="vp9,opus"', extension: 'webm' as const },
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

  // Capture WebGL canvas stream at 60 FPS
  const stream = canvas.captureStream(60);

  if (audioTrack) {
    stream.addTrack(audioTrack);
  }

  const { mimeType, extension } = getPreferredMimeType();

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 14_000_000, // 14 Mbps for crisp 1080p 60fps H.264
    audioBitsPerSecond: 192_000
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
      stream.getVideoTracks().forEach((t) => t.stop());
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

    // Start recording as a single contiguous stream (no small timeslice)
    // so the MP4 muxer writes a clean, VLC/QuickTime-compatible GOP & audio interleaving.
    recorder.start();

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
