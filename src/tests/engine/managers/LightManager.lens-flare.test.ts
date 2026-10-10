import * as THREE from "three";
import { LightManager } from "@engine/managers/LightManager";
import { OdysseyLight3D } from "@engine/render/three/odyssey/OdysseyLight3D";

function makeFlareLight(opts: {
  colorShifts?: number;
  room?: any;
}): OdysseyLight3D {
  const light = new OdysseyLight3D(undefined as any);
  light.flareRadius = 100;
  const n = opts.colorShifts ?? 1;
  for(let i = 0; i < n; i++){
    light.flareColorShifts.push(new THREE.Color(1, 1, 1));
    light.flareSizes.push(1);
    light.flarePositions.push(0);
  }
  if(opts.room){
    const model = new THREE.Object3D() as any;
    model.userData = { gameObject: opts.room };
    light.odysseyModel = model;
  }
  return light;
}

describe("LightManager lens flare list", () => {
  it("includes lights with flarecolorshifts when no room scope", () => {
    const lm = new LightManager();
    const withFlare = makeFlareLight({ colorShifts: 2 });
    const without = makeFlareLight({ colorShifts: 0 });
    without.flareColorShifts.length = 0;
    lm.addLight(withFlare);
    lm.addLight(without);
    lm.rebuildLensFlareLights({});
    expect(lm.getLensFlareLights()).toEqual([withFlare]);
  });

  it("scopes to current room + linked rooms", () => {
    const roomA = { linkedRoomsArray: [] as any[] };
    const roomB = { linkedRoomsArray: [] as any[] };
    const roomC = { linkedRoomsArray: [] as any[] };
    roomA.linkedRoomsArray = [roomB];

    const lm = new LightManager();
    const inA = makeFlareLight({ room: roomA });
    const inB = makeFlareLight({ room: roomB });
    const inC = makeFlareLight({ room: roomC });
    lm.addLight(inA);
    lm.addLight(inB);
    lm.addLight(inC);

    lm.rebuildLensFlareLights({ room: roomA });
    const list = lm.getLensFlareLights();
    expect(list).toContain(inA);
    expect(list).toContain(inB);
    expect(list).not.toContain(inC);
  });

  it("removes light from flare list on removeLight", () => {
    const lm = new LightManager();
    const light = makeFlareLight({});
    lm.addLight(light);
    lm.rebuildLensFlareLights({});
    expect(lm.getLensFlareLights()).toContain(light);
    lm.removeLight(light);
    expect(lm.getLensFlareLights()).not.toContain(light);
  });
});
