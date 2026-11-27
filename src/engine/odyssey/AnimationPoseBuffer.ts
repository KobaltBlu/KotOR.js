/**
 * Reusable sampled pose storage for stateless Position/Orientation composition.
 * Indexed by dense node index within a BoundAnimation (not global node id).
 * Avoids per-frame object allocation; clear via generation counter.
 */
export class AnimationPoseBuffer {
  positions: Float32Array;
  rotations: Float32Array;
  scales: Float32Array;
  /** Bit 0 pos, bit 1 ori, bit 2 scale written this generation. */
  channelMask: Uint8Array;
  /** Active node indexes written this generation (dense list). */
  activeNodes: Int32Array;
  activeCount = 0;
  generation = 1;
  private _nodeGen: Uint32Array;

  constructor(nodeCapacity = 64){
    const n = Math.max(1, nodeCapacity | 0);
    this.positions = new Float32Array(n * 3);
    this.rotations = new Float32Array(n * 4);
    this.scales = new Float32Array(n * 3);
    this.channelMask = new Uint8Array(n);
    this.activeNodes = new Int32Array(n);
    this._nodeGen = new Uint32Array(n);
  }

  ensureCapacity(nodeCount: number): void {
    if(nodeCount <= this.channelMask.length) return;
    const n = Math.max(nodeCount, this.channelMask.length * 2);
    const prevPos = this.positions;
    const prevRot = this.rotations;
    const prevScl = this.scales;
    const prevMask = this.channelMask;
    const prevActive = this.activeNodes;
    const prevGen = this._nodeGen;
    this.positions = new Float32Array(n * 3);
    this.rotations = new Float32Array(n * 4);
    this.scales = new Float32Array(n * 3);
    this.channelMask = new Uint8Array(n);
    this.activeNodes = new Int32Array(n);
    this._nodeGen = new Uint32Array(n);
    this.positions.set(prevPos);
    this.rotations.set(prevRot);
    this.scales.set(prevScl);
    this.channelMask.set(prevMask);
    this.activeNodes.set(prevActive);
    this._nodeGen.set(prevGen);
  }

  /** Begin a new composition pass without zeroing large buffers. */
  beginGeneration(): void {
    this.generation = (this.generation + 1) >>> 0;
    if(this.generation === 0) this.generation = 1;
    this.activeCount = 0;
  }

  private touch(nodeIndex: number): void {
    if(this._nodeGen[nodeIndex] !== this.generation){
      this._nodeGen[nodeIndex] = this.generation;
      this.channelMask[nodeIndex] = 0;
      if(this.activeCount < this.activeNodes.length){
        this.activeNodes[this.activeCount++] = nodeIndex;
      }
    }
  }

  writePosition(nodeIndex: number, x: number, y: number, z: number): void {
    this.touch(nodeIndex);
    const o = nodeIndex * 3;
    this.positions[o] = x;
    this.positions[o + 1] = y;
    this.positions[o + 2] = z;
    this.channelMask[nodeIndex] |= 1;
  }

  writeRotation(nodeIndex: number, x: number, y: number, z: number, w: number): void {
    this.touch(nodeIndex);
    const o = nodeIndex * 4;
    this.rotations[o] = x;
    this.rotations[o + 1] = y;
    this.rotations[o + 2] = z;
    this.rotations[o + 3] = w;
    this.channelMask[nodeIndex] |= 2;
  }

  writeScale(nodeIndex: number, x: number, y: number, z: number): void {
    this.touch(nodeIndex);
    const o = nodeIndex * 3;
    this.scales[o] = x;
    this.scales[o + 1] = y;
    this.scales[o + 2] = z;
    this.channelMask[nodeIndex] |= 4;
  }

  hasPosition(nodeIndex: number): boolean {
    return this._nodeGen[nodeIndex] === this.generation && (this.channelMask[nodeIndex] & 1) !== 0;
  }

  hasRotation(nodeIndex: number): boolean {
    return this._nodeGen[nodeIndex] === this.generation && (this.channelMask[nodeIndex] & 2) !== 0;
  }

  hasScale(nodeIndex: number): boolean {
    return this._nodeGen[nodeIndex] === this.generation && (this.channelMask[nodeIndex] & 4) !== 0;
  }
}
