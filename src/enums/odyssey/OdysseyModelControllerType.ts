/**
 * OdysseyModelControllerType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelControllerType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum OdysseyModelControllerType {
  //Node
  Position             =   8,
  Orientation          =  20,
  Scale                =  36,

  //Mesh
  SelfIllumColor       = 100,
  Alpha                = 132,

  //Light
  Color                =  76,
  Radius               =  88,
  ShadowRadius         =  96,
  VerticalDisplacement = 100,
  Multiplier           = 140,

  //Emitter
  AlphaEnd             =  80,
  AlphaStart           =  84,
  BirthRate            =  88,
  Bounce_Co            =  92,
  CombineTime          =  96,
  Drag                 = 100,
  FPS                  = 104,
  FrameEnd             = 108,
  FrameStart           = 112,
  Gravity                 = 116,
  LifeExp              = 120,
  Mass                 = 124,
  Threshold            = 164,
  P2P_Bezier2          = 128,
  P2P_Bezier3          = 132,
  ParticleRot          = 136,
  RandomVelocity              = 140,
  SizeStart            = 144,
  SizeEnd              = 148,
  SizeStart_Y          = 152,
  SizeEnd_Y            = 156,
  Spread               = 160,
  Velocity             = 168,
  XSize                = 172,
  YSize                = 176,
  BlurLength           = 180,
  LightningDelay       = 184,
  LightningRadius      = 188,
  LightningSubDiv      = 196,
  LightningScale       = 192,
  LightningZigZag      = 200,
  AlphaMid             = 216,
  PercentStart         = 220,
  PercentMid           = 224,
  PercentEnd           = 228,
  SizeMid              = 232,
  SizeMid_Y            = 236,
  TargetSize           = 252,
  ControlPTCount       = 256,
  ControlPTRadius      = 260,
  ControlPTDelay       = 264,
  TangentSpread        = 268,
  TangentLength        = 272,
  RandomBirthRate      = 240,
  ColorEnd             = 380,
  ColorMid             = 284,
  ColorStart           = 392,
  Detonate             = 502,
  INVALID              =   0,
};