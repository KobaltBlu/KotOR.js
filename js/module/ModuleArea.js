/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleArea class.
 */

class ModuleArea extends ModuleObject {

  cameras = [];
  creatures = [];
  doorhooks = [];
  doors = [];
  encounters = [];
  obstacles = [];
  items = [];
  party = [];
  placeables = [];
  rooms = [];
  sounds = [];
  stores = [];
  tracks = [];
  triggers = [];
  waypoints = [];

  audio = {
    AmbientSndDay: 0,
    AmbientSndDayVol: 0,
    AmbientSndNight: 0,
    AmbientSndNitVol: 0,
    EnvAudio: 0,
    MusicBattle: 0,
    MusicDay: 0,
    MusicDelay: 0,
    MusicNight: 0
  };

  AlphaTest = 0.200000002980232;
  CameraStyle = 0;
  ChanceLightning = 0;
  ChanceRain = 0;
  ChanceSnow = 0;
  Comments = '';
  Creator_ID = 0;
  DayNightCycle = 0;
  DefaultEnvMap = '';
  DynAmbientColor = 6312778;
  Expansion_List = [];
  Flags = 1;

  Grass = {
    Ambient: 0,
    Density: 0,
    Diffuse: 0,
    Prob_LL: 0.25,
    Prob_LR: 0.25,
    Prob_UL: 0.25,
    Prob_UR: 0.25,
    QuadSize: 0,
    TexName: ''
  };

  ID = 0;
  IsNight = 0;
  LightingScheme = 0;
  LoadScreenID = 0;

  Map = {
    MapPt1X: 0.0,
    MapPt1Y: 0.0,
    MapPt2X: 0.0,
    MapPt2Y: 0.0,
    MapResX: 0,
    MapZoom: 1,
    NorthAxis: 3,
    WorldPt1X: 0.0,
    WorldPt1Y: 0.0,
    WorldPt2X: 0.0,
    WorldPt2Y: 0.0
  }

  ModListenCheck = 0;
  ModSpotCheck = 0;
  MoonAmbientColor = 0;
  MoonDiffuseColor = 0;
  MoonFogColor = 0;
  MoonFogFar = 100;
  MoonFogNear = 99;
  MoonFogOn = 0;
  MoonShadows = 0;
  Name = '';
  NoHangBack = 0;
  NoRest = 0;
  OnEnter = "";
  OnExit = "";
  OnHeartbeat = "";
  OnUserDefined = "";
  PlayerOnly = 0;
  PlayerVsPlayer = 0;
  ShadowOpacity = 0;
  StealthXPEnabled = 0;
  StealthXPLoss = 0;
  StealthXPMax = 0;
  SunAmbientColor = 0;
  SunDiffuseColor = 0;
  SunFogColor = 0;
  SunFogFar = 2000;
  SunFogNear = 1000;
  SunFogOn = 0;
  SunShadows = 0;
  Tag = '';
  Unescapable = 0;
  Version = 1;
  WindPower = 0;

  constructor(name = '', are = new GFFObject(), git = new GFFObject()){
    super(are);
    this._name = name;
    this.are = are;
    this.git = git;

    this.transWP = '';

  }

  SetTransitionWaypoint(sTag = ''){
    this.transWP = sTag;
  }

