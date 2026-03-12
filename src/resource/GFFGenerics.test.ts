/**
 * GFF Generics Round-Trip Tests
 *
 * Vendor parity for PyKotor:
 *   tests/resource/generics/test_utc.py  (UTC creature template)
 *   tests/resource/generics/test_are.py  (ARE area properties)
 *   tests/resource/generics/test_uti.py  (UTI item template)
 *   tests/resource/generics/test_utd.py  (UTD door template)
 *   tests/resource/generics/test_utp.py  (UTP placeable template)
 *   tests/resource/generics/test_utt.py  (UTT trigger template)
 *   tests/resource/generics/test_uts.py  (UTS sound template)
 *   tests/resource/generics/test_ute.py  (UTE encounter template)
 *   tests/resource/generics/test_utw.py  (UTW waypoint template)
 *   tests/resource/generics/test_git.py  (GIT game instance template)
 *   tests/resource/generics/test_dlg.py  (DLG dialog)
 *   tests/resource/generics/test_fac.py  (FAC factions)
 *   tests/resource/generics/test_ifo.py  (IFO module info)
 *   tests/resource/generics/test_jrl.py  (JRL journal)
 *   tests/resource/generics/test_pth.py  (PTH path)
 *
 * These tests build GFF structures that mirror the inlined XML test data from
 * the vendor suite, then verify that:
 *   1. All field values survive a binary export->parse round-trip.
 *   2. Nested LIST/STRUCT fields are preserved with correct child counts.
 *   3. CEXOLOCSTRING strref values are preserved.
 *   4. FLOAT values round-trip within float32 precision.
 *   5. VECTOR and ORIENTATION compound fields are preserved.
 */

import { describe, expect, it } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CExoLocString } from '@/resource/CExoLocString';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';

// ---------------------------------------------------------------------------
// UTC helpers — mirrors vendor test_utc.py :: buildVendorUTCGff
// ---------------------------------------------------------------------------

function buildUTCGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTC ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('n_minecoorta'));
  r.addField(new GFFField(GFFDataType.BYTE,   'Race').setValue(6));
  r.addField(new GFFField(GFFDataType.BYTE,   'SubraceIndex').setValue(1));

  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')
    .setCExoLocString(new CExoLocString(76046)));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName')
    .setCExoLocString(new CExoLocString(123)));

  r.addField(new GFFField(GFFDataType.WORD,  'Appearance_Type').setValue(636));
  r.addField(new GFFField(GFFDataType.BYTE,  'Gender').setValue(2));
  r.addField(new GFFField(GFFDataType.INT,   'Phenotype').setValue(0));
  r.addField(new GFFField(GFFDataType.WORD,  'PortraitId').setValue(1));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('Coorta'));
  r.addField(new GFFField(GFFDataType.RESREF, 'Conversation').setValue('coorta'));
  r.addField(new GFFField(GFFDataType.BYTE,  'IsPC').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD,  'FactionID').setValue(5));
  r.addField(new GFFField(GFFDataType.BYTE,  'Disarmable').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD,  'SoundSetFile').setValue(46));
  r.addField(new GFFField(GFFDataType.BYTE,  'Plot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'Interruptable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'NoPermDeath').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'NotReorienting').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'Hologram').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'IgnoreCrePath').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'MultiplierSet').setValue(3));
  r.addField(new GFFField(GFFDataType.BYTE,  'Str').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE,  'Dex').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE,  'Con').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE,  'Int').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE,  'Wis').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE,  'Cha').setValue(10));
  r.addField(new GFFField(GFFDataType.INT,   'WalkRate').setValue(7));
  r.addField(new GFFField(GFFDataType.BYTE,  'NaturalAC').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'HitPoints').setValue(8));
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentHitPoints').setValue(8));
  r.addField(new GFFField(GFFDataType.SHORT, 'MaxHitPoints').setValue(8));
  r.addField(new GFFField(GFFDataType.SHORT, 'ForcePoints').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentForce').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'refbonus').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'willbonus').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'fortbonus').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'GoodEvil').setValue(50));
  r.addField(new GFFField(GFFDataType.BYTE,  'LawfulChaotic').setValue(0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'BlindSpot').setValue(120.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'ChallengeRating').setValue(1.0));
  r.addField(new GFFField(GFFDataType.BYTE,  'PerceptionRange').setValue(11));
  r.addField(new GFFField(GFFDataType.BYTE,  'PartyInteract').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'Min1HP').setValue(1));

  // Scripts
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat').setValue('k_def_heartbt01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice').setValue('k_def_percept01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt').setValue('k_def_spellat01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked').setValue('k_def_attacked01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged').setValue('k_def_damage01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed').setValue('k_def_disturb01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound').setValue('k_def_combend01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu').setValue('k_def_endconv'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDialogue').setValue('k_def_dialogue01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn').setValue('k_def_spawn01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDeath').setValue('k_def_death01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine').setValue('k_def_userdef01'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked').setValue('k_def_blocked01'));

  // SkillList — 8 entries with Rank = 1..8
  const skillList = new GFFField(GFFDataType.LIST, 'SkillList');
  for (let rank = 1; rank <= 8; rank++) {
    const s = new GFFStruct(0);
    s.addField(new GFFField(GFFDataType.BYTE, 'Rank').setValue(rank));
    skillList.addChildStruct(s);
  }
  r.addField(skillList);

  // FeatList — feats 93, 94
  const featList = new GFFField(GFFDataType.LIST, 'FeatList');
  ([93, 94] as const).forEach(feat => {
    const s = new GFFStruct(1);
    s.addField(new GFFField(GFFDataType.WORD, 'Feat').setValue(feat));
    featList.addChildStruct(s);
  });
  r.addField(featList);

  // ClassList — 2 class entries with nested KnownList0
  const classList = new GFFField(GFFDataType.LIST, 'ClassList');

  const class0 = new GFFStruct(2);
  class0.addField(new GFFField(GFFDataType.INT, 'Class').setValue(0));
  class0.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel').setValue(2));
  const kl0a = new GFFField(GFFDataType.LIST, 'KnownList0');
  const sp7 = new GFFStruct(3);
  sp7.addField(new GFFField(GFFDataType.WORD, 'Spell').setValue(7));
  sp7.addField(new GFFField(GFFDataType.BYTE, 'SpellMetaMagic').setValue(0));
  sp7.addField(new GFFField(GFFDataType.BYTE, 'SpellFlags').setValue(1));
  kl0a.addChildStruct(sp7);
  class0.addField(kl0a);
  classList.addChildStruct(class0);

  const class1 = new GFFStruct(2);
  class1.addField(new GFFField(GFFDataType.INT, 'Class').setValue(1));
  class1.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel').setValue(3));
  const kl0b = new GFFField(GFFDataType.LIST, 'KnownList0');
  ([9, 11] as const).forEach(spellId => {
    const sp = new GFFStruct(3);
    sp.addField(new GFFField(GFFDataType.WORD, 'Spell').setValue(spellId));
    sp.addField(new GFFField(GFFDataType.BYTE, 'SpellMetaMagic').setValue(0));
    sp.addField(new GFFField(GFFDataType.BYTE, 'SpellFlags').setValue(1));
    kl0b.addChildStruct(sp);
  });
  class1.addField(kl0b);
  classList.addChildStruct(class1);
  r.addField(classList);

  // Equip_ItemList — armor slot (id=2) + hide slot (id=131072)
  const equipList = new GFFField(GFFDataType.LIST, 'Equip_ItemList');
  const armorSlot = new GFFStruct(2);
  armorSlot.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes').setValue('mineruniform'));
  armorSlot.addField(new GFFField(GFFDataType.BYTE, 'Dropable').setValue(1));
  equipList.addChildStruct(armorSlot);
  const hideSlot = new GFFStruct(131072);
  hideSlot.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes').setValue('g_i_crhide008'));
  equipList.addChildStruct(hideSlot);
  r.addField(equipList);

  // ItemList — 4 inventory items
  const itemList = new GFFField(GFFDataType.LIST, 'ItemList');
  const ITEM_RESREF_1 = 'g_w_thermldet01';
  const ITEM_RESREF_2 = 'g_w_thermldet02';
  const inventoryData = [
    { id: 0, res: ITEM_RESREF_1, x: 0, y: 0, dropable: 1 },
    { id: 1, res: ITEM_RESREF_1, x: 1, y: 0, dropable: 0 },
    { id: 2, res: ITEM_RESREF_1, x: 2, y: 0, dropable: 0 },
    { id: 3, res: ITEM_RESREF_2, x: 3, y: 0, dropable: 0 },
  ];
  inventoryData.forEach(({ id, res, x, y, dropable }) => {
    const item = new GFFStruct(id);
    item.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes').setValue(res));
    item.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX').setValue(x));
    item.addField(new GFFField(GFFDataType.WORD, 'Repos_Posy').setValue(y));
    if (dropable) {
      item.addField(new GFFField(GFFDataType.BYTE, 'Dropable').setValue(1));
    }
    itemList.addChildStruct(item);
  });
  r.addField(itemList);

  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(3));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('comment'));

  return gff;
}

function validateUTCFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('n_minecoorta');
  expect(r.getFieldByLabel('Race')?.getValue()).toBe(6);
  expect(r.getFieldByLabel('SubraceIndex')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('FirstName')?.getCExoLocString()?.getRESREF()).toBe(76046);
  expect(r.getFieldByLabel('LastName')?.getCExoLocString()?.getRESREF()).toBe(123);
  expect(r.getFieldByLabel('Appearance_Type')?.getValue()).toBe(636);
  expect(r.getFieldByLabel('Gender')?.getValue()).toBe(2);
  expect(r.getFieldByLabel('FactionID')?.getValue()).toBe(5);
  expect(r.getFieldByLabel('HitPoints')?.getValue()).toBe(8);
  expect(r.getFieldByLabel('MaxHitPoints')?.getValue()).toBe(8);
  expect(r.getFieldByLabel('ForcePoints')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('refbonus')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('willbonus')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('fortbonus')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('GoodEvil')?.getValue()).toBe(50);
  expect(r.getFieldByLabel('MultiplierSet')?.getValue()).toBe(3);
  expect(r.getFieldByLabel('NaturalAC')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('PerceptionRange')?.getValue()).toBe(11);
  expect(r.getFieldByLabel('BlindSpot')?.getValue()).toBeCloseTo(120.0, 3);
  expect(r.getFieldByLabel('ChallengeRating')?.getValue()).toBeCloseTo(1.0, 5);
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('Coorta');
  expect(r.getFieldByLabel('Conversation')?.getValue()).toBe('coorta');
  expect(r.getFieldByLabel('WalkRate')?.getValue()).toBe(7);
  expect(r.getFieldByLabel('SoundSetFile')?.getValue()).toBe(46);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('comment');
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(3);

  // Scripts
  expect(r.getFieldByLabel('ScriptHeartbeat')?.getValue()).toBe('k_def_heartbt01');
  expect(r.getFieldByLabel('ScriptAttacked')?.getValue()).toBe('k_def_attacked01');
  expect(r.getFieldByLabel('ScriptDamaged')?.getValue()).toBe('k_def_damage01');
  expect(r.getFieldByLabel('ScriptDeath')?.getValue()).toBe('k_def_death01');
  expect(r.getFieldByLabel('ScriptDialogue')?.getValue()).toBe('k_def_dialogue01');
  expect(r.getFieldByLabel('ScriptDisturbed')?.getValue()).toBe('k_def_disturb01');
  expect(r.getFieldByLabel('ScriptEndDialogu')?.getValue()).toBe('k_def_endconv');
  expect(r.getFieldByLabel('ScriptEndRound')?.getValue()).toBe('k_def_combend01');
  expect(r.getFieldByLabel('ScriptOnBlocked')?.getValue()).toBe('k_def_blocked01');
  expect(r.getFieldByLabel('ScriptOnNotice')?.getValue()).toBe('k_def_percept01');
  expect(r.getFieldByLabel('ScriptSpawn')?.getValue()).toBe('k_def_spawn01');
  expect(r.getFieldByLabel('ScriptSpellAt')?.getValue()).toBe('k_def_spellat01');
  expect(r.getFieldByLabel('ScriptUserDefine')?.getValue()).toBe('k_def_userdef01');

  // SkillList — 8 entries with Rank 1..8
  const skillList = r.getFieldByLabel('SkillList')?.getChildStructs() ?? [];
  expect(skillList).toHaveLength(8);
  for (let i = 0; i < 8; i++) {
    expect(skillList[i].getFieldByLabel('Rank')?.getValue()).toBe(i + 1);
  }

  // FeatList — feats 93, 94
  const featList = r.getFieldByLabel('FeatList')?.getChildStructs() ?? [];
  expect(featList).toHaveLength(2);
  expect(featList[0].getFieldByLabel('Feat')?.getValue()).toBe(93);
  expect(featList[1].getFieldByLabel('Feat')?.getValue()).toBe(94);

  // ClassList — class 0 (level 2 + 1 known spell) and class 1 (level 3 + 2 known spells)
  const classes = r.getFieldByLabel('ClassList')?.getChildStructs() ?? [];
  expect(classes).toHaveLength(2);
  expect(classes[0].getFieldByLabel('Class')?.getValue()).toBe(0);
  expect(classes[0].getFieldByLabel('ClassLevel')?.getValue()).toBe(2);
  const known0 = classes[0].getFieldByLabel('KnownList0')?.getChildStructs() ?? [];
  expect(known0).toHaveLength(1);
  expect(known0[0].getFieldByLabel('Spell')?.getValue()).toBe(7);

  expect(classes[1].getFieldByLabel('Class')?.getValue()).toBe(1);
  expect(classes[1].getFieldByLabel('ClassLevel')?.getValue()).toBe(3);
  const known1 = classes[1].getFieldByLabel('KnownList0')?.getChildStructs() ?? [];
  expect(known1).toHaveLength(2);
  expect(known1[0].getFieldByLabel('Spell')?.getValue()).toBe(9);
  expect(known1[1].getFieldByLabel('Spell')?.getValue()).toBe(11);

  // Equip_ItemList
  const equip = r.getFieldByLabel('Equip_ItemList')?.getChildStructs() ?? [];
  expect(equip).toHaveLength(2);
  expect(equip[0].getFieldByLabel('EquippedRes')?.getValue()).toBe('mineruniform');
  expect(equip[0].getFieldByLabel('Dropable')?.getValue()).toBe(1);
  expect(equip[1].getFieldByLabel('EquippedRes')?.getValue()).toBe('g_i_crhide008');

  // ItemList — 4 items; first is droppable, rest are not
  const inventory = r.getFieldByLabel('ItemList')?.getChildStructs() ?? [];
  expect(inventory).toHaveLength(4);
  expect(inventory[0].getFieldByLabel('Dropable')?.getValue()).toBe(1);
  expect(inventory[1].getFieldByLabel('InventoryRes')?.getValue()).toBe('g_w_thermldet01');
  expect(inventory[3].getFieldByLabel('InventoryRes')?.getValue()).toBe('g_w_thermldet02');
}

// ---------------------------------------------------------------------------
// ARE helpers — mirrors vendor test_are.py :: buildVendorAREGff
// ---------------------------------------------------------------------------

function buildAREGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'ARE ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.INT,    'ID').setValue(0));
  r.addField(new GFFField(GFFDataType.INT,    'Creator_ID').setValue(0));
  r.addField(new GFFField(GFFDataType.DWORD,  'Version').setValue(88));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('Untitled'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name')
    .setCExoLocString(new CExoLocString(75101)));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comments').setValue('comments'));

  // Nested Map struct
  const mapStruct = new GFFField(GFFDataType.STRUCT, 'Map');
  const mapInner = new GFFStruct(0);
  mapInner.addField(new GFFField(GFFDataType.INT, 'MapResX').setValue(18));
  mapInner.addField(new GFFField(GFFDataType.INT, 'NorthAxis').setValue(1));
  mapInner.addField(new GFFField(GFFDataType.FLOAT, 'WorldPt1X').setValue(-14.180000305175781));
  mapInner.addField(new GFFField(GFFDataType.FLOAT, 'WorldPt1Y').setValue(-15.0600004196167));
  mapInner.addField(new GFFField(GFFDataType.FLOAT, 'WorldPt2X').setValue(13.279999732971191));
  mapInner.addField(new GFFField(GFFDataType.FLOAT, 'WorldPt2Y').setValue(12.859999656677246));
  mapInner.addField(new GFFField(GFFDataType.INT, 'MapZoom').setValue(1));
  mapStruct.addChildStruct(mapInner);
  r.addField(mapStruct);

  r.addField(new GFFField(GFFDataType.DWORD, 'Flags').setValue(0));
  r.addField(new GFFField(GFFDataType.INT,   'ModSpotCheck').setValue(0));
  r.addField(new GFFField(GFFDataType.INT,   'ModListenCheck').setValue(0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'AlphaTest').setValue(0.20000000298023224));
  r.addField(new GFFField(GFFDataType.INT,   'CameraStyle').setValue(1));
  r.addField(new GFFField(GFFDataType.RESREF, 'DefaultEnvMap').setValue('defaultenvmap'));
  r.addField(new GFFField(GFFDataType.RESREF, 'Grass_TexName').setValue('grasstexture'));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_Density').setValue(1.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_QuadSize').setValue(1.0));
  r.addField(new GFFField(GFFDataType.DWORD, 'Grass_Ambient').setValue(16777215));
  r.addField(new GFFField(GFFDataType.DWORD, 'Grass_Diffuse').setValue(16777215));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LL').setValue(0.25));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_Prob_LR').setValue(0.25));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UL').setValue(0.25));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Grass_Prob_UR').setValue(0.25));

  // Moon lighting
  r.addField(new GFFField(GFFDataType.DWORD, 'MoonAmbientColor').setValue(0));
  r.addField(new GFFField(GFFDataType.DWORD, 'MoonDiffuseColor').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE,  'MoonFogOn').setValue(0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'MoonFogNear').setValue(99.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'MoonFogFar').setValue(100.0));
  r.addField(new GFFField(GFFDataType.DWORD, 'MoonFogColor').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE,  'MoonShadows').setValue(0));

  // Sun lighting
  r.addField(new GFFField(GFFDataType.DWORD, 'SunAmbientColor').setValue(16777215));
  r.addField(new GFFField(GFFDataType.DWORD, 'SunDiffuseColor').setValue(16777215));
  r.addField(new GFFField(GFFDataType.BYTE,  'SunFogOn').setValue(1));
  r.addField(new GFFField(GFFDataType.FLOAT, 'SunFogNear').setValue(99.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'SunFogFar').setValue(100.0));
  r.addField(new GFFField(GFFDataType.DWORD, 'SunFogColor').setValue(16777215));
  r.addField(new GFFField(GFFDataType.BYTE,  'SunShadows').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'DynAmbientColor').setValue(16777215));

  // Day/night & weather
  r.addField(new GFFField(GFFDataType.BYTE, 'IsNight').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'LightingScheme').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'ShadowOpacity').setValue(205));
  r.addField(new GFFField(GFFDataType.BYTE, 'DayNightCycle').setValue(0));
  r.addField(new GFFField(GFFDataType.INT,  'ChanceRain').setValue(99));
  r.addField(new GFFField(GFFDataType.INT,  'ChanceSnow').setValue(99));
  r.addField(new GFFField(GFFDataType.INT,  'ChanceLightning').setValue(99));
  r.addField(new GFFField(GFFDataType.INT,  'WindPower').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD, 'LoadScreenID').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'PlayerVsPlayer').setValue(3));
  r.addField(new GFFField(GFFDataType.BYTE, 'NoRest').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Unescapable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'DisableTransit').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'StealthXPEnabled').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'StealthXPLoss').setValue(25));
  r.addField(new GFFField(GFFDataType.DWORD, 'StealthXPMax').setValue(25));

  // Dirty ARGB — DirtySizeOne/Two/Three = 1
  r.addField(new GFFField(GFFDataType.INT, 'DirtyARGBOne').setValue(123));
  r.addField(new GFFField(GFFDataType.INT, 'DirtySizeOne').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFormulaOne').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFuncOne').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyARGBTwo').setValue(1234));
  r.addField(new GFFField(GFFDataType.INT, 'DirtySizeTwo').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFormulaTwo').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFuncTwo').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyARGBThree').setValue(12345));
  r.addField(new GFFField(GFFDataType.INT, 'DirtySizeThree').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFormulaThre').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DirtyFuncThree').setValue(1));

  // Rooms list — 2 room entries
  const rooms = new GFFField(GFFDataType.LIST, 'Rooms');
  const roomData = [
    { name: '002ebo',  envAudio: 17, ambientScale: 0.9300000071525574, forceRating: 1, disableWeather: 1 },
    { name: '002ebo2', envAudio: 17, ambientScale: 0.9800000190734863, forceRating: 2, disableWeather: 0 },
  ];
  roomData.forEach(({ name, envAudio, ambientScale, forceRating, disableWeather }) => {
    const room = new GFFStruct(0);
    room.addField(new GFFField(GFFDataType.CEXOSTRING, 'RoomName').setValue(name));
    room.addField(new GFFField(GFFDataType.INT, 'EnvAudio').setValue(envAudio));
    room.addField(new GFFField(GFFDataType.FLOAT, 'AmbientScale').setValue(ambientScale));
    room.addField(new GFFField(GFFDataType.INT, 'ForceRating').setValue(forceRating));
    room.addField(new GFFField(GFFDataType.BYTE, 'DisableWeather').setValue(disableWeather));
    rooms.addChildStruct(room);
  });
  r.addField(rooms);

  // Script hooks
  r.addField(new GFFField(GFFDataType.RESREF, 'OnEnter').setValue('k_on_enter'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnExit').setValue('onexit'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat').setValue('onheartbeat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined').setValue('onuserdefined'));

  return gff;
}

function validateAREFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('Untitled');
  expect(r.getFieldByLabel('Name')?.getCExoLocString()?.getRESREF()).toBe(75101);
  expect(r.getFieldByLabel('Comments')?.getValue()).toBe('comments');
  expect(r.getFieldByLabel('Version')?.getValue()).toBe(88);
  expect(r.getFieldByLabel('CameraStyle')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DefaultEnvMap')?.getValue()).toBe('defaultenvmap');
  expect(r.getFieldByLabel('Grass_TexName')?.getValue()).toBe('grasstexture');
  expect(r.getFieldByLabel('Grass_Density')?.getValue()).toBeCloseTo(1.0, 5);
  expect(r.getFieldByLabel('Grass_Prob_LL')?.getValue()).toBeCloseTo(0.25, 5);
  expect(r.getFieldByLabel('Grass_Prob_UL')?.getValue()).toBeCloseTo(0.25, 5);
  expect(r.getFieldByLabel('MoonAmbientColor')?.getValue()).toBe(0);
  expect(r.getFieldByLabel('MoonFogOn')?.getValue()).toBe(0);
  expect(r.getFieldByLabel('MoonFogNear')?.getValue()).toBeCloseTo(99.0, 3);
  expect(r.getFieldByLabel('MoonFogFar')?.getValue()).toBeCloseTo(100.0, 3);
  expect(r.getFieldByLabel('SunFogOn')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('SunFogNear')?.getValue()).toBeCloseTo(99.0, 3);
  expect(r.getFieldByLabel('SunFogFar')?.getValue()).toBeCloseTo(100.0, 3);
  expect(r.getFieldByLabel('SunAmbientColor')?.getValue()).toBe(16777215);
  expect(r.getFieldByLabel('DynAmbientColor')?.getValue()).toBe(16777215);
  expect(r.getFieldByLabel('SunShadows')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('ShadowOpacity')?.getValue()).toBe(205);
  expect(r.getFieldByLabel('ChanceRain')?.getValue()).toBe(99);
  expect(r.getFieldByLabel('ChanceSnow')?.getValue()).toBe(99);
  expect(r.getFieldByLabel('ChanceLightning')?.getValue()).toBe(99);
  expect(r.getFieldByLabel('WindPower')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('PlayerVsPlayer')?.getValue()).toBe(3);
  expect(r.getFieldByLabel('Unescapable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DisableTransit')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('StealthXPEnabled')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('StealthXPLoss')?.getValue()).toBe(25);
  expect(r.getFieldByLabel('StealthXPMax')?.getValue()).toBe(25);
  expect(r.getFieldByLabel('DirtySizeOne')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DirtyFormulaOne')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DirtyFuncOne')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DirtySizeTwo')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DirtySizeThree')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('AlphaTest')?.getValue()).toBeCloseTo(0.2, 4);
  expect(r.getFieldByLabel('StealthXPEnabled')?.getValue()).toBe(1);

  // Nested Map struct
  const mapInner = r.getFieldByLabel('Map')?.getChildStructs()[0];
  expect(mapInner).toBeDefined();
  expect(mapInner?.getFieldByLabel('MapResX')?.getValue()).toBe(18);
  expect(mapInner?.getFieldByLabel('NorthAxis')?.getValue()).toBe(1);
  expect(mapInner?.getFieldByLabel('WorldPt1X')?.getValue()).toBeCloseTo(-14.18, 3);
  expect(mapInner?.getFieldByLabel('WorldPt2X')?.getValue()).toBeCloseTo(13.28, 3);

  // Rooms list
  const roomList = r.getFieldByLabel('Rooms')?.getChildStructs() ?? [];
  expect(roomList).toHaveLength(2);
  expect(roomList[0].getFieldByLabel('RoomName')?.getValue()).toBe('002ebo');
  expect(roomList[0].getFieldByLabel('EnvAudio')?.getValue()).toBe(17);
  expect(roomList[0].getFieldByLabel('ForceRating')?.getValue()).toBe(1);
  expect(roomList[0].getFieldByLabel('DisableWeather')?.getValue()).toBe(1);
  expect(roomList[1].getFieldByLabel('RoomName')?.getValue()).toBe('002ebo2');
  expect(roomList[1].getFieldByLabel('ForceRating')?.getValue()).toBe(2);
  expect(roomList[1].getFieldByLabel('DisableWeather')?.getValue()).toBe(0);
  expect(roomList[1].getFieldByLabel('AmbientScale')?.getValue()).toBeCloseTo(0.98, 4);

  // Trigger scripts
  expect(r.getFieldByLabel('OnEnter')?.getValue()).toBe('k_on_enter');
  expect(r.getFieldByLabel('OnExit')?.getValue()).toBe('onexit');
  expect(r.getFieldByLabel('OnHeartbeat')?.getValue()).toBe('onheartbeat');
  expect(r.getFieldByLabel('OnUserDefined')?.getValue()).toBe('onuserdefined');
}

// ---------------------------------------------------------------------------
// UTI helpers — mirrors vendor test_uti.py
// ---------------------------------------------------------------------------

function buildUTIGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTI ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('g_a_class4001'));
  r.addField(new GFFField(GFFDataType.INT,   'BaseItem').setValue(38));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName')
    .setCExoLocString(new CExoLocString(5632)));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified')
    .setCExoLocString(new CExoLocString(5633)));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('G_A_CLASS4001'));
  r.addField(new GFFField(GFFDataType.BYTE,  'Charges').setValue(13));
  r.addField(new GFFField(GFFDataType.DWORD, 'Cost').setValue(50));
  r.addField(new GFFField(GFFDataType.BYTE,  'Stolen').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD,  'StackSize').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'Plot').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'AddCost').setValue(50));
  r.addField(new GFFField(GFFDataType.BYTE,  'Identified').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'BodyVariation').setValue(3));
  r.addField(new GFFField(GFFDataType.BYTE,  'TextureVar').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE,  'ModelVariation').setValue(2));
  r.addField(new GFFField(GFFDataType.BYTE,  'PaletteID').setValue(1));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('itemo'));

  // PropertiesList — 2 entries; second entry has UpgradeType
  const propList = new GFFField(GFFDataType.LIST, 'PropertiesList');
  const propBase = (): GFFStruct => {
    const s = new GFFStruct(0);
    s.addField(new GFFField(GFFDataType.WORD, 'PropertyName').setValue(45));
    s.addField(new GFFField(GFFDataType.WORD, 'Subtype').setValue(6));
    s.addField(new GFFField(GFFDataType.BYTE, 'CostTable').setValue(1));
    s.addField(new GFFField(GFFDataType.WORD, 'CostValue').setValue(1));
    s.addField(new GFFField(GFFDataType.BYTE, 'Param1').setValue(255));
    s.addField(new GFFField(GFFDataType.BYTE, 'Param1Value').setValue(1));
    s.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear').setValue(100));
    return s;
  };

  const prop0 = propBase();
  propList.addChildStruct(prop0);

  const prop1 = propBase();
  prop1.addField(new GFFField(GFFDataType.BYTE, 'UpgradeType').setValue(24));
  propList.addChildStruct(prop1);

  r.addField(propList);

  return gff;
}

function validateUTIFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('g_a_class4001');
  expect(r.getFieldByLabel('BaseItem')?.getValue()).toBe(38);
  expect(r.getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(5632);
  expect(r.getFieldByLabel('DescIdentified')?.getCExoLocString()?.getRESREF()).toBe(5633);
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('G_A_CLASS4001');
  expect(r.getFieldByLabel('Charges')?.getValue()).toBe(13);
  expect(r.getFieldByLabel('Cost')?.getValue()).toBe(50);
  expect(r.getFieldByLabel('Stolen')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('StackSize')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Plot')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('AddCost')?.getValue()).toBe(50);
  expect(r.getFieldByLabel('Identified')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('BodyVariation')?.getValue()).toBe(3);
  expect(r.getFieldByLabel('TextureVar')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('ModelVariation')?.getValue()).toBe(2);
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('itemo');

  const props = r.getFieldByLabel('PropertiesList')?.getChildStructs() ?? [];
  expect(props).toHaveLength(2);
  expect(props[0].getFieldByLabel('PropertyName')?.getValue()).toBe(45);
  expect(props[0].getFieldByLabel('Subtype')?.getValue()).toBe(6);
  expect(props[0].getFieldByLabel('CostTable')?.getValue()).toBe(1);
  expect(props[0].getFieldByLabel('Param1')?.getValue()).toBe(255);
  expect(props[0].getFieldByLabel('ChanceAppear')?.getValue()).toBe(100);
  // Second entry has UpgradeType
  expect(props[1].getFieldByLabel('UpgradeType')?.getValue()).toBe(24);
  // But shares the base fields
  expect(props[1].getFieldByLabel('PropertyName')?.getValue()).toBe(45);
}

// ---------------------------------------------------------------------------
// UTD / UTP / UTT / UTS / UTE / UTW helpers
// ---------------------------------------------------------------------------

function buildUTDGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTD ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('TelosDoor13'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName').setCExoLocString(new CExoLocString(123731)));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description').setCExoLocString(new CExoLocString(-1)));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('door_tel014'));
  r.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'CloseLockDC').setValue(0));
  r.addField(new GFFField(GFFDataType.RESREF, 'Conversation').setValue('convoresref'));
  r.addField(new GFFField(GFFDataType.BYTE, 'Interruptable').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'Faction').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Plot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'NotBlastable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Min1HP').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'KeyRequired').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Lockable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Locked').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDC').setValue(28));
  r.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDiff').setValue(1));
  r.addField(new GFFField(GFFDataType.CHAR, 'OpenLockDiffMod').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD, 'PortraitId').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC').setValue(28));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapType').setValue(2));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName').setValue('keyname'));
  r.addField(new GFFField(GFFDataType.BYTE, 'AnimationState').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'Appearance').setValue(1));
  r.addField(new GFFField(GFFDataType.SHORT, 'HP').setValue(20));
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentHP').setValue(60));
  r.addField(new GFFField(GFFDataType.BYTE, 'Hardness').setValue(5));
  r.addField(new GFFField(GFFDataType.BYTE, 'Fort').setValue(28));
  r.addField(new GFFField(GFFDataType.BYTE, 'Ref').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Will').setValue(0));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnClosed').setValue('onclosed'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDamaged').setValue('ondamaged'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDeath').setValue('ondeath'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDisarm').setValue('ondisarm'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat').setValue('onheartbeat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnLock').setValue('onlock'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked').setValue('onmeleeattacked'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnOpen').setValue('onopen'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnSpellCastAt').setValue('onspellcastat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered').setValue('ontraptriggered'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUnlock').setValue('onunlock'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined').setValue('onuserdefined'));
  r.addField(new GFFField(GFFDataType.WORD, 'LoadScreenID').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'GenericType').setValue(110));
  r.addField(new GFFField(GFFDataType.BYTE, 'Static').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'OpenState').setValue(1));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnClick').setValue('onclick'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnFailToOpen').setValue('onfailtoopen'));
  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(1));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('abcdefg'));

  return gff;
}

function validateUTDFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('TelosDoor13');
  expect(r.getFieldByLabel('LocName')?.getCExoLocString()?.getRESREF()).toBe(123731);
  expect(r.getFieldByLabel('Description')?.getCExoLocString()?.getRESREF()).toBe(-1);
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('door_tel014');
  expect(r.getFieldByLabel('AutoRemoveKey')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Conversation')?.getValue()).toBe('convoresref');
  expect(r.getFieldByLabel('Interruptable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Faction')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Plot')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('NotBlastable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Min1HP')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('KeyRequired')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Lockable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Locked')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OpenLockDC')?.getValue()).toBe(28);
  expect(r.getFieldByLabel('OpenLockDiff')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OpenLockDiffMod')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapDetectable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapDetectDC')?.getValue()).toBe(0);
  expect(r.getFieldByLabel('TrapDisarmable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DisarmDC')?.getValue()).toBe(28);
  expect(r.getFieldByLabel('TrapType')?.getValue()).toBe(2);
  expect(r.getFieldByLabel('KeyName')?.getValue()).toBe('keyname');
  expect(r.getFieldByLabel('AnimationState')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Appearance')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('HP')?.getValue()).toBe(20);
  expect(r.getFieldByLabel('CurrentHP')?.getValue()).toBe(60);
  expect(r.getFieldByLabel('Hardness')?.getValue()).toBe(5);
  expect(r.getFieldByLabel('Fort')?.getValue()).toBe(28);
  expect(r.getFieldByLabel('OnClosed')?.getValue()).toBe('onclosed');
  expect(r.getFieldByLabel('OnMeleeAttacked')?.getValue()).toBe('onmeleeattacked');
  expect(r.getFieldByLabel('OnSpellCastAt')?.getValue()).toBe('onspellcastat');
  expect(r.getFieldByLabel('OnTrapTriggered')?.getValue()).toBe('ontraptriggered');
  expect(r.getFieldByLabel('GenericType')?.getValue()).toBe(110);
  expect(r.getFieldByLabel('Static')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OpenState')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OnClick')?.getValue()).toBe('onclick');
  expect(r.getFieldByLabel('OnFailToOpen')?.getValue()).toBe('onfailtoopen');
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('abcdefg');
}

function buildUTPGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTP ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('SecLoc'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName').setCExoLocString(new CExoLocString(74450)));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description').setCExoLocString(new CExoLocString(-1)));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('lockerlg002'));
  r.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'CloseLockDC').setValue(13));
  r.addField(new GFFField(GFFDataType.RESREF, 'Conversation').setValue('conversation'));
  r.addField(new GFFField(GFFDataType.BYTE, 'Interruptable').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'Faction').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Plot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'NotBlastable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Min1HP').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'KeyRequired').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Lockable').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Locked').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDC').setValue(28));
  r.addField(new GFFField(GFFDataType.BYTE, 'OpenLockDiff').setValue(1));
  r.addField(new GFFField(GFFDataType.CHAR, 'OpenLockDiffMod').setValue(1));
  r.addField(new GFFField(GFFDataType.WORD, 'PortraitId').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC').setValue(15));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapType').setValue(0));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName').setValue('somekey'));
  r.addField(new GFFField(GFFDataType.BYTE, 'AnimationState').setValue(2));
  r.addField(new GFFField(GFFDataType.DWORD, 'Appearance').setValue(67));
  r.addField(new GFFField(GFFDataType.SHORT, 'HP').setValue(15));
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentHP').setValue(15));
  r.addField(new GFFField(GFFDataType.BYTE, 'Hardness').setValue(5));
  r.addField(new GFFField(GFFDataType.BYTE, 'Fort').setValue(16));
  r.addField(new GFFField(GFFDataType.BYTE, 'Ref').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Will').setValue(0));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnClosed').setValue('onclosed'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDamaged').setValue('ondamaged'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDeath').setValue('ondeath'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDisarm').setValue('ondisarm'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat').setValue('onheartbeat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnLock').setValue('onlock'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked').setValue('onmeleeattacked'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnOpen').setValue('onopen'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnSpellCastAt').setValue('onspellcastat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered').setValue(''));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUnlock').setValue('onunlock'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined').setValue('onuserdefined'));
  r.addField(new GFFField(GFFDataType.BYTE, 'HasInventory').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'PartyInteract').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'BodyBag').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Static').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Type').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Useable').setValue(1));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnEndDialogue').setValue('onenddialogue'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnInvDisturbed').setValue('oninvdisturbed'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUsed').setValue('onused'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnFailToOpen').setValue('onfailtoopen'));

  const itemList = new GFFField(GFFDataType.LIST, 'ItemList');
  const item0 = new GFFStruct(0);
  item0.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes').setValue('g_w_iongren01'));
  item0.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX').setValue(0));
  item0.addField(new GFFField(GFFDataType.WORD, 'Repos_Posy').setValue(0));
  itemList.addChildStruct(item0);
  const item1 = new GFFStruct(1);
  item1.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes').setValue('g_w_iongren02'));
  item1.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX').setValue(1));
  item1.addField(new GFFField(GFFDataType.WORD, 'Repos_Posy').setValue(0));
  item1.addField(new GFFField(GFFDataType.BYTE, 'Dropable').setValue(1));
  itemList.addChildStruct(item1);
  r.addField(itemList);

  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(6));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('Large standup locker'));

  return gff;
}

function validateUTPFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('SecLoc');
  expect(r.getFieldByLabel('LocName')?.getCExoLocString()?.getRESREF()).toBe(74450);
  expect(r.getFieldByLabel('Description')?.getCExoLocString()?.getRESREF()).toBe(-1);
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('lockerlg002');
  expect(r.getFieldByLabel('CloseLockDC')?.getValue()).toBe(13);
  expect(r.getFieldByLabel('Conversation')?.getValue()).toBe('conversation');
  expect(r.getFieldByLabel('Lockable')?.getValue()).toBe(0);
  expect(r.getFieldByLabel('Locked')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OpenLockDC')?.getValue()).toBe(28);
  expect(r.getFieldByLabel('OpenLockDiff')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OpenLockDiffMod')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapDisarmable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DisarmDC')?.getValue()).toBe(15);
  expect(r.getFieldByLabel('TrapType')?.getValue()).toBe(0);
  expect(r.getFieldByLabel('AnimationState')?.getValue()).toBe(2);
  expect(r.getFieldByLabel('Appearance')?.getValue()).toBe(67);
  expect(r.getFieldByLabel('HP')?.getValue()).toBe(15);
  expect(r.getFieldByLabel('CurrentHP')?.getValue()).toBe(15);
  expect(r.getFieldByLabel('Hardness')?.getValue()).toBe(5);
  expect(r.getFieldByLabel('Fort')?.getValue()).toBe(16);
  expect(r.getFieldByLabel('OnMeleeAttacked')?.getValue()).toBe('onmeleeattacked');
  expect(r.getFieldByLabel('OnSpellCastAt')?.getValue()).toBe('onspellcastat');
  expect(r.getFieldByLabel('HasInventory')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('PartyInteract')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Static')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Useable')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OnEndDialogue')?.getValue()).toBe('onenddialogue');
  expect(r.getFieldByLabel('OnInvDisturbed')?.getValue()).toBe('oninvdisturbed');
  expect(r.getFieldByLabel('OnUsed')?.getValue()).toBe('onused');
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('Large standup locker');
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(6);

  const inventory = r.getFieldByLabel('ItemList')?.getChildStructs() ?? [];
  expect(inventory).toHaveLength(2);
  expect(inventory[0].getFieldByLabel('InventoryRes')?.getValue()).toBe('g_w_iongren01');
  expect(inventory[0].getFieldByLabel('Dropable')).toBeNull();
  expect(inventory[1].getFieldByLabel('InventoryRes')?.getValue()).toBe('g_w_iongren02');
  expect(inventory[1].getFieldByLabel('Dropable')?.getValue()).toBe(1);
}

function buildUTTGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTT ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('GenericTrigger001'));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('generictrigge001'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName').setCExoLocString(new CExoLocString(42968)));
  r.addField(new GFFField(GFFDataType.BYTE, 'AutoRemoveKey').setValue(1));
  r.addField(new GFFField(GFFDataType.DWORD, 'Faction').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Cursor').setValue(1));
  r.addField(new GFFField(GFFDataType.FLOAT, 'HighlightHeight').setValue(3.0));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'KeyName').setValue('somekey'));
  r.addField(new GFFField(GFFDataType.WORD, 'LoadScreenID').setValue(0));
  r.addField(new GFFField(GFFDataType.WORD, 'PortraitId').setValue(0));
  r.addField(new GFFField(GFFDataType.INT, 'Type').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDetectDC').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapDisarmable').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'DisarmDC').setValue(10));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapFlag').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapOneShot').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'TrapType').setValue(1));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnDisarm').setValue('ondisarm'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnTrapTriggered').setValue('ontraptriggered'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnClick').setValue('onclick'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat').setValue('onheartbeat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnEnter').setValue('onenter'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnExit').setValue('onexit'));
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine').setValue('onuserdefined'));
  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(6));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('comment'));

  return gff;
}

function validateUTTFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('GenericTrigger001');
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('generictrigge001');
  expect(r.getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(42968);
  expect(r.getFieldByLabel('AutoRemoveKey')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Faction')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Cursor')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('HighlightHeight')?.getValue()).toBeCloseTo(3.0, 5);
  expect(r.getFieldByLabel('KeyName')?.getValue()).toBe('somekey');
  expect(r.getFieldByLabel('Type')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapDetectDC')?.getValue()).toBe(10);
  expect(r.getFieldByLabel('DisarmDC')?.getValue()).toBe(10);
  expect(r.getFieldByLabel('TrapFlag')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapOneShot')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('TrapType')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OnDisarm')?.getValue()).toBe('ondisarm');
  expect(r.getFieldByLabel('OnTrapTriggered')?.getValue()).toBe('ontraptriggered');
  expect(r.getFieldByLabel('ScriptHeartbeat')?.getValue()).toBe('onheartbeat');
  expect(r.getFieldByLabel('ScriptOnEnter')?.getValue()).toBe('onenter');
  expect(r.getFieldByLabel('ScriptOnExit')?.getValue()).toBe('onexit');
  expect(r.getFieldByLabel('ScriptUserDefine')?.getValue()).toBe('onuserdefined');
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(6);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('comment');
}

function buildUTSGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTS ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('3Csounds'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName').setCExoLocString(new CExoLocString(128551)));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('3csounds'));
  r.addField(new GFFField(GFFDataType.BYTE, 'Active').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Continuous').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Looping').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Positional').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'RandomPosition').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'Random').setValue(1));
  r.addField(new GFFField(GFFDataType.FLOAT, 'Elevation').setValue(1.5));
  r.addField(new GFFField(GFFDataType.FLOAT, 'MaxDistance').setValue(8.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'MinDistance').setValue(5.0));
  r.addField(new GFFField(GFFDataType.FLOAT, 'RandomRangeX').setValue(0.10000000149011612));
  r.addField(new GFFField(GFFDataType.FLOAT, 'RandomRangeY').setValue(0.20000000298023224));
  r.addField(new GFFField(GFFDataType.DWORD, 'Interval').setValue(4000));
  r.addField(new GFFField(GFFDataType.DWORD, 'IntervalVrtn').setValue(100));
  r.addField(new GFFField(GFFDataType.FLOAT, 'PitchVariation').setValue(0.10000000149011612));
  r.addField(new GFFField(GFFDataType.BYTE, 'Priority').setValue(22));
  r.addField(new GFFField(GFFDataType.DWORD, 'Hours').setValue(0));
  r.addField(new GFFField(GFFDataType.BYTE, 'Times').setValue(3));
  r.addField(new GFFField(GFFDataType.BYTE, 'Volume').setValue(120));
  r.addField(new GFFField(GFFDataType.BYTE, 'VolumeVrtn').setValue(7));

  const sounds = new GFFField(GFFDataType.LIST, 'Sounds');
  ['c_drdastro_dead', 'c_drdastro_atk1', 'p_t3-m4_dead', 'c_drdastro_atk2'].forEach((sound) => {
    const s = new GFFStruct(0);
    s.addField(new GFFField(GFFDataType.RESREF, 'Sound').setValue(sound));
    sounds.addChildStruct(s);
  });
  r.addField(sounds);

  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(6));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('comment'));

  return gff;
}

function validateUTSFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('3Csounds');
  expect(r.getFieldByLabel('LocName')?.getCExoLocString()?.getRESREF()).toBe(128551);
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('3csounds');
  expect(r.getFieldByLabel('Active')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Continuous')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Looping')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Positional')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('RandomPosition')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Random')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Elevation')?.getValue()).toBeCloseTo(1.5, 5);
  expect(r.getFieldByLabel('MaxDistance')?.getValue()).toBeCloseTo(8.0, 5);
  expect(r.getFieldByLabel('MinDistance')?.getValue()).toBeCloseTo(5.0, 5);
  expect(r.getFieldByLabel('RandomRangeX')?.getValue()).toBeCloseTo(0.1, 5);
  expect(r.getFieldByLabel('RandomRangeY')?.getValue()).toBeCloseTo(0.2, 5);
  expect(r.getFieldByLabel('Interval')?.getValue()).toBe(4000);
  expect(r.getFieldByLabel('IntervalVrtn')?.getValue()).toBe(100);
  expect(r.getFieldByLabel('PitchVariation')?.getValue()).toBeCloseTo(0.1, 5);
  expect(r.getFieldByLabel('Priority')?.getValue()).toBe(22);
  expect(r.getFieldByLabel('Times')?.getValue()).toBe(3);
  expect(r.getFieldByLabel('Volume')?.getValue()).toBe(120);
  expect(r.getFieldByLabel('VolumeVrtn')?.getValue()).toBe(7);
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(6);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('comment');

  const sounds = r.getFieldByLabel('Sounds')?.getChildStructs() ?? [];
  expect(sounds).toHaveLength(4);
  expect(sounds[3].getFieldByLabel('Sound')?.getValue()).toBe('c_drdastro_atk2');
}

function buildUTEGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTE ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('G_KATAARNGROUP01'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName').setCExoLocString(new CExoLocString(31918)));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('g_kataarngroup01'));
  r.addField(new GFFField(GFFDataType.BYTE, 'Active').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'Difficulty').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'DifficultyIndex').setValue(2));
  r.addField(new GFFField(GFFDataType.DWORD, 'Faction').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'MaxCreatures').setValue(6));
  r.addField(new GFFField(GFFDataType.BYTE, 'PlayerOnly').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'RecCreatures').setValue(3));
  r.addField(new GFFField(GFFDataType.BYTE, 'Reset').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'ResetTime').setValue(60));
  r.addField(new GFFField(GFFDataType.INT, 'Respawns').setValue(1));
  r.addField(new GFFField(GFFDataType.INT, 'SpawnOption').setValue(1));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnEntered').setValue('onentered'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnExit').setValue('onexit'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnExhausted').setValue('onexhausted'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnHeartbeat').setValue('onheartbeat'));
  r.addField(new GFFField(GFFDataType.RESREF, 'OnUserDefined').setValue('onuserdefined'));

  const creatures = new GFFField(GFFDataType.LIST, 'CreatureList');
  const creature0 = new GFFStruct(0);
  creature0.addField(new GFFField(GFFDataType.INT, 'Appearance').setValue(74));
  creature0.addField(new GFFField(GFFDataType.FLOAT, 'CR').setValue(4.0));
  creature0.addField(new GFFField(GFFDataType.RESREF, 'ResRef').setValue('g_kataarn01'));
  creature0.addField(new GFFField(GFFDataType.BYTE, 'SingleSpawn').setValue(1));
  creatures.addChildStruct(creature0);
  const creature1 = new GFFStruct(0);
  creature1.addField(new GFFField(GFFDataType.INT, 'Appearance').setValue(74));
  creature1.addField(new GFFField(GFFDataType.FLOAT, 'CR').setValue(8.0));
  creature1.addField(new GFFField(GFFDataType.RESREF, 'ResRef').setValue('g_kataarn02'));
  creature1.addField(new GFFField(GFFDataType.BYTE, 'SingleSpawn').setValue(1));
  creature1.addField(new GFFField(GFFDataType.INT, 'GuaranteedCount').setValue(1));
  creatures.addChildStruct(creature1);
  r.addField(creatures);

  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(7));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('Kashyyyk'));

  return gff;
}

function validateUTEFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('G_KATAARNGROUP01');
  expect(r.getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(31918);
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('g_kataarngroup01');
  expect(r.getFieldByLabel('Active')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('Difficulty')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('DifficultyIndex')?.getValue()).toBe(2);
  expect(r.getFieldByLabel('Faction')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('MaxCreatures')?.getValue()).toBe(6);
  expect(r.getFieldByLabel('PlayerOnly')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('RecCreatures')?.getValue()).toBe(3);
  expect(r.getFieldByLabel('Reset')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('ResetTime')?.getValue()).toBe(60);
  expect(r.getFieldByLabel('Respawns')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('SpawnOption')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('OnEntered')?.getValue()).toBe('onentered');
  expect(r.getFieldByLabel('OnExhausted')?.getValue()).toBe('onexhausted');
  expect(r.getFieldByLabel('OnUserDefined')?.getValue()).toBe('onuserdefined');
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(7);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('Kashyyyk');

  const creatures = r.getFieldByLabel('CreatureList')?.getChildStructs() ?? [];
  expect(creatures).toHaveLength(2);
  expect(creatures[1].getFieldByLabel('Appearance')?.getValue()).toBe(74);
  expect(creatures[1].getFieldByLabel('CR')?.getValue()).toBeCloseTo(8.0, 5);
  expect(creatures[1].getFieldByLabel('ResRef')?.getValue()).toBe('g_kataarn02');
  expect(creatures[1].getFieldByLabel('GuaranteedCount')?.getValue()).toBe(1);
  expect(creatures[1].getFieldByLabel('SingleSpawn')?.getValue()).toBe(1);
}

function buildUTWGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTW ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.BYTE, 'Appearance').setValue(1));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo').setValue(''));
  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('sw_mapnote011'));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('MN_106PER2'));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName').setCExoLocString(new CExoLocString(76857)));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description').setCExoLocString(new CExoLocString(-1)));
  r.addField(new GFFField(GFFDataType.BYTE, 'HasMapNote').setValue(1));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote').setCExoLocString(new CExoLocString(76858)));
  r.addField(new GFFField(GFFDataType.BYTE, 'MapNoteEnabled').setValue(1));
  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID').setValue(5));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('comment'));

  return gff;
}

