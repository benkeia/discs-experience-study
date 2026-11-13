/**
 * Dynamic stop-motion animated favicon featuring the real CD-ROM PNG image.
 * Compatible with Arc, Zen, Chrome, Safari, and Firefox.
 * 
 * Uses link swapping and a gentle ~180ms cadence (~5.5 fps) to avoid 
 * Chromium/Arc sidebar IPC favicon throttling and flickering.
 */
export function initAnimatedFavicon(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const NUM_FRAMES = 5;
  const INTERVAL_MS = 180; // Stable cadence for Arc/Chromium tab managers

  const frames: string[] = [];
  let currentFrame = 0;
  let timerId: number | null = null;
  let isDestroyed = false;

  const img = new Image();
  img.src = '/assets/cd-rom-favicon.png';

  img.onload = () => {
    if (isDestroyed) return;

    const size = 32; // Optimal 32x32 for tab bars and Arc sidebar
    const center = size / 2;

    // Pre-render exactly 5 rotated frames
    for (let i = 0; i < NUM_FRAMES; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((i * 2 * Math.PI) / NUM_FRAMES);
      ctx.drawImage(img, -center, -center, size, size);
      ctx.restore();

      frames.push(canvas.toDataURL('image/png'));
    }

    if (frames.length === 0) return;

    function updateFavicon(dataUrl: string) {
      const head = document.head || document.getElementsByTagName('head')[0];
      const oldLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.type = 'image/png';
      newLink.href = dataUrl;

      if (oldLink) {
        head.replaceChild(newLink, oldLink);
      } else {
        head.appendChild(newLink);
      }
    }

    // Set initial frame
    updateFavicon(frames[0]);

    // Start rotation loop
    timerId = window.setInterval(() => {
      if (document.hidden) return; // Pause when tab is inactive

      currentFrame = (currentFrame + 1) % frames.length;
      updateFavicon(frames[currentFrame]);
    }, INTERVAL_MS);
  };

  return () => {
    isDestroyed = true;
    if (timerId !== null) {
      clearInterval(timerId);
    }
  };
}
