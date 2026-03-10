import {
  CONVERSATION_FIELD_TYPES,
  SCRIPT_FIELD_TYPES,
  TAG_FIELD_TYPES,
  TEMPLATE_RESREF_FIELD_TYPES,
  getAllSearchableFileTypes,
  getConversationFieldsForType,
  getScriptFieldsForType,
  getTagFieldsForType,
  getTemplateResrefFieldsForType,
} from '@/apps/forge/data/ReferenceSearchConfig';
import { GFFDataType } from '@/enums/resource/GFFDataType';

describe('ReferenceSearchConfig', () => {
  test('exports the expected field type sets', () => {
    expect(SCRIPT_FIELD_TYPES).toEqual(new Set([GFFDataType.RESREF]));
    expect(TAG_FIELD_TYPES).toEqual(new Set([GFFDataType.CEXOSTRING]));
    expect(TEMPLATE_RESREF_FIELD_TYPES).toEqual(new Set([GFFDataType.RESREF]));
    expect(CONVERSATION_FIELD_TYPES).toEqual(new Set([GFFDataType.RESREF]));
  });

  test('returns configured script fields for a file type', () => {
    expect(getScriptFieldsForType('UTC')).toEqual(
      new Set([
        'ScriptHeartbeat',
        'ScriptAttacked',
        'ScriptDamaged',
        'ScriptDeath',
        'ScriptDialogue',
        'ScriptDisturbed',
        'ScriptEndDialogu',
        'ScriptEndRound',
        'ScriptOnNotice',
        'ScriptRested',
        'ScriptSpawn',
        'ScriptSpellAt',
        'ScriptUserDefine',
      ])
    );
  });

  test('includes nested item list fields for tag searches where configured', () => {
    expect(getTagFieldsForType('UTC')).toEqual(new Set(['Tag', 'ItemList', 'Equip_ItemList']));
    expect(getTagFieldsForType('UTP')).toEqual(new Set(['Tag', 'ItemList']));
    expect(getTagFieldsForType('UTI')).toEqual(new Set(['Tag']));
  });

  test('returns conversation and template fields by file type', () => {
    expect(getConversationFieldsForType('IFO')).toEqual(new Set(['Mod_OnStart']));
    expect(getTemplateResrefFieldsForType('UTP')).toEqual(new Set(['TemplateResRef']));
  });

  test('lists searchable file types in sorted order including NCS', () => {
    const fileTypes = getAllSearchableFileTypes();
    expect(fileTypes).toContain('NCS');
    expect(fileTypes).toEqual([...fileTypes].sort());
  });
});
