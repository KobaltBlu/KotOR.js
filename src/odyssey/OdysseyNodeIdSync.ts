import type { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";

/**
 * Tree node shape used by retail SynchronizeNodes (name + id + children).
 */
export interface IOdysseySyncNode {
  name: string;
  nodeNumber: number;
  children?: IOdysseySyncNode[];
}

/** Minimal anim shape so sync does not import OdysseyModelAnimation (GameState). */
export interface IOdysseyAnimForSync {
  rootNode?: IOdysseySyncNode & { children?: IOdysseySyncNode[] };
  nodes: Array<IOdysseySyncNode & { children?: IOdysseySyncNode[] }>;
}

/**
 * Retail MaxTree::SynchronizeTree / MdlNode::SynchronizeNodes.
 *
 * Walk two hierarchies in parallel. Matching children (case-insensitive name)
 * copy `nodeNumber` (MdlNode.id) from the reference tree onto the target.
 * Unmatched target nodes receive sequential ids starting at `nextId.value`.
 *
 * LoadAddInAnimations syncs the incoming anim/add-in tree onto the creature
 * model so AnimateHierarchy can match Part.field5_0x28 to anim MdlNode.id.
 */
export function synchronizeNodeIds(
  target: IOdysseySyncNode,
  reference: IOdysseySyncNode | undefined,
  nextId: { value: number },
): void {
  if(!target){
    return;
  }

  if(reference){
    target.nodeNumber = reference.nodeNumber;
  }else{
    target.nodeNumber = nextId.value++;
  }

  const targetChildren = target.children || [];
  const refChildren = reference?.children || [];

  for(let i = 0; i < targetChildren.length; i++){
    const child = targetChildren[i];
    if(!child){
      continue;
    }
    const childName = (child.name || '').toLowerCase();
    let matched: IOdysseySyncNode | undefined;
    for(let j = 0; j < refChildren.length; j++){
      const refChild = refChildren[j];
      if(refChild && (refChild.name || '').toLowerCase() === childName){
        matched = refChild;
        break;
      }
    }
    synchronizeNodeIds(child, matched, nextId);
  }
}

/**
 * Max id among a reference name→nodeNumber map (geometry nodesById / nodes Map).
 */
export function getMaxNodeIdFromMap(
  nodesById: (OdysseyObject3D | undefined)[],
  nodesByName?: Map<string, OdysseyObject3D>,
): number {
  let maxId = -1;
  for(let i = 0; i < nodesById.length; i++){
    const obj = nodesById[i];
    const nn = obj?.odysseyModelNode?.nodeNumber;
    if(typeof nn === 'number' && nn > maxId){
      maxId = nn;
    }
  }
  if(nodesByName){
    nodesByName.forEach((obj) => {
      const nn = obj?.odysseyModelNode?.nodeNumber;
      if(typeof nn === 'number' && nn > maxId){
        maxId = nn;
      }
    });
  }
  return maxId;
}

/**
 * Build a name→sync-node tree from a runtime model's nodes Map + nodesById.
 * Uses parent links on OdysseyObject3D when available; falls back to a flat list.
 */
export function buildReferenceSyncForest(
  nodesByName: Map<string, OdysseyObject3D>,
): IOdysseySyncNode[] {
  const syncByName = new Map<string, IOdysseySyncNode>();
  const roots: IOdysseySyncNode[] = [];

  nodesByName.forEach((obj, name) => {
    const nn = obj.odysseyModelNode?.nodeNumber;
    if(typeof nn !== 'number'){
      return;
    }
    syncByName.set(name.toLowerCase(), {
      name: name.toLowerCase(),
      nodeNumber: nn,
      children: [],
    });
  });

  syncByName.forEach((syncNode, name) => {
    const obj = nodesByName.get(name);
    const parent = obj?.parent as OdysseyObject3D | undefined;
    const parentName = parent?.name?.toLowerCase();
    const parentSync = parentName ? syncByName.get(parentName) : undefined;
    if(parentSync && parentSync !== syncNode){
      parentSync.children!.push(syncNode);
    }else{
      roots.push(syncNode);
    }
  });

  return roots;
}

/**
 * Clone anim nodes (so supermodel cache is not mutated) and remap nodeNumber
 * onto the geometry model's id space by name — retail SynchronizeNodes direction
 * for LoadAddInAnimations / supermodel anim merge.
 */
export function synchronizeAnimationToModel(
  anim: IOdysseyAnimForSync,
  nodesByName: Map<string, OdysseyObject3D>,
  nodesById: (OdysseyObject3D | undefined)[],
): void {
  if(!anim?.nodes?.length){
    return;
  }

  type AnimNode = IOdysseySyncNode & { children?: AnimNode[] };
  const clones: AnimNode[] = new Array(anim.nodes.length);
  const cloneOf = new Map<AnimNode, AnimNode>();
  for(let i = 0; i < anim.nodes.length; i++){
    const src = anim.nodes[i] as AnimNode;
    const clone = Object.assign(
      Object.create(Object.getPrototypeOf(src)),
      src,
    ) as AnimNode;
    clone.children = [];
    clones[i] = clone;
    cloneOf.set(src, clone);
  }
  for(let i = 0; i < anim.nodes.length; i++){
    const src = anim.nodes[i] as AnimNode;
    const clone = clones[i];
    if(src.children?.length){
      clone.children = src.children.map(
        (c) => cloneOf.get(c) || c,
      );
    }
  }
  anim.nodes = clones;
  if(anim.rootNode && cloneOf.has(anim.rootNode as AnimNode)){
    anim.rootNode = cloneOf.get(anim.rootNode as AnimNode)!;
  }

  const nextId = { value: getMaxNodeIdFromMap(nodesById, nodesByName) + 1 };
  const refRoots = buildReferenceSyncForest(nodesByName);

  if(anim.rootNode){
    const refRoot =
      refRoots.find(
        (r) => r.name === (anim.rootNode!.name || '').toLowerCase(),
      ) ||
      refRoots.find((r) => {
        const geo = nodesByName.get(r.name);
        return geo?.odysseyModelNode?.nodeNumber === 0;
      }) ||
      refRoots[0];

    if(refRoot && (anim.rootNode.name || '').toLowerCase() !== refRoot.name){
      anim.rootNode.nodeNumber = refRoot.nodeNumber;
      const targetChildren = anim.rootNode.children || [];
      const refChildren = refRoot.children || [];
      for(let i = 0; i < targetChildren.length; i++){
        const child = targetChildren[i];
        if(!child) continue;
        const childName = (child.name || '').toLowerCase();
        let matched: IOdysseySyncNode | undefined;
        for(let j = 0; j < refChildren.length; j++){
          if((refChildren[j].name || '').toLowerCase() === childName){
            matched = refChildren[j];
            break;
          }
        }
        if(!matched){
          matched = findSyncNodeByName(refRoots, childName);
        }
        synchronizeNodeIds(child, matched, nextId);
      }
    }else{
      synchronizeNodeIds(anim.rootNode, refRoot, nextId);
    }
  }

  for(let i = 0; i < anim.nodes.length; i++){
    const node = anim.nodes[i];
    const geo = nodesByName.get((node.name || '').toLowerCase());
    if(geo?.odysseyModelNode && typeof geo.odysseyModelNode.nodeNumber === 'number'){
      node.nodeNumber = geo.odysseyModelNode.nodeNumber;
    }
  }
}

function findSyncNodeByName(
  roots: IOdysseySyncNode[],
  name: string,
): IOdysseySyncNode | undefined {
  const stack = roots.slice();
  while(stack.length){
    const n = stack.pop()!;
    if((n.name || '').toLowerCase() === name){
      return n;
    }
    if(n.children?.length){
      for(let i = 0; i < n.children.length; i++){
        stack.push(n.children[i]);
      }
    }
  }
  return undefined;
}
