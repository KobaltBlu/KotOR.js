import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTDEditor } from "../../components/tabs/tab-utd-editor/TabUTDEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import { UI3DRendererView } from "../../components/UI3DRendererView";
import { ModuleCreatureAnimState } from "../../../../enums/module/ModuleCreatureAnimState";

export class TabUTDEditorState extends TabState {
  tabName: string = `UTD`;
  blueprint: KotOR.GFFObject;

  ui3DRenderer: UI3DRenderer;

  animationState: number = 0;
  appearance: number = 0;
  autoRemoveKey: boolean = false;
  closeLockDC: number = 0;
  comment: string = '';
  conversation: string = '';
  currentHP: number = 0;
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  disarmDC: number = 0;
  factionId: number = 0;
  fort: number = 0;
  genericType: number = 0;
  hp: number = 0;
  hardness: number = 0;
  interruptable: boolean = false;
  keyName: string = '';
  keyRequired: boolean = false;
  loadScreenID: number = 0;
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  lockable: boolean = false;
  locked: boolean = false;
  min1HP: boolean = false;
  onClick: string = '';
  onClosed: string = '';
  onDamaged: string = '';
  onDeath: string = '';
  onDisarm: string = '';
  onFailToOpen: string = '';
  onHeartbeat: string = '';
  onLock: string = '';
  onMeleeAttacked: string = '';
  onOpen: string = '';
  onSpellCastAt: string = '';
  onTrapTriggered: string = '';
  onUnlock: string = '';
  onUserDefined: string = '';
  openLockDC: number = 0;
  openState: number = 0;
  paletteID: number = 0;
  plot: boolean = false;
  portraitId: number = 0;
  ref: number = 0;
  static: boolean = false;
  tag: string = '';
  templateResRef: string = '';
  trapDetectDC: number = 0;
  trapDetectable: boolean = false;
  trapDisarmable: boolean = false;
  trapFlag: boolean = false;
  trapOneShot: boolean = false;
  trapType: number = 0;
  will: number = 0;

