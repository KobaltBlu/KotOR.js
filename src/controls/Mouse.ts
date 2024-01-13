import * as THREE from "three";
import type { GUIControl } from "../gui";
import { ResolutionManager } from "../managers/ResolutionManager";
import { MouseState } from "../enums/controls/MouseState";
import { MouseAxis } from "../enums/controls/MouseAxis";

/**
 * Mouse class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Mouse.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Mouse {
  static editor: any;
  static camera: any;
  static MouseX: number = 0;
  static MouseY: number = 0;
  static OldMouseX: number = 0;
  static OldMouseY: number = 0;
  static OffsetX: number = 0;
  static OffsetY: number = 0;
  static MouseDownX: number = 0;
  static MouseDownY: number = 0;
  static MouseDown: boolean = false;
  static ButtonState: MouseState;
  static MiddleMouseDown: boolean = false;
  static Dragging: boolean = false;
  static target: any;
  static CollisionPosition: THREE.Vector3 = new THREE.Vector3();
  static Vector: THREE.Vector2 = new THREE.Vector2();
  static Client: THREE.Vector2 = new THREE.Vector2();

  //button states
  static leftDown: boolean = false;
  static leftClick: boolean = false;
  static rightDown: boolean = false;
  static rightClick: boolean = false;

  //positions
  static position: THREE.Vector2 = new THREE.Vector2();

  //MouseEvent client x/y
  static positionWindow: THREE.Vector2 = new THREE.Vector2();

  //MouseEvent client x/y
  static positionViewport: THREE.Vector2 = new THREE.Vector2();

  //Game UI mouse position
  static positionUI: THREE.Vector2 = new THREE.Vector2();

  //UI Control State
  static downItem: GUIControl;
  static clickItem: GUIControl;

  constructor(){

  }

  static Update(x: number, y: number){
    Mouse.positionWindow.x = x;
    Mouse.positionWindow.y = y;

    const res = ResolutionManager.screenResolution;

    if(res.isDynamicRes){
      Mouse.positionViewport.x = x;
      Mouse.positionViewport.y = y;

      Mouse.position.x = Mouse.Vector.x = ( x / window.innerWidth ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( y / window.innerHeight ) * 2 + 1; 
      Mouse.positionUI.x = Mouse.Vector.x = ( x - (window.innerWidth/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( y -(window.innerHeight/2) ); 
    }else{
      Mouse.positionViewport.x = x - ((ResolutionManager.windowResolution.width/2) - ((res.width)/2));
      Mouse.positionViewport.y = y - ((ResolutionManager.windowResolution.height/2) - ((res.height)/2));

      Mouse.position.x = Mouse.Vector.x = ( Mouse.positionViewport.x / res.width ) * 2 - 1;
      Mouse.position.y = Mouse.Vector.y = - ( Mouse.positionViewport.y / res.height ) * 2 + 1; 
      Mouse.positionUI.x = Mouse.Vector.x = ( Mouse.positionViewport.x - (res.width/2) );
      Mouse.positionUI.y = Mouse.Vector.y = - ( Mouse.positionViewport.y -(res.height/2) ); 
    }
  }

  static getMouseAxis(axis: MouseAxis){
    if (axis == MouseAxis.X){
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
