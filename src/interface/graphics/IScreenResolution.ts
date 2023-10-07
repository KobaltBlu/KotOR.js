export interface IScreenResolution {
  label: string;
  width: number;
  height: number;
  ratio: number;
  isDynamicRes: boolean;
  getName: () => string;
}