function validateUTWFields(gff: GFFObject): void {
  const r = gff.RootNode;
  expect(r.getFieldByLabel('Appearance')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('LinkedTo')?.getValue()).toBe('');
  expect(r.getFieldByLabel('TemplateResRef')?.getValue()).toBe('sw_mapnote011');
  expect(r.getFieldByLabel('Tag')?.getValue()).toBe('MN_106PER2');
  expect(r.getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(76857);
  expect(r.getFieldByLabel('Description')?.getCExoLocString()?.getRESREF()).toBe(-1);
  expect(r.getFieldByLabel('HasMapNote')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('MapNote')?.getCExoLocString()?.getRESREF()).toBe(76858);
  expect(r.getFieldByLabel('MapNoteEnabled')?.getValue()).toBe(1);
  expect(r.getFieldByLabel('PaletteID')?.getValue()).toBe(5);
  expect(r.getFieldByLabel('Comment')?.getValue()).toBe('comment');
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GFF generics (vendor parity: test_utc, test_are, test_uti, test_utd, test_utp, test_utt, test_uts, test_ute, test_utw, test_git, test_dlg, test_fac, test_ifo, test_jrl, test_pth)', () => {

  // ── UTC ──────────────────────────────────────────────────────────────────

  it('UTC: all primitive fields survive binary round-trip (vendor test_utc parity)', () => {
    const original = buildUTCGff();
    const parsed = new GFFObject(original.getExportBuffer());
    validateUTCFields(parsed);
  });

  it('UTC: SkillList preserves 8 entries with sequential Rank values', () => {
    const gff = new GFFObject(buildUTCGff().getExportBuffer());
    const skillList = gff.RootNode.getFieldByLabel('SkillList')?.getChildStructs() ?? [];
    expect(skillList).toHaveLength(8);
    skillList.forEach((s, i) => {
      expect(s.getFieldByLabel('Rank')?.getValue()).toBe(i + 1);
    });
  });

  it('UTC: ClassList with nested KnownList0 survives binary round-trip', () => {
    const gff = new GFFObject(buildUTCGff().getExportBuffer());
    const classList = gff.RootNode.getFieldByLabel('ClassList')?.getChildStructs() ?? [];
    expect(classList[1].getFieldByLabel('ClassLevel')?.getValue()).toBe(3);
    const known = classList[1].getFieldByLabel('KnownList0')?.getChildStructs() ?? [];
    expect(known).toHaveLength(2);
    expect(known[0].getFieldByLabel('Spell')?.getValue()).toBe(9);
    expect(known[1].getFieldByLabel('Spell')?.getValue()).toBe(11);
  });

  it('UTC: CEXOLOCSTRING StrRef values survive binary round-trip', () => {
    const gff = new GFFObject(buildUTCGff().getExportBuffer());
    expect(gff.RootNode.getFieldByLabel('FirstName')?.getCExoLocString()?.getRESREF()).toBe(76046);
    expect(gff.RootNode.getFieldByLabel('LastName')?.getCExoLocString()?.getRESREF()).toBe(123);
  });

  it('UTC: Equip_ItemList struct ids and ResRefs survive binary round-trip', () => {
    const gff = new GFFObject(buildUTCGff().getExportBuffer());
    const equip = gff.RootNode.getFieldByLabel('Equip_ItemList')?.getChildStructs() ?? [];
    expect(equip[0].getType()).toBe(2);
    expect(equip[0].getFieldByLabel('EquippedRes')?.getValue()).toBe('mineruniform');
    expect(equip[0].getFieldByLabel('Dropable')?.getValue()).toBe(1);
    expect(equip[1].getType()).toBe(131072);
    expect(equip[1].getFieldByLabel('EquippedRes')?.getValue()).toBe('g_i_crhide008');
    expect(equip[1].getFieldByLabel('Dropable')).toBeNull();
  });

  it('UTC: FeatList preserves feats 93, 94 after binary round-trip', () => {
    const gff = new GFFObject(buildUTCGff().getExportBuffer());
    const featList = gff.RootNode.getFieldByLabel('FeatList')?.getChildStructs() ?? [];
    expect(featList).toHaveLength(2);
    expect(featList[0].getFieldByLabel('Feat')?.getValue()).toBe(93);
    expect(featList[1].getFieldByLabel('Feat')?.getValue()).toBe(94);
  });

  // ── ARE ──────────────────────────────────────────────────────────────────

  it('ARE: all primitive fields survive binary round-trip (vendor test_are parity)', () => {
    const original = buildAREGff();
    const parsed = new GFFObject(original.getExportBuffer());
    validateAREFields(parsed);
  });

  it('ARE: nested Map struct fields survive binary round-trip', () => {
    const gff = new GFFObject(buildAREGff().getExportBuffer());
    const mapInner = gff.RootNode.getFieldByLabel('Map')?.getChildStructs()[0];
    expect(mapInner?.getFieldByLabel('MapResX')?.getValue()).toBe(18);
    expect(mapInner?.getFieldByLabel('NorthAxis')?.getValue()).toBe(1);
    expect(mapInner?.getFieldByLabel('WorldPt1X')?.getValue()).toBeCloseTo(-14.18, 3);
  });

  it('ARE: Rooms list preserves two room entries with weather and audio data', () => {
    const gff = new GFFObject(buildAREGff().getExportBuffer());
    const rooms = gff.RootNode.getFieldByLabel('Rooms')?.getChildStructs() ?? [];
    expect(rooms).toHaveLength(2);
    expect(rooms[0].getFieldByLabel('RoomName')?.getValue()).toBe('002ebo');
    expect(rooms[0].getFieldByLabel('EnvAudio')?.getValue()).toBe(17);
    expect(rooms[0].getFieldByLabel('ForceRating')?.getValue()).toBe(1);
    expect(rooms[1].getFieldByLabel('RoomName')?.getValue()).toBe('002ebo2');
    expect(rooms[1].getFieldByLabel('ForceRating')?.getValue()).toBe(2);
  });

  it('ARE: Name CEXOLOCSTRING strref=75101 survives binary round-trip', () => {
    const gff = new GFFObject(buildAREGff().getExportBuffer());
    expect(gff.RootNode.getFieldByLabel('Name')?.getCExoLocString()?.getRESREF()).toBe(75101);
  });

  // ── UTI ──────────────────────────────────────────────────────────────────

  it('UTI: all primitive fields survive binary round-trip (vendor test_uti parity)', () => {
    const original = buildUTIGff();
    const parsed = new GFFObject(original.getExportBuffer());
    validateUTIFields(parsed);
  });

  it('UTI: PropertiesList with 2 entries (second having UpgradeType) survives binary round-trip', () => {
    const gff = new GFFObject(buildUTIGff().getExportBuffer());
    const props = gff.RootNode.getFieldByLabel('PropertiesList')?.getChildStructs() ?? [];
    expect(props).toHaveLength(2);
    expect(props[0].getFieldByLabel('UpgradeType')).toBeNull();
    expect(props[1].getFieldByLabel('UpgradeType')?.getValue()).toBe(24);
  });

  it('UTI: LocalizedName and DescIdentified strref values survive binary round-trip', () => {
    const gff = new GFFObject(buildUTIGff().getExportBuffer());
    expect(gff.RootNode.getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(5632);
    expect(gff.RootNode.getFieldByLabel('DescIdentified')?.getCExoLocString()?.getRESREF()).toBe(5633);
  });

  // ── UTD ──────────────────────────────────────────────────────────────────

  it('UTD: all primitive door fields survive binary round-trip (vendor test_utd parity)', () => {
    const parsed = new GFFObject(buildUTDGff().getExportBuffer());
    validateUTDFields(parsed);
  });

  it('UTD: door script hooks and lock/trap fields survive binary round-trip', () => {
    const gff = new GFFObject(buildUTDGff().getExportBuffer());
    expect(gff.RootNode.getFieldByLabel('OnClosed')?.getValue()).toBe('onclosed');
    expect(gff.RootNode.getFieldByLabel('OnDamaged')?.getValue()).toBe('ondamaged');
    expect(gff.RootNode.getFieldByLabel('OnSpellCastAt')?.getValue()).toBe('onspellcastat');
    expect(gff.RootNode.getFieldByLabel('TrapType')?.getValue()).toBe(2);
    expect(gff.RootNode.getFieldByLabel('OpenState')?.getValue()).toBe(1);
  });

  // ── UTP ──────────────────────────────────────────────────────────────────

  it('UTP: placeable fields and inventory survive binary round-trip (vendor test_utp parity)', () => {
    const parsed = new GFFObject(buildUTPGff().getExportBuffer());
    validateUTPFields(parsed);
  });

  it('UTP: ItemList preserves inventory order and Dropable semantics', () => {
    const gff = new GFFObject(buildUTPGff().getExportBuffer());
    const items = gff.RootNode.getFieldByLabel('ItemList')?.getChildStructs() ?? [];
    expect(items).toHaveLength(2);
    expect(items[0].getFieldByLabel('Repos_PosX')?.getValue()).toBe(0);
    expect(items[0].getFieldByLabel('Dropable')).toBeNull();
    expect(items[1].getFieldByLabel('Repos_PosX')?.getValue()).toBe(1);
    expect(items[1].getFieldByLabel('Dropable')?.getValue()).toBe(1);
  });

  // ── UTT ──────────────────────────────────────────────────────────────────

  it('UTT: trigger fields survive binary round-trip (vendor test_utt parity)', () => {
    const parsed = new GFFObject(buildUTTGff().getExportBuffer());
    validateUTTFields(parsed);
  });

  // ── UTS ──────────────────────────────────────────────────────────────────

  it('UTS: sound fields and Sounds list survive binary round-trip (vendor test_uts parity)', () => {
    const parsed = new GFFObject(buildUTSGff().getExportBuffer());
    validateUTSFields(parsed);
  });

  // ── UTE ──────────────────────────────────────────────────────────────────

  it('UTE: encounter fields and CreatureList survive binary round-trip (vendor test_ute parity)', () => {
    const parsed = new GFFObject(buildUTEGff().getExportBuffer());
    validateUTEFields(parsed);
  });

  it('UTE: CreatureList preserves challenge ratings and guaranteed count', () => {
    const gff = new GFFObject(buildUTEGff().getExportBuffer());
    const creatures = gff.RootNode.getFieldByLabel('CreatureList')?.getChildStructs() ?? [];
    expect(creatures).toHaveLength(2);
    expect(creatures[0].getFieldByLabel('CR')?.getValue()).toBeCloseTo(4.0, 5);
    expect(creatures[1].getFieldByLabel('GuaranteedCount')?.getValue()).toBe(1);
  });

  // ── UTW ──────────────────────────────────────────────────────────────────

  it('UTW: waypoint/map-note fields survive binary round-trip (vendor test_utw parity)', () => {
    const parsed = new GFFObject(buildUTWGff().getExportBuffer());
    validateUTWFields(parsed);
  });

  // ── Cross-format round-trips ──────────────────────────────────────────────

  it('UTC: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTCGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTCFields(step2);
  });

  it('ARE: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildAREGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateAREFields(step2);
  });

  it('UTI: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTIGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTIFields(step2);
  });

  it('UTD: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTDGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTDFields(step2);
  });

  it('UTP: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTPGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTPFields(step2);
  });

  it('UTT: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTTGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTTFields(step2);
  });

  it('UTS: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTSGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTSFields(step2);
  });

  it('UTE: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTEGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTEFields(step2);
  });

  it('UTW: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildUTWGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateUTWFields(step2);
  });

  // ── GIT ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_git.py :: TEST_GIT_XML / validate_io

  function buildGITGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'GIT ';
    const r = gff.RootNode;

    r.addField(new GFFField(GFFDataType.BYTE, 'UseTemplates').setValue(1));

    // AreaProperties struct (id=100)
    const areaProp = new GFFStruct(100);
    areaProp.addField(new GFFField(GFFDataType.INT, 'AmbientSndDay').setValue(17));
    areaProp.addField(new GFFField(GFFDataType.INT, 'AmbientSndNight').setValue(17));
    areaProp.addField(new GFFField(GFFDataType.INT, 'AmbientSndDayVol').setValue(127));
    areaProp.addField(new GFFField(GFFDataType.INT, 'AmbientSndNitVol').setValue(127));
    areaProp.addField(new GFFField(GFFDataType.INT, 'EnvAudio').setValue(1));
    areaProp.addField(new GFFField(GFFDataType.INT, 'MusicBattle').setValue(41));
    areaProp.addField(new GFFField(GFFDataType.INT, 'MusicDay').setValue(15));
    areaProp.addField(new GFFField(GFFDataType.INT, 'MusicNight').setValue(15));
    areaProp.addField(new GFFField(GFFDataType.INT, 'MusicDelay').setValue(20000));
    const areaPropField = new GFFField(GFFDataType.STRUCT, 'AreaProperties');
    areaPropField.childStructs = [areaProp];
    r.addField(areaPropField);

    // CameraList
    const cameraList = new GFFField(GFFDataType.LIST, 'CameraList');
    const cam = new GFFStruct(14);
    cam.addField(new GFFField(GFFDataType.INT, 'CameraID').setValue(1));
    cam.addField(new GFFField(GFFDataType.VECTOR, 'Position').setVector({ x: -57.16752624511719, y: -28.255794525146484, z: 0.0 }));
    cam.addField(new GFFField(GFFDataType.FLOAT, 'Pitch').setValue(69.69999694824219));
    cam.addField(new GFFField(GFFDataType.FLOAT, 'MicRange').setValue(0.0));
    cam.addField(new GFFField(GFFDataType.ORIENTATION, 'Orientation').setOrientation({ x: 0.9719610214233398, y: 0.0, z: 0.0, w: 0.23514211177825928 }));
    cam.addField(new GFFField(GFFDataType.FLOAT, 'Height').setValue(3.0));
    cam.addField(new GFFField(GFFDataType.FLOAT, 'FieldOfView').setValue(55.0));
    cameraList.addChildStruct(cam);
    r.addField(cameraList);

    // Creature List
    const creatureList = new GFFField(GFFDataType.LIST, 'Creature List');
    const creature = new GFFStruct(4);
    creature.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(-41.23826599121094));
    creature.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(-53.214324951171875));
    creature.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(0.0));
    creature.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation').setValue(-0.8314653635025024));
    creature.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation').setValue(0.5555765628814697));
    creature.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('c_ithorian001'));
    creatureList.addChildStruct(creature);
    r.addField(creatureList);

    // Door List
    const doorList = new GFFField(GFFDataType.LIST, 'Door List');
    const door = new GFFStruct(8);
    door.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('sw_door_taris007'));
    door.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('Ithorian'));
    door.addField(new GFFField(GFFDataType.RESREF, 'LinkedToModule').setValue('resref'));
    door.addField(new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo').setValue('linkedto'));
    door.addField(new GFFField(GFFDataType.BYTE, 'LinkedToFlags').setValue(1));
    door.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin').setCExoLocString(new CExoLocString(13)));
    door.addField(new GFFField(GFFDataType.FLOAT, 'X').setValue(-43.76350021362305));
    door.addField(new GFFField(GFFDataType.FLOAT, 'Y').setValue(-20.14310073852539));
    door.addField(new GFFField(GFFDataType.FLOAT, 'Z').setValue(1.0));
    door.addField(new GFFField(GFFDataType.FLOAT, 'Bearing').setValue(1.0));
    door.addField(new GFFField(GFFDataType.BYTE, 'UseTweakColor').setValue(1));
    door.addField(new GFFField(GFFDataType.DWORD, 'TweakColor').setValue(10197915));
    doorList.addChildStruct(door);
    r.addField(doorList);

    // Encounter List
    const encounterList = new GFFField(GFFDataType.LIST, 'Encounter List');
    const enc = new GFFStruct(7);
    enc.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('mercenariesentry'));
    enc.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(-41.31961441040039));
    enc.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(-19.222841262817383));
    enc.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(1.0));
    const encGeom = new GFFField(GFFDataType.LIST, 'Geometry');
    const geomPt = new GFFStruct(1);
    geomPt.addField(new GFFField(GFFDataType.FLOAT, 'X').setValue(-5.890754699707031));
    geomPt.addField(new GFFField(GFFDataType.FLOAT, 'Y').setValue(3.072599411010742));
    geomPt.addField(new GFFField(GFFDataType.FLOAT, 'Z').setValue(0.025000059977173805));
    encGeom.addChildStruct(geomPt);
    enc.addField(encGeom);
    const spawnList = new GFFField(GFFDataType.LIST, 'SpawnPointList');
    const spawn = new GFFStruct(2);
    spawn.addField(new GFFField(GFFDataType.FLOAT, 'X').setValue(-48.936973571777344));
    spawn.addField(new GFFField(GFFDataType.FLOAT, 'Y').setValue(-29.831298828125));
    spawn.addField(new GFFField(GFFDataType.FLOAT, 'Z').setValue(1.0));
    spawn.addField(new GFFField(GFFDataType.FLOAT, 'Orientation').setValue(0.19634968042373657));
    spawnList.addChildStruct(spawn);
    enc.addField(spawnList);
    encounterList.addChildStruct(enc);
    r.addField(encounterList);

    // SoundList
    const soundList = new GFFField(GFFDataType.LIST, 'SoundList');
    const sound = new GFFStruct(6);
    sound.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('computerpanne001'));
    sound.addField(new GFFField(GFFDataType.DWORD, 'GeneratedType').setValue(0));
    sound.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(-78.53829193115234));
    sound.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(13.498023986816406));
    sound.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(2.0));
    soundList.addChildStruct(sound);
    r.addField(soundList);

    // StoreList
    const storeList = new GFFField(GFFDataType.LIST, 'StoreList');
    const store = new GFFStruct(11);
    store.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(106.23011016845703));
    store.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(-16.590370178222656));
    store.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(0.0634458065032959));
    store.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation').setValue(0.0));
    store.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation').setValue(1.0));
    store.addField(new GFFField(GFFDataType.RESREF, 'ResRef').setValue('m_chano'));
    storeList.addChildStruct(store);
    r.addField(storeList);

    // TriggerList
    const triggerList = new GFFField(GFFDataType.LIST, 'TriggerList');
    const trigger = new GFFStruct(1);
    trigger.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('newgeneric001'));
    trigger.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('to_203TEL'));
    trigger.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin').setCExoLocString(new CExoLocString(104245)));
    trigger.addField(new GFFField(GFFDataType.RESREF, 'LinkedToModule').setValue('203tel'));
    trigger.addField(new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo').setValue('from_204TEL'));
    trigger.addField(new GFFField(GFFDataType.BYTE, 'LinkedToFlags').setValue(2));
    trigger.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(-29.903594970703125));
    trigger.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(-11.463098526000977));
    trigger.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(-2.384000062942505));
    const trigGeom = new GFFField(GFFDataType.LIST, 'Geometry');
    const trigPt = new GFFStruct(3);
    trigPt.addField(new GFFField(GFFDataType.FLOAT, 'PointX').setValue(-7.433097839355469));
    trigPt.addField(new GFFField(GFFDataType.FLOAT, 'PointY').setValue(1.2834482192993164));
    trigPt.addField(new GFFField(GFFDataType.FLOAT, 'PointZ').setValue(0.025282764807343483));
    trigGeom.addChildStruct(trigPt);
    trigger.addField(trigGeom);
    triggerList.addChildStruct(trigger);
    r.addField(triggerList);

    // WaypointList
    const waypointList = new GFFField(GFFDataType.LIST, 'WaypointList');
    const wp = new GFFStruct(5);
    wp.addField(new GFFField(GFFDataType.BYTE, 'Appearance').setValue(1));
    wp.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('wp_transabort'));
    wp.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('wp_transabort'));
    wp.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName').setCExoLocString(new CExoLocString(135283)));
    wp.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description').setCExoLocString(new CExoLocString(-1)));
    wp.addField(new GFFField(GFFDataType.BYTE, 'HasMapNote').setValue(1));
    wp.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'MapNote').setCExoLocString(new CExoLocString(123)));
    wp.addField(new GFFField(GFFDataType.BYTE, 'MapNoteEnabled').setValue(1));
    wp.addField(new GFFField(GFFDataType.FLOAT, 'XPosition').setValue(-33.620662689208984));
    wp.addField(new GFFField(GFFDataType.FLOAT, 'YPosition').setValue(-16.065120697021484));
    wp.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition').setValue(1.0));
    waypointList.addChildStruct(wp);
    r.addField(waypointList);

    // Placeable List
    const placeableList = new GFFField(GFFDataType.LIST, 'Placeable List');
    const plc = new GFFStruct(9);
    plc.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef').setValue('k_trans_abort'));
    plc.addField(new GFFField(GFFDataType.FLOAT, 'X').setValue(-33.26881408691406));
    plc.addField(new GFFField(GFFDataType.FLOAT, 'Y').setValue(-15.299334526062012));
    plc.addField(new GFFField(GFFDataType.FLOAT, 'Z').setValue(9.53600025177002));
    plc.addField(new GFFField(GFFDataType.FLOAT, 'Bearing').setValue(1.0));
    plc.addField(new GFFField(GFFDataType.BYTE, 'UseTweakColor').setValue(1));
    plc.addField(new GFFField(GFFDataType.DWORD, 'TweakColor').setValue(10197915));
    placeableList.addChildStruct(plc);
    r.addField(placeableList);

    return gff;
  }

  function validateGITFields(gff: GFFObject): void {
    const r = gff.RootNode;
    expect(r.getFieldByLabel('UseTemplates')?.getValue()).toBe(1);

    // AreaProperties
    const areaPropField = r.getFieldByLabel('AreaProperties');
    expect(areaPropField).not.toBeNull();
    const areaProp = areaPropField!.childStructs[0];
    expect(areaProp.getFieldByLabel('AmbientSndDayVol')?.getValue()).toBe(127);
    expect(areaProp.getFieldByLabel('MusicBattle')?.getValue()).toBe(41);
    expect(areaProp.getFieldByLabel('MusicDay')?.getValue()).toBe(15);
    expect(areaProp.getFieldByLabel('MusicDelay')?.getValue()).toBe(20000);

    // CameraList
    const cams = r.getFieldByLabel('CameraList')?.getChildStructs() ?? [];
    expect(cams).toHaveLength(1);
    expect(cams[0].getFieldByLabel('CameraID')?.getValue()).toBe(1);
    expect(cams[0].getFieldByLabel('FieldOfView')?.getValue()).toBeCloseTo(55.0, 2);
    expect(cams[0].getFieldByLabel('Height')?.getValue()).toBeCloseTo(3.0, 3);
    const pos = cams[0].getFieldByLabel('Position')?.getVector();
    expect(pos?.x).toBeCloseTo(-57.167, 2);
    expect(pos?.y).toBeCloseTo(-28.255, 2);
    const ori = cams[0].getFieldByLabel('Orientation')?.getOrientation();
    expect(ori?.x).toBeCloseTo(0.9719, 3);
    expect(ori?.w).toBeCloseTo(0.2351, 3);

    // Creature List
    const creatures = r.getFieldByLabel('Creature List')?.getChildStructs() ?? [];
    expect(creatures).toHaveLength(1);
    expect(creatures[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('c_ithorian001');
    expect(creatures[0].getFieldByLabel('XPosition')?.getValue()).toBeCloseTo(-41.238, 2);
    expect(creatures[0].getFieldByLabel('YPosition')?.getValue()).toBeCloseTo(-53.214, 2);

    // Door List
    const doors = r.getFieldByLabel('Door List')?.getChildStructs() ?? [];
    expect(doors).toHaveLength(1);
    expect(doors[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('sw_door_taris007');
    expect(doors[0].getFieldByLabel('Tag')?.getValue()).toBe('Ithorian');
    expect(doors[0].getFieldByLabel('LinkedTo')?.getValue()).toBe('linkedto');
    expect(doors[0].getFieldByLabel('LinkedToFlags')?.getValue()).toBe(1);
    expect(doors[0].getFieldByLabel('TransitionDestin')?.getCExoLocString()?.getRESREF()).toBe(13);
    expect(doors[0].getFieldByLabel('TweakColor')?.getValue()).toBe(10197915);
    expect(doors[0].getFieldByLabel('Bearing')?.getValue()).toBeCloseTo(1.0, 3);

    // Encounter List
    const encs = r.getFieldByLabel('Encounter List')?.getChildStructs() ?? [];
    expect(encs).toHaveLength(1);
    expect(encs[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('mercenariesentry');
    expect(encs[0].getFieldByLabel('XPosition')?.getValue()).toBeCloseTo(-41.319, 2);
    const geomPts = encs[0].getFieldByLabel('Geometry')?.getChildStructs() ?? [];
    expect(geomPts).toHaveLength(1);
    expect(geomPts[0].getFieldByLabel('X')?.getValue()).toBeCloseTo(-5.890, 2);
    const spawnPts = encs[0].getFieldByLabel('SpawnPointList')?.getChildStructs() ?? [];
    expect(spawnPts).toHaveLength(1);
    expect(spawnPts[0].getFieldByLabel('X')?.getValue()).toBeCloseTo(-48.936, 2);
    expect(spawnPts[0].getFieldByLabel('Orientation')?.getValue()).toBeCloseTo(0.196, 2);

    // SoundList
    const sounds = r.getFieldByLabel('SoundList')?.getChildStructs() ?? [];
    expect(sounds).toHaveLength(1);
    expect(sounds[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('computerpanne001');
    expect(sounds[0].getFieldByLabel('YPosition')?.getValue()).toBeCloseTo(13.498, 2);

    // StoreList
    const stores = r.getFieldByLabel('StoreList')?.getChildStructs() ?? [];
    expect(stores).toHaveLength(1);
    expect(stores[0].getFieldByLabel('ResRef')?.getValue()).toBe('m_chano');
    expect(stores[0].getFieldByLabel('XPosition')?.getValue()).toBeCloseTo(106.230, 2);

    // TriggerList
    const triggers = r.getFieldByLabel('TriggerList')?.getChildStructs() ?? [];
    expect(triggers).toHaveLength(1);
    expect(triggers[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('newgeneric001');
    expect(triggers[0].getFieldByLabel('Tag')?.getValue()).toBe('to_203TEL');
    expect(triggers[0].getFieldByLabel('LinkedToModule')?.getValue()).toBe('203tel');
    expect(triggers[0].getFieldByLabel('LinkedToFlags')?.getValue()).toBe(2);
    expect(triggers[0].getFieldByLabel('TransitionDestin')?.getCExoLocString()?.getRESREF()).toBe(104245);
    const trigPts = triggers[0].getFieldByLabel('Geometry')?.getChildStructs() ?? [];
    expect(trigPts).toHaveLength(1);
    expect(trigPts[0].getFieldByLabel('PointX')?.getValue()).toBeCloseTo(-7.433, 2);

    // WaypointList
    const wps = r.getFieldByLabel('WaypointList')?.getChildStructs() ?? [];
    expect(wps).toHaveLength(1);
    expect(wps[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('wp_transabort');
    expect(wps[0].getFieldByLabel('Tag')?.getValue()).toBe('wp_transabort');
    expect(wps[0].getFieldByLabel('LocalizedName')?.getCExoLocString()?.getRESREF()).toBe(135283);
    expect(wps[0].getFieldByLabel('MapNote')?.getCExoLocString()?.getRESREF()).toBe(123);
    expect(wps[0].getFieldByLabel('MapNoteEnabled')?.getValue()).toBe(1);

    // Placeable List
    const plcs = r.getFieldByLabel('Placeable List')?.getChildStructs() ?? [];
    expect(plcs).toHaveLength(1);
    expect(plcs[0].getFieldByLabel('TemplateResRef')?.getValue()).toBe('k_trans_abort');
    expect(plcs[0].getFieldByLabel('Bearing')?.getValue()).toBeCloseTo(1.0, 3);
    expect(plcs[0].getFieldByLabel('TweakColor')?.getValue()).toBe(10197915);
  }

  it('GIT: all list counts and root fields survive binary round-trip (vendor test_git k2 parity)', () => {
    const parsed = new GFFObject(buildGITGff().getExportBuffer());
    validateGITFields(parsed);
  });

  it('GIT: AreaProperties sub-struct fields survive binary round-trip', () => {
    const gff = new GFFObject(buildGITGff().getExportBuffer());
    const ap = gff.RootNode.getFieldByLabel('AreaProperties')!.childStructs[0];
    expect(ap.getFieldByLabel('EnvAudio')?.getValue()).toBe(1);
    expect(ap.getFieldByLabel('AmbientSndDay')?.getValue()).toBe(17);
  });

  it('GIT: CameraList VECTOR and ORIENTATION fields survive binary round-trip', () => {
    const gff = new GFFObject(buildGITGff().getExportBuffer());
    const cam = gff.RootNode.getFieldByLabel('CameraList')!.getChildStructs()[0];
    const pos = cam.getFieldByLabel('Position')!.getVector();
    expect(pos.x).toBeCloseTo(-57.167, 2);
    expect(pos.z).toBeCloseTo(0.0, 3);
    const ori = cam.getFieldByLabel('Orientation')!.getOrientation();
    expect(ori.x).toBeCloseTo(0.9719, 3);
  });

  it('GIT: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildGITGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateGITFields(step2);
  });

  // ── DLG ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_dlg.py :: TEST_DLG_XML / validate_io

  function buildDLGGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'DLG ';
    const r = gff.RootNode;

    r.addField(new GFFField(GFFDataType.DWORD, 'DelayEntry').setValue(13));
    r.addField(new GFFField(GFFDataType.DWORD, 'DelayReply').setValue(14));
    r.addField(new GFFField(GFFDataType.DWORD, 'NumWords').setValue(1337));
    r.addField(new GFFField(GFFDataType.RESREF, 'EndConverAbort').setValue('abort'));
    r.addField(new GFFField(GFFDataType.RESREF, 'EndConversation').setValue('end'));
    r.addField(new GFFField(GFFDataType.BYTE, 'Skippable').setValue(1));
    r.addField(new GFFField(GFFDataType.RESREF, 'AmbientTrack').setValue('track'));
    r.addField(new GFFField(GFFDataType.BYTE, 'AnimatedCut').setValue(123));
    r.addField(new GFFField(GFFDataType.RESREF, 'CameraModel').setValue('camm'));
    r.addField(new GFFField(GFFDataType.BYTE, 'ComputerType').setValue(1));
    r.addField(new GFFField(GFFDataType.INT, 'ConversationType').setValue(1));
    r.addField(new GFFField(GFFDataType.BYTE, 'OldHitCheck').setValue(1));

    // EntryList — 1 full entry (id=0) + 2 minimal (id=1,2)
    function makeLink(structId: number, index: number): GFFStruct {
      const s = new GFFStruct(structId);
      s.addField(new GFFField(GFFDataType.DWORD, 'Index').setValue(index));
      s.addField(new GFFField(GFFDataType.RESREF, 'Active').setValue(''));
      s.addField(new GFFField(GFFDataType.BYTE, 'IsChild').setValue(0));
      s.addField(new GFFField(GFFDataType.RESREF, 'Active2').setValue(''));
      for (let p = 1; p <= 5; p++) {
        s.addField(new GFFField(GFFDataType.INT, `Param${p}`).setValue(0));
        s.addField(new GFFField(GFFDataType.INT, `Param${p}b`).setValue(0));
      }
      s.addField(new GFFField(GFFDataType.CEXOSTRING, 'ParamStrA').setValue(''));
      s.addField(new GFFField(GFFDataType.CEXOSTRING, 'ParamStrB').setValue(''));
      s.addField(new GFFField(GFFDataType.BYTE, 'Not').setValue(0));
      s.addField(new GFFField(GFFDataType.BYTE, 'Not2').setValue(0));
      s.addField(new GFFField(GFFDataType.INT, 'Logic').setValue(0));
      return s;
    }

    function makeAnimList(pairs: Array<{ p: string; anim: number }>): GFFField {
      const list = new GFFField(GFFDataType.LIST, 'AnimList');
      pairs.forEach(({ p, anim }) => {
        const s = new GFFStruct(0);
        s.addField(new GFFField(GFFDataType.CEXOSTRING, 'Participant').setValue(p));
        s.addField(new GFFField(GFFDataType.WORD, 'Animation').setValue(anim));
        list.addChildStruct(s);
      });
      return list;
    }

    function makeNodeExtra(entry: GFFStruct): void {
      entry.addField(new GFFField(GFFDataType.BYTE, 'SoundExists').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam1').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam1b').setValue(2));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam2').setValue(3));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam2b').setValue(4));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam3').setValue(5));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam3b').setValue(6));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam4').setValue(7));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam4b').setValue(8));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam5').setValue(9));
      entry.addField(new GFFField(GFFDataType.INT, 'ActionParam5b').setValue(11));
      entry.addField(new GFFField(GFFDataType.CEXOSTRING, 'ActionParamStrA').setValue('aaa'));
      entry.addField(new GFFField(GFFDataType.CEXOSTRING, 'ActionParamStrB').setValue('bbb'));
      entry.addField(new GFFField(GFFDataType.INT, 'AlienRaceNode').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'CamVidEffect').setValue(-1));
      entry.addField(new GFFField(GFFDataType.BYTE, 'Changed').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'Emotion').setValue(4));
      entry.addField(new GFFField(GFFDataType.INT, 'FacialAnim').setValue(2));
      entry.addField(new GFFField(GFFDataType.INT, 'NodeID').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'NodeUnskippable').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'PostProcNode').setValue(3));
      entry.addField(new GFFField(GFFDataType.INT, 'RecordNoOverri').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'RecordVO').setValue(1));
      entry.addField(new GFFField(GFFDataType.RESREF, 'Script2').setValue('num2'));
      entry.addField(new GFFField(GFFDataType.INT, 'VOTextChanged').setValue(1));
      entry.addField(new GFFField(GFFDataType.INT, 'CameraID').setValue(32));
      entry.addField(new GFFField(GFFDataType.INT, 'RecordNoVOOverri').setValue(1));
    }

    const entryList = new GFFField(GFFDataType.LIST, 'EntryList');

    // Entry 0 — full
    const entry0 = new GFFStruct(0);
    entry0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Speaker').setValue('bark'));
    entry0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Listener').setValue('yoohoo'));
    entry0.addField(makeAnimList([{ p: 'aaa', anim: 1200 }, { p: 'bbb', anim: 2400 }]));
    const text0 = new GFFField(GFFDataType.CEXOLOCSTRING, 'Text');
    const ls0 = new CExoLocString(-1);
    entry0.addField(text0.setCExoLocString(ls0));
    entry0.addField(new GFFField(GFFDataType.RESREF, 'VO_ResRef').setValue('gand'));
    entry0.addField(new GFFField(GFFDataType.RESREF, 'Script').setValue('num1'));
    entry0.addField(new GFFField(GFFDataType.DWORD, 'Delay').setValue(0xFFFFFFFF));
    entry0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('commentto'));
    entry0.addField(new GFFField(GFFDataType.RESREF, 'Sound').setValue('gonk'));
    entry0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Quest').setValue('quest'));
    entry0.addField(new GFFField(GFFDataType.INT, 'PlotIndex').setValue(-1));
    entry0.addField(new GFFField(GFFDataType.FLOAT, 'PlotXPPercentage').setValue(1.0));
    entry0.addField(new GFFField(GFFDataType.DWORD, 'WaitFlags').setValue(1));
    entry0.addField(new GFFField(GFFDataType.DWORD, 'CameraAngle').setValue(14));
    entry0.addField(new GFFField(GFFDataType.BYTE, 'FadeType').setValue(1));
    const replies0 = new GFFField(GFFDataType.LIST, 'RepliesList');
    replies0.addChildStruct(makeLink(0, 0));
    replies0.addChildStruct(makeLink(1, 1));
    entry0.addField(replies0);
    makeNodeExtra(entry0);
    entryList.addChildStruct(entry0);

    // Entries 1 & 2 — minimal
    for (let i = 1; i <= 2; i++) {
      const e = new GFFStruct(i);
      e.addField(new GFFField(GFFDataType.CEXOSTRING, 'Speaker').setValue(''));
      e.addField(new GFFField(GFFDataType.CEXOSTRING, 'Listener').setValue(''));
      e.addField(makeAnimList([]));
      e.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text').setCExoLocString(new CExoLocString(-1)));
      e.addField(new GFFField(GFFDataType.RESREF, 'VO_ResRef').setValue(''));
      e.addField(new GFFField(GFFDataType.RESREF, 'Script').setValue(''));
      e.addField(new GFFField(GFFDataType.DWORD, 'Delay').setValue(0xFFFFFFFF));
      e.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue(''));
      e.addField(new GFFField(GFFDataType.RESREF, 'Sound').setValue(''));
      e.addField(new GFFField(GFFDataType.CEXOSTRING, 'Quest').setValue(''));
      e.addField(new GFFField(GFFDataType.INT, 'PlotIndex').setValue(-1));
      e.addField(new GFFField(GFFDataType.FLOAT, 'PlotXPPercentage').setValue(1.0));
      e.addField(new GFFField(GFFDataType.DWORD, 'WaitFlags').setValue(0));
      e.addField(new GFFField(GFFDataType.DWORD, 'CameraAngle').setValue(0));
      e.addField(new GFFField(GFFDataType.BYTE, 'FadeType').setValue(0));
      e.addField(new GFFField(GFFDataType.LIST, 'RepliesList'));
      entryList.addChildStruct(e);
    }
    r.addField(entryList);

    // ReplyList — 2 entries
    const replyList = new GFFField(GFFDataType.LIST, 'ReplyList');
    const reply0 = new GFFStruct(0);
    reply0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Listener').setValue(''));
    reply0.addField(makeAnimList([]));
    reply0.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text').setCExoLocString(new CExoLocString(-1)));
    reply0.addField(new GFFField(GFFDataType.RESREF, 'VO_ResRef').setValue(''));
    reply0.addField(new GFFField(GFFDataType.RESREF, 'Script').setValue(''));
    reply0.addField(new GFFField(GFFDataType.DWORD, 'Delay').setValue(0xFFFFFFFF));
    reply0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue(''));
    reply0.addField(new GFFField(GFFDataType.RESREF, 'Sound').setValue(''));
    reply0.addField(new GFFField(GFFDataType.CEXOSTRING, 'Quest').setValue(''));
    reply0.addField(new GFFField(GFFDataType.INT, 'PlotIndex').setValue(-1));
    reply0.addField(new GFFField(GFFDataType.FLOAT, 'PlotXPPercentage').setValue(1.0));
    reply0.addField(new GFFField(GFFDataType.DWORD, 'WaitFlags').setValue(0));
    reply0.addField(new GFFField(GFFDataType.DWORD, 'CameraAngle').setValue(0));
    reply0.addField(new GFFField(GFFDataType.BYTE, 'FadeType').setValue(0));
    const entries0 = new GFFField(GFFDataType.LIST, 'EntriesList');
    entries0.addChildStruct(makeLink(0, 0));
    reply0.addField(entries0);
    replyList.addChildStruct(reply0);

    const reply1 = new GFFStruct(1);
    reply1.addField(new GFFField(GFFDataType.CEXOSTRING, 'Listener').setValue(''));
    reply1.addField(makeAnimList([{ p: 'aaa', anim: 1200 }, { p: 'bbb', anim: 2400 }]));
    reply1.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text').setCExoLocString(new CExoLocString(-1)));
    reply1.addField(new GFFField(GFFDataType.RESREF, 'VO_ResRef').setValue(''));
    reply1.addField(new GFFField(GFFDataType.RESREF, 'Script').setValue(''));
    reply1.addField(new GFFField(GFFDataType.DWORD, 'Delay').setValue(0xFFFFFFFF));
    reply1.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue(''));
    reply1.addField(new GFFField(GFFDataType.RESREF, 'Sound').setValue(''));
    reply1.addField(new GFFField(GFFDataType.CEXOSTRING, 'Quest').setValue(''));
    reply1.addField(new GFFField(GFFDataType.INT, 'PlotIndex').setValue(-1));
    reply1.addField(new GFFField(GFFDataType.FLOAT, 'PlotXPPercentage').setValue(1.0));
    reply1.addField(new GFFField(GFFDataType.DWORD, 'WaitFlags').setValue(0));
    reply1.addField(new GFFField(GFFDataType.DWORD, 'CameraAngle').setValue(0));
    reply1.addField(new GFFField(GFFDataType.BYTE, 'FadeType').setValue(0));
    const entries1 = new GFFField(GFFDataType.LIST, 'EntriesList');
    entries1.addChildStruct(makeLink(0, 1));
    reply1.addField(entries1);
    replyList.addChildStruct(reply1);
    r.addField(replyList);

    // StartingList — 2 entries pointing to entries 0 and 2
    const startingList = new GFFField(GFFDataType.LIST, 'StartingList');
    startingList.addChildStruct(makeLink(0, 0));
    startingList.addChildStruct(makeLink(1, 2));
    r.addField(startingList);

    return gff;
  }

  function validateDLGFields(gff: GFFObject): void {
    const r = gff.RootNode;
    expect(r.getFieldByLabel('DelayEntry')?.getValue()).toBe(13);
    expect(r.getFieldByLabel('DelayReply')?.getValue()).toBe(14);
    expect(r.getFieldByLabel('NumWords')?.getValue()).toBe(1337);
    expect(r.getFieldByLabel('EndConverAbort')?.getValue()).toBe('abort');
    expect(r.getFieldByLabel('EndConversation')?.getValue()).toBe('end');
    expect(r.getFieldByLabel('Skippable')?.getValue()).toBe(1);
    expect(r.getFieldByLabel('AmbientTrack')?.getValue()).toBe('track');
    expect(r.getFieldByLabel('AnimatedCut')?.getValue()).toBe(123);
    expect(r.getFieldByLabel('CameraModel')?.getValue()).toBe('camm');
    expect(r.getFieldByLabel('ComputerType')?.getValue()).toBe(1);
    expect(r.getFieldByLabel('ConversationType')?.getValue()).toBe(1);

    const entries = r.getFieldByLabel('EntryList')?.getChildStructs() ?? [];
    expect(entries).toHaveLength(3);
    expect(entries[0].getFieldByLabel('Speaker')?.getValue()).toBe('bark');
    expect(entries[0].getFieldByLabel('Listener')?.getValue()).toBe('yoohoo');
    expect(entries[0].getFieldByLabel('VO_ResRef')?.getValue()).toBe('gand');
    expect(entries[0].getFieldByLabel('Script')?.getValue()).toBe('num1');
    expect(entries[0].getFieldByLabel('Comment')?.getValue()).toBe('commentto');
    expect(entries[0].getFieldByLabel('Sound')?.getValue()).toBe('gonk');
    expect(entries[0].getFieldByLabel('Quest')?.getValue()).toBe('quest');
    expect(entries[0].getFieldByLabel('Delay')?.getValue()).toBe(0xFFFFFFFF);
    expect(entries[0].getFieldByLabel('WaitFlags')?.getValue()).toBe(1);
    expect(entries[0].getFieldByLabel('CameraAngle')?.getValue()).toBe(14);
    expect(entries[0].getFieldByLabel('FadeType')?.getValue()).toBe(1);
    expect(entries[0].getFieldByLabel('ActionParam1')?.getValue()).toBe(1);
    expect(entries[0].getFieldByLabel('ActionParamStrA')?.getValue()).toBe('aaa');
    expect(entries[0].getFieldByLabel('NodeID')?.getValue()).toBe(1);
    expect(entries[0].getFieldByLabel('Emotion')?.getValue()).toBe(4);
    expect(entries[0].getFieldByLabel('CameraID')?.getValue()).toBe(32);
    expect(entries[0].getFieldByLabel('Script2')?.getValue()).toBe('num2');

    const animList0 = entries[0].getFieldByLabel('AnimList')?.getChildStructs() ?? [];
    expect(animList0).toHaveLength(2);
    expect(animList0[0].getFieldByLabel('Participant')?.getValue()).toBe('aaa');
    expect(animList0[0].getFieldByLabel('Animation')?.getValue()).toBe(1200);
    expect(animList0[1].getFieldByLabel('Participant')?.getValue()).toBe('bbb');
    expect(animList0[1].getFieldByLabel('Animation')?.getValue()).toBe(2400);

    const repliesList0 = entries[0].getFieldByLabel('RepliesList')?.getChildStructs() ?? [];
    expect(repliesList0).toHaveLength(2);
    expect(repliesList0[0].getFieldByLabel('Index')?.getValue()).toBe(0);
    expect(repliesList0[1].getFieldByLabel('Index')?.getValue()).toBe(1);

    const replies = r.getFieldByLabel('ReplyList')?.getChildStructs() ?? [];
    expect(replies).toHaveLength(2);
    const entriesList0 = replies[0].getFieldByLabel('EntriesList')?.getChildStructs() ?? [];
    expect(entriesList0).toHaveLength(1);
    expect(entriesList0[0].getFieldByLabel('Index')?.getValue()).toBe(0);

    const animList1 = replies[1].getFieldByLabel('AnimList')?.getChildStructs() ?? [];
    expect(animList1).toHaveLength(2);
    expect(animList1[0].getFieldByLabel('Animation')?.getValue()).toBe(1200);

    const starting = r.getFieldByLabel('StartingList')?.getChildStructs() ?? [];
    expect(starting).toHaveLength(2);
    expect(starting[0].getFieldByLabel('Index')?.getValue()).toBe(0);
    expect(starting[1].getFieldByLabel('Index')?.getValue()).toBe(2);
  }

  it('DLG: header fields and EntryList/ReplyList counts survive binary round-trip (vendor test_dlg parity)', () => {
    const parsed = new GFFObject(buildDLGGff().getExportBuffer());
    validateDLGFields(parsed);
  });

  it('DLG: AnimList entries in entries[0] survive binary round-trip', () => {
    const gff = new GFFObject(buildDLGGff().getExportBuffer());
    const entries = gff.RootNode.getFieldByLabel('EntryList')!.getChildStructs();
    const anims = entries[0].getFieldByLabel('AnimList')!.getChildStructs();
    expect(anims[0].getFieldByLabel('Participant')?.getValue()).toBe('aaa');
    expect(anims[0].getFieldByLabel('Animation')?.getValue()).toBe(1200);
    expect(anims[1].getFieldByLabel('Participant')?.getValue()).toBe('bbb');
    expect(anims[1].getFieldByLabel('Animation')?.getValue()).toBe(2400);
  });

  it('DLG: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildDLGGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateDLGFields(step2);
  });

  // ── FAC ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_fac.py :: TEST_FAC_XML / validate_io

  function buildFACGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'FAC ';
    const r = gff.RootNode;

    // FactionList — 4 factions
    const factionList = new GFFField(GFFDataType.LIST, 'FactionList');
    const factionData = [
      { name: 'PC',       global: 0, parentId: 0xFFFFFFFF },
      { name: 'Hostile',  global: 1, parentId: 0xFFFFFFFF },
      { name: 'Commoner', global: 0, parentId: 0xFFFFFFFF },
      { name: 'Merchant', global: 0, parentId: 0xFFFFFFFF },
    ];
    factionData.forEach(({ name, global: g, parentId }, idx) => {
      const s = new GFFStruct(idx);
      s.addField(new GFFField(GFFDataType.CEXOSTRING, 'FactionName').setValue(name));
      s.addField(new GFFField(GFFDataType.WORD, 'FactionGlobal').setValue(g));
      s.addField(new GFFField(GFFDataType.DWORD, 'FactionParentID').setValue(parentId));
      factionList.addChildStruct(s);
    });
    r.addField(factionList);

    // RepList — 12 reputation entries
    const repList = new GFFField(GFFDataType.LIST, 'RepList');
    const repData: Array<[number, number, number]> = [
      [1, 0, 5], [0, 1, 5], [2, 0, 100], [0, 2, 100],
      [1, 2, 0], [2, 1, 10], [3, 0, 100], [0, 3, 100],
      [1, 3, 0], [3, 1, 5], [2, 3, 95], [3, 2, 95],
    ];
    repData.forEach(([id1, id2, rep], idx) => {
      const s = new GFFStruct(idx);
      s.addField(new GFFField(GFFDataType.DWORD, 'FactionID1').setValue(id1));
      s.addField(new GFFField(GFFDataType.DWORD, 'FactionID2').setValue(id2));
      s.addField(new GFFField(GFFDataType.DWORD, 'FactionRep').setValue(rep));
      repList.addChildStruct(s);
    });
    r.addField(repList);

    return gff;
  }

  function validateFACFields(gff: GFFObject): void {
    const r = gff.RootNode;

    const factions = r.getFieldByLabel('FactionList')?.getChildStructs() ?? [];
    expect(factions).toHaveLength(4);
    expect(factions[0].getFieldByLabel('FactionName')?.getValue()).toBe('PC');
    expect(factions[0].getFieldByLabel('FactionGlobal')?.getValue()).toBe(0);
    expect(factions[0].getFieldByLabel('FactionParentID')?.getValue()).toBe(0xFFFFFFFF);
    expect(factions[1].getFieldByLabel('FactionName')?.getValue()).toBe('Hostile');
    expect(factions[1].getFieldByLabel('FactionGlobal')?.getValue()).toBe(1);
    expect(factions[2].getFieldByLabel('FactionName')?.getValue()).toBe('Commoner');
    expect(factions[3].getFieldByLabel('FactionName')?.getValue()).toBe('Merchant');

    const reps = r.getFieldByLabel('RepList')?.getChildStructs() ?? [];
    expect(reps).toHaveLength(12);

    // Hostile(1) vs PC(0) = 5
    const hostileToPC = reps.find(s =>
      s.getFieldByLabel('FactionID1')?.getValue() === 1 &&
      s.getFieldByLabel('FactionID2')?.getValue() === 0
    );
    expect(hostileToPC?.getFieldByLabel('FactionRep')?.getValue()).toBe(5);

    // Commoner(2) vs PC(0) = 100
    const commonerToPC = reps.find(s =>
      s.getFieldByLabel('FactionID1')?.getValue() === 2 &&
      s.getFieldByLabel('FactionID2')?.getValue() === 0
    );
    expect(commonerToPC?.getFieldByLabel('FactionRep')?.getValue()).toBe(100);

    // Hostile(1) vs Commoner(2) = 0
    const hostileToCommoner = reps.find(s =>
      s.getFieldByLabel('FactionID1')?.getValue() === 1 &&
      s.getFieldByLabel('FactionID2')?.getValue() === 2
    );
    expect(hostileToCommoner?.getFieldByLabel('FactionRep')?.getValue()).toBe(0);

    // Merchant(3) vs Commoner(2) = 95
    const merchantToCommoner = reps.find(s =>
      s.getFieldByLabel('FactionID1')?.getValue() === 3 &&
      s.getFieldByLabel('FactionID2')?.getValue() === 2
    );
    expect(merchantToCommoner?.getFieldByLabel('FactionRep')?.getValue()).toBe(95);
  }

  it('FAC: FactionList and RepList survive binary round-trip (vendor test_fac parity)', () => {
    const parsed = new GFFObject(buildFACGff().getExportBuffer());
    validateFACFields(parsed);
  });

  it('FAC: FactionParentID DWORD max value (0xFFFFFFFF) survives binary round-trip', () => {
    const gff = new GFFObject(buildFACGff().getExportBuffer());
    const factions = gff.RootNode.getFieldByLabel('FactionList')!.getChildStructs();
    expect(factions[0].getFieldByLabel('FactionParentID')?.getValue()).toBe(0xFFFFFFFF);
    expect(factions[1].getFieldByLabel('FactionParentID')?.getValue()).toBe(0xFFFFFFFF);
  });

  it('FAC: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildFACGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateFACFields(step2);
  });

  // ── IFO ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_ifo.py :: TEST_IFO_XML / validate_io

  function buildIFOGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'IFO ';
    const r = gff.RootNode;

    // Mod_ID as VOID (16 bytes) — use setData() for binary payloads
    const modId = new GFFField(GFFDataType.VOID, 'Mod_ID');
    modId.setData(new Uint8Array([0x52, 0x3A, 0xE5, 0x9E, 0xE3, 0x73, 0x71, 0x1D, 0x0F, 0xF0, 0x69, 0x9C, 0xB9, 0x61, 0x9F, 0xA7]));
    r.addField(modId);

    r.addField(new GFFField(GFFDataType.INT, 'Mod_Creator_ID').setValue(2));
    r.addField(new GFFField(GFFDataType.DWORD, 'Mod_Version').setValue(3));
    r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_VO_ID').setValue('262'));
    r.addField(new GFFField(GFFDataType.WORD, 'Expansion_Pack').setValue(0));
    r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Name').setCExoLocString(new CExoLocString(83947)));
    r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Tag').setValue('262TEL'));
    r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Mod_Hak').setValue(''));
    r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_Description').setCExoLocString(new CExoLocString(-1)));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame').setValue(0));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_Entry_Area').setValue('262tel'));
    r.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_X').setValue(2.5811009407043457));
    r.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Y').setValue(41.46979522705078));
    r.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Z').setValue(21.372770309448242));
    r.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_X').setValue(1.5099580252808664e-07));
    r.addField(new GFFField(GFFDataType.FLOAT, 'Mod_Entry_Dir_Y').setValue(-1.0));
    r.addField(new GFFField(GFFDataType.LIST, 'Mod_Expan_List'));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_DawnHour').setValue(6));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_DuskHour').setValue(18));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_MinPerHour').setValue(2));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartMonth').setValue(6));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartDay').setValue(1));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_StartHour').setValue(13));
    r.addField(new GFFField(GFFDataType.DWORD, 'Mod_StartYear').setValue(1372));
    r.addField(new GFFField(GFFDataType.BYTE, 'Mod_XPScale').setValue(10));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnHeartbeat').setValue('heartbeat'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnModLoad').setValue('load'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnModStart').setValue('start'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnClientEntr').setValue('enter'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnClientLeav').setValue('leave'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnActvtItem').setValue('activate'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnAcquirItem').setValue('acquire'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnUsrDefined').setValue('user'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnUnAqreItem').setValue('unacquire'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDeath').setValue('death'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrDying').setValue('dying'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrLvlUp').setValue('levelup'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnSpawnBtnDn').setValue('spawn'));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_OnPlrRest').setValue(''));
    r.addField(new GFFField(GFFDataType.RESREF, 'Mod_StartMovie').setValue(''));
    r.addField(new GFFField(GFFDataType.LIST, 'Mod_CutSceneList'));
    r.addField(new GFFField(GFFDataType.LIST, 'Mod_GVar_List'));

    // Mod_Area_list
    const areaList = new GFFField(GFFDataType.LIST, 'Mod_Area_list');
    const area = new GFFStruct(6);
    area.addField(new GFFField(GFFDataType.RESREF, 'Area_Name').setValue('262tel'));
    areaList.addChildStruct(area);
    r.addField(areaList);

    return gff;
  }

  function validateIFOFields(gff: GFFObject): void {
    const r = gff.RootNode;

    // VOID field: 16 bytes of Mod_ID
    const modIdBytes = r.getFieldByLabel('Mod_ID')?.getVoid();
    expect(modIdBytes).toBeDefined();
    expect(modIdBytes!.length).toBe(16);
    expect(modIdBytes![0]).toBe(0x52);
    expect(modIdBytes![1]).toBe(0x3A);

    expect(r.getFieldByLabel('Mod_Creator_ID')?.getValue()).toBe(2);
    expect(r.getFieldByLabel('Mod_Version')?.getValue()).toBe(3);
    expect(r.getFieldByLabel('Mod_VO_ID')?.getValue()).toBe('262');
    expect(r.getFieldByLabel('Expansion_Pack')?.getValue()).toBe(0);
    expect(r.getFieldByLabel('Mod_Name')?.getCExoLocString()?.getRESREF()).toBe(83947);
    expect(r.getFieldByLabel('Mod_Tag')?.getValue()).toBe('262TEL');
    expect(r.getFieldByLabel('Mod_Description')?.getCExoLocString()?.getRESREF()).toBe(-1);
    expect(r.getFieldByLabel('Mod_IsSaveGame')?.getValue()).toBe(0);
    expect(r.getFieldByLabel('Mod_Entry_Area')?.getValue()).toBe('262tel');
    expect(r.getFieldByLabel('Mod_Entry_X')?.getValue()).toBeCloseTo(2.5811, 3);
    expect(r.getFieldByLabel('Mod_Entry_Y')?.getValue()).toBeCloseTo(41.469, 2);
    expect(r.getFieldByLabel('Mod_Entry_Z')?.getValue()).toBeCloseTo(21.372, 2);
    expect(r.getFieldByLabel('Mod_DawnHour')?.getValue()).toBe(6);
    expect(r.getFieldByLabel('Mod_DuskHour')?.getValue()).toBe(18);
    expect(r.getFieldByLabel('Mod_MinPerHour')?.getValue()).toBe(2);
    expect(r.getFieldByLabel('Mod_StartMonth')?.getValue()).toBe(6);
    expect(r.getFieldByLabel('Mod_StartDay')?.getValue()).toBe(1);
    expect(r.getFieldByLabel('Mod_StartHour')?.getValue()).toBe(13);
    expect(r.getFieldByLabel('Mod_StartYear')?.getValue()).toBe(1372);
    expect(r.getFieldByLabel('Mod_XPScale')?.getValue()).toBe(10);
    expect(r.getFieldByLabel('Mod_OnHeartbeat')?.getValue()).toBe('heartbeat');
    expect(r.getFieldByLabel('Mod_OnModLoad')?.getValue()).toBe('load');
    expect(r.getFieldByLabel('Mod_OnModStart')?.getValue()).toBe('start');
    expect(r.getFieldByLabel('Mod_OnClientEntr')?.getValue()).toBe('enter');
    expect(r.getFieldByLabel('Mod_OnClientLeav')?.getValue()).toBe('leave');
    expect(r.getFieldByLabel('Mod_OnActvtItem')?.getValue()).toBe('activate');
    expect(r.getFieldByLabel('Mod_OnAcquirItem')?.getValue()).toBe('acquire');
    expect(r.getFieldByLabel('Mod_OnUsrDefined')?.getValue()).toBe('user');
    expect(r.getFieldByLabel('Mod_OnUnAqreItem')?.getValue()).toBe('unacquire');
    expect(r.getFieldByLabel('Mod_OnPlrDeath')?.getValue()).toBe('death');
    expect(r.getFieldByLabel('Mod_OnPlrDying')?.getValue()).toBe('dying');
    expect(r.getFieldByLabel('Mod_OnPlrLvlUp')?.getValue()).toBe('levelup');
    expect(r.getFieldByLabel('Mod_OnSpawnBtnDn')?.getValue()).toBe('spawn');
    expect(r.getFieldByLabel('Mod_OnPlrRest')?.getValue()).toBe('');
    expect(r.getFieldByLabel('Mod_StartMovie')?.getValue()).toBe('');

    const areas = r.getFieldByLabel('Mod_Area_list')?.getChildStructs() ?? [];
    expect(areas).toHaveLength(1);
    expect(areas[0].getFieldByLabel('Area_Name')?.getValue()).toBe('262tel');
  }

  it('IFO: all module info fields survive binary round-trip (vendor test_ifo parity)', () => {
    const parsed = new GFFObject(buildIFOGff().getExportBuffer());
    validateIFOFields(parsed);
  });

  it('IFO: Mod_ID VOID bytes survive binary round-trip', () => {
    const gff = new GFFObject(buildIFOGff().getExportBuffer());
    const bytes = gff.RootNode.getFieldByLabel('Mod_ID')!.getVoid();
    expect(bytes.length).toBe(16);
    expect(bytes[0]).toBe(0x52);
    expect(bytes[15]).toBe(0xA7);
  });

  it('IFO: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildIFOGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateIFOFields(step2);
  });

  // ── JRL ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_jrl.py :: TEST_JRL_XML / validate_io

  function buildJRLGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'JRL ';
    const r = gff.RootNode;

    const categories = new GFFField(GFFDataType.LIST, 'Categories');
    const cat = new GFFStruct(0);
    cat.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name').setCExoLocString(new CExoLocString(33089)));
    cat.addField(new GFFField(GFFDataType.DWORD, 'Priority').setValue(1));
    cat.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment').setValue('Plot to be considered worthy to hear the Sand People history.'));
    cat.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag').setValue('Tat20aa_worthy'));
    cat.addField(new GFFField(GFFDataType.INT, 'PlotIndex').setValue(72));
    cat.addField(new GFFField(GFFDataType.INT, 'PlanetID').setValue(4));

    const entryList = new GFFField(GFFDataType.LIST, 'EntryList');
    const e0 = new GFFStruct(0);
    e0.addField(new GFFField(GFFDataType.DWORD, 'ID').setValue(10));
    e0.addField(new GFFField(GFFDataType.WORD, 'End').setValue(0));
    e0.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text').setCExoLocString(new CExoLocString(33090)));
    e0.addField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage').setValue(5.0));
    entryList.addChildStruct(e0);

    const e1 = new GFFStruct(1);
    e1.addField(new GFFField(GFFDataType.DWORD, 'ID').setValue(20));
    e1.addField(new GFFField(GFFDataType.WORD, 'End').setValue(1));
    e1.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text').setCExoLocString(new CExoLocString(33091)));
    e1.addField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage').setValue(6.0));
    entryList.addChildStruct(e1);

    cat.addField(entryList);
    categories.addChildStruct(cat);
    r.addField(categories);

    return gff;
  }

  function validateJRLFields(gff: GFFObject): void {
    const r = gff.RootNode;
    const cats = r.getFieldByLabel('Categories')?.getChildStructs() ?? [];
    expect(cats).toHaveLength(1);

    const quest = cats[0];
    expect(quest.getFieldByLabel('Name')?.getCExoLocString()?.getRESREF()).toBe(33089);
    expect(quest.getFieldByLabel('Priority')?.getValue()).toBe(1);
    expect(quest.getFieldByLabel('Comment')?.getValue()).toBe('Plot to be considered worthy to hear the Sand People history.');
    expect(quest.getFieldByLabel('Tag')?.getValue()).toBe('Tat20aa_worthy');
    expect(quest.getFieldByLabel('PlotIndex')?.getValue()).toBe(72);
    expect(quest.getFieldByLabel('PlanetID')?.getValue()).toBe(4);

    const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() ?? [];
    expect(entries).toHaveLength(2);

    expect(entries[0].getFieldByLabel('ID')?.getValue()).toBe(10);
    expect(entries[0].getFieldByLabel('End')?.getValue()).toBe(0);
    expect(entries[0].getFieldByLabel('Text')?.getCExoLocString()?.getRESREF()).toBe(33090);
    expect(entries[0].getFieldByLabel('XP_Percentage')?.getValue()).toBeCloseTo(5.0, 3);

    expect(entries[1].getFieldByLabel('ID')?.getValue()).toBe(20);
    expect(entries[1].getFieldByLabel('End')?.getValue()).toBe(1);
    expect(entries[1].getFieldByLabel('Text')?.getCExoLocString()?.getRESREF()).toBe(33091);
    expect(entries[1].getFieldByLabel('XP_Percentage')?.getValue()).toBeCloseTo(6.0, 3);
  }

  it('JRL: quest Categories and EntryList survive binary round-trip (vendor test_jrl parity)', () => {
    const parsed = new GFFObject(buildJRLGff().getExportBuffer());
    validateJRLFields(parsed);
  });

  it('JRL: entry ID, End flag and XP_Percentage survive binary round-trip', () => {
    const gff = new GFFObject(buildJRLGff().getExportBuffer());
    const entries = gff.RootNode.getFieldByLabel('Categories')!
      .getChildStructs()[0].getFieldByLabel('EntryList')!.getChildStructs();
    expect(entries[0].getFieldByLabel('ID')?.getValue()).toBe(10);
    expect(entries[1].getFieldByLabel('ID')?.getValue()).toBe(20);
    expect(entries[1].getFieldByLabel('End')?.getValue()).toBe(1);
    expect(entries[0].getFieldByLabel('XP_Percentage')?.getValue()).toBeCloseTo(5.0, 3);
    expect(entries[1].getFieldByLabel('XP_Percentage')?.getValue()).toBeCloseTo(6.0, 3);
  });

  it('JRL: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildJRLGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validateJRLFields(step2);
  });

  // ── PTH ──────────────────────────────────────────────────────────────────
  // Mirrors vendor test_pth.py :: TEST_PTH_XML / validate_io

  function buildPTHGff(): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'PTH ';
    const r = gff.RootNode;

    // Path_Points — 4 nodes
    const points = new GFFField(GFFDataType.LIST, 'Path_Points');
    const pointData = [
      { x: 0.0, y: 0.0, conns: 2, first: 0 },
      { x: 0.0, y: 1.0, conns: 3, first: 2 },
      { x: 1.0, y: 1.0, conns: 2, first: 5 },
      { x: 0.0, y: 2.0, conns: 1, first: 7 },
    ];
    pointData.forEach(({ x, y, conns, first }) => {
      const s = new GFFStruct(2);
      s.addField(new GFFField(GFFDataType.DWORD, 'Conections').setValue(conns));
      s.addField(new GFFField(GFFDataType.DWORD, 'First_Conection').setValue(first));
      s.addField(new GFFField(GFFDataType.FLOAT, 'X').setValue(x));
      s.addField(new GFFField(GFFDataType.FLOAT, 'Y').setValue(y));
      points.addChildStruct(s);
    });
    r.addField(points);

    // Path_Conections — 8 edges
    const conns = new GFFField(GFFDataType.LIST, 'Path_Conections');
    const connDests = [1, 2, 0, 2, 3, 0, 1, 1];
    connDests.forEach(dest => {
      const s = new GFFStruct(3);
      s.addField(new GFFField(GFFDataType.DWORD, 'Destination').setValue(dest));
      conns.addChildStruct(s);
    });
    r.addField(conns);

    return gff;
  }

  function validatePTHFields(gff: GFFObject): void {
    const r = gff.RootNode;

    const pts = r.getFieldByLabel('Path_Points')?.getChildStructs() ?? [];
    expect(pts).toHaveLength(4);
    expect(pts[0].getFieldByLabel('X')?.getValue()).toBeCloseTo(0.0, 4);
    expect(pts[0].getFieldByLabel('Y')?.getValue()).toBeCloseTo(0.0, 4);
    expect(pts[0].getFieldByLabel('Conections')?.getValue()).toBe(2);
    expect(pts[0].getFieldByLabel('First_Conection')?.getValue()).toBe(0);

    expect(pts[1].getFieldByLabel('X')?.getValue()).toBeCloseTo(0.0, 4);
    expect(pts[1].getFieldByLabel('Y')?.getValue()).toBeCloseTo(1.0, 4);
    expect(pts[1].getFieldByLabel('Conections')?.getValue()).toBe(3);
    expect(pts[1].getFieldByLabel('First_Conection')?.getValue()).toBe(2);

    expect(pts[2].getFieldByLabel('X')?.getValue()).toBeCloseTo(1.0, 4);
    expect(pts[2].getFieldByLabel('Y')?.getValue()).toBeCloseTo(1.0, 4);
    expect(pts[2].getFieldByLabel('Conections')?.getValue()).toBe(2);
    expect(pts[2].getFieldByLabel('First_Conection')?.getValue()).toBe(5);

    expect(pts[3].getFieldByLabel('X')?.getValue()).toBeCloseTo(0.0, 4);
    expect(pts[3].getFieldByLabel('Y')?.getValue()).toBeCloseTo(2.0, 4);
    expect(pts[3].getFieldByLabel('Conections')?.getValue()).toBe(1);
    expect(pts[3].getFieldByLabel('First_Conection')?.getValue()).toBe(7);

    const connPts = r.getFieldByLabel('Path_Conections')?.getChildStructs() ?? [];
    expect(connPts).toHaveLength(8);
    // Point 0 connects to 1,2 (conns[0]=1, conns[1]=2)
    expect(connPts[0].getFieldByLabel('Destination')?.getValue()).toBe(1);
    expect(connPts[1].getFieldByLabel('Destination')?.getValue()).toBe(2);
    // Point 1 connects to 0,2,3 (conns[2]=0, conns[3]=2, conns[4]=3)
    expect(connPts[2].getFieldByLabel('Destination')?.getValue()).toBe(0);
    expect(connPts[3].getFieldByLabel('Destination')?.getValue()).toBe(2);
    expect(connPts[4].getFieldByLabel('Destination')?.getValue()).toBe(3);
    // Point 2 connects to 0,1 (conns[5]=0, conns[6]=1)
    expect(connPts[5].getFieldByLabel('Destination')?.getValue()).toBe(0);
    expect(connPts[6].getFieldByLabel('Destination')?.getValue()).toBe(1);
    // Point 3 connects to 1 (conns[7]=1)
    expect(connPts[7].getFieldByLabel('Destination')?.getValue()).toBe(1);
  }

  it('PTH: path points and connections survive binary round-trip (vendor test_pth parity)', () => {
    const parsed = new GFFObject(buildPTHGff().getExportBuffer());
    validatePTHFields(parsed);
  });

  it('PTH: node coordinates and connection counts survive binary round-trip', () => {
    const gff = new GFFObject(buildPTHGff().getExportBuffer());
    const pts = gff.RootNode.getFieldByLabel('Path_Points')!.getChildStructs();
    expect(pts[1].getFieldByLabel('Y')?.getValue()).toBeCloseTo(1.0, 4);
    expect(pts[2].getFieldByLabel('X')?.getValue()).toBeCloseTo(1.0, 4);
    expect(pts[1].getFieldByLabel('Conections')?.getValue()).toBe(3);
    expect(pts[3].getFieldByLabel('Conections')?.getValue()).toBe(1);
  });

  it('PTH: binary->JSON->binary double round-trip preserves all key fields', () => {
    const binary = buildPTHGff().getExportBuffer();
    const step1 = new GFFObject(binary);
    const step2 = new GFFObject();
    step2.fromJSON(step1.toJSON());
    validatePTHFields(step2);
  });
});
