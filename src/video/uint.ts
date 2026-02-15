export function readU8(view: DataView, off: number): number { return view.getUint8(off); }
export function readU16LE(view: DataView, off: number): number { return view.getUint16(off, true); }
export function readU32LE(view: DataView, off: number): number { return view.getUint32(off, true); }
export function readI32LE(view: DataView, off: number): number { return view.getInt32(off, true); }

export function readFourCCLE(view: DataView, off: number): string {
  const a = view.getUint8(off + 0);
  const b = view.getUint8(off + 1);
  const c = view.getUint8(off + 2);
  const d = view.getUint8(off + 3);
  return String.fromCharCode(a, b, c, d);
}

export function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}
