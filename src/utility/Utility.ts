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

  static BuildModulesList(onComplete?: Function){

    // fs.readdir(path.join(ApplicationProfile.directory, 'modules'), (err, files) => {

    //   let modules: string[] = [];
    //   for(let i = 0; i < files.length; i++){
    //     let fileInfo = path.parse(files[i]);
    //     if(fileInfo.base.includes('.rim') && !fileInfo.base.includes('_s.rim')){
    //       modules.push(fileInfo.base);
    //     }
    //   }

    //   let _data: any[] = [];

    //   let i = 0;
    //   let readModule = () => {
    //     let module = modules[i];
    //     new RIMObject(path.join(ApplicationProfile.directory, 'modules', module), (rim: RIMObject) => {

    //       for(let i = 0; i < rim.Resources.length; i++){
    //         const res = rim.Resources[i];
    //         switch(res.ResType){
    //           case ResourceTypes['are']:

    //             rim.getResourceBufferByResRef(res.ResRef, res.ResType, (data: Uint8Array) => {
    //               let are = new GFFObject(data, (gff: GFFObject) => {

    //                 let Name = gff.getFieldByLabel('Name').getCExoLocString();

    //                 _data.push({module: module, name: TLKManager.TLKStrings[Name.RESREF].Value, nameref: Name.RESREF});

    //                 i++;
    //                 if(i < modules.length){
    //                   readModule();
    //                 }else{
    //                   if(typeof onComplete === 'function')
    //                     onComplete(_data);
    //                 }
    //               });
    //             });

    //           break;
    //         }
    //       }

    //     });

    //   };
    //   readModule();

    // });

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

  static LineLineIntersection (a: number,b: number,c: number,d: number,p: number,q: number,r: number,s: number) {
    var det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
      return false;
    } else {
      lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
      gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };

  static THREELineLineIntersection (a: THREE.Line3, b: THREE.Line3) {
    var det, gamma, lambda;
    det = (a.end.x - a.start.x) * (b.end.y - b.start.y) - (b.end.x - b.start.x) * (a.end.y - a.start.y);
    if (det === 0) {
      return false;
    } else {
      lambda = ((b.end.y - b.start.y) * (b.end.x - a.start.x) + (b.start.x - b.end.x) * (b.end.y - a.start.y)) / det;
      gamma = ((a.start.y - a.end.y) * (b.end.x - a.start.x) + (a.end.x - a.start.x) * (b.end.y - a.start.y)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };

  /*static THREELineLineIntersection (l1, l2) {
    let a = l1.start;
    let b = l1.end;
    let c = l2.start;
    let d = l2.end;
    let denominator = ((b.X - a.X) * (d.Y - c.Y)) - ((b.Y - a.Y) * (d.X - c.X));
    let numerator1 = ((a.Y - c.Y) * (d.X - c.X)) - ((a.X - c.X) * (d.Y - c.Y));
    let numerator2 = ((a.Y - c.Y) * (b.X - a.X)) - ((a.X - c.X) * (b.Y - a.Y));

    // Detect coincident lines (has a problem, read below)
    if (denominator == 0) return numerator1 == 0 && numerator2 == 0;
    
    let r = numerator1 / denominator;
    let s = numerator2 / denominator;

    return (r >= 0 && r <= 1) && (s >= 0 && s <= 1);
  };

  static THREELineLineIntersection2 (a, b) {
    var det, gamma, lambda;
    det = (a.end.x - a.start.x) * (b.end.y - b.start.y) - (b.end.x - b.start.x) * (a.end.y - a.start.y);
    if (det === 0) {
      return false;
    } else {
      lambda = ((b.end.y - b.start.y) * (b.end.x - a.start.x) + (b.start.x - b.end.x) * (b.end.y - a.start.y)) / det;
      gamma = ((a.start.y - a.end.y) * (b.end.x - a.start.x) + (a.end.x - a.start.x) * (b.end.y - a.start.y)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };

  static THREELineLineIntersection3 ( a, b ){
    var P = a.start;
    var r = a.end;
    var Q = b.start;
    var s = b.end;

    var PQx = Q.x - P.x;
    var PQy = Q.y - P.y;
    var rx = r.x;
    var ry = r.y;
    var rxt = -ry;
    var ryt = rx;
    var qx = PQx * rx + PQy * ry;
    var qy = PQx * rxt + PQy * ryt;
    var sx = s.x * rx + s.y * ry;
    var sy = s.x * rxt + s.y * ryt;
    // if lines are identical or do not cross...
    if (sy == 0) return null;
    var a = qx - qy * sx / sy;
    return [ P.x + a * rx, P.y + a * ry ];
  };*/


  static ArrayMatch(array1: any[]|Uint8Array, array2: any[]|Uint8Array){
    return (array1.length == array2.length) && array1.every(function(element, index) {
      return element === array2[index];
    });
  }
  
  static TWO_PI = 2 * Math.PI;

}
