import * as THREE from "three";

/**
 * Configuration for the baked GUI fog volume (far + mid + near).
 *
 * Mid matches the original procedural expression:
 *
 *   vec3 pMid = vec3(
 *     p * vec2(1.6, 2.3) + vec2(-t * 0.014, t * 0.009),
 *     t * 0.028
 *   );
 *   simplex3d_fractal(pMid * 2.6 + 6.0);
 *
 * Far / near match the runtime metalFog coordinate expressions.
 *
 * Noise is evaluated in GLSL during baking via <shadertoy_perlin>.
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
   * 32 animation frames along the volume depth axis.
   *
   * Runtime uses hardware linear filtering between adjacent slices.
   */
  frameCount: 32,

  /**
   * The baked animation repeats after this many seconds.
   *
   * 64 seconds / 32 frames = 2 seconds between baked states.
   */
  periodSeconds: 64.0,

  /**
   * The procedural field is untouched through most of the cycle.
   * Only the final 12.5% crossfades toward t - period so the volume
   * loops without popping under RepeatWrapping on Z.
   */
  loopBlendStart: 0.875,
});

  /**
   * Bake far / mid / near fog into one RGBA Data3DTexture.
   *
   * R = far, G = mid, B = near (each normalized 0..1).
   * A is unused padding — WebGL2 sized RGB3D uploads fail through
   * Three's RGBFormat path (texStorage3D INVALID_ENUM).
   */
export function createGUIFogVolumeTexture(
  renderer: THREE.WebGLRenderer
): THREE.Data3DTexture {

  const cfg =
    GUI_FOG_VOLUME;

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

        float evaluateFar(
          vec2 p,
          float t
        ){
          vec3 pFar =
            vec3(
              p *
              vec2(
                0.85,
                1.25
              ) +
              vec2(
                t * 0.006,
                -t * 0.004
              ),
              t * 0.018
            );

          return simplex3d(
            pFar *
            2.0 +
            2.0
          );
        }

        float evaluateMid(
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

        float evaluateNear(
          vec2 p,
          float t
        ){
          vec3 pNear =
            vec3(
              p *
              vec2(
                2.8,
                3.6
              ) +
              vec2(
                t * 0.02,
                t * 0.012
              ),
              t * 0.04
            );

          return simplex3d(
            pNear *
            rot1 +
            10.0
          );
        }

        vec3 evaluateFog(
          vec2 p,
          float t
        ){
          return vec3(
            evaluateFar(p, t),
            evaluateMid(p, t),
            evaluateNear(p, t)
          );
        }

        void main(){

          vec2 p =
            v_uv *
            u_pExtent;

          float phase =
            u_time /
            u_period;

          vec3 value =
            evaluateFog(
              p,
              u_time
            );

          /**
           * Simplex fields are not temporally periodic.
           *
           * Crossfade toward t - period near the end of the cycle so
           * depth wrapping stays seamless.
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

            vec3 wrappedValue =
              evaluateFog(
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

  const renderTarget =
    new THREE.WebGLRenderTarget(
      cfg.sliceWidth,
      cfg.sliceHeight,
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
    cfg.sliceWidth,
    cfg.sliceHeight
  );

  const slicePixels =
    new Uint8Array(
      cfg.sliceWidth *
      cfg.sliceHeight *
      4
    );

  const volume =
    new Uint8Array(
      cfg.sliceWidth *
      cfg.sliceHeight *
      cfg.frameCount *
      4
    );

  const sliceStride =
    cfg.sliceWidth *
    cfg.sliceHeight *
    4;

  for(
    let frame = 0;
    frame < cfg.frameCount;
    frame++
  ){

    const time =
      (
        frame /
        cfg.frameCount
      ) *
      cfg.periodSeconds;

    bakeMaterial.uniforms
      .u_time.value =
        time;

    renderer.clear(
      true,
      false,
      false
    );

    renderer.render(
      scene,
      camera
    );

    renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      cfg.sliceWidth,
      cfg.sliceHeight,
      slicePixels
    );

    const sliceOffset =
      frame *
      sliceStride;

    /**
     * WebGL2 texStorage3D rejects unsized RGB via Three's RGBFormat
     * path. Pack as RGBA8 (A unused) so the volume uploads cleanly.
     */
    volume.set(
      slicePixels,
      sliceOffset
    );
  }

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

  const texture =
    new THREE.Data3DTexture(
      volume,
      cfg.sliceWidth,
      cfg.sliceHeight,
      cfg.frameCount
    );

  texture.format =
    THREE.RGBAFormat;

  texture.type =
    THREE.UnsignedByteType;

  texture.wrapS =
    THREE.ClampToEdgeWrapping;

  texture.wrapT =
    THREE.ClampToEdgeWrapping;

  texture.wrapR =
    THREE.RepeatWrapping;

  texture.minFilter =
    THREE.LinearFilter;

  texture.magFilter =
    THREE.LinearFilter;

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
      cfg.periodSeconds
  };

  renderTarget.dispose();
  geometry.dispose();
  bakeMaterial.dispose();

  return texture;
}
