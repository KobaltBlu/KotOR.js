import * as THREE from "three";

import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

const DEFAULT_OFFSET_Z = 0.01;
const TRIGGER_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xFF0000,
  side: THREE.DoubleSide
});

export class ForgeTrigger extends ForgeGameObject {
  vertices: THREE.Vector3[] = [
    new THREE.Vector3(-0.5, -0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(0.5, -0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(0.5, 0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(-0.5, 0.5, DEFAULT_OFFSET_Z)
  ];

  //GIT Instance Properties
  templateResType: number = KotOR.ResourceTypes.utt;

  //Blueprint Properties
  autoRemoveKey: boolean = false;
  comment: string = '';
  cursor: number = 0;
  disarmDC: number = 0;
  faction: number = 0;
  highlightHeight: number = 0;
  keyName: string = '';
  loadScreenID: number = 0;
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  onClick: string = '';
  onDisarm: string = '';
  onTrapTriggered: string = '';
  onHeartbeat: string = '';
  onUserDefined: string = '';
  onEnter: string = '';
  onExit: string = '';
  paletteID: number = 0;
  portraitId: number = 0;
  tag: string = '';
  trapDetectDC: number = 0;
  trapDetectable: boolean = false;
  trapDisarmable: boolean = false;
  trapFlag: boolean = false;
  trapOneShot: boolean = false;
  trapType: number = 0;
  t_type: number = 0;

  bufferGeometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;

  // Vertex manipulation helpers
  vertexHelperGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1);
  vertexHelpersGroup: THREE.Group = new THREE.Group();
  vertexHelpers: THREE.Mesh[] = [];
  vertexHelperSize: number = 0.125;
  selectedVertexIndex: number = -1;

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    const onPropChange: EventListenerCallback = (...args: unknown[]) => {
      this.onPropertyChange(
        args[0] as string,
        args[1] as string | number | boolean | object | undefined,
        args[2] as string | number | boolean | object | undefined
      );
    };
    this.addEventListener('onPropertyChange', onPropChange);
  }

  onPropertyChange(property: string, newValue: string | number | boolean | object | undefined, oldValue: string | number | boolean | object | undefined): void {
    if(property === 'templateResRef'){
      if(newValue !== oldValue){
        this.loadBlueprint().then(() => {
          this.load();
        });
      }
    }
  }

  loadFromBuffer(buffer: Uint8Array){
    this.blueprint = new KotOR.GFFObject(buffer);
    this.loadFromBlueprint();
  }

  loadFromBlueprint(){
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('AutoRemoveKey')){
      this.autoRemoveKey = root.getBooleanByLabel('AutoRemoveKey');
    }
    if(root.hasField('Comment')){
      this.comment = root.getStringByLabel('Comment');
    }
    if(root.hasField('Cursor')){
      this.cursor = root.getNumberByLabel('Cursor');
    }
    if(root.hasField('DisarmDC')){
      this.disarmDC = root.getNumberByLabel('DisarmDC');
    }
    if(root.hasField('Faction')){
      this.faction = root.getNumberByLabel('Faction');
    }
    if(root.hasField('HighlightHeight')){
      this.highlightHeight = root.getNumberByLabel('HighlightHeight');
    }
    if(root.hasField('KeyName')){
      this.keyName = root.getStringByLabel('KeyName');
    }
    if(root.hasField('LoadScreenID')){
      this.loadScreenID = root.getNumberByLabel('LoadScreenID');
    }
    if(root.hasField('LocalizedName')){
      this.localizedName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('OnClick')){
      this.onClick = root.getStringByLabel('OnClick');
    }
    if(root.hasField('OnDisarm')){
      this.onDisarm = root.getStringByLabel('OnDisarm');
    }
    if(root.hasField('OnTrapTriggered')){
      this.onTrapTriggered = root.getStringByLabel('OnTrapTriggered');
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getNumberByLabel('PaletteID');
    }
    if(root.hasField('PortraitId')){
      this.portraitId = root.getNumberByLabel('PortraitId');
    }
    if(root.hasField('ScriptOnHeartbeat')){
      this.onHeartbeat = root.getStringByLabel('ScriptOnHeartbeat');
    }
    if(root.hasField('ScriptOnEnter')){
      this.onEnter = root.getStringByLabel('ScriptOnEnter');
    }
    if(root.hasField('ScriptOnExit')){
      this.onExit = root.getStringByLabel('ScriptOnExit');
    }
    if(root.hasField('ScriptOnUserDefine')){
      this.onUserDefined = root.getStringByLabel('ScriptOnUserDefine');
    }
    if(root.hasField('Tag')){
      this.tag = root.getStringByLabel('Tag');
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getStringByLabel('TemplateResRef');
    }
    if(root.hasField('TrapDetectDC')){
      this.trapDetectDC = root.getNumberByLabel('TrapDetectDC');
    }
    if(root.hasField('TrapDetectable')){
      this.trapDetectable = root.getBooleanByLabel('TrapDetectable');
    }
    if(root.hasField('TrapDisarmable')){
      this.trapDisarmable = root.getBooleanByLabel('TrapDisarmable');
    }
    if(root.hasField('TrapFlag')){
      this.trapFlag = root.getBooleanByLabel('TrapFlag');
    }
    if(root.hasField('TrapOneShot')){
      this.trapOneShot = root.getBooleanByLabel('TrapOneShot');
    }
    if(root.hasField('TrapType')){
      this.trapType = root.getNumberByLabel('TrapType');
    }
    if(root.hasField('Type')){
      this.t_type = root.getNumberByLabel('Type');
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTT ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AutoRemoveKey', this.autoRemoveKey ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Cursor', this.cursor & 0xFF) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DisarmDC', this.disarmDC & 0xFF) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.faction) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'HighlightHeight', this.highlightHeight) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'KeyName', this.keyName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClick', this.onClick) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDisarm', this.onDisarm) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnTrapTriggered', this.onTrapTriggered) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnHeartbeat', this.onHeartbeat) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnEnter', this.onEnter) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnExit', this.onExit) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnUserDefine', this.onUserDefined) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'TrapDetectDC', this.trapDetectDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectable', this.trapDetectable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDisarmable', this.trapDisarmable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapFlag', this.trapFlag ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapOneShot', this.trapOneShot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapType', this.trapType) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Type', this.t_type) );

    return this.blueprint;
  }

  buildGeometry(){
    if(!this.bufferGeometry){
      this.bufferGeometry = new THREE.BufferGeometry();
    }
    const vertices = this.vertices.slice();
    const holes: THREE.Vector2[][] = [];
    const triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );
    this.bufferGeometry.setIndex(triangles.flat());
    this.bufferGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.map( (v: THREE.Vector3) => v.toArray() ).flat(), 3 ) );
    this.bufferGeometry.computeVertexNormals();
    this.bufferGeometry.computeBoundingSphere();
  }

  async load(){
    this.buildGeometry();
    if(!this.mesh){
      this.mesh = new THREE.Mesh(this.bufferGeometry, TRIGGER_MATERIAL);
      this.container.add(this.mesh);
    }
    this.mesh.geometry = this.bufferGeometry;

    // Initialize vertex helpers group
    this.vertexHelpersGroup.visible = false;
    if(!this.container.children.includes(this.vertexHelpersGroup)){
      this.container.add(this.vertexHelpersGroup);
    }
  }

  buildVertexHelpers(){
    // Clear existing helpers
    while(this.vertexHelpers.length > 0){
      const helper = this.vertexHelpers.pop();
      if(helper){
        helper.removeFromParent();
        helper.geometry.dispose();
        (helper.material as THREE.Material).dispose();
      }
    }

    // Create helpers for each vertex
    for(let i = 0; i < this.vertices.length; i++){
      const vertex = this.vertices[i];
      const helper = new THREE.Mesh(
        this.vertexHelperGeometry,
        new THREE.MeshBasicMaterial({color: 0x000000})
      );

      helper.position.copy(vertex);
      helper.scale.setScalar(this.vertexHelperSize);

      helper.userData.vertexIndex = i;
      helper.userData.forgeGameObject = this;

      this.vertexHelpersGroup.add(helper);
      this.vertexHelpers.push(helper);
    }
  }

  showVertexHelpers(show: boolean = true){
    this.vertexHelpersGroup.visible = show;
    if(show && this.vertexHelpers.length === 0){
      this.buildVertexHelpers();
    }
  }

  selectVertex(index: number = -1){
    this.selectedVertexIndex = index;
    // Update vertex helper colors
    for(let i = 0; i < this.vertexHelpers.length; i++){
      const helper = this.vertexHelpers[i];
      const material = helper.material as THREE.MeshBasicMaterial;
      if(i === index){
        material.color.setHex(0xFFFFFF);
      } else {
        material.color.setHex(0x000000);
      }
    }
  }

  updateVertexFromHelper(vertexIndex: number, helper: THREE.Mesh){
    if(vertexIndex >= 0 && vertexIndex < this.vertices.length){
      const vertex = this.vertices[vertexIndex];
      const localPos = helper.position.clone();

      // Update vertex position if it changed
      if(!vertex.equals(localPos)){
        vertex.copy(localPos);
        // Rebuild geometry with new vertex positions
        this.buildGeometry();
        if(this.mesh){
          this.mesh.geometry = this.bufferGeometry;
        }
      }
    }
  }

  update(_delta: number = 0){
    // Update vertex positions from helpers
    if(this.vertexHelpers.length > 0 && this.vertices.length === this.vertexHelpers.length){
      let geometryNeedsUpdate = false;

      for(let i = 0; i < this.vertices.length; i++){
        const vertex = this.vertices[i];
        const helper = this.vertexHelpers[i];

        if(vertex && helper){
          const localPos = helper.position.clone();

          // Update vertex position if it changed
          if(!vertex.equals(localPos)){
            vertex.copy(localPos);
            geometryNeedsUpdate = true;
          }
        }
      }

      // Rebuild geometry if any vertices changed
      if(geometryNeedsUpdate){
        this.buildGeometry();
        if(this.mesh){
          this.mesh.geometry = this.bufferGeometry;
        }
      }
    }
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(1);
    const geometryField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Geometry'));
    for(let i = 0, len = this.vertices.length; i < len; i++){
      const geometryStruct = new KotOR.GFFStruct(3);
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', this.vertices[i].x));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', this.vertices[i].y));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', this.vertices[i].z));
      geometryField?.addChildStruct(geometryStruct);
    }
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.vertices = [];
    const geometryField = strt.getFieldByLabel('Geometry');
    if(geometryField){
      for(let i = 0, len = geometryField.getChildStructs().length; i < len; i++){
        const geometryStruct = geometryField.getChildStructs()[i];
        this.vertices.push(
          new THREE.Vector3(
            geometryStruct.getNumberByLabel('PointX'),
            geometryStruct.getNumberByLabel('PointY'),
            geometryStruct.getNumberByLabel('PointZ')
          )
        );
      }
    }
    this.templateResRef = strt.getStringByLabel('TemplateResRef');
    this.rotation.z = strt.getNumberByLabel('XOrientation');
    this.position.x = strt.getNumberByLabel('XPosition');
    this.rotation.z = strt.getNumberByLabel('YOrientation');
    this.position.y = strt.getNumberByLabel('YPosition');
    this.rotation.z = strt.getNumberByLabel('ZOrientation');
    this.position.z = strt.getNumberByLabel('ZPosition');
  }

}
