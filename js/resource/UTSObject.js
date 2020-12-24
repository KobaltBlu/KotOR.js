/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTSObject class.
 */

class UTSObject {

  constructor(gff = null){
    this.sound = null;
    this.mesh = null
    this.moduleObject = null;
    this.audioEngine = null;
    this.gff = gff;
    this.resType = UTSObject.ResType;
  }

  LoadModel (onLoad = null) {

    let mdlLoader = new THREE.MDLLoader();

    if(this.gff.GetFieldByLabel('RandomPosition').Value == 1){
      mdlLoader.load({
        file: 'gi_sound_rndm',
        onLoad: (mesh) => {
          this.mesh = mesh;
          if(onLoad != null)
            onLoad(this.mesh);
        }
      });
    }else{
      if(this.gff.GetFieldByLabel('Positional').Value == 1){
        mdlLoader.load({
          file: 'gi_sound_pos',
          onLoad: (mesh) => {
            this.mesh = mesh;
            if(onLoad != null)
              onLoad(this.mesh);
          }
        });
      }else{
        mdlLoader.load({
          file: 'gi_sound_area',
          onLoad: (mesh) => {
            this.mesh = mesh;
            if(onLoad != null)
              onLoad(this.mesh);
          }
        });
      }
    }



  }

  LoadSound(onLoad = null){

    let template = {
      sounds: [],//this.gff.GetFieldByLabel('Sounds').GetChildStructs(),
      isActive: this.gff.GetFieldByLabel('Active').GetValue() == 1 ? true : false,
      isLooping: this.gff.GetFieldByLabel('Looping').GetValue() == 1 ? true : false,
      isRandom: this.gff.GetFieldByLabel('Random').GetValue() == 1 ? true : false,
      isRandomPosition: this.gff.GetFieldByLabel('RandomPosition').GetValue() == 1 ? true : false,
      interval: this.gff.GetFieldByLabel('Interval').GetValue(),
      intervalVariation: this.gff.GetFieldByLabel('IntervalVrtn').GetValue(),
      maxDistance: this.gff.GetFieldByLabel('MaxDistance').GetValue(),
      volume: this.gff.GetFieldByLabel('Volume').GetValue(),
      positional: this.gff.GetFieldByLabel('Positional').GetValue()
    };

    let snds = this.gff.GetFieldByLabel('Sounds').GetChildStructs();
    for(let i = 0; i < snds.length; i++){
      template.sounds.push(snds[i].GetFieldByLabel('Sound').GetValue());
    }

    console.log('UTSObject', template);

    this.emitter = new AudioEmitter({
      engine: this.audioEngine,
      props: this.moduleObject.props,
      template: template,
      onLoad: () => {
        if(onLoad != null)
          onLoad();
      },
      onError: () => {
        if(onLoad != null)
          onLoad();
      }
    });

    this.audioEngine.AddEmitter(this.emitter);

  }

  static FromTemplate(ResRef = null, onLoad = null){

    let uts = new UTSObject();

    if(ResRef != null){

      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTSObject.ResType,
        onLoad: (gff) => {
          console.log( 'UTSObject load complete', gff );
          uts.gff = gff;
          if(onLoad != null)
            onLoad(uts);
        }
      });

    }

  }

}

UTSObject.ResType = ResourceTypes['uts'];

module.exports = UTSObject;
