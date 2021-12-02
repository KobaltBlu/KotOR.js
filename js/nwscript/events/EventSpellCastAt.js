
class EventSpellCastAt extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEvent.Type.EventSpellCastAt;

    //intList[0] = spellId
    //intList[0] = bHarmful
    //objectList[0] = oCaster

  }

}

module.exports = EventSpellCastAt;