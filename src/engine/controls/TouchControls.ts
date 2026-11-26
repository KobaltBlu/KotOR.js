import { GameState } from "@engine/runtime/GameState";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { EngineState } from "@engine/enums/engine/EngineState";
import { ClientCameraMode } from "@engine/enums/engine/ClientCameraMode";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { Mouse } from "@engine/controls/Mouse";
import { IngameControls } from "@engine/controls/IngameControls";
import {
  createPlayerCamRelativeState,
  setPlayerAxes,
} from "@engine/controls/player-cam-relative-control";
import type { Creature } from "@engine/module/Creature";
import {
  clamp01,
  exceedsDragThreshold,
  isTap,
  leashOrigin,
  stickAxis,
  stickDeadzone,
  stickRangeUnits,
  takeSmoothedDelta,
  TOUCH_DEFAULT_SENSITIVITY,
  TOUCH_REFERENCE_HEIGHT,
} from "@engine/controls/touch-gesture";

const INI_TOUCH_SENSITIVITY = 'Game Options.Touch Sensitivity';
const INI_AUTO_RUN = 'Game Options.Auto Run';

function ensurePlayerControl(creature: Creature){
  if(!creature.playerControl){
    creature.playerControl = createPlayerCamRelativeState();
  }
  return creature.playerControl;
}

type TouchPhase = 'idle' | 'pending' | 'gui' | 'world' | 'movie';

/**
 * Single-finger touch input for mobile browsers.
 *
 * - Tap: a left click at the touch point (GUI buttons, select, then tap again to use/talk/attack).
 * - In game, dragging on the world: vertical travel is a floating stick that
 *   walks/runs the party leader, horizontal travel turns the camera.
 * - On GUI controls: the press is held like a mouse button so sliders and
 *   scrollbars follow the finger.
 *
 * Pointer events only record state; all game work happens in `update()` from
 * the controls tick. The press is resolved two ticks after touch-down so the
 * cursor hover pass has already run at the new position.
 *
 * @file TouchControls.ts
 */
export class TouchControls {
  controls: IngameControls;
  element: HTMLElement;

  pointerId: number | null = null;
  phase: TouchPhase = 'idle';
  waitTicks: number = 0;
  released: boolean = false;

  startX: number = 0;
  startY: number = 0;
  lastX: number = 0;
  lastY: number = 0;
  maxTravel: number = 0;

  dragging: boolean = false;
  stickOriginY: number = 0;
  cameraPrevX: number = 0;
  cameraAccumX: number = 0;
  /** Auto Run: the last stick value keeps driving after release. */
  autoRunForward: number = 0;

