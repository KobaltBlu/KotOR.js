export const TAB_AUDIO_VISUAL_IDS = ['spectrum', 'hyperspace'] as const;

export type TabAudioVisualId = (typeof TAB_AUDIO_VISUAL_IDS)[number];

export const TAB_AUDIO_VISUAL_OPTIONS: ReadonlyArray<{
  id: TabAudioVisualId;
  label: string;
  title: string;
  icon: string;
}> = [
  {
    id: 'spectrum',
    label: 'Spectrum',
    title: 'Mirror spectrum bars',
    icon: 'fa-bars-staggered',
  },
  {
    id: 'hyperspace',
    label: 'Hyperspace',
    title: 'Always-on star streaks; circular spectrum reacts to audio',
    icon: 'fa-meteor',
  },
];

/** Radial wedges around the hub; must match `spectrumSmooth` length in state. */
const HYPERSPACE_SPECTRUM_BARS = 80;

export type HyperspaceVizState = {
  stars: { angle: number; r: number }[];
  lastW: number;
  lastH: number;
  spectrumSmooth: Float32Array;
};

export function createHyperspaceState(w: number, h: number): HyperspaceVizState {
  const diag = Math.hypot(w, h);
  /** Dense field — stars are decorative only (not tied to playback / FFT). */
  const target = Math.min(560, Math.max(200, Math.floor((w * h) / 480)));
  const stars: HyperspaceVizState['stars'] = [];
  for (let i = 0; i < target; i++) {
    stars.push({
      angle: Math.random() * Math.PI * 2,
      r: Math.random() * diag * 0.62,
    });
  }
  return {
    stars,
    lastW: w,
    lastH: h,
    spectrumSmooth: new Float32Array(HYPERSPACE_SPECTRUM_BARS).fill(0.08),
  };
}

export function ensureHyperspaceState(state: HyperspaceVizState | null, w: number, h: number): HyperspaceVizState {
  if (!state || state.lastW !== w || state.lastH !== h) {
    return createHyperspaceState(w, h);
  }
  return state;
}

function meanFrequencyEnergy(data: Uint8Array | null, bufferLength: number): number {
  if (!data || bufferLength <= 0) {
    return 0.06;
  }
  let s = 0;
  for (let i = 0; i < bufferLength; i++) {
    s += data[i];
  }
  return s / bufferLength / 255;
}

function drawHyperspaceCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  minDim: number,
  data: Uint8Array | null,
  bufferLength: number,
  smooth: Float32Array,
  timeMs: number,
  energy: number
): void {
  const n = HYPERSPACE_SPECTRUM_BARS;
  if (smooth.length !== n) {
    return;
  }

  const rInner = minDim * 0.1;
  const maxBar = minDim * 0.24;
  const twoPi = Math.PI * 2;
  const globalBreathe = 0.07 + 0.028 * Math.sin(timeMs * 0.0016);

  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const binLo = data && bufferLength > 0 ? Math.min(bufferLength - 1, Math.max(0, Math.floor(t0 * bufferLength))) : 0;
    const binHi =
      data && bufferLength > 0 ? Math.min(bufferLength, Math.max(binLo + 1, Math.ceil(t1 * bufferLength))) : 0;

    let peak = 0;
    if (data && bufferLength > 0 && binHi > binLo) {
      for (let b = binLo; b < binHi; b++) {
        peak = Math.max(peak, data[b]);
      }
      peak /= 255;
    } else {
      const symI = Math.min(i, n - i);
      peak = globalBreathe * (0.82 + 0.18 * Math.sin(timeMs * 0.0024 + symI * 0.18 + Math.sin(symI * 0.07) * 0.5));
    }

    const target = Math.max(0.035, Math.min(1, peak * (0.72 + energy * 0.38)));
    smooth[i] = smooth[i] * 0.58 + target * 0.42;
  }

  /** Bilateral symmetry about the vertical axis through the hub (wedge i ↔ wedge n − i). */
  const halfN = n >> 1;
  for (let i = 0; i <= halfN; i++) {
    const j = (n - i) % n;
    const v = (smooth[i] + smooth[j]) * 0.5;
    smooth[i] = v;
    smooth[j] = v;
  }

  for (let i = 0; i < n; i++) {
    const mag = smooth[i];
    const t0 = i / n;
    const t1 = (i + 1) / n;

    /** Eased “depth” — louder bins rush forward (non-linear like Z toward camera). */
    const warpDepth = 1 - Math.pow(1 - mag, 2.05);
    const stretch = 0.06 + 0.94 * warpDepth;
    const ri = rInner;
    const ro = rInner + maxBar * stretch;

    const a0 = t0 * twoPi - Math.PI / 2;
    const a1 = t1 * twoPi - Math.PI / 2;
    const innerSpan = a1 - a0;
    const mid = (a0 + a1) * 0.5;
    /** Outer edge wider in angle — perspective: nearer geometry subtends more (warp toward camera). */
    const flare = 1 + (2.35 + energy * 0.55) * warpDepth * warpDepth;
    const outerSpan = innerSpan * flare;
    const a0o = mid - outerSpan * 0.5;
    const a1o = mid + outerSpan * 0.5;

    const ix0 = cx + Math.cos(a0) * ri;
    const iy0 = cy + Math.sin(a0) * ri;
    const ix1 = cx + Math.cos(a1) * ri;
    const iy1 = cy + Math.sin(a1) * ri;
    const ox0 = cx + Math.cos(a0o) * ro;
    const oy0 = cy + Math.sin(a0o) * ro;
    const ox1 = cx + Math.cos(a1o) * ro;
    const oy1 = cy + Math.sin(a1o) * ro;

    /** Side control points pushed slightly outward — curved “streak” sides. */
    const sideBulge = minDim * (0.022 * warpDepth + 0.006 * mag);
    const aCtrlL = (a0 + a0o) * 0.5;
    const aCtrlR = (a1 + a1o) * 0.5;
    const rMidL = (ri + ro) * 0.5 + sideBulge;
    const rMidR = (ri + ro) * 0.5 + sideBulge;
    const cxL = cx + Math.cos(aCtrlL) * rMidL;
    const cyL = cy + Math.sin(aCtrlL) * rMidL;
    const cxR = cx + Math.cos(aCtrlR) * rMidR;
    const cyR = cy + Math.sin(aCtrlR) * rMidR;

    /** Same tint for mirrored wedges (i and n − i). */
    const hue = Math.min(i, n - i) / (n * 0.5);
    const rC = Math.floor(45 + mag * 120 + energy * 55 + hue * 40);
    const gC = Math.floor(140 + mag * 95 + energy * 45);
    const bC = Math.min(255, Math.floor(210 + mag * 45 + energy * 20));

    const imx = cx + Math.cos(mid) * ri;
    const imy = cy + Math.sin(mid) * ri;
    const midO = (a0o + a1o) * 0.5;
    const omx = cx + Math.cos(midO) * ro;
    const omy = cy + Math.sin(midO) * ro;
    const g = ctx.createLinearGradient(imx, imy, omx, omy);
    g.addColorStop(
      0,
      `rgba(${Math.floor(rC * 0.45)},${Math.floor(gC * 0.5)},${Math.floor(bC * 0.55)},${0.12 + mag * 0.12})`
    );
    g.addColorStop(0.55, `rgba(${rC},${gC},${bC},${0.22 + warpDepth * 0.38})`);
    g.addColorStop(1, `rgba(${Math.min(255, rC + 55)},${Math.min(255, gC + 45)},255,${0.38 + warpDepth * 0.48})`);

    ctx.beginPath();
    ctx.moveTo(ix0, iy0);
    ctx.quadraticCurveTo(cxL, cyL, ox0, oy0);
    ctx.lineTo(ox1, oy1);
    ctx.quadraticCurveTo(cxR, cyR, ix1, iy1);
    ctx.closePath();

    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = `rgba(${Math.min(255, rC + 50)},${Math.min(255, gC + 40)},255,${0.28 + warpDepth * 0.52})`;
    ctx.lineWidth = 0.65 + warpDepth * 1.1;
    ctx.stroke();
  }
}

