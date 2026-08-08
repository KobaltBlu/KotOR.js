import * as THREE from "three";

/**
 * Configuration for the baked GUI mid-fog volume.
 *
 * This texture represents the exact original expression:
 *
 *   vec3 pMid = vec3(
 *     p * vec2(1.6, 2.3) +
 *     vec2(-t * 0.014, t * 0.009),
 *     t * 0.028
 *   );
 *
 *   simplex3d_fractal(pMid * 2.6 + 6.0);
 *
 * The noise itself is evaluated by GLSL during baking, using the
 * engine's currently registered <shadertoy_perlin> chunk.
 */
export const GUI_FOG_VOLUME = Object.freeze({
  /**
   * 160 samples per horizontal p-unit.
   */
  sliceWidth: 160,

  /**
   * p.y may exceed 1.0 when the viewport is taller than wide.
   *
   * 240 / 160 = 1.5, giving identical texel density on X/Y.
   */
  sliceHeight: 240,

  pExtentX: 1.0,
  pExtentY: 1.5,

  /**
   * 32 animation frames.
   *
   * Runtime interpolation occurs between adjacent frames.
   */
  frameCount: 32,

  /**
   * 8 x 4 = 32 final tiles.
   */
  gridColumns: 8,
  gridRows: 4,

  /**
   * The baked animation repeats after this many seconds.
   *
   * 64 seconds / 32 frames = 2 seconds between baked states.
   *
   * The source fog evolves slowly enough that interpolation between
   * these states remains smooth.
   */
  periodSeconds: 64.0,

  /**
   * The original procedural field is untouched through most of the
   * cycle. Only the final 12.5% crossfades toward t - period so that
   * the atlas loops without popping.
   */
  loopBlendStart: 0.875,
});

export const GUI_FOG_ATLAS_WIDTH =
  GUI_FOG_VOLUME.sliceWidth *
  GUI_FOG_VOLUME.gridColumns;

export const GUI_FOG_ATLAS_HEIGHT =
  GUI_FOG_VOLUME.sliceHeight *
  GUI_FOG_VOLUME.gridRows;

/**
 * Temporary atlas includes frameCount + 1.
 *
 * Frame 32 is the exact loop endpoint and becomes the G channel of
 * final frame 31.
 */
const TEMP_GRID_COLUMNS = 9;
const TEMP_GRID_ROWS = 4;

const TEMP_ATLAS_WIDTH =
  GUI_FOG_VOLUME.sliceWidth *
  TEMP_GRID_COLUMNS;

const TEMP_ATLAS_HEIGHT =
  GUI_FOG_VOLUME.sliceHeight *
  TEMP_GRID_ROWS;

/**
 * Generate the exact mid-fog animation into a DataTexture.
 *
 * IMPORTANT:
 *
 * This intentionally evaluates simplex3d_fractal() in GLSL instead
 * of duplicating its implementation in TypeScript.
 *
 * Therefore if your unpublished <shadertoy_perlin> chunk changes,
 * this baker automatically uses the same implementation as the
 * runtime shaders.
 */
