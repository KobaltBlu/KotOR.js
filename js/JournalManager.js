class JournalManager {


}

class JournalEntry {

  constructor(entry = {}){

    this.date = 0;
    this.plot_id = '';
    this.state = 0;
    this.time = 0;

  }

}

JournalManager.Entry = JournalEntry;

module.exports = JournalManager;