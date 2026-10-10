/**
 * Offline checks for K1 save expected-format fixes (source + GFF only).
 * Run: npx tsx scripts/verify-k1-save-format.ts
 */
import fs from 'fs';
import path from 'path';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';

let failed = 0;
function assert(cond: boolean, msg: string){
  if(!cond){
    console.error('FAIL:', msg);
    failed++;
  }else{
    console.log('PASS:', msg);
  }
}

function read(rel: string){
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

function saveMethodBody(src: string, marker = 'save(){'){
  const idx = src.indexOf(marker);
  if(idx < 0) return '';
  return src.slice(idx, idx + 14000);
}

// --- Equip slot type roundtrip (GFF layer) ---
const gff = new GFFObject();
const list = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
const item = new GFFStruct(0);
item.addField(new GFFField(GFFDataType.INT, 'BaseItem')).setValue(1);
item.setType(0x10);
list.addChildStruct(item);
const loaded = new GFFObject(gff.getExportBuffer());
const loadedType = loaded.RootNode.getFieldByLabel('Equip_ItemList').getChildStructs()[0].getType();
assert(loadedType === 0x10, `Equip_ItemList struct type survives roundtrip (got ${loadedType})`);

const itemPropSrc = read('src/engine/ItemProperty.ts');
const itemPropSave = saveMethodBody(itemPropSrc);
assert(itemPropSave.includes("'Subtype'"), 'ItemProperty.save uses Subtype');
assert(!itemPropSave.includes("'SubType'"), 'ItemProperty.save does not use SubType');
assert(itemPropSave.includes("'Useable'"), 'ItemProperty.save uses Useable');
assert(!itemPropSave.includes("'Usable'"), 'ItemProperty.save does not use Usable');

const cameraSrc = read('src/module/AreaCamera.ts');
const camSave = saveMethodBody(cameraSrc);
assert(camSave.includes("GFFDataType.FLOAT, 'FieldOfView'"), 'Camera FieldOfView is FLOAT');
assert(camSave.includes("GFFDataType.FLOAT, 'Height'"), 'Camera Height is FLOAT');
assert(camSave.includes("GFFDataType.FLOAT, 'Pitch'"), 'Camera Pitch is FLOAT');

const combatSrc = read('src/combat/CombatRound.ts');
assert(
  combatSrc.includes("GameState.GameKey == GameEngineType.TSL") && combatSrc.includes("'DuelPartner'"),
  'CombatRound.toStruct gates DuelPartner behind TSL'
);

const creatureSrc = read('src/module/Creature.ts');
const creatureSave = saveMethodBody(creatureSrc);
assert(!creatureSave.includes('Mod_FirstName'), 'Creature.save no longer writes Mod_FirstName');
assert(!creatureSave.includes('Mod_CommntyName'), 'Creature.save no longer writes Mod_CommntyName');
assert(creatureSave.includes("'MClassLevUpIn'"), 'Creature.save writes MClassLevUpIn');
assert(creatureSave.includes('roundStarted'), 'Creature.save gates CombatRoundData on roundStarted');
assert(
  creatureSave.includes("GameState.GameKey == GameEngineType.TSL") && creatureSave.includes("'NoPermDeath'"),
  'NoPermDeath gated behind TSL'
);
assert(creatureSave.includes('RootNode.type = 4'), 'Creature RootNode.type = 4');
assert(!creatureSave.includes("'BodyVariation'"), 'Creature save omits BodyVariation');
assert(!creatureSave.includes("'TextureVar'"), 'Creature save omits TextureVar');
assert(!creatureSave.includes("'PerceptionRange'"), 'Creature save omits PerceptionRange');
assert(creatureSave.includes('slot <<= 1'), 'Equip_ItemList walks equip slot bits');

const placeableSrc = read('src/module/Placeable.ts');
const placeableSave = saveMethodBody(placeableSrc);
assert(placeableSave.includes('RootNode.type = 9'), 'Placeable RootNode.type = 9');
assert(placeableSave.includes('PlaceableOnDialog'), 'Placeable writes OnDialog');
assert(!placeableSave.includes("'IsDestroyable'"), 'Placeable save omits IsDestroyable');
assert(!placeableSave.includes("'TemplateResRef'"), 'Placeable save omits TemplateResRef');
assert(placeableSrc.includes('this.commandable = true'), 'Placeable ctor defaults Commandable to 1');
assert(placeableSrc.includes("hasField('Commandable')"), 'Placeable loads Commandable');
assert(placeableSrc.includes('this.portraitId = 0xFFFF'), 'Placeable ctor defaults portraitId to 0xFFFF');
assert(!placeableSrc.includes('0x22E'), 'Placeable does not apply door 0->558 PortraitId remap');
assert(
  placeableSrc.includes('ModulePlaceableAnimState.DEFAULT') && placeableSrc.includes('!this.isOpen()') && placeableSrc.includes('ModulePlaceableAnimState.CLOSE'),
  'Placeable remaps closed DEFAULT animation to CLOSE'
);
assert(placeableSrc.includes('0x3FFF') && placeableSrc.includes('EffectDamageResistance'), 'Placeable applies hardness DamageResistance PostProcess');
assert(placeableSrc.includes('GameEffectType.EffectDamageResistance'), 'Placeable guards against duplicate hardness DR');
assert(placeableSrc.includes('setSubTypeUnMasked(GameEffectDurationType.PERMANENT)'), 'Placeable hardness SubType is PERMANENT only (2)');
assert(placeableSrc.includes('setSkipOnLoad(true)'), 'Placeable hardness sets SkipOnLoad');

const soundSrc = read('src/module/Sound.ts');
const soundSave = saveMethodBody(soundSrc);
assert(soundSave.includes("BYTE, 'Commandable'"), 'Sound save writes Commandable');
assert(soundSrc.includes('timeOfDayActive'), 'Sound has client-only timeOfDayActive gate');
{
  const todIdx = soundSrc.indexOf('updateTimeOfDay(');
  const todBody = soundSrc.slice(todIdx, todIdx + 900);
  assert(todBody.includes('this.timeOfDayActive'), 'updateTimeOfDay assigns timeOfDayActive');
  assert(!todBody.includes('this.active ='), 'updateTimeOfDay does not mutate persisted Active');
}

const partySrc = read('src/managers/PartyManager.ts');
assert(partySrc.includes('PT_COM_MSG_LIST') && partySrc.includes('GameEngineType.TSL'), 'PT_COM_MSG_LIST TSL-gated');
assert(partySrc.includes('PT_PUPPETS') && partySrc.includes('GameEngineType.TSL'), 'PT_PUPPETS TSL-gated');

const itemSrc = read('src/module/Item.ts');
assert(itemSrc.includes('UpgradeLevel') && itemSrc.includes('GameEngineType.TSL'), 'UpgradeLevel TSL-gated');

const auditSrc = read('src/engine/SaveLoadAudit.ts');
assert(auditSrc.includes('K1 creature export omits TSL/non-engine fields'), 'SaveLoadAudit has K1 creature check');

const enumSrc = read('src/enums/module/ScriptHook.ts');
assert(enumSrc.includes("PlaceableOnDialog = 'OnDialog'"), 'PlaceableOnDialog enum exists');
assert(enumSrc.includes("DoorOnDialog = 'OnDialog'"), 'DoorOnDialog enum exists');

const actionParamSrc = read('src/actions/ActionParameter.ts');
assert(actionParamSrc.includes("GFFDataType.DWORD, 'Type'"), 'ActionParameter.Type is DWORD');

const actionSrc = read('src/actions/Action.ts');
assert(actionSrc.includes('definedParams'), 'Action.toStruct uses definedParams for NumParams');

const effectSrc = read('src/effects/GameEffect.ts');
const effectSave = saveMethodBody(effectSrc);
assert(effectSave.includes('new GFFStruct(6)'), 'GameEffect ObjectList uses struct type 6');
assert(effectSave.includes('i < 4') && effectSave.includes('ObjectList'), 'GameEffect ObjectList has 4 slots');
assert(effectSave.includes('numIntegers'), 'GameEffect NumIntegers from real count');

const areaSrc = read('src/module/Area.ts');
assert(areaSrc.includes("GFFDataType.DWORD, 'StealthXPLoss'"), 'StealthXPLoss is DWORD');

const triggerSrc = read('src/module/Trigger.ts');
const triggerSave = saveMethodBody(triggerSrc);
assert(triggerSave.includes('RootNode.type = 1'), 'Trigger RootNode.type = 1');
assert(triggerSave.includes('new GFFStruct(3)'), 'Trigger Geometry struct type 3');
assert(triggerSave.includes("GFFDataType.INT, 'Type'"), 'Trigger Type is INT');
assert(!triggerSave.includes("'TrapDetectDC'"), 'Trigger save omits TrapDetectDC');
assert(!triggerSave.includes("'TrapDisarmDC'"), 'Trigger save omits TrapDisarmDC');
assert(!triggerSave.includes("'TrapFlag'"), 'Trigger save omits TrapFlag');
assert(triggerSave.includes("'TrapDetectable'"), 'Trigger save writes TrapDetectable');
assert(triggerSave.includes("'TrapDisarmable'"), 'Trigger save writes TrapDisarmable');

const moduleObjectSrc = read('src/module/GameObject.ts');
assert(
  moduleObjectSrc.includes('!BitWise.InstanceOfObject(this, GameObjectType.Trigger)') &&
  moduleObjectSrc.includes('!BitWise.InstanceOfObject(this, GameObjectType.Door)') &&
  moduleObjectSrc.includes('roomCheck(delta)'),
  'GameObject.update skips roomCheck for Trigger and Door'
);

const doorSrc = read('src/module/Door.ts');
const doorSaveRaw = saveMethodBody(doorSrc);
const doorSave = doorSaveRaw.slice(0, Math.max(0, doorSaveRaw.indexOf('return gff;')));
assert(doorSave.includes('DoorOnDialog'), 'Door writes OnDialog');
assert(doorSave.includes('RootNode.type = 8'), 'Door RootNode.type = 8');
assert(!doorSave.includes("'Useable'"), 'Door save omits Useable');
assert(!doorSave.includes("'BodyBag'"), 'Door save omits BodyBag');
assert(!doorSave.includes("'AnimationState'"), 'Door save omits AnimationState');
assert(!doorSave.includes("'TemplateResRef'"), 'Door save omits TemplateResRef');
assert(doorSrc.includes('this.commandable = true'), 'Door ctor defaults Commandable to 1');
assert(doorSrc.includes("hasField('Commandable')"), 'Door loads Commandable');
assert(doorSrc.includes("hasField('PortraitId')"), 'Door loads PortraitId');
assert(doorSrc.includes('0x22E'), 'Door remaps PortraitId 0 to 558');
assert(doorSrc.includes("resRef = 'default'"), 'Door scripts default to default');
assert(doorSrc.includes('scriptResRefs'), 'Door persists scriptResRefs');
assert(doorSave.includes("|| 'default'"), 'Door save falls back to default script resref');
assert(doorSrc.includes('getFieldByLabel(scriptKey).getValue() ?? \'\''), 'Door load preserves empty script resrefs');
assert(!doorSrc.includes('if(v) resRef = v'), 'Door load no longer drops empty script resrefs');
assert(doorSave.includes("typeof this.scriptResRefs[key] === 'string'"), 'Door save persists loaded (incl empty) resref');
assert(doorSrc.includes('0x3FFF') && doorSrc.includes('EffectDamageResistance'), 'Door applies hardness DamageResistance PostProcess');
assert(doorSrc.includes('GameEffectType.EffectDamageResistance'), 'Door guards against duplicate hardness DR');
assert(doorSrc.includes('setSubTypeUnMasked(GameEffectDurationType.PERMANENT)'), 'Door hardness SubType is PERMANENT only (2)');
assert(doorSrc.includes('setSkipOnLoad(true)'), 'Door hardness sets SkipOnLoad');
assert(doorSrc.includes("new GFFField(GFFDataType.WORD, 'PortraitId')"), 'GenerateTemplate uses PortraitId not PortraidId');
assert(!doorSrc.includes("WORD, 'PortraidId'"), 'Door no longer writes PortraidId typo');

const sitSrc = read('src/nwscript/NWScriptInstance.ts');
assert(sitSrc.includes('new GFFStruct(2)'), 'SCRIPT_SITUATION Value struct type 2');
assert(sitSrc.includes("'StackSize'"), 'SCRIPT_SITUATION writes StackSize');
assert(!sitSrc.includes('0x7777'), 'SCRIPT_SITUATION no longer uses 0x7777');

const stackSrc = read('src/nwscript/NWScriptStack.ts');
assert(stackSrc.includes('this.stack.length > 0'), 'SaveStack omits empty Stack LIST');

assert(creatureSave.includes('new GFFStruct(5)'), 'ExpressionList element struct type 5');
assert(creatureSave.includes('expressions.length > 0'), 'ExpressionList only when non-empty');

const areaMapSrc = read('src/module/AreaMap.ts');
assert(areaMapSrc.includes('new GFFStruct(0x65)'), 'AreaMap exportData uses struct 0x65');

assert(areaSrc.includes('new GFFStruct(100)'), 'AreaProperties struct type 100');
assert(areaSrc.includes("'StealthXPEnabled'"), 'AreaProperties writes StealthXPEnabled');
assert(areaSrc.includes('new GFFStruct(6)'), 'Mod_Area_list element type 6');

const moduleSrc = read('src/module/Module.ts');
assert(moduleSrc.includes('0xBEAD'), 'Mod_PlayerList uses struct 0xBEAD');
assert(moduleSrc.includes("'Mod_CommntyName'"), 'Mod_PlayerList writes Mod_CommntyName');
assert(moduleSrc.includes("'Bad StrRef'"), 'Mod_CommntyName uses Bad StrRef sentinel');
assert(!moduleSrc.includes("player.getName()"), 'Mod_CommntyName no longer uses FirstName');
assert(moduleSrc.includes("'Mod_IsPrimaryPlr'"), 'Mod_PlayerList writes Mod_IsPrimaryPlr');
assert(moduleSrc.includes("'Mod_FirstName'"), 'Mod_PlayerList writes Mod_FirstName');
assert(moduleSrc.includes("'Mod_LastName'"), 'Mod_PlayerList writes Mod_LastName');
{
  // Module IFO export region: Mod_StartDay through Mod_XPScale
  const ifoRegion = moduleSrc.slice(
    moduleSrc.indexOf("BYTE, 'Mod_StartDay'"),
    moduleSrc.indexOf("BYTE, 'Mod_XPScale'") + 80
  );
  assert(!ifoRegion.includes("'Mod_VO_ID'"), 'Module IFO save omits Mod_VO_ID');
  assert(moduleSrc.includes("hasField('Mod_VO_ID')"), 'Module still loads Mod_VO_ID if present');
  assert(!ifoRegion.includes("'Mod_StartMovie'"), 'Module IFO save omits Mod_StartMovie');
  assert(moduleSrc.includes("hasField('Mod_StartMovie')"), 'Module still loads Mod_StartMovie if present');
}

assert(triggerSave.includes("'LoadScreenID'"), 'Trigger writes LoadScreenID');
assert(triggerSave.includes("'LocalizedName'"), 'Trigger writes LocalizedName');
assert(triggerSave.includes("'SetByPlayerParty'"), 'Trigger writes SetByPlayerParty');
assert(!triggerSave.includes("'LoadscreenID'"), 'Trigger omits LoadscreenID typo');
assert(!triggerSave.includes("'LocName'"), 'Trigger omits LocName');
assert(!triggerSave.includes("'SetByPartyPlayer'"), 'Trigger omits SetByPartyPlayer');

assert(itemSrc.includes('propStruct.setType(i)'), 'PropertiesList struct id = index');
{
  const itemSave = saveMethodBody(itemSrc);
  assert(!itemSave.includes("'ObjectId'"), 'Item.save omits ObjectId');
  assert(itemSave.includes('modelType == 1'), 'Item BodyVariation/TextureVar gated on modelType == 1');
  assert(itemSave.includes("'BodyVariation'"), 'Item save writes BodyVariation when modelType 1');
  assert(itemSave.includes("'TextureVar'"), 'Item save writes TextureVar when modelType 1');
}
assert(itemSrc.includes('getBodyVariationByte'), 'Item has getBodyVariationByte');
assert(creatureSave.includes("DWORD, 'ObjectId'"), 'Creature equip/inventory writes ObjectId');
assert(creatureSrc.includes("'FollowInfo'"), 'Creature save writes FollowInfo');
assert(creatureSrc.includes('createDefaultPartyFollowInfo'), 'Creature FollowInfo uses default FollowInfo');
assert(creatureSave.includes("'LvlStatList'"), 'Creature save writes LvlStatList');
assert(creatureSave.includes('ControlledNPC === -1'), 'LvlStatList gated on ControlledNPC == -1');
assert(creatureSave.includes('this.isPC ? 1 : 0'), 'IsPC serializes isPC not playerCreated');
assert(creatureSrc.includes('saveLevelStatStruct'), 'Creature has saveLevelStatStruct');
assert(creatureSrc.includes('levelStatRecordFromDraft'), 'applyLevelUp records level stats');
assert(creatureSave.includes("'PerceptionList'"), 'Creature save writes PerceptionList');

{
  // SaveCreature persists every visibility node; unresolved
  // objectIds (PLAYER_ID / stale) must not be spliced out of perceptionList.
  const moduleObjectSrc = read('src/module/GameObject.ts');
  const initIdx = moduleObjectSrc.indexOf('initPerceptionList()');
  assert(initIdx >= 0, 'GameObject has initPerceptionList');
  const initBody = moduleObjectSrc.slice(initIdx, initIdx + 900);
  assert(initBody.includes('GetObjectById'), 'initPerceptionList resolves objectIds');
  assert(!initBody.includes('splice'), 'initPerceptionList does not prune unresolved nodes');
  assert(initBody.includes('leave object undefined') || initBody.includes('round-trip'),
    'initPerceptionList documents retaining unresolved nodes');
}

const playerSrc = read('src/module/PlayerCharacter.ts');
assert(playerSrc.includes('this.isPC = 1'), 'PlayerCharacter ctor sets isPC = 1');
assert(playerSrc.includes('createDefaultPartyFollowInfo'), 'PlayerCharacter seeds FollowInfo');

const charGenSrc = read('src/managers/CharGenManager.ts');
assert(charGenSrc.includes('seedInitialLevelStat'), 'CharGen seeds initial LvlStatList');

const invSrc = read('src/managers/InventoryManager.ts');
assert(invSrc.includes('.save()'), 'InventoryManager uses item.save()');
assert(!invSrc.includes("'ObjectId'"), 'InventoryManager does not add ObjectId');

{
  // DoPCAutosave: pifo.ifo only in 000001 - AUTOSAVE
  const saveGameSrc = read('src/engine/SaveGame.ts');
  const writeIdx = saveGameSrc.indexOf('static async writeSaveFolder(');
  assert(writeIdx >= 0, 'SaveGame has writeSaveFolder');
  const writeBody = saveGameSrc.slice(writeIdx, writeIdx + 1800);
  assert(writeBody.includes('save_id === 1'), 'writeSaveFolder gates ExportPIFO on save_id === 1');
  assert(writeBody.includes('ExportPIFO'), 'writeSaveFolder calls ExportPIFO for autosave');
  assert(writeBody.includes("'pifo.ifo'"), 'writeSaveFolder references pifo.ifo for non-autosave cleanup');
  assert(writeBody.includes('unlink'), 'non-autosave path unlinks leftover pifo.ifo');
}

{
  // QuickSave / QuickLoad hotkey wiring
  const saveGameSrc = read('src/engine/SaveGame.ts');
  assert(saveGameSrc.includes('static async QuickLoad()'), 'SaveGame has QuickLoad');
  assert(saveGameSrc.includes('getIsQuickSave()'), 'QuickLoad finds QUICKSAVE via getIsQuickSave');
  const qlIdx = saveGameSrc.indexOf('static async QuickLoad()');
  const qlBody = saveGameSrc.slice(qlIdx, qlIdx + 600);
  assert(qlBody.includes('.load()'), 'QuickLoad calls save.load()');

  const controlsSrc = read('src/controls/IngameControls.ts');
  assert(controlsSrc.includes('KeyMapAction.Quicksave'), 'IngameControls wires Quicksave');
  assert(controlsSrc.includes('KeyMapAction.QUICKLOAD'), 'IngameControls wires QUICKLOAD');
  assert(controlsSrc.includes('SaveGame.QuickSave()'), 'Quicksave processor calls SaveGame.QuickSave');
  assert(controlsSrc.includes('SaveGame.QuickLoad()'), 'QUICKLOAD processor calls SaveGame.QuickLoad');
}

const placeableItemSave = saveMethodBody(placeableSrc);
assert(placeableItemSave.includes("DWORD, 'ObjectId'"), 'Placeable ItemList writes ObjectId');

assert(effectSave.includes('OBJECT_INVALID'), 'Effect ObjectList uses OBJECT_INVALID sentinel');

{
  const exportPcIdx = partySrc.indexOf('ExportPlayerCharacter()');
  const exportPcBody = partySrc.slice(exportPcIdx, exportPcIdx + 500);
  assert(exportPcBody.includes('npcId >= 0'), 'ExportPlayerCharacter gates pc.utc on npcId >= 0');
}

// GFF roundtrip: ActionParameter Type DWORD
{
  const param = new GFFStruct(1);
  param.addField(new GFFField(GFFDataType.DWORD, 'Type')).setValue(3);
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.LIST, 'Paramaters')).addChildStruct(param);
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const typeField = reloaded.RootNode.getFieldByLabel('Paramaters').getChildStructs()[0].getFieldByLabel('Type');
  assert(typeField.getType() === GFFDataType.DWORD, `ActionParameter Type survives as DWORD (got ${typeField.getType()})`);
}

