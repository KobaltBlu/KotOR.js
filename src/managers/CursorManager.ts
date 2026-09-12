import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { Mouse } from "@/controls/Mouse";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { EngineMode, GameEngineType } from "@/enums/engine";
import type { MenuManager } from "@/managers/MenuManager";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import { getClientCombatMode } from "@/combat/combat-engagement";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";
import { isTrigger } from "@/module/guards/isTrigger";

/** ProcessInput pick range (√900) — XY distance player↔object. */
export const MOUSE_PICK_RANGE = 30;
export const MOUSE_PICK_RANGE_SQ = MOUSE_PICK_RANGE * MOUSE_PICK_RANGE;

/** clear / scale floor distance (√900). */
export const RETICLE_MAX_DISTANCE = 30;
export const RETICLE_MAX_DISTANCE_SQ = 900;

/** World sprite scale that maps to base size 0x40 (64px). */
export const RETICLE_BASE_WORLD_SCALE = 0.5;

export type ReticleKind = 'creature' | 'object';

export type ReticleStyle = {
	/** CursorManager material key */
	material: 'reticleF' | 'reticleH' | 'reticleF2' | 'reticleH2' | 'reticleCombat';
	/** Friendly vs hostile (arrow / nameplate) */
	hostile: boolean;
};

/**
 * combat-reticle size pulse.
 * Timer -1 → start 0.5s swell; while > 0 add up to +64px; then settle.
 */
export class CombatReticlePulse {
	/** -1 = armed to swell, 0 = idle, >0 = pulsing */
	timer: number = 0;

	/** Call when selected target or combat-mode style becomes combatreticle. */
	arm(){
		if(this.timer === 0){
			this.timer = -1;
		}
	}

	reset(){
		this.timer = 0;
	}

	/**
	 * @returns extra pixel size to add this frame
	 */
	update(delta: number, usingCombatReticle: boolean): number {
		if(!usingCombatReticle){
			this.timer = 0;
			return 0;
		}
		if(this.timer <= 0){
			if(this.timer !== -1){
				return 0;
			}
			this.timer = 0.5;
			return 0x40;
		}
		this.timer -= delta;
		if(this.timer <= 0){
			this.timer = 0;
			return 0;
		}
		return Math.floor(this.timer * 128);
	}
}

/**
 * Manages the in-game cursor, reticles, and selection/hover logic.
 *
 * : UpdateStickyTarget
 * UpdateIndicator — distance size, combatreticle pulse, off-screen hide.
 * Mouse hover/click pick: ProcessInput
 * Camera HitCheck then GetStickyMouseThreshhold sticky fallback.
 *
 * @file CursorManager.ts
 * @author KobaltBlu
 * @license GPLv3
 */
export class CursorManager {
	/** Reference to the active `MenuManager` type for UI state checks */
	static MenuManager: typeof MenuManager;
	
	/** Map of named cursor sprite materials (e.g., "default", "attack") */
	static cursorMaterials: Map<string, THREE.SpriteMaterial> = new Map();
	
	/** Main cursor sprite shown in the UI layer */
	static cursor: THREE.Sprite;
	/** Primary reticle shown over hovered objects */
	static reticle: THREE.Sprite;
	/** Secondary reticle shown over selected objects */
	static reticle2: THREE.Sprite;
	/** Directional arrow sprite (friendly/hostile) */
	static arrow: THREE.Sprite;
	
	/** Three.js node for the currently selected object (reticle anchor) */
	static selected: THREE.Object3D;
	/** Game module object currently selected */
	static selectedObject: ModuleObject;
	/** Three.js node for the currently hovered object (reticle anchor) */
	static hovered: THREE.Object3D;
	/** Game module object currently hovered */
	static hoveredObject: ModuleObject;

	/** combat-reticle swell */
	static combatReticlePulse = new CombatReticlePulse();
	static lastCombatReticleTargetId: number = -1;
	
	/** Subset of module objects considered for selection/hover */
	static visibleObjects: ModuleObject[];

	static #tmpWorld = new THREE.Vector3();
	static #tmpHit = new THREE.Vector3();
	static #tmpNdc = new THREE.Vector3();
	static #tmpBox = new THREE.Box3();

