import { VISObject } from './VISObject';

describe('VISObject', () => {
  const sampleVIS = [
    'room001 2',
    '  room002',
    '  room003',
    'room002 1',
    '  room001',
  ].join('\n');

  it('read parses rooms and visibility', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    expect(vis.rooms.size).toBeGreaterThanOrEqual(2);
    expect(vis.getVisibleRooms('room001')).toContain('room002');
    expect(vis.getVisibleRooms('room001')).toContain('room003');
  });

  it('constructor with data auto-reads', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    expect(vis.rooms.size).toBeGreaterThanOrEqual(2);
    expect(vis.getVisibleRooms('room001')).toContain('room002');
  });

  it('roomExists returns true for existing room', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    expect(vis.roomExists('room001')).toBe(true);
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
    // room003 appears only as a child in sampleVIS; ensure it exists so setAllVisible includes it
    vis.addRoom('room003');
    vis.setAllVisible();
    expect(vis.getVisible('room001', 'room002')).toBe(true);
    expect(vis.getVisible('room001', 'room003')).toBe(true);
    expect(vis.getVisible('room002', 'room001')).toBe(true);
  });

  it('removeRoom removes room and references', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    vis.read();
    vis.removeRoom('room003');
    expect(vis.roomExists('room003')).toBe(false);
    expect(vis.getVisibleRooms('room001')).not.toContain('room003');
  });

  it('toBuffer round-trip', () => {
    const vis = new VISObject(new TextEncoder().encode(sampleVIS));
    const buf = vis.toBuffer();
    expect(buf.length).toBeGreaterThan(0);
    const vis2 = new VISObject(buf);
    expect(vis2.rooms.size).toBe(vis.rooms.size);
    expect(vis2.getVisibleRooms('room001')).toEqual(vis.getVisibleRooms('room001'));
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
});
