class GUIControl {
  
    constructor(menu = null, control = null, parent = null, scale = false){
  
      this.menu = menu;
      this.control = control;
      this.parent = parent;
      this.scale = scale;

      this.offset = new THREE.Vector2();
  
      this.widget = new THREE.Group();
      this.widget.control = this;
      this.children = []; 

      this.defaultColor = {
        x: 0.0,
        y: 0.658824,
        z: 0.980392
      };

      if(GameKey == 'TSL'){
        this.defaultColor = {
          x: 0.10196078568697,
          y: 0.69803923368454,
          z: 0.549019634723663
        };
      }


      this.allowClick = true;
      /*this.onClick = null;
      this.onMouseMove = null;
      this.onMouseDown = null;
      this.onMouseUp = null;
      this.onMouseIn = null;
      this.onMouseOut = null;
      this.onDrag = null;
      this.onDragEnd = null;*/

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
  
      this.widget._control = this;
      if(control instanceof Struct){
        this.type = ( control.HasField('CONTROLTYPE') ? control.GetFieldByLabel('CONTROLTYPE').GetValue() : -1 );
        this.widget.name = this.name = ( control.HasField('TAG') ? control.GetFieldByLabel('TAG').GetValue() : -1 );
        this.id = ( control.HasField('ID') ? control.GetFieldByLabel('ID').GetValue() : -1 );
        this.objectLocked = ( control.HasField('Obj_Locked') ? control.GetFieldByLabel('Obj_Locked').GetValue() : -1 );
        this.objectParent = ( control.HasField('Obj_Parent') ? control.GetFieldByLabel('Obj_Parent').GetValue() : -1 );
        this.objectParentId = ( control.HasField('Obj_ParentID') ? control.GetFieldByLabel('Obj_ParentID').GetValue() : -1 );
    
        this.padding = ( control.HasField('PADDING') ? control.GetFieldByLabel('PADDING') : 0 );
    
        //Extent
        this.hasExtent = control.HasField('EXTENT');
        if(this.hasExtent){
          let extent = control.GetFieldByLabel('EXTENT').GetChildStructs()[0];
          this.extent = {};
          this.extent.top = extent.GetFieldByLabel('TOP').GetValue();
          this.extent.left = extent.GetFieldByLabel('LEFT').GetValue();
          this.extent.width = extent.GetFieldByLabel('WIDTH').GetValue();
          this.extent.height = extent.GetFieldByLabel('HEIGHT').GetValue();
        }
    
        //Border
        this.hasBorder = control.HasField('BORDER');
        if(this.hasBorder){
          let border = control.GetFieldByLabel('BORDER').GetChildStructs()[0];
          this.border = {};

          if(border.HasField('COLOR'))
            this.border.color = border.GetFieldByLabel('COLOR').GetVector();
    
          if(typeof this.border.color === 'undefined'){
            this.border.color = this.defaultColor;
          }
    
          this.border.dimension = border.GetFieldByLabel('DIMENSION').GetValue() || 0;
          this.border.corner = border.GetFieldByLabel('CORNER').GetValue();
          this.border.edge = border.GetFieldByLabel('EDGE').GetValue();
          this.border.fill = border.GetFieldByLabel('FILL').GetValue();
          this.border.fillstyle = border.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
          this.border.inneroffset = border.GetFieldByLabel('INNEROFFSET').GetValue() || 0;
          this.border.pulsing = border.GetFieldByLabel('PULSING').GetValue() || 0;
        }
    
        //Text
        this.hasText = control.HasField('TEXT');
        if(this.hasText){
          let text = control.GetFieldByLabel('TEXT').GetChildStructs()[0];
          this.text = {};
          this.text.font = text.GetFieldByLabel('FONT').GetValue();
          this.text.strref = text.GetFieldByLabel('STRREF').GetValue();
          this.text.text = ( text.HasField('TEXT') ? text.GetFieldByLabel('TEXT').GetValue().replace(/\{.*\}/gi, '') : '' );
          this.text.alignment = text.GetFieldByLabel('ALIGNMENT').GetValue();
          this.text.pulsing = text.GetFieldByLabel('PULSING').GetValue();

          if(this.text.font == 'fnt_d16x16' || this.text.font == 'dialogfont10x10'){
            this.text.font = 'dialogfont16x16';
          }

          if(text.HasField('COLOR'))
            this.text.color = text.GetFieldByLabel('COLOR').GetVector();

          if(typeof this.text.color === 'undefined'){
            this.text.color = this.defaultColor;
          }

        }
    
        //Highlight
        this.hasHighlight = control.HasField('HILIGHT');
        if(this.hasHighlight){
          let highlight = control.GetFieldByLabel('HILIGHT').GetChildStructs()[0];
          this.highlight = {};

          if(highlight.HasField('COLOR'))
            this.highlight.color = highlight.GetFieldByLabel('COLOR').GetVector();

          this.highlight.dimension = highlight.GetFieldByLabel('DIMENSION').GetValue() || 0;
          this.highlight.corner = highlight.GetFieldByLabel('CORNER').GetValue() || '';
          this.highlight.edge = highlight.GetFieldByLabel('EDGE').GetValue() || '';
          this.highlight.fill = highlight.GetFieldByLabel('FILL').GetValue() || '';
          this.highlight.fillstyle = highlight.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
          this.highlight.inneroffset = highlight.GetFieldByLabel('INNEROFFSET').GetValue() || 0;
          this.highlight.pulsing = highlight.GetFieldByLabel('PULSING').GetValue() || 0;

        }
    
        //Moveto
        this.hasMoveTo = control.HasField('MOVETO');
        if(this.hasMoveTo){
          let moveTo = control.GetFieldByLabel('MOVETO').GetChildStructs()[0];
          this.moveTo = {};
          this.moveTo.down = moveTo.GetFieldByLabel('DOWN').GetValue();
          this.moveTo.left = moveTo.GetFieldByLabel('LEFT').GetValue();
          this.moveTo.right = moveTo.GetFieldByLabel('RIGHT').GetValue();
          this.moveTo.up = moveTo.GetFieldByLabel('UP').GetValue();
        }
      }
  
    }

