/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleArea class.
 */

class ModuleArea extends ModuleObject {

  constructor(name = '', are = new GFFObject(), git = new GFFObject()){
    super();
    this._name = name;
    this.are = are;
    this.git = git;

    this.transWP = '';

    this.audio = {
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

    this.AlphaTest = 0.200000002980232;
    this.CameraStyle = 0;
    this.ChanceLightning = 0;
    this.ChanceRain = 0;
    this.ChanceSnow = 0;
    this.Comments = '';
    this.Creator_ID = 0;
    this.DayNightCycle = 0;
    this.DefaultEnvMap = '';
    this.DynAmbientColor = 6312778;
    this.Expansion_List = [];
    this.Flags = 1;
    this.Grass = {
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
    this.ID = 0;
    this.IsNight = 0;
    this.LightingScheme = 0;
    this.LoadScreenID = 0;
    this.Map = {
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

    this.cameras = [];
    this.doors = [];
    this.placeables = [];
    this.party = [];
    this.sounds = [];
    this.stores = [];
    this.encounters = [];
    this.triggers = [];
    this.waypoints = [];
    this.creatures = [];
    this.rooms = [];
    this.doorhooks = [];
    this.tracks = [];
    this.obstacles = [];
    this.party = [];
    //this.player = null;

  }

  SetTransitionWaypoint(sTag = ''){
    this.transWP = sTag;
  }

  Load(onLoad = null){

    //BEGIN AREA LOAD

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

    this.scripts = {
      OnEnter: this.are.GetFieldByLabel('OnEnter').GetValue(),
      OnExit: this.are.GetFieldByLabel('OnExit').GetValue(),
      OnHeartbeat: this.are.GetFieldByLabel('OnHeartbeat').GetValue(),
      OnUserDefined: this.are.GetFieldByLabel('OnUserDefined').GetValue()
    };

    this.PlayerOnly = this.are.GetFieldByLabel('PlayerOnly').GetValue();
    this.PlayerVsPlayer = this.are.GetFieldByLabel('PlayerVsPlayer').GetValue();

    //Rooms
    for(let i = 0; i != rooms.ChildStructs.length; i++ ){
      let strt = rooms.ChildStructs[i];
      let room = {};
      room['AmbientScale'] = this.are.GetFieldByLabel('AmbientScale', strt.GetFields()).GetValue();
      room['EnvAudio'] = this.are.GetFieldByLabel('EnvAudio', strt.GetFields()).GetValue();
      room['RoomName'] = this.are.GetFieldByLabel('RoomName', strt.GetFields()).GetValue().toLowerCase();
      //console.ldog(room);
      this.rooms.push( room );
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

    if(this.SunFogOn){
      Game.scene.fog = new THREE.Fog(
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
      this.audio.EnvAudio = '';
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
      //this.encounters.push( new ModuleEncounter(GFFObject.FromStruct(strt)) );
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
      //this.stores.push( new ModuleStore(GFFObject.FromStruct(strt)) );
    }

    //Waypoints
    for(let i = 0; i != waypoints.ChildStructs.length; i++ ){
      let strt = waypoints.ChildStructs[i];
      if(this.transWP == strt.GetFieldByLabel('Tag').GetValue().toLowerCase()){
        this.transWP = GFFObject.FromStruct(strt);
      }
      this.waypoints.push( new ModuleWaypoint(GFFObject.FromStruct(strt)) );
    }

    if(this.git.RootNode.HasField('SWVarTable')){
      let localBools = this.git.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    Game.AlphaTest = 0.5;//this.Alphatest;

    this.loadPath( () => {
      this.LoadVis( () => {
        this.LoadLayout( () => {
          this.LoadScripts( () => {
            if(typeof onLoad == 'function')
              onLoad(this);
          });
        });
      });
    });

  }

  loadPath(onLoad = null){
    this.path = new ModulePath(this._name);
    this.path.Load( () => {
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadVis(onLoad = null){
    ResourceLoader.loadResource(ResourceTypes['vis'], this._name, (visData) => {
      this.visObject = new VISObject(visData);
      if(typeof onLoad == 'function')
        onLoad(this);
    });
  }

  LoadLayout(onLoad = null){
    ResourceLoader.loadResource(ResourceTypes['lyt'], this._name, (data) => {
      let lyt = new LYTObject(data);

      for(let i = 0; i != lyt.rooms.length; i++){
        let _room = lyt.rooms[i];
        for(let r = 0; r != this.rooms.length; r++ ){
          let room = this.rooms[r];
          if(room['RoomName'].toLowerCase() == _room['name'].toLowerCase()){
            room.x = _room.x;
            room.y = _room.y;
            room.z = _room.z;
          }
        }
      }

      for(let i = 0; i != lyt.doorhooks.length; i++){
        let _doorHook = lyt.doorhooks[i];
        this.doorhooks.push(_doorHook);
      }

      for(let i = 0; i != lyt.tracks.length; i++){
        this.tracks.push(new ModuleMGTrack(lyt.tracks[i]));
      }

      for(let i = 0; i != lyt.obstacles.length; i++){
        let _obstacle = lyt.obstacles[i];
        this.obstacles.push(_obstacle);
      }

      if(typeof onLoad == 'function')
        onLoad(this);

    });
  }

  LoadScripts(onLoad = null){
    
    let keys = Object.keys(this.scripts);
    let len = keys.length;

    let loadScript = ( onLoad = null, i = 0 ) => {
      
      if(i < len){
        let script = this.scripts[keys[i]];
        console.error('ModuleArea.script', script);

        if(script != ''){
          ResourceLoader.loadResource(ResourceTypes['ncs'], script, (buffer) => {
            this.scripts[keys[i]] = new NWScript(buffer);
            this.scripts[keys[i]].name = script;
            loadScript( onLoad, ++i );
          }, (e) => {
            console.error('ModuleArea.script', e);
            loadScript( onLoad, ++i );
          });
        }else{
          loadScript( onLoad, ++i );
        }
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
  
    };
    loadScript(onLoad, 0);
  }

}
module.exports = ModuleArea;