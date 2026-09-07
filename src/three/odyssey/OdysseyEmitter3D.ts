import * as THREE from "three";
import { GameState } from "@/GameState";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { TextureLoader } from "@/loaders/TextureLoader";
import { OdysseyModelNode, OdysseyModelNodeEmitter } from "@/odyssey";
import type { OdysseyController } from "@/odyssey/controllers";
import { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import {
  ODYSSEY_AREA_WIND_DIRECTION,
  resolveDanglyWindPower,
} from "@/three/odyssey/windPowerContext";
import { FORCE_DISTORTION_STENCIL_BIT } from "@/shaders/pass/ForceDistortionPass";

/**
 * OdysseyEmitter3D class.
 * 
 * THREE.js representation of OdysseyEmitter.
 * Handles all emitter render modes, update modes, P2P gravity/bezier,
 * bounce, splat, wind, tinting, chunk emitters, trail spawning, and
 * all inheritance flags per the NWN MDL emitter specification.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyEmitter3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyEmitter3D extends OdysseyObject3D {

  // Preallocated scratch objects to avoid per-frame heap allocations
  private static _v3A = new THREE.Vector3();
  private static _v3B = new THREE.Vector3();
  private static _v3C = new THREE.Vector3();
  private static _v3D = new THREE.Vector3();
  private static _quat = new THREE.Quaternion();
  private static _quatB = new THREE.Quaternion();
  private static _quatC = new THREE.Quaternion();
  private static _mat4 = new THREE.Matrix4();
  private static _boxA = new THREE.Box3();
  private static _bounceFaceScratch: any[] = [];

  /** DoEmitterBucket / UpdateEmitters: AnimateParticles(min(dt, 0.1)). */
  private static readonly MAX_ANIMATE_DT = 0.1;
  private static readonly BOUNCE_HIT_CHECK_MAX_PER_FRAME = 64;
  private static readonly BOUNCE_HIT_CHECK_MIN_PER_FRAME = 8;
  private static readonly BOUNCE_HIT_CHECK_FRACTION = 0.25;

  static BirthTime: number = 1;
  static PlaneGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);

  /**
   * Trail spawning (spaceType 1): each tick adds world-space movement distance to `_trailAccum`.
   * Spawn batch: `floor(_trailAccum * birthRate * TRAIL_BIRTH_SCALE)`; remainder stays in `_trailAccum`.
   * Units: world units along the path; `birthRate` scales how many ribbon samples per unit distance.
   * Tune here if trail density vs. vanilla differs (single knob).
   */
  private static readonly TRAIL_BIRTH_SCALE = 1.0;

  /** Hard cap on linked ribbon samples (each sample = 2 verts). Avoids huge allocations from extreme MDL values. */
  private static readonly LINKED_MAX_SAMPLES = 512;

  /** Minimum linked ribbon samples when sizing the buffer (see getMaxParticleCount). */
  private static readonly LINKED_MIN_SAMPLES = 32;

  /** Scratch age arrays for rebuildLinkedTrailMesh (avoid per-frame alloc). */
  private static _linkedAgeScratch = new Float32Array(0);
  private static _linkedMaxAgeScratch = new Float32Array(0);

  /** Set to false to silence `[emitterName]` tick logs (see `emitterLog`). */
  static EMITTER_TICK_DEBUG = false;

  /**
   * PartEmitter (Gob SetEmitterAsWeather).
   * When set, live particles toroidally wrap X/Y around the module camera (±5).
   */
  isWeather: boolean = false;

  /** weather wrap half-extent (= 5). */
  private static readonly WEATHER_WRAP_HALF = 5;

  updateType: string;
  maxParticleCount: number = 0;

  //Geometry BufferAttributes
  offsets: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  velocities: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  props: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  ids: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  /** Motion_Blur particle tail. */
  prevOffsets: THREE.InstancedBufferAttribute;
  /**
   * Per-particle inherit velocity (Particle scale×accel).
   * CPU-only; MoveFunc adds inherit×dt then |inherit×(1-dt)|.
   */
  private inheritVels: Float32Array = new Float32Array(0);

  particleCount: number = 0;
  private _bounceHitCursor: number = 0;
  referenceNode: OdysseyObject3D = new OdysseyObject3D();
  /**
   * True once setReferenceNode assigns a real target (PartEmitter).
   * P2P MoveFunc/RenderFunc no-op and skip drawing when unset.
   */
  hasReferenceTarget: boolean = false;

  // Lightning properties
  lightningZigZag: number = 0;
  lightningScale: number = 0;
  lightningDelay: number = 0;
  lightningRadius: number = 0;
  lightningSubDiv: number = 0;
  /** Accumulates dt until lightningDelay. */
  _lightningDelay: number = 0;
  /**
   * Bolt-local mid-sample offsets (u/v in plane ⊥ start→end).
   * Regenerated when delay elapses (LightningEmitter Update).
   */
  private _lightningMidOU: Float32Array = new Float32Array(0);
  private _lightningMidOV: Float32Array = new Float32Array(0);
  private _lightningSampleCount: number = 0;
  /** ControlPTDelay accumulator (PartEmitter). */
  private _controlPTAccum: number = 0;
  /** Mid control-point jitter in bolt-local (u,v); sized to cpCount. */
  private _cpMidOU: Float32Array = new Float32Array(0);
  private _cpMidOV: Float32Array = new Float32Array(0);
  private _cpCount: number = 0;
  /** Scratch centers for Hermite samples (xyz interleaved). */
  private _lightningCenters: Float32Array = new Float32Array(0);
  /** Scratch control-point positions / tangents (xyz interleaved). */
  private _cpPositions: Float32Array = new Float32Array(0);
  private _cpTangents: Float32Array = new Float32Array(0);
  /** Scratch xyz mid offsets for RecursiveFractal. */
  private _fractalXYZ: Float32Array = new Float32Array(0);
  /**
   * Child bolts from numBranches (UpdateBranches).
   * Lightweight ribbons — not full child LightningEmitters.
   */
  private _lightningBranches: {
    attachIdx: number;
    sampleCount: number;
    sizeScale: number;
    /** When true, end tracks parent reference (scale>0.5 path). */
    trackTarget: boolean;
    endX: number;
    endY: number;
    endZ: number;
    midOU: Float32Array;
    midOV: Float32Array;
    centers: Float32Array;
  }[] = [];
  private _lightningBranchActive: number = 0;
  /** Hard cap — birthrate>9 was unstable; keep a safe ceiling. */
  private static readonly LIGHTNING_MAX_SAMPLES = 64;
  private static readonly LIGHTNING_MAX_CPS = 32;
  private static readonly LIGHTNING_MAX_BRANCHES = 8;

  context: any;
  lifeExp: number = -1;
  _birthTimer: number = 0;
  /** FountainEmitter — accumulates dt for spawntype-0 birth. */
  private _birthAccum: number = 0;

  birthRate: number = 0;
  birthRateRandom: number = 0;

  velocity: number = 0;
  randVelocity: number = 0;
  drag: number = 0;
  mass: number = 0;
  spread: number = 0;
  gravity: number = 0;
  threshold: number = 0;

  size: THREE.Vector3 = new THREE.Vector3();
  isDetonated: boolean = false;
  /** Linked ribbon: ring write head (0..N-1). Non-linked: linear spawn index. */
  particleIndex: number = 0;
  /** Linked: total spawns ever (for active vertex count before ring fills buffer). */
  linkedTotalSpawns: number = 0;
  vec3: THREE.Vector3 = new THREE.Vector3();
  sizeXY: THREE.Vector2 = new THREE.Vector2();
  node: OdysseyModelNodeEmitter;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;

  colorStart: THREE.Color = new THREE.Color(1, 1, 1);
  colorMid: THREE.Color = new THREE.Color(1, 1, 1);
  colorEnd: THREE.Color = new THREE.Color(1, 1, 1);

  sizes: [number, number, number] = [0, 0, 0];
  sizesY: [number, number, number] = [0, 0, 0];
  opacity: [number, number, number] = [1, 1, 1];
  angle: number = 0;
  _detonate: number = 0;
  fps: number = 0;
  blurLength: number = 0;
  bounceCo: number = 0;
  combineTime: number = 0;
  p2pBezier2: number = 0;
  p2pBezier3: number = 0;
  /** sentinel 255 = two-key start→end (RenderStandard). */
  percentStart: number = 255;
  percentMid: number = 0.5;
  percentEnd: number = 1;
  targetSize: number = 0;
  controlPTCount: number = 0;
  controlPTDelay: number = 0;
  tangentSpread: number = 0;
  tangentLength: number = 0;
  controlPTRadius: number = 0;

  //@ts-ignore
  mesh: THREE.Points|THREE.Mesh;

  // Inherit tracking: emitter world pose between frames
  private _lastWorldPos: THREE.Vector3 = new THREE.Vector3();
  private _worldPosDelta: THREE.Vector3 = new THREE.Vector3();
  private _hasLastWorldPos: boolean = false;
  private _lastWorldQuat: THREE.Quaternion = new THREE.Quaternion();
  private _hasLastWorldQuat: boolean = false;
  /** Per-tick world pose — must not alias general scratches (_v3C / _quatB) used by birth. */
  private _frameWorldPos: THREE.Vector3 = new THREE.Vector3();
  private _frameWorldQuat: THREE.Quaternion = new THREE.Quaternion();

  // Trail spawn tracking (spawntype 1)
  private _lastTrailPos: THREE.Vector3 = new THREE.Vector3();
  private _hasLastTrailPos: boolean = false;
  private _trailAccum: number = 0;

  /** Previous ribbon sample center (world) for tangent along linked trail */
  private _lastRibbonCenter: THREE.Vector3 = new THREE.Vector3();
  private _hasRibbonCenter: boolean = false;

  /**
   * Non-lightning Linked trail: -style live sample list (world centers + age).
   * Mesh geometry is rebuilt each tick from these only — never draws spare 0,0,0 slots.
   * RenderLinked builds quads from field particles the same way.
   */
  private _linkedCenters: Float32Array = new Float32Array(0);
  private _linkedAges: Float32Array = new Float32Array(0);
  private _linkedMaxAges: Float32Array = new Float32Array(0);
  private _linkedCapacity: number = 0;
  /** Scratch for chronological center order when rebuilding the ribbon mesh. */
  private _linkedDrawCenters: Float32Array = new Float32Array(0);

  // Chunk emitter state (ChunkyParticle presentation — InstancedMesh approx of per-particle Gob)
  private _chunkGeometry: THREE.BufferGeometry = null;
  private _chunkMaterial: THREE.Material = null;
  private _chunkLoaded: boolean = false;
  private _isChunkEmitter: boolean = false;
  private _chunkMesh: THREE.InstancedMesh = null;
  private _chunkMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private _chunkQuat: THREE.Quaternion = new THREE.Quaternion();
  private _chunkScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private _chunkColor: THREE.Color = new THREE.Color(1, 1, 1);
  private _chunkColors: THREE.InstancedBufferAttribute = null;

  constructor(odysseyNode: OdysseyModelNode){
    super();
    (this as any).type = 'OdysseyEmitter';

    this.node = odysseyNode as OdysseyModelNodeEmitter;
    this._isChunkEmitter = !!(this.node.chunkResRef && this.node.chunkResRef.length > 0);

    switch(this.node.renderMode){
      case 'Normal':
      case 'Linked':
        this.geometry = new THREE.BufferGeometry();
      break;
      default:
        // Motion_Blur and billboard modes: instanced plane quads
        this.geometry = new THREE.InstancedBufferGeometry();
        this.geometry.index = OdysseyEmitter3D.PlaneGeometry.index;
        this.geometry.attributes.position = OdysseyEmitter3D.PlaneGeometry.attributes.position;
        this.geometry.attributes.uv = OdysseyEmitter3D.PlaneGeometry.attributes.uv;
      break;
    }

    this.addEventListener( 'added', () => {
      if(!this.material || !this.parent) return;
      this.material.uniforms.matrix.value.copy(this.parent.matrix);
      this.material.uniforms.matrix.value.setPosition(0, 0, 0);
      this.material.uniformsNeedUpdate = true;
      this.attributeChanged('mass');
    });

    if(odysseyNode instanceof OdysseyModelNode){

      this.updateType = this.node.updateMode;

      this.material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge( [
          THREE.ShaderLib['odyssey-emitter'].uniforms, {
            textureAnimation: { value: new THREE.Vector4(
              this.node.gridX || 1,
              this.node.gridY || 1,
              (this.node.gridX || 1) * (this.node.gridY || 1),
              this.node.loop ?? 1
            )},
          }
        ]),
        vertexShader: THREE.ShaderLib['odyssey-emitter'].vertexShader,
        fragmentShader: THREE.ShaderLib['odyssey-emitter'].fragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        fog: false,
        visible: true
      });

      if(this.node.twoSidedTex || this.node.renderMode == 'Linked' || this.node.renderMode == 'Billboard_to_Local_Z' || this.node.renderMode == 'Motion_Blur'){
        this.material.side = THREE.DoubleSide;
      }

      if(!this._isChunkEmitter){
        TextureLoader.enQueueParticle(this.node.textureResRef, this);
      }

      this.node.controllers.forEach( (controller: OdysseyController ) => {
        if(controller.data.length){
          switch(controller.type){
            case OdysseyModelControllerType.Position:
            break;
            case OdysseyModelControllerType.Orientation:
            break;
            case OdysseyModelControllerType.ColorStart:
              this.colorStart.r = controller.data[0].x;
              this.colorStart.g = controller.data[0].y;
              this.colorStart.b = controller.data[0].z;
            break;
            case OdysseyModelControllerType.ColorMid:
              this.colorMid.r = controller.data[0].x;
              this.colorMid.g = controller.data[0].y;
              this.colorMid.b = controller.data[0].z;
            break;
            case OdysseyModelControllerType.ColorEnd:
              this.colorEnd.r = controller.data[0].x;
              this.colorEnd.g = controller.data[0].y;
              this.colorEnd.b = controller.data[0].z;
            break;
            case OdysseyModelControllerType.XSize:
              this.size.x = controller.data[0].value * 0.01;
            break;
            case OdysseyModelControllerType.YSize:
              this.size.y = controller.data[0].value * 0.01;
            break;
            case OdysseyModelControllerType.Spread:
              this.spread = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LifeExp:
              this.lifeExp = controller.data[0].value >= 0 ? controller.data[0].value : -1;
            break;
            case OdysseyModelControllerType.BirthRate:
              this.birthRate = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Drag:
              this.drag = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Threshold:
              this.threshold = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Gravity:
              this.gravity = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Mass:
              this.mass = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Velocity:
              this.velocity = controller.data[0].value;
            break;
            case OdysseyModelControllerType.RandomVelocity:
              this.randVelocity = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeStart:
              this.sizes[0] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeMid:
              this.sizes[1] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeEnd:
              this.sizes[2] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeStart_Y:
              this.sizesY[0] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeMid_Y:
              this.sizesY[1] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.SizeEnd_Y:
              this.sizesY[2] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.AlphaStart:
              this.opacity[0] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.AlphaMid:
              this.opacity[1] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.AlphaEnd:
              this.opacity[2] = controller.data[0].value;
            break;
            case OdysseyModelControllerType.ParticleRot:
              // Radians per second (matches shipped KotOR assets; NWN-style "deg/s" would feel ~57× too slow here).
              this.angle = controller.data[0]?.value ?? 0;
            break;
            case OdysseyModelControllerType.Detonate:
              this._detonate = controller.data[0].value;
            break;
            case OdysseyModelControllerType.FPS:
              this.fps = controller.data[0].value;
            break;
            case OdysseyModelControllerType.FrameStart:
              this.material.uniforms.frameRange.value.x = controller.data[0].value;
            break;
            case OdysseyModelControllerType.FrameEnd:
              this.material.uniforms.frameRange.value.y = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LightningZigZag:
              this.lightningZigZag = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LightningDelay:
              this.lightningDelay = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LightningRadius:
              this.lightningRadius = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LightningSubDiv:
              this.lightningSubDiv = controller.data[0].value;
            break;
            case OdysseyModelControllerType.LightningScale:
              this.lightningScale = controller.data[0].value;
            break;
            case OdysseyModelControllerType.Bounce_Co:
              this.bounceCo = controller.data[0].value;
            break;
            case OdysseyModelControllerType.BlurLength:
              this.blurLength = controller.data[0].value;
            break;
            case OdysseyModelControllerType.CombineTime:
              this.combineTime = controller.data[0].value;
            break;
            case OdysseyModelControllerType.P2P_Bezier2:
              this.p2pBezier2 = controller.data[0].value;
            break;
            case OdysseyModelControllerType.P2P_Bezier3:
              this.p2pBezier3 = controller.data[0].value;
            break;
            case OdysseyModelControllerType.RandomBirthRate:
              this.birthRateRandom = controller.data[0].value;
            break;
            case OdysseyModelControllerType.PercentStart:
              this.percentStart = controller.data[0].value;
            break;
            case OdysseyModelControllerType.PercentMid:
              this.percentMid = controller.data[0].value;
            break;
            case OdysseyModelControllerType.PercentEnd:
              this.percentEnd = controller.data[0].value;
            break;
            case OdysseyModelControllerType.TargetSize:
              this.targetSize = controller.data[0].value;
            break;
            case OdysseyModelControllerType.ControlPTCount:
              this.controlPTCount = controller.data[0].value;
            break;
            case OdysseyModelControllerType.ControlPTRadius:
              this.controlPTRadius = controller.data[0].value;
            break;
            case OdysseyModelControllerType.ControlPTDelay:
              this.controlPTDelay = controller.data[0].value;
            break;
            case OdysseyModelControllerType.TangentSpread:
              this.tangentSpread = controller.data[0].value;
            break;
            case OdysseyModelControllerType.TangentLength:
              this.tangentLength = controller.data[0].value;
            break;
          }
        }
      });

      this.material.uniforms.maxAge.value = (this.lifeExp >= 0 ? this.lifeExp : -1);
      this.material.uniforms.colorStart.value.copy(this.colorStart);
      this.material.uniforms.colorMid.value.copy(this.colorMid);
      this.material.uniforms.colorEnd.value.copy(this.colorEnd);
      this.material.uniforms.opacity.value.fromArray(this.opacity);
      this.material.uniforms.scale.value.fromArray(this.sizes);
      this.material.uniforms.scaleY.value.fromArray(this.sizesY);
      this.material.uniforms.rotate.value = this.angle;
      this.material.uniforms.drag.value = this.drag;
      this.material.uniforms.velocity.value = this.velocity;
      this.material.uniforms.randVelocity.value = this.randVelocity;
      this.material.uniforms.blurLength.value = this.blurLength;
      if(this.material.uniforms.lifePercents){
        this.material.uniforms.lifePercents.value.set(
          this.percentStart,
          this.percentMid,
          this.percentEnd
        );
      }

      this.maxParticleCount = this.getMaxParticleCount();
      this.ensureInheritVelCapacity(this.maxParticleCount);

      if(this.node.updateMode == 'Lightning'){
        this.material.defines.LIGHTNING = '';
      }

      if(this.fps){
        this.material.defines.FPS = '';
        this.material.uniforms.fps.value = this.fps;
      }

      if(this.node.flags.isRandom){
        this.material.defines.RANDOM_PLAYBACK = '';
      }

      if(this.node.flags.isTinted){
        this.material.defines.TINTED = '';
      }

      // DEPTH_TEXTURE define enabled in updateDepthTextureUniforms when a depth target exists

      if(this.node.deadSpace > 0 && this.node.renderMode == 'Aligned_to_Particle_Dir'){
        this.material.defines.DEADSPACE = '';
        this.material.uniforms.deadSpace.value = this.node.deadSpace;
      }

      this.material.defines[this.node.renderMode] = '';
      // fountain particles are world-space; CPU MoveFunc + shader without SPE vel×age.
      if(this.node.renderMode !== 'Linked'){
        this.material.defines.CPU_PHYSICS = '';
      }
      // Punch-Through: alpha-test discard (RenderStandard enables ALPHA_TEST).
      // Required for force-distortion stencil masks to match Fx_distortion alpha.
      if(this.node.blendMode === 'Punch-Through'){
        this.material.defines.PUNCH_THROUGH = '';
      }
      this.material.needsUpdate = true;

      this._birthTimer = this.birthRate > 0 ? 1/this.birthRate : 1;

      switch(this.node.blendMode){
        case 'Normal':
          this.material.blending = THREE.NormalBlending;
        break;
        case 'Lighten':
          // : glBlendFunc(SRC_ALPHA, ONE); glDepthMask(0) — transparent additive pass
          this.material.blending = THREE.AdditiveBlending;
          this.material.transparent = true;
          this.material.depthWrite = false;
          this.material.needsUpdate = true;
        break;
        case 'Punch-Through':
          this.material.blending = THREE.NormalBlending;
          this.material.alphaTest = 0.5;
          this.material.needsUpdate = true;
        break;
      }

      // Geom SizeStart may be missing; zero scale → invisible quads (esp. Motion_Blur)
      if(!(this.sizes[0] > 0 || this.sizes[1] > 0 || this.sizes[2] > 0)){
        this.sizes[0] = 0.04;
        this.sizes[1] = 0.04;
        this.sizes[2] = 0.02;
        this.material.uniforms.scale.value.fromArray(this.sizes);
      }

      const offsets: number[] = [];
      const props: number[] = [];
      const velocities: number[] = [];
      const ids: number[] = [];
      const prevOffsets: number[] = [];

      // Birth uses Particle initialize (randomDirection + speed×zdir).
      this.attributeChanged('mass');

      switch(this.node.renderMode){
        case 'Normal':
          this.material.defines.POINTS = '';

          this.offsets = new THREE.BufferAttribute( new Float32Array( offsets ), 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.BufferAttribute( new Float32Array( velocities ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.BufferAttribute( new Float32Array( props ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( new Float32Array( ids ), 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'position', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
          
          this.mesh = new THREE.Points( this.geometry, this.material );
        break;
        case 'Linked':
          this.material.defines.LINKED = '';

          this.offsets = new THREE.BufferAttribute( new Float32Array( offsets ), 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.BufferAttribute( new Float32Array( velocities ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.BufferAttribute( new Float32Array( props ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.BufferAttribute( new Float32Array( ids ), 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'position', this.offsets );
          this.geometry.setAttribute( 'offset', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
          this.geometry.setIndex([]);

          this.mesh = new THREE.Mesh( this.geometry, this.material );
          // World-space ribbon verts (viewMatrix * position). Keep mesh matrixWorld
          // identity so parenting under the emitter cannot double-transform.
          this.mesh.onBeforeRender = () => {
            this.mesh.matrixWorld.identity();
          };
        break;
        default:
          // Motion_Blur + billboards: instanced quads (offset = world pos for Motion_Blur)
          this.offsets = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.InstancedBufferAttribute( new Float32Array( velocities ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.InstancedBufferAttribute( new Float32Array( props ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( new Float32Array( ids ), 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'offset', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
          if(this.node.renderMode === 'Motion_Blur'){
            this.prevOffsets = new THREE.InstancedBufferAttribute( new Float32Array( this.maxParticleCount * 3 ), 3 ).setUsage( THREE.DynamicDrawUsage );
            this.geometry.setAttribute( 'prevOffset', this.prevOffsets );
          }
      
          this.mesh = new THREE.Mesh( this.geometry, this.material );
        break;
      }

      this.mesh.renderOrder = this.node.renderOrder || 0;
      this.mesh.frustumCulled = false;
      this.material.uniformsNeedUpdate = true;
      this.add(this.mesh);

      if(this._isChunkEmitter){
        this.loadChunkModel();
      }
    }
  }

  getMaxParticleCount(){
    if(this.node.renderMode == 'Linked'){
      if(this.updateType == 'Lightning'){
        // : ftol(birthRate) samples. Beam MDLs ship birthRate 0 and use
        // dist×SubDiv+2 at runtime — reserve the full sample cap for that path.
        const br = Math.floor(this.birthRate);
        const n = Math.max(
          2,
          Math.min(
            OdysseyEmitter3D.LIGHTNING_MAX_SAMPLES,
            br > 0 ? br : OdysseyEmitter3D.LIGHTNING_MAX_SAMPLES
          )
        );
        return n * 2;
      }else{
        // Sample-center ring capacity (not L/R verts). Geometry is rebuilt live each tick.
        const le = Math.max(1, Math.ceil(this.lifeExp >= 0 ? this.lifeExp : 1));
        const br = Math.max(1, Math.ceil(this.birthRate || 0));
        return Math.min(
          OdysseyEmitter3D.LINKED_MAX_SAMPLES,
          Math.max(OdysseyEmitter3D.LINKED_MIN_SAMPLES, le * br * 2)
        );
      }
    }else{
      // lifeExp 0.05 → ceil=1; birthRate 0 → keep a small buffer so resize can grow when travel01 sets rate
      const le = Math.max(1, Math.ceil(this.lifeExp >= 0 ? this.lifeExp : 1));
      const br = Math.max(1, Math.ceil(this.birthRate || 1));
      return Math.max(8, le * br * 2);
    }
  }

  getRandomPosition(){
    // World-space birth (emitter GetWorld + size box).
    if(this.node.renderMode == 'Linked'){
      this.getWorldPosition(OdysseyEmitter3D._v3B);
      return OdysseyEmitter3D._v3B.clone();
    }

    // Particle randomPosition — offsets on local X/Y only (not Z).
    const quat = OdysseyEmitter3D._quat;
    const pos = OdysseyEmitter3D._v3B;
    this.getWorldQuaternion(quat);
    this.getWorldPosition(pos);
    const ox = Math.random() * this.size.x - this.size.x * 0.5;
    const oy = Math.random() * this.size.y - this.size.y * 0.5;
    const xOff = OdysseyEmitter3D._v3C.set(1, 0, 0).applyQuaternion(quat).multiplyScalar(ox);
    const yOff = OdysseyEmitter3D._v3A.set(0, 1, 0).applyQuaternion(quat).multiplyScalar(oy);
    return pos.clone().add(xOff).add(yOff);
  }

  /** Returns center + random offset in [-range/2, +range/2] */
  randomFloat(center: number, range: number){
    return center + ( Math.random() * range - ( range * 0.5 ) );
  }

  /**
   * Particle initialize randvel jitter: signed centi-units when randvel > 0.01.
   * speed = velocity + jitter (even when velocity is 0).
   */
  private randomSignedCentiJitter(range: number): number {
    if(!(range > 0.01)) return 0;
    const cents = Math.trunc(range * 100);
    if(cents <= 0) return 0;
    let j = Math.floor(Math.random() * cents);
    if(Math.random() < 0.5) j = -j;
    return j * 0.01;
  }

  /**
   * Particle randomDirection.
   * Premultiply tilt about emitter-fixed world X, then twist about emitter-fixed world Z
   * (axes taken once from the emitter quat — not post-tilt local Z).
   * Optional deadSpace camera clamp when node.deadSpace !== 0.
   */
  private randomDirectionRetail(outQuat: THREE.Quaternion, birthPos: THREE.Vector3){
    const emitterX = OdysseyEmitter3D._v3C.set(1, 0, 0).applyQuaternion(outQuat);
    const emitterZ = OdysseyEmitter3D._v3D.set(0, 0, 1).applyQuaternion(outQuat);
    const qAxis = OdysseyEmitter3D._quatB;

    // Tilt: angle = (rand % (1 - ftol(spread/2 * -100))) * 0.01 ≈ [0, spread/2]
    const tiltDiv = Math.max(1, 1 - Math.trunc(this.spread * 0.5 * -100));
    const tilt = (Math.floor(Math.random() * tiltDiv)) * 0.01;
    qAxis.setFromAxisAngle(emitterX, tilt);
    outQuat.premultiply(qAxis);

    // Twist about original emitter Z: (rand % 628) * 0.01 ≈ [0, 2π)
    const twist = (Math.floor(Math.random() * 0x274)) * 0.01;
    qAxis.setFromAxisAngle(emitterZ, twist);
    outQuat.premultiply(qAxis);

    if(this.node.deadSpace !== 0){
      this.applyDeadSpaceClamp(outQuat, birthPos);
    }
  }

  /**
   * camera-facing clamp gated on emitter deadSpace (model nodeEmitter first float).
   * While |dot(camDir, ydir)| < cos(π/2 − deadSpace), rotate about camDir × ydir.
   */
  private applyDeadSpaceClamp(quat: THREE.Quaternion, birthPos: THREE.Vector3){
    const cam = this.context?.currentCamera as THREE.Camera | undefined;
    if(!cam) return;

    const deadSpace = this.node.deadSpace;
    const threshold = Math.cos(Math.PI * 0.5 - deadSpace);

    const camDir = OdysseyEmitter3D._v3C;
    cam.getWorldPosition(camDir);
    camDir.x = birthPos.x - camDir.x;
    camDir.y = birthPos.y - camDir.y;
    camDir.z = birthPos.z - camDir.z;
    const camLen = camDir.length();
    if(camLen < 1e-8) return;
    camDir.multiplyScalar(1 / camLen);

    const qAxis = OdysseyEmitter3D._quatB;
    const axis = OdysseyEmitter3D._v3A;
    const ydir = OdysseyEmitter3D._v3D;

    let yw = quat.w, yx = quat.x, yy = quat.y, yz = quat.z;
    // ydir · camDir
    let dot =
      (2 * (yx * yy - yz * yw)) * camDir.x +
      (1 - 2 * (yx * yx + yz * yz)) * camDir.y +
      (2 * (yy * yz + yx * yw)) * camDir.z;

    // Bound iterations — can loop; avoid hangs on bad deadSpace.
    for(let guard = 0; guard < 16; guard++){
      const absDot = Math.abs(dot);
      if(threshold <= absDot) break;

      let angle: number;
      if(dot >= 0){
        angle = (dot - Math.PI * 0.5) + deadSpace;
      }else{
        angle = (deadSpace + Math.PI * 0.5) - dot;
      }

      // rebuilds ydir into the cross operand (camDir × ydir).
      ydir.set(
        2 * (yx * yy - yz * yw),
        1 - 2 * (yx * yx + yz * yz),
        2 * (yy * yz + yx * yw)
      );
      axis.copy(camDir).cross(ydir);
      if(axis.lengthSq() < 1e-12) break;
      axis.normalize();

      qAxis.setFromAxisAngle(axis, angle);
      quat.premultiply(qAxis);
      yw = quat.w; yx = quat.x; yy = quat.y; yz = quat.z;

      dot =
        (2 * (yx * yy - yz * yw)) * camDir.x +
        (1 - 2 * (yx * yx + yz * yz)) * camDir.y +
        (2 * (yy * yz + yx * yw)) * camDir.z;
      if(dot < 0) dot = -dot;
    }
  }

  /** initialize: vel = (velocity + randvel jitter) × particle local Z. */
  private birthVelocityFromQuat(quat: THREE.Quaternion, out: THREE.Vector3){
    const speed = this.velocity + this.randomSignedCentiJitter(this.randVelocity);
    out.set(0, 0, 1).applyQuaternion(quat).multiplyScalar(speed);
  }

  private ensureInheritVelCapacity(count: number){
    const need = Math.max(0, count) * 3;
    if(this.inheritVels.length >= need) return;
    const next = new Float32Array(need);
    next.set(this.inheritVels);
    this.inheritVels = next;
  }

  /**
   * Particle inheritVelocity (INHERIT_VEL).
   * Stores scale×unitAccel as a single vec3 (MoveFunc: pos += v×dt; v *= |1−dt|).
   * accel = emitterLinearVel + (currZ − prevZ) × |emitter − birth| / dt.
   */
  private setBirthInheritVelocity(i: number, birthPos: THREE.Vector3, delta: number){
    this.ensureInheritVelCapacity(i + 1);
    const ib = i * 3;
    if(!this.node.flags.canInheritVelocity || !this._hasLastWorldPos){
      this.inheritVels[ib] = 0;
      this.inheritVels[ib + 1] = 0;
      this.inheritVels[ib + 2] = 0;
      return;
    }

    const invDt = delta > 0 ? 1 / delta : 0.01;
    const lx = this._worldPosDelta.x * invDt;
    const ly = this._worldPosDelta.y * invDt;
    const lz = this._worldPosDelta.z * invDt;

    const currZ = OdysseyEmitter3D._v3A.set(0, 0, 1).applyQuaternion(this._frameWorldQuat);
    const prevZ = OdysseyEmitter3D._v3B.set(0, 0, 1).applyQuaternion(this._lastWorldQuat);
    const dx = this._frameWorldPos.x - birthPos.x;
    const dy = this._frameWorldPos.y - birthPos.y;
    const dz = this._frameWorldPos.z - birthPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const ax = lx + (currZ.x - prevZ.x) * dist * invDt;
    const ay = ly + (currZ.y - prevZ.y) * dist * invDt;
    const az = lz + (currZ.z - prevZ.z) * dist * invDt;
    // Unnormalized vector == scale × unitAccel after normalize.
    this.inheritVels[ib] = ax;
    this.inheritVels[ib + 1] = ay;
    this.inheritVels[ib + 2] = az;
  }

  getRandomMaxAge(){
    return this.lifeExp;
  }

  /** Console helper: every line starts with `[node.name]` for multi-emitter captures. */
  private emitterLog(label: string, data?: Record<string, unknown>){
    if(!OdysseyEmitter3D.EMITTER_TICK_DEBUG) return;
    const tag = `[${this.node?.name ?? 'OdysseyEmitter'}]`;
    if(data !== undefined){
      console.log(tag, label, data);
    }else{
      console.log(tag, label);
    }
  }

  /** After `spawnParticle`, log buffer attribute snapshot for the spawned slot (debug). */
  private logSpawnParticleAttributes(slotIndex: number, delta: number){
    if(!OdysseyEmitter3D.EMITTER_TICK_DEBUG) return;
    if(this.node.renderMode === 'Linked'){
      // Non-lightning Linked logs from spawnLinkedSample; lightning uses its own path.
      return;
    }
    const i = slotIndex;
    let uv = { x: 0, y: 0 };
    const uvAttr = this.geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
    if(uvAttr && uvAttr.count > i){
      uv = { x: uvAttr.getX(i), y: uvAttr.getY(i) };
    }
    this.emitterLog('spawn', {
      particleIndex: i,
      delta,
      position: { x: this.offsets.getX(i), y: this.offsets.getY(i), z: this.offsets.getZ(i) },
      props: {
        age: this.props.getX(i),
        maxAge: this.props.getY(i),
        alive: this.props.getZ(i),
        w: this.props.getW(i),
      },
      velocity: {
        x: this.velocities.getX(i),
        y: this.velocities.getY(i),
        z: this.velocities.getZ(i),
        w: this.velocities.getW(i),
      },
      uv,
      id: this.ids.getX(i),
    });
  }

  //Update the emitter
  tick(delta: number = 0){

    if(!delta){
      delta = 1/30;
    }
    // DoEmitterBucket: AnimateParticles(min(dt, 0.1)) then RenderFunc
    delta = Math.min(delta, OdysseyEmitter3D.MAX_ANIMATE_DT);

    // Keep emitter matrixWorld current before birth / trail sampling.
    // Manual parent*local can lag when ancestors use matrixAutoUpdate=false.
    this.updateWorldMatrix(true, false);

    // Track emitter world pose delta for inherit/trail.
    // Dedicated fields — birth/randomDirection reuse static scratches and must not clobber these
    // (plc_fntnmrbl has inherit_local; garbage deltas looked like floaty/wrong spray).
    this.getWorldPosition(this._frameWorldPos);
    if(this._hasLastWorldPos){
      this._worldPosDelta.subVectors(this._frameWorldPos, this._lastWorldPos);
    }else{
      this._worldPosDelta.set(0, 0, 0);
    }

    this.getWorldQuaternion(this._frameWorldQuat);
    const currentWorldPos = this._frameWorldPos;
    const currentWorldQuat = this._frameWorldQuat;

    // Tinting: update tint color from scene ambient if isTinted
    if(this.node.flags.isTinted && this.context){
      const ambient = this.context?.module?.area?.sun?.ambientColor || this.context?.ambientColor;
      if(ambient){
        this.material.uniforms.tintColor.value.copy(ambient);
      }
    }

    // RenderStandard/MotionBlurred: gob.alpha × fade × particle alpha
    if(this.material?.uniforms?.parentAlpha){
      this.material.uniforms.parentAlpha.value =
        this.getParentGobAlpha() * this.getEmitterFadeAlpha();
    }

    // Soft particles: bind scene depth when DEPTH_TEXTURE flag is set
    this.updateDepthTextureUniforms();

    // Force distortion: stencil mask when parent Gob is TILE / distortion-active
    this.updateForceDistortionStencil();

    let updatePositions = false;
    let updateVelocity = false;
    let updateProperties = false;

    this.material.uniforms.time.value += delta;
    this._birthTimer -= delta;
    if(this._birthTimer < 0)
      this._birthTimer = 0;

    // FountainEmitter Update spawntype 0 — batch birth quota for this frame
    let fountainBirthQuota = 0;
    if(this.node.renderMode !== 'Linked' &&
       this.node.updateMode !== 'Explosion' &&
       this.node.updateMode !== 'Single' &&
       this.node.spaceType !== 1){
      fountainBirthQuota = this.consumeFountainBirthQuota(delta);
    }

    let maxParticleCount = this.getMaxParticleCount();
    let resizeArrays = (maxParticleCount > this.offsets.count);
    this.maxParticleCount = maxParticleCount;

    // Non-lightning Linked: sample centers live in `_linkedCenters`; mesh rebuilt each
    // tick from live samples only (RenderLinked). Skip fat position-buffer resize.
    if(this.node.renderMode === 'Linked' && this.updateType !== 'Lightning'){
      resizeArrays = false;
      this.ensureLinkedSampleCapacity(maxParticleCount);
    }

    if(resizeArrays){
      let offsets = new Float32Array(this.maxParticleCount * 3);
      let velocities = new Float32Array(this.maxParticleCount * 4);
      let props = new Float32Array(this.maxParticleCount * 4);
      let ids = new Float32Array(this.maxParticleCount * 1);

      offsets.set(this.offsets.array);
      if(this.node.renderMode != 'Linked')
        velocities.set(this.velocities.array);
      props.set(this.props.array);

      switch(this.node.renderMode){
        case 'Normal':
          this.offsets = new THREE.BufferAttribute( offsets, 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.BufferAttribute( velocities, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.BufferAttribute( props, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( ids, 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'position', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
        break;
        case 'Linked':
          this.offsets = new THREE.BufferAttribute( offsets, 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.BufferAttribute( velocities, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.BufferAttribute( props, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.BufferAttribute( ids, 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'position', this.offsets );
          this.geometry.setAttribute( 'offset', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
        break;
        default:
          // Motion_Blur + billboards
          this.offsets = new THREE.InstancedBufferAttribute( offsets, 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.InstancedBufferAttribute( velocities, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.InstancedBufferAttribute( props, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( ids, 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'offset', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
          if(this.node.renderMode === 'Motion_Blur'){
            const prev = new Float32Array(this.maxParticleCount * 3);
            if(this.prevOffsets){
              prev.set(this.prevOffsets.array.subarray(0, Math.min(prev.length, this.prevOffsets.array.length)));
            }
            this.prevOffsets = new THREE.InstancedBufferAttribute( prev, 3 ).setUsage( THREE.DynamicDrawUsage );
            this.geometry.setAttribute( 'prevOffset', this.prevOffsets );
          }
        break;
      }

      updatePositions = true;
      if(this.node.renderMode != 'Linked')
        updateVelocity = true;
      updateProperties = true;
      this.ensureInheritVelCapacity(this.maxParticleCount);
      this.emitterLog('bufferResize', {
        maxParticleCount: this.maxParticleCount,
        newVertCount: this.offsets.count,
        renderMode: this.node.renderMode,
      });
    }

    if(this.updateType == 'Lightning'){
      this.emitterLog('tick:earlyReturn', { reason: 'Lightning', delta });
      this.tickLightning(delta);
      this.commitInheritPose(currentWorldPos, currentWorldQuat);
      return;
    }

    // SingleEmitter Update — before Fountain/P2P birth loops
    if(this.node.updateMode == 'Single' && this.node.renderMode !== 'Linked'){
      this.tickSingle(delta);
      this.updateEmitterOrientationMatrix();
      this.commitInheritPose(currentWorldPos, currentWorldQuat);
      return;
    }

    // P2P: attractor / Bezier paths (per-particle indices). Linked ribbons use main tick below
    // (trail + ring + strip); P2PGravity indexes every *vertex* and moves offsets — wrong for L/R pairs.
    // KotOR MDL can set P2P flags on Linked trail emitters (e.g. v_heal_imp); those must not early-return here.
    // (Fountain is updateMode — never compare it to renderMode.)
    if(this.node.flags.isP2P && this.node.renderMode !== 'Linked'){
      // MoveFunc / RenderFunc: no target → no move, no draw.
      // Fountain Update still ages/births (quota from consumeFountainBirthQuota above).
      if(!this.hasReferenceTarget){
        this.emitterLog('tick:earlyReturn', { reason: 'P2PNoTarget', delta });
        if(this.material){
          this.material.visible = false;
        }
        this.tickP2PNoTarget(delta, fountainBirthQuota);
      }else{
        this.emitterLog('tick:earlyReturn', { reason: this.node.flags.isP2PSel ? 'P2PBezier' : 'P2PGravity', delta });
        if(this.node.flags.isP2PSel){
          this.tickP2PBezier(delta, fountainBirthQuota);
        }else{
          this.tickP2PGravity(delta, fountainBirthQuota);
        }
      }
      this.updateEmitterOrientationMatrix();
      this.commitInheritPose(currentWorldPos, currentWorldQuat);
      return;
    }

    // Trail spawn type (MDL spawntype 1): distance-based birthing — no spawns the first frame we only record baseline
    let trailBirthCount = 0;
    let trailDistThisFrame = 0;
    if(this.node.spaceType === 1){
      if(this._hasLastTrailPos){
        const dist = currentWorldPos.distanceTo(this._lastTrailPos);
        trailDistThisFrame = dist;
        this._trailAccum += dist;
        const rate = this.birthRate * OdysseyEmitter3D.TRAIL_BIRTH_SCALE;
        trailBirthCount = rate > 0
          ? Math.floor(this._trailAccum * rate)
          : 0;
        if(trailBirthCount > 0 && rate > 0){
          this._trailAccum -= trailBirthCount / rate;
        }
      }
      this._lastTrailPos.copy(currentWorldPos);
      this._hasLastTrailPos = true;
    }

    let birthCount = 0;
    let spawnableParticleCount = this.offsets.count;

    const attrPerVertex = 1;

    if(this.node.renderMode == 'Linked'){
      const cap = this._linkedCapacity;
      if(cap < 1){
        this.clearLinkedTrailMesh();
      }else{
        const liveSlots = Math.min(this.linkedTotalSpawns, cap);
        // Age samples (Particle). Slots stay until ring overwrite.
        for(let i = 0; i < liveSlots; i++){
          let age = this._linkedAges[i] || 0;
          const maxAge = this._linkedMaxAges[i] || (this.lifeExp >= 0 ? this.lifeExp : 100);
          if(maxAge >= 0.0 && age >= maxAge){
            age = maxAge;
          }else{
            age += delta;
          }
          this._linkedAges[i] = age || 0;
        }

        let toSpawn = 0;
        if(this.node.spaceType === 1 && trailBirthCount > 0){
          toSpawn = Math.min(trailBirthCount, cap);
        }else if(this.birthRate > 0 && !this._birthTimer){
          toSpawn = 1;
        }

        for(let s = 0; s < toSpawn; s++){
          this.spawnLinkedSample(currentWorldPos, delta);
          updatePositions = true;
        }

        this.rebuildLinkedTrailMesh();
      }

      const logicalDraw = Math.min(this.linkedTotalSpawns, this._linkedCapacity);
      this.emitterLog('linkedTick', {
        delta,
        worldPos: { x: currentWorldPos.x, y: currentWorldPos.y, z: currentWorldPos.z },
        spaceType: this.node.spaceType,
        updateMode: this.node.updateMode,
        trailDistThisFrame,
        trailBirthCount,
        trailAccum: this._trailAccum,
        hasLastTrailPos: this._hasLastTrailPos,
        birthRate: this.birthRate,
        trailBirthScale: OdysseyEmitter3D.TRAIL_BIRTH_SCALE,
        birthTimer: this._birthTimer,
        particleIndex: this.particleIndex,
        linkedTotalSpawns: this.linkedTotalSpawns,
        linkedCapacity: this._linkedCapacity,
        logicalDraw,
        lifeExp: this.lifeExp,
      });
    }

    if(this.node.renderMode != 'Linked'){
      // FountainEmitter Update order:
      // 1) chkParticleLife 2) Motion_Blur tail lerp 3) particleRot (shader rotate*age)
      // 4) MoveFunc 5) birth

      // --- 1) Age / kill only (no spawn yet) ---
      for(let i = 0; i < spawnableParticleCount; i++){
        let age = this.props.getX(i) || 0;
        let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : -1);
        let alive = this.props.getZ(i) == 1;

        if(i < this.maxParticleCount){
          if(this.node.updateMode == 'Single'){
            age += delta;
            this.props.setX(i, age || 0);
            this.props.setY(i, maxAge);
            this.props.setZ(i, 1);
            updateProperties = true;
          }else if(alive){
            if(maxAge >= 0.0 && age >= maxAge){
              age = 0;
              this.particleCount -= 1;
              this.props.setZ(i, 0);
            }else{
              age += delta;
              if(maxAge > 0.0 && age > maxAge) age = maxAge;
            }
            this.props.setX(i, age || 0);
            updateProperties = true;
          }
        }else if(this.node.updateMode != 'Single'){
          if(alive){
            if(maxAge >= 0.0 && age >= maxAge){
              age = 0;
              this.particleCount -= 1;
              this.props.setZ(i, 0);
            }else{
              age += delta;
            }
            this.props.setX(i, age || 0);
            updateProperties = true;
          }
        }
      }

      // --- 2) Motion_Blur tail lerp (before MoveFunc) ---
      if(this.node.renderMode === 'Motion_Blur' && this.prevOffsets && this.blurLength > 0){
        const t = Math.min(delta, this.blurLength) / this.blurLength;
        const omt = 1 - t;
        for(let i = 0; i < spawnableParticleCount; i++){
          if(this.props.getZ(i) !== 1) continue;
          this.prevOffsets.setX(i, omt * this.prevOffsets.getX(i) + t * this.offsets.getX(i));
          this.prevOffsets.setY(i, omt * this.prevOffsets.getY(i) + t * this.offsets.getY(i));
          this.prevOffsets.setZ(i, omt * this.prevOffsets.getZ(i) + t * this.offsets.getZ(i));
        }
        this.prevOffsets.needsUpdate = true;
      }

      // --- 4a) Inherit (MoveFunc start) — world-space particles ---
      // Inherit (moveParticleStandard bit 6):
      // local = pos - prevEmitter; local = (currQ * inv(prevQ)) * local; pos = local + currEmitter.
      if(this.node.flags.canInherit && this._hasLastWorldPos){
        const prevPos = this._lastWorldPos;
        const deltaQ = OdysseyEmitter3D._quatC
          .copy(this._lastWorldQuat).invert()
          .premultiply(currentWorldQuat);
        const useQuat = this._hasLastWorldQuat && Math.abs(1 - Math.abs(deltaQ.w)) > 1e-6;
        const local = OdysseyEmitter3D._v3A;
        const vel = OdysseyEmitter3D._v3D;
        for(let i = 0; i < spawnableParticleCount; i++){
          if(this.props.getZ(i) !== 1) continue;
          if(useQuat){
            local.set(
              this.offsets.getX(i) - prevPos.x,
              this.offsets.getY(i) - prevPos.y,
              this.offsets.getZ(i) - prevPos.z
            ).applyQuaternion(deltaQ);
            this.offsets.setX(i, local.x + currentWorldPos.x);
            this.offsets.setY(i, local.y + currentWorldPos.y);
            this.offsets.setZ(i, local.z + currentWorldPos.z);
            vel.set(this.velocities.getX(i), this.velocities.getY(i), this.velocities.getZ(i))
              .applyQuaternion(deltaQ);
            this.velocities.setX(i, vel.x);
            this.velocities.setY(i, vel.y);
            this.velocities.setZ(i, vel.z);
          }else{
            this.offsets.setX(i, this.offsets.getX(i) + this._worldPosDelta.x);
            this.offsets.setY(i, this.offsets.getY(i) + this._worldPosDelta.y);
            this.offsets.setZ(i, this.offsets.getZ(i) + this._worldPosDelta.z);
          }
        }
        updatePositions = true;
        if(useQuat) updateVelocity = true;
      }

      if(this.node.flags.canInheritPart && this._hasLastWorldPos){
        for(let i = 0; i < spawnableParticleCount; i++){
          if(this.props.getZ(i) === 1){
            if(!this.node.flags.canInherit){
              this.offsets.setX(i, this.offsets.getX(i) + this._worldPosDelta.x);
              this.offsets.setY(i, this.offsets.getY(i) + this._worldPosDelta.y);
              this.offsets.setZ(i, this.offsets.getZ(i) + this._worldPosDelta.z);
            }
            if(this.prevOffsets){
              this.prevOffsets.setX(i, this.prevOffsets.getX(i) + this._worldPosDelta.x);
              this.prevOffsets.setY(i, this.prevOffsets.getY(i) + this._worldPosDelta.y);
              this.prevOffsets.setZ(i, this.prevOffsets.getZ(i) + this._worldPosDelta.z);
            }
          }
        }
        updatePositions = true;
        if(this.prevOffsets) this.prevOffsets.needsUpdate = true;
      }

      if(this.node.flags.canInheritLocal && !this.node.flags.canInherit && this._hasLastWorldPos){
        // moveParticleStandard bit 8 only when bit 6 INHERIT is unset:
        // particle += (object.pos − prevObject.pos). Emitter world delta matches a
        // placeable-rooted emitter. Do not transform/subtract — that scrambled spray
        // when pose scratches were also aliased (see _frameWorldPos).
        for(let i = 0; i < spawnableParticleCount; i++){
          if(this.props.getZ(i) === 1){
            this.offsets.setX(i, this.offsets.getX(i) + this._worldPosDelta.x);
            this.offsets.setY(i, this.offsets.getY(i) + this._worldPosDelta.y);
            this.offsets.setZ(i, this.offsets.getZ(i) + this._worldPosDelta.z);
            if(this.prevOffsets){
              this.prevOffsets.setX(i, this.prevOffsets.getX(i) + this._worldPosDelta.x);
              this.prevOffsets.setY(i, this.prevOffsets.getY(i) + this._worldPosDelta.y);
              this.prevOffsets.setZ(i, this.prevOffsets.getZ(i) + this._worldPosDelta.z);
            }
          }
        }
        updatePositions = true;
        if(this.prevOffsets) this.prevOffsets.needsUpdate = true;
      }

      // --- 4b) moveParticleStandard: integrate + wind + HitCheck bounce ---
      if(this.integrateStandardParticles(delta, spawnableParticleCount)){
        updatePositions = true;
        updateVelocity = true;
      }

      // isWeather wrap after fountain integrate (moveParticle*)
      if(this.isWeather && this.wrapWeatherParticles(spawnableParticleCount)){
        updatePositions = true;
      }

      // --- 5) Birth into dead slots ---
      if(this.node.updateMode != 'Single'){
        for(let i = 0; i < spawnableParticleCount && i < this.maxParticleCount; i++){
          if(this.props.getZ(i) === 1) continue;

          let canSpawn = false;
          let maxSpawn = 0;

          if(this.node.updateMode == 'Explosion'){
            // ExplosionEmitter Update: ftol(birthRate) particles on Detonate
            canSpawn = this.isDetonated;
            maxSpawn = Math.floor(this.birthRate) || 0;
          }else if(this.node.spaceType === 1){
            if(trailBirthCount > 0){
              canSpawn = true;
              maxSpawn = Math.max(1, trailBirthCount);
            }else if(this.birthRate > 0 && !this._birthTimer){
              canSpawn = true;
              maxSpawn = 1;
            }
          }else{
            canSpawn = fountainBirthQuota > 0;
            maxSpawn = fountainBirthQuota;
          }

          if(canSpawn && birthCount < maxSpawn){
            this.spawnParticle(i, delta);
            updatePositions = true;
            updateVelocity = true;
            birthCount++;
          }
        }
      }
    }

    this.updateEmitterOrientationMatrix();

    if(updatePositions)
      this.offsets.needsUpdate = true;

    if(updateVelocity)
      this.velocities.needsUpdate = true;

    if(updateProperties)
      this.props.needsUpdate = true;

    if(!this._birthTimer){
      this._birthTimer = this.birthRate > 0 ? 1/this.birthRate : 1;
    }

    if(this.geometry.boundingSphere)
      this.geometry.boundingSphere.radius = ( (this.size.length() || 1) + Math.abs(this.velocity) + Math.abs(this.randVelocity) + Math.abs(this.drag) + Math.abs(this.mass)  ) * (Math.max.apply(null, this.sizes) * 2);

    if(this.node.renderMode !== 'Linked'){
      this.emitterLog('tick', {
        renderMode: this.node.renderMode,
        delta,
        spaceType: this.node.spaceType,
        updateMode: this.node.updateMode,
        birthRate: this.birthRate,
        birthTimer: this._birthTimer,
        birthAccum: this._birthAccum,
        fountainBirthQuota,
        lifeExp: this.lifeExp,
        particleCount: this.particleCount,
        offsetsCount: this.offsets.count,
        maxParticleCount: this.maxParticleCount,
      });
    }

    this.isDetonated = false;

    this.sortParticles();

    // Update chunk instances if this is a chunk emitter
    if(this._isChunkEmitter && this._chunkLoaded){
      this.updateChunkInstances();
    }

    // Store pose for next frame's inherit (swap previous/current before next GetWorld).
    this.commitInheritPose(currentWorldPos, currentWorldQuat);
  }

  /** gob opacity field — walk to OdysseyModel3D.opacity. */
  private getParentGobAlpha(): number {
    let obj: THREE.Object3D | null = this.parent;
    while(obj){
      if((obj as any).type === 'OdysseyModel' && typeof (obj as any).opacity === 'number'){
        return (obj as any).opacity;
      }
      obj = obj.parent;
    }
    return 1;
  }

  /**
   * PartEmitter fade — emitterFadeHeight = 5.0.
   * If emitterWorldZ − modelRootZ > 5 → multiply alpha by deadspace, else 1.
   * Ref is the model root / OdysseyModel3D root (model node abs Z;
   * do not use children.size). Used by RenderStandard, RenderMotionBlurred, RenderLinked.
   *
   * deadSpace == 0 disables this fade (same gate as Aligned_to_Particle_Dir DEADSPACE).
   * Returning 0 would wipe alpha for tall emitters (e.g. m45ac_bmap red_fighters on rotdummy).
   */
  private getEmitterFadeAlpha(): number {
    const EMITTER_FADE_HEIGHT = 5.0;
    const dead = this.node?.deadSpace;
    if(dead === undefined || dead === null || dead === 0) return 1;

    this.getWorldPosition(OdysseyEmitter3D._v3A);
    let refZ = OdysseyEmitter3D._v3A.z;
    const owner = this.getOwnerModel();
    if(owner){
      owner.getWorldPosition(OdysseyEmitter3D._v3B);
      refZ = OdysseyEmitter3D._v3B.z;
    }
    // : emitterFadeHeight < threshold − nodeAbsZ
    if(OdysseyEmitter3D._v3A.z - refZ > EMITTER_FADE_HEIGHT){
      return dead;
    }
    return 1;
  }

  /** World-unit soft fade distance for DEPTH_TEXTURE emitters. */
  private static readonly SOFT_PARTICLE_DISTANCE = 0.5;

  /** Bind GameState/context depth target for soft-particle DEPTH_TEXTURE emitters. */
  private updateDepthTextureUniforms(): void {
    if(!this.node?.flags?.isDepthTexture || !this.material) return;
    const u = this.material.uniforms;
    if(!u?.tDepth || !u?.resolution) return;

    const depthTex =
      this.context?.depthTarget?.depthTexture ||
      GameState.depthTarget?.depthTexture ||
      null;

    if(!depthTex) return;

    if(!('DEPTH_TEXTURE' in this.material.defines)){
      this.material.defines.DEPTH_TEXTURE = '';
      // RenderStandard: glDepthMask(0) — soft emitters must not write depth
      this.material.depthWrite = false;
      this.material.needsUpdate = true;
    }

    u.tDepth.value = depthTex;
    const rt = this.context?.depthTarget || GameState.depthTarget;
    const w = rt?.width || GameState.ResolutionManager?.getViewportWidth?.() || 1;
    const h = rt?.height || GameState.ResolutionManager?.getViewportHeight?.() || 1;
    u.resolution.value.set(w, h);

    const cam = (this.context?.currentCamera || GameState.currentCamera) as
      THREE.PerspectiveCamera | THREE.OrthographicCamera | undefined;
    if(cam && 'near' in cam && 'far' in cam){
      if(u.cameraNear) u.cameraNear.value = cam.near;
      if(u.cameraFar) u.cameraFar.value = cam.far;
    }
    if(u.softFactor){
      u.softFactor.value = OdysseyEmitter3D.SOFT_PARTICLE_DISTANCE;
    }

    // Request depth prepass before the next composed frame
    GameState.softDepthNeeded = true;
    if(this.context){
      this.context.softDepthNeeded = true;
    }
  }

  /**
   * Walk to owning OdysseyModel3D (Gob). Used for alpha fade and force distortion.
   */
  private getOwnerModel(): any {
    let obj: THREE.Object3D | null = this.parent;
    while(obj){
      if((obj as any).type === 'OdysseyModel'){
        return obj;
      }
      obj = obj.parent;
    }
    return null;
  }

  /**
   * PartEmitter RenderFunc — when parent Gob is distortion-active:
   * colorMask(0) + stencil REPLACE during the scene pass. Stencil uses bit
   * {@link FORCE_DISTORTION_STENCIL_BIT} so shadow-disk bits 0–6 stay intact.
   * Sets forceDistortionNeeded for the FB warp pass.
   */
  private updateForceDistortionStencil(): void {
    if(!this.material) return;

    const owner = this.getOwnerModel();
    const active = !!(owner && typeof owner.isForceDistortionActive === 'function'
      && owner.isForceDistortionActive()
      && this.visible
      && owner.visible);

    if(active){
      GameState.forceDistortionNeeded = true;
      if(this.context){
        (this.context as any).forceDistortionNeeded = true;
      }
      // colorMask(0) — never draw Fx_distortion as color
      this.material.colorWrite = false;
      this.material.depthWrite = false;
      this.material.stencilWrite = true;
      this.material.stencilWriteMask = FORCE_DISTORTION_STENCIL_BIT;
      this.material.stencilFuncMask = 0xff;
      this.material.stencilFunc = THREE.AlwaysStencilFunc;
      this.material.stencilRef = FORCE_DISTORTION_STENCIL_BIT;
      this.material.stencilFail = THREE.KeepStencilOp;
      this.material.stencilZFail = THREE.KeepStencilOp;
      this.material.stencilZPass = THREE.ReplaceStencilOp;
    }else{
      this.material.colorWrite = true;
      this.material.stencilWrite = false;
      this.material.stencilWriteMask = 0xff;
      this.material.stencilFuncMask = 0xff;
      this.material.stencilFunc = THREE.AlwaysStencilFunc;
      this.material.stencilRef = 0;
      this.material.stencilFail = THREE.KeepStencilOp;
      this.material.stencilZFail = THREE.KeepStencilOp;
      this.material.stencilZPass = THREE.KeepStencilOp;
    }
  }

  private commitInheritPose(pos: THREE.Vector3, quat: THREE.Quaternion){
    this._lastWorldPos.copy(pos);
    this._hasLastWorldPos = true;
    this._lastWorldQuat.copy(quat);
    this._hasLastWorldQuat = true;
  }

  setReferenceNode( referenceNode: THREE.Object3D ){
    if(referenceNode){
      this.referenceNode = referenceNode as OdysseyObject3D;
      this.hasReferenceTarget = true;
      // RenderFunc draws once the reference target is set; undo P2PNoTarget hide.
      // birthRate==0 means disable — leave hidden for P2P fountain; Lightning uses SubDiv density.
      if(this.material){
        if(this.node.updateMode === 'Lightning' || (this.node.flags.isP2P && this.birthRate > 0)){
          this.material.visible = true;
        }
      }
    }
  }

  /**
   * Feed emitter world orientation into the shader `matrix` uniform.
   * RenderStandard:
   * - Aligned_to_Particle_Dir: particle orientation (approx. emitter world quat)
   * - Billboard_to_Local_Z: emitter world quat (localZ branch uses)
   */
  private updateEmitterOrientationMatrix(){
    const mode = this.node.renderMode;
    if(
      (mode !== 'Aligned_to_Particle_Dir' && mode !== 'Billboard_to_Local_Z') ||
      !this.material?.uniforms?.matrix
    ){
      return;
    }
    this.getWorldQuaternion(OdysseyEmitter3D._quat);
    this.material.uniforms.matrix.value.makeRotationFromQuaternion(OdysseyEmitter3D._quat);
    this.material.uniformsNeedUpdate = true;
  }

  /**
   * LightningEmitter Update + UpdateControlPoints.
   * : (int)birthRate = sample count; lightningDelay gates zigzag regen;
   * ControlPTCount/Delay/Radius + TangentLength build Hermite CPs; zigZag° spins
   * offset axis; K1 always zigzag; numBranches → UpdateBranches;
   * RenderLinked camera ribbon with per-sample size taper.
   *
   * Reference: MDL omenref child (e.g. v_coldray_dur omenref01) wires via
   * setReferenceNode; EffectBeam / Forge retarget. clears when birthRate == 0.
   */
  tickLightning(delta: number = 0){
    // LightningEmitter Update: birthRate==0 OR no reference → destroy samples.
    if(!this.hasReferenceTarget || !this.referenceNode){
      this.clearLightningRibbon();
      return;
    }

    const start = OdysseyEmitter3D._v3A;
    this.getWorldPosition(start);
    const target = OdysseyEmitter3D._v3B;
    this.referenceNode.getWorldPosition(target);

    const bolt = OdysseyEmitter3D._v3C.subVectors(target, start);
    const dist = bolt.length();
    if(dist > 1e-6) bolt.multiplyScalar(1 / dist);
    else bolt.set(0, 0, 1);

    // : sampleCount = ftol(birthRate). Beam MDLs ship birthRate 0 — use the
    // same dist×SubDiv+2 density as UpdateBranches when rate is unset.
    const br = Math.floor(this.birthRate);
    const sampleCount = Math.max(
      2,
      Math.min(
        OdysseyEmitter3D.LIGHTNING_MAX_SAMPLES,
        br > 0 ? br : Math.floor(dist * (this.lightningSubDiv || 0)) + 2
      )
    );

    if(br === 0 && !(this.lightningSubDiv > 0)){
      // No authored rate and no SubDiv density → nothing to draw (destroy).
      this.clearLightningRibbon();
      return;
    }

    const basisU = OdysseyEmitter3D._v3D;
    basisU.set(0, 0, 1).cross(bolt);
    if(basisU.lengthSq() < 1e-8){
      basisU.set(1, 0, 0).cross(bolt);
    }
    basisU.normalize();
    const vX = bolt.y * basisU.z - bolt.z * basisU.y;
    const vY = bolt.z * basisU.x - bolt.x * basisU.z;
    const vZ = bolt.x * basisU.y - bolt.y * basisU.x;

    this._lightningDelay += delta;
    const delay = this.lightningDelay > 0 ? this.lightningDelay : 0;
    const needZigZagRegen =
      this._lightningSampleCount !== sampleCount ||
      this._lightningMidOU.length < sampleCount ||
      this._lightningDelay >= delay;

    if(needZigZagRegen){
      this._lightningDelay = 0;
      // K1 : stays 0 → always zigzag (not RecursiveFractal).
      // SubDiv still drives branch sample density / birthRate==0 sample count.
      this.regenerateLightningMidOffsets(
        sampleCount, start, target, bolt, basisU, vX, vY, vZ
      );
      // Child bolts also refresh zigzag (Update forced with delay+0.01)
      for(let b = 0; b < this._lightningBranchActive; b++){
        this.regenBranchMidOffsets(this._lightningBranches[b]);
      }
    }

    this._controlPTAccum += delta;
    const cpDelay = this.controlPTDelay > 0 ? this.controlPTDelay : 0;
    const tanLen = this.getLightningTangentLength();
    const wantCPs = this.controlPTCount > 0 || tanLen > 0;
    const cpCount = wantCPs
      ? Math.max(
          2,
          Math.min(
            OdysseyEmitter3D.LIGHTNING_MAX_CPS,
            Math.floor(dist * this.controlPTCount + 0.5) + 2
          )
        )
      : 2;
    const maxBranches = Math.min(
      OdysseyEmitter3D.LIGHTNING_MAX_BRANCHES,
      Math.max(0, this.node?.branchCount || 0)
    );
    const structuralCP =
      wantCPs &&
      (this._cpCount !== cpCount || this._cpMidOU.length < cpCount);
    const structuralBranch =
      maxBranches > 0 && this._lightningBranches.length < maxBranches;
    const needCPOrBranch =
      structuralCP ||
      structuralBranch ||
      (this._controlPTAccum >= cpDelay && (wantCPs || maxBranches > 0));

    if(needCPOrBranch){
      this._controlPTAccum = 0;
      if(wantCPs){
        this.regenerateControlPTOffsets(cpCount);
      }
      // UpdateBranches — same gate as ControlPT regen
      if(maxBranches > 0){
        this.updateLightningBranches(
          maxBranches, sampleCount, dist, start, target, bolt, basisU, vX, vY, vZ
        );
      }else{
        this._lightningBranchActive = 0;
      }
    }

    if(this._lightningCenters.length < sampleCount * 3){
      this._lightningCenters = new Float32Array(sampleCount * 3);
    }
    this.fillLightningSampleCenters(
      sampleCount,
      cpCount,
      wantCPs,
      tanLen,
      start,
      target,
      bolt,
      basisU,
      vX,
      vY,
      vZ,
      needZigZagRegen
    );

    const cam = (this.context?.currentCamera || GameState.currentCamera) as
      | THREE.Camera
      | undefined;

    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const velocities: number[] = [];
    const props: number[] = [];

    this.appendLightningRibbon(
      this._lightningCenters,
      sampleCount,
      bolt.x, bolt.y, bolt.z,
      basisU.x, basisU.y, basisU.z,
      1,
      cam,
      vertices,
      normals,
      uvs,
      velocities,
      props,
      indices,
      0
    );

    let totalSamples = sampleCount;
    const centers = this._lightningCenters;
    for(let b = 0; b < this._lightningBranchActive; b++){
      const branch = this._lightningBranches[b];
      const ai = Math.min(branch.attachIdx, sampleCount - 1);
      const bx0 = centers[ai * 3];
      const by0 = centers[ai * 3 + 1];
      const bz0 = centers[ai * 3 + 2];
      let ex = branch.endX;
      let ey = branch.endY;
      let ez = branch.endZ;
      if(branch.trackTarget){
        ex = target.x;
        ey = target.y;
        ez = target.z;
      }
      const bCount = branch.sampleCount;
      if(branch.centers.length < bCount * 3){
        branch.centers = new Float32Array(bCount * 3);
      }
      // Follow main-bolt attach each frame (Update sync after zigzag)
      this.fillBranchCenters(branch, bx0, by0, bz0, ex, ey, ez);
      let bdx = ex - bx0;
      let bdy = ey - by0;
      let bdz = ez - bz0;
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
      if(bDist > 1e-6){
        bdx /= bDist;
        bdy /= bDist;
        bdz /= bDist;
      }else{
        bdx = bolt.x;
        bdy = bolt.y;
        bdz = bolt.z;
      }
      // Camera-facing basis ⊥ branch
      let bux = -bdy;
      let buy = bdz;
      let buz = -bdx;
      let buLen = Math.sqrt(bux * bux + buy * buy + buz * buz);
      if(buLen < 1e-8){
        bux = 1;
        buy = 0;
        buz = 0;
        // cross(boltDir, X)
        bux = 0;
        buy = bdz;
        buz = -bdy;
        buLen = Math.sqrt(bux * bux + buy * buy + buz * buz);
      }
      if(buLen > 1e-8){
        bux /= buLen;
        buy /= buLen;
        buz /= buLen;
      }
      const vertBase = vertices.length / 3;
      this.appendLightningRibbon(
        branch.centers,
        bCount,
        bdx, bdy, bdz,
        bux, buy, buz,
        branch.sizeScale,
        cam,
        vertices,
        normals,
        uvs,
        velocities,
        props,
        indices,
        vertBase
      );
      totalSamples += bCount;
    }

    this.geometry.setIndex(indices);
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.geometry.setAttribute('offset', new THREE.Float32BufferAttribute(velocities, 4));
    this.geometry.setAttribute('props', new THREE.Float32BufferAttribute(props, 4));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.velocities = this.geometry.getAttribute('offset') as THREE.BufferAttribute;
    this.props = this.geometry.getAttribute('props') as THREE.BufferAttribute;
    this.offsets = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.particleCount = totalSamples;

    const maxHalfW = Math.max(
      this.sizes[0] || 0,
      this.sizes[1] || 0,
      this.sizes[2] || 0,
      0.04
    ) * 0.5;
    if(this.geometry.boundingSphere){
      this.geometry.boundingSphere.radius = Math.max(dist, maxHalfW * 2);
    }
  }

  /** Lightning Update: no reference / birthRate 0 → empty particle list. */
  private clearLightningRibbon(){
    if(!this.geometry) return;
    this.geometry.setIndex([]);
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.geometry.setAttribute('offset', new THREE.Float32BufferAttribute([], 4));
    this.geometry.setAttribute('props', new THREE.Float32BufferAttribute([], 4));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute([], 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([], 2));
    this.velocities = this.geometry.getAttribute('offset') as THREE.BufferAttribute;
    this.props = this.geometry.getAttribute('props') as THREE.BufferAttribute;
    this.offsets = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.particleCount = 0;
    this._lightningBranchActive = 0;
  }

  /** TangentLength controller, else binary controlPTSmoothing. */
  private getLightningTangentLength(): number {
    if(this.tangentLength > 0) return this.tangentLength;
    return this.node?.controlPTSmoothing || 0;
  }

  /**
   * UpdateControlPoints — sample Hermite through CPs, then add zigzag.
   * Without ControlPTCount/TangentLength: linear lerp + zigzag (numCPs==2, tanLen==0).
   */
  private fillLightningSampleCenters(
    sampleCount: number,
    cpCount: number,
    wantCPs: boolean,
    tanLen: number,
    start: THREE.Vector3,
    target: THREE.Vector3,
    bolt: THREE.Vector3,
    basisU: THREE.Vector3,
    vX: number,
    vY: number,
    vZ: number,
    needZigZagRegen: boolean
  ){
    const centers = this._lightningCenters;
    const denom = sampleCount - 1;

    if(!wantCPs){
      for(let i = 0; i < sampleCount; i++){
        const t = i / denom;
        let cx = start.x + (target.x - start.x) * t;
        let cy = start.y + (target.y - start.y) * t;
        let cz = start.z + (target.z - start.z) * t;
        if(i > 0 && i < sampleCount - 1){
          const ou = this._lightningMidOU[i] || 0;
          const ov = this._lightningMidOV[i] || 0;
          cx += basisU.x * ou + vX * ov;
          cy += basisU.y * ou + vY * ov;
          cz += basisU.z * ou + vZ * ov;
        }else if(i === sampleCount - 1 && this.targetSize > 0 && needZigZagRegen){
          const j = this.targetSize * 0.5;
          cx += this.randomFloat(0, j * 2);
          cy += this.randomFloat(0, j * 2);
          cz += this.randomFloat(0, j * 2);
        }
        centers[i * 3] = cx;
        centers[i * 3 + 1] = cy;
        centers[i * 3 + 2] = cz;
      }
      return;
    }

    // Build CP positions + tangents (bolt-local mid jitter from ControlPTRadius)
    const cpDenom = cpCount - 1;
    if(this._cpPositions.length < cpCount * 3){
      this._cpPositions = new Float32Array(cpCount * 3);
      this._cpTangents = new Float32Array(cpCount * 3);
    }
    const cps = this._cpPositions;
    const tans = this._cpTangents;

    // Start tangent: emitter local Z × tanLen (quat zdir × tangent length)
    const quat = OdysseyEmitter3D._quat;
    this.getWorldQuaternion(quat);
    const zx = 2 * (quat.x * quat.z + quat.w * quat.y);
    const zy = 2 * (quat.y * quat.z - quat.w * quat.x);
    const zz = 1 - 2 * (quat.x * quat.x + quat.y * quat.y);
    let t0x = zx * tanLen;
    let t0y = zy * tanLen;
    let t0z = zz * tanLen;
    if(t0x * t0x + t0y * t0y + t0z * t0z < 1e-10){
      t0x = bolt.x * tanLen;
      t0y = bolt.y * tanLen;
      t0z = bolt.z * tanLen;
    }
    const t1x = bolt.x * tanLen;
    const t1y = bolt.y * tanLen;
    const t1z = bolt.z * tanLen;

    for(let c = 0; c < cpCount; c++){
      const u = c / cpDenom;
      let cx = start.x + (target.x - start.x) * u;
      let cy = start.y + (target.y - start.y) * u;
      let cz = start.z + (target.z - start.z) * u;
      if(c > 0 && c < cpCount - 1){
        const ou = this._cpMidOU[c] || 0;
        const ov = this._cpMidOV[c] || 0;
        cx += basisU.x * ou + vX * ov;
        cy += basisU.y * ou + vY * ov;
        cz += basisU.z * ou + vZ * ov;
      }
      cps[c * 3] = cx;
      cps[c * 3 + 1] = cy;
      cps[c * 3 + 2] = cz;
    }

    tans[0] = t0x;
    tans[1] = t0y;
    tans[2] = t0z;
    tans[(cpCount - 1) * 3] = t1x;
    tans[(cpCount - 1) * 3 + 1] = t1y;
    tans[(cpCount - 1) * 3 + 2] = t1z;
    for(let c = 1; c < cpCount - 1; c++){
      let dx = cps[(c + 1) * 3] - cps[(c - 1) * 3];
      let dy = cps[(c + 1) * 3 + 1] - cps[(c - 1) * 3 + 1];
      let dz = cps[(c + 1) * 3 + 2] - cps[(c - 1) * 3 + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if(len > 1e-6){
        dx = (dx / len) * tanLen;
        dy = (dy / len) * tanLen;
        dz = (dz / len) * tanLen;
      }else{
        dx = bolt.x * tanLen;
        dy = bolt.y * tanLen;
        dz = bolt.z * tanLen;
      }
      // TangentSpread: yaw/pitch jitter on mid tangents
      const spread = this.tangentSpread || 0;
      if(spread > 0){
        const yaw = this.randomFloat(0, spread * 2);
        const pitch = this.randomFloat(0, spread * 2);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const rx = dx * cy + dz * sy;
        const rz = -dx * sy + dz * cy;
        dx = rx * cp + dy * sp;
        dy = -rx * sp + dy * cp;
        dz = rz;
      }
      tans[c * 3] = dx;
      tans[c * 3 + 1] = dy;
      tans[c * 3 + 2] = dz;
    }

    // Sample Hermite segments onto particle slots (end of UpdateControlPoints)
    for(let i = 0; i < sampleCount; i++){
      const tBolt = i / denom;
      // Map sample t onto CP parameter space
      let seg = Math.floor(tBolt * cpDenom);
      if(seg >= cpDenom) seg = cpDenom - 1;
      const segStart = seg / cpDenom;
      const segEnd = (seg + 1) / cpDenom;
      let t = segEnd > segStart ? (tBolt - segStart) / (segEnd - segStart) : 0;
      if(t > 1) t = 1;

      const i0 = seg * 3;
      const i1 = (seg + 1) * 3;
      const p0x = cps[i0];
      const p0y = cps[i0 + 1];
      const p0z = cps[i0 + 2];
      const p1x = cps[i1];
      const p1y = cps[i1 + 1];
      const p1z = cps[i1 + 2];
      const h0x = tans[i0];
      const h0y = tans[i0 + 1];
      const h0z = tans[i0 + 2];
      const h1x = tans[i1];
      const h1y = tans[i1 + 1];
      const h1z = tans[i1 + 2];

      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * t * u * u;
      const c = 3 * u * t * t;
      const d = t * t * t;
      // : a*P0 + b*(P0+T0) + c*(P1-T1) + d*P1
      let cx = a * p0x + b * (p0x + h0x) + c * (p1x - h1x) + d * p1x;
      let cy = a * p0y + b * (p0y + h0y) + c * (p1y - h1y) + d * p1y;
      let cz = a * p0z + b * (p0z + h0z) + c * (p1z - h1z) + d * p1z;

      if(i > 0 && i < sampleCount - 1){
        const ou = this._lightningMidOU[i] || 0;
        const ov = this._lightningMidOV[i] || 0;
        cx += basisU.x * ou + vX * ov;
        cy += basisU.y * ou + vY * ov;
        cz += basisU.z * ou + vZ * ov;
      }

      centers[i * 3] = cx;
      centers[i * 3 + 1] = cy;
      centers[i * 3 + 2] = cz;
    }
  }

  /** ControlPTRadius mid-CP jitter (UpdateControlPoints mid branch). */
  private regenerateControlPTOffsets(cpCount: number){
    if(this._cpMidOU.length < cpCount){
      this._cpMidOU = new Float32Array(cpCount);
      this._cpMidOV = new Float32Array(cpCount);
    }else{
      this._cpMidOU.fill(0);
      this._cpMidOV.fill(0);
    }
    this._cpCount = cpCount;

    const radius = this.controlPTRadius || 0;
    if(!(radius > 0) || cpCount < 3) return;

    const cents = Math.max(1, Math.floor(radius * 100));
    for(let c = 1; c < cpCount - 1; c++){
      let mag = Math.floor(Math.random() * cents) * 0.01;
      if((Math.random() * 2) | 0) mag = -mag;
      const ang = Math.random() * Math.PI * 2;
      this._cpMidOU[c] = Math.cos(ang) * mag;
      this._cpMidOV[c] = Math.sin(ang) * mag;
    }
  }

  /**
   * Regen mid-sample offsets in bolt-local (u,v).
   * non-fractal path: tent×radius×rand on spun perp + scale×seg×rand along bolt.
   */
  private regenerateLightningMidOffsets(
    sampleCount: number,
    start: THREE.Vector3,
    target: THREE.Vector3,
    bolt: THREE.Vector3,
    basisU: THREE.Vector3,
    vX: number,
    vY: number,
    vZ: number
  ){
    if(this._lightningMidOU.length < sampleCount){
      this._lightningMidOU = new Float32Array(sampleCount);
      this._lightningMidOV = new Float32Array(sampleCount);
    }else{
      this._lightningMidOU.fill(0);
      this._lightningMidOV.fill(0);
    }
    this._lightningSampleCount = sampleCount;

    const dist = start.distanceTo(target);
    if(dist < 1e-6) return;

    const zigMax = Math.max(0, Math.floor(this.lightningZigZag));
    const radius = this.lightningRadius || 0;
    const scale = this.lightningScale || 0;
    const segScale = (dist / sampleCount) * 0.5 * scale;
    const deg2rad = 0.017453292;
    let angleAccum = 0;

    for(let i = 1; i < sampleCount - 1; i++){
      const t = i / sampleCount;
      const tent = t < 0.5 ? t + t : (1 - t) * 2;

      if(zigMax > 0){
        let deg = Math.floor(Math.random() * zigMax);
        if((Math.random() * 2) | 0){
          deg = 360 - deg;
        }
        angleAccum += deg;
      }
      const rad = angleAccum * deg2rad;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const kx = bolt.y * basisU.z - bolt.z * basisU.y;
      const ky = bolt.z * basisU.x - bolt.x * basisU.z;
      const kz = bolt.x * basisU.y - bolt.y * basisU.x;
      const dot = bolt.x * basisU.x + bolt.y * basisU.y + bolt.z * basisU.z;
      const px = basisU.x * cos + kx * sin + bolt.x * dot * (1 - cos);
      const py = basisU.y * cos + ky * sin + bolt.y * dot * (1 - cos);
      const pz = basisU.z * cos + kz * sin + bolt.z * dot * (1 - cos);

      const radiusMag = tent * radius * Math.random();
      let alongMag = segScale * Math.random();
      if((Math.random() * 2) | 0) alongMag = -alongMag;

      const ox = px * radiusMag + bolt.x * alongMag;
      const oy = py * radiusMag + bolt.y * alongMag;
      const oz = pz * radiusMag + bolt.z * alongMag;
      this._lightningMidOU[i] = ox * basisU.x + oy * basisU.y + oz * basisU.z;
      this._lightningMidOV[i] = ox * vX + oy * vY + oz * vZ;
    }
  }

  /**
   * RecursiveFractal — depth = floor(dist×SubDiv×0.5).
   * Writes lightning mid offsets; then along-bolt scale jitter like Update.
   */
  private regenerateLightningFractalOffsets(
    sampleCount: number,
    dist: number,
    bolt: THREE.Vector3,
    basisU: THREE.Vector3,
    vX: number,
    vY: number,
    vZ: number
  ){
    if(this._lightningMidOU.length < sampleCount){
      this._lightningMidOU = new Float32Array(sampleCount);
      this._lightningMidOV = new Float32Array(sampleCount);
    }else{
      this._lightningMidOU.fill(0);
      this._lightningMidOV.fill(0);
    }
    this._lightningSampleCount = sampleCount;

    if(dist < 1e-6 || sampleCount < 3) return;

    const depth = Math.max(
      1,
      Math.min(
        Math.floor((sampleCount - 1) / 2),
        Math.floor(dist * this.lightningSubDiv * 0.5)
      )
    );
    if(this._fractalXYZ.length < sampleCount * 3){
      this._fractalXYZ = new Float32Array(sampleCount * 3);
    }else{
      this._fractalXYZ.fill(0);
    }

    // : arg4 = (-bolt.y, bolt.z, -bolt.x); displace along that axis
    const px = -bolt.y;
    const py = bolt.z;
    const pz = -bolt.x;
    let pLen = Math.sqrt(px * px + py * py + pz * pz);
    let dx = px;
    let dy = py;
    let dz = pz;
    if(pLen > 1e-8){
      dx /= pLen;
      dy /= pLen;
      dz /= pLen;
    }else{
      dx = basisU.x;
      dy = basisU.y;
      dz = basisU.z;
    }

    this.recursiveFractalDisplace(depth, depth, dx, dy, dz, 0, 1.0, sampleCount);

    // Post-fractal along-bolt jitter (Update fractal branch)
    const seg = (dist / sampleCount) * 0.5;
    const scale = this.lightningScale || 0;
    if(seg >= 0.01 && scale > 0){
      const seg100 = Math.max(1, Math.floor(seg * 100));
      for(let i = 1; i < sampleCount - 1; i++){
        let sx = bolt.x;
        let sy = bolt.y;
        let sz = bolt.z;
        if(((Math.random() * 2) | 0) === 0){
          sx = -sx;
          sy = -sy;
          sz = -sz;
        }
        const mag = (((Math.random() * seg100) | 0) * 0.01) * scale;
        const o = i * 3;
        this._fractalXYZ[o] += sx * mag;
        this._fractalXYZ[o + 1] += sy * mag;
        this._fractalXYZ[o + 2] += sz * mag;
      }
    }

    for(let i = 1; i < sampleCount - 1; i++){
      const o = i * 3;
      const ox = this._fractalXYZ[o];
      const oy = this._fractalXYZ[o + 1];
      const oz = this._fractalXYZ[o + 2];
      this._lightningMidOU[i] = ox * basisU.x + oy * basisU.y + oz * basisU.z;
      this._lightningMidOV[i] = ox * vX + oy * vY + oz * vZ;
    }
  }

  /** RecursiveFractal body — Lightning path SETs xyz into _fractalXYZ. */
  private recursiveFractalDisplace(
    idx: number,
    half: number,
    dx: number,
    dy: number,
    dz: number,
    accum: number,
    amp: number,
    sampleCount: number
  ){
    const radius = this.lightningRadius || 0;
    const amp100 = Math.max(1, Math.floor(amp * 100));
    const mag = (((Math.random() * amp100) | 0) * 0.01) * radius + accum;
    this.setFractalOffset(idx, dx, dy, dz, mag, sampleCount);

    if(half === 0) return;

    const half2 = Math.floor(half * 0.5);
    const amp2 = amp * 0.5;
    let left = idx - half2;
    const amp2_100 = Math.max(1, Math.floor(amp2 * 100));
    let mag2 = (((Math.random() * amp2_100) | 0) * 0.01) * radius + mag;
    this.setFractalOffset(left, dx, dy, dz, mag2, sampleCount);

    if(half2 !== 0){
      const quarter = Math.floor(half2 * 0.5);
      const amp4 = amp2 * 0.5;
      const amp4_100 = Math.max(1, Math.floor(amp4 * 100));
      const farLeft = left - quarter;
      let mag4 = (((Math.random() * amp4_100) | 0) * 0.01) * radius + mag2;
      this.setFractalOffset(farLeft, dx, dy, dz, mag4, sampleCount);

      if(quarter !== 0){
        const q2 = Math.floor(quarter * 0.5);
        const amp8 = amp4 * 0.5;
        this.recursiveFractalDisplace(
          farLeft - q2, q2, dx, dy, dz, mag4, amp8, sampleCount
        );
        this.recursiveFractalDisplace(
          farLeft + q2, q2, dx, dy, dz, mag4, amp8, sampleCount
        );
      }

      left = quarter + left;
      mag2 = (((Math.random() * amp4_100) | 0) * 0.01) * radius + mag2;
      this.setFractalOffset(left, dx, dy, dz, mag2, sampleCount);

      if(quarter !== 0){
        const q2 = Math.floor(quarter * 0.5);
        const amp8 = amp4 * 0.5;
        this.recursiveFractalDisplace(
          left - q2, q2, dx, dy, dz, mag2, amp8, sampleCount
        );
        this.recursiveFractalDisplace(
          left + q2, q2, dx, dy, dz, mag2, amp8, sampleCount
        );
      }
    }

    const right = half2 + idx;
    let accumR = (((Math.random() * amp2_100) | 0) * 0.01) * radius + mag;
    this.setFractalOffset(right, dx, dy, dz, accumR, sampleCount);

    if(half2 === 0) return;

    // Tail of while-loop: recurse left of right, then continue from right+half2/2
    const nextHalf = Math.floor(half2 * 0.5);
    const nextAmp = amp2 * 0.5;
    this.recursiveFractalDisplace(
      right - nextHalf, nextHalf, dx, dy, dz, accumR, nextAmp, sampleCount
    );
    this.recursiveFractalDisplace(
      right + nextHalf, nextHalf, dx, dy, dz, accumR, nextAmp, sampleCount
    );
  }

  private setFractalOffset(
    idx: number,
    dx: number,
    dy: number,
    dz: number,
    mag: number,
    sampleCount: number
  ){
    if(idx <= 0 || idx >= sampleCount - 1) return;
    const o = idx * 3;
    this._fractalXYZ[o] = dx * mag;
    this._fractalXYZ[o + 1] = dy * mag;
    this._fractalXYZ[o + 2] = dz * mag;
  }

  /**
   * UpdateBranches — active = rand%(numBranches+1);
   * scale ∈ [0.1,0.9]; attachIdx = ftol(sampleCount×scale);
   * size/sizeY/size_mid… × scale on child; short vs track-target ends;
   * sampleCount = dist×SubDiv+2.
   */
  private updateLightningBranches(
    maxBranches: number,
    sampleCount: number,
    dist: number,
    start: THREE.Vector3,
    target: THREE.Vector3,
    bolt: THREE.Vector3,
    basisU: THREE.Vector3,
    vX: number,
    vY: number,
    vZ: number
  ){
    while(this._lightningBranches.length < maxBranches){
      this._lightningBranches.push({
        attachIdx: 0,
        sampleCount: 2,
        sizeScale: 1,
        trackTarget: false,
        endX: 0,
        endY: 0,
        endZ: 0,
        midOU: new Float32Array(0),
        midOV: new Float32Array(0),
        centers: new Float32Array(0),
      });
    }

    // : active branch count = rand % (numBranches + 1)
    this._lightningBranchActive = (Math.random() * (maxBranches + 1)) | 0;

    // Mid-axis used for short-branch spin
    const midX = vX;
    const midY = vY;
    const midZ = vZ;

    for(let i = 0; i < this._lightningBranchActive; i++){
      const branch = this._lightningBranches[i];
      // fVar2 = (rand%80)*0.01 + 0.1 → [0.1, 0.89]
      const scale = (((Math.random() * 80) | 0) * 0.01) + 0.1;
      branch.sizeScale = scale;
      // attachIdx = ftol(sampleCount * scale) — clamp into open interval
      branch.attachIdx = Math.min(
        sampleCount - 1,
        Math.max(1, Math.floor(sampleCount * scale) | 0)
      );

      const attach = Math.min(sampleCount - 1, Math.max(0, branch.attachIdx));
      const t = attach / Math.max(1, sampleCount - 1);
      const ax = start.x + (target.x - start.x) * t;
      const ay = start.y + (target.y - start.y) * t;
      const az = start.z + (target.z - start.z) * t;

      if(scale <= 0.5){
        branch.trackTarget = false;
        // Length = (0.25..0.99) * |bolt| * 0.5
        const len = ((((Math.random() * 75) | 0) * 0.01) + 0.25) * dist * 0.5;
        // YawPitchRoll(−(rand%45), 0, rand%360) × (size × midAxis) then add
        // attach + (0.25..0.49)*boltVec (short-branch end)
        const yawDeg = (Math.random() * 360) | 0;
        const pitchDeg = -(((Math.random() * 45) | 0));
        const yaw = yawDeg * 0.017453292;
        const pitch = pitchDeg * 0.017453292;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        // Start from mid-axis * size (size ≈ sizes[0])
        const size0 = this.sizes[0] || 1;
        let dx = midX * size0;
        let dy = midY * size0;
        let dz = midZ * size0;
        // Approximate YawPitchRoll: yaw about Z then pitch about X in mid frame
        let x1 = dx * cy - dy * sy;
        let y1 = dx * sy + dy * cy;
        let z1 = dz;
        dx = x1;
        dy = y1 * cp - z1 * sp;
        dz = y1 * sp + z1 * cp;
        let dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if(dLen > 1e-8){
          dx /= dLen;
          dy /= dLen;
          dz /= dLen;
        }
        const boltFrac = ((((Math.random() * 25) | 0) * 0.01) + 0.25);
        const bx = (target.x - start.x) * boltFrac;
        const by = (target.y - start.y) * boltFrac;
        const bz = (target.z - start.z) * boltFrac;
        // Spin vector scaled to len, plus bolt fraction from attach
        branch.endX = ax + dx * len + bx;
        branch.endY = ay + dy * len + by;
        branch.endZ = az + dz * len + bz;
        // birthRate = |end−attach| * SubDiv + 2
        const edx = branch.endX - ax;
        const edy = branch.endY - ay;
        const edz = branch.endZ - az;
        const bDist = Math.sqrt(edx * edx + edy * edy + edz * edz);
        branch.sampleCount = Math.max(
          2,
          Math.min(
            OdysseyEmitter3D.LIGHTNING_MAX_SAMPLES,
            Math.floor(bDist * (this.lightningSubDiv || 0) + 2) || 2
          )
        );
      }else{
        branch.trackTarget = true;
        branch.endX = target.x;
        branch.endY = target.y;
        branch.endZ = target.z;
        const dx = target.x - ax;
        const dy = target.y - ay;
        const dz = target.z - az;
        const bDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        branch.sampleCount = Math.max(
          2,
          Math.min(
            OdysseyEmitter3D.LIGHTNING_MAX_SAMPLES,
            Math.floor(bDist * (this.lightningSubDiv || 0) + 2) || 2
          )
        );
      }

      this.regenBranchMidOffsets(branch);
    }
  }

  private regenBranchMidOffsets(branch: {
    sampleCount: number;
    sizeScale?: number;
    midOU: Float32Array;
    midOV: Float32Array;
  }){
    const n = branch.sampleCount;
    if(branch.midOU.length < n){
      branch.midOU = new Float32Array(n);
      branch.midOV = new Float32Array(n);
    }else{
      branch.midOU.fill(0);
      branch.midOV.fill(0);
    }
    const radius = (this.lightningRadius || 0) * (branch.sizeScale || 1);
    for(let i = 1; i < n - 1; i++){
      const t = i / n;
      const tent = t < 0.5 ? t + t : (1 - t) * 2;
      const ang = Math.random() * Math.PI * 2;
      const mag = tent * radius * Math.random();
      branch.midOU[i] = Math.cos(ang) * mag;
      branch.midOV[i] = Math.sin(ang) * mag;
    }
  }

  private fillBranchCenters(
    branch: {
      sampleCount: number;
      midOU: Float32Array;
      midOV: Float32Array;
      centers: Float32Array;
    },
    ax: number,
    ay: number,
    az: number,
    ex: number,
    ey: number,
    ez: number
  ){
    const n = branch.sampleCount;
    const denom = Math.max(1, n - 1);
    let bdx = ex - ax;
    let bdy = ey - ay;
    let bdz = ez - az;
    const bDist = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
    if(bDist > 1e-6){
      bdx /= bDist;
      bdy /= bDist;
      bdz /= bDist;
    }
    // Orthonormal UV ⊥ branch
    let ux = -bdy;
    let uy = bdz;
    let uz = -bdx;
    let uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if(uLen < 1e-8){
      ux = 0;
      uy = bdz;
      uz = -bdy;
      uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    }
    if(uLen > 1e-8){
      ux /= uLen;
      uy /= uLen;
      uz /= uLen;
    }
    const vx = bdy * uz - bdz * uy;
    const vy = bdz * ux - bdx * uz;
    const vz = bdx * uy - bdy * ux;

    for(let i = 0; i < n; i++){
      const t = i / denom;
      let cx = ax + (ex - ax) * t;
      let cy = ay + (ey - ay) * t;
      let cz = az + (ez - az) * t;
      if(i > 0 && i < n - 1){
        const ou = branch.midOU[i] || 0;
        const ov = branch.midOV[i] || 0;
        cx += ux * ou + vx * ov;
        cy += uy * ou + vy * ov;
        cz += uz * ou + vz * ov;
      }
      branch.centers[i * 3] = cx;
      branch.centers[i * 3 + 1] = cy;
      branch.centers[i * 3 + 2] = cz;
    }
  }

  /**
   * RenderLinked lightning size lifecycle.
   * t = i / sampleCount. percentStart==255 → two-key start→end; else start/mid/end
   * with authored percent breakpoints (0 is valid — e.g. v_coldray_dur percentMid 0).
   * When all sizeY keys are 0, falls back to sizeX for the along-pad basis.
   */
  private lerpLightningSizeAt(t: number): { sizeX: number; sizeY: number } {
    const sx0 = this.sizes[0] || 0;
    const sx1 = this.sizes[1] || 0;
    const sx2 = this.sizes[2] || 0;
    const sy0 = this.sizesY[0] || 0;
    const sy1 = this.sizesY[1] || 0;
    const sy2 = this.sizesY[2] || 0;
    const hasSizeY = sy0 !== 0 || sy1 !== 0 || sy2 !== 0;

    let sizeX: number;
    let sizeY: number;
    if(this.percentStart === 255){
      sizeX = sx0 + (sx2 - sx0) * t;
      sizeY = hasSizeY ? sy0 + (sy2 - sy0) * t : sizeX;
    }else{
      // : if (t < percentEnd) { if (t < percentMid) { … } else mid→end } else end
      const pStart = this.percentStart;
      const pMid = this.percentMid;
      const pEnd = this.percentEnd;
      if(!(t < pEnd)){
        sizeX = sx2;
        sizeY = hasSizeY ? sy2 : sizeX;
      }else if(t < pMid){
        if(pStart <= t){
          const denom = pMid - pStart;
          const u = denom > 1e-6 ? (t - pStart) / denom : 0;
          sizeX = sx0 + (sx1 - sx0) * u;
          sizeY = hasSizeY ? sy0 + (sy1 - sy0) * u : sizeX;
        }else{
          sizeX = sx0;
          sizeY = hasSizeY ? sy0 : sizeX;
        }
      }else{
        const denom = pEnd - pMid;
        const u = denom > 1e-6 ? (t - pMid) / denom : 0;
        sizeX = sx1 + (sx2 - sx1) * u;
        sizeY = hasSizeY ? sy1 + (sy2 - sy1) * u : sizeX;
      }
    }
    // Allow authored taper to 0 (coldray sizeEnd). Floor only if no sizes at all.
    if(!(sizeX > 0) && !(sx0 > 0 || sx1 > 0 || sx2 > 0)){
      sizeX = 0.04;
      if(!hasSizeY) sizeY = sizeX;
    }
    return { sizeX, sizeY };
  }

  /**
   * Camera-facing L/R ribbon strip into shared geometry buffers.
   * RenderLinked lightning: halfW = sizeX*0.5; along-pad = (sizeY or sizeX)*0.25
   * (half then ×0.5 again). sizeScale multiplies lerped width (branch SizeScale).
   */
  private appendLightningRibbon(
    centers: Float32Array,
    sampleCount: number,
    boltX: number,
    boltY: number,
    boltZ: number,
    basisUX: number,
    basisUY: number,
    basisUZ: number,
    sizeScale: number,
    cam: THREE.Camera | undefined,
    vertices: number[],
    normals: number[],
    uvs: number[],
    velocities: number[],
    props: number[],
    indices: number[],
    vertBase: number
  ){
    // : fVar5 = i / count (not count-1)
    const count = Math.max(1, sampleCount);
    const scale = sizeScale > 0 ? sizeScale : 1;
    for(let i = 0; i < sampleCount; i++){
      const t = i / count;
      const { sizeX, sizeY } = this.lerpLightningSizeAt(t);
      const halfW = sizeX * 0.5 * scale;
      // : fStack_1d8 = (sizeY half or sizeX half) * 0.5 → ×0.25 of basis
      const alongPad = sizeY * 0.25 * scale;

      const cx = centers[i * 3];
      const cy = centers[i * 3 + 1];
      const cz = centers[i * 3 + 2];

      let tx = boltX;
      let ty = boltY;
      let tz = boltZ;
      if(i < sampleCount - 1){
        tx = centers[(i + 1) * 3] - cx;
        ty = centers[(i + 1) * 3 + 1] - cy;
        tz = centers[(i + 1) * 3 + 2] - cz;
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if(tLen > 1e-6){
          tx /= tLen;
          ty /= tLen;
          tz /= tLen;
        }else{
          tx = boltX;
          ty = boltY;
          tz = boltZ;
        }
      }

      let toCamX = 0;
      let toCamY = 0;
      let toCamZ = 1;
      if(cam){
        const cp = cam.position;
        toCamX = cp.x - cx;
        toCamY = cp.y - cy;
        toCamZ = cp.z - cz;
        const cLen = Math.sqrt(toCamX * toCamX + toCamY * toCamY + toCamZ * toCamZ);
        if(cLen > 1e-6){
          toCamX /= cLen;
          toCamY /= cLen;
          toCamZ /= cLen;
        }
      }
      let sx = ty * toCamZ - tz * toCamY;
      let sy = tz * toCamX - tx * toCamZ;
      let sz = tx * toCamY - ty * toCamX;
      let sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if(sLen < 1e-6){
        sx = basisUX;
        sy = basisUY;
        sz = basisUZ;
        sLen = 1;
      }
      sx = (sx / sLen) * halfW;
      sy = (sy / sLen) * halfW;
      sz = (sz / sLen) * halfW;

      // Along-bolt pad (fStack_1d8) — same shift on L/R (no shear).
      const ax = tx * alongPad;
      const ay = ty * alongPad;
      const az = tz * alongPad;

      vertices.push(cx - sx - ax, cy - sy - ay, cz - sz - az);
      vertices.push(cx + sx - ax, cy + sy - ay, cz + sz - az);
      normals.push(0, 0, 1, 0, 0, 1);
      uvs.push(0, 1 - t, 1, 1 - t);
      velocities.push(0, 0, 0, 0, 0, 0, 0, 0);
      props.push(t, 1, 1, 0, t, 1, 1, 0);
    }

    const base = vertBase;
    for(let i = 0; i < sampleCount - 1; i++){
      const a = base + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  /**
   * SingleEmitter Update.
   * birthRate==0 → destroy sole particle; else age + Motion_Blur + MoveFunc;
   * empty → spawn one. No Fountain birth timer / trails / Detonate.
   */
  tickSingle(delta: number){
    const count = this.offsets?.count || 0;
    if(count < 1) return;

    if(Math.floor(this.birthRate) === 0){
      for(let i = 0; i < count; i++){
        if(this.props.getZ(i) === 1){
          this.props.setZ(i, 0);
          this.particleCount = Math.max(0, this.particleCount - 1);
        }
        this.props.setX(i, 0);
      }
      this.props.needsUpdate = true;
      if(this._isChunkEmitter && this._chunkLoaded){
        this.updateChunkInstances();
      }
      return;
    }

    let live = -1;
    for(let i = 0; i < count; i++){
      if(this.props.getZ(i) === 1){
        live = i;
        break;
      }
    }

    if(live >= 0){
      // P2P MoveFunc paths age inside tickP2P* — avoid double-aging
      if(this.node.flags.isP2P){
        if(this.node.flags.isP2PSel){
          this.tickP2PBezier(delta);
        }else{
          this.tickP2PGravity(delta);
        }
        // Enforce at-most-one live particle
        for(let i = 0; i < count; i++){
          if(i !== 0 && this.props.getZ(i) === 1){
            this.props.setZ(i, 0);
            this.particleCount = Math.max(0, this.particleCount - 1);
          }
        }
        this.props.needsUpdate = true;
        if(this._isChunkEmitter && this._chunkLoaded){
          this.updateChunkInstances();
        }
        return;
      }

      let age = (this.props.getX(live) || 0) + delta;
      const life = this.lifeExp;
      if(life > 0 && age > life){
        age = 0;
      }else if(life <= 0 && age < 0){
        age = delta;
      }
      this.props.setX(live, age);
      this.props.setY(live, life >= 0 ? life : -1);
      this.props.needsUpdate = true;

      if(this.node.renderMode === 'Motion_Blur' && this.prevOffsets && this.blurLength > 0){
        const t = Math.min(delta, this.blurLength) / this.blurLength;
        const omt = 1 - t;
        this.prevOffsets.setX(live, omt * this.prevOffsets.getX(live) + t * this.offsets.getX(live));
        this.prevOffsets.setY(live, omt * this.prevOffsets.getY(live) + t * this.offsets.getY(live));
        this.prevOffsets.setZ(live, omt * this.prevOffsets.getZ(live) + t * this.offsets.getZ(live));
        this.prevOffsets.needsUpdate = true;
      }

      if(this.node.flags.canInherit && this._hasLastWorldPos){
        const prevPos = this._lastWorldPos;
        const deltaQ = OdysseyEmitter3D._quatC
          .copy(this._lastWorldQuat).invert()
          .premultiply(this._frameWorldQuat);
        const useQuat = this._hasLastWorldQuat && Math.abs(1 - Math.abs(deltaQ.w)) > 1e-6;
        const local = OdysseyEmitter3D._v3A;
        const vel = OdysseyEmitter3D._v3D;
        if(useQuat){
          local.set(
            this.offsets.getX(live) - prevPos.x,
            this.offsets.getY(live) - prevPos.y,
            this.offsets.getZ(live) - prevPos.z
          ).applyQuaternion(deltaQ);
          this.offsets.setX(live, local.x + this._frameWorldPos.x);
          this.offsets.setY(live, local.y + this._frameWorldPos.y);
          this.offsets.setZ(live, local.z + this._frameWorldPos.z);
          vel.set(this.velocities.getX(live), this.velocities.getY(live), this.velocities.getZ(live))
            .applyQuaternion(deltaQ);
          this.velocities.setX(live, vel.x);
          this.velocities.setY(live, vel.y);
          this.velocities.setZ(live, vel.z);
        }else{
          this.offsets.setX(live, this.offsets.getX(live) + this._worldPosDelta.x);
          this.offsets.setY(live, this.offsets.getY(live) + this._worldPosDelta.y);
          this.offsets.setZ(live, this.offsets.getZ(live) + this._worldPosDelta.z);
        }
        this.offsets.needsUpdate = true;
        this.velocities.needsUpdate = true;
      }
      this.integrateStandardParticles(delta, count);
      if(this.isWeather){
        this.wrapWeatherParticles(count);
      }
    }else{
      this.spawnParticle(0, delta);
      this.particleCount = 1;
      for(let i = 1; i < count; i++){
        this.props.setZ(i, 0);
      }
      this.props.needsUpdate = true;
      this.offsets.needsUpdate = true;
      this.velocities.needsUpdate = true;
    }

    this.sortParticles();
    if(this._isChunkEmitter && this._chunkLoaded){
      this.updateChunkInstances();
    }
  }

  /**
   * P2P with no reference target: MoveFunc no-ops; Fountain Update still ages and births.
   */
  tickP2PNoTarget(delta: number, fountainBirthQuota: number = 0){
    let updatePositions = false;
    let updateVelocity = false;
    let updateProperties = false;
    let birthCount = 0;
    const spawnableParticleCount = this.offsets.count;

    for(let i = 0; i < spawnableParticleCount; i++){
      let age = this.props.getX(i) || 0;
      let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : -1);
      let alive = this.props.getZ(i) == 1;

      if(alive){
        if(maxAge >= 0.0 && age >= maxAge){
          this.props.setZ(i, 0);
          this.particleCount -= 1;
          age = 0;
        }else{
          age += delta;
        }
      }else if(this.tryP2PSpawn(i, delta, fountainBirthQuota, birthCount)){
        updatePositions = true;
        updateVelocity = true;
        birthCount++;
        age = 0;
      }else{
        age = 0;
      }
      this.props.setX(i, age || 0);
      updateProperties = true;
    }

    if(updatePositions) this.offsets.needsUpdate = true;
    if(updateVelocity) this.velocities.needsUpdate = true;
    if(updateProperties) this.props.needsUpdate = true;
    this.isDetonated = false;
    this.sortParticles();
  }

  /** Shared P2P dead-slot birth (Fountain quota / Explosion / Single). */
  private tryP2PSpawn(
    i: number,
    delta: number,
    fountainBirthQuota: number,
    birthCount: number
  ): boolean {
    let canSpawn = false;
    let maxSpawn = 0;
    if(this.node.updateMode == 'Explosion'){
      canSpawn = this.isDetonated;
      maxSpawn = Math.floor(this.birthRate) || 0;
    }else if(this.node.updateMode == 'Single'){
      canSpawn = this.particleCount < 1 && Math.floor(this.birthRate) > 0;
      maxSpawn = 1;
    }else{
      // FountainEmitter Update — same quota for P2P and non-P2P
      canSpawn = fountainBirthQuota > 0;
      maxSpawn = fountainBirthQuota;
    }
    if(canSpawn && birthCount < maxSpawn){
      this.spawnParticle(i, delta);
      return true;
    }
    return false;
  }

  /**
   * P2P Gravity → moveParticleP2PGrav.
   * World-space offsets (matching spawnParticle / shader CPU_PHYSICS).
   * : pos += vel*dt → wind → if |toRef|² < threshold² kill →
   * vel *= pow(drag, dt) → a = grav*normalize(toRef) → pos += a*dt²; vel += a*dt →
   * vel.z -= mass*9.81*dt → |scale*(1-dt)| → optional bounce.
   */
  tickP2PGravity(delta: number, fountainBirthQuota: number = 0){
    let updatePositions = false;
    let updateVelocity = false;
    let updateProperties = false;

    // Target in world space — offsets are world-space (spawnParticle / getRandomPosition).
    const refW = OdysseyEmitter3D._v3A;
    this.referenceNode.getWorldPosition(refW);

    const pW = OdysseyEmitter3D._v3B;
    const toRef = OdysseyEmitter3D._v3C;
    const velW = OdysseyEmitter3D._v3D;

    let birthCount = 0;
    const spawnableParticleCount = this.offsets.count;
    const thresholdSq = this.threshold > 0 ? this.threshold * this.threshold : 0;
    const massGravity = this.mass * 9.81;
    const drag = this.drag;
    const grav = this.gravity;
    // : vel *= pow(drag, dt). drag<=0 → zero velocity (pow domain).
    const dragPow = drag > 0 ? Math.pow(drag, delta) : 0;

    for(let i = 0; i < spawnableParticleCount; i++){
      let age = this.props.getX(i) || 0;
      let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : -1);
      let alive = this.props.getZ(i) == 1;

      if(alive){
        pW.set(
          this.offsets.getX(i),
          this.offsets.getY(i),
          this.offsets.getZ(i)
        );

        toRef.copy(refW).sub(pW);
        const distSq = toRef.lengthSq();

        // Kill particle if within threshold distance
        if(thresholdSq > 0 && distSq < thresholdSq){
          this.props.setZ(i, 0);
          this.particleCount -= 1;
          age = 0;
        }else if(maxAge >= 0.0 && age >= maxAge){
          this.props.setZ(i, 0);
          this.particleCount -= 1;
          age = 0;
        }else{
          velW.set(
            this.velocities.getX(i),
            this.velocities.getY(i),
            this.velocities.getZ(i)
          );

          // Predict with current velocity first (order before attract).
          pW.addScaledVector(velW, delta);

          velW.multiplyScalar(dragPow);

          // : attract along normalize(target−pos) from before the vel predict.
          if(grav !== 0 && distSq > 1e-12){
            toRef.multiplyScalar(1.0 / Math.sqrt(distSq));
            const ax = grav * toRef.x * delta;
            const ay = grav * toRef.y * delta;
            const az = grav * toRef.z * delta;
            pW.x += ax * delta;
            pW.y += ay * delta;
            pW.z += az * delta;
            velW.x += ax;
            velW.y += ay;
            velW.z += az;
          }

          velW.z -= massGravity * delta;

          this.velocities.setX(i, velW.x);
          this.velocities.setY(i, velW.y);
          this.velocities.setZ(i, velW.z);

          this.offsets.setX(i, pW.x);
          this.offsets.setY(i, pW.y);
          this.offsets.setZ(i, pW.z);

          age += delta;
          updatePositions = true;
          updateVelocity = true;
        }
      }else if(this.tryP2PSpawn(i, delta, fountainBirthQuota, birthCount)){
        updatePositions = true;
        updateVelocity = true;
        birthCount++;
        age = 0;
      }else{
        age = 0;
      }
      this.props.setX(i, age || 0);
      updateProperties = true;
    }

    if(updatePositions) this.offsets.needsUpdate = true;
    if(updateVelocity) this.velocities.needsUpdate = true;
    if(updateProperties) this.props.needsUpdate = true;

    this.isDetonated = false;
    this.sortParticles();
  }

  /**
   * P2P_SEL → moveParticleP2PBezier (MoveFunc).
   * World-space offsets (matching spawnParticle / shader CPU_PHYSICS).
   * : inherit rebase → pos+=vel×dt → wind → cubic Bezier(t=age/life)
   * P0=emitter, P1=emitter+ez×bezier2, P2=target+tz×bezier3, P3=target(+targetSize);
   * blend = Bezier×pow(t³,drag) + free×(1−pow); vel.z −= mass×9.81×dt; |1−dt| on
   * residual scale; optional HitCheck bounce.
   */
  tickP2PBezier(delta: number, fountainBirthQuota: number = 0){
    let updatePositions = false;
    let updateVelocity = false;
    let updateProperties = false;

    const startPos = OdysseyEmitter3D._v3A;
    this.getWorldPosition(startPos);
    const endPos = OdysseyEmitter3D._v3B;
    if(this.hasReferenceTarget){
      this.referenceNode.getWorldPosition(endPos);
    }else{
      endPos.copy(startPos).add(new THREE.Vector3(0, 0, 1));
    }

    // TargetSize jitter on reference (once per MoveFunc)
    if(this.targetSize > 0){
      const j = this.targetSize * 0.5;
      endPos.x += this.randomFloat(0, j * 2) - j;
      endPos.y += this.randomFloat(0, j * 2) - j;
      endPos.z += this.randomFloat(0, j * 2) - j;
    }

    const emitZ = OdysseyEmitter3D._v3C.set(0, 0, 1);
    const quat = OdysseyEmitter3D._quat;
    this.getWorldQuaternion(quat);
    emitZ.applyQuaternion(quat);

    // Reference local Z for P2 (: zdir from ref orientation × bezier3)
    const refZ = OdysseyEmitter3D._v3D.set(0, 0, 1);
    if(this.hasReferenceTarget){
      this.referenceNode.getWorldQuaternion(OdysseyEmitter3D._quatB);
      refZ.applyQuaternion(OdysseyEmitter3D._quatB);
    }else{
      refZ.copy(emitZ);
    }

    const b2 = this.p2pBezier2 || 0;
    const b3 = this.p2pBezier3 || 0;
    // Control points (world)
    const p0x = startPos.x, p0y = startPos.y, p0z = startPos.z;
    const p1x = startPos.x + emitZ.x * b2;
    const p1y = startPos.y + emitZ.y * b2;
    const p1z = startPos.z + emitZ.z * b2;
    const p2x = endPos.x + refZ.x * b3;
    const p2y = endPos.y + refZ.y * b3;
    const p2z = endPos.z + refZ.z * b3;
    const p3x = endPos.x, p3y = endPos.y, p3z = endPos.z;

    const drag = this.drag;
    const massGravity = this.mass * 9.81;
    const inheritDecay = Math.abs(1 - delta);
    const doWind = !!this.node.flags.affectedByWind;
    const doBounce = !!this.node.flags.canBounce;
    const doInherit = !!this.node.flags.canInherit && this._hasLastWorldPos;

    let windAx = 0, windAy = 0, windAz = 0;
    if(doWind){
      const windStrength = resolveDanglyWindPower(this.context) * 0.01;
      if(windStrength > 1e-6){
        windAx = ODYSSEY_AREA_WIND_DIRECTION.x * windStrength * delta;
        windAy = ODYSSEY_AREA_WIND_DIRECTION.y * windStrength * delta;
        windAz = ODYSSEY_AREA_WIND_DIRECTION.z * windStrength * delta;
      }
    }

    // t = age / field (lifeExp); combineTime is not the Bezier parameter
    const transit = this.lifeExp > 0 ? this.lifeExp : (this.combineTime > 0 ? this.combineTime : 1);

    let birthCount = 0;
    const spawnableParticleCount = this.offsets.count;
    const pW = OdysseyEmitter3D._v3B;
    const velW = OdysseyEmitter3D._v3C;

    for(let i = 0; i < spawnableParticleCount; i++){
      let age = this.props.getX(i) || 0;
      let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : -1);
      let alive = this.props.getZ(i) == 1;

      if(alive){
        if(maxAge >= 0.0 && age >= maxAge){
          this.props.setZ(i, 0);
          this.particleCount -= 1;
          age = 0;
        }else{
          pW.set(this.offsets.getX(i), this.offsets.getY(i), this.offsets.getZ(i));

          // INHERIT rebase (bit 6) — same as fountain MoveFunc start
          if(doInherit){
            const prevPos = this._lastWorldPos;
            const deltaQ = OdysseyEmitter3D._quatC
              .copy(this._lastWorldQuat).invert()
              .premultiply(this._frameWorldQuat);
            if(this._hasLastWorldQuat && Math.abs(1 - Math.abs(deltaQ.w)) > 1e-6){
              pW.sub(prevPos).applyQuaternion(deltaQ).add(this._frameWorldPos);
              velW.set(this.velocities.getX(i), this.velocities.getY(i), this.velocities.getZ(i))
                .applyQuaternion(deltaQ);
              this.velocities.setX(i, velW.x);
              this.velocities.setY(i, velW.y);
              this.velocities.setZ(i, velW.z);
              updateVelocity = true;
            }else{
              pW.add(this._worldPosDelta);
            }
          }

          velW.set(
            this.velocities.getX(i),
            this.velocities.getY(i),
            this.velocities.getZ(i)
          );

          // Free predict
          let fx = pW.x + velW.x * delta;
          let fy = pW.y + velW.y * delta;
          let fz = pW.z + velW.z * delta;
          fx += windAx;
          fy += windAy;
          fz += windAz;

          age += delta;
          let t = age / transit;
          if(t > 1) t = 1;
          if(t < 0) t = 0;
          const omt = 1 - t;
          const bz0 = omt * omt * omt;
          const bz1 = 3 * omt * omt * t;
          const bz2 = 3 * omt * t * t;
          const bz3 = t * t * t;
          const bx = p0x * bz0 + p1x * bz1 + p2x * bz2 + p3x * bz3;
          const by = p0y * bz0 + p1y * bz1 + p2y * bz2 + p3y * bz3;
          const bz = p0z * bz0 + p1z * bz1 + p2z * bz2 + p3z * bz3;

          // : pow(t³, drag); drag==0 → pow(..,0)==1 → full Bezier
          const t3 = t * t * t;
          const w = drag > 0 ? Math.pow(Math.max(t3, 1e-30), drag) : 1;
          const iw = 1 - w;
          pW.x = bx * w + fx * iw;
          pW.y = by * w + fy * iw;
          pW.z = bz * w + fz * iw;

          velW.z -= massGravity * delta;
          // Residual speed scale |1−dt| (Particle)
          velW.x *= inheritDecay;
          velW.y *= inheritDecay;
          velW.z *= inheritDecay;

          this.velocities.setX(i, velW.x);
          this.velocities.setY(i, velW.y);
          this.velocities.setZ(i, velW.z);

          const prevX = this.offsets.getX(i);
          const prevY = this.offsets.getY(i);
          const prevZ = this.offsets.getZ(i);

          this.offsets.setX(i, pW.x);
          this.offsets.setY(i, pW.y);
          this.offsets.setZ(i, pW.z);

          if(doBounce){
            this.applyBounceHitCheck(i, prevX, prevY, prevZ, delta);
          }

          updatePositions = true;
          updateVelocity = true;
        }
      }else if(this.tryP2PSpawn(i, delta, fountainBirthQuota, birthCount)){
        updatePositions = true;
        updateVelocity = true;
        birthCount++;
        age = 0;
      }else{
        age = 0;
      }
      this.props.setX(i, age || 0);
      updateProperties = true;
    }

    if(updatePositions) this.offsets.needsUpdate = true;
    if(updateVelocity) this.velocities.needsUpdate = true;
    if(updateProperties) this.props.needsUpdate = true;

    this.isDetonated = false;
    this.sortParticles();
  }

  /**
   * Linked mode: ribbon — two world-space vertices per sample (left, right) in strip order
   * L0,R0,L1,R1,… so triangle-strip indices connect consecutive segments.
   * @deprecated Non-lightning Linked uses spawnLinkedSample + rebuildLinkedTrailMesh.
   */
  setLinkedVertexPosition(logicalIndex = 0, position = new THREE.Vector3){
    // Kept for any external callers; trail path no longer uses baked L/R slots.
    void logicalIndex;
    void position;
  }

  /** Grow/shrink the world sample-center ring used by non-lightning Linked trails. */
  private ensureLinkedSampleCapacity(samples: number){
    const n = Math.max(0, Math.min(OdysseyEmitter3D.LINKED_MAX_SAMPLES, Math.floor(samples) || 0));
    if(n === this._linkedCapacity && this._linkedCenters.length >= n * 3) return;
    const prevCenters = this._linkedCenters;
    const prevAges = this._linkedAges;
    const prevMaxAges = this._linkedMaxAges;
    const prevCap = this._linkedCapacity;
    this._linkedCenters = new Float32Array(n * 3);
    this._linkedAges = new Float32Array(n);
    this._linkedMaxAges = new Float32Array(n);

    const copy = Math.min(prevCap, n);
    if(copy > 0){
      const wasFull = this.linkedTotalSpawns >= prevCap;
      if(wasFull){
        // Compact oldest→newest into [0..copy) so new empty slots are not drawn as 0,0,0.
        for(let k = 0; k < copy; k++){
          const slot = (this.particleIndex + k) % prevCap;
          const s3 = slot * 3;
          const d3 = k * 3;
          this._linkedCenters[d3] = prevCenters[s3];
          this._linkedCenters[d3 + 1] = prevCenters[s3 + 1];
          this._linkedCenters[d3 + 2] = prevCenters[s3 + 2];
          this._linkedAges[k] = prevAges[slot];
          this._linkedMaxAges[k] = prevMaxAges[slot];
        }
        this.particleIndex = copy % n;
        this.linkedTotalSpawns = copy;
      }else{
        const live = Math.min(this.linkedTotalSpawns, copy);
        this._linkedCenters.set(prevCenters.subarray(0, live * 3));
        this._linkedAges.set(prevAges.subarray(0, live));
        this._linkedMaxAges.set(prevMaxAges.subarray(0, live));
        if(this.particleIndex > n) this.particleIndex = live % Math.max(1, n);
        this.linkedTotalSpawns = live;
      }
    }else{
      this.particleIndex = 0;
      this.linkedTotalSpawns = 0;
    }

    this._linkedCapacity = n;
    if(n > 0 && this._linkedDrawCenters.length < n * 3){
      this._linkedDrawCenters = new Float32Array(n * 3);
    }
  }

  /**
   * Birth one Linked trail sample at world `center` (particle list push).
   * Ring overwrite recycles the oldest slot once capacity is full.
   */
  private spawnLinkedSample(center: THREE.Vector3, delta: number = 0){
    const cap = this._linkedCapacity;
    if(cap < 1) return;
    const idx = this.particleIndex % cap;
    const i3 = idx * 3;
    this._linkedCenters[i3] = center.x;
    this._linkedCenters[i3 + 1] = center.y;
    this._linkedCenters[i3 + 2] = center.z;
    this._linkedAges[idx] = 0;
    this._linkedMaxAges[idx] = this.lifeExp >= 0 ? this.lifeExp : 100;
    this.particleIndex = (this.particleIndex + 1) % cap;
    this.linkedTotalSpawns++;
    this.particleCount++;
    this._lastRibbonCenter.copy(center);
    this._hasRibbonCenter = true;
    if(OdysseyEmitter3D.EMITTER_TICK_DEBUG){
      this.emitterLog('spawn', {
        ringSlot: idx,
        delta,
        center: { x: center.x, y: center.y, z: center.z },
        maxAge: this._linkedMaxAges[idx],
        linkedTotalSpawns: this.linkedTotalSpawns,
      });
    }
  }

  /** Empty draw — no live Linked trail samples. */
  private clearLinkedTrailMesh(){
    if(!this.geometry) return;
    this.geometry.setIndex([]);
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.geometry.setAttribute('offset', new THREE.Float32BufferAttribute([], 4));
    this.geometry.setAttribute('props', new THREE.Float32BufferAttribute([], 4));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([], 2));
    this.velocities = this.geometry.getAttribute('offset') as THREE.BufferAttribute;
    this.props = this.geometry.getAttribute('props') as THREE.BufferAttribute;
    this.offsets = this.geometry.getAttribute('position') as THREE.BufferAttribute;
  }

  /**
   * RenderLinked for non-lightning: rebuild camera ribbon from live
   * world sample centers only (no spare buffer slots at world origin).
   * Size taper uses particle age / lifeExp (Particle path).
   */
  private rebuildLinkedTrailMesh(){
    const cap = this._linkedCapacity;
    const live = Math.min(this.linkedTotalSpawns, cap);
    if(live < 2){
      this.clearLinkedTrailMesh();
      return;
    }

    const full = this.linkedTotalSpawns >= cap;
    if(this._linkedDrawCenters.length < live * 3){
      this._linkedDrawCenters = new Float32Array(live * 3);
    }
    const drawCenters = this._linkedDrawCenters;

    if(OdysseyEmitter3D._linkedAgeScratch.length < live){
      OdysseyEmitter3D._linkedAgeScratch = new Float32Array(Math.max(live, 64));
    }
    const ageArr = OdysseyEmitter3D._linkedAgeScratch;
    if(OdysseyEmitter3D._linkedMaxAgeScratch.length < live){
      OdysseyEmitter3D._linkedMaxAgeScratch = new Float32Array(Math.max(live, 64));
    }
    const maxAgeArr = OdysseyEmitter3D._linkedMaxAgeScratch;

    for(let k = 0; k < live; k++){
      const slot = full ? (this.particleIndex + k) % cap : k;
      const s3 = slot * 3;
      const d3 = k * 3;
      drawCenters[d3] = this._linkedCenters[s3];
      drawCenters[d3 + 1] = this._linkedCenters[s3 + 1];
      drawCenters[d3 + 2] = this._linkedCenters[s3 + 2];
      ageArr[k] = this._linkedAges[slot] || 0;
      maxAgeArr[k] = this._linkedMaxAges[slot] || (this.lifeExp >= 0 ? this.lifeExp : 100);
    }

    // Default bolt tangent from first→last when a segment degenerates
    let boltX = drawCenters[(live - 1) * 3] - drawCenters[0];
    let boltY = drawCenters[(live - 1) * 3 + 1] - drawCenters[1];
    let boltZ = drawCenters[(live - 1) * 3 + 2] - drawCenters[2];
    const boltLen = Math.sqrt(boltX * boltX + boltY * boltY + boltZ * boltZ);
    if(boltLen > 1e-6){
      boltX /= boltLen;
      boltY /= boltLen;
      boltZ /= boltLen;
    }else if(this._hasLastWorldPos && this._worldPosDelta.lengthSq() > 1e-10){
      boltX = this._worldPosDelta.x;
      boltY = this._worldPosDelta.y;
      boltZ = this._worldPosDelta.z;
      const dLen = Math.sqrt(boltX * boltX + boltY * boltY + boltZ * boltZ);
      if(dLen > 1e-6){
        boltX /= dLen;
        boltY /= dLen;
        boltZ /= dLen;
      }else{
        boltX = 0;
        boltY = 0;
        boltZ = -1;
      }
    }else{
      boltX = 0;
      boltY = 0;
      boltZ = -1;
    }

    // basisU ⊥ bolt (same as lightning tick)
    let basisUX = -boltY;
    let basisUY = boltX;
    let basisUZ = 0;
    let buLen = Math.sqrt(basisUX * basisUX + basisUY * basisUY + basisUZ * basisUZ);
    if(buLen < 1e-8){
      // cross(bolt, X)
      basisUX = 0;
      basisUY = boltZ;
      basisUZ = -boltY;
      buLen = Math.sqrt(basisUX * basisUX + basisUY * basisUY + basisUZ * basisUZ);
    }
    if(buLen > 1e-8){
      basisUX /= buLen;
      basisUY /= buLen;
      basisUZ /= buLen;
    }else{
      basisUX = 1;
      basisUY = 0;
      basisUZ = 0;
    }

    const cam = (this.context?.currentCamera || GameState.currentCamera) as
      | THREE.Camera
      | undefined;

    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const velocities: number[] = [];
    const props: number[] = [];

    this.appendLinkedTrailRibbon(
      drawCenters,
      live,
      ageArr,
      maxAgeArr,
      boltX, boltY, boltZ,
      basisUX, basisUY, basisUZ,
      cam,
      vertices,
      normals,
      uvs,
      velocities,
      props,
      indices
    );

    this.geometry.setIndex(indices);
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.geometry.setAttribute('offset', new THREE.Float32BufferAttribute(velocities, 4));
    this.geometry.setAttribute('props', new THREE.Float32BufferAttribute(props, 4));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.velocities = this.geometry.getAttribute('offset') as THREE.BufferAttribute;
    this.props = this.geometry.getAttribute('props') as THREE.BufferAttribute;
    this.offsets = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.geometry.clearGroups();
    if(this.material) this.material.visible = true;

    // Loose bounds from sample span (frustumCulled is false; keeps helpers honest)
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for(let i = 0; i < live; i++){
      const x = drawCenters[i * 3], y = drawCenters[i * 3 + 1], z = drawCenters[i * 3 + 2];
      if(x < minX) minX = x; if(y < minY) minY = y; if(z < minZ) minZ = z;
      if(x > maxX) maxX = x; if(y > maxY) maxY = y; if(z > maxZ) maxZ = z;
    }
    const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
    const rx = maxX - minX, ry = maxY - minY, rz = maxZ - minZ;
    const radius = 0.5 * Math.sqrt(rx * rx + ry * ry + rz * rz) + Math.max(this.sizes[0], this.sizes[1], this.sizes[2], 0.04);
    if(!this.geometry.boundingSphere){
      this.geometry.boundingSphere = new THREE.Sphere();
    }
    this.geometry.boundingSphere.center.set(cx, cy, cz);
    this.geometry.boundingSphere.radius = radius;
  }

  /**
   * Camera-facing L/R strip for Linked trails (RenderLinked non-lightning).
   * Size/color lifecycle uses age/maxAge (Particle), not i/count.
   */
  private appendLinkedTrailRibbon(
    centers: Float32Array,
    sampleCount: number,
    ages: Float32Array,
    maxAges: Float32Array,
    boltX: number,
    boltY: number,
    boltZ: number,
    basisUX: number,
    basisUY: number,
    basisUZ: number,
    cam: THREE.Camera | undefined,
    vertices: number[],
    normals: number[],
    uvs: number[],
    velocities: number[],
    props: number[],
    indices: number[]
  ){
    const lifeInv = this.lifeExp > 0 ? 1 / this.lifeExp : 0.01;
    for(let i = 0; i < sampleCount; i++){
      const maxAge = maxAges[i] > 0 ? maxAges[i] : (this.lifeExp >= 0 ? this.lifeExp : 100);
      const age = ages[i] || 0;
      // : age * (1/lifeExp); fall back to index fraction if lifeExp unset
      const t = maxAge > 0 && this.lifeExp > 0
        ? Math.min(1, Math.max(0, age * lifeInv))
        : i / Math.max(1, sampleCount);
      const { sizeX, sizeY } = this.lerpLightningSizeAt(t);
      const halfW = sizeX * 0.5;
      const alongPad = sizeY * 0.25;

      const cx = centers[i * 3];
      const cy = centers[i * 3 + 1];
      const cz = centers[i * 3 + 2];

      let tx = boltX;
      let ty = boltY;
      let tz = boltZ;
      if(i < sampleCount - 1){
        tx = centers[(i + 1) * 3] - cx;
        ty = centers[(i + 1) * 3 + 1] - cy;
        tz = centers[(i + 1) * 3 + 2] - cz;
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if(tLen > 1e-6){
          tx /= tLen;
          ty /= tLen;
          tz /= tLen;
        }else{
          tx = boltX;
          ty = boltY;
          tz = boltZ;
        }
      }

      let toCamX = 0;
      let toCamY = 0;
      let toCamZ = 1;
      if(cam){
        const cp = cam.position;
        toCamX = cp.x - cx;
        toCamY = cp.y - cy;
        toCamZ = cp.z - cz;
        const cLen = Math.sqrt(toCamX * toCamX + toCamY * toCamY + toCamZ * toCamZ);
        if(cLen > 1e-6){
          toCamX /= cLen;
          toCamY /= cLen;
          toCamZ /= cLen;
        }
      }
      let sx = ty * toCamZ - tz * toCamY;
      let sy = tz * toCamX - tx * toCamZ;
      let sz = tx * toCamY - ty * toCamX;
      let sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if(sLen < 1e-6){
        sx = basisUX;
        sy = basisUY;
        sz = basisUZ;
        sLen = 1;
      }
      sx = (sx / sLen) * halfW;
      sy = (sy / sLen) * halfW;
      sz = (sz / sLen) * halfW;

      const ax = tx * alongPad;
      const ay = ty * alongPad;
      const az = tz * alongPad;

      vertices.push(cx - sx - ax, cy - sy - ay, cz - sz - az);
      vertices.push(cx + sx - ax, cy + sy - ay, cz + sz - az);
      normals.push(0, 0, 1, 0, 0, 1);
      const vUv = 1 - (i / Math.max(1, sampleCount));
      uvs.push(0, vUv, 1, vUv);
      velocities.push(0, 0, 0, 0, 0, 0, 0, 0);
      // props: age, maxAge, alive — shader lifetime alpha/color
      props.push(age, maxAge, 1, 0, age, maxAge, 1, 0);
    }

    for(let i = 0; i < sampleCount - 1; i++){
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  private ensureLinkedUvCapacity(){
    // No-op: Linked trail UVs are written in rebuildLinkedTrailMesh.
  }

  spawnParticle(i = 0, delta: number = 0){
    let newPosition = this.getRandomPosition();
    if(this.node.renderMode != 'Linked'){
      this.offsets.setX(i, newPosition.x);
      this.offsets.setY(i, newPosition.y);
      this.offsets.setZ(i, newPosition.z);
      if(this.prevOffsets){
        // : motion-blur prev position initialized to birth position; inherit alone never updates it.
        this.prevOffsets.setX(i, newPosition.x);
        this.prevOffsets.setY(i, newPosition.y);
        this.prevOffsets.setZ(i, newPosition.z);
        this.prevOffsets.needsUpdate = true;
      }
    }else{
      this.spawnLinkedSample(newPosition, delta);
      return;
    }

    // Particle initialize (Fountain + Explosion + Single):
    // world quat → optional randomDirection(spread) → (velocity+randvel)×zdir.
    const quat = OdysseyEmitter3D._quat;
    this.getWorldQuaternion(quat);
    if(this.spread !== 0){
      this.randomDirectionRetail(quat, newPosition);
    }
    this.birthVelocityFromQuat(quat, this.vec3);
    this.velocities.setX(i, this.vec3.x);
    this.velocities.setY(i, this.vec3.y);
    this.velocities.setZ(i, this.vec3.z);

    // inheritVelocity: fill scale×accel (MoveFunc), do not bake into birth vel.
    this.setBirthInheritVelocity(i, newPosition, delta);

    this.velocities.setW(i, this.mass);
    this.props.setY(i, this.getRandomMaxAge());
    this.props.setZ(i, 1);
    this.props.setW(i, 0); // reset splat flag

    if(this.node.flags.isRandom){
      // FountainEmitter Update RANDOM bit5: birth frame ∈ [frameStart, frameEnd]
      const start = Math.trunc(this.material.uniforms.frameRange.value.x);
      const end = Math.trunc(this.material.uniforms.frameRange.value.y);
      let range = end - start + 1;
      if(range < 0) range = -range;
      const birthFrame = range > 0
        ? start + Math.floor(Math.random() * range)
        : start;
      this.ids.setX(i, birthFrame);
    }else{
      this.ids.setX(i, i);
    }
    this.logSpawnParticleAttributes(i, delta);
    this.particleCount++;
  }

  private getBounceHitBudget(count: number): number {
    if(count <= OdysseyEmitter3D.BOUNCE_HIT_CHECK_MAX_PER_FRAME) return count;
    return Math.min(
      count,
      OdysseyEmitter3D.BOUNCE_HIT_CHECK_MAX_PER_FRAME,
      Math.max(
        OdysseyEmitter3D.BOUNCE_HIT_CHECK_MIN_PER_FRAME,
        Math.ceil(count * OdysseyEmitter3D.BOUNCE_HIT_CHECK_FRACTION)
      )
    );
  }

  private shouldRunBounceHitCheck(index: number, count: number, budget: number, start: number): boolean {
    if(budget >= count) return true;
    const end = start + budget;
    return end <= count
      ? index >= start && index < end
      : index >= start || index < (end % count);
  }

  /**
   * moveParticleStandard HitCheck (== 1):
   * HitCheck(prev, curr, &curr) snaps position; then either zero vel
   * (bounceCo==0) or reflect × 0.75 with Z *= clamp(0.033/dt, 0.5, 1) * bounceCo.
   * If |v|² < 0.5 → stop (props.w), nudge +0.02 along normal (+ size if splat).
   */
  private applyBounceHitCheck(
    i: number,
    prevX: number,
    prevY: number,
    prevZ: number,
    delta: number
  ): void {
    const currX = this.offsets.getX(i);
    const currY = this.offsets.getY(i);
    const currZ = this.offsets.getZ(i);

    const dx = currX - prevX;
    const dy = currY - prevY;
    const dz = currZ - prevZ;
    const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if(segLen < 1e-6) return;

    const area = this.context?.module?.area;
    if(!area?.rooms?.length) return;

    const raycaster = GameState.raycaster;
    const prevFar = raycaster.far;
    const origin = OdysseyEmitter3D._v3A.set(prevX, prevY, prevZ);
    const dir = OdysseyEmitter3D._v3B.set(dx, dy, dz).multiplyScalar(1 / segLen);
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(dir);
    raycaster.far = segLen;

    let bestDist = Infinity;
    const hitPoint = OdysseyEmitter3D._v3C;
    const hitNormal = OdysseyEmitter3D._v3D.set(0, 0, 1);
    let found = false;

    const segmentBox = OdysseyEmitter3D._boxA.makeEmpty();
    segmentBox.expandByPoint(origin);
    segmentBox.expandByPoint(OdysseyEmitter3D._v3C.set(currX, currY, currZ));
    segmentBox.expandByScalar(0.05);

    try {
      for(let r = 0; r < area.rooms.length; r++){
        const wok = area.rooms[r]?.collisionManager?.walkmesh;
        if(!wok?.faces?.length) continue;
        const faces = wok.getFacesInBox(segmentBox, OdysseyEmitter3D._bounceFaceScratch);
        if(!faces.length) continue;
        const hits = wok.raycast(raycaster, faces);
        if(!hits?.length) continue;
        for(let k = 0; k < hits.length; k++){
          const hit = hits[k];
          if(hit.distance < 0 || hit.distance > segLen || hit.distance >= bestDist) continue;
          bestDist = hit.distance;
          hitPoint.copy(origin).addScaledVector(dir, hit.distance);
          const wokFace = (hit as any).face;
          if(wokFace?.normal){
            hitNormal.copy(wokFace.normal).normalize();
          }else if(hit.face?.normal){
            hitNormal.copy(hit.face.normal).normalize();
          }else{
            hitNormal.set(0, 0, 1);
          }
          found = true;
        }
      }
    } finally {
      raycaster.far = prevFar;
    }

    if(!found) return;

    // HitCheck writes intersection into particle position
    this.offsets.setX(i, hitPoint.x);
    this.offsets.setY(i, hitPoint.y);
    this.offsets.setZ(i, hitPoint.z);

    let vx = this.velocities.getX(i);
    let vy = this.velocities.getY(i);
    let vz = this.velocities.getZ(i);
    let speedSq = 0;

    if(this.bounceCo === 0){
      vx = 0;
      vy = 0;
      vz = 0;
      speedSq = 0;
    }else{
      // v' = v - 2(v·n)n
      const ndot = vx * hitNormal.x + vy * hitNormal.y + vz * hitNormal.z;
      vx -= 2 * ndot * hitNormal.x;
      vy -= 2 * ndot * hitNormal.y;
      vz -= 2 * ndot * hitNormal.z;
      // × 0.75 on all axes
      vx *= 0.75;
      vy *= 0.75;
      vz *= 0.75;
      // Z only: clamp(0.033/dt, 0.5, 1) * bounceCo
      let dtScale = 0.033 / Math.max(delta, 1e-6);
      if(dtScale > 1) dtScale = 1;
      else if(dtScale < 0.5) dtScale = 0.5;
      vz *= dtScale * this.bounceCo;
      speedSq = vx * vx + vy * vy + vz * vz;
    }

    if(speedSq < 0.5){
      this.props.setW(i, 1);
      // : store hit normal on the particle; RotationArc(up→n) for splat orientation.
      // Vel is unused after stop — keep normal in velocity.xyz for splat draw.
      vx = hitNormal.x;
      vy = hitNormal.y;
      vz = hitNormal.z;
      let nudge = 0.02;
      if(this.node.flags.canSplat){
        nudge += this.sizes[0] || 0;
      }
      this.offsets.setX(i, hitPoint.x + hitNormal.x * nudge);
      this.offsets.setY(i, hitPoint.y + hitNormal.y * nudge);
      this.offsets.setZ(i, hitPoint.z + hitNormal.z * nudge);
    }

    this.velocities.setX(i, vx);
    this.velocities.setY(i, vy);
    this.velocities.setZ(i, vz);
  }

  //https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes_points2.html#L173
  sortParticles(){

    // if(!(this.mesh instanceof THREE.Points))
    // return;

    if(this.node.renderMode == 'Linked')
      return;

    // Additive blending is order-independent; skip sorting
    if(this.material.blending === THREE.AdditiveBlending)
      return;

    if(!this.context || !this.context.currentCamera){
      return;
    }

    const vector = OdysseyEmitter3D._v3A;
    const matrix = OdysseyEmitter3D._mat4;
    matrix.multiplyMatrices( this.context.currentCamera.projectionMatrix, this.context.currentCamera.matrixWorldInverse );
    matrix.multiply( this.mesh.matrixWorld );

    let index = this.geometry.getIndex();
    let positions = (this.geometry.getAttribute( 'position' ) as THREE.BufferAttribute).array;
    let length = positions.length / 3;
    if ( index === null ) {
      let array = new Uint16Array( length );
      for ( let i = 0; i < length; i ++ ) {
        array[ i ] = i;
      }
      index = new THREE.BufferAttribute( array, 1 );
      this.geometry.setIndex( index );
    }

    let sortArray: [number, number][] = [];
    for ( let i = 0; i < length; i ++ ) {
      vector.fromArray( positions as Float32Array, i * 3 );
      vector.applyMatrix4( matrix );
      sortArray.push( [ vector.z, i ] );
    }

    sortArray.sort( (a, b) => b[ 0 ] - a[ 0 ] );
    let indices = index.array;
    for ( let i = 0; i < length; i ++ ) {
      (indices as any)[ i ] = sortArray[ i ][ 1 ];
    }
    
    this.geometry.index.needsUpdate = true;
    
  }

  /** Clears trail distance state (spawntype 1) so the next effect does not get one huge first segment. */
  private resetTrailSpawnState(){
    this._hasLastTrailPos = false;
    this._trailAccum = 0;
  }

  /** Clears linked ribbon tangent continuity (world-space L/R) after detonate/disable. */
  private resetRibbonTangentState(){
    this._hasRibbonCenter = false;
  }

  detonate(){
    this.isDetonated = true;
    this.resetTrailSpawnState();
    this._birthAccum = 0;
    if(this.node.renderMode == 'Linked'){
      this.particleIndex = 0;
      this.linkedTotalSpawns = 0;
      this.resetRibbonTangentState();
      if(this.updateType !== 'Lightning'){
        this._linkedAges.fill(0);
        this.clearLinkedTrailMesh();
      }
    }
    let spawnableParticleCount = this.offsets?.count || 0;
    for(let i = 0; i < spawnableParticleCount; i++){
      this.props.setX(i, 0);
    }
    if(this.props) this.props.needsUpdate = true;
    this.material.uniforms.time.value = 0;
    this.material.uniformsNeedUpdate = true;

    // Generate wind gust for nearby grass and dangly cloth
    if(this.node.blastRadius > 0 && this.node.blastLength > 0){
      const pos = new THREE.Vector3();
      this.getWorldPosition(pos);
      GameState.windManager?.addPointSourceWind(
        pos,
        this.node.blastRadius,
        this.node.blastLength,
        1.0
      );
    }
  }

  getBirthTimer(){
    return this.birthRate > 0 ? 1/this.birthRate : 1;
  }

  /**
   * FountainEmitter MoveFunc → moveParticleStandard (after inherit).
   * pos += vel×dt + inherit×dt → wind → vel.z -= mass×9.81×dt → |inherit×(1−dt)| → HitCheck.
   */
  private integrateStandardParticles(delta: number, count: number): boolean {
    if(delta <= 0 || count <= 0) return false;

    const doWind = !!this.node.flags.affectedByWind;
    let windAx = 0;
    let windAy = 0;
    let windAz = 0;
    if(doWind){
      const windStrength = resolveDanglyWindPower(this.context) * 0.01;
      if(windStrength > 1e-6){
        OdysseyEmitter3D._v3A
          .copy(ODYSSEY_AREA_WIND_DIRECTION)
          .multiplyScalar(windStrength * delta);
        windAx = OdysseyEmitter3D._v3A.x;
        windAy = OdysseyEmitter3D._v3A.y;
        windAz = OdysseyEmitter3D._v3A.z;
      }
    }
    const wm = doWind ? GameState.windManager : undefined;
    const doBounce = !!this.node.flags.canBounce;
    const bounceBudget = doBounce ? this.getBounceHitBudget(count) : 0;
    const bounceStart = doBounce && count > 0 ? this._bounceHitCursor % count : 0;
    const doInheritVel = !!this.node.flags.canInheritVelocity;
    if(doInheritVel){
      this.ensureInheritVelCapacity(count);
    }

    // : vel.z -= dt * PartEmitter.mass * 9.81 — not the grav controller.
    const massGravity = this.mass * 9.81;
    const inheritDecay = Math.abs(1 - delta);
    let changed = false;

    for(let i = 0; i < count; i++){
      if(this.props.getZ(i) !== 1) continue;
      // : Particle != 0 → skip MoveFunc body (normal kept in velocity for draw)
      if(this.props.getW(i) === 1){
        continue;
      }

      let vx = this.velocities.getX(i);
      let vy = this.velocities.getY(i);
      let vz = this.velocities.getZ(i);

      const prevX = this.offsets.getX(i);
      const prevY = this.offsets.getY(i);
      const prevZ = this.offsets.getZ(i);

      let px = prevX + vx * delta;
      let py = prevY + vy * delta;
      let pz = prevZ + vz * delta;

      let ix = 0, iy = 0, iz = 0;
      if(doInheritVel){
        const ib = i * 3;
        ix = this.inheritVels[ib];
        iy = this.inheritVels[ib + 1];
        iz = this.inheritVels[ib + 2];
        px += ix * delta;
        py += iy * delta;
        pz += iz * delta;
      }

      if(doWind){
        if(wm && wm.pointSourceWinds.length > 0){
          const gust = wm.getGlobalPointWind(OdysseyEmitter3D._v3B.set(px, py, pz));
          if(gust.lengthSq() > 1e-12){
            px += gust.x * delta;
            py += gust.y * delta;
            pz += gust.z * delta;
          }
        }
        px += windAx;
        py += windAy;
        pz += windAz;
      }

      this.offsets.setX(i, px);
      this.offsets.setY(i, py);
      this.offsets.setZ(i, pz);

      vz -= massGravity * delta;

      this.velocities.setX(i, vx);
      this.velocities.setY(i, vy);
      this.velocities.setZ(i, vz);

      // : scale = |scale × (1 − dt)| after mass
      if(doInheritVel){
        const ib = i * 3;
        this.inheritVels[ib] = ix * inheritDecay;
        this.inheritVels[ib + 1] = iy * inheritDecay;
        this.inheritVels[ib + 2] = iz * inheritDecay;
      }

      if(doBounce && this.shouldRunBounceHitCheck(i, count, bounceBudget, bounceStart)){
        this.applyBounceHitCheck(i, prevX, prevY, prevZ, delta);
      }

      changed = true;
    }

    if(doBounce && count > 0 && bounceBudget > 0){
      this._bounceHitCursor = (bounceStart + bounceBudget) % count;
    }

    return changed;
  }

  /**
   * PartEmitter weather wrap (after particle integrate).
   * Toroidally folds live particle X/Y into a 10×10 box centered on the module camera
   * so rain/snow stays with the PC when weather Gobs are teleported each frame.
   */
  private wrapWeatherParticles(count: number): boolean {
    if(!this.isWeather || count <= 0 || !this.offsets) return false;

    const camera = GameState.currentCamera || GameState.camera;
    if(!camera) return false;

    camera.getWorldPosition(OdysseyEmitter3D._v3A);
    const camX = OdysseyEmitter3D._v3A.x;
    const camY = OdysseyEmitter3D._v3A.y;
    const half = OdysseyEmitter3D.WEATHER_WRAP_HALF;
    const period = half * 2;

    let changed = false;
    for(let i = 0; i < count; i++){
      if(this.props.getZ(i) !== 1) continue;

      let dx = this.offsets.getX(i) - camX + half;
      let dy = this.offsets.getY(i) - camY + half;

      // C-style fmod wrap into ~[-half, +half] (moveParticle weather block)
      if(dx < 0){
        dx = (dx % period) + half;
      }else{
        dx = (dx % period) - half;
      }
      if(dy < 0){
        dy = (dy % period) + half;
      }else{
        dy = (dy % period) - half;
      }

      this.offsets.setX(i, camX + dx);
      this.offsets.setY(i, camY + dy);
      // Z unchanged
      changed = true;
    }

    if(changed){
      this.offsets.needsUpdate = true;
    }
    return changed;
  }

  /**
   * FountainEmitter Update spawntype 0.
   * Accumulate dt; when accum ≥ 1/rate, spawn floor(rate×accum) % (floor(rate)+1)
   * (at least 1), with optional RandomBirthRate ±jitter, then reset accum.
   */
  private consumeFountainBirthQuota(delta: number): number {
    if(this.birthRate <= 0){
      this._birthAccum = 0;
      return 0;
    }

    this._birthAccum += delta;
    const period = 1 / this.birthRate;
    if(this._birthAccum < period){
      return 0;
    }

    let rate = this.birthRate;
    const rbr = Math.floor(Math.abs(this.birthRateRandom) + 1e-6);
    if(rbr > 0){
      const jitter = Math.floor(Math.random() * rbr);
      rate = Math.random() < 0.5 ? rate - jitter : rate + jitter;
      if(rate < 0) rate = 0;
    }

    if(rate <= 0){
      this._birthAccum = 0;
      return 0;
    }

    const modBase = Math.floor(rate) + 1;
    let count = Math.floor(rate * this._birthAccum) % modBase;
    if(count < 1) count = 1;
    this._birthAccum = 0;
    return count;
  }

  disable(){
    this.birthRate = 0;
    this._birthAccum = 0;
    this.resetTrailSpawnState();
    if(this.node.renderMode === 'Linked'){
      this.resetRibbonTangentState();
      if(this.updateType !== 'Lightning'){
        this.particleIndex = 0;
        this.linkedTotalSpawns = 0;
        this.clearLinkedTrailMesh();
      }
    }
    if(this.material){
      this.material.visible = false;
    }
  }

  dispose(){
    this.geometry?.dispose();
    this.material?.dispose();
    if(this.mesh){
      this.remove(this.mesh);
    }
    if(this._chunkMesh){
      this._chunkMesh.dispose();
      this.remove(this._chunkMesh);
    }
    if(this._chunkGeometry){
      this._chunkGeometry.dispose();
    }
    if(this._chunkMaterial){
      this._chunkMaterial.dispose();
    }
  }

  attributeChanged(attr: string){
    switch(attr){
      case 'mass':
        // SPE billboard approx of moveParticleStandard: vel.z -= mass*9.81*dt (world Z-up).
        // Fountain CPU_PHYSICS applies this on the CPU; grav/drag are P2P-only there.
        this.vec3.set(0, 0, -this.mass * 9.81);
        this.material.uniforms.mass.value.copy(this.vec3);
        this.material.uniformsNeedUpdate = true;
      break;
    }
  }

  /**
   * Load chunk MDL for ChunkyParticle presentation (NewCAurObject(chunkName)).
   * ChunkyParticle initialize plays "impact" on the gob; we keep a shared
   * InstancedMesh (no per-particle Gob anim) and sync transforms in updateChunkInstances.
   */
  private async loadChunkModel(): Promise<void> {
    try {
      const { MDLLoader } = await import("@/loaders/MDLLoader");
      const { OdysseyModel3D } = await import("@/three/odyssey/OdysseyModel3D");

      const mdl = await MDLLoader.loader.load(this.node.chunkResRef);
      if(!mdl) return;

      const model = await OdysseyModel3D.FromMDL(mdl, { context: this.context });
      if(!model) return;

      // Prefer first mesh; try to leave model at impact/default pose
      try{
        if(typeof (model as any).playAnimation === 'function'){
          (model as any).playAnimation('impact', false) ||
            (model as any).playAnimation('default', true);
          (model as any).animationManager?.update?.(0);
        }
      }catch(_e){ /* ignore */ }

      let foundGeom: THREE.BufferGeometry = null;
      let foundMat: THREE.Material = null;
      model.traverse((child: THREE.Object3D) => {
        if(foundGeom) return;
        if(child instanceof THREE.Mesh && child.geometry){
          foundGeom = child.geometry.clone();
          foundMat = (child.material as THREE.Material).clone();
        }
      });

      try{ model.dispose(); }catch(_e){ /* ignore */ }

      if(!foundGeom) return;

      this._chunkGeometry = foundGeom;
      this._chunkMaterial = foundMat || new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
      });
      // Allow per-instance tint from particle color lifecycle
      if('vertexColors' in this._chunkMaterial){
        (this._chunkMaterial as THREE.MeshBasicMaterial).vertexColors = true;
      }

      const capacity = Math.max(this.maxParticleCount, 1);
      this._chunkMesh = new THREE.InstancedMesh(
        this._chunkGeometry,
        this._chunkMaterial,
        capacity
      );
      this._chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this._chunkMesh.renderOrder = this.node.renderOrder || 0;
      this._chunkMesh.frustumCulled = false;
      this._chunkMesh.count = capacity;

      const colors = new Float32Array(capacity * 3);
      colors.fill(1);
      this._chunkColors = new THREE.InstancedBufferAttribute(colors, 3);
      this._chunkMesh.instanceColor = this._chunkColors;

      this._chunkLoaded = true;

      if(this.mesh){
        this.mesh.visible = false;
      }
      this.add(this._chunkMesh);

    } catch(e) {
      console.warn('OdysseyEmitter3D: Failed to load chunk model:', this.node.chunkResRef, e);
    }
  }

  /**
   * Sync InstancedMesh to particle state (ChunkyParticle gob pose approx).
   * Offsets are world-space (CPU_PHYSICS); convert to emitter-local for the child mesh.
   * Orientation: splat → align +Z to surface normal (velocity); else particleRot×age about Z.
   * Scale: size start/mid/end over life × parent gob scale.
   */
  private updateChunkInstances(): void {
    if(!this._chunkMesh) return;

    const mat = this._chunkMatrix;
    const quat = this._chunkQuat;
    const scl = this._chunkScale;
    const col = this._chunkColor;
    const count = Math.min(this.offsets.count, this._chunkMesh.count);
    const parentScale = this.getParentGobScale();
    const fade = this.getParentGobAlpha() * this.getEmitterFadeAlpha();
    const local = OdysseyEmitter3D._v3A;
    const up = OdysseyEmitter3D._v3B.set(0, 0, 1);

    for(let i = 0; i < count; i++){
      const alive = this.props.getZ(i) === 1;
      if(!alive){
        mat.makeScale(0, 0, 0);
        this._chunkMesh.setMatrixAt(i, mat);
        if(this._chunkColors){
          this._chunkColors.setXYZ(i, 0, 0, 0);
        }
        continue;
      }

      const age = this.props.getX(i);
      const maxAge = this.props.getY(i) || 1;
      const positionInTime = maxAge > 0 ? Math.min(1, Math.max(0, age / maxAge)) : 0;

      // Size lifecycle (same mid-split as RenderStandard)
      const t = positionInTime * 2;
      let scaleVal: number;
      if(t <= 1){
        scaleVal = this.sizes[0] + (this.sizes[1] - this.sizes[0]) * t;
      }else{
        scaleVal = this.sizes[1] + (this.sizes[2] - this.sizes[1]) * (t - 1);
      }
      if(scaleVal <= 0) scaleVal = 0.001;
      scaleVal *= parentScale;

      // Color lifecycle
      if(t <= 1){
        col.copy(this.colorStart).lerp(this.colorMid, t);
      }else{
        col.copy(this.colorMid).lerp(this.colorEnd, t - 1);
      }
      // Alpha baked into color intensity × fade (no per-instance opacity on InstancedMesh)
      const a = fade;
      if(this._chunkColors){
        this._chunkColors.setXYZ(i, col.r * a, col.g * a, col.b * a);
      }

      // World offset → emitter local
      local.set(this.offsets.getX(i), this.offsets.getY(i), this.offsets.getZ(i));
      this.worldToLocal(local);

      if(this.props.getW(i) === 1){
        // Splat stop: velocity.xyz holds surface normal (applyBounceHitCheck)
        OdysseyEmitter3D._v3C.set(
          this.velocities.getX(i),
          this.velocities.getY(i),
          this.velocities.getZ(i)
        );
        if(OdysseyEmitter3D._v3C.lengthSq() > 1e-8){
          OdysseyEmitter3D._v3C.normalize();
          quat.setFromUnitVectors(up, OdysseyEmitter3D._v3C);
        }else{
          quat.identity();
        }
      }else{
        // particleRot × age about local Z (Particle)
        quat.setFromAxisAngle(up, (this.angle || 0) * age);
      }

      scl.set(scaleVal, scaleVal, scaleVal);
      mat.compose(local, quat, scl);
      this._chunkMesh.setMatrixAt(i, mat);
    }

    this._chunkMesh.count = count;
    this._chunkMesh.instanceMatrix.needsUpdate = true;
    if(this._chunkColors){
      this._chunkColors.needsUpdate = true;
    }
  }

  /** Parent OdysseyModel3D.scale (Explosion birth passes gob.scale into initialize). */
  private getParentGobScale(): number {
    let obj: THREE.Object3D | null = this.parent;
    while(obj){
      if((obj as any).type === 'OdysseyModel'){
        const s = (obj as any).scale;
        if(s && typeof s.x === 'number'){
          return (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3 || 1;
        }
        return 1;
      }
      obj = obj.parent;
    }
    return 1;
  }

}
