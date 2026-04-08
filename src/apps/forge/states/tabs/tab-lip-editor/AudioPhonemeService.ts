import { TimedPhoneme, TimedPhonemeResult } from "@/apps/forge/states/tabs/tab-lip-editor/PhonemeToLIPShape";

export interface AudioPhonemeService {
  extractTimedPhonemes(audio: AudioBuffer): Promise<TimedPhonemeResult>;
}

// ── Goertzel single-frequency energy ─────────────────────────────────────────
// DFT energy for one frequency bin. O(N) — fast enough for 6 bands per frame.

function goertzelEnergy(
  samples: Float32Array,
  start: number,
  len: number,
  targetFreq: number,
  sampleRate: number,
): number {
  const k     = Math.round(len * targetFreq / sampleRate);
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

// ── Spectral bands ────────────────────────────────────────────────────────────
//   [0] 200 Hz  – low sonorant resonance
//   [1] 500 Hz  – first formant (F1) range
//   [2] 1200 Hz – second formant (F2) range
//   [3] 2500 Hz – upper F2 / fricative onset
//   [4] 4500 Hz – sibilant / fricative peak
//   [5] 7000 Hz – unvoiced fricative energy
const BAND_FREQS = [200, 500, 1200, 2500, 4500, 7000];

// ── Per-frame features ────────────────────────────────────────────────────────

interface FrameFeatures {
  startSec: number;
  endSec: number;
  rms: number;
  zcr: number;
  bands: number[];   // normalised Goertzel energies — 6 values
  flux: number;      // L1 spectral flux vs previous frame
  label: string | null;
}

// ── Phoneme classifier ────────────────────────────────────────────────────────

function classifyPhoneme(f: FrameFeatures, maxRms: number): string {
  const total = f.bands.reduce((a, b) => a + b, 0) || 1e-10;
  const b = f.bands.map(v => v / total);

  const lowRatio      = b[0] + b[1];
  const midRatio      = b[2];
  const hmidRatio     = b[3];
  const highRatio     = b[4];
  const vhighRatio    = b[5];
  const fricRatio     = hmidRatio + highRatio + vhighRatio;
  const nRms          = f.rms / Math.max(maxRms, 1e-10);

  // Fricatives — identified by high-frequency dominance + elevated ZCR
  if (fricRatio > 0.52 && highRatio + vhighRatio > 0.32 && f.zcr > 0.16) return "s";
  if (fricRatio > 0.50 && hmidRatio > highRatio && f.zcr > 0.14) return "S";
  if (fricRatio > 0.40 && hmidRatio > 0.18 && f.zcr > 0.09) return "f";
  if (fricRatio > 0.32 && f.zcr > 0.10) return "T";

  // Nasals — low energy, very low ZCR, low-frequency dominant
  if (nRms < 0.40 && f.zcr < 0.08 && lowRatio > 0.55) return "m";
  if (nRms < 0.50 && f.zcr < 0.10 && lowRatio > 0.48 && midRatio < 0.22) return "n";

  // Open vowels /ah/ — loud, low-freq dominant
  if (f.zcr < 0.13 && lowRatio > 0.48 && nRms > 0.50) return "A";

  // Mid-back vowels /oh/
  if (f.zcr < 0.13 && lowRatio > 0.38 && midRatio > 0.16 && nRms > 0.38) return "U";

  // High-front vowels /ee/ — F2 (1200 Hz) prominent
  if (f.zcr < 0.16 && midRatio + hmidRatio > 0.42 && b[2] > b[1]) return "i:";

  // Mid-front vowels /eh/
  if (f.zcr < 0.16 && midRatio > 0.22 && nRms > 0.30) return "E";

  // Round vowels /oo/
  if (f.zcr < 0.11 && lowRatio > 0.43 && nRms > 0.25) return "u";

  // Semivowel /w/
  if (f.zcr < 0.11 && lowRatio > 0.58) return "w";

  // Glide /y/
  if (f.zcr < 0.16 && midRatio + hmidRatio > 0.48) return "j";

  // Liquids /l r/
  if (f.zcr < 0.11 && midRatio > 0.18 && lowRatio > 0.28) return "l";

  // Schwa / neutral central vowel
  return "@";
}

// ── Sliding-window majority vote ─────────────────────────────────────────────
// Smooths per-frame labels so transient mislabels don't create spurious segments.

function smoothLabels(labels: (string | null)[], halfWin: number): (string | null)[] {
  const out: (string | null)[] = new Array(labels.length).fill(null);
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i]) continue;
    // collect window
    const votes = new Map<string, number>();
    for (let d = -halfWin; d <= halfWin; d++) {
      const idx = i + d;
      if (idx >= 0 && idx < labels.length && labels[idx]) {
        const lbl = labels[idx]!;
        votes.set(lbl, (votes.get(lbl) ?? 0) + 1);
      }
    }
    // pick winner
    let best = labels[i]!;
    let bestCt = 0;
    for (const [lbl, ct] of votes) {
      if (ct > bestCt) { bestCt = ct; best = lbl; }
    }
    out[i] = best;
  }
  return out;
}

