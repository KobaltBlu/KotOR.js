/**
 * @jest-environment node
 *
 * SWMG_GetPosition (623) must match CSWTrackFollower::GetPosition (0x0066d5d0):
 * world position of the follower's first model, which includes the tunnel offset.
 * tar_m03mg's heartbeat locks the tunnel to GetPosition(OBJECT_SELF).x - 100 at the
 * finish; the old modelhook-local value (x = 5) pushed the swoop to x = -95.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('SWMG_GetPosition', () => {
  const src = fs.readFileSync(srcPath('engine', 'nwscript', 'NWScriptDefK1.ts'), 'utf8');
  const start = src.indexOf('name: "SWMG_GetPosition"');
  const body = src.slice(start, src.indexOf('  624:{', start));

  it('returns the first model world position, not the modelhook local position', () => {
    expect(start).toBeGreaterThan(0);
    expect(body).toMatch(/follower\.models\?\.\[0\]/);
    expect(body).toMatch(/getWorldPosition\(vec3\)/);
    expect(body).not.toMatch(/hook\.position\.x/);
  });
});
