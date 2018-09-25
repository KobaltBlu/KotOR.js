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
        console.error('Failed to load door template');
      }
    });
  }

  InitProperties(){
    if(this.template instanceof GFFObject){
      let _points = this.template.json.fields.Path_Points.structs;
      for(let i = 0; i < _points.length; i++){

        let _pnt = _points[i];

        let point = {
          connections: [],
          x: _pnt.fields.X.value,
          y: _pnt.fields.Y.value
        };

        if(_pnt.fields.Connections){
          let connIdx = _pnt.fields.First_Conection;

          for(let j = 0; j < _pnt.fields.Connections; j++){
            point.connections.push(
              ptthis.templateh.json.fields.Path_Conections.structs[connIdx + j].fields.Destination
            );
          }

        }

        this.points.push(point);

      }
    }
  }

  traverseToPoint(origin, dest){

    let points = [];
    let distanceToDestination = origin.distanceTo(destination);
    
    let start = origin;
    let end = dest;

    //Start point needs to take direction towards the destination

    //Find first point
    let tmpDist = distanceToDestination;
    for(let i = 0; i < this.points.length; i++){
      let point = this.points[i];
      this._tmpVector.set(point.x, point.y, 0);

      let _dist = origin.distanceTo(this._tmpVector);

      if(_dist < tmpDist){
        tmpDist = _dist;
        start = this._tmpVector.clone();
      }
    }

    //Find last point
    tmpDist = Infinity;
    for(let i = 0; i < this.points.length; i++){
      let point = this.points[i];
      this._tmpVector.set(point.x, point.y, 0);

      let _dist = dest.distanceTo(this._tmpVector);

      if(_dist < tmpDist){
        tmpDist = _dist;
        end = this._tmpVector.clone();
      }
    }

    if(start != dest){

    }else{

    }

  }

}

module.exports = ModulePath;