  model: KotOR.OdysseyModel3D;
  modelLoading: boolean = false;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));

    this.setContentView(<TabUTDEditor tab={this}></TabUTDEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Door File',
        accept: {
          'application/octet-stream': ['.utd']
        }
      }
    ];
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: keyof TabUTDEditorState, newValue: any, oldValue: any){
    let modelNeedsUpdate = false;
    if(property === 'genericType'){
      this.loadAppearance();
      modelNeedsUpdate = true;
    }
    if(modelNeedsUpdate){
      this.loadModel();
    }
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.blueprint = new KotOR.GFFObject(response.buffer);
          this.setPropsFromBlueprint();
          this.processEventListener('onEditorFileLoad', [this]);
          this.loadAppearance();
          this.loadModel();
          resolve(this.blueprint);
        });
      }
    });
  }

  disposeModel(){
    if(!this.model) return;
    this.model.removeFromParent();
    try{ this.model.dispose(); }catch(e){}
  }

  kDoorAppearance: any = {};
  kDoorAppearances: any[] = [];

  loadAppearance(){
    if(!this.kDoorAppearance){
      this.kDoorAppearance = {};
    }
    const twodaObject = KotOR.TwoDAManager.datatables.get('genericdoors');
    if(!twodaObject) return;
    this.kDoorAppearances = Object.values(twodaObject.rows);
    return this.kDoorAppearance = twodaObject.getRowByIndex(this.genericType || 0);
  }

  async loadModel(){
    if(!this.blueprint) return;
    this.disposeModel();

    const modelName = this.stringCleaner(this.kDoorAppearance?.modelname) || 'plc_invis';
    try{
      this.modelLoading = true;
      this.processEventListener('onModelChange', [this]);
      const mdl = await KotOR.MDLLoader.loader.load(modelName);
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.ui3DRenderer,
        lighting: true
      });
      this.model = model;
      this.ui3DRenderer.scene.add(this.model);
      this.updateCameraFocus();
    }
    catch(e){
      console.error(e);
    }
    this.modelLoading = false;
    this.processEventListener('onModelChange', [this]);
  }

  stringCleaner(str: string = ''){
    return str.replace(/\0[\s\S]*$/g,'').toLowerCase();
  }

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3();
  size: THREE.Vector3 = new THREE.Vector3();
  origin: THREE.Vector3 = new THREE.Vector3();

  updateCameraFocus(){
    if(!this.model) return;

    this.model.position.set(0, 0, 0);
    this.box3.setFromObject(this.model);
    this.box3.getCenter(this.center);
    this.box3.getSize(this.size);

    //Center the object to 0
    this.model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = this.size.x + this.size.y;
    this.ui3DRenderer.camera.lookAt(this.origin)
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;

    this.updateCameraFocus();

    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
  }

  animate(delta: number = 0){
    if(this.model){
      this.model.update(delta);
      //rotate the object in the viewport
      this.model.rotation.z += delta;
    }
  }

  setPropsFromBlueprint(){
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('AnimationState')){
      this.animationState = root.getFieldByLabel('AnimationState').getValue() || 0;
    }
    if(root.hasField('Appearance')){
      this.appearance = root.getFieldByLabel('Appearance').getValue() || 0;
    }
    if(root.hasField('AutoRemoveKey')){
      this.autoRemoveKey = root.getFieldByLabel('AutoRemoveKey').getValue() || false;
    }
    if(root.hasField('CloseLockDC')){
      this.closeLockDC = root.getFieldByLabel('CloseLockDC').getValue() || 0;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('Conversation')){
      this.conversation = root.getFieldByLabel('Conversation').getValue() || '';
    }
    if(root.hasField('CurrentHP')){
      this.currentHP = root.getFieldByLabel('CurrentHP').getValue() || 0;
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('DisarmDC')){
      this.disarmDC = root.getFieldByLabel('DisarmDC').getValue() || 0;
    }
    if(root.hasField('Faction')){
      this.factionId = root.getFieldByLabel('Faction').getValue() || 0;
    }
    if(root.hasField('Fort')){
      this.fort = root.getFieldByLabel('Fort').getValue() || 0;
    }
    if(root.hasField('GenericType')){
      this.genericType = root.getFieldByLabel('GenericType').getValue() || 0;
    }
    if(root.hasField('HP')){
      this.hp = root.getFieldByLabel('HP').getValue() || 0;
    }
    if(root.hasField('Hardness')){
      this.hardness = root.getFieldByLabel('Hardness').getValue() || 0;
    }
    if(root.hasField('Interruptable')){
      this.interruptable = root.getFieldByLabel('Interruptable').getValue() || false;
    }
    if(root.hasField('KeyName')){
      this.keyName = root.getFieldByLabel('KeyName').getValue() || '';
    }
    if(root.hasField('KeyRequired')){
      this.keyRequired = root.getFieldByLabel('KeyRequired').getValue() || false;
    }
    if(root.hasField('LoadScreenID')){
      this.loadScreenID = root.getFieldByLabel('LoadScreenID').getValue() || 0;
    }
    if(root.hasField('LocName')){
      this.locName = root.getFieldByLabel('LocName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Lockable')){
      this.lockable = root.getFieldByLabel('Lockable').getValue() || false;
    }
    if(root.hasField('Locked')){
      this.locked = root.getFieldByLabel('Locked').getValue() || false;
    }
    if(root.hasField('Min1HP')){
      this.min1HP = root.getFieldByLabel('Min1HP').getValue() || false;
    }
    if(root.hasField('OnClick')){
      this.onClick = root.getFieldByLabel('OnClick').getValue() || '';
    }
    if(root.hasField('OnClosed')){
      this.onClosed = root.getFieldByLabel('OnClosed').getValue() || '';
    }
    if(root.hasField('OnDamaged')){
      this.onDamaged = root.getFieldByLabel('OnDamaged').getValue() || '';
    }
    if(root.hasField('OnDeath')){
      this.onDeath = root.getFieldByLabel('OnDeath').getValue() || '';
    }
    if(root.hasField('OnDisarm')){
      this.onDisarm = root.getFieldByLabel('OnDisarm').getValue() || '';
    }
    if(root.hasField('OnFailToOpen')){
      this.onFailToOpen = root.getFieldByLabel('OnFailToOpen').getValue() || '';
    }
    if(root.hasField('OnHeartbeat')){
      this.onHeartbeat = root.getFieldByLabel('OnHeartbeat').getValue() || '';
    }
    if(root.hasField('OnLock')){
      this.onLock = root.getFieldByLabel('OnLock').getValue() || '';
    }
    if(root.hasField('OnMeleeAttacked')){
      this.onMeleeAttacked = root.getFieldByLabel('OnMeleeAttacked').getValue() || '';
    }
    if(root.hasField('OnOpen')){
      this.onOpen = root.getFieldByLabel('OnOpen').getValue() || '';
    }
    if(root.hasField('OnSpellCastAt')){
      this.onSpellCastAt = root.getFieldByLabel('OnSpellCastAt').getValue() || '';
    }
    if(root.hasField('OnTrapTriggered')){
      this.onTrapTriggered = root.getFieldByLabel('OnTrapTriggered').getValue() || '';
    }
    if(root.hasField('OnUnlock')){
      this.onUnlock = root.getFieldByLabel('OnUnlock').getValue() || '';
    }
    if(root.hasField('OnUserDefined')){
      this.onUserDefined = root.getFieldByLabel('OnUserDefined').getValue() || '';
    }
    if(root.hasField('OpenLockDC')){
      this.openLockDC = root.getFieldByLabel('OpenLockDC').getValue() || 0;
    }
    if(root.hasField('OpenState')){
      this.openState = root.getFieldByLabel('OpenState').getValue() || 0;
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('Plot')){
      this.plot = root.getFieldByLabel('Plot').getValue() || false;
    }
    if(root.hasField('PortraitId')){
      this.portraitId = root.getFieldByLabel('PortraitId').getValue() || 0;
    }
    if(root.hasField('Ref')){
      this.ref = root.getFieldByLabel('Ref').getValue() || 0;
    }
    if(root.hasField('Static')){
      this.static = root.getFieldByLabel('Static').getValue() || false;
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
    if(root.hasField('Will')){
      this.will = root.getFieldByLabel('Will').getValue() || 0;
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utd'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    const utd = new KotOR.GFFObject();
    utd.FileType = 'UTD ';
    
    const root = utd.RootNode;
    if(!root) return;
    root.type = -1;
    
    // Basic Properties
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AnimationState', this.animationState || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Appearance', this.appearance) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AutoRemoveKey', this.autoRemoveKey) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'CloseLockDC', this.closeLockDC) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment || '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Conversation', this.conversation || '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'CurrentHP', this.currentHP) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description || new KotOR.CExoLocString()) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DisarmDC', this.disarmDC) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.factionId || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Fort', this.fort) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'GenericType', this.genericType || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'HP', this.hp) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Hardness', this.hardness) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Interruptable', this.interruptable ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'KeyName', this.keyName || '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'KeyRequired', this.keyRequired ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenID || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName || new KotOR.CExoLocString()) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Lockable', this.lockable ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Locked', this.locked ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Min1HP', this.min1HP ? 1 : 0) )
    
    // Script References
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClick', this.onClick ? this.onClick : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClosed', this.onClosed ? this.onClosed : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDamaged', this.onDamaged ? this.onDamaged : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDeath', this.onDeath ? this.onDeath : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDisarm', this.onDisarm ? this.onDisarm : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnFailToOpen', this.onFailToOpen ? this.onFailToOpen : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat ? this.onHeartbeat : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnLock', this.onLock ? this.onLock : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnMeleeAttacked', this.onMeleeAttacked ? this.onMeleeAttacked : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnOpen', this.onOpen ? this.onOpen : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnSpellCastAt', this.onSpellCastAt ? this.onSpellCastAt : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnTrapTriggered', this.onTrapTriggered ? this.onTrapTriggered : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUnlock', this.onUnlock ? this.onUnlock : '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined ? this.onUserDefined : '') )
    
    // Lock and Trap Properties
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'OpenLockDC', this.openLockDC) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'OpenState', this.openState || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Plot', this.plot ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Ref', this.ref) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Static', this.static ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectDC', this.trapDetectDC || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectable', this.trapDetectable ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDisarmable', this.trapDisarmable ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapFlag', this.trapFlag ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapOneShot', this.trapOneShot ? 1 : 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapType', this.trapType || 0) )
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Will', this.will) )

    this.blueprint = utd;
    this.file.setGFFObject(utd);
    this.processEventListener('onEditorFileChange', [this]);
  }
}
