InitEditorPlane(){
  // Geometry
  let cbgeometry = new THREE.PlaneGeometry( 500, 500, 8, 8 );

  // Materials
  let cbmaterials = [];

  cbmaterials.push( new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide }) );
  cbmaterials.push( new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide }) );

  let l = cbgeometry.faces.length / 2; // <-- Right here. This should still be 8x8 (64)

  console.log("This should be 64: " + l);// Just for debugging puporses, make sure this is 64

  for( let i = 0; i < l; i ++ ) {
      let j = i * 2; // <-- Added this back so we can do every other 'face'
      cbgeometry.faces[ j ].materialIndex = ((i + Math.floor(i/8)) % 2); // The code here is changed, replacing all 'i's with 'j's. KEEP THE 8
      cbgeometry.faces[ j + 1 ].materialIndex = ((i + Math.floor(i/8)) % 2); // Add this line in, the material index should stay the same, we're just doing the other half of the same face
  }

  // Mesh
  let cb = new THREE.Mesh( cbgeometry, new THREE.MeshFaceMaterial( cbmaterials ) );
  this.scene.add( cb );
}


  buildAxes( length ) {
        var axes = new THREE.Object3D();

        axes.add(this.buildAxis('x', length, 0xFF0000 ) ); // +X
        axes.add(this.buildAxis('y', length, 0x00FF00) ); // -X
        axes.add(this.buildAxis('z', length, 0x0000FF ) ); // +Y

        axes.position.set(-length/2, -length/2, -length/2);
        console.log(axes);
        return axes;

  }

  buildAxis( axis, length, colorHex ) {
    var geom = new THREE.CylinderGeometry( 0.025, 0.025, length, 32 );
    var mat = new THREE.MeshBasicMaterial( { color: colorHex } );
    var mesh = new THREE.Mesh( geom, mat );

    var angle = 90 * Math.PI / 180;

    mesh.name = axis;

    switch(axis){
      case 'x':
        mesh.position.set(length/2, 0, 0);
        mesh.rotation.set(0, 0, angle);
      break;
      case 'y':
        mesh.position.set(0, length/2, 0);
        mesh.rotation.set(0, angle, 0);
      break;
      case 'z':
      mesh.position.set(0, 0, length/2);
        mesh.rotation.set(angle, 0, 0);
      break;
    }

    return mesh;
  }
