export {};

declare global {
  interface String {
    titleCase() : string;
    equalsIgnoreCase(value: string): boolean;
  }

}