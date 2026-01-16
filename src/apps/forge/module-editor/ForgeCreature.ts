import * as KotOR from "../KotOR";
import { GroupType, type UI3DRenderer } from "../UI3DRenderer";
import { ForgeGameObject } from "./ForgeGameObject";

interface EngineItem {
  baseItem: KotOR.SWBaseItem | undefined;
  modelVariation: number;
  textureVariation: number;
  bodyVariation: string;
}

type TemplateSlotKey = 'headItem' | 'armorItem' | 'leftHandItem' | 'rightHandItem' | 'beltItem' | 'implantItem' | 'leftArmbandItem' | 'rightArmbandItem' | 'hideItem' | 'claw1Item' | 'claw2Item' | 'claw3Item' | 'leftHand2Item' | 'rightHand2Item';

export interface SpecialAbilityEntry {
  /**
   * Special Ability ID index into the spells.2da datatable
   */
  spell: number;
  /**
   * Spell caster level to cast this spell as
   */
  spellCasterLevel: number;
  /**
   * 0x01 = readied
   * 0x02 = spontaneous
   * 0x04 = unlimited use
   */
  spellFlags: number;
}

export interface KnownSpellEntry {
  /**
   * Spell ID index into the spells.2da datatable
   */
  spell: number;

  /**
   * 0x00 - None
   * 0x01 - Empower
   * 0x02 - Extend
   * 0x04 - Maximize
   * 0x08 - Quicken
   * 0x10 - Silent
   * 0x20 - Still
   */
  spellMetaMagic: number;

  /**
   * 0x01 = readied
   * 0x02 = spontaneous
   * 0x04 = unlimited use
   */
  spellFlags: number;
}

export interface CreatureClassEntry {
  class: number;
  level: number;
  knownList0: KnownSpellEntry[];
}

export class ForgeCreature extends ForgeGameObject {
  model: KotOR.OdysseyModel3D;

  //GIT Instance Properties
  templateResRef: string = '';
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.utc;
  
  //Blueprint Properties
  appearanceType: number = 0;
  bodyBag: number = 0;
  bodyVariation: number = 0;
  cha: number = 10;
  challengeRating: number = 0;
  classList: CreatureClassEntry[] = [
    {
      class: 0,
      level: 1,
      knownList0: [],
    }
  ];
  comment: string = '';
  con: number = 10;
  conversation: string = '';
  currentForce: number = 0;
  currentHitPoints: number = 0;
  deity: string = '';
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  dex: number = 10;
  disarmable: boolean = false;
  factionID: number = 0;
  featList: number[] = [];
  firstName: KotOR.CExoLocString = new KotOR.CExoLocString();
  forcePoints: number = 0;
  gender: number = 0;
  goodEvil: number = 50;
  hitPoints: number = 0;
  int: number = 10;
  interruptable: boolean = true;
  isPC: boolean = false;
  itemList: string[] = [];
  lastName: KotOR.CExoLocString = new KotOR.CExoLocString();
  lawfulChaotic: number = 0;
  maxHitPoints: number = 0;
  min1HP: boolean = false;
  naturalAC: number = 0;
  noPermDeath: boolean = false;
  notReorienting: boolean = false;
  partyInteract: boolean = false;
  perceptionRange: number = 0;
  phenotype: number = 0;
  plot: boolean = false;
  palletID: number = 0;
  portraitId: number = 0;
  race: number = 0;
  scriptAttacked: string = '';
  scriptDamaged: string = '';
  scriptDeath: string = '';
  scriptDialogu: string = '';
  scriptDisturbed: string = '';
  scriptEndDialogue: string = '';
  scriptEndRound: string = '';
  scriptHeartbeat: string = '';
  scriptOnBlocked: string = '';
  scriptOnNotice: string = '';
  scriptRested: string = '';
  scriptSpawn: string = '';
  scriptSpellAt: string = '';
  scriptUserDefined: string = '';
  skillList: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  soundSetFile: number = 0;
  specAbilityList: SpecialAbilityEntry[] = [];
  str: number = 10;
  subrace: string = '';
  subraceIndex: number = 0;
  tag: string = '';
  templateList: string[] = [];
  // templateResRef: string = '';
  textureVar: number = 1;
  walkRate: number = 7;
  wis: number = 10;
  fortbonus: number = 0;
  refbonus: number = 0;
  willbonus: number = 0;

