import * as THREE from "three";
import { BIKObject } from "../resource/BIKObject";
import { GameState } from "../GameState";
import { EngineMode } from "../enums/engine/EngineMode";
import { AudioEngine } from "../audio/AudioEngine";
import { YUVFrame } from "../video/binkvideo";

/**
 * VideoManager class.
 *
 * Manages BIK video playback in the game engine.
 * Owns Three.js video planes, YUV textures, and shader material; adds them to
 * scene_movie for the GUI render pass (same approach as FadeOverlayManager).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file VideoManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoManager {

  static bikObject: BIKObject | null = null;

  static movieQueue: { name: string; skippable: boolean }[] = [];
  static currentMovie: { name: string; skippable: boolean } | null = null;
  static isPlaying: boolean = false;
  static lastEngineMode: EngineMode = EngineMode.GUI;

  // Three.js: video and background planes (owned here, added to scene_movie when playing)
  private static videoPlane: THREE.Mesh | null = null;
  private static backPlane: THREE.Mesh | null = null;
  private static geometry: THREE.PlaneGeometry | null = null;
  private static material: THREE.RawShaderMaterial | null = null;
  private static backPlaneMaterial: THREE.MeshBasicMaterial | null = null;
  private static yTex: THREE.DataTexture | null = null;
  private static uTex: THREE.DataTexture | null = null;
  private static vTex: THREE.DataTexture | null = null;
  /** Video dimensions from BIK header (for aspect-ratio resize) */
  private static videoWidth: number = 640;
  private static videoHeight: number = 480;

  /**
   * Create or reuse Three.js planes and material. Call before adding to scene.
   */
  private static ensureVideoPlanes(): void {
    if (VideoManager.videoPlane) return;

    VideoManager.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    VideoManager.material = new THREE.RawShaderMaterial({
      vertexShader: `
        precision highp float;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        attribute vec3 position;
        attribute vec4 color;
        attribute vec2 uv;
        varying vec2 v_texCoord;
        varying mat3 trans;
        void main() {
          v_texCoord = vec2(uv.x, 1.0 - uv.y);
          trans = mat3(
            1.0, 1.0, 1.0,
            0.0, -0.34414, 1.772,
            1.402, -0.71414, 0.0
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 v_texCoord;
        uniform sampler2D yTex;
        uniform sampler2D uTex;
        uniform sampler2D vTex;
        uniform vec2 uYTexSize;
        uniform float uSharpness;
        void main() {
          vec2 texel = 1.0 / uYTexSize;
          float yC = texture2D(yTex, v_texCoord).r;
          float y = yC;
          if (uSharpness > 0.0) {
            float yL = texture2D(yTex, v_texCoord - vec2(texel.x, 0.0)).r;
            float yR = texture2D(yTex, v_texCoord + vec2(texel.x, 0.0)).r;
            float yT = texture2D(yTex, v_texCoord + vec2(0.0, texel.y)).r;
            float yB = texture2D(yTex, v_texCoord - vec2(0.0, texel.y)).r;
            y = yC + uSharpness * (4.0 * yC - yL - yR - yT - yB);
            y = clamp(y, 0.0, 1.0);
          }
          float u = texture2D(uTex, v_texCoord).r;
          float v = texture2D(vTex, v_texCoord).r;
          vec3 R_cf = vec3(1.164383,  0.000000,  1.596027);
          vec3 G_cf = vec3(1.164383, -0.391762, -0.812968);
          vec3 B_cf = vec3(1.164383,  2.017232,  0.000000);
          vec3 offset = vec3(-0.0625, -0.5, -0.5);
          vec3 yuv = vec3(y, u, v) + offset;
          vec4 fragcolor = vec4(0.0, 0.0, 0.0, 1.0);
          fragcolor.r = dot(yuv, R_cf);
          fragcolor.g = dot(yuv, G_cf);
          fragcolor.b = dot(yuv, B_cf);
          gl_FragColor = clamp(fragcolor, 0.0, 1.0);
        }
      `,
      uniforms: {
        yTex: { value: null as THREE.DataTexture | null },
        uTex: { value: null as THREE.DataTexture | null },
        vTex: { value: null as THREE.DataTexture | null },
        uYTexSize: { value: new THREE.Vector2(1, 1) },
        uSharpness: { value: 0.35 },
      },
    });

    VideoManager.videoPlane = new THREE.Mesh(VideoManager.geometry, VideoManager.material);
    VideoManager.videoPlane.position.z = 498;
    VideoManager.videoPlane.visible = false;

    VideoManager.backPlaneMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    VideoManager.backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1, 1),
      VideoManager.backPlaneMaterial,
    );
    VideoManager.backPlane.position.z = 497;
    VideoManager.backPlane.visible = false;
  }

  /**
   * Initialize YUV textures for the current video dimensions (called when BIK header is ready).
   */
  static initVideoTextures(width: number, height: number): void {
    VideoManager.ensureVideoPlanes();
    VideoManager.videoWidth = width;
    VideoManager.videoHeight = height;

    const yStride = width;
    const cStride = (width + 1) >> 1;
    const yBh = ((height + 7) >> 3) << 3;
    const cBh = ((height + 15) >> 4) << 3;

    const yBuffer = new Uint8Array(yStride * yBh);
    const uBuffer = new Uint8Array(cStride * cBh);
    const vBuffer = new Uint8Array(cStride * cBh);
    uBuffer.fill(128);
    vBuffer.fill(128);

    if (VideoManager.yTex) VideoManager.yTex.dispose();
    if (VideoManager.uTex) VideoManager.uTex.dispose();
    if (VideoManager.vTex) VideoManager.vTex.dispose();

    VideoManager.yTex = new THREE.DataTexture(yBuffer, yStride, yBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    VideoManager.uTex = new THREE.DataTexture(uBuffer, cStride, cBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    VideoManager.vTex = new THREE.DataTexture(vBuffer, cStride, cBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);

    if (VideoManager.material?.uniforms) {
      VideoManager.material.uniforms.yTex.value = VideoManager.yTex;
      VideoManager.material.uniforms.uTex.value = VideoManager.uTex;
      VideoManager.material.uniforms.vTex.value = VideoManager.vTex;
      VideoManager.material.uniforms.uYTexSize.value.set(yStride, yBh);
      VideoManager.yTex.needsUpdate = true;
      VideoManager.uTex.needsUpdate = true;
      VideoManager.vTex.needsUpdate = true;
      VideoManager.material.uniformsNeedUpdate = true;
    }
  }

  /**
   * Upload a decoded YUV frame to the textures.
   */
  static updateVideoTextures(yuv: YUVFrame): void {
    if (!VideoManager.yTex || !VideoManager.uTex || !VideoManager.vTex || !VideoManager.material) return;
    const yBh = ((VideoManager.videoHeight + 7) >> 3) << 3;
    VideoManager.yTex.image.data.set(yuv.y);
    VideoManager.uTex.image.data.set(yuv.u);
    VideoManager.vTex.image.data.set(yuv.v);
    VideoManager.yTex.needsUpdate = true;
    VideoManager.uTex.needsUpdate = true;
    VideoManager.vTex.needsUpdate = true;
    if (VideoManager.material.uniforms?.uYTexSize) {
      VideoManager.material.uniforms.uYTexSize.value.set(yuv.linesizeY, yBh);
      VideoManager.material.uniformsNeedUpdate = true;
    }
  }

  /**
   * Resize video and back planes to fit viewport (contain aspect ratio).
   * Uses current video dimensions (set by initVideoTextures).
   */
  static resizeVideo(viewportWidth: number, viewportHeight: number): void {
    if (!VideoManager.videoPlane || !VideoManager.backPlane) return;
    const videoAspect = VideoManager.videoWidth / VideoManager.videoHeight;
    const windowAspect = viewportWidth / viewportHeight;
    if (videoAspect >= windowAspect) {
      VideoManager.videoPlane.scale.x = viewportWidth;
      VideoManager.videoPlane.scale.y = viewportWidth / videoAspect;
    } else {
      VideoManager.videoPlane.scale.y = viewportHeight;
      VideoManager.videoPlane.scale.x = viewportHeight * videoAspect;
    }
    VideoManager.backPlane.scale.x = viewportWidth;
    VideoManager.backPlane.scale.y = viewportHeight;
  }

  /**
   * Play a BIK video
   * @param movieName - The name of the BIK file to play (without extension)
   * @param onComplete - Optional callback when video completes
   * @returns Promise that resolves when video starts playing
   */
  static async playMovie(movieName: string, skipable: boolean = false, onComplete?: Function): Promise<void> {
    if (this.isPlaying) {
      console.warn('VideoManager.playMovie: A video is already playing');
      return;
    }

    try {
      VideoManager.ensureVideoPlanes();
      GameState.scene_movie.add(VideoManager.backPlane!);
      GameState.scene_movie.add(VideoManager.videoPlane!);

      this.bikObject = new BIKObject();

      const onReady = (width: number, height: number) => {
        VideoManager.initVideoTextures(width, height);
        const w = GameState.ResolutionManager?.getViewportWidth?.() ?? window.innerWidth;
        const h = GameState.ResolutionManager?.getViewportHeight?.() ?? window.innerHeight;
        VideoManager.resizeVideo(w, h);
      };

      if (GameState.Mode != EngineMode.MOVIE) {
        this.lastEngineMode = GameState.Mode;
        GameState.SetEngineMode(EngineMode.MOVIE);
      }

      await this.bikObject.play(movieName, () => {
        this.onMovieComplete();
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, onReady);

      this.currentMovie = { name: movieName, skippable: skipable };
      this.isPlaying = true;

      VideoManager.videoPlane!.visible = true;
      VideoManager.backPlane!.visible = true;

    } catch (error) {
      console.error('VideoManager.playMovie: Failed to play movie:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the currently playing video
   */
  static stopMovie(): void {
    if (this.bikObject) {
      this.bikObject.stop();
    }
    this.cleanup();
  }

  /**
   * Skip the currently playing video (if skippable)
   */
  static skipMovie(): void {
    if (!this.currentMovie?.skippable) {
      return;
    }
    this.stopMovie();
    this.playNextMovie();
  }

  /**
   * Queue a movie to be played
   */
  static queueMovie(movieName: string, skippable: boolean = false): void {
    if (!movieName) return;
    this.movieQueue.push({ name: movieName, skippable });
  }

  static async playNextMovie(): Promise<boolean> {
    if (this.movieQueue.length === 0) return false;
    const movie = this.movieQueue.shift()!;
    console.log('VideoManager.playNextMovie: Playing movie:', movie);
    try {
      await this.playMovie(movie.name, movie.skippable, () => {
        console.log('VideoManager.playNextMovie: Movie completed:', movie);
        this.playNextMovie();
      });
      return true;
    } catch (error) {
      console.error('VideoManager.playNextMovie: Failed to play movie:', error);
      return await this.playNextMovie();
    }
  }

  static async playMovieQueue(allowSeparateSkips: boolean = true): Promise<void> {
    if (this.movieQueue.length === 0) return;
    await this.playNextMovie();
  }

  static isMoviePlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Update the video manager (called from game loop)
   * @param delta - Time delta in seconds (unused; BIK uses wall clock / audio clock)
   */
  static update(delta: number): void {
    if (!this.bikObject || !this.isPlaying) return;
    this.bikObject.update(delta);
    const frame = this.bikObject.getCurrentFrame();
    if (frame) {
      VideoManager.updateVideoTextures(frame);
    }
  }

  /**
   * Call when window/viewport is resized (e.g. from GameState.EventOnResize).
   * Resizes video planes if a movie is playing.
   */
  static resize(viewportWidth: number, viewportHeight: number): void {
    if (this.bikObject && this.isPlaying) {
      VideoManager.resizeVideo(viewportWidth, viewportHeight);
    }
  }

  private static onMovieComplete(): void {
    this.cleanup();
  }

  private static cleanup(): void {
    if (VideoManager.videoPlane?.parent) {
      VideoManager.videoPlane.parent.remove(VideoManager.videoPlane);
    }
    if (VideoManager.backPlane?.parent) {
      VideoManager.backPlane.parent.remove(VideoManager.backPlane);
    }
    if (VideoManager.videoPlane) VideoManager.videoPlane.visible = false;
    if (VideoManager.backPlane) VideoManager.backPlane.visible = false;

    if (this.bikObject) {
      this.bikObject.dispose();
      this.bikObject = null;
    }

    this.currentMovie = null;
    this.isPlaying = false;

    if (GameState.Mode === EngineMode.MOVIE) {
      GameState.RestoreEnginePlayMode();
    }
  }

}
