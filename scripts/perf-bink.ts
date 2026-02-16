/**
 * Bink decoder performance script (video + audio).
 *
 * Usage (from project root):
 *   npm run perf:bink -- <path-to-file.bik>
 *
 * Examples:
 *   npm run perf:bink -- movie.bik --frames 1
 *   npm run perf:bink -- -i movie.bik --frames 100
 *   npm run perf:bink -- ./movie.bik --all
 *
 * Options:
 *   -i, --input  path to .bik file (optional if path is first arg)
 *   --frames N   decode only first N frames (default: all)
 *   --first N   log decode time for the first N frames
 *   --all       log decode time for every frame
 *
 * Logs: video and audio decode times, frame count, FPS, per-frame min/mean/max.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BinkDemuxer } from '../src/video/bink-demuxer';
import { BinkVideoDecoder } from '../src/video/binkvideo';
import { BinkAudioDCTDecoder } from '../src/audio/binkaudio_dct';

function getArrayBufferFromFile(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return ab;
}

function formatMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(2)}µs` : `${ms.toFixed(2)}ms`;
}

function main(): void {
  const args = process.argv.slice(2);

  // Input file: -i / --i / --input <path> or first positional arg ending in .bik
  let bikPath: string | undefined;
  const inputOpts = ['-i', '--i', '--input'];
  for (const opt of inputOpts) {
    const i = args.indexOf(opt);
    if (i !== -1 && args[i + 1]) {
      bikPath = args[i + 1];
      break;
    }
  }
  if (!bikPath) {
    bikPath = args.find((a) => !a.startsWith('-') && a.endsWith('.bik'));
  }

  const showAllFrames = args.includes('--all');
  const showFirstN = ((): number => {
    const i = args.indexOf('--first');
    if (i !== -1 && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  })();
  let maxFrames = ((): number => {
    const i = args.indexOf('--frames');
    if (i !== -1 && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  })();
  // When args are passed without option names (e.g. just values), treat a single numeric arg as --frames
  if (maxFrames === 0 && bikPath) {
    const rest = args.filter((a) => a !== bikPath && !a.startsWith('-'));
    const numeric = rest.map((a) => parseInt(a, 10)).filter((n) => Number.isFinite(n) && n > 0);
    if (numeric.length === 1) maxFrames = numeric[0];
  }

  if (!bikPath || !bikPath.endsWith('.bik')) {
    console.error('Usage: perf-bink.ts [ -i <file.bik> ] [ N ] [--frames N] [--first N] [--all]');
    console.error('       perf-bink.ts <file.bik> [ N ]  (single number N = decode first N frames)');
    console.error('  -i, --input   path to .bik file (optional if path is first arg)');
    console.error('  N            if only one number is passed, same as --frames N');
    console.error('  --frames N   decode only first N frames (default: all)');
    console.error('  --first N    log decode time for the first N frames');
    console.error('  --all        log decode time for every frame');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), bikPath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  console.log('Loading:', resolved);
  const ab = getArrayBufferFromFile(resolved);
  console.log('File size:', (ab.byteLength / 1024).toFixed(2), 'KB');

  const demuxer = new BinkDemuxer(ab);
  const header = demuxer.getHeader();
  const { video } = header;
  const frameCount = maxFrames > 0 ? Math.min(maxFrames, video.frames) : video.frames;
  if (maxFrames > 0) console.log('Decoding first', frameCount, 'of', video.frames, 'frames');

  const audioTracks = header.audioTracks;
  const dctTrack = audioTracks.find((t) => t.useDCT);
  const audioDecoder: BinkAudioDCTDecoder | null = dctTrack
    ? new BinkAudioDCTDecoder({
        sampleRate: dctTrack.sampleRate,
        channels: dctTrack.stereo ? 2 : 1,
        versionChar: video.versionChar,
      })
    : null;

  console.log('Header:', {
    codecTag: video.codecTag,
    versionChar: video.versionChar,
    width: video.width,
    height: video.height,
    frames: frameCount,
    fps: `${video.fps.num}/${video.fps.den}`,
    hasAlpha: video.hasAlpha,
    audioTracks: audioTracks.length,
    audioDCT: !!audioDecoder,
  });

  const videoDecoder = new BinkVideoDecoder(
    video.width,
    video.height,
    video.versionChar,
    video.hasAlpha
  );

  // Warmup: decode first frame video and audio once (JIT / one-time init)
  const frame0 = demuxer.getFrame(0);
  if (frame0.video.data.length > 0) {
    const tWarm = performance.now();
    videoDecoder.decodePacketToFrame(frame0.video.data);
    console.log('Warmup video (frame 0):', formatMs(performance.now() - tWarm));
  }
  if (audioDecoder && frame0.audio.length > 0) {
    for (const ap of frame0.audio) {
      if (ap.data.length > 0) {
        const tWarm = performance.now();
        audioDecoder.decodePacket(ap.data);
        console.log('Warmup audio (frame 0, track', ap.trackIndex + '):', formatMs(performance.now() - tWarm));
        break;
      }
    }
  }

  const videoFrameTimes: number[] = [];
  const audioPacketTimes: number[] = [];
  const tTotalStart = performance.now();

  for (let i = 0; i < frameCount; i++) {
    const frame = demuxer.getFrame(i);

    if (frame.video.data.length > 0) {
      const t0 = performance.now();
      videoDecoder.decodePacketToFrame(frame.video.data);
      videoFrameTimes.push(performance.now() - t0);
    } else {
      videoFrameTimes.push(0);
    }

    if (audioDecoder) {
      for (const ap of frame.audio) {
        if (ap.data.length > 0) {
          const t0 = performance.now();
          audioDecoder.decodePacket(ap.data);
          audioPacketTimes.push(performance.now() - t0);
        }
      }
    }
  }

  const tTotalEnd = performance.now();
  const totalMs = tTotalEnd - tTotalStart;

  const videoDecodeTimes = videoFrameTimes.filter((t) => t > 0);
  const videoSum = videoDecodeTimes.reduce((a, b) => a + b, 0);
  const videoMin = videoDecodeTimes.length ? Math.min(...videoDecodeTimes) : 0;
  const videoMax = videoDecodeTimes.length ? Math.max(...videoDecodeTimes) : 0;
  const videoMean = videoDecodeTimes.length ? videoSum / videoDecodeTimes.length : 0;
  const videoFps = totalMs > 0 ? (frameCount / totalMs) * 1000 : 0;

  console.log('\n--- Perf summary ---');
  console.log('Total wall time:', formatMs(totalMs));

  console.log('\nVideo:');
  console.log('  Frames decoded:', frameCount, '(with data:', videoDecodeTimes.length + ')');
  console.log('  Video decode time:', formatMs(videoSum));
  console.log('  Throughput:', videoFps.toFixed(2), 'frames/sec');
  console.log('  Per-frame (ms): min', formatMs(videoMin), '| mean', formatMs(videoMean), '| max', formatMs(videoMax));

  if (audioDecoder && audioPacketTimes.length > 0) {
    const audioSum = audioPacketTimes.reduce((a, b) => a + b, 0);
    const audioMean = audioPacketTimes.length ? audioSum / audioPacketTimes.length : 0;
    const audioMin = Math.min(...audioPacketTimes);
    const audioMax = Math.max(...audioPacketTimes);
    console.log('\nAudio (DCT):');
    console.log('  Packets decoded:', audioPacketTimes.length);
    console.log('  Audio decode time:', formatMs(audioSum));
    console.log('  Per-packet (ms): min', formatMs(audioMin), '| mean', formatMs(audioMean), '| max', formatMs(audioMax));
  } else if (audioTracks.length > 0 && !audioDecoder) {
    console.log('\nAudio: no DCT track (only non-DCT tracks present, not decoded)');
  }

  const logFrames = showAllFrames ? frameCount : showFirstN;
  if (logFrames > 0 && videoFrameTimes.length > 0) {
    console.log('\nPer-frame video times (ms):');
    const n = Math.min(logFrames, videoFrameTimes.length);
    for (let i = 0; i < n; i++) {
      console.log(`  frame ${i}: ${formatMs(videoFrameTimes[i])}`);
    }
    if (showAllFrames && frameCount > n) {
      for (let i = n; i < videoFrameTimes.length; i++) {
        console.log(`  frame ${i}: ${formatMs(videoFrameTimes[i])}`);
      }
    }
  }
}

main();
