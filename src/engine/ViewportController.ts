import { GameState } from "@/GameState";
import { OdysseyRenderPipeline } from "@/engine/OdysseyRenderPipeline";
import { asExtentInt, orthoFrustumInt } from "@/gui/GUICoord";
import { commitGuiTransform } from "@/gui/guiMatrix";

/**
 * Viewport resize: composer/depth targets, cameras, canvas CSS, Forge layout.
 */
export class ViewportController {

  static EventOnResize(){
    GameState.ResolutionManager.recalculate();
    let width = asExtentInt(GameState.ResolutionManager.getViewportWidth());
    let height = asExtentInt(GameState.ResolutionManager.getViewportHeight());

    OdysseyRenderPipeline.resizeComposerTargets(width, height);

    GameState.FadeOverlayManager.plane.scale.set(width, height, 1);
    commitGuiTransform(GameState.FadeOverlayManager.plane);

    GameState.VideoManager.resize(width, height);

    const guiFrustum = orthoFrustumInt(width, height);
    GameState.camera_gui.left = guiFrustum.left;
    GameState.camera_gui.right = guiFrustum.right;
    GameState.camera_gui.top = guiFrustum.top;
    GameState.camera_gui.bottom = guiFrustum.bottom;

    GameState.camera_gui.updateProjectionMatrix();

    GameState.camera.aspect = width / height;
    GameState.camera.updateProjectionMatrix();

    ViewportController.setRendererSize(width, height);
    
    GameState.camera_dialog.aspect = GameState.camera.aspect;
    GameState.camera_dialog.updateProjectionMatrix();

    GameState.camera_animated.aspect = GameState.camera.aspect;
    GameState.camera_animated.updateProjectionMatrix();

    for(let i = 0; i < GameState.staticCameras.length; i++){
      GameState.staticCameras[i].aspect = GameState.camera.aspect;
      GameState.staticCameras[i].updateProjectionMatrix();
    }

    GameState.screenCenter.x = ( (GameState.ResolutionManager.getViewportWidth()/2) / GameState.ResolutionManager.getViewportWidth() ) * 2 - 1;
    GameState.screenCenter.y = - ( (GameState.ResolutionManager.getViewportHeight()/2) / GameState.ResolutionManager.getViewportHeight() ) * 2 + 1; 

    GameState.MenuManager.Resize();

    if(GameState.ResolutionManager.vpScaleFactor && !GameState.forgePreviewHost){
      GameState.canvas.style.transform = 'scale('+GameState.ResolutionManager.vpScaleFactor+')';
    }else{
      GameState.canvas.style.transform = '';
    }

    if(GameState.forgePreviewHost){
      ViewportController.applyForgePreviewCanvasLayout();
    }
  }

  /**
   * Size/position the play canvas to the preview host without CSS stretch.
   */
  static applyForgePreviewCanvasLayout(): void {
    if(!GameState.canvas || !GameState.domElement){
      return;
    }
    const w = Math.max(1, GameState.domElement.clientWidth);
    const h = Math.max(1, GameState.domElement.clientHeight);
    GameState.canvas.style.setProperty('width', `${w}px`);
    GameState.canvas.style.setProperty('height', `${h}px`);
    GameState.canvas.style.setProperty('display', 'block');
    GameState.canvas.style.setProperty('position', 'absolute');
    GameState.canvas.style.setProperty('left', '0');
    GameState.canvas.style.setProperty('top', '0');
    GameState.canvas.style.removeProperty('transform');
  }

  /**
   * Resize the WebGL drawing buffer. When rendering to an OffscreenCanvas,
   * Three must not touch `.style` (Offscreen has none); CSS size stays on
   * the HTML placeholder instead.
   */
  static setRendererSize(width: number, height: number): void {
    const updateStyle = !GameState.offscreenCanvas;
    GameState.renderer.setSize(width, height, updateStyle);
    if(GameState.offscreenCanvas){
      GameState.canvas.style.width = `${width}px`;
      GameState.canvas.style.height = `${height}px`;
    }
  }

  /** Keep DepthTexture.image size in sync after WebGLRenderTarget.setSize. */
  static syncDepthTargetTextureSize(): void {
    const rt = GameState.depthTarget;
    const dt = rt?.depthTexture;
    if(!rt || !dt) return;
    if(!dt.image){
      dt.image = { width: rt.width, height: rt.height } as any;
    }else{
      dt.image.width = rt.width;
      dt.image.height = rt.height;
    }
    dt.needsUpdate = true;
  }

}
