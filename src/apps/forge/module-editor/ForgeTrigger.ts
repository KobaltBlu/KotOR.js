import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";
import * as THREE from "three";

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
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.utt;

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

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
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
      this.autoRemoveKey = root.getFieldByLabel('AutoRemoveKey').getValue() || false;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('Cursor')){
      this.cursor = root.getFieldByLabel('Cursor').getValue() || 0;
    }
    if(root.hasField('DisarmDC')){
      this.disarmDC = root.getFieldByLabel('DisarmDC').getValue() || 0;
    }
    if(root.hasField('Faction')){
      this.faction = root.getFieldByLabel('Faction').getValue() || 0;
    }
    if(root.hasField('HighlightHeight')){
      this.highlightHeight = root.getFieldByLabel('HighlightHeight').getValue() || 0;
    }
    if(root.hasField('KeyName')){
      this.keyName = root.getFieldByLabel('KeyName').getValue() || '';
    }
    if(root.hasField('LoadScreenID')){
      this.loadScreenID = root.getFieldByLabel('LoadScreenID').getValue() || 0;
    }
    if(root.hasField('LocalizedName')){
      this.localizedName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('OnClick')){
      this.onClick = root.getFieldByLabel('OnClick').getValue() || '';
    }
    if(root.hasField('OnDisarm')){
      this.onDisarm = root.getFieldByLabel('OnDisarm').getValue() || '';
    }
    if(root.hasField('OnTrapTriggered')){
      this.onTrapTriggered = root.getFieldByLabel('OnTrapTriggered').getValue() || '';
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('PortraitId')){
      this.portraitId = root.getFieldByLabel('PortraitId').getValue() || 0;
    }
    if(root.hasField('ScriptOnHeartbeat')){
      this.onHeartbeat = root.getFieldByLabel('ScriptOnHeartbeat').getValue() || '';
    }
    if(root.hasField('ScriptOnEnter')){
      this.onEnter = root.getFieldByLabel('ScriptOnEnter').getValue() || '';
    }
    if(root.hasField('ScriptOnExit')){
      this.onExit = root.getFieldByLabel('ScriptOnExit').getValue() || '';
    }
    if(root.hasField('ScriptOnUserDefine')){
      this.onUserDefined = root.getFieldByLabel('ScriptOnUserDefine').getValue() || '';
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
    if(root.hasField('TrapDetectDC')){
      this.trapDetectDC = root.getFieldByLabel('TrapDetectDC').getValue() || 0;
    }
    if(root.hasField('TrapDetectable')){
      this.trapDetectable = root.getFieldByLabel('TrapDetectable').getValue() || false;
    }
    if(root.hasField('TrapDisarmable')){
      this.trapDisarmable = root.getFieldByLabel('TrapDisarmable').getValue() || false;
    }
    if(root.hasField('TrapFlag')){
      this.trapFlag = root.getFieldByLabel('TrapFlag').getValue() || false;
    }
    if(root.hasField('TrapOneShot')){
      this.trapOneShot = root.getFieldByLabel('TrapOneShot').getValue() || false;
    }
    if(root.hasField('TrapType')){
      this.trapType = root.getFieldByLabel('TrapType').getValue() || 0;
    }
    if(root.hasField('Type')){
      this.t_type = root.getFieldByLabel('Type').getValue() || 0;
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
            geometryStruct.getFieldByLabel('PointX').getValue() as number, 
            geometryStruct.getFieldByLabel('PointY').getValue() as number, 
            geometryStruct.getFieldByLabel('PointZ').getValue() as number
          )
        );
      }
    }
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('ZOrientation').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}