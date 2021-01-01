/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePath class.
 */

class ModulePath {

  constructor(pathName = ''){
    this._tmpVector = new THREE.Vector3(0, 0, 0);
    this.points = [];
    this.template = new GFFObject();
    this.name = pathName;

  }

  Load( onLoad = null ){
    TemplateLoader.Load({
      ResRef: this.name,
      ResType: ResourceTypes.pth,
      onLoad: (gff) => {

        this.template = gff;
        //console.log(this.template, gff, this)
        this.InitProperties();
        if(typeof onLoad === 'function')
          onLoad(this);

      },
      onFail: () => {
        console.error('Failed to load path template');
        if(typeof onLoad === 'function')
          onLoad(this);
      }
    });
  }

  InitProperties(){
    if(this.template instanceof GFFObject){
      let _points = this.template.json.fields.Path_Points.structs;
      for(let i = 0; i < _points.length; i++){

        let _pnt = _points[i];
        let point = {
          id: i,
          connections: [],
          first_connection: _pnt.fields.First_Conection.value,
          num_connections: _pnt.fields.Conections.value,
          vector: new THREE.Vector2(_pnt.fields.X.value, _pnt.fields.Y.value)
        };
        this.points.push(point);
      }

      let material = new THREE.LineBasicMaterial({
        color: 0x0000ff
      });

      let geometry = new THREE.Geometry();

      for(let i = 0; i < this.points.length; i++){
        let point = this.points[i];
        if(point.num_connections){
          let connIdx = point.first_connection;
          for(let j = 0; j < point.num_connections; j++){
            point.connections.push(
              this.points[
                this.template.json.fields.Path_Conections.structs[connIdx + j].fields.Destination.value
              ]
            );
          }
        }

        for(let i = 0; i < this.points.length; i++){
          let point = this.points[i];
          geometry.vertices.push(
            new THREE.Vector3( point.vector.x, point.vector.y, -100 ),
            new THREE.Vector3( point.vector.x, point.vector.y, 100 )
          );
        }

      }
          
      this.line = new THREE.LineSegments( geometry, material );
      Game.scene.add( this.line );
      this.setPathHelpersVisibility(false);

    }
    
    this.initialized = true;
    
  }

  setPathHelpersVisibility(state = false){
    this.line.visible = state;
  }

  getStartingPoint(origin = new THREE.Vector3, target = new THREE.Vector3){
    let starting = new THREE.Vector2().copy(origin);
    let ending = new THREE.Vector2().copy(target);
    let startingPoint = target;
    let distance = Infinity;
    let tdistance = Infinity;
    
    //Max distance from target
    let maxDistance = starting.distanceTo(ending);

    //console.log('getStartingPoint', starting, startingPoint, distance);
    for(let i = 0; i < this.points.length; i++){
      let point = this.points[i];
      let pDistance = starting.distanceTo(point.vector);
      let tDistance = point.vector.distanceTo(ending);

      //Don't target anything that is further away from the destination than we already are
      let distanceToTarget = point.vector.distanceTo(ending);
      if(pDistance < distance && distanceToTarget < maxDistance){
        //If this point is closer than the current point update the current point
        //if(pDistance < distance){
          distance = pDistance;
          //tdistance = tDistance;
          startingPoint = point;
        //}
      }
    }
    //console.log('getStartingPoint end', starting, startingPoint, distance);
    return startingPoint;
  }

  getStartingPoints(origin = new THREE.Vector3, target = new THREE.Vector3){
    let starting = new THREE.Vector2().copy(origin);
    let ending = new THREE.Vector2().copy(target);
    let startingPoint = target;
    let distance = Infinity;
    let tdistance = Infinity;
    
    //Max distance from target
    let maxDistance = starting.distanceTo(ending);

    //console.log('getStartingPoint', starting, startingPoint, distance);
    for(let i = 0; i < this.points.length; i++){
      let point = this.points[i];
      let pDistance = starting.distanceTo(point.vector);
      let tDistance = point.vector.distanceTo(ending);

      //Don't target anything that is further away from the destination than we already are
      let distanceToTarget = point.vector.distanceTo(ending)*.5;
      if(pDistance < distance && distanceToTarget < maxDistance){
        //If this point is closer than the current point update the current point
        //if(pDistance < distance){
          distance = pDistance;
          //tdistance = tDistance;
          startingPoint = point;
        //}
      }
    }
    //console.log('getStartingPoint end', starting, startingPoint, distance);
    return startingPoint;
  }

  getNextPoint(cpoint, target = new THREE.Vector3, path){
    //console.log('getNextPoint', cpoint, target);
    let starting = cpoint.vector.clone();
    
    /*if(cpoint instanceof THREE.Vector2 || cpoint instanceof THREE.Vector3){
      starting.copy(cpoint);
    }else{
      starting.copy(cpoint.vector);
    }*/
    
    let ending = new THREE.Vector2().copy(target);
    let nextPoint = target;
    
    //Max distance from target
    let maxDistance = Infinity;
    let distance = maxDistance = starting.distanceTo(ending);

    for(let i = 0; i < cpoint.connections.length; i++){
      let point = cpoint.connections[i];
      if(path.closed_list.indexOf(point.id) == -1){
        //let pDistance = starting.distanceTo(point.vector);
        //let tDistance = point.vector.distanceTo(ending);

        //Don't target anything that is further away from the destination than we already are
        let distanceToTarget = point.vector.distanceTo(ending);
        if(distanceToTarget < maxDistance){
          //If this point is closer than the current point update the current point
          distance = distanceToTarget;
          nextPoint = point;
        }
      }
    }
    //console.log('getNextPoint end', starting, nextPoint, distance);
    return {point: nextPoint, distance: distance};

  }

  traverseToPoint(origin, dest){

    if(!this.points.length){
      return [dest];
    }

    let points = [];

    let originVec2 = new THREE.Vector2(origin.x, origin.y);

    let paths = [];
    for(let i = 0, il = this.points.length; i < il; i++){
      let con_point = this.points[i];

      let distance = originVec2.distanceTo(con_point.vector);

      if(distance > 30)
        continue;

      let path = {
        cost: distance,
        points: [con_point],
        closed_list: [con_point.id]
      };

      let loops = 0;
      let foundEnd = false;

      while(!foundEnd){
        let last = path.points[path.points.length-1];
        let next = this.getNextPoint(last, dest, path);
        /*if(next == last){
          foundEnd = false;
        }else */if(next.point instanceof THREE.Vector3){
          foundEnd = true;
          path.cost += next.distance;
          path.points.push(next.point);
        }else{
          foundEnd = false;
          path.cost += next.distance;
          path.points.push(next.point);
          path.closed_list.push(next.point.id);
        }
        
        if(loops > 1000){
          foundEnd = true;
        }
        loops++
  
      }

      //console.log(path);

      paths.push(path)

    }

    let bestPathCost = Infinity;

    for(let i = 0, il = paths.length; i < il; i++){
      if(paths[i].cost < bestPathCost){
        bestPathCost = paths[i].cost;
        points = paths[i].points;
      }
    }

    if(points.length <= 2){
      return [dest];
    }else{
      return points;
    }

    

  }

}

module.exports = ModulePath;