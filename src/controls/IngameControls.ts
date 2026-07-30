import * as THREE from "three";
import { GameState } from "@/GameState";
import type { GUIControl, GUIListBox, GUIScrollBar } from "@/gui";
import { Utility } from "@/utility/Utility";
import { EngineMode } from "@/enums/engine/EngineMode";
import { EngineState } from "@/enums/engine/EngineState";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { KeyMapAction } from "@/enums/controls/KeyMapAction";
import { MiniGameType } from "@/enums/engine/MiniGameType";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ClientCameraMode } from "@/enums/engine/ClientCameraMode";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlEventFactory } from "@/gui/GUIControlEventFactory";
import { Keyboard } from "@/controls/Keyboard";
import { GamePad } from "@/controls/GamePad";
import { Mouse } from "@/controls/Mouse";
import { KeyMapper } from "@/controls/KeyMapper";
import { AnalogInput } from "@/controls/AnalogInput";
import { TGAObject } from "@/resource/TGAObject";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { SaveGame } from "@/engine/SaveGame";
import {
  applyDriveInput,
  abortDriveControl,
  isDriveControlActive,
  DRIVE_FORWARD,
  DRIVE_BACKWARD,
  DRIVE_RUN,
  DRIVE_YAW_LEFT,
  DRIVE_YAW_RIGHT,
} from "@/controls/drive-input";
import {
  createPlayerCamRelativeState,
  setPlayerAxes,
} from "@/controls/player-cam-relative-control";
import { EventManager } from "@/managers/EventManager";
import type { ModuleCreature } from "@/module/ModuleCreature";

function ensurePlayerControl(creature: { playerControl?: ReturnType<typeof createPlayerCamRelativeState> }){
  if(!creature.playerControl){
    creature.playerControl = createPlayerCamRelativeState();
  }
  return creature.playerControl;
}

/**
 * Build forward axis from W+S together.
 * ProcessMappings runs every action every frame — per-key !down handlers that
 * zero axisForward race and wipe the other key (W lost to S's idle clear).
 */
function resolveKeyboardForwardAxis(): number {
  const up = !!KeyMapper.Actions[KeyMapAction.ActionUp]?.keyboardInput?.down;
  const down = !!KeyMapper.Actions[KeyMapAction.ActionDown]?.keyboardInput?.down;
  let forward = 0;
  if(up) forward += 1;
  if(down) forward -= 1;
  return forward;
}

/**
 * Retail ProcessInput @ 00623a37–00623a6f (swkotor.exe):
 * When chase-cam look is active (`rightClickHeld`, inverted if Mouse Look) and
 * `leftMouseDown`, inject forward if the keyboard/stick up_down axis is 0.
 * Retail writes raw up_down = -1.0 (stick-forward); our axisForward is +forward.
 * Mouse Look on: look is active while RMB is up → LMB alone walks/runs forward.
 * Classic: RMB look + LMB → forward while turning the camera.
 */
function resolvePlayerForwardAxis(): number {
  let forward = resolveKeyboardForwardAxis();
  if(Math.abs(forward) < 1e-4 && Mouse.leftDown && Mouse.isCameraHoldDesired()){
    forward = 1;
  }
  return forward;
}

/**
 * Build swoop/turret lateral axis from A+D together (same race-avoidance as resolveKeyboardForwardAxis).
 * Retail keys feed UpdateAxis as ±1.
 */
function resolveMinigameKeyAxisX(): number {
  const left = !!KeyMapper.Actions[KeyMapAction.MGActionLeft]?.keyboardInput?.down
    || !!KeyMapper.Actions[KeyMapAction.MGActionLeft]?.gamepadInput?.pressed;
  const right = !!KeyMapper.Actions[KeyMapAction.MGActionRight]?.keyboardInput?.down
    || !!KeyMapper.Actions[KeyMapAction.MGActionRight]?.gamepadInput?.pressed;
  let x = 0;
  if(left) x -= 1;
  if(right) x += 1;
  return x;
}

/**
 * Turret pitch axis from W+S / d-pad up+down — retail PollInput Z pair → UpdateAxis z.
 */
function resolveMinigameKeyAxisZ(): number {
  const up = !!KeyMapper.Actions[KeyMapAction.MGActionUp]?.keyboardInput?.down
    || !!KeyMapper.Actions[KeyMapAction.MGActionUp]?.gamepadInput?.pressed;
  const down = !!KeyMapper.Actions[KeyMapAction.MGActionDown]?.keyboardInput?.down
    || !!KeyMapper.Actions[KeyMapAction.MGActionDown]?.gamepadInput?.pressed;
  let z = 0;
  if(up) z += 1;
  if(down) z -= 1;
  return z;
}

/** Retail ProcessInput mouse Poll / 20.0 before UpdateMouse. */
const MG_MOUSE_POLL_SCALE = 20;