  Load(onLoad = null){

    //BEGIN AREA LOAD

    if(this.are.RootNode.HasField('ObjectId'))
      this.id = this.are.GetFieldByLabel('ObjectId').GetValue();

    let rooms = this.are.GetFieldByLabel('Rooms');

    this.Alphatest = this.are.GetFieldByLabel('AlphaTest').GetValue();
    this.CameraStyle = this.are.GetFieldByLabel('CameraStyle').GetValue();
    this.ChanceLightning = this.are.GetFieldByLabel('ChanceLightning').GetValue();
    this.ChanceRain = this.are.GetFieldByLabel('ChanceRain').GetValue();
    this.ChanceSnow = this.are.GetFieldByLabel('ChanceSnow').GetValue();
    this.Comments = this.are.GetFieldByLabel('Comments').GetValue();
    this.Creator_ID = this.are.GetFieldByLabel('Creator_ID').GetValue();
    this.DayNightCycle = this.are.GetFieldByLabel('DayNightCycle').GetValue();
    this.DefaultEnvMap = this.are.GetFieldByLabel('DefaultEnvMap').GetValue();
    this.DynAmbientColor = this.are.GetFieldByLabel('DynAmbientColor').GetValue();
    this.Expansion_List = [];

    this.Flags = this.are.GetFieldByLabel('Flags').GetValue();
    this.Grass = {
      Ambient: this.are.GetFieldByLabel('Grass_Ambient').GetValue(),
      Density: this.are.GetFieldByLabel('Grass_Density').GetValue(),
      Diffuse: this.are.GetFieldByLabel('Grass_Diffuse').GetValue(),
      Prob_LL: this.are.GetFieldByLabel('Grass_Prob_LL').GetValue(),
      Prob_LR: this.are.GetFieldByLabel('Grass_Prob_LR').GetValue(),
      Prob_UL: this.are.GetFieldByLabel('Grass_Prob_UL').GetValue(),
      Prob_UR: this.are.GetFieldByLabel('Grass_Prob_UR').GetValue(),
      QuadSize: this.are.GetFieldByLabel('Grass_QuadSize').GetValue(),
      TexName: this.are.GetFieldByLabel('Grass_TexName').GetValue()
    };

    this.ID = this.are.GetFieldByLabel('ID').GetValue();
    this.IsNight = this.are.GetFieldByLabel('IsNight').GetValue();
    this.LightingScheme = this.are.GetFieldByLabel('LightingScheme').GetValue();
    this.LoadScreenID = this.are.GetFieldByLabel('LoadScreenID').GetValue();

    let map = this.are.GetFieldByLabel('Map').GetChildStructs()[0];

    this.Map = {
      MapPt1X: map.GetFieldByLabel('MapPt1X').GetValue(),
      MapPt1Y: map.GetFieldByLabel('MapPt1Y').GetValue(),
      MapPt2X: map.GetFieldByLabel('MapPt2X').GetValue(),
      MapPt2Y: map.GetFieldByLabel('MapPt2Y').GetValue(),
      MapResX: map.GetFieldByLabel('MapResX').GetValue(),
      MapZoom: map.GetFieldByLabel('MapZoom').GetValue(),
      NorthAxis: map.GetFieldByLabel('NorthAxis').GetValue(),
      WorldPt1X: map.GetFieldByLabel('WorldPt1X').GetValue(),
      WorldPt1Y: map.GetFieldByLabel('WorldPt1Y').GetValue(),
      WorldPt2X: map.GetFieldByLabel('WorldPt2X').GetValue(),
      WorldPt2Y: map.GetFieldByLabel('WorldPt2Y').GetValue()
    };

    this.MiniGame = null;

    if(this.are.RootNode.HasField('MiniGame')){

      let MG = this.are.GetFieldByLabel('MiniGame').GetChildStructs()[0];

      this.MiniGame = {
        Bump_Plane: MG.GetFieldByLabel('Bump_Plane').GetValue(),
        CameraViewAngle: MG.GetFieldByLabel('CameraViewAngle').GetValue(),
        DOF: MG.GetFieldByLabel('DOF').GetValue(),
        DoBumping: MG.GetFieldByLabel('DoBumping').GetValue(),
        Enemies: [],
        Far_Clip: MG.GetFieldByLabel('Far_Clip').GetValue(),
        LateralAccel: MG.GetFieldByLabel('LateralAccel').GetValue(),
        Mouse: {}, //TODO
        MovementPerSec: MG.GetFieldByLabel('MovementPerSec').GetValue(),
        Music: MG.GetFieldByLabel('Music').GetValue(),
        Near_Clip: MG.GetFieldByLabel('Near_Clip').GetValue(),
        Obstacles: [],
        Type: MG.GetFieldByLabel('Type').GetValue(),
        UseInertia: MG.GetFieldByLabel('UseInertia').GetValue()
      };

      this.MiniGame.Player = new ModuleMGPlayer(GFFObject.FromStruct(MG.GetFieldByLabel('Player').GetChildStructs()[0]));

      let enemies = MG.GetFieldByLabel('Enemies').GetChildStructs();
      for(let i = 0; i < enemies.length; i++){
        this.MiniGame.Enemies.push(
          new ModuleMGEnemy(
            GFFObject.FromStruct(enemies[i])
          )
        );
      }

    }


    this.ModListenCheck = this.are.GetFieldByLabel('ModListenCheck').GetValue();
    this.ModSpotCheck = this.are.GetFieldByLabel('ModSpotCheck').GetValue();
    this.MoonAmbientColor = this.are.GetFieldByLabel('MoonAmbientColor').GetValue();
    this.MoonDiffuseColor = this.are.GetFieldByLabel('MoonDiffuseColor').GetValue();
    this.MoonFogColor = this.are.GetFieldByLabel('MoonFogColor').GetValue();
    this.MoonFogFar = this.are.GetFieldByLabel('MoonFogFar').GetValue();
    this.MoonFogNear = this.are.GetFieldByLabel('MoonFogNear').GetValue();
    this.MoonFogOn = this.are.GetFieldByLabel('MoonFogOn').GetValue();
    this.MoonShadows = this.are.GetFieldByLabel('MoonShadows').GetValue();
    this.Name = this.are.GetFieldByLabel('Name').GetCExoLocString();

    this.NoHangBack = this.are.GetFieldByLabel('NoHangBack').GetValue();
    this.NoRest = this.are.GetFieldByLabel('NoRest').GetValue();

    this.onEnter = this.are.GetFieldByLabel('OnEnter').GetValue();
    this.onExit = this.are.GetFieldByLabel('OnExit').GetValue();
    this.onHeartbeat = this.are.GetFieldByLabel('OnHeartbeat').GetValue();
    this.onUserDefined = this.are.GetFieldByLabel('OnUserDefined').GetValue();

    this.scripts = {
      onEnter: this.onEnter,
      onExit: this.onExit,
      onHeartbeat: this.onHeartbeat,
      onUserDefined: this.onUserDefined
    };

    this.PlayerOnly = this.are.GetFieldByLabel('PlayerOnly').GetValue();
    this.PlayerVsPlayer = this.are.GetFieldByLabel('PlayerVsPlayer').GetValue();

    //Rooms
    for(let i = 0; i != rooms.ChildStructs.length; i++ ){
      let strt = rooms.ChildStructs[i];
      
      this.rooms.push(
        new ModuleRoom({
          ambientScale: this.are.GetFieldByLabel('AmbientScale', strt.GetFields()).GetValue(),
          envAudio: this.are.GetFieldByLabel('EnvAudio', strt.GetFields()).GetValue(),
          roomName: this.are.GetFieldByLabel('RoomName', strt.GetFields()).GetValue().toLowerCase()
        })
      );
    }

    this.ShadowOpacity = this.are.GetFieldByLabel('ShadowOpacity').GetValue();
    this.StealthXPEnabled = this.are.GetFieldByLabel('StealthXPEnabled').GetValue();
    this.StealthXPLoss = this.are.GetFieldByLabel('StealthXPLoss').GetValue();
    this.StealthXPMax = this.are.GetFieldByLabel('StealthXPMax').GetValue();
    this.SunAmbientColor = this.are.GetFieldByLabel('SunAmbientColor').GetValue();
    this.SunDiffuseColor = this.are.GetFieldByLabel('SunDiffuseColor').GetValue();
    this.SunFogColor = this.are.GetFieldByLabel('SunFogColor').GetValue();
    this.SunFogFar = this.are.GetFieldByLabel('SunFogFar').GetValue();
    this.SunFogNear = this.are.GetFieldByLabel('SunFogNear').GetValue();
    this.SunFogOn = this.are.GetFieldByLabel('SunFogOn').GetValue();
    this.SunShadows = this.are.GetFieldByLabel('SunShadows').GetValue();
    this.Tag = this.are.GetFieldByLabel('Tag').GetValue();
    this.Unescapable = this.are.GetFieldByLabel('Unescapable').GetValue() ? true : false;
    this.Version = this.are.GetFieldByLabel('Version').GetValue();
    this.WindPower = this.are.GetFieldByLabel('WindPower').GetValue();

    this.fog = undefined;

    if(this.SunFogOn){
      this.fog = new THREE.Fog(
        this.SunFogColor,
        this.SunFogNear,
        this.SunFogFar
      );
    }else{
      Game.scene.fog = undefined;
    }

    //BEGIN GIT LOAD

    let areaProps = this.git.GetFieldByLabel('AreaProperties');
    let cameras = this.git.GetFieldByLabel('CameraList');
    let creatures = this.git.GetFieldByLabel('Creature List');
    let doors = this.git.GetFieldByLabel('Door List');
    let encounters = this.git.GetFieldByLabel('Encounter List');
    let placeables = this.git.GetFieldByLabel('Placeable List');
    let sounds = this.git.GetFieldByLabel('SoundList');
    let stores = this.git.GetFieldByLabel('StoreList');
    let triggers = this.git.GetFieldByLabel('TriggerList');
    let waypoints = this.git.GetFieldByLabel('WaypointList');

    let areaPropsField = areaProps.GetChildStructs()[0].GetFields();

    this.audio.AmbientSndDay = this.git.GetFieldByLabel('AmbientSndDay', areaPropsField).GetValue();
    this.audio.AmbientSndDayVol = this.git.GetFieldByLabel('AmbientSndDayVol', areaPropsField).GetValue();
    this.audio.AmbientSndNight = this.git.GetFieldByLabel('AmbientSndNight', areaPropsField).GetValue();
    this.audio.AmbientSndNitVol = this.git.GetFieldByLabel('AmbientSndNitVol', areaPropsField).GetValue();
    if(areaProps.GetChildStructs()[0].HasField('EnvAudio')){
      this.audio.EnvAudio = this.git.GetFieldByLabel('EnvAudio', areaPropsField).GetValue();
    }else{
      this.audio.EnvAudio = -1;
    }
    
    this.audio.MusicBattle = this.git.GetFieldByLabel('MusicBattle', areaPropsField).GetValue();
    this.audio.MusicDay = this.git.GetFieldByLabel('MusicDay', areaPropsField).GetValue();
    this.audio.MusicDelay = this.git.GetFieldByLabel('MusicDelay', areaPropsField).GetValue();
    this.audio.MusicNight = this.git.GetFieldByLabel('MusicNight', areaPropsField).GetValue();

    //Cameras
    for(let i = 0; i != cameras.ChildStructs.length; i++){
      let strt = cameras.ChildStructs[i];
      this.cameras.push( new ModuleCamera(GFFObject.FromStruct(strt) ) );
    }

    //Creatures
    for(let i = 0; i != creatures.ChildStructs.length; i++){
      let strt = creatures.ChildStructs[i];
      this.creatures.push( new ModuleCreature(GFFObject.FromStruct(strt)) );
    }

    //Triggers
    for(let i = 0; i != triggers.ChildStructs.length; i++){
      let strt = triggers.ChildStructs[i];
      this.triggers.push( new ModuleTrigger(GFFObject.FromStruct(strt)) );
    }

    //Encounter
    for(let i = 0; i != encounters.ChildStructs.length; i++){
      let strt = encounters.ChildStructs[i];
      this.encounters.push( new ModuleEncounter(GFFObject.FromStruct(strt)) );
    }

    //Doors
    for(let i = 0; i != doors.ChildStructs.length; i++ ){
      let strt = doors.ChildStructs[i];
      this.doors.push( new ModuleDoor(GFFObject.FromStruct(strt)) );
    }

    //Placeables
    for(let i = 0; i != placeables.ChildStructs.length; i++ ){
      let strt = placeables.ChildStructs[i];
      this.placeables.push( new ModulePlaceable(GFFObject.FromStruct(strt)) );
    }

    //Sounds
    for(let i = 0; i != sounds.ChildStructs.length; i++ ){
      let strt = sounds.ChildStructs[i];
      this.sounds.push( new ModuleSound(GFFObject.FromStruct(strt), Game.audioEngine) );
    }

    //Stores
    for(let i = 0; i != stores.ChildStructs.length; i++ ){
      let strt = stores.ChildStructs[i];
      this.stores.push( new ModuleStore(GFFObject.FromStruct(strt)) );
    }

    //Waypoints
    for(let i = 0; i != waypoints.ChildStructs.length; i++ ){
      let strt = waypoints.ChildStructs[i];

      if(this.transWP){
        if(typeof this.transWP === 'string'){
          if(this.transWP.toLowerCase() == strt.GetFieldByLabel('Tag').GetValue().toLowerCase()){
            this.transWP = GFFObject.FromStruct(strt);
          }
        }else if(this.transWP instanceof GFFObject){
          if(this.transWP.GetFieldByLabel('Tag').GetValue().toLowerCase() == strt.GetFieldByLabel('Tag').GetValue().toLowerCase()){
            this.transWP = GFFObject.FromStruct(strt);
          }
        }
      }
      
      this.waypoints.push( new ModuleWaypoint(GFFObject.FromStruct(strt)) );
    }

    if(!(this.transWP instanceof GFFObject)){
      this.transWP = null;
    }

    if(this.git.RootNode.HasField('SWVarTable')){
      console.log("SWVarTable", this.git);
      let localBools = this.git.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    Game.AlphaTest = this.Alphatest;

    Game.audioEngine.SetReverbProfile(this.audio.EnvAudio);

    this.loadPath( () => {
      this.LoadVis( () => {
        this.LoadLayout( () => {
          this.LoadScripts( () => {
            Game.scene.fog = this.fog;
            if(typeof onLoad == 'function')
              onLoad(this);
          });
        });
      });
    });

  }

  loadPath(onLoad = null){
    console.log('ModuleArea.loadPath');
    this.path = new ModulePath(this._name);
    this.path.Load( () => {
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadVis(onLoad = null){
    console.log('ModuleArea.LoadVis');
    ResourceLoader.loadResource(ResourceTypes['vis'], this._name, (visData) => {
      this.visObject = new VISObject(visData);
      if(typeof onLoad == 'function')
        onLoad(this);
    }, () => {
      this.visObject = new VISObject();
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadLayout(onLoad = null){
    console.log('ModuleArea.LoadLayout');
    ResourceLoader.loadResource(ResourceTypes['lyt'], this._name, (data) => {
      this.layout = new LYTObject(data);

      //Resort the rooms based on the LYT file because it matches the walkmesh transition index numbers
      let sortedRooms = [];
      for(let i = 0; i != this.layout.rooms.length; i++){
        let roomLYT = this.layout.rooms[i];
        for(let r = 0; r != this.rooms.length; r++ ){
          let room = this.rooms[r];
          if(room.roomName.toLowerCase() == roomLYT['name'].toLowerCase()){
            room.setPosition(
              parseFloat(roomLYT.x),
              parseFloat(roomLYT.y),
              parseFloat(roomLYT.z)
            );
            sortedRooms.push(room);
          }
        }
      }

      this.rooms = sortedRooms;

      for(let i = 0; i != this.layout.doorhooks.length; i++){
        let _doorHook = this.layout.doorhooks[i];
        this.doorhooks.push(_doorHook);
      }

      for(let i = 0; i != this.layout.tracks.length; i++){
        this.tracks.push(new ModuleMGTrack(this.layout.tracks[i]));
      }

      for(let i = 0; i != this.layout.obstacles.length; i++){
        let _obstacle = this.layout.obstacles[i];
        this.obstacles.push(_obstacle);
      }

      //Room Linking Pass 1
      for(let ri = 0; ri != this.rooms.length; ri++ ){
        let room = this.rooms[ri];
        let linked_rooms = [];
        if(this.visObject.GetRoom(room.roomName)){
          linked_rooms = this.visObject.GetRoom(room.roomName).rooms;
        }
        room.setLinkedRooms(linked_rooms);
      }

      if(typeof onLoad == 'function')
        onLoad();

    }, (error) => {
      this.layout = new LYTObject();
      if(typeof onLoad == 'function')
        onLoad();
    });
  }

  cleanupUninitializedObjects(){

    let i = this.creatures.length
    while (i--) {
      if (!(this.creatures[i] instanceof ModuleCreature) || !this.creatures[i].initialized) { 
        this.creatures.splice(i, 1);
      } 
    }

    i = this.placeables.length
    while (i--) {
      if (!(this.placeables[i] instanceof ModulePlaceable) || !this.placeables[i].initialized) { 
        this.placeables.splice(i, 1);
      } 
    }

    i = this.doors.length
    while (i--) {
      if (!(this.doors[i] instanceof ModuleDoor) || !this.doors[i].initialized) { 
        this.doors.splice(i, 1);
      } 
    }

    i = this.sounds.length
    while (i--) {
      if (!(this.sounds[i] instanceof ModuleSound) || !this.sounds[i].initialized) { 
        this.sounds.splice(i, 1);
      } 
    }

    i = this.waypoints.length
    while (i--) {
      if (!(this.waypoints[i] instanceof ModuleWaypoint) || !this.waypoints[i].initialized) { 
        this.waypoints.splice(i, 1);
      } 
    }

    i = this.triggers.length
    while (i--) {
      if (!(this.triggers[i] instanceof ModuleTrigger) || !this.triggers[i].initialized) { 
        this.triggers.splice(i, 1);
      } 
    }

    i = this.stores.length
    while (i--) {
      if (!(this.stores[i] instanceof ModuleStore) || !this.stores[i].initialized) { 
        this.stores.splice(i, 1);
      } 
    }

  }

  async loadScene( onLoad = null ){

    await this.loadRooms();
    await this.loadGrass();

    Game.LoadScreen.setProgress(10);

    await this.loadPlaceables();

    Game.LoadScreen.setProgress(20);

    await this.loadWaypoints();

    Game.LoadScreen.setProgress(30);

    await this.loadCreatures();
    await this.loadPlayer();
    await this.loadParty();

    Game.LoadScreen.setProgress(40);

    await this.loadSoundTemplates();

    Game.LoadScreen.setProgress(50);

    await this.loadTriggers();

    await this.loadEncounters();

    Game.LoadScreen.setProgress(60);

    await this.loadMGTracks();
    await this.loadMGPlayer();
    await this.loadMGEnemies();

    Game.LoadScreen.setProgress(70);

    await this.loadDoors();

    await this.loadStores();

    Game.LoadScreen.setProgress(80);
    await this.loadTextures();

    Game.LoadScreen.setProgress(90);

    await this.loadAudio();
    await this.loadBackgroundMusic();

    Game.LoadScreen.setProgress(100);

    Game.followerCamera.facing = Utility.NormalizeRadian(Game.player.GetFacing() - Math.PI/2);

    if(this.ChanceSnow == 100){
      Game.ModelLoader.load({
        file: 'fx_snow',
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, { 
            onComplete: (model) => {
              Game.weather_effects.push(model);
              Game.group.weather_effects.add(model);
              TextureLoader.LoadQueue();
            },
            manageLighting: false
          });
        }
      });
    }

    if(this.ChanceRain == 100){
      Game.ModelLoader.load({
        file: 'fx_rain',
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, { 
            onComplete: (model) => {
              Game.weather_effects.push(model);
              Game.group.weather_effects.add(model);
              TextureLoader.LoadQueue();
            },
            manageLighting: false
          });
        }
      });
    }

    this.transWP = null;

    this.cleanupUninitializedObjects();

    if(typeof onLoad === 'function')
      onLoad();

  }

  getSpawnLocation(){

    if(Game.isLoadingSave){
      return new Game.Location(
        PartyManager.Player.RootNode.GetFieldByLabel('XPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('YPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        PartyManager.Player.RootNode.GetFieldByLabel('YOrientation').GetValue(),
        0
      );
    }else if(this.transWP){
      console.log('TransWP', this.transWP);
      return new Game.Location(
        this.transWP.RootNode.GetFieldByLabel('XPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('YPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('ZPosition').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('XOrientation').GetValue(),
        this.transWP.RootNode.GetFieldByLabel('YOrientation').GetValue(),
        0
      );
    }else{
      console.log('No TransWP');
      return new Game.Location(
        Game.module['Mod_Entry_X'],
        Game.module['Mod_Entry_Y'],
        Game.module['Mod_Entry_Z'],
        Game.module['Mod_Entry_Dir_X'],
        Game.module['Mod_Entry_Dir_Y'],
        0
      );
    }

  }

  getPlayerTemplate(){
    let spawnLoc = this.getSpawnLocation();
    if(PartyManager.Player){
      return PartyManager.Player;
    }else{
      let pTPL = new GFFObject();

      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Appearance_Type') ).SetValue(GameKey == 'TSL' ? 134 : 177);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'FirstName') ).SetValue(GameKey == 'TSL' ? 'Leia Organa' : 'Galen Urso');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.INT, 'Age') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'ArmorClass') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'ChallengeRating') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'FactionID') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') ).SetValue(GameKey == 'TSL' ? 10 : 26);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'HitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'MaxHitPoints') ).SetValue(100);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentHitPoints') ).SetValue(70);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'MaxForcePoints') ).SetValue(15);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Commandable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'CurrentForce') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'DeadSelectable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'DetectMode') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'Disarmable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsDestroyable') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsPC') ).SetValue(1);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'IsRaiseable') ).SetValue(1);
      let equipment = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Equip_ItemList') );
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptAttacked') ).SetValue('k_hen_attacked01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDamaged') ).SetValue('k_def_damage01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDeath') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDialogue') ).SetValue('k_hen_dialogue01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptDisturbed') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndDialogu') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptEndRound') ).SetValue('k_hen_combend01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptHeartbeat') ).SetValue('k_hen_heartbt01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnBlocked') ).SetValue('k_def_blocked01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptOnNotice') ).SetValue('k_hen_percept01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptRested') ).SetValue('');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpawn') ).SetValue('k_hen_spawn01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptSpellAt') ).SetValue('k_def_spellat01');
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'ScriptUserDefine') ).SetValue('k_def_userdef01');
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'GoodEvil') ).SetValue(50);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'NaturalAC') ).SetValue(0);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Con') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Dex') ).SetValue(14);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Str') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Wis') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Cha') ).SetValue(10);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Int') ).SetValue(10);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'fortbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'refbonus') ).SetValue(0);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'willbonus') ).SetValue(0);
  
      pTPL.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PerceptionRange') ).SetValue(12);

      let classList = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ClassList') );
      for(let i = 0; i < 1; i++){
        let _class = new Struct();
        _class.AddField( new Field(GFFDataTypes.INT, 'Class') ).SetValue(0);
        _class.AddField( new Field(GFFDataTypes.SHORT, 'ClassLevel') ).SetValue(1);
        _class.AddField( new Field(GFFDataTypes.LIST, 'KnownList0') );
        classList.AddChildStruct(_class);
      }
  
      let skillList = pTPL.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SkillList') );
  
      for(let i = 0; i < 8; i++){
        let _skill = new Struct();
        _skill.AddField( new Field(GFFDataTypes.RESREF, 'Rank') ).SetValue(0);
        skillList.AddChildStruct(_skill);
      }
  
      let armorStruct = new Struct(UTCObject.SLOT.ARMOR);
      armorStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_a_jedirobe01');
      let rhStruct = new Struct(UTCObject.SLOT.RIGHTHAND);
      rhStruct.AddField( new Field(GFFDataTypes.RESREF, 'EquippedRes') ).SetValue('g_w_lghtsbr01');
  
      equipment.AddChildStruct( armorStruct );
      equipment.AddChildStruct( rhStruct );
  
      // SoundSetFile
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'SoundSetFile') ).SetValue(85);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Race') ).SetValue(6);
  
      /*pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'XPosition') ).SetValue(spawnLoc.XPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'YPosition') ).SetValue(spawnLoc.YPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'ZPosition') ).SetValue(spawnLoc.ZPosition);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'XOrientation') ).SetValue(spawnLoc.XOrientation);
      pTPL.RootNode.AddField( new Field(GFFDataTypes.WORD, 'YOrientation') ).SetValue(spawnLoc.YOrientation);*/
      PartyManager.Player = pTPL;
      PartyManager.Player.json = PartyManager.Player.ToJSON();
      return pTPL;
    }
  }

  async loadMGPlayer(){

    return new Promise( (resolve, reject) => {

      if(this.MiniGame){

        console.log('Loading MG Player')
        let player = this.MiniGame.Player;
        player.partyID = -1;
        PartyManager.party.push(player);
        player.Load( ( object ) => {
          
          if(typeof object == 'undefined'){
            asyncLoop.next();
            return;
          }

          player.LoadScripts( () => {
            player.LoadCamera( () => {
              player.LoadModel( (model) => {
                player.LoadGunBanks( () => {
                  let track = this.tracks.find(o => o.track === player.track);
                  /*let spawnLoc = this.getSpawnLocation();
        
                  model.translateX(spawnLoc.XPosition);
                  model.translateY(spawnLoc.YPosition);
                  model.translateZ(spawnLoc.ZPosition + 1);*/
                  
                  model.moduleObject = player;
                  //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
                  //model.buildSkeleton();
                  model.hasCollision = true;
                  //track.model.getObjectByName('modelhook').add( model );
                  //Game.group.party.add( track.model );

                  player.setTrack(track.model);

                  /*player.model = track.model;
                  player.position = player.model.position;
                  player.rotation = player.model.rotation;
                  player.quaternion = player.model.quaternion;*/
        
                  player.getCurrentRoom();
                  player.computeBoundingBox();
        
                  resolve();

                });
              });
            });
          });
        });

      }else{
        resolve();
      }

    });

  }

  async loadPlayer(){

    return new Promise( (resolve, reject) => {

      console.log('Loading Player', Game.player)

      if(Game.player instanceof ModuleObject){
        Game.player.partyID = -1;

        if(!this.MiniGame){
          PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(Game.player) ] = Game.player;
        }

        //Reset the players actions between modules
        Game.player.clearAllActions();
        Game.player.force = 0;
        Game.player.animState = ModuleCreature.AnimState.IDLE;
        Game.player.groundFace = undefined;
        Game.player.lastGroundFace = undefined;
        Game.player.Load( ( object ) => {

          if(typeof object == 'undefined'){
            resolve();
            return;
          }
          
          Game.player.LoadScripts( () => {
            Game.player.LoadModel( (model) => {
              Game.player.model = model;
              //let spawnLoc = this.getSpawnLocation();
              let spawnLoc = PartyManager.GetSpawnLocation(Game.player);
              Game.player.position.x = spawnLoc.position.x;
              Game.player.position.y = spawnLoc.position.y;
              Game.player.position.z = spawnLoc.position.z;
              Game.player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);

              Game.player.computeBoundingBox();
              Game.player.model.hasCollision = true;

              if(!this.MiniGame)
                Game.group.party.add( model );

              Game.player.getCurrentRoom();

              resolve();
            });
          });
        });
      }else{
        let player = new ModulePlayer( this.getPlayerTemplate() );
        player.partyID = -1;
        player.id = ModuleObject.GetNextPlayerId();
        
        player.Load( ( object ) => {
          
          if(typeof object == 'undefined'){
            resolve();
            return;
          }
        
          if(!this.MiniGame){
            PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(player) ] = player;
          }

          player.LoadScripts( () => {
            player.LoadModel( (model) => {
    
              let spawnLoc = this.getSpawnLocation();
    
              player.position.x = spawnLoc.position.x;
              player.position.y = spawnLoc.position.y;
              player.position.z = spawnLoc.position.z;
              player.setFacing(-Math.atan2(spawnLoc.rotation.x, spawnLoc.rotation.y), true);
              //player.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
              player.computeBoundingBox();
              model.moduleObject = player;
              model.hasCollision = true;

              if(!this.MiniGame)
                Game.group.party.add( model );

              Game.player = player;
    
              player.getCurrentRoom();
    
              resolve();
            });
          });
        });
      }

    });

  }

  async loadMGTracks(){

    return new Promise( (resolve, reject) => {

      if(this.MiniGame){
        let loop = new AsyncLoop({
          array: this.tracks,
          onLoop: (track, asyncLoop) => {
            console.log('Loading MG Track', track);
            track.Load( () => {
    
              track.LoadModel( (model) => {
                track.model = model;
                console.log(model);
                model.moduleObject = track;
                //model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(spawnLoc.XOrientation, spawnLoc.YOrientation));
                //model.buildSkeleton();
                model.hasCollision = true;
                Game.group.creatures.add( model );
      
                track.computeBoundingBox();
                track.getCurrentRoom();
                asyncLoop.next();
              });
            });
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }else{
        resolve();
      }

    });

  }

  async loadMGEnemies(){

    return new Promise( (resolve, reject) => {
    
      if(this.MiniGame){
        let loop = new AsyncLoop({
          array: this.MiniGame.Enemies,
          onLoop: (enemy, asyncLoop) => {
            console.log('Loading MG Enemy', enemy);
            enemy.Load( ( object ) => {
          
              if(typeof object == 'undefined'){
                asyncLoop.next();
                return;
              }
    
              enemy.LoadScripts( () => {
                enemy.LoadModel( (model) => {
                  enemy.LoadGunBanks( () => {
                    let track = this.tracks.find(o => o.track === enemy.track);
                    model.moduleObject = enemy;
                    model.hasCollision = true;
                    enemy.setTrack(track.model);
                    enemy.computeBoundingBox();
                    enemy.getCurrentRoom();
                    asyncLoop.next();

                  });
                });
              });
            });
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }else
        resolve();

    });

  }

  async loadParty(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Party Member')
      let loop = new AsyncLoop({
        array: PartyManager.CurrentMembers,
        onLoop: (currentMember, asyncLoop) => {
          PartyManager.LoadPartyMember(asyncLoop.index-1, () => {
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }
  async loadRooms( ){

    return new Promise( (resolve, reject) => {
      console.log('Loading Rooms');
      let loop = new AsyncLoop({
        array: this.rooms,
        onLoop: (room, asyncLoop) => {
          room.load( (room) => {
            if(room.model instanceof THREE.AuroraModel){

              if(room.walkmesh instanceof AuroraWalkMesh){
                Game.walkmeshList.push( room.walkmesh.mesh );
                Game.group.room_walkmeshes.add( room.walkmesh.mesh );
              }
    
              if(typeof room.model.walkmesh != 'undefined'){
                Game.collisionList.push(room.model.walkmesh);
              }
              
              room.model.name = room.roomName;
              Game.group.rooms.add(room.model);
    
              room.computeBoundingBox();
              room.model.updateMatrix();
              
            }
            
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        for(let j = 0; j < this.rooms.length; j++){
          this.rooms[j].link_rooms(this.rooms);
        }

        //Room Linking Pass 2
        for(let i = 0, iLen = this.rooms.length; i < iLen; i++ ){
          let room1 = this.rooms[i];
          //console.log(room1.linked_rooms);
          //Look for all rooms that can see this room
          for(let j = 0, jLen = this.rooms.length; j < jLen; j++){
            let room2 = this.rooms[j];
            //console.log(room2.linked_rooms);
            if(room2 instanceof ModuleRoom){
              let room2_links_to_room1 = room2.linked_rooms.indexOf(room1) >= 0;
              let room1_links_to_room2 = room1.linked_rooms.indexOf(room2) >= 0;
  
              let should_link = room2_links_to_room1 || room1_links_to_room2;
              //console.log('room', room1.roomName, room2.roomName, should_link);
              if(should_link && room1.linked_rooms.indexOf(room2) == -1 ){
                room1.linked_rooms.push(room2);
              }
  
              if(should_link && room2.linked_rooms.indexOf(room1) == -1 ){
                room2.linked_rooms.push(room1);
              }
            }
          }
          this.walkmesh_rooms = [room1].concat(room1.linked_rooms);
        }
        resolve();
      });

    });

  }

  async loadDoors() {

    return new Promise( (resolve, reject) => {
      console.log('Loading Doors');
      let loop = new AsyncLoop({
        array: this.doors,
        onLoop: (door, asyncLoop) => {
          door.Load( ( object ) => {
          
            if(typeof object == 'undefined'){
              asyncLoop.next();
              return;
            }
  
            door.position.x = door.getX();
            door.position.y = door.getY();
            door.position.z = door.getZ();
            door.rotation.set(0, 0, door.getBearing());
            door.LoadModel( (model) => {
              door.LoadWalkmesh(model.name, (dwk) => {
                door.computeBoundingBox();
                try{
                  model.walkmesh = dwk;
                  door.walkmesh = dwk;
                  Game.walkmeshList.push( dwk.mesh );
    
                  if(dwk.mesh instanceof THREE.Object3D){
                    dwk.mat4 = new THREE.Matrix4();
                    dwk.mat4.makeRotationFromEuler(door.rotation);
                    dwk.mat4.setPosition( door.position.x, door.position.y, door.position.z);
                    dwk.mesh.geometry.applyMatrix4(dwk.mat4);
                    //dwk.mesh.position.copy(door.position);
                    if(!door.openState){
                      Game.group.room_walkmeshes.add( dwk.mesh );
                    }
                  }

                  if(door.model instanceof THREE.AuroraModel){
                    door.model.rotation.copy(door.rotation);
                    door.box.setFromObject(door.model);
                  }
    
                  if(door.openState){
                    door.model.playAnimation('opened1', true);
                  }
                }catch(e){
                  console.error('Failed to add dwk', model.name, dwk, e);
                }
    
                door.getCurrentRoom();
                Game.group.doors.add( model );

                asyncLoop.next();
              });
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadPlaceables(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Placeables');
      let loop = new AsyncLoop({
        array: this.placeables,
        onLoop: (plc, asyncLoop) => {
          plc.Load( ( object ) => {
          
            if(typeof object == 'undefined'){
              asyncLoop.next();
              return;
            }
  
            plc.position.set(plc.getX(), plc.getY(), plc.getZ());
            plc.rotation.set(0, 0, plc.getBearing());
            plc.LoadModel( (model) => {
              plc.LoadWalkmesh(model.name, (pwk) => {
              
                Game.walkmeshList.push( pwk.mesh );
                Game.group.placeables.add( model );
                plc.computeBoundingBox();

                if(pwk.mesh instanceof THREE.Object3D){
                  pwk.mat4 = new THREE.Matrix4();
                  pwk.mat4.makeRotationFromEuler(plc.rotation);
                  pwk.mat4.setPosition( plc.position.x, plc.position.y, plc.position.z + .01 );
                  pwk.mesh.geometry.applyMatrix4(pwk.mat4);
                  //pwk.mesh.position.copy(plc.position);
                  Game.group.room_walkmeshes.add( pwk.mesh );
                }
    
                plc.getCurrentRoom();
    
                asyncLoop._Loop()
              });
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadWaypoints(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Waypoints');
      let loop = new AsyncLoop({
        array: this.waypoints,
        onLoop: (waypnt, asyncLoop) => {
          waypnt.Load( ( object ) => {
          
            if(typeof object == 'undefined'){
              asyncLoop.next();
              return;
            }
  
            let wpObj = new THREE.Object3D();
            wpObj.name = waypnt.getTag();
            wpObj.position.set(waypnt.getXPosition(), waypnt.getYPosition(), waypnt.getZPosition());
            wpObj.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()));
            waypnt.rotation.z = Math.atan2(-waypnt.getYOrientation(), -waypnt.getXOrientation()) + Math.PI/2;
            Game.group.waypoints.add(wpObj);
  
            let _distance = 1000000000;
            let _currentRoom = null;
            let roomCenter = new THREE.Vector3();
            for(let i = 0; i < Game.group.rooms.children.length; i++){
              let room = Game.group.rooms.children[i];
              if(room instanceof THREE.AuroraModel){
                if(room.box.containsPoint(wpObj.position)){
                  room.box.getCenter(roomCenter);
                  let distance = wpObj.position.distanceTo(roomCenter);
                  if(distance < _distance){
                    _distance = distance;
                    _currentRoom = room;
                  }
                }
              }
            }
            wpObj.area = _currentRoom;
  
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadEncounters(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Encounters');
      let loop = new AsyncLoop({
        array: this.encounters,
        onLoop: (encounter, asyncLoop) => {
          try{
            encounter.InitProperties();
            encounter.Load( ( object ) => {
          
              if(typeof object == 'undefined'){
                asyncLoop.next();
                return;
              }
    
              let _distance = 1000000000;
              let _currentRoom = null;
              let roomCenter = new THREE.Vector3();
              for(let i = 0; i < Game.group.rooms.children.length; i++){
                let room = Game.group.rooms.children[i];
                if(room instanceof THREE.AuroraModel){
                  if(room.box.containsPoint(encounter.mesh.position)){
                    room.box.getCenter(roomCenter);
                    let distance = encounter.mesh.position.distanceTo(roomCenter);
                    if(distance < _distance){
                      _distance = distance;
                      _currentRoom = room;
                    }
                  }
                }
              }
              encounter.mesh.area = _currentRoom;
              asyncLoop.next();
            });
          }catch(e){
            console.error(e);
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadTriggers(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Triggers');
      let loop = new AsyncLoop({
        array: this.triggers,
        onLoop: (trig, asyncLoop) => {
          try{
            trig.InitProperties();
            trig.Load( ( object ) => {
          
              if(typeof object == 'undefined'){
                asyncLoop.next();
                return;
              }
    
              let _distance = 1000000000;
              let _currentRoom = null;
              let roomCenter = new THREE.Vector3();
              for(let i = 0; i < Game.group.rooms.children.length; i++){
                let room = Game.group.rooms.children[i];
                if(room instanceof THREE.AuroraModel){
                  if(room.box.containsPoint(trig.mesh.position)){
                    room.box.getCenter(roomCenter);
                    let distance = trig.mesh.position.distanceTo(roomCenter);
                    if(distance < _distance){
                      _distance = distance;
                      _currentRoom = room;
                    }
                  }
                }
              }
              trig.mesh.area = _currentRoom;
              asyncLoop.next();
            });
          }catch(e){
            console.error(e);
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadCreatures(){

    return new Promise( (resolve, reject) => {
      console.log('Loading Creatures');
      let loop = new AsyncLoop({
        array: this.creatures,
        onLoop: (crt, asyncLoop) => {
          crt.Load( ( object ) => {
          
            if(typeof object == 'undefined'){
              asyncLoop.next();
              return;
            }
  
            crt.LoadScripts( () => {
              crt.LoadModel( (model) => {
                crt.model.moduleObject = crt;
                crt.position.x = (crt.getXPosition());
                crt.position.y = (crt.getYPosition());
                crt.position.z = (crt.getZPosition());
                
                //crt.setFacing(Math.atan2(crt.getXOrientation(), crt.getYOrientation()) + Math.PI/2, true);
                crt.setFacing(-Math.atan2(crt.getXOrientation(), crt.getYOrientation()), true);
    
                model.hasCollision = true;
                model.name = crt.getTag();
                //try{ model.buildSkeleton(); }catch(e){}
                Game.group.creatures.add( model );
    
                crt.getCurrentRoom();
    
                asyncLoop.next();
              });
            });

          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  async loadStores(){
    return new Promise( (resolve, reject) => {
      console.log('Loading Stores');
      let loop = new AsyncLoop({
        array: this.stores,
        onLoop: (crt, asyncLoop) => {
          crt.Load( ( object ) => {
          
            if(typeof object == 'undefined'){
              asyncLoop.next();
              return;
            }
  
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });
  }

  //This function is responsible for generating the grass for the current area.
  //I already see a lot of room for improvement here. The shader code will need to be moved to seprate shader files
  //to be pulled in at startup somehow. 
  loadGrass(){

    this.grassMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib[ "fog" ],
        {
          map: { value: null },
          time: { value: 0 },
          ambientColor: { value: new THREE.Color().setHex('0x'+(this.SunFogColor).toString(16)) },
          windPower: { value: this.WindPower },
          playerPosition: { value: new THREE.Vector3 },
          alphaTest: { value: this.AlphaTest }
        }
      ]),
      vertexShader: Shaders['grass'].getVertex(),
      fragmentShader: Shaders['grass'].getFragment(),
      //color: new THREE.Color( 1, 1, 1 ),
      side: THREE.DoubleSide,
      transparent: false,
      fog: true,
      visible: iniConfig.getProperty('Graphics Options.Grass'),
      //blending: 5
    });

    this.grassMaterial.defines.USE_FOG = '';

    let getRandomGrassSpriteIndex = () => {
      let rnd = Math.random();
      if(rnd < this.Grass.Prob_UL){
        return 0;
      }else if(rnd < this.Grass.Prob_UL + this.Grass.Prob_UR){
        return 1;
      }else if(rnd < this.Grass.Prob_UL + this.Grass.Prob_UR + this.Grass.Prob_LL){
        return 2;
      }else{
        return 3;
      }
    };

    if(this.Grass.TexName){

      //Load in the grass texture
      TextureLoader.Load(this.Grass.TexName, (grassTexture) => {
        this.grassMaterial.uniforms.map.value = grassTexture;
        grassTexture.minFilter = THREE.LinearFilter;
        grassTexture.magFilter = THREE.LinearFilter;
        this.grassMaterial.uniformsNeedUpdate = true;
        this.grassMaterial.needsUpdate = true;
      });

      //Build the grass instance
      let grassGeometry = new THREE.Geometry();
      
      for(let i = 0; i < 4; i++){
        let blade = new THREE.PlaneGeometry(this.Grass.QuadSize, this.Grass.QuadSize, 1);
        blade.rotateX(Math.PI/2);
        blade.rotateZ(Math.PI/4 * i);
        grassGeometry.merge(blade, new THREE.Matrix4());
        blade.dispose();
      }

      //Convert the geometry object to a BufferGeometry instance
      grassGeometry = new THREE.BufferGeometry().fromGeometry(grassGeometry);

      //The constraint array is a per vertex array to determine if the current vertex in the vertex shader
      //can be affected by wind. 1 = Wind 0 = No Wind
      let constraint = new Float32Array([
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1,
        1, 0, 1, 0, 0, 1
      ]);
      grassGeometry.setAttribute('constraint', new THREE.BufferAttribute( constraint, 1) );

      //QuadIdx is used to track the current quad index inside the vertex shader
      let quadIdx = new Float32Array([
        0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1,
        2, 2, 2, 2, 2, 2,
        3, 3, 3, 3, 3, 3,
      ]);
      grassGeometry.setAttribute('quadIdx', new THREE.BufferAttribute( quadIdx, 1) );
      
      let geometry = new THREE.InstancedBufferGeometry();
      geometry.index = grassGeometry.index;
      geometry.attributes.position = grassGeometry.attributes.position;
      geometry.attributes.constraint = grassGeometry.attributes.constraint;
      geometry.attributes.quadIdx = grassGeometry.attributes.quadIdx;
      geometry.attributes.uv = grassGeometry.attributes.uv;

      // per instance data
      let offsets = [];
      let grassUVs = [];
      let vector = new THREE.Vector4();

      //this.grassInstances = [];

      let density = this.Grass.Density;

      let rLen = this.rooms.length;
      for(let i = 0; i < rLen; i++){
        let room = this.rooms[i];
        if(room.model.wok instanceof AuroraWalkMesh){
          if(room.model.wok.grassFaces.length){
            for(let i = 0; i < room.model.wok.grassFaces.length; i++){
              let face = room.model.wok.grassFaces[i];
  
              //FACE A
              let FA = room.model.wok.vertices[face.a];
              //FACE B
              let FB = room.model.wok.vertices[face.b];
              //FACE C
              let FC = room.model.wok.vertices[face.c];
  
              let triangle = new THREE.Triangle(FA,FB,FC);
              let area = triangle.getArea();
              let grassCount = ((area) * density)*.25;
  
              if(grassCount < 1){
                grassCount = 1;
              }

              let quadOffsetZ = this.Grass.QuadSize/2;
  
              for(let j = 0; j < grassCount; j++){

                let instance = {
                  position: {x: 0, y: 0, z: 0},
                  orientation: {x: 0, y: 0, z: 0, w: 0},
                  uvs: {uv1: getRandomGrassSpriteIndex(), uv2: getRandomGrassSpriteIndex(), uv3: getRandomGrassSpriteIndex(), uv4: getRandomGrassSpriteIndex()}
                };
  
                // offsets
                let a = Math.random();
                let b = Math.random();
  
                if (a + b > 1) {
                  a = 1 - a;
                  b = 1 - b;
                }
  
                let c = 1 - a - b;
  
                vector.x = (a * FA.x) + (b * FB.x) + (c * FC.x);
                vector.y = (a * FA.y) + (b * FB.y) + (c * FC.y);
                vector.z = (a * FA.z) + (b * FB.z) + (c * FC.z) + quadOffsetZ;

                instance.position = {x: vector.x, y: vector.y, z: vector.z};
  
                // orientations
                let r = Math.floor(Math.random() * 360) + 0;

                instance.orientation = r;

                //this.grassInstances.push(instance);
                offsets.push( instance.position.x, instance.position.y, instance.position.z, instance.orientation );
                grassUVs.push(instance.uvs.uv1, instance.uvs.uv2, instance.uvs.uv3, instance.uvs.uv4);

              }
            }
          }
        }
      }

      /*for(let i = 0, il = this.grassInstances.length; i < il; i++){
        let instance = this.grassInstances[i];
        offsets.push( instance.position.x, instance.position.y, instance.position.z, instance.orientation );
        grassUVs.push(instance.uvs.uv1, instance.uvs.uv2, instance.uvs.uv3, instance.uvs.uv4);
      }*/

      let offsetAttribute = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 4 ).setUsage( THREE.StaticDrawUsage );
      let grassUVAttribute = new THREE.InstancedBufferAttribute( new Float32Array( grassUVs ), 4 ).setUsage( THREE.StaticDrawUsage );
      geometry.setAttribute( 'offset', offsetAttribute );
      geometry.setAttribute( 'grassUV', grassUVAttribute );
      this.grassMesh = new THREE.Mesh( geometry, this.grassMaterial );
      this.grassMesh.frustumCulled = false;
      Game.group.grass.add(this.grassMesh);

    }

  }

  async loadSoundTemplates (){

    return new Promise( (resolve, reject) => {
      console.log('Loading Sound Emitter');
      let loop = new AsyncLoop({
        array: this.sounds,
        onLoop: (sound, asyncLoop) => {
          sound.Load( () => {
            sound.LoadSound( () => {
              asyncLoop.next();
            });
          });
        }
      });
      loop.iterate(() => {
        resolve();
      });

    });

  }

  loadAudio( ){
    return new Promise( (resolve, reject) => {
      let ambientDay = Global.kotor2DA['ambientsound'].rows[this.audio.AmbientSndDay].resource;

      AudioLoader.LoadAmbientSound(ambientDay, (data) => {
        //console.log('Loaded Ambient Sound', ambientDay);
        Game.audioEngine.SetAmbientSound(data);
        resolve();
      }, () => {
        console.error('Ambient Audio not found', ambientDay);
        resolve();
      });
    });
  }

  loadBackgroundMusic(){
    return new Promise( (resolve, reject) => {
      let bgMusic = Global.kotor2DA['ambientmusic'].rows[this.audio.MusicDay].resource;

      AudioLoader.LoadMusic(bgMusic, (data) => {
        //console.log('Loaded Background Music', bgMusic);
        Game.audioEngine.SetBackgroundMusic(data);
        resolve();
      }, () => {
        console.error('Background Music not found', bgMusic);
        resolve();
      });
    });
  }

  async loadTextures(){
    return new Promise( (resolve, reject) => {
      TextureLoader.LoadQueue(() => {
        resolve();
      }, (texName) => {
        
      });
    });
  }

  LoadScripts(onLoad = null){
    console.log('ModuleArea.LoadScripts');
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
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  async initAreaObjects(runSpawnScripts = false){

    for(let i = 0; i < Game.module.area.doors.length; i++){
      if(Game.module.area.doors[i] instanceof ModuleObject){
        await Game.module.area.doors[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < Game.module.area.placeables.length; i++){
      if(Game.module.area.placeables[i] instanceof ModuleObject){
        await Game.module.area.placeables[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < Game.module.area.triggers.length; i++){
      if(Game.module.area.triggers[i] instanceof ModuleObject){
        await Game.module.area.triggers[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < Game.module.area.waypoints.length; i++){
      if(Game.module.area.waypoints[i] instanceof ModuleObject){
        await Game.module.area.waypoints[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < Game.module.area.creatures.length; i++){
      if(Game.module.area.creatures[i] instanceof ModuleObject){
        await Game.module.area.creatures[i].onSpawn(runSpawnScripts);
      }
    }

    for(let i = 0; i < PartyManager.party.length; i++){
      if(PartyManager.party[i] instanceof ModuleObject){
        await PartyManager.party[i].onSpawn(runSpawnScripts);
      }
    }

    await this.runStartScripts();

  }

  runOnEnterScripts(){
    return new Promise( (resolve, reject) => {
      if(this.scripts.onEnter instanceof NWScriptInstance){
        console.log('onEnter', this.scripts.onEnter)
        this.scripts.onEnter.enteringObject = Game.player;
        this.scripts.onEnter.debug.action = true;
        this.scripts.onEnter.run(this, 0, () => {
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  runMiniGameScripts(){
    return new Promise( (resolve, reject) => {

      if(!this.MiniGame){
        resolve();
        return;
      }

      let loop = new AsyncLoop({
        array: this.area.MiniGame.Enemies,
        onLoop: (enemy, asyncLoop) => {
          if(enemy.scripts.onCreate instanceof NWScriptInstance){
            enemy.scripts.onCreate.run(enemy, 0, () => {
              asyncLoop.next();
            });
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

  async runStartScripts(){
    await this.runMiniGameScripts();
    await this.runOnEnterScripts();
  }

  isPointWalkable(point){
    for(let i = 0, len = this.rooms.length; i < len; i++){
      if(this.rooms[i].walkmesh && this.rooms[i].walkmesh.isPointWalkable(point)){
        return true;
      }
    }
    return false;
  }

  getNearestWalkablePoint(point){
    let nearest = Infinity;
    let nearest_point = undefined;

    let p = undefined;
    let p_dist = 0;
    for(let i = 0, len = this.rooms.length; i < len; i++){
      if(this.rooms[i].walkmesh){
        p = this.rooms[i].walkmesh.getNearestWalkablePoint(point);
        if(p){
          p_dist = p.distanceTo(point);
          if(p_dist < nearest){
            nearest_point = p;
            nearest = p_dist;
          }
        }
      }
    }
    return nearest_point;
  }

  toolsetExportARE(){
    let are = new GFFObject();
    are.FileType = 'ARE ';
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'AlphaTest', this.AlphaTest)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'CameraStyle', this.CameraStyle)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ChanceLightning', this.ChanceLightning)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ChanceRain', this.ChanceRain)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ChanceSnow', this.ChanceSnow)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.CEXOSTRING, 'Comments', this.Comments)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'Creator_ID', this.Creator_ID)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'DayNightCycle', this.DayNightCycle)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'DefaultEnvMap', this.DefaultEnvMap)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'DynAmbientColor', this.DynAmbientColor)
    );

    are.RootNode.AddField(
      new Field(GFFDataTypes.LIST, 'Expansion_List')
    );

    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'Flags', this.Flags)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'Grass_Ambient', this.Grass.Ambient)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_Density', this.Grass.Density)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'Grass_Diffuse', this.Grass.Diffuse)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_Prob_LL', this.Grass.Prob_LL)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_Prob_LR', this.Grass.Prob_LR)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_Prob_UL', this.Grass.Prob_UL)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_Prob_UR', this.Grass.Prob_UR)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'Grass_QuadSize', this.Grass.QuadSize)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'Grass_TexName', this.Grass.TexName)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ID', this.ID)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'IsNight', this.IsNight)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'LightingScheme', this.LightingScheme)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.WORD, 'LoadScreenID', this.LoadScreenID)
    );

    let mapStruct = new Struct(14);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'MapPt1X') ).SetValue(this.Map.MapPt1X);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'MapPt1Y') ).SetValue(this.Map.MapPt1Y);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'MapPt2X') ).SetValue(this.Map.MapPt2X);
    mapStruct.AddField( new Field(GFFDataTypes.INT, 'MapPt2Y') ).SetValue(this.Map.MapPt2Y);
    mapStruct.AddField( new Field(GFFDataTypes.INT, 'MapResX') ).SetValue(this.Map.MapResX);
    mapStruct.AddField( new Field(GFFDataTypes.INT, 'MapZoom') ).SetValue(this.Map.MapZoom);
    mapStruct.AddField( new Field(GFFDataTypes.INT, 'NorthAxis') ).SetValue(this.Map.NorthAxis);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'WorldPt1X') ).SetValue(this.Map.WorldPt1X);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'WorldPt1Y') ).SetValue(this.Map.WorldPt1Y);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'WorldPt2X') ).SetValue(this.Map.WorldPt2X);
    mapStruct.AddField( new Field(GFFDataTypes.FLOAT, 'WorldPt2Y') ).SetValue(this.Map.WorldPt2Y);

    let mapField = new Field(GFFDataTypes.STRUCT, 'Map');
    mapField.AddChildStruct(mapStruct);
    are.RootNode.AddField(mapField);


    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ModListenCheck', this.ModListenCheck)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'ModSpotCheck', this.ModSpotCheck)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'MoonAmbientColor', this.MoonAmbientColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'MoonDiffuseColor', this.MoonDiffuseColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'MoonFogColor', this.MoonFogColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'MoonFogFar', this.MoonFogFar)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'MoonFogNear', this.MoonFogNear)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'MoonFogOn', this.MoonFogOn)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'MoonShadows', this.MoonShadows)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'Name', this.Name)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'NoHangBack', this.NoHangBack)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'NoRest', this.NoRest)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'OnEnter', this.onEnter)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'OnExit', this.onExit)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'OnHeartbeat', this.onHeartbeat)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'OnUserDefined', this.onUserDefined)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'PlayerOnly', this.PlayerOnly)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'PlayerVsPlayer', this.PlayerVsPlayer)
    );

    let roomsField = new Field(GFFDataTypes.LIST, 'Rooms');
    for(let i = 0, len = this.rooms.length; i < len; i++){
      roomsField.AddChildStruct(this.rooms[i].toToolsetInstance());
    }
    are.RootNode.AddField(roomsField);

    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'ShadowOpacity', this.ShadowOpacity)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'StealthXPEnabled', this.StealthXPEnabled)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'StealthXPLoss', this.StealthXPLoss)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'StealthXPMax', this.StealthXPMax)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'SunAmbientColor', this.SunAmbientColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'SunDiffuseColor', this.SunDiffuseColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'SunFogColor', this.SunFogColor)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'SunFogFar', this.SunFogFar)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.FLOAT, 'SunFogNear', this.SunFogNear)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'SunFogOn', this.SunFogOn)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'SunShadows', this.SunShadows)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.RESREF, 'Tag', this.Tag)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.BYTE, 'Unescapable', this.Unescapable)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.DWORD, 'Version', this.Version)
    );
    are.RootNode.AddField(
      new Field(GFFDataTypes.INT, 'WindPower', this.WindPower)
    );

    return are;

  }

  getAreaMapStruct(){
    let struct = new Struct();
    struct.AddField( new Field(GFFDataTypes.VOID, 'AreaMapData') ).SetData(Buffer.alloc(20));
    struct.AddField( new Field(GFFDataTypes.DWORD, 'AreaMapDataSize') ).SetValue(20);
    struct.AddField( new Field(GFFDataTypes.INT, 'AreaMapResX') ).SetValue(15);
    struct.AddField( new Field(GFFDataTypes.INT, 'AreaMapResY') ).SetValue(8);
    return struct;
  }

  getAreaPropertiesStruct(){
    let struct = new Struct();
    struct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndDay') ).SetValue(this.audio.AmbientSndDay);
    struct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndDayVol') ).SetValue(this.audio.AmbientSndDayVol);
    struct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndNight') ).SetValue(this.audio.AmbientSndNight);
    struct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndNitVol') ).SetValue(this.audio.AmbientSndNitVol);
    struct.AddField( new Field(GFFDataTypes.INT, 'EnvAudio') ).SetValue(this.audio.EnvAudio);
    
    struct.AddField( new Field(GFFDataTypes.INT, 'MusicBattle') ).SetValue(this.audio.MusicBattle);
    struct.AddField( new Field(GFFDataTypes.INT, 'MusicDay') ).SetValue(this.audio.MusicDay);
    struct.AddField( new Field(GFFDataTypes.INT, 'MusicDelay') ).SetValue(this.audio.MusicDelay);
    struct.AddField( new Field(GFFDataTypes.INT, 'MusicNight') ).SetValue(this.audio.MusicNight);

    struct.AddField( new Field(GFFDataTypes.BYTE, 'RestrictMode') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'StealthXPCurrent') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'StealthXPLoss') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'StealthXPMax') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.DWORD, 'SunFogColor') ).SetValue(0);
    
    struct.AddField( new Field(GFFDataTypes.BYTE, 'TransPendCurrID') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'TransPendNextID') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'TransPending') ).SetValue(0);
    struct.AddField( new Field(GFFDataTypes.BYTE, 'Unescapable') ).SetValue(this.Unescapable);
    return struct;
  }

  saveAreaListStruct(){
    let areaStruct = new Struct();
    areaStruct.AddField( new Field(GFFDataTypes.RESREF, 'Area_Name') ).SetValue(this._name);
    areaStruct.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue(this.id);
    //unescapable
    return areaStruct;
  }

  save(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let aoeList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'AreaEffectList') );
    let areaMapField = git.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'AreaMap') );
    areaMapField.AddChildStruct( this.getAreaMapStruct() );

    let areaPropertiesField = git.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'AreaProperties') );
    areaPropertiesField.AddChildStruct( this.getAreaPropertiesStruct() );

    let cameraList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'CameraList') );
    for(let i = 0; i < this.cameras.length; i++){
      cameraList.AddChildStruct( this.cameras[i].save().RootNode );
    }

    let creatureList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Creature List') );
    for(let i = 0; i < this.creatures.length; i++){
      creatureList.AddChildStruct( this.creatures[i].save().RootNode );
    }

    git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'CurrentWeather') ).SetValue(0);

    let doorList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Door List') );
    for(let i = 0; i < this.doors.length; i++){
      doorList.AddChildStruct( this.doors[i].save().RootNode );
    }

    let encounterList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Encounter List') );
    for(let i = 0; i < this.encounters.length; i++){
      encounterList.AddChildStruct( this.encounters[i].save().RootNode );
    }

    //Area Items List
    let list = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'List') );

    let placeableList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'Placeable List') );
    for(let i = 0; i < this.placeables.length; i++){
      placeableList.AddChildStruct( this.placeables[i].save().RootNode );
    }

    //SWVarTable
    let swVarTable = git.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    let soundList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'SoundList') );
    for(let i = 0; i < this.sounds.length; i++){
      soundList.AddChildStruct( this.sounds[i].save().RootNode );
    }

    let storeList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'StoreList') );
    for(let i = 0; i < this.stores.length; i++){
      storeList.AddChildStruct( this.stores[i].save().RootNode );
    }
    
    git.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TransPendCurrID') ).SetValue(0);
    git.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TransPendNextID') ).SetValue(0);
    git.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TransPending') ).SetValue(0);

    let triggerList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'TriggerList') );
    for(let i = 0; i < this.triggers.length; i++){
      triggerList.AddChildStruct( this.triggers[i].save().RootNode );
    }

    git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'VarTable') );

    let waypointList = git.RootNode.AddField( new Field(GFFDataTypes.LIST, 'WaypointList') );
    for(let i = 0; i < this.waypoints.length; i++){
      waypointList.AddChildStruct( this.waypoints[i].save().RootNode );
    }
    
    git.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'WeatherStarted') ).SetValue(0);

    this.git = git;

    this.are.FileType = 'ARE ';

    return {git: git, are: this.are};
  }

  toolsetExportGIT(){
    let git = new GFFObject();
    git.FileType = 'GIT ';

    let areaPropertiesStruct = new Struct(14);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndDay') ).SetValue(this.audio.AmbientSndDay);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndDayVol') ).SetValue(this.audio.AmbientSndDayVol);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndNight') ).SetValue(this.audio.AmbientSndNight);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'AmbientSndNitVol') ).SetValue(this.audio.AmbientSndNitVol);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'EnvAudio') ).SetValue(this.audio.EnvAudio);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'MusicBattle') ).SetValue(this.audio.MusicBattle);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'MusicDay') ).SetValue(this.audio.MusicDay);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'MusicDelay') ).SetValue(this.audio.MusicDelay);
    areaPropertiesStruct.AddField( new Field(GFFDataTypes.INT, 'MusicNight') ).SetValue(this.audio.MusicNight);

    let areaPropertiesField = new Field(GFFDataTypes.STRUCT, 'AreaProperties');
    areaPropertiesField.AddChildStruct(areaPropertiesStruct);
    git.RootNode.AddField(areaPropertiesField);

    let camerasField = new Field(GFFDataTypes.LIST, 'CameraList');
    for(let i = 0, len = this.cameras.length; i < len; i++){
      camerasField.AddChildStruct(this.cameras[i].toToolsetInstance());
    }
    git.RootNode.AddField(camerasField);

    let creaturesField = new Field(GFFDataTypes.LIST, 'Creature List');
    for(let i = 0, len = this.creatures.length; i < len; i++){
      creaturesField.AddChildStruct(this.creatures[i].toToolsetInstance());
    }
    git.RootNode.AddField(creaturesField);

    let doorsField = new Field(GFFDataTypes.LIST, 'Door List');
    for(let i = 0, len = this.doors.length; i < len; i++){
      doorsField.AddChildStruct(this.doors[i].toToolsetInstance());
    }
    git.RootNode.AddField(doorsField);

    let encountersField = new Field(GFFDataTypes.LIST, 'Encounter List');
    for(let i = 0, len = this.encounters.length; i < len; i++){
      encountersField.AddChildStruct(this.encounters[i].toToolsetInstance());
    }
    git.RootNode.AddField(encountersField);

    let listField = new Field(GFFDataTypes.LIST, 'List');
    git.RootNode.AddField(listField);

    let placeablesField = new Field(GFFDataTypes.LIST, 'Placeable List');
    for(let i = 0, len = this.placeables.length; i < len; i++){
      placeablesField.AddChildStruct(this.placeables[i].toToolsetInstance());
    }
    git.RootNode.AddField(placeablesField);

    let soundsField = new Field(GFFDataTypes.LIST, 'SoundList');
    for(let i = 0, len = this.sounds.length; i < len; i++){
      soundsField.AddChildStruct(this.sounds[i].toToolsetInstance());
    }
    git.RootNode.AddField(soundsField);

    let storesField = new Field(GFFDataTypes.LIST, 'StoreList');
    for(let i = 0, len = this.stores.length; i < len; i++){
      storesField.AddChildStruct(this.stores[i].toToolsetInstance());
    }
    git.RootNode.AddField(storesField);

    let triggersField = new Field(GFFDataTypes.LIST, 'TriggerList');
    for(let i = 0, len = this.triggers.length; i < len; i++){
      triggersField.AddChildStruct(this.triggers[i].toToolsetInstance());
    }
    git.RootNode.AddField(triggersField);

    git.RootNode.AddField(new Field(GFFDataTypes.BYTE, 'UseTemplates')).SetValue(1);

    let waypointsField = new Field(GFFDataTypes.LIST, 'WaypointList');
    for(let i = 0, len = this.waypoints.length; i < len; i++){
      waypointsField.AddChildStruct(this.waypoints[i].toToolsetInstance());
    }
    git.RootNode.AddField(waypointsField);

    return git;
  }

}

class AreaMap {

  //MapWidth = 440;
  //MapHeight = 256;

  constructor(){
    this.data = Buffer.alloc(4);

    this.mapResX = 0;
    this.mapResY = 0;
    this.northAxis = 0;
    this.worldPt1X = 0;
    this.worldPt1Y = 0;
    this.worldPt2X = 0;
    this.worldPt2Y = 0;
    this.mapPt1X = 0;
    this.mapPt1Y = 0;
    this.mapPt2X = 0;
    this.mapPt2Y = 0;
    this.mapZoom = 0;

  }

  init(){

    this.generateResY();
  }

  setResX( mapResX = 0 ){
    this.mapResX = mapResX;
    this.generateResY();
  }

  generateResY(){
    this.mapResY = Math.floor((this.mapResX * 256) / 440);
  }

  generateMapData(){
    let dataSize = (this.mapResY + 1) * (this.mapResX + 1) / 33;

    this.data = Buffer.alloc(dataSize);
  }

  loadDataStruct( struct = undefined ){
    if(struct instanceof Struct){
      this.data = struct.GetFieldByLabel('AreaMapData').GetVoid();
      this.dataSize = struct.GetFieldByLabel('AreaMapDataSize').GetValue();
      this.mapResX = struct.GetFieldByLabel('AreaMapResX').GetValue();
      this.mapResY = struct.GetFieldByLabel('AreaMapResY').GetValue();
    }
  }

  static FromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let areaMap = new AreaMap();

      areaMap.mapPt1X = struct.GetFieldByLabel('MapPt1X').GetValue();
      areaMap.mapPt1Y = struct.GetFieldByLabel('MapPt1Y').GetValue();
      areaMap.mapPt2X = struct.GetFieldByLabel('MapPt2X').GetValue();
      areaMap.mapPt2Y = struct.GetFieldByLabel('MapPt2Y').GetValue();
      areaMap.mapResX = struct.GetFieldByLabel('MapResX').GetValue();
      areaMap.mapZoom = struct.GetFieldByLabel('MapZoom').GetValue();
      areaMap.northAxis = struct.GetFieldByLabel('NorthAxis').GetValue();
      areaMap.worldPt1X = struct.GetFieldByLabel('WorldPt1X').GetValue();
      areaMap.worldPt1Y = struct.GetFieldByLabel('WorldPt1Y').GetValue();
      areaMap.worldPt2X = struct.GetFieldByLabel('WorldPt2X').GetValue();
      areaMap.worldPt2Y = struct.GetFieldByLabel('WorldPt2Y').GetValue();

      areaMap.init();

      return areaMap;
    }
  }

}

AreaMap.MAP_DIRECTION = {
  NORTH: 0,
  SOUTH: 1,
  EAST:  2,
  WEST:  3
};

ModuleArea.AreaMap = AreaMap;

module.exports = ModuleArea;