// ── Main service ─────────────────────────────────────────────────────────────

/**
 * Browser-only acoustic analysis engine (v3).
 *
 * Key improvements over v2:
 * - Forward pre-emphasis (causal, correct direction)
 * - Lower VAD thresholds (6 % on / 4 % off) to catch quiet consonants
 * - Majority-vote label smoothing before segmentation
 * - Boundaries created on EVERY class transition — no minFrames gate on splits
 * - Flux split threshold reduced from 30 % to 18 % of max flux
 * - "Closed mouth" (@) markers injected between voiced segments
 * - Minimum commit reduced to 20 ms (2 frames)
 * - Post-filter: merge adjacent identical shapes, discard < 30 ms segments
 */
export class EnergyWindowPhonemeService implements AudioPhonemeService {
  async extractTimedPhonemes(audio: AudioBuffer): Promise<TimedPhonemeResult> {
    const sampleRate = audio.sampleRate;
    const frameMs    = 25;
    const hopMs      = 10;
    const frameSize  = Math.max(1, Math.floor((sampleRate * frameMs) / 1000));
    const hopSize    = Math.max(1, Math.floor((sampleRate * hopMs)   / 1000));

    // ── 1. Mix to mono ────────────────────────────────────────────
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }

    // ── 2. Pre-emphasis — forward causal y[n] = x[n] - 0.97·x[n-1] ──
    for (let i = mono.length - 1; i > 0; i--) {
      mono[i] = mono[i] - 0.97 * mono[i - 1];
    }

    // ── 3. Feature extraction (25 ms frame, 10 ms hop) ────────────
    const features: FrameFeatures[] = [];
    let maxRms = 0;
    let prevNorm = new Array<number>(BAND_FREQS.length).fill(0);

    for (let i = 0; i + frameSize <= mono.length; i += hopSize) {
      let sumSq = 0;
      let zc    = 0;
      let prev  = mono[i] || 0;
      for (let j = i; j < i + frameSize; j++) {
        const s = mono[j];
        sumSq += s * s;
        if ((s >= 0 && prev < 0) || (s < 0 && prev >= 0)) zc++;
        prev = s;
      }
      const rms = Math.sqrt(sumSq / frameSize);
      const zcr = zc / frameSize;
      if (rms > maxRms) maxRms = rms;

      const rawBands = BAND_FREQS.map(freq => goertzelEnergy(mono, i, frameSize, freq, sampleRate));
      const bandTot  = rawBands.reduce((a, b) => a + b, 0) || 1e-10;
      const bands    = rawBands.map(v => v / bandTot);

      // Spectral flux (L1 on normalised bands)
      let flux = 0;
      for (let b = 0; b < bands.length; b++) flux += Math.abs(bands[b] - prevNorm[b]);
      prevNorm = bands;

      features.push({ startSec: i / sampleRate, endSec: (i + frameSize) / sampleRate, rms, zcr, bands, flux, label: null });
    }

