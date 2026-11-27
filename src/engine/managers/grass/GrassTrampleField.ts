import * as THREE from "three";

/** Texels per side of the trample window (power of two for repeat wrapping). */
export const GRASS_TRAMPLE_SIZE = 256;
/** World units per trample texel. */
export const GRASS_TRAMPLE_TEXEL = 0.25;

/** Seconds a stamped texel stays pinned down after the foot lifts. */
const HOLD_TIME = 0.45;
/** Natural frequency (Hz) of an upright blade springing back. */
const SPRING_HZ = 0.85;
/** Damping ratio — under-damped so blades overshoot slightly when released. */
const SPRING_ZETA = 0.38;
const SPRING_K = (2 * Math.PI * SPRING_HZ) ** 2;
const SPRING_C = 2 * SPRING_ZETA * Math.sqrt(SPRING_K);
/** How fast a foot presses blades toward their stamped target (1/s). */
const PRESS_RATE = 22;
const MAX_SUBSTEP = 1 / 90;
/** Recenter when the focus point drifts this far from the window centre. */
const RECENTER_DISTANCE = 6;

/**
 * Persistent grass trample field.
 *
 * A camera-centred, toroidally addressed grid of bend vectors. Feet press
 * blades down and away from the creature (biased toward travel direction);
 * after a short hold, each texel springs back with an under-damped spring
 * whose stiffness rises as the blade lifts — flattened grass recovers slowly
 * at first, then flicks upright. Only active texels are simulated/uploaded.
 *
 * Shader samples with RepeatWrapping at uv = world.xy / windowSize, so the
 * window can move without copying data; texels leaving the window are zeroed.
 */
export class GrassTrampleField {
  readonly size: number;
  readonly texel: number;
  readonly texture: THREE.DataTexture;
  /** x,y = window min corner (world), z = window size (world), w = enabled */
  readonly window = new THREE.Vector4(0, 0, 0, 0);

  private bx: Float32Array;
  private by: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private hold: Float32Array;
  /** Unwrapped texel coords for each active storage slot. */
  private ux: Int32Array;
  private uy: Int32Array;
  private activeFlag: Uint8Array;
  private active: number[] = [];
  private data: Uint8Array;
  private dirty = false;

  private originX = 0;
  private originY = 0;
  private centerX = Number.NaN;
  private centerY = Number.NaN;

