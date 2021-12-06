/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleEncounter class.
 */

class ModuleEncounter extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.template = gff;
    this.vertices = []; 
    this.creatureList = [];
    this.spawnPointList = [];   
    this.spawnList = [];

    this.scripts = {
      onEntered: undefined,
      onExhausted: undefined,
      onExit: undefined,
      onHeartbeat: undefined,
      onUserDefined: undefined
    };

  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.ute,
        onLoad: (gff) => {

          this.template.Merge(gff);
          this.InitProperties();
          this.LoadScripts().then( () => {
            this.buildGeometry();
            //this.initObjectsInside();
            if(onLoad != null)
              onLoad(this.template);
          });
          
        },
        onFail: () => {
          console.error('Failed to load encounter template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      //console.log('Encounter savegame')
      try{
        this.InitProperties();
        this.LoadScripts().then( () => {
          try{
            this.buildGeometry();
            //this.initObjectsInside();
            if(onLoad != null)
              onLoad(this.template);
          }catch(e){
            if(onLoad != null)
              onLoad(this.template);
          }
        });
      }catch(e){
        if(onLoad != null)
          onLoad(this.template);
      }

    }
  }

  buildGeometry(){
    let trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.mesh.position.set(this.getXPosition(), this.getYPosition(), this.getZPosition());
    this.box.setFromObject(this.mesh);
    this.box.min.z -= 100;
    this.box.max.z += 100;

    this.mesh.moduleObject = this;
    this.mesh.visible = false;
    Game.group.triggers.add(this.mesh);
  }

  getGeometry(){
    let trigGeom = new THREE.Geometry();
    trigGeom.vertices = this.vertices.slice();

    try{
      let holes = [];
      let triangles = THREE.ShapeUtils.triangulateShape ( trigGeom.vertices, holes );
      for( let i = 0; i < triangles.length; i++ ){
        trigGeom.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));
      }
    }catch(e){
      console.error('ModuleTrigger', 'Failed to generate faces', {
        trigger: this,
        error: e
      })
    }

    trigGeom.computeFaceNormals();
    trigGeom.computeVertexNormals();
    trigGeom.computeBoundingSphere();

    return trigGeom;
  }

  LoadScripts(){
    return new Promise( (resolve, reject) => {
      this.scripts.onEntered = this.template.GetFieldByLabel('OnEntered').GetValue();
      this.scripts.onExhausted = this.template.GetFieldByLabel('OnExhausted').GetValue();
      this.scripts.onExit = this.template.GetFieldByLabel('OnExit').GetValue();
      this.scripts.onHeartbeat = this.template.GetFieldByLabel('OnHeartbeat').GetValue();
      this.scripts.onUserDefined = this.template.GetFieldByLabel('OnUserDefined').GetValue();

      let keys = Object.keys(this.scripts);
      let loop = new AsyncLoop({
        array: keys,
        onLoop: async (key, asyncLoop) => {
          let _script = this.scripts[key];
          if(_script != '' && !(_script instanceof NWScriptInstance)){
            //let script = await NWScript.Load(_script);
            this.scripts[key] = await NWScript.Load(_script);
            //this.scripts[key].name = _script;
            asyncLoop.next();
          }else{
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });
    });
  }

  async InitProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }else{
        this.id = ModuleObject.COUNT++;
        while(ModuleObject.List.has(this.id)){
          this.id = ModuleObject.COUNT++;
        }
      }
      
      ModuleObject.List.set(this.id, this);

      if(this.template.RootNode.HasField('Geometry')){
        this.geometry = this.template.GetFieldByLabel('Geometry').GetChildStructs();

        //Push verticies
        for(let i = 0; i < this.geometry.length; i++){
          let tgv = this.geometry[i];
          this.vertices[i] = new THREE.Vector3( 
            tgv.GetFieldByLabel('X').GetValue(),
            tgv.GetFieldByLabel('Y').GetValue(),
            tgv.GetFieldByLabel('Z').GetValue()
          );
        }
      }

      if(this.template.RootNode.HasField('SWVarTable')){
        let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].GetFieldByLabel('Variable').GetValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
      }

      if(this.template.RootNode.HasField('CreatureList')){
        let creatures = this.template.RootNode.GetFieldByLabel('CreatureList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = creatures.length; i < len; i++){
          entry = EncounterCreatureEntry.FromStruct(creatures[i]);
          if(entry instanceof EncounterCreatureEntry){
            this.creatureList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('SpawnPointList')){
        let spawnPoints = this.template.RootNode.GetFieldByLabel('SpawnPointList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawnPoints.length; i < len; i++){
          entry = SpawnPointEntry.FromStruct(spawnPoints[i]);
          if(entry instanceof SpawnPointEntry){
            this.spawnPointList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('SpawnList')){
        let spawns = this.template.RootNode.GetFieldByLabel('SpawnList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawns.length; i < len; i++){
          entry = SpawnEntry.FromStruct(spawns[i]);
          if(entry instanceof SpawnEntry){
            this.spawnList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('Active'))
        this.active = this.template.GetFieldByLabel('Active').GetValue();

      if(this.template.RootNode.HasField('AreaPoints'))
        this.areaPoints = this.template.GetFieldByLabel('AreaPoints').GetValue();

      if(this.template.RootNode.HasField('Difficulty'))
        this.difficulty = this.template.GetFieldByLabel('Difficulty').GetValue();

      if(this.template.RootNode.HasField('DifficultyIndex'))
        this.difficultyIndex = this.template.GetFieldByLabel('DifficultyIndex').GetValue();

      if(this.template.RootNode.HasField('Faction'))
        this.faction = this.template.GetFieldByLabel('Faction').GetValue();

      if(this.template.RootNode.HasField('LocalizedName'))
        this.localizedName = this.template.GetFieldByLabel('LocalizedName').GetValue();

      if(this.template.RootNode.HasField('MaxCreatures'))
        this.maxCreatures = this.template.GetFieldByLabel('MaxCreatures').GetValue();

      if(this.template.RootNode.HasField('PaletteID'))
        this.paletteId = this.template.GetFieldByLabel('PaletteID').GetValue();

      if(this.template.RootNode.HasField('PlayerOnly'))
        this.playerOnly = this.template.GetFieldByLabel('PlayerOnly').GetValue();

      if(this.template.RootNode.HasField('RecCreatures'))
        this.recCreatures = this.template.GetFieldByLabel('RecCreatures').GetValue();

      if(this.template.RootNode.HasField('Reset'))
        this.reset = this.template.GetFieldByLabel('Reset').GetValue();

      if(this.template.RootNode.HasField('ResetTime'))
        this.resetTime = this.template.GetFieldByLabel('ResetTime').GetValue();

      if(this.template.RootNode.HasField('Respawns'))
        this.respawns = this.template.GetFieldByLabel('Respawns').GetValue();

      if(this.template.RootNode.HasField('SpawnOptions'))
        this.spawnOptions = this.template.GetFieldByLabel('SpawnOptions').GetValue();

      if(this.template.RootNode.HasField('Tag'))
        this.tag = this.template.GetFieldByLabel('Tag').GetValue();
  
      if(this.template.RootNode.HasField('TemplateResRef'))
        this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

      if(this.template.RootNode.HasField('XPosition'))
        this.position.x = this.template.GetFieldByLabel('XPosition').GetValue();

      if(this.template.RootNode.HasField('YPosition'))
        this.position.y = this.template.GetFieldByLabel('YPosition').GetValue();
  
      if(this.template.RootNode.HasField('ZPosition'))
        this.position.z = this.template.GetFieldByLabel('ZPosition').GetValue();

      if(this.template.RootNode.HasField('Commandable'))
        this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

      if(this.template.RootNode.HasField('NumberSpawned'))
        this.numberSpawned = this.template.GetFieldByLabel('NumberSpawned').GetValue();

      if(this.template.RootNode.HasField('HeartbeatDay'))
        this.heartbeatDay = this.template.GetFieldByLabel('HeartbeatDay').GetValue();

      if(this.template.RootNode.HasField('HeartbeatTime'))
        this.heartbeatTime = this.template.GetFieldByLabel('HeartbeatTime').GetValue();

      if(this.template.RootNode.HasField('LastSpawnDay'))
        this.lastSpawnDay = this.template.GetFieldByLabel('LastSpawnDay').GetValue();

      if(this.template.RootNode.HasField('LastSpawnTime'))
        this.lastSpawnTime = this.template.GetFieldByLabel('LastSpawnTime').GetValue();

      if(this.template.RootNode.HasField('LastEntered'))
        this.lastEntered = this.template.GetFieldByLabel('LastEntered').GetValue();

      if(this.template.RootNode.HasField('LastLeft'))
        this.lastLeft = this.template.GetFieldByLabel('LastLeft').GetValue();

      if(this.template.RootNode.HasField('Started'))
        this.started = this.template.GetFieldByLabel('Started').GetValue();

      if(this.template.RootNode.HasField('Exhausted'))
        this.exhausted = this.template.GetFieldByLabel('Exhausted').GetValue();
        
      if(this.template.RootNode.HasField('CurrentSpawns'))
        this.currentSpawns = this.template.GetFieldByLabel('CurrentSpawns').GetValue();
    
      if(this.template.RootNode.HasField('CustomScriptId'))
        this.customScriptId = this.template.GetFieldByLabel('CustomScriptId').GetValue();

      if(this.template.RootNode.HasField('AreaListMaxSize'))
        this.areaListMaxSize = this.template.GetFieldByLabel('AreaListMaxSize').GetValue();

      if(this.template.RootNode.HasField('SpawnPoolActive'))
        this.spawnPoolActive = this.template.GetFieldByLabel('SpawnPoolActive').GetValue();

      this.initialized = true;
    }

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTT ';

    let actionList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ActionList') );
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Commandable') ).SetValue(this.commandable);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Active') ).SetValue(this.active);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Reset') ).SetValue( this.reset );
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'ResetTime') ).SetValue(this.resetTime);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'Respawns') ).SetValue(this.respawns);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'SpawnOption') ).SetValue(this.spawnOptions);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'MaxCreatures') ).SetValue(this.maxCreatures);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'RecCreatures') ).SetValue(this.recCreatures);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PlayerOnly') ).SetValue( this.playerOnly );
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Faction') ).SetValue( this.faction );
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'DifficultyIndex') ).SetValue( this.faction );
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'Difficulty') ).SetValue( this.faction );
    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LocalizedName') ).SetValue(this.localizedName);
    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Tag') ).SetValue(this.tag);

    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'NumberSpawned') ).SetValue(this.numberSpawned);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'HeartbeatDay') ).SetValue(this.heartbeatDay);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'HeartbeatTime') ).SetValue(this.heartbeatTime);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'LastSpawnDay') ).SetValue(this.lastSpawnDay);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'LastSpawnTime') ).SetValue(this.lastSpawnTime);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Started') ).SetValue(this.started);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Exhausted') ).SetValue(this.exhausted);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'CurrentSpawns') ).SetValue(this.currentSpawns);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'SpawnPoolActive') ).SetValue(this.spawnPoolActive);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'LastEntered') ).SetValue(this.lastEntered);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'LastLeft') ).SetValue(this.lastLeft);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'CustomScriptId') ).SetValue(this.customScriptId);
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'AreaListMaxSize') ).SetValue(this.areaListMaxSize);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'AreaPoints') ).SetValue(this.areaPoints);

    let creatureList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'CreatureList') );
    let creature = undefined;
    for(let i = 0; i < this.creatureList.length; i++){
      creature = this.creatureList[i].save();
      if(creature)
        creatureList.AddChildStruct( creature );
    }

    let spawnPointList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SpawnPointList') );
    let spawnPoint = undefined;
    for(let i = 0; i < this.spawnPointList.length; i++){
      spawnPoint = this.spawnPointList[i].save();
      if(spawnPoint)
        spawnPointList.AddChildStruct( spawnPoint );
    }

    if(this.spawnList.length){
      let spawnList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SpawnList') );
      let spawn = undefined;
      for(let i = 0; i < this.spawnList.length; i++){
        spawn = this.spawnList[i].save();
        if(spawn)
          spawnList.AddChildStruct( spawn );
      }
    }

    let geometry = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new Struct();
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'X') ).SetValue(this.vertices[i].x);
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'Y') ).SetValue(this.vertices[i].y);
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'Z') ).SetValue(this.vertices[i].z);
      geometry.AddChildStruct(vertStruct);
    }

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnEntered') ).SetValue(this.scripts.onEntered ? this.scripts.onEntered.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnExit') ).SetValue(this.scripts.onExit ? this.scripts.onExit.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnExhausted') ).SetValue(this.scripts.onExhausted ? this.scripts.onExhausted.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUserDefined') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'VarTable') );
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'XPosition') ).SetValue(this.position.x);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'YPosition') ).SetValue(this.position.y);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

}