    isClickable(){
      return (typeof this.onClick == 'function');
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

      this.hover = true;

      if(typeof this.onMouseIn === 'function')
        this.onMouseIn();

      if(this.highlight.edge != '' || this.highlight.fill != ''){
        this.showHighlight();
        this.widget.fill.visible = false;
      }

      this.hideBorder();

      if(this.isClickable()){
        Game.guiAudioEmitter.PlaySound('gui_scroll');
      }
      
    }

    resizeControl(){
      try{
        this.resizeBorder('top');
        this.resizeBorder('left');
        this.resizeBorder('right');
        this.resizeBorder('bottom');
        this.resizeCorner('topLeft');
        this.resizeCorner('topRight');
        this.resizeCorner('bottomLeft');
        this.resizeCorner('bottomRight');
      }catch(e){
        //Must not have a border
      }

      this.resizeFill();

    }
  
    createControl( onComplete = null ){

      if(this.widget instanceof THREE.Object3D && this.widget.parent){
        this.widget.parent.remove(this.widget);
      }
      
      //if(this.parent === undefined){
      //  this.widget.add(this.menu.backgroundSprite);
      //}
  
      if(this.hasBorder){
        if(this.border.dimension){
          this.buildBorder('top');
          this.buildBorder('left');
          this.buildBorder('right');
          this.buildBorder('bottom');
          this.buildCorner('topLeft');
          this.buildCorner('topRight');
          this.buildCorner('bottomLeft');
          this.buildCorner('bottomRight');
        }

        if(this.border.edge == '')
          this.hideBorder();

      }

      if(this.hasHighlight){
        if(this.highlight.dimension){
          this.buildHighlight('top');
          this.buildHighlight('left');
          this.buildHighlight('right');
          this.buildHighlight('bottom');
          this.buildHighlightCorner('topLeft');
          this.buildHighlightCorner('topRight');
          this.buildHighlightCorner('bottomLeft');
          this.buildHighlightCorner('bottomRight');
        }
        this.buildHighlightFill();
        this.hideHighlight();
      }

      this.buildFill();
  
      if(this.hasText){
        if(this.text.font && !(this.text.texture instanceof THREE.Texture)){
          TextureLoader.enQueue(this.text.font, null, TextureLoader.Type.TEXTURE, (texture) => {
            this.text.texture = texture;
          });
          TextureLoader.LoadQueue(() => {
            this.buildText();
            this._onCreate();
            //Calculate the widget screen position
            this.calculatePosition();
            //this.buildChildren();
            this.buildChildren( () => {
              if(typeof onComplete === 'function')
                onComplete(this.widget);
            });
          });
        }else{
          this.buildText();
          this._onCreate();
          //Calculate the widget screen position
          this.calculatePosition();
          //this.buildChildren();
          this.buildChildren( () => {
            if(typeof onComplete === 'function')
              onComplete(this.widget);
          });
        }
      }else{
        this._onCreate();
        //Calculate the widget screen position
        this.calculatePosition();
        //this.buildChildren();
        this.buildChildren( () => {
          console.log('buildChildren')
          if(typeof onComplete === 'function')
            onComplete(this.widget);
        });
      }

      //return this.widget;
  
    }

