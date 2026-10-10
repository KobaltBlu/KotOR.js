/**
 * AreaGitSerializer aggregation uses per-object serializers and exact list labels.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

describe('AreaGitSerializer / ModuleIfoSerializer aggregation', () => {
  const SERIAL_DIR = path.resolve(__dirname, '../../../../engine/module/serialization');
  const MODULE_DIR = path.resolve(__dirname, '../../../../engine/module');

  it('Area.save delegates GIT assembly to AreaGitSerializer', () => {
    const areaSrc = fs.readFileSync(path.join(MODULE_DIR, 'Area.ts'), 'utf8');
    expect(areaSrc).toMatch(/AreaGitSerializer\.serialize\(this,\s*\{\s*gameKey\s*\}\)/);
  });

  it('Module.save delegates IFO assembly to ModuleIfoSerializer', () => {
    const moduleSrc = fs.readFileSync(path.join(MODULE_DIR, 'Module.ts'), 'utf8');
    expect(moduleSrc).toMatch(/ModuleIfoSerializer\.serialize\(this/);
    // Envelope I/O stays in Module.save
    expect(moduleSrc).toMatch(/ERFObject/);
    expect(moduleSrc).toMatch(/addResource\('module'/);
  });

  it('AreaGitSerializer emits observed GIT list labels', () => {
    const src = fs.readFileSync(path.join(SERIAL_DIR, 'AreaGitSerializer.ts'), 'utf8');
    for (const label of [
      'AreaEffectList',
      'CameraList',
      'Creature List',
      'Door List',
      'Encounter List',
      'Placeable List',
      'SoundList',
      'StoreList',
      'TriggerList',
      'WaypointList',
    ]) {
      expect(src).toContain(`'${label}'`);
    }
  });

  it('serializer files do not import the GameState facade', () => {
    const offenders = fs.readdirSync(SERIAL_DIR)
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => {
        const src = fs.readFileSync(path.join(SERIAL_DIR, file), 'utf8');
        return /from\s+['"]@engine\/runtime\/GameState['"]/.test(src);
      });
    expect(offenders).toEqual([]);
  });

  it('save facades provide serializer runtime decisions through context', () => {
    const areaSerializer = fs.readFileSync(path.join(SERIAL_DIR, 'AreaGitSerializer.ts'), 'utf8');
    const moduleSerializer = fs.readFileSync(path.join(SERIAL_DIR, 'ModuleIfoSerializer.ts'), 'utf8');
    const creatureSerializer = fs.readFileSync(path.join(SERIAL_DIR, 'CreatureSerializer.ts'), 'utf8');

    expect(areaSerializer).toMatch(/context\.gameKey\s*\?\?\s*'k1'/);
    expect(moduleSerializer).toMatch(/options\.playerUtc\s*\?\?/);
    expect(creatureSerializer).not.toMatch(/GameState\.PartyManager/);
  });

  it('serializers never read object.template during serialize()', () => {
    const files = fs.readdirSync(SERIAL_DIR)
      .filter((f) => f.endsWith('Serializer.ts') && !f.includes('LoadPipeline'));
    const offenders: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(path.join(SERIAL_DIR, file), 'utf8');
      const serializeIdx = src.indexOf('serialize(');
      if (serializeIdx < 0) continue;
      const after = src.slice(serializeIdx);
      if (/source\.template|object\.template|target\.template/.test(after.split('deserialize(')[0] || after)) {
        // Allow comments mentioning template; ban assignments/reads in serialize bodies roughly
        if (/serialize\([\s\S]*?(?:source|object)\.template/.test(src)) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
