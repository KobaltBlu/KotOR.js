import * as THREE from "three";
import { TextureLoader } from "../loaders";
import { Mouse } from "../controls/Mouse";
import type { ModuleObject } from "../module";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { EngineMode, GameEngineType } from "../enums/engine";
import type { MenuManager } from "./MenuManager";
import { GameState } from "../GameState";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { BitWise } from "../utility/BitWise";
import { GUIControlTypeMask } from "../enums/gui/GUIControlTypeMask";
import { OdysseyObject3D } from "../three/odyssey/OdysseyObject3D";

/**
 * Manages the in-game cursor, reticles, and selection/hover logic.
 *
 * Responsibilities:
 * - Loads and manages cursor/reticle sprite materials
 * - Updates cursor appearance based on UI hover, object hover, and selection
 * - Performs lightweight ray tests against point proxies to find hovered objects
 * - Exposes helpers to sync reticle sprites with world positions
 *
 * Performance notes:
 * - Uses a pooled `THREE.Points` with dynamic attributes to raycast against interactables
 * - Avoids unnecessary material swaps; reticle setters guard redundant assignments
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
	
	/**
	 * Initializes cursor/reticle materials and sprites, and loads textures.
	 *
	 * This sets up sprite materials, enqueues GUI textures via `TextureLoader`,
	 * creates the cursor and reticle sprites, and finalizes material flags for
	 * proper rendering order and depth behavior.
	 *
	 * @async
	 * @returns Promise<void> Resolves when textures are loaded and materials are ready
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

		TextureLoader.enQueue('friendlyarrow', CursorManager.cursorMaterials.get('arrowF'));
		TextureLoader.enQueue('hostilearrow', CursorManager.cursorMaterials.get('arrowH'));

		CursorManager.pointGeomerty.attributes.position = new THREE.Float32BufferAttribute([], 3);
		CursorManager.pointGeomerty.attributes.size = new THREE.Float32BufferAttribute([], 1);
		CursorManager.testPoints = new THREE.Points(CursorManager.pointGeomerty, CursorManager.pointMaterial);
		CursorManager.testPoints.frustumCulled = false;

		CursorManager.sphere = new THREE.Mesh( CursorManager.sphereGeometry, CursorManager.sphereMaterial );

		await TextureLoader.LoadQueue();

		CursorManager.cursorMaterials.get('reticleF').depthTest = false;
		CursorManager.cursorMaterials.get('reticleF2').depthTest = false;
		CursorManager.cursorMaterials.get('reticleH').depthTest = false;
		CursorManager.cursorMaterials.get('reticleH2').depthTest = false;
	}

	/**
	 * Sets the current cursor sprite material by name.
	 *
	 * If the mouse is currently held down, appends "D" to the material name to
	 * select the pressed variant (e.g., `defaultD`).
	 *
	 * @param cursor Cursor material key (e.g., "default", "select", "attack")
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
	 *
	 * Clears selection/hover references and removes the object from the
	 * `selectableObjects` list if present.
	 *
	 * @param object The object that has been destroyed
	 */
	static notifyObjectDestroyed(object: ModuleObject){
		if(CursorManager.selectedObject == object){
			CursorManager.selectedObject = undefined;
		}
		if(CursorManager.hoveredObject == object){
			CursorManager.hoveredObject = undefined;
		}
		const idx = GameState.ModuleObjectManager.playerSelectableObjects.indexOf(object);
		if(idx >= 0){
			GameState.ModuleObjectManager.playerSelectableObjects.splice(idx, 1);
		}
	}

	/**
	 * Sets the primary reticle material by name (guarded to avoid redundant swaps).
	 * @param reticle Reticle key (e.g., "reticleF", "reticleH")
	 */
	static setReticle(reticle = 'reticleF'){
    const reticleMaterial = CursorManager.cursorMaterials.get(reticle);
		if(CursorManager.reticle.material != reticleMaterial)
			CursorManager.reticle.material = reticleMaterial;
	}

	/**
	 * Sets the secondary reticle material by name (guarded to avoid redundant swaps).
	 * @param reticle Reticle key (e.g., "reticleF2", "reticleH2")
	 */
	static setReticle2(reticle = 'reticleF'){
    const reticleMaterial = CursorManager.cursorMaterials.get(reticle);
		if(CursorManager.reticle2.material != reticleMaterial)
			CursorManager.reticle2.material = reticleMaterial;
	}

	/**
	 * Sets the currently selected object and positions the secondary reticle.
	 *
	 * Also chooses a friendly/hostile reticle style depending on the object type
	 * and hostility towards the current player.
	 *
	 * @param object The module object to mark as selected
	 */
	public static setReticleSelectedObject( object: ModuleObject ){
		GameState.getCurrentPlayer().lookAt(object);
		if(object){
			CursorManager.selected = object.getReticleNode();
			if(CursorManager.selected){
				CursorManager.selected.getWorldPosition(CursorManager.reticle2.position);
				CursorManager.selectedObject = object;
			}

			if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){		
				CursorManager.setReticle2('reticleF2');
			}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
				if(!object.isUseable()){
					return;
				}		
				CursorManager.setReticle2('reticleF2');
			}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
				if(object.isHostile(GameState.getCurrentPlayer())){
					CursorManager.setReticle2('reticleH2');
				}else{
					CursorManager.setReticle2('reticleF2');
				}
			}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
				if(object.isHostile(GameState.getCurrentPlayer())){
					CursorManager.setReticle2('reticleF2');
				}else{
					CursorManager.setReticle2('reticleF2');
				}
			}
		}
	}

	/**
	 * Sets the currently hovered object and positions the primary reticle.
	 *
	 * Also chooses the cursor style (e.g., select, use, attack, talk) depending
	 * on the hovered object type and context.
	 *
	 * @param object The module object currently under the cursor
	 */
	public static setReticleHoveredObject( object: ModuleObject ){
		if(!object){ return; }

		let canChangeCursor = (CursorManager.hoveredObject == CursorManager.selectedObject);

		CursorManager.hovered = object.getReticleNode();
		if(CursorManager.hovered){
			CursorManager.hovered.getWorldPosition(CursorManager.reticle.position);
			CursorManager.hoveredObject = object;
		}

		if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleDoor)){
			if(canChangeCursor)
				CursorManager.setCursor('door');
			else
				CursorManager.setCursor('select');

				CursorManager.setReticle('reticleF');
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModulePlaceable)){
			if(!object.isUseable()){
				return;
			}
			if(canChangeCursor)
				CursorManager.setCursor('use');
			else
				CursorManager.setCursor('select');

				CursorManager.setReticle('reticleF');
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleTrigger)){
			if(!object.isUseable()){
				return;
			}
			if(canChangeCursor)
				CursorManager.setCursor('trap');
			else
				CursorManager.setCursor('select');

			CursorManager.setReticle('reticleF');
		}else if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){

			if(object.isHostile(GameState.getCurrentPlayer())){
				if(!object.isDead()){
					if(canChangeCursor)
						CursorManager.setCursor('attack');
					else
						CursorManager.setCursor('select');

					CursorManager.setReticle('reticleH');
				}else{
					if(canChangeCursor)
						CursorManager.setCursor('use');
					else
						CursorManager.setCursor('select');

					CursorManager.setReticle('reticleF');
				}
			}else{
				if(canChangeCursor)
					CursorManager.setCursor('talk');
				else
					CursorManager.setCursor('select');

				CursorManager.setReticle('reticleF');
			}

		}
	}

	/**
	 * Per-frame update for cursor/reticles based on UI and world state.
	 *
	 * Responsibilities:
	 * - Positions the cursor sprite to match viewport mouse position
	 * - Computes UI hover state and switches cursor if hovering clickable widgets
	 * - Maintains hovered/selected object references and reticle visibility
	 * - Performs ray tests against interactables when appropriate
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
			}

			if(CursorManager.selectedObject && !CursorManager.selectedObject.isUseable()){
				CursorManager.selectedObject = undefined;
				CursorManager.selected = undefined;
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
					// console.log('moduleObject', moduleObject);
					if(moduleObject){
						CursorManager.setReticleHoveredObject(moduleObject);
					}
				}else{
					if(!CursorManager.selectedObject){
						let closest = GameState.ModuleObjectManager.GetNearestInteractableObject();
						// CursorManager.setReticleSelectedObject(closest);
						CursorManager.setReticleHoveredObject(closest);
					}
				}
			}
		}

		if(GameState.Mode == EngineMode.INGAME && CursorManager.hovered instanceof OdysseyObject3D){
			CursorManager.hovered.getWorldPosition(CursorManager.reticle.position);
			CursorManager.reticle.visible = true;
		}else{
			CursorManager.reticle.visible = false;
		}

		if(GameState.Mode == EngineMode.INGAME && CursorManager.selected instanceof OdysseyObject3D && !CursorManager.MenuManager.MenuContainer.bVisible){
			CursorManager.selected.getWorldPosition(CursorManager.reticle2.position);
			CursorManager.reticle2.visible = true;
			if(BitWise.InstanceOfObject(CursorManager.selectedObject, ModuleObjectType.ModuleDoor)){		
				CursorManager.setReticle2('reticleF2');
			}else if(BitWise.InstanceOfObject(CursorManager.selectedObject, ModuleObjectType.ModulePlaceable)){
				if(!CursorManager.selectedObject.isUseable()){
					return;
				}		
				CursorManager.setReticle2('reticleF2');
			}else if(BitWise.InstanceOfObject(CursorManager.selectedObject, ModuleObjectType.ModuleTrigger)){
				if(!CursorManager.selectedObject.isUseable()){
					return;
				}		
				CursorManager.setReticle2('reticleF2');
			}else if(BitWise.InstanceOfObject(CursorManager.selectedObject, ModuleObjectType.ModuleCreature)){
				if(CursorManager.selectedObject.isHostile(GameState.getCurrentPlayer())){
					CursorManager.setReticle2('reticleH2');
				}else{
					CursorManager.setReticle2('reticleF2');
				}
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
	 *
	 * Builds a `THREE.Points` geometry positioned above each interactable target
	 * and raycasts against it to determine the closest hovered object while
	 * respecting `GameState.maxSelectableDistance`.
	 *
	 * @returns The hovered `ModuleObject`, or `undefined` if none hit
	 */
	public static onMouseHitInteractive(): ModuleObject | undefined {
		
		const objects = GameState.ModuleObjectManager.playerSelectableObjects;
		const objCount = objects.length;
		
		const points: number[] = [];
		const sizes: number[] = [];

		// Line of sight offset for the point cloud
		const losZ = CursorManager.pointLOSOffset;
		
		for(let i = 0; i < objCount; i++){
			const obj = objects[i];
			points.push(obj.position.x, obj.position.y, obj.position.z + losZ);
			sizes.push(CursorManager.pointSize);
		}

		// resize the point cloud if the number of objects has changed
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
