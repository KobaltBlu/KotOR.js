/**
 * LIP Batch Processor - generates LIP files from WAV audio files.
 * Ported from Holocron Toolset's batch_processor.py
 *
 * Creates basic lip sync keyframes based on audio duration.
 * Uses simple shapes (MPB, AH, OH) evenly distributed over the duration.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file LIPBatchProcessor.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { LIPObject } from "../../../resource/LIPObject";
import { LIPShape } from "../../../enums/resource/LIPShape";

/** Basic lip shapes used for auto-generated LIP (closed -> open -> round -> closed). */
const DEFAULT_LIP_SHAPES = [
  LIPShape.MBP,  // Start with closed mouth (m, p, b)
  LIPShape.AH,   // Open for vowel sound (bat, cat)
  LIPShape.OH,   // Round for O sound (or, boat)
  LIPShape.MBP,  // Close mouth again
];

export interface LIPBatchProcessorOptions {
  /** Custom lip shapes to use (default: MPB, AH, OH, MPB). */
  shapes?: number[];
  /** Audio buffer (WAV/MP3) to get duration from. */
  audioBuffer: ArrayBuffer;
}

export interface LIPBatchProcessorResult {
  success: boolean;
  duration: number;
  keyframeCount: number;
  lipBuffer?: Uint8Array;
  error?: string;
}

/**
 * Get audio duration from ArrayBuffer using Web Audio API.
 */
export async function getAudioDuration(audioBuffer: ArrayBuffer): Promise<number> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = await audioCtx.decodeAudioData(audioBuffer.slice(0));
  return buffer.duration;
}

/**
 * Create a LIP file buffer from audio duration and optional shapes.
 */
export function createLIPFromDuration(
  duration: number,
  shapes: number[] = DEFAULT_LIP_SHAPES
): Uint8Array {
  const lip = new LIPObject(new Uint8Array(0));
  lip.duration = duration;
  lip.keyframes = [];

  const interval = duration / (shapes.length + 1);
  for (let i = 0; i < shapes.length; i++) {
    lip.addKeyFrame(interval * (i + 1), shapes[i]);
  }

  return lip.toExportBuffer();
}

/**
 * Process a single WAV/audio file and create a LIP buffer.
 */
export async function processAudioToLIP(
  audioBuffer: ArrayBuffer,
  options: Omit<LIPBatchProcessorOptions, "audioBuffer"> = {}
): Promise<LIPBatchProcessorResult> {
  try {
    const duration = await getAudioDuration(audioBuffer);
    const shapes = options.shapes ?? DEFAULT_LIP_SHAPES;
    const lipBuffer = createLIPFromDuration(duration, shapes);
    return {
      success: true,
      duration,
      keyframeCount: shapes.length,
      lipBuffer,
    };
  } catch (e) {
    return {
      success: false,
      duration: 0,
      keyframeCount: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
