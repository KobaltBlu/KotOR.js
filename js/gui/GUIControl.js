/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIControl class.
 */

class GUIControl {
  
  constructor(menu = null, control = null, parent = null, scale = false){

    this.menu = menu;
    this.control = control;
    this.parent = parent;
    this.scale = scale;
    this.iniProperty = undefined;
    this.autoCalculatePosition = true;

    this.anchor = 'none';
    this.offset = new THREE.Vector2();

    this.widget = new THREE.Group();
    this.widget.control = this;
    this.children = []; 
    this.zOffset = 1;
    this.zIndex = 0;

    this.worldPosition = new THREE.Vector3();
    this.box = new THREE.Box2(
      new THREE.Vector2(
        0,
        0
      ),
      new THREE.Vector2(
        0,
        0
      )
    );

    this.eventListeners = {
      'click': [],
      'mouseIn': [],
      'mouseOut': [],
      'mouseDown': [],
      'mouseMove': [],
      'mouseUp': [],
      'hover': []
    };

    this.defaultColor = {
      x: 0.0,
      y: 0.658824,
      z: 0.980392
    };

    if(GameKey == 'TSL'){
      this.defaultColor = {
        /*x: 0.10196078568697,
        y: 0.69803923368454,
        z: 0.549019634723663*/
        x: 1,
        y: 1,
        z: 1
      };
    }


    this.allowClick = true;
    this.onClick = null;
    this.onMouseMove = null;
    this.onMouseDown = null;
    this.onMouseUp = null;
    this.onMouseIn = null;
    this.onMouseOut = null;
    this.onDrag = null;
    this.onDragEnd = null;
    this.onHover = null;

    this.onKeyUp = null;
    this.onKeyDown = null;

    this.pulsing = 0;
    this.pulse = 1;
    this.opacity = 1;
    this.hover = false;

    this.disableBorder = false;

    this.widget.border = new THREE.Group();
    this.widget.highlight = new THREE.Group();
    this.widget.fill = new THREE.Group();
    this.widget.text = new THREE.Group();

    this.widget.add(this.widget.border);
    this.widget.add(this.widget.highlight);
    this.widget.add(this.widget.fill);
    this.widget.add(this.widget.text);

    this.initObjects();
    this.initInputListeners();
    this.initProperties();
    this.initTextures();

  }

  initObjects(){
    //--------//
    // Extent
    //--------//

    this.extent = {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    };

    //--------//
    // Border
    //--------//

    this.border = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: '',
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.border.geometry = new THREE.BufferGeometry();
    this.border.edge_material = new THREE.MeshBasicMaterial( {color: this.border.color, side: THREE.FrontSide} );
    this.border.corner_material = new THREE.MeshBasicMaterial( {color: this.border.color, side: THREE.FrontSide} );
    this.border.mesh = new THREE.Mesh( this.border.geometry, [this.border.edge_material, this.border.corner_material] );
    this.widget.border.add(this.border.mesh);

    //-----------//
    // Highlight
    //-----------//

    this.highlight = {
      color: new THREE.Color(1, 1, 0),
      corner: '',
      edge: '',
      fill: '',
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlight.geometry = new THREE.BufferGeometry();
    this.highlight.edge_material = new THREE.MeshBasicMaterial( {color: this.highlight.color, side: THREE.FrontSide} );
    this.highlight.corner_material = new THREE.MeshBasicMaterial( {color: this.highlight.color, side: THREE.FrontSide} );
    this.highlight.mesh = new THREE.Mesh( this.highlight.geometry, [this.highlight.edge_material, this.highlight.corner_material] );
    this.widget.highlight.add(this.highlight.mesh);

    //------//
    // Text
    //------//

    this.text = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      font: '', //fnt_d16x16b
      strref: -1,
      text: '',
      alignment: 9, //9 //18 //17
      pulsing: 0
    };

    this.text.geometry = new THREE.BufferGeometry();
    this.text.geometry.index = new THREE.BufferAttribute( new Uint16Array(), 1 ).setUsage( THREE.StaticDrawUsage );

    let posAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    let uvAttribute = new THREE.BufferAttribute( new Float32Array(), 2 ).setUsage( THREE.StaticDrawUsage );
    this.text.geometry.setAttribute( 'position', posAttribute );
    this.text.geometry.setAttribute( 'uv', uvAttribute );

    this.text.geometry.index.needsUpdate = true;
    this.text.geometry.attributes.position.needsUpdate = true;
    this.text.geometry.attributes.uv.needsUpdate = true;

    this.text.material = new THREE.MeshBasicMaterial({color: this.text.color, side: THREE.DoubleSide, transparent: true});
    this.text.mesh = new THREE.Mesh( this.text.geometry, this.text.material );
    //this.widget.text.add(this.text.mesh);

    //--------//
    // MoveTo
    //--------//

    this.moveTo = {
      up: 0,
      down: 0,
      left: 0,
      right: 0
    };
  }

  initInputListeners(){
    //---------//
    //  Border
    //---------//

    this.border.mesh.isClickable = (e) => {
      return this.isClickable();
    };

    this.border.mesh.onClick = (e) => {
      this.processEventListener('click', [e]);
    };

    this.border.mesh.onMouseMove = (e) =>{
      this.processEventListener('mouseMove', [e]);
    }

    this.border.mesh.onMouseDown = (e) => {
      this.processEventListener('mouseDown', [e]);
    };

    this.border.mesh.onMouseUp = (e) => {
      this.processEventListener('mouseUp', [e]);
    };
    
    this.border.mesh.onHover = (e) => {
      this.processEventListener('hover', [e]);
    };

    this.border.mesh.getControl = () => {
      return this;
    }

    this.border.mesh.name = 'GUIBorder';
    this.border.mesh.position.z = this.zOffset;

    /*if(this.border.mesh.parent)
      this.border.mesh.parent.remove(this.border.mesh);

    this.widget.border.add(this.border.mesh);*/

    //-----------//
    // Highlight
    //-----------//

    this.highlight.mesh.isClickable = (e) => {
      return this.isClickable();
    };

    this.highlight.mesh.onClick = (e) => {
      this.processEventListener('click', [e]);
    };

    this.highlight.mesh.onMouseMove = (e) =>{
      this.processEventListener('mouseMove', [e]);
    }

    this.highlight.mesh.onMouseDown = (e) => {
      this.processEventListener('mouseDown', [e]);
    };

    this.highlight.mesh.onMouseUp = (e) => {
      this.processEventListener('mouseUp', [e]);
    };
    
    this.highlight.mesh.onHover = (e) => {
      this.processEventListener('hover', [e]);
    };

    this.highlight.mesh.getControl = () => {
      return this;
    }

    this.highlight.mesh.name = 'GUIHighlight';
    this.highlight.mesh.position.z = this.zOffset;

    /*if(this.highlight.mesh.parent)
      this.highlight.mesh.parent.remove(this.highlight.mesh);

    this.widget.highlight.add(this.highlight.mesh);*/

    //------//
    // Text
    //------//

    this.text.mesh.isClickable = (e) => {
      return this.isClickable();
    };

    this.text.mesh.onClick = (e) => {
      this.processEventListener('click', [e]);
    };

    this.text.mesh.onMouseMove = (e) =>{
      this.processEventListener('mouseMove', [e]);
    }

    this.text.mesh.onMouseDown = (e) => {
      this.processEventListener('mouseDown', [e]);
    };

    this.text.mesh.onMouseUp = (e) => {
      this.processEventListener('mouseUp', [e]);
    };
    
    this.text.mesh.onHover = (e) => {
      this.processEventListener('hover', [e]);
    };

    this.text.mesh.getControl = () => {
      return this;
    }

    this.text.mesh.name = 'GUIText';
    this.text.mesh.position.z = this.zOffset;
    this.text.mesh.renderOrder = 5;

    /*if(this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.widget.text.add(this.text.mesh);*/
  }

