/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIProgressBar class.
 */

class GUIProgressBar extends GUIControl {

  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);

    this.startFromLeft = ( control.HasField('STARTFROMLEFT') ? control.GetFieldByLabel('STARTFROMLEFT').GetValue() : 0 );
    this.curValue = ( control.HasField('CURVALUE') ? control.GetFieldByLabel('CURVALUE').GetValue() : 0 );
    this.maxValue = ( control.HasField('MAXVALUE') ? control.GetFieldByLabel('MAXVALUE').GetValue() : 0 );

    let progress = ( control.HasField('PROGRESS') ? control.GetFieldByLabel('PROGRESS').GetChildStructs()[0] : null );

    if(progress){
      this.border.fill = ( progress.HasField('FILL') ? progress.GetFieldByLabel('FILL').GetValue() : '' );
    }

    this.progress = 0;

  }

  setProgress(val = 100){

    this.curValue = val;
    let value = this.curValue / this.maxValue;

    let extent = this.getFillExtent();
    let sprite = this.widget.fill.children[0];

    if(extent.width > extent.height){
      sprite.scale.set( extent.width * value, extent.height, 1.0 );
      let offsetX = (extent.width -(extent.width * value))/2;
      if(this.startFromLeft)
        sprite.position.x = -offsetX;
      else
        sprite.position.x = +offsetX;
    }else{
      sprite.scale.set( extent.width, extent.height * value, 1.0 );
      let offsetY = (extent.height -(extent.height * value))/2;
      if(this.startFromLeft)
        sprite.position.y = +offsetY;
      else
        sprite.position.y = -offsetY;
    }
    
    sprite.material.opacity = 1;
    sprite.material.transparent = true;

  }

  _onCreate(){
    super._onCreate();

    let extent = this.getFillExtent();
    let sprite = this.widget.fill.children[0];
    //sprite.material.color = new THREE.Color(0.0, 0.658824, 0.980392);

    this.setProgress(this.curValue);
    
  }

}

module.exports = GUIProgressBar;