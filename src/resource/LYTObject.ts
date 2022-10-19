/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { StringDecoder } from "string_decoder";

/* @file
 * The LYTObject class.
 */

export class LYTObject {
  rooms: any[];
  doorhooks: any[];
  tracks: any[];
  obstacles: any[];
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
              x: params[1],
              y: params[2],
              z: params[3]
            });
          break;
          case MODES.TRACKS:
            this.tracks.push({
              name: params[0].toLowerCase(),
              x: params[1],
              y: params[2],
              z: params[3]
            });
          break;
          case MODES.OBSTACLES:
            this.obstacles.push({
              name: params[0].toLowerCase(),
              x: params[1],
              y: params[2],
              z: params[3]
            });
          break;
          case MODES.DOORS:
            this.doorhooks.push({
              room: params[0].toLowerCase(),
              name: params[1].toLowerCase(),
              x: params[2],
              y: params[3],
              z: params[4]
            });
          break;
        }
      }

    }

  }

}
