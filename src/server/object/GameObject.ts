import { ModuleObjectType } from "@/enums/module";

export interface IObjectListEntry {
  id?: number;
  type?: ModuleObjectType;
  tag?: string;
}

export class GameObject {
  id: number;
  type: ModuleObjectType;
  tag: string;

  static FromObjectListEntry(_entry: IObjectListEntry): void {
    // TODO: implement when server object list is used
  }
}