/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleMGObstacle class.
 */

class ModuleMGObstacle extends ModuleObject {

  constructor(){
    this.name = '';
    this.invince = 0;
  }

  update(delta){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

  }

  updatePaused(delta){
    
  }

  damage(damage = 0){

  }

  adjustHitPoints(nHP = 0, nAbsolute = 0){
    this.hit_points += nHP;
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  onAnimEvent(){
    if(this.scripts.onAnimEvent instanceof NWScriptInstance){
      this.scripts.onAnimEvent.nwscript.newInstance().run(this, 0);
    }
  }

  onCreate(){
    if(this.scripts.onCreate instanceof NWScriptInstance){
      this.scripts.onCreate.nwscript.newInstance().run(this, 0);
    }
  }

  onHitBullet(){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      this.scripts.onHitBullet.nwscript.newInstance().run(this, 0);
    }
  }

  onHitFollower(){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      this.scripts.onHitFollower.nwscript.newInstance().run(this, 0);
    }
  }

  LoadScripts (onLoad = null){
    this.scripts = {
      onAnimEvent: undefined,
      onCreate: undefined,
      onHeartbeat: undefined,
      onHitBullet: undefined,
      onHitFollower: undefined,
    };

    let scriptsNode = this.template.GetFieldByLabel('Scripts').GetChildStructs()[0];
    if(scriptsNode){
      
      if(scriptsNode.HasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.GetFieldByLabel('OnAnimEvent').GetValue();

      if(scriptsNode.HasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.GetFieldByLabel('OnCreate').GetValue();

      if(scriptsNode.HasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.GetFieldByLabel('OnHeartbeat').GetValue();
      
      if(scriptsNode.HasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.GetFieldByLabel('OnHitBullet').GetValue();

      if(scriptsNode.HasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.GetFieldByLabel('OnHitFollower').GetValue();

    }

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

  InitProperties(){
    if(this.template.RootNode.HasField('Name'))
      this.name = this.template.GetFieldByLabel('Name').GetValue();

    this.initialized = true;

  }


}

module.exports = ModuleMGObstacle;