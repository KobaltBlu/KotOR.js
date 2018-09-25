/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The SaveGame class.
 */

class SaveGame {

  constructor(name = ''){

    this.folderName = name;
    this.directory = path.join(SaveGame.directory, this.folderName);
    this.isLoaded = false;    

    this.savenfo = new GFFObject(path.join(this.directory, 'savenfo.res'), (savenfo) => {
      
    });
    this.thumbnail = null;
  }

  getAreaName(){
    if(this.savenfo.RootNode.HasField('AREANAME')){
      return this.savenfo.GetFieldByLabel('AREANAME').GetValue()
    }
    return '';
  }

  getLastModule(){
    if(this.savenfo.RootNode.HasField('LASTMODULE')){
      return this.savenfo.GetFieldByLabel('LASTMODULE').GetValue()
    }
    return null;
  }

  getSaveName(){
    if(this.savenfo.RootNode.HasField('SAVEGAMENAME')){
      return this.savenfo.GetFieldByLabel('SAVEGAMENAME').GetValue()
    }
    return '';
  }

  getFullName(){
    if(this.getSaveName() != ''){
      return this.folderName.split(' - ')[1] + ' - ' + this.getSaveName();
    }else{
      return this.folderName.split(' - ')[1];
    }
  }

  GetThumbnail( onLoad = null ){

    if(this.thumbnail == null){
      console.log(path.join(this.directory, 'Screen.tga'));
      TextureLoader.tgaLoader.load_local(
        path.join(this.directory, 'Screen.tga'),
        (texture) => {
          console.log(texture)
          this.thumbnail = texture;
          if(typeof onLoad === 'function'){
            onLoad(this.thumbnail);
          }
        },
        null,
        true
      )
    }else{
      if(typeof onLoad === 'function'){
        onLoad(this.thumbnail);
      }
    }

  }

  GetPortrait(nth = 0, onLoad = null){

    let name = '';

    if(this.savenfo.RootNode.HasField('PORTRAIT'+nth)){
      name = this.savenfo.RootNode.GetFieldByLabel(('PORTRAIT')+nth).GetValue();
    }
    if(name != ''){
      console.log(name)
      TextureLoader.Load(name, (texture) => {
        if(typeof onLoad === 'function'){
          onLoad(texture);
        }
      });
    }else{
      if(typeof onLoad === 'function'){
        onLoad(null);
      }
    }

  }

