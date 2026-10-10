/**
 * Source-boundary regression: after init, GameObject hierarchy code must not
 * read/write live GFF fields from runtime getters/helpers. GFF access belongs
 * in load / initProperties / hydrate / save / export only.
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';

const MODULE_DIR = path.resolve(__dirname, '../../../engine/module');
const MANAGER_DIR = path.resolve(__dirname, '../../../engine/managers');

/** Methods / helpers that may touch this.template (init + save only). */
const ALLOWED_METHOD_RE =
  /^(constructor|load|loadScripts|loadItem|loadActionList|loadNamedVarTable|initProperties|seedResRefsFromTemplate|hydrateScriptResRefsFromTemplate|hydrateScriptResRefsFromStruct|bindScriptsFromResRefs|save|Save|saveLevelStatStruct|actionQueueToActionList|GenerateTemplate|FromResRef|spawnCreatureFromSpawnList|clone|destroy|getSWVarTableSaveStruct|writeNamedVarTable|loadFromPersistentRow|getPreviewModelResRef)$/;

const CONTROL_FLOW_NAMES = new Set([
  'if', 'else', 'for', 'while', 'switch', 'catch', 'try', 'do', 'return', 'throw',
]);

/**
 * Strip comments and string literals so naive scans do not false-positive on docs.
 */
