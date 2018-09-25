/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUIPanel class.
 */

class GUIPanel extends GUIControl {
  
  constructor(control = null, parent = null){
    
    super(control, parent);

  }


  createControl(){

    

    return this.widget;

  }

}