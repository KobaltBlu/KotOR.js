import { BinaryReader } from "@core/binary/BinaryReader";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelNode } from "@engine/odyssey/OdysseyModelNode";
import { OdysseyModelNodeAABB } from "@engine/odyssey/OdysseyModelNodeAABB";
import { OdysseyModelNodeAnimMesh } from "@engine/odyssey/OdysseyModelNodeAnimMesh";
import { OdysseyModelNodeDangly } from "@engine/odyssey/OdysseyModelNodeDangly";
import { OdysseyModelNodeEmitter } from "@engine/odyssey/OdysseyModelNodeEmitter";
import { OdysseyModelNodeLight } from "@engine/odyssey/OdysseyModelNodeLight";
import { OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import { OdysseyModelNodeReference } from "@engine/odyssey/OdysseyModelNodeReference";
import { OdysseyModelNodeSaber } from "@engine/odyssey/OdysseyModelNodeSaber";
import { OdysseyModelNodeSkin } from "@engine/odyssey/OdysseyModelNodeSkin";

/**
 * OdysseyModelFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelFactory {
  static OdysseyModelNode: typeof OdysseyModelNode = OdysseyModelNode;
  static OdysseyModelNodeAABB: typeof OdysseyModelNodeAABB = OdysseyModelNodeAABB;
  static OdysseyModelNodeAnimMesh: typeof OdysseyModelNodeAnimMesh = OdysseyModelNodeAnimMesh;
  static OdysseyModelNodeDangly: typeof OdysseyModelNodeDangly = OdysseyModelNodeDangly;
  static OdysseyModelNodeEmitter: typeof OdysseyModelNodeEmitter = OdysseyModelNodeEmitter;
  static OdysseyModelNodeLight: typeof OdysseyModelNodeLight = OdysseyModelNodeLight;
  static OdysseyModelNodeMesh: typeof OdysseyModelNodeMesh = OdysseyModelNodeMesh;
  static OdysseyModelNodeReference: typeof OdysseyModelNodeReference = OdysseyModelNodeReference;
  static OdysseyModelNodeSkin: typeof OdysseyModelNodeSkin = OdysseyModelNodeSkin;
  static OdysseyModelNodeSaber: typeof OdysseyModelNodeSaber = OdysseyModelNodeSaber;

  public static ReadNode(parent: OdysseyModelNode, mdlReader: BinaryReader)
  {
    //Read the node type so we can know what type of node we are dealing with
    const NodeType = mdlReader.readUInt16();
    mdlReader.position -= 2;

    let node: OdysseyModelNode;

    if ((NodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
      node = new OdysseyModelNodeEmitter(parent);
    }else if ((NodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
      node = new OdysseyModelNodeLight(parent);
    }else if ((NodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
      node = new OdysseyModelNodeSkin(parent);
    }else if ((NodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly) {
      node = new OdysseyModelNodeDangly(parent);
    }else if ((NodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber) {
      node = new OdysseyModelNodeSaber(parent);
    }else if ((NodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
      node = new OdysseyModelNodeAABB(parent);
    }else if (
      (NodeType & OdysseyModelNodeType.Anim) == OdysseyModelNodeType.Anim &&
      (NodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh
    ) {
      node = new OdysseyModelNodeAnimMesh(parent);
    }else if ((NodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
      node = new OdysseyModelNodeMesh(parent);
    }else if ((NodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference) {
      node = new OdysseyModelNodeReference(parent);
    }else{
      node = new OdysseyModelNode(parent);
    }

    return node;
  }

}