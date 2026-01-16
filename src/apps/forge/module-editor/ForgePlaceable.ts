import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgePlaceable extends ForgeGameObject {

  walkmesh: KotOR.OdysseyWalkMesh;
  model: KotOR.OdysseyModel3D;

  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.utp;

  // Appearance and Faction data
  kPlaceableAppearances: any[] = [];
  kPlaceableAppearance: any = {};
  kFactions: any[] = [];
  kFaction: any = {};

  //Blueprint Properties
  animationState: number = 2;
  appearance: number = 0;
  autoRemoveKey: boolean = false;
  bodyBag: boolean = false;
  closeLockDC: number = 0;
  comment: string = '';
  conversation: string = '';
  currentHP: number = 0;
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  disarmDC: number = 0;
  faction: number = 0;
  fort: number = 0;
  hp: number = 0;
  hardness: number = 0;
  hasInventory: boolean = false;
  interruptable: boolean = false;
  keyName: string = '';
  keyRequired: boolean = false;
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  lockable: boolean = false;
  locked: boolean = false;
  min1HP: boolean = false;
  onClick: string = '';
  onClosed: string = '';
  onDamaged: string = '';
  onDeath: string = '';
  onDisarm: string = '';
  onEndDialogue: string = '';
  onFailToOpen: string = '';
  onHeartbeat: string = '';
  onInvDisturbed: string = '';
  onLock: string = '';
  onMeleeAttacked: string = '';
  onOpen: string = '';
  onSpellCastAt: string = '';
  onTrapTriggered: string = '';
  onUnlock: string = '';
  onUsed: string = '';
  onUserDefined: string = '';
  openLockDC: number = 0;
  paletteID: number = 0;
  partyInteract: boolean = false;
  plot: boolean = false;
  portraitId: number = 0;
  ref: number = 0;
  static: boolean = false;
  tag: string = '';
  trapDetectDC: number = 0;
  trapDetectable: boolean = false;
  trapDisarmable: boolean = false;
  trapFlag: boolean = false;
  trapOneShot: boolean = false;
  trapType: number = 0;
  t_type: number = 0;
  useable: boolean = false;
  will: number = 0;

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
    if(property === 'faction' || property === 'placeable.faction'){
      this.loadFactions();
    }
    if(property === 'appearance' || property === 'placeable.appearance'){
      this.loadAppearance();
      if(newValue !== oldValue){
        this.loadModel();
      }
    }
    if(property === 'hp' || property === 'placeable.hp'){
      this.currentHP = newValue;
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

    if(root.hasField('AnimationState')){
      this.animationState = root.getFieldByLabel('AnimationState').getValue() || 0;
    }
    if(root.hasField('Appearance')){
      this.appearance = root.getFieldByLabel('Appearance').getValue() || 0;
    }
    if(root.hasField('AutoRemoveKey')){
      this.autoRemoveKey = root.getFieldByLabel('AutoRemoveKey').getValue() || false;
    }
    if(root.hasField('BodyBag')){
      this.bodyBag = root.getFieldByLabel('BodyBag').getValue() || false;
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
      this.faction = root.getFieldByLabel('Faction').getValue() || 0;
    }
    if(root.hasField('Fort')){
      this.fort = root.getFieldByLabel('Fort').getValue() || 0;
    }
    if(root.hasField('HP')){
      this.hp = root.getFieldByLabel('HP').getValue() || 0;
    }
    if(root.hasField('Hardness')){
      this.hardness = root.getFieldByLabel('Hardness').getValue() || 0;
    }
    if(root.hasField('HasInventory')){
      this.hasInventory = root.getFieldByLabel('HasInventory').getValue() || false;
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
    if(root.hasField('OnEndDialogue')){
      this.onEndDialogue = root.getFieldByLabel('OnEndDialogue').getValue() || '';
    }
    if(root.hasField('OnInvDisturbed')){
      this.onInvDisturbed = root.getFieldByLabel('OnInvDisturbed').getValue() || '';
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
    if(root.hasField('OnUsed')){
      this.onUsed = root.getFieldByLabel('OnUsed').getValue() || '';
    }
    if(root.hasField('OnUserDefined')){
      this.onUserDefined = root.getFieldByLabel('OnUserDefined').getValue() || '';
    }
    if(root.hasField('OpenLockDC')){
      this.openLockDC = root.getFieldByLabel('OpenLockDC').getValue() || 0;
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('PartyInteract')){
      this.partyInteract = root.getFieldByLabel('PartyInteract').getValue() || false;
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
    if(root.hasField('Type')){
      this.t_type = root.getFieldByLabel('Type').getValue() || 0;
    }
    if(root.hasField('Useable')){
      this.useable = root.getFieldByLabel('Useable').getValue() || false;
    }
    if(root.hasField('Will')){
      this.will = root.getFieldByLabel('Will').getValue() || 0;
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTP ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AnimationState', this.animationState || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Appearance', this.appearance) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AutoRemoveKey', this.autoRemoveKey ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'BodyBag', this.bodyBag ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'CloseLockDC', this.closeLockDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Conversation', this.conversation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'CurrentHP', this.currentHP) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DisarmDC', this.disarmDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.faction) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Fort', this.fort) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HP', this.hp) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Hardness', this.hardness) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HasInventory', this.hasInventory ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Interruptable', this.interruptable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'KeyName', this.keyName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'KeyRequired', this.keyRequired ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Lockable', this.lockable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Locked', this.locked ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Min1HP', this.min1HP ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClick', this.onClick) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClosed', this.onClosed) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDamaged', this.onDamaged) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDeath', this.onDeath) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDisarm', this.onDisarm) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEndDialogue', this.onEndDialogue) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnFailToOpen', this.onFailToOpen) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnInvDisturbed', this.onInvDisturbed) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnLock', this.onLock) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnMeleeAttacked', this.onMeleeAttacked) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnOpen', this.onOpen) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnSpellCastAt', this.onSpellCastAt) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnTrapTriggered', this.onTrapTriggered) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUnlock', this.onUnlock) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUsed', this.onUsed) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'OpenLockDC', this.openLockDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PartyInteract', this.partyInteract ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Plot', this.plot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Ref', this.ref) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Static', this.static ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectDC', this.trapDetectDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectable', this.trapDetectable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDisarmable', this.trapDisarmable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapFlag', this.trapFlag ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapOneShot', this.trapOneShot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapType', this.trapType) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Type', this.t_type) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Useable', this.useable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Will', this.will) );

    return this.blueprint;
  }

  loadAppearance(){
    if(!this.kPlaceableAppearance){
      this.kPlaceableAppearance = {};
    }
    const twodaObject = KotOR.TwoDAManager.datatables.get('placeables');
    if(!twodaObject) return;
    this.kPlaceableAppearances = Object.values(twodaObject.rows);
    return this.kPlaceableAppearance = twodaObject.getRowByIndex(this.appearance || 0);
  }

  loadFactions(){
    if(!this.kFactions){
      this.kFactions = [];
    }
    const twodaObject = KotOR.TwoDAManager.datatables.get('repute');
    if(!twodaObject) return;
    this.kFactions = Object.values(twodaObject.rows);
    return this.kFaction = twodaObject.getRowByIndex(this.faction || 0);
  }

  stringCleaner(str: string = ''){
    return str.replace(/\0[\s\S]*$/g,'').toLowerCase();
  }

  async loadModel(){
    if(this.model){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    // Load appearance data first if not already loaded
    if(!this.kPlaceableAppearance || Object.keys(this.kPlaceableAppearance).length === 0){
      this.loadAppearance();
    }

    if(!this.templateResRef){
      this.model = new KotOR.OdysseyModel3D();
      return this.model;
    }

    const modelName = this.stringCleaner(this.kPlaceableAppearance.modelname) || 'plc_invis';

    try{
      const mdl = await KotOR.MDLLoader.loader.load(modelName);
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        lighting: true
      });
      this.model = model;
      this.container.add(this.model);
      return this.model;
    }catch(e){
      this.model = new KotOR.OdysseyModel3D();
      return this.model;
    }
  }

  async load(){
    this.loadAppearance();
    await this.loadModel();
    this.updateBoundingBox();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(9);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.rotation.z = strt.getFieldByLabel('Bearing').getValue() as number;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}