  constructor(size = GRASS_TRAMPLE_SIZE, texel = GRASS_TRAMPLE_TEXEL){
    this.size = size;
    this.texel = texel;
    const n = size * size;
    this.bx = new Float32Array(n);
    this.by = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.hold = new Float32Array(n);
    this.ux = new Int32Array(n);
    this.uy = new Int32Array(n);
    this.activeFlag = new Uint8Array(n);
    this.data = new Uint8Array(n * 4);
    for(let i = 0; i < n; i++){
      this.writeTexel(i, 0, 0);
    }

    this.texture = new THREE.DataTexture(this.data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  get activeCount(): number {
    return this.active.length;
  }

  clear(): void {
    for(let i = 0; i < this.active.length; i++){
      this.resetSlot(this.active[i]);
    }
    this.active.length = 0;
    this.centerX = Number.NaN;
    this.centerY = Number.NaN;
    this.window.w = 0;
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  /** Keep the window around the focus point (usually the camera). */
  setFocus(x: number, y: number): void {
    if(!Number.isNaN(this.centerX)){
      const dx = x - this.centerX;
      const dy = y - this.centerY;
      if(dx * dx + dy * dy < RECENTER_DISTANCE * RECENTER_DISTANCE){
        return;
      }
    }
    this.centerX = x;
    this.centerY = y;
    const half = this.size >> 1;
    this.originX = Math.floor(x / this.texel) - half;
    this.originY = Math.floor(y / this.texel) - half;
    this.window.set(this.originX * this.texel, this.originY * this.texel, this.size * this.texel, 1);

    // Evict active texels that fell outside the new window.
    const maxX = this.originX + this.size;
    const maxY = this.originY + this.size;
    for(let i = this.active.length - 1; i >= 0; i--){
      const s = this.active[i];
      const tx = this.ux[s];
      const ty = this.uy[s];
      if(tx < this.originX || tx >= maxX || ty < this.originY || ty >= maxY){
        this.resetSlot(s);
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        this.dirty = true;
      }
    }
  }

  /**
   * Press grass under a foot/body.
   * @param radius footprint radius (world units)
   * @param velX,velY creature velocity (world units / s)
   * @param weight 0..1 — how hard this body flattens grass
   */
  stamp(x: number, y: number, radius: number, velX: number, velY: number, weight: number, dt: number): void {
    if(this.window.w === 0 || !(radius > 0) || !(weight > 0)) return;

    const speed = Math.hypot(velX, velY);
    const moving = speed > 0.25;
    const mdx = moving ? velX / speed : 0;
    const mdy = moving ? velY / speed : 0;
    // Faster bodies push grass forward more than outward.
    const forward = moving ? Math.min(1, speed / 4) * 0.85 : 0;
    const press = 1 - Math.exp(-PRESS_RATE * Math.max(dt, 1 / 240));

    const minTx = Math.max(this.originX, Math.floor((x - radius) / this.texel));
    const maxTx = Math.min(this.originX + this.size - 1, Math.floor((x + radius) / this.texel));
    const minTy = Math.max(this.originY, Math.floor((y - radius) / this.texel));
    const maxTy = Math.min(this.originY + this.size - 1, Math.floor((y + radius) / this.texel));
    if(minTx > maxTx || minTy > maxTy) return;

    const core = radius * 0.5;
    const rSq = radius * radius;

    for(let ty = minTy; ty <= maxTy; ty++){
      const cy = (ty + 0.5) * this.texel - y;
      for(let tx = minTx; tx <= maxTx; tx++){
        const cx = (tx + 0.5) * this.texel - x;
        const dSq = cx * cx + cy * cy;
        if(dSq >= rSq) continue;
        const d = Math.sqrt(dSq);

        // Flat core, smooth rim.
        let falloff = 1;
        if(d > core){
          const t = (d - core) / (radius - core);
          falloff = 1 - t * t * (3 - 2 * t);
        }
        const strength = falloff * weight;
        if(strength < 0.02) continue;

        let dirX: number;
        let dirY: number;
        if(d > 1e-4){
          dirX = cx / d;
          dirY = cy / d;
        }else if(moving){
          dirX = mdx;
          dirY = mdy;
        }else{
          dirX = 1;
          dirY = 0;
        }
        if(moving){
          dirX += mdx * forward;
          dirY += mdy * forward;
          const len = Math.hypot(dirX, dirY);
          if(len > 1e-5){
            dirX /= len;
            dirY /= len;
          }
        }

        const s = this.slot(tx, ty);
        const curMagSq = this.bx[s] * this.bx[s] + this.by[s] * this.by[s];
        if(strength * strength > curMagSq * 0.81){
          this.bx[s] += (dirX * strength - this.bx[s]) * press;
          this.by[s] += (dirY * strength - this.by[s]) * press;
          this.vx[s] = 0;
          this.vy[s] = 0;
        }
        if(strength > 0.25){
          this.hold[s] = Math.max(this.hold[s], HOLD_TIME * strength);
        }
        this.activate(s, tx, ty);
      }
    }
  }

  /** Spring-back simulation + texture upload for active texels. */
  update(delta: number): void {
    const dtTotal = Math.min(Math.max(delta, 0), 0.25);
    if(this.active.length && dtTotal > 0){
      const steps = Math.max(1, Math.ceil(dtTotal / MAX_SUBSTEP));
      const dt = dtTotal / steps;
      for(let i = this.active.length - 1; i >= 0; i--){
        const s = this.active[i];
        let bx = this.bx[s];
        let by = this.by[s];
        let vx = this.vx[s];
        let vy = this.vy[s];
        let hold = this.hold[s];

        for(let k = 0; k < steps; k++){
          if(hold > 0){
            hold -= dt;
            continue;
          }
          // Stiffer as the blade lifts: flattened grass is slow to start recovering.
          const mag = Math.min(1, Math.sqrt(bx * bx + by * by));
          const stiff = SPRING_K * (0.22 + 0.78 * (1 - mag) * (1 - mag));
          const ax = -stiff * bx - SPRING_C * vx;
          const ay = -stiff * by - SPRING_C * vy;
          vx += ax * dt;
          vy += ay * dt;
          bx += vx * dt;
          by += vy * dt;
        }

        if(hold <= 0 && (bx * bx + by * by) < 1.6e-5 && (vx * vx + vy * vy) < 1e-4){
          this.resetSlot(s);
          this.active[i] = this.active[this.active.length - 1];
          this.active.pop();
        }else{
          this.bx[s] = bx;
          this.by[s] = by;
          this.vx[s] = vx;
          this.vy[s] = vy;
          this.hold[s] = Math.max(0, hold);
          this.writeTexel(s, bx, by);
        }
        this.dirty = true;
      }
    }

    if(this.dirty){
      this.texture.needsUpdate = true;
      this.dirty = false;
    }
  }

  /** Bend vector at a world point (nearest texel) — for tests/debug. */
  sample(x: number, y: number, out = new THREE.Vector2()): THREE.Vector2 {
    const tx = Math.floor(x / this.texel);
    const ty = Math.floor(y / this.texel);
    if(this.window.w === 0 || tx < this.originX || tx >= this.originX + this.size || ty < this.originY || ty >= this.originY + this.size){
      return out.set(0, 0);
    }
    const s = this.slot(tx, ty);
    return out.set(this.bx[s], this.by[s]);
  }

  dispose(): void {
    this.texture.dispose();
  }

  private slot(tx: number, ty: number): number {
    const n = this.size;
    const sx = ((tx % n) + n) % n;
    const sy = ((ty % n) + n) % n;
    return sy * n + sx;
  }

  private activate(s: number, tx: number, ty: number): void {
    if(!this.activeFlag[s]){
      this.activeFlag[s] = 1;
      this.active.push(s);
    }
    this.ux[s] = tx;
    this.uy[s] = ty;
    this.writeTexel(s, this.bx[s], this.by[s]);
    this.dirty = true;
  }

  private resetSlot(s: number): void {
    this.bx[s] = 0;
    this.by[s] = 0;
    this.vx[s] = 0;
    this.vy[s] = 0;
    this.hold[s] = 0;
    this.activeFlag[s] = 0;
    this.writeTexel(s, 0, 0);
  }

  private writeTexel(s: number, bx: number, by: number): void {
    const o = s * 4;
    const cx = Math.max(-1, Math.min(1, bx));
    const cy = Math.max(-1, Math.min(1, by));
    this.data[o] = Math.round(128 + cx * 127);
    this.data[o + 1] = Math.round(128 + cy * 127);
    this.data[o + 2] = Math.round(Math.min(1, Math.hypot(cx, cy)) * 255);
    this.data[o + 3] = 255;
  }
}
