/**
 * MDL (Model) type definitions for KotOR.
 * Enums, flags, and constants for MDL/MDX model files (K1 and TSL).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file MDLTypes.ts
 * @license GPL-3.0
 */

/** Model geometry type (how the mesh is rendered). */
export enum MDLGeometryType {
  Unknown = 0,
  Normal = 1,
  Skinned = 2,
  Dangly = 3,
  Saber = 4
}

/** Model classification (usage in game). */
export enum MDLClassification {
  Invalid = 0,
  Effect = 1,
  Tile = 2,
  Character = 4,
  Door = 8,
  Placeable = 16,
  Other = 32,
  Gui = 64,
  Item = 128,
  Lightsaber = 256,
  Waypoint = 512,
  Weapon = 1024,
  Furniture = 2048
}

/** Node flags (combined to form node types, e.g. HEADER | MESH = mesh node). */
export enum MDLNodeFlags {
  Header = 0x0001,
  Light = 0x0002,
  Emitter = 0x0004,
  Camera = 0x0008,
  Reference = 0x0010,
  Mesh = 0x0020,
  Skin = 0x0040,
  Anim = 0x0080,
  Dangly = 0x0100,
  Aabb = 0x0200,
  Saber = 0x0800
}

/** Node type (role in model). */
export enum MDLNodeType {
  Dummy = 1,
  Trimesh = 2,
  Danglymesh = 3,
  Light = 4,
  Emitter = 5,
  Reference = 6,
  Patch = 7,
  Aabb = 8,
  Skin = 9,
  Camera = 10,
  Binary = 11,
  Saber = 12
}

/** Controller types for animations and node properties. */
export enum MDLControllerType {
  Invalid = -1,
  Position = 8,
  Orientation = 20,
  Scale = 36,
  Alpha = 132,
  Color = 76,
  Radius = 88,
  ShadowRadius = 96,
  VerticalDisplacement = 100,
  Multiplier = 140,
  SelfIllumColor = 100,
  AlphaEnd = 80,
  AlphaStart = 84,
  Birthrate = 88,
  BounceCo = 92,
  CombineTime = 96,
  Drag = 100,
  Fps = 104,
  FrameEnd = 108,
  FrameStart = 112,
  Grav = 116,
  LifeExp = 120,
  Mass = 124,
  P2PBezier2 = 128,
  P2PBezier3 = 132,
  ParticleRot = 136,
  Randvel = 140,
  SizeStart = 144,
  SizeEnd = 148,
  SizeStartY = 152,
  SizeEndY = 156,
  Spread = 160,
  Threshold = 164,
  Velocity = 168,
  XSize = 172,
  YSize = 176,
  BlurLength = 180,
  LightningDelay = 184,
  LightningRadius = 188,
  LightningScale = 192,
  LightningSubDiv = 196,
  LightningZigzag = 200,
  AlphaMid = 216,
  PercentStart = 220,
  PercentMid = 224,
  PercentEnd = 228,
  SizeMid = 232,
  SizeMidY = 236,
  RandomBirthrate = 240,
  TargetSize = 252,
  NumControlPts = 256,
  ControlPtRadius = 260,
  ControlPtDelay = 264,
  TangentSpread = 268,
  TangentLength = 272,
  ColorMid = 284,
  ColorEnd = 380,
  ColorStart = 392,
  Detonate = 502
}

/** Trimesh property flags. */
export enum MDLTrimeshProps {
  None = 0x00,
  Lightmap = 0x01,
  Compressed = 0x02,
  Unknown = 0x04,
  Tangents = 0x08
}

/** Emitter type. */
export enum MDLEmitterType {
  Static = 0,
  Fire = 1,
  Fountain = 2,
  Lightning = 3
}

/** Particle render type. */
export enum MDLRenderType {
  Normal = 0,
  Linked = 1,
  BillboardToLocalZ = 2,
  BillboardToWorldZ = 3,
  AlignedToWorldZ = 4,
  AlignedToParticleDir = 5,
  MotionBlur = 6
}

/** Particle blend type. */
export enum MDLBlendType {
  Normal = 0,
  Punch = 1,
  Lighten = 2,
  Multiply = 3
}

/** Particle update type. */
export enum MDLUpdateType {
  Fountain = 0,
  Single = 1,
  Explosion = 2,
  Lightning = 3
}

/** Trimesh flags (tile fade, head, render, shadow, etc.). */
export enum MDLTrimeshFlags {
  TileFade = 0x0001,
  Head = 0x0002,
  Render = 0x0004,
  Shadow = 0x0008,
  Beaming = 0x0010,
  RenderEnvMap = 0x0020,
  Lightmap = 0x0040,
  Skin = 0x0080
}

/** Light flags. */
export enum MDLLightFlags {
  Enabled = 0x0001,
  Shadow = 0x0002,
  Flare = 0x0004,
  Fading = 0x0008,
  Ambient = 0x0010
}

/** Emitter flags. */
export enum MDLEmitterFlags {
  P2P = 0x0001,
  P2PSel = 0x0002,
  P2PBezier = 0x0002,
  AffectedWind = 0x0004,
  Tinted = 0x0008,
  Bounce = 0x0010,
  Random = 0x0020,
  Inherit = 0x0040,
  InheritVel = 0x0080,
  InheritLocal = 0x0100,
  Splat = 0x0200,
  InheritPart = 0x0400,
  DepthTexture = 0x0800,
  Flag13 = 0x1000
}

/** Saber flags. */
export enum MDLSaberFlags {
  Flare = 0x0001,
  Dynamic = 0x0002,
  Trail = 0x0004
}

/** Dynamic type for lights. */
export enum MDLDynamicType {
  Static = 0,
  Dynamic = 1,
  Animated = 2
}

/** Detected MDL file format. */
export type MDLFormat = 'mdl' | 'mdl_ascii' | 'invalid';
