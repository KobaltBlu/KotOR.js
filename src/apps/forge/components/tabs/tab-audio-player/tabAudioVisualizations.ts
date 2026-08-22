export const TAB_AUDIO_VISUAL_IDS = ["spectrum", "hyperspace", "waveform"] as const;

export type TabAudioVisualId = (typeof TAB_AUDIO_VISUAL_IDS)[number];

export const TAB_AUDIO_VISUAL_OPTIONS: ReadonlyArray<{
  id: TabAudioVisualId;
  label: string;
  title: string;
  icon: string;
}> = [
  {
    id: "spectrum",
    label: "Spectrum",
    title: "Mirror spectrum bars",
    icon: "fa-bars-staggered",
  },
  {
    id: "hyperspace",
    label: "Hyperspace",
    title: "Always-on star streaks; audio warps and pulses the hyperspace field",
    icon: "fa-meteor",
  },
  {
    id: "waveform",
    label: "Waveform",
    title: "Time-domain waveform overview of the current buffer",
    icon: "fa-wave-square",
  },
];

/**
 * Kept for state compatibility with older builds that exposed `spectrumSmooth`.
 * Hyperspace no longer renders discrete spectrum bars.
 */
const HYPERSPACE_LEGACY_SMOOTH_SIZE = 144;

type HyperspaceStar = {
  angle: number;
  r: number;
  /** Per-star speed multiplier. Optional so hot-reloaded legacy state still works. */
  speed?: number;
  /** Per-star line-width multiplier. */
  size?: number;
  /** Stable phase used for subtle shimmer. */
  phase?: number;
  /** Small tint variation so the field is not perfectly monochrome. */
  warmth?: number;
};

type HyperspacePulse = {
  /** Normalized distance from the vanishing point, 0..1. */
  radius01: number;
  /** Peak pulse intensity when emitted. */
  strength: number;
  /** Seconds since emission. */
  age: number;
};

export type HyperspaceVizState = {
  stars: HyperspaceStar[];
  lastW: number;
  lastH: number;
  /** @deprecated Preserved so existing state consumers do not break. */
  spectrumSmooth: Float32Array;
  /** Used to make star travel frame-rate independent. */
  lastTimeMs?: number;
  /** Audio-reactive envelopes are optional for hot-reloaded legacy state. */
  energyEnvelope?: number;
  bassEnvelope?: number;
  midEnvelope?: number;
  highEnvelope?: number;
  bassBaseline?: number;
  previousBass?: number;
  kickEnvelope?: number;
  lastPulseMs?: number;
  pulses?: HyperspacePulse[];
};

function hyperspaceMaxR(w: number, h: number): number {
  return Math.hypot(w, h) * 0.58;
}

function hyperspaceStarCount(w: number, h: number): number {
  return Math.min(480, Math.max(190, Math.floor((w * h) / 620)));
}

function makeHyperspaceStar(maxR: number, fromCenter = false): HyperspaceStar {
  return {
    angle: Math.random() * Math.PI * 2,
    // Recycled stars enter near the vanishing point. The initial field is already
    // mid-flight so the first frame looks like an established tunnel.
    r: fromCenter
      ? maxR * (0.05 + Math.random() * 0.08)
      : maxR * (0.18 + Math.pow(Math.random(), 0.65) * 0.8),
    speed: 0.72 + Math.random() * 0.68,
    size: 0.72 + Math.random() * 0.85,
    phase: Math.random() * Math.PI * 2,
    warmth: Math.random(),
  };
}

function advanceHyperspaceStars(
  stars: HyperspaceVizState["stars"],
  maxR: number,
  dt: number,
  energy: number,
): void {
  const energySpeed = 0.94 + clamp01(energy) * 0.27;
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    if (star.speed === undefined) {
      star.speed = 0.72 + Math.random() * 0.68;
    }
    const travelT = clamp01(star.r / maxR);
    star.r +=
      maxR *
      0.285 *
      star.speed *
      energySpeed *
      (0.22 + 3.15 * travelT * travelT) *
      dt;
    if (star.r > maxR) {
      stars[i] = makeHyperspaceStar(maxR, true);
    }
  }
}

function warmupHyperspaceField(stars: HyperspaceVizState["stars"], maxR: number): void {
  const steps = 80;
  const dt = 1 / 30;
  for (let i = 0; i < steps; i++) {
    advanceHyperspaceStars(stars, maxR, dt, 0.22);
  }
}

