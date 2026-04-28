import * as THREE from 'three';
import { MDLLoader } from '@/loaders';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { OdysseyModelNodeType } from '@/enums/odyssey/OdysseyModelNodeType';
import type { OdysseyModelNode } from '@/odyssey/OdysseyModelNode';
import { OdysseyModelNodeReference } from '@/odyssey/OdysseyModelNodeReference';
import type { OdysseyModelNodeAABB } from '@/odyssey/OdysseyModelNodeAABB';
import { OdysseyEmitter3D } from '@/three/odyssey/OdysseyEmitter3D';
import { OdysseyObject3D } from '@/three/odyssey/OdysseyObject3D';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import type { NodeParseContext } from '@/three/odyssey/OdysseyModel3DNodeParseContext';

/** Lowercase node names that map to engine hook fields on {@link OdysseyModel3D}. */
const NAMED_MODEL_HOOK_NAMES = new Set<string>([
  'talkdummy',
  'cutscenedummy',
  'rootdummy',
  'headhook',
  'camerahook',
  'camerahookm',
  'camerahookf',
  'freelookhook',
  'lookathook',
  'lightsaberhook',
  'deflecthook',
  'maskhook',
  'gogglehook',
  'rhand',
  'lhand',
  'impact',
  'impact_bolt',
  'headconjure',
  'handconjure',
  'trans',
  'bullethook0',
  'bullethook1',
  'bullethook2',
  'bullethook3',
  'gunhook0',
  'gunhook1',
  'gunhook2',
  'gunhook3',
  'modelhook',
  'hturn_g',
]);

function assignNamedModelHook(model: OdysseyModel3D, nodeName: string, node: OdysseyObject3D): void {
  if (!NAMED_MODEL_HOOK_NAMES.has(nodeName)) return;
  (model as unknown as Record<string, OdysseyObject3D | undefined>)[nodeName] = node;
}

