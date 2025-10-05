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
 * CursorManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CursorManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CursorManager {
  static MenuManager: typeof MenuManager;
  
  static default: THREE.SpriteMaterial;
  static defaultD: THREE.SpriteMaterial;
  static select: THREE.SpriteMaterial;
  static selectD: THREE.SpriteMaterial;
  static bash: THREE.SpriteMaterial;
  static bashD: THREE.SpriteMaterial;
  static door: THREE.SpriteMaterial;
  static doorD: THREE.SpriteMaterial;
  static use: THREE.SpriteMaterial;
  static useD: THREE.SpriteMaterial;
  static talk: THREE.SpriteMaterial;
  static talkD: THREE.SpriteMaterial;
  static trap: THREE.SpriteMaterial;
  static trapD: THREE.SpriteMaterial;
  static attack: THREE.SpriteMaterial;
  static attackD: THREE.SpriteMaterial;
  static reticleF: THREE.SpriteMaterial;
  static reticleF2: THREE.SpriteMaterial;
  static reticleH: THREE.SpriteMaterial;
  static reticleH2: THREE.SpriteMaterial;
  static arrowF: THREE.SpriteMaterial;
  static arrowH: THREE.SpriteMaterial;

  static cursor: THREE.Sprite;
  static reticle: THREE.Sprite;
  static reticle2: THREE.Sprite;
  static arrow: THREE.Sprite;

  static selected: THREE.Object3D;
  static selectedObject: ModuleObject;
  static hovered: THREE.Object3D;
  static hoveredObject: ModuleObject;

  static visibleObjects: ModuleObject[];

  static pointGeomerty = new THREE.BufferGeometry();
  static pointMaterial = new THREE.PointsMaterial({
    color: 0xff0000,
    sizeAttenuation: false,
    fog: false,
    visible: false
  });

  static testPoints: THREE.Points;

  static sphereGeometry = new THREE.SphereGeometry( 1, 16, 8 ); 
  static sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } ); 
  static sphere: THREE.Mesh;

  static selectableObjects: ModuleObject[] = [];


  static updateSelectable( objects: ModuleObject[] = [] ){



  }

  static async init(){

    CursorManager.default = new THREE.SpriteMaterial();
    CursorManager.defaultD = new THREE.SpriteMaterial();
    CursorManager.select = new THREE.SpriteMaterial();
    CursorManager.selectD = new THREE.SpriteMaterial();
    CursorManager.bash = new THREE.SpriteMaterial();
    CursorManager.bashD = new THREE.SpriteMaterial();
    CursorManager.door = new THREE.SpriteMaterial();
    CursorManager.doorD = new THREE.SpriteMaterial();
    CursorManager.use = new THREE.SpriteMaterial();
    CursorManager.useD = new THREE.SpriteMaterial();
    CursorManager.talk = new THREE.SpriteMaterial();
    CursorManager.talkD = new THREE.SpriteMaterial();
    CursorManager.trap = new THREE.SpriteMaterial();
    CursorManager.trapD = new THREE.SpriteMaterial();
    CursorManager.attack = new THREE.SpriteMaterial();
    CursorManager.attackD = new THREE.SpriteMaterial();

    CursorManager.reticleF = new THREE.SpriteMaterial();
    CursorManager.reticleF2 = new THREE.SpriteMaterial();

    CursorManager.reticleH = new THREE.SpriteMaterial();
    CursorManager.reticleH2 = new THREE.SpriteMaterial();

    CursorManager.arrowF = new THREE.SpriteMaterial();
    CursorManager.arrowH = new THREE.SpriteMaterial();


    CursorManager.cursor = new THREE.Sprite( CursorManager.default );
    CursorManager.cursor.scale.set( 32, 32, 1.0 );
    CursorManager.cursor.position.z = 1;

    TextureLoader.enQueue('gui_mp_defaultU', CursorManager.default);
    TextureLoader.enQueue('gui_mp_defaultD', CursorManager.defaultD);
    TextureLoader.enQueue('gui_mp_doorU', CursorManager.door);
    TextureLoader.enQueue('gui_mp_doorD', CursorManager.doorD);
    TextureLoader.enQueue('gui_mp_talkU', CursorManager.talk);
    TextureLoader.enQueue('gui_mp_talkD', CursorManager.talkD);
    TextureLoader.enQueue('gui_mp_useU', CursorManager.use);
    TextureLoader.enQueue('gui_mp_useD', CursorManager.useD);
    if(ApplicationProfile.GameKey == GameEngineType.TSL){
      TextureLoader.enQueue('gui_mp_killU', CursorManager.attack);
      TextureLoader.enQueue('gui_mp_killD', CursorManager.attackD);
    }else{
      TextureLoader.enQueue('gui_mp_attackU', CursorManager.attack);
      TextureLoader.enQueue('gui_mp_attackD', CursorManager.attackD);
    }
    TextureLoader.enQueue('gui_mp_dismineU', CursorManager.trap);
    TextureLoader.enQueue('gui_mp_dismineD', CursorManager.trapD);
    TextureLoader.enQueue('gui_mp_selectU', CursorManager.select);
    TextureLoader.enQueue('gui_mp_selectD', CursorManager.selectD);

    CursorManager.setCursor('default');

    CursorManager.reticle = new THREE.Sprite( CursorManager.reticleF );
    CursorManager.reticle2 = new THREE.Sprite( CursorManager.reticleF2 );
    CursorManager.arrow = new THREE.Sprite( CursorManager.arrowF );
    
    CursorManager.reticle.scale.set( 0.5, 0.5, 0.5 );
    CursorManager.reticle.name = 'reticle';
    CursorManager.reticle.renderOrder = 1;
    CursorManager.reticle2.scale.set( 0.5, 0.5, 0.5 );
    CursorManager.reticle2.name = 'reticle2';
    CursorManager.reticle2.renderOrder = 1;
    CursorManager.arrow.scale.set( 32.0, 32.0, 1.0 );
    CursorManager.arrow.name = 'arrow';
    TextureLoader.enQueue('friendlyreticle', CursorManager.reticleF);
    TextureLoader.enQueue('friendlyreticle2', CursorManager.reticleF2);
    TextureLoader.enQueue('hostilereticle', CursorManager.reticleH);
    TextureLoader.enQueue('hostilereticle2', CursorManager.reticleH2);

    TextureLoader.enQueue('friendlyarrow', CursorManager.arrowF);
    TextureLoader.enQueue('hostilearrow', CursorManager.arrowH);

    CursorManager.pointGeomerty.attributes.position = new THREE.Float32BufferAttribute([], 3);
    CursorManager.pointGeomerty.attributes.size = new THREE.Float32BufferAttribute([], 1);
    CursorManager.testPoints = new THREE.Points(CursorManager.pointGeomerty, CursorManager.pointMaterial);
    CursorManager.testPoints.frustumCulled = false;

    CursorManager.sphere = new THREE.Mesh( CursorManager.sphereGeometry, CursorManager.sphereMaterial );

    await TextureLoader.LoadQueue();

    CursorManager.reticleF.depthTest = false;
    CursorManager.reticleF2.depthTest = false;
    CursorManager.reticleH.depthTest = false;
    CursorManager.reticleH2.depthTest = false;
  }


  static setCursor(cursor = 'default'){

    if(Mouse.MouseDown){
      cursor+='D';
    }

    CursorManager.cursor.material = (CursorManager as any)[cursor];

    /*try{
      cursor.visible = true;
      CursorManager.reticle.visible = true;
    }catch(e){
      CursorManager.default.visible = true;
    }*/
    
  }

  static notifyObjectDestroyed(object: ModuleObject){
    if(CursorManager.selectedObject == object){
      CursorManager.selectedObject = undefined;
    }
    if(CursorManager.hoveredObject == object){
      CursorManager.hoveredObject = undefined;
    }
    const idx = CursorManager.selectableObjects.indexOf(object);
    if(idx >= 0){
      CursorManager.selectableObjects.splice(idx, 1);
    }
  }

  static setReticle(reticle = 'reticleF'){
    if(CursorManager.reticle.material != (CursorManager as any)[reticle])
      CursorManager.reticle.material = (CursorManager as any)[reticle];
  }

  static setReticle2(reticle = 'reticleF'){
    if(CursorManager.reticle2.material != (CursorManager as any)[reticle])
      CursorManager.reticle2.material = (CursorManager as any)[reticle];
  }

  public static setReticleSelectedObject( object: ModuleObject ){
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

    CursorManager.arrow.visible = false;
    if(CursorManager.selectedObject){
      if(CursorManager.selectedObject.position.distanceTo(GameState.getCurrentPlayer().position) > GameState.maxSelectableDistance){
        CursorManager.selectedObject = undefined;
        CursorManager.selected = undefined;
      }

      if(CursorManager.selectedObject && !CursorManager.selectedObject.isUseable()){
        CursorManager.selectedObject = undefined;
        CursorManager.selected = undefined;
      }
    }

    if(CursorManager.hoveredObject){
      if(CursorManager.hoveredObject.position.distanceTo(GameState.getCurrentPlayer().position) > GameState.maxSelectableDistance){
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
            CursorManager.setReticleSelectedObject(closest);
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

  static raycaster = new THREE.Raycaster();
  static pointSize = 0.2;
  static pointThreshold = 1;

  public static onMouseHitInteractive(){
    
    const objects = CursorManager.selectableObjects;
    const objCount = objects.length;

    const points: number[] = [];
    const sizes: number[] = [];
    let obj;
    let targetPosition = new THREE.Vector3();
    const losZ = 1;
    
    for(let i = 0; i < objCount; i++){
      obj = objects[i];

      targetPosition.copy(obj.position);
      targetPosition.z += losZ;
      if(obj.highlightHeight){
        // targetPosition.z += obj.highlightHeight;
      }

      points.push(...targetPosition.toArray());
      sizes.push(CursorManager.pointSize);
    }

    CursorManager.pointGeomerty.attributes.position = new THREE.Float32BufferAttribute(points, 3);
    CursorManager.pointGeomerty.attributes.size = new THREE.Float32BufferAttribute(sizes, 1);
    CursorManager.pointGeomerty.computeBoundingBox();
    CursorManager.pointGeomerty.computeBoundingSphere();

    const occluders = [
      CursorManager.testPoints,
      GameState.module.area.roomWalkmeshes.map( (r) => r.mesh),
    ].flat();

    const farCache = CursorManager.raycaster.far;
    const pThresholdCache = CursorManager.raycaster.params.Points.threshold;
    CursorManager.raycaster.far = GameState.maxSelectableDistance;
    CursorManager.raycaster.params.Points.threshold = CursorManager.pointThreshold;
    CursorManager.raycaster.setFromCamera( Mouse.position, GameState.currentCamera );
    const intersectsT = CursorManager.raycaster.intersectObjects( occluders, false );
    if(intersectsT[0] && intersectsT[0].object?.uuid == CursorManager.testPoints.uuid){
      // console.log('intersects', intersectsT[0], objects[intersectsT[0]?.index], intersectsT);
      return objects[intersectsT[0].index];
    }
    CursorManager.raycaster.params.Points.threshold = pThresholdCache;
    CursorManager.raycaster.far = farCache;
    return;
  }

}
