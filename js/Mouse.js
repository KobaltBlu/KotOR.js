/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Mouse class.
 */

class Mouse {

  constructor(){

  }

  static Init(){
    Mouse.Axis = {
      X:1,
      Y:2
    };

    Mouse.State = {
      NONE: 0,
      LEFT: 1,
      MIDDLE: 2,
      RIGHT: 3
    };


    Mouse.editor = null;
    Mouse.camera = null;
    Mouse.MouseX = 0;
    Mouse.MouseY = 0;
    Mouse.OldMouseX = 0;
    Mouse.OldMouseY = 0;
    Mouse.OffsetX = 0;
    Mouse.OffsetY = 0;
    Mouse.MouseDownX = 0;
    Mouse.MouseDownY = 0;
    Mouse.MouseDown = false;
    Mouse.ButtonState = Mouse.State.None;
    Mouse.MiddleMouseDown = false;
    Mouse.Dragging = false;
    Mouse.target = null;

    Mouse.CollisionPosition = new THREE.Vector3();

    Mouse.Vector = new THREE.Vector2();
    Mouse.Client = new THREE.Vector2();

  }

  static Update(){

  }

  static getMouseAxis(axis){
    if (axis == Mouse.Axis.X){
      if (Mouse.MouseX == Mouse.OldMouseX)
        return 0;
      else if (Mouse.MouseX > Mouse.OldMouseX)
        return 1;

      return -1;
    }else{
      if (Mouse.MouseY == Mouse.OldMouseY)
        return 0;
      else if (Mouse.MouseY < Mouse.OldMouseY)
        return 1;

      return -1;
    }
  }

}

Mouse.Init();

module.exports = Mouse;