	/**
	 * GetStickyMouseThreshhold / Android
	 * `(screenW/10)² + (screenH/10)²` in viewport pixels².
	 */
	static getStickyMouseThresholdSq(screenWidth: number, screenHeight: number): number {
		const w = screenWidth / 10;
		const h = screenHeight / 10;
		return w * w + h * h;
	}

	/** Squared screen-space distance between mouse and projected reticle. */
	static screenDistanceSq(
		mouseX: number,
		mouseY: number,
		screenX: number,
		screenY: number,
	): number {
		const dx = screenX - mouseX;
		const dy = screenY - mouseY;
		return dx * dx + dy * dy;
	}

	/**
	 * ProcessInput gates after a candidate is resolved:
	 * - XY distance to player < 30
	 * - (player - cam) · (obj - cam) >= 0 in XY (same half-space as the player)
	 */
	static passesMousePickGates(
		player: THREE.Vector3,
		camera: THREE.Vector3,
		object: THREE.Vector3,
		maxDistSq: number = MOUSE_PICK_RANGE_SQ,
	): boolean {
		const dx = object.x - player.x;
		const dy = object.y - player.y;
		if(dx * dx + dy * dy > maxDistSq){
			return false;
		}
		const px = player.x - camera.x;
		const py = player.y - camera.y;
		const ox = object.x - camera.x;
		const oy = object.y - camera.y;
		return px * ox + py * oy >= 0;
	}

	/**
	 * pixel size from distance².
	 * Creatures shrink with ×48 toward min 16; doors/placeables/triggers ×32 toward min 32.
	 */
	static getReticlePixelSize(distSq: number, kind: ReticleKind): number {
		const base = 0x40;
		if(distSq >= RETICLE_MAX_DISTANCE_SQ){
			return kind === 'creature' ? 0x10 : 0x20;
		}
		if(distSq > 25){
			const shrink = kind === 'creature' ? 48 : 32;
			return Math.max(
				kind === 'creature' ? 0x10 : 0x20,
				base - Math.floor((Math.sqrt(distSq) - 5) * 0.04 * shrink)
			);
		}
		return base;
	}

	static pixelSizeToWorldScale(pixelSize: number): number {
		return (pixelSize / 0x40) * RETICLE_BASE_WORLD_SCALE;
	}

	static getReticleKind(object: ModuleObject | undefined): ReticleKind {
		if(isCreature(object)){
			return 'creature';
		}
		return 'object';
	}

	/**
	 * True when client combat_mode would be set
	 * (— controlled PC client combat-mode bit).
	 */
	static isClientCombatMode(): boolean {
		return getClientCombatMode();
	}

	/**
	 * Hostile for reticle fill.
	 * Creatures: live hostile only (dead → friendly loot).
	 * Placeables: locked + useable + non-plot (dual-flag bash path).
	 * Doors: locked and closed (door dual-flag path).
	 */
	static isReticleHostile(object: ModuleObject | undefined, observer?: ModuleObject): boolean {
		if(!object) return false;
		const viewer = observer ?? GameState.getCurrentPlayer();
		if(!viewer) return false;

		if(isCreature(object)){
			const cre = object as ModuleCreature;
			if(cre.isDead()) return false;
			return cre.isHostile(viewer);
		}

		if(isPlaceable(object)){
			const plc = object as ModulePlaceable;
			if(!plc.isUseable()) return false;
			if(plc.plot || plc.isBodyBag || plc.isCorpse) return false;
			return !!plc.locked;
		}

		if(isDoor(object)){
			const door = object as ModuleDoor;
			if(!door.isUseable()) return false;
			if(door.plot) return false;
			return door.isLocked() && !door.isOpen();
		}

		if(isTrigger(object)){
			return !!object.isHostile?.(viewer);
		}

		return false;
	}

	/** Hover reticle (UpdateStickyTarget): friendlyreticle / hostilereticle */
	static getHoverReticleStyle(object: ModuleObject | undefined): ReticleStyle {
		const hostile = CursorManager.isReticleHostile(object);
		return {
			hostile,
			material: hostile ? 'reticleH' : 'reticleF',
		};
	}

