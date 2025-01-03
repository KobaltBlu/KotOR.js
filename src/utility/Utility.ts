import * as path from 'path';
import * as THREE from 'three';
import { GameFileSystem } from './GameFileSystem';

const PI: number = Math.PI;
const TWO_PI: number = Math.PI * 2;

export enum OdysseyPathLocation {
  archive = "archive",
  local = "local",
}

export interface OdysseyPathInfo {
  location: OdysseyPathLocation;
  path: string;
  pathInfo: path.ParsedPath;
  archive: OdysseyArchiveInfo;
  file: OdysseyFileInfo;
}

export interface OdysseyArchiveInfo {
  type: string;
  name: string;
}

export interface OdysseyFileInfo {
  name: string;
  ext: string;
}

/**
 * Utility class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Utility.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Utility {

  static bytesToSize(bytes: any) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  // /https://github.com/mattdesl/lerp/blob/master/index.js
  static lerp(v0: number = 0, v1: number = 0, t: number = 0) {
    return v0*(1-t)+v1*t
  }

  //https://github.com/vorg/interpolate-angle/blob/master/index.js
  static interpolateAngle(fromAngle: number = 0, toAngle: number = 0, t: number = 0) {
    fromAngle = (fromAngle + TWO_PI) % TWO_PI;
    toAngle = (toAngle + TWO_PI) % TWO_PI;

    var diff = Math.abs(fromAngle - toAngle);
    if (diff < PI) {
      return Utility.lerp(fromAngle, toAngle, t);
    }
    else {
      if (fromAngle > toAngle) {
        fromAngle = fromAngle - TWO_PI;
        return Utility.lerp(fromAngle, toAngle, t);
      }
      else if (toAngle > fromAngle) {
        toAngle = toAngle - TWO_PI;
        return Utility.lerp(fromAngle, toAngle, t);
      }
    }
  }

  static NormalizeRadian(fVal: number): number{
    return fVal - (Utility.TWO_PI) * Math.floor( (fVal + Math.PI) / (Utility.TWO_PI) )
  }

  static PadInt(num: number|string, size: number): string {
    let s = "000000000" + num;
    return s.substr(s.length-size);
  }

  static is2daNULL(str:string): boolean{

    if(str === null)
      return true;

    if(str === '****')
      return true;

    return false;

  }

  static FileExists(file: string, onComplete?: Function){
    if(file != null){
      GameFileSystem.exists(file).then( (exists) => {
        if(onComplete != null)
          onComplete(exists);
        // if(err == null) {
        //   if(onComplete != null)
        //     onComplete(true);
        // } else if(err.code == 'ENOENT') {
        //   if(onComplete != null)
        //     onComplete(false);
        // } else {
        //   if(onComplete != null)
        //     onComplete(false);
        // }
      });
    }else{
      if(onComplete != null)
        onComplete(false);
    }

  }

  //Determine if the file is on the hdd or in an archive

  /*

  ***Local Example***
  C:\waterfall.tga
  C:\images\biowarelogo.tpc

  ***Archive Example***
  bif.textures://waterfall.tga
  erf.swpc_tex_tpa://biowarelogo.tpc
  */

  static filePathInfo(filePath: string): OdysseyPathInfo {

    //isLocal
    if(filePath.indexOf(':\\') > -1){

      let filePathInfo = path.parse(filePath);

      let fileInfo = filePath.split('\\');
      fileInfo = fileInfo[fileInfo.length - 1].split('.');

      if(filePathInfo.ext.indexOf('.') == 0)
        filePathInfo.ext = filePathInfo.ext.substr(1, filePathInfo.ext.length - 1);

      return {
        location: OdysseyPathLocation.local,
        path: filePath,
        pathInfo: filePathInfo,
        file: {
          name: filePathInfo.name,
          ext: filePathInfo.ext
        }
      } as OdysseyPathInfo;
    }

    //isArchive
    else if(filePath.indexOf('://') > -1){

      let archivePath = filePath.split('://')[0];//.split('.');
      let resourcePath = filePath.split('://')[1];//.split('.');
      let archivePathInfo = path.parse(archivePath);
      let resourcePathInfo = path.parse(resourcePath);

      return {
        location: OdysseyPathLocation.archive,
        path: filePath,
        pathInfo: path.parse(filePath),
        archive: {
          type: archivePathInfo.name,
          name: archivePathInfo.ext,
        },
        file: {
          name: resourcePathInfo.name,
          ext: resourcePathInfo.ext
        }
      } as OdysseyPathInfo;

    }

    //possible relative filePath
    else{

    }

    return {} as OdysseyPathInfo;

  }

  static isPOW2(n: number): boolean{
    return false;
  }

  static calculateMipMaps(size = 1){

    if (typeof size !== 'number')
      throw 'Not a number';

    if(size < 1)
      throw 'The size cannot be smaller than 1';

    if(!Utility.isPOW2(size))
      throw 'The size must be Power of 2';

    let mipmaps = 1;
    while(size > 1){
      //console.log(size);
      mipmaps++;
      size = size >> 1;
    }
    return mipmaps;
  }
  
  static Distance2D(v0: THREE.Vector3|THREE.Vector2, v1: THREE.Vector3|THREE.Vector2){
    let dx = v0.x - v1.x, dy = v0.y - v1.y;
		return Math.abs(Math.sqrt( dx * dx + dy * dy ));
  }

  static LineLineIntersection (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    let det, gamma, lambda;
    det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
    if (det === 0)
      return false;

    lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
    gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  static THREELineLineIntersection (a: THREE.Line3, b: THREE.Line3) {
    let det, gamma, lambda;
    det = (a.end.x - a.start.x) * (b.end.y - b.start.y) - (b.end.x - b.start.x) * (a.end.y - a.start.y);
    if (det === 0)
      return false;

    lambda = ((b.end.y - b.start.y) * (b.end.x - a.start.x) + (b.start.x - b.end.x) * (b.end.y - a.start.y)) / det;
    gamma = ((a.start.y - a.end.y) * (b.end.x - a.start.x) + (a.end.x - a.start.x) * (b.end.y - a.start.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }

  static ArrayMatch(array1: any[]|Uint8Array, array2: any[]|Uint8Array){
    return (array1.length == array2.length) && array1.every(function(element, index) {
      return element === array2[index];
    });
  }
  
  static TWO_PI = 2 * Math.PI;

}
