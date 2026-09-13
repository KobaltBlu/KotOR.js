import * as THREE from "three";
import type { GUIControl } from "@/gui";
import { ResolutionManager } from "@/managers/ResolutionManager";
import { MouseState } from "@/enums/controls/MouseState";
import { MouseAxis } from "@/enums/controls/MouseAxis";
import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";

/** default mouse sensitivity (0x2C). */
const DEFAULT_MOUSE_SENSITIVITY = 0x2c;
const INI_MOUSE_SENSITIVITY = 'Game Options.Mouse Sensitivity';
const INI_REVERSE_BUTTONS = 'Game Options.Reverse Mouse Buttons';
const INI_MOUSE_LOOK = 'Game Options.Mouse Look';

/**
 * Mouse class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file Mouse.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Mouse {
  static editor: any;
  static camera: any;
  static MouseX: number = 0;
  static MouseY: number = 0;
  static OldMouseX: number = 0;
  static OldMouseY: number = 0;
  static OffsetX: number = 0;
  static OffsetY: number = 0;
  static MouseDownX: number = 0;
  static MouseDownY: number = 0;
  static MouseDown: boolean = false;
  static ButtonState: MouseState;
  static MiddleMouseDown: boolean = false;
  static Dragging: boolean = false;
  static target: any;
  static CollisionPosition: THREE.Vector3 = new THREE.Vector3();
  static Vector: THREE.Vector2 = new THREE.Vector2();
  static Client: THREE.Vector2 = new THREE.Vector2();
  /** True while document.pointerLockElement is our game canvas. */
  static pointerLock: boolean = false;
  /** We want lock for the current camera-hold; false after release. */
  static pointerLockWanted: boolean = false;
  /** Browser rejected lock for this hold attempt — use absolute mouse until hold ends. */
  static pointerLockDenied: boolean = false;
  /** requestPointerLock is missing / unusable in this environment. */
  static pointerLockUnsupported: boolean = false;

  // Logical button states (after Reverse Mouse Buttons mapping)
  static leftDown: boolean = false;
  static leftClick: boolean = false;
  static rightDown: boolean = false;
  static rightClick: boolean = false;
  static middleDown: boolean = false;
  /** g_bShiftActionState — full-stack give/transfer when true. */
  static shiftKey: boolean = false;

  /**
   * rightClickHeld / mouseCameraRotateToggle — chase-cam look is active.
   * Enter stores software cursor; exit restores it (Store/RestoreOldMousePosition).
   */
  static cameraHoldActive: boolean = false;
  /** True while the press that started camera-hold is still down (skip world click). */
  static cameraHoldConsumedPress: boolean = false;
  static storedCursorX: number = 0;
  static storedCursorY: number = 0;

  //positions
  static position: THREE.Vector2 = new THREE.Vector2();

  //MouseEvent client x/y
  static positionWindow: THREE.Vector2 = new THREE.Vector2();

  //MouseEvent client x/y
  static positionViewport: THREE.Vector2 = new THREE.Vector2();

  //Game UI mouse position (centered Y-up; legacy float path for sliders/map)
  static positionUI: THREE.Vector2 = new THREE.Vector2();

  /**
   * GuiManager mouse_x / mouse_y — top-left viewport pixel ints.
   * Drive GUI HitCheckMouse / GetLocalMouseCoords from these.
   */
  static positionViewportInt: { x: number; y: number } = { x: 0, y: 0 };

  //UI Control State
  static downItem: GUIControl;
  static clickItem: GUIControl;

  constructor(){

  }

  static Update(x: number, y: number){
    Mouse.positionWindow.x = x;
    Mouse.positionWindow.y = y;

    const res = ResolutionManager.screenResolution;
    const host = ResolutionManager.viewportHost;

    // Embedded hosts (Forge preview): map client coords into the host box.
    if(host){
      const rect = host.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;
      const vpW = Math.max(1, rect.width);
      const vpH = Math.max(1, rect.height);

      Mouse.positionViewport.x = localX;
      Mouse.positionViewport.y = localY;

      Mouse.position.x = Mouse.Vector.x = ( localX / vpW ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( localY / vpH ) * 2 + 1;
      Mouse.positionUI.x = Mouse.Vector.x = ( localX - (vpW / 2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( localY - (vpH / 2) );
      Mouse.positionViewportInt.x = Math.trunc(Mouse.positionViewport.x) | 0;
      Mouse.positionViewportInt.y = Math.trunc(Mouse.positionViewport.y) | 0;
      return;
    }

    if(res.isDynamicRes){
      Mouse.positionViewport.x = x;
      Mouse.positionViewport.y = y;

      Mouse.position.x = Mouse.Vector.x = ( x / window.innerWidth ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( y / window.innerHeight ) * 2 + 1;
      Mouse.positionUI.x = Mouse.Vector.x = ( x - (window.innerWidth/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( y -(window.innerHeight/2) );
    }else{
      // Fixed resolutions render at res WxH then CSS-scale (vpScaleFactor) inside the
      // flex-centered viewport-wrapper. Map client coords through the scaled canvas
      // bounds so the software cursor stays locked to the hardware pointer.
      const canvas = GameState.canvas as HTMLCanvasElement | undefined;
      const rect = canvas?.getBoundingClientRect?.();
      if(rect && rect.width > 0 && rect.height > 0){
        Mouse.positionViewport.x = ((x - rect.left) / rect.width) * res.width;
        Mouse.positionViewport.y = ((y - rect.top) / rect.height) * res.height;
      }else{
        const scale = ResolutionManager.vpScaleFactor || 1;
        const winW = ResolutionManager.windowResolution.width;
        const winH = ResolutionManager.windowResolution.height;
        const displayedW = res.width * scale;
        const displayedH = res.height * scale;
        const offsetX = (winW - displayedW) / 2;
        const offsetY = (winH - displayedH) / 2;
        Mouse.positionViewport.x = (x - offsetX) / scale;
        Mouse.positionViewport.y = (y - offsetY) / scale;
      }

      Mouse.position.x = Mouse.Vector.x = ( Mouse.positionViewport.x / res.width ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( Mouse.positionViewport.y / res.height ) * 2 + 1;
      Mouse.positionUI.x = Mouse.Vector.x = ( Mouse.positionViewport.x - (res.width/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( Mouse.positionViewport.y -(res.height/2) );
    }

    Mouse.positionViewportInt.x = Math.trunc(Mouse.positionViewport.x) | 0;
    Mouse.positionViewportInt.y = Math.trunc(Mouse.positionViewport.y) | 0;
  }

  /**
   * GetMouseSenSetting —
   * sensitivity * 0.01 * 45.0 + 10.0 (degrees scale for mouse deltas).
   */
  static getSensitivityDegrees(): number {
    const raw = Number(GameState.iniConfig?.getProperty?.(INI_MOUSE_SENSITIVITY));
    const sensitivity = Number.isFinite(raw) ? raw : DEFAULT_MOUSE_SENSITIVITY;
    return sensitivity * 0.01 * 45.0 + 10.0;
  }

  /** client_options->mouse_look (Game Options.Mouse Look). */
  static isMouseLookEnabled(): boolean {
    return Number(GameState.iniConfig?.getProperty?.(INI_MOUSE_LOOK)) === 1;
  }

  /** reverse_mouse_buttons (Game Options.Reverse Mouse Buttons). */
  static isReverseButtonsEnabled(): boolean {
    return !!Number(GameState.iniConfig?.getProperty?.(INI_REVERSE_BUTTONS));
  }

  /**
   * Map browser button (0/1/2) to logical left/right/middle after Reverse Mouse Buttons.
   */
  static mapBrowserButton(button: number): 'left' | 'right' | 'middle' | 'other' {
    if(button === 1) return 'middle';
    const reverse = Mouse.isReverseButtonsEnabled();
    if(button === 0) return reverse ? 'right' : 'left';
    if(button === 2) return reverse ? 'left' : 'right';
    return 'other';
  }

  /**
   * Reconcile logical button flags from a mouse event.
   * `event.buttons` alone is unreliable on down/up (the transitioning button may
   * be excluded or not yet included), so merge `event.button` for those types.
   */
  static updateButtonStateFromEvent(event: MouseEvent){
    const reverse = Mouse.isReverseButtonsEnabled();
    let physLeft = !!(event.buttons & 1);
    let physRight = !!(event.buttons & 2);
    let physMiddle = !!(event.buttons & 4);

    if(event.type === 'mousedown' || event.type === 'mouseup'){
      const logical = Mouse.mapBrowserButton(event.button);
      if(logical === 'left'){
        physLeft = event.type === 'mousedown';
      }else if(logical === 'right'){
        physRight = event.type === 'mousedown';
      }else if(logical === 'middle'){
        physMiddle = event.type === 'mousedown';
      }
    }

    Mouse.leftDown = reverse ? physRight : physLeft;
    Mouse.rightDown = reverse ? physLeft : physRight;
    Mouse.middleDown = physMiddle;
    Mouse.MiddleMouseDown = physMiddle;
  }

  /** Clear all button flags (window blur / missed mouseup recovery). */
  static clearButtonState(){
    Mouse.leftDown = false;
    Mouse.rightDown = false;
    Mouse.middleDown = false;
    Mouse.MiddleMouseDown = false;
  }

  /**
   * Whether chase-camera mouse look should consume deltas this frame.
   * UpdateCamera / ProcessInput: look state is `rightClickHeld`, inverted
   * when `mouse_look` is set — never left-button hold.
   */
  static isCameraHoldDesired(): boolean {
    if(GameState.Mode == EngineMode.GUI || GameState.Mode == EngineMode.DIALOG){
      return false;
    }
    if(GameState.Mode == EngineMode.FREELOOK){
      return false;
    }
    if(GameState.Mode != EngineMode.INGAME){
      return false;
    }
    // Logical right after Reverse Mouse Buttons
    const rightHeld = Mouse.rightDown;
    return Mouse.isMouseLookEnabled() ? !rightHeld : rightHeld;
  }

  /** Sync cameraHoldActive to isCameraHoldDesired (call once per frame). */
  static syncCameraHold(){
    const want = Mouse.isCameraHoldDesired();
    if(want && !Mouse.cameraHoldActive){
      Mouse.beginCameraHold();
    }else if(!want && Mouse.cameraHoldActive){
      Mouse.endCameraHold();
    }
  }

  static beginCameraHold(){
    if(Mouse.cameraHoldActive) return;
    Mouse.cameraHoldActive = true;
    Mouse.cameraHoldConsumedPress = true;
    Mouse.storedCursorX = Mouse.positionWindow.x;
    Mouse.storedCursorY = Mouse.positionWindow.y;
    // Avoid a one-frame look spike from absolute→relative transition
    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;
    // Classic RMB-hold hides the cursor; Mouse Look keeps it for clicking
    if(!Mouse.isMouseLookEnabled() && GameState.scene_cursor_holder){
      GameState.scene_cursor_holder.visible = false;
    }
  }

  static endCameraHold(){
    if(!Mouse.cameraHoldActive) return;
    Mouse.cameraHoldActive = false;
    Mouse.cameraHoldConsumedPress = false;
    // Restore frozen cursor only for classic RMB-hold look (keep pointer lock
    // if the player clicked the canvas to enable it).
    if(!Mouse.isMouseLookEnabled()){
      Mouse.Update(Mouse.storedCursorX, Mouse.storedCursorY);
    }
    if(GameState.scene_cursor_holder && !Mouse.pointerLock){
      GameState.scene_cursor_holder.visible = true;
    }
  }

  /**
   * Request pointer lock on `element` (must be called from a user gesture).
   * On failure / unsupported, look continues with absolute mouse movement.
   */
  static tryRequestPointerLock(element: HTMLElement | null | undefined){
    if(!element || Mouse.pointerLock || Mouse.pointerLockUnsupported){
      return;
    }
    if(typeof element.requestPointerLock !== 'function'){
      Mouse.pointerLockUnsupported = true;
      return;
    }
    // Fresh click may retry after a prior denial (Esc, focus loss, etc.).
    Mouse.pointerLockDenied = false;
    Mouse.pointerLockWanted = true;
    try{
      const result: any = element.requestPointerLock();
      if(result && typeof result.catch === 'function'){
        result.catch(() => {
          // Promise rejection — keep looking via absolute mouse
          Mouse.pointerLockDenied = true;
        });
      }
    }catch(_e){
      Mouse.pointerLockDenied = true;
    }
  }

  /** Release pointer lock if we hold it (safe no-op when unlocked). */
  static exitPointerLock(){
    Mouse.pointerLockWanted = false;
    Mouse.pointerLockDenied = false;
    if(typeof document === 'undefined') return;
    if(document.pointerLockElement && typeof document.exitPointerLock === 'function'){
      try{
        document.exitPointerLock();
      }catch(_e){
        // ignore
      }
    }
    Mouse.pointerLock = false;
  }

  static getMouseAxis(axis: MouseAxis){
    if (axis == MouseAxis.X){
      if (Mouse.MouseX == Mouse.OldMouseX)
        return 0;
      else if (Mouse.MouseX > Mouse.OldMouseX)
        return 1;

      return -1;
    }else{
      if (Mouse.MouseY == Mouse.OldMouseY)
        return 0;
      else if (Mouse.MouseY < Mouse.OldMouseY)
        return 1;

      return -1;
    }
  }

}
