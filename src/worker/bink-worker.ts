/**
 * BinkWorker class.
 * 
 * Web Worker for Bink file decoding.
 *
 * Handles demuxing, video decode (YUV->RGBA), and audio decode off the main thread.
 *
 * Protocol (main -> worker):
 *   { type: 'init',   buffer: ArrayBuffer }        — transfer file, parse header
 *   { type: 'decode', frameIndex: number }          — decode one frame
 *   { type: 'stop' }                                — tear down
 *
 * Protocol (worker -> main):
 *   { type: 'ready',  header: BinkWorkerHeader }
 *   { type: 'frame',  frameIndex, video?, audio? }
 *   { type: 'error',  message: string }
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BinkWorker.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { BinkDemuxer } from '../video/bink-demuxer';
import { BinkVideoDecoder, YUVFrame } from '../video/binkvideo';
import { BinkAudioDCTDecoder } from '../audio/binkaudio_dct';

// ── Types shared with main thread ──────────────────────────────────────────

export interface BinkWorkerHeader {
  codecTag: string;
  versionChar: string;
  width: number;
  height: number;
  frameCount: number;
  fpsNum: number;
  fpsDen: number;
  hasAlpha: boolean;
  audioTracks: { sampleRate: number; stereo: boolean; useDCT: boolean }[];
}

export type OutputFormat = 'rgba' | 'yuv';

export type WorkerRequest =
  | { type: 'init'; buffer: ArrayBuffer }
  | { type: 'decode'; frameIndex: number; outputFormat?: OutputFormat }
  | { type: 'stop' };

export type WorkerResponse =
  | { type: 'ready'; header: BinkWorkerHeader }
  | { type: 'frame'; frameIndex: number; video: ({ rgba: ArrayBuffer; width: number; height: number } | { yuv: YUVFrame }) | null; audio: { pcm: ArrayBuffer[]; sampleRate: number; channels: number; frameLen: number; overlapLen: number; isFirst: boolean; ptsSamples: number } | null }
  | { type: 'error'; message: string };

// ── Worker state ───────────────────────────────────────────────────────────

let demuxer: BinkDemuxer | null = null;
let videoDec: BinkVideoDecoder | null = null;
let audioDec: BinkAudioDCTDecoder | null = null;
let audioIsFirst = true;
let audioTrackIndex = 0;
let audioSampleRate = 0;
let audioChannels = 0;

// ── YUV → RGBA conversion (done in worker to keep main thread free) ───────

// Pre-computed lookup table for clamping values to 0-255 range
// Maps input values from -512 to 511 (indices 0-1023) to clamped 0-255 range
const CLAMP_TABLE = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
  const value = i - 512; // i=0 -> -512, i=512 -> 0, i=1023 -> 511
  CLAMP_TABLE[i] = value < 0 ? 0 : value > 255 ? 255 : value;
}

// Pre-compute YUV to RGB coefficients for better performance
const YUV_TO_RGB_R = [298, 0, 409];    // [Y, U, V] coefficients for R
const YUV_TO_RGB_G = [298, -100, -208]; // [Y, U, V] coefficients for G
const YUV_TO_RGB_B = [298, 516, 0];    // [Y, U, V] coefficients for B

// Reusable RGBA buffer to avoid allocations
let rgbaBuffer: Uint8Array | null = null;
let rgbaBufferSize = 0;

function yuvToRGBA(yuv: YUVFrame): ArrayBuffer {
  const { width, height, y, u, v, linesizeY, linesizeU, linesizeV } = yuv;
  const pixelCount = width * height;
  const requiredSize = pixelCount * 4;

  // Resize buffer if needed
  if (!rgbaBuffer || rgbaBufferSize < requiredSize) {
    rgbaBuffer = new Uint8Array(requiredSize);
    rgbaBufferSize = requiredSize;
  }

  const rgba = rgbaBuffer.subarray(0, requiredSize);
  const rgba32 = new Uint32Array(rgba.buffer, rgba.byteOffset, pixelCount);

  // Pre-compute constants
  const width4 = width >>> 2; // width / 4
  const widthRemainder = width & 3; // width % 4

  let pixelIndex = 0;

  for (let j = 0; j < height; j++) {
    const uvj = j >>> 1; // j / 2
    const yRow = j * linesizeY;
    const uRow = uvj * linesizeU;
    const vRow = uvj * linesizeV;

    // Process 4 pixels at a time using 32-bit writes for better performance
    for (let c = 0; c < width4; c++) {
      const i = c << 2; // c * 4
      const baseOff = pixelIndex + i;

      // Load YUV values for 4 pixels
      const y0 = y[yRow + i];
      const y1 = y[yRow + i + 1];
      const y2 = y[yRow + i + 2];
      const y3 = y[yRow + i + 3];

      const u0 = u[uRow + (i >>> 1)];
      const u1 = u[uRow + ((i + 2) >>> 1)];
      const v0 = v[vRow + (i >>> 1)];
      const v1 = v[vRow + ((i + 2) >>> 1)];

      // Convert YUV to RGB using lookup table
      const d0 = u0 - 128, d1 = u1 - 128;
      const e0 = v0 - 128, e1 = v1 - 128;

      // Calculate RGB values with clamping
      const r0 = CLAMP_TABLE[((YUV_TO_RGB_R[0] * y0 + YUV_TO_RGB_R[2] * e0 + 128) >>> 8) + 512];
      const r1 = CLAMP_TABLE[((YUV_TO_RGB_R[0] * y1 + YUV_TO_RGB_R[2] * e0 + 128) >>> 8) + 512];
      const r2 = CLAMP_TABLE[((YUV_TO_RGB_R[0] * y2 + YUV_TO_RGB_R[2] * e1 + 128) >>> 8) + 512];
      const r3 = CLAMP_TABLE[((YUV_TO_RGB_R[0] * y3 + YUV_TO_RGB_R[2] * e1 + 128) >>> 8) + 512];

      const g0 = CLAMP_TABLE[((YUV_TO_RGB_G[0] * y0 + YUV_TO_RGB_G[1] * d0 + YUV_TO_RGB_G[2] * e0 + 128) >>> 8) + 512];
      const g1 = CLAMP_TABLE[((YUV_TO_RGB_G[0] * y1 + YUV_TO_RGB_G[1] * d0 + YUV_TO_RGB_G[2] * e0 + 128) >>> 8) + 512];
      const g2 = CLAMP_TABLE[((YUV_TO_RGB_G[0] * y2 + YUV_TO_RGB_G[1] * d1 + YUV_TO_RGB_G[2] * e1 + 128) >>> 8) + 512];
      const g3 = CLAMP_TABLE[((YUV_TO_RGB_G[0] * y3 + YUV_TO_RGB_G[1] * d1 + YUV_TO_RGB_G[2] * e1 + 128) >>> 8) + 512];

      const b0 = CLAMP_TABLE[((YUV_TO_RGB_B[0] * y0 + YUV_TO_RGB_B[1] * d0 + 128) >>> 8) + 512];
      const b1 = CLAMP_TABLE[((YUV_TO_RGB_B[0] * y1 + YUV_TO_RGB_B[1] * d0 + 128) >>> 8) + 512];
      const b2 = CLAMP_TABLE[((YUV_TO_RGB_B[0] * y2 + YUV_TO_RGB_B[1] * d1 + 128) >>> 8) + 512];
      const b3 = CLAMP_TABLE[((YUV_TO_RGB_B[0] * y3 + YUV_TO_RGB_B[1] * d1 + 128) >>> 8) + 512];

      // Write 32-bit RGBA values for better performance
      rgba32[baseOff] = (r0) | (g0 << 8) | (b0 << 16) | (255 << 24);
      rgba32[baseOff + 1] = (r1) | (g1 << 8) | (b1 << 16) | (255 << 24);
      rgba32[baseOff + 2] = (r2) | (g2 << 8) | (b2 << 16) | (255 << 24);
      rgba32[baseOff + 3] = (r3) | (g3 << 8) | (b3 << 16) | (255 << 24);
    }

    pixelIndex += width;

    // Handle remaining pixels (width % 4)
    for (let i = width - widthRemainder; i < width; i++) {
      const yv = y[yRow + i];
      const uu = u[uRow + (i >>> 1)];
      const vv = v[vRow + (i >>> 1)];
      const d = uu - 128, e = vv - 128;

      const r = CLAMP_TABLE[((YUV_TO_RGB_R[0] * yv + YUV_TO_RGB_R[2] * e + 128) >>> 8) + 512];
      const g = CLAMP_TABLE[((YUV_TO_RGB_G[0] * yv + YUV_TO_RGB_G[1] * d + YUV_TO_RGB_G[2] * e + 128) >>> 8) + 512];
      const b = CLAMP_TABLE[((YUV_TO_RGB_B[0] * yv + YUV_TO_RGB_B[1] * d + 128) >>> 8) + 512];

      const off = ((j * width + i) << 2); // * 4
      rgba[off] = r; rgba[off + 1] = g; rgba[off + 2] = b; rgba[off + 3] = 255;
    }
  }

  // Ensure we return a regular ArrayBuffer, not SharedArrayBuffer
  const result = new ArrayBuffer(requiredSize);
  new Uint8Array(result).set(rgba.subarray(0, requiredSize));
  return result;
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  const worker = self as unknown as Worker;

  try {
    switch (msg.type) {

      case 'init': {
        demuxer = new BinkDemuxer(msg.buffer);
        const h = demuxer.getHeader();
        const v = h.video;

        videoDec = new BinkVideoDecoder(v.width, v.height, v.versionChar, v.hasAlpha);
        audioIsFirst = true;

        // Set up audio decoder for the first DCT audio track (if any)
        audioDec = null;
        const dctTrack = h.audioTracks.find(t => t.useDCT);
        if (dctTrack) {
          audioTrackIndex = h.audioTracks.indexOf(dctTrack);
          audioSampleRate = dctTrack.sampleRate;
          audioChannels = dctTrack.stereo ? 2 : 1;
          audioDec = new BinkAudioDCTDecoder({
            sampleRate: dctTrack.sampleRate,
            channels: audioChannels,
            versionChar: v.versionChar,
          });
        }

        const header: BinkWorkerHeader = {
          codecTag: v.codecTag,
          versionChar: v.versionChar,
          width: v.width,
          height: v.height,
          frameCount: v.frames,
          fpsNum: v.fps.num,
          fpsDen: v.fps.den,
          hasAlpha: v.hasAlpha,
          audioTracks: h.audioTracks.map(t => ({
            sampleRate: t.sampleRate,
            stereo: t.stereo,
            useDCT: t.useDCT,
          })),
        };

        worker.postMessage({ type: 'ready', header } satisfies WorkerResponse);
        break;
      }

      case 'decode': {
        if (!demuxer || !videoDec) throw new Error('Worker not initialized');
        const { frameIndex, outputFormat = 'rgba' } = msg;

        // console.log(`Decode frame ${frameIndex}`);
        // const startTime = performance.now();

        // let lTime = performance.now();
        // Demux
        let frame;
        try {
          frame = demuxer.getFrame(frameIndex);
        } catch {
          try { 
            frame = demuxer.getFrame(frameIndex, { forceVideoFirst: true }); 
          } catch {
            // Can't demux — send null video, reuse last
            worker.postMessage({ type: 'frame', frameIndex, video: null, audio: null } satisfies WorkerResponse);
            break;
          }
        }

        // console.log(`Demux time: ${performance.now() - lTime}ms`);

        // lTime = performance.now();
        // ── Video ──────────────────────────────────────────────────────
        let videoPayload: ({ rgba: ArrayBuffer; width: number; height: number } | { yuv: YUVFrame }) | null = null;
        const transfers: ArrayBuffer[] = [];

        if (frame.video && frame.video.size > 0 && frame.video.data.byteLength > 0) {
          const yuv = videoDec.decodePacketToFrame(frame.video.data);

          if (outputFormat === 'rgba') {
            const rgba = yuvToRGBA(yuv);
            videoPayload = { rgba, width: yuv.width, height: yuv.height };
            transfers.push(rgba as ArrayBuffer);
          } else { // 'yuv'
            // Create a copy of the YUV frame for transfer
            const yCopy = new Uint8Array(yuv.y.length);
            const uCopy = new Uint8Array(yuv.u.length);
            const vCopy = new Uint8Array(yuv.v.length);
            yCopy.set(yuv.y);
            uCopy.set(yuv.u);
            vCopy.set(yuv.v);

            const yuvCopy: YUVFrame = {
              width: yuv.width,
              height: yuv.height,
              y: yCopy,
              u: uCopy,
              v: vCopy,
              linesizeY: yuv.linesizeY,
              linesizeU: yuv.linesizeU,
              linesizeV: yuv.linesizeV
            };
            videoPayload = { yuv: yuvCopy };
            transfers.push(yCopy.buffer as ArrayBuffer, uCopy.buffer as ArrayBuffer, vCopy.buffer as ArrayBuffer);
          }
          // console.log(`Video decode time: ${performance.now() - lTime}ms`);
        }

        // lTime = performance.now();
        // ── Audio ──────────────────────────────────────────────────────
        let audioPayload: { pcm: ArrayBuffer[]; sampleRate: number; channels: number; frameLen: number; overlapLen: number; isFirst: boolean; ptsSamples: number } | null = null;

        if (audioDec && frame.audio.length > audioTrackIndex) {
          const pkt = frame.audio[audioTrackIndex];
          if (pkt.size >= 4) {
            try {
              const pcmChans = audioDec.decodePacket(pkt.data);
              const buffers = pcmChans.map(ch => ch.buffer as ArrayBuffer);
              audioPayload = {
                pcm: buffers,
                sampleRate: audioSampleRate,
                channels: audioChannels,
                frameLen: audioDec.frameLen,
                overlapLen: audioDec.overlapLen,
                isFirst: audioIsFirst,
                ptsSamples: pkt.ptsSamples,
              };
              // Transfer the Float32Array buffers
              for (const b of buffers) transfers.push(b);
              audioIsFirst = false;
            } catch { /* skip audio for this frame */ }
          }
          // console.log(`Audio decode time: ${performance.now() - lTime}ms`);
        }

        const resp: WorkerResponse = { type: 'frame', frameIndex, video: videoPayload, audio: audioPayload };
        worker.postMessage(resp, transfers);
        // console.log(`Decode frame ${frameIndex} time: ${performance.now() - startTime}ms`);
        break;
      }

      case 'stop': {
        demuxer = null;
        videoDec = null;
        audioDec = null;
        audioIsFirst = true;
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    worker.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
};
