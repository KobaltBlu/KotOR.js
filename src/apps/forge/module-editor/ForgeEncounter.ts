import * as THREE from "three";

import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import { CreatureListEntry } from "@/apps/forge/interfaces/CreatureListEntry";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

const DEFAULT_OFFSET_Z = 0.01;
const ENCOUNTER_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x4B0082,
  side: THREE.DoubleSide
});

export class ForgeEncounter extends ForgeGameObject {
  vertices: THREE.Vector3[] = [
    new THREE.Vector3(-0.5, -0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(0.5, -0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(0.5, 0.5, DEFAULT_OFFSET_Z),
    new THREE.Vector3(-0.5, 0.5, DEFAULT_OFFSET_Z)
  ];
  spawnPointList: KotOR.EncounterSpawnPointEntry[] = [];

  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.ute;

  //Blueprint Properties
  active: boolean = false;
  comment: string = '';
  creatureList: CreatureListEntry[] = [];
  difficulty: number = 0;
  difficultyIndex: number = 0;
  faction: number = 0;
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  maxCreatures: number = 0;
  onEntered: string = '';
  onExhausted: string = '';
  onExit: string = '';
  onHeartbeat: string = '';
  onUserDefined: string = '';
  paletteID: number = 0;
  playerOnly: boolean = false;
  recCreatures: number = 0;
  reset: boolean = false;
  resetTime: number = 0;
  respawns: number = 0;
  spawnOption: number = 0;
  tag: string = '';

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

    if(root.hasField('Active')){
      this.active = root.getFieldByLabel('Active').getValue() || false;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('CreatureList')){
      const creatureListField = root.getFieldByLabel('CreatureList');
      this.creatureList = creatureListField.getChildStructs().map( (struct) => {
        return {
          appearance: struct.getFieldByLabel('Appearance').getValue() || 0,
          resref: struct.getFieldByLabel('ResRef').getValue() || '',
          cr: struct.getFieldByLabel('CR').getValue() || 0,
          singleSpawn: !!struct.getFieldByLabel('SingleSpawn').getValue()
        } as CreatureListEntry;
      });
    }
    if(root.hasField('Difficulty')){
      this.difficulty = root.getFieldByLabel('Difficulty').getValue() || 0;
    }
    if(root.hasField('DifficultyIndex')){
      this.difficultyIndex = root.getFieldByLabel('DifficultyIndex').getValue() || 0;
    }
    if(root.hasField('Faction')){
      this.faction = root.getFieldByLabel('Faction').getValue() || 0;
    }
    if(root.hasField('LocalizedName')){
      this.localizedName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MaxCreatures')){
      this.maxCreatures = root.getFieldByLabel('MaxCreatures').getValue() || 0;
    }
    if(root.hasField('OnEntered')){
      this.onEntered = root.getFieldByLabel('OnEntered').getValue() || '';
    }
    if(root.hasField('OnExhausted')){
      this.onExhausted = root.getFieldByLabel('OnExhausted').getValue() || '';
    }
    if(root.hasField('OnExit')){
      this.onExit = root.getFieldByLabel('OnExit').getValue() || '';
    }
    if(root.hasField('OnHeartbeat')){
      this.onHeartbeat = root.getFieldByLabel('OnHeartbeat').getValue() || '';
    }
    if(root.hasField('OnUserDefined')){
      this.onUserDefined = root.getFieldByLabel('OnUserDefined').getValue() || '';
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('PlayerOnly')){
      this.playerOnly = root.getFieldByLabel('PlayerOnly').getValue() || false;
    }
    if(root.hasField('RecCreatures')){
      this.recCreatures = root.getFieldByLabel('RecCreatures').getValue() || 0;
    }
    if(root.hasField('Reset')){
      this.reset = root.getFieldByLabel('Reset').getValue() || false;
    }
    if(root.hasField('ResetTime')){
      this.resetTime = root.getFieldByLabel('ResetTime').getValue() || 0;
    }
    if(root.hasField('Respawns')){
      this.respawns = root.getFieldByLabel('Respawns').getValue() || 0;
    }
    if(root.hasField('SpawnOption')){
      this.spawnOption = root.getFieldByLabel('SpawnOption').getValue() || 0;
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTE ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Active', this.active ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );

    const creatureListField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'CreatureList') );
    for(let i = 0; i < this.creatureList.length; i++){
      if(!creatureListField) continue;
      const creature = this.creatureList[i];
      const creatureStruct = new KotOR.GFFStruct();
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Appearance', creature.appearance) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ResRef', creature.resref) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'CR', creature.cr) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SingleSpawn', creature.singleSpawn ? 1 : 0) );
      creatureListField.addChildStruct( creatureStruct );
    }

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Difficulty', this.difficulty) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'DifficultyIndex', this.difficultyIndex) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.faction) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'MaxCreatures', this.maxCreatures) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEntered', this.onEntered) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExhausted', this.onExhausted) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExit', this.onExit) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerOnly', this.playerOnly ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'RecCreatures', this.recCreatures) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Reset', this.reset ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'ResetTime', this.resetTime) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Respawns', this.respawns) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'SpawnOption', this.spawnOption) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );

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
      this.mesh = new THREE.Mesh(this.bufferGeometry, ENCOUNTER_MATERIAL);
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
    const instance = new KotOR.GFFStruct(7);
    const geometryField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Geometry'));
    for(let i = 0, len = this.vertices.length; i < len; i++){
      const geometryStruct = new KotOR.GFFStruct(3);
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', this.vertices[i].x));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', this.vertices[i].y));
      geometryStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', this.vertices[i].z));
      geometryField?.addChildStruct(geometryStruct);
    }
    const spawnPointListField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SpawnPointList'));
    for(let i = 0, len = this.spawnPointList.length; i < len; i++){
      const spawnPointStruct = new KotOR.GFFStruct(3);
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.spawnPointList[i].position.x));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.spawnPointList[i].position.y));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.spawnPointList[i].position.z));
      spawnPointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Orientation', this.spawnPointList[i].orientation));
      spawnPointListField?.addChildStruct(spawnPointStruct);
    }
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.vertices = [];
    const geometryField = strt.getFieldByLabel('Geometry');
    if(geometryField){
      for(let i = 0, len = geometryField.getChildStructs().length; i < len; i++){
        const geometryStruct = geometryField.getChildStructs()[i];
        this.vertices.push(new THREE.Vector3(geometryStruct.getFieldByLabel('PointX').getValue() as number, geometryStruct.getFieldByLabel('PointY').getValue() as number, geometryStruct.getFieldByLabel('PointZ').getValue() as number));
      }
    }
    this.spawnPointList = [];
    const spawnPointListField = strt.getFieldByLabel('SpawnPointList');
    if(spawnPointListField){
      for(let i = 0, len = spawnPointListField.getChildStructs().length; i < len; i++){
        const spawnPointStruct = spawnPointListField.getChildStructs()[i];
        const entry: KotOR.EncounterSpawnPointEntry = KotOR.EncounterSpawnPointEntry.FromStruct(spawnPointStruct)!;
        if(entry instanceof KotOR.EncounterSpawnPointEntry){
          this.spawnPointList.push(entry);
        }
      }
    }
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('ZOrientation').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}