// GFF roundtrip: Effect ObjectList type 6 × 4
{
  const effect = new GFFStruct(2);
  const objList = effect.addField(new GFFField(GFFDataType.LIST, 'ObjectList'));
  for(let i = 0; i < 4; i++){
    const s = new GFFStruct(6);
    s.addField(new GFFField(GFFDataType.DWORD, 'Value')).setValue(i);
    objList.addChildStruct(s);
  }
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.LIST, 'EffectList')).addChildStruct(effect);
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const kids = reloaded.RootNode.getFieldByLabel('EffectList').getChildStructs()[0]
    .getFieldByLabel('ObjectList').getChildStructs();
  assert(kids.length === 4, `Effect ObjectList count 4 (got ${kids.length})`);
  assert(kids.every((s: GFFStruct) => s.getType() === 6), 'Effect ObjectList struct types are 6');
}

// GFF roundtrip: PerceptionList ObjectId + PerceptionData (incl. PLAYER_ID / unresolved)
{
  const PLAYER_ID = 0x7fffffff;
  const HEARD = 0x02;
  const wrap = new GFFObject();
  const list = wrap.RootNode.addField(new GFFField(GFFDataType.LIST, 'PerceptionList'));
  for(const [objectId, data] of [[PLAYER_ID, HEARD], [284, HEARD]] as const){
    const s = new GFFStruct(0);
    s.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(objectId);
    s.addField(new GFFField(GFFDataType.BYTE, 'PerceptionData')).setValue(data);
    list.addChildStruct(s);
  }
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const kids = reloaded.RootNode.getFieldByLabel('PerceptionList').getChildStructs();
  assert(kids.length === 2, `PerceptionList count 2 (got ${kids.length})`);
  assert(kids[0].getFieldByLabel('ObjectId').getValue() === PLAYER_ID, 'PerceptionList[0] ObjectId = PLAYER_ID');
  assert(kids[0].getFieldByLabel('PerceptionData').getValue() === HEARD, 'PerceptionList[0] PerceptionData = HEARD');
  assert(kids[1].getFieldByLabel('ObjectId').getValue() === 284, 'PerceptionList[1] ObjectId = 284');
  assert(kids[1].getFieldByLabel('PerceptionData').getValue() === HEARD, 'PerceptionList[1] PerceptionData = HEARD');
}

