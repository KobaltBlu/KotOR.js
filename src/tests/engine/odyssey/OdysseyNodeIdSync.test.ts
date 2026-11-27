/**
 * node-id mapping: model node.id (nodeNumber) is shared across the
 * supermodel chain; nameIndex is per-model. Anim resolve prefers nodesById.
 */
import { describe, expect, test } from '@jest/globals';
import {
  synchronizeAnimationToModel,
  synchronizeNodeIds,
  getMaxNodeIdFromMap,
} from '@engine/odyssey/OdysseyNodeIdSync';
import { OdysseyObject3D } from '@engine/render/three/odyssey/OdysseyObject3D';

function makeObj(
  name: string,
  nodeNumber: number,
  nameIndex: number,
): OdysseyObject3D {
  const obj = new OdysseyObject3D();
  obj.name = name;
  (obj as any).odysseyModelNode = { name, nodeNumber, nameIndex };
  return obj;
}

function makeAnimNode(
  name: string,
  nodeNumber: number,
  nameIndex: number,
): any {
  return {
    name,
    nodeNumber,
    nameIndex,
    children: [] as any[],
  };
}

describe('OdysseyNodeIdSync / nodesById', () => {
  test('synchronizeNodeIds copies reference ids by name and assigns new ids to unmatched', () => {
    const nextId = { value: 100 };
    const reference = {
      name: 'root',
      nodeNumber: 0,
      children: [
        { name: 'pelvis_g', nodeNumber: 68, children: [
          { name: 'lfoot_g', nodeNumber: 71, children: [] },
        ]},
      ],
    };
    const target = {
      name: 's_female03',
      nodeNumber: 0,
      children: [
        { name: 'pelvis_g', nodeNumber: 5, children: [
          { name: 'lfoot_g', nodeNumber: 12, children: [] },
          { name: 'extra_g', nodeNumber: 99, children: [] },
        ]},
      ],
    };

    target.nodeNumber = reference.nodeNumber;
    synchronizeNodeIds(target.children[0], reference.children[0], nextId);

    expect(target.children[0].nodeNumber).toBe(68);
    expect(target.children[0].children[0].nodeNumber).toBe(71);
    expect(target.children[0].children[1].nodeNumber).toBe(100);
    expect(nextId.value).toBe(101);
  });

  test('synchronizeAnimationToModel remaps supermodel nameIndex ids onto geometry nodeNumbers', () => {
    const pelvis = makeObj('pelvis_g', 68, 3);
    const lfoot = makeObj('lfoot_g', 71, 6);
    const root = makeObj('p_bastilabb', 0, 0);
    root.add(pelvis);
    pelvis.add(lfoot);

    const nodesByName = new Map<string, OdysseyObject3D>();
    nodesByName.set('p_bastilabb', root);
    nodesByName.set('pelvis_g', pelvis);
    nodesByName.set('lfoot_g', lfoot);

    const nodesById: OdysseyObject3D[] = [];
    nodesById[0] = root;
    nodesById[68] = pelvis;
    nodesById[71] = lfoot;

    const animRoot = makeAnimNode('s_female03', 0, 0);
    const animPelvis = makeAnimNode('pelvis_g', 5, 5);
    const animFoot = makeAnimNode('lfoot_g', 12, 12);
    animRoot.children = [animPelvis];
    animPelvis.children = [animFoot];

    const anim: any = {
      name: 'walk',
      rootNode: animRoot,
      nodes: [animRoot, animPelvis, animFoot],
    };

    synchronizeAnimationToModel(anim, nodesByName, nodesById);

    const syncedPelvis = anim.nodes.find((n: any) => n.name === 'pelvis_g')!;
    const syncedFoot = anim.nodes.find((n: any) => n.name === 'lfoot_g')!;
    expect(syncedPelvis.nodeNumber).toBe(68);
    expect(syncedFoot.nodeNumber).toBe(71);
    // Original supermodel nodes untouched
    expect(animPelvis.nodeNumber).toBe(5);
    expect(animFoot.nodeNumber).toBe(12);
  });

  test('nodesById wins over name Map impostor for anim resolve', () => {
    const bodyNeck = makeObj('neck_g', 44, 56);
    const headNeck = makeObj('neck_g', 999, 10);

    const nodesByName = new Map<string, OdysseyObject3D>();
    nodesByName.set('neck_g', headNeck);

    const nodesById: OdysseyObject3D[] = [];
    nodesById[44] = bodyNeck;
    nodesById[999] = headNeck;

    const animNode = makeAnimNode('neck_g', 44, 55);

    const resolved =
      nodesById[animNode.nodeNumber] ?? nodesByName.get(animNode.name);

    expect(resolved).toBe(bodyNeck);
    expect(resolved).not.toBe(headNeck);
    expect(getMaxNodeIdFromMap(nodesById, nodesByName)).toBe(999);
  });

  test('BB-style divergence: nameIndex differs, nodeNumber shared', () => {
    const bbPelvis = makeObj('pelvis_g', 68, 3);
    const sfPelvisNi = 5;
    expect(bbPelvis.odysseyModelNode!.nameIndex).not.toBe(sfPelvisNi);
    expect(bbPelvis.odysseyModelNode!.nodeNumber).toBe(68);

    const nodesById: OdysseyObject3D[] = [];
    nodesById[68] = bbPelvis;
    nodesById[3] = makeObj('torso_g', 3, 16);

    expect(nodesById[sfPelvisNi]).toBeUndefined();
    expect(nodesById[68]).toBe(bbPelvis);
    expect(nodesById[3]?.name).toBe('torso_g');
  });
});
