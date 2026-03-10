import { describe, expect, it, jest } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { ModuleCreatureArmorSlot } from '@/enums/module/ModuleCreatureArmorSlot';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { CExoLocString } from '@/resource/CExoLocString';
import { ForgeCreature } from '@/apps/forge/module-editor/ForgeCreature';

jest.mock('@/apps/forge/UI3DRenderer', () => ({
  GroupType: {
    Creature: 'Creature',
  },
  UI3DRenderer: class UI3DRenderer {},
}));

jest.mock('@/apps/forge/states/tabs/TabState', () => ({
  TabState: class TabState {},
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { ModuleCreatureArmorSlot } = require('@/enums/module/ModuleCreatureArmorSlot');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');
  const { CExoLocString } = require('@/resource/CExoLocString');

  return {
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ModuleCreatureArmorSlot,
    ResourceTypes: {
      NA: 0,
      utc: 2029,
      uti: 2036,
    },
    ResourceLoader: {
      loadResource: jest.fn(),
    },
    AppearanceManager: {
      GetCreatureAppearanceById: jest.fn(),
    },
    MDLLoader: {
      loader: {
        load: jest.fn(),
      },
    },
    SWRuleSet: {
      baseItems: [],
    },
    OdysseyModel3D: class OdysseyModel3D {},
  };
});

/** Builds a GFF matching the vendor test_utc.py Coorta fixture. */
function buildCoortaGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'UTC ';
  const r = gff.RootNode;

  r.addField(new GFFField(GFFDataType.RESREF, 'TemplateResRef')).setValue('n_minecoorta');
  r.addField(new GFFField(GFFDataType.BYTE, 'Race')).setValue(6);
  r.addField(new GFFField(GFFDataType.BYTE, 'SubraceIndex')).setValue(1);
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName'))
    .setCExoLocString(new CExoLocString(76046));
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName'))
    .setCExoLocString(new CExoLocString(123));
  r.addField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).setValue(636);
  r.addField(new GFFField(GFFDataType.BYTE, 'Gender')).setValue(2);
  r.addField(new GFFField(GFFDataType.INT, 'Phenotype')).setValue(0);
  r.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(1);
  r.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Description'))
    .setCExoLocString(new CExoLocString(123));
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('Coorta');
  r.addField(new GFFField(GFFDataType.RESREF, 'Conversation')).setValue('coorta');
  r.addField(new GFFField(GFFDataType.BYTE, 'IsPC')).setValue(1);
  r.addField(new GFFField(GFFDataType.WORD, 'FactionID')).setValue(5);
  r.addField(new GFFField(GFFDataType.BYTE, 'Disarmable')).setValue(1);
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Subrace')).setValue('');
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Deity')).setValue('');
  r.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(46);
  r.addField(new GFFField(GFFDataType.BYTE, 'Plot')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'Interruptable')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'NoPermDeath')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'NotReorienting')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'BodyBag')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'BodyVariation')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'TextureVar')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'Min1HP')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'PartyInteract')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'Hologram')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'IgnoreCrePath')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'MultiplierSet')).setValue(3);
  r.addField(new GFFField(GFFDataType.BYTE, 'Str')).setValue(10);
  r.addField(new GFFField(GFFDataType.BYTE, 'Dex')).setValue(10);
  r.addField(new GFFField(GFFDataType.BYTE, 'Con')).setValue(10);
  r.addField(new GFFField(GFFDataType.BYTE, 'Int')).setValue(10);
  r.addField(new GFFField(GFFDataType.BYTE, 'Wis')).setValue(10);
  r.addField(new GFFField(GFFDataType.BYTE, 'Cha')).setValue(10);
  r.addField(new GFFField(GFFDataType.INT, 'WalkRate')).setValue(7);
  r.addField(new GFFField(GFFDataType.BYTE, 'NaturalAC')).setValue(1);
  r.addField(new GFFField(GFFDataType.SHORT, 'HitPoints')).setValue(8);
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentHitPoints')).setValue(8);
  r.addField(new GFFField(GFFDataType.SHORT, 'MaxHitPoints')).setValue(8);
  r.addField(new GFFField(GFFDataType.SHORT, 'ForcePoints')).setValue(1);
  r.addField(new GFFField(GFFDataType.SHORT, 'CurrentForce')).setValue(1);
  r.addField(new GFFField(GFFDataType.SHORT, 'refbonus')).setValue(1);
  r.addField(new GFFField(GFFDataType.SHORT, 'willbonus')).setValue(1);
  r.addField(new GFFField(GFFDataType.SHORT, 'fortbonus')).setValue(1);
  r.addField(new GFFField(GFFDataType.BYTE, 'GoodEvil')).setValue(50);
  r.addField(new GFFField(GFFDataType.BYTE, 'LawfulChaotic')).setValue(0);
  r.addField(new GFFField(GFFDataType.FLOAT, 'BlindSpot')).setValue(120.0);
  r.addField(new GFFField(GFFDataType.FLOAT, 'ChallengeRating')).setValue(1.0);
  r.addField(new GFFField(GFFDataType.BYTE, 'PerceptionRange')).setValue(11);

  // Scripts
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).setValue('k_def_heartbt01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice')).setValue('k_def_percept01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt')).setValue('k_def_spellat01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked')).setValue('k_def_attacked01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged')).setValue('k_def_damage01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed')).setValue('k_def_disturb01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound')).setValue('k_def_combend01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu')).setValue('k_def_endconv');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDialogu')).setValue('k_def_dialogue01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn')).setValue('k_def_spawn01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptRested')).setValue('');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptDeath')).setValue('k_def_death01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).setValue('k_def_userdef01');
  r.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked')).setValue('k_def_blocked01');

  // SkillList - 8 skills
  const skillList = new GFFField(GFFDataType.LIST, 'SkillList');
  for (let i = 1; i <= 8; i++) {
    const s = new GFFStruct(0);
    s.addField(new GFFField(GFFDataType.BYTE, 'Rank')).setValue(i);
    skillList.addChildStruct(s);
  }
  r.addField(skillList);

  // FeatList - 2 feats (93, 94)
  const featList = new GFFField(GFFDataType.LIST, 'FeatList');
  for (const feat of [93, 94]) {
    const s = new GFFStruct(1);
    s.addField(new GFFField(GFFDataType.WORD, 'Feat')).setValue(feat);
    featList.addChildStruct(s);
  }
  r.addField(featList);

  r.addField(new GFFField(GFFDataType.LIST, 'TemplateList'));
  r.addField(new GFFField(GFFDataType.LIST, 'SpecAbilityList'));

  // ClassList - 2 classes with spells
  const classList = new GFFField(GFFDataType.LIST, 'ClassList');
  {
    const c0 = new GFFStruct(2);
    c0.addField(new GFFField(GFFDataType.INT, 'Class')).setValue(0);
    c0.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).setValue(2);
    const kl0 = new GFFField(GFFDataType.LIST, 'KnownList0');
    const sp0 = new GFFStruct(3);
    sp0.addField(new GFFField(GFFDataType.WORD, 'Spell')).setValue(7);
    sp0.addField(new GFFField(GFFDataType.BYTE, 'SpellMetaMagic')).setValue(0);
    sp0.addField(new GFFField(GFFDataType.BYTE, 'SpellFlags')).setValue(1);
    kl0.addChildStruct(sp0);
    c0.addField(kl0);
    classList.addChildStruct(c0);

    const c1 = new GFFStruct(2);
    c1.addField(new GFFField(GFFDataType.INT, 'Class')).setValue(1);
    c1.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).setValue(3);
    const kl1 = new GFFField(GFFDataType.LIST, 'KnownList0');
    for (const spellId of [9, 11]) {
      const sp = new GFFStruct(3);
      sp.addField(new GFFField(GFFDataType.WORD, 'Spell')).setValue(spellId);
      sp.addField(new GFFField(GFFDataType.BYTE, 'SpellMetaMagic')).setValue(0);
      sp.addField(new GFFField(GFFDataType.BYTE, 'SpellFlags')).setValue(1);
      kl1.addChildStruct(sp);
    }
    c1.addField(kl1);
    classList.addChildStruct(c1);
  }
  r.addField(classList);

  // Equip_ItemList - armor slot (type=2) + hide slot (type=0x20000)
  const equipList = new GFFField(GFFDataType.LIST, 'Equip_ItemList');
  {
    const armor = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armor.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue('mineruniform');
    armor.addField(new GFFField(GFFDataType.BYTE, 'Dropable')).setValue(1);
    equipList.addChildStruct(armor);

    const hide = new GFFStruct(ModuleCreatureArmorSlot.HIDE);
    hide.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue('g_i_crhide008');
    equipList.addChildStruct(hide);
  }
  r.addField(equipList);

  // ItemList - 4 inventory items
  const itemList = new GFFField(GFFDataType.LIST, 'ItemList');
  for (let i = 0; i < 4; i++) {
    const s = new GFFStruct(i);
    s.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes'))
      .setValue(i < 3 ? 'g_w_thermldet01' : 'g_w_thermldet02');
    s.addField(new GFFField(GFFDataType.WORD, 'Repos_PosX')).setValue(i);
    s.addField(new GFFField(GFFDataType.WORD, 'Repos_PosY')).setValue(0);
    if (i === 0) {
      s.addField(new GFFField(GFFDataType.BYTE, 'Dropable')).setValue(1);
    }
    itemList.addChildStruct(s);
  }
  r.addField(itemList);

  r.addField(new GFFField(GFFDataType.BYTE, 'PaletteID')).setValue(3);
  r.addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment')).setValue('comment');

  return gff;
}