  constructor(controls: IngameControls, element: HTMLElement){
    this.controls = controls;
    this.element = element;

    element.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    element.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    element.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    element.addEventListener('pointercancel', (e) => this.onPointerCancel(e));

    window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) this.cancel();
    });
  }

  static getSensitivity(): number {
    const raw = Number(GameState.iniConfig?.getProperty?.(INI_TOUCH_SENSITIVITY));
    const value = Number.isFinite(raw) ? raw : TOUCH_DEFAULT_SENSITIVITY;
    return clamp01(value / 100);
  }

  static isAutoRunEnabled(): boolean {
    return Number(GameState.iniConfig?.getProperty?.(INI_AUTO_RUN)) === 1;
  }

  /** Stick range in CSS px for the current viewport height. */
  getStickRangePx(): number {
    const rect = this.element.getBoundingClientRect?.();
    const height = rect && rect.height > 0 ? rect.height : window.innerHeight;
    return stickRangeUnits(TouchControls.getSensitivity()) * (height / TOUCH_REFERENCE_HEIGHT);
  }

  onPointerDown(e: PointerEvent){
    if(e.pointerType !== 'touch') return;
    // Stops the browser's compatibility mouse events so a tap is handled once.
    e.preventDefault();
    if(this.pointerId !== null) return;

    this.tryEnterFullscreen();

    this.pointerId = e.pointerId;
    try{ this.element.setPointerCapture(e.pointerId); }catch(_e){ /* not capturable */ }

    this.controls.touchInputActive = true;
    this.controls.controllerHidesCursor = true;

    this.startX = this.lastX = this.cameraPrevX = e.clientX;
    this.startY = this.lastY = this.stickOriginY = e.clientY;
    this.maxTravel = 0;
    this.dragging = false;
    this.released = false;
    this.autoRunForward = 0;
    this.phase = 'pending';
    this.waitTicks = 2;

    Mouse.Update(e.clientX, e.clientY);
  }

  onPointerMove(e: PointerEvent){
    if(e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const travel = Math.hypot(this.lastX - this.startX, this.lastY - this.startY);
    if(travel > this.maxTravel) this.maxTravel = travel;
  }

  onPointerUp(e: PointerEvent){
    if(e.pointerId !== this.pointerId) return;
    e.preventDefault();
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.released = true;
  }

  onPointerCancel(e: PointerEvent){
    if(e.pointerId !== this.pointerId) return;
    this.cancel();
  }

  /** Drop the current touch without clicking (cancel, blur, app hidden). */
  cancel(){
    if(this.phase === 'gui'){
      Mouse.leftDown = false;
      Mouse.downItem = undefined;
      Mouse.clickItem = undefined;
    }
    if(this.dragging || this.autoRunForward){
      this.stopMovement();
    }
    this.reset();
  }

  reset(){
    this.pointerId = null;
    this.phase = 'idle';
    this.released = false;
    this.dragging = false;
    this.waitTicks = 0;
  }

  /** Called once per frame from IngameControls.Update. */
  update(_delta: number){
    this.controls.touchMovement = false;

    if(this.phase === 'pending'){
      if(this.waitTicks > 0){
        this.waitTicks--;
      }else{
        this.resolvePress();
      }
    }

    switch(this.phase){
      case 'gui': this.updateGuiPress(); break;
      case 'world': this.updateWorldTouch(); break;
      case 'movie':
        if(this.released){
          GameState.VideoManager.skipMovie();
          this.reset();
        }
        break;
    }

    if(this.phase === 'idle' && this.autoRunForward){
      if(GameState.Mode != EngineMode.INGAME || GameState.State == EngineState.PAUSED){
        this.stopMovement();
      }else{
        this.applyMovement(this.autoRunForward);
      }
    }

    this.drainCamera();
  }

  resolvePress(){
    if(GameState.VideoManager.isMoviePlaying()){
      this.phase = 'movie';
      return;
    }
    const overGui = this.controls.MenuGetActiveUIElements().length > 0;
    if(overGui || GameState.Mode != EngineMode.INGAME){
      this.phase = 'gui';
      Mouse.leftDown = true;
      this.controls.primaryDownAt(this.startX, this.startY, false, true, true);
      return;
    }
    this.phase = 'world';
  }

  updateGuiPress(){
    Mouse.Update(this.lastX, this.lastY);
    this.controls.forwardDragToDownItem();
    if(this.released){
      Mouse.leftDown = false;
      this.controls.primaryUpAt(this.lastX, this.lastY);
      this.reset();
    }
  }

  updateWorldTouch(){
    if(!this.dragging && exceedsDragThreshold(this.lastX - this.startX, this.lastY - this.startY)){
      this.dragging = true;
      this.cameraPrevX = this.startX;
    }

    if(this.dragging){
      const range = this.getStickRangePx();
      this.stickOriginY = leashOrigin(this.stickOriginY, this.lastY, range);
      // Screen Y grows downward; dragging up is forward.
      const forward = -stickAxis(this.lastY - this.stickOriginY, range, stickDeadzone(TouchControls.getSensitivity()));
      if(GameState.State != EngineState.PAUSED){
        this.applyMovement(forward);
      }

      this.cameraAccumX += this.lastX - this.cameraPrevX;
      this.cameraPrevX = this.lastX;

      if(this.released){
        if(TouchControls.isAutoRunEnabled() && forward){
          this.autoRunForward = forward;
        }else{
          this.stopMovement();
        }
        this.reset();
      }
      return;
    }

    if(this.released){
      if(isTap(this.maxTravel)){
        this.controls.primaryDownAt(this.lastX, this.lastY, false, true, true);
        this.controls.primaryUpAt(this.lastX, this.lastY);
      }
      this.reset();
    }
  }

  applyMovement(forward: number){
    const followee = GameState.PartyManager.party[0] as Creature | undefined;
    if(!followee?.canMove?.()) return;

    if(IngameControls.isDriveControlActive(followee)){
      let flags = 0;
      if(forward > 0.2) flags = forward > 0.7 ? IngameControls.DRIVE_RUN : IngameControls.DRIVE_FORWARD;
      else if(forward < -0.2) flags = IngameControls.DRIVE_BACKWARD;
      if(flags) IngameControls.applyDriveInput(followee, flags);
      this.controls.touchMovement = true;
      return;
    }

    const ctrl = ensurePlayerControl(followee);
    if(forward){
      followee.cancelLocomotionActions();
      followee.controlled = true;
      FollowerCamera.clearFocusObject();
    }
    setPlayerAxes(ctrl, forward, 0, !!followee.walk);
    this.controls.touchMovement = true;
  }

  stopMovement(){
    this.autoRunForward = 0;
    const followee = GameState.PartyManager.party[0] as Creature | undefined;
    if(followee?.playerControl){
      setPlayerAxes(followee.playerControl, 0, 0, !!followee.playerControl.walking);
    }
    if(followee && IngameControls.isDriveControlActive(followee)){
      IngameControls.abortDriveControl(followee);
    }
  }

  drainCamera(){
    if(!this.cameraAccumX) return;
    if(GameState.Mode != EngineMode.INGAME){
      this.cameraAccumX = 0;
      return;
    }
    const { step, rest } = takeSmoothedDelta(this.cameraAccumX);
    this.cameraAccumX = rest;
    if(!step) return;
    if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
      const sens = Mouse.getSensitivityDegrees();
      let nx = step / FollowerCamera.MOUSE_DELTA_NORMALIZE_PX;
      if(nx > 1) nx = 1;
      else if(nx < -1) nx = -1;
      FollowerCamera.setNavigateAxes(-nx * (sens / 30));
    }else{
      FollowerCamera.applyMouseLookDelta(step, 0);
    }
  }

  /** Full screen and landscape on a phone; both need a user gesture and may be refused. */
  tryEnterFullscreen(){
    if(typeof document === 'undefined' || document.fullscreenElement) return;
    if(!window.matchMedia?.('(pointer: coarse)').matches) return;
    const root = document.documentElement;
    if(typeof root.requestFullscreen !== 'function') return;
    root.requestFullscreen({ navigationUI: 'hide' })
      .then(() => (screen.orientation as any)?.lock?.('landscape'))
      .catch(() => { /* refused or unsupported */ });
  }
}
