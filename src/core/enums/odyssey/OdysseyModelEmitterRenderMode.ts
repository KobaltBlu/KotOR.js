/**
 * OdysseyModelEmitterRenderMode enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelEmitterRenderMode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum OdysseyModelEmitterRenderMode {
  Normal = "Normal", 
  MotionBlur = "Motion_Blur", 
  BillboardToLocalZ = "Billboard_to_Local_Z", 
  BillboardToWorldZ = "Billboard_to_World_Z", 
  AlignToWorldZ = "Aligned_to_World_Z", 
  AlignToParticleDir = "Aligned_to_Particle_Dir", 
  Linked = "Linked"
};
