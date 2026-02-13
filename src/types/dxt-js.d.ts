declare module "dxt-js" {
  export const flags: { DXT1: number; DXT5: number };
  export function decompress(
    data: Uint8Array,
    width: number,
    height: number,
    format: number
  ): Uint8Array<ArrayBuffer>;
  export function compress(
    data: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    format: number
  ): Uint8Array<ArrayBuffer>;
}