export function createHyperspaceState(w: number, h: number): HyperspaceVizState {
  const maxR = hyperspaceMaxR(w, h);
  const target = hyperspaceStarCount(w, h);
  const stars: HyperspaceVizState["stars"] = [];
  for (let i = 0; i < target; i++) {
    stars.push(makeHyperspaceStar(maxR));
  }
  warmupHyperspaceField(stars, maxR);
  return {
    stars,
    lastW: w,
    lastH: h,
    spectrumSmooth: new Float32Array(HYPERSPACE_LEGACY_SMOOTH_SIZE).fill(0.035),
  };
}

export function ensureHyperspaceState(
  state: HyperspaceVizState | null,
  w: number,
  h: number
): HyperspaceVizState {
  if (!state) {
    return createHyperspaceState(w, h);
  }

  if (state.lastW !== w || state.lastH !== h) {
    const oldMax = hyperspaceMaxR(state.lastW, state.lastH);
    const newMax = hyperspaceMaxR(w, h);
    const scale = oldMax > 1 ? newMax / oldMax : 1;
    for (const star of state.stars) {
      star.r *= scale;
    }
    const target = hyperspaceStarCount(w, h);
    if (state.stars.length < target) {
      while (state.stars.length < target) {
        state.stars.push(makeHyperspaceStar(newMax));
      }
    } else if (state.stars.length > target + 48) {
      state.stars.length = target;
    }
    state.lastW = w;
    state.lastH = h;
  }

  // Keep hot-reloaded state usable after the old radial-spectrum implementation.
  if (state.spectrumSmooth.length !== HYPERSPACE_LEGACY_SMOOTH_SIZE) {
    state.spectrumSmooth = new Float32Array(HYPERSPACE_LEGACY_SMOOTH_SIZE).fill(0.035);
  }

  state.pulses ??= [];

  return state;
}

function meanFrequencyEnergy(data: Uint8Array | null, bufferLength: number): number {
  if (!data || bufferLength <= 0) {
    return 0.04;
  }

  // RMS is a better visual proxy for perceived energy than a flat arithmetic mean.
  let sumSquares = 0;
  const count = Math.min(bufferLength, data.length);
  for (let i = 0; i < count; i++) {
    const v = data[i] / 255;
    sumSquares += v * v;
  }
  return count > 0 ? Math.sqrt(sumSquares / count) : 0.04;
}

function frequencyBandEnergy(
  data: Uint8Array | null,
  bufferLength: number,
  lo01: number,
  hi01: number
): number {
  if (!data || bufferLength <= 0) {
    return 0;
  }

  const count = Math.min(data.length, bufferLength);
  if (count <= 0) {
    return 0;
  }

  const lo = Math.max(0, Math.min(count - 1, Math.floor(count * lo01)));
  const hi = Math.max(lo + 1, Math.min(count, Math.ceil(count * hi01)));
  let sumSquares = 0;
  let peak = 0;

  for (let i = lo; i < hi; i++) {
    const v = data[i] / 255;
    sumSquares += v * v;
    peak = Math.max(peak, v);
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, hi - lo));
  return rms * 0.82 + peak * 0.18;
}

