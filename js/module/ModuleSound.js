/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleSound class.
 */

class ModuleSound extends ModuleObject {

  constructor ( gff = null, audioEngine = null ) {

    super(gff);

    this.template = gff;
    this.audioEngine = audioEngine;

    this.active = 0;
    this.looping = 0;
    this.random = 0;
    this.randomPosition = 0;
    this.interval = 0;
    this.intervalVariation = 0;
    this.maxDistance = 0;
    this.volume = 0;
    this.positional = 0;
    this.sounds = [];

  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      //console.log('ModuleSound.Load',this.getTemplateResRef())
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.uts,
        onLoad: (gff) => {

          this.template.Merge(gff);
          this.InitProperties();

          if(onLoad != null)
            onLoad(this.template);
        },
        onFail: () => {
          console.error('Failed to load sound template');
        }
      });

    }else{
      this.InitProperties();
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
    return this.active ? true : false;
  }

  getLooping(){
    return this.looping ? true : false;
  }

  getRandom(){
    return this.random ? true : false;
  }

  getRandomPosition(){
    return this.randomPosition ? true : false;
  }

  getInterval(){
    return this.interval;
  }

  getInternalVrtn(){
    return this.intervalVariation;
  }

  getMaxDistance(){
    return this.maxDistance;
  }

  getVolume(){
    return this.volume;
  }

  getPositional(){
    return this.positional ? true : false;
  }

  getSounds(){
    return this.sounds;
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

  InitProperties(){
        
    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

    if(this.template.RootNode.HasField('Active'))
      this.active = this.template.GetFieldByLabel('Active').GetValue()

    if(this.template.RootNode.HasField('Looping'))
      this.looping = this.template.GetFieldByLabel('Looping').GetValue();

    if(this.template.RootNode.HasField('Random'))
      this.random = this.template.GetFieldByLabel('Random').GetValue();

    if(this.template.RootNode.HasField('RandomPosition'))
      this.randomPosition = this.template.GetFieldByLabel('RandomPosition').GetValue();

    if(this.template.RootNode.HasField('Interval'))
      this.interval = this.template.GetFieldByLabel('Interval').GetValue();

    if(this.template.RootNode.HasField('InternalVrtn'))
      this.intervalVariation = this.template.GetFieldByLabel('InternalVrtn').GetValue();

    if(this.template.RootNode.HasField('MaxDistance'))
      this.maxDistance = this.template.GetFieldByLabel('MaxDistance').GetValue();

    if(this.template.RootNode.HasField('Volume'))
      this.volume = this.template.GetFieldByLabel('Volume').GetValue();

    if(this.template.RootNode.HasField('Positional'))
      this.positional = this.template.GetFieldByLabel('Positional').GetValue();

    if(this.template.RootNode.HasField('Sounds'))
      this.sounds = this.template.GetFieldByLabel('Sounds').GetChildStructs();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('SWVarTable')){
      let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

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
  
  toToolsetInstance(){
    let instance = new Struct(6);

    instance.AddField(
      new Field(GFFDataTypes.DWORD, 'GeneratedType', 0)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );
    return instance;
  }

}

module.exports = ModuleSound;