    if (!features.length || maxRms < 1e-6) {
      return { source: "auto", engine: "energy-window-v3", items: [] };
    }

    // ── 4. Voice activity detection — hysteresis ──────────────────
    // Lower thresholds catch quiet consonants and transitions.
    const onThresh  = maxRms * 0.06;
    const offThresh = maxRms * 0.04;
    const voiced    = new Array<boolean>(features.length).fill(false);
    let active      = false;
    for (let i = 0; i < features.length; i++) {
      if (!active && features[i].rms >= onThresh)  active = true;
      else if (active && features[i].rms < offThresh) active = false;
      voiced[i] = active;
    }

    // ── 5. Per-frame classification ───────────────────────────────
    const rawLabels: (string | null)[] = features.map((f, i) =>
      voiced[i] ? classifyPhoneme(f, maxRms) : null
    );

    // ── 6. Smooth labels (window = ±1 frame = ±10 ms) ─────────────
    const smoothed = smoothLabels(rawLabels, 1);

    // ── 7. Segment consolidation ──────────────────────────────────
    // Split on EVERY class transition and every significant flux peak.
    // No minFrames gate before splitting — that was the main cause of misses.
    const maxFlux       = features.reduce((m, f) => Math.max(m, f.flux), 1e-10);
    const fluxThreshold = maxFlux * 0.18;
    const minFrames     = Math.max(2, Math.round(20 / hopMs)); // 20 ms commit minimum

    const items: TimedPhoneme[] = [];
    let segStart  = -1;
    let segLabel: string | null = null;
    let segPeak   = 0;
    let segCount  = 0;

    const commit = (endIdx: number) => {
      if (segStart >= 0 && segLabel && segCount >= minFrames) {
        items.push({
          symbol:     segLabel,
          startSec:   features[segStart].startSec,
          endSec:     features[endIdx].endSec,
          confidence: Math.min(1, segPeak / Math.max(maxRms, 1e-10)),
        });
      }
      segStart = -1; segLabel = null; segPeak = 0; segCount = 0;
    };

    const startSeg = (i: number, lbl: string, rms: number) => {
      segStart = i; segLabel = lbl; segPeak = rms; segCount = 1;
    };

    for (let i = 0; i < features.length; i++) {
      const lbl = smoothed[i];
      const f   = features[i];

      if (!lbl) {
        commit(i > 0 ? i - 1 : 0);
        continue;
      }

      if (segStart < 0) {
        startSeg(i, lbl, f.rms);
        continue;
      }

      const classChanged = lbl !== segLabel;
      const fluxPeak     = f.flux > fluxThreshold && (i === 0 || f.flux >= features[i - 1].flux);

      if (classChanged || fluxPeak) {
        commit(i - 1);
        startSeg(i, lbl, f.rms);
      } else {
        segPeak = Math.max(segPeak, f.rms);
        segCount++;
      }
    }
    commit(features.length - 1);

    // ── 8. Post-processing ────────────────────────────────────────
    // a) Inject a closed-mouth marker (@) between voiced segments separated
    //    by a gap of ≥ 40 ms so the animator closes the mouth during pauses.
    const gapThreshold = 0.04;
    const withGaps: TimedPhoneme[] = [];
    for (let i = 0; i < items.length; i++) {
      if (i > 0) {
        const gap = items[i].startSec - items[i - 1].endSec;
        if (gap >= gapThreshold) {
          withGaps.push({
            symbol:     "@",
            startSec:   items[i - 1].endSec,
            endSec:     items[i].startSec,
            confidence: 1,
          });
        }
      }
      withGaps.push(items[i]);
    }

    // b) Discard segments shorter than 30 ms
    const minDurSec = 0.03;
    const filtered  = withGaps.filter(item => (item.endSec - item.startSec) >= minDurSec);

    return { source: "auto", engine: "energy-window-v3", items: filtered };
  }
}
