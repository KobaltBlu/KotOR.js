import { TimedPhoneme, TimedPhonemeResult } from '@/apps/forge/states/tabs/tab-lip-editor/PhonemeToLIPShape';

export interface AudioPhonemeService {
  extractTimedPhonemes(audio: AudioBuffer): Promise<TimedPhonemeResult>;
}

// ── Goertzel single-bin power ─────────────────────────────────────────────────

function goertzelPower(samples: Float32Array, start: number, len: number, freq: number, sampleRate: number): number {
  const k = Math.round((len * freq) / sampleRate);
  const coeff = 2 * Math.cos((2 * Math.PI * k) / len);
  let s1 = 0;
  let s2 = 0;
  const end = Math.min(start + len, samples.length);
  for (let i = start; i < end; i++) {
    const s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
}

// ── Frequency band definitions ────────────────────────────────────────────────
//
//  F1-LOW   [0..2]  125–375 Hz   Close vowels (ee/oo), nasals
//  F1-MID   [3..5]  500–1000 Hz  Mid vowels (eh/oh), voiced consonants
//  F1-HIGH  [6..7]  1500–2000 Hz Open vowels (ah), lower F2 edge
//  F2-FRONT [8..9]  2500–3500 Hz Front vowels (ee/eh), fricative onset
//  FRIC    [10]     5000 Hz      Fricatives (f/v/th/s)
//  SIBL    [11]     7500 Hz      Sibilants (s/z/sh)
//
const BANDS = [125, 250, 375, 500, 750, 1000, 1500, 2000, 2500, 3500, 5000, 7500];
const F1L_END = 3; // bands 0..2
const F1M_END = 6; // bands 3..5
const F1H_END = 8; // bands 6..7
const F2F_END = 10; // bands 8..9

// ── Per-frame features ────────────────────────────────────────────────────────

interface Frame {
  startSec: number;
  endSec: number;
  rms: number;
  zcr: number;
  b: number[]; // normalised Goertzel band energies
  flux: number;
  onset: number; // positive energy derivative
}

// ── Viseme classifier ─────────────────────────────────────────────────────────
// Maps acoustic frame features to IPA-adjacent symbols that PhonemeToLIPShape
// converts to KotOR LIP shape indices.
//
// Priority order: fricatives → nasals → open vowels → mid vowels →
//                 close vowels → liquids → schwa

function classifyViseme(f: Frame, maxRms: number): string {
  const b = f.b;
  const nRms = f.rms / Math.max(maxRms, 1e-10);
  const zcr = f.zcr;

  const f1Low = b[0] + b[1] + b[2];
  const f1Mid = b[3] + b[4] + b[5];
  const f1High = b[6] + b[7];
  const f2Front = b[8] + b[9];
  const fric = b[10];
  const sibl = b[11];
  const highFreq = f2Front + fric + sibl;

  // ── Fricatives ────────────────────────────────────────────────────────────
  if (sibl + fric > 0.42 && zcr > 0.18) return 's';
  if (highFreq > 0.58 && zcr > 0.15) return 'S';
  if (highFreq > 0.45 && zcr > 0.12) return 'f';
  if (highFreq > 0.32 && zcr > 0.1) return 'T';

  // ── Nasals ────────────────────────────────────────────────────────────────
  if (nRms < 0.38 && zcr < 0.07 && f1Low + f1Mid > 0.62) return 'm';
  if (nRms < 0.5 && zcr < 0.09 && f1Low + f1Mid > 0.55) return 'n';

  // ── Open vowels (high F1 = jaw wide open) ─────────────────────────────────
  if (zcr < 0.14 && f1High > 0.28 && f2Front < 0.3 && nRms > 0.4) return 'A';
  if (zcr < 0.14 && f1High > 0.24 && f2Front > 0.28 && nRms > 0.35) return 'E';

  // ── Mid vowels ────────────────────────────────────────────────────────────
  if (zcr < 0.14 && f1Mid > 0.32 && f2Front < 0.28 && nRms > 0.3) return 'U';
  if (zcr < 0.14 && f1Mid > 0.28 && f2Front > 0.32 && nRms > 0.28) return 'E';

  // ── Close vowels ──────────────────────────────────────────────────────────
  if (zcr < 0.12 && f1Low > 0.38 && f2Front > 0.32) return 'i:';
  if (zcr < 0.12 && f1Low > 0.35 && f2Front < 0.25) return 'u';

  // ── Semivowels / liquids ──────────────────────────────────────────────────
  if (zcr < 0.1 && f1Low + f1Mid > 0.52 && nRms > 0.2) return 'w';
  if (zcr < 0.1 && f1Mid > 0.22 && f2Front > 0.25) return 'l';
  if (zcr < 0.14 && f2Front > 0.42) return 'j';

  return '>';
}

// ── Adaptive noise floor ──────────────────────────────────────────────────────

function adaptiveNoiseFloor(rmsValues: number[]): number {
  const sorted = [...rmsValues].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor(sorted.length * 0.1));
  return sorted[idx] ?? 0;
}

