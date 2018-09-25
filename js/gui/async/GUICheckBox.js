class GUICheckBox extends GUIControl{

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);

    this.value = false;
    this.onValueChanged = undefined;

    this.spriteStates = {
      normal: '',
      normalHover: '',
      selected: '',
      selectedHover: ''
    };

    //Selected
    this.hasSelected = control.HasField('SELECTED');
    if(this.hasSelected){
      let selected = control.GetFieldByLabel('SELECTED').GetChildStructs()[0];
      this.selected = {};

      if(selected.HasField('COLOR'))
        this.selected.color = selected.GetFieldByLabel('COLOR').GetVector();

      if(typeof this.selected.color !== 'undefined'){
        this.selected.color.x = 0.0;
        this.selected.color.y = 0.658824;
        this.selected.color.z = 0.980392;
      }

      this.selected.dimension = selected.GetFieldByLabel('DIMENSION').GetValue() || 0;
      this.selected.corner = selected.GetFieldByLabel('CORNER').GetValue();
      this.selected.edge = selected.GetFieldByLabel('EDGE').GetValue();
      this.selected.fill = selected.GetFieldByLabel('FILL').GetValue();
      this.selected.fillstyle = selected.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
      this.selected.inneroffset = selected.GetFieldByLabel('INNEROFFSET').GetValue() || 0;
      this.selected.pulsing = selected.GetFieldByLabel('PULSING').GetValue() || 0;

    }

    if(this.hasBorder){

      this.cbMaterial = new THREE.SpriteMaterial( { map: null, color: 0xffffff } );
      this.cbMaterial.transparent = true;
      this.cb = new THREE.Sprite( this.cbMaterial );
      this.widget.add(this.cb);
      this.cb.name = 'cb';
      this.cb.scale.x = 32;
      this.cb.scale.y = 32;
      this.cbMaterial.color.setRGB(this.text.color.x, this.text.color.y, this.text.color.z);

      let parentPos = this.widget.getWorldPosition(new THREE.Vector3());

      let maxWidth = (this.extent.width - this.cb.scale.x)
      let threshold = maxWidth/2;
      let cbX = (maxWidth * 0) - threshold;
      this.cb.position.x = cbX;

      this.cb.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      )

      if(this.border.fill){
        TextureLoader.enQueue(this.border.fill, this.cbMaterial, TextureLoader.Type.TEXTURE, (texture) => {
          this.spriteStates.normal = texture;
          this.cbMaterial.map = this.spriteStates.normal;
        });
      }

      if(this.selected.fill){
        TextureLoader.enQueue(this.selected.fill, this.cbMaterial, TextureLoader.Type.TEXTURE, (texture) => {
          this.spriteStates.selected = texture;
          this.cbMaterial.map = this.spriteStates.normal;
        });
      }

      TextureLoader.LoadQueue();

    }

    //unset the border so the background isn't set
    this.border.fill = '';

    this.onMouseMove = () => {
      //this.mouseInside();
    }

    this.onClick = () =>{
      /*let mouseX = Mouse.Client.x - (window.innerWidth / 2);

      let scrollLeft = ( this.thumb.position.x + (this.thumb.scale.x / 2) ) + mouseX;
      this.mouseOffset.x = scrollLeft;
      this.mouseInside();*/
    }

    this.onMouseDown = (e) => {
      e.stopPropagation();
      /*let scrollLeft = ( this.thumb.position.x + (this.thumb.scale.x / 2) ) + mouseX;
      this.mouseOffset.x = scrollLeft;*/
    };

    this.onMouseUp = () => {
      //this.mouseInside();
    };

  }

  setValue(value = 0){

    this.value = value;
    
    if(this.value){
      this.cbMaterial.map = this.spriteStates.selected;
    }else{
      this.cbMaterial.map = this.spriteStates.normal;
    }
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

  }

}

module.exports = GUICheckBox;