  initProperties(){
    if(this.control instanceof Struct){
      let control = this.control;

      this.type = ( control.HasField('CONTROLTYPE') ? control.GetFieldByLabel('CONTROLTYPE').GetValue() : -1 );
      this.widget.name = this.name = ( control.HasField('TAG') ? control.GetFieldByLabel('TAG').GetValue() : -1 );
      this.id = ( control.HasField('ID') ? control.GetFieldByLabel('ID').GetValue() : -1 );
      this.objectLocked = ( control.HasField('Obj_Locked') ? control.GetFieldByLabel('Obj_Locked').GetValue() : -1 );
      this.objectParent = ( control.HasField('Obj_Parent') ? control.GetFieldByLabel('Obj_Parent').GetValue() : -1 );
      this.objectParentId = ( control.HasField('Obj_ParentID') ? control.GetFieldByLabel('Obj_ParentID').GetValue() : -1 );
  
      this.padding = ( control.HasField('PADDING') ? control.GetFieldByLabel('PADDING').GetValue() : 0 );
  
      //Extent
      this.hasExtent = control.HasField('EXTENT');
      if(this.hasExtent){
        let extent = control.GetFieldByLabel('EXTENT').GetChildStructs()[0];
        this.extent.top = extent.GetFieldByLabel('TOP').GetValue();
        this.extent.left = extent.GetFieldByLabel('LEFT').GetValue();
        this.extent.width = extent.GetFieldByLabel('WIDTH').GetValue();
        this.extent.height = extent.GetFieldByLabel('HEIGHT').GetValue();
      }
  
      //Border
      this.hasBorder = control.HasField('BORDER');
      if(this.hasBorder){
        let border = control.GetFieldByLabel('BORDER').GetChildStructs()[0];

        if(border.HasField('COLOR')){
          let color = border.GetFieldByLabel('COLOR').GetVector();
          this.border.color.setRGB(color.x, color.y, color.z)
        }
  
        if(typeof this.border.color === 'undefined'){
          this.border.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }
  
        this.border.dimension = border.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.border.corner = border.GetFieldByLabel('CORNER').GetValue();
        this.border.edge = border.GetFieldByLabel('EDGE').GetValue();
        this.border.fill = border.GetFieldByLabel('FILL').GetValue();
        this.border.fillstyle = border.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.border.inneroffset = this.border.inneroffsety = border.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(border.HasField('INNEROFFSETY'))
          this.border.inneroffsety = border.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.border.pulsing = border.GetFieldByLabel('PULSING').GetValue() || 0;

      }
  
      //Text
      this.hasText = control.HasField('TEXT');
      if(this.hasText){
        let text = control.GetFieldByLabel('TEXT').GetChildStructs()[0];
        this.text.font = text.GetFieldByLabel('FONT').GetValue();
        this.text.strref = text.GetFieldByLabel('STRREF').GetValue();
        this.text.text = ( text.HasField('TEXT') ? text.GetFieldByLabel('TEXT').GetValue().replace(/\{.*\}/gi, '') : '' );
        this.text.alignment = text.GetFieldByLabel('ALIGNMENT').GetValue();
        this.text.pulsing = text.GetFieldByLabel('PULSING').GetValue();

        if(this.text.font == 'fnt_d16x16'){
          this.text.font = 'fnt_d16x16b';
        }

        if(text.HasField('COLOR')){
          let color = text.GetFieldByLabel('COLOR').GetVector();
          this.text.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.text.color === 'undefined'){
          this.text.color = this.defaultColor;
        }

      }
  
      //Highlight
      this.hasHighlight = control.HasField('HILIGHT');
      if(this.hasHighlight){
        let highlight = control.GetFieldByLabel('HILIGHT').GetChildStructs()[0];

        if(highlight.HasField('COLOR')){
          let color = highlight.GetFieldByLabel('COLOR').GetVector();
          this.highlight.color.setRGB(color.x, color.y, color.z);
        }
  
        if(typeof this.highlight.color === 'undefined'){
          this.highlight.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlight.dimension = highlight.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.highlight.corner = highlight.GetFieldByLabel('CORNER').GetValue() || '';
        this.highlight.edge = highlight.GetFieldByLabel('EDGE').GetValue() || '';
        this.highlight.fill = highlight.GetFieldByLabel('FILL').GetValue() || '';
        this.highlight.fillstyle = highlight.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.highlight.inneroffset = this.highlight.inneroffsety = highlight.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(highlight.HasField('INNEROFFSETY'))
          this.highlight.inneroffsety = highlight.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.highlight.pulsing = highlight.GetFieldByLabel('PULSING').GetValue() || 0;

      }
  
      //Moveto
      this.hasMoveTo = control.HasField('MOVETO');
      if(this.hasMoveTo){
        let moveTo = control.GetFieldByLabel('MOVETO').GetChildStructs()[0];
        this.moveTo.down = moveTo.GetFieldByLabel('DOWN').GetValue();
        this.moveTo.left = moveTo.GetFieldByLabel('LEFT').GetValue();
        this.moveTo.right = moveTo.GetFieldByLabel('RIGHT').GetValue();
        this.moveTo.up = moveTo.GetFieldByLabel('UP').GetValue();
      }
    }else if(typeof controll !== 'undefined'){
      //TODO
    }
  }

  initTextures(){

    if(this.border.edge != ''){
      TextureLoader.enQueue(this.border.edge, this.border.edge_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture)
          console.log('initTextures', this.border.edge, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.border.corner != ''){
      TextureLoader.enQueue(this.border.corner, this.border.corner_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture)
          console.log('initTextures', this.border.corner, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlight.edge != ''){
      TextureLoader.enQueue(this.highlight.edge, this.highlight.edge_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture)
          console.log('initTextures', this.highlight.edge, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlight.corner != ''){
      TextureLoader.enQueue(this.highlight.corner, this.highlight.corner_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture)
          console.log('initTextures', this.highlight.corner, texture);

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.text.font != ''){
      TextureLoader.enQueue(this.text.font, null, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture)
          console.log('initTextures', this.text.font, texture);

        if(texture){
          this.text.texture = texture;
          this.text.material.map = texture;
          this.text.material.needsUpdate = true;
          this.onFontTextureLoaded();
        }
      });
    }

  }

  isClickable(){
    return this.eventListeners['click'].length && this.isVisible();
  }

  isVisible(){
    return this.widget.visible;
  }

  onHoverOut(){

    this.hover = false;

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.hideHighlight();
    this.widget.fill.visible = true;

    if(this.border.edge != '' && !this.disableBorder)
      this.showBorder();

  }

  onHoverIn(){

    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    if(this.hasHighlight){
      if(this.highlight.edge != '' || this.highlight.fill != ''){
        this.showHighlight();
        this.widget.fill.visible = false;
      }
    }

    if(this.highlight.texture)
      this.hideBorder();

    if(this.isClickable()){
      Game.guiAudioEmitter.PlaySound('gui_scroll');
    }
    
  }

  onFontTextureLoaded(){
    this.buildText();
  }

  resizeControl(){

    try{
      if(this.hasBorder){
        this.buildBorder();
      }
      if(this.hasHighlight){
        this.buildHighlight();
      }
    }catch(e){
      //Must not have a border
    }

    this.resizeFill();
    if(this.hasHighlight){
      this.resizeHighlightFill();
    }

  }

  createControl(){

    if(this.widget instanceof THREE.Object3D && this.widget.parent){
      this.widget.parent.remove(this.widget);
    }
    
    //if(this.parent === undefined){
    //  this.widget.add(this.menu.backgroundSprite);
    //}

    if(this.hasBorder){
      if(this.border.edge != '' && this.border.corner != ''){
        this.buildBorder();
      }

      if(this.border.edge == '')
        this.hideBorder();

    }

    if(this.hasHighlight){
      if(this.highlight.edge != '' && this.highlight.corner != ''){
        this.buildHighlight();
      }
      this.buildHighlightFill();
      this.hideHighlight();
    }

    this.buildFill();
    
    this._onCreate();
    //Calculate the widget screen position
    this.calculatePosition();
    this.buildChildren();

    //Load any textures in the queue
    TextureLoader.LoadQueue(() => {});
    return this.widget;

  }

  buildChildren(){

    if(!(this.menu) instanceof GameMenu)
      return false;

    if(!(this.menu.tGuiPanel.control instanceof Struct))
      return false;

    if(this.menu.tGuiPanel.control.HasField('CONTROLS')){
      let children = this.menu.tGuiPanel.control.GetFieldByLabel('CONTROLS').GetChildStructs();
      
      for(let i = 0; i < children.length; i++){
        let childParent = ( children[i].HasField('Obj_Parent') ? children[i].GetFieldByLabel('Obj_Parent').GetValue() : '' );
        if(childParent == this.name){

          let type = ( children[i].HasField('CONTROLTYPE') ? children[i].GetFieldByLabel('CONTROLTYPE').GetValue() : -1 );
          let gui = null;

          switch(type){
            case 6:
              gui = new GUIButton(this.menu, children[i], this, this.scale);
            break;
            case 7:
              gui = new GUICheckBox(this.menu, children[i], this, this.scale);
            break;
            case 8:
              gui = new GUISlider(this.menu, children[i], this, this.scale);
            break;
            case 10:
              gui = new GUIProgressBar(this.menu, children[i], this, this.scale);
            break;
            case 11:
              gui = new GUIListBox(this.menu, children[i], this, this.scale);
            break;
            default: 
              gui = new GUIControl(this.menu, children[i], this, this.scale);
            break;
          }

          gui.zIndex = this.zIndex+1;

          this.children.push(gui);

          let _cWidget = gui.createControl();
          _cWidget.position.z = gui.zIndex;
          
          //this.widget.add(_cWidget);
          this.menu.tGuiPanel.widget.add(_cWidget);

        }
      }

    }
  }

  reattach(parent){
    this.parent.widget.remove(this.widget);
    this.parent = parent;
    this.parent.widget.add(this.widget);
  }

  getControl(){
    return this.widget;
  }

  hide(){
    //this.widget.border.visible = this.widget.highlight.visible = this.widget.fill.visible = this.widget.text.visible = false;
    this.widget.visible = false;
  }

  show(){
    //this.widget.border.visible = this.widget.highlight.visible = this.widget.fill.visible = this.widget.text.visible = true;
    this.updateWorldPosition();
    this.widget.visible = true;
  }

  update(delta){
    if(this.pulsing){
      if(this.border.edge_material){
        this.border.edge_material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
      }

      if(this.border.corner_material){
        this.border.corner_material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
      }

      if(this.highlight.edge_material){
        this.highlight.edge_material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
      }

      if(this.highlight.corner_material){
        this.highlight.corner_material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
      }

      if(this.text.material){
        this.text.material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
      }
  
      let fill = this.widget.fill.children[0];
      if(fill)
        fill.material.opacity = 1 - (0.5 *MenuManager.pulseOpacity);
    }else{
      this.resetPulse();
    }

    let len = this.children.length;
    for(let i = 0; i < len; i++){
      this.children[i].update(delta);
    }
  }

  resetPulse(){
    if(this.border.edge_material){
      this.border.edge_material.opacity = 1;
    }

    if(this.border.corner_material){
      this.border.corner_material.opacity = 1;
    }

    if(this.highlight.edge_material){
      this.highlight.edge_material.opacity = 1;
    }

    if(this.highlight.corner_material){
      this.highlight.corner_material.opacity = 1;
    }

    if(this.text.material){
      this.text.material.opacity = 1;
    }
    
    let fill = this.widget.fill.children[0];
    if(fill)
      fill.material.opacity = 1;
  }

  setHovering(bState){
    this.hovering = bState;



  }

  hideBorder(){
    this.widget.border.visible = false;
  }

  showBorder(){
    this.widget.border.visible = true;
  }

  hideHighlight(){
    this.widget.highlight.visible = false;
  }

  showHighlight(){
    this.widget.highlight.visible = true;
  }

  hideFill(){
    this.widget.fill.visible = false;
  }

  showFill(){
    this.widget.fill.visible = true;
  }

  setBorderColor(r = 1, g = 1, b = 1){
    this.border.edge_material.color.setRGB(r, g, b);
    this.border.corner_material.color.setRGB(r, g, b);
  }

  setHighlightColor(r = 1, g = 1, b = 1){
    this.highlight.edge_material.color.setRGB(r, g, b);
    this.highlight.corner_material.color.setRGB(r, g, b);
  }

  setTextColor(r = 1, g = 1, b = 1){
    //0.0, 0.658824, 0.980392
    this.text.material.color.setRGB(r, g, b);
  }

  /*setText(text = '', renderOrder){
    //0.0, 0.658824, 0.980392
    if(typeof this.text.geometry != 'undefined'){
      this.text.geometry.update(text);
    }
  }*/

  getFill(){
    return this.widget.fill.children[0];
  }

  getHighlightFill(){
    return this.widget.highlight.children[0];
  }

  setFillColor(r = 1, g = 1, b = 1){
    //0.0, 0.658824, 0.980392
    if(typeof this.getFill() != 'undefined'){
      this.getFill().material.color.setRGB(r, g, b);
    }
  }

  getFillTexture(){
    return this.widget.fill.children[0].material.map;
  }

  setFillTexture(map = undefined){
    this.widget.fill.children[0].material.map = map;
    this.widget.fill.children[0].material.needsUpdate = true;
    this.widget.fill.children[0].material.visible = (map != undefined);

    if(map == undefined){
      this.widget.fill.children[0].material.opacity = 0.01;
    }else{
      this.widget.fill.children[0].material.opacity = 1;
    }

  }

  getFillTextureName(){
    return this.border.fill;
  }

  setFillTextureName(name = ''){
    this.border.fill = name;
  }


  calculatePosition(){
    if(!this.autoCalculatePosition)
      return;

    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    //if(!(this.parent instanceof THREE.Scene)){
      //parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      //parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      //parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

    //}else{
    //  parentOffsetX = parentOffsetY = 0;
    //}

    if( this.parent && this.parent != this.menu.tGuiPanel && !this.scale){
      parentExtent = this.menu.tGuiPanel.extent;
      parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

      let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );
      let posY = ((this.extent.top - ( (parentExtent.height - this.extent.height) / 2 ) ));

      this.widget.position.x = this.offset.x + (posX);
      this.widget.position.y = (-posY);
      
      this.updateBounds();

      return;
    }else{
      parentOffsetX = this.menu.tGuiPanel.extent.left;
      parentOffsetY = this.menu.tGuiPanel.extent.top;
    }

    let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
    let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

    let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );
    let posY = ((-this.extent.top + ( (parentExtent.height - this.extent.height) / 2 ) ));

    this.anchorOffset = {x: posX, y: posY};

    let halfX = parentExtent.width/2;
    let quatX = 25; //parentExtent.width/4;
    let halfY = parentExtent.height/2;
    let quatY = 25; //parentExtent.height/4;

    if(this.scale && this.anchor == 'none'){
      if(this.extent.left == 0 && this.extent.top == 0){
        //Screen centered
      }else{
        if(this.extent.left < (halfX/2) && this.extent.top > halfY){
          this.anchor = 'bl';
        }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top > halfY){
          this.anchor = 'bc';
        }else if(this.extent.left > (halfX/2) && this.extent.top > halfY){
          this.anchor = 'br';
        }

        if(this.extent.left < (halfX/2) && this.extent.top < halfY){
          this.anchor = 'tl';
        }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top < halfY){
          this.anchor = 'tc'
        }else if(this.extent.left > (halfX/2) && this.extent.top < halfY){
          this.anchor = 'tr';
        }
      }
    }

    switch(this.anchor){
      case 'tl':
        this.anchorOffset.x = -((window.innerWidth) / 2) + ((this.extent.width/2)) + this.extent.left;
        this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
      break;
      case 'tc':
        if(this.extent.left < halfX){
          this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
        }else{
          this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
        }
      break;
      case 'tr':
        this.anchorOffset.x = ((window.innerWidth) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
        this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
      break;
      case 'bl':
        this.anchorOffset.x = -((window.innerWidth) / 2) + ((this.extent.width/2)) + this.extent.left;
        this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
      break;
      case 'bc':
        if(this.extent.left < (halfX)){
          this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
        }else{
          this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));  
        }
      break;
      case 'br':
        this.anchorOffset.x = ((window.innerWidth) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
        this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
      break;
      default:
        this.anchorOffset = {x: posX, y: posY};
      break;
    }

    this.widget.position.x = this.anchorOffset.x + this.offset.x;
    this.widget.position.y = this.anchorOffset.y + this.offset.y;

    this.updateBounds();

  }

  getActiveControls(){

    if(!this.widget.visible)
      return [];

    let controls = [];
    for(let i = 0; i < this.children.length; i++){
      let control = this.children[i];
      if(control.box && control.box.containsPoint(Game.mouseUI) && control.allowClick){
        controls.push(control);
      }else{
        this.menu.SetWidgetHoverActive(control, false);
      }
      controls = controls.concat( control.getActiveControls() );
    }
    
    return controls;
  }

  updateBounds(){
    let worldPosition = this.widget.getWorldPosition(new THREE.Vector3());

    this.box.min.x = (worldPosition.x) - ( (this.extent.width/2));
    this.box.min.y = (worldPosition.y) - ( (this.extent.height/2));
    this.box.max.x = (worldPosition.x) + ( (this.extent.width/2));
    this.box.max.y = (worldPosition.y) + ( (this.extent.height/2));
    
    if(this.menu.scale != 1.0){
      this.box.expandByScalar(this.menu.scale/2);
    }

  }

  updateScale(){
    this.updateBounds();
    for(let i = 0; i < this.children.length; i++){
      if(this.children[i] instanceof GUIControl)
        this.children[i].updateScale();
    }
  }

  recalculate(){
    this.calculatePosition();
    for(let i = 0; i < this.children.length; i++){
      this.children[i].recalculate();
    }
  }

  getControlExtent(){
    let renderSize = this.getRendererSize();

    let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
    let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

    let parentExtent = { width: this.menu.width, height: this.menu.height };
    //if(!(this.parent instanceof THREE.Scene)){
      //parentExtent = this.parent.control.extent;
    //}

    let left = this.extent.left - ( (parentExtent.width - this.extent.width) / 2 );
    let top = -this.extent.top + ( (parentExtent.height - this.extent.height) / 2 );

    return {
      top: top,
      left: left + this.border.dimension,
      width: this.extent.width,
      height: this.extent.height
    };

  }

  getInnerSize(){
    return {
      width: this.extent.width - this.border.dimension,// + (this.padding * 2),
      height: this.extent.height - this.border.dimension// + (this.padding * 2)
    };
  }

  getOuterSize(){
    let extent = this.getControlExtent();
    return {
      top: extent.top,
      left: extent.left,
      width: extent.width,
      height: extent.height
    };
  }

  getFillExtent(){
    let extent = this.getControlExtent();
    let inner = this.getInnerSize();
    //console.log('size', extent, inner);

    let width = inner.width - this.border.dimension;
    let height = inner.height - this.border.dimension;

    if(width < 0){
      width = 0.00001;
    }

    if(height < 0){
      height = 0.00001;
    }

    return {
      top: extent.top, 
      left: extent.left, 
      width: width,
      height: height
    };
  }

  getBorderSize(){
    if(GameKey == 'TSL'){
      return this.border.dimension || 0;
    }else{
      return this.border.dimension || 0;
    }
  }

  getHightlightSize(){
    if(GameKey == 'TSL'){
      return this.highlight.dimension || 0;
    }else{
      return this.highlight.dimension || 0;
    }
  }

  getBorderExtent(side = null){
    let extent = this.getControlExtent();
    let inner = this.getInnerSize();

    let top = 0, left = 0, width = 0, height = 0;

    switch(side){
      case 'top':
        top = -(inner.height/2); 
        left = 0; 
        width = inner.width - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'bottom':
        top = (inner.height/2); 
        left = 0; 
        width = inner.width - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'left':
        top = 0
        left = -(inner.width/2); 
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'right':
        top = 0; 
        left = (inner.width/2); 
        width = inner.height - (this.getBorderSize()) < 0 ? 0.000001 : inner.height - (this.getBorderSize());
        height = this.getBorderSize();
      break;
      case 'topLeft':
        top = ((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'topRight':
        top = (inner.height/2); 
        left = (inner.width/2); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'bottomLeft':
        top = -((inner.height/2)); 
        left = -((inner.width/2)); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
      case 'bottomRight':
        top = -((inner.height/2)); 
        left = ((inner.width / 2)); 
        width = this.getBorderSize();
        height = this.getBorderSize();
      break;
    }

    if(width < 0){
      width = 0.00001;
    }

    if(height < 0){
      height = 0.00001;
    }

    return {
      top: top, 
      left: left, 
      width: width,
      height: height
    };

  }

  getHighlightExtent(side = null){
    let extent = this.getControlExtent();
    let inner = this.getInnerSize();
    switch(side){
      case 'top':
        return {
          top: -( (inner.height/2) ), 
          left: 0, 
          width: inner.width - (this.getHightlightSize()),
          height: this.getHightlightSize()
        };
      break;
      case 'bottom':
        return {
          top: (inner.height/2), 
          left: 0, 
          width: inner.width - (this.getHightlightSize()),
          height: this.getHightlightSize()
        };
      break;
      case 'left':
        return {
          top: 0, 
          left: -(inner.width/2), 
          width: inner.height - (this.getHightlightSize()),
          height: this.getHightlightSize()
        };
      break;
      case 'right':
        return {
          top: 0, 
          left: (inner.width/2), 
          width: inner.height - (this.getHightlightSize()),
          height: this.getHightlightSize()
        };
      break;
      case 'topLeft':
        return {
          top: ((inner.height/2)), 
          left: -((inner.width/2)), 
          width: this.getHightlightSize(),
          height: this.getHightlightSize()
        };
      break;
      case 'topRight':
        return {
          top: (inner.height/2), 
          left: (inner.width/2), 
          width: this.getHightlightSize(),
          height: this.getHightlightSize()
        };
      break;
      case 'bottomLeft':
        return {
          top: -((inner.height/2)), 
          left: -((inner.width/2)), 
          width: this.getHightlightSize(),
          height: this.getHightlightSize()
        };
      break;
      case 'bottomRight':
        return {
          top: -((inner.height/2)), 
          left: ((inner.width / 2)), 
          width: this.getHightlightSize(),
          height: this.getHightlightSize()
        };
      break;
    }
  }

  buildFill(){
    let extent = this.getFillExtent();
    
    let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    let material = new THREE.MeshBasicMaterial( {color: this.border.color, side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );
    
    sprite.name = this.widget.name+' center fill';
    sprite.scale.x = extent.width || 0.000001;
    sprite.scale.y = extent.height || 0.000001;
    sprite.position.z = this.zOffset;

    this.widget.fill.add( sprite );

    if(this.border.fill != ''){
      material.transparent = true;
      TextureLoader.enQueue(this.border.fill, material, TextureLoader.Type.TEXTURE, (texture) => {
        if(texture == null){
          material.opacity = 0.01;
        }
      });
    }else{
      TextureLoader.enQueue('fx_static', material, TextureLoader.Type.TEXTURE, (texture) => {
        material.opacity = 1;
        material.alphaTest = 0.5;
        material.transparent = true;
      });
    }

    sprite.renderOrder = this.id;

    sprite.isClickable = (e) => {
      return this.isClickable();
    };

    sprite.onClick = (e) => {
      this.processEventListener('click', [e]);
    };

    sprite.onMouseMove = (e) =>{
      this.processEventListener('mouseMove', [e]);
    }

    sprite.onMouseDown = (e) => {
      this.processEventListener('mouseDown', [e]);
    };

    sprite.onMouseUp = (e) => {
      this.processEventListener('mouseUp', [e]);
    };
    
    sprite.onHover = (e) => {
      this.processEventListener('hover', [e]);
    };

    sprite.getControl = (e) => {
      return this;
    };

  }

  buildBorder(){

    let edgeGeometries = 4;
    let cornerGeometries = 4;
    let geomCount = edgeGeometries + cornerGeometries;

    let planes = [];
    let extent;

    for(let i = 0; i < geomCount; i++){
      switch(i){
        case 0: //top-border
          extent = this.getBorderExtent('top');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 1: //right-border
          extent = this.getBorderExtent('right');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 2: //bottom-border
          extent = this.getBorderExtent('bottom');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 3: //left-border
          extent = this.getBorderExtent('left');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 4: //top-left-corner
          extent = this.getBorderExtent('topLeft');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 5: //top-right-corner
          extent = this.getBorderExtent('topRight');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 6: //bottom-right-corner
          extent = this.getBorderExtent('bottomRight');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 7: //bottom-left-corner
          extent = this.getBorderExtent('bottomLeft');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
      }
    }

    if(this.border.geometry instanceof THREE.BufferGeometry)
      this.border.geometry.dispose();

    this.border.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.border.geometry.computeBoundingBox();

    //Edge Group
    this.border.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.border.geometry.addGroup(24, 24, 1);

    this.border.mesh.geometry = this.border.geometry;

    //Clean up the temporary plane geometries
    while(planes.length){
      planes.shift().dispose();
    }

  }

  buildHighlight(){

    let edgeGeometries = 4;
    let cornerGeometries = 4;
    let geomCount = edgeGeometries + cornerGeometries;

    let planes = [];
    let extent;

    for(let i = 0; i < geomCount; i++){
      switch(i){
        case 0: //top-border
          extent = this.getHighlightExtent('top');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 1: //right-border
          extent = this.getHighlightExtent('right');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 2: //bottom-border
          extent = this.getHighlightExtent('bottom');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 3: //left-border
          extent = this.getHighlightExtent('left');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 4: //top-left-corner
          extent = this.getHighlightExtent('topLeft');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 5: //top-right-corner
          extent = this.getHighlightExtent('topRight');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(-Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 6: //bottom-right-corner
          extent = this.getHighlightExtent('bottomRight');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI);
          planes[i].translate(extent.left, extent.top, 0);
        break;
        case 7: //bottom-left-corner
          extent = this.getHighlightExtent('bottomLeft');
          planes[i] = new THREE.PlaneBufferGeometry(extent.width, extent.height, 1, 1);
          planes[i].rotateZ(Math.PI/2);
          planes[i].translate(extent.left, extent.top, 0);
        break;
      }
    }

    if(this.highlight.geometry instanceof THREE.BufferGeometry)
      this.highlight.geometry.dispose();

    this.highlight.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(planes, false);
    this.highlight.geometry.computeBoundingBox();

    //Edge Group
    this.highlight.geometry.addGroup(0, 24, 0);
    //Corner Group
    this.highlight.geometry.addGroup(24, 24, 1);

    this.highlight.mesh.geometry = this.highlight.geometry;

    //Clean up the temporary plane geometries
    while(planes.length){
      planes.shift().dispose();
    }

  }

  buildHighlightFill(){
    let extent = this.getFillExtent();
    
    let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    let material = new THREE.MeshBasicMaterial( {color: this.highlight.color, side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );
    
    sprite.name = this.widget.name+' highlight fill';
    sprite.scale.x = extent.width || 0.000001;
    sprite.scale.y = extent.height || 0.000001;
    sprite.position.z = this.zOffset;

    this.widget.highlight.add( sprite );
    this.widget.hightlightfill = sprite;

    if(this.highlight.fill != ''){
      material.transparent = true;
      TextureLoader.enQueue(this.highlight.fill, material, TextureLoader.Type.TEXTURE, (texture) => {
        if(texture == null){
          material.opacity = 0.01;
        }
      });
    }else{
      TextureLoader.enQueue('fx_static', material, TextureLoader.Type.TEXTURE, (texture) => {
        material.opacity = 1;
        material.alphaTest = 0.5;
        material.transparent = true;
      });
    }

    sprite.renderOrder = this.id;

    sprite.isClickable = (e) => {
      return this.isClickable();
    };

    sprite.onClick = (e) => {
      this.processEventListener('click', [e]);
    };

    sprite.onMouseMove = (e) =>{
      this.processEventListener('mouseMove', [e]);
    }

    sprite.onMouseDown = (e) => {
      this.processEventListener('mouseDown', [e]);
    };

    sprite.onMouseUp = (e) => {
      this.processEventListener('mouseUp', [e]);
    };
    
    sprite.onHover = (e) => {
      this.processEventListener('hover', [e]);
    };

    sprite.getControl = (e) => {
      return this;
    };

  }

  buildText(){

    if(!this.text.texture)
      return;

    if(this.text.mesh.parent)
      this.text.mesh.parent.remove(this.text.mesh);

    this.widget.text.add(this.text.mesh);
    
    let texture = this.text.texture;
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if(this.text.text != '' || (this.text.strref != 0 && typeof Global.kotorTLK.TLKStrings[this.text.strref] != 'undefined'))
      this.updateTextGeometry(this.text.text != '' ? this.text.text : Global.kotorTLK.TLKStrings[this.text.strref].Value);

    this.text.geometry.computeBoundingSphere = function () {
      if (this.boundingSphere === null) {
        this.boundingSphere = new THREE.Sphere()
      }
    
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        this.boundingSphere.radius = 0
        this.boundingSphere.center.set(0, 0, 0)
        return
      }
      computeSphere(positions, this.boundingSphere)
      if (isNaN(this.boundingSphere.radius)) {
        console.error('THREE.BufferGeometry.computeBoundingSphere(): ' +
          'Computed radius is NaN. The ' +
          '"position" attribute is likely to have NaN values.')
      }
    }
    
    this.text.geometry.computeBoundingBox = function () {
      if (this.boundingBox === null) {
        this.boundingBox = new THREE.Box3()
      }
    
      let bbox = this.boundingBox
      let positions = this.attributes.position.array
      let itemSize = this.attributes.position.itemSize
      if (!positions || !itemSize || positions.length < 2) {
        bbox.makeEmpty()
        return
      }
      computeBox(positions, bbox)
    }

  }

  updateTextGeometry(text){

    if(!this.text.texture)
      return;

    let scale = 1;
    let texture = this.text.texture;

    let texRatio = texture.image.width / texture.image.height;

    let txi_height = texture.txi.fontheight     * 100;
    let txi_bsline = texture.txi.baselineheight * 100;
    let txi_spaceR = texture.txi.spacingr       * 100;
    let txi_spaceB = texture.txi.spacingb       * 100;

    let textCharCount = text.length;
    let positions = new Float32Array(textCharCount * 4 * 2);
    let posI = 0, uvI = 0;
    let uvs = new Float32Array(textCharCount * 4 * 2);

    let indices = GUIControl.createIndicies({
      clockwise: true,
      type: 'uint16',
      count: textCharCount
    });

    let maxLineWidth = this.getInnerSize().width;

    let x = 0, y = 0;
    let space_code = 32;
    let words = text.split(' ');
    let word, wordLength, wordWidth, char, ul, lr, w, h;
    let u0, v1, u1, v0;
    for(let j = 0, len = words.length; j < len; j++){

      word = words[j];
      wordLength = word.length;
      wordWidth = 0;

      //Calculate the length of the word to be printed
      for(let i = 0; i < wordLength; i++){
        char = word.charCodeAt(i);
        ul = texture.txi.upperleftcoords[char];
        lr = texture.txi.lowerrightcoords[char];
        wordWidth += ((lr.x - ul.x) * texture.image.width) * scale;
      }

      //Wrap to new line if needed
      if(x + wordWidth > (maxLineWidth - txi_height)){
        y -= txi_bsline;
        x = 0;
      }
      
      //If this isn't the first word of the line prepend a space to it
      if(x){
        word = ' '+word;
        wordLength++;
      }

      for(let i = 0; i < wordLength; i++){
        char = word.charCodeAt(i);

        ul = texture.txi.upperleftcoords[char];
        lr = texture.txi.lowerrightcoords[char];

        w = ((lr.x - ul.x) * texture.image.width) * scale;
        h = ((lr.y - ul.y) * texture.image.height) * scale;

        // BL
        positions[posI++] = x
        positions[posI++] = y
        // TL
        positions[posI++] = x
        positions[posI++] = y + h
        // TR
        positions[posI++] = x + w
        positions[posI++] = y + h
        // BR
        positions[posI++] = x + w
        positions[posI++] = y

        // top left position
        u0 = ul.x;
        v1 = ul.y;
        u1 = lr.x;
        v0 = lr.y;

        // BL
        uvs[uvI++] = u0
        uvs[uvI++] = v1
        // TL
        uvs[uvI++] = u0
        uvs[uvI++] = v0
        // TR
        uvs[uvI++] = u1
        uvs[uvI++] = v0
        // BR
        uvs[uvI++] = u1
        uvs[uvI++] = v1

        //Advance the x position by the width of the current char
        x += w;
      }

    }
    
    this.text.geometry.index = new THREE.BufferAttribute( indices, 1 ).setUsage( THREE.StaticDrawUsage );

    let posAttribute = new THREE.BufferAttribute( new Float32Array( positions ), 2 ).setUsage( THREE.StaticDrawUsage );
    let uvAttribute = new THREE.BufferAttribute( new Float32Array( uvs ), 2 ).setUsage( THREE.StaticDrawUsage );
    this.text.geometry.setAttribute( 'position', posAttribute );
    this.text.geometry.setAttribute( 'uv', uvAttribute );

    this.text.geometry.index.needsUpdate = true;
    this.text.geometry.attributes.position.needsUpdate = true;
    this.text.geometry.attributes.uv.needsUpdate = true;
    this.text.geometry.computeBoundingBox();
    this.alignText();

  }

  alignText(){
    let size = new THREE.Vector3();
    this.text.geometry.boundingBox.getSize(size);
    this.widget.text.position.z = this.zOffset;
    switch(this.text.alignment){
      case 9:
        this.widget.text.position.x = - (this.extent.width/2 - size.x/2) - size.x/2;
        this.widget.text.position.y = size.y/2;	     		
      break;
      //case 18:
      default:
        this.widget.text.position.x = -size.x/2;
        this.widget.text.position.y = size.y/2;
      break;
    }
  }

  getRendererSize(){
    //window.renderer;
    return {width: $(window).innerWidth(), height: $(window).innerHeight()};
  }

  setText(str='', renderOrder = 0){

    let oldText = this.text.text;
    this.text.text = (str).toString().replace(/\s*\{.*?\}\s*/gi, '');

    if(typeof this.text.geometry !== 'object')
      this.buildText();
    
    this.text.mesh.renderOrder = renderOrder;

    if(oldText != this.text.text && typeof this.text.geometry === 'object'){
      //console.log('updateText', this.text.text);
      this.updateTextGeometry(this.text.text);
    }

  }

  _onCreate(){

    //Dummy Method

  }

  getHintText(){
    if(this.text.strref != 0 && typeof Global.kotorTLK.TLKStrings[this.text.strref+1] != 'undefined'){
      return Global.kotorTLK.TLKStrings[this.text.strref+1].Value;
    }else{
      return '';
    }
  }








  resizeFill(){
    let extent = this.getFillExtent();
    if(this.widget.fill.children.length){
      this.widget.fill.children[0].scale.x = extent.width || 0.000001;
      this.widget.fill.children[0].scale.y = extent.height || 0.000001;
    }
  }

  resizeHighlightFill(){
    let extent = this.getFillExtent();
    if(this.widget.hightlightfill.children.length){
      this.widget.hightlightfill.children[0].scale.x = extent.width || 0.000001;
      this.widget.hightlightfill.children[0].scale.y = extent.height || 0.000001;
    }
  }

  resizeBorder(side = null){

    let extent = this.getBorderExtent(side);

    switch(side){
      case 'top':
        this.widget.border.children[0].position.set( extent.left, extent.top, 1 ); // top
        this.widget.border.children[0].scale.x = extent.width || 0.000001;
        this.widget.border.children[0].scale.y = extent.height || 0.000001;
      break;
      case 'left':
        this.widget.border.children[1].position.set( extent.left, extent.top, 1 ); // left
        this.widget.border.children[1].scale.x = extent.width || 0.000001;
        this.widget.border.children[1].scale.y = extent.height || 0.000001;
      break;
      case 'right':
        this.widget.border.children[2].position.set( extent.left, extent.top, 1 ); // right
        this.widget.border.children[2].scale.x = extent.width || 0.000001;
        this.widget.border.children[2].scale.y = extent.height || 0.000001;
      break;
      case 'bottom':
        this.widget.border.children[3].position.set( extent.left, extent.top, 1 ); // bottom
        this.widget.border.children[3].scale.x = extent.width || 0.000001;
        this.widget.border.children[3].scale.y = extent.height || 0.000001;
      break;
    }

  }

  resizeCorner(side = null){
    
    let extent = this.getBorderExtent(side);

    switch(side){
      case 'topLeft':
        this.widget.border.children[4].position.set( extent.left, extent.top, 1 ); // top
        this.widget.border.children[4].scale.x = extent.width || 0.000001;
        this.widget.border.children[4].scale.y = extent.height || 0.000001;
      break;
      case 'topRight':
        this.widget.border.children[5].position.set( extent.left, extent.top, 1 ); // left
        this.widget.border.children[5].scale.x = extent.width || 0.000001;
        this.widget.border.children[5].scale.y = extent.height || 0.000001;
      break;
      case 'bottomLeft':
        this.widget.border.children[6].position.set( extent.left, extent.top, 1 ); // right
        this.widget.border.children[6].scale.x = extent.width || 0.000001;
        this.widget.border.children[6].scale.y = extent.height || 0.000001;
      break;
      case 'bottomRight':
        this.widget.border.children[7].position.set( extent.left, extent.top, 1 ); // bottom
        this.widget.border.children[7].scale.x = extent.width || 0.000001;
        this.widget.border.children[7].scale.y = extent.height || 0.000001;
      break;
    }

  }

  resizeHighlight(side = null){
    
    /*let extent = this.getHighlightExtent(side);

    let geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
    let material = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );

    if(this.highlight.edge != ''){
      TextureLoader.enQueue(this.highlight.edge, material, TextureLoader.Type.TEXTURE);
    }
    sprite.position.set( extent.left, extent.top, 1 ); // top left

    switch(side){
      case 'top':
        sprite.rotation.z = Math.PI;
      break;
      case 'bottom':
      break;
      case 'left':
        sprite.rotation.z = Math.PI/2;
      break;
      case 'right':
        sprite.rotation.z = -Math.PI/2;
      break;
    }

    sprite.name = side+' edge';
    this.widget.highlight.add(sprite);

    sprite.isClickable = (e) => {
      return this.isClickable();
    };

    sprite.onClick = (e) => {
      if(typeof this.onClick == 'function')
        this.onClick(e);
    };

    sprite.onMouseMove = (e) =>{
      if(typeof this.onMouseMove == 'function')
        this.onMouseMove(e);
    }

    sprite.onMouseDown = (e) => {
      if(typeof this.onMouseDown == 'function')
        this.onMouseDown(e);
    };

    sprite.onMouseUp = (e) => {
      if(typeof this.onMouseUp == 'function')
        this.onMouseUp(e);
    };
    
    sprite.onHover = (e) => {
      if(typeof this.onMouseIn == 'function')
        this.onMouseIn(e);
    };

    sprite.getControl = () => {
      return this;
    }*/

  }

  resizeHighlightCorner(side = null){
    
    /*let extent = this.getHighlightExtent(side);

    let geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
    let material = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
    let sprite = new THREE.Mesh( geometry, material );

    if(this.highlight.corner != ''){
      TextureLoader.enQueue(this.highlight.corner, material, TextureLoader.Type.TEXTURE);
    }

    switch(side){
      case 'topRight':
        sprite.rotation.z = - (Math.PI / 2);
      break;
      case 'bottomRight':
        sprite.rotation.z = - Math.PI;
      break;
      case 'bottomLeft':
        sprite.rotation.z = (Math.PI / 2);
      break;
    }

    sprite.position.set( extent.left, extent.top, 0 ); // top left
    sprite.name = side+' corner';
    this.widget.highlight.add(sprite);*/

  }

  //Add an event listener
  addEventListener(name = '', callback = undefined){
    if(typeof callback === 'function'){
      if(this.eventListeners.hasOwnProperty(name)){
        this.eventListeners[name].push(callback);
      }
    }
  }

  //Remove an event listener
  removeEventListener(name = '', callback = undefined){

    if(this.eventListeners.hasOwnProperty(name)){
      if(typeof callback === 'function'){
        //Remove this specific callback from the event listener
        let cbIndex = this.eventListeners[name].indexOf(callback);
        if(cbIndex > -1){
          this.eventListeners[name].splice(cbIndex, 1);
        }
      }else{
        //Remove all callbacks for this listener
        this.eventListeners[name] = [];
      }
    }

  }

  //Process an event listener
  processEventListener(name = '', args = []){
    let processed = false;
    if(this.eventListeners.hasOwnProperty(name)){
      let len = this.eventListeners[name].length;
      for(let i = 0; i < len; i++){
        if(typeof this.eventListeners[name][i] === 'function'){
          processed = true;
          this.eventListeners[name][i].apply(null, args);
        }
      }
    }
    return processed;
  }

  onINIPropertyAttached(){
    //Stub
  }

  attachINIProperty(key=''){
    let property = iniConfig.getProperty(key);
    if(property){
      this.iniProperty = property;
      this.onINIPropertyAttached();
    }
  }

  updateWorldPosition(){

    let pos = this.widget.position.clone();
    let parent = this.parent;
    while(parent instanceof GUIControl){
      pos.add(parent.widget.position);
      parent = parent.parent;
    }
    this.worldPosition = pos;
    return pos;

  }


}

GUIControl.Type = {
  Invalid: -1,
  Panel: 2,
  Label: 4,
  ProtoItem: 5,
  Button: 6,
  CheckBox: 7,
  Slider: 8,
  ScrollBar: 9,
  Progress: 10,
  Listbox: 11
};

GUIControl.colors = {
  normal: {r: 0, g: 0, b: 0},
  hover: {r: 0.9296875, g: 1, b: 0.9296875}
}

GUIControl.createIndicies = require('quad-indices');

let itemSize = 2
let box = { min: [0, 0], max: [0, 0] }

global.bounds = function (positions) {
  let count = positions.length / itemSize
  box.min[0] = positions[0]
  box.min[1] = positions[1]
  box.max[0] = positions[0]
  box.max[1] = positions[1]

  for (let i = 0; i < count; i++) {
    let x = positions[i * itemSize + 0]
    let y = positions[i * itemSize + 1]
    box.min[0] = Math.min(x, box.min[0])
    box.min[1] = Math.min(y, box.min[1])
    box.max[0] = Math.max(x, box.max[0])
    box.max[1] = Math.max(y, box.max[1])
  }
}

global.computeBox = function (positions, output) {
  bounds(positions)
  output.min.set(box.min[0], box.min[1], 0)
  output.max.set(box.max[0], box.max[1], 0)
}

global.computeSphere = function (positions, output) {
  bounds(positions)
  let minX = box.min[0]
  let minY = box.min[1]
  let maxX = box.max[0]
  let maxY = box.max[1]
  let width = maxX - minX
  let height = maxY - minY
  let length = Math.sqrt(width * width + height * height)
  output.center.set(minX + width / 2, minY + height / 2, 0)
  output.radius = length / 2
}

module.exports = GUIControl;