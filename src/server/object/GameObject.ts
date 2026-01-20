import { ModuleObjectType } from "../../enums/module";

export class GameObject {
  id: number;
  type: ModuleObjectType;
  tag: string;

  static FromObjectListEntry(_entry: any) {

  }

}