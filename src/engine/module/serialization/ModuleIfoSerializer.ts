import { ScriptHook } from '@core/enums/module/ScriptHook';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { CExoLocString } from '@core/resource/CExoLocString';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GameState } from '@engine/runtime/GameState';
import { gffRootOf } from '@engine/module/serialization/types';
import { readResRef, readString } from '@engine/module/serialization/gffHelpers';

export class ModuleIfoSerializer {
  static serialize(module: any, options: { isSaveGame: boolean }): GFFObject {
    const ifo = new GFFObject();
    ifo.FileType = 'IFO ';

    const creatureList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Creature List'));
    for (let i = 0; i < module.limboCreatures.length; i++) {
      const creature = module.limboCreatures[i];
      if (!creature) continue;
      const root = creature.save().RootNode;
      root.setType(4);
      creatureList.addChildStruct(root);
    }

    const eventQueue = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'EventQueue'));
    for (let i = 0; i < module.eventQueue.length; i++) {
      const event = module.eventQueue[i];
      if (!event) continue;
      const exported = event.export();
      if (exported) {
        eventQueue.addChildStruct(exported);
      }
    }

    const areaList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_Area_list'));
    if (module.area) {
      areaList.addChildStruct(module.area.saveAreaListStruct());
      module.area.save();
    }

    ifo.RootNode.addField(new GFFField(GFFDataType.INT, 'Mod_Creator_ID')).setValue(module.creatorId);
    const cutSceneList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_CutSceneList'));
    for (let i = 0; i < module.cutSceneList.length; i++) {
      const entry = module.cutSceneList[i];
      const csStruct = new GFFStruct(1);
      csStruct.addField(new GFFField(GFFDataType.RESREF, 'CutScene_Name')).setValue(entry.name || '');
      csStruct.addField(new GFFField(GFFDataType.DWORD, 'CutScene_ID')).setValue(entry.id | 0);
      cutSceneList.addChildStruct(csStruct);
    }
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_DawnHour')).setValue(module.timeManager.dawnHour);
    ifo.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description')).setValue(module.description);
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_DuskHour')).setValue(module.timeManager.duskHour);
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD64, 'Mod_Effect_NxtId')).setValue(module.effectNextId);
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area')).setValue(module.entryArea);
    ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X')).setValue(module.entryDirectionX);
    ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y')).setValue(module.entryDirectionY);
    ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X')).setValue(module.entryX);
    ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y')).setValue(module.entryY);
    ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z')).setValue(module.entryZ);
    ifo.RootNode.addField(new GFFField(GFFDataType.WORD, 'Expansion_Pack')).setValue(module.expansionPack | 0);
    const expanList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_Expan_List'));
    for (let i = 0; i < module.expansionList.length; i++) {
      const entry = module.expansionList[i];
      const exStruct = new GFFStruct(0);
      exStruct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Expansion_Name')).setValue(
        entry.name || new CExoLocString(),
      );
      exStruct.addField(new GFFField(GFFDataType.INT, 'Expansion_ID')).setValue(entry.id | 0);
      expanList.addChildStruct(exStruct);
    }
    ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak')).setValue(module.hak);
    const modIdField = ifo.RootNode.addField(new GFFField(GFFDataType.VOID, 'Mod_ID'));
    modIdField.setData(
      module.id instanceof Uint8Array && module.id.length ? module.id : new Uint8Array(16),
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_IsNWMFile')).setValue(0);
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame')).setValue(
      options.isSaveGame ? 1 : 0,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour')).setValue(
      module.timeManager.minutesPerHour,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name')).setValue(module.name);
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_NextCharId0')).setValue(module.nextCharId0);
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_NextCharId1')).setValue(module.nextCharId1);
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_NextObjId0')).setValue(module.nextObjId0);
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_NextObjId1')).setValue(module.nextObjId1);
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerAcquireItem]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerActivateItem]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerClientEnter]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerClientLeave]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat')).setValue(
      module.scripts[ScriptHook.ModuleOnHeartbeat]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad')).setValue(
      module.scripts[ScriptHook.ModuleOnLoad]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnModStart')).setValue(
      module.scripts[ScriptHook.ModuleOnStart]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerDeath]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerDying]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerLevelUp]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest')).setValue(
      module.scripts[ScriptHook.ModuleOnPlayerRest]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn')).setValue(
      module.scripts[ScriptHook.ModuleOnSpawnButtonDown]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem')).setValue(
      module.scripts[ScriptHook.ModuleOnUnAcquireItem]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined')).setValue(
      module.scripts[ScriptHook.ModuleOnUserDefined]?.name || '',
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_PauseDay')).setValue(
      module.timeManager.pauseDay,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_PauseTime')).setValue(
      module.timeManager.pauseTime,
    );

    const playerList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_PlayerList'));
    if (GameState.PartyManager.Player) {
      const player = GameState.PartyManager.Player;
      const playerStruct = player.save().RootNode;
      playerStruct.type = 0xBEAD;
      playerStruct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_CommntyName')).setValue('Bad StrRef');
      playerStruct.addField(new GFFField(GFFDataType.BYTE, 'Mod_IsPrimaryPlr')).setValue(1);
      playerStruct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_FirstName')).setValue(
        player.firstName instanceof CExoLocString ? player.firstName : new CExoLocString(),
      );
      playerStruct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_LastName')).setValue(
        player.lastName instanceof CExoLocString ? player.lastName : new CExoLocString(),
      );
      playerList.addChildStruct(playerStruct);
    }

    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartDay')).setValue(module.timeManager.day);
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartHour')).setValue(module.timeManager.hour);
    ifo.RootNode.addField(new GFFField(GFFDataType.WORD, 'Mod_StartMiliSec')).setValue(
      module.timeManager.milisecond,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.WORD, 'Mod_StartMinute')).setValue(
      module.timeManager.minute,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartMonth')).setValue(module.timeManager.month);
    ifo.RootNode.addField(new GFFField(GFFDataType.WORD, 'Mod_StartSecond')).setValue(
      module.timeManager.second,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_StartYear')).setValue(
      module.timeManager.year,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag')).setValue(module.tag);
    const tokenList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'Mod_Tokens'));
    module.customTokens.forEach((tokenValue: string, tokenNumber: number) => {
      if (tokenNumber <= 9) return;
      const tokenStruct = new GFFStruct(7);
      tokenStruct.addField(new GFFField(GFFDataType.DWORD, 'Mod_TokensNumber')).setValue(tokenNumber);
      tokenStruct.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_TokensValue')).setValue(
        tokenValue || '',
      );
      tokenList.addChildStruct(tokenStruct);
    });
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_Transition')).setValue(
      module.timeManager.transition,
    );
    ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, 'Mod_Version')).setValue(module.version);
    ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_XPScale')).setValue(module.xpScale);

    const swVarTable = ifo.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'SWVarTable'));
    swVarTable.addChildStruct(module.getModuleSWVarTableSaveStruct());
    const varTable = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, 'VarTable'));
    module.scriptVarTable.writeToListField(varTable);

    return ifo;
  }

  static readModEntry(source: GFFObject): { entryArea: string; tag: string } {
    const root = gffRootOf(source);
    return {
      entryArea: root.hasField('Mod_Entry_Area')
        ? readResRef(root, 'Mod_Entry_Area')
        : (root.hasField('EntryArea') ? readResRef(root, 'EntryArea') : ''),
      tag: root.hasField('Mod_Tag')
        ? readString(root, 'Mod_Tag')
        : (root.hasField('Tag') ? readString(root, 'Tag') : ''),
    };
  }
}