export function createGUIFogVolumeTexture(
  renderer: THREE.WebGLRenderer
): THREE.DataTexture {

  const cfg =
    GUI_FOG_VOLUME;

  /**
   * ------------------------------------------------------------
   * BAKE SHADER
   * ------------------------------------------------------------
   *
   * This is copied directly from the ORIGINAL mid-fog coordinate
   * expression.
   */
  const bakeMaterial =
    new THREE.ShaderMaterial({
      uniforms: {
        u_time: {
          value: 0.0
        },

        u_period: {
          value:
            cfg.periodSeconds
        },

        u_loopBlendStart: {
          value:
            cfg.loopBlendStart
        },

        u_pExtent: {
          value:
            new THREE.Vector2(
              cfg.pExtentX,
              cfg.pExtentY
            )
        }
      },

      vertexShader: `
        varying vec2 v_uv;

        void main(){
          v_uv = uv;

          gl_Position =
            vec4(
              position.xy,
              0.0,
              1.0
            );
        }
      `,

      fragmentShader: `
        precision highp float;

        varying vec2 v_uv;

        uniform float u_time;
        uniform float u_period;
        uniform float u_loopBlendStart;
        uniform vec2 u_pExtent;

        #include <shadertoy_perlin>

        /**
         * EXACT original mid-fog noise expression.
         */
        float evaluateMidFog(
          vec2 p,
          float t
        ){
          vec3 pMid =
            vec3(
              p *
              vec2(
                1.6,
                2.3
              ) +
              vec2(
                -t * 0.014,
                t * 0.009
              ),
              t * 0.028
            );

          return simplex3d_fractal(
            pMid *
            2.6 +
            6.0
          );
        }

        void main(){

          /**
           * Convert slice UV directly into the original p coordinate
           * system.
           *
           * Because slice dimensions match u_pExtent's aspect ratio,
           * this is 1:1 spatially.
           */
          vec2 p =
            v_uv *
            u_pExtent;

          float phase =
            u_time /
            u_period;

          float value =
            evaluateMidFog(
              p,
              u_time
            );

          /**
           * simplex3d_fractal() itself is not temporally periodic.
           *
           * Preserve the original field completely for most of the
           * cycle, then smoothly crossfade toward the equivalent
           * t - period state near the end.
           */
          if(
            phase >
            u_loopBlendStart
          ){
            float blend =
              smoothstep(
                u_loopBlendStart,
                1.0,
                phase
              );

            float wrappedValue =
              evaluateMidFog(
                p,
                u_time -
                u_period
              );

            value =
              mix(
                value,
                wrappedValue,
                blend
              );
          }

          /**
           * Store raw fractal output as normalized 0..1.
           *
           * Do NOT apply ridge/density/color here.
           */
          value =
            clamp(
              value *
              0.5 +
              0.5,
              0.0,
              1.0
            );

          gl_FragColor =
            vec4(
              value,
              value,
              value,
              1.0
            );
        }
      `,

      depthTest:
        false,

      depthWrite:
        false,

      transparent:
        false,

      blending:
        THREE.NoBlending,

      toneMapped:
        false
    });

  /**
   * Fullscreen triangle would also work, but this only runs once and
   * the ordinary quad keeps this straightforward.
   */
  const geometry =
    new THREE.PlaneGeometry(
      2,
      2
    );

  const mesh =
    new THREE.Mesh(
      geometry,
      bakeMaterial
    );

  const scene =
    new THREE.Scene();

  scene.add(mesh);

  const camera =
    new THREE.Camera();

  /**
   * ------------------------------------------------------------
   * TEMPORARY RENDER TARGET
   * ------------------------------------------------------------
   *
   * Contains 33 grayscale frames:
   *
   * 0 ... 31 = normal animation frames
   * 32       = exact t = period loop endpoint
   */
  const renderTarget =
    new THREE.WebGLRenderTarget(
      TEMP_ATLAS_WIDTH,
      TEMP_ATLAS_HEIGHT,
      {
        format:
          THREE.RGBAFormat,

        type:
          THREE.UnsignedByteType,

        minFilter:
          THREE.NearestFilter,

        magFilter:
          THREE.NearestFilter,

        depthBuffer:
          false,

        stencilBuffer:
          false,

        generateMipmaps:
          false
      }
    );

  renderTarget.texture.generateMipmaps =
    false;

  /**
   * ------------------------------------------------------------
   * SAVE RENDERER STATE
   * ------------------------------------------------------------
   */

  const oldRenderTarget =
    renderer.getRenderTarget();

  const oldViewport =
    renderer.getViewport(
      new THREE.Vector4()
    );

  const oldScissor =
    renderer.getScissor(
      new THREE.Vector4()
    );

  const oldScissorTest =
    renderer.getScissorTest();

  const oldAutoClear =
    renderer.autoClear;

  renderer.autoClear =
    false;

  renderer.setRenderTarget(
    renderTarget
  );

  renderer.setScissorTest(
    false
  );

  renderer.setViewport(
    0,
    0,
    TEMP_ATLAS_WIDTH,
    TEMP_ATLAS_HEIGHT
  );

  renderer.clear(
    true,
    false,
    false
  );

  /**
   * ------------------------------------------------------------
   * BAKE 33 TEMPORAL STATES
   * ------------------------------------------------------------
   */

  for(
    let frame = 0;
    frame <= cfg.frameCount;
    frame++
  ){

    const tileX =
      frame %
      TEMP_GRID_COLUMNS;

    const tileY =
      Math.floor(
        frame /
        TEMP_GRID_COLUMNS
      );

    const time =
      (
        frame /
        cfg.frameCount
      ) *
      cfg.periodSeconds;

    bakeMaterial.uniforms
      .u_time.value =
        time;

    renderer.setViewport(
      tileX *
      cfg.sliceWidth,

      tileY *
      cfg.sliceHeight,

      cfg.sliceWidth,
      cfg.sliceHeight
    );

    renderer.render(
      scene,
      camera
    );
  }

  /**
   * Read the baked atlas once.
   */
  const temporaryPixels =
    new Uint8Array(
      TEMP_ATLAS_WIDTH *
      TEMP_ATLAS_HEIGHT *
      4
    );

  renderer.readRenderTargetPixels(
    renderTarget,
    0,
    0,
    TEMP_ATLAS_WIDTH,
    TEMP_ATLAS_HEIGHT,
    temporaryPixels
  );

  /**
   * ------------------------------------------------------------
   * RESTORE RENDERER STATE
   * ------------------------------------------------------------
   */

  renderer.setRenderTarget(
    oldRenderTarget
  );

  renderer.setViewport(
    oldViewport
  );

  renderer.setScissor(
    oldScissor
  );

  renderer.setScissorTest(
    oldScissorTest
  );

  renderer.autoClear =
    oldAutoClear;

  /**
   * ------------------------------------------------------------
   * PACK CURRENT/NEXT INTO RG
   * ------------------------------------------------------------
   *
   * Final atlas has only 32 tiles.
   *
   * R = frame N
   * G = frame N+1
   *
   * Consequently the fragment shader needs ONE lookup to perform
   * temporal interpolation.
   */
  const output =
    new Uint8Array(
      GUI_FOG_ATLAS_WIDTH *
      GUI_FOG_ATLAS_HEIGHT *
      4
    );

  const readTemporaryFrame = (
    frame: number,
    x: number,
    y: number
  ): number => {

    const tileX =
      frame %
      TEMP_GRID_COLUMNS;

    const tileY =
      Math.floor(
        frame /
        TEMP_GRID_COLUMNS
      );

    const sourceX =
      tileX *
      cfg.sliceWidth +
      x;

    const sourceY =
      tileY *
      cfg.sliceHeight +
      y;

    const sourceOffset =
      (
        sourceY *
        TEMP_ATLAS_WIDTH +
        sourceX
      ) *
      4;

    /**
     * Bake shader wrote grayscale, so R is sufficient.
     */
    return temporaryPixels[
      sourceOffset
    ];
  };

  for(
    let frame = 0;
    frame < cfg.frameCount;
    frame++
  ){

    const tileX =
      frame %
      cfg.gridColumns;

    const tileY =
      Math.floor(
        frame /
        cfg.gridColumns
      );

    for(
      let y = 0;
      y < cfg.sliceHeight;
      y++
    ){

      for(
        let x = 0;
        x < cfg.sliceWidth;
        x++
      ){

        const current =
          readTemporaryFrame(
            frame,
            x,
            y
          );

        const next =
          readTemporaryFrame(
            frame + 1,
            x,
            y
          );

        const outputX =
          tileX *
          cfg.sliceWidth +
          x;

        const outputY =
          tileY *
          cfg.sliceHeight +
          y;

        const outputOffset =
          (
            outputY *
            GUI_FOG_ATLAS_WIDTH +
            outputX
          ) *
          4;

        output[
          outputOffset
        ] =
          current;

        output[
          outputOffset + 1
        ] =
          next;

        /**
         * Current frame again for easy visual inspection.
         */
        output[
          outputOffset + 2
        ] =
          current;

        output[
          outputOffset + 3
        ] =
          255;
      }
    }
  }

  /**
   * ------------------------------------------------------------
   * FINAL DATATEXTURE
   * ------------------------------------------------------------
   */

  const texture =
    new THREE.DataTexture(
      output,
      GUI_FOG_ATLAS_WIDTH,
      GUI_FOG_ATLAS_HEIGHT,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );

  texture.wrapS =
    THREE.ClampToEdgeWrapping;

  texture.wrapT =
    THREE.ClampToEdgeWrapping;

  /**
   * Linear filtering provides spatial interpolation between the baked
   * samples.
   */
  texture.minFilter =
    THREE.LinearFilter;

  texture.magFilter =
    THREE.LinearFilter;

  /**
   * Do not mip the noise volume.
   *
   * Mips would intentionally destroy the fine structure we're moving
   * out of simplex3d_fractal().
   */
  texture.generateMipmaps =
    false;

  texture.flipY =
    false;

  texture.needsUpdate =
    true;

  texture.userData.guiFogVolume = {
    sliceWidth:
      cfg.sliceWidth,

    sliceHeight:
      cfg.sliceHeight,

    pExtentX:
      cfg.pExtentX,

    pExtentY:
      cfg.pExtentY,

    frameCount:
      cfg.frameCount,

    periodSeconds:
      cfg.periodSeconds,

    atlasWidth:
      GUI_FOG_ATLAS_WIDTH,

    atlasHeight:
      GUI_FOG_ATLAS_HEIGHT
  };

  /**
   * Temporary GPU resources are no longer needed.
   */
  renderTarget.dispose();
  geometry.dispose();
  bakeMaterial.dispose();

  return texture;
}