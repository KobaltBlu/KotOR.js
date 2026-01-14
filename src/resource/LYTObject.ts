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
  filedependancy: string;
  text: any;

  constructor( data?: Uint8Array ){

    if(typeof data == 'undefined')
      data = new Uint8Array(0);

    this.rooms = [];
    this.doorhooks = [];
    this.tracks = [];
    this.obstacles = [];
    this.filedependancy = '';

    let decoder = new TextDecoder('utf8');
    this.text = decoder.decode(data);
    
    this._parse(this.text);

  }

  private _tokenize(text: string): Array<{type: string, value: string, line: number, tokens?: string[]}> {
    const lines = text.split('\n');
    const tokens: Array<{type: string, value: string, line: number, tokens?: string[]}> = [];

    for(let i = 0; i < lines.length; i++){
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Skip empty lines
      if(line.length === 0){
        continue;
      }

      // Token types
      if(line === '#MAXLAYOUT ASCII'){
        tokens.push({ type: 'HEADER', value: line, line: lineNum });
      } else if(line.startsWith('filedependancy ')){
        const value = line.substring('filedependancy '.length);
        tokens.push({ type: 'FILEDEPENDANCY', value: value, line: lineNum });
      } else if(line === 'beginlayout'){
        tokens.push({ type: 'BEGIN_LAYOUT', value: line, line: lineNum });
      } else if(line === 'donelayout'){
        tokens.push({ type: 'DONE_LAYOUT', value: line, line: lineNum });
      } else if(line.startsWith('   roomcount ')){
        const count = line.substring('   roomcount '.length).trim();
        tokens.push({ type: 'ROOM_COUNT', value: count, line: lineNum });
      } else if(line.startsWith('   trackcount ')){
        const count = line.substring('   trackcount '.length).trim();
        tokens.push({ type: 'TRACK_COUNT', value: count, line: lineNum });
      } else if(line.startsWith('   obstaclecount ')){
        const count = line.substring('   obstaclecount '.length).trim();
        tokens.push({ type: 'OBSTACLE_COUNT', value: count, line: lineNum });
      } else if(line.startsWith('   doorhookcount ')){
        const count = line.substring('   doorhookcount '.length).trim();
        tokens.push({ type: 'DOORHOOK_COUNT', value: count, line: lineNum });
      } else if(line.startsWith('      ')){
        // Data line (6 spaces indent)
        const parts = line.substring(6).split(/\s+/).filter((p: string) => p.length > 0);
        tokens.push({ type: 'DATA', value: line, line: lineNum, tokens: parts });
      } else {
        // Unknown token - could be error or comment
        tokens.push({ type: 'UNKNOWN', value: line, line: lineNum });
      }
    }

    return tokens;
  }

  private _parse(text: string): void {
    const tokens = this._tokenize(text);
    
    let mode: 'NONE' | 'ROOMS' | 'TRACKS' | 'OBSTACLES' | 'DOORS' = 'NONE';
    let inLayout = false;

    for(const token of tokens){
      switch(token.type){
        case 'HEADER':
          // Validate header
          break;
        
        case 'FILEDEPENDANCY':
          this.filedependancy = token.value;
          break;
        
        case 'BEGIN_LAYOUT':
          inLayout = true;
          break;
        
        case 'DONE_LAYOUT':
          inLayout = false;
          mode = 'NONE';
          break;
        
        case 'ROOM_COUNT':
          if(!inLayout){
            throw new Error(`Unexpected roomcount at line ${token.line}: not inside layout section`);
          }
          mode = 'ROOMS';
          break;
        
        case 'TRACK_COUNT':
          if(!inLayout){
            throw new Error(`Unexpected trackcount at line ${token.line}: not inside layout section`);
          }
          mode = 'TRACKS';
          break;
        
        case 'OBSTACLE_COUNT':
          if(!inLayout){
            throw new Error(`Unexpected obstaclecount at line ${token.line}: not inside layout section`);
          }
          mode = 'OBSTACLES';
          break;
        
        case 'DOORHOOK_COUNT':
          if(!inLayout){
            throw new Error(`Unexpected doorhookcount at line ${token.line}: not inside layout section`);
          }
          mode = 'DOORS';
          break;
        
        case 'DATA':
          if(!inLayout){
            continue; // Skip data outside layout section
          }
          
          if(!token.tokens || token.tokens.length === 0){
            continue;
          }

          const params = token.tokens;

          switch(mode){
            case 'ROOMS':
              if(params.length >= 4){
                this.rooms.push({
                  name: params[0],
                  position: new THREE.Vector3(
                    parseFloat(params[1]),
                    parseFloat(params[2]),
                    parseFloat(params[3])
                  )
                });
              } else {
                throw new Error(`Invalid room data at line ${token.line}: expected 4 values, got ${params.length}`);
              }
              break;
            
            case 'TRACKS':
              if(params.length >= 4){
                this.tracks.push({
                  name: params[0],
                  position: new THREE.Vector3(
                    parseFloat(params[1]),
                    parseFloat(params[2]),
                    parseFloat(params[3])
                  )
                });
              } else {
                throw new Error(`Invalid track data at line ${token.line}: expected 4 values, got ${params.length}`);
              }
              break;
            
            case 'OBSTACLES':
              if(params.length >= 4){
                this.obstacles.push({
                  name: params[0],
                  position: new THREE.Vector3(
                    parseFloat(params[1]),
                    parseFloat(params[2]),
                    parseFloat(params[3])
                  )
                });
              } else {
                throw new Error(`Invalid obstacle data at line ${token.line}: expected 4 values, got ${params.length}`);
              }
              break;
            
            case 'DOORS':
              // Format: room_name door_name number x y z qx qy qz qw
              if(params.length >= 10){
                this.doorhooks.push({
                  room: params[0],
                  name: params[1],
                  position: new THREE.Vector3(
                    parseFloat(params[3]),
                    parseFloat(params[4]),
                    parseFloat(params[5])
                  ),
                  quaternion: new THREE.Quaternion(
                    parseFloat(params[6]),
                    parseFloat(params[7]),
                    parseFloat(params[8]),
                    parseFloat(params[9])
                  )
                });
              } else {
                throw new Error(`Invalid doorhook data at line ${token.line}: expected 10 values, got ${params.length}`);
              }
              break;
            
            case 'NONE':
              // Data line but no active mode - might be valid, just skip
              break;
          }
          break;
        
        case 'UNKNOWN':
          // Unknown tokens are ignored (could be comments or future extensions)
          break;
      }
    }
  }

  export(){
    let encoder = new TextEncoder();
    let text = '';
    
    // Header
    text += '#MAXLAYOUT ASCII\n';
    
    // File dependency
    if(this.filedependancy){
      text += 'filedependancy ' + this.filedependancy + '\n';
    }
    
    // Begin layout
    text += 'beginlayout\n';
    
    // Rooms section
    text += '   roomcount ' + this.rooms.length + '\n';
    for(let i = 0; i < this.rooms.length; i++){
      text += '      ' + this.rooms[i].name + ' ' + this.rooms[i].position.x + ' ' + this.rooms[i].position.y + ' ' + this.rooms[i].position.z + '\n';
    }
    
    // Tracks section
    text += '   trackcount ' + this.tracks.length + '\n';
    for(let i = 0; i < this.tracks.length; i++){
      text += '      ' + this.tracks[i].name + ' ' + this.tracks[i].position.x + ' ' + this.tracks[i].position.y + ' ' + this.tracks[i].position.z + '\n';
    }
    
    // Obstacles section
    text += '   obstaclecount ' + this.obstacles.length + '\n';
    for(let i = 0; i < this.obstacles.length; i++){
      text += '      ' + this.obstacles[i].name + ' ' + this.obstacles[i].position.x + ' ' + this.obstacles[i].position.y + ' ' + this.obstacles[i].position.z + '\n';
    }
    
    // Door hooks section
    text += '   doorhookcount ' + this.doorhooks.length + '\n';
    for(let i = 0; i < this.doorhooks.length; i++){
      text += '      ' + this.doorhooks[i].room + ' ' + this.doorhooks[i].name + ' 0 ' + 
              this.doorhooks[i].position.x + ' ' + this.doorhooks[i].position.y + ' ' + this.doorhooks[i].position.z + ' ' + 
              this.doorhooks[i].quaternion.x + ' ' + this.doorhooks[i].quaternion.y + ' ' + this.doorhooks[i].quaternion.z + ' ' + this.doorhooks[i].quaternion.w + '\n';
    }
    
    // End layout
    text += 'donelayout\n';
    
    return encoder.encode(text);
  }

}
