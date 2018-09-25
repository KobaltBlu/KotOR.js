/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The base GameMenu class.
 */

class GameMenu {

  constructor(args = {}){
    this.args = $.extend({
      onLoad: null
    }, args);

    this.bVisible = false;

    this.background = null;
    this.backgroundSprite = new THREE.Object3D();

    this.activeWidget = [];//undefined; //Used for hoverstate tracking

    //Callbacks
    this.onLoad = this.args.onLoad;
  }

  LoadMenu(args={}){
    args = $.extend({
      name: '',
      scale: false,
      onLoad: null
    }, args);
    this.tGuiPanel = null;

    //mainmenu16x12
    this.LoadBackground( () => {
      
      ResourceLoader.loadResource(ResourceTypes['gui'], args.name, (guiBuffer) => {
        
        this.menuGFF = new GFFObject(guiBuffer);
        
        this.tGuiPanel = new GUIControl(this, this.menuGFF.RootNode, undefined, args.scale);
        this.tGuiPanel.allowClick = false;
        
        let extent = this.tGuiPanel.extent;
        this.width = extent.width;
        this.height = extent.height;

        let panelControl = this.tGuiPanel.createControl();

        this.tGuiPanel.widget.add(this.backgroundSprite);
        
        panelControl.position.x = 0;//tGuiPanel.extent.left - ( ($(window).innerWidth() - tGuiPanel.extent.width) / 2 );
        panelControl.position.y = 0;//-tGuiPanel.extent.top + ( ($(window).innerHeight() - tGuiPanel.extent.height) / 2 );

        TextureLoader.LoadQueue(() => {
          if(typeof args.onLoad === 'function')
            args.onLoad();
        }, (texName) => {
          
        });

      });

    });
  }

  LoadBackground( onLoad = null ){
    if(this.background){
      TextureLoader.tpcLoader.fetch(this.background, (texture) => {
        //Game.scene_gui.background = texture;

        /*this.backgroundMaterial = new THREE.SpriteMaterial( { map: texture, color: 0xFFFFFF } );
        this.backgroundSprite = new THREE.Sprite( this.backgroundMaterial );
        this.backgroundSprite.scale.set( 1600, 1200, 1.0 );
        this.backgroundSprite.position.z = -1;*/

        var geometry = new THREE.PlaneGeometry( 1600, 1200, 1 );
        this.backgroundMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture, side: THREE.DoubleSide} );
        this.backgroundSprite = new THREE.Mesh( geometry, this.backgroundMaterial );
        this.backgroundSprite.position.z = -5;
        this.backgroundSprite.renderOrder = -5;

        if(typeof onLoad === 'function')
          onLoad();


      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  LoadTexture( resRef = null, onLoad = null ){

    TextureLoader.tpcLoader.fetch(resRef, (texture) => {

      if(typeof onLoad === 'function')
        onLoad(texture);

    });

  }

  getControlByName(name){
    try{
      return this.tGuiPanel.getControl().getObjectByName(name).control;
    }catch(e){
      console.error('getControlByName', 'Control not found', name);
    }
  }

  Hide(){
    this.bVisible = false;
    Game.scene_gui.remove(this.tGuiPanel.getControl());
  }

  Show(){
    this.Hide();
    this.bVisible = true;
    Game.scene_gui.add(this.tGuiPanel.getControl());
  }

  IsVisible(){
    return this.bVisible;
  }

  Update(delta = 0){
    
  }

  RecalculatePosition(){
    try{
      this.tGuiPanel.recalculate();
    }catch(e){}
  }

  SetWidgetHoverActive(widget = undefined, bActive = false){

    if(!(widget instanceof GUIControl))
      return false;

    let idx = this.activeWidget.indexOf(widget);

    if(bActive){
      if(idx == -1){
        this.activeWidget.push(widget);
        if(widget instanceof GUIControl){
          widget.onHoverIn();
        }
      }
    }else{
      if(idx > -1){
        if(widget instanceof GUIControl){
          widget.onHoverOut();
        }
        this.activeWidget.splice(idx, 1);
      }
    }

  }

  GetActiveControls(){
    let controls = [];
    if(this.tGuiPanel){
      controls = this.tGuiPanel.getActiveControls();
    }
    return controls;
  }


}

module.exports = GameMenu;