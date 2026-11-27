import { GFFDataType } from '@core/enums/resource/GFFDataType';
import type { GameObject } from '@engine/module/GameObject';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { NWScript } from '@engine/nwscript/NWScript';
import { GFFField } from '@core/resource/GFFField';
import type { GFFStruct } from '@core/resource/GFFStruct';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectHydrationService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  /**
   * object.area_id for save export — area game ObjectId, not ARE template ID.
   */
  getSaveAreaId(): number {
    return (this.host.area?.id ?? 0) >>> 0;
  }

  getSWVarTableSaveStruct(){
    return SwVarTableSerializer.serialize(this.host);
  }

  /**
   * Load named VarTable from a GFF LIST field.
   */
  loadNamedVarTable(field?: GFFField){
    this.host.scriptVarTable.loadFromListField(field);
  }

  /**
   * Write named VarTable into a new LIST field on the given parent struct/root.
   */
  writeNamedVarTable(parent: GFFStruct): GFFField {
    const list = parent.addField(new GFFField(GFFDataType.LIST, 'VarTable'));
    this.host.scriptVarTable.writeToListField(list);
    return list;
  }

  /**
   * Copy TemplateResRef / ResRef from the load buffer before merge decisions.
   * Safe to call before initProperties.
   */
  seedResRefsFromTemplate(){
    const root = this.host.template?.RootNode;
    if(!root){ return; }
    if(!this.host.templateResRef && root.hasField('TemplateResRef')){
      this.host.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
    if(!this.host.resRef && root.hasField('ResRef')){
      this.host.resRef = root.getFieldByLabel('ResRef').getValue() || '';
    }
  }

  /**
   * Hydrate script-hook resrefs from a GFF struct once (init/load phase only).
   * @param scriptsNode Root or nested Scripts struct
   * @param scriptKeys GFF field labels / ScriptHook keys
   * @param defaultResRef when set, missing fields get this value (doors use "default")
   */
  hydrateScriptResRefsFromStruct(scriptsNode: { hasField?: (k: string) => boolean; getFieldByLabel?: (k: string) => { getValue: () => any } } | undefined, scriptKeys: string[], defaultResRef?: string){
    if(!scriptsNode?.hasField || !scriptsNode?.getFieldByLabel){ return; }
    for(const scriptKey of scriptKeys){
      if(typeof this.host.scriptResRefs[scriptKey] === 'string'){ continue; }
      if(scriptsNode.hasField(scriptKey)){
        this.host.scriptResRefs[scriptKey] = String(scriptsNode.getFieldByLabel(scriptKey).getValue() ?? '');
      }else if(defaultResRef !== undefined){
        this.host.scriptResRefs[scriptKey] = defaultResRef;
      }
    }
  }

  /**
   * Hydrate script-hook resrefs from this.template.RootNode (init/load phase only).
   */
  hydrateScriptResRefsFromTemplate(scriptKeys: string[], defaultResRef?: string){
    this.hydrateScriptResRefsFromStruct(this.host.template?.RootNode, scriptKeys, defaultResRef);
  }

  /**
   * Bind NWScript instances from already-hydrated scriptResRefs.
   */
  bindScriptsFromResRefs(scriptKeys: string[], warnLabel?: string){
    for(const scriptKey of scriptKeys){
      const resRef = this.host.scriptResRefs[scriptKey];
      if(!resRef){ continue; }
      const nwscript = NWScript.Load(resRef);
      if(!nwscript){
        if(warnLabel){
          console.warn(`${warnLabel}: Failed to load script [${scriptKey}]:${resRef} for object ${this.host.name}`);
        }
        continue;
      }
      nwscript.bindOwner(this.host, scriptKey);
      this.host.scripts[scriptKey] = nwscript;
    }
  }
}