class EncounterCreatureEntry{

  appearance = 0;
  resref = '';
  cr = 0;
  singleSpawn = 0;

  save(){
    let struct = new Struct();

    //struct.AddField( new Field(GFFDataTypes.INT, 'Appearance') ).SetValue(this.appearance);
    struct.AddField( new Field(GFFDataTypes.RESREF, 'ResRef') ).SetValue(this.resref);
    struct.AddField( new Field(GFFDataTypes.FLOAT, 'CR') ).SetValue(this.cr);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'SingleSpawn') ).SetValue(this.singleSpawn);

    return struct;
  }

  static FromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let entry = new EncounterCreatureEntry();
      if(struct.HasField('Appearance'))
        entry.appearance = struct.GetFieldByLabel('Appearance').GetValue();

      if(struct.HasField('ResRef'))
        entry.resref = struct.GetFieldByLabel('ResRef').GetValue();

      if(struct.HasField('CR'))
        entry.cr = struct.GetFieldByLabel('CR').GetValue();
  
      if(struct.HasField('SingleSpawn'))
        entry.singleSpawn = struct.GetFieldByLabel('SingleSpawn').GetValue();

      return entry;
    }
    return undefined;
  }

}

class SpawnEntry{

  spawnResref = '';
  spawnCR = 0;

