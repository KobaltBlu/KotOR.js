/**
 * @jest-environment node
 *
 * loadOdysseySuperModel caches the node-id-synchronized supermodel animation
 * nodes per geometry source model, so repeat builds of the same model share
 * one node set instead of re-cloning the whole supermodel chain.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { MDLLoader } from '@engine/loaders/MDLLoader';
import { loadOdysseySuperModel } from '@engine/render/three/odyssey/OdysseyModel3DFactory';
import { OdysseyObject3D } from '@engine/render/three/odyssey/OdysseyObject3D';
import type { OdysseyModel } from '@engine/odyssey/OdysseyModel';
import type { OdysseyModelAnimation } from '@engine/odyssey/OdysseyModelAnimation';

function makeObj(name: string, nodeNumber: number, nameIndex: number): OdysseyObject3D {
  const obj = new OdysseyObject3D();
  obj.name = name;
  (obj as any).odysseyModelNode = { name, nodeNumber, nameIndex };
  return obj;
}

function makeSupermodel(): OdysseyModel {
  const animRoot: any = { name: 's_female03', nodeNumber: 0, nameIndex: 0, children: [] };
  const animPelvis: any = { name: 'pelvis_g', nodeNumber: 5, nameIndex: 5, children: [] };
  const animFoot: any = { name: 'lfoot_g', nodeNumber: 12, nameIndex: 12, children: [] };
  animRoot.children = [animPelvis];
  animPelvis.children = [animFoot];
  const walk: any = { name: 'walk', rootNode: animRoot, nodes: [animRoot, animPelvis, animFoot], events: [] };
  const run: any = {
    name: 'run',
    rootNode: { ...animRoot, children: [] },
    nodes: [],
    events: [],
  };
  run.nodes = [run.rootNode];
  return {
    animations: [walk, run] as unknown as OdysseyModelAnimation[],
    modelHeader: { superModelName: '' },
  } as unknown as OdysseyModel;
}

function makeInstance(source: object, options: any = {}): any {
  const root = makeObj('p_bastilabb', 0, 0);
  const pelvis = makeObj('pelvis_g', 68, 3);
  const foot = makeObj('lfoot_g', 71, 6);
  root.add(pelvis);
  pelvis.add(foot);
  const nodes = new Map<string, OdysseyObject3D>([
    ['p_bastilabb', root],
    ['pelvis_g', pelvis],
    ['lfoot_g', foot],
  ]);
  const nodesById: OdysseyObject3D[] = [];
  nodesById[0] = root;
  nodesById[68] = pelvis;
  nodesById[71] = foot;
  return {
    sourceModel: source,
    options,
    nodes,
    nodesById,
    odysseyAnimations: [] as OdysseyModelAnimation[],
    odysseyAnimationMap: new Map<string, OdysseyModelAnimation>(),
    ensureNodesById: () => {},
  };
}

describe('loadOdysseySuperModel sync cache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('instances of the same source model share synced nodes with identical ids', async () => {
    const supermodel = makeSupermodel();
    jest.spyOn(MDLLoader.loader, 'load').mockResolvedValue(supermodel);
    const source = {};

    const a = makeInstance(source);
    const b = makeInstance(source);
    await loadOdysseySuperModel('s_female03', a);
    await loadOdysseySuperModel('s_female03', b);

    const walkA = a.odysseyAnimationMap.get('walk');
    const walkB = b.odysseyAnimationMap.get('walk');
    // Each instance gets its own animation wrapper...
    expect(walkA).not.toBe(walkB);
    // ...sharing one synced node set.
    expect(walkA.nodes).toBe(walkB.nodes);
    expect(walkA.rootNode).toBe(walkB.rootNode);

    const pelvis = walkA.nodes.find((n: any) => n.name === 'pelvis_g');
    const foot = walkA.nodes.find((n: any) => n.name === 'lfoot_g');
    expect(pelvis.nodeNumber).toBe(68);
    expect(foot.nodeNumber).toBe(71);
    // Cached supermodel MDL stays untouched.
    const superWalk: any = supermodel.animations[0];
    expect(superWalk.nodes[1].nodeNumber).toBe(5);
    expect(superWalk.nodes[2].nodeNumber).toBe(12);
    expect(a.odysseyAnimations.map((x: any) => x.name)).toEqual(['walk', 'run']);
  });

  test('different source models and editor mode do not share synced nodes', async () => {
    const supermodel = makeSupermodel();
    jest.spyOn(MDLLoader.loader, 'load').mockResolvedValue(supermodel);

    const a = makeInstance({});
    const b = makeInstance({});
    await loadOdysseySuperModel('s_female03', a);
    await loadOdysseySuperModel('s_female03', b);
    expect(a.odysseyAnimationMap.get('walk').nodes).not.toBe(b.odysseyAnimationMap.get('walk').nodes);

    const source = {};
    const e1 = makeInstance(source, { editorMode: true });
    const e2 = makeInstance(source, { editorMode: true });
    await loadOdysseySuperModel('s_female03', e1);
    await loadOdysseySuperModel('s_female03', e2);
    expect(e1.odysseyAnimationMap.get('walk').nodes).not.toBe(e2.odysseyAnimationMap.get('walk').nodes);
  });

  test('a model that already has the animation keeps its own clip', async () => {
    const supermodel = makeSupermodel();
    jest.spyOn(MDLLoader.loader, 'load').mockResolvedValue(supermodel);
    const own: any = { name: 'walk', nodes: [] };
    const inst = makeInstance({});
    inst.odysseyAnimationMap.set('walk', own);
    inst.odysseyAnimations.push(own);
    await loadOdysseySuperModel('s_female03', inst);
    expect(inst.odysseyAnimationMap.get('walk')).toBe(own);
    expect(inst.odysseyAnimations.length).toBe(2);
  });
});
