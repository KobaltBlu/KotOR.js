/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { StringDecoder } from "string_decoder";
import { LayoutRoom } from "../interface/resource/LayoutRoom";
import { LayoutDoorHook } from "../interface/resource/LayoutDoorHook";
import { LayoutObstacle } from "../interface/resource/LayoutObstacle";
import { LayoutTrack } from "../interface/resource/LayoutTrack";
import * as THREE from "three";

/* @file
 * The LYTObject class.
 */

export class LYTObject {
  rooms: LayoutRoom[];
  doorhooks: LayoutDoorHook[];
  tracks: LayoutTrack[];
  obstacles: LayoutObstacle[];
  text: any;

  constructor( data?: Buffer ){

    if(typeof data == 'undefined')
      data = Buffer.alloc(0);

    this.rooms = [];
    this.doorhooks = [];
    this.tracks = [];
    this.obstacles = [];

    let decoder = new StringDecoder('utf8');
    this.text = decoder.write(data);
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
