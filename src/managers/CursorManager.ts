import * as THREE from "three";
import { TextureLoader } from "../loaders";
import { Mouse } from "../controls/Mouse";
import type { ModuleObject } from "../module";
import { ApplicationProfile } from "../KotOR";

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

  static init( onLoad: Function ){

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
    if(ApplicationProfile.GameKey == 'TSL'){
      TextureLoader.enQueue('gui_mp_killU', CursorManager.attack);
      TextureLoader.enQueue('gui_mp_killD', CursorManager.attackD);
    }else{
      TextureLoader.enQueue('gui_mp_attackU', CursorManager.attack);
      TextureLoader.enQueue('gui_mp_attackD', CursorManager.attackD);
    }
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

    TextureLoader.LoadQueue(() => {
      CursorManager.reticleF.depthTest = false;
      CursorManager.reticleF2.depthTest = false;
      CursorManager.reticleH.depthTest = false;
      CursorManager.reticleH2.depthTest = false;
      if(typeof onLoad === 'function')
        onLoad();
    });

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

  static setReticle(reticle = 'reticleF'){
    if(CursorManager.reticle.material != (CursorManager as any)[reticle])
      CursorManager.reticle.material = (CursorManager as any)[reticle];
  }

  static setReticle2(reticle = 'reticleF'){
    if(CursorManager.reticle2.material != (CursorManager as any)[reticle])
      CursorManager.reticle2.material = (CursorManager as any)[reticle];
  }

}
