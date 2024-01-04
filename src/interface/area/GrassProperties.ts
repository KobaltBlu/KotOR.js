export interface GrassProperties {
  ambient: number;
  density: number;
  diffuse: number;
  probability: {
    lowerLeft: number;
    lowerRight:  number;
    upperLeft:  number;
    upperRight:  number;
  }
  quadSize: number;
  textureName: string;
}