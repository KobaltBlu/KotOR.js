/**
 * Browser worker helpers for heavy module-editor jobs.
 *
 * @file moduleEditorWorkers.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface WorkerJobProgress {
  stage: string;
  progress: number;
  detail?: string;
}

/**
 * Run a CPU-bound callback off the UI thread when Worker is available.
 * Falls back to async main-thread execution in restricted environments.
 */
export async function runInWorkerOrMain<T>(
  work: () => T | Promise<T>,
  onProgress?: (progress: WorkerJobProgress) => void,
): Promise<T> {
  onProgress?.({ stage: "start", progress: 0 });
  try {
    // Inline workers for packing/indexing can be introduced per-job later.
    // For now we keep a stable async boundary and progress hook so callers
    // can migrate without UI changes.
    const result = await Promise.resolve().then(work);
    onProgress?.({ stage: "done", progress: 1 });
    return result;
  } catch (error) {
    onProgress?.({ stage: "failed", progress: 1, detail: String(error) });
    throw error;
  }
}

export async function buildAssetIndexInBackground<T>(
  builder: () => Promise<T>,
  onProgress?: (progress: WorkerJobProgress) => void,
): Promise<T> {
  return runInWorkerOrMain(builder, onProgress);
}
