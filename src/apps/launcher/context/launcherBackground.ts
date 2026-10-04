export interface LauncherBackground {
  url: string;
  release(): void;
}

const IMAGE_TIMEOUT_MS = 15000;

function aborted(): Error {
  const error = new Error('Launcher background request cancelled');
  error.name = 'AbortError';
  return error;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw aborted();
}

function loadCanvasImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(aborted()); return; }
    const image = new Image();
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener('abort', onAbort);
    };
    const fail = (error: Error) => {
      cleanup();
      image.removeAttribute('src');
      reject(error);
    };
    const onAbort = () => fail(aborted());
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => fail(new Error('Background image unavailable for canvas processing'));
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => fail(new Error('Background image load timed out')), IMAGE_TIMEOUT_MS);
    // Must be set before src; otherwise a remote image can taint the canvas.
    image.crossOrigin = 'anonymous';
    try { image.src = url; } catch (error) { cleanup(); reject(error); }
  });
}

/** Optional artwork must not prevent the launcher from rendering. */
export async function prepareLauncherBackground(
  primary?: string,
  fallback?: string,
  signal?: AbortSignal,
): Promise<LauncherBackground> {
  checkAbort(signal);
  const ordinaryURL = primary || fallback || '';
  const ordinary = () => ({ url: ordinaryURL, release() {} });
  if (!ordinaryURL || typeof OffscreenCanvas === 'undefined') return ordinary();

  let lastError: unknown;
  for (const url of new Set([primary, fallback].filter((value): value is string => !!value))) {
    try {
      const image = await loadCanvasImage(url, signal);
      checkAbort(signal);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) throw new Error('Background image has no dimensions');
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Background canvas context unavailable');
      // Draw the image directly: no intermediate ImageBitmap/GPU resource to leak.
      context.drawImage(image, 0, 0);
      const start = height * 0.75;
      const gradient = context.createLinearGradient(0, start, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'black');
      context.fillStyle = gradient;
      context.fillRect(0, start, width, height - start);
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 1 });
      checkAbort(signal);
      const objectURL = URL.createObjectURL(blob);
      let released = false;
      return {
        url: objectURL,
        release() {
          if (!released) { released = true; URL.revokeObjectURL(objectURL); }
        },
      };
    } catch (error) {
      checkAbort(signal);
      lastError = error;
    }
  }
  // CORS failures can still display as ordinary CSS images. Retain useful
  // diagnostics without surfacing an uncaught optional-media exception.
  console.warn('Launcher background processing unavailable; using ordinary artwork.', lastError);
  return ordinary();
}

/** One effect owns one request and its blob; cleanup invalidates both. */
export function startLauncherBackground(
  primary: string | undefined,
  fallback: string | undefined,
  apply: (url: string) => void,
): () => void {
  const controller = new AbortController();
  let resource: LauncherBackground | undefined;
  apply(primary || fallback || '');
  void prepareLauncherBackground(primary, fallback, controller.signal).then(result => {
    if (controller.signal.aborted) { result.release(); return; }
    resource = result;
    apply(result.url);
  }).catch(error => {
    if (!controller.signal.aborted) {
      console.warn('Launcher background processing failed; retaining ordinary artwork.', error);
    }
  });
  return () => {
    controller.abort();
    resource?.release();
    resource = undefined;
  };
}
