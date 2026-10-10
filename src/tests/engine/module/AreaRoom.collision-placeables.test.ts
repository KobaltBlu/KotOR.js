import * as THREE from "three";
import { AreaRoom } from "@engine/module/AreaRoom";
import { GameObjectType } from "@core/enums/module/GameObjectType";

jest.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({}));

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    TwoDAManager: { datatables: new Map() },
    module: { readyToProcessEvents: false },
    group: {},
  },
}));

jest.mock("@engine/movement/CollisionContext", () => ({
  CollisionContext: class {
    walkmesh: any;
    edges: any[] = [];
    setWalkmesh(walkmesh: any){
      this.walkmesh = walkmesh;
      this.edges = walkmesh?.edges ? Array.from(walkmesh.edges.values()) : [];
    }
  },
}));

jest.mock("@engine/render/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyFace3: class {},
  OdysseyObject3D: class {
    position = new (require("three").Vector3)();
    userData: Record<string, unknown> = {};
    add(){ return this; }
    removeFromParent(){ return this; }
    updateMatrix(){}
    updateMatrixWorld(){}
    traverse(){}
  },
}));

jest.mock("@engine/odyssey", () => ({
  OdysseyModelNodeAABB: class {},
  OdysseyWalkMesh: class {},
}));

function makePlaceable(bounds: THREE.Box3, options: { visible?: boolean; edges?: any[]; isStatic?: boolean } = {}) {
  return {
    objectType: GameObjectType.Placeable,
    model: { visible: options.visible ?? true },
    collisionManager: {
      walkmesh: {
        edges: options.edges ?? [{ transition: -1 }],
      },
    },
    box: bounds.clone(),
    collisionBoundsDirty: false,
    collisionMatrixDirty: false,
    isStatic: () => options.isStatic ?? true,
    computeBoundingBox: jest.fn(),
  } as any;
}

describe("AreaRoom collision placeable broadphase", () => {
  it("returns only visible collision placeables intersecting the query box", () => {
    const room = new AreaRoom("room", {} as any);
    const near = makePlaceable(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)));
    const far = makePlaceable(new THREE.Box3(new THREE.Vector3(5, 5, 0), new THREE.Vector3(6, 6, 1)));
    const hidden = makePlaceable(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)), { visible: false });
    const noEdges = makePlaceable(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)), { edges: [] });

    room.attachChildObject(near);
    room.attachChildObject(far);
    room.attachChildObject(hidden);
    room.attachChildObject(noEdges);

    const query = new THREE.Box3(new THREE.Vector3(-0.25, -0.25, -0.25), new THREE.Vector3(1.25, 1.25, 1.25));

    expect(room.getCollisionPlaceablesForBox(query)).toEqual([near]);
  });

  it("invalidates when placeables detach and recomputes dirty bounds", () => {
    const room = new AreaRoom("room", {} as any);
    const placeable = makePlaceable(new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)));
    const query = new THREE.Box3(new THREE.Vector3(-0.25, -0.25, -0.25), new THREE.Vector3(1.25, 1.25, 1.25));

    room.attachChildObject(placeable);
    expect(room.getCollisionPlaceablesForBox(query)).toEqual([placeable]);

    placeable.collisionBoundsDirty = true;
    room.markCollisionPlaceablesDirty("bounds");
    room.getCollisionPlaceablesForBox(query);
    expect(placeable.computeBoundingBox).toHaveBeenCalledTimes(1);

    room.removeChildObject(placeable);
    expect(room.getCollisionPlaceablesForBox(query)).toEqual([]);
  });

  it("queries dynamic placeables through the overflow list", () => {
    const room = new AreaRoom("room", {} as any);
    const dynamic = makePlaceable(
      new THREE.Box3(new THREE.Vector3(5, 5, 0), new THREE.Vector3(6, 6, 1)),
      { isStatic: false }
    );
    const query = new THREE.Box3(new THREE.Vector3(-0.25, -0.25, -0.25), new THREE.Vector3(1.25, 1.25, 1.25));

    room.attachChildObject(dynamic);
    expect(room.getCollisionPlaceablesForBox(query)).toEqual([]);

    dynamic.box.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    expect(room.getCollisionPlaceablesForBox(query)).toEqual([dynamic]);
    expect(dynamic.computeBoundingBox).toHaveBeenCalled();
  });
  it("splits static placeables through the BVH and filters by query box", () => {
    const room = new AreaRoom("room", {} as any);
    const placeables = Array.from({ length: 12 }, (_, index) => makePlaceable(
      new THREE.Box3(
        new THREE.Vector3(index * 4, 0, 0),
        new THREE.Vector3(index * 4 + 1, 1, 1),
      )
    ));
    for(const placeable of placeables){
      room.attachChildObject(placeable);
    }

    const query = new THREE.Box3(new THREE.Vector3(31.5, -0.25, -0.25), new THREE.Vector3(33.25, 1.25, 1.25));

    expect(room.getCollisionPlaceablesForBox(query)).toEqual([placeables[8]]);
  });
});
