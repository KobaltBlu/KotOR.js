describe("party formation offsets", () => {
  const FORMATION_PATTERN_COMPANIONS = [
    [ { x: 1.5, y: -0.7 }, { x: -1.5, y: 0.8 } ],
    [ { x: 0.0, y: 0.0 }, { x: 0.0, y: 0.0 } ],
    [ { x: -2.0, y: 1.5 }, { x: 2.0, y: 4.5 } ],
  ];

  function getOffsets(pattern: number, invert = false){
    const idx = (pattern >= 0 && pattern < 3) ? pattern : 0;
    let c0 = FORMATION_PATTERN_COMPANIONS[idx][0];
    let c1 = FORMATION_PATTERN_COMPANIONS[idx][1];
    if(invert){
      const tmp = c0;
      c0 = c1;
      c1 = tmp;
    }
    return [ { x: 0, y: 0 }, c0, c1 ];
  }

  it("pattern 0 matches party ctor companion slots", () => {
    const o = getOffsets(0);
    expect(o[1]).toEqual({ x: 1.5, y: -0.7 });
    expect(o[2]).toEqual({ x: -1.5, y: 0.8 });
  });

  it("pattern 2 uses wide forward offsets from ctor", () => {
    const o = getOffsets(2);
    expect(o[1]).toEqual({ x: -2.0, y: 1.5 });
    expect(o[2]).toEqual({ x: 2.0, y: 4.5 });
  });

  it("invert swaps companion slots", () => {
    const o = getOffsets(0, true);
    expect(o[1]).toEqual({ x: -1.5, y: 0.8 });
    expect(o[2]).toEqual({ x: 1.5, y: -0.7 });
  });
});

describe("formations.2da SetFormation target math", () => {
  it("rotates (distance,0) by yaw+angle like engine Quaternion path", () => {
    const DEG2RAD = Math.PI / 180;
    const anchor = { x: 10, y: 20 };
    // Facing +X (yaw from -atan2(0,1) = 0)
    const yaw = -Math.atan2(0, 1);
    const angleDeg = 180;
    const distance = 2;
    const theta = yaw + angleDeg * DEG2RAD;
    const tx = anchor.x + distance * Math.cos(theta);
    const ty = anchor.y + distance * Math.sin(theta);
    expect(tx).toBeCloseTo(8, 5);
    expect(ty).toBeCloseTo(20, 5);
  });
});
