/**
 * OdysseyModelEmitterFlag enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelEmitterFlag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @see https://bitbucket.org/bead-v/mdledit/src/678765df0b1369a4a86bc901188e5e3975b10e8a/MDL.h?at=master&fileviewer=file-view-default
 * @enum
 */
export enum OdysseyModelEmitterFlag {
  P2P           =  0x0001,
  P2P_SEL       =  0x0002,
  AFFECTED_WIND =  0x0004,
  TINTED        =  0x0008,
  BOUNCE        =  0x0010,
  RANDOM        =  0x0020,
  INHERIT       =  0x0040,
  INHERIT_VEL   =  0x0080,
  INHERIT_LOCAL =  0x0100,
  SPLAT         =  0x0200,
  INHERIT_PART  =  0x0400,
  DEPTH_TEXTURE =  0x0800, //maybe, per ndix UR
  _13            =  0x1000,
  _2000          =  0x2000,
  _3000          =  0x4000,
  _4000          =  0x8000,
};