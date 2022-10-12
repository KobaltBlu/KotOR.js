export class JournalManager {
  static Entry: typeof JournalEntry;


}

export class JournalEntry {
  date: number;
  plot_id: string;
  state: number;
  time: number;

  constructor(entry = {}){

    this.date = 0;
    this.plot_id = '';
    this.state = 0;
    this.time = 0;

  }

}

JournalManager.Entry = JournalEntry;
