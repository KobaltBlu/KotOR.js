import * as THREE from "three";
import { GameState } from "@/GameState";
import { TGAObject } from "@/resource/TGAObject";
import { flipYForceOpaque, pixelsToOffscreenCanvas } from "@/utility/framebufferCapture";

/**
 * Gameplay framebuffer / thumbnail capture for saves and UI.
 */
export class GameplayCapture {
  /**
   * Read the current default framebuffer into an OffscreenCanvas.
   * Caller must have already rendered (e.g. composer.render) — drawing
   * buffer is not preserved across frames.
   */
  static captureFramebufferToOffscreenCanvas(width: number, height: number): OffscreenCanvas {
    const gl = GameState.renderer.getContext() as WebGL2RenderingContext;
    const prevRT = GameState.renderer.getRenderTarget();
    GameState.renderer.setRenderTarget(null);

    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    GameState.renderer.setRenderTarget(prevRT);

    const flipped = flipYForceOpaque(pixels, width, height);
    return pixelsToOffscreenCanvas(flipped, width, height);
  }

  /**
   * Get a screenshot of the current game from the view of the player camera.
   */
  static async GetScreenShot(width = 256, height = 256): Promise<TGAObject> {
    if (!GameState.lastGameplayThumb) {
      GameState.lastGameplayThumb = new OffscreenCanvas(width, height);
      GameState.lastGameplayThumbCtx = GameState.lastGameplayThumb.getContext('2d')!;
    }else{
      GameState.lastGameplayThumb.width = width;
      GameState.lastGameplayThumb.height = height;
    }

    if (!GameState.lastGameplayThumbRT) {
      GameState.lastGameplayThumbRT = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: true,
        stencilBuffer: false,
      });
    }else{
      GameState.lastGameplayThumbRT.setSize(width, height);
      GameState.lastGameplayThumbRT.texture.needsUpdate = true;
    }

    const prevRT = GameState.renderer.getRenderTarget();
    GameState.renderer.setRenderTarget(GameState.lastGameplayThumbRT);
    GameState.renderer.clear(true, true, true);
    GameState.renderer.render(GameState.scene, GameState.camera);
    GameState.renderer.setRenderTarget(prevRT);

    const pixels = new Uint8Array(width * height * 4);
    GameState.renderer.readRenderTargetPixels(GameState.lastGameplayThumbRT, 0, 0, width, height, pixels);

    const flipped = flipYForceOpaque(pixels, width, height);
    GameState.lastGameplayThumbCtx!.putImageData(
      new ImageData(flipped as unknown as ImageDataArray, width, height),
      0,
      0,
    );

    return TGAObject.FromCanvas(GameState.lastGameplayThumb);
  }
}
