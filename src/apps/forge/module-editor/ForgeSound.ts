import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

const PRIORITY_LOOPING_AREAWIDE_AMBIENTS = 4;
const PRIORITY_POSITIONAL_AMBIENTS = 5;
const PRIORITY_SINGLE_SHOT_GLOBAL = 21;
const PRIORITY_SINGLE_SHOT_POSITIONAL = 22;

export class ForgeSound extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.uts;
  generatedType: number = 0;

  //Blueprint Properties
  active: boolean = false;
  comment: string = '';
  continuous: boolean = false;
  elevation: number = 0;
  hours: number = 0;
  interval: number = 0;
  intervalVariation: number = 0;
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
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
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
    if(property === 'looping' || property === 'positional'){
      this.calculatePriority();
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
    if(root.hasField('Continuous')){
      this.continuous = root.getFieldByLabel('Continuous').getValue() || false;
    }
    if(root.hasField('Elevation')){
      this.elevation = root.getFieldByLabel('Elevation').getValue() || 0;
    }
    if(root.hasField('Hours')){
      this.hours = root.getFieldByLabel('Hours').getValue() || 0;
    }
    if(root.hasField('Interval')){
      this.interval = root.getFieldByLabel('Interval').getValue() || 0;
    }
    if(root.hasField('IntervalVrtn')){
      this.intervalVariation = root.getFieldByLabel('IntervalVrtn').getValue() || 0;
    }
    if(root.hasField('LocName')){
      this.locName = root.getFieldByLabel('LocName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Looping')){
      this.looping = root.getFieldByLabel('Looping').getValue() || false;
    }
    if(root.hasField('MaxDistance')){
      this.maxDistance = root.getFieldByLabel('MaxDistance').getValue() || 0;
    }
    if(root.hasField('MinDistance')){
      this.minDistance = root.getFieldByLabel('MinDistance').getValue() || 0;
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('PitchVariation')){
      this.pitchVariation = root.getFieldByLabel('PitchVariation').getValue() || 0;
    }
    if(root.hasField('Positional')){
      this.positional = root.getFieldByLabel('Positional').getValue() || false;
    }
    if(root.hasField('Priority')){
      this.priority = root.getFieldByLabel('Priority').getValue() || 0;
    }
    if(root.hasField('Random')){
      this.random = root.getFieldByLabel('Random').getValue() || false;
    }
    if(root.hasField('RandomPosition')){
      this.randomPosition = root.getFieldByLabel('RandomPosition').getValue() || false;
    }
    if(root.hasField('RandomRangeX')){
      this.randomRangeX = root.getFieldByLabel('RandomRangeX').getValue() || 0;
    }
    if(root.hasField('RandomRangeY')){
      this.randomRangeY = root.getFieldByLabel('RandomRangeY').getValue() || 0;
    }
    if(root.hasField('Sounds')){
      const sounds = root.getFieldByLabel('Sounds').getChildStructs();
      this.soundResRefs = [];
      for(let i = 0; i < sounds.length; i++){
        this.soundResRefs.push(sounds[i].getFieldByLabel('Sound').getValue());
      }
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
    if(root.hasField('Times')){
      this.times = root.getFieldByLabel('Times').getValue() || 0;
    }
    if(root.hasField('Volume')){
      this.volume = root.getFieldByLabel('Volume').getValue() || 0;
    }
    if(root.hasField('VolumeVrtn')){
      this.volumeVariation = root.getFieldByLabel('VolumeVrtn').getValue() || 0;
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
    this.generatedType = strt.getFieldByLabel('GeneratedType').getValue() as number;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.position.x = strt.getFieldByLabel('X').getValue() as number;
    this.position.y = strt.getFieldByLabel('Y').getValue() as number;
    this.position.z = strt.getFieldByLabel('Z').getValue() as number;
  }

}