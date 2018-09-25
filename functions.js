for(let i = Game.grassGroup.children.length; i > 0; i--){
	Game.grassGroup.remove(Game.grassGroup.children[i]);
}

( (meshes) => {
  let rot = Math.PI/4;
  function buildClump(pos){
    
    for(let i = 0; i < 4; i++){
      var bgeometry = new THREE.PlaneBufferGeometry( 1, 1, 32 );
      var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
      var plane = new THREE.Mesh( bgeometry, material );
      plane.position.set(pos.x, pos.y, pos.z);
	    plane.rotation.z = Math.PI/2;
      plane.rotation.x = Math.PI/4*i;
      Game.grassGroup.add( plane );
    }

  }

	for(let i = 0; i < meshes.length; i++){
		let mesh = meshes[i];
		let geometry = mesh.geometry;
        let faces = mesh.geometry.faces;
		for(let j = 0; j < faces.length; j++){
			let face = faces[j];
			if(face.color){
        if(face.color.r == 0.49 && face.color.g == 0.29 && face.color.b == 0.07){
          //console.log(faces[j]);

          face.centroid = new THREE.Vector3( 0, 0, 0 );

          if ( face instanceof THREE.Face3 ) {
            face.centroid.add( geometry.vertices[ face.a ] );
            face.centroid.add( geometry.vertices[ face.b ] );
            face.centroid.add( geometry.vertices[ face.c ] );
            face.centroid.divideScalar( 3 );
          }

          for(let k = 0; k < 3; k++){
            var pos = geometry.vertices[ face.a ];

            if(k==1){
              pos = geometry.vertices[ face.b ];
            }

            if(k==2){
              pos = geometry.vertices[ face.c ];
            }

            buildClump(pos);
          }

          buildClump(face.centroid);
        }
      }
    }
  }
	console.log('done')
})(Game.walkmeshList)