/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIScrollBar class.
 */

class GUIScrollBar extends GUIControl{

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);
    this.list = null;

    this.scrollPos = 0;
    this.scrollMax = 1;
    this.mouseOffset = {x: 0, y: 0};

    this.extent.height -= (16*2);

    this.arrowTex = undefined;

    if(this.control.HasField('DIR')){
      this._dir = this.control.GetFieldByLabel('DIR').GetChildStructs()[0];
      if(this._dir.HasField('IMAGE')){
        TextureLoader.tpcLoader.fetch(this._dir.GetFieldByLabel('IMAGE').GetValue(), (texture) => {
          this.arrowTex = texture;
          
          //Up Arrow
          this.upArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.upArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.upArrow = new THREE.Mesh( this.upArrowGeometry, this.upArrowMaterial );

          this.widget.add(this.upArrow);
          this.upArrow.name = 'SCROLLBAR up arrow';
          this.upArrow.scale.x = this.extent.width;
          this.upArrow.scale.y = this.extent.width;
          this.upArrow.position.z = 5;

          this.upArrow.position.y = this.extent.height/2 + 16/2;
          this.upArrow.worldPosition = new THREE.Vector3();

          this.upArrowMaterial.transparent = true;
          this.upArrowMaterial.needsUpdate = true;

          let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

          this.upArrow.updateBox = () => {
            this.upArrow.getWorldPosition(this.upArrow.worldPosition);
            this.upArrow.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            this.upArrow.box.translate(this.upArrow.worldPosition);
          };
          this.upArrow.updateBox();

          //Down Arrow
          this.downArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.downArrowMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), map: this.arrowTex, side: THREE.DoubleSide} );
          this.downArrow = new THREE.Mesh( this.downArrowGeometry, this.downArrowMaterial );

          this.widget.add(this.downArrow);
          this.downArrow.name = 'SCROLLBAR up arrow';
          this.downArrow.scale.x = this.extent.width;
          this.downArrow.scale.y = this.extent.width;
          this.downArrow.position.z = 5;
          this.downArrow.position.y = -(this.extent.height/2 + 16/2);
          this.downArrow.rotation.z = Math.PI;
          this.downArrow.worldPosition = new THREE.Vector3();

          parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

          this.downArrowMaterial.transparent = true;
          this.downArrowMaterial.needsUpdate = true;

          this.downArrow.updateBox = () => {
            this.downArrow.getWorldPosition(this.downArrow.worldPosition);
            this.downArrow.box = new THREE.Box2(
              new THREE.Vector2(
                -this.extent.width/2,
                -this.extent.width/2
              ),
              new THREE.Vector2(
                this.extent.width/2,
                this.extent.width/2
              )
            );
            this.downArrow.box.translate(this.downArrow.worldPosition)
          };
          this.downArrow.updateBox();

          this.upArrow.onClick = (e) => {
            this.scrollUp();
          };

          this.downArrow.onClick = (e) => {
            this.scrollDown();
          };

        });
      }
    }

    if(this.control.HasField('THUMB')){
      this._thumb = this.control.GetFieldByLabel('THUMB').GetChildStructs()[0];
      /*this.thumbMaterial = new THREE.SpriteMaterial( { map: null, color: new THREE.Color(0xFFFFFF) } );
      this.thumbMaterial.transparent = true;
      this.thumb = new THREE.Sprite( this.thumbMaterial );*/

      this.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.thumbMaterial = new THREE.MeshBasicMaterial( {color: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide} );
      this.thumb = new THREE.Mesh( this.geometry, this.thumbMaterial );

      this.widget.add(this.thumb);
      this.thumb.name = 'SCROLLBAR thumb';
      this.thumb.scale.x = this.extent.width/2;
      this.thumb.scale.y = this.extent.height/2;
      this.thumb.position.z = 5;

      let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

      this.thumb.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      )

      this.thumb.onClick = (e) => {
        this.processEventListener('click', [e]);
      };

      this.thumb.onMouseMove = (e) =>{
        this.processEventListener('mouseMove', [e]);
      }

      this.thumb.onMouseDown = (e) => {
        this.processEventListener('mouseDown', [e]);
      };

      this.thumb.onMouseUp = (e) => {
        this.processEventListener('mouseUp', [e]);
      };
      
      this.thumb.onHover = (e) => {
        this.processEventListener('hover', [e]);
      };

      this.thumb.getControl = (e) => {
        return this;
      };

      // this.thumb.click = (e) => {
      //   console.log('scroll thumb')
      // };

      if(this._thumb.HasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.GetFieldByLabel('IMAGE').GetValue(), this.thumbMaterial, TextureLoader.Type.TEXTURE);
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      //if(this.inner_box.containsPoint(Game.mouseUI)){
        this.mouseInside();
      //}
    });

    this.addEventListener('click', () =>{
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let mouseY = Mouse.Client.y - (window.innerHeight / 2);

      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      if(this.upArrow.box.containsPoint(Game.mouseUI)){
        this.list.scrollUp();
      }else if(this.downArrow.box.containsPoint(Game.mouseUI)){
        this.list.scrollDown();
      }else if(this.inner_box.containsPoint(Game.mouseUI)){
        this.mouseInside();
      }
    })

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let mouseY = Mouse.Client.y - (window.innerHeight / 2);
      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      this.upArrow.updateBox();
      this.downArrow.updateBox();
    });

    this.addEventListener('mouseUp', () => {
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let mouseY = Mouse.Client.y - (window.innerHeight / 2);
      //let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      //this.mouseOffset.y = scrollTop;
      //console.log('GUIScrollBar', 'blah');
      /*if(this.upArrow.box.containsPoint(Game.mouseUI)){
        console.log('GUIScrollBar', 'up');
        this.list.scrollUp();
      }else if(this.downArrow.box.containsPoint(Game.mouseUI)){
        console.log('GUIScrollBar', 'down');
        this.list.scrollDown();
      }else */if(this.inner_box.containsPoint(Game.mouseUI)){
        //console.log('GUIScrollBar', 'scroll');
        this.mouseInside();
      }
    });

  }

  mouseInside(){

    let mouseX = Mouse.Client.x - (window.innerWidth / 2);
    let mouseY = Mouse.Client.y - (window.innerHeight / 2);
    //console.log(mouseY);
    //if(this.inner_box.containsPoint({x: mouseX, y: mouseY})){

      let centerPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());

      let scrollBarHeight = this.extent.height;

      this.thumb.position.y = -(mouseY) || 0;

      if(this.thumb.position.y < -((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = -((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      if(this.thumb.position.y > ((scrollBarHeight - this.thumb.scale.y))/2 ){
        this.thumb.position.y = ((scrollBarHeight - this.thumb.scale.y))/2 || 0
      }

      let maxScroll = ((scrollBarHeight - this.thumb.scale.y)/2);
      scrollY = (this.thumb.position.y + maxScroll) / (maxScroll*2);
      this.scrollPos = 1.0 - scrollY;
      this.update();

    //}

  }

  setList(list = null){
    this.list = list;
    this.calculatePosition();
    this.update();
  }

  update(){

    if(this.list){

      let contentHeight = this.list.getContentHeight();

      let scaleY = this.list.extent.height / contentHeight;
      if(scaleY > 1){
        scaleY = 1;
        this.thumb.scale.y = this.extent.height * scaleY;
      }else{
        if(scaleY < 0.01)
          scaleY = 0.01;
        this.thumb.scale.y = this.extent.height * scaleY;
      }

      let offsetY = contentHeight*this.scrollPos;
      let offsetYMax = contentHeight - this.extent.height;
      let nodeHeight = this.list.getNodeHeight();
      if(offsetY > offsetYMax){
        offsetY = offsetYMax;//Math.floor(offsetYMax / nodeHeight) * nodeHeight;
      }

      //console.log((Math.floor(offsetY / nodeHeight)) * nodeHeight);
      /*offsetY = (Math.ceil(offsetY / nodeHeight)) * nodeHeight;

      for(let i = 0; i < this.list.itemGroup.children.length; i++){
        let node = this.list.itemGroup.children[i];
        let control = node.control;
        node.position.y = control.startY + offsetY;
        control.calculateBox();
        //node.box.translate(new THREE.Vector2( offsetY))
      }
      this.list.cullOffscreen();*/

      this.list.scroll = Math.floor(this.list.maxScroll * this.scrollPos) || 0;
      this.list.updateList();

      let scrollThumbOffset = (this.extent.height - this.thumb.scale.y)
      this.thumb.position.y = scrollThumbOffset/2 - (scrollThumbOffset * this.list.scroll / this.list.maxScroll) || 0;

    }

  }

  getInnerSize2(){
    return {
      width: this.extent.width - 8,// + (this.padding * 2),
      height: this.extent.height - 8// + (this.padding * 2)
    };
  }

  calculatePosition(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    if(!(this.parent instanceof THREE.Scene)){
      parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      //parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x + this.offset.x;
      //parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y + this.offset.y;
      parentOffsetX = this.menu.tGuiPanel.worldPosition.x + this.offset.x;
      parentOffsetY = this.menu.tGuiPanel.worldPosition.y + this.offset.y;

    }else{
      parentOffsetX = parentOffsetY = 0;
    }

    let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
    let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

    if(this.list){
      if(this.list.isScrollBarLeft()){
        this.anchorOffset = {x: -(this.list.extent.width/2 - this.extent.width/2) + this.border.dimension/2, y: 0};
      }else{
        this.anchorOffset = {x: (this.list.extent.width/2 - this.extent.width/2) + this.border.dimension, y: 0};
      }      
    }else{
      this.anchorOffset = {x: 0, y: 0};
    }

    this.widget.position.x = this.anchorOffset.x;
    this.widget.position.y = this.anchorOffset.y;

    let worldPosition = this.parent.position.clone();
    let parentPos = this.worldPosition; //this.widget.getWorldPosition(new THREE.Vector3());
    //console.log('worldPos', worldPosition);
    this.box = new THREE.Box2(
      new THREE.Vector2(
        this.anchorOffset.x - this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y - (this.extent.height + 64)/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.anchorOffset.x + this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y + (this.extent.height + 64)/2 + worldPosition.y
      )
    );

    this.inner_box = new THREE.Box2(
      new THREE.Vector2(
        this.anchorOffset.x - this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y - (this.extent.height)/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.anchorOffset.x + this.extent.width/2 + worldPosition.x,
        this.anchorOffset.y + (this.extent.height)/2 + worldPosition.y
      )
    );
    if(this.thumb){
      this.thumb.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      );
    }

    if(this.upArrow){
      this.upArrow.updateBox();
    }

    if(this.downArrow){
      this.downArrow.updateBox();
    }

  }

  directionalNavigate(direction = ''){
    if(this.list instanceof GUIListBox){
      this.list.directionalNavigate(direction);
    }
  }

}

module.exports = GUIScrollBar;