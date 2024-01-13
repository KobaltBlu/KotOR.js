import * as THREE from "three";
import { OdysseyModelControllerType } from "../../enums/odyssey/OdysseyModelControllerType";
import { TextureLoader } from "../../loaders/TextureLoader";
import { OdysseyModelNode, OdysseyModelNodeEmitter } from "../../odyssey";
import type { OdysseyController } from "../../odyssey/controllers";
import { OdysseyObject3D } from "./OdysseyObject3D";

/**
 * OdysseyEmitter3D class.
 * 
 * THREE.js representation of OdysseyEmitter
 * The OdysseyEmitter3D class will handle emitter nodes.
 * It only handles Billboard_to_World_Z and Billboard_to_Local_Z emitters
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyEmitter3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyEmitter3D extends OdysseyObject3D {
  
  static BirthTime: number = 1;
  static PlaneGeometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  updateType: string;
  _birthTimer: any;
  maxParticleCount: number;

  //Geometry BufferAttributes
  offsets: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  velocities: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  props: THREE.BufferAttribute|THREE.InstancedBufferAttribute;
  ids: THREE.BufferAttribute|THREE.InstancedBufferAttribute;

  particleCount: number;
  referenceNode: OdysseyObject3D = new OdysseyObject3D();
  _lightningDelay: any;
  lightningZigZag: number;
  lightningScale: number;
  lightningDelay: any;
  d: any;
  vx: any;
  vy: any;
  vz: any;
  d2: any;
  context: any;
  lifeExp: number = 0;

  birthRate: number = 0;
  birthRateRandom: number = 0;

  velocity: number = 0;
  randVelocity: number = 0;
  drag: number = 0;
  mass: number = 0;
  lightningRadius: number = 0;
  spread: number = 0;
  size: THREE.Vector3 = new THREE.Vector3();
  isDetonated: boolean;
  particleIndex: number;
  vec3: THREE.Vector3;
  sizeXY: THREE.Vector2;
  node: OdysseyModelNodeEmitter;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  
  colorStart: THREE.Color = new THREE.Color(1, 1, 1);
  colorMid: THREE.Color = new THREE.Color(1, 1, 1);
  colorEnd: THREE.Color = new THREE.Color(1, 1, 1);

  threshold: any;
  gravity: any;
  sizes: any;
  opacity: any;
  angle: any;
  _detonate: any;
  fps: any;
  lightningSubDiv: any;
  speed_min: number;
  speed_max: number;
  xangle: number;
  zangle: number;
  mesh: THREE.Points|THREE.Mesh;
  attributes: any = {};
  targetSize: number = 0;
  controlPTCount: number = 0;
  controlPTDelay: number = 0;
  tangentSpread: number = 0;
  tangentLength: number = 0;
  controlPTRadius: number = 0;
  speed: number;

  constructor(odysseyNode: OdysseyModelNode){
    super();
    this.type = 'OdysseyEmitter';

    this.isDetonated = false;
    this.particleIndex = 0;
  
    this.vec3 = new THREE.Vector3(0.0, 0.0, 0.0);
    this.sizeXY = new THREE.Vector2(0.0, 0.0);
    this.node = odysseyNode as OdysseyModelNodeEmitter;
  
    this.material = undefined;
    this.mesh = undefined;
  
    switch(this.node.renderMode){
      case 'Normal':
      case 'Motion_Blur':
      case 'Linked':
        this.geometry = new THREE.BufferGeometry();
      break;
      default:
        this.geometry = new THREE.InstancedBufferGeometry();
        this.geometry.index = OdysseyEmitter3D.PlaneGeometry.index;
        this.geometry.attributes.position = OdysseyEmitter3D.PlaneGeometry.attributes.position;
        this.geometry.attributes.uv = OdysseyEmitter3D.PlaneGeometry.attributes.uv;
      break;
    }
  
    // this.geometry.ignoreRaycast = true;
  
    //Particles
    this.particleCount = 0;
    this.maxParticleCount = 0;
    // this.positions = [];
    // this.ages = [];
  
    //Properties
    this.size = new THREE.Vector3();
    this.sizes = [0, 0, 0];
    this.spread = 0;
    this.opacity = [];
    this.lifeExp = -1;
    this._detonate = 0;
    this.birthRate = 0;

    

    this.addEventListener( 'added', ( event ) => {
      this.material.uniforms.matrix.value.copy(this.parent.matrix);
      this.material.uniforms.matrix.value.setPosition(0, 0, 0);

      /*if(this.node.Update != 'Explosion' && this.node.Render != 'Linked'){
        for(let i = 0; i < this.birthRate; i++){
          this.spawnParticle(i);
        }
      }*/

      this.material.uniformsNeedUpdate = true;
      this.attributeChanged('mass');
    } );
  
    if(odysseyNode instanceof OdysseyModelNode){
  
      this.updateType = this.node.updateMode;
  
      this.material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge( [
          THREE.ShaderLib['odyssey-emitter'].uniforms, {
            textureAnimation: { value: new THREE.Vector4(this.node.gridX || 1, this.node.gridY || 1, (this.node.gridX || 1) * (this.node.gridY || 1), 1) },
          }
        ]),
        vertexShader: THREE.ShaderLib['odyssey-emitter'].vertexShader,
        fragmentShader: THREE.ShaderLib['odyssey-emitter'].fragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        fog: false,
        visible: true
      });
  
      if(this.node.twoSidedTex || this.node.renderMode == 'Linked'){
        this.material.side = THREE.DoubleSide;
      }
  
      //this.material.defines.USE_FOG = '';
  
      TextureLoader.enQueueParticle(this.node.textureResRef, this);
  
      this.node.controllers.forEach( (controller: OdysseyController ) => {
        if(controller.data.length){
          switch(controller.type){
            case OdysseyModelControllerType.Position:
              //positionOffset.copy(controller.data[0]);
            break;
            case OdysseyModelControllerType.Orientation:
              //controllerOptions.orientation = new THREE.Quaternion(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
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
              //if(this.node.Render == 'Aligned_to_Particle_Dir'){
                this.size.x = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
              //}else{
              //  this.size.y = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
              //}
            break;
            case OdysseyModelControllerType.YSize:
              //if(this.node.Render == 'Aligned_to_Particle_Dir'){
                this.size.y = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
              //}else{
              //  this.size.x = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
              //}
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
              this.sizes[1] = (controller.data[0].value);
            break;
            case OdysseyModelControllerType.SizeEnd:
              this.sizes[2] = (controller.data[0].value);
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
              this.angle = controller.data[0].value;
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
          }
        }
      });
  
      this.maxParticleCount = this.birthRate * (this.lifeExp >= 0 ? this.lifeExp : 1);
      this.material.uniforms.tDepth.value = this.context?.depthTarget?.depthTexture;
      this.material.uniforms.maxAge.value = (this.lifeExp >= 0 ? this.lifeExp : -1);
      this.material.uniforms.colorStart.value.copy(this.colorStart);
      this.material.uniforms.colorMid.value.copy(this.colorMid);
      this.material.uniforms.colorEnd.value.copy(this.colorEnd);
      this.material.uniforms.opacity.value.fromArray(this.opacity);
      this.material.uniforms.scale.value.fromArray(this.sizes);
      this.material.uniforms.rotate.value = this.angle;
      this.material.uniforms.drag.value = this.drag;
      this.material.uniforms.velocity.value = this.velocity;
      this.material.uniforms.randVelocity.value = this.randVelocity;
  
      if(this.node.renderMode == 'Linked'){
        this.birthRate = 0;
      }
  
      if(this.node.updateMode == 'Lightning'){
        this.material.defines.LIGHTNING = '';
      }
  
      if(this.fps){
        this.material.defines.FPS = '';
        this.material.uniforms.fps.value = this.fps;
      }
  
      this.material.defines[this.node.renderMode] = '';
  
      this._birthTimer = 1/this.birthRate;
  
      switch(this.node.blendMode){
        case 'Normal':
          this.material.blending = THREE.NormalBlending;
        break;
        case 'Lighten':
        case 'Punch-Through':
          this.material.blending = THREE.AdditiveBlending;
          this.material.depthWrite = false;
          this.material.needsUpdate = true;
        break;
      }
  
      const offsets: number[] = [];
      const props: number[] = [];
      const velocities: number[] = [];
      const ids: number[] = [];

      this.maxParticleCount = this.getMaxParticleCount();
  
      //Start Velocity Calculations
      this.speed_min = this.velocity;
      this.speed_max = this.randVelocity;
  
      this.xangle = this.spread;
      this.zangle = this.spread;
      this.vx = Math.sin(this.xangle);
      this.vy = Math.sin(this.zangle);
      this.vz = Math.cos(this.xangle) + Math.cos(this.zangle);
  
      this.d = this.speed_min / (Math.abs(this.vx) + Math.abs(this.vy) + Math.abs(this.vz));
      this.d2 = this.speed_max / (Math.abs(this.vx) + Math.abs(this.vy) + Math.abs(this.vz));
      //End Velocity Calculations
  
      switch(this.node.renderMode){
        case 'Normal':
        case 'Motion_Blur':
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
          //this.geometry.setAttribute( 'ids', this.ids );
          
          this.mesh = new THREE.Mesh( this.geometry, this.material );
          //Need to fix!!! THREE JS update broke this
          //this.mesh.setDrawMode(THREE.TriangleStripDrawMode);
        break;
        default:
          this.offsets = new THREE.InstancedBufferAttribute( new Float32Array( offsets ), 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.InstancedBufferAttribute( new Float32Array( velocities ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.InstancedBufferAttribute( new Float32Array( props ), 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( new Float32Array( ids ), 1 ).setUsage( THREE.DynamicDrawUsage );
          this.geometry.setAttribute( 'offset', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
      
          this.mesh = new THREE.Mesh( this.geometry, this.material );
        break;
      }
  
      this.mesh.renderOrder = 9999;
  
      this.mesh.frustumCulled = true;
      this.material.uniformsNeedUpdate = true;
      this.add(this.mesh);
  
    }
  }

  getMaxParticleCount(){
    if(this.node.renderMode == 'Linked'){ //Max attribute array size
      if(this.updateType == 'Lightning'){
        return 10 * 2;
      }else{
        return ((Math.ceil(this.lifeExp) * Math.ceil(this.birthRate)) * 2) * 3;
      }
    }else{
      return (Math.ceil( (this.lifeExp >= 0 ? this.lifeExp : 1) ) * Math.ceil(this.birthRate));
    }
  }

  getRandomPosition(){
    let spread = new THREE.Vector3(0, 0, 0).copy(this.size);//.applyQuaternion(this.parent.quaternion);
    let quaternion = new THREE.Quaternion(0, 0, 0, 1);
    /*if(this.parent)
      this.parent.getWorldQuaternion(parentQuaternion);*/
    
    if(this.node.renderMode == 'Normal' || this.node.renderMode == 'Motion_Blur'){
      let pos = new THREE.Vector3().copy(this.parent.position);
      this.getWorldQuaternion(quaternion);
      this.getWorldPosition(pos);
      return new THREE.Vector3(
        ( Math.random() * spread.x - ( spread.x * 0.5 ) ),
        ( Math.random() * spread.y - ( spread.y * 0.5 ) ),
        ( Math.random() * spread.z - ( spread.z * 0.5 ) )
      ).applyQuaternion(this.parent.quaternion).add(pos);
    }else if(this.node.renderMode == 'Linked'){

      this.getWorldQuaternion(quaternion);
      let pos = new THREE.Vector3();//.copy(this.parent.position);
      this.getWorldPosition(pos);
      return pos;//.applyQuaternion(quaternion);

    }
    return new THREE.Vector3(
      this.position.x + ( Math.random() * spread.x - ( spread.x * 0.5 ) ),
      this.position.y + ( Math.random() * spread.y - ( spread.y * 0.5 ) ),
      this.position.z + ( Math.random() * spread.z - ( spread.z * 0.5 ) )
    ).applyQuaternion(this.quaternion);
  }

  randomFloat(min: number, max: number){
    return min + ( Math.random() * max - ( max * 0.5 ) );
  }

  getRandomMaxAge(){
    return this.lifeExp;//Math.floor(Math.random() * this.lifeExp) + (this.lifeExp * 0);
  }

  //Update the emitter
  tick(delta: number = 0){

    if(!delta){
      delta = 1/30;
    }

    //this.material.uniforms.mass.value.z -= 0.5 * delta;
    //this.material.uniformsNeedUpdate = true;

    if ( this.parent === null ) {
			this.matrixWorld.copy( this.matrix );
		} else {
			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );
		}

    let updatePositions = false;
    let updateVelocity = false;
    let updateProperties = false;

    this.material.uniforms.time.value += delta;
    this._birthTimer -= delta;
    if(this._birthTimer < 0)
      this._birthTimer = 0;

    let maxParticleCount = this.getMaxParticleCount();
    let resizeArrays = (maxParticleCount > this.offsets.count);
    this.maxParticleCount = maxParticleCount;

    if(resizeArrays){
      //Create new larger arrays
      let offsets = new Float32Array(this.maxParticleCount * 3);
      let velocities = new Float32Array(this.maxParticleCount * 4);
      let props = new Float32Array(this.maxParticleCount * 4);
      let ids = new Float32Array(this.maxParticleCount * 1);

      //Copy the existing values into the new arrays
      offsets.set(this.offsets.array);
      if(this.node.renderMode != 'Linked')
        velocities.set(this.velocities.array);
      props.set(this.props.array);

      //Create new InstancedBufferAttribute / BufferAttribute objects with the new arrays
      switch(this.node.renderMode){
        case 'Normal':
        case 'Motion_Blur':
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
          this.ids = new THREE.InstancedBufferAttribute( ids, 1 ).setUsage( THREE.DynamicDrawUsage );
          
          this.geometry.setAttribute( 'position', this.offsets );
          this.geometry.setAttribute( 'offset', this.velocities ); //Offsets use the velocity array in linked mode
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
        break;
        default:
          this.offsets = new THREE.InstancedBufferAttribute( offsets, 3 ).setUsage( THREE.DynamicDrawUsage );
          this.velocities = new THREE.InstancedBufferAttribute( velocities, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.props = new THREE.InstancedBufferAttribute( props, 4 ).setUsage( THREE.DynamicDrawUsage );
          this.ids = new THREE.InstancedBufferAttribute( ids, 1 ).setUsage( THREE.DynamicDrawUsage );

          this.geometry.setAttribute( 'offset', this.offsets );
          this.geometry.setAttribute( 'velocity', this.velocities );
          this.geometry.setAttribute( 'props', this.props );
          this.geometry.setAttribute( 'ids', this.ids );
        break;
      }

      updatePositions = true;
      if(this.node.renderMode != 'Linked')
        updateVelocity = true;

      updateProperties = true;
    }

    if(this.updateType == 'Lightning'){
      this.tickLightning(delta);
      return;
    }

    let birthCount = 0;
    let spawnableParticleCount = this.offsets.count;
    let quaternion;

    let attrPerVertex = 1;
    if(this.node.renderMode == 'Linked'){
      attrPerVertex = 3;
      spawnableParticleCount = (this.offsets.count/attrPerVertex) || 0;
      if(!this.birthRate){
        this.particleIndex = 0;
      }

    }

    let birthed = false;

    let firstLink = undefined;
    let lastLink = undefined;
    let finalLink = undefined;

    for(let i = 0; i < spawnableParticleCount; i++){

      if(this.node.renderMode == 'Linked'){

        let age = this.props.getX(i * attrPerVertex) || 0;
        let maxAge = this.props.getY(i * attrPerVertex) || this.lifeExp;
        let alive = this.props.getZ(i * attrPerVertex) == 1;

        if(i < spawnableParticleCount){

          if(alive){
            lastLink = i;
            if(!firstLink){
              firstLink = i;
            }

            if(age >= maxAge){
              if(!finalLink){
                finalLink = i;
              }

              age = 0;
              //mark particle as alive
              this.props.setZ(i*attrPerVertex, 1);
            }else{
              age += delta;
            }
          }else if(i == this.particleIndex){

            //If the birthtimer has expired and we can still spawn more particles this frame
            if( this.birthRate && !this._birthTimer && !birthed ){
              //Birth and reset the particle
              this.spawnParticle(i);
              this.particleIndex++;
              updatePositions = true;
              updateVelocity = true;
              birthed = true;
            }

            //Make sure the age is set to zero
            age = 0;
          }
          this.props.setX(i*attrPerVertex, age || 0);
          updateProperties = true;

        }else{

          if(alive){
            if(age >= maxAge){
              age = 0;
              this.particleCount -= 1;
              //mark particle as dead
              this.props.setZ(i*attrPerVertex, 0);
            }else{
              this.velocities.setW(i, this.velocities.getW(i) + delta * 10);
              updateVelocity = true;
              age += delta;
            }
          }else{
            age = 0;
          }
          this.props.setX(i*attrPerVertex, age || 0);
          updateProperties = true;

        }

        //Clone the props for the current vertex group
        for(let pI = 1; pI < attrPerVertex; pI++){
          this.props.setX((i*attrPerVertex) + pI, this.props.getX(i*attrPerVertex));
          this.props.setY((i*attrPerVertex) + pI, this.props.getY(i*attrPerVertex));
          this.props.setZ((i*attrPerVertex) + pI, this.props.getZ(i*attrPerVertex));
          this.props.setW((i*attrPerVertex) + pI, this.props.getW(i*attrPerVertex));
        }
        updateProperties = true;

      }else{

        let age = this.props.getX(i) || 0;
        let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : -1);
        let alive = this.props.getZ(i) == 1;

        if(i < this.maxParticleCount){

          if(this.node.updateMode == 'Single'){
            age += delta;
            this.props.setX(i, age || 0);
            this.props.setY(i, 1.0);
            this.props.setZ(i, 1);
            updateProperties = true;
          }else{
            if(alive){
              if(age >= maxAge){
                age = 0;
                this.particleCount -= 1;
                //mark particle as dead
                this.props.setZ(i, 0);
              }else{
                age += delta;
                if(age > maxAge) age = maxAge;
              }
            }else{

              let canSpawn = !this._birthTimer;
              let maxSpawn = 1;//this.birthRate * (1/this.birthRate);

              if(this.node.updateMode == 'Explosion'){
                canSpawn = this.isDetonated;
                maxSpawn = this.birthRate;
              }

              //If the birthtimer has expired and we can still spawn more particles this frame
              if(canSpawn && birthCount < maxSpawn){
                //Birth and reset the particle
                this.spawnParticle(i);
                updatePositions = true;
                if(this.node.renderMode != 'Linked')
                  updateVelocity = true;
                birthCount++;
              }

              //Make sure the age is set to zero
              age = 0;
            }
          }

          this.props.setX(i, age || 0);
          updateProperties = true;

        }else{
          if(this.node.updateMode != 'Single'){
            if(alive){
              if(age >= maxAge){
                age = 0;
                this.particleCount -= 1;
                //mark particle as dead
                this.props.setZ(i, 0);
              }else{
                age += delta;
              }
            }else{
              age = 0;
            }
            this.props.setX(i, age || 0);
            updateProperties = true;
          }
        }

      }

    }

    

    if(this.node.renderMode == 'Linked'){
      for(let i = 0; i < this.maxParticleCount; i++){
        if(i >= this.particleIndex){
          this.offsets.setX(i, this.offsets.getX(this.particleIndex-1 || 0));
          this.offsets.setY(i, this.offsets.getY(this.particleIndex-1 || 0));
          this.offsets.setZ(i, this.offsets.getZ(this.particleIndex-1 || 0));
        }
      }
    }

    if(this.node.renderMode == "Aligned_to_Particle_Dir"){
      this.material.uniforms.matrix.value.copy(this.parent.matrix);
      this.material.uniforms.matrix.value.setPosition(0, 0, 0);
      this.material.uniformsNeedUpdate = true;
    }

    if(updatePositions)
      this.offsets.needsUpdate = true;

    if(updateVelocity)
      this.velocities.needsUpdate = true;

    if(updateProperties)
      this.props.needsUpdate = true;

    if(!this._birthTimer)
      this._birthTimer = 1/this.birthRate;

    if(this._birthTimer == Infinity)
      this._birthTimer = 1;

    if(this.geometry.boundingSphere)
      this.geometry.boundingSphere.radius = ( (this.size.length() || 1) + Math.abs(this.velocity) + Math.abs(this.randVelocity) + Math.abs(this.drag) + Math.abs(this.mass)  ) * (Math.max.apply(null, this.sizes) * 2);

    this.isDetonated = false;

    this.sortParticles();

  }

  setReferenceNode( referenceNode: OdysseyObject3D ){
    if(referenceNode instanceof OdysseyObject3D){
      this.referenceNode = referenceNode;
    }
  };

  tickLightning(delta: number = 0){
    if(this._lightningDelay == undefined){
      this._lightningDelay = 0.00;
    }

    let lightningZigZag = this.lightningZigZag + 1;
    let start = new THREE.Vector3(0.0, 0.0, 0.0);
    this.getWorldPosition(start);
    let target = new THREE.Vector3(0, 0, 0);
    this.referenceNode.getWorldPosition(target);

    let scale = 0.5;

    let gridX1 = 2;
    let indices = [];
    let vertices = [];
    let normals = [];
    let uvs = [];
    let velocities = [];
    let props = [];
    let spread = (this.lightningScale || 0);
    let age = 0;

    if(this._lightningDelay >= this.lightningDelay){
      //Reset the parent quaternion if it is rotated
      if(this.parent.quaternion.x || this.parent.quaternion.y || this.parent.quaternion.z || this.parent.quaternion.w != 1)
        this.parent.quaternion.set(0, 0, 0, 1);

      this._lightningDelay = 0;
      for(let iy = 0; iy < lightningZigZag; iy++){
        let percentage = iy/lightningZigZag;
        let x = start.x + ( (target.x - start.x) * percentage);
        let y = start.y - ( (target.y - start.y) * percentage);
        let z = start.z + ( (target.z - start.z) * percentage);

        if(iy){
          x = this.randomFloat(x, spread);
          y = this.randomFloat(y, spread);
          z = this.randomFloat(z, spread);
        }else if(iy+1 == lightningZigZag){
          x = this.randomFloat(x, this.lightningRadius);
          y = this.randomFloat(y, this.lightningRadius);
          z = this.randomFloat(z, this.lightningRadius);
        }

        /* 
          //FORCE STORM like up and then spread
          let t = (iy / lightningZigZag);
          t = t*t*t;

          if(iy == 0 || iy == 1){
            if(iy == 1){
              z += 0.5;
            }
          }else {
            z += 1 * (1 - t);
          }
        */

        for ( let ix = 0; ix < 2; ix ++ ) {

          //let x = (ix * xStep) * scale - half_scale;
          let xO = scale/2;
          if(ix == 1){
            xO = -scale/2;
          }

          vertices.push( x + xO, - y, z );
          normals.push( 0, 0, 1 );
          uvs.push( ix / 1 );
          uvs.push( 1 - ( iy / lightningZigZag-1 ) );

          velocities.push(0, 0, 0, 0);

          if(!this.geometry.attributes.props){
            age = 0;
          }else{
            age = ((this.geometry.attributes.props as THREE.BufferAttribute).getX( 0 ) || 0) + delta;
          }

          if(age >= 1)
            age = 0;

          props.push(age + delta, 1, 1, 0);

        }

        // indices
        for(let iy = 0; iy < lightningZigZag-1; iy++){
          for ( let ix = 0; ix < 1; ix++ ) {
            let a = ix + gridX1 * iy;
            let b = ix + gridX1 * ( iy + 1 );
            let c = ( ix + 1 ) + gridX1 * ( iy + 1 );
            let d = ( ix + 1 ) + gridX1 * iy;

            // faces
            indices.push( a, b, d );
            indices.push( b, c, d );
          }
        }

        // build geometry
        this.geometry.setIndex(indices);
        this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        this.geometry.setAttribute( 'offset', new THREE.Float32BufferAttribute( velocities, 4 ) );
        this.geometry.setAttribute( 'props', new THREE.Float32BufferAttribute( props, 4 ) );
        this.geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
        this.geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

        //Update the boundingSphere so that the effect isn't culled whiled on camera
        if(this.geometry.boundingSphere)
          this.geometry.boundingSphere.radius = start.distanceTo(target);

        this.velocities.needsUpdate = true;
        this.props.needsUpdate = true;
      }
    }else{
      this._lightningDelay += delta;
      for(let iy = 0; iy < lightningZigZag; iy++){
        for ( let ix = 0; ix < 2; ix++ ) {
          if(!this.geometry.attributes.props){
            age = 0;
          }else{
            age = ((this.geometry.attributes.props as THREE.BufferAttribute).getX( 0 ) || 0) + delta;
          }

          if(age >= 1)
            age = 0;

          props.push(age + delta, 1, 1, 0);
        }
      }
      this.geometry.setAttribute( 'props', new THREE.Float32BufferAttribute( props, 4 ) );
    }
  }

  setLinkedVertexPosition(i = 0, position = new THREE.Vector3){
    //Vertex Positions
    this.offsets.setX(i, position.x || 0);
    this.offsets.setY(i, position.y || 0);
    this.offsets.setZ(i, position.z || 0);
    //Vertex Offsets
    this.velocities.setX(i, 1);
    this.velocities.setY(i, 1);
    this.velocities.setZ(i, 1);

    let index = this.geometry.getIndex();
    let indices = [];
    for ( let oldI = 0; oldI < this.offsets.count; oldI++ ) {
      indices.push( oldI );
    }
    this.geometry.setIndex( indices );
    index = this.geometry.getIndex();

    let newIndices = [];
    let numberOfTriangles = this.offsets.count - 2;
    // gl.TRIANGLE_STRIP
    for ( let newI = 0; newI < numberOfTriangles; newI++ ) {
      if ( newI % 2 === 0 ) {
        newIndices.push( index.getX( newI ) );
        newIndices.push( index.getX( newI + 1 ) );
        newIndices.push( index.getX( newI + 2 ) );
      } else {
        newIndices.push( index.getX( newI + 2 ) );
        newIndices.push( index.getX( newI + 1 ) );
        newIndices.push( index.getX( newI ) );
      }
    }
    //console.log(newIndices);
    this.geometry.setIndex(newIndices);
    this.geometry.clearGroups();
  }

  spawnParticle(i = 0){
    //Birth and reset the particle
    let newPosition = this.getRandomPosition();
    if(this.node.renderMode != 'Linked'){
      this.offsets.setX(i, newPosition.x);
      this.offsets.setY(i, newPosition.y);
      this.offsets.setZ(i, newPosition.z);
    }else{

      if(this.node.name == 'omenemitter05'){
        //console.log(this.node.name, i);
      }

      //These will be scaled inside the shader
      const linked_verts = [
        [-1, 1, 0],
        [1, 1, 0],
        [-1, -1, 0],
        [1, -1, 0]
      ];

      //BEGIN TEST FIX
      this.setLinkedVertexPosition(i, newPosition);
      //END TEST FIX
      //this.setLinkedVertexPositionOLD(i, newPosition);

    }

    if(this.velocity){
      if(this.node.updateMode == 'Explosion' && this.node.renderMode != 'Linked'){
        this.velocities.setX(i, this.randomFloat(this.d * this.vx, this.spread));
        this.velocities.setY(i, this.randomFloat(this.d * this.vy, this.spread));
        this.velocities.setZ(i, this.randomFloat(this.d * this.vz, this.spread));
      }else{
        let quaternion = new THREE.Quaternion();
        this.getWorldQuaternion(quaternion);
        this.vec3.set(
          this.randomFloat(this.d * this.vx, this.d2 * this.vx),
          this.randomFloat(this.d * this.vy, this.d2 * this.vy), 
          this.randomFloat(this.d * this.vz, this.d2 * this.vz)
        ).applyQuaternion(quaternion);

        if(this.node.renderMode != 'Linked'){
          this.velocities.setX(i, this.vec3.x);
          this.velocities.setY(i, this.vec3.y);
          this.velocities.setZ(i, this.vec3.z);
        }
      }
    }else{
      if(this.node.renderMode != 'Linked'){
        this.velocities.setX(i, 0);
        this.velocities.setY(i, 0);
        this.velocities.setZ(i, 0);
      }
    }

    let maxAge = this.getRandomMaxAge();
    if(this.node.renderMode != 'Linked'){
      this.velocities.setW(i, this.mass);

      //set the particles maxAge
      this.props.setY(i, this.getRandomMaxAge());
      //mark particle as alive
      this.props.setZ(i, 1);
    }else{
      for(let vi = 0; vi < 3; vi++){
        //set the particles maxAge
        this.props.setY((i * 3) + vi, (this.lifeExp >= 0 ? this.lifeExp : 100));
        //mark particle as alive
        this.props.setZ((i * 3) + vi, 1);
      }
    }

    this.ids.setX(i, i);

    this.particleCount++;

  }

  //https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes_points2.html#L173
  sortParticles(){

    if(!(this.mesh instanceof THREE.Points))
      return;

    if(this.node.renderMode == 'Linked')
      return;

    if(!this.context){
      // if(!Game){
      //   return;
      // }else{
      //   this.context = Game;
      // }
    }

    let vector = new THREE.Vector3();

    // Model View Projection matrix

    let matrix = new THREE.Matrix4();
    matrix.multiplyMatrices( this.context.currentCamera.projectionMatrix, this.context.currentCamera.matrixWorldInverse );
    matrix.multiply( this.mesh.matrixWorld );

    //

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

    let sortArray = [];
    for ( let i = 0; i < length; i ++ ) {
      vector.fromArray( positions, i * 3 );
      vector.applyMatrix4( matrix );
      sortArray.push( [ vector.z, i ] );
    }

    function numericalSort( a: any, b: any ) {
      return b[ 0 ] - a[ 0 ];
    }

    sortArray.sort( numericalSort );
    let indices = index.array;
    for ( let i = 0; i < length; i ++ ) {
      // @ts-expect-error
      indices[ i ] = sortArray[ i ][ 1 ];
    }
    
    this.geometry.index.needsUpdate = true;
    
  }

  detonate(){
    this.isDetonated = true;
    //this.material.uniforms.mass.value.z = 0;
    let spawnableParticleCount = this.offsets.count;
    for(let i = 0; i < spawnableParticleCount; i++){
      this.props.setX(i, 0);
    }
    this.props.needsUpdate = true;
    this.material.uniforms.time.value = 0;
    this.material.uniformsNeedUpdate = true;
  }

  getBirthTimer(){
    return 1/this.birthRate;
  }

  //Disable the emitter
  disable(){

  };

  attributeChanged(attr: any){
    let quat = new THREE.Quaternion();
    switch(attr){
      case 'mass':
        this.parent.getWorldQuaternion(quat);
        this.vec3.set(0, 0, this.mass).applyQuaternion(this.quaternion);
        this.material.uniforms.mass.value.copy(this.vec3);
        this.material.uniformsNeedUpdate = true;
      break;
    }

  }

  setLinkedVertexPositionOLD(i = 0, newPosition = new THREE.Vector3){
    /*for(let vi = 0; vi < 3; vi++){

      const offset = [
        [newPosition.x, newPosition.y, newPosition.z],
        [newPosition.x, newPosition.y, newPosition.z],
        [newPosition.x, newPosition.y, newPosition.z],
        //[newPosition.x, newPosition.y, newPosition.z]
      ];

      //These will be scaled inside the shader
      const vertex_offset = [
        [-1, 1, 0],
        [1, 1, 0],
        [-1, -1, 0],
        [1, -1, 0]
      ];

      if(i > 0){
        
        //Previous positions
        offset[0][0] = this.offsets.getX(((i-1) * 3) + 0);
        offset[0][1] = this.offsets.getY(((i-1) * 3) + 0);
        offset[0][2] = this.offsets.getZ(((i-1) * 3) + 0);
        
        offset[1][0] = this.offsets.getX(((i-1) * 3) + 1);
        offset[1][1] = this.offsets.getY(((i-1) * 3) + 1);
        offset[1][2] = this.offsets.getZ(((i-1) * 3) + 1);
        
        offset[2][0] = this.offsets.getX(((i-1) * 3) + 2);
        offset[2][1] = this.offsets.getY(((i-1) * 3) + 2);
        offset[2][2] = this.offsets.getZ(((i-1) * 3) + 2);
        
        //Previous Vertex Positions
        vertex_offset[0][0] = this.velocities.getX(((i-1) * 3) + 0);
        vertex_offset[0][1] = this.velocities.getY(((i-1) * 3) + 0);
        vertex_offset[0][2] = this.velocities.getZ(((i-1) * 3) + 0);
        
        vertex_offset[1][0] = this.velocities.getX(((i-1) * 3) + 1);
        vertex_offset[1][1] = this.velocities.getY(((i-1) * 3) + 1);
        vertex_offset[1][2] = this.velocities.getZ(((i-1) * 3) + 1);
        
        vertex_offset[2][0] = this.velocities.getX(((i-1) * 3) + 2);
        vertex_offset[2][1] = this.velocities.getY(((i-1) * 3) + 2);
        vertex_offset[2][2] = this.velocities.getZ(((i-1) * 3) + 2);

        if(i % 2){ //ODD
          switch(vi){
            case 0:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, offset[2][0]);
              this.offsets.setY((i * 3) + vi, offset[2][1]);
              this.offsets.setZ((i * 3) + vi, offset[2][2]);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, vertex_offset[2][0]);
              this.velocities.setY((i * 3) + vi, vertex_offset[2][1]);
              this.velocities.setZ((i * 3) + vi, vertex_offset[2][2]);
            break;
            case 1:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, offset[1][0]);
              this.offsets.setY((i * 3) + vi, offset[1][1]);
              this.offsets.setZ((i * 3) + vi, offset[1][2]);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, vertex_offset[1][0]);
              this.velocities.setY((i * 3) + vi, vertex_offset[1][1]);
              this.velocities.setZ((i * 3) + vi, vertex_offset[1][2]);
            break;
            default:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, newPosition.x);
              this.offsets.setY((i * 3) + vi, newPosition.y);
              this.offsets.setZ((i * 3) + vi, newPosition.z);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, linked_verts[0][0]);
              this.velocities.setY((i * 3) + vi, linked_verts[0][1]);
              this.velocities.setZ((i * 3) + vi, linked_verts[0][2]);
            break;
          }
        }else{ //EVEN
          switch(vi){
            case 0:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, offset[0][0]);
              this.offsets.setY((i * 3) + vi, offset[0][1]);
              this.offsets.setZ((i * 3) + vi, offset[0][2]);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, vertex_offset[0][0]);
              this.velocities.setY((i * 3) + vi, vertex_offset[0][1]);
              this.velocities.setZ((i * 3) + vi, vertex_offset[0][2]);
            break;
            case 1:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, offset[2][0]);
              this.offsets.setY((i * 3) + vi, offset[2][1]);
              this.offsets.setZ((i * 3) + vi, offset[2][2]);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, vertex_offset[2][0]);
              this.velocities.setY((i * 3) + vi, vertex_offset[2][1]);
              this.velocities.setZ((i * 3) + vi, vertex_offset[2][2]);
            break;
            default:
              //Vertex Positions
              this.offsets.setX((i * 3) + vi, newPosition.x);
              this.offsets.setY((i * 3) + vi, newPosition.y);
              this.offsets.setZ((i * 3) + vi, newPosition.z);
              //Vertex Offsets
              this.velocities.setX((i * 3) + vi, linked_verts[1][0]);
              this.velocities.setY((i * 3) + vi, linked_verts[1][1]);
              this.velocities.setZ((i * 3) + vi, linked_verts[1][2]);
            break;
          }
        }
      }else{
        //Vertex Positions
        this.offsets.setX((i * 3) + vi, newPosition.x);
        this.offsets.setY((i * 3) + vi, newPosition.y);
        this.offsets.setZ((i * 3) + vi, newPosition.z);
        //Vertex Offsets
        this.velocities.setX((i * 3) + vi, linked_verts[vi][0]);
        this.velocities.setY((i * 3) + vi, linked_verts[vi][1]);
        this.velocities.setZ((i * 3) + vi, linked_verts[vi][2]);

      }
      
    }

    let index = this.geometry.getIndex();
    let indices = [];
    for ( let oldI = 0; oldI < this.offsets.count; oldI++ ) {
      indices.push( oldI );
    }
    this.geometry.setIndex( indices );
    index = this.geometry.getIndex();

    let newIndices = [];
    let numberOfTriangles = this.offsets.count - 2;
    // gl.TRIANGLE_STRIP
    for ( let newI = 0; newI < numberOfTriangles; newI++ ) {
      if ( newI % 2 === 0 ) {
        newIndices.push( index.getX( newI ) );
        newIndices.push( index.getX( newI + 1 ) );
        newIndices.push( index.getX( newI + 2 ) );
      } else {
        newIndices.push( index.getX( newI + 2 ) );
        newIndices.push( index.getX( newI + 1 ) );
        newIndices.push( index.getX( newI ) );
      }
    }
    //console.log(newIndices);
    this.geometry.setIndex(newIndices);
    this.geometry.clearGroups();*/
  }

}