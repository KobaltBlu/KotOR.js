/**
 * Runtime getters and save/export must use live object fields — never a stale
 * GFF template snapshot. Uses source + GFF-layer checks because importing the
 * GameObject hierarchy pulls a circular NWScript/AreaEffect graph in Jest.
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';

const MODULE_DIR = path.resolve(__dirname, '../../../engine/module');
const MANAGER_DIR = path.resolve(__dirname, '../../../engine/managers');

function readModule(name: string){
  return fs.readFileSync(path.join(MODULE_DIR, name), 'utf8');
}

function methodBody(src: string, name: string): string {
  // Require a line start / non-identifier prefix so "getTag" does not match inside
  // identifiers or call sites like foo.getTag().
  const re = new RegExp(
    `(?:^|[\\n;{}])\\s*(?:(?:public|private|protected|static|async|override)\\s+)*${name}\\s*\\([^;{]*\\)\\s*(?::\\s*[^{]+)?\\{`,
    'm'
  );
  const match = re.exec(src);
  if(!match) return '';
  const braceAt = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  for(let i = braceAt; i < src.length; i++){
    if(src[i] === '{') depth++;
    else if(src[i] === '}'){
      depth--;
      if(depth === 0) return src.slice(braceAt, i + 1);
    }
  }
  return '';
}

/**
 * Mirrors Trigger/Waypoint save orientation write from runtime fields.
 */
function saveOrientationsFromRuntime(obj: {
  xOrientation: number;
  yOrientation: number;
  zOrientation: number;
  position: { x: number; y: number; z: number };
}): GFFObject {
  const gff = new GFFObject();
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(obj.xOrientation || 0);
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(obj.position.x);
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(obj.yOrientation || 0);
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(obj.position.y);
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(obj.zOrientation || 0);
  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(obj.position.z);
  return gff;
}

describe('GameObject runtime state decoupling', () => {
  it('GameObject orientation/tag/resref getters return runtime fields', () => {
    const src = readModule('GameObject.ts');
    expect(methodBody(src, 'getXOrientation')).toMatch(/return this\.xOrientation/);
    expect(methodBody(src, 'getYOrientation')).toMatch(/return this\.yOrientation/);
    expect(methodBody(src, 'getZOrientation')).toMatch(/return this\.zOrientation/);
    expect(methodBody(src, 'getTag')).toMatch(/return this\.tag/);
    expect(methodBody(src, 'getTemplateResRef')).toMatch(/return this\.templateResRef/);
    expect(methodBody(src, 'getResRef')).toMatch(/return this\.resRef/);
    expect(methodBody(src, 'getPortraitId')).toMatch(/return this\.portraitId/);
    expect(methodBody(src, 'getKeyName')).toMatch(/return this\.keyName/);
    expect(methodBody(src, 'setTemplateResRef')).toMatch(/this\.templateResRef\s*=/);
    expect(methodBody(src, 'setTemplateResRef')).not.toMatch(/template\.RootNode/);
  });

  it('Placeable getters and Item helpers use runtime state', () => {
    const placeable = readModule('Placeable.ts');
    expect(methodBody(placeable, 'getX')).toMatch(/return this\.position\.x/);
    expect(methodBody(placeable, 'getY')).toMatch(/return this\.position\.y/);
    expect(methodBody(placeable, 'getZ')).toMatch(/return this\.position\.z/);
    expect(methodBody(placeable, 'getBearing')).toMatch(/return this\.bearing/);

    const item = readModule('Item.ts');
    expect(methodBody(item, 'setInfinite')).toMatch(/this\.infinite\s*=/);
    expect(methodBody(item, 'setInfinite')).not.toMatch(/template/);
    expect(methodBody(item, 'getPropertiesList')).toMatch(/return this\.properties/);
  });

  it('Trigger/Waypoint save paths serialize live orientation values', () => {
    const triggerSave = methodBody(readModule('Trigger.ts'), 'save');
    const waypointSave = methodBody(readModule('Waypoint.ts'), 'save');
    expect(triggerSave).toMatch(/this\.xOrientation/);
    expect(triggerSave).toMatch(/this\.yOrientation/);
    expect(triggerSave).toMatch(/this\.zOrientation/);
    expect(triggerSave).not.toMatch(/template\.RootNode\.getFieldByLabel\(['"]XOrientation['"]\)/);
    expect(waypointSave).toMatch(/getXOrientation\(\)|this\.xOrientation/);

    // Stale template values must not appear in a runtime-driven export.
    const staleTemplate = new GFFObject();
    staleTemplate.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(1);
    staleTemplate.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(0);
    staleTemplate.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(0);

    const runtime = {
      xOrientation: 0,
      yOrientation: -1,
      zOrientation: 0.25,
      position: { x: 5, y: 6, z: 7 },
      template: staleTemplate,
    };
    const saved = saveOrientationsFromRuntime(runtime);
    expect(saved.RootNode.getFieldByLabel('XOrientation').getValue()).toBeCloseTo(0, 6);
    expect(saved.RootNode.getFieldByLabel('YOrientation').getValue()).toBeCloseTo(-1, 6);
    expect(saved.RootNode.getFieldByLabel('ZOrientation').getValue()).toBeCloseTo(0.25, 6);
    expect(staleTemplate.RootNode.getFieldByLabel('XOrientation').getValue()).toBe(1);
  });

  it('persistObjectId only assigns object.id', () => {
    const mgr = fs.readFileSync(path.join(MANAGER_DIR, 'GameObjectManager.ts'), 'utf8');
    const body = methodBody(mgr, 'persistObjectId');
    expect(body).toMatch(/object\.id\s*=\s*id/);
    expect(body).not.toMatch(/template|GFFField|ObjectId/);
  });

  it('load paths seed resrefs before merge decisions', () => {
    for(const file of ['Creature.ts', 'Door.ts', 'Placeable.ts', 'Trigger.ts', 'Waypoint.ts', 'Sound.ts', 'Encounter.ts', 'Store.ts']){
      const src = readModule(file);
      expect(src).toMatch(/seedResRefsFromTemplate\(\)/);
    }
  });
});