	/**
	 * Selected reticle (UpdateIndicator): friendlyreticle2 / hostilereticle2 / combatreticle.
	 */
	static getSelectedReticleStyle(object: ModuleObject | undefined): ReticleStyle {
		const hostile = CursorManager.isReticleHostile(object);
		if(!hostile){
			return { hostile: false, material: 'reticleF2' };
		}
		if(
			isCreature(object) &&
			CursorManager.isClientCombatMode()
		){
			return { hostile: true, material: 'reticleCombat' };
		}
		return { hostile: true, material: 'reticleH2' };
	}
	
	/**
	 * Initializes cursor/reticle materials and sprites, and loads textures.
	 */
	static async init(){
		CursorManager.cursorMaterials.set('default', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('defaultD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('select', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('selectD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('bash', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('bashD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('door', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('doorD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('use', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('useD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('talk', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('talkD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('trap', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('trapD', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('attack', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('attackD', new THREE.SpriteMaterial());

		CursorManager.cursorMaterials.set('reticleF', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('reticleF2', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('reticleH', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('reticleH2', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('reticleCombat', new THREE.SpriteMaterial());

		CursorManager.cursorMaterials.set('arrowF', new THREE.SpriteMaterial());
		CursorManager.cursorMaterials.set('arrowH', new THREE.SpriteMaterial());


		CursorManager.cursor = new THREE.Sprite( CursorManager.cursorMaterials.get('default') );
		CursorManager.cursor.scale.set( 32, 32, 1.0 );
		CursorManager.cursor.position.z = 1;

		TextureLoader.enQueue('gui_mp_defaultU', CursorManager.cursorMaterials.get('default'));
		TextureLoader.enQueue('gui_mp_defaultD', CursorManager.cursorMaterials.get('defaultD'));
		TextureLoader.enQueue('gui_mp_doorU', CursorManager.cursorMaterials.get('door'));
		TextureLoader.enQueue('gui_mp_doorD', CursorManager.cursorMaterials.get('doorD'));
		TextureLoader.enQueue('gui_mp_talkU', CursorManager.cursorMaterials.get('talk'));
		TextureLoader.enQueue('gui_mp_talkD', CursorManager.cursorMaterials.get('talkD'));
		TextureLoader.enQueue('gui_mp_useU', CursorManager.cursorMaterials.get('use'));
		TextureLoader.enQueue('gui_mp_useD', CursorManager.cursorMaterials.get('useD'));
		if(ApplicationProfile.GameKey == GameEngineType.TSL){
			TextureLoader.enQueue('gui_mp_killU', CursorManager.cursorMaterials.get('attack'));
			TextureLoader.enQueue('gui_mp_killD', CursorManager.cursorMaterials.get('attackD'));
		}else{
			TextureLoader.enQueue('gui_mp_attackU', CursorManager.cursorMaterials.get('attack'));
			TextureLoader.enQueue('gui_mp_attackD', CursorManager.cursorMaterials.get('attackD'));
		}
		TextureLoader.enQueue('gui_mp_dismineU', CursorManager.cursorMaterials.get('trap'));
		TextureLoader.enQueue('gui_mp_dismineD', CursorManager.cursorMaterials.get('trapD'));
		TextureLoader.enQueue('gui_mp_selectU', CursorManager.cursorMaterials.get('select'));
		TextureLoader.enQueue('gui_mp_selectD', CursorManager.cursorMaterials.get('selectD'));

		CursorManager.setCursor('default');

		CursorManager.reticle = new THREE.Sprite( CursorManager.cursorMaterials.get('reticleF') );
		CursorManager.reticle2 = new THREE.Sprite( CursorManager.cursorMaterials.get('reticleF2') );
		CursorManager.arrow = new THREE.Sprite( CursorManager.cursorMaterials.get('arrowF') );
		
		CursorManager.reticle.scale.set( 0.5, 0.5, 0.5 );
		CursorManager.reticle.name = 'reticle';
		CursorManager.reticle.renderOrder = 1;
		CursorManager.reticle2.scale.set( 0.5, 0.5, 0.5 );
		CursorManager.reticle2.name = 'reticle2';
		CursorManager.reticle2.renderOrder = 1;
		CursorManager.arrow.scale.set( 32.0, 32.0, 1.0 );
		CursorManager.arrow.name = 'arrow';
		TextureLoader.enQueue('friendlyreticle', CursorManager.cursorMaterials.get('reticleF'));
		TextureLoader.enQueue('friendlyreticle2', CursorManager.cursorMaterials.get('reticleF2'));
		TextureLoader.enQueue('hostilereticle', CursorManager.cursorMaterials.get('reticleH'));
		TextureLoader.enQueue('hostilereticle2', CursorManager.cursorMaterials.get('reticleH2'));
		TextureLoader.enQueue('combatreticle', CursorManager.cursorMaterials.get('reticleCombat'));

		TextureLoader.enQueue('friendlyarrow', CursorManager.cursorMaterials.get('arrowF'));
		TextureLoader.enQueue('hostilearrow', CursorManager.cursorMaterials.get('arrowH'));

		await TextureLoader.LoadQueue();

		for(const key of CursorManager.cursorMaterials.keys()){
			const mat = CursorManager.cursorMaterials.get(key);
			if(mat){
				mat.depthTest = false;
				mat.depthWrite = false;
				mat.transparent = true;
				mat.alphaTest = 0.51;
			}
		}
	}

	/**
	 * Sets the current cursor sprite material by name.
	 */
	static setCursor(cursor = 'default'){
		const cursorName = !Mouse.leftDown ? cursor : cursor+'D';
		const cursorMaterial = CursorManager.cursorMaterials.get(cursorName);
		if(CursorManager.cursor.material != cursorMaterial){
			CursorManager.cursor.material = cursorMaterial;
		}
	}

	/**
	 * Notifies the cursor system that a `ModuleObject` was destroyed.
	 */
	static notifyObjectDestroyed(object: ModuleObject){
		if(CursorManager.selectedObject == object){
			CursorManager.selectedObject = undefined;
			CursorManager.combatReticlePulse.reset();
			CursorManager.lastCombatReticleTargetId = -1;
		}
		if(CursorManager.hoveredObject == object){
			CursorManager.hoveredObject = undefined;
		}
		const idx = GameState.ModuleObjectManager.playerSelectableObjects.indexOf(object);
		if(idx >= 0){
			GameState.ModuleObjectManager.playerSelectableObjects.splice(idx, 1);
		}
		const idx2 = GameState.ModuleObjectManager.playerHoverableObjects.indexOf(object);
		if(idx2 >= 0){
			GameState.ModuleObjectManager.playerHoverableObjects.splice(idx2, 1);
		}
	}

	/**
	 * Sets the primary reticle material by name (guarded to avoid redundant swaps).
	 */
	static setReticle(reticle = 'reticleF'){
		const reticleMaterial = CursorManager.cursorMaterials.get(reticle);
		if(reticleMaterial && CursorManager.reticle.material != reticleMaterial)
			CursorManager.reticle.material = reticleMaterial;
	}

	/**
	 * Sets the secondary reticle material by name (guarded to avoid redundant swaps).
	 */
	static setReticle2(reticle = 'reticleF'){
		const reticleMaterial = CursorManager.cursorMaterials.get(reticle);
		if(reticleMaterial && CursorManager.reticle2.material != reticleMaterial)
			CursorManager.reticle2.material = reticleMaterial;
	}

	static applyReticleScale(sprite: THREE.Sprite, object: ModuleObject | undefined, pulseExtraPx = 0){
		const player = GameState.getCurrentPlayer();
		if(!object || !player || !sprite){
			return;
		}
		const distSq = player.position.distanceToSquared(object.position);
		const px = CursorManager.getReticlePixelSize(distSq, CursorManager.getReticleKind(object)) + pulseExtraPx;
		const s = CursorManager.pixelSizeToWorldScale(Math.max(1, px));
		sprite.scale.set(s, s, s);
	}

	/**
	 * Sets the currently selected object and positions the secondary reticle.
	 * @param options.lookAt - when false, skip creature LookAt (ShowObject arg2=0)
	 */
	public static setReticleSelectedObject(
		object: ModuleObject | undefined,
		options?: { lookAt?: boolean },
	){
		const doLookAt = options?.lookAt !== false;
		const player = GameState.getCurrentPlayer();
		if(!object){
			// ShowObject(null) → LookAt(OBJECT_INVALID)
			if(player && typeof player.lookAt === 'function'){
				player.lookAt(undefined);
			}
			CursorManager.selectedObject = undefined;
			CursorManager.selected = undefined;
			CursorManager.combatReticlePulse.reset();
			CursorManager.lastCombatReticleTargetId = -1;
			return;
		}
		if(doLookAt && player){
			player.lookAt(object);
		}

		CursorManager.selected = object.getReticleNode();
		if(CursorManager.selected){
			CursorManager.selected.getWorldPosition(CursorManager.reticle2.position);
			CursorManager.selectedObject = object;
		}

		if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable) && !object.isUseable()){
			return;
		}

		const style = CursorManager.getSelectedReticleStyle(object);
		if(style.material === 'reticleCombat'){
			if(CursorManager.lastCombatReticleTargetId !== object.id){
				CursorManager.combatReticlePulse.arm();
				CursorManager.lastCombatReticleTargetId = object.id;
			}
		}else{
			CursorManager.combatReticlePulse.reset();
			CursorManager.lastCombatReticleTargetId = -1;
		}
		CursorManager.setReticle2(style.material);
	}

	/**
	 * Sets the currently hovered object and positions the primary reticle.
	 */
	public static setReticleHoveredObject( object: ModuleObject ){
		if(!object){ return; }

		const canChangeCursor = (CursorManager.hoveredObject == CursorManager.selectedObject);

		CursorManager.hovered = object.getReticleNode();
		if(CursorManager.hovered){
			CursorManager.hovered.getWorldPosition(CursorManager.reticle.position);
			CursorManager.hoveredObject = object;
		}

		if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
			CursorManager.setCursor(canChangeCursor ? 'door' : 'select');
			CursorManager.setReticle(CursorManager.getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
			if(!object.isUseable()){
				return;
			}
			CursorManager.setCursor(canChangeCursor ? 'use' : 'select');
			CursorManager.setReticle(CursorManager.getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
			if(!object.isUseable()){
				return;
			}
			CursorManager.setCursor(canChangeCursor ? 'trap' : 'select');
			CursorManager.setReticle(CursorManager.getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
			const player = GameState.getCurrentPlayer();
			const creature = object as ModuleCreature;
			const style = CursorManager.getHoverReticleStyle(creature);

			if(style.hostile){
				CursorManager.setCursor(canChangeCursor ? 'attack' : 'select');
			}else if(creature.isDead() && creature.canLootAsCorpse(player)){
				CursorManager.setCursor(canChangeCursor ? 'use' : 'select');
			}else if(creature.isDead()){
				CursorManager.setCursor(canChangeCursor ? 'use' : 'select');
			}else{
				CursorManager.setCursor(canChangeCursor ? 'talk' : 'select');
			}
			CursorManager.setReticle(style.material);
		}
	}

	/**
	 * Per-frame update for cursor/reticles based on UI and world state.
	 */
	static updateCursor(){
		let cursorCaptured = false;
		let guiHoverCaptured = false;

		// ProcessInput / HideMouse while rightClickHeld — skip hover picking.
		// Pointer lock also hides the OS cursor; skip world hover while locked.
		// Mouse Look keeps LMB picking active while camera tracks movement (unlocked).
		if(Mouse.pointerLock || (Mouse.cameraHoldActive && !Mouse.isMouseLookEnabled())){
			CursorManager.setCursor('default');
			CursorManager.hoveredObject = undefined;
			CursorManager.hovered = undefined;
			CursorManager.reticle.visible = false;
			if(GameState.scene_cursor_holder){
				GameState.scene_cursor_holder.visible = false;
			}
			return;
		}

		CursorManager.setCursor('default');
		GameState.scene_cursor_holder.position.x = Mouse.positionViewport.x - (GameState.ResolutionManager.getViewportWidth()/2) + (32/2);
		GameState.scene_cursor_holder.position.y = (Mouse.positionViewport.y*-1) + (GameState.ResolutionManager.getViewportHeight()/2) - (32/2);

		CursorManager.MenuManager.hoveredGUIElement = undefined;

		let uiControls = GameState.controls.MenuGetActiveUIElements();
		let controlCount = uiControls.length;
		for(let i = 0; i < controlCount; i++){
			let control = uiControls[i];

			if(!control.isVisible()){
				continue;
			}

			if(BitWise.InstanceOfObject(control, GUIControlTypeMask.GUIListBox) && CursorManager.MenuManager.hoveredGUIElement == undefined){
				CursorManager.MenuManager.hoveredGUIElement = control;
			}

			if((control.widget.parent.type === 'Scene')){
				continue;
			}

			// HandleMouseMove — only selectable controls get mouse-over
			// (GetIsSelectable). Decorative labels under the cursor are skipped.
			if(!guiHoverCaptured && control.receivesGuiMouseHover()){
				let cMenu = control.menu;
				cMenu.setWidgetHoverActive(control, true);
				guiHoverCaptured = true;
			}

			if(typeof control.isClickable == 'function'){
				if(control.isClickable()){
					CursorManager.setCursor('select');
					cursorCaptured = true;
				}
			}
		}

		CursorManager.arrow.visible = false;

		// Hard-target distance / useable clears are owned by DoPassiveSelection
		// (showObject). Soft hover target may still clear here.

		const maxSelectableDistanceSquared = GameState.maxSelectableDistance * GameState.maxSelectableDistance;

		if(CursorManager.hoveredObject){
			if(CursorManager.hoveredObject.position.distanceToSquared(GameState.getCurrentPlayer().position) > maxSelectableDistanceSquared){
				CursorManager.hoveredObject = undefined;
				CursorManager.hovered = undefined;
			}

			if(CursorManager.hoveredObject && !CursorManager.hoveredObject.isUseable()){
				CursorManager.hoveredObject = undefined;
				CursorManager.hovered = undefined;
			}
		}

		if(!cursorCaptured && GameState.Mode == EngineMode.INGAME){
			if(CursorManager.MenuManager.GetCurrentMenu() == CursorManager.MenuManager.InGameOverlay){
				if(GameState.scene_cursor_holder.visible){
					const moduleObject = CursorManager.onMouseHitInteractive();
					if(moduleObject){
						CursorManager.setReticleHoveredObject(moduleObject);
					}else{
						// UpdateStickyTarget hides hover when GetReticlePoint fails / no target
						CursorManager.hoveredObject = undefined;
						CursorManager.hovered = undefined;
					}
				}
				// Hidden cursor: does not auto-acquire hover via nearest;
				// DoPassiveSelection owns selected target presentation.
			}
		}

		const delta = GameState.delta || 0;

		if(GameState.Mode == EngineMode.INGAME && CursorManager.hovered instanceof OdysseyObject3D){
			CursorManager.hovered.getWorldPosition(CursorManager.#tmpWorld);
			const onScreen = GameState.viewportFrustum?.containsPoint(CursorManager.#tmpWorld) ?? true;
			if(onScreen){
				CursorManager.reticle.position.copy(CursorManager.#tmpWorld);
				CursorManager.reticle.visible = true;
				CursorManager.applyReticleScale(CursorManager.reticle, CursorManager.hoveredObject);
				CursorManager.setReticle(CursorManager.getHoverReticleStyle(CursorManager.hoveredObject).material);
			}else{
				CursorManager.reticle.visible = false;
			}
		}else{
			CursorManager.reticle.visible = false;
		}

		if(GameState.Mode == EngineMode.INGAME && CursorManager.selected instanceof OdysseyObject3D && !CursorManager.MenuManager.MenuContainer.bVisible){
			CursorManager.selected.getWorldPosition(CursorManager.#tmpWorld);
			const onScreen = GameState.viewportFrustum?.containsPoint(CursorManager.#tmpWorld) ?? true;
			if(onScreen){
				const style = CursorManager.getSelectedReticleStyle(CursorManager.selectedObject);
				if(style.material === 'reticleCombat'){
					if(CursorManager.lastCombatReticleTargetId !== CursorManager.selectedObject?.id){
						CursorManager.combatReticlePulse.arm();
						CursorManager.lastCombatReticleTargetId = CursorManager.selectedObject?.id ?? -1;
					}
				}else if(CursorManager.lastCombatReticleTargetId !== -1){
					CursorManager.combatReticlePulse.reset();
					CursorManager.lastCombatReticleTargetId = -1;
				}
				const pulsePx = CursorManager.combatReticlePulse.update(delta, style.material === 'reticleCombat');
				CursorManager.reticle2.position.copy(CursorManager.#tmpWorld);
				CursorManager.reticle2.visible = true;
				CursorManager.setReticle2(style.material);
				CursorManager.applyReticleScale(CursorManager.reticle2, CursorManager.selectedObject, pulsePx);
			}else{
				// Off-screen: swaps to edge arrow (InGameOverlay.updateArrow)
				CursorManager.reticle2.visible = false;
			}
		}else{
			CursorManager.reticle2.visible = false;
		}

	}

	/** Shared raycaster for interactable hit-testing */
	static raycaster = new THREE.Raycaster();

	/**
	 * Nearest walkmesh occlusion along the current raycaster ray.
	 * Approximates SceneHitCheck room CheckAABBAll + closed-door DWKs.
	 */
	static findNearestSceneOccluder(): { distance: number; door?: ModuleObject } | undefined {
		const area = GameState.module?.area;
		if(!area) return undefined;

		const raycaster = CursorManager.raycaster;
		let bestDist = Infinity;
		let bestDoor: ModuleObject | undefined;

		const rooms = area.rooms || [];
		for(let i = 0; i < rooms.length; i++){
			const room: any = rooms[i];
			const wok = room?.collisionManager?.walkmesh;
			if(!wok?.faces?.length) continue;
			const hits = wok.raycast(raycaster, wok.faces) || [];
			for(let h = 0; h < hits.length; h++){
				if(hits[h].distance < bestDist){
					bestDist = hits[h].distance;
					bestDoor = undefined;
				}
			}
		}

		const doorWoks = area.doorWalkmeshes;
		if(doorWoks?.length){
			for(let i = 0; i < doorWoks.length; i++){
				const wok = doorWoks[i];
				if(!wok?.faces?.length || !wok.mesh) continue;
				const door = wok.moduleObject;
				if(
					door &&
					BitWise.InstanceOf(door.objectType, ModuleObjectType.ModuleDoor) &&
					(door as ModuleDoor).isOpen()
				){
					continue;
				}
				const hits = wok.raycast(raycaster) || [];
				for(let h = 0; h < hits.length; h++){
					if(hits[h].distance < bestDist){
						bestDist = hits[h].distance;
						bestDoor = door;
					}
				}
			}
		}

		if(!Number.isFinite(bestDist) || bestDist === Infinity) return undefined;
		return { distance: bestDist, door: bestDoor };
	}

	/**
	 * Project an object's GetReticlePoint into viewport pixel space.
	 * matches engine behavior GetReticlePoint screen write used by the sticky path.
	 */
	static projectReticleToScreen(
		object: ModuleObject,
		camera: THREE.Camera,
		out: { x: number; y: number },
	): boolean {
		const node = object.getReticleNode?.();
		if(node){
			node.getWorldPosition(CursorManager.#tmpWorld);
		}else{
			CursorManager.#tmpWorld.copy(object.position);
			CursorManager.#tmpWorld.z += 1;
		}

		CursorManager.#tmpNdc.copy(CursorManager.#tmpWorld).project(camera);
		if(!Number.isFinite(CursorManager.#tmpNdc.x) || !Number.isFinite(CursorManager.#tmpNdc.y)){
			return false;
		}

		const vpW = GameState.ResolutionManager.getViewportWidth();
		const vpH = GameState.ResolutionManager.getViewportHeight();
		out.x = (CursorManager.#tmpNdc.x * 0.5 + 0.5) * vpW;
		out.y = (-CursorManager.#tmpNdc.y * 0.5 + 0.5) * vpH;
		return true;
	}

	/**
	 * ProcessInput mouse pick / Android:
	 * 1) Camera HitCheck-style AABB ray against selectable objects (SceneHitCheck
	 * walkmesh occluders reject hits behind geometry)
	 * 2) Sticky fallback — nearest CanSee GetReticlePoint within
	 * GetStickyMouseThreshhold `(w/10)²+(h/10)²`
	 */
	public static onMouseHitInteractive(): ModuleObject | undefined {
		const player = GameState.getCurrentPlayer();
		const camera = GameState.currentCamera;
		if(!player || !camera){
			return undefined;
		}

		const objects = GameState.ModuleObjectManager.playerSelectableObjects;
		const objCount = objects.length;
		if(objCount < 1){
			return undefined;
		}

		const farCache = CursorManager.raycaster.far;
		CursorManager.raycaster.far = Math.max(
			camera instanceof THREE.PerspectiveCamera ? camera.far : 1000,
			GameState.maxSelectableDistance,
		);
		CursorManager.raycaster.setFromCamera(Mouse.position, camera);

		const occluder = CursorManager.findNearestSceneOccluder();
		const ray = CursorManager.raycaster.ray;

		let bestObj: ModuleObject | undefined;
		let bestDist = Infinity;

		for(let i = 0; i < objCount; i++){
			const obj = objects[i];
			if(!CursorManager.passesMousePickGates(player.position, camera.position, obj.position, MOUSE_PICK_RANGE_SQ)){
				continue;
			}

			// Prefer cached model AABB (Gob bounding volume). Rebuild only if empty.
			let box = obj.box;
			if(!box || box.isEmpty()){
				if(typeof obj.computeBoundingBox === 'function'){
					obj.computeBoundingBox();
					box = obj.box;
				}
			}
			if(!box || box.isEmpty()){
				const radius = typeof obj.getHitDistance === 'function'
					? Math.max(0.25, obj.getHitDistance())
					: 0.5;
				CursorManager.#tmpBox.min.set(
					obj.position.x - radius,
					obj.position.y - radius,
					obj.position.z,
				);
				CursorManager.#tmpBox.max.set(
					obj.position.x + radius,
					obj.position.y + radius,
					obj.position.z + radius * 2,
				);
				box = CursorManager.#tmpBox;
			}
			if(!ray.intersectBox(box, CursorManager.#tmpHit)){
				continue;
			}

			const dist = ray.origin.distanceTo(CursorManager.#tmpHit);
			if(occluder && dist > occluder.distance && occluder.door !== obj){
				continue;
			}
			if(dist < bestDist){
				bestDist = dist;
				bestObj = obj;
			}
		}

		if(bestObj){
			CursorManager.raycaster.far = farCache;
			return bestObj;
		}

		// Sticky fallback — GetStickyMouseThreshhold + GetReticlePoint
		const threshSq = CursorManager.getStickyMouseThresholdSq(
			GameState.ResolutionManager.getViewportWidth(),
			GameState.ResolutionManager.getViewportHeight(),
		);
		const mouseX = Mouse.positionViewport.x;
		const mouseY = Mouse.positionViewport.y;
		const screen = { x: 0, y: 0 };
		let bestSticky: ModuleObject | undefined;
		let bestStickyDist = Infinity;

		for(let i = 0; i < objCount; i++){
			const obj = objects[i];
			if(!GameState.ModuleObjectManager.canSeeObject(player, obj)){
				continue;
			}
			if(!CursorManager.passesMousePickGates(player.position, camera.position, obj.position, MOUSE_PICK_RANGE_SQ)){
				continue;
			}
			if(!CursorManager.projectReticleToScreen(obj, camera, screen)){
				continue;
			}
			const distSq = CursorManager.screenDistanceSq(mouseX, mouseY, screen.x, screen.y);
			if(distSq > threshSq || distSq >= bestStickyDist){
				continue;
			}
			bestStickyDist = distSq;
			bestSticky = obj;
		}

		CursorManager.raycaster.far = farCache;
		return bestSticky;
	}

}