    buildChildren( onComplete = null ){
      if(this.menu.tGuiPanel.control.HasField('CONTROLS')){
        let children = this.menu.tGuiPanel.control.GetFieldByLabel('CONTROLS').GetChildStructs();
        
        let asyncBuilder = (i = 0, array = [], onComplete = null) => {
          if(i < array.length){
            let child = array[i];
            let childParent = ( child.HasField('Obj_Parent') ? child.GetFieldByLabel('Obj_Parent').GetValue() : '' );
            if(childParent == this.name){

              let type = ( child.HasField('CONTROLTYPE') ? child.GetFieldByLabel('CONTROLTYPE').GetValue() : -1 );
              let gui = null;
              
              switch(type){
                case 6:
                  gui = new GUIButton(this.menu, child, this, this.scale);
                break;
                case 7:
                  gui = new GUICheckBox(this.menu, child, this, this.scale);
                break;
                case 8:
                  gui = new GUISlider(this.menu, child, this, this.scale);
                break;
                case 10:
                  gui = new GUIProgressBar(this.menu, child, this, this.scale);
                break;
                case 11:
                  gui = new GUIListBox(this.menu, child, this, this.scale);
                break;
                default: 
                  gui = new GUIControl(this.menu, child, this, this.scale);
                break;
              }

              console.log('createControl', this.children);

              this.children.push(gui);
              //let _cWidget = gui.createControl();
              //this.widget.add(_cWidget);
              gui.createControl( (_cWidget) => {
                this.widget.add(_cWidget);
                asyncBuilder(++i, array, onComplete);
              });

            }else if(typeof onComplete === 'function'){
              asyncBuilder(++i, array, onComplete);
            }
          }else if(typeof onComplete === 'function'){
            onComplete();
          }
        };
        asyncBuilder(0, children, () => {
          if(typeof onComplete === 'function')
            onComplete();
        })

        /*for(let i = 0; i < children.length; i++){
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

            this.children.push(gui);
            //let _cWidget = gui.createControl();
            //this.widget.add(_cWidget);
            gui.createControl( (_cWidget) => {
              this.widget.add(_cWidget);
            });
            

          }
        }*/
  
      }else if(typeof onComplete === 'function'){
        onComplete();
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
      this.widget.visible = true;
    }

    update(delta){
      if(this.pulsing){
        this.pulse += delta;
        if(this.pulse > 2){
          this.pulse = 0;
        }


        let bordersLen = this.widget.border.children.length;
        for(let i = 0; i < bordersLen; i++){
    
          let mat = this.widget.border.children[i].material;
          
          if(this.pulse > 2){
            mat.opacity = 0;
          }
    
          if(this.pulse > 1){
            mat.opacity -= delta;
          }else{
            mat.opacity += delta;
          }
          
        }
    
        let fill = this.widget.fill.children[0];
    
        if(this.pulse > 2){
          fill.material.opacity = 0;
        }
    
        if(this.pulse > 1){
          fill.material.opacity -= delta;
        }else{
          fill.material.opacity += delta;
        }
      }
    }

    resetPulse(){
      let bordersLen = this.widget.border.children.length;
      for(let i = 0; i < bordersLen; i++){
        this.widget.border.children[i].material.opacity = 1;
      }
      this.widget.fill.children[0].material.opacity = 1;
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

    setTextColor(r = 1, g = 1, b = 1){
      //0.0, 0.658824, 0.980392
      if(typeof this.textGeometry != 'undefined'){
        this.textMaterial.color.set(r, g, b);
      }
    }

    /*setText(text = '', renderOrder){
      //0.0, 0.658824, 0.980392
      if(typeof this.textGeometry != 'undefined'){
        this.textGeometry.update(text);
      }
    }*/

    getFillTexture(){
      return this.widget.fill.children[0].material.map;
    }

    setFillTexture(map = undefined){
      this.widget.fill.children[0].material.map = map;
      this.widget.fill.children[0].material.needsUpdate = true;
      
      this.widget.fill.children[0].material.visible = (map != undefined);
    }

    getFillTextureName(){
      return this.border.fill;
    }

    setFillTextureName(name = ''){
      this.border.fill = name;
    }


    calculatePosition(){
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

      if( this.parent != this.menu.tGuiPanel){
        parentExtent = this.menu.tGuiPanel.extent;
        console.log(this.parent)
        parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
        parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

        this.widget.position.x = this.offset.x;
        this.widget.position.y = this.offset.y;

        let worldPosition = this.widget.getWorldPosition(new THREE.Vector3());

        this.box = new THREE.Box2(
          new THREE.Vector2(
            worldPosition.x - this.extent.width/2,
            worldPosition.y - this.extent.height/2
          ),
          new THREE.Vector2(
            worldPosition.x + this.extent.width/2,
            worldPosition.y + this.extent.height/2
          )
        );

        return;

      }else{
        parentOffsetX = this.menu.tGuiPanel.extent.left;
        parentOffsetY = this.menu.tGuiPanel.extent.top;
      }

      let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
      let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

      let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );
      let posY = ((-this.extent.top + ( (parentExtent.height - this.extent.height) / 2 ) ));

      this.anchor = 'none';
      this.anchorOffset = {x: posX, y: posY};

      let halfX = parentExtent.width/2;
      let quatX = 25; //parentExtent.width/4;
      let halfY = parentExtent.height/2;
      let quatY = 25; //parentExtent.height/4;

      if(this.scale){
        if(this.extent.left == 0 && this.extent.top == 0){
          //Screen centered
        }else{
          if(this.extent.left < (halfX/2) && this.extent.top > halfY){
            this.anchor = 'bl'
            this.anchorOffset.x = -((window.innerWidth) / 2) + ((this.extent.width/2)) + this.extent.left;
            this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
          }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top > halfY){
            this.anchor = 'bc'
            if(this.extent.left < (halfX)){
              //this.anchorOffset.x = ((window.innerWidth) / 2) - (800-this.extent.left) - (this.extent.width/2);
              this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
            }else{
              //this.anchorOffset.x = ((window.innerWidth) / 2) + (this.extent.left - 400) - (this.extent.width/2);
              this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));  
            }
          }else if(this.extent.left > (halfX/2) && this.extent.top > halfY){
            this.anchor = 'br'
            this.anchorOffset.x = ((window.innerWidth) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
            this.anchorOffset.y = -(((window.innerHeight) / 2) - (600 - this.extent.top) + (this.extent.height/2));
          }

          if(this.extent.left < (halfX/2) && this.extent.top < halfY){
            this.anchor = 'tl'
            this.anchorOffset.x = -((window.innerWidth) / 2) + ((this.extent.width/2)) + this.extent.left;
            this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
          }else if( ( this.extent.left > quatX && this.extent.left < (halfX+quatX) ) && this.extent.top < halfY){
            this.anchor = 'tc'
            if(this.extent.left < halfX){
              //this.anchorOffset.x = (halfX-this.extent.left) - (this.extent.width/2);
              this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
            }else{
              //this.anchorOffset.x = -(halfX-this.extent.left) + (this.extent.width/2);
              this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
            }
          }else if(this.extent.left > (halfX/2) && this.extent.top < halfY){
            this.anchor = 'tr'
            this.anchorOffset.x = ((window.innerWidth) / 2) + ((this.extent.width/2) + (this.extent.left - 800));
            this.anchorOffset.y = ((window.innerHeight) / 2) - (this.extent.top + (this.extent.height/2));
          }
        }
      }