// GFF roundtrip: VECTOR/ORIENTATION set via setValue survive export (camera Position/Orientation fix)
{
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.VECTOR, 'Position')).setValue({x: 34.828125, y: 19.6875, z: -1.275390625});
  wrap.RootNode.addField(new GFFField(GFFDataType.ORIENTATION, 'Orientation')).setValue({x: 0, y: 0, z: 0.634765625, w: 0.7734375});
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const v = reloaded.RootNode.getFieldByLabel('Position').getVector();
  const o = reloaded.RootNode.getFieldByLabel('Orientation').getOrientation();
  assert(
    Math.abs(v.x - 34.828125) < 1e-4 && Math.abs(v.y - 19.6875) < 1e-4 && Math.abs(v.z - (-1.275390625)) < 1e-4,
    `VECTOR setValue survives roundtrip (got ${v.x}, ${v.y}, ${v.z})`
  );
  assert(
    Math.abs(o.z - 0.634765625) < 1e-4 && Math.abs(o.w - 0.7734375) < 1e-4 && Math.abs(o.x) < 1e-4 && Math.abs(o.y) < 1e-4,
    `ORIENTATION setValue survives roundtrip (got ${o.x}, ${o.y}, ${o.z}, ${o.w})`
  );
}

// GFF roundtrip: CHAR stores signed byte (RefSaveThrow 2 must not become ASCII 50)
{
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.CHAR, 'RefSaveThrow')).setValue(2);
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const charVal = reloaded.RootNode.getFieldByLabel('RefSaveThrow').getValue();
  assert(charVal === 2, `CHAR setValue(2) survives roundtrip as 2 (got ${charVal})`);
}

