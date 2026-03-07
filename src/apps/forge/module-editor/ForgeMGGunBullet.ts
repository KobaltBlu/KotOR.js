import * as KotOR from "../KotOR";

export class ForgeMGGunBullet {
  // Basic properties
  bulletModel: string = '';
  collisionSound: string = '';
  damage: number = 0;
  lifespan: number = 0;
  rateOfFire: number = 0;
  speed: number = 0;
  targetType: number = 0;

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
    if(struct.hasField('Bullet_Model')){
      this.bulletModel = struct.getFieldByLabel('Bullet_Model').getValue();
    }
    if(struct.hasField('Collision_Sound')){
      this.collisionSound = struct.getFieldByLabel('Collision_Sound').getValue();
    }
    if(struct.hasField('Damage')){
      this.damage = struct.getFieldByLabel('Damage').getValue();
    }
    if(struct.hasField('Lifespan')){
      this.lifespan = struct.getFieldByLabel('Lifespan').getValue();
    }
    if(struct.hasField('Rate_Of_Fire')){
      this.rateOfFire = struct.getFieldByLabel('Rate_Of_Fire').getValue();
    }
    if(struct.hasField('Speed')){
      this.speed = struct.getFieldByLabel('Speed').getValue();
    }
    if(struct.hasField('Target_Type')){
      this.targetType = struct.getFieldByLabel('Target_Type').getValue();
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const bulletStruct = new KotOR.GFFStruct();

    // Basic bullet fields
    if(this.bulletModel !== undefined && this.bulletModel !== ''){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Bullet_Model', this.bulletModel));
    }
    if(this.collisionSound !== undefined && this.collisionSound !== ''){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Collision_Sound', this.collisionSound));
    }
    if(this.damage !== undefined){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Damage', this.damage));
    }
    if(this.lifespan !== undefined){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Lifespan', this.lifespan));
    }
    if(this.rateOfFire !== undefined){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Rate_Of_Fire', this.rateOfFire));
    }
    if(this.speed !== undefined){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Speed', this.speed));
    }
    if(this.targetType !== undefined){
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Target_Type', this.targetType));
    }

    return bulletStruct;
  }
}