// ── Majority-vote smoothing ───────────────────────────────────────────────────

function smoothLabels(raw: (string | null)[], halfWin: number): (string | null)[] {
  return raw.map((_, i) => {
    if (!raw[i]) return null;
    const votes = new Map<string, number>();
    for (let d = -halfWin; d <= halfWin; d++) {
      const j = i + d;
      if (j >= 0 && j < raw.length && raw[j]) {
        const v = raw[j]!;
        votes.set(v, (votes.get(v) ?? 0) + 1);
      }
    }
    let best = raw[i]!,
      bestCt = 0;
    for (const [lbl, ct] of votes)
      if (ct > bestCt) {
        bestCt = ct;
        best = lbl;
      }
    return best;
  });
}

// ── Main service ─────────────────────────────────────────────────────────────

/**
 * Browser-only viseme extraction engine (v4) — optimised for video game lip sync.
 *
 * Design philosophy:
 *   - Every syllable energy-peak in the waveform should produce at least one
 *     keyframe. The jaw-open/jaw-close rhythm is more important for believable
 *     lip sync than accurate phoneme identity.
 *   - Syllable peaks (local RMS maxima) are the PRIMARY segmentation anchor.
 *     Onset/flux peaks are SECONDARY anchors for consonant transitions.
 *   - Silence between words → "m" (PHN_MPB, closed lips). NOT "@" which maps
 *     to PHN_AH (open mouth).
 *   - 5 ms hop gives per-syllable precision; 12 Goertzel bands cover all
 *     acoustically meaningful regions with no FFT dependency.
 *
 * Pipeline:
 *   1.  Mix to mono
 *   2.  Pre-emphasis  y[n] = x[n] − 0.97·x[n-1]  (backward in-place = correct)
 *   3.  Feature extraction — 20 ms frames, 5 ms hop
 *   4.  Adaptive noise floor + hysteresis VAD
 *   5.  Per-frame viseme classification
 *   6.  ±2-frame majority-vote label smoothing
 *   7.  Syllable peak detection on smoothed RMS envelope
 *   8.  Onset / flux peak detection
 *   9.  Split-point driven segmentation — peaks and onsets are mandatory splits
 *  10.  Adjacent same-label merge
 *  11.  Silence gap injection ("m" = closed lips) for gaps ≥ 40 ms
 *  12.  Final filter: clamp to audio duration, remove < 25 ms segments
 */
export class EnergyWindowPhonemeService implements AudioPhonemeService {
  async extractTimedPhonemes(audio: AudioBuffer): Promise<TimedPhonemeResult> {
    const sr = audio.sampleRate;
    const frameMs = 20;
    const hopMs = 5;
    const frameN = Math.max(1, Math.round((sr * frameMs) / 1000));
    const hopN = Math.max(1, Math.round((sr * hopMs) / 1000));

    // ── 1. Mono mix ───────────────────────────────────────────────
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }

    // ── 2. Pre-emphasis (backward in-place = correct causal FIR) ──
    for (let i = mono.length - 1; i > 0; i--) mono[i] -= 0.97 * mono[i - 1];

    // ── 3. Feature extraction ─────────────────────────────────────
    const frames: Frame[] = [];
    const rmsArr: number[] = [];
    let maxRms = 0;
    let prevNorm = new Array<number>(BANDS.length).fill(1 / BANDS.length);
    let prevRms = 0;