  save(){
    let struct = new Struct();

    struct.AddField( new Field(GFFDataTypes.RESREF, 'SpawnResRef') ).SetValue(this.spawnResref);
    struct.AddField( new Field(GFFDataTypes.FLOAT, 'SpawnCR') ).SetValue(this.spawnCR);

    return struct;
  }

  static FromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let entry = new SpawnEntry();

      if(struct.HasField('SpawnResRef'))
        entry.spawnResref = struct.GetFieldByLabel('SpawnResRef').GetValue();

      if(struct.HasField('SpawnCR'))
        entry.spawnCR = struct.GetFieldByLabel('SpawnCR').GetValue();


      return entry;
    }
    return undefined;
  }

}

class SpawnPointEntry{

  position = new THREE.Vector3();
  orientation = 0.0;

  save(){
    let struct = new Struct();

    struct.AddField( new Field(GFFDataTypes.FLOAT, 'X') ).SetValue(this.position.x);
    struct.AddField( new Field(GFFDataTypes.FLOAT, 'Y') ).SetValue(this.position.y);
    struct.AddField( new Field(GFFDataTypes.FLOAT, 'Z') ).SetValue(this.position.z);
    struct.AddField( new Field(GFFDataTypes.FLOAT, 'Orientation') ).SetValue(this.orientation);

    return struct;
  }

  static FromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let entry = new SpawnPointEntry();
      if(struct.HasField('X'))
        entry.position.x = struct.GetFieldByLabel('X').GetValue();

      if(struct.HasField('Y'))
        entry.position.y = struct.GetFieldByLabel('Y').GetValue();

      if(struct.HasField('Z'))
        entry.position.z = struct.GetFieldByLabel('Z').GetValue();
  
      if(struct.HasField('Orientation'))
        entry.orientation = struct.GetFieldByLabel('Orientation').GetValue();

      return entry;
    }
    return undefined;
  }

}

module.exports = ModuleEncounter;