// GFF roundtrip: DWORD64 setValue populates field.data (Effect Id / Mod_Effect_NxtId)
{
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.DWORD64, 'Id')).setValue(45);
  wrap.RootNode.addField(new GFFField(GFFDataType.DWORD64, 'Mod_Effect_NxtId')).setValue(100);
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const idVal = reloaded.RootNode.getFieldByLabel('Id').getValue();
  const nxtVal = reloaded.RootNode.getFieldByLabel('Mod_Effect_NxtId').getValue();
  const idNum = typeof idVal === 'bigint' ? Number(idVal) : Number(idVal);
  const nxtNum = typeof nxtVal === 'bigint' ? Number(nxtVal) : Number(nxtVal);
  assert(idNum === 45, `DWORD64 Id setValue(45) survives roundtrip (got ${idVal})`);
  assert(nxtNum === 100, `DWORD64 Mod_Effect_NxtId setValue(100) survives roundtrip (got ${nxtVal})`);
}

// CreatureClass.save: IsJedi / KnownList gating
{
  const classSrc = read('src/combat/CreatureClass.ts');
  const classSave = saveMethodBody(classSrc);
  assert(classSrc.includes('isJedi()'), 'CreatureClass has isJedi()');
  assert(classSave.includes('isJedi()'), 'SpellsPerDayList gated on isJedi()');
  assert(!classSave.includes('this.spellcaster'), 'ClassList save no longer gates on spellcaster');
  assert(classSave.includes('this.spells.length > 0'), 'KnownList0 only when non-empty');
}

