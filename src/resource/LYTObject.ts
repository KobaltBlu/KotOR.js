import { ILayoutRoom } from "../interface/resource/ILayoutRoom";
import { ILayoutDoorHook } from "../interface/resource/ILayoutDoorHook";
import { ILayoutObstacle } from "../interface/resource/ILayoutObstacle";
import { ILayoutTrack } from "../interface/resource/ILayoutTrack";
import * as THREE from "three";

/**
 * LYTObject class.
 * 
 * Class representing a LYT file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LYTObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LYTObject {
  rooms: ILayoutRoom[];
  doorhooks: ILayoutDoorHook[];
  tracks: ILayoutTrack[];
  obstacles: ILayoutObstacle[];
  text: any;

  constructor( data?: Uint8Array ){

    if(typeof data == 'undefined')
      data = new Uint8Array(0);

    this.rooms = [];
    this.doorhooks = [];
    this.tracks = [];
    this.obstacles = [];

    let decoder = new TextDecoder('utf8');
    this.text = decoder.decode(data);
    let lines = this.text.split('\n');

    let MODES = {
      NONE: 0,
      ROOMS: 1,
      DOORS: 2,
      TRACKS: 3,
      OBSTACLES: 4
    }

    let mode = MODES.NONE;

    for(let i = 0; i < lines.length; i++){
      let line = lines[i];

      if(line.includes('roomcount')){
        mode = MODES.ROOMS;
      }else if(line.includes('trackcount')){
        mode = MODES.TRACKS;
      }else if(line.includes('obstaclecount')){
        mode = MODES.OBSTACLES;
      }else if(line.includes('doorhookcount')){
        mode = MODES.DOORS;
      }else if(line.includes('donelayout') || line.includes('beginlayout')){
        mode = MODES.NONE;
      }else if (i == 0 || i == 1){
        //SKIP
      }else{
        let params = line.trim().split(' ');
        switch(mode){
          case MODES.ROOMS:
            this.rooms.push({
              name: params[0].toLowerCase(),
              position: new THREE.Vector3(params[1], params[2], params[3])
            });
          break;
          case MODES.TRACKS:
            this.tracks.push({
              name: params[0].toLowerCase(),
              position: new THREE.Vector3(params[1], params[2], params[3])
            });
          break;
          case MODES.OBSTACLES:
            this.obstacles.push({
              name: params[0].toLowerCase(),
              position: new THREE.Vector3(params[1], params[2], params[3])
            });
          break;
          case MODES.DOORS:
            this.doorhooks.push({
              room: params[0].toLowerCase(),
              name: params[1].toLowerCase(),
              position: new THREE.Vector3(params[1], params[2], params[3]),
              quaternion: new THREE.Quaternion(params[4], params[5], params[6], params[7])
            });
          break;
        }
      }

    }

  }

}