  slotArmor: string = '';
  slotBelt: string = '';
  slotClaw1: string = '';
  slotClaw2: string = '';
  slotClaw3: string = '';
  slotHide: string = '';
  slotLeftArmband: string = '';
  slotLeftHand: string = '';
  slotRightArmband: string = '';
  slotRightHand: string = '';
  slotRightHand2: string = '';
  slotLeftHand2: string = '';
  slotImplant: string = '';
  slotHead: string = '';
  slotArms: string = '';

  creatureAppearance: KotOR.SWCreatureAppearance;
  modelVariation: number = 0;
  textureVariation: number = 0;

  templateSlots: Record<TemplateSlotKey, EngineItem | undefined> = {
    headItem: undefined,
    armorItem: undefined,
    leftHandItem: undefined,
    rightHandItem: undefined,
    beltItem: undefined,
    implantItem: undefined,
    leftArmbandItem: undefined,
    rightArmbandItem: undefined,
    hideItem: undefined,
    claw1Item: undefined,
    claw2Item: undefined,
    claw3Item: undefined,
    leftHand2Item: undefined,
    rightHand2Item: undefined,
  };

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    } else {
      this.blueprint = new KotOR.GFFObject();
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: keyof ForgeCreature, newValue: any, oldValue: any){
    if(property === 'appearanceType'){
      if(newValue !== oldValue){
        this.loadAppearance();
        this.loadModel();
      }
    }
    if(property === 'slotHead'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.HEAD);
      }
    }
    if(property === 'slotArmor'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.ARMOR).then(() => {
          this.loadModel();
        });
      }
    }
    if(property === 'slotLeftHand'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.LEFTHAND);
      }
    }
    if(property === 'slotRightHand'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.RIGHTHAND);
      }
    }
    if(property === 'slotBelt'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.BELT);
      }
    }
    if(property === 'slotImplant'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.IMPLANT);
      }
    }
    if(property === 'slotLeftArmband'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.LEFTARMBAND);
      }
    }
    if(property === 'slotRightArmband'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.RIGHTARMBAND);
      }
    }
    if(property === 'slotHide'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.HIDE);
      }
    }
    if(property === 'slotClaw1'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.CLAW1);
      }
    }
    if(property === 'slotClaw2'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.CLAW2);
      }
    }
    if(property === 'slotClaw3'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.CLAW3);
      }
    }
    if(property === 'slotHide'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.HIDE);
      }
    }
    if(property === 'slotLeftHand2'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.LEFTHAND2);
      }
    }
    if(property === 'slotRightHand2'){
      if(newValue !== oldValue){
        this.loadEquipment(KotOR.ModuleCreatureArmorSlot.RIGHTHAND2);
      }
    }
  }

  async load(){
    this.loadAppearance();
    await this.loadEquipment(KotOR.ModuleCreatureArmorSlot.ARMOR);
    await this.loadEquipment(KotOR.ModuleCreatureArmorSlot.LEFTHAND);
    await this.loadEquipment(KotOR.ModuleCreatureArmorSlot.RIGHTHAND);
    await this.loadModel();
    this.updateBoundingBox();
  }

  loadAppearance(){
    const appearance = KotOR.AppearanceManager.GetCreatureAppearanceById(this.appearanceType);
    if(appearance){
      this.creatureAppearance = appearance;
    }
  }

  async loadEquipment(slot: KotOR.ModuleCreatureArmorSlot){
    try{
      let baseItemId: number = 0;
      let baseItem: KotOR.SWBaseItem | undefined = undefined;
      let modelVariation: number = 0;
      let textureVariation: number = 0;
      let bodyVariation: number = 1;
      let itemTemplate: KotOR.GFFObject = new KotOR.GFFObject();
      let slotKey: keyof typeof this.templateSlots | undefined = undefined;

      const utiResId = KotOR.ResourceTypes.uti;

      switch(slot){
        case KotOR.ModuleCreatureArmorSlot.HEAD:
          itemTemplate = new KotOR.GFFObject(
            await KotOR.ResourceLoader.loadResource(utiResId, this.slotHead)
          );
          slotKey = 'headItem';
          break;
        case KotOR.ModuleCreatureArmorSlot.ARMOR:
          itemTemplate = new KotOR.GFFObject(
            await KotOR.ResourceLoader.loadResource(utiResId, this.slotArmor)
          );
          slotKey = 'armorItem';
          break;
        case KotOR.ModuleCreatureArmorSlot.LEFTHAND:
          itemTemplate = new KotOR.GFFObject(
            await KotOR.ResourceLoader.loadResource(utiResId, this.slotLeftHand)
          );
          slotKey = 'leftHandItem';
          break;
        case KotOR.ModuleCreatureArmorSlot.RIGHTHAND:
          itemTemplate = new KotOR.GFFObject(
            await KotOR.ResourceLoader.loadResource(utiResId, this.slotRightHand)
          );
          slotKey = 'rightHandItem';
          break;
        default:
          break;
      }

      if(slotKey){
        this.templateSlots[slotKey] = undefined;
      }
      
      if(itemTemplate && typeof slotKey === 'string'){
        const root = itemTemplate.RootNode;
        if(root.hasField('BaseItem')){
          baseItemId = itemTemplate.getFieldByLabel('BaseItem').getValue() || 0;
          baseItem = KotOR.SWRuleSet.baseItems[baseItemId];
        }
        if(root.hasField('ModelVariation')){
          modelVariation = root.getFieldByLabel('ModelVariation').getValue() || 0;
        }
        if(root.hasField('TextureVar')){
          textureVariation = root.getFieldByLabel('TextureVar').getValue() || 0;
        }
        if(root.hasField('BodyVariation')){
          bodyVariation = root.getFieldByLabel('BodyVariation').getValue() || '';
        }
        this.templateSlots[slotKey] = {
          baseItem: baseItem,
          modelVariation: modelVariation,
          textureVariation: textureVariation,
          bodyVariation: baseItem?.bodyVar || (bodyVariation > 0 ? String.fromCharCode(bodyVariation + 64) : ''),
        };
      }
    }catch(e){
      console.error(e);
    }
  }

  modelLoading: boolean = false;
  async loadModel () {
    if(this.modelLoading) return;
    this.modelLoading = true;
    try{
      await this.loadBody();
      await this.loadHead();
    }catch(e){
      console.error(e);
    } 
    this.modelLoading = false;
  }

  async loadBody(): Promise<KotOR.OdysseyModel3D> {

    if(this.model){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    const appearance = this.creatureAppearance;
    let bodyVariation: string = this.templateSlots.armorItem?.bodyVariation || '';
    let textureVariation: number = this.templateSlots.armorItem?.textureVariation || 1;
    const { model: bodyModel, texture: bodyTexture } = appearance.getBodyModelInfo(bodyVariation || '', textureVariation || 1);

    try{
      const mdl = await KotOR.MDLLoader.loader.load(bodyModel);
      this.model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        castShadow: true,
        receiveShadow: true,
        textureVar: bodyTexture,
        isHologram: false,
        context: this.context,
      });
    }catch(e){
      this.model = new KotOR.OdysseyModel3D();
    }
    this.container.add(this.model);

    // this.updateCameraFocus();

    return this.model;
  }

  async loadHead() {
    const appearance = this.creatureAppearance;
    const headId = appearance.normalhead;//.replace(/\0[\s\S]*$/g,'').toLowerCase();
    if(!( headId >= 0 && appearance.modeltype == 'B' )){
      return;
    }

    const headDetails = KotOR.SWRuleSet.heads[headId];
    if(!headDetails){
      return;
    }

    try
    {
      const headTexture = headDetails.getTextureGoodEvil(this.goodEvil);
      const mdl = await KotOR.MDLLoader.loader.load(headDetails.head);
      const head = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: true,
        isHologram: false,
        textureVar: headTexture,
      });
      this.model.attachHead(head);

      // this.updateCameraFocus();
    }
    catch(e)
    {
      console.error(e);
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
    
    if(root.hasField('Appearance_Type')){
      this.appearanceType = root.getFieldByLabel('Appearance_Type').getValue() || 0;
    }
    if(root.hasField('BodyBag')){
      this.bodyBag = root.getFieldByLabel('BodyBag').getValue() || 0;
    }
    if(root.hasField('BodyVariation')){
      this.bodyVariation = root.getFieldByLabel('BodyVariation').getValue() || 0;
    }
    if(root.hasField('Cha')){
      this.cha = root.getFieldByLabel('Cha').getValue() || 10;
    }
    if(root.hasField('ChallengeRating')){
      this.challengeRating = root.getFieldByLabel('ChallengeRating').getValue() || 0;
    }
    if(root.hasField('ClassList')){
      this.classList = root.getFieldByLabel('ClassList').getChildStructs().map( (struct) => {
        const classEntry: CreatureClassEntry = {
          class: struct.getFieldByLabel('Class').getValue() || 0,
          level: struct.getFieldByLabel('ClassLevel').getValue() || 1,
          knownList0: [],
        };
        const knownList0 = struct.getFieldByLabel('KnownList0').getChildStructs().map( (struct) => {
          const knownSpellEntry: KnownSpellEntry = {
            spell: struct.getFieldByLabel('Spell').getValue() || 0,
            spellMetaMagic: struct.getFieldByLabel('SpellMetaMagic').getValue() || 0,
            spellFlags: struct.getFieldByLabel('SpellFlags').getValue() || 0,
          };
          return knownSpellEntry;
        });
        classEntry.knownList0 = knownList0;
        return classEntry;
      }) || [];
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('Con')){
      this.con = root.getFieldByLabel('Con').getValue() || 10;
    }
    if(root.hasField('Conversation')){
      this.conversation = root.getFieldByLabel('Conversation').getValue() || '';
    }
    if(root.hasField('CurrentForce')){
      this.currentForce = root.getFieldByLabel('CurrentForce').getValue() || 0;
    }
    if(root.hasField('CurrentHitPoints')){
      this.currentHitPoints = root.getFieldByLabel('CurrentHitPoints').getValue() || 0;
    }
    if(root.hasField('Deity')){
      this.deity = root.getFieldByLabel('Deity').getValue() || '';
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Dex')){
      this.dex = root.getFieldByLabel('Dex').getValue() || 10;
    }
    if(root.hasField('Disarmable')){
      this.disarmable = root.getFieldByLabel('Disarmable').getValue() || false;
    }
    if(root.hasField('Equip_ItemList')){
      const equipItemList = root.getFieldByLabel('Equip_ItemList').getChildStructs();
      for(let i = 0; i < equipItemList.length; i++){
        const struct = equipItemList[i];
        const slot = struct.type;
        const item = struct.getFieldByLabel('EquippedRes').getValue() || '';
        switch(slot){
          case KotOR.ModuleCreatureArmorSlot.ARMOR:
            this.slotArmor = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.BELT:
            this.slotBelt = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.CLAW1:
            this.slotClaw1 = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.CLAW2:
            this.slotClaw2 = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.CLAW3:
            this.slotClaw3 = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.HEAD:
            this.slotHead = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.ARMS:
            this.slotArms = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.IMPLANT:
            this.slotImplant = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.LEFTARMBAND:
            this.slotLeftArmband = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.RIGHTARMBAND:
            this.slotRightArmband = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.LEFTHAND:
            this.slotLeftHand = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.RIGHTHAND:
            this.slotRightHand = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.RIGHTHAND2:
            this.slotRightHand2 = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.LEFTHAND2:
            this.slotLeftHand2 = item;
          break;
          case KotOR.ModuleCreatureArmorSlot.HIDE:
            this.slotHide = item;
          break;
        }
      }
    }
    if(root.hasField('FactionID')){
      this.factionID = root.getFieldByLabel('FactionID').getValue() || 0;
    }
    if(root.hasField('FeatList')){
      this.featList = root.getFieldByLabel('FeatList').getChildStructs().map( (struct) => {
        return struct.getFieldByLabel('Feat').getValue() || 0;
      }) || [];
    }
    if(root.hasField('FirstName')){
      this.firstName = root.getFieldByLabel('FirstName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('ForcePoints')){
      this.forcePoints = root.getFieldByLabel('ForcePoints').getValue() || 0;
    }
    if(root.hasField('Gender')){
      this.gender = root.getFieldByLabel('Gender').getValue() || 0;
    }
    if(root.hasField('GoodEvil')){
      this.goodEvil = root.getFieldByLabel('GoodEvil').getValue() || 0;
    }
    if(root.hasField('HitPoints')){
      this.hitPoints = root.getFieldByLabel('HitPoints').getValue() || 0;
    }
    if(root.hasField('Int')){
      this.int = root.getFieldByLabel('Int').getValue() || 10;
    }
    if(root.hasField('Interruptable')){
      this.interruptable = root.getFieldByLabel('Interruptable').getValue() || false;
    }
    if(root.hasField('IsPC')){
      this.isPC = root.getFieldByLabel('IsPC').getValue() || false;
    }
    if(root.hasField('ItemList')){
      this.itemList = root.getFieldByLabel('ItemList').getChildStructs().map( (struct) => {
        return struct.getFieldByLabel('InventoryRes').getValue() || '';
      }) || [];
    }
    if(root.hasField('LastName')){
      this.lastName = root.getFieldByLabel('LastName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('LawfulChaotic')){
      this.lawfulChaotic = root.getFieldByLabel('LawfulChaotic').getValue() || 0;
    }
    if(root.hasField('MaxHitPoints')){
      this.maxHitPoints = root.getFieldByLabel('MaxHitPoints').getValue() || 0;
    }
    if(root.hasField('Min1HP')){
      this.min1HP = root.getFieldByLabel('Min1HP').getValue() || false;
    }
    if(root.hasField('NaturalAC')){
      this.naturalAC = root.getFieldByLabel('NaturalAC').getValue() || 0;
    }
    if(root.hasField('NoPermDeath')){
      this.noPermDeath = root.getFieldByLabel('NoPermDeath').getValue() || false;
    }
    if(root.hasField('NotReorienting')){
      this.notReorienting = root.getFieldByLabel('NotReorienting').getValue() || false;
    }
    if(root.hasField('PartyInteract')){
      this.partyInteract = root.getFieldByLabel('PartyInteract').getValue() || false;
    }
    if(root.hasField('PerceptionRange')){
      this.perceptionRange = root.getFieldByLabel('PerceptionRange').getValue() || 0;
    }
    if(root.hasField('Phenotype')){
      this.phenotype = root.getFieldByLabel('Phenotype').getValue() || 0;
    }
    if(root.hasField('Plot')){
      this.plot = root.getFieldByLabel('Plot').getValue() || false;
    }
    if(root.hasField('PalletID')){
      this.palletID = root.getFieldByLabel('PalletID').getValue() || 0;
    }
    if(root.hasField('PortraitId')){
      this.portraitId = root.getFieldByLabel('PortraitId').getValue() || 0;
    }
    if(root.hasField('Race')){
      this.race = root.getFieldByLabel('Race').getValue() || 0;
    }
    if(root.hasField('ScriptAttacked')){
      this.scriptAttacked = root.getFieldByLabel('ScriptAttacked').getValue() || '';
    }
    if(root.hasField('ScriptDamaged')){
      this.scriptDamaged = root.getFieldByLabel('ScriptDamaged').getValue() || '';
    }
    if(root.hasField('ScriptDeath')){
      this.scriptDeath = root.getFieldByLabel('ScriptDeath').getValue() || '';
    }
    if(root.hasField('ScriptDialogu')){
      this.scriptDialogu = root.getFieldByLabel('ScriptDialogu').getValue() || '';
    }
    if(root.hasField('ScriptDisturbed')){
      this.scriptDisturbed = root.getFieldByLabel('ScriptDisturbed').getValue() || '';
    }
    if(root.hasField('ScriptEndDialogue')){
      this.scriptEndDialogue = root.getFieldByLabel('ScriptEndDialogue').getValue() || '';
    }
    if(root.hasField('ScriptEndRound')){
      this.scriptEndRound = root.getFieldByLabel('ScriptEndRound').getValue() || '';
    }
    if(root.hasField('ScriptHeartbeat')){
      this.scriptHeartbeat = root.getFieldByLabel('ScriptHeartbeat').getValue() || '';
    }
    if(root.hasField('ScriptOnBlocked')){
      this.scriptOnBlocked = root.getFieldByLabel('ScriptOnBlocked').getValue() || '';
    }
    if(root.hasField('ScriptOnNotice')){
      this.scriptOnNotice = root.getFieldByLabel('ScriptOnNotice').getValue() || '';
    }
    if(root.hasField('ScriptRested')){
      this.scriptRested = root.getFieldByLabel('ScriptRested').getValue() || '';
    }
    if(root.hasField('ScriptSpawn')){
      this.scriptSpawn = root.getFieldByLabel('ScriptSpawn').getValue() || '';
    }
    if(root.hasField('ScriptSpellAt')){
      this.scriptSpellAt = root.getFieldByLabel('ScriptSpellAt').getValue() || '';
    }
    if(root.hasField('ScriptUserDefine')){
      this.scriptUserDefined = root.getFieldByLabel('ScriptUserDefine').getValue() || '';
    }
    if(root.hasField('SkillList')){
      this.skillList = root.getFieldByLabel('SkillList').getChildStructs().map( (struct) => {
        return struct.getFieldByLabel('Rank').getValue() || 0;
      }) || [0, 0, 0, 0, 0, 0, 0, 0];
    }
    if(root.hasField('SoundSetFile')){
      this.soundSetFile = root.getFieldByLabel('SoundSetFile').getValue() || 0;
    }
    if(root.hasField('SpecAbilityList')){
      this.specAbilityList = root.getFieldByLabel('SpecAbilityList').getChildStructs().map( (struct) => {
        const KnownListEntry: SpecialAbilityEntry = {
          spell: struct.getFieldByLabel('Spell').getValue() || 0,
          spellCasterLevel: struct.getFieldByLabel('SpellCasterLevel').getValue() || 0,
          spellFlags: struct.getFieldByLabel('SpellFlags').getValue() || 0,
        };
        return KnownListEntry;
      }) || [];
    }
    if(root.hasField('Str')){
      this.str = root.getFieldByLabel('Str').getValue() || 10;
    }
    if(root.hasField('Subrace')){
      this.subrace = root.getFieldByLabel('Subrace').getValue() || '';
    }
    if(root.hasField('SubraceIndex')){
      this.subraceIndex = root.getFieldByLabel('SubraceIndex').getValue() || 0;
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateList')){
      // this.templateList = root.getFieldByLabel('TemplateList').getChildStructs().map( (struct) => {
      //   return struct.getFieldByLabel('Template').getValue() || '';
      // }) || [];
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
    if(root.hasField('TextureVar')){
      this.textureVar = root.getFieldByLabel('TextureVar').getValue() || 1;
    }
    if(root.hasField('WalkRate')){
      this.walkRate = root.getFieldByLabel('WalkRate').getValue() || 7;
    }
    if(root.hasField('Wis')){
      this.wis = root.getFieldByLabel('Wis').getValue() || 10;
    }
    if(root.hasField('fortbonus')){
      this.fortbonus = root.getFieldByLabel('fortbonus').getValue() || 0;
    }
    if(root.hasField('refbonus')){
      this.refbonus = root.getFieldByLabel('refbonus').getValue() || 0;
    }
    if(root.hasField('willbonus')){
      this.willbonus = root.getFieldByLabel('willbonus').getValue() || 0;
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTC ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Appearance_Type', this.appearanceType) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'BodyBag', this.bodyBag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'BodyVariation', this.bodyVariation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Cha', this.cha) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ChallengeRating', this.challengeRating) );
    const classList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'ClassList');
    if(classList){
      this.classList.forEach(classEntry => {
        const classStruct = new KotOR.GFFStruct(2);
        classStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Class', classEntry.class) );
        classStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ClassLevel', classEntry.level) );
        const knownList0 = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'KnownList0');
        classEntry.knownList0.forEach(knownSpellEntry => {
          const knownSpellStruct = new KotOR.GFFStruct(4);
          knownSpellStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Spell', knownSpellEntry.spell) );
          knownSpellStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SpellMetaMagic', knownSpellEntry.spellMetaMagic) );
          knownSpellStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SpellFlags', knownSpellEntry.spellFlags) );
          knownList0.addChildStruct(knownSpellStruct);
        });
        classStruct.addField( knownList0 );
        classList.addChildStruct(classStruct);
      });
    }
    root.addField( classList );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Con', this.con) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Conversation', this.conversation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'CurrentForce', this.currentForce) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'CurrentHitPoints', this.currentHitPoints) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Deity', this.deity) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Dex', this.dex) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Disarmable', this.disarmable) );
    const equipItemList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Equip_ItemList');
    if(this.slotArmor){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.ARMOR);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotArmor) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotBelt){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.BELT);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotBelt) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotClaw1){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.CLAW1);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotClaw1) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotClaw2){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.CLAW2);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotClaw2) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotClaw3){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.CLAW3);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotClaw3) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotHide){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.HIDE);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotHide) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotLeftArmband){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.LEFTARMBAND);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotLeftArmband) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotRightArmband){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.RIGHTARMBAND);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotRightArmband) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotLeftHand){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.LEFTHAND);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotLeftHand) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotRightHand){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.RIGHTHAND);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotRightHand) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotRightHand2){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.RIGHTHAND2);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotRightHand2) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotLeftHand2){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.LEFTHAND2);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotLeftHand2) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotImplant){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.IMPLANT);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotImplant) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotHead){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.HEAD);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotHead) );
      equipItemList.addChildStruct(equipItem);
    }
    if(this.slotArms){
      const equipItem = new KotOR.GFFStruct(KotOR.ModuleCreatureArmorSlot.ARMS);
      equipItem.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'EquippedRes', this.slotArms) );
      equipItemList.addChildStruct(equipItem);
    }
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Equip_ItemList', equipItemList) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'FactionID', this.factionID) );
    const featList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'FeatList');
    if(featList){
      this.featList.forEach(feat => {
        const featStruct = new KotOR.GFFStruct(1);
        featStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Feat', feat) );
        featList.addChildStruct(featStruct);
      });
    }
    root.addField( featList );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'FirstName', this.firstName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'ForcePoints', this.forcePoints) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Gender', this.gender) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'GoodEvil', this.goodEvil) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'HitPoints', this.hitPoints) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Int', this.int) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Interruptable', this.interruptable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'IsPC', this.isPC ? 1 : 0) );
    const itemList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'ItemList');
    if(itemList){
      this.itemList.forEach((item, index) => {
        const itemStruct = new KotOR.GFFStruct(index);
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'InventoryRes', item) );
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Repos_PosX', 0) );
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Repos_PosY', index) );
        itemList.addChildStruct(itemStruct);
      });
    }
    root.addField( itemList );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LastName', this.lastName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LawfulChaotic', this.lawfulChaotic) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'MaxHitPoints', this.maxHitPoints) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Min1HP', this.min1HP ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NaturalAC', this.naturalAC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NoPermDeath', this.noPermDeath ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'NotReorienting', this.notReorienting ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PalletID', this.palletID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PartyInteract', this.partyInteract ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PerceptionRange', this.perceptionRange) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Phenotype', this.phenotype) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Plot', this.plot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Race', this.race) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptAttacked', this.scriptAttacked) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptDamaged', this.scriptDamaged) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptDeath', this.scriptDeath) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptDialogu', this.scriptDialogu) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptDisturbed', this.scriptDisturbed) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptEndDialogue', this.scriptEndDialogue) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptEndRound', this.scriptEndRound) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptHeartbeat', this.scriptHeartbeat) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnBlocked', this.scriptOnBlocked) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnNotice', this.scriptOnNotice) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptRested', this.scriptRested) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptSpawn', this.scriptSpawn) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptSpellAt', this.scriptSpellAt) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptUserDefine', this.scriptUserDefined) );
    const skillList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SkillList');
    if(skillList){
      this.skillList.forEach((skill) => {
        const skillStruct = new KotOR.GFFStruct(0);
        skillStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Rank', skill) );
        skillList.addChildStruct(skillStruct);
      });
    }
    root.addField( skillList );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'SoundSetFile', this.soundSetFile) );
    const specAbilityList = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'SpecAbilityList');
    if(specAbilityList){
      this.specAbilityList.forEach((specAbility) => {
        const specAbilityStruct = new KotOR.GFFStruct(4);
        specAbilityStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Spell', specAbility.spell) );
        specAbilityStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SpellCasterLevel', specAbility.spellCasterLevel) );
        specAbilityStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SpellFlags', specAbility.spellFlags) );
        specAbilityList.addChildStruct(specAbilityStruct);
      });
    }
    root.addField( specAbilityList );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Str', this.str) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Subrace', this.subrace) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SubraceIndex', this.subraceIndex) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'TemplateList') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TextureVar', this.textureVar) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'WalkRate', this.walkRate) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Wis', this.wis) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'fortbonus', this.fortbonus) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'refbonus', this.refbonus) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.SHORT, 'willbonus', this.willbonus) );
    return this.blueprint;
  }

  setGITInstance(instance: KotOR.GFFStruct){
    this.templateResRef = instance.getFieldByLabel('TemplateResRef').getValue() as string;
    const xOrientation = instance.getFieldByLabel('XOrientation').getValue() as number;
    const yOrientation = instance.getFieldByLabel('YOrientation').getValue() as number;
    this.container.rotation.z = -Math.atan2(yOrientation, xOrientation);
    this.container.position.x = instance.getFieldByLabel('XPosition').getValue() as number;
    this.container.position.y = instance.getFieldByLabel('YPosition').getValue() as number;
    this.container.position.z = instance.getFieldByLabel('ZPosition').getValue() as number;
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(4);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', Math.cos(this.container.rotation.z + (Math.PI/2))));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.container.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', Math.sin(this.container.rotation.z + (Math.PI/2))));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.container.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.container.position.z));
    return instance;
  }
}

