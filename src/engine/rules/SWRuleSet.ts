import { CreatureClass } from "../../combat/CreatureClass";
import { TwoDAManager } from "../../managers/TwoDAManager";
import { SWRace } from "./SWRace";
import { SWEffectIcon } from "./SWEffectIcon";
import { SWItemPropsDef } from "./SWItemPropsDef";

export class SWRuleSet {

  static classes: CreatureClass[] = [];
  static classCount: number = 0;

  static racialtypes: SWRace[] = [];
  static racialTypeCount: number = 0;

  static effectIcons: SWEffectIcon[] = [];
  static effectIconCount: number = 0;

  static itemPropsDef: SWItemPropsDef[] = [];

  static Init(){

    const classes = TwoDAManager.datatables.get('classes');
    if(classes){
      SWRuleSet.classCount = classes.RowCount;
      SWRuleSet.classes = new Array(SWRuleSet.classCount);
      for(let i = 0; i < classes.RowCount; i++){
        SWRuleSet.classes[i] = CreatureClass.From2DA(classes.rows[i]);
      }
    }

    const racialtypes = TwoDAManager.datatables.get('racialtypes');
    if(racialtypes){
      SWRuleSet.racialTypeCount = racialtypes.RowCount;
      SWRuleSet.racialtypes = new Array(SWRuleSet.racialTypeCount);
      for(let i = 0; i < racialtypes.RowCount; i++){
        SWRuleSet.racialtypes[i] = SWRace.From2DA(racialtypes.rows[i]);
      }
    }

    const effectIcons = TwoDAManager.datatables.get('effecticon');
    if(effectIcons){
      SWRuleSet.effectIconCount = effectIcons.RowCount;
      SWRuleSet.racialtypes = new Array(SWRuleSet.effectIconCount);
      for(let i = 0; i < effectIcons.RowCount; i++){
        SWRuleSet.effectIcons[i] = SWEffectIcon.From2DA(effectIcons.rows[i]);
      }
    }

    const itemProps = TwoDAManager.datatables.get('itempropsdef');
    if(itemProps){
      SWRuleSet.itemPropsDef = new Array(itemProps.RowCount);
      for(let i = 0; i < itemProps.RowCount; i++){
        SWRuleSet.itemPropsDef[i] = SWItemPropsDef.From2DA(itemProps.rows[i]);
      }
    }

  }

}