function attachMeshIfNeeded(
  odysseyModel: OdysseyModel3D,
  node: OdysseyObject3D,
  odysseyNode: OdysseyModelNode,
  parseContext: NodeParseContext
): void {
  if ((odysseyNode.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh && odysseyNode) {
    parseContext.builders.NodeMeshBuilder(odysseyModel, node, odysseyNode as any, parseContext.options);
  }
}

function attachLightIfNeeded(
  odysseyModel: OdysseyModel3D,
  node: OdysseyObject3D,
  odysseyNode: OdysseyModelNode,
  parseContext: NodeParseContext
): void {
  if ((odysseyNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light && odysseyNode) {
    node.light = parseContext.builders.NodeLightBuilder(odysseyModel, node, odysseyNode as any, parseContext.options);
  }
}

function attachEmitterIfNeeded(
  odysseyModel: OdysseyModel3D,
  node: OdysseyObject3D,
  odysseyNode: OdysseyModelNode
): void {
  if ((odysseyNode.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter && odysseyNode) {
    node.emitter = new OdysseyEmitter3D(odysseyNode);
    node.emitter.context = odysseyModel.context;
    node.emitter.name = odysseyNode.name + '_em';
    node.add(node.emitter);
    odysseyModel.emitters.push(node.emitter);
  }
}

/**
 * Reference child models load asynchronously; the placeholder node is parented first, then
 * {@link OdysseyModel3D.FromMDL} resolves and attaches the child graph (same as legacy behavior).
 */
function attachReferenceIfNeeded(
  odysseyModel: OdysseyModel3D,
  parentNode: THREE.Object3D,
  node: OdysseyObject3D,
  odysseyNode: OdysseyModelNode,
  parseContext: NodeParseContext
): void {
  if ((odysseyNode.nodeType & OdysseyModelNodeType.Reference) != OdysseyModelNodeType.Reference || !odysseyNode) {
    return;
  }
  if (parentNode instanceof OdysseyObject3D && parentNode.emitter instanceof OdysseyEmitter3D) {
    parentNode.emitter.setReferenceNode(node);
    return;
  }
  const ref = odysseyNode as OdysseyModelNodeReference;
  console.log('Loading child model: ' + ref.modelName);
  MDLLoader.loader
    .load(ref.modelName)
    .then((childModel) => {
      if (childModel) {
        parseContext.builders
          .FromMDL(childModel, {
            context: odysseyModel.options.context,
            editorMode: odysseyModel.options.editorMode,
          })
          .then((childModel3D) => {
            if (childModel3D) {
              node.add(childModel3D);
              odysseyModel.childModels.push(childModel3D);
            }
          })
          .catch((e: unknown) => {
            console.error(e);
          });
      }
    })
    .catch((e: unknown) => {
      console.error(e);
    });
}

/**
 * Walks one Odyssey model node: builds {@link OdysseyObject3D}, mesh/light/emitter/reference
 * attachments, engine hook registration, then recurses children when {@link NodeParseContext.options.parseChildren} is set.
 *
 * Order matches legacy {@link OdysseyModel3D.NodeParser}: mesh → light → emitter → reference → hooks → matrixInverse → children.
 */
export function parseOdysseyNode(
  odysseyModel: OdysseyModel3D,
  parentNode: THREE.Object3D,
  odysseyNode: OdysseyModelNode,
  parseContext: NodeParseContext
): OdysseyObject3D {
  const node = new OdysseyObject3D(odysseyNode);
  node.sourceNodeUUID = odysseyNode.uuid;
  node.NodeType = odysseyNode.nodeType;

  if ((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
    odysseyModel.aabb = odysseyNode as OdysseyModelNodeAABB;
  }

  node.controllers = odysseyNode.controllers;

  if (odysseyNode.controllers.has(OdysseyModelControllerType.Orientation)) {
    node.controllerHelpers.hasOrientation = true;
    node.controllerHelpers.orientation = odysseyNode.controllers.get(OdysseyModelControllerType.Orientation);
  }

  if (odysseyNode.controllers.has(OdysseyModelControllerType.Position)) {
    node.controllerHelpers.hasPosition = true;
    node.controllerHelpers.position = odysseyNode.controllers.get(OdysseyModelControllerType.Position);
  }

  if (odysseyNode.controllers.has(OdysseyModelControllerType.Scale)) {
    node.controllerHelpers.hasScale = true;
    node.controllerHelpers.scale = odysseyNode.controllers.get(OdysseyModelControllerType.Scale);
  }

  node.position.set(odysseyNode.position.x, odysseyNode.position.y, odysseyNode.position.z);
  node.quaternion.set(
    odysseyNode.quaternion.x,
    odysseyNode.quaternion.y,
    odysseyNode.quaternion.z,
    odysseyNode.quaternion.w
  );

  node.name = odysseyNode.name.toLowerCase();

  if (node.name == odysseyModel.name.toLowerCase() + 'a') {
    parseContext.flags.isChildrenDynamic = true;
  }

  if (!odysseyModel.nodes.has(node.name)) odysseyModel.nodes.set(node.name, node);
  odysseyModel.nodesByUUID.set(odysseyNode.uuid, node);

  parentNode.add(node);

  attachMeshIfNeeded(odysseyModel, node, odysseyNode, parseContext);
  attachLightIfNeeded(odysseyModel, node, odysseyNode, parseContext);
  attachEmitterIfNeeded(odysseyModel, node, odysseyNode);
  attachReferenceIfNeeded(odysseyModel, parentNode, node, odysseyNode, parseContext);

  assignNamedModelHook(odysseyModel, node.name, node);

  node.matrixInverse = new THREE.Matrix4();
  node.matrixInverse.copy(node.matrix).invert();

  if (parseContext.options.parseChildren) {
    for (let i = 0; i < odysseyNode.children.length; i++) {
      parseOdysseyNode(odysseyModel, node, odysseyNode.children[i], parseContext);
    }
  }

  return node;
}
