import * as THREE from "three";
import { TextureLoader } from "@/loaders";
import { Mouse } from "@/controls/Mouse";
import type { ModuleObject } from "@/module";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { EngineMode, GameEngineType } from "@/enums/engine";
import type { MenuManager } from "@/managers/MenuManager";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import {
	CombatReticlePulse,
	getHoverReticleStyle,
	getReticleKind,
	getReticlePixelSize,
	getSelectedReticleStyle,
	pixelSizeToWorldScale,
} from "@/managers/reticle";

/**
 * Manages the in-game cursor, reticles, and selection/hover logic.
 *
 * Retail: CSWGuiMainInterface::UpdateStickyTarget @ 006889c0 /
 * UpdateIndicator @ 0068a310 — distance size, combatreticle pulse, off-screen hide.
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

	/** Retail combat-reticle swell (UpdateIndicator field21_0x5cb0) */
	static combatReticlePulse = new CombatReticlePulse();
	static lastCombatReticleTargetId: number = -1;
	
	/** Subset of module objects considered for selection/hover */
	static visibleObjects: ModuleObject[];
	
	/** Dynamic geometry used as point proxies for interactable ray tests */
	static pointGeomerty = new THREE.BufferGeometry();
	/** Material for point proxy cloud used for raycasting */
	static pointMaterial = new THREE.PointsMaterial({
		color: 0xff0000,
		sizeAttenuation: false,
		fog: false,
		visible: false
	});
	
	/** Points instance used as a single occlusion/raycast target for interactables */
	static testPoints: THREE.Points;
	
	/** Debug sphere geometry (optional visualization) */
	static sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 ); 
	/** Debug sphere material (optional visualization) */
	static sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } ); 
	/** Debug sphere mesh (optional visualization) */
	static sphere: THREE.Mesh;

	static #tmpWorld = new THREE.Vector3();
	
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

		CursorManager.pointGeomerty.attributes.position = new THREE.Float32BufferAttribute([], 3);
		CursorManager.pointGeomerty.attributes.size = new THREE.Float32BufferAttribute([], 1);
		CursorManager.testPoints = new THREE.Points(CursorManager.pointGeomerty, CursorManager.pointMaterial);
		CursorManager.testPoints.frustumCulled = false;

		CursorManager.sphere = new THREE.Mesh( CursorManager.sphereGeometry, CursorManager.sphereMaterial );

		await TextureLoader.LoadQueue();

		for(const key of ['reticleF', 'reticleF2', 'reticleH', 'reticleH2', 'reticleCombat'] as const){
			const mat = CursorManager.cursorMaterials.get(key);
			if(mat){
				mat.depthTest = false;
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
		const px = getReticlePixelSize(distSq, getReticleKind(object)) + pulseExtraPx;
		const s = pixelSizeToWorldScale(Math.max(1, px));
		sprite.scale.set(s, s, s);
	}

	/**
	 * Sets the currently selected object and positions the secondary reticle.
	 */
	public static setReticleSelectedObject( object: ModuleObject ){
		const player = GameState.getCurrentPlayer();
		if(player && object){
			player.lookAt(object);
		}
		if(!object){
			CursorManager.selectedObject = undefined;
			CursorManager.selected = undefined;
			CursorManager.combatReticlePulse.reset();
			CursorManager.lastCombatReticleTargetId = -1;
			return;
		}

		CursorManager.selected = object.getReticleNode();
		if(CursorManager.selected){
			CursorManager.selected.getWorldPosition(CursorManager.reticle2.position);
			CursorManager.selectedObject = object;
		}

		if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable) && !object.isUseable()){
			return;
		}

		const style = getSelectedReticleStyle(object);
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
			CursorManager.setReticle(getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
			if(!object.isUseable()){
				return;
			}
			CursorManager.setCursor(canChangeCursor ? 'use' : 'select');
			CursorManager.setReticle(getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
			if(!object.isUseable()){
				return;
			}
			CursorManager.setCursor(canChangeCursor ? 'trap' : 'select');
			CursorManager.setReticle(getHoverReticleStyle(object).material);
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
			const player = GameState.getCurrentPlayer();
			const creature = object as ModuleCreature;
			const style = getHoverReticleStyle(creature);

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

			if(!guiHoverCaptured){
				let cMenu = control.menu;
				cMenu.setWidgetHoverActive(control, true);
				guiHoverCaptured = false;
			}

			if(typeof control.isClickable == 'function'){
				if(control.isClickable()){
					CursorManager.setCursor('select');
					cursorCaptured = true;
				}
			}
		}

		const maxSelectableDistanceSquared = GameState.maxSelectableDistance * GameState.maxSelectableDistance;

		CursorManager.arrow.visible = false;
		if(CursorManager.selectedObject){
			if(CursorManager.selectedObject.position.distanceToSquared(GameState.getCurrentPlayer().position) > maxSelectableDistanceSquared){
				CursorManager.selectedObject = undefined;
				CursorManager.selected = undefined;
				CursorManager.combatReticlePulse.reset();
				CursorManager.lastCombatReticleTargetId = -1;
			}

			if(CursorManager.selectedObject && !CursorManager.selectedObject.isUseable()){
				CursorManager.selectedObject = undefined;
				CursorManager.selected = undefined;
				CursorManager.combatReticlePulse.reset();
				CursorManager.lastCombatReticleTargetId = -1;
			}
		}

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
						// Retail UpdateStickyTarget hides hover when GetReticlePoint fails / no target
						CursorManager.hoveredObject = undefined;
						CursorManager.hovered = undefined;
					}
				}else{
					if(!CursorManager.selectedObject){
						let closest = GameState.ModuleObjectManager.GetNearestInteractableObject();
						CursorManager.setReticleHoveredObject(closest);
					}
				}
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
				CursorManager.setReticle(getHoverReticleStyle(CursorManager.hoveredObject).material);
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
				const style = getSelectedReticleStyle(CursorManager.selectedObject);
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
				// Off-screen: retail swaps to edge arrow (InGameOverlay.updateArrow)
				CursorManager.reticle2.visible = false;
			}
		}else{
			CursorManager.reticle2.visible = false;
		}

	}

	/** Shared raycaster for interactable hit-testing */
	static raycaster = new THREE.Raycaster();
	/** Point size used for the proxy point cloud */
	static pointSize = 0.2;
	/** Raycaster threshold for points intersections */
	static pointThreshold = 1;
	/** Line of sight z offset for the point cloud */
	static pointLOSOffset = 1;

	/**
	 * Performs a ray test against interactable objects using a point cloud proxy.
	 */
	public static onMouseHitInteractive(): ModuleObject | undefined {
		
		const objects = GameState.ModuleObjectManager.playerHoverableObjects;
		const objCount = objects.length;
		
		const points: number[] = [];
		const sizes: number[] = [];

		const losZ = CursorManager.pointLOSOffset;
		
		for(let i = 0; i < objCount; i++){
			const obj = objects[i];
			points.push(obj.position.x, obj.position.y, obj.position.z + losZ);
			sizes.push(CursorManager.pointSize);
		}

		if(objCount != CursorManager.pointGeomerty.attributes.size.count){
			CursorManager.pointGeomerty.attributes.position = new THREE.Float32BufferAttribute(points, 3);
			CursorManager.pointGeomerty.attributes.size = new THREE.Float32BufferAttribute(sizes, 1);
		}else{
			const positionAttribute = CursorManager.pointGeomerty.attributes.position as THREE.BufferAttribute;
			const sizeAttribute = CursorManager.pointGeomerty.attributes.size as THREE.BufferAttribute;
			for(let i = 0; i < objCount; i++){
				positionAttribute.setX(i*3, objects[i].position.x);
				positionAttribute.setY(i*3, objects[i].position.y);
				positionAttribute.setZ(i*3, objects[i].position.z + losZ);
				sizeAttribute.setX(i, CursorManager.pointSize);
			}
		}

		CursorManager.pointGeomerty.computeBoundingBox();
		CursorManager.pointGeomerty.computeBoundingSphere();
		
		const farCache = CursorManager.raycaster.far;
		const pThresholdCache = CursorManager.raycaster.params.Points.threshold;
		CursorManager.raycaster.far = GameState.maxSelectableDistance;
		CursorManager.raycaster.params.Points.threshold = CursorManager.pointThreshold;
		CursorManager.raycaster.setFromCamera( Mouse.position, GameState.currentCamera );
		const intersectsT = CursorManager.raycaster.intersectObject( CursorManager.testPoints, false );
		const intersect = intersectsT[0];
		CursorManager.raycaster.params.Points.threshold = pThresholdCache;
		CursorManager.raycaster.far = farCache;
		if(intersect && intersect.object == CursorManager.testPoints){
			return objects[intersect.index];
		}
		return undefined;
	}

}
