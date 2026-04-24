import * as KotOR from '@/apps/forge/KotOR';

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

  constructor(struct?: KotOR.GFFStruct) {
    if (struct) {
      this.loadFromStruct(struct);
    } else {
      this.template = new KotOR.GFFObject();
    }
  }

  loadFromStruct(struct: KotOR.GFFStruct) {
    this.template = KotOR.GFFObject.FromStruct(struct);

    // Load basic properties
    if (struct.hasField('Bullet_Model')) {
      this.bulletModel = struct.getStringByLabel('Bullet_Model');
    }
    if (struct.hasField('Collision_Sound')) {
      this.collisionSound = struct.getStringByLabel('Collision_Sound');
    }
    if (struct.hasField('Damage')) {
      this.damage = struct.getNumberByLabel('Damage');
    }
    if (struct.hasField('Lifespan')) {
      this.lifespan = struct.getNumberByLabel('Lifespan');
    }
    if (struct.hasField('Rate_Of_Fire')) {
      this.rateOfFire = struct.getNumberByLabel('Rate_Of_Fire');
    }
    if (struct.hasField('Speed')) {
      this.speed = struct.getNumberByLabel('Speed');
    }
    if (struct.hasField('Target_Type')) {
      this.targetType = struct.getNumberByLabel('Target_Type');
    }
  }

  exportToGFFStruct(): KotOR.GFFStruct {
    const bulletStruct = new KotOR.GFFStruct();

    // Basic bullet fields
    if (this.bulletModel !== undefined && this.bulletModel !== '') {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Bullet_Model', this.bulletModel));
    }
    if (this.collisionSound !== undefined && this.collisionSound !== '') {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Collision_Sound', this.collisionSound));
    }
    if (this.damage !== undefined) {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Damage', this.damage));
    }
    if (this.lifespan !== undefined) {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Lifespan', this.lifespan));
    }
    if (this.rateOfFire !== undefined) {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Rate_Of_Fire', this.rateOfFire));
    }
    if (this.speed !== undefined) {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Speed', this.speed));
    }
    if (this.targetType !== undefined) {
      bulletStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Target_Type', this.targetType));
    }

    return bulletStruct;
  }
}
