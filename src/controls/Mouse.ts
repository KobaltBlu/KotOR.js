import * as THREE from "three";
import type { GUIControl } from "@/gui";
import { ResolutionManager } from "@/managers/ResolutionManager";
import { MouseState } from "@/enums/controls/MouseState";
import { MouseAxis } from "@/enums/controls/MouseAxis";
import { GameState } from "@/GameState";
import { EngineMode } from "@/enums/engine/EngineMode";

/** Retail CClientOptions::SetDefaultMouseOptions mouse_sensitivity (0x2C). */
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
  static pointerLock: boolean = false;

  // Logical button states (after Reverse Mouse Buttons mapping)
  static leftDown: boolean = false;
  static leftClick: boolean = false;
  static rightDown: boolean = false;
  static rightClick: boolean = false;
  static middleDown: boolean = false;
  /** Retail g_bShiftActionState — full-stack give/transfer when true. */
  static shiftKey: boolean = false;

  /**
   * Retail rightClickHeld / mouseCameraRotateToggle — chase-cam look is active.
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

  //Game UI mouse position
  static positionUI: THREE.Vector2 = new THREE.Vector2();

  //UI Control State
  static downItem: GUIControl;
  static clickItem: GUIControl;

  constructor(){

  }

  static Update(x: number, y: number){
    Mouse.positionWindow.x = x;
    Mouse.positionWindow.y = y;

    const res = ResolutionManager.screenResolution;

    if(res.isDynamicRes){
      Mouse.positionViewport.x = x;
      Mouse.positionViewport.y = y;

      Mouse.position.x = Mouse.Vector.x = ( x / window.innerWidth ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( y / window.innerHeight ) * 2 + 1;
      Mouse.positionUI.x = Mouse.Vector.x = ( x - (window.innerWidth/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( y -(window.innerHeight/2) );
    }else{
      Mouse.positionViewport.x = x - ((ResolutionManager.windowResolution.width/2) - ((res.width)/2));
      Mouse.positionViewport.y = y - ((ResolutionManager.windowResolution.height/2) - ((res.height)/2));

      Mouse.position.x = Mouse.Vector.x = ( Mouse.positionViewport.x / res.width ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( Mouse.positionViewport.y / res.height ) * 2 + 1;
      Mouse.positionUI.x = Mouse.Vector.x = ( Mouse.positionViewport.x - (res.width/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( Mouse.positionViewport.y -(res.height/2) );
    }
  }

  /**
   * Retail CClientOptions::GetMouseSenSetting @ 0061d5b0 —
   * sensitivity * 0.01 * 45.0 + 10.0 (degrees scale for mouse deltas).
   */
  static getSensitivityDegrees(): number {
    const raw = Number(GameState.iniConfig?.getProperty?.(INI_MOUSE_SENSITIVITY));
    const sensitivity = Number.isFinite(raw) ? raw : DEFAULT_MOUSE_SENSITIVITY;
    return sensitivity * 0.01 * 45.0 + 10.0;
  }

  /** Retail client_options->mouse_look (Game Options.Mouse Look). */
  static isMouseLookEnabled(): boolean {
    return !!Number(GameState.iniConfig?.getProperty?.(INI_MOUSE_LOOK));
  }

  /** Retail reverse_mouse_buttons (Game Options.Reverse Mouse Buttons). */
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
   * Whether chase-camera mouse look should consume deltas this frame.
   * Retail UpdateCamera / ProcessInput: look state is `rightClickHeld`, inverted
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
    // Restore frozen cursor only for classic RMB-hold look
    if(!Mouse.isMouseLookEnabled()){
      Mouse.Update(Mouse.storedCursorX, Mouse.storedCursorY);
    }
    if(GameState.scene_cursor_holder){
      GameState.scene_cursor_holder.visible = true;
    }
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
