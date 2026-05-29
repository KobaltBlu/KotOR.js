export interface ILoaderProgress {
  message: string;
  currentAsset?: string;
  completed: number;
  total: number;
}

export type LoaderProgressCallback = (progress: ILoaderProgress) => void;

/**
 * Tracks parallel asset loads and emits normalized progress updates.
 */
export class LoaderProgressTracker {
  #message: string;
  #total = 0;
  #completed = 0;
  #currentAsset = '';
  #onProgress: LoaderProgressCallback;

  constructor(onProgress: LoaderProgressCallback, message = 'Loading...') {
    this.#onProgress = onProgress;
    this.#message = message;
  }

  setMessage(message: string): void {
    this.#message = message;
    this.#emit();
  }

  begin(total: number, message?: string): void {
    if (message) {
      this.#message = message;
    }
    this.#total = Math.max(0, total);
    this.#completed = 0;
    this.#currentAsset = '';
    this.#emit();
  }

  addTotal(count: number): void {
    this.#total += Math.max(0, count);
    this.#emit();
  }

  itemStart(asset: string): void {
    this.#currentAsset = asset;
    this.#emit();
  }

  itemComplete(): void {
    this.#completed = Math.min(this.#completed + 1, this.#total || this.#completed + 1);
    this.#emit();
  }

  #emit(): void {
    this.#onProgress({
      message: this.#message,
      currentAsset: this.#currentAsset || undefined,
      completed: this.#completed,
      total: this.#total,
    });
  }
}

export function formatLoaderEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '';
  }
  if (seconds < 5) {
    return 'Almost done';
  }
  const totalSeconds = Math.ceil(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s remaining`;
  }
  return `${secs}s remaining`;
}
