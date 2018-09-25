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

    this.extent.height -= (32*2);

    this.arrowTex = undefined;

    if(this.control.HasField('DIR')){
      this._dir = this.control.GetFieldByLabel('DIR').GetChildStructs()[0];
      if(this._dir.HasField('IMAGE')){
        TextureLoader.tpcLoader.fetch(this._dir.GetFieldByLabel('IMAGE').GetValue(), (texture) => {
          this.arrowTex = texture;
          console.log(this.arrowTex);
          //Up Arrow
          this.upArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.upArrowMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, map: this.arrowTex, side: THREE.DoubleSide} );
          this.upArrow = new THREE.Mesh( this.upArrowGeometry, this.upArrowMaterial );

          this.widget.add(this.upArrow);
          this.upArrow.name = 'SCROLLBAR up arrow';
          this.upArrow.scale.x = this.extent.width;
          this.upArrow.scale.y = this.extent.width;
          this.upArrow.position.z = 5;

          this.upArrow.position.y = this.extent.height/2 + 16/2;

          this.upArrowMaterial.transparent = true;
          this.upArrowMaterial.needsUpdate = true;

          let parentPos = this.widget.getWorldPosition(new THREE.Vector3());

          this.upArrow.box = new THREE.Box2(
            new THREE.Vector2(
              (parentPos.x - this.extent.width/2),
              (this.upArrow.position.y - 16/2)
            ),
            new THREE.Vector2(
              (parentPos.x + this.extent.width/2),
              (this.upArrow.position.y + 16/2)
            )
          )

          //Down Arrow
          this.downArrowGeometry = new THREE.PlaneGeometry( 1, 1, 1 );
          this.downArrowMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, map: this.arrowTex, side: THREE.DoubleSide} );
          this.downArrow = new THREE.Mesh( this.downArrowGeometry, this.downArrowMaterial );

          this.widget.add(this.downArrow);
          this.downArrow.name = 'SCROLLBAR up arrow';
          this.downArrow.scale.x = this.extent.width;
          this.downArrow.scale.y = this.extent.width;
          this.downArrow.position.z = 5;
          this.downArrow.position.y = -(this.extent.height/2 + 16/2);
          this.downArrow.rotation.z = Math.PI;

          parentPos = this.widget.getWorldPosition(new THREE.Vector3());

          this.downArrowMaterial.transparent = true;
          this.downArrowMaterial.needsUpdate = true;

          this.downArrow.box = new THREE.Box2(
            new THREE.Vector2(
              (parentPos.x - this.extent.width/2),
              (this.downArrow.position.y - 16/2)
            ),
            new THREE.Vector2(
              (parentPos.x + this.extent.width/2),
              (this.downArrow.position.y + 16/2)
            )
          )

        });
      }
    }

    if(this.control.HasField('THUMB')){
      this._thumb = this.control.GetFieldByLabel('THUMB').GetChildStructs()[0];
      /*this.thumbMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.thumbMaterial.transparent = true;
      this.thumb = new THREE.Sprite( this.thumbMaterial );*/

      this.geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      this.thumbMaterial = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
      this.thumb = new THREE.Mesh( this.geometry, this.thumbMaterial );

      this.widget.add(this.thumb);
      this.thumb.name = 'SCROLLBAR thumb';
      this.thumb.scale.x = this.extent.width/2;
      this.thumb.scale.y = this.extent.height/2;
      this.thumb.position.z = 5;

      let parentPos = this.widget.getWorldPosition(new THREE.Vector3());

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
        console.log('scroll thumb')
      };

      if(this._thumb.HasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.GetFieldByLabel('IMAGE').GetValue(), this.thumbMaterial, TextureLoader.Type.TEXTURE);
        TextureLoader.LoadQueue();
      }
    }

    this.onMouseMove = () => {
      if(this.inner_box.containsPoint(Game.mouseUI)){
        this.mouseInside();
      }
    }

    this.onClick = () =>{
      /*console.log('click')
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let mouseY = Mouse.Client.y - (window.innerHeight / 2);

      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      console.log(this.mouseOffset);
      if(this.inner_box.containsPoint(Game.mouseUI)){
        this.mouseInside();
      }else if(this.upArrow.containsPoint(Game.mouseUI)){
        this.list.scrollUp();
      }else if(this.downArrow.containsPoint(Game.mouseUI)){
        this.list.scrollDown();
      }*/
    }

    this.onMouseDown = (e) => {
      e.stopPropagation();
      let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      this.mouseOffset.y = scrollTop;
      console.log('hi', this.mouseOffset);
    };

    this.onMouseUp = () => {
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let mouseY = Mouse.Client.y - (window.innerHeight / 2);
      //let scrollTop = ( this.thumb.position.y + (this.thumb.scale.y / 2) ) + mouseY;
      //this.mouseOffset.y = scrollTop;
      console.log('blah');
      if(this.inner_box.containsPoint(Game.mouseUI)){
        console.log('scroll');
        this.mouseInside();
      }else if(this.upArrow.box.containsPoint(Game.mouseUI)){
        console.log('up');
        this.list.scrollUp();
      }else if(this.downArrow.box.containsPoint(Game.mouseUI)){
        console.log('down');
        this.list.scrollDown();
      }
    };

  }

  mouseInside(){

    let mouseX = Mouse.Client.x - (window.innerWidth / 2);
    let mouseY = Mouse.Client.y - (window.innerHeight / 2);
    //console.log(mouseY);
    //if(this.inner_box.containsPoint({x: mouseX, y: mouseY})){

      let centerPos = this.widget.getWorldPosition(new THREE.Vector3());

      let scrollBarHeight = this.extent.height;

      this.thumb.position.y = -(mouseY + this.thumb.scale.y/2) || 0;

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
        if(scaleY < 0.25)
          scaleY = 0.25;
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
  
    getBorderExtent(side = null){
      let extent = this.getControlExtent();
      let inner = this.getInnerSize2();
      let innerOffset = this.border.inneroffset;
      switch(side){
        case 'top':
          return {
            top: -( (inner.height/2) + (this.border.dimension) - innerOffset ), 
            left: 0, 
            width: inner.width - (innerOffset ),
            height: this.border.dimension
          };
        break;
        case 'bottom':
          return {
            top: (inner.height/2) + (this.border.dimension) - innerOffset, 
            left: 0, 
            width: inner.width - (innerOffset ),
            height: this.border.dimension
          };
        break;
        case 'left':
          return {
            top: 0, 
            left: -(inner.width/2) - (this.border.dimension) + innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.border.dimension
          };
        break;
        case 'right':
          return {
            top: 0, 
            left: (this.border.dimension) + (inner.width/2) - innerOffset, 
            width: inner.height - (innerOffset ),
            height: this.border.dimension
          };
        break;
        case 'topLeft':
          return {
            top: ((this.border.dimension) + (inner.height/2)) - innerOffset, 
            left: -((this.border.dimension) + (inner.width/2)) + innerOffset, 
            width: this.border.dimension,
            height: this.border.dimension
          };
        break;
        case 'topRight':
          return {
            top: ((this.border.dimension) + (inner.height/2)) - innerOffset, 
            left: ((this.border.dimension) + (inner.width/2)) - innerOffset, 
            width: this.border.dimension,
            height: this.border.dimension
          };
        break;
        case 'bottomLeft':
          return {
            top: -((this.border.dimension) + (inner.height/2)) + innerOffset, 
            left: -((this.border.dimension) + (inner.width/2)) + innerOffset, 
            width: this.border.dimension,
            height: this.border.dimension
          };
        break;
        case 'bottomRight':
          return {
            top: -((this.border.dimension) + (inner.height/2)) + innerOffset, 
            left: ((this.border.dimension) + (inner.width / 2)) - innerOffset, 
            width: this.border.dimension,
            height: this.border.dimension
          };
        break;
      }
    }

  calculatePosition(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    if(!(this.parent instanceof THREE.Scene)){
      parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x + this.offset.x;
      parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y + this.offset.y;

    }else{
      parentOffsetX = parentOffsetY = 0;
    }

    let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
    let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

    if(this.list){
      if(this.list.isScrollBarLeft()){
        this.anchorOffset = {x: -(this.list.extent.width/2), y: 0};
      }else{
        this.anchorOffset = {x: (this.list.extent.width/2), y: 0};
      }      
    }else{
      this.anchorOffset = {x: 0, y: 0};
    }

    this.widget.position.x = this.anchorOffset.x;
    this.widget.position.y = this.anchorOffset.y;

    let worldPosition = this.parent.position.clone();
    let parentPos = this.widget.getWorldPosition(new THREE.Vector3());
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

    if(this.downArrow){
      this.downArrow.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (this.downArrow.position.y - 16/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (this.downArrow.position.y + 16/2)
        )
      );
    }

    if(this.upArrow){
      this.upArrow.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (this.upArrow.position.y - 16/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (this.upArrow.position.y + 16/2)
        )
      );
    }

  }

}

module.exports = GUIScrollBar;