    for (let i = 0; i + frameN <= mono.length; i += hopN) {
      let sumSq = 0;
      let zc = 0;
      let prev = mono[i] || 0;
      for (let j = i; j < i + frameN; j++) {
        const s = mono[j];
        sumSq += s * s;
        if ((s >= 0 && prev < 0) || (s < 0 && prev >= 0)) zc++;
        prev = s;
      }
      const rms = Math.sqrt(sumSq / frameN);
      const zcr = zc / frameN;
      if (rms > maxRms) maxRms = rms;
      rmsArr.push(rms);

      const rawB = BANDS.map((f) => goertzelPower(mono, i, frameN, f, sr));
      const tot = rawB.reduce((a, v) => a + v, 0) || 1e-10;
      const b = rawB.map((v) => v / tot);

      let flux = 0;
      for (let k = 0; k < b.length; k++) flux += Math.abs(b[k] - prevNorm[k]);
      prevNorm = b;

      const onset = Math.max(0, rms - prevRms);
      prevRms = rms;

      frames.push({ startSec: i / sr, endSec: (i + frameN) / sr, rms, zcr, b, flux, onset });
    }

    if (!frames.length || maxRms < 1e-6) {
      return { source: 'auto', engine: 'energy-window-v4', items: [] };
    }

    // ── 4. Adaptive noise floor + VAD ────────────────────────────
    const noiseFloor = adaptiveNoiseFloor(rmsArr);
    const onThresh = Math.max(noiseFloor * 4.0, maxRms * 0.03);
    const offThresh = Math.max(noiseFloor * 2.5, maxRms * 0.02);

    const voiced = new Array<boolean>(frames.length).fill(false);
    let active = false;
    for (let i = 0; i < frames.length; i++) {
      if (!active && frames[i].rms >= onThresh) active = true;
      else if (active && frames[i].rms < offThresh) active = false;
      voiced[i] = active;
    }

    // ── 5 & 6. Per-frame labels + majority-vote smoothing ─────────
    const rawLabels: (string | null)[] = frames.map((f, i) => (voiced[i] ? classifyViseme(f, maxRms) : null));
    const labels = smoothLabels(rawLabels, 2);

    // ── 7. Syllable peak detection ───────────────────────────────
    // Smooth the RMS envelope to suppress micro-fluctuations, then find
    // the strongest local maxima with a minimum inter-peak spacing.
    // Each peak = one syllable nucleus = one guaranteed keyframe boundary.
    const smoothWin = Math.round(20 / hopMs); // 20 ms smoothing window
    const smoothedRms = frames.map((_, i) => {
      let sum = 0;
      let cnt = 0;
      for (let d = -smoothWin; d <= smoothWin; d++) {
        const j = i + d;
        if (j >= 0 && j < frames.length) {
          sum += frames[j].rms;
          cnt++;
        }
      }
      return sum / cnt;
    });

    // Local-maximum candidates (within ±peakWin frames)
    const peakWin = Math.round(30 / hopMs);
    const allPeakCandidates: { idx: number; rms: number }[] = [];
    for (let i = peakWin; i < frames.length - peakWin; i++) {
      if (!voiced[i]) continue;
      if (smoothedRms[i] < maxRms * 0.08) continue;
      let isPeak = true;
      for (let d = -peakWin; d <= peakWin; d++) {
        if (d !== 0 && smoothedRms[i + d] > smoothedRms[i]) {
          isPeak = false;
          break;
        }
      }
      if (isPeak) allPeakCandidates.push({ idx: i, rms: smoothedRms[i] });
    }