export function drawSpectrumBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: Uint8Array,
  bufferLength: number
): void {
  const barWidth = w / 2 / bufferLength;
  let firstX = -barWidth / 2;
  let secondX = bufferLength * barWidth - barWidth / 2;

  const maxHeight = Math.min(96, h * 0.45);
  const factor = maxHeight / 128;

  const total = data.reduce((prev, current) => prev + current, 0);
  const avg = total / bufferLength;
  const strength = avg / 128;

  ctx.filter = 'blur(36px)';
  const radius = Math.min(w, h) * 0.35 * (0.25 + strength * 0.75);
  ctx.fillStyle = 'rgba(38, 92, 140, 0.45)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 + radius * 0.15, radius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.filter = 'none';

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = data[i] * factor;
    const percent = barHeight / maxHeight;
    const r = Math.floor(20 + 40 * percent);
    const g = Math.floor(90 + 80 * percent);
    const b = Math.floor(140 + 90 * percent);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(w / 2 - firstX, h - barHeight, barWidth, barHeight);
    firstX += barWidth;
    ctx.fillRect(secondX, h - barHeight, barWidth, barHeight);
    secondX += barWidth;
  }
}

export function drawSpectrumIdle(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgb(12, 18, 28)');
  g.addColorStop(1, 'rgb(6, 10, 16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawHyperspace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: HyperspaceVizState,
  data: Uint8Array | null,
  bufferLength: number,
  timeMs: number
): void {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const minDim = Math.min(w, h);
  const maxR = Math.hypot(w, h) * 0.58;
  /**
   * Star motion is time-only (hyperspace illusion), not FFT or transport state.
   * Slight sine keeps it organic without tying to playback.
   */
  const starDr = 8.2 + 0.75 * Math.sin(timeMs * 0.00085);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.1);
  bg.addColorStop(0, 'rgb(8, 14, 32)');
  bg.addColorStop(0.45, 'rgb(4, 8, 20)');
  bg.addColorStop(1, 'rgb(2, 4, 12)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.lineCap = 'round';

  for (const star of state.stars) {
    const r0 = star.r;
    star.r += starDr;
    if (star.r > maxR) {
      star.r = 0.5 + Math.random() * 3.5;
      star.angle = Math.random() * Math.PI * 2;
      continue;
    }

    const x0 = cx + Math.cos(star.angle) * r0;
    const y0 = cy + Math.sin(star.angle) * r0;
    const x1 = cx + Math.cos(star.angle) * star.r;
    const y1 = cy + Math.sin(star.angle) * star.r;

    const t = star.r / maxR;
    const a = 0.3 + t * 0.62;
    const rC = Math.floor(110 + t * 100);
    const gC = Math.floor(168 + t * 75);
    const bC = 255;
    ctx.strokeStyle = `rgba(${rC},${gC},${bC},${a})`;
    ctx.lineWidth = 0.65 + t * 3.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  const energy = meanFrequencyEnergy(data, bufferLength);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawHyperspaceCircularSpectrum(ctx, cx, cy, minDim, data, bufferLength, state.spectrumSmooth, timeMs, energy);
  ctx.restore();
}
