/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraWalkMesh is used for reading and handling the various walkmesh filetypes found in the game
 */

 class AuroraWalkMesh {
  
  constructor( wokReader = null, onLoad = null, onError = null ){

    this.header = {
      walkMeshType: AuroraWalkMesh.TYPE.NONE
    };

    this.walkableFaces = [];
    this.grassFaces = [];
    this.rootNode = null;
    this.mesh = new THREE.Object3D();
    this.box = new THREE.Box3();
    this.faces = [];
    this.vertices = [];
    this.walkTypes = [];
    this.normals = [];
    this.facePlaneCoefficients = [];
    this.aabbNodes = [];
    this.walkableFacesEdgesAdjacencyMatrix = [];


    this.wokReader = wokReader;
    this.readBinary();
    this.wokReader = undefined;

    //Build Face Colors
    for (let i = 0, len = this.faces.length; i < len; i++){
      let face = this.faces[i];
      face.walkIndex = this.walkTypes[i];
      face.color = AuroraWalkMesh.TILECOLORS[this.walkTypes[i]];
      face.surfacemat = AuroraWalkMesh.SURFACEMATERIALS[face.walkIndex];

      if(face.surfacemat == undefined){
        console.warn('AuroraWalkMesh', 'Unknown surfacemat', face, AuroraWalkMesh.SURFACEMATERIALS);
      }

      face.blocksLineOfSight = face.surfacemat.lineofsight == 1;
      face.wallCheck = face.surfacemat.wallcheck == 1;

      //Is this face walkable
      if(face.surfacemat.walk == 1){
        let walkIdx = this.walkableFaces.push(face);
        face.adjacentWalkableFaces.a = this.faces[(this.walkableFacesEdgesAdjacencyMatrix[walkIdx] || [] )[0]];
        face.adjacentWalkableFaces.b = this.faces[(this.walkableFacesEdgesAdjacencyMatrix[walkIdx] || [] )[1]];
        face.adjacentWalkableFaces.c = this.faces[(this.walkableFacesEdgesAdjacencyMatrix[walkIdx] || [] )[2]];
      }
      
      //Is this face grassy
      if(face.surfacemat.grass == 1){
        this.grassFaces.push(face);
      }

      //Get centroid of the face
      face.centroid = new THREE.Vector3( 0, 0, 0 );
      if ( face instanceof THREE.Face3 ) {
        face.centroid.add( this.vertices[ face.a ] );
        face.centroid.add( this.vertices[ face.b ] );
        face.centroid.add( this.vertices[ face.c ] );
        face.centroid.divideScalar( 3 );
      }
    }

    this.matrixWorld = new THREE.Matrix4();
    this.geometry = new THREE.Geometry();
    this.box = new THREE.Box3(new THREE.Vector3, new THREE.Vector3);
    //this.geometry.boundingBox = this.boundingBox;
    
    this.geometry.vertices = this.vertices;
    this.geometry.faces = this.faces;

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: THREE.FaceColors,
      side:THREE.FrontSide
    });

    this.geometry.verticesNeedUpdate = true;
    this.geometry.normalsNeedUpdate = true;
    this.geometry.uvsNeedUpdate = true;

    this.mesh = new THREE.Mesh( this.geometry , this.material );
    this.box.setFromObject(this.mesh);
    this.material.visible = false;
    this.mesh.wok = this;

    this.aabbGroup = new THREE.Object3D;
    this.mesh.add(this.aabbGroup);
    
    for(let i = 0; i < this.aabbNodes.length; i++){
      let node = this.aabbNodes[i];
      //node.boxHelper = new THREE.Box3Helper( node.box, 0xffff00 );
      //this.aabbGroup.add( node.boxHelper );

      node.face = this.faces[node.leafFaceIndex];
      node.leftNode = this.aabbNodes[node.leftNodeArrayIndex];
      node.rightNode = this.aabbNodes[node.rightNodeArrayIndex];

      if(node.face == undefined){
        node.type = 'node';
      }else{
        node.type = 'leaf';
      }

    }

    this.aabbRoot = this.aabbNodes[0];

  }

  readBinary(){
    if(this.wokReader instanceof BinaryReader){
      this.header = this.readHeader();
      //READ Verticies
      this.wokReader.Seek(this.header.offsetToVertices);
      for (let i = 0; i < this.header.verticesCount; i++)
        this.vertices[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());

      //READ Faces
      this.wokReader.Seek(this.header.offsetToFaces);
      for (let i = 0; i < this.header.facesCount; i++){
        this.faces[i] = new THREE.Face3(this.wokReader.ReadInt32(), this.wokReader.ReadInt32(), this.wokReader.ReadInt32());
        this.faces[i].adjacentWalkableFaces = {
          a: undefined,
          b: undefined,
          c: undefined
        }
      }

      //READ Walk Types
      this.wokReader.Seek(this.header.offsetToWalkTypes);
      for (let i = 0; i < this.header.facesCount; i++)
        this.walkTypes[i] = this.wokReader.ReadInt32();

      //READ Normals
      this.wokReader.Seek(this.header.offsetToNormalizedInvertedNormals);
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].normal = this.normals[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());

      //READ Face Plane Coefficients
      this.wokReader.Seek(this.header.offsetToFacePlanesCoefficien);
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].coeff = this.facePlaneCoefficients[i] = this.wokReader.ReadSingle();

      this.wokReader.Seek(this.header.offsetToAABBs);
      for (let i = 0; i < this.header.aabbCount; i++)
        this.aabbNodes[i] = this.readAABB();


      this.wokReader.Seek(this.header.offsetToWalkableFacesEdgesAdjacencyMatrix);
      for (let i = 0; i < this.header.walkableFacesEdgesAdjacencyMatrixCount; i++){
        //Every array of 3 uint32's references the 3 walkable faces adjacent to it.
        //If the value is -1 then the adjacent face on that side is not walkable.
        //If it is greater or equal to zero then it is an index into the this.faces array.
        //This is most likely used for pathfinding and or collision
        this.walkableFacesEdgesAdjacencyMatrix.push([
          this.wokReader.ReadInt32(),
          this.wokReader.ReadInt32(),
          this.wokReader.ReadInt32()
        ]);
      }
    }
  }

  dispose(){

    if(this.mesh && this.mesh.parent)
      this.mesh.parent.remove(this.mesh);

    if(this.geometry){
      this.geometry.dispose();
    }

    if(this.material){
      this.material.dispose();
    }

  }

  readAABB(){
    let aabb = {
      box: new THREE.Box3(
        new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() - 10),
        new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() + 10)
      ),
      leafFaceIndex: this.wokReader.ReadInt32(),
      unknownFixedAt4: this.wokReader.ReadInt32(),
      mostSignificantPlane: this.wokReader.ReadInt32(),
      leftNodeArrayIndex: this.wokReader.ReadInt32(),
      rightNodeArrayIndex: this.wokReader.ReadInt32()
    };
    aabb._box = aabb.box.clone();
    return aabb;
  }

  readHeader(){

    return {
      fileType: this.wokReader.ReadChars(4),
      version: this.wokReader.ReadChars(4),
      walkMeshType: this.wokReader.ReadUInt32(),
      reserved: this.wokReader.ReadBytes(48),
      position: new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle()),
      verticesCount: this.wokReader.ReadUInt32(),
      offsetToVertices: this.wokReader.ReadUInt32(),
      facesCount: this.wokReader.ReadUInt32(),
      offsetToFaces: this.wokReader.ReadUInt32(),
      offsetToWalkTypes: this.wokReader.ReadUInt32(),
      offsetToNormalizedInvertedNormals: this.wokReader.ReadUInt32(),
      offsetToFacePlanesCoefficien: this.wokReader.ReadUInt32(),
      aabbCount: this.wokReader.ReadUInt32(),
      offsetToAABBs: this.wokReader.ReadUInt32(),
      unknownEntry: this.wokReader.ReadUInt32(),
      walkableFacesEdgesAdjacencyMatrixCount: this.wokReader.ReadUInt32(),
      offsetToWalkableFacesEdgesAdjacencyMatrix: this.wokReader.ReadUInt32(),
      perimetricEdgesCount: this.wokReader.ReadUInt32(),
      offsetToPerimetricEdges: this.wokReader.ReadUInt32(),
      perimetersCount: this.wokReader.ReadUInt32(),
      offsetToPerimeters: this.wokReader.ReadUInt32()
    }

  }

  //BSP Tree?
  //https://www.gamasutra.com/view/feature/131508/bsp_collision_detection_as_used_in_.php?print=1

  containsPointOrBox( box, pointOrBox = new THREE.Box3 ){
    if(pointOrBox.isBox3){
      return box.intersectsBox(pointOrBox) || box.containsBox(pointOrBox);
    }else if(pointOrBox.isVector3){
      return box.containsPoint(pointOrBox);
    }
    return false;
  }

  getAABBCollisionFaces(box = new THREE.Box3, node = undefined, collisions = []){

    if(this.header.walkMeshType == AuroraWalkMesh.TYPE.AABB){

      if(!this.aabbRoot){
        return this.faces;
      }

      if(node == undefined){
        node = this.aabbRoot;
        if(node){
          if(this.containsPointOrBox(node.box, box)){
            if(node.leftNode != undefined){
              this.getAABBCollisionFaces(box, node.leftNode, collisions)
            }

            if(node.rightNode != undefined){
              this.getAABBCollisionFaces(box, node.rightNode, collisions)
            }
          }

          if(node.leafFaceIndex > -1)
            collisions.push(this.faces[node.leafFaceIndex]);
        }
      
      }else{

        if(this.containsPointOrBox(node.box, box)){
          if(node.leftNode != undefined){
            this.getAABBCollisionFaces(box, node.leftNode, collisions)
          }

          if(node.rightNode != undefined){
            this.getAABBCollisionFaces(box, node.rightNode, collisions)
          }
        }

        if(node.leafFaceIndex > -1)
          collisions.push(this.faces[node.leafFaceIndex]);

      }

      return collisions;

    }else{
      if(this.containsPointOrBox(node.box, box)){
        return this.faces;
      }else{
        return [];
      }
    }
    
  }

  raycast(raycaster, faces = []) {

    if(this.header.walkMeshType == AuroraWalkMesh.TYPE.NONE){
      let intersects = [];
      this.mesh.raycast(raycaster, intersects);
      return intersects;
    }

    let intersects = [];
    let inverseMatrix = new THREE.Matrix4();
    let ray = new THREE.Ray();
    let sphere = new THREE.Sphere();

    let uvA = new THREE.Vector2();
    let uvB = new THREE.Vector2();
    let uvC = new THREE.Vector2();

    let intersectionPoint = new THREE.Vector3();
    let intersectionPointWorld = new THREE.Vector3();

    function checkIntersection( object, material, raycaster, ray, pA, pB, pC, point ) {

      let intersect;

      if ( material.side === THREE.BackSide ) {

        intersect = ray.intersectTriangle( pC, pB, pA, true, point );

      } else {

        intersect = ray.intersectTriangle( pA, pB, pC, material.side !== THREE.DoubleSide, point );

      }

      if ( intersect === null ) return null;

      intersectionPointWorld.copy( point );
      intersectionPointWorld.applyMatrix4( object.matrixWorld );

      let distance = raycaster.ray.origin.distanceTo( intersectionPointWorld );

      if ( distance < raycaster.near || distance > raycaster.far ) return null;

      return {
        distance: distance,
        point: intersectionPointWorld.clone(),
        object: object
      };

    }

    let geometry = this.geometry;
    let material = this.material;
    let matrixWorld = this.mesh.matrixWorld;

    if ( material === undefined ) return;

    // Checking boundingSphere distance to ray

    if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

    sphere.copy( geometry.boundingSphere );
    sphere.applyMatrix4( matrixWorld );

    //if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;

    //

    inverseMatrix.copy(matrixWorld).invert();
    //inverseMatrix.getInverse( matrixWorld );
    ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

    // Check boundingBox before continuing

    if ( geometry.boundingBox !== null ) {

      if ( ray.intersectsBox( geometry.boundingBox ) === false ) return;

    }

    let intersection;

    let fvA, fvB, fvC;
    let isMultiMaterial = Array.isArray( material );

    let vertices = geometry.vertices;
    let uvs;

    let faceVertexUvs = geometry.faceVertexUvs[ 0 ];
    if ( faceVertexUvs.length > 0 ) uvs = faceVertexUvs;

    for ( let f = 0, fl = faces.length; f < fl; f ++ ) {

      let face = faces[ f ];
      let faceMaterial = isMultiMaterial ? material[ face.materialIndex ] : material;

      if ( faceMaterial === undefined ) continue;

      fvA = vertices[ face.a ];
      fvB = vertices[ face.b ];
      fvC = vertices[ face.c ];

      intersection = checkIntersection( this, faceMaterial, raycaster, ray, fvA, fvB, fvC, intersectionPoint );

      if ( intersection ) {

        if ( uvs && uvs[ f ] ) {

          let uvs_f = uvs[ f ];
          uvA.copy( uvs_f[ 0 ] );
          uvB.copy( uvs_f[ 1 ] );
          uvC.copy( uvs_f[ 2 ] );

          intersection.uv = THREE.Triangle.getUV( intersectionPoint, fvA, fvB, fvC, uvA, uvB, uvC, new THREE.Vector2() );

        }

        intersection.face = face;
        intersection.faceIndex = f;
        intersects.push( intersection );

      }

    }

    return intersects;

  }

  static Init(){
    AuroraWalkMesh.TILECOLORS = [];
    for(let i = 0; i < Global.kotor2DA.tilecolor.RowCount; i++){
      let tileColor = Global.kotor2DA.tilecolor.rows[i];
      AuroraWalkMesh.TILECOLORS.push(new THREE.Color(parseFloat(tileColor.red), parseFloat(tileColor.green), parseFloat(tileColor.blue)));
    }
    
    AuroraWalkMesh.SURFACEMATERIALS = [];
    for(let i = 0, len = Global.kotor2DA.surfacemat.RowCount; i < len; i++){
      AuroraWalkMesh.SURFACEMATERIALS[i] = Global.kotor2DA.surfacemat.rows[i];
    }
  }

}

  
AuroraWalkMesh.TYPE = {
  NONE:   0,
  AABB:   1
};

module.exports = AuroraWalkMesh;
  