import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import { CExoLocString, ResourceTypes } from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

const PRIORITY_LOOPING_AREAWIDE_AMBIENTS = 4;
const PRIORITY_POSITIONAL_AMBIENTS = 5;
const PRIORITY_SINGLE_SHOT_GLOBAL = 21;
const PRIORITY_SINGLE_SHOT_POSITIONAL = 22;

export class ForgeSound extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: number = ResourceTypes.uts;
  generatedType: number = 0;

  //Blueprint Properties
  active: boolean = false;
  comment: string = '';
  continuous: boolean = false;
  elevation: number = 0;
  hours: number = 0;
  interval: number = 0;
  intervalVariation: number = 0;
  locName: KotOR.CExoLocString = new CExoLocString();
  looping: boolean = false;
  maxDistance: number = 0;
  minDistance: number = 0;
  pitchVariation: number = 0;
  positional: boolean = false;
  priority: number = 0;
  random: boolean = false;
  randomPosition: boolean = false;
  randomRangeX: number = 0;
  randomRangeY: number = 0;
  soundResRefs: string[] = [];
  tag: string = '';
  times: number = 0;
  volume: number = 0;
  volumeVariation: number = 0;
  paletteID: number = 0;

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    const onPropChange: EventListenerCallback = (...args: unknown[]) => {
      this.onPropertyChange(args[0] as string, args[1] as unknown, args[2] as unknown);
    };
    this.addEventListener('onPropertyChange', onPropChange);
  }

  onPropertyChange(property: string, newValue: unknown, oldValue: unknown){
    if(property === 'looping' || property === 'positional'){
      this.calculatePriority();
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

    if(root.hasField('Active')){
      this.active = root.getBooleanByLabel('Active');
    }
    if(root.hasField('Comment')){
      this.comment = root.getStringByLabel('Comment');
    }
    if(root.hasField('Continuous')){
      this.continuous = root.getBooleanByLabel('Continuous');
    }
    if(root.hasField('Elevation')){
      this.elevation = root.getNumberByLabel('Elevation');
    }
    if(root.hasField('Hours')){
      this.hours = root.getNumberByLabel('Hours');
    }
    if(root.hasField('Interval')){
      this.interval = root.getNumberByLabel('Interval');
    }
    if(root.hasField('IntervalVrtn')){
      this.intervalVariation = root.getNumberByLabel('IntervalVrtn');
    }
    if(root.hasField('LocName')){
      this.locName = root.getFieldByLabel('LocName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Looping')){
      this.looping = root.getBooleanByLabel('Looping');
    }
    if(root.hasField('MaxDistance')){
      this.maxDistance = root.getNumberByLabel('MaxDistance');
    }
    if(root.hasField('MinDistance')){
      this.minDistance = root.getNumberByLabel('MinDistance');
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getNumberByLabel('PaletteID');
    }
    if(root.hasField('PitchVariation')){
      this.pitchVariation = root.getNumberByLabel('PitchVariation');
    }
    if(root.hasField('Positional')){
      this.positional = root.getBooleanByLabel('Positional');
    }
    if(root.hasField('Priority')){
      this.priority = root.getNumberByLabel('Priority');
    }
    if(root.hasField('Random')){
      this.random = root.getBooleanByLabel('Random');
    }
    if(root.hasField('RandomPosition')){
      this.randomPosition = root.getBooleanByLabel('RandomPosition');
    }
    if(root.hasField('RandomRangeX')){
      this.randomRangeX = root.getNumberByLabel('RandomRangeX');
    }
    if(root.hasField('RandomRangeY')){
      this.randomRangeY = root.getNumberByLabel('RandomRangeY');
    }
    if(root.hasField('Sounds')){
      const sounds = root.getFieldByLabel('Sounds').getChildStructs();
      this.soundResRefs = [];
      for(let i = 0; i < sounds.length; i++){
        this.soundResRefs.push(sounds[i].getStringByLabel('Sound'));
      }
    }
    if(root.hasField('Tag')){
      this.tag = root.getStringByLabel('Tag');
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getStringByLabel('TemplateResRef');
    }
    if(root.hasField('Times')){
      this.times = root.getNumberByLabel('Times');
    }
    if(root.hasField('Volume')){
      this.volume = root.getNumberByLabel('Volume');
    }
    if(root.hasField('VolumeVrtn')){
      this.volumeVariation = root.getNumberByLabel('VolumeVrtn');
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.calculatePriority();
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTS ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Active', this.active ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Continuous', this.continuous ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Elevation', this.elevation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Hours', this.hours) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Interval', this.interval) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'IntervalVrtn', this.intervalVariation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Looping', this.looping ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MaxDistance', this.maxDistance) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MinDistance', this.minDistance) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PitchVariation', this.pitchVariation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Positional', this.positional ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Priority', this.priority) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Random', this.random ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'RandomPosition', this.randomPosition ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeX', this.randomRangeX) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'RandomRangeY', this.randomRangeY) );

    const soundsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Sounds');
    for(let i = 0; i < this.soundResRefs.length; i++){
      const soundStruct = new KotOR.GFFStruct();
      soundStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Sound', this.soundResRefs[i]) );
      soundsField.addChildStruct(soundStruct);
    }
    root.addField( soundsField );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Times', this.times) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Volume', this.volume) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'VolumeVrtn', this.volumeVariation) );

    return this.blueprint;
  }

  calculatePriority(){
    const isLooping = this.looping ? 1 : 0;
    const isPositional = this.positional ? 1 : 0;

    // Row 4: Looping area-wide ambients (looping=1, positional=0)
    if (isLooping === 1 && isPositional === 0) {
      this.priority = PRIORITY_LOOPING_AREAWIDE_AMBIENTS;
    }
    // Row 5: Looping positional ambients (looping=1, positional=1)
    else if (isLooping === 1 && isPositional === 1) {
      this.priority = PRIORITY_POSITIONAL_AMBIENTS;
    }
    // Row 21: Single-shot global (looping=0, positional=0)
    else if (isLooping === 0 && isPositional === 0) {
      this.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
    }
    // Row 22: Single-shot positional (looping=0, positional=1)
    else if (isLooping === 0 && isPositional === 1) {
      this.priority = PRIORITY_SINGLE_SHOT_POSITIONAL;
    }
    // Default fallback - should not happen with valid inputs
    else {
      this.priority = PRIORITY_SINGLE_SHOT_GLOBAL;
    }
  }

  async load(){
    this.updateBoundingBox();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(6);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'GeneratedType', this.generatedType));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.generatedType = strt.getNumberByLabel('GeneratedType');
    this.templateResRef = strt.getStringByLabel('TemplateResRef');
    this.position.x = strt.getNumberByLabel('X');
    this.position.y = strt.getNumberByLabel('Y');
    this.position.z = strt.getNumberByLabel('Z');
  }

}