    // Enforce minimum inter-peak distance by greedily taking the highest peak
    // when competing candidates are within the window.
    const minPeakDist = Math.round(55 / hopMs); // 55 ms minimum between syllables
    allPeakCandidates.sort((a, b) => b.rms - a.rms);
    const syllablePeaks = new Set<number>();
    for (const cand of allPeakCandidates) {
      let tooClose = false;
      for (const sel of syllablePeaks) {
        if (Math.abs(cand.idx - sel) < minPeakDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) syllablePeaks.add(cand.idx);
    }

    // ── 8. Onset + flux peak detection ────────────────────────────
    const maxOnset = frames.reduce((m, f) => Math.max(m, f.onset), 1e-10);
    const maxFlux = frames.reduce((m, f) => Math.max(m, f.flux), 1e-10);
    const onsetTh = maxOnset * 0.15;
    const fluxTh = maxFlux * 0.22;

    const onsetPeaks = new Set<number>();
    for (let i = 1; i < frames.length - 1; i++) {
      if (!voiced[i]) continue;
      const isEnergyPeak =
        frames[i].onset > onsetTh &&
        frames[i].onset >= frames[i - 1].onset &&
        frames[i].onset >= (frames[i + 1]?.onset ?? 0);
      const isFluxPeak =
        frames[i].flux > fluxTh && frames[i].flux >= frames[i - 1].flux && frames[i].flux >= (frames[i + 1]?.flux ?? 0);
      if (isEnergyPeak || isFluxPeak) onsetPeaks.add(i);
    }

    // ── 9. Split-point driven segmentation ───────────────────────
    // Collect ALL candidate boundaries: VAD transitions, syllable peaks, onsets.
    // Then classify each resulting segment by majority vote within its frames.
    const splitSet = new Set<number>();

    for (let i = 1; i < frames.length; i++) {
      if (voiced[i] !== voiced[i - 1]) splitSet.add(i);
    }
    for (const p of syllablePeaks) splitSet.add(p);
    for (const p of onsetPeaks) splitSet.add(p);

    const boundaries = [...new Set([0, ...splitSet, frames.length])].sort((a, b) => a - b);

    interface Segment {
      startIdx: number;
      endIdx: number;
      label: string | null;
      peakRms: number;
    }

    const rawSegments: Segment[] = [];
    for (let s = 0; s < boundaries.length - 1; s++) {
      const startIdx = boundaries[s];
      const endIdx = boundaries[s + 1] - 1;
      if (endIdx < startIdx) continue;

      const votes = new Map<string, number>();
      let peakRms = 0;
      let voicedCt = 0;
      for (let i = startIdx; i <= endIdx; i++) {
        if (labels[i]) {
          votes.set(labels[i]!, (votes.get(labels[i]!) ?? 0) + 1);
          voicedCt++;
        }
        if (frames[i].rms > peakRms) peakRms = frames[i].rms;
      }

      let label: string | null = null;
      let topVotes = 0;
      for (const [lbl, ct] of votes)
        if (ct > topVotes) {
          topVotes = ct;
          label = lbl;
        }

      const total = endIdx - startIdx + 1;
      if (voicedCt < total * 0.3) label = null;

      rawSegments.push({ startIdx, endIdx, label, peakRms });
    }

    // ── 10. Adjacent same-label merge ─────────────────────────────
    // Merge only when neither segment contains a syllable peak — peaks anchor
    // boundaries that should not be collapsed even on identical labels.
    const merged: Segment[] = [];
    for (const seg of rawSegments) {
      const hasPeak = [...syllablePeaks].some((p) => p >= seg.startIdx && p <= seg.endIdx);
      const prev = merged.length ? merged[merged.length - 1] : null;
      const prevHasPeak = prev ? [...syllablePeaks].some((p) => p >= prev.startIdx && p <= prev.endIdx) : false;

      if (prev && prev.label === seg.label && !hasPeak && !prevHasPeak) {
        prev.endIdx = seg.endIdx;
        prev.peakRms = Math.max(prev.peakRms, seg.peakRms);
      } else {
        merged.push({ ...seg });
      }
    }

    // ── 11. Convert to TimedPhoneme ───────────────────────────────
    const minDurFrames = Math.round(25 / hopMs);
    const rawItems: TimedPhoneme[] = [];
    for (const seg of merged) {
      if (!seg.label) continue;
      if (seg.endIdx - seg.startIdx + 1 < minDurFrames) continue;
      rawItems.push({
        symbol: seg.label,
        startSec: frames[seg.startIdx].startSec,
        endSec: frames[seg.endIdx].endSec,
        confidence: Math.min(1, seg.peakRms / Math.max(maxRms, 1e-10)),
      });
    }

    // ── 12. Silence gap injection ─────────────────────────────────
    // "m" (PHN_MPB) = bilabial closure = closed lips. This is the correct rest
    // position for a character who is not speaking.
    // Do NOT use "@" here — "@" maps to PHN_AH (open mouth).
    const gapMinSec = 0.04;
    const withGaps: TimedPhoneme[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      if (i > 0) {
        const gap = rawItems[i].startSec - rawItems[i - 1].endSec;
        if (gap >= gapMinSec) {
          withGaps.push({
            symbol: 'm',
            startSec: rawItems[i - 1].endSec,
            endSec: rawItems[i].startSec,
            confidence: 1,
          });
        }
      }
      withGaps.push(rawItems[i]);
    }

    // ── 13. Final filter ──────────────────────────────────────────
    const minDurSec = 0.025;
    const filtered = withGaps
      .filter((it) => it.endSec - it.startSec >= minDurSec)
      .map((it) => ({
        ...it,
        startSec: Math.max(0, it.startSec),
        endSec: Math.min(audio.duration, it.endSec),
      }));

    return { source: 'auto', engine: 'energy-window-v4', items: filtered };
  }
}
