import * as KotOR from "@/apps/forge/KotOR";
import { IModelListItem } from "@/interface/module/minigame/IModelListItem";
import { ForgeMGGunBank } from "@/apps/forge/module-editor/ForgeMGGunBank";

export class ForgeMGEnemy {
  // Basic properties
  accel_secs: number = 0;
  bump_damage: number = 0;
  cameraName: string = '';
  cameraRotate: number = 0;
  hit_points: number = 0;
  invince_period: number = 0;
  max_hps: number = 0;
  maximum_speed: number = 0;
  minimum_speed: number = 0;
  num_loops: number = -1;
  sphere_radius: number = 0;
  trackName: string = '';
  trigger: number = 0;

  // Complex properties
  modelProps: IModelListItem[] = [];
  gunBanks: ForgeMGGunBank[] = [];
  
  // Scripts - stored as resref strings
  scripts: {[key: string]: string} = {};

  // Sounds
  deathSound: string = '';
  engineSound: string = '';

  // Template reference for additional data
  template: KotOR.GFFObject;

  constructor(struct?: KotOR.GFFStruct){
    if(struct){
      this.loadFromStruct(struct);
    } else {
      this.template = new KotOR.GFFObject();
    }
  }

  loadFromStruct(struct: KotOR.GFFStruct){
    this.template = KotOR.GFFObject.FromStruct(struct);

    // Load basic properties
    if(struct.hasField('Accel_Secs')){
      this.accel_secs = struct.getNumberByLabel('Accel_Secs');
    }
    if(struct.hasField('Bump_Damage')){
      this.bump_damage = struct.getNumberByLabel('Bump_Damage');
    }
    if(struct.hasField('Camera')){
      this.cameraName = struct.getStringByLabel('Camera');
    }
    if(struct.hasField('CameraRotate')){
      this.cameraRotate = struct.getNumberByLabel('CameraRotate');
    }
    if(struct.hasField('Hit_Points')){
      this.hit_points = struct.getNumberByLabel('Hit_Points');
    }
    if(struct.hasField('Invince_Period')){
      this.invince_period = struct.getNumberByLabel('Invince_Period');
    }
    if(struct.hasField('Max_HPs')){
      this.max_hps = struct.getNumberByLabel('Max_HPs');
    }
    if(struct.hasField('Maximum_Speed')){
      this.maximum_speed = struct.getNumberByLabel('Maximum_Speed');
    }
    if(struct.hasField('Minimum_Speed')){
      this.minimum_speed = struct.getNumberByLabel('Minimum_Speed');
    }
    if(struct.hasField('Num_Loops')){
      this.num_loops = struct.getNumberByLabel('Num_Loops');
    }
    if(struct.hasField('Sphere_Radius')){
      this.sphere_radius = struct.getNumberByLabel('Sphere_Radius');
    }
    if(struct.hasField('Track')){
      this.trackName = struct.getStringByLabel('Track');
    }
    if(struct.hasField('Trigger')){
      this.trigger = struct.getNumberByLabel('Trigger');
    }

    // Load Models list
    if(struct.hasField('Models')){
      const models = struct.getFieldByLabel('Models').getChildStructs();
      for(let i = 0; i < models.length; i++){
        const modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.getStringByLabel('Model'),
          rotating: modelStruct.getBooleanByLabel('RotatingModel')
        });
      }
    }

    // Load Gun_Banks list
    if(struct.hasField('Gun_Banks')){
      const gun_banks = struct.getFieldByLabel('Gun_Banks').getChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        this.gunBanks.push(
          new ForgeMGGunBank(gun_banks[i])
        );
      }
    }

    // Load Scripts struct
    if(struct.hasField('Scripts')){
      const scriptsNode = struct.getFieldByLabel('Scripts').getFieldStruct();
      if(scriptsNode){
        const scriptKeys = [
          'OnAnimEvent',
          'OnCreate',
          'OnDamage',
          'OnDeath',
          'OnFire',
          'OnHeartbeat',
          'OnHitBullet',
          'OnHitFollower',
          'OnHitObstacle',
          'OnTrackLoop',
        ];

        for(const scriptKey of scriptKeys){
          if(scriptsNode.hasField(scriptKey)){
            const resRef = scriptsNode.getStringByLabel(scriptKey);
            if(resRef){
              this.scripts[scriptKey] = resRef;
            }
          }
        }
      }
    }

    // Load Sounds struct
    if(struct.hasField('Sounds')){
      const soundsNode = struct.getFieldByLabel('Sounds').getFieldStruct();
      if(soundsNode){
        if(soundsNode.hasField('Death')){
          this.deathSound = soundsNode.getStringByLabel('Death');
        }
        if(soundsNode.hasField('Engine')){
          this.engineSound = soundsNode.getStringByLabel('Engine');
        }
      }
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const enemyStruct = new KotOR.GFFStruct(0);

    // Basic enemy fields
    if(this.accel_secs !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Accel_Secs', this.accel_secs));
    }
    if(this.bump_damage !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Bump_Damage', this.bump_damage));
    }
    if(this.cameraName !== undefined && this.cameraName !== ''){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Camera', this.cameraName));
    }
    if(this.cameraRotate !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'CameraRotate', this.cameraRotate));
    }
    if(this.hit_points !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Hit_Points', this.hit_points));
    }
    if(this.invince_period !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Invince_Period', this.invince_period));
    }
    if(this.max_hps !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Max_HPs', this.max_hps));
    }
    if(this.maximum_speed !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Maximum_Speed', this.maximum_speed));
    }
    if(this.minimum_speed !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Minimum_Speed', this.minimum_speed));
    }
    if(this.num_loops !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'Num_Loops', this.num_loops));
    }
    if(this.sphere_radius !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Sphere_Radius', this.sphere_radius));
    }
    if(this.trackName !== undefined && this.trackName !== ''){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Track', this.trackName));
    }
    if(this.trigger !== undefined){
      enemyStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Trigger', this.trigger));
    }

    // Gun_Banks list
    const gunBanksField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Gun_Banks');
    for(let i = 0; i < this.gunBanks.length; i++){
      const gunBank = this.gunBanks[i];
      const gunBankStruct = gunBank.exportToGFFStruct();
      gunBanksField.addChildStruct(gunBankStruct);
    }
    enemyStruct.addField(gunBanksField);

    // Models list
    const modelsField = new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Models');
    for(let i = 0; i < this.modelProps.length; i++){
      const modelProp = this.modelProps[i];
      const modelStruct = new KotOR.GFFStruct(0);
      modelStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Model', modelProp.model || ''));
      modelStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'RotatingModel', modelProp.rotating ? 1 : 0));
      modelsField.addChildStruct(modelStruct);
    }
    enemyStruct.addField(modelsField);

    // Scripts struct
    const scriptsField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Scripts');
    const scriptsStruct = new KotOR.GFFStruct(0);
    
    const scriptKeys = [
      'OnAnimEvent',
      'OnCreate',
      'OnDamage',
      'OnDeath',
      'OnFire',
      'OnHeartbeat',
      'OnHitBullet',
      'OnHitFollower',
      'OnHitObstacle',
      'OnTrackLoop',
    ];

    for(const scriptKey of scriptKeys){
      const resref = this.scripts[scriptKey] || '';
      scriptsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, scriptKey, resref));
    }
    
    scriptsField.addChildStruct(scriptsStruct);
    enemyStruct.addField(scriptsField);

    // Sounds struct
    const soundsField = new KotOR.GFFField(KotOR.GFFDataType.STRUCT, 'Sounds');
    const soundsStruct = new KotOR.GFFStruct(0);
    soundsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Death', this.deathSound || ''));
    soundsStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Engine', this.engineSound || ''));
    soundsField.addChildStruct(soundsStruct);
    enemyStruct.addField(soundsField);

    return enemyStruct;
  }
}

