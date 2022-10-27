export {};

interface ConfigClient {
  options: any;
  get(key: string): any;
  set(key: string, value: any): any;
  getRecentProjects(): any[];
  getRecentFiles(): any[];
}

declare global {
  interface String {
    titleCase() : string;
    equalsIgnoreCase(value: string): boolean;
  }
  interface Window { 
    ConfigClient: ConfigClient
  }
}

declare module '*.html' {
  const content: string;
  export default content;
}