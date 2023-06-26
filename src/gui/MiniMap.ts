import { AreaMap } from "../module";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { GUILabel } from "./";
import * as THREE from "three";

export class MiniMap {
  LBL_MAPVIEW: GUILabel;
  LBL_ARROW: GUILabel;

  texture: OdysseyTexture;
  areaMap: AreaMap;

  constructor(LBL_MAPVIEW: GUILabel, LBL_ARROW: GUILabel) {
    this.LBL_MAPVIEW = LBL_MAPVIEW;
    this.LBL_ARROW = LBL_ARROW;
  }

  setTexture(texture: OdysseyTexture){
    this.texture = texture;
    this.LBL_MAPVIEW.setFillTexture(texture);
    // texture.wrapS = THREE.RepeatWrapping;
    // texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.x = 0.234375
    texture.repeat.y = 0.46975;
  }

  setAreaMap(areaMap: AreaMap){
    this.areaMap = areaMap;
  }

  setPosition(x: number, y: number){
    if(!this.areaMap) return;

    this.texture = this.LBL_MAPVIEW.getFillTexture();
    if(!this.texture) return;

    let _worldPt1X = this.areaMap.worldPt1X;
    let _worldPt2X = this.areaMap.worldPt2X;
    let _worldPt1Y = this.areaMap.worldPt1Y;
    let _worldPt2Y = this.areaMap.worldPt2Y;
    let _mapPt1X = this.areaMap.mapPt1X;
    let _mapPt2X = this.areaMap.mapPt2X;
    let _mapPt1Y = this.areaMap.mapPt1Y;
    let _mapPt2Y = this.areaMap.mapPt2Y;

    this.texture.repeat.x = this.LBL_MAPVIEW.extent.width / this.texture.mipmaps[0].width;
    this.texture.repeat.y = this.LBL_MAPVIEW.extent.height / this.texture.mipmaps[0].height;

    switch(this.areaMap.northAxis){
      case 0:
        {
          let scaleY = (_mapPt1Y - _mapPt2Y) / (_worldPt1Y - _worldPt2Y);
          let scaleX = (_mapPt1X - _mapPt2X) / (_worldPt1X - _worldPt2X);

          this.texture.offset.x = (( x - _worldPt1X) * scaleX + _mapPt1X);
          this.texture.offset.y = ((-y - _worldPt1Y) * scaleY + _mapPt1Y);
        }
      break;
      case 3:
        {
          let scaleX = (_mapPt1Y - _mapPt2Y) / (_worldPt1X - _worldPt2X);
			    let scaleY = (_mapPt1X - _mapPt2X) / (_worldPt1Y - _worldPt2Y);

          this.texture.offset.x = ((y - _worldPt1Y) * scaleY + _mapPt1X);
          this.texture.offset.y = ((x - _worldPt1X) * scaleX + _mapPt1Y);
        }
      break;
    }
    
    this.texture.updateMatrix();
  }

  setRotation(angle: number){
    switch(this.areaMap.northAxis){
      case 0:
        {
          this.LBL_ARROW.widget.rotation.set(0, 0, angle);
        }
      break;
      case 3:
        {
          this.LBL_ARROW.widget.rotation.set(0, 0, angle - (Math.PI / 2));
        }
      break;
    }
  }

}