  Load( onLoad = null ){
    Game.isLoadingSave = true;
    this.globalVars = new GFFObject(path.join(this.directory, 'GLOBALVARS.res'), (globalVars) => {

      let catNum = new BinaryReader(globalVars.json.fields.ValNumber.value);
      for(let i = 0; i < globalVars.json.fields.CatNumber.structs.length; i++){
        let node = globalVars.json.fields.CatNumber.structs[i];
        Game.Globals.Number[node.fields.Name.value.toLowerCase()] = catNum.ReadByte();
      }

      let catBool = globalVars.json.fields.ValBoolean.value;
      let numBool = globalVars.json.fields.CatBoolean.structs.length;
      for(let i = 0; i < numBool; i++){
        let index = Math.round(Math.floor((i / 8.0)));
        let bit = Math.round(((i - index * 8)))
        let node = globalVars.json.fields.CatBoolean.structs[i];
        Game.Globals.Boolean[node.fields.Name.value.toLowerCase()] = (catBool[index] & bit) > 0;
      }

      for(let i = 0; i < globalVars.json.fields.CatString.structs.length; i++){
        let node = globalVars.json.fields.CatString.structs[i];
        Game.Globals.String[node.fields.Name.value] = globalVars.json.fields.ValString.structs[i].fields.String.value;
      }

      this.SAVEGAME = new ERFObject(path.join(this.directory, 'SAVEGAME.sav'), (sav) => {

        this.isLoaded = true;
        Game.SaveGame = this;

        this.SAVEGAME.getRawResource('inventory', 0, (d) => {
          this.inventory = new GFFObject(d);
          let invArr = this.inventory.RootNode.GetFieldByLabel('ItemList').GetChildStructs();

          let inventoryLoader = (i = 0, onLoad = null) => {
            if(i < invArr.length){
              InventoryManager.addItem(GFFObject.FromStruct(invArr[i]), () => {
                inventoryLoader(++i, onLoad);
              });
            }else{
              if(typeof onLoad === 'function')
                onLoad();
            }
          }
          inventoryLoader(0, () => {
            this.partytable = new GFFObject(path.join(this.directory, 'PARTYTABLE.res'), (partytable) => {

              if(partytable.RootNode.HasField('GlxyMap')){
                let GlxyMap = partytable.GetFieldByLabel('GlxyMap').GetChildStructs()[0];
                
                let planetCount = GlxyMap.GetFieldByLabel('GlxyMapNumPnts').GetValue();
                let planetBits = GlxyMap.GetFieldByLabel('GlxyMapPlntMsk').GetValue(); //Max 32?
                let currentPlanet = GlxyMap.GetFieldByLabel('GlxyMapSelPnt').GetValue();

                for(let i = 0; i < planetCount; i++){
                  Planetary.SetPlanetAvailable(i,  (planetBits>>i) % 2 != 0);
                }

                Planetary.SetCurrentPlanet(currentPlanet);
              }
            
              if(partytable.RootNode.HasField('PT_AVAIL_NPCS')){
                let avail = partytable.GetFieldByLabel('PT_AVAIL_NPCS').GetChildStructs();
                for(let i = 0; i < avail.length; i++){
                  console.log(PartyManager.NPCS[i]);
                  PartyManager.NPCS[i].available = avail[i].GetFieldByLabel('PT_NPC_AVAIL').GetValue();
                  PartyManager.NPCS[i].canSelect = avail[i].GetFieldByLabel('PT_NPC_SELECT').GetValue();
                }
              }
        
              if(partytable.RootNode.HasField('PT_MEMBERS')){
                let pms = partytable.GetFieldByLabel('PT_MEMBERS').GetChildStructs();
                let currentPartyInfo = [];
  
                for(let i = 0; i < pms.length; i++){
                  PartyManager.CurrentMembers.push(
                    {
                      isLeader: pms[i].GetFieldByLabel('PT_IS_LEADER').GetValue() ? true : false,
                      memberID: pms[i].GetFieldByLabel('PT_MEMBER_ID').GetValue()
                    }
                  )
                }
  
                let ptLoader = ( id = 0, onLoad = null ) => {
  
                  if(id < 9){
  
                    this.SAVEGAME.getRawResource('availnpc'+id, ResourceTypes.utc, (pm) => {
                      PartyManager.NPCS[id].template = null;
                      if(pm.length){
                        PartyManager.NPCS[id].template = new GFFObject(pm);
                      }
                      id++
                      ptLoader(id, onLoad);
                    });
  
                  }else{
                    if(typeof onLoad === 'function')
                      onLoad();
                  }
  
                };
                ptLoader(0, () => {
                  console.log('SaveGame loaded');
                  Game.LoadModule(this.getLastModule(), null, () => { console.log('ready to load'); })
                  if(typeof onLoad === 'function')
                    onLoad();
                });
  
              }
  
            });
  
          });
          
        });
        
      });

    });

  }

  IsModuleSaved(name=''){
    if(!this.isLoaded)
      return false;

    for(let i = 0; i < this.SAVEGAME.KeyList.length; i++){
      if(this.SAVEGAME.KeyList[i].ResRef.toLowerCase() === name.toLowerCase()){
        return true;
      }
    }
    return false;
  }

  GetModuleRim(name='', onLoad = null){
    if(!this.isLoaded)
      return false;

    for(let i = 0; i < this.SAVEGAME.KeyList.length; i++){
      if(this.SAVEGAME.KeyList[i].ResRef.toLowerCase() === name.toLowerCase()){
        this.SAVEGAME.getRawResource(this.SAVEGAME.KeyList[i].ResRef, this.SAVEGAME.KeyList[i].ResType, (sav) => {
          
          new ERFObject(sav, (rim) => {
            console.log('HI', rim);
            if(typeof onLoad === 'function')
              onLoad(rim);
          });
        });
      }
    }
  }

  Save(){

    //TODO

  }

}

SaveGame.saves = [];
SaveGame.directory = path.join(Config.options.Games[GameKey].Location, 'Saves');
SaveGame.getSaveGames = function( onLoad = null ){

  fs.readdir(SaveGame.directory, (err, folders) => {
    
    for(let i = 0; i < folders.length; i++){
      SaveGame.saves.push(new SaveGame(folders[i]));
    }

    if(typeof onLoad === 'function')
      onLoad();

  });

}

module.exports = SaveGame;