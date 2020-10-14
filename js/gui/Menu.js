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
    this.scale = 1;
    this.background = null;
    this.backgroundSprite = new THREE.Object3D();

    this.childMenu = undefined; //This is for MenuTop

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

        //This auto assigns references for the controls to the menu object.
        //It is no longer required to use this.getControlByName('CONTROL_NAME') when initializing a menu
        //You can just use this.CONTROL_NAME 
        this.AssignChildControlsToMenu(this.tGuiPanel);

        TextureLoader.LoadQueue(() => {
          if(typeof args.onLoad === 'function')
            args.onLoad();
        }, (texName) => {
          
        });

      });

    });
  }

  AssignChildControlsToMenu(object = undefined){
    if(object instanceof GUIControl){
      for(let i = 0, len = object.children.length; i < len; i++){
        let ctrl = object.children[i];
        this[ctrl.name] = ctrl;
        this.AssignChildControlsToMenu(ctrl);
      }
    }
  }

  LoadBackground( onLoad = null ){
    if(this.background){
      TextureLoader.tpcLoader.fetch(this.background, (texture) => {
        //Game.scene_gui.background = texture;

        /*this.backgroundMaterial = new THREE.SpriteMaterial( { map: texture, color: 0xFFFFFF } );
        this.backgroundSprite = new THREE.Sprite( this.backgroundMaterial );
        this.backgroundSprite.scale.set( 1600, 1200, 1.0 );
        this.backgroundSprite.position.z = -1;*/

        let geometry = new THREE.PlaneGeometry( 1600, 1200, 1 );
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
    TextureLoader.Load(resRef, (texture) => {
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

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.Hide();
  }

  Show(){
    this.Hide();
    this.bVisible = true;
    Game.scene_gui.add(this.tGuiPanel.getControl());

    //Handle the child menu if it is set
    if(this.childMenu instanceof GameMenu)
      this.childMenu.Show();
  }

  Close(){
    MenuManager.Remove(this);
    this.Hide();
  }

  Open(){
    MenuManager.Add(this);
    this.Show();
  }

  IsVisible(){
    return this.bVisible;
  }

  Update(delta = 0){
    //Only update if the Menu is visible
    if(!this.bVisible)
      return;

    if(this.tGuiPanel && this.tGuiPanel.children){
      let len = this.tGuiPanel.children.length;
      for(let i = 0; i < len; i++){
        this.tGuiPanel.children[i].update(delta);
      }
    }
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

  Scale(scale = 1.0){

    this.scale = scale;
    this.tGuiPanel.widget.scale.set(this.scale, this.scale, 1.0);

    for(let i = 0; i < this.tGuiPanel.children.length; i++){
      if(this.tGuiPanel.children[i] instanceof GUIControl)
        this.tGuiPanel.children[i].updateScale();
    }

  }

  Resize(){
    //STUB
  }


}

module.exports = GameMenu;