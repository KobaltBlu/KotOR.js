onmessage = function (e){

  /*let Raycaster = e.data.Raycaster;
  let Scene = e.data.Scene;

  var intersects = Raycaster.intersectObjects( Scene.children, true );*/

  console.log(e.data);


  postMessage(intersects);

}
