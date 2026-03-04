import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import type { IGameContext } from "@/interface/engine/IGameContext";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class ForgeDoor extends ForgeGameObject {
  linkedTo: string = '';
  linkedToFlags: number = 0;
  linkedToModule: string = '';
  transitionDestin: string = '';

  /**
   * The walkmesh for the closed state
   */
  walkmeshClosed: KotOR.OdysseyWalkMesh;

  /**
   * The walkmesh for the open state (side 1)
   */
  walkmeshOpen1: KotOR.OdysseyWalkMesh;

  /**
   * The walkmesh for the open state (side 2)
   */
  walkmeshOpen2: KotOR.OdysseyWalkMesh;

  model: KotOR.OdysseyModel3D;
  modelLoading: boolean = false;

  //GIT Instance Properties
  templateResType: number = KotOR.ResourceTypes.utd;

  // Appearance data
  kDoorAppearances: Record<string, string | number>[] = [];
  kDoorAppearance: Record<string, string | number> = {};

  //Blueprint Properties
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
  trapDetectDC: number = 0;
  trapDetectable: boolean = false;
  trapDisarmable: boolean = false;
  trapFlag: boolean = false;
  trapOneShot: boolean = false;
  trapType: number = 0;
  will: number = 0;

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    const onPropChange: EventListenerCallback = (...args: unknown[]) => {
      this.onPropertyChange(
        args[0] as string,
        args[1] as string | number | boolean | object,
        args[2] as string | number | boolean | object
      );
    };
    this.addEventListener('onPropertyChange', onPropChange);
  }

  onPropertyChange(property: string, newValue: string | number | boolean | object, oldValue: string | number | boolean | object){
    if(property === 'genericType'){
      this.loadAppearance();
      if(newValue !== oldValue){
        this.loadModel();
      }
    }
    if(property === 'hp' && typeof newValue === 'number'){
      this.currentHP = newValue;
    }
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

    if(root.hasField('AnimationState')){
      this.animationState = root.getNumberByLabel('AnimationState');
    }
    if(root.hasField('Appearance')){
      this.appearance = root.getNumberByLabel('Appearance');
    }
    if(root.hasField('AutoRemoveKey')){
      this.autoRemoveKey = root.getBooleanByLabel('AutoRemoveKey');
    }
    if(root.hasField('CloseLockDC')){
      this.closeLockDC = root.getNumberByLabel('CloseLockDC');
    }
    if(root.hasField('Comment')){
      this.comment = root.getStringByLabel('Comment');
    }
    if(root.hasField('Conversation')){
      this.conversation = root.getStringByLabel('Conversation');
    }
    if(root.hasField('CurrentHP')){
      this.currentHP = root.getNumberByLabel('CurrentHP');
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('DisarmDC')){
      this.disarmDC = root.getNumberByLabel('DisarmDC');
    }
    if(root.hasField('Faction')){
      this.factionId = root.getNumberByLabel('Faction');
    }
    if(root.hasField('Fort')){
      this.fort = root.getNumberByLabel('Fort');
    }
    if(root.hasField('GenericType')){
      this.genericType = root.getNumberByLabel('GenericType');
    }
    if(root.hasField('HP')){
      this.hp = root.getNumberByLabel('HP');
    }
    if(root.hasField('Hardness')){
      this.hardness = root.getNumberByLabel('Hardness');
    }
    if(root.hasField('Interruptable')){
      this.interruptable = root.getBooleanByLabel('Interruptable');
    }
    if(root.hasField('KeyName')){
      this.keyName = root.getStringByLabel('KeyName');
    }
    if(root.hasField('KeyRequired')){
      this.keyRequired = root.getBooleanByLabel('KeyRequired');
    }
    if(root.hasField('LoadScreenID')){
      this.loadScreenID = root.getNumberByLabel('LoadScreenID');
    }
    if(root.hasField('LocName')){
      this.locName = root.getFieldByLabel('LocName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Lockable')){
      this.lockable = root.getBooleanByLabel('Lockable');
    }
    if(root.hasField('Locked')){
      this.locked = root.getBooleanByLabel('Locked');
    }
    if(root.hasField('Min1HP')){
      this.min1HP = root.getBooleanByLabel('Min1HP');
    }
    if(root.hasField('OnClick')){
      this.onClick = root.getStringByLabel('OnClick');
    }
    if(root.hasField('OnClosed')){
      this.onClosed = root.getStringByLabel('OnClosed');
    }
    if(root.hasField('OnDamaged')){
      this.onDamaged = root.getStringByLabel('OnDamaged');
    }
    if(root.hasField('OnDeath')){
      this.onDeath = root.getStringByLabel('OnDeath');
    }
    if(root.hasField('OnDisarm')){
      this.onDisarm = root.getStringByLabel('OnDisarm');
    }
    if(root.hasField('OnFailToOpen')){
      this.onFailToOpen = root.getStringByLabel('OnFailToOpen');
    }
    if(root.hasField('OnHeartbeat')){
      this.onHeartbeat = root.getStringByLabel('OnHeartbeat');
    }
    if(root.hasField('OnLock')){
      this.onLock = root.getStringByLabel('OnLock');
    }
    if(root.hasField('OnMeleeAttacked')){
      this.onMeleeAttacked = root.getStringByLabel('OnMeleeAttacked');
    }
    if(root.hasField('OnOpen')){
      this.onOpen = root.getStringByLabel('OnOpen');
    }
    if(root.hasField('OnSpellCastAt')){
      this.onSpellCastAt = root.getStringByLabel('OnSpellCastAt');
    }
    if(root.hasField('OnTrapTriggered')){
      this.onTrapTriggered = root.getStringByLabel('OnTrapTriggered');
    }
    if(root.hasField('OnUnlock')){
      this.onUnlock = root.getStringByLabel('OnUnlock');
    }
    if(root.hasField('OnUserDefined')){
      this.onUserDefined = root.getStringByLabel('OnUserDefined');
    }
    if(root.hasField('OpenLockDC')){
      this.openLockDC = root.getNumberByLabel('OpenLockDC');
    }
    if(root.hasField('OpenState')){
      this.openState = root.getNumberByLabel('OpenState');
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getNumberByLabel('PaletteID');
    }
    if(root.hasField('Plot')){
      this.plot = root.getBooleanByLabel('Plot');
    }
    if(root.hasField('PortraitId')){
      this.portraitId = root.getNumberByLabel('PortraitId');
    }
    if(root.hasField('Ref')){
      this.ref = root.getNumberByLabel('Ref');
    }
    if(root.hasField('Static')){
      this.static = root.getBooleanByLabel('Static');
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
    if(root.hasField('Will')){
      this.will = root.getNumberByLabel('Will');
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTD ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AnimationState', this.animationState || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Appearance', this.appearance) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AutoRemoveKey', this.autoRemoveKey ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'CloseLockDC', this.closeLockDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Conversation', this.conversation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'CurrentHP', this.currentHP) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DisarmDC', this.disarmDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.factionId || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Fort', this.fort) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'GenericType', this.genericType || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'HP', this.hp) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Hardness', this.hardness) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Interruptable', this.interruptable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'KeyName', this.keyName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'KeyRequired', this.keyRequired ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenID || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Lockable', this.lockable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Locked', this.locked ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Min1HP', this.min1HP ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClick', this.onClick) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClosed', this.onClosed) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDamaged', this.onDamaged) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDeath', this.onDeath) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDisarm', this.onDisarm) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnFailToOpen', this.onFailToOpen) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnLock', this.onLock) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnMeleeAttacked', this.onMeleeAttacked) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnOpen', this.onOpen) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnSpellCastAt', this.onSpellCastAt) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnTrapTriggered', this.onTrapTriggered) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUnlock', this.onUnlock) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'OpenLockDC', this.openLockDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'OpenState', this.openState || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Plot', this.plot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Ref', this.ref) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Static', this.static ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectDC', this.trapDetectDC || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectable', this.trapDetectable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDisarmable', this.trapDisarmable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapFlag', this.trapFlag ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapOneShot', this.trapOneShot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapType', this.trapType || 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Will', this.will) );

    return this.blueprint;
  }

  loadAppearance(){
    if(!this.kDoorAppearance){
      this.kDoorAppearance = {};
    }
    const twodaObject = KotOR.TwoDAManager.datatables.get('genericdoors');
    if(!twodaObject) return;
    this.kDoorAppearances = Object.values(twodaObject.rows);
    return this.kDoorAppearance = twodaObject.getRowByIndex(this.genericType || 0);
  }

  stringCleaner(str: string = ''){
    return str.replace(/\0[\s\S]*$/g,'').toLowerCase();
  }

  async loadModel(){
    if(this.model){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch{ /* ignore */ }
    }

    // Load appearance data first if not already loaded
    if(!this.kDoorAppearance || Object.keys(this.kDoorAppearance).length === 0){
      this.loadAppearance();
    }

    if(!this.blueprint){
      this.model = new KotOR.OdysseyModel3D();
      this.modelLoading = false;
      this.processEventListener('onModelChange', [this]);
      this.container.add(this.model);
      return this.model;
    }

    const modelName = this.stringCleaner(String(this.kDoorAppearance?.modelname ?? '')) || 'plc_invis';

    try{
      this.modelLoading = true;
      this.processEventListener('onModelChange', [this]);
      const mdl = await KotOR.MDLLoader.loader.load(modelName);
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.context as unknown as IGameContext,
        lighting: true
      });
      this.model = model;
    }catch(e){
      log.error(e as Error);
      this.model = new KotOR.OdysseyModel3D();
    }
    this.modelLoading = false;
    this.processEventListener('onModelChange', [this]);
    this.container.add(this.model);
    return this.model;
  }

  async load(){
    this.loadAppearance();
    await this.loadModel();
    this.updateBoundingBox();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(8);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LinkedToFlags', this.linkedToFlags));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'LinkedToModule', this.linkedToModule));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'TransitionDestin', this.transitionDestin));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.rotation.z = strt.getNumberByLabel('Bearing');
    this.linkedTo = strt.getStringByLabel('LinkedTo');
    this.linkedToFlags = strt.getNumberByLabel('LinkedToFlags');
    this.linkedToModule = strt.getStringByLabel('LinkedToModule');
    this.tag = strt.getStringByLabel('Tag');
    this.templateResRef = strt.getStringByLabel('TemplateResRef');
    this.transitionDestin = strt.getStringByLabel('TransitionDestin');
    this.position.x = strt.getNumberByLabel('X');
    this.position.y = strt.getNumberByLabel('Y');
    this.position.z = strt.getNumberByLabel('Z');
  }

}
