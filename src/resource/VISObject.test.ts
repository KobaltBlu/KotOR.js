import { VISObject } from '@/resource/VISObject';

describe('VISObject', () => {
  const sampleVIS = [
    'room_01 3',
    '  room_02',
    '  room_03',
    '  room_04',
    'room_02 1',
    '  room_01',
    'room_03 2',
    '  room_01',
    '  room_04',
    'room_04 2',
    '  room_03',
    '  room_01',
  ].join('\n');

  const corruptVIS = [
    'room_01 77',
    '  room_02',
    '     room_03',
    '  room_04',
    'room_02 1',
    '     room_01',
  ].join('\n');

  it('read parses rooms and visibility', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    expect(vis.rooms.size).toBe(4);
    expect(vis.getVisibleRooms('room_01')).toContain('room_02');
    expect(vis.getVisibleRooms('room_01')).toContain('room_03');
    expect(vis.getVisibleRooms('room_01')).toContain('room_04');
  });

  it('constructor with data auto-reads', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    expect(vis.rooms.size).toBe(4);
    expect(vis.getVisibleRooms('room_01')).toContain('room_02');
  });

  it('preserves vendor-like room visibility semantics', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));

    expect(vis.getVisible('room_01', 'room_02')).toBe(true);
    expect(vis.getVisible('room_01', 'room_03')).toBe(true);
    expect(vis.getVisible('room_01', 'room_04')).toBe(true);

    expect(vis.getVisible('room_02', 'room_01')).toBe(true);
    expect(vis.getVisible('room_02', 'room_03')).toBe(false);
    expect(vis.getVisible('room_02', 'room_04')).toBe(false);

    expect(vis.getVisible('room_03', 'room_01')).toBe(true);
    expect(vis.getVisible('room_03', 'room_04')).toBe(true);
    expect(vis.getVisible('room_03', 'room_02')).toBe(false);

    expect(vis.getVisible('room_04', 'room_01')).toBe(true);
    expect(vis.getVisible('room_04', 'room_03')).toBe(true);
    expect(vis.getVisible('room_04', 'room_02')).toBe(false);
  });

  it('roomExists returns true for existing room', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    expect(vis.roomExists('room_01')).toBe(true);
    expect(vis.roomExists('nonexistent')).toBe(false);
  });

  it('addRoom adds new room', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    vis.addRoom('room999');
    expect(vis.roomExists('room999')).toBe(true);
  });

  it('setVisible and getVisible', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    vis.addRoom('roomA');
    vis.addRoom('roomB');
    vis.setVisible('roomA', 'roomB', true);
    expect(vis.getVisible('roomA', 'roomB')).toBe(true);
    vis.setVisible('roomA', 'roomB', false);
    expect(vis.getVisible('roomA', 'roomB')).toBe(false);
  });

  it('setAllVisible makes all rooms see each other', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    vis.setAllVisible();
    expect(vis.getVisible('room_01', 'room_02')).toBe(true);
    expect(vis.getVisible('room_01', 'room_03')).toBe(true);
    expect(vis.getVisible('room_02', 'room_01')).toBe(true);
  });

  it('removeRoom removes room and references', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    vis.removeRoom('room_03');
    expect(vis.roomExists('room_03')).toBe(false);
    expect(vis.getVisibleRooms('room_01')).not.toContain('room_03');
  });

  it('toBuffer round-trip', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const buf = vis.toBuffer();
    expect(buf.length).toBeGreaterThan(0);
    const vis2 = new VISObject(buf);
    expect(vis2.rooms.size).toBe(vis.rooms.size);
    expect(vis2.getVisibleRooms('room_01')).toEqual(vis.getVisibleRooms('room_01'));
  });

  it('toJSON and fromJSON round-trip room mappings', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const reloaded = new VISObject();
    reloaded.fromJSON(vis.toJSON());

    expect(reloaded.rooms.size).toBe(vis.rooms.size);
    expect(reloaded.getVisibleRooms('room_04')).toEqual(vis.getVisibleRooms('room_04'));
  });

  it('skips version header lines', () => {
    const withVersion = [
      'room001 V3.28',
      'room002 1',
      '  room001',
    ].join('\n');
    const vis = new VISObject(new TextEncoder().encode(withVersion));
    vis.read();
    expect(vis.roomExists('room002')).toBe(true);
    expect(vis.getVisibleRooms('room002')).toContain('room001');
  });

  it('rejects malformed room counts', () => {
    expect(() => new VISObject(new TextEncoder().encode(corruptVIS))).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('XML round-trip preserves room mappings', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const xml = vis.toXML();
    expect(xml.length).toBeGreaterThan(0);
    const reloaded = new VISObject();
    reloaded.fromXML(xml);
    expect(reloaded.rooms.size).toBe(vis.rooms.size);
    expect(reloaded.getVisibleRooms('room_01')).toContain('room_02');
  });

  it('YAML round-trip preserves room mappings', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const yaml = vis.toYAML();
    expect(yaml.length).toBeGreaterThan(0);
    const reloaded = new VISObject();
    reloaded.fromYAML(yaml);
    expect(reloaded.rooms.size).toBe(vis.rooms.size);
    expect(reloaded.getVisible('room_03', 'room_04')).toBe(true);
  });

  it('TOML round-trip preserves room mappings', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const toml = vis.toTOML();
    expect(toml.length).toBeGreaterThan(0);
    const reloaded = new VISObject();
    reloaded.fromTOML(toml);
    expect(reloaded.rooms.size).toBe(vis.rooms.size);
    expect(reloaded.getVisible('room_04', 'room_01')).toBe(true);
  });

  it('empty VIS has no rooms', () => {
    const vis = new VISObject(new TextEncoder().encode(''));
    expect(vis.rooms.size).toBe(0);
  });

  // --- Vendor-derived: exact ASCII_TEST_DATA with irregular mixed indentation ---

  it('parses vendor ASCII_TEST_DATA with mixed indentation correctly', () => {
    // Exact content of test.vis from test_vis.py — rooms and sub-entries use
    // inconsistent leading whitespace (1, 2, and 5 spaces) as observed in original game files
    const vendorAscii = [
      'room_01 3',
      '  room_02',
      '     room_03',
      '  room_04',
      'room_02 1',
      '     room_01',
      'room_03 2',
      'room_01',
      '  room_04',
      'room_04 2',
      '  room_03',
      ' room_01',
    ].join('\n');

    const vis = new VISObject(new TextEncoder().encode(vendorAscii));

    // room_01 sees room_02, room_03, room_04
    expect(vis.getVisible('room_01', 'room_02')).toBe(true);
    expect(vis.getVisible('room_01', 'room_03')).toBe(true);
    expect(vis.getVisible('room_01', 'room_04')).toBe(true);

    // room_02 sees room_01 only
    expect(vis.getVisible('room_02', 'room_01')).toBe(true);
    expect(vis.getVisible('room_02', 'room_03')).toBe(false);
    expect(vis.getVisible('room_02', 'room_04')).toBe(false);

    // room_03 sees room_01 and room_04 (but NOT room_02)
    expect(vis.getVisible('room_03', 'room_01')).toBe(true);
    expect(vis.getVisible('room_03', 'room_04')).toBe(true);
    expect(vis.getVisible('room_03', 'room_02')).toBe(false);

    // room_04 sees room_03 and room_01 (but NOT room_02)
    expect(vis.getVisible('room_04', 'room_01')).toBe(true);
    expect(vis.getVisible('room_04', 'room_03')).toBe(true);
    expect(vis.getVisible('room_04', 'room_02')).toBe(false);
  });
});