// Creature save: TemplateResRef omitted, OBJECT_INVALID equips, ForcePoints field, AreaId fallback, FirstName LocString
assert(!creatureSrc.includes("setValue(this.templateResRef"), 'Creature save omits TemplateResRef value write');
assert(creatureSrc.includes('OBJECT_INVALID'), 'CombatInfo equips use OBJECT_INVALID');
assert(creatureSave.includes('this.forcePoints | 0'), 'ForcePoints saves forcePoints field');
assert(!creatureSave.includes('this.getFP()'), 'ForcePoints no longer uses getFP()');
assert(creatureSave.includes('savedAreaId'), 'AreaId uses savedAreaId fallback');
assert(creatureSave.includes('getSaveAreaId()'), 'Creature AreaId uses getSaveAreaId()');
assert(areaSrc.includes('areId'), 'Area stores ARE ID as areId');
assert(areaSrc.includes('this.areId = this.are.getFieldByLabel(\'ID\')'), 'ARE ID loads into areId not this.id');
assert(!/this\.id = this\.are\.getFieldByLabel\('ID'\)/.test(areaSrc), 'Area no longer overwrites this.id with ARE ID');
assert(moduleSrc.includes('areaList[0]?.objectId'), 'Module.Load applies Mod_Area_list ObjectId');
assert(moduleSrc.includes('AddObjectById(module.area)'), 'Module.Load registers area with GameObjectManager');
assert(moduleObjectSrc.includes('getSaveAreaId()'), 'GameObject has getSaveAreaId()');
assert(creatureSrc.includes("getFieldByLabel('FirstName').getCExoLocString()"), 'FirstName load uses getCExoLocString');
assert(creatureSrc.includes("hasField('MovementRate')"), 'Creature load reads MovementRate');
assert(creatureSave.includes('instanceof CExoLocString'), 'FirstName/LastName save uses CExoLocString');

// CExoLocString FirstName RESREF survives roundtrip
{
  const loc = new CExoLocString(27769);
  const wrap = new GFFObject();
  wrap.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')).setValue(loc);
  const reloaded = new GFFObject(wrap.getExportBuffer());
  const out = reloaded.RootNode.getFieldByLabel('FirstName').getCExoLocString();
  assert(out.getRESREF() === 27769, `FirstName RESREF survives roundtrip (got ${out.getRESREF()})`);
  assert(out.stringCount() === 0, 'FirstName roundtrip has no embedded substrings');
}

if(failed){
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll K1 save format checks passed');