      this.widget.position.x = this.anchorOffset.x + this.offset.x;
      this.widget.position.y = this.anchorOffset.y + this.offset.y;

      let worldPosition = this.widget.getWorldPosition(new THREE.Vector3());

      /*worldPosition.add(
        new THREE.Vector3(
          this.menu.tGuiPanel.extent.left/2,
          this.menu.tGuiPanel.extent.top/2,
          0
        )
      );*/

      this.box = new THREE.Box2(
        new THREE.Vector2(
          worldPosition.x - this.extent.width/2,
          worldPosition.y - this.extent.height/2
        ),
        new THREE.Vector2(
          worldPosition.x + this.extent.width/2,
          worldPosition.y + this.extent.height/2
        )
      );

    }

    getActiveControls(){

      if(!this.widget.visible)
        return [];

      let controls = [];
      for(let i = 0; i < this.children.length; i++){
        let control = this.children[i];
        if(control.box && control.box.containsPoint(Game.mouseUI) && control.allowClick){
          controls.push(control);
        }
        controls = controls.concat( control.getActiveControls() );
      }
      
      return controls;
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
        left: left,
        width: this.extent.width,
        height: this.extent.height
      };
  
    }
  
    getInnerSize(){
      return {
        width: this.extent.width,// + (this.padding * 2),
        height: this.extent.height// + (this.padding * 2)
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
      return {
        top: extent.top, 
        left: extent.left, 
        width: inner.width,
        height: inner.height
      };
    }

    getBorderSize(){
      if(GameKey == 'TSL'){
        return this.border.dimension/2 || 0;
      }else{
        return this.border.dimension || 0;
      }
    }

    getHightlightSize(){
      if(GameKey == 'TSL'){
        return this.highlight.dimension/2 || 0;
      }else{
        return this.highlight.dimension || 0;
      }
    }
  
    getBorderExtent(side = null){
      let extent = this.getControlExtent();
      let inner = this.getInnerSize();
      let innerOffset = 0;//this.border.inneroffset;

      let dimensionOffset = this.getBorderSize();
      if(GameKey == 'TSL'){
        dimensionOffset = dimensionOffset;
        //innerOffset += dimensionOffset;
      }

      switch(side){
        case 'top':
          return {
            top: -( (inner.height/2) + (dimensionOffset) - innerOffset ), 
            left: 0, 
            width: inner.width + (innerOffset ),
            height: this.getBorderSize()
          };
        break;
        case 'bottom':
          return {
            top: (inner.height/2) + (dimensionOffset) - innerOffset, 
            left: 0, 
            width: inner.width - (innerOffset ),
            height: this.getBorderSize()
          };
        break;
        case 'left':
          return {
            top: 0, 
            left: -(inner.width/2) - (dimensionOffset) + innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.getBorderSize()
          };
        break;
        case 'right':
          return {
            top: 0, 
            left: (dimensionOffset) + (inner.width/2) - innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.getBorderSize()
          };
        break;
        case 'topLeft':
          return {
            top: ((dimensionOffset) + (inner.height/2)) - innerOffset, 
            left: -((dimensionOffset) + (inner.width/2)) + innerOffset, 
            width: this.getBorderSize(),
            height: this.getBorderSize()
          };
        break;
        case 'topRight':
          return {
            top: ((dimensionOffset) + (inner.height/2)) - innerOffset, 
            left: ((dimensionOffset) + (inner.width/2)) - innerOffset, 
            width: this.getBorderSize(),
            height: this.getBorderSize()
          };
        break;
        case 'bottomLeft':
          return {
            top: -((dimensionOffset) + (inner.height/2)) + innerOffset, 
            left: -((dimensionOffset) + (inner.width/2)) + innerOffset, 
            width: this.getBorderSize(),
            height: this.getBorderSize()
          };
        break;
        case 'bottomRight':
          return {
            top: -((dimensionOffset) + (inner.height/2)) + innerOffset, 
            left: ((dimensionOffset) + (inner.width / 2)) - innerOffset, 
            width: this.getBorderSize(),
            height: this.getBorderSize()
          };
        break;
      }
    }

    getHighlightExtent(side = null){
      let extent = this.getControlExtent();
      let inner = this.getInnerSize();
      let innerOffset = this.highlight.inneroffset;
      switch(side){
        case 'top':
          return {
            top: -( (inner.height/2) + (this.getHightlightSize()) - innerOffset ), 
            left: 0, 
            width: inner.width - (innerOffset ),
            height: this.getHightlightSize()
          };
        break;
        case 'bottom':
          return {
            top: (inner.height/2) + (this.getHightlightSize()) - innerOffset, 
            left: 0, 
            width: inner.width - (innerOffset ),
            height: this.getHightlightSize()
          };
        break;
        case 'left':
          return {
            top: 0, 
            left: -(inner.width/2) - (this.getHightlightSize()) + innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.getHightlightSize()
          };
        break;
        case 'right':
          return {
            top: 0, 
            left: (this.getHightlightSize()) + (inner.width/2) - innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.getHightlightSize()
          };
        break;
        case 'topLeft':
          return {
            top: ((this.getHightlightSize()) + (inner.height/2)) - innerOffset, 
            left: -((this.getHightlightSize()) + (inner.width/2)) + innerOffset, 
            width: this.getHightlightSize(),
            height: this.getHightlightSize()
          };
        break;
        case 'topRight':
          return {
            top: ((this.getHightlightSize()) + (inner.height/2)) - innerOffset, 
            left: ((this.getHightlightSize()) + (inner.width/2)) - innerOffset, 
            width: this.getHightlightSize(),
            height: this.getHightlightSize()
          };
        break;
        case 'bottomLeft':
          return {
            top: -((this.getHightlightSize()) + (inner.height/2)) + innerOffset, 
            left: -((this.getHightlightSize()) + (inner.width/2)) + innerOffset, 
            width: this.getHightlightSize(),
            height: this.getHightlightSize()
          };
        break;
        case 'bottomRight':
          return {
            top: -((this.getHightlightSize()) + (inner.height/2)) + innerOffset, 
            left: ((this.getHightlightSize()) + (inner.width / 2)) - innerOffset, 
            width: this.getHightlightSize(),
            height: this.getHightlightSize()
          };
        break;
      }
    }
  
    buildFill(){
      let extent = this.getFillExtent();
      
      var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Mesh( geometry, material );
      
      sprite.name = this.widget.name+' center fill';
      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;
  
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
        return (typeof this.onClick == 'function');
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

      sprite.getControl = (e) => {
        return this;
      };
  
    }
  
    buildBorder(side = null){
  
      let extent = this.getBorderExtent(side);

      var geometry = new THREE.PlaneGeometry(1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Sprite( material );
  
      if(this.border.edge != ''){
        TextureLoader.enQueue(this.border.edge, material, TextureLoader.Type.TEXTURE);
      }
      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;
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
      this.widget.border.add(sprite);

      sprite.isClickable = (e) => {
        return (typeof this.onClick == 'function');
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
      }
  
    }
  
    buildCorner(side = null){
      
      let extent = this.getBorderExtent(side);

      var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Sprite( material );

      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;

      if(this.border.corner != ''){
        TextureLoader.enQueue(this.border.corner, material, TextureLoader.Type.TEXTURE);
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
      this.widget.border.add(sprite);
  
    }

    buildHighlight(side = null){
      
      let extent = this.getHighlightExtent(side);

      var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Sprite( material );

      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;
  
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
        return (typeof this.onClick == 'function');
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
      }
  
    }

    buildHighlightFill(){
      let extent = this.getFillExtent();
      
      var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Sprite( material );
      
      sprite.name = this.widget.name+' highlight fill';
      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;
  
      this.widget.highlight.add( sprite );
  
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
        return (typeof this.onClick == 'function');
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

      sprite.getControl = (e) => {
        return this;
      };
  
    }
  
    buildHighlightCorner(side = null){
      
      let extent = this.getHighlightExtent(side);

      var geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      var material = new THREE.SpriteMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Sprite( material );

      sprite.scale.x = extent.width;
      sprite.scale.y = extent.height;

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
      this.widget.highlight.add(sprite);
  
    }
  
    buildText(){
      let extent = this.getFillExtent();
      //console.log(this.text);
      if(this.text.text != '' || (this.text.strref != 0 && typeof Global.kotorTLK.TLKStrings[this.text.strref] != 'undefined')){

        if(this.widget.text.children.length){
          this.widget.text.remove(this.widget.text.children[0]);
        }
        
        let texture = this.text.texture;

        let _height = texture.txi.fontheight * 100;
        let _bsline = texture.txi.baselineheight * 100;
        let _spaceR = texture.txi.spacingr   * 100;
        let _spaceB = texture.txi.spacingb   * 100;

        let font = {
          pages: [this.text.font],
          common: {
            alphaChnl:0,
            base: _bsline/2, //Divide by 2 HACK!!!!
            blueChnl: 0,
            greenChnl: 0,
            lineHeight: _height,
            packed: 0,
            pages: 1,
            redChnl: 0,
            scaleH: texture.image.height,
            scaleW: texture.image.width
          },
          info: {
            face: this.text.font,
            size: _height*2,
            bold: 0,
            italic: 0,
            charset: "",
            unicode: 0,
            stretchH: 100,
            smooth: 1,
            aa: 1,
            //padding: [3, 3, 3, 3],
            //spacing: [0, 0]
          },
          kernings: [],
          chars: []
        };

        if(_bsline + _height <= 20){
          _height = 19;
        }

        if(this.text.font == 'fnt_d16x16'){
          //texture.flipY = false;
        }

        texture.flipY = false;

        //console.log('font', font);

        //texture.txi.upperleftcoords.reverse();
        //texture.txi.lowerrightcoords.reverse();

        //console.log('font', this.text.font, texture, _height)

        let textureRatio = texture.image.width / texture.image.height;
        let scale = texture.image.width / 256;

        for(let ci = 0; ci < texture.txi.numchars; ci++){

          let ul = texture.txi.upperleftcoords[ci];
          let lr = texture.txi.lowerrightcoords[ci];

          if(ul == undefined)
            ul = {x: 0, y: 0, z: 0};

          if(lr == undefined)
            lr = {x:0, y:0, z:0};
          
          let x = (ul.x * texture.image.width) * scale;
          let y = texture.image.height - (ul.y * texture.image.width);
          let width = (Math.abs(lr.x - ul.x) * texture.image.width) * scale;
          let height = (Math.abs(lr.y - ul.y) * texture.image.height) * scale;
          /*if(y < 0){
            y = texture.image.height - (ul.y * texture.image.height)
            scale = 1;
          }*/

          if(this.text.font == 'fnt_d16x16'){
            height = 19;

            if(x >= 512){
              x -= 512;
            }

            /*console.log(
              String.fromCharCode(ci), 
              x, 
              y,  
              width, 
              height
            );*/
          }

          font.chars.push({
            id: ci,
            x: x,//(x * width),
            y: y, //texture.image.height - (texture.image.height * ul.y),
            width: width,
            height: height,
            xoffset: 0,
            yoffset: 0,
            xadvance: width,
            page: 0,
            chnl: 0
          });

          // font.chars.push({
          //   id: ci,
          //   x: (Math.abs(ul.x) * texture.image.width),//(x * width),
          //   y: texture.image.height - (Math.abs(ul.y) * texture.image.height ), //texture.image.height - (texture.image.height * ul.y),
          //   width: (Math.abs(lr.x - ul.x) * texture.image.width),
          //   height: (Math.abs(lr.y - ul.y) * texture.image.height),
          //   xoffset: 0,
          //   yoffset: 0,
          //   xadvance: Math.abs(lr.x - ul.x) * texture.image.width,
          //   page: 0,
          //   chnl: 0
          // });
          
        }

        // create a geometry of packed bitmap glyphs, 

        this.textGeometry = createGeometry({
          width: extent.width,
          align: this.text.alignment == 9 ? 'left' : 'center',
          font: font
        });

        let _text = this.text.text != '' ? this.text.text : Global.kotorTLK.TLKStrings[this.text.strref].Value;

        //console.log('font', font);
        //console.log('font', _text);
      
        // change text and other options as desired
        // the options sepcified in constructor will
        // be used as defaults
        this.textGeometry.update(_text);
        
        // the resulting layout has metrics and bounds
        //console.log('font', this.textGeometry.layout.height);
        //console.log('font', this.textGeometry.layout.descender);
        //console.log('font', texture);
        // we can use a simple ThreeJS material
        this.textMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          color: new THREE.Color(this.text.color.x, this.text.color.y, this.text.color.z),
          depthTest: false
        });

        var layout = this.textGeometry.layout
    
        // now do something with our mesh!
        var text = new THREE.Mesh(this.textGeometry, this.textMaterial);
        //text.renderOrder = this.id + 1;
        text.rotation.x = Math.PI;
        //text.rotation.z = Math.PI;
      
        var textAnchor = new THREE.Object3D()
        textAnchor.add(text)
        //textAnchor.scale.multiplyScalar(1 / (window.devicePixelRatio || 1))

        textAnchor.position.x -= (this.extent.width / 2);
        textAnchor.position.z = 5;

        if(this.hasBorder){
          textAnchor.position.x += 9*4;
        }
        
        this.widget.text.add(textAnchor);

        text.isClickable = (e) => {
          return (typeof this.onClick == 'function');
        };

        text.onClick = (e) => {
          if(typeof this.onClick == 'function')
            this.onClick(e);
        };

        text.onMouseMove = (e) =>{
          if(typeof this.onMouseMove == 'function')
            this.onMouseMove(e);
        }
    
        text.onMouseDown = (e) => {
          if(typeof this.onMouseDown == 'function')
            this.onMouseDown(e);
        };
    
        text.onMouseUp = (e) => {
          if(typeof this.onMouseUp == 'function')
            this.onMouseUp(e);
        };
        
        text.onHover = (e) => {
          if(typeof this.onMouseIn == 'function')
            this.onMouseIn(e);
        };

        text.getControl = () => {
          return this;
        }
  
      }
    }
  
    getRendererSize(){
      //window.renderer;
      return {width: $(window).innerWidth(), height: $(window).innerHeight()};
    }

    setText(str='', renderOrder = 0){

      this.text.text = str.replace(/\{.*\}/gi, '');

      //console.log('setText', typeof this._textGeometry)

      if(typeof this.textGeometry === 'object'){
        this.textGeometry.update(this.text.text);
        try{
          this.widget.text.children[0].children[0].renderOrder = renderOrder;
        }catch(e){}
      }else{
        this.buildText();
        try{
          this.widget.text.children[0].children[0].renderOrder = renderOrder;
        }catch(e){}
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
      this.widget.fill.children[0].scale.x = extent.width;
      this.widget.fill.children[0].scale.y = extent.height;
    }
  
    resizeBorder(side = null){
  
      let extent = this.getBorderExtent(side);

      switch(side){
        case 'top':
          this.widget.border.children[0].position.set( extent.left, extent.top, 1 ); // top
          this.widget.border.children[0].scale.x = extent.width;
          this.widget.border.children[0].scale.y = extent.height;
        break;
        case 'left':
          this.widget.border.children[1].position.set( extent.left, extent.top, 1 ); // left
          this.widget.border.children[1].scale.x = extent.width;
          this.widget.border.children[1].scale.y = extent.height;
        break;
        case 'right':
          this.widget.border.children[2].position.set( extent.left, extent.top, 1 ); // right
          this.widget.border.children[2].scale.x = extent.width;
          this.widget.border.children[2].scale.y = extent.height;
        break;
        case 'bottom':
          this.widget.border.children[3].position.set( extent.left, extent.top, 1 ); // bottom
          this.widget.border.children[3].scale.x = extent.width;
          this.widget.border.children[3].scale.y = extent.height;
        break;
      }
  
    }
  
    resizeCorner(side = null){
      
      let extent = this.getBorderExtent(side);
  
      switch(side){
        case 'topLeft':
          this.widget.border.children[4].position.set( extent.left, extent.top, 1 ); // top
          this.widget.border.children[4].scale.x = extent.width;
          this.widget.border.children[4].scale.y = extent.height;
        break;
        case 'topRight':
          this.widget.border.children[5].position.set( extent.left, extent.top, 1 ); // left
          this.widget.border.children[5].scale.x = extent.width;
          this.widget.border.children[5].scale.y = extent.height;
        break;
        case 'bottomLeft':
          this.widget.border.children[6].position.set( extent.left, extent.top, 1 ); // right
          this.widget.border.children[6].scale.x = extent.width;
          this.widget.border.children[6].scale.y = extent.height;
        break;
        case 'bottomRight':
          this.widget.border.children[7].position.set( extent.left, extent.top, 1 ); // bottom
          this.widget.border.children[7].scale.x = extent.width;
          this.widget.border.children[7].scale.y = extent.height;
        break;
      }
  
    }

    resizeHighlight(side = null){
      
      /*let extent = this.getHighlightExtent(side);

      var geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
      var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Mesh( geometry, material );
  
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
        return (typeof this.onClick == 'function');
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

      var geometry = new THREE.PlaneGeometry( extent.width, extent.height, 1 );
      var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      var sprite = new THREE.Mesh( geometry, material );

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
  
  module.exports = GUIControl;