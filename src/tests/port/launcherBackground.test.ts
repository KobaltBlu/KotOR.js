import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { prepareLauncherBackground, startLauncherBackground } from '@/apps/launcher/context/launcherBackground';

const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
const originalCanvas = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
let mode: 'load' | 'error' | 'pending';
let images: FakeImage[];
let encode: () => Promise<Blob>;
let context: any;
let crossOriginAtLoad: string[];

class FakeImage {
  width = 40;
  height = 20;
  naturalWidth = 40;
  naturalHeight = 20;
  crossOrigin = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  removed = false;
  constructor() { images.push(this); }
  set src(_url: string) {
    crossOriginAtLoad.push(this.crossOrigin);
    if (mode === 'load') queueMicrotask(() => this.onload?.());
    if (mode === 'error') queueMicrotask(() => this.onerror?.());
  }
  removeAttribute(name: string) { if (name === 'src') this.removed = true; }
}
class FakeCanvas {
  getContext() { return context; }
  convertToBlob() { return encode(); }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

beforeEach(() => {
  mode = 'load';
  images = [];
  crossOriginAtLoad = [];
  encode = async () => new Blob(['pixels']);
  context = {
    drawImage: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    fillStyle: '',
    fillRect: jest.fn(),
  };
  Object.defineProperty(globalThis, 'Image', { configurable: true, writable: true, value: FakeImage });
  Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, writable: true, value: FakeCanvas });
  jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:background');
  jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage);
  else delete (globalThis as any).Image;
  if (originalCanvas) Object.defineProperty(globalThis, 'OffscreenCanvas', originalCanvas);
  else delete (globalThis as any).OffscreenCanvas;
});

describe('optional launcher artwork', () => {
  test('empty profile settles without loading an image', async () => {
    expect((await prepareLauncherBackground()).url).toBe('');
    expect(images).toHaveLength(0);
  });

  test('unsupported offscreen canvas keeps the ordinary URL', async () => {
    (globalThis as any).OffscreenCanvas = undefined;
    expect((await prepareLauncherBackground('remote', 'fallback')).url).toBe('remote');
    expect(images).toHaveLength(0);
  });

  test('sets CORS before loading, draws directly and releases the generated URL once', async () => {
    const result = await prepareLauncherBackground('remote');
    expect(crossOriginAtLoad).toEqual(['anonymous']);
    expect(context.drawImage).toHaveBeenCalledWith(images[0], 0, 0);
    expect(context.fillRect).toHaveBeenCalledWith(0, 15, 40, 5);
    expect(result.url).toBe('blob:background');
    result.release();
    result.release();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:background');
    expect(images[0].onload).toBeNull();
    expect(images[0].onerror).toBeNull();
  });

  test('CORS/image failures settle using ordinary artwork and one diagnostic', async () => {
    mode = 'error';
    const result = await prepareLauncherBackground('remote', 'fallback');
    expect(result.url).toBe('remote');
    expect(images).toHaveLength(2);
    expect(images.every(image => image.removed)).toBe(true);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    result.release();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  test('missing 2D context settles instead of leaving a pending Promise', async () => {
    context = null;
    expect((await prepareLauncherBackground('remote')).url).toBe('remote');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  test('canvas encoding rejection tries fallback artwork without uncaught rejection', async () => {
    let calls = 0;
    encode = async () => {
      if (calls++ === 0) throw new Error('SecurityError: canvas is tainted');
      return new Blob(['fallback']);
    };
    const result = await prepareLauncherBackground('remote', 'fallback');
    expect(images).toHaveLength(2);
    expect(result.url).toBe('blob:background');
    expect(console.warn).not.toHaveBeenCalled();
    result.release();
  });

  test('a stalled image load times out into ordinary artwork', async () => {
    jest.useFakeTimers();
    mode = 'pending';
    const pending = prepareLauncherBackground('remote');
    await jest.advanceTimersByTimeAsync(15000);
    expect((await pending).url).toBe('remote');
    expect(images[0].removed).toBe(true);
  });

  test('already-aborted requests allocate no image or canvas URL', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(prepareLauncherBackground('remote', undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(images).toHaveLength(0);
  });

  test('abort during image loading removes handlers and cancels the image request', async () => {
    mode = 'pending';
    const controller = new AbortController();
    const pending = prepareLauncherBackground('remote', undefined, controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejection;
    expect(images[0].removed).toBe(true);
    expect(images[0].onload).toBeNull();
    expect(images[0].onerror).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });

  test('profile switches discard late encoding and cleanup releases only owned URLs', async () => {
    const encodings: Array<(blob: Blob) => void> = [];
    encode = () => new Promise(resolve => encodings.push(resolve));
    const apply = jest.fn<(url: string) => void>();
    const cancelOld = startLauncherBackground('old', undefined, apply);
    await flush();
    cancelOld();
    const cancelNew = startLauncherBackground('new', undefined, apply);
    await flush();
    expect(encodings).toHaveLength(2);
    encodings[1](new Blob(['new']));
    await flush();
    expect(apply.mock.calls.map(call => call[0])).toEqual(['old', 'new', 'blob:background']);
    encodings[0](new Blob(['old']));
    await flush();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls.map(call => call[0])).toEqual(['old', 'new', 'blob:background']);
    cancelNew();
    cancelNew();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
