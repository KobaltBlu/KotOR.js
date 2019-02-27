/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AuroraWalkMesh is used for reading and handling the various walkmesh filetypes found in the game
 */

 class AuroraWalkMesh {
  
    constructor( wokReader = null, onLoad = null, onError = null ){
  
      this.wokReader = wokReader;
  
      this.fileHeader = {};
      this.geometryHeader = {};
      this.modelHeader = {};
      this.animations = [];
      this.walkableFaces = [];
      this.grassFaces = [];
      this.rootNode = null;
      this.header = this.ReadHeader();
      this.mesh = new THREE.Object3D;
  
      //READ Verticies
      this.wokReader.Seek(this.header.offsetToVertices);
      this.vertices = [];
      for (let i = 0; i < this.header.verticesCount; i++)
        this.vertices[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());

      //READ Faces
      this.wokReader.Seek(this.header.offsetToFaces);
      this.faces = [];
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i] = new THREE.Face3(this.wokReader.ReadInt32(), this.wokReader.ReadInt32(), this.wokReader.ReadInt32());

      //READ Walk Types
      this.wokReader.Seek(this.header.offsetToWalkTypes);
      this.walkTypes = [];
      for (let i = 0; i < this.header.facesCount; i++)
        this.walkTypes[i] = this.wokReader.ReadInt32();

      //READ Normals
      this.wokReader.Seek(this.header.offsetToNormalizedInvertedNormals);
      this.normals = [];
      for (let i = 0; i < this.header.facesCount; i++)
        this.faces[i].normal = this.normals[i] = new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle());

      //READ Face Plane Coefficients
      this.wokReader.Seek(this.header.offsetToFacePlanesCoefficien);
      this.facePlaneCoefficients = [];
      for (let i = 0; i < this.header.facesCount; i++)
        this.facePlaneCoefficients[i] = this.wokReader.ReadSingle();

      this.wokReader.Seek(this.header.offsetToAABBs);
      this.aabbNodes = [];
      for (let i = 0; i < this.header.aabbCount; i++)
        this.aabbNodes[i] = this.ReadAABB();


      this.wokReader.Seek(this.header.offsetToWalkableFacesEdgesAdjacencyMatrix);
      this.walkableFacesEdgesAdjacencyMatrix = [];
      for (let i = 0; i < (this.header.walkableFacesEdgesAdjacencyMatrixCount * 3); i++)
        this.walkableFacesEdgesAdjacencyMatrix[i] = this.wokReader.ReadInt32();

      this.tilecolors = [];

      for(let i = 0; i < Global.kotor2DA.tilecolor.RowCount; i++){
        let tileColor = Global.kotor2DA.tilecolor.rows[i];
        //console.log('tileColor', tileColor);
        this.tilecolors.push(new THREE.Color(parseFloat(tileColor.red), parseFloat(tileColor.green), parseFloat(tileColor.blue)));
      }

      //Build Face Colors
      for (let i = 0; i < this.header.facesCount; i++){
        let face = this.faces[i];
        face.walkIndex = this.walkTypes[i];
        face.color = this.tilecolors[this.walkTypes[i]];

        if(face.walkIndex != 7 && face.walkIndex != 2){
          this.walkableFaces.push(face);
        }
        
        if(face.walkIndex == 3 || face.walkIndex == 19){ //17 == WATER?
          this.grassFaces.push(face);
        }

        //Get centroid
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
      this.mesh.wok = this;
  
      this.wokReader = null;

      this.aabbGroup = new THREE.Object3D;
      this.mesh.add(this.aabbGroup);

      
      for(let i = 0; i < this.aabbNodes.length; i++){
        let node = this.aabbNodes[i];
        node.boxHelper = new THREE.Box3Helper( node.box, 0xffff00 );
        this.aabbGroup.add( node.boxHelper );

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

    ReadAABB(){
      return {
        box: new THREE.Box3(
          new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() - 1),
          new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle() + 1)
        ),
        leafFaceIndex: this.wokReader.ReadInt32(),
        unknownFixedAt4: this.wokReader.ReadInt32(),
        mostSignificantPlane: this.wokReader.ReadInt32(),
        leftNodeArrayIndex: this.wokReader.ReadInt32(),
        rightNodeArrayIndex: this.wokReader.ReadInt32()
      };
    }
  
    ReadHeader(){
  
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

    /*getAABBCollisionFaces(box = new THREE.Box3, node = null, collisions = []){

      if(node == null){
        node = this.aabbRoot;
      }

      if(!node){
        return [];
      }
      
      if(node.box.containsBox(box)){
        if(node.leftNode != undefined){
          this.getAABBCollisionFaces(box, node.leftNode, collisions)
        }

        if(node.rightNode != undefined){
          this.getAABBCollisionFaces(box, node.rightNode, collisions)
        }
      }
        
      if(node.leafFaceIndex > -1)
        collisions.push(this.faces[node.leafFaceIndex]);

      return collisions;
    }*/

    getAABBCollisionFaces(box = new THREE.Box3, node = null, collisions = []){

      if(!this.aabbRoot){
        return this.faces;
      }

      if(node == null){
        node = this.aabbRoot;
        if(node){
          if(node.box.intersectsBox(box) || node.box.containsBox(box)){
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

        if(node.box.intersectsBox(box) || node.box.containsBox(box)){
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
      
    }

    raycast(raycaster, faces = []) {
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

      inverseMatrix.getInverse( matrixWorld );
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
  
  }
  
  
  module.exports = AuroraWalkMesh;
  