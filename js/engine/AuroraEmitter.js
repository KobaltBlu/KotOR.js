/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The THREE.AuroraEmitter class will handle emitter nodes.
 * It only handles Billboard_to_World_Z and Billboard_to_Local_Z emitters
 */


//THREE.js representation of AuroraEmitter
THREE.AuroraEmitter = function ( auroraNode ) {
  
  THREE.Object3D.call( this );
  this.type = 'AuroraEmitter';

  this.isDetonated = false;
  this.particleIndex = 0;

  this.vec3 = new THREE.Vector3(0.0, 0.0, 0.0);
  this.sizeXY = new THREE.Vector2(0.0, 0.0);

  this.getMaxParticleCount = function(){
    if(this.node.Render == 'Linked'){ //Max attribute array size
      if(this.updateType == 'Lightning'){
        return 10 * 2;
      }else{
        return ((Math.ceil(this.lifeExp) * Math.ceil(this.birthRate)) * 2) * 3;
      }
    }else{
      return (Math.ceil( (this.lifeExp >= 0 ? this.lifeExp : 1) ) * Math.ceil(this.birthRate)) * 2;
    }
  }

  this.getRandomPosition = function(){
    let spread = new THREE.Vector3(0, 0, 0).copy(this.size);//.applyQuaternion(this.parent.quaternion);
    let quaternion = new THREE.Quaternion(0, 0, 0, 1);
    /*if(this.parent)
      this.parent.getWorldQuaternion(parentQuaternion);*/
    
    if(this.node.Render == 'Normal' || this.node.Render == 'Motion_Blur'){
      let pos = new THREE.Vector3().copy(this.parent.position);
      this.getWorldQuaternion(quaternion);
      this.getWorldPosition(pos);
      return new THREE.Vector3(
        ( Math.random() * spread.x - ( spread.x * 0.5 ) ),
        ( Math.random() * spread.y - ( spread.y * 0.5 ) ),
        ( Math.random() * spread.z - ( spread.z * 0.5 ) )
      ).applyQuaternion(this.parent.quaternion).add(pos);
    }else if(this.node.Render == 'Linked'){

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

  this.randomFloat = function(min, max){
    return min + ( Math.random() * max - ( max * 0.5 ) );
  }

  this.getRandomMaxAge = function(){
    return this.lifeExp;//Math.floor(Math.random() * this.lifeExp) + (this.lifeExp * 0);
  }

  //Update the emitter
  this.tick = function(delta){

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
      if(this.node.Render != 'Linked')
        velocities.set(this.velocities.array);
      props.set(this.props.array);

      //Create new InstancedBufferAttribute / BufferAttribute objects with the new arrays
      switch(this.node.Render){
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
      if(this.node.Render != 'Linked')
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
    if(this.node.Render == 'Linked'){
      attrPerVertex = 3;
      spawnableParticleCount = (this.offsets.count/attrPerVertex) || 0;
      if(!this.birthRate){
        this.particleIndex = 0;
      }

    }

    let birthed = false;

    for(let i = 0; i < spawnableParticleCount; i++){

      if(this.node.Render == 'Linked'){

        let age = this.props.getX(i * attrPerVertex) || 0;
        let maxAge = this.props.getY(i * attrPerVertex) || this.lifeExp;
        let alive = this.props.getZ(i * attrPerVertex) == 1;

        if(i < this.maxParticleCount){

          if(alive){
            if(age >= maxAge){
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
        let maxAge = this.props.getY(i) || (this.lifeExp >= 0 ? this.lifeExp : 100);
        let alive = this.props.getZ(i) == 1;

        if(i < this.maxParticleCount){

          if(alive){
            if(age >= maxAge){
              age = 0;
              if(this.node.Update != 'Single'){
                this.particleCount -= 1;
                //mark particle as dead
                this.props.setZ(i, 0);
              }else{
                //mark particle as alive
                this.props.setZ(i, 1);
              }
            }else{
              age += delta;
            }
          }else if(this.node.Update != 'Single'){

            let canSpawn = !this._birthTimer;
            let maxSpawn = 1;//this.birthRate * (1/this.birthRate);

            if(this.node.Update == 'Explosion'){
              canSpawn = this.isDetonated;
              maxSpawn = this.birthRate;
            }

            //If the birthtimer has expired and we can still spawn more particles this frame
            if(canSpawn && birthCount < maxSpawn){
              //Birth and reset the particle
              this.spawnParticle(i);
              updatePositions = true;
              if(this.node.Render != 'Linked')
                updateVelocity = true;
              birthCount++;
            }

            //Make sure the age is set to zero
            age = 0;
          }
          this.props.setX(i, age || 0);
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
            }
          }else{
            age = 0;
          }
          this.props.setX(i, age || 0);
          updateProperties = true;

        }

      }

    }

    if(this.node.Render == "Aligned_to_Particle_Dir"){
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

  };

  this.tickLightning = function(delta){
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
        var percentage = iy/lightningZigZag;
        var x = start.x + ( (target.x - start.x) * percentage);
        var y = start.y + ( (target.z - start.z) * percentage);
        var z = start.z + ( (target.y - start.y) * percentage);

        if(iy){
          x = this.randomFloat(x, spread);
          y = this.randomFloat(y, spread);
          z = this.randomFloat(z, spread);
        }else if(iy+1 == lightningZigZag){
          x = this.randomFloat(x, this.lightningRadius);
          y = this.randomFloat(y, this.lightningRadius);
          z = this.randomFloat(z, this.lightningRadius);
        }

        for ( ix = 0; ix < 2; ix ++ ) {


          //var x = (ix * xStep) * scale - half_scale;
          var xO = scale/2;
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
            age = (this.geometry.attributes.props.getX( 0 ) || 0) + delta;
          }

          if(age >= 1)
            age = 0;

          props.push(age + delta, 1, 1, 0);

        }

        // indices
        for(let iy = 0; iy < lightningZigZag-1; iy++){

          for ( ix = 0; ix < 1; ix ++ ) {

            var a = ix + gridX1 * iy;
            var b = ix + gridX1 * ( iy + 1 );
            var c = ( ix + 1 ) + gridX1 * ( iy + 1 );
            var d = ( ix + 1 ) + gridX1 * iy;

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
        for ( ix = 0; ix < 2; ix ++ ) {
          if(!this.geometry.attributes.props){
            age = 0;
          }else{
            age = (this.geometry.attributes.props.getX( 0 ) || 0) + delta;
          }

          if(age >= 1)
            age = 0;

          props.push(age + delta, 1, 1, 0);
        }
      }
      this.geometry.setAttribute( 'props', new THREE.Float32BufferAttribute( props, 4 ) );
    }
  };

  this.setLinkedVertexPosition = function(i = 0, position = new THREE.Vector3){
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

  this.spawnParticle = function(i = 0){
    //Birth and reset the particle
    let newPosition = this.getRandomPosition();
    if(this.node.Render != 'Linked'){
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
      if(this.node.Update == 'Explosion' && this.node.Render != 'Linked'){
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

        if(this.node.Render != 'Linked'){
          this.velocities.setX(i, this.vec3.x);
          this.velocities.setY(i, this.vec3.y);
          this.velocities.setZ(i, this.vec3.z);
        }
      }
    }else{
      if(this.node.Render != 'Linked'){
        this.velocities.setX(i, 0);
        this.velocities.setY(i, 0);
        this.velocities.setZ(i, 0);
      }
    }

    let maxAge = this.getRandomMaxAge();
    if(this.node.Render != 'Linked'){
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

  };

  //https://github.com/mrdoob/three.js/blob/master/examples/webgl_custom_attributes_points2.html#L173
  this.sortParticles = function(){

    if(!(this.mesh instanceof THREE.Points))
      return;

    if(this.node.Render == 'Linked')
      return;

    if(!this.context){
      if(!Game){
        return;
      }else{
        this.context = Game;
      }
    }

    let vector = new THREE.Vector3();

    // Model View Projection matrix

    let matrix = new THREE.Matrix4();
    matrix.multiplyMatrices( this.context.currentCamera.projectionMatrix, this.context.currentCamera.matrixWorldInverse );
    matrix.multiply( this.mesh.matrixWorld );

    //

    let index = this.geometry.getIndex();
    let positions = this.geometry.getAttribute( 'position' ).array;
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

    function numericalSort( a, b ) {
      return b[ 0 ] - a[ 0 ];
    }

    sortArray.sort( numericalSort );
    let indices = index.array;
    for ( let i = 0; i < length; i ++ ) {
      indices[ i ] = sortArray[ i ][ 1 ];
    }
    
    this.geometry.index.needsUpdate = true;
    
  }

  this.detonate = function(){
    this.isDetonated = true;
    //this.material.uniforms.mass.value.z = 0;
    let spawnableParticleCount = this.offsets.count;
    for(let i = 0; i < spawnableParticleCount; i++){
      this.props.setX(0);
    }
    this.props.needsUpdate = true;
    this.material.uniforms.time.value = 0;
    this.material.uniformsNeedUpdate = true;
  }

  this.getBirthTimer = function(){
    return 1/this.birthRate;
  }

  //Disable the emitter
  this.disable = function(){

  };

  this.attributes = {

  };

  this.node = auroraNode;

  this.material = undefined;
  this.mesh = undefined;

  switch(this.node.Render){
    case 'Normal':
    case 'Motion_Blur':
    case 'Linked':
      this.geometry = new THREE.BufferGeometry();
    break;
    default:
      this.geometry = new THREE.InstancedBufferGeometry();
      this.geometry.index = THREE.AuroraEmitter.geometry.index;
      this.geometry.attributes.position = THREE.AuroraEmitter.geometry.attributes.position;
      this.geometry.attributes.uv = THREE.AuroraEmitter.geometry.attributes.uv;
    break;
  }

  this.geometry.ignoreRaycast = true;

  //Particles
  this.particleCount = 0;
  this.maxParticleCount = 0;
  this.positions = [];
  this.ages = [];

  //Properties
  this.size = new THREE.Vector3();
  this.sizes = [0, 0, 0];
  this.spread = 0;
  this.opacity = [];
  this.lifeExp = 0;
  this._detonate = 0;
  this.birthRate = 0;

  this.colorStart = new THREE.Color(1, 1, 1);
  this.colorMid = new THREE.Color(1, 1, 1);
  this.colorEnd = new THREE.Color(1, 1, 1);

  if(auroraNode instanceof AuroraModelNode){

    this.updateType = this.node.Update;

    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge( [
        THREE.ShaderLib.auroraEmitter.uniforms, {
          textureAnimation: { value: new THREE.Vector4(this.node.GridX, this.node.GridY, this.node.GridX * this.node.GridY, 1) },
        }
      ]),
      vertexShader: THREE.ShaderLib.auroraEmitter.vertexShader,
      fragmentShader: THREE.ShaderLib.auroraEmitter.fragmentShader,
      side: THREE.FrontSide,
      transparent: true,
      fog: false,
      visible: true
    });

    if(this.node.TwoSidedTex || this.node.Render == 'Linked'){
      this.material.side = THREE.DoubleSide;
    }

    //this.material.defines.USE_FOG = '';

    TextureLoader.enQueueParticle(this.node.Texture, this);

    this.node.controllers.forEach( (controller) => {
      if(controller.data.length){
        switch(controller.type){
          case AuroraModel.ControllerType.Position:
            //positionOffset.copy(controller.data[0]);
          break;
          case AuroraModel.ControllerType.Orientation:
            //controllerOptions.orientation = new THREE.Quaternion(controller.data[0].x, controller.data[0].y, controller.data[0].z, controller.data[0].w);
          break;
          case AuroraModel.ControllerType.ColorStart:
            this.colorStart.copy(controller.data[0]);
          break;
          case AuroraModel.ControllerType.ColorMid:
            this.colorMid.copy(controller.data[0]);
          break;
          case AuroraModel.ControllerType.ColorEnd:
            this.colorEnd.copy(controller.data[0]);
          break;
          case AuroraModel.ControllerType.XSize:
            //if(this.node.Render == 'Aligned_to_Particle_Dir'){
              this.size.x = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
            //}else{
            //  this.size.y = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
            //}
          break;
          case AuroraModel.ControllerType.YSize:
            //if(this.node.Render == 'Aligned_to_Particle_Dir'){
              this.size.y = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
            //}else{
            //  this.size.x = controller.data[0].value < 1 ? controller.data[0].value : (controller.data[0].value*.01);
            //}
          break;
          case AuroraModel.ControllerType.Spread:
            this.spread = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LifeExp:
            this.lifeExp = controller.data[0].value >= 0 ? controller.data[0].value : 100;
          break;
          case AuroraModel.ControllerType.BirthRate:
            this.birthRate = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Drag:
            this.drag = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Threshold:
            this.threshold = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Grav:
            this.gravity = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Mass:
            this.mass = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Velocity:
            this.velocity = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.RandVel:
            this.randVelocity = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.SizeStart:
            this.sizes[0] = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.SizeMid:
            this.sizes[1] = (controller.data[0].value);
          break;
          case AuroraModel.ControllerType.SizeEnd:
            this.sizes[2] = (controller.data[0].value);
          break;
          case AuroraModel.ControllerType.AlphaStart:
            this.opacity[0] = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.AlphaMid:
            this.opacity[1] = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.AlphaEnd:
            this.opacity[2] = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.ParticleRot:
            this.angle = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.Detonate:
            this._detonate = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.FPS:
            this.fps = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.FrameStart:
            this.material.uniforms.frameRange.value.x = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.FrameEnd:
            this.material.uniforms.frameRange.value.y = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LightningZigZag:
            this.lightningZigZag = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LightningDelay:
            this.lightningDelay = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LightningRadius:
            this.lightningRadius = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LightningSubDiv:
            this.lightningSubDiv = controller.data[0].value;
          break;
          case AuroraModel.ControllerType.LightningScale:
            this.lightningScale = controller.data[0].value;
          break;
        }
      }
    });

    this.maxParticleCount = this.birthRate * this.lifeExp;
    this.material.uniforms.tDepth.value = Game.depthTarget.depthTexture;
    this.material.uniforms.maxAge.value = (this.lifeExp >= 0 ? this.lifeExp : 100);
    this.material.uniforms.colorStart.value.copy(this.colorStart);
    this.material.uniforms.colorMid.value.copy(this.colorMid);
    this.material.uniforms.colorEnd.value.copy(this.colorEnd);
    this.material.uniforms.opacity.value.fromArray(this.opacity);
    this.material.uniforms.scale.value.fromArray(this.sizes);
    this.material.uniforms.rotate.value = this.angle;
    this.material.uniforms.drag.value = this.drag;
    this.material.uniforms.velocity.value = this.velocity;
    this.material.uniforms.randVelocity.value = this.randVelocity;

    if(this.node.Render == 'Linked'){
      this.birthRate = 0;
    }

    if(this.node.Update == 'Lightning'){
      this.material.defines.LIGHTNING = '';
    }

    if(this.fps){
      this.material.defines.FPS = '';
      this.material.uniforms.fps.value = this.fps;
    }

    this.material.defines[this.node.Render] = '';

    this._birthTimer = 1/this.birthRate;

    switch(this.node.Blend){
      case 'Normal':
        this.material.blending = THREE.NormalBlending;
      break;
      case 'Lighten':
      case 'Punch-Through':
        this.material.blending = THREE.AdditiveBlending;
      break;
    }

    let offsets = [];
    let props = [];
    let velocities = [];
    let ids = [];
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

    switch(this.node.Render){
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

  this.attributeChanged = function(attr = null){
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

  this.addEventListener( 'added', function ( event ) {
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

  this.setLinkedVertexPositionOLD = function(i = 0, newPosition = new THREE.Vector3){
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

};

THREE.AuroraEmitter.prototype = Object.assign( Object.create( THREE.Object3D.prototype ), {
  constructor: THREE.AuroraEmitter
});

THREE.AuroraEmitter.BirthTime = 1;
THREE.AuroraEmitter.geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);