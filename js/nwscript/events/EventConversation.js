
class EventConversation extends NWScriptEvent {

  constructor(){
    super();
    this.type = NWScriptEvent.Type.EventConversation;

    //stringList[*] : strings to speak

  }

}

module.exports = EventConversation;