function stripNoise(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/**
 * Split a class body into method chunks by `name(...){` at brace depth 0 of class.
 * Returns [{ name, body }].
 */
function extractMethods(classSrc: string): Array<{ name: string; body: string }> {
  const methods: Array<{ name: string; body: string }> = [];
  const re = /(?:(?:public|private|protected|static|async|override)\s+)*([A-Za-z_][A-Za-z0-9_]*)\s*\([^;{]*\)\s*(?::\s*[^{]+)?\{/g;
  let match: RegExpExecArray | null;
  while((match = re.exec(classSrc))){
    const name = match[1];
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let i = start;
    for(; i < classSrc.length; i++){
      const ch = classSrc[i];
      if(ch === '{') depth++;
      else if(ch === '}'){
        depth--;
        if(depth === 0){
          i++;
          break;
        }
      }
    }
    methods.push({ name, body: classSrc.slice(start, i) });
    re.lastIndex = i;
  }
  return methods;
}

function listTsFiles(dir: string): string[] {
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .map((f) => path.join(dir, f));
}

const TEMPLATE_TOUCH_RE =
  /this\.template(?:\?\.|\.)(?:RootNode|getFieldByLabel|hasField|FileType|merge)|this\.template\s*=/;

describe('GameObject template access boundary', () => {
  it('runtime getters do not read orientation/tag/resref/portrait/key from GFF', () => {
    const gameObjectSrc = fs.readFileSync(path.join(MODULE_DIR, 'GameObject.ts'), 'utf8');
    const methods = extractMethods(stripNoise(gameObjectSrc));
    const banned = [
      'getXOrientation',
      'getYOrientation',
      'getZOrientation',
      'getPortraitId',
      'getKeyName',
      'getTag',
      'getTemplateResRef',
      'getResRef',
      'setTemplateResRef',
    ];
    for(const name of banned){
      const m = methods.find((x) => x.name === name);
      expect(m).toBeDefined();
      expect(TEMPLATE_TOUCH_RE.test(m!.body)).toBe(false);
    }
  });

  it('Placeable position getters and Item infinite/properties helpers avoid template', () => {
    const placeableSrc = stripNoise(fs.readFileSync(path.join(MODULE_DIR, 'Placeable.ts'), 'utf8'));
    const itemSrc = stripNoise(fs.readFileSync(path.join(MODULE_DIR, 'Item.ts'), 'utf8'));
    const placeableMethods = extractMethods(placeableSrc);
    for(const name of ['getX', 'getY', 'getZ', 'getBearing']){
      const m = placeableMethods.find((x) => x.name === name);
      expect(m).toBeDefined();
      expect(TEMPLATE_TOUCH_RE.test(m!.body)).toBe(false);
    }
    expect(placeableSrc.includes('getItemList')).toBe(false);

    const itemMethods = extractMethods(itemSrc);
    const setInfinite = itemMethods.find((x) => x.name === 'setInfinite');
    const getPropertiesList = itemMethods.find((x) => x.name === 'getPropertiesList');
    expect(setInfinite).toBeDefined();
    expect(getPropertiesList).toBeDefined();
    expect(TEMPLATE_TOUCH_RE.test(setInfinite!.body)).toBe(false);
    expect(TEMPLATE_TOUCH_RE.test(getPropertiesList!.body)).toBe(false);
  });

  it('GameObject save facades delegate to serializers (no inline GFFField construction)', () => {
    const expectations: Array<[string, RegExp]> = [
      ['Waypoint.ts', /waypointSerializer\.serialize/],
      ['Trigger.ts', /triggerSerializer\.serialize/],
      ['Sound.ts', /soundSerializer\.serialize/],
      ['Store.ts', /storeSerializer\.serialize/],
      ['Encounter.ts', /encounterSerializer\.serialize/],
      ['Door.ts', /doorSerializer\.serialize/],
      ['Placeable.ts', /placeableSerializer\.serialize/],
      ['Item.ts', /itemSerializer\.serialize/],
      ['AreaEffect.ts', /areaEffectSerializer\.serialize/],
      ['Creature.ts', /creatureSerializer\.serialize/],
      ['AreaCamera.ts', /areaCameraSerializer\.serialize/],
    ];
    for (const [file, re] of expectations) {
      const src = fs.readFileSync(path.join(MODULE_DIR, file), 'utf8');
      const save = extractMethods(stripNoise(src)).find((m) => m.name === 'save');
      expect(save).toBeDefined();
      expect(save!.body).toMatch(re);
      // Facades may assign this.template = gff, but must not build fields inline.
      expect(save!.body).not.toMatch(/new GFFField/);
      expect(save!.body).not.toMatch(/getFieldByLabel/);
    }
  });

  it('runtime GameObject classes keep GFF API use inside allowed lifecycle methods', () => {
    const GFF_API_RE = /\b(?:getFieldByLabel|hasField|new GFFField|new GFFStruct|new GFFObject)\b/;
    const files = listTsFiles(MODULE_DIR).filter((f) => {
      const base = path.basename(f);
      return ![
        'Area.ts',
        'Module.ts',
        'AreaMap.ts',
        'AreaWeather.ts',
        'AreaAudio.ts',
      ].includes(base) && !f.includes(`${path.sep}serialization${path.sep}`);
    });

    const violations: string[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8');
      if (!raw.includes('extends GameObject') && path.basename(file) !== 'GameObject.ts') {
        continue;
      }
      const methods = extractMethods(stripNoise(raw));
      for (const m of methods) {
        if (CONTROL_FLOW_NAMES.has(m.name)) continue;
        if (ALLOWED_METHOD_RE.test(m.name)) continue;
        if (/^(load|init|hydrate|seed|merge|apply|read|parse|build|setTemplate|save).*/i.test(m.name)) continue;
        if (!GFF_API_RE.test(m.body) && !TEMPLATE_TOUCH_RE.test(m.body)) continue;
        violations.push(`${path.basename(file)}:${m.name}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('persistObjectId does not stamp template ObjectId', () => {
    const mgrSrc = fs.readFileSync(path.join(MANAGER_DIR, 'GameObjectManager.ts'), 'utf8');
    const methods = extractMethods(stripNoise(mgrSrc));
    const persist = methods.find((m) => m.name === 'persistObjectId');
    expect(persist).toBeDefined();
    expect(persist!.body).toMatch(/object\.id\s*=/);
    expect(persist!.body).not.toMatch(/template|ObjectId|GFFField/);
  });

  it('flags new runtime methods that touch this.template outside allowed lifecycle names', () => {
    const files = [
      ...listTsFiles(MODULE_DIR),
    ].filter((f) => {
      const base = path.basename(f);
      return ![
        'Area.ts', // area ARE/GIT orchestration — separate boundary
        'Module.ts',
        'AreaMap.ts',
        'AreaWeather.ts',
        'AreaAudio.ts',
      ].includes(base);
    });

    const violations: string[] = [];
    for(const file of files){
      const raw = fs.readFileSync(file, 'utf8');
      if(!raw.includes('extends GameObject') && path.basename(file) !== 'GameObject.ts'){
        continue;
      }
      const methods = extractMethods(stripNoise(raw));
      for(const m of methods){
        if(CONTROL_FLOW_NAMES.has(m.name)) continue;
        if(ALLOWED_METHOD_RE.test(m.name)) continue;
        // Nested init helpers commonly named load* / init* / setTemplate / apply*FromTemplate
        if(/^(load|init|hydrate|seed|merge|apply|read|parse|build|setTemplate|save).*/i.test(m.name)) continue;
        if(!TEMPLATE_TOUCH_RE.test(m.body)) continue;
        violations.push(`${path.basename(file)}:${m.name}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps nested runtime field walks in their explicit load lifecycle methods', () => {
    const allowedByField: Record<string, RegExp> = {
      EffectList: /^(initProperties|load)$/,
      ActionList: /^loadActionList$/,
      CombatRoundData: /^(initProperties|load)$/,
      PropertiesList: /^initProperties$/,
    };
    const labels = Object.keys(allowedByField);
    const fieldWalk = new RegExp(
      `(?:hasField|getFieldByLabel)\\(\\s*['"](${labels.join('|')})['"]`,
      'g',
    );
    const violations: string[] = [];

    for (const file of listTsFiles(MODULE_DIR)) {
      const raw = fs.readFileSync(file, 'utf8');
      if (!raw.includes('extends GameObject') && path.basename(file) !== 'GameObject.ts') continue;
      for (const method of extractMethods(stripNoise(raw))) {
        fieldWalk.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = fieldWalk.exec(method.body))) {
          const label = match[1];
          if (!allowedByField[label].test(method.name)) {
            violations.push(`${path.basename(file)}:${method.name}:${label}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('facades do not walk serializer-owned hydration labels', () => {
    const checks: Array<[string, string, string[]]> = [
      [
        'Creature.ts',
        'initProperties',
        ['ExpressionList', 'FollowInfo', 'LvlStatList', 'Equip_ItemList', 'ItemList', 'Animation'],
      ],
      ['Store.ts', 'loadInventory', ['ItemList']],
      ['Store.ts', 'initProperties', ['ItemList']],
      ['Placeable.ts', 'loadInventory', ['ItemList']],
      ['Item.ts', 'initProperties', ['Dropable', 'Pickpocketable']],
    ];

    for (const [file, methodName, labels] of checks) {
      const source = fs.readFileSync(path.join(MODULE_DIR, file), 'utf8');
      const method = extractMethods(source).find((entry) => entry.name === methodName);
      // Store realizes pending inventory inside initProperties and has no loadInventory method.
      if (file === 'Store.ts' && methodName === 'loadInventory' && !method) continue;
      expect(method).toBeDefined();
      for (const label of labels) {
        const fieldWalk = new RegExp(
          `(?:getFieldByLabel|hasField)\\(\\s*['"]${label}['"]`,
        );
        expect(method!.body).not.toMatch(fieldWalk);
      }
    }
  });

  it('serializers do not assign the initialized lifecycle flag', () => {
    const serializationDir = path.join(MODULE_DIR, 'serialization');
    const violations = listTsFiles(serializationDir)
      .filter((file) => path.basename(file) !== 'GameObjectInitFinalizer.ts')
      .filter((file) => /target\.initialized\s*=\s*true/.test(
        stripNoise(fs.readFileSync(file, 'utf8')),
      ))
      .map((file) => path.basename(file));
    expect(violations).toEqual([]);
  });
});
