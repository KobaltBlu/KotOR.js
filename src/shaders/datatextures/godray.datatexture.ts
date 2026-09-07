import * as THREE from "three";

const textureCache: Map<number, THREE.DataTexture> = new Map<number, THREE.DataTexture>();

/**
 * Get the god ray texture.
 * @param size - The size of the texture.
 * @returns The god ray texture.
 */
export const getGodRayTexture = (size: number = 256): THREE.DataTexture => {

  if(textureCache.has(size)){
    return textureCache.get(size);
  }

  const data = new Uint8Array(size * size * 4);

  // Must match the shader.
  const extent = 1.4;

  const smoothstep = (
    edge0: number,
    edge1: number,
    x: number
  ): number => {

    x = Math.max(
      0,
      Math.min(
        1,
        (x - edge0) / (edge1 - edge0)
      )
    );

    return x * x * (3 - 2 * x);
  };

  /*
   * Cheap deterministic value noise.
   *
   * This is CPU-side and runs once, so we're free to spend a little more
   * time here than we would in the fragment shader.
   */
  const hash = (
    x: number,
    y: number
  ): number => {

    let n = (
      Math.imul(x, 374761393) +
      Math.imul(y, 668265263)
    ) | 0;

    n = Math.imul(
      n ^ (n >>> 13),
      1274126177
    );

    n ^= n >>> 16;

    return (n >>> 0) / 4294967295;
  };

  const valueNoise = (
    x: number,
    y: number
  ): number => {

    const ix = Math.floor(x);
    const iy = Math.floor(y);

    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);

    const ab = a + (b - a) * sx;
    const cd = c + (d - c) * sx;

    return ab + (cd - ab) * sy;
  };

  for(let y = 0; y < size; y++){

    const v = (
      (y + 0.5) / size
    );

    // Convert texture coordinate into the same coordinate domain
    // consumed by godRays.
    const py = (
      (v * 2.0 - 1.0) *
      extent
    );

    for(let x = 0; x < size; x++){

      const u = (
        (x + 0.5) / size
      );

      const px = (
        (u * 2.0 - 1.0) *
        extent
      );

      const dist = Math.sqrt(
        px * px +
        py * py
      );

      /*
       * atan is expensive in a fragment shader.
       *
       * Here it doesn't matter because this runs once.
       */
      const angle = Math.atan2(
        py,
        px
      );

      /*
       * Recreate the three angular shaft families from your
       * existing shader.
       *
       * No time term here. Animation comes from rotating the
       * texture coordinates.
       */
      let shaft1 = Math.sin(
        angle * 10.0
      );

      shaft1 = Math.pow(
        Math.max(0, shaft1),
        6.0
      );

      let shaft2 = Math.sin(
        angle * 16.0 + 1.7
      );

      shaft2 = Math.pow(
        Math.max(0, shaft2),
        8.0
      ) * 0.65;

      let shaft3 = Math.sin(
        angle * 7.0
      );

      shaft3 = Math.pow(
        Math.max(0, shaft3),
        4.0
      ) * 0.4;

      let shafts = Math.min(
        1.0,
        shaft1 +
        shaft2 +
        shaft3
      );

      /*
       * Bake the original radial falloff into the texture.
       *
       * Original shader:
       *
       * exp(-dist * 1.55)
       * *
       * smoothstep(1.4, 0.05, dist)
       *
       * Rewritten here without reversed smoothstep edges.
       */
      const radialGate =
        1.0 -
        smoothstep(
          0.05,
          1.4,
          dist
        );

      const falloff =
        Math.exp(
          -dist * 1.55
        ) *
        radialGate;

      /*
       * Bake some spatial breakup into the ray texture.
       *
       * This replaces the runtime simplex3d call.
       *
       * Use a combination of angular and Cartesian noise so the
       * shafts don't look like perfectly clean spokes.
       */
      const noiseA = valueNoise(
        px * 3.0 + 17.0,
        py * 3.0 + 31.0
      );

      const noiseB = valueNoise(
        px * 7.0 + 53.0,
        py * 7.0 + 11.0
      );

      const breakup =
        0.72 +
        (
          noiseA * 0.65 +
          noiseB * 0.35
        ) * 0.38;

      let value =
        shafts *
        falloff *
        breakup;

      value = Math.max(
        0,
        Math.min(1, value)
      );

      const byte = Math.round(
        value * 255
      );

      const offset = (
        (y * size + x) *
        4
      );

      data[offset] = byte;
      data[offset + 1] = byte;
      data[offset + 2] = byte;
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  textureCache.set(size, texture);

  return texture;
}