function validateCoortaFields(c: ForgeCreature): void {
  // Core attributes
  expect(c.appearanceType).toBe(636);
  expect(c.bodyVariation).toBe(1);
  expect(c.cha).toBe(10);
  expect(c.challengeRating).toBeCloseTo(1.0);
  expect(c.comment).toBe('comment');
  expect(c.con).toBe(10);
  expect(c.conversation).toBe('coorta');
  expect(c.currentForce).toBe(1);
  expect(c.currentHitPoints).toBe(8);
  expect(c.dex).toBe(10);
  expect(c.disarmable).toBeTruthy();
  expect(c.factionID).toBe(5);
  expect(c.firstName.getRESREF()).toBe(76046);
  expect(c.forcePoints).toBe(1);
  expect(c.gender).toBe(2);
  expect(c.goodEvil).toBe(50);
  expect(c.hitPoints).toBe(8);
  expect(c.int).toBe(10);
  expect(c.interruptable).toBeTruthy();
  expect(c.isPC).toBeTruthy();
  expect(c.lastName.getRESREF()).toBe(123);
  expect(c.maxHitPoints).toBe(8);
  expect(c.min1HP).toBeTruthy();
  expect(c.naturalAC).toBe(1);
  expect(c.noPermDeath).toBeTruthy();
  expect(c.notReorienting).toBeTruthy();
  expect(c.partyInteract).toBeTruthy();
  expect(c.perceptionRange).toBe(11);
  expect(c.plot).toBeTruthy();
  expect(c.portraitId).toBe(1);
  expect(c.race).toBe(6);
  expect(c.soundSetFile).toBe(46);
  expect(c.str).toBe(10);
  expect(c.subraceIndex).toBe(1);
  expect(c.tag).toBe('Coorta');
  expect(c.templateResRef).toBe('n_minecoorta');
  expect(c.textureVar).toBe(1);
  expect(c.walkRate).toBe(7);
  expect(c.wis).toBe(10);
  expect(c.fortbonus).toBe(1);
  expect(c.refbonus).toBe(1);
  expect(c.willbonus).toBe(1);
  expect(c.palletID).toBe(3);

  // Scripts
  expect(c.scriptHeartbeat).toBe('k_def_heartbt01');
  expect(c.scriptOnNotice).toBe('k_def_percept01');
  expect(c.scriptSpellAt).toBe('k_def_spellat01');
  expect(c.scriptAttacked).toBe('k_def_attacked01');
  expect(c.scriptDamaged).toBe('k_def_damage01');
  expect(c.scriptDisturbed).toBe('k_def_disturb01');
  expect(c.scriptEndRound).toBe('k_def_combend01');
  expect(c.scriptEndDialogue).toBe('k_def_endconv');
  expect(c.scriptDialogu).toBe('k_def_dialogue01');
  expect(c.scriptSpawn).toBe('k_def_spawn01');
  expect(c.scriptDeath).toBe('k_def_death01');
  expect(c.scriptUserDefined).toBe('k_def_userdef01');
  expect(c.scriptOnBlocked).toBe('k_def_blocked01');

  // Classes
  expect(c.classList).toHaveLength(2);
  expect(c.classList[0].class).toBe(0);
  expect(c.classList[0].level).toBe(2);
  expect(c.classList[0].knownList0).toHaveLength(1);
  expect(c.classList[0].knownList0[0].spell).toBe(7);
  expect(c.classList[1].class).toBe(1);
  expect(c.classList[1].level).toBe(3);
  expect(c.classList[1].knownList0).toHaveLength(2);
  expect(c.classList[1].knownList0[0].spell).toBe(9);
  expect(c.classList[1].knownList0[1].spell).toBe(11);

  // Equipment
  expect(c.slotArmor).toBe('mineruniform');
  expect(c.slotHide).toBe('g_i_crhide008');

  // Feats
  expect(c.featList).toHaveLength(2);
  expect(c.featList[0]).toBe(93);
  expect(c.featList[1]).toBe(94);

  // Inventory
  expect(c.itemList).toHaveLength(4);
  expect(c.itemList[0].droppable).toBe(true);
  expect(c.itemList[0].resref).toBe('g_w_thermldet01');
  expect(c.itemList[1].droppable).toBe(false);
  expect(c.itemList[3].resref).toBe('g_w_thermldet02');

  // Skills
  expect(c.skillList).toHaveLength(8);
  for (let i = 0; i < 8; i++) {
    expect(c.skillList[i]).toBe(i + 1);
  }
}

