import { GameEffect } from ".";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { EffectIconListItem } from "../interface/module/EffectIconListItem";
import { TextureLoader } from "../loaders/TextureLoader";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleObject } from "../module";
import { OdysseyTexture } from "../resource/OdysseyTexture";

export class EffectIcon extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectIcon;
    
    //intList[0] : icon id

  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    const featIconId = this.getInt(0);
    if(this.object instanceof ModuleObject){
      const iconExists = this.object.effectIconList.find( (effectIcon: EffectIconListItem) => {
        return effectIcon.id == featIconId;
      });
      if(!iconExists){
        const featIcon2DA = TwoDAManager.datatables.get('featicon');
        if(featIcon2DA){
          const featIconRow = featIcon2DA.rows[featIconId];
          if(featIconRow){
            const iconResRef: string = featIconRow['iconresref'];
            const good: boolean = featIconRow['good'] ? true : false;
            // const description: string = featIconRow['description'];
            const priority: number = parseInt(featIconRow['priority']);

            const icon: EffectIconListItem = {
              id: featIconId,
              resref: iconResRef,
              good: good,
              priority: priority
            };
            this.object.effectIconList.push(icon)
            TextureLoader.Load(iconResRef, (texture: OdysseyTexture) => {
              icon.texture = texture;
            });
          }
        }
      }
    }
  }

  onRemove(): void {
    super.onRemove();
    const featIconId = this.getInt(0);
    if(this.object instanceof ModuleObject){
      const icon = this.object.effectIconList.find( (effectIcon: EffectIconListItem) => {
        return effectIcon.id == featIconId;
      });
      if(icon){
        const idx = this.object.effectIconList.indexOf(icon);
        if(idx >= 0) this.object.effectIconList.splice( idx, 1 );
        if(icon.texture){
          icon.texture.dispose();
        }
      }
    }
  }

}

