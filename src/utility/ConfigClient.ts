export class ConfigClient {
  static options: any = {};

  static getRecentFiles(): any[] {
    return [];
  }

  static getRecentProjects(): any[]{
    return [];
  }

  static get(path: string = '', defaultValue?:any): any {
    return;
  }

  static set(path = '', value = ''): any {
    return;
  }

  static save(onSave?: Function, silent?: boolean){
    
  }

}