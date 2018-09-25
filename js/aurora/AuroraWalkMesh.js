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
        
        if(face.walkIndex == 3){
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

      let geometry = new THREE.Geometry();
      //geometry.boundingBox = this.boundingBox;
      
      geometry.vertices = this.vertices;
      geometry.faces = this.faces;

      geometry.computeFaceNormals();
      geometry.computeVertexNormals();    // requires correct face normals
      geometry.computeBoundingSphere();

      let material = new THREE.MeshBasicMaterial({
        vertexColors: THREE.FaceColors,
        side:THREE.FrontSide
      });

      geometry.verticesNeedUpdate = true;
      geometry.normalsNeedUpdate = true;
      geometry.uvsNeedUpdate = true;

      this.mesh = new THREE.Mesh( geometry , material );
      this.mesh.wok = this;
  
      this.wokReader = null;
  
    }

    ReadAABB(){
      return {
        boxMin: new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle()),
        boxMax: new THREE.Vector3(this.wokReader.ReadSingle(), this.wokReader.ReadSingle(), this.wokReader.ReadSingle()),
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

    pathFind(origin = new THREE.Vector3, destination = new THREE.Vector3){

      let openList = [];
      let closedList = [];

    }
  
  }
  
  
  module.exports = AuroraWalkMesh;
  