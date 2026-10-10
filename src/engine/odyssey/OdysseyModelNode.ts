import * as THREE from "three";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModel } from "@engine/odyssey/OdysseyModel";
import { type OdysseyController } from "@engine/odyssey/controllers/OdysseyController";
import { IOdysseyArrayDefinition } from "@core/interface/odyssey/IOdysseyArrayDefinition";
import { OdysseyModelUtility } from "@engine/odyssey/OdysseyModelUtility";
import { OdysseyModelControllerDecoder } from "@engine/odyssey/binary/OdysseyModelControllerDecoder";

/**
 * OdysseyModelNode class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelNode {
  /** Deterministic for binary ingest (`nodeNumber`/`nameIndex`); random for editor/ASCII when needed. */
  private _uuid: string = '';
  parent: OdysseyModelNode;
  type: OdysseyModelNodeType;
  nodeType: OdysseyModelNodeType;
  odysseyModel: OdysseyModel;
  children: OdysseyModelNode[] = [];
  childOffsets: Uint32Array;
  controllers: Map<OdysseyModelControllerType, OdysseyController> = new Map();

  roomStatic: boolean = true;
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  quaternion: THREE.Quaternion = new THREE.Quaternion(0, 0, 0, 1);
  nodeNumber: number;
  nameIndex: number;
  nodePosition: number;
  name: string;
  padding: number;
  offsetToRoot: number;
  offsetToParent: number;
  childArrayDefinition: IOdysseyArrayDefinition;
  controllerArrayDefinition: IOdysseyArrayDefinition;
  controllerDataArrayDefinition: IOdysseyArrayDefinition;
  isRootNode: boolean = false;
  /** True on {@link OdysseyModelAnimationNode}; avoids circular `instanceof` in the controller decoder. */
  isAnimationControllerNode: boolean = false;
  /**
   * Denotes a child node of the animation dummy group for room models.
   * like: MODELNAMEa or m02ac_02ba
   * Room models in KotOR I & II merge static geometry into a single geometry for performance reasons.
   * Nodes that are part of the animation group are not merged as part of the static geometry
   * This allows them to be animated independently of the static geometry.
   */
  isAnimDummyNode: boolean = false;

  constructor(parent: OdysseyModelNode){
    this.parent = parent;
    this.type = OdysseyModelNodeType.Header;
  }

  get uuid(): string {
    if (!this._uuid) {
      this._uuid = this.createUuid();
    }
    return this._uuid;
  }

  set uuid(value: string) {
    this._uuid = value || '';
  }

  /** Assign a UUID when editor/ASCII paths need one before binary ids exist. */
  ensureUuid(): string {
    return this.uuid;
  }

  private createUuid(): string {
    if (typeof this.nodeNumber === 'number' && this.nodeNumber >= 0) {
      const nameIdx = typeof this.nameIndex === 'number' ? this.nameIndex : 0;
      return `odyssey-node:${this.nodeNumber}:${nameIdx}`;
    }
    return crypto.randomUUID();
  }

  /** Bind deterministic id from binary header fields (avoids crypto during parse). */
  bindBinaryUuid(): void {
    if (typeof this.nodeNumber === 'number' && this.nodeNumber >= 0) {
      const nameIdx = typeof this.nameIndex === 'number' ? this.nameIndex : 0;
      this._uuid = `odyssey-node:${this.nodeNumber}:${nameIdx}`;
    }
  }

  setParent(parent: OdysseyModelNode){
    this.parent = parent;
  }

  setType(type: OdysseyModelNodeType){
    this.nodeType = type;
    this.type = type;
  }

  add(node: OdysseyModelNode){
    this.children.push(node);
  }

  addController(controller: OdysseyController){

  }

  getControllerByType(type = -1){
    return this.controllers.get(type);
  }

  readBinary(odysseyModel: OdysseyModel){
    this.odysseyModel = odysseyModel;

    this.nodeType = this.odysseyModel.mdlReader.readUInt16();  

    this.nodeNumber = this.odysseyModel.mdlReader.readUInt16();
    this.nameIndex = this.odysseyModel.mdlReader.readUInt16();
    this.padding = this.odysseyModel.mdlReader.readUInt16();
    this.offsetToRoot = this.odysseyModel.mdlReader.readUInt32();
    this.offsetToParent = this.odysseyModel.mdlReader.readUInt32();

    this.bindBinaryUuid();

    if (this.nameIndex < this.odysseyModel.names.length){
      this.name = this.odysseyModel.names[this.nameIndex].replace(/\0[\s\S]*$/g,'').toLowerCase();
    }else{
      this.name = '';
    }

    //Non static objects in room meshes are children of the node that is the name of the model plus a
    //like: MODELNAMEa or m02ac_02ba
    this.isAnimDummyNode = (this.parent) ? (this.parent.isRootNode && this.name.toLowerCase() === this.odysseyModel.getAnimationDummyNodeName()) || this.parent.isAnimDummyNode : false;

    if(!this.odysseyModel.nodes.has(this.name))
      this.odysseyModel.nodes.set(this.name, this);

    //Node Position
    this.position.x = this.odysseyModel.mdlReader.readSingle();
    this.position.y = this.odysseyModel.mdlReader.readSingle();
    this.position.z = this.odysseyModel.mdlReader.readSingle();

    //Node Quaternion
    this.quaternion.w = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.x = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.y = this.odysseyModel.mdlReader.readSingle();
    this.quaternion.z = this.odysseyModel.mdlReader.readSingle();

    //Node Children
    this.childArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.childOffsets = OdysseyModelUtility.ReadArrayUInt32s(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.childArrayDefinition.offset, this.childArrayDefinition.count);

    //Node Controllers
    this.controllerArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    this.controllerDataArrayDefinition = OdysseyModelUtility.ReadArrayDefinition(this.odysseyModel.mdlReader);
    const controllerData = OdysseyModelUtility.ReadArrayFloats(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.controllerDataArrayDefinition.offset, this.controllerDataArrayDefinition.count);
    const controllerData2 = OdysseyModelUtility.ReadArrayUInt32s(this.odysseyModel.mdlReader, this.odysseyModel.fileHeader.modelDataOffset + this.controllerDataArrayDefinition.offset, this.controllerDataArrayDefinition.count);

    this.controllers = OdysseyModelControllerDecoder.readNodeControllers(
      this,
      this.odysseyModel,
      this.odysseyModel.fileHeader.modelDataOffset + this.controllerArrayDefinition.offset,
      this.controllerArrayDefinition.count,
      controllerData,
      controllerData2,
    );
  }

}
