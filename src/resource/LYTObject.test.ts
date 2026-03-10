import { LYTObject } from '@/resource/LYTObject';

describe('LYTObject', () => {
  const sampleLYT = [
    '#MAXLAYOUT ASCII',
    '   filedependancy M17mg.max',
    'beginlayout',
    '     roomcount    2',
    '           M17mg_01a    100.0   100.0 0.0',
    '         M17mg_01b 100.0  100.0 0.0',
    '   trackcount 2',
    '      M17mg_MGT01   0.0 0.0 0.0',
    '         M17mg_MGT02 112.047 209.04 0.0',
    '   obstaclecount 2',
    '      M17mg_MGO01 103.309 3691.61 0.0',
    '         M17mg_MGO02 118.969 3688.0 0.0',
    '     doorhookcount 2',
    '      M02ac_02h door_01 0 170.475 66.375 0.0 0.707107 0.0 0.0 -0.707107',
    '         M02ac_02a door_06 0 90.0 129.525 0.0 1.0 0.0 0.0 0.0',
    '    donelayout',
  ].join('\n');

  const corruptLYT = sampleLYT.replace('roomcount    2', 'roomcount    5');

  it('parses vendor-like layout content', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));

    expect(lyt.filedependancy).toBe('M17mg.max');
    expect(lyt.rooms).toHaveLength(2);
    expect(lyt.tracks).toHaveLength(2);
    expect(lyt.obstacles).toHaveLength(2);
    expect(lyt.doorhooks).toHaveLength(2);

    expect(lyt.rooms[0].name).toBe('M17mg_01a');
    expect(lyt.rooms[0].position.x).toBeCloseTo(100.0);
    expect(lyt.rooms[0].position.y).toBeCloseTo(100.0);
    expect(lyt.tracks[1].name).toBe('M17mg_MGT02');
    expect(lyt.tracks[1].position.x).toBeCloseTo(112.047);
    expect(lyt.obstacles[0].name).toBe('M17mg_MGO01');
    expect(lyt.obstacles[0].position.y).toBeCloseTo(3691.61);
    expect(lyt.doorhooks[0].room).toBe('M02ac_02h');
    expect(lyt.doorhooks[0].name).toBe('door_01');
    expect(lyt.doorhooks[0].position.x).toBeCloseTo(170.475);
    expect(lyt.doorhooks[0].quaternion.x).toBeCloseTo(0.707107);
    expect(lyt.doorhooks[0].quaternion.w).toBeCloseTo(-0.707107);
  });

  it('export round-trips layout data', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const reloaded = new LYTObject(lyt.export());

    expect(reloaded.filedependancy).toBe(lyt.filedependancy);
    expect(reloaded.rooms).toHaveLength(lyt.rooms.length);
    expect(reloaded.tracks).toHaveLength(lyt.tracks.length);
    expect(reloaded.obstacles).toHaveLength(lyt.obstacles.length);
    expect(reloaded.doorhooks).toHaveLength(lyt.doorhooks.length);
    expect(reloaded.doorhooks[1].name).toBe('door_06');
  });

  it('toJSON and fromJSON round-trip layout data', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const reloaded = new LYTObject();
    reloaded.fromJSON(lyt.toJSON());

    expect(reloaded.filedependancy).toBe('M17mg.max');
    expect(reloaded.rooms).toHaveLength(2);
    expect(reloaded.tracks[0].name).toBe('M17mg_MGT01');
    expect(reloaded.doorhooks[1].quaternion.w).toBeCloseTo(0.0);
  });

  it('rejects malformed declared counts', () => {
    expect(() => new LYTObject(new TextEncoder().encode(corruptLYT))).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('XML round-trip preserves layout data', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const xml = lyt.toXML();
    expect(xml.length).toBeGreaterThan(0);
    const reloaded = new LYTObject();
    reloaded.fromXML(xml);
    expect(reloaded.rooms).toHaveLength(2);
    expect(reloaded.tracks).toHaveLength(2);
    expect(reloaded.obstacles).toHaveLength(2);
    expect(reloaded.doorhooks).toHaveLength(2);
  });

  it('YAML round-trip preserves layout data', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const yaml = lyt.toYAML();
    expect(yaml.length).toBeGreaterThan(0);
    const reloaded = new LYTObject();
    reloaded.fromYAML(yaml);
    expect(reloaded.rooms).toHaveLength(2);
    expect(reloaded.doorhooks[0].name).toBe('door_01');
  });

  it('TOML round-trip preserves layout data', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const toml = lyt.toTOML();
    expect(toml.length).toBeGreaterThan(0);
    const reloaded = new LYTObject();
    reloaded.fromTOML(toml);
    expect(reloaded.rooms).toHaveLength(2);
    expect(reloaded.tracks[1].name).toBe('M17mg_MGT02');
  });

  it('doorhook quaternion values are preserved across export', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    const reloaded = new LYTObject(lyt.export());

    expect(reloaded.doorhooks[0].quaternion.x).toBeCloseTo(0.707107, 4);
    expect(reloaded.doorhooks[0].quaternion.y).toBeCloseTo(0.0);
    expect(reloaded.doorhooks[0].quaternion.z).toBeCloseTo(0.0);
    expect(reloaded.doorhooks[0].quaternion.w).toBeCloseTo(-0.707107, 4);
    expect(reloaded.doorhooks[1].quaternion.x).toBeCloseTo(1.0);
    expect(reloaded.doorhooks[1].quaternion.w).toBeCloseTo(0.0);
  });

  it('obstacle positions are preserved with full precision', () => {
    const lyt = new LYTObject(new TextEncoder().encode(sampleLYT));
    expect(lyt.obstacles[0].position.x).toBeCloseTo(103.309, 2);
    expect(lyt.obstacles[0].position.y).toBeCloseTo(3691.61, 1);
    expect(lyt.obstacles[1].position.x).toBeCloseTo(118.969, 2);
    expect(lyt.obstacles[1].position.y).toBeCloseTo(3688.0, 1);
  });
});