describe('ForgeCreature (UTC)', () => {
  it('loadFromBlueprint parses all Coorta fixture fields', () => {
    const gff = buildCoortaGff();
    const creature = new ForgeCreature();
    creature.blueprint = gff;
    creature.loadFromBlueprint();
    validateCoortaFields(creature);
  });

  it('exportToBlueprint → loadFromBlueprint round-trip preserves all fields', () => {
    const gff = buildCoortaGff();
    const c1 = new ForgeCreature();
    c1.blueprint = gff;
    c1.loadFromBlueprint();

    // Export and re-import
    const exported = c1.exportToBlueprint();
    const c2 = new ForgeCreature();
    c2.blueprint = exported;
    c2.loadFromBlueprint();
    validateCoortaFields(c2);
  });

  it('binary round-trip: export → GFF binary → parse → load preserves data', () => {
    const gff = buildCoortaGff();
    const c1 = new ForgeCreature();
    c1.blueprint = gff;
    c1.loadFromBlueprint();

    const binary = c1.exportToBlueprint().getExportBuffer();
    const c2 = new ForgeCreature(binary);
    validateCoortaFields(c2);
  });

  it('missing fields use defaults', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('OnlyTag');
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SkillList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ClassList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'FeatList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));

    const c = new ForgeCreature();
    c.blueprint = gff;
    c.loadFromBlueprint();

    expect(c.tag).toBe('OnlyTag');
    expect(c.templateResRef).toBe('');
    expect(c.comment).toBe('');
    expect(c.conversation).toBe('');
    expect(c.race).toBe(0);
    expect(c.gender).toBe(0);
    expect(c.str).toBe(10);
    expect(c.factionID).toBe(0);
    expect(c.currentHitPoints).toBe(0);
    expect(c.maxHitPoints).toBe(0);
    expect(c.plot).toBeFalsy();
    expect(c.isPC).toBeFalsy();
    expect(c.scriptHeartbeat).toBe('');
    expect(c.classList).toHaveLength(0);
    expect(c.featList).toHaveLength(0);
    expect(c.itemList).toHaveLength(0);
    expect(c.skillList).toHaveLength(0);
  });

  it('empty creature round-trips through export/load', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'SkillList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ClassList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'FeatList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));

    const c1 = new ForgeCreature();
    c1.blueprint = gff;
    c1.loadFromBlueprint();

    const exported = c1.exportToBlueprint();
    const c2 = new ForgeCreature();
    c2.blueprint = exported;
    c2.loadFromBlueprint();

    expect(c2.tag).toBe('');
    expect(c2.classList).toHaveLength(0);
    expect(c2.featList).toHaveLength(0);
    expect(c2.templateResRef).toBe('');
  });

  it('all 15 equipment slots map correctly', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';
    const equipList = new GFFField(GFFDataType.LIST, 'Equip_ItemList');

    const slotMap: [number, string][] = [
      [ModuleCreatureArmorSlot.HEAD, 'head_res'],
      [ModuleCreatureArmorSlot.ARMOR, 'armor_res'],
      [ModuleCreatureArmorSlot.ARMS, 'arms_res'],
      [ModuleCreatureArmorSlot.RIGHTHAND, 'rhand_res'],
      [ModuleCreatureArmorSlot.LEFTHAND, 'lhand_res'],
      [ModuleCreatureArmorSlot.LEFTARMBAND, 'larm_res'],
      [ModuleCreatureArmorSlot.RIGHTARMBAND, 'rarm_res'],
      [ModuleCreatureArmorSlot.IMPLANT, 'implant_res'],
      [ModuleCreatureArmorSlot.BELT, 'belt_res'],
      [ModuleCreatureArmorSlot.HIDE, 'hide_res'],
      [ModuleCreatureArmorSlot.CLAW1, 'claw1_res'],
      [ModuleCreatureArmorSlot.CLAW2, 'claw2_res'],
      [ModuleCreatureArmorSlot.CLAW3, 'claw3_res'],
      [ModuleCreatureArmorSlot.RIGHTHAND2, 'rhand2_res'],
      [ModuleCreatureArmorSlot.LEFTHAND2, 'lhand2_res'],
    ];

    for (const [slot, resref] of slotMap) {
      const s = new GFFStruct(slot);
      s.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue(resref);
      equipList.addChildStruct(s);
    }
    gff.RootNode.addField(equipList);

    const c = new ForgeCreature();
    c.blueprint = gff;
    c.loadFromBlueprint();

    expect(c.slotHead).toBe('head_res');
    expect(c.slotArmor).toBe('armor_res');
    expect(c.slotArms).toBe('arms_res');
    expect(c.slotRightHand).toBe('rhand_res');
    expect(c.slotLeftHand).toBe('lhand_res');
    expect(c.slotLeftArmband).toBe('larm_res');
    expect(c.slotRightArmband).toBe('rarm_res');
    expect(c.slotImplant).toBe('implant_res');
    expect(c.slotBelt).toBe('belt_res');
    expect(c.slotHide).toBe('hide_res');
    expect(c.slotClaw1).toBe('claw1_res');
    expect(c.slotClaw2).toBe('claw2_res');
    expect(c.slotClaw3).toBe('claw3_res');
    expect(c.slotRightHand2).toBe('rhand2_res');
    expect(c.slotLeftHand2).toBe('lhand2_res');
  });

  it('special abilities list round-trips', () => {
    const c = new ForgeCreature();
    c.specAbilityList = [
      { spell: 42, spellCasterLevel: 5, spellFlags: 1 },
      { spell: 99, spellCasterLevel: 10, spellFlags: 4 },
    ];
    const exported = c.exportToBlueprint();
    const c2 = new ForgeCreature();
    c2.blueprint = exported;
    c2.loadFromBlueprint();
    expect(c2.specAbilityList).toHaveLength(2);
    expect(c2.specAbilityList[0].spell).toBe(42);
    expect(c2.specAbilityList[0].spellCasterLevel).toBe(5);
    expect(c2.specAbilityList[1].spell).toBe(99);
    expect(c2.specAbilityList[1].spellFlags).toBe(4);
  });
});
