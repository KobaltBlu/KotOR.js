/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleSound class.
 */

class ModuleSound extends ModuleObject {

  constructor ( gff = null, audioEngine = null ) {

    super();

    this.template = gff;
    this.audioEngine = audioEngine;

  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      //console.log('ModuleSound.Load',this.getTemplateResRef())
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: UTSObject.ResType,
        onLoad: (gff) => {

          this.template.Merge(gff);

          if(onLoad != null)
            onLoad(this.template);
        },
        onFail: () => {
          console.error('Failed to load sound template');
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      if(onLoad != null)
        onLoad(this.template);
    }
  }

  LoadModel (onLoad = null) {

    let mdlLoader = new THREE.MDLLoader();

    if(this.getRandom()){
      mdlLoader.load({
        file: 'gi_sound_rndm',
        onLoad: (mesh) => {
          this.mesh = mesh;
          if(onLoad != null)
            onLoad(this.mesh);
        }
      });
    }else{
      if(this.getPositional()){
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

  getActive(){
    if(this.template.RootNode.HasField('Active')){
      return this.template.RootNode.GetFieldByLabel('Active').GetValue() ? true : false;
    }
    return false;
  }

  getLooping(){
    if(this.template.RootNode.HasField('Looping')){
      return this.template.RootNode.GetFieldByLabel('Looping').GetValue() ? true : false;
    }
    return false;
  }

  getRandom(){
    if(this.template.RootNode.HasField('Random')){
      return this.template.RootNode.GetFieldByLabel('Random').GetValue() ? true : false;
    }
    return false;
  }

  getRandomPosition(){
    if(this.template.RootNode.HasField('RandomPosition')){
      return this.template.RootNode.GetFieldByLabel('RandomPosition').GetValue() ? true : false;
    }
    return false;
  }

  getInterval(){
    if(this.template.RootNode.HasField('Interval')){
      return this.template.RootNode.GetFieldByLabel('Interval').GetValue();
    }
    return 0;
  }

  getInternalVrtn(){
    if(this.template.RootNode.HasField('IntervalVrtn')){
      return this.template.RootNode.GetFieldByLabel('IntervalVrtn').GetValue();
    }
    return 0;
  }

  getMaxDistance(){
    if(this.template.RootNode.HasField('MaxDistance')){
      return this.template.RootNode.GetFieldByLabel('MaxDistance').GetValue();
    }
    return 0;
  }

  getVolume(){
    if(this.template.RootNode.HasField('Volume')){
      return this.template.RootNode.GetFieldByLabel('Volume').GetValue();
    }
    return 0;
  }

  getPositional(){
    if(this.template.RootNode.HasField('Positional')){
      return this.template.RootNode.GetFieldByLabel('Positional').GetValue() ? true : false;
    }
    return false;
  }

  getSounds(){
    if(this.template.RootNode.HasField('Sounds')){
      return this.template.RootNode.GetFieldByLabel('Sounds').GetChildStructs();
    }
    return [];
  }


  LoadSound(onLoad = null){

    let template = {
      sounds: [],//this.gff.GetFieldByLabel('Sounds').GetChildStructs(),
      isActive: this.getActive(),
      isLooping: this.getLooping(),
      isRandom: this.getRandom(),
      isRandomPosition: this.getRandomPosition(),
      interval: this.getInterval(),
      intervalVariation: this.getInternalVrtn(),
      maxDistance: this.getMaxDistance(),
      volume: this.getVolume(),
      positional: this.getPositional()
    };

    let snds = this.getSounds();
    for(let i = 0; i < snds.length; i++){
      template.sounds.push(snds[i].GetFieldByLabel('Sound').GetValue());
    }

    //console.log('UTSObject', template);

    this.emitter = new AudioEmitter({
      engine: this.audioEngine,
      props: this,
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

  /*LoadTemplate ( onLoad = null ){

    if(this.props.TemplateResRef != ''){

      UTSObject.FromTemplate(this.props.TemplateResRef, (uts) => {
        this.template = uts;
        this.template.moduleObject = this;
        this.template.audioEngine = this.audioEngine;
        if(onLoad != null)
          onLoad(uts);

      });

    }

  }*/

}

module.exports = ModuleSound;
