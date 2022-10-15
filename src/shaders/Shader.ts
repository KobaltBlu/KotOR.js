export class Shader {
  fragment: string;
  vertex: string;
  uniforms: any[];
  name: string;

  getVertex(){
    return this.vertex;
  }

  getFragment(){
    return this.fragment;
  }

  getUniforms(): any{
    return this.uniforms;
  }
}