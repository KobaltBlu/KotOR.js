/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUISlider class.
 */

class GUISlider extends GUIControl{

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);

    this.scrollPos = 0.5;
    this.scrollMax = 1;
    this.mouseOffset = {x: 0, y: 0};
    this.value = 0.50;
    this.onValueChanged = undefined;

    this.thumb = {
      texture: '',
      material: undefined,
      mesh: undefined,
      geometry: undefined
    };

    this.thumb.material = new THREE.SpriteMaterial( { map: null, color: new THREE.Color(0xFFFFFF) } );
    this.thumb.material.transparent = true;
    this.thumb.mesh = new THREE.Sprite( this.thumb.material );
    this.widget.add(this.thumb.mesh);

    this.thumb.mesh.addEventListener('click', (e) => {
      console.log('hello');
      this.mouseInside();
    });

    if(this.control.HasField('THUMB')){
      this._thumb = this.control.GetFieldByLabel('THUMB').GetChildStructs()[0];

      this.thumb.mesh.position.z = 2;
      this.thumb.mesh.name = 'SCROLLBAR thumb';
      this.thumb.mesh.scale.x = 8;
      this.thumb.mesh.scale.y = 32;

      let parentPos = this.widget.getWorldPosition(new THREE.Vector3());

      this.thumb.mesh.box = new THREE.Box2(
        new THREE.Vector2(
          (parentPos.x - this.extent.width/2),
          (parentPos.y - this.extent.height/2)
        ),
        new THREE.Vector2(
          (parentPos.x + this.extent.width/2),
          (parentPos.y + this.extent.height/2)
        )
      )

      if(this._thumb.HasField('IMAGE')){
        TextureLoader.enQueue(this._thumb.GetFieldByLabel('IMAGE').GetValue(), this.thumb.material, TextureLoader.Type.TEXTURE, () => {
          this.thumb.material.transparent = false;
          this.thumb.material.alphaTest = 0.5;
          this.thumb.material.needsUpdate = true;
        });
        TextureLoader.LoadQueue();
      }
    }

    this.addEventListener('mouseMove', () => {
      this.mouseInside();
    })

    this.addEventListener('click', () =>{
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);

      let scrollLeft = ( this.thumb.mesh.position.x + (this.thumb.mesh.scale.x / 2) ) + mouseX;
      this.mouseOffset.x = scrollLeft;
      this.mouseInside();
    });

    this.addEventListener('mouseDown', (e) => {
      e.stopPropagation();
      let mouseX = Mouse.Client.x - (window.innerWidth / 2);
      let scrollLeft = ( this.thumb.mesh.position.x + (this.thumb.mesh.scale.x / 2) ) + mouseX;
      this.mouseOffset.x = scrollLeft;
    });

    this.addEventListener('mouseUp', () => {
      this.mouseInside();
    });

    this.setValue(this.value);

  }

  onINIPropertyAttached(){
    if(this.iniProperty)
      this.setValue(this.iniProperty.value * .01);
  }

  mouseInside(){

    let mouseX = Mouse.Client.x - (window.innerWidth / 2);
    let scrollBarWidth = this.extent.width;
    let threshold = (this.extent.width - 8)/2;
    this.thumb.mesh.position.x = (mouseX + 21) + this.extent.width/2;

    if(this.thumb.mesh.position.x < -((scrollBarWidth - this.thumb.mesh.scale.x))/2 ){
      this.thumb.mesh.position.x = -((scrollBarWidth - this.thumb.mesh.scale.x))/2
    }

    if(this.thumb.mesh.position.x > ((scrollBarWidth - this.thumb.mesh.scale.x))/2 ){
      this.thumb.mesh.position.x = ((scrollBarWidth - this.thumb.mesh.scale.x))/2
    }

    //console.log((thumb.mesh.position.x + threshold) / threshold);

    let maxScroll = ((scrollBarWidth - this.thumb.mesh.scale.x)/2);
    scrollX = (this.thumb.mesh.position.x + maxScroll) / (maxScroll*2);
    let valueChanged = (scrollX != this.value);
    this.value = scrollX;

    if(this.iniProperty)
      this.iniProperty.value = parseInt(this.value * 100);

    if(valueChanged && typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

  }

  setValue(value = 0){

    this.value = value;
    let maxWidth = (this.extent.width - 8)
    let threshold = maxWidth/2;
    let thumbX = (maxWidth * value) - threshold;
    this.thumb.mesh.position.x = thumbX;

    if(this.iniProperty)
      this.iniProperty.value = parseInt(this.value * 100);
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

  }

}

module.exports = GUISlider;