/**
 * IngameControls class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IngameControls.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class IngameControls {
  Mouse: Mouse = Mouse;
  KeyMapper: KeyMapper = KeyMapper;

  camera: THREE.Camera;
  element: HTMLElement;

  //controllers
  keyboard: Keyboard = new Keyboard();
  gamePad: GamePad;

  gamePadMovement: boolean = false;

  plMoveEvent: (e: any) => void;

  constructor(camera: THREE.Camera, element: HTMLElement){

    this.camera = camera;
    this.element = element;

    this.gamePad = new GamePad();

    this.initKeys();

    // Ask the browser to release the pointer
    document.addEventListener('pointerlockchange', this.plChangeCallback.bind(this), true);
    document.addEventListener('pointerlockerror', this.plErrorCallback.bind(this), true);

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keyboard.onKeyDown(e);

      // Retail HandleInputEvent: while game_over_state, hurry the death fade
      if(GameState.GameOverManager?.GetGameOver?.()){
        GameState.GameOverManager.OnDeathSequenceInput();
      }

      if(GameState.MenuManager.activeGUIElement){
        if(typeof GameState.MenuManager.activeGUIElement.onKeyDown === 'function'){
          GameState.MenuManager.activeGUIElement.onKeyDown(e);
        }
      }

      const ae = GameState.MenuManager.activeGUIElement as { editable?: boolean } | undefined;
      const editingTextField = !!(ae && ae.editable === true);

      if(
        !editingTextField &&
        (GameState.Mode == EngineMode.GUI || GameState.Mode == EngineMode.DIALOG) &&
        (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'UpArrow' || e.code === 'DownArrow')
      ){
        const fg = GameState.MenuManager.GetForegroundMenu();
        if(fg){
          if(e.code === 'ArrowUp' || e.code === 'UpArrow'){
            fg.triggerControllerDUpPress();
          }else{
            fg.triggerControllerDDownPress();
          }
          e.preventDefault();
        }
      }

      if(GameState.MenuManager.activeMenus.length){
        GameState.MenuManager.activeMenus[GameState.MenuManager.activeMenus.length-1].triggerEventListener('keydown', e);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      /**
       * Debugger Hotkey
       */
      if(e.key == 'D' && e.ctrlKey && e.shiftKey){
        GameState.Debugger.open();
      }

      /**
       * Generate a TGA Screenshot of the Game canvas and export it to the game directory
       */
      if(e.key == 'PrintScreen'){
        if(GameState.iniConfig.getProperty('Game Options.EnableScreenShot') != 1){
          return;
        }
        /**
         * Render the scene
         */
        const oldCursorState = GameState.scene_cursor_holder.visible;
        GameState.scene_cursor_holder.visible = false;
        GameState.renderer.clear();
        GameState.composer.render(0);
        GameState.scene_cursor_holder.visible = oldCursorState;

        /**
         * Build DOM Image Element
         */
        const screenshot = new Image();
        screenshot.src = GameState.canvas.toDataURL('image/png');
        screenshot.onload = async function() {
          /**
           * Draw the contents of the Image onto an OffscreenCanvas
           */
          const width = GameState.ResolutionManager.getViewportWidth();
          const height = GameState.ResolutionManager.getViewportHeight();
          const ssCanvas = new OffscreenCanvas(width, height);
          const ctx = ssCanvas.getContext('2d');
          ctx.drawImage(screenshot, 0, 0, width, height);

          /**
           * Build a TGAObject from the canvas element
           */
          const tga = TGAObject.FromCanvas(ssCanvas);

          /**
           * Generate the export filename
           */
          const count = (await GameFileSystem.readdir('')).filter( (file) => {
            return !!file.match(/KotOR\d{4}.tga/);
          }).length;
          const isK1 = GameState.GameKey == 'KOTOR';
          const ssName = isK1 ? 'KotOR' : 'K2_';
          const ssNumber = "00000" + count;
          const ssMaxDigits = isK1 ? 4 : 5;
          const ssFilename = `${ssName}${ssNumber.substring(ssNumber.length-ssMaxDigits)}.tga`;

          /**
           * Export the generated TGAObject as a TGA Image
           */
          GameFileSystem.writeFile(ssFilename, await tga.toExportBuffer());
        };
      }

      this.keyboard.onKeyUp(e);

      if(GameState.MenuManager.activeGUIElement){
        if(typeof GameState.MenuManager.activeGUIElement.onKeyUp === 'function'){
          GameState.MenuManager.activeGUIElement.onKeyUp(e);
        }
      }

      if(GameState.MenuManager.activeMenus.length){
        GameState.MenuManager.activeMenus[GameState.MenuManager.activeMenus.length-1].triggerEventListener('keyup', e);
      }
    });

    window.addEventListener('mousedown', (event: MouseEvent) => {
      // Block GUI selection while a movie is playing
      if(GameState.VideoManager.isMoviePlaying()){
        return;
      }

      if(!Mouse.pointerLock){
        Mouse.Update(event.clientX, event.clientY);
      }
      if(event.target == this.element){
        GameState.MenuManager.activeGUIElement = undefined;
      }

      GameState.raycaster.setFromCamera( GameState.mouse, GameState.camera_gui );

      const customEvent = GUIControlEventFactory.generateEventObject();
      const logical = Mouse.mapBrowserButton(event.button);

      Mouse.downItem = null;
      Mouse.clickItem = null;
      Mouse.shiftKey = !!event.shiftKey;

      if(logical === 'left'){
        Mouse.leftDown = true;
      }else if(logical === 'right'){
        Mouse.rightDown = true;
      }else if(logical === 'middle'){
        Mouse.middleDown = true;
        Mouse.MiddleMouseDown = true;
      }

      // GUI / world action clicks (logical left). Camera hold is RMB-only
      // (Mouse Look inverts RMB sense per-frame — never steals LMB).
      if(logical === 'left'){
        const uiControls = this.MenuGetActiveUIElements();
        for(let i = 0; i < uiControls.length; i++){
          if(!customEvent.propagate)
            break;

          const control = uiControls[i];
          if(!(control.widget.parent instanceof THREE.Scene) && control.widget.visible){
            if(GameState.debug.CONTROLS)
              console.log('uiControls', control)
            try{
              if(control.processEventListener('mouseDown', [customEvent])){
                Mouse.downItem = control;
                customEvent.propagate = false;
              }

              if(control.eventListeners['click'].length){
                Mouse.clickItem = control;
                customEvent.propagate = false;
              }
            }catch(e){

            }
          }
        }
      }

      // Clicking the game canvas requests pointer lock (user gesture).
      // GUI clicks and non-canvas targets keep the absolute-mouse fallback.
      // If the browser denies lock, look continues with absolute mouse movement.
      Mouse.syncCameraHold();
      if(
        event.target === this.element &&
        !(logical === 'left' && Mouse.clickItem) &&
        (GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.FREELOOK)
      ){
        // Mouse.tryRequestPointerLock(this.element);
      }
    });

    window.addEventListener('mousemove', (event: MouseEvent) => {
      // Block GUI selection while a movie is playing
      if(GameState.VideoManager.isMoviePlaying()){
        return;
      }

      if(event.movementX || event.movementY){
        Mouse.MouseX += event.movementX;
        Mouse.MouseY += event.movementY;
      }

      if(Mouse.pointerLock){
        Mouse.Update( Mouse.positionWindow.x + event.movementX, Mouse.positionWindow.y + event.movementY );
      }else{
        // Always track absolute position for GUI / world clicks.
        // RMB-hold look uses movement deltas separately; do not freeze UI coords
        // (Mouse Look mode looks continuously while LMB must still hit-test).
        Mouse.Update( event.clientX, event.clientY );
        if(!event.movementX && !event.movementY){
          Mouse.MouseX = event.pageX - this.element.offsetLeft;
          Mouse.MouseY = event.pageY - this.element.offsetTop;
        }
      }

      const showCursor =
        !Mouse.pointerLock &&
        GameState.Mode != EngineMode.FREELOOK &&
        !(Mouse.cameraHoldActive && !Mouse.isMouseLookEnabled());
      if(showCursor && GameState.scene_cursor_holder){
        GameState.scene_cursor_holder.visible = true;
      }

      if(Mouse.downItem && Mouse.leftDown && !(Mouse.cameraHoldActive && !Mouse.isMouseLookEnabled())){
        if(BitWise.InstanceOf(Mouse.downItem?.objectType, GUIControlTypeMask.GUIControl)){
          if(!(Mouse.downItem.widget.parent instanceof THREE.Scene)){
            Mouse.downItem.processEventListener('mouseMove', [])
          }
        }
      }
    });

    window.addEventListener('mouseup', (event: MouseEvent) => {
      // Block GUI and in-game selection while a movie is playing
      if(GameState.VideoManager.isMoviePlaying() && event.button == 0){
        GameState.VideoManager.skipMovie();
        return;
      }

      const logical = Mouse.mapBrowserButton(event.button);
      Mouse.shiftKey = !!event.shiftKey;

      if(logical === 'left'){
        Mouse.leftDown = false;
      }else if(logical === 'right'){
        Mouse.rightDown = false;
      }else if(logical === 'middle'){
        Mouse.middleDown = false;
        Mouse.MiddleMouseDown = false;
      }

      // End/start look immediately on button release (releases pointer lock).
      Mouse.syncCameraHold();

      // Only logical left release drives GUI / world click / dialog skip
      if(logical !== 'left'){
        return;
      }

      Mouse.leftClick = true;

      if(!Mouse.pointerLock){
        Mouse.Update( event.clientX, event.clientY );
      }

      //If the NoClickTimer is active then we will return out of this function
      if(GameState.noClickTimer){
        Mouse.downItem = undefined;
        Mouse.clickItem = undefined;
        return;
      }

      // Retail: click during death sequence hurries the fade (before UI click handling)
      if(GameState.GameOverManager?.GetGameOver?.()){
        GameState.GameOverManager.OnDeathSequenceInput();
      }

      let clickCaptured = false;

      const customEvent = GUIControlEventFactory.generateEventObject();

      //Try to fire mouse up regardless if mouse is still inside object
      if(BitWise.InstanceOf(Mouse.downItem?.objectType, GUIControlTypeMask.GUIControl)){
        if(!(Mouse.downItem.widget.parent instanceof THREE.Scene)){
          try{
            Mouse.downItem.processEventListener('mouseUp', [customEvent]);
            Mouse.leftClick = false;
          }catch(e){
            console.error(e);
          }
        }
      }

      // Fire click on the control that received mousedown — do not require the
      // cursor to still be over it. Floating target menus move with the camera
      // (edge-turn / focus), so a re-hit-test between down and up drops clicks.
      if(
        BitWise.InstanceOf(Mouse.clickItem?.objectType, GUIControlTypeMask.GUIControl) &&
        Mouse.clickItem.widget?.visible &&
        !(Mouse.clickItem.widget.parent instanceof THREE.Scene)
      ){
        clickCaptured = true;
        try{
          const control = Mouse.clickItem;
          Mouse.clickItem = null;
          GameState.MenuManager.activeGUIElement = control;
          control.processEventListener('click', [customEvent]);
          GameState.guiAudioEmitter.playSoundFireAndForget('gui_click');
          Mouse.leftClick = false;
          EventManager.FireEvent('menu.click', {
            name: control.name,
            menu: control.menu.constructor.name
          });
        }catch(e){
          console.error(e);
        }
      }

      let selectedObject = clickCaptured;

      if(!clickCaptured && (GameState.Mode != EngineMode.DIALOG)){
        if(GameState.Mode == EngineMode.INGAME && GameState.MenuManager.GetCurrentMenu() == GameState.MenuManager.InGameOverlay){
          const moduleObject = GameState.CursorManager.onMouseHitInteractive();
          if(BitWise.InstanceOf(moduleObject?.objectType, ModuleObjectType.ModuleObject)){
            if(moduleObject.isUseable() && moduleObject != GameState.getCurrentPlayer()){

              selectedObject = true;

              const distance = GameState.getCurrentPlayer().position.distanceTo(moduleObject.position);
              const distanceThreshold = 20;

              if(GameState.CursorManager.selectedObject == moduleObject && distance <= distanceThreshold){
                if(typeof moduleObject.onClick === 'function'){
                  GameState.getCurrentPlayer().clearAllActions();
                  moduleObject.onClick(GameState.getCurrentPlayer());
                }else{
                  let distance = GameState.getCurrentPlayer().position.distanceTo(moduleObject.position);
                  if(distance > 1.5){
                    GameState.getCurrentPlayer().clearAllActions();
                    moduleObject.clearAllActions();
                    GameState.getCurrentPlayer().actionDialogObject(moduleObject);
                  }
                }
              }
              GameState.CursorManager.setReticleSelectedObject(moduleObject);
              FollowerCamera.clearFocusObject();
            }
            if(GameState.debug.SELECTED_OBJECT)
              console.log('Ingame Object', moduleObject);
          }else{
            if(GameState.debug.SELECTED_OBJECT)
              console.log('Object', moduleObject);
          }

          if(!selectedObject){
            // GameState.CursorManager.hovered = GameState.CursorManager.hoveredObject = GameState.CursorManager.selected = GameState.CursorManager.selectedObject = undefined;
          }
        }
      }

      Mouse.downItem = undefined;
      Mouse.clickItem = undefined;
    });

    // Wheel → retail one-index (or oversized page-step) scroll via GUIListBox.scrollUp/Down
    document.body.addEventListener('wheel', (e: WheelEvent) => {
      if(e.deltaY < 0){
        if(BitWise.InstanceOf(GameState.MenuManager.hoveredGUIElement?.objectType, GUIControlTypeMask.GUIListBox)){
          (GameState.MenuManager.hoveredGUIElement as GUIListBox).scrollUp();
        }else if(BitWise.InstanceOf(GameState.MenuManager.hoveredGUIElement?.objectType, GUIControlTypeMask.GUIScrollBar)){
          (GameState.MenuManager.hoveredGUIElement as GUIScrollBar).list.scrollUp();
        }else{
          this.cycleHoveredActionMenu(-1);
        }
      }else{
        if(BitWise.InstanceOf(GameState.MenuManager.hoveredGUIElement?.objectType, GUIControlTypeMask.GUIListBox)){
          (GameState.MenuManager.hoveredGUIElement as GUIListBox).scrollDown();
        }else if(BitWise.InstanceOf(GameState.MenuManager.hoveredGUIElement?.objectType, GUIControlTypeMask.GUIScrollBar)){
          (GameState.MenuManager.hoveredGUIElement as GUIScrollBar).list.scrollDown();
        }else{
          this.cycleHoveredActionMenu(1);
        }
      }
    });

    GameState.canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

  }

  initKeys(){
    KeyMapper.BindKeyboard(this.keyboard, GameState.iniConfig);
    KeyMapper.BindGamepad(this.gamePad);

    //W / S / dual-mouse — resolve forward together (see resolvePlayerForwardAxis)
    const applyWasdMove = () => {
      if(this.gamePadMovement) return;
      const followee = GameState.PartyManager.party[0] as ModuleCreature | undefined;
      if(!followee?.canMove?.()) return;

      const forward = resolvePlayerForwardAxis();
      const walking = !!followee.walk;

      if(isDriveControlActive(followee)){
        if(!forward){
          abortDriveControl(followee);
          return;
        }
        if(forward > 0){
          applyDriveInput(followee, walking ? DRIVE_FORWARD : DRIVE_RUN);
        }else{
          applyDriveInput(followee, DRIVE_BACKWARD);
        }
        GameState.scene_cursor_holder.visible = true;
        FollowerCamera.clearFocusObject();
        return;
      }

      const ctrl = ensurePlayerControl(followee);
      if(!forward){
        setPlayerAxes(ctrl, 0, ctrl.axisRight || 0, walking);
        return;
      }

      followee.cancelLocomotionActions();
      setPlayerAxes(ctrl, forward, ctrl.axisRight || 0, walking);
      followee.controlled = true;
      GameState.scene_cursor_holder.visible = true;
      FollowerCamera.clearFocusObject();
    };

    //W
    KeyMapper.Actions[KeyMapAction.ActionUp].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down) FollowerCamera.setNavigateAxes(undefined, undefined, 1);
        return;
      }
      if(GameState.Mode == EngineMode.FREELOOK){
        if(keymap.keyboardInput?.down){
          FollowerCamera.setFreeLookAxes(0, 1);
        }
        return;
      }
      if(GameState.State == EngineState.PAUSED) return;
      applyWasdMove();
    });

    //S
    KeyMapper.Actions[KeyMapAction.ActionDown].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down) FollowerCamera.setNavigateAxes(undefined, undefined, -1);
        return;
      }
      if(GameState.Mode == EngineMode.FREELOOK){
        if(keymap.keyboardInput?.down){
          FollowerCamera.setFreeLookAxes(0, -1);
        }
        return;
      }
      if(GameState.State == EngineState.PAUSED) return;
      applyWasdMove();
    });

    //Z
    KeyMapper.Actions[KeyMapAction.ActionLeft].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down) FollowerCamera.setNavigateAxes(undefined, undefined, undefined, -1);
        return;
      }
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      const followee = GameState.PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;
      if(isDriveControlActive(followee)){
        applyDriveInput(followee, DRIVE_YAW_LEFT);
      }
    });

    //C
    KeyMapper.Actions[KeyMapAction.ActionRight].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down) FollowerCamera.setNavigateAxes(undefined, undefined, undefined, 1);
        return;
      }
      if(GameState.State == EngineState.PAUSED) return;
      if(!keymap.keyboardInput?.down) return;
      const followee = GameState.PartyManager.party[0];
      if(!followee) return;
      if(!followee.canMove()) return;
      if(isDriveControlActive(followee)){
        applyDriveInput(followee, DRIVE_YAW_RIGHT);
      }
    });

    //A
    KeyMapper.Actions[KeyMapAction.CameraRotateLeft].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down || (keymap.gamepadInput as AnalogInput)?.value < 0){
          FollowerCamera.setNavigateAxes(1);
        }
        return;
      }
      // if(GameState.State == EngineState.PAUSED) return;
      if(GameState.Mode == EngineMode.FREELOOK){
        if(keymap.keyboardInput?.down || (keymap.gamepadInput as AnalogInput)?.value < 0){
          const stick = this.gamePad.stick_r_x.value;
          FollowerCamera.setFreeLookAxes(stick ? -stick : 1, 0);
        }
        return;
      }
      if(GameState.Mode != EngineMode.INGAME) return;
      const followee = GameState.PartyManager.party[0];
      if(isDriveControlActive(followee) && keymap.keyboardInput?.down){
        applyDriveInput(followee, DRIVE_YAW_LEFT);
        return;
      }
      if(
        (keymap.keyboardInput.down || 
        (keymap.gamepadInput as AnalogInput).value < 0)
      ){
        FollowerCamera.clearFocusObject();
        FollowerCamera.turning = true;
        if(this.gamePad.stick_r_x.value){
          GameState.scene_cursor_holder.visible = false;
          FollowerCamera.dir = -this.gamePad.stick_r_x.value;
        }else{
          FollowerCamera.dir = 1;
          GameState.scene_cursor_holder.visible = true;
        }
      }
    });

    //D
    KeyMapper.Actions[KeyMapAction.CameraRotateRight].setProcessor( (keymap) => {
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        if(keymap.keyboardInput?.down || (keymap.gamepadInput as AnalogInput)?.value > 0){
          FollowerCamera.setNavigateAxes(-1);
        }
        return;
      }
      // if(GameState.State == EngineState.PAUSED) return;
      if(GameState.Mode == EngineMode.FREELOOK){
        if(keymap.keyboardInput?.down || (keymap.gamepadInput as AnalogInput)?.value > 0){
          const stick = this.gamePad.stick_r_x.value;
          FollowerCamera.setFreeLookAxes(stick ? -stick : -1, 0);
        }
        return;
      }
      if(GameState.Mode != EngineMode.INGAME) return;
      const followee = GameState.PartyManager.party[0];
      if(isDriveControlActive(followee) && keymap.keyboardInput?.down){
        applyDriveInput(followee, DRIVE_YAW_RIGHT);
        return;
      }
      if(
        (keymap.keyboardInput.down || 
        (keymap.gamepadInput as AnalogInput).value > 0)
      ){
        FollowerCamera.clearFocusObject();
        FollowerCamera.turning = true;
        if(this.gamePad.stick_r_x.value){
          GameState.scene_cursor_holder.visible = false;
          FollowerCamera.dir = -this.gamePad.stick_r_x.value;
        }else{
          FollowerCamera.dir = -1;
          GameState.scene_cursor_holder.visible = true;
        }
      }
    });

    //ChangeLeader
    KeyMapper.Actions[KeyMapAction.ChangeChar].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.PartyManager.ShiftLeader();
    });

    KeyMapper.Actions[KeyMapAction.Freelook].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      // Retail caseD_1 @ 006216c7: hsMode==1 → SetNavigateCamera + hsMode++
      if(GameState.cameraHsMode === 1
        && (GameState.clientCameraMode | 0) !== ClientCameraMode.FREELOOK
        && (GameState.clientCameraMode | 0) !== ClientCameraMode.NAVIGATE){
        FollowerCamera.beginNavigateHover();
        GameState.cameraHsMode = 2;
        return;
      }
      // Exiting navigate restores chase (RestoreCamera when leaving mode 5/7)
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        GameState.clientCameraMode = ClientCameraMode.ON_A_STICK;
        FollowerCamera.navigateActive = false;
        FollowerCamera.navigateHoverMode = false;
        FollowerCamera.lastAppliedCameraMode = -1;
        if(GameState.Mode == EngineMode.FREELOOK){
          GameState.SetEngineMode(EngineMode.INGAME);
        }
        return;
      }
      GameState.SetEngineMode(GameState.Mode == EngineMode.FREELOOK ? EngineMode.INGAME : EngineMode.FREELOOK);
    });

    KeyMapper.Actions[KeyMapAction.WALKMODIFY].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      const pc = GameState.getCurrentPlayer() as ModuleCreature | undefined;
      if(pc){
        pc.walk = !pc.walk;
        if(pc.playerControl){
          pc.playerControl.walking = !!pc.walk;
        }
      }
    });

    //Dialog1
    KeyMapper.Actions[KeyMapAction.Dialog1].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(0);
    });

    //Dialog2
    KeyMapper.Actions[KeyMapAction.Dialog2].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(1);
    });

    //Dialog3
    KeyMapper.Actions[KeyMapAction.Dialog3].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(2);
    });

    //Dialog4
    KeyMapper.Actions[KeyMapAction.Dialog4].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(3);
    });

    //Dialog5
    KeyMapper.Actions[KeyMapAction.Dialog5].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(4);
    });

    //Dialog6
    KeyMapper.Actions[KeyMapAction.Dialog6].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(5);
    });

    //Dialog7
    KeyMapper.Actions[KeyMapAction.Dialog7].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(6);
    });

    //Dialog8
    KeyMapper.Actions[KeyMapAction.Dialog8].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(7);
    });

    //Dialog9
    KeyMapper.Actions[KeyMapAction.Dialog9].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.CutsceneManager.selectReplyAtIndex(8);
    });

    //DialogSkip
    KeyMapper.Actions[KeyMapAction.DialogSkip].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed && !Mouse.leftClick) return;

      if(GameState.CutsceneManager.active && GameState.CutsceneManager.isListening){
        if(keymap.keyboardInput?.pressed || keymap.gamepadInput?.pressed){
          GameState.CutsceneManager.playerSkipEntry(GameState.CutsceneManager.currentEntry);
        }else if(Mouse.leftClick){
          GameState.CutsceneManager.playerSkipEntry(GameState.CutsceneManager.currentEntry);
        }
      }
    });

    //DialogAbort
    KeyMapper.Actions[KeyMapAction.DialogAbort].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;

      if(GameState.CutsceneManager.active){
        GameState.CutsceneManager.endConversation(true);
      }
    })

    KeyMapper.Actions[KeyMapAction.SelectNext].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.ModuleObjectManager.selectNearestObject(false);
    });

    KeyMapper.Actions[KeyMapAction.SelectPrev].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.ModuleObjectManager.selectNearestObject(true);
    });

    // Keys feed UpdateAxis via resolveMinigameKeyAxis* — do not rotate here.
    // Swoop accelerate (MGActionUp) is polled in ProcessInput → onAccelerate().
    KeyMapper.Actions[KeyMapAction.MGActionUp].setProcessor( (_keymap, _delta = 0) => {});

    KeyMapper.Actions[KeyMapAction.MGActionDown].setProcessor( (_keymap, _delta = 0) => {});

    KeyMapper.Actions[KeyMapAction.MGActionLeft].setProcessor( (_keymap, _delta = 0) => {});

    KeyMapper.Actions[KeyMapAction.MGActionRight].setProcessor( (_keymap, _delta = 0) => {});

    KeyMapper.Actions[KeyMapAction.PauseMinigame].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      // Same manual combat-pause reason 4 as TB_PAUSE (retail pause overlay path)
      GameState.AutoPauseManager.ToggleManualPause();
    });

    KeyMapper.Actions[KeyMapAction.MGshoot].setProcessor( (keymap) => {
      // Held fire — GunBank RoF timer gates spawn (retail BehaviorFire).
      const keyOrPad = !!(keymap.keyboardInput?.down || keymap.gamepadInput?.down || keymap.gamepadInput?.pressed);
      const mouseFire =
        GameState.Mode === EngineMode.MINIGAME &&
        GameState.module?.area?.miniGame?.type === MiniGameType.TURRET &&
        Mouse.leftDown;
      if(!keyOrPad && !mouseFire) return;
      if(GameState.State != EngineState.RUNNING) return;
      // player may be cleared after death (SetPlayer null) — no-op until restart.
      GameState.module?.area?.miniGame?.player?.shoot();
    });

    KeyMapper.Actions[KeyMapAction.GUI].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      const currentMenu = GameState.MenuManager.GetCurrentMenu();
      switch(GameState.Mode){
        case EngineMode.GUI:
          if(currentMenu.userCanClose){
            currentMenu.close();
          }
        break;
        default:
          GameState.MenuManager.MenuOptions.open();
        break;
      }
    });

    KeyMapper.Actions[KeyMapAction.Pause1].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;

      const currentMenu = GameState.MenuManager.GetCurrentMenu();
      if(currentMenu == GameState.MenuManager.InGameOverlay){
        // Retail pause key — same as TB_PAUSE / OnPauseButtonPressed (reason 4)
        GameState.AutoPauseManager.ToggleManualPause();
      }else if( currentMenu == GameState.MenuManager.InGameConfirm){
        GameState.MenuManager.InGameConfirm.close();
      }
    });

    KeyMapper.Actions[KeyMapAction.Flourish].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      GameState.getCurrentPlayer().flourish();
    });

    // HUD action-menu activate (retail Personal*/Target*Act digit binds)
    const actionMenuPressed = (keymap: { keyboardInput?: { pressed?: boolean }; gamepadInput?: { pressed?: boolean } }) =>
      !!(keymap.keyboardInput?.pressed || keymap.gamepadInput?.pressed);
    const actionMenuInGame = () =>
      GameState.Mode == EngineMode.INGAME &&
      GameState.MenuManager.GetCurrentMenu() == GameState.MenuManager.InGameOverlay;

    KeyMapper.Actions[KeyMapAction.PersonalPowerAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onSelfMenuAction(0);
    });
    KeyMapper.Actions[KeyMapAction.PersonalMedicalAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onSelfMenuAction(1);
    });
    KeyMapper.Actions[KeyMapAction.PersonalOtherAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onSelfMenuAction(2);
    });
    KeyMapper.Actions[KeyMapAction.PersonalMinesAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onSelfMenuAction(3);
    });
    KeyMapper.Actions[KeyMapAction.TargetLeftAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onTargetMenuAction(0);
    });
    KeyMapper.Actions[KeyMapAction.TargetMiddleAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onTargetMenuAction(1);
    });
    KeyMapper.Actions[KeyMapAction.TargetRightAct].setProcessor( (keymap) => {
      if(!actionMenuPressed(keymap) || !actionMenuInGame()) return;
      GameState.ActionMenuManager.onTargetMenuAction(2);
    });

    KeyMapper.Actions[KeyMapAction.FlyUp].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        FollowerCamera.setNavigateAxes(undefined, undefined, undefined, undefined, 1);
        return;
      }
      const followee = GameState.PartyManager.party[0];
      if(!followee) return;
      followee.position.z += 5 * delta;
    });

    KeyMapper.Actions[KeyMapAction.FlyDown].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      if((GameState.clientCameraMode | 0) === ClientCameraMode.NAVIGATE){
        FollowerCamera.setNavigateAxes(undefined, undefined, undefined, undefined, -1);
        return;
      }
      const followee = GameState.PartyManager.party[0];
      if(!followee) return;
      followee.position.z -= 5 * delta;
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleUp].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
       GameState.rendererUpscaleFactor += 0.25;
      if(GameState.rendererUpscaleFactor >= 4) GameState.rendererUpscaleFactor = 4;
      GameState.updateRendererUpscaleFactor();
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleDown].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      GameState.rendererUpscaleFactor -= 0.25;
      if(GameState.rendererUpscaleFactor <= 0.25) GameState.rendererUpscaleFactor = 0.25;
      GameState.updateRendererUpscaleFactor();
    });

    KeyMapper.Actions[KeyMapAction.ResolutionScaleReset].setProcessor( (keymap, delta = 0) => {
      if(!keymap.keyboardInput?.down && !keymap.gamepadInput?.pressed) return;
      GameState.rendererUpscaleFactor = 1.0;
      GameState.updateRendererUpscaleFactor();
    });

    KeyMapper.Actions[KeyMapAction.Equip].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuEquipment.open();
    });

    KeyMapper.Actions[KeyMapAction.Inventory].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuInventory.open();
    });
    
    KeyMapper.Actions[KeyMapAction.Character].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuCharacter.open();
    });
    
    KeyMapper.Actions[KeyMapAction.SkillsAndFeats].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuAbilities.open();
    });
    
    
    KeyMapper.Actions[KeyMapAction.Messages].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuMessages.open();
    });
    
    
    KeyMapper.Actions[KeyMapAction.Quests].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuJournal.open();
    });
    
    
    KeyMapper.Actions[KeyMapAction.Map].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuMap.open();
    });
    
    KeyMapper.Actions[KeyMapAction.Options].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      GameState.MenuManager.MenuOptions.open();
    });

    // Retail DoQuickSave @ 005f4b50 / DoQuickLoad @ 00633c50
    KeyMapper.Actions[KeyMapAction.Quicksave]?.setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      void SaveGame.QuickSave();
    });

    KeyMapper.Actions[KeyMapAction.QUICKLOAD]?.setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;
      if(GameState.Mode != EngineMode.INGAME) return;
      void SaveGame.QuickLoad();
    });

      // Handle movie skipping
    KeyMapper.Actions[KeyMapAction.MovieSkip].setProcessor( (keymap) => {
      if(!keymap.keyboardInput?.pressed && !keymap.gamepadInput?.pressed) return;

      if(GameState.VideoManager.isMoviePlaying()){
        GameState.VideoManager.skipMovie();
      }
    });
  }

  MenuGetActiveUIElements(): GUIControl[] {
    let elements: GUIControl[] = [];

    for(let i = 0, len = GameState.MenuManager.activeModals.length; i < len; i++){
      const activeMenu = GameState.MenuManager.activeModals[i];
      if(!activeMenu.isVisible()) continue;
      
      elements = elements.concat(activeMenu.getActiveControls());
    }

    if(GameState.MenuManager.activeModals.length) return elements;

    for(let i = 0, len = GameState.MenuManager.activeMenus.length; i < len; i++){
      const activeMenu = GameState.MenuManager.activeMenus[i];
      if(!activeMenu.isVisible()) continue;

      elements = elements.concat(activeMenu.getActiveControls());
    }

    if(GameState.State == EngineState.PAUSED){
      elements = elements.concat(GameState.MenuManager.InGamePause.getActiveControls());
    }

    return elements.reverse();
  }

  Update(delta: number = 0){

    let xoffset = 0;
    let yoffset = 0;
    let currentMenu = GameState.MenuManager.GetCurrentMenu();

    this.gamePadMovement = false;

    let gp = undefined;
    if(GamePad.CurrentGamePad instanceof Gamepad){
      gp = navigator.getGamepads()[GamePad.CurrentGamePad.index];
      this.gamePad.setGamePad(gp);
      KeyMapper.BindGamepad(this.gamePad);
    }
    this.gamePad.updateState(delta);

    if(currentMenu){
      if(this.gamePad.button_a.pressed){
        currentMenu.triggerControllerAPress();
      }else if(this.gamePad.button_b.pressed){
        currentMenu.triggerControllerBPress();
      }else if(this.gamePad.button_x.pressed){
        currentMenu.triggerControllerXPress();
      }else if(this.gamePad.button_y.pressed){
        currentMenu.triggerControllerYPress();
      }else if(this.gamePad.button_bumper_l.pressed){
        currentMenu.triggerControllerBumperLPress();
      }else if(this.gamePad.button_bumper_r.pressed){
        currentMenu.triggerControllerBumperRPress();
      }else if(this.gamePad.button_d_up.pressed){
        currentMenu.triggerControllerDUpPress();
      }else if(this.gamePad.button_d_down.pressed){
        currentMenu.triggerControllerDDownPress();
      }else if(this.gamePad.button_d_left.pressed){
        currentMenu.triggerControllerDLeftPress();
      }else if(this.gamePad.button_d_right.pressed){
        currentMenu.triggerControllerDRightPress();
      }else if(this.gamePad.stick_l_x.pressed){
        currentMenu.triggerControllerLStickXPress( this.gamePad.stick_l_x.value > 0 ? true : false );
      }else if(this.gamePad.stick_l_y.pressed){
        currentMenu.triggerControllerLStickYPress( this.gamePad.stick_l_y.value > 0 ? true : false );
      }else if(this.gamePad.stick_r_x.pressed){
        currentMenu.triggerControllerRStickXPress( this.gamePad.stick_r_x.value > 0 ? true : false );
      }else if(this.gamePad.stick_r_y.pressed){
        currentMenu.triggerControllerRStickYPress( this.gamePad.stick_r_y.value > 0 ? true : false );
      }
    }

    if(GameState.State == EngineState.RUNNING){

      if(
        (GameState.Mode == EngineMode.INGAME) && 
        currentMenu != GameState.MenuManager.InGameConfirm && 
        currentMenu != GameState.MenuManager.MenuContainer
      ){
        const followee = GameState.PartyManager.party[0];
        if(followee){
          if(followee.canMove()){
            if( this.gamePad.stick_l_x.value || this.gamePad.stick_l_y.value ){
              if(isDriveControlActive(followee)){
                let flags = 0;
                const lx = this.gamePad.stick_l_x.value;
                const ly = this.gamePad.stick_l_y.value;
                if(ly < -0.2) flags |= DRIVE_FORWARD;
                if(ly > 0.2) flags |= DRIVE_BACKWARD;
                if((flags & DRIVE_FORWARD) && Math.abs(ly) > 0.7) flags = DRIVE_RUN;
                if(lx < -0.2) flags |= DRIVE_YAW_LEFT;
                if(lx > 0.2) flags |= DRIVE_YAW_RIGHT;
                if(flags) applyDriveInput(followee, flags);
                GameState.scene_cursor_holder.visible = false;
                this.gamePadMovement = true;
              }else{
                // Preserve float stick magnitude for cam-relative RK4
                followee.cancelLocomotionActions();
                const lx = this.gamePad.stick_l_x.value;
                const ly = this.gamePad.stick_l_y.value;
                const ctrl = ensurePlayerControl(followee);
                // stick: -y forward, x right (retail left_right / up_down)
                setPlayerAxes(ctrl, -ly, lx, !!followee.walk);
                followee.controlled = true;
                GameState.scene_cursor_holder.visible = false;
                this.gamePadMovement = true;
              }
            }else if(this.gamePadMovement){
              this.gamePadMovement = false;
              if(followee.playerControl){
                setPlayerAxes(followee.playerControl, 0, 0, !!followee.playerControl.walking);
              }
            }
          }
        }
      }
    }
    
    KeyMapper.ProcessMappings(GameState.Mode, delta);

    // Retail look state: RMB hold, or always-on when Mouse Look (inverted RMB)
    Mouse.syncCameraHold();

    // Leave pointer lock when not in a gameplay camera mode (menus, loading, etc.)
    if(
      Mouse.pointerLock &&
      GameState.Mode != EngineMode.INGAME &&
      GameState.Mode != EngineMode.FREELOOK
    ){
      Mouse.exitPointerLock();
    }

    // Retail UpdateCamera mouse look while rightClickHeld (or Mouse Look)
    if(Mouse.cameraHoldActive && GameState.Mode == EngineMode.INGAME){
      const dx = Mouse.MouseX - Mouse.OldMouseX;
      const dy = Mouse.MouseY - Mouse.OldMouseY;
      if(dx || dy){
        FollowerCamera.applyMouseLookDelta(dx, dy);
      }
      // Hide software cursor only for classic RMB-hold look (Mouse Look keeps
      // cursor for LMB picking while camera tracks movement).
      if(!Mouse.isMouseLookEnabled() && GameState.scene_cursor_holder){
        GameState.scene_cursor_holder.visible = false;
      }
    }else if(
      GameState.Mode == EngineMode.INGAME &&
      !Mouse.cameraHoldActive &&
      currentMenu == GameState.MenuManager.InGameOverlay
    ){
      // Retail UpdateCamera edge turn — cursor near left/right screen frame
      this.updateScreenEdgeCameraTurn();
    }

    // Retail ProcessInput @ 006227e0 — UpdateAxis (always) then UpdateMouse (type2);
    // combat/Engine pause blocks Fire only, not axis damping.
    if(GameState.Mode == EngineMode.MINIGAME){
      const mg = GameState.module?.area?.miniGame;
      if(mg){
        const lxRaw = this.gamePad.stick_l_x.value;
        const lyRaw = this.gamePad.stick_l_y.value;
        const stickX = Math.abs(lxRaw) > 0.15 ? lxRaw : 0;
        const stickY = Math.abs(lyRaw) > 0.15 ? lyRaw : 0;
        const keyX = resolveMinigameKeyAxisX();
        const reverseY = GameState.isMinigameYAxisReversed();

        if(mg.type === MiniGameType.SWOOPRACE){
          // Retail ProcessInput: clamp(Poll(L)+Poll(R), -1, 1) — stick and keys sum.
          const x = Math.max(-1, Math.min(1, stickX + keyX));
          mg.updateAxis(x, 0, 0, delta);
          // Swoop accelerate (W / MGActionUp / pad up) → OnAccelerate every frame while held.
          // onaccelerate.ncs gates on MIN_RACE_GEAR / speed thresholds (gear 0 → 1+).
          const accelHeld =
            !!KeyMapper.Actions[KeyMapAction.MGActionUp]?.keyboardInput?.down
            || !!KeyMapper.Actions[KeyMapAction.MGActionUp]?.gamepadInput?.pressed
            || !!KeyMapper.Actions[KeyMapAction.MGActionUp]?.gamepadInput?.down
            || !!KeyMapper.Actions[KeyMapAction.ActionUp]?.keyboardInput?.down;
          if(accelHeld && GameState.State == EngineState.RUNNING && mg.player?.running){
            mg.player.onAccelerate();
          }
        }else if(mg.type === MiniGameType.TURRET){
          // Retail: UpdateAxis(x,0,z); optional negate Z for Reverse Minigame YAxis.
          const x = Math.max(-1, Math.min(1, stickX + keyX));
          let z = Math.max(-1, Math.min(1, stickY + resolveMinigameKeyAxisZ()));
          if(reverseY){ z = -z; }
          mg.updateAxis(x, 0, z, delta);

          const dx = Mouse.MouseX - Mouse.OldMouseX;
          const dy = Mouse.MouseY - Mouse.OldMouseY;
          if(dx || dy){
            let mx = Math.max(-1, Math.min(1, dx / MG_MOUSE_POLL_SCALE));
            let my = Math.max(-1, Math.min(1, dy / MG_MOUSE_POLL_SCALE));
            if(reverseY){ my = -my; }
            mg.updateMouse(mx, my, delta);
          }
          // Retail recenter cursor unless combat-paused.
          if(GameState.State == EngineState.RUNNING){
            const cx = (this.element?.clientWidth || window.innerWidth) * 0.5;
            const cy = (this.element?.clientHeight || window.innerHeight) * 0.5;
            const ox = this.element?.offsetLeft || 0;
            const oy = this.element?.offsetTop || 0;
            Mouse.Update(ox + cx, oy + cy);
            Mouse.MouseX = cx;
            Mouse.MouseY = cy;
            Mouse.OldMouseX = cx;
            Mouse.OldMouseY = cy;
          }
        }
      }
    }

    // FreeLook: right-stick look (CSWCameraFreeLook tilt/rotate axes)
    if(GameState.Mode == EngineMode.FREELOOK){
      const rx = this.gamePad.stick_r_x.value;
      const ry = this.gamePad.stick_r_y.value;
      if(Math.abs(rx) > 0.15 || Math.abs(ry) > 0.15){
        FollowerCamera.setFreeLookAxes(
          Math.abs(rx) > 0.15 ? -rx : 0,
          Math.abs(ry) > 0.15 ? -ry : 0
        );
      }
      GameState.scene_cursor_holder.visible = false;
    }

    //Keyboard: onFrameEnd
    this.keyboard.onFrameEnd(delta);

    //Mouse: onFrameEnd
    Mouse.leftClick = false;
    Mouse.rightClick = false;

    Mouse.OldMouseX = Mouse.MouseX;
    Mouse.OldMouseY = Mouse.MouseY;
  }

  /**
   * Retail UpdateCamera @ 005f5e10 — turn when cursor is within screenFramePercentage
   * of the left/right viewport edge (min 2px). Skip while over GUI so floating
   * target-menu clicks are not invalidated by camera motion.
   */
  updateScreenEdgeCameraTurn(){
    if(this.MenuGetActiveUIElements().length > 0){
      return;
    }
    const vpW = GameState.ResolutionManager.getViewportWidth();
    const edge = Math.max(2, Math.floor(vpW * 0.02));
    const x = Mouse.positionViewport.x;
    if(x <= edge){
      FollowerCamera.clearFocusObject();
      FollowerCamera.turning = true;
      FollowerCamera.dir = 1;
    }else if(x >= vpW - edge){
      FollowerCamera.clearFocusObject();
      FollowerCamera.turning = true;
      FollowerCamera.dir = -1;
    }
  }

  /**
   * Retail CSWGuiManager::HandleZMouse @ 0040c650 — wheel over action buttons
   * cycles the matching ActionMenuPanel (BTN_TARGET* / BTN_ACTION*).
   */
  cycleHoveredActionMenu(direction: number){
    const controls = this.MenuGetActiveUIElements();
    for(let i = 0; i < controls.length; i++){
      const control = controls[i];
      if(!control?.isVisible?.() || !control.name) continue;
      const name = control.name.toUpperCase();

      let panelIndex = -1;
      let isTarget = false;
      let match = name.match(/^BTN_TARGET(?:UP|DOWN)?(\d+)$/);
      if(match){
        isTarget = true;
        panelIndex = parseInt(match[1], 10);
      }else{
        match = name.match(/^BTN_ACTION(?:UP|DOWN)?(\d+)$/);
        if(match){
          panelIndex = parseInt(match[1], 10);
        }
      }
      if(panelIndex < 0) continue;

      const panels = isTarget
        ? GameState.ActionMenuManager.ActionPanels.targetPanels
        : GameState.ActionMenuManager.ActionPanels.selfPanels;
      const panel = panels?.[panelIndex];
      if(!panel || panel.actions.length <= 1) return;

      if(direction < 0){
        panel.previousAction();
      }else{
        panel.nextAction();
      }
      return;
    }
  }

  plChangeCallback(_e: Event){
    if(document.pointerLockElement === this.element){
      Mouse.pointerLock = true;
      Mouse.pointerLockDenied = false;
      Mouse.pointerLockWanted = true;
      // Avoid a look spike when entering relative mode
      Mouse.OldMouseX = Mouse.MouseX;
      Mouse.OldMouseY = Mouse.MouseY;
      if(GameState.scene_cursor_holder){
        GameState.scene_cursor_holder.visible = false;
      }
    }else{
      Mouse.pointerLock = false;
      // Esc / focus loss: keep looking via absolute mouse if hold still desired.
      if(!Mouse.cameraHoldActive){
        Mouse.pointerLockWanted = false;
        if(GameState.scene_cursor_holder && GameState.Mode != EngineMode.FREELOOK){
          GameState.scene_cursor_holder.visible = true;
        }
      }
    }
  }

  plErrorCallback(_e: Event){
    // Lock unavailable this attempt — continue with existing absolute-mouse look.
    Mouse.pointerLock = false;
    Mouse.pointerLockDenied = true;
  }

}
