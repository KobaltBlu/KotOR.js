/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIButton class.
 */

class GUIButton extends GUIControl {
  
  constructor(menu = null, control = null, parent = null, scale = false){
    
    super(menu, control, parent, scale);
    //this.widget.position.z = -2; 
  }

  onHoverIn(){
    super.onHoverIn();

    this.pulsing = true;
    this.text.color.setRGB(1, 1, 0);
    this.text.material.color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

  onHoverOut(){
    super.onHoverOut();

    this.pulsing = false;
    this.text.color.setRGB(0, 0.658824, 0.980392);
    this.text.material.color = this.text.color;
    this.text.material.needsUpdate = true;
    
  }

}

module.exports = GUIButton;