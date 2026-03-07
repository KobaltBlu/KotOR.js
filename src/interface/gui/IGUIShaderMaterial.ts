import type {
  Color,
  Matrix3,
  ShaderMaterial,
  Texture,
} from "three";

export interface IGUIShaderMaterial extends ShaderMaterial {
  defines: Record<string, string>;
  uniforms: Record<string, { value: unknown }> & {
    diffuse: { value: Color };
    map: { value: Texture | null };
    opacity: { value: number };
    uvTransform: { value: Matrix3 };
  };
}
