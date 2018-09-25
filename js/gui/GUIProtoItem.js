/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIProtoItem class.
 */

class GUIProtoItem extends GUIControl{

  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);
    this.list = null;

  }

  setList(list = null){
    this.list = list;
  }

  calculatePosition(){
    let parentExtent = { width: this.menu.width, height: this.menu.height };
    let parentOffsetX, parentOffsetY;
    if(!(this.parent instanceof THREE.Scene)){
      parentExtent = this.menu.tGuiPanel.extent;
      //console.log(this.parent)
      parentOffsetX = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).x;
      parentOffsetY = this.menu.tGuiPanel.widget.getWorldPosition(new THREE.Vector3()).y;

    }else{
      parentOffsetX = parentOffsetY = 0;
    }

    let wRatio = window.innerWidth / this.menu.tGuiPanel.extent.width;
    let hRatio = window.innerHeight / this.menu.tGuiPanel.extent.height;

    //let posX = (this.extent.left - ( (parentExtent.width  - this.extent.width) / 2 ) );

    let listIndex = this.list.children.indexOf(this);
    console.log('List Index', listIndex);

    let posX = -(this.list.extent.left - this.extent.left)/2;

    if(!this.list.isScrollBarLeft()){
      posX = posX * -1;
    }

    let height = this.getItemHeight();
    let posY = this.list.extent.height/2 - (height + this.list.lastHeight);//((this.list.extent.height - 4) + ( (height - 4) - ((this.extent.height) * listIndex) ));
    posY += height/2;
    this.list.lastHeight += height;
    this.startX = posX;
    this.startY = posY;
    this.anchor = 'none';
    this.anchorOffset = {x: posX, y: posY};

    this.widget.position.x = this.anchorOffset.x;
    this.widget.position.y = this.anchorOffset.y;
    
    this.calculateBox();

  }

  getItemHeight(){
    let height = 0;

    let cHeight = (this.extent.height + (this.getBorderSize()/2));

    if(this.textGeometry){
      this.textGeometry.computeBoundingBox();
      let tSize = this.textGeometry.boundingBox.getSize();
      if(tSize.y > cHeight){
        cHeight = tSize.y/2;
      }
    }
    height += cHeight;
    return height;
  }

  calculateBox(){
    let worldPosition = this.parent.position.clone();
    //console.log('worldPos', worldPosition);
    this.box = new THREE.Box2(
      new THREE.Vector2(
        this.widget.position.x - this.extent.width/2 + worldPosition.x,
        this.widget.position.y - this.extent.height/2 + worldPosition.y
      ),
      new THREE.Vector2(
        this.widget.position.x + this.extent.width/2 + worldPosition.x,
        this.widget.position.y + this.extent.height/2 + worldPosition.y
      )
    );
  }

}

module.exports = GUIProtoItem;