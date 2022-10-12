/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePath class.
 */

export class ModulePath {

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
          vector: new THREE.Vector3(_pnt.fields.X.value, _pnt.fields.Y.value, 0)
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
      GameState.scene.add( this.line );
      this.setPathHelpersVisibility(false);

    }
    
    this.initialized = true;
    
  }

  setPathHelpersVisibility(state = false){
    this.line.visible = state;
  }

  getClosestPathPointData(target = new THREE.Vector3){
    const targetPoint = new THREE.Vector3().copy(target);
    targetPoint.z = 0;
    const line3 = new THREE.Line3();
    const closestPoint = new THREE.Vector3(0, 0, 0);
    let startingPoint = undefined;
    let endingPoint = undefined;
    let distance = Infinity;
    let pDistance = 0;

    const _tempPoint = new THREE.Vector3(0, 0, 0);
    for(let i = 0; i < this.points.length; i++){
      const point = this.points[i];
      for(let j = 0; j < point.num_connections; j++){
        const connection = point.connections[j];
        line3.set(point.vector, connection.vector);
        line3.closestPointToPoint(targetPoint, true, _tempPoint);
        pDistance = targetPoint.distanceTo(_tempPoint);
        if(pDistance < distance){
          distance = pDistance;
          startingPoint = point;
          endingPoint = connection;
          closestPoint.copy(_tempPoint);
        }
      }
    }
    
    return { startingPoint: startingPoint, endingPoint: endingPoint, closestPoint: closestPoint };
  }

  traverseToPoint(origin, dest){

    if(!this.points.length) return [dest];

    const startingPoint = this.getClosestPathPointData(origin);
    const endingPoint = this.getClosestPathPointData(dest);

    if(startingPoint.startingPoint == endingPoint.endingPoint) return [dest];

    if(!startingPoint.startingPoint || !endingPoint.endingPoint) return [dest];

    const path = new ComputedPath(startingPoint.startingPoint, endingPoint.endingPoint);
    const bestPath = path.walkConnections(startingPoint.startingPoint);

    bestPath.points[0] = startingPoint.closestPoint;
    bestPath.points[bestPath.points.length-1] = endingPoint.closestPoint;
    bestPath.points.push(dest);

    if(bestPath.points.length <= 2){
      return [dest];
    }else{
      return bestPath.points;
    }

  }

}

class ComputedPath {
  cost = 0;
  points = [];
  closed_list = [];
  starting_point = undefined;
  ending_point = undefined;
  complete = false;

  constructor(starting_point = undefined, ending_point = undefined){
    this.starting_point = starting_point;
    this.ending_point = ending_point;
    if(this.starting_point){
      this.points = [this.starting_point];
      this.closed_list[0] = this.starting_point.id;
    }
  }

  isPointValid( point ){
    return (this.closed_list.indexOf(point.id) == -1);
  }

  addPoint( point ){
    this.points.push(point);
    this.addToClosedList( point );
    this.cost += this.getCost(point);
  }

  addToClosedList( point ){
    if(this.isPointValid(point)){
      this.closed_list.push(point.id);
    }
  }

  close(){
    this.complete = true;
  }

  walkConnections( point ){
    const child_paths = [];
    for(let i = 0; i < point.num_connections; i++){
      const connection = point.connections[i];
      const child_path = this.clone();
      if(connection == this.ending_point){
        //We have reached the end point
        child_path.addToClosedList(connection);
        child_path.close();
        child_paths.push(child_path);
      }else if(child_path.isPointValid(connection)){
        child_path.addPoint(connection);
        child_paths.push(
          child_path.walkConnections(connection)
        );
      }
    }
    return child_paths.sort( (a, b) => { return (a.cost - b.cost) } )[0];
  }

  getCost( point ){
    return point.vector.distanceTo( this.ending_point.vector );
  }

  clone(){
    const clone = new ComputedPath();
    clone.cost = this.cost;
    clone.points = this.points.slice(0);
    clone.closed_list = this.closed_list.slice(0);
    clone.starting_point = this.starting_point;
    clone.ending_point = this.ending_point;
    return clone;
  }

}
