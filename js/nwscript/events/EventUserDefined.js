
class EventUserDefined extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEvent.Type.EventUserDefined;

    //intList[0] : userdefined number

  }

}

module.exports = EventUserDefined;