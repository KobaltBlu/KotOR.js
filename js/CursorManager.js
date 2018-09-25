/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The CursorManager class.
 */

class CursorManager {

  static init( onLoad = null ){

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


    CursorManager.cursor = new THREE.Sprite( CursorManager.default );
    CursorManager.cursor.scale.set( 32, 32, 1.0 );
    CursorManager.cursor.position.z = 1;
    Game.scene_cursor_holder.add( CursorManager.cursor );

    TextureLoader.enQueue('gui_mp_defaultU', CursorManager.default);
    TextureLoader.enQueue('gui_mp_defaultD', CursorManager.defaultD);
    TextureLoader.enQueue('gui_mp_doorU', CursorManager.door);
    TextureLoader.enQueue('gui_mp_doorD', CursorManager.doorD);
    TextureLoader.enQueue('gui_mp_talkU', CursorManager.talk);
    TextureLoader.enQueue('gui_mp_talkD', CursorManager.talkD);
    TextureLoader.enQueue('gui_mp_useU', CursorManager.use);
    TextureLoader.enQueue('gui_mp_useD', CursorManager.useD);
    if(GameKey == 'TSL'){
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
    
    CursorManager.reticle.scale.set( 1, 1, 1 );
    CursorManager.reticle.name = 'reticle';
    CursorManager.reticle2.scale.set( 1, 1, 1 );
    CursorManager.reticle2.name = 'reticle2';
    TextureLoader.enQueue('friendlyreticle', CursorManager.reticleF);
    TextureLoader.enQueue('friendlyreticle2', CursorManager.reticleF2);
    TextureLoader.enQueue('hostilereticle', CursorManager.reticleH);
    TextureLoader.enQueue('hostilereticle2', CursorManager.reticleH2);
    Game.scene.add( CursorManager.reticle );
    Game.scene.add( CursorManager.reticle2 );

    TextureLoader.LoadQueue(() => {
      CursorManager.reticleF.depthTest = false;
      CursorManager.reticleF2.depthTest = false;
      CursorManager.reticleH.depthTest = false;
      CursorManager.reticleH2.depthTest = false;
      if(typeof onLoad === 'function')
        onLoad();
    }, (texName) => {
      
    });

  }

  static setCursor(cursor = 'default'){

    if(Mouse.MouseDown){
      cursor+='D';
    }

    CursorManager.cursor.material = CursorManager[cursor];

    /*try{
      cursor.visible = true;
      CursorManager.reticle.visible = true;
    }catch(e){
      CursorManager.default.visible = true;
    }*/
    
  }

  static setReticle(reticle = 'reticleF'){
    if(CursorManager.reticle.material != CursorManager[reticle])
      CursorManager.reticle.material = CursorManager[reticle];
  }

  static setReticle2(reticle = 'reticleF'){
    if(CursorManager.reticle2.material != CursorManager[reticle])
      CursorManager.reticle2.material = CursorManager[reticle];
  }

}

module.exports = CursorManager;