function smoothReactiveEnvelope(
  current: number,
  target: number,
  dt: number,
  attackPerSecond: number,
  releasePerSecond: number
): number {
  const rate = target > current ? attackPerSecond : releasePerSecond;
  const blend = 1 - Math.exp(-rate * dt);
  return current + (target - current) * blend;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Draw only a whisper of the expanding pressure wave. The pulse is primarily
 * communicated by displaced / stretched stars, not by a visible UI ring.
 */
function drawHyperspacePulseGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  pulse: HyperspacePulse
): void {
  const radius = pulse.radius01 * maxR;
  if (radius <= 1) {
    return;
  }

  const width = maxR * (0.016 + pulse.radius01 * 0.018);
  const outer = Math.min(maxR * 1.08, radius + width * 2.2);
  if (outer <= 1) {
    return;
  }

  const centerStop = clamp01(radius / outer);
  const innerStop = clamp01(Math.min(centerStop - 0.08, (radius - width * 1.4) / outer));
  const outerStop = clamp01(Math.max(centerStop, (radius + width * 1.6) / outer));
  const alpha = Math.min(0.038, 0.008 + pulse.strength * 0.02);

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
  glow.addColorStop(0, "rgba(0,0,0,0)");
  if (innerStop > 0 && innerStop < centerStop) {
    glow.addColorStop(innerStop, "rgba(45,110,225,0)");
  }
  glow.addColorStop(centerStop, `rgba(105,190,255,${alpha})`);
  if (outerStop > centerStop) {
    glow.addColorStop(outerStop, "rgba(75,145,255,0)");
  }
  if (outerStop < 1) {
    glow.addColorStop(1, "rgba(0,0,0,0)");
  }

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();
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

  ctx.filter = "blur(36px)";
  const radius = Math.min(w, h) * 0.35 * (0.25 + strength * 0.75);
  ctx.fillStyle = "rgba(38, 92, 140, 0.45)";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 + radius * 0.15, radius, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.filter = "none";

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
  g.addColorStop(0, "rgb(12, 18, 28)");
  g.addColorStop(1, "rgb(6, 10, 16)");
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
  const maxR = hyperspaceMaxR(w, h);

  const previousTime = state.lastTimeMs ?? timeMs - 1000 / 60;
  // Clamp long gaps (background tab, breakpoint, etc.) so stars do not teleport across the screen.
  const dt = Math.max(1 / 240, Math.min(1 / 20, (timeMs - previousTime) / 1000));
  state.lastTimeMs = timeMs;

  /**
   * Hyperspace is now the visualizer. There are no discrete radial bars.
   * Bass emits pressure waves, mids bend the tunnel, highs add sparkle, and
   * overall energy subtly changes forward velocity / streak length.
   */
  const rawEnergy = meanFrequencyEnergy(data, bufferLength);
  const rawBass = Math.pow(frequencyBandEnergy(data, bufferLength, 0.0, 0.075), 0.82);
  const rawMid = Math.pow(frequencyBandEnergy(data, bufferLength, 0.075, 0.34), 0.9);
  const rawHigh = Math.pow(frequencyBandEnergy(data, bufferLength, 0.34, 0.78), 0.94);

  state.energyEnvelope = smoothReactiveEnvelope(
    state.energyEnvelope ?? rawEnergy,
    rawEnergy,
    dt,
    7.5,
    2.4
  );
  state.bassEnvelope = smoothReactiveEnvelope(
    state.bassEnvelope ?? rawBass,
    rawBass,
    dt,
    13.0,
    3.4
  );
  state.midEnvelope = smoothReactiveEnvelope(
    state.midEnvelope ?? rawMid,
    rawMid,
    dt,
    8.5,
    2.7
  );
  state.highEnvelope = smoothReactiveEnvelope(
    state.highEnvelope ?? rawHigh,
    rawHigh,
    dt,
    15.0,
    5.2
  );

  const energy = clamp01(state.energyEnvelope);
  const bass = clamp01(state.bassEnvelope);
  const mids = clamp01(state.midEnvelope);
  const highs = clamp01(state.highEnvelope);

  const previousBass = state.previousBass ?? rawBass;
  const bassBaseline = state.bassBaseline ?? rawBass;
  const baselineBlend = 1 - Math.exp(-1.15 * dt);
  state.bassBaseline = bassBaseline + (rawBass - bassBaseline) * baselineBlend;
  state.previousBass = rawBass;

  const bassRise = rawBass - previousBass;
  const bassTransient = rawBass - state.bassBaseline;
  const lastPulseMs = state.lastPulseMs ?? -Infinity;
  const canPulse = timeMs - lastPulseMs > 220;

  if (
    data &&
    bufferLength > 0 &&
    canPulse &&
    rawBass > 0.22 &&
    bassTransient > 0.05 &&
    bassRise > 0.012
  ) {
    const strength = clamp01(0.2 + bassTransient * 2.1 + bassRise * 3.2 + rawBass * 0.1);
    state.pulses ??= [];
    state.pulses.push({ radius01: 0.018, strength, age: 0 });
    if (state.pulses.length > 2) {
      state.pulses.splice(0, state.pulses.length - 2);
    }
    state.lastPulseMs = timeMs;
    state.kickEnvelope = Math.max(state.kickEnvelope ?? 0, strength * 0.6);
  }

  state.kickEnvelope = (state.kickEnvelope ?? 0) * Math.exp(-5.8 * dt);
  const kick = clamp01(state.kickEnvelope);

  state.pulses ??= [];
  for (const pulse of state.pulses) {
    pulse.age += dt;
    // The wave accelerates slightly as it moves toward the camera plane.
    pulse.radius01 += dt * (0.5 + pulse.strength * 0.16 + pulse.radius01 * 0.12);
    pulse.strength *= Math.exp(-0.58 * dt);
  }
  state.pulses = state.pulses.filter((pulse) => pulse.radius01 < 1.08 && pulse.strength > 0.05);

  // Deep-space background with a subtly brighter, audio-reactive vanishing point.
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.08);
  bg.addColorStop(0, `rgb(${Math.floor(6 + bass * 3)}, ${Math.floor(13 + energy * 4)}, ${Math.floor(30 + energy * 7)})`);
  bg.addColorStop(0.32, "rgb(3, 8, 20)");
  bg.addColorStop(0.72, "rgb(2, 5, 14)");
  bg.addColorStop(1, "rgb(1, 3, 9)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A diffuse throat glow. It breathes with energy but never becomes a separate visualizer.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const haloRadius = minDim * (0.235 + energy * 0.035 + kick * 0.012);
  const halo = ctx.createRadialGradient(
    cx,
    cy,
    minDim * (0.012 + bass * 0.004),
    cx,
    cy,
    haloRadius
  );
  halo.addColorStop(0, `rgba(150,215,255,${0.075 + energy * 0.12 + kick * 0.028})`);
  halo.addColorStop(0.16, `rgba(65,140,255,${0.045 + energy * 0.07})`);
  halo.addColorStop(0.48, `rgba(35,85,180,${0.014 + mids * 0.018})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - haloRadius, cy - haloRadius, haloRadius * 2, haloRadius * 2);

  // Extremely faint pressure-wave light. The displacement of the stars remains the dominant cue.
  for (const pulse of state.pulses) {
    drawHyperspacePulseGlow(ctx, cx, cy, maxR, pulse);
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  advanceHyperspaceStars(state.stars, maxR, dt, energy);

  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i];

    // Backward compatibility with state created before the richer star fields existed.
    if (star.speed === undefined) star.speed = 0.72 + Math.random() * 0.68;
    if (star.size === undefined) star.size = 0.72 + Math.random() * 0.85;
    if (star.phase === undefined) star.phase = Math.random() * Math.PI * 2;
    if (star.warmth === undefined) star.warmth = Math.random();

    const t = clamp01(star.r / maxR);

    let pulseInfluence = 0;
    for (const pulse of state.pulses) {
      const width = 0.028 + pulse.radius01 * 0.014;
      const distance = (t - pulse.radius01) / width;
      pulseInfluence += Math.exp(-0.5 * distance * distance) * pulse.strength;
    }
    pulseInfluence = Math.min(0.7, pulseInfluence);

    // Mids make the tunnel flex instead of drawing visible spectrum geometry.
    const midWave = Math.sin(
      star.angle * 3.0 + t * 9.5 - timeMs * 0.00155 + star.phase * 0.22
    );
    const midRadialWarp = 1 + mids * 0.022 * midWave * (0.3 + t * 0.7);
    const pulseWarp = 1 + pulseInfluence * 0.034;
    const renderR = star.r * midRadialWarp * pulseWarp;

    // A tiny angular shear makes the warp feel volumetric rather than like a flat zoom.
    const renderAngle =
      star.angle +
      mids * 0.0065 * Math.sin(t * 11.0 - timeMs * 0.0011 + star.phase * 0.7);

    const shimmer = 0.9 + 0.1 * Math.sin(timeMs * 0.0031 + star.phase);
    const sparklePhase = Math.max(0, Math.sin(timeMs * 0.011 + star.phase * 2.7));
    const highSparkle = 1 + highs * sparklePhase * 0.48;
    const tailLength =
      minDim *
      (0.0025 + 0.092 * t * t) *
      (0.78 + star.speed * 0.28) *
      (1 + energy * 0.16 + pulseInfluence * 0.75);
    const tailR = Math.max(minDim * 0.018, renderR - tailLength);

    const cos = Math.cos(renderAngle);
    const sin = Math.sin(renderAngle);
    const x0 = cx + cos * tailR;
    const y0 = cy + sin * tailR;
    const x1 = cx + cos * renderR;
    const y1 = cy + sin * renderR;

    const warmth = star.warmth ?? 0.5;
    const rC = Math.floor(124 + t * 90 + warmth * 12 + pulseInfluence * 7);
    const gC = Math.floor(177 + t * 67 + warmth * 6 + pulseInfluence * 5);
    const bC = 255;
    const near = t * t;
    const pulseBrightness = 1 + pulseInfluence * 0.32;

    // Soft bloom only for nearer / pulsed streaks. No central bars or spokes are drawn.
    if (t > 0.42 || pulseInfluence > 0.22) {
      ctx.strokeStyle = `rgba(${Math.min(255, rC)},${Math.min(255, gC)},${bC},${Math.min(
        0.5,
        (0.038 + near * 0.15) * shimmer * pulseBrightness * highSparkle
      )})`;
      ctx.lineWidth = star.size * (2.0 + near * 4.35 + pulseInfluence * 0.7);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(${Math.min(255, rC + 18)},${Math.min(255, gC + 12)},255,${Math.min(
      1,
      (0.21 + t * 0.7) * shimmer * pulseBrightness * highSparkle
    )})`;
    ctx.lineWidth = star.size * (0.5 + t * 1.8 + pulseInfluence * 0.16);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // High frequencies make star heads sparkle; bass pressure waves make them flash as they pass.
    if (t > 0.67 || (pulseInfluence > 0.4 && t > 0.28)) {
      const headAlpha = Math.min(
        0.92,
        0.12 + Math.max(0, t - 0.67) * 1.7 + highs * sparklePhase * 0.26 + pulseInfluence * 0.1
      );
      ctx.fillStyle = `rgba(228,244,255,${headAlpha})`;
      ctx.beginPath();
      ctx.arc(
        x1,
        y1,
        Math.max(0.48, star.size * (0.5 + t * 0.34 + highs * sparklePhase * 0.2)),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.restore();

  // Dark aperture: bass / kick slightly changes its scale, but there is no hard ring around it.
  const apertureR = minDim * 0.052 * (1 + bass * 0.035 + kick * 0.065);
  const aperture = ctx.createRadialGradient(cx, cy, 0, cx, cy, apertureR);
  aperture.addColorStop(0, "rgba(1,3,10,0.99)");
  aperture.addColorStop(0.52, `rgba(2,5,14,${0.94 - kick * 0.04})`);
  aperture.addColorStop(0.82, `rgba(9,22,48,${0.22 + bass * 0.08})`);
  aperture.addColorStop(1, "rgba(8,18,38,0)");
  ctx.fillStyle = aperture;
  ctx.beginPath();
  ctx.arc(cx, cy, apertureR, 0, Math.PI * 2);
  ctx.fill();
}


/** Cached overview peaks for the current AudioBuffer (min/max pairs, normalized -1..1). */
let waveformCacheKey = "";
let waveformCachePeaks: Float32Array | null = null;

function buildWaveformPeaks(buffer: AudioBuffer, buckets: number): Float32Array {
  const peaks = new Float32Array(buckets * 2);
  const channel = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / buckets));
  for (let i = 0; i < buckets; i++) {
    const start = i * block;
    const end = Math.min(channel.length, start + block);
    let min = 1;
    let max = -1;
    for (let j = start; j < end; j++) {
      const v = channel[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  return peaks;
}

function drawLiveTimeDomain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  live: Uint8Array,
): void {
  const mid = h * 0.5;
  const amp = h * 0.38;
  ctx.strokeStyle = "rgba(120, 190, 255, 0.85)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  const n = live.length;
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1)) * w;
    const y = mid + ((live[i] - 128) / 128) * amp;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawWaveformOverview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  buffer: AudioBuffer | null | undefined,
  progress01: number,
  liveTimeDomain?: Uint8Array | null,
): void {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, w, h);
  const mid = h * 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  if (!buffer || buffer.length <= 0) {
    if (liveTimeDomain && liveTimeDomain.length > 0) {
      drawLiveTimeDomain(ctx, w, h, liveTimeDomain);
      return;
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "12px sans-serif";
    ctx.fillText("No waveform — load a track to preview", 16, mid + 4);
    return;
  }

  const buckets = Math.max(64, Math.min(1200, Math.floor(w)));
  const key = `${buffer.duration}:${buffer.sampleRate}:${buffer.length}:${buckets}`;
  if (waveformCacheKey !== key || !waveformCachePeaks) {
    waveformCacheKey = key;
    waveformCachePeaks = buildWaveformPeaks(buffer, buckets);
  }
  const peaks = waveformCachePeaks;
  const barW = w / buckets;
  const amp = h * 0.42;
  const playX = Math.max(0, Math.min(1, progress01)) * w;

  for (let i = 0; i < buckets; i++) {
    const min = peaks[i * 2];
    const max = peaks[i * 2 + 1];
    const x = i * barW;
    const y1 = mid + min * amp;
    const y2 = mid + max * amp;
    const played = x + barW <= playX;
    ctx.fillStyle = played
      ? "rgba(120, 190, 255, 0.85)"
      : "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(x, Math.min(y1, y2), Math.max(1, barW * 0.9), Math.max(1, Math.abs(y2 - y1)));
  }

  ctx.strokeStyle = "rgba(120, 190, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(playX, 8);
  ctx.lineTo(playX, h - 8);